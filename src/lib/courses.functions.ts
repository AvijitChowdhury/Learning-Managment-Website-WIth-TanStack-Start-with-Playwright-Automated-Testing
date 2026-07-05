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
        "id,title,slug,subtitle,description,thumbnail_url,price,discount_price,level,language,published_at,updated_at,category_id,instructor_id,instructor_profile_id,what_you_learn,gift_resources,intro_video_url,total_duration",
      )
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!course) return null;

    // Curriculum metadata (title/duration/free-preview flag) is public even for
    // locked lessons, but content_url/text_content must NOT be exposed via the
    // Data API. RLS on `lessons` now restricts anon reads to free-preview rows
    // only, so load the full curriculum through the admin client here and
    // sanitize sensitive fields server-side below.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const moduleIdsRes = await sb.from("modules").select("id").eq("course_id", course.id);
    const moduleIds = moduleIdsRes.data?.map((m) => m.id) ?? [];

    const [
      { data: modules },
      { data: lessons },
      { data: reviews },
      { data: instructor },
      { count: studentCount },
      { data: related },
    ] = await Promise.all([
      sb.from("modules").select("id,title,order").eq("course_id", course.id).order("order"),
      moduleIds.length
        ? supabaseAdmin
            .from("lessons")
            .select(
              "id,module_id,title,type,duration_sec,order,is_free_preview,content_url,text_content",
            )
            .in("module_id", moduleIds)
            .order("order")
        : Promise.resolve({ data: [] as never[] }),

      sb
        .from("reviews")
        .select("id,rating,comment,created_at,user_id")
        .eq("course_id", course.id)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(50),
      course.instructor_id
        ? sb
            .from("profiles")
            .select("id,name,avatar_url")
            .eq("id", course.instructor_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      sb
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("course_id", course.id),
      sb
        .from("courses")
        .select("id,title,slug,thumbnail_url,price,discount_price,level")
        .eq("is_published", true)
        .neq("id", course.id)
        .eq("category_id", course.category_id ?? "")
        .limit(4),
    ]);

    const sanitizedLessons = (lessons ?? []).map((l) => ({
      ...l,
      content_url: l.is_free_preview ? l.content_url : null,
      text_content: l.is_free_preview ? l.text_content : null,
    }));

    const rating =
      reviews && reviews.length
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : 0;

    const dist = [0, 0, 0, 0, 0];
    (reviews ?? []).forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) dist[5 - r.rating]++;
    });

    // Parse structured sections from description (optional markers).
    // Format: "## What you'll learn\n- item\n- item\n## Requirements\n- ...\n## FAQ\n### Q\nA"
    const parsed = parseSections(course.description);

    return {
      course,
      modules: modules ?? [],
      lessons: sanitizedLessons,
      reviews: reviews ?? [],
      instructor: instructor ?? null,
      rating,
      reviewCount: reviews?.length ?? 0,
      studentCount: studentCount ?? 0,
      ratingDist: dist,
      related: related ?? [],
      outcomes: parsed.outcomes,
      requirements: parsed.requirements,
      faq: parsed.faq,
      cleanDescription: parsed.body,
    };
  });

function parseSections(desc: string) {
  const outcomes: string[] = [];
  const requirements: string[] = [];
  const faq: { q: string; a: string }[] = [];
  let body = desc;

  const grab = (label: RegExp) => {
    const m = body.match(label);
    if (!m) return null;
    const start = m.index! + m[0].length;
    const rest = body.slice(start);
    const nextHeader = rest.search(/\n##\s+/);
    const chunk = nextHeader === -1 ? rest : rest.slice(0, nextHeader);
    body = body.slice(0, m.index).trim() + "\n" + body.slice(start + chunk.length);
    return chunk.trim();
  };

  const outChunk = grab(/##\s*(What you'?ll learn|যা শিখবেন|শেখার বিষয়)\s*\n/i);
  const reqChunk = grab(/##\s*(Requirements|প্রয়োজনীয়তা|পূর্বশর্ত)\s*\n/i);
  const faqChunk = grab(/##\s*(FAQ|প্রশ্নোত্তর|জিজ্ঞাসা)\s*\n/i);

  const bullets = (s: string) =>
    s
      .split("\n")
      .map((l) => l.replace(/^[-*•]\s*/, "").trim())
      .filter(Boolean);

  if (outChunk) outcomes.push(...bullets(outChunk));
  if (reqChunk) requirements.push(...bullets(reqChunk));
  if (faqChunk) {
    const parts = faqChunk.split(/\n###\s+/).filter(Boolean);
    for (const p of parts) {
      const [q, ...a] = p.split("\n");
      faq.push({ q: q.trim(), a: a.join("\n").trim() });
    }
  }

  return { outcomes, requirements, faq, body: body.trim() };
}
