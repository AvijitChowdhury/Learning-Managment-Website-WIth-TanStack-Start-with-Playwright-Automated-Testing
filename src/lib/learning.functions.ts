import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyEnrollments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("enrollments")
      .select(
        "id, progress_pct, enrolled_at, course:courses(id,title,slug,thumbnail_url,subtitle)",
      )
      .eq("user_id", userId)
      .order("enrolled_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, amount, currency, status, payment_provider, payment_method, transaction_id, created_at, course:courses(title,slug)",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getCoursePlayer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ courseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // enrollment check
    const { data: enr } = await supabase
      .from("enrollments")
      .select("id, progress_pct")
      .eq("user_id", userId)
      .eq("course_id", data.courseId)
      .maybeSingle();
    if (!enr) throw new Error("এই কোর্সে এনরোলড নন");

    const { data: course } = await supabase
      .from("courses")
      .select("id,title,slug,thumbnail_url,subtitle,description")
      .eq("id", data.courseId)
      .maybeSingle();

    const { data: modules } = await supabase
      .from("modules")
      .select("id,title,order")
      .eq("course_id", data.courseId)
      .order("order");

    const modIds = (modules ?? []).map((m) => m.id);
    const { data: lessons } = modIds.length
      ? await supabase
          .from("lessons")
          .select("id,module_id,title,type,duration_sec,order,content_url,text_content,description,assignment,resource_url")
          .in("module_id", modIds)
          .order("order")
      : { data: [] as any[] };

    const { data: progress } = await supabase
      .from("lesson_progress")
      .select("lesson_id, completed")
      .eq("user_id", userId)
      .in("lesson_id", (lessons ?? []).map((l: any) => l.id));

    return {
      course,
      modules: modules ?? [],
      lessons: lessons ?? [],
      progress: progress ?? [],
      enrollment: enr,
    };
  });

export const markLessonComplete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ lessonId: z.string().uuid(), completed: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("lesson_progress").upsert(
      {
        user_id: userId,
        lesson_id: data.lessonId,
        completed: data.completed,
        completed_at: data.completed ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,lesson_id" },
    );
    if (error) throw new Error(error.message);

    // Recompute course progress
    const { data: lessonRow } = await supabase
      .from("lessons")
      .select("module_id, modules!inner(course_id)")
      .eq("id", data.lessonId)
      .maybeSingle();
    const courseId = (lessonRow as any)?.modules?.course_id;
    if (courseId) {
      const { data: mods } = await supabase.from("modules").select("id").eq("course_id", courseId);
      const modIds = (mods ?? []).map((m) => m.id);
      if (modIds.length) {
        const { data: allLessons } = await supabase
          .from("lessons")
          .select("id")
          .in("module_id", modIds);
        const total = allLessons?.length ?? 0;
        const { count: done } = await supabase
          .from("lesson_progress")
          .select("lesson_id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("completed", true)
          .in("lesson_id", (allLessons ?? []).map((l) => l.id));
        const pct = total ? Math.round(((done ?? 0) / total) * 100) : 0;
        await supabase
          .from("enrollments")
          .update({ progress_pct: pct })
          .eq("user_id", userId)
          .eq("course_id", courseId);
      }
    }
    return { ok: true };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ name: z.string().min(1).max(120).optional(), avatar_url: z.string().url().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("profiles").update(data).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        courseId: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Must be enrolled
    const { data: enr } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", data.courseId)
      .maybeSingle();
    if (!enr) throw new Error("রিভিউ দিতে হলে এনরোল করতে হবে");
    const { error } = await supabase.from("reviews").upsert(
      { user_id: userId, course_id: data.courseId, rating: data.rating, comment: data.comment ?? null },
      { onConflict: "user_id,course_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Signed URL for private videos — only if enrolled or lesson is free preview. */
export const getLessonVideoUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ lessonId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: lesson } = await supabase
      .from("lessons")
      .select("id, content_url, is_free_preview, module:modules!inner(course_id)")
      .eq("id", data.lessonId)
      .maybeSingle();
    if (!lesson || !lesson.content_url) throw new Error("ভিডিও নেই");
    const courseId = (lesson as any).module?.course_id;
    if (!lesson.is_free_preview) {
      const { data: enr } = await supabase
        .from("enrollments")
        .select("id")
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .maybeSingle();
      if (!enr) throw new Error("অ্যাক্সেস নেই");
    }
    // If it's already a full URL, return as-is
    if (/^https?:\/\//.test(lesson.content_url)) return { url: lesson.content_url };
    // Otherwise sign from course-videos bucket
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("course-videos")
      .createSignedUrl(lesson.content_url, 60 * 60);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });
