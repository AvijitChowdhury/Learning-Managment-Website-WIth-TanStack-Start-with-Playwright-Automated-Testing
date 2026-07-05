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
        "id, user_id, amount, status, payment_method, transaction_id, sender_number, payment_ref, created_at, courses(title)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const orders = data ?? [];
    const userIds = Array.from(new Set(orders.map((o) => o.user_id).filter(Boolean))) as string[];
    let profilesById: Record<string, { email: string | null; name: string | null }> = {};
    if (userIds.length) {
      const { data: profs, error: pErr } = await supabaseAdmin
        .from("profiles")
        .select("id, email, name")
        .in("id", userIds);
      if (pErr) throw new Error(pErr.message);
      profilesById = Object.fromEntries((profs ?? []).map((p) => [p.id, { email: p.email, name: p.name }]));
    }
    return orders.map((o) => ({ ...o, profiles: o.user_id ? profilesById[o.user_id] ?? null : null }));
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
    const { data: order, error: fetchErr } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, course_id, status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!order) throw new Error("অর্ডার পাওয়া যায়নি");

    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);

    let enrolled = false;
    if (data.status === "PAID" && order.user_id && order.course_id) {
      const { data: existing, error: exErr } = await supabaseAdmin
        .from("enrollments")
        .select("id")
        .eq("user_id", order.user_id)
        .eq("course_id", order.course_id)
        .maybeSingle();
      if (exErr) throw new Error(exErr.message);
      if (!existing) {
        const { error: insErr } = await supabaseAdmin.from("enrollments").insert({
          user_id: order.user_id,
          course_id: order.course_id,
          order_id: order.id,
        });
        if (insErr) throw new Error(insErr.message);
        enrolled = true;
      }
    }

    if (data.status !== "PAID" && order.status === "PAID" && order.user_id && order.course_id) {
      await supabaseAdmin
        .from("enrollments")
        .delete()
        .eq("user_id", order.user_id)
        .eq("course_id", order.course_id)
        .eq("order_id", order.id);
    }

    return { ok: true, enrolled };
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

export const adminDeleteCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const courseId = data.id;

    // Delete lessons + lesson_progress via modules
    const { data: mods } = await supabaseAdmin
      .from("modules")
      .select("id")
      .eq("course_id", courseId);
    const moduleIds = (mods ?? []).map((m) => m.id);
    if (moduleIds.length) {
      const { data: lessons } = await supabaseAdmin
        .from("lessons")
        .select("id")
        .in("module_id", moduleIds);
      const lessonIds = (lessons ?? []).map((l) => l.id);
      if (lessonIds.length) {
        await supabaseAdmin.from("lesson_progress").delete().in("lesson_id", lessonIds);
        await supabaseAdmin.from("lessons").delete().in("id", lessonIds);
      }
      await supabaseAdmin.from("modules").delete().in("id", moduleIds);
    }

    // Wipe related course-scoped records. Orders and support_threads are
    // left as historical records (no FK enforces referential integrity).
    await supabaseAdmin.from("enrollments").delete().eq("course_id", courseId);
    await supabaseAdmin.from("reviews").delete().eq("course_id", courseId);


    const { error } = await supabaseAdmin.from("courses").delete().eq("id", courseId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }, { data: enrols, error: eErr }, { data: orders, error: oErr }] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("id, email, name, avatar_url, created_at").order("created_at", { ascending: false }).limit(500),
        supabaseAdmin.from("user_roles").select("user_id, role"),
        supabaseAdmin.from("enrollments").select("user_id"),
        supabaseAdmin.from("orders").select("user_id, amount, status"),
      ]);
    if (pErr) throw new Error(pErr.message);
    if (rErr) throw new Error(rErr.message);
    if (eErr) throw new Error(eErr.message);
    if (oErr) throw new Error(oErr.message);

    const rolesByUser: Record<string, string[]> = {};
    for (const r of roles ?? []) {
      (rolesByUser[r.user_id] ??= []).push(r.role as string);
    }
    const enrolByUser: Record<string, number> = {};
    for (const e of enrols ?? []) enrolByUser[e.user_id] = (enrolByUser[e.user_id] ?? 0) + 1;
    const spendByUser: Record<string, { paid: number; orders: number; spent: number }> = {};
    for (const o of orders ?? []) {
      const s = (spendByUser[o.user_id] ??= { paid: 0, orders: 0, spent: 0 });
      s.orders += 1;
      if (o.status === "PAID") {
        s.paid += 1;
        s.spent += Number(o.amount ?? 0);
      }
    }
    return (profiles ?? []).map((p) => ({
      ...p,
      roles: rolesByUser[p.id] ?? ["STUDENT"],
      enrollments: enrolByUser[p.id] ?? 0,
      orders: spendByUser[p.id]?.orders ?? 0,
      paidOrders: spendByUser[p.id]?.paid ?? 0,
      totalSpent: spendByUser[p.id]?.spent ?? 0,
    }));
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
        what_you_learn: z.array(z.string().max(500)).max(50).nullable().optional(),
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

export const adminReorderModules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        course_id: z.string().uuid(),
        order: z.array(z.object({ id: z.string().uuid(), order: z.number().int().min(0) })).max(500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await Promise.all(
      data.order.map((r) =>
        supabaseAdmin.from("modules").update({ order: r.order }).eq("id", r.id).eq("course_id", data.course_id),
      ),
    );
    return { ok: true };
  });

