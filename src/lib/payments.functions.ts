import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE = () => (process.env.UDDOKTAPAY_BASE_URL ?? "").replace(/\/+$/, "");
const KEY = () => process.env.UDDOKTAPAY_API_KEY ?? "";
function appUrlFromRequest() {
  try {
    const req = getRequest();
    const u = new URL(req.url);
    const proto = req.headers.get("x-forwarded-proto") ?? u.protocol.replace(":", "");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? u.host;
    return `${proto}://${host}`;
  } catch {
    return process.env.APP_URL ?? "http://localhost:8080";
  }
}

type UPCharge = { status: boolean; message?: string; payment_url?: string; invoice_id?: string };
type UPVerify = {
  status: string;
  full_name?: string;
  email?: string;
  amount?: string;
  fee?: string;
  charged_amount?: string;
  invoice_id?: string;
  metadata?: Record<string, string>;
  payment_method?: string;
  sender_number?: string;
  transaction_id?: string;
  date?: string;
};

async function upFetch<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${BASE()}/${path.replace(/^\/+/, "")}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "RT-UDDOKTAPAY-API-KEY": KEY(),
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`UddoktaPay ${path} bad response: ${text.slice(0, 200)}`);
  }
}

/** Create a PENDING order + UddoktaPay charge, return payment URL for redirect. */
export const createCourseCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ courseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Fetch course (server-computed price!)
    const { data: course, error: cErr } = await supabase
      .from("courses")
      .select("id, title, price, discount_price, is_published, slug")
      .eq("id", data.courseId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!course || !course.is_published) throw new Error("কোর্স পাওয়া যায়নি");

    // Already enrolled?
    const { data: existing } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", course.id)
      .maybeSingle();
    if (existing) return { alreadyEnrolled: true as const, courseId: course.id };

    const amount = Number(course.discount_price ?? course.price ?? 0);
    if (!(amount > 0)) throw new Error("Invalid amount");

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("id", userId)
      .maybeSingle();

    // Create PENDING order
    const { data: order, error: oErr } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        course_id: course.id,
        amount,
        currency: "BDT",
        status: "PENDING",
        payment_provider: "uddoktapay",
      })
      .select("id")
      .single();
    if (oErr) throw new Error(oErr.message);

    const appUrl = appUrlFromRequest().replace(/\/+$/, "");
    const charge = await upFetch<UPCharge>("checkout-v2", {
      full_name: profile?.name || profile?.email || "Student",
      email: profile?.email || `user-${userId.slice(0, 8)}@example.com`,
      amount: amount.toFixed(2),
      metadata: { order_id: order.id, user_id: userId, course_id: course.id },
      redirect_url: `${appUrl}/checkout/return`,
      return_type: "GET",
      cancel_url: `${appUrl}/checkout/cancelled?order=${order.id}`,
      webhook_url: `${appUrl}/api/public/webhooks/uddoktapay`,
    });

    if (!charge.payment_url) {
      // rollback order
      await supabase.from("orders").update({ status: "FAILED" }).eq("id", order.id);
      throw new Error(charge.message || "UddoktaPay charge failed");
    }

    if (charge.invoice_id) {
      await supabase
        .from("orders")
        .update({ payment_ref: charge.invoice_id })
        .eq("id", order.id);
    }

    return { alreadyEnrolled: false as const, payment_url: charge.payment_url };
  });

/** Verify by invoice_id, update order + create enrollment on success. Safe & idempotent. */
export async function verifyAndFulfill(
  invoiceId: string,
  admin: import("@supabase/supabase-js").SupabaseClient,
): Promise<{ status: "PAID" | "PENDING" | "FAILED"; orderId?: string; courseId?: string }> {
  const verify = await upFetch<UPVerify>("verify-payment", { invoice_id: invoiceId });

  const { data: order } = await admin
    .from("orders")
    .select("id, user_id, course_id, status")
    .eq("payment_ref", invoiceId)
    .maybeSingle();
  if (!order) return { status: "FAILED" };

  if (order.status === "PAID") {
    return { status: "PAID", orderId: order.id, courseId: order.course_id };
  }

  const providerStatus = String(verify.status || "").toUpperCase();
  if (providerStatus === "COMPLETED") {
    await admin
      .from("orders")
      .update({
        status: "PAID",
        payment_method: verify.payment_method ?? null,
        sender_number: verify.sender_number ?? null,
        transaction_id: verify.transaction_id ?? null,
        gateway_fee: verify.fee ? Number(verify.fee) : null,
      })
      .eq("id", order.id);
    await admin
      .from("enrollments")
      .upsert(
        { user_id: order.user_id, course_id: order.course_id, order_id: order.id, progress_pct: 0 },
        { onConflict: "user_id,course_id" },
      );
    return { status: "PAID", orderId: order.id, courseId: order.course_id };
  }

  if (providerStatus === "PENDING") return { status: "PENDING", orderId: order.id };

  await admin.from("orders").update({ status: "FAILED" }).eq("id", order.id);
  return { status: "FAILED", orderId: order.id };
}

/** Client-callable verify, used by /checkout/return. */
export const verifyPaymentByInvoice = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ invoice_id: z.string().min(3) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return verifyAndFulfill(data.invoice_id, supabaseAdmin);
  });
