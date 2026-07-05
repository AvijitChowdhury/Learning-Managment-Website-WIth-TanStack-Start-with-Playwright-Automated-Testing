import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: any) {
  const { supabase, userId } = context;
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "ADMIN" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const [orders, students, courses, revenueRes, todayPaidRes, todayIncompleteRes, todayEnrolRes] =
      await Promise.all([
        supabaseAdmin.from("orders").select("id", { count: "exact", head: true }).eq("status", "PAID"),
        supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("courses").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("orders").select("amount, course_id, courses(title)").eq("status", "PAID"),
        supabaseAdmin
          .from("orders")
          .select("amount")
          .eq("status", "PAID")
          .gte("created_at", startOfToday),
        supabaseAdmin
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("status", "PENDING")
          .gte("created_at", startOfToday),
        supabaseAdmin
          .from("enrollments")
          .select("id", { count: "exact", head: true })
          .gte("created_at", startOfToday),
      ]);

    const rows = revenueRes.data ?? [];
    const revenue = rows.reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
    const perCourse = new Map<string, { title: string; total: number; count: number }>();
    rows.forEach((r: any) => {
      const key = r.course_id;
      const cur = perCourse.get(key) ?? { title: r.courses?.title ?? "—", total: 0, count: 0 };
      cur.total += Number(r.amount ?? 0);
      cur.count += 1;
      perCourse.set(key, cur);
    });
    const topCourses = [...perCourse.values()].sort((a, b) => b.total - a.total).slice(0, 5);

    const todayPaidRows = todayPaidRes.data ?? [];
    const todaySale = todayPaidRows.reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
    const todayPaidCount = todayPaidRows.length;

    return {
      orderCount: orders.count ?? 0,
      studentCount: students.count ?? 0,
      courseCount: courses.count ?? 0,
      revenue,
      todaySale,
      todayPaidCount,
      todayIncomplete: todayIncompleteRes.count ?? 0,
      todayEnrolCount: todayEnrolRes.count ?? 0,
      topCourses,
    };
  });


export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, amount, status, payment_method, transaction_id, sender_number, payment_ref, created_at, courses(title), profiles!orders_user_id_fkey(email, name)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSetOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        orderId: z.string().uuid(),
        status: z.enum(["PAID", "PENDING", "FAILED", "REFUNDED", "CANCELLED"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("orders").update({ status: data.status }).eq("id", data.orderId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListCourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("courses")
      .select("id, title, slug, price, discount_price, level, is_published, published_at, category_id, thumbnail_url")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSaveCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        title: z.string().min(1).max(200),
        slug: z.string().min(1).max(200),
        subtitle: z.string().max(300).optional(),
        description: z.string().max(10000).optional(),
        thumbnail_url: z.string().max(500).optional(),
        price: z.number().min(0),
        discount_price: z.number().min(0).nullable().optional(),
        level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
        is_published: z.boolean(),
        category_id: z.string().uuid().nullable().optional(),
        what_you_learn: z.string().max(5000).nullable().optional(),
        gift_resources: z.string().max(2000).nullable().optional(),
        intro_video_url: z.string().max(500).nullable().optional(),
        total_duration: z.string().max(50).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload: any = { ...data };
    if (data.is_published) payload.published_at = new Date().toISOString();
    if (data.id) {
      const { id, ...upd } = payload;
      const { error } = await supabaseAdmin.from("courses").update(upd).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    payload.instructor_id = context.userId;
    const { data: row, error } = await supabaseAdmin
      .from("courses")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminGetCourseFull = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: course } = await supabaseAdmin.from("courses").select("*").eq("id", data.id).maybeSingle();
    const { data: modules } = await supabaseAdmin
      .from("modules")
      .select("*")
      .eq("course_id", data.id)
      .order("order");
    const modIds = (modules ?? []).map((m) => m.id);
    const { data: lessons } = modIds.length
      ? await supabaseAdmin.from("lessons").select("*").in("module_id", modIds).order("order")
      : { data: [] as any[] };
    return { course, modules: modules ?? [], lessons: lessons ?? [] };
  });

export const adminSaveModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        course_id: z.string().uuid(),
        title: z.string().min(1).max(200),
        order: z.number().int().min(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { id, ...upd } = data;
      const { error } = await supabaseAdmin.from("modules").update(upd).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await supabaseAdmin.from("modules").insert(data).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminDeleteModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("modules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSaveLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        module_id: z.string().uuid(),
        title: z.string().min(1).max(200),
        type: z.enum(["VIDEO", "TEXT", "ATTACHMENT"]),
        content_url: z.string().max(1000).nullable().optional(),
        text_content: z.string().max(50000).nullable().optional(),
        duration_sec: z.number().int().min(0).nullable().optional(),
        order: z.number().int().min(0),
        is_free_preview: z.boolean(),
        description: z.string().max(5000).nullable().optional(),
        assignment: z.string().max(5000).nullable().optional(),
        resource_url: z.string().max(1000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { id, ...upd } = data;
      const { error } = await supabaseAdmin.from("lessons").update(upd).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await supabaseAdmin.from("lessons").insert(data).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminDeleteLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("lessons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("reviews")
      .select("id, rating, comment, is_hidden, created_at, courses(title), profiles!reviews_user_id_fkey(name, email)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminToggleReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), hidden: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("reviews").update({ is_hidden: data.hidden }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const isCurrentUserAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "ADMIN",
    });
    return { admin: !!data };
  });

export const adminListCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("categories").select("id, name, slug").order("name");
    return data ?? [];
  });

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const adminExportOrdersCsv = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, amount, discount_amount, coupon_code, currency, status, payment_method, transaction_id, sender_number, payment_ref, created_at, courses(title), profiles!orders_user_id_fkey(email, name)",
      )
      .order("created_at", { ascending: false })
      .limit(10000);
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const header = [
      "id",
      "created_at",
      "status",
      "amount",
      "discount",
      "coupon",
      "currency",
      "course",
      "student_name",
      "student_email",
      "payment_method",
      "transaction_id",
      "sender_number",
      "invoice_ref",
    ];
    const lines = [header.join(",")];
    for (const r of rows as any[]) {
      lines.push(
        [
          r.id,
          r.created_at,
          r.status,
          r.amount,
          r.discount_amount ?? 0,
          r.coupon_code ?? "",
          r.currency,
          r.courses?.title ?? "",
          r.profiles?.name ?? "",
          r.profiles?.email ?? "",
          r.payment_method ?? "",
          r.transaction_id ?? "",
          r.sender_number ?? "",
          r.payment_ref ?? "",
        ]
          .map(csvEscape)
          .join(","),
      );
    }
    return { csv: lines.join("\n"), filename: `orders-${new Date().toISOString().slice(0, 10)}.csv` };
  });
