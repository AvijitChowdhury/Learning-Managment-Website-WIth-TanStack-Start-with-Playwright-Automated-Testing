import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listPublishedCourses } from "@/lib/courses.functions";
import { bn } from "@/lib/i18n/bn";
import { formatBDT } from "@/lib/format";
import heroImg from "@/assets/hero.jpg";

const coursesQO = queryOptions({
  queryKey: ["home", "courses"],
  queryFn: () => listPublishedCourses(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "শিখো — বাংলায় শেখার নতুন ঠিকানা" },
      {
        name: "description",
        content: "বাংলায় ভিডিও কোর্স, নিরাপদ পেমেন্ট (bKash, Nagad, Rocket, কার্ড), আজীবন অ্যাক্সেস।",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(coursesQO),
  component: HomePage,
  errorComponent: ({ error }) => (
    <div className="container-page py-24 text-center text-muted-foreground">
      লোড করা যায়নি: {error.message}
    </div>
  ),
});

function HomePage() {
  const { data } = useSuspenseQuery(coursesQO);
  const featured = data.courses.slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="bg-hero">
        <div className="container-page grid gap-10 py-16 md:py-24 md:grid-cols-2 md:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-background/70 border border-border/60 px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              {bn.tagline}
            </p>
            <h1 className="mt-5 text-4xl md:text-6xl font-bold leading-[1.1] text-ink">
              {bn.home.heroTitle}
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-lg">
              {bn.home.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/courses"
                className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-soft hover:opacity-90"
              >
                {bn.home.ctaBrowse}
              </Link>
              <Link
                to="/auth"
                className="rounded-lg border border-border bg-background px-6 py-3 text-sm font-medium hover:bg-muted"
              >
                {bn.home.ctaLogin}
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl bg-brand/10 blur-2xl" aria-hidden />
            <img
              src={heroImg}
              alt="বাংলা কোর্স"
              width={1600}
              height={1200}
              className="relative rounded-2xl shadow-lift"
            />
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="container-page py-16">
        <h2 className="text-2xl md:text-3xl font-semibold">{bn.home.whyTitle}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {bn.home.why.map((w) => (
            <div key={w.t} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h3 className="text-lg font-semibold">{w.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{w.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured courses */}
      <section className="container-page py-8">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl md:text-3xl font-semibold">{bn.home.featured}</h2>
          <Link to="/courses" className="text-sm text-primary hover:underline">
            {bn.courses.title} →
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="mt-8 text-muted-foreground">{bn.courses.empty}</p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c) => (
              <Link
                key={c.id}
                to="/courses/$slug"
                params={{ slug: c.slug }}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:shadow-lift"
              >
                <div className="aspect-video w-full bg-muted overflow-hidden">
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt={c.title} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="h-full w-full bg-hero" />
                  )}
                </div>
                <div className="p-5">
                  <h3 className="text-base font-semibold line-clamp-2">{c.title}</h3>
                  {c.subtitle && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{c.subtitle}</p>
                  )}
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-lg font-semibold text-brand">
                      {formatBDT(c.discount_price ?? c.price)}
                    </span>
                    {c.discount_price && (
                      <span className="text-sm text-muted-foreground line-through">
                        {formatBDT(c.price)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
