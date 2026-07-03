import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getCourseBySlug } from "@/lib/courses.functions";
import { bn } from "@/lib/i18n/bn";
import { formatBDT, formatBnNumber } from "@/lib/format";

const qo = (slug: string) =>
  queryOptions({
    queryKey: ["course", slug],
    queryFn: () => getCourseBySlug({ data: { slug } }),
  });

export const Route = createFileRoute("/courses/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(qo(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData)
      return { meta: [{ title: "কোর্স পাওয়া যায়নি — শিখো" }, { name: "robots", content: "noindex" }] };
    const c = loaderData.course;
    return {
      meta: [
        { title: `${c.title} — শিখো` },
        { name: "description", content: c.subtitle ?? c.description.slice(0, 155) },
        { property: "og:title", content: c.title },
        { property: "og:description", content: c.subtitle ?? c.description.slice(0, 155) },
        ...(c.thumbnail_url ? [{ property: "og:image", content: c.thumbnail_url }] : []),
      ],
    };
  },
  component: CourseDetail,
  notFoundComponent: () => (
    <div className="container-page py-24 text-center">
      <h1 className="text-2xl font-semibold">কোর্স পাওয়া যায়নি</h1>
      <Link to="/courses" className="mt-4 inline-block text-primary hover:underline">
        সব কোর্স দেখুন
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="container-page py-24 text-center text-muted-foreground">
      লোড করা যায়নি: {error.message}
    </div>
  ),
});

function CourseDetail() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(qo(slug));
  if (!data) return null;
  const { course, modules, lessons, reviews, instructor, rating, reviewCount } = data;
  const totalLessons = lessons.length;
  const totalHours = Math.round(
    lessons.reduce((s, l) => s + (l.duration_sec ?? 0), 0) / 3600,
  );

  return (
    <>
      <section className="bg-hero border-b border-border/60">
        <div className="container-page py-12 md:py-16 grid gap-10 md:grid-cols-3">
          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">
              {bn.courses.level[course.level as keyof typeof bn.courses.level]}
            </p>
            <h1 className="mt-2 text-3xl md:text-5xl font-bold leading-tight text-ink">
              {course.title}
            </h1>
            {course.subtitle && (
              <p className="mt-4 text-lg text-muted-foreground">{course.subtitle}</p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {reviewCount > 0 && (
                <span>
                  ⭐ {rating.toFixed(1)} · {formatBnNumber(reviewCount)} {bn.courses.reviews}
                </span>
              )}
              <span>
                {formatBnNumber(totalLessons)} {bn.courses.lessons}
              </span>
              {totalHours > 0 && (
                <span>
                  {formatBnNumber(totalHours)} {bn.courses.hours}
                </span>
              )}
            </div>
          </div>
          <aside className="md:sticky md:top-24 h-fit rounded-2xl border border-border bg-card p-6 shadow-lift">
            {course.thumbnail_url && (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="mb-4 aspect-video w-full rounded-lg object-cover"
              />
            )}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-brand">
                {formatBDT(course.discount_price ?? course.price)}
              </span>
              {course.discount_price && (
                <span className="text-muted-foreground line-through">
                  {formatBDT(course.price)}
                </span>
              )}
            </div>
            <Link
              to="/checkout/$courseId"
              params={{ courseId: course.id }}
              className="mt-5 block w-full rounded-lg bg-brand-gradient px-4 py-3 text-center font-medium text-brand-foreground shadow-soft hover:opacity-95"
            >
              {bn.courses.buy}
            </Link>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              <li>✓ আজীবন অ্যাক্সেস</li>
              <li>✓ মোবাইল ও ল্যাপটপে</li>
              <li>✓ নিরাপদ পেমেন্ট (bKash / Nagad / কার্ড)</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="container-page grid gap-10 py-12 md:grid-cols-3">
        <div className="md:col-span-2 space-y-10">
          <div>
            <h2 className="text-2xl font-semibold">{bn.courses.about}</h2>
            <p className="mt-4 whitespace-pre-line text-muted-foreground leading-relaxed">
              {course.description}
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">{bn.courses.curriculum}</h2>
            <div className="mt-4 space-y-3">
              {modules.map((m) => {
                const items = lessons.filter((l) => l.module_id === m.id);
                return (
                  <details
                    key={m.id}
                    className="group rounded-xl border border-border bg-card open:shadow-soft"
                  >
                    <summary className="flex cursor-pointer items-center justify-between px-5 py-4 font-medium">
                      <span>{m.title}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatBnNumber(items.length)} {bn.courses.lessons}
                      </span>
                    </summary>
                    <ul className="border-t border-border">
                      {items.map((l) => (
                        <li
                          key={l.id}
                          className="flex items-center justify-between px-5 py-3 text-sm"
                        >
                          <span className="flex items-center gap-3">
                            <span className="text-muted-foreground">▶</span>
                            {l.title}
                          </span>
                          {l.is_free_preview && (
                            <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                              {bn.courses.freePreview}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                );
              })}
              {modules.length === 0 && (
                <p className="text-muted-foreground">কারিকুলাম শীঘ্রই যোগ করা হবে।</p>
              )}
            </div>
          </div>

          {reviews.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold">{bn.courses.reviews}</h2>
              <div className="mt-4 space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border bg-card p-5">
                    <div className="text-sm text-brand">
                      {"★".repeat(r.rating)}
                      <span className="text-muted-foreground">
                        {"★".repeat(5 - r.rating)}
                      </span>
                    </div>
                    {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {instructor && (
          <aside>
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground">{bn.courses.instructor}</h3>
              <div className="mt-3 flex items-center gap-3">
                {instructor.avatar_url ? (
                  <img
                    src={instructor.avatar_url}
                    alt={instructor.name ?? ""}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary font-semibold">
                    {(instructor.name ?? "?").slice(0, 1)}
                  </div>
                )}
                <div>
                  <p className="font-medium">{instructor.name}</p>
                </div>
              </div>
            </div>
          </aside>
        )}
      </section>
    </>
  );
}