export const adminReorderLessons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        updates: z
          .array(
            z.object({
              id: z.string().uuid(),
              module_id: z.string().uuid(),
              order: z.number().int().min(0),
            }),
          )
          .max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await Promise.all(
      data.updates.map((u) =>
        supabaseAdmin
          .from("lessons")
          .update({ module_id: u.module_id, order: u.order })
          .eq("id", u.id),
      ),
    );
    return { ok: true };
  });

function parseDurationToSec(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim();
  if (/^\d+$/.test(s)) return Number(s);
  const m = s.match(/^(\d+):([0-5]?\d)$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const h = s.match(/^(\d+):([0-5]?\d):([0-5]?\d)$/);
  if (h) return Number(h[1]) * 3600 + Number(h[2]) * 60 + Number(h[3]);
  return NaN;
}

function isValidUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseBool(v: unknown): boolean {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y";
}

export const adminBulkImportLessons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        module_id: z.string().uuid(),
        rows: z
          .array(
            z.object({
              title: z.string().optional(),
              videoUrl: z.string().optional(),
              content: z.string().optional(),
              duration: z.union([z.string(), z.number()]).optional(),
              freePreview: z.union([z.string(), z.boolean()]).optional(),
            }),
          )
          .max(1000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("lessons")
      .select("order")
      .eq("module_id", data.module_id)
      .order("order", { ascending: false })
      .limit(1);
    let nextOrder = existing && existing[0] ? existing[0].order + 1 : 0;

    const failures: { row: number; reason: string }[] = [];
    const toInsert: any[] = [];

    data.rows.forEach((r, i) => {
      const rowNum = i + 1;
      const title = (r.title ?? "").toString().trim();
      if (!title) return failures.push({ row: rowNum, reason: "missing title" });

      const videoUrl = (r.videoUrl ?? "").toString().trim();
      if (videoUrl && !isValidUrl(videoUrl))
        return failures.push({ row: rowNum, reason: "invalid video URL" });

      const durationSec =
        r.duration === undefined || r.duration === "" ? null : parseDurationToSec(r.duration);
      if (durationSec !== null && (Number.isNaN(durationSec) || durationSec < 0))
        return failures.push({ row: rowNum, reason: "invalid duration (use seconds or mm:ss)" });

      toInsert.push({
        module_id: data.module_id,
        title: title.slice(0, 200),
        type: "VIDEO",
        content_url: videoUrl || null,
        description: (r.content ?? "").toString().slice(0, 5000) || null,
        duration_sec: durationSec,
        is_free_preview: parseBool(r.freePreview),
        order: nextOrder++,
      });
    });

    let created = 0;
    if (toInsert.length) {
      const { error, data: ins } = await supabaseAdmin.from("lessons").insert(toInsert).select("id");
      if (error) {
        return { created: 0, failed: data.rows.length, failures: [{ row: 0, reason: error.message }] };
      }
      created = ins?.length ?? toInsert.length;
    }

    return { created, failed: failures.length, failures };
  });

export const adminListReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
        courseId: z.string().uuid().optional().nullable(),
      })
      .optional()
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const page = data?.page ?? 1;
    const pageSize = data?.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabaseAdmin
      .from("reviews")
      .select("id, user_id, course_id, rating, comment, is_hidden, created_at, courses(title)", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data?.courseId) q = q.eq("course_id", data.courseId);

    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);

    const userIds = Array.from(
      new Set((rows ?? []).map((r: any) => r.user_id).filter(Boolean)),
    ) as string[];
    let profilesById: Record<string, { name: string | null; email: string | null }> = {};
    if (userIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);
      profilesById = Object.fromEntries(
        (profs ?? []).map((p: any) => [p.id, { name: p.name, email: p.email }]),
      );
    }

    // Course filter options (id + title) — capped and alphabetical.
    const { data: courses } = await supabaseAdmin
      .from("courses")
      .select("id, title")
      .order("title", { ascending: true })
      .limit(500);

    return {
      rows: (rows ?? []).map((r: any) => ({
        ...r,
        profiles: profilesById[r.user_id] ?? null,
      })),
      total: count ?? 0,
      page,
      pageSize,
      courses: courses ?? [],
    };
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
        "id, user_id, amount, discount_amount, coupon_code, currency, status, payment_method, transaction_id, sender_number, payment_ref, created_at, courses(title)",
      )
      .order("created_at", { ascending: false })
      .limit(10000);
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean))) as string[];
    let profilesById: Record<string, { name: string | null; email: string | null }> = {};
    if (userIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);
      profilesById = Object.fromEntries(
        (profs ?? []).map((p: any) => [p.id, { name: p.name, email: p.email }]),
      );
    }

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
      const prof = r.user_id ? profilesById[r.user_id] : null;
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
          prof?.name ?? "",
          prof?.email ?? "",
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

export const adminOverviewCharts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000);
    since.setHours(0, 0, 0, 0);
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("amount, status, created_at")
      .gte("created_at", since.toISOString())
      .limit(5000);
    const rows = orders ?? [];

    const days: { date: string; revenue: number; orders: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(since.getTime() + i * 86400000);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, revenue: 0, orders: 0 });
    }
    const dayIdx = new Map(days.map((d, i) => [d.date, i]));
    const statusCounts: Record<string, number> = {};
    for (const r of rows as any[]) {
      statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
      const key = new Date(r.created_at).toISOString().slice(0, 10);
      const i = dayIdx.get(key);
      if (i !== undefined) {
        days[i].orders += 1;
        if (r.status === "PAID") days[i].revenue += Number(r.amount ?? 0);
      }
    }
    const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
    return { days, statusBreakdown };
  });

