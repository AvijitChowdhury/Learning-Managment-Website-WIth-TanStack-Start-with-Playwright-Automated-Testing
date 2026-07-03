import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const listPublishedCourses = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("courses")
    .select("id,title,slug,subtitle,thumbnail_url,price,discount_price,level,category_id")
    .eq("is_published", true)
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  const { data: cats } = await sb.from("categories").select("id,name,slug");
  return { courses: data ?? [], categories: cats ?? [] };
});

export const getCourseBySlug = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: course, error } = await sb
      .from("courses")
      .select(
        "id,title,slug,subtitle,description,thumbnail_url,price,discount_price,level,language,published_at,category_id,instructor_id",
      )
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!course) return null;

    const [{ data: modules }, { data: lessons }, { data: reviews }, { data: instructor }] =
      await Promise.all([
        sb.from("modules").select("id,title,order").eq("course_id", course.id).order("order"),
        sb
          .from("lessons")
          .select("id,module_id,title,type,duration_sec,order,is_free_preview,content_url,text_content")
          .in(
            "module_id",
            (
              await sb.from("modules").select("id").eq("course_id", course.id)
            ).data?.map((m) => m.id) ?? [],
          )
          .order("order"),
        sb
          .from("reviews")
          .select("id,rating,comment,created_at,user_id")
          .eq("course_id", course.id)
          .eq("is_hidden", false)
          .order("created_at", { ascending: false })
          .limit(20),
        course.instructor_id
          ? sb
              .from("profiles")
              .select("id,name,avatar_url")
              .eq("id", course.instructor_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

    // Redact non-free lesson content from public payload.
    const sanitizedLessons = (lessons ?? []).map((l) => ({
      ...l,
      content_url: l.is_free_preview ? l.content_url : null,
      text_content: l.is_free_preview ? l.text_content : null,
    }));

    const rating =
      reviews && reviews.length
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : 0;

    return {
      course,
      modules: modules ?? [],
      lessons: sanitizedLessons,
      reviews: reviews ?? [],
      instructor: instructor ?? null,
      rating,
      reviewCount: reviews?.length ?? 0,
    };
  });
