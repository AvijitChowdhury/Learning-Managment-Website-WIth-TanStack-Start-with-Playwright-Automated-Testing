import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listPublishedCourses } from "@/lib/courses.functions";
import { bn } from "@/lib/i18n/bn";
import { formatBDT } from "@/lib/format";

const coursesQO = queryOptions({
  queryKey: ["catalog", "courses"],
  queryFn: () => listPublishedCourses(),
});

export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: "সব কোর্স — শিখো" },
      { name: "description", content: "বাংলায় সব কোর্স ব্রাউজ করুন। বিষয়ভিত্তিক ফিল্টার ও সার্চ।" },
      { property: "og:title", content: "সব কোর্স — শিখো" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(coursesQO),
  component: CatalogPage,
  errorComponent: ({ error }) => (
    <div className="container-page py-24 text-center text-muted-foreground">
      লোড করা যায়নি: {error.message}
    </div>
  ),
});

function CatalogPage() {
  const { data } = useSuspenseQuery(coursesQO);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return data.courses.filter((c) => {
      if (cat && c.category_id !== cat) return false;
      if (q && !c.title.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [data.courses, q, cat]);

  return (
    <div className="container-page py-12">
      <h1 className="text-3xl md:text-4xl font-bold">{bn.courses.title}</h1>

      <div className="mt-8 flex flex-col md:flex-row gap-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={bn.courses.search}
          className="flex-1 rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCat(null)}
            className={`rounded-full px-4 py-2 text-sm ${cat === null ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-secondary"}`}
          >
            {bn.courses.all}
          </button>
          {data.categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`rounded-full px-4 py-2 text-sm ${cat === c.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-secondary"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-16 text-center text-muted-foreground">{bn.courses.empty}</p>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
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
    </div>
  );
}
