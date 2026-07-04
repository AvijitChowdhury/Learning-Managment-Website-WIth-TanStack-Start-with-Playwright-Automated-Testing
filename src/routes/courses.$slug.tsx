import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Play, Lock, CheckCircle2, Star, Clock, BookOpen, Globe, Calendar } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getCourseBySlug } from "@/lib/courses.functions";
import { bn } from "@/lib/i18n/bn";
import { formatBDT, formatBnNumber, formatBnDate } from "@/lib/format";

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
      return {
        meta: [{ title: "কোর্স পাওয়া যায়নি — শিখো" }, { name: "robots", content: "noindex" }],
      };
    const c = loaderData.course;
    const desc = c.subtitle ?? c.description.slice(0, 155);
    return {
      meta: [
        { title: `${c.title} — শিখো` },
        { name: "description", content: desc },
        { property: "og:title", content: c.title },
        { property: "og:description", content: desc },
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
  const {
    course,
    modules,
    lessons,
    reviews,
    instructor,
    rating,
    reviewCount,
    studentCount,
    ratingDist,
    related,
    outcomes,
    requirements,
    faq,
    cleanDescription,
  } = data;

  const [descOpen, setDescOpen] = useState(false);
  const totalLessons = lessons.length;
  const totalSeconds = lessons.reduce((s, l) => s + (l.duration_sec ?? 0), 0);
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMinutes = Math.round((totalSeconds % 3600) / 60);
  const freePreview = lessons.find((l) => l.is_free_preview);
  const price = course.discount_price ?? course.price;
  const discountPct =
    course.discount_price && course.price > course.discount_price
      ? Math.round(((course.price - course.discount_price) / course.price) * 100)
      : 0;
  const descIsLong = cleanDescription.length > 400;
  const shownDesc = descOpen || !descIsLong ? cleanDescription : cleanDescription.slice(0, 400) + "…";

  const fmtDur = (sec: number | null) => {
    if (!sec) return "";
    const m = Math.round(sec / 60);
    return `${formatBnNumber(m)} ${bn.courses.minutes}`;
  };

  return (
    <>
      {/* HERO */}
      <section className="bg-hero border-b border-border/60">
        <div className="container-page py-10 md:py-14 grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <p className="text-sm text-muted-foreground">
              {bn.courses.level[course.level as keyof typeof bn.courses.level]}
            </p>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight text-foreground">
              {course.title}
            </h1>
            {course.subtitle && (
              <p className="text-lg text-muted-foreground">{course.subtitle}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {reviewCount > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
                  <span>({formatBnNumber(reviewCount)} {bn.courses.reviews})</span>
                </span>
              )}
              {studentCount > 0 && (
                <span>{formatBnNumber(studentCount)} {bn.courses.students}</span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Globe className="h-4 w-4" /> {course.language}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {bn.courses.lastUpdated}: {formatBnDate(course.updated_at)}
              </span>
            </div>
            {instructor && (
              <div className="flex items-center gap-3 pt-2">
                {instructor.avatar_url ? (
                  <img
                    src={instructor.avatar_url}
                    alt={instructor.name ?? ""}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary font-semibold">
                    {(instructor.name ?? "?").slice(0, 1)}
                  </div>
                )}
                <div className="text-sm">
                  <div className="text-muted-foreground">{bn.courses.instructor}</div>
                  <div className="font-medium">{instructor.name}</div>
                </div>
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 h-fit rounded-2xl border border-border bg-card p-5 shadow-lift">
            <div className="relative mb-4 overflow-hidden rounded-lg">
              {course.thumbnail_url ? (
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="aspect-video w-full object-cover"
                />
              ) : (
                <div className="aspect-video w-full bg-muted" />
              )}
              {freePreview && (
                <button className="absolute inset-0 grid place-items-center bg-black/30 text-white transition hover:bg-black/40">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 text-brand shadow-lg">
                    <Play className="h-6 w-6 fill-current" />
                  </span>
                </button>
              )}
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-brand">{formatBDT(price)}</span>
              {course.discount_price && (
                <>
                  <span className="text-muted-foreground line-through">
                    {formatBDT(course.price)}
                  </span>
                  {discountPct > 0 && (
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                      {formatBnNumber(discountPct)}% {bn.courses.off}
                    </span>
                  )}
                </>
              )}
            </div>
            <Link
              to="/checkout/$courseId"
              params={{ courseId: course.id }}
              className="mt-5 block w-full rounded-lg bg-brand-gradient px-4 py-3 text-center font-medium text-brand-foreground shadow-soft hover:opacity-95"
            >
              {bn.courses.buy}
            </Link>
            {freePreview && (
              <button className="mt-2 block w-full rounded-lg border border-border px-4 py-2.5 text-center text-sm font-medium hover:bg-accent">
                {bn.courses.watchPreview}
              </button>
            )}
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {formatBnNumber(modules.length)} {bn.courses.modules} ·{" "}
                {formatBnNumber(totalLessons)} {bn.courses.lessons}
              </li>
              {totalSeconds > 0 && (
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {totalHours > 0 && `${formatBnNumber(totalHours)} ${bn.courses.hours} `}
                  {totalMinutes > 0 && `${formatBnNumber(totalMinutes)} ${bn.courses.minutes}`}
                </li>
              )}
              <li>✓ আজীবন অ্যাক্সেস</li>
              <li>✓ মোবাইল ও ল্যাপটপে</li>
              <li>✓ নিরাপদ পেমেন্ট</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="container-page grid gap-10 py-12 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-12">
          {/* WHAT YOU'LL LEARN */}
          {outcomes.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-2xl font-semibold">{bn.courses.whatYouLearn}</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {outcomes.map((o, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CURRICULUM */}
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-2xl font-semibold">{bn.courses.curriculum}</h2>
              <p className="text-sm text-muted-foreground">
                {formatBnNumber(modules.length)} {bn.courses.modules} ·{" "}
                {formatBnNumber(totalLessons)} {bn.courses.lessons}
                {totalHours > 0 && ` · ${formatBnNumber(totalHours)} ${bn.courses.hours}`}
              </p>
            </div>
            <Accordion
              type="multiple"
              defaultValue={modules.slice(0, 1).map((m) => m.id)}
              className="mt-4 rounded-xl border border-border bg-card"
            >
              {modules.map((m) => {
                const items = lessons.filter((l) => l.module_id === m.id);
                const modSecs = items.reduce((s, l) => s + (l.duration_sec ?? 0), 0);
                return (
                  <AccordionItem key={m.id} value={m.id} className="px-5 last:border-0">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex flex-1 items-center justify-between gap-4 pr-2">
                        <span className="font-medium">{m.title}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatBnNumber(items.length)} {bn.courses.lessons}
                          {modSecs > 0 && ` · ${fmtDur(modSecs)}`}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="divide-y divide-border">
                        {items.map((l) => (
                          <li
                            key={l.id}
                            className="flex items-center justify-between gap-3 py-3 text-sm"
                          >
                            <span className="flex min-w-0 items-center gap-3">
                              {l.is_free_preview ? (
                                <Play className="h-4 w-4 shrink-0 text-brand" />
                              ) : (
                                <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                              )}
                              <span className="truncate">{l.title}</span>
                              {l.is_free_preview && (
                                <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                                  {bn.courses.freePreview}
                                </span>
                              )}
                            </span>
                            {l.duration_sec ? (
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {fmtDur(l.duration_sec)}
                              </span>
                            ) : null}
                          </li>
                        ))}
                        {items.length === 0 && (
                          <li className="py-3 text-sm text-muted-foreground">
                            পাঠ শীঘ্রই যোগ করা হবে।
                          </li>
                        )}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
              {modules.length === 0 && (
                <p className="p-5 text-muted-foreground">কারিকুলাম শীঘ্রই যোগ করা হবে।</p>
              )}
            </Accordion>
          </div>

          {/* REQUIREMENTS */}
          {requirements.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold">{bn.courses.requirements}</h2>
              <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
                {requirements.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* DESCRIPTION */}
          <div>
            <h2 className="text-2xl font-semibold">{bn.courses.description}</h2>
            <p className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">
              {shownDesc}
            </p>
            {descIsLong && (
              <button
                onClick={() => setDescOpen((v) => !v)}
                className="mt-3 text-sm font-medium text-brand hover:underline"
              >
                {descOpen ? bn.courses.readLess : bn.courses.readMore}
              </button>
            )}
          </div>

          {/* INSTRUCTOR BIO */}
          {instructor && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-2xl font-semibold">{bn.courses.instructor}</h2>
              <div className="mt-4 flex items-start gap-4">
                {instructor.avatar_url ? (
                  <img
                    src={instructor.avatar_url}
                    alt={instructor.name ?? ""}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary text-xl font-semibold">
                    {(instructor.name ?? "?").slice(0, 1)}
                  </div>
                )}
                <div>
                  <p className="text-lg font-semibold">{instructor.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    অভিজ্ঞ শিক্ষক · বাংলায় শেখানোর দশকের অভিজ্ঞতা
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* REVIEWS */}
          <div>
            <h2 className="text-2xl font-semibold">{bn.courses.reviews}</h2>
            {reviewCount > 0 ? (
              <div className="mt-5 grid gap-6 md:grid-cols-[240px_1fr]">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="text-4xl font-bold">{rating.toFixed(1)}</div>
                  <div className="mt-1 text-amber-400">
                    {"★".repeat(Math.round(rating))}
                    <span className="text-muted-foreground">
                      {"★".repeat(5 - Math.round(rating))}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatBnNumber(reviewCount)} {bn.courses.reviews}
                  </div>
                  <div className="mt-4 space-y-1.5">
                    {ratingDist.map((c, i) => {
                      const stars = 5 - i;
                      const pct = reviewCount ? (c / reviewCount) * 100 : 0;
                      return (
                        <div key={stars} className="flex items-center gap-2 text-xs">
                          <span className="w-6 text-muted-foreground">{stars}★</span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-amber-400"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-muted-foreground">
                            {formatBnNumber(c)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-3">
                  {reviews.slice(0, 8).map((r) => (
                    <div key={r.id} className="rounded-xl border border-border bg-card p-5">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-amber-400">
                          {"★".repeat(r.rating)}
                          <span className="text-muted-foreground">
                            {"★".repeat(5 - r.rating)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatBnDate(r.created_at)}
                        </span>
                      </div>
                      {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-muted-foreground">{bn.courses.noReviews}</p>
            )}
          </div>

          {/* FAQ */}
          {faq.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold">{bn.courses.faq}</h2>
              <Accordion type="single" collapsible className="mt-4 rounded-xl border border-border bg-card">
                {faq.map((f, i) => (
                  <AccordionItem key={i} value={`f${i}`} className="px-5 last:border-0">
                    <AccordionTrigger className="hover:no-underline">{f.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </div>

        {/* right rail spacer for large screens (sticky card already in hero) */}
        <div className="hidden lg:block" />
      </section>

      {/* RELATED */}
      {related.length > 0 && (
        <section className="border-t border-border/60 bg-muted/30">
          <div className="container-page py-12">
            <h2 className="text-2xl font-semibold">{bn.courses.related}</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => (
                <Link
                  key={r.id}
                  to="/courses/$slug"
                  params={{ slug: r.slug }}
                  className="group overflow-hidden rounded-xl border border-border bg-card shadow-soft transition hover:shadow-lift"
                >
                  {r.thumbnail_url ? (
                    <img
                      src={r.thumbnail_url}
                      alt={r.title}
                      className="aspect-video w-full object-cover transition group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="aspect-video w-full bg-muted" />
                  )}
                  <div className="p-4">
                    <p className="text-xs text-muted-foreground">
                      {bn.courses.level[r.level as keyof typeof bn.courses.level]}
                    </p>
                    <h3 className="mt-1 line-clamp-2 font-medium">{r.title}</h3>
                    <p className="mt-2 font-semibold text-brand">
                      {formatBDT(r.discount_price ?? r.price)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* MOBILE STICKY BUY BAR */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-3 shadow-lift backdrop-blur lg:hidden">
        <div className="container-page flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-brand">{formatBDT(price)}</span>
              {course.discount_price && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatBDT(course.price)}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">{course.title}</p>
          </div>
          <Link
            to="/checkout/$courseId"
            params={{ courseId: course.id }}
            className="shrink-0 rounded-lg bg-brand-gradient px-5 py-2.5 text-sm font-medium text-brand-foreground shadow-soft"
          >
            {bn.courses.buy}
          </Link>
        </div>
      </div>
      <div className="h-20 lg:hidden" />
    </>
  );
}
