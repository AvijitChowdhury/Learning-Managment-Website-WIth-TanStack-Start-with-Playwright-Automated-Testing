import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: any) {
  const { supabase, userId } = context;
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "ADMIN" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

// ============ Categories ============
export const listCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("categories")
      .select("id, name, slug, description, parent_id, created_at")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const upsertCategoryInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(140).regex(/^[a-z0-9-]+$/, "invalid slug"),
  description: z.string().trim().max(500).optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
});

export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => upsertCategoryInput.parse(raw))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const payload = {
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      parent_id: data.parent_id ?? null,
    };
    const q = data.id
      ? context.supabase.from("categories").update(payload).eq("id", data.id).select().single()
      : context.supabase.from("categories").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Coupons ============
export const listCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const couponAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("orders")
      .select("coupon_code, amount, discount_amount, status")
      .eq("status", "PAID")
      .not("coupon_code", "is", null);
    if (error) throw new Error(error.message);
    const byCode: Record<string, { redeemed: number; revenue: number; discount: number }> = {};
    let totalRedeemed = 0;
    let totalRevenue = 0;
    let totalDiscount = 0;
    for (const o of data ?? []) {
      const code = (o.coupon_code || "").toUpperCase();
      if (!code) continue;
      const rev = Number(o.amount ?? 0);
      const disc = Number(o.discount_amount ?? 0);
      const b = (byCode[code] ??= { redeemed: 0, revenue: 0, discount: 0 });
      b.redeemed += 1;
      b.revenue += rev;
      b.discount += disc;
      totalRedeemed += 1;
      totalRevenue += rev;
      totalDiscount += disc;
    }
    return { byCode, totals: { redeemed: totalRedeemed, revenue: totalRevenue, discount: totalDiscount } };
  });

const upsertCouponInput = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(2).max(40).regex(/^[A-Z0-9_-]+$/i, "code must be alphanumeric"),
  discount_type: z.enum(["PERCENT", "FLAT"]),
  discount_value: z.number().positive().max(100000),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  max_uses: z.number().int().positive().optional().nullable(),
  active: z.boolean().default(true),
});

export const upsertCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => upsertCouponInput.parse(raw))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const payload = {
      code: data.code.toUpperCase(),
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      starts_at: data.starts_at || null,
      ends_at: data.ends_at || null,
      max_uses: data.max_uses ?? null,
      active: data.active,
    };
    const q = data.id
      ? context.supabase.from("coupons").update(payload).eq("id", data.id).select().single()
      : context.supabase.from("coupons").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Preview coupon: validates & returns discount for a given amount
export const previewCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ code: z.string().trim().min(1).max(40), amount: z.number().positive() }).parse(raw),
  )
  .handler(async ({ context, data }) => {
    const code = data.code.toUpperCase();
    const { data: c, error } = await context.supabase
      .from("coupons")
      .select("id, code, discount_type, discount_value, starts_at, ends_at, max_uses, used_count, active")
      .eq("code", code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!c || !c.active) throw new Error("কুপনটি বৈধ নয়");
    const now = new Date();
    if (c.starts_at && new Date(c.starts_at) > now) throw new Error("কুপন এখনো সক্রিয় হয়নি");
    if (c.ends_at && new Date(c.ends_at) < now) throw new Error("কুপনের মেয়াদ শেষ");
    if (c.max_uses != null && (c.used_count ?? 0) >= c.max_uses) throw new Error("কুপনের সীমা শেষ");
    const raw =
      c.discount_type === "PERCENT"
        ? (data.amount * Number(c.discount_value)) / 100
        : Number(c.discount_value);
    const discount = Math.min(Math.max(0, Math.round(raw * 100) / 100), data.amount);
    const final = Math.max(0, Math.round((data.amount - discount) * 100) / 100);
    return { code: c.code, discount, final, type: c.discount_type, value: Number(c.discount_value) };
  });

// ============ Support forum ============
export const listMyThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("support_threads")
      .select("id, subject, status, course_id, created_at, updated_at, courses(title)")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    const [threadRes, repliesRes] = await Promise.all([
      context.supabase.from("support_threads").select("*").eq("id", data.id).maybeSingle(),
      context.supabase
        .from("support_replies")
        .select("id, body, is_admin, created_at, author_id")
        .eq("thread_id", data.id)
        .order("created_at"),
    ]);
    if (threadRes.error) throw new Error(threadRes.error.message);
    if (repliesRes.error) throw new Error(repliesRes.error.message);
    return { thread: threadRes.data, replies: repliesRes.data ?? [] };
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        subject: z.string().trim().min(3).max(200),
        body: z.string().trim().min(3).max(4000),
        course_id: z.string().uuid().optional().nullable(),
      })
      .parse(raw),
  )
  .handler(async ({ context, data }) => {
    const { data: thread, error: tErr } = await context.supabase
      .from("support_threads")
      .insert({ user_id: context.userId, subject: data.subject, course_id: data.course_id ?? null })
      .select()
      .single();
    if (tErr) throw new Error(tErr.message);

    const { error: rErr } = await context.supabase.from("support_replies").insert({
      thread_id: thread.id,
      author_id: context.userId,
      body: data.body,
      is_admin: false,
    });
    if (rErr) throw new Error(rErr.message);
    return thread;
  });

export const postReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ thread_id: z.string().uuid(), body: z.string().trim().min(1).max(4000) }).parse(raw),
  )
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "ADMIN",
    });
    const { error } = await context.supabase.from("support_replies").insert({
      thread_id: data.thread_id,
      author_id: context.userId,
      body: data.body,
      is_admin: !!isAdmin,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
