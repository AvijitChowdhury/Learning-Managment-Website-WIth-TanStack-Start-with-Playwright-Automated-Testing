import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Sparkles, ArrowRight } from "lucide-react";
import { listPublishedCourses } from "@/lib/courses.functions";
import { bn } from "@/lib/i18n/bn";
import { formatBDT, formatBnNumber } from "@/lib/format";
import fallbackThumb from "@/assets/course-thumbnail-fallback.jpg";

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
      <div className="flex flex-col gap-3">
        <span className="font-mono text-xs uppercase tracking-widest text-indigo-soft">
          <Sparkles className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
          {formatBnNumber(data.courses.length)} কোর্স · বাংলায়
        </span>
        <h1 className="font-display text-3xl md:text-5xl font-bold text-terminal">
          {bn.courses.title}
        </h1>
        <p className="max-w-2xl font-body text-muted-foreground">
          বিষয়ভিত্তিক ফিল্টার করুন বা সরাসরি নাম দিয়ে কোর্স খুঁজুন।
        </p>
      </div>

      <div className="mt-8 flex flex-col md:flex-row gap-4 md:items-center">
        <div className="relative flex-1">
          <label htmlFor="course-search" className="sr-only">
            {bn.courses.search}
          </label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-terminal/40" aria-hidden="true" />
          <input
            id="course-search"
            type="search"
            aria-label={bn.courses.search}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={bn.courses.search}
            className="w-full rounded-xl border border-border bg-code-gray pl-10 pr-4 py-3 font-body text-sm text-terminal placeholder:text-terminal/40 focus:outline-none focus:border-indigo/60 focus:ring-2 focus:ring-indigo/20"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCat(null)}
            className={`rounded-full px-4 py-2 font-mono text-xs transition ${
              cat === null
                ? "bg-brand-gradient text-white shadow-lift"
                : "border border-border bg-code-gray text-terminal/70 hover:text-terminal hover:border-indigo/40"
            }`}
          >
            {bn.courses.all}
          </button>
          {data.categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`rounded-full px-4 py-2 font-mono text-xs transition ${
                cat === c.id
                  ? "bg-brand-gradient text-white shadow-lift"
                  : "border border-border bg-code-gray text-terminal/70 hover:text-terminal hover:border-indigo/40"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-16 rounded-2xl border border-dashed border-border bg-code-gray py-16 text-center">
          <p className="font-body text-muted-foreground">{bn.courses.empty}</p>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const hasDiscount = c.discount_price != null && Number(c.discount_price) < Number(c.price);
            const off = hasDiscount
              ? Math.round(
                  (1 - Number(c.discount_price) / Number(c.price)) * 100,
                )
              : 0;
            const levelLabel =
              bn.courses.level[c.level as keyof typeof bn.courses.level] ?? c.level;
            return (
              <Link
                key={c.id}
                to="/courses/$slug"
                params={{ slug: c.slug }}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-code-gray transition hover:border-indigo/60 hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-navy">
                  <img
                    src={c.thumbnail_url ?? fallbackThumb}
                    alt={c.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = fallbackThumb;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
                  {hasDiscount && (
                    <span className="absolute top-3 right-3 rounded-full bg-amber px-2.5 py-1 font-mono text-[10px] font-bold text-ink">
                      {formatBnNumber(off)}% {bn.courses.off}
                    </span>
                  )}
                  <span className="absolute bottom-3 left-3 rounded-md border border-white/20 bg-black/40 px-2 py-1 font-mono text-[10px] text-white backdrop-blur">
                    {levelLabel}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-base font-bold text-terminal line-clamp-2 group-hover:text-indigo-soft transition">
                    {c.title}
                  </h3>
                  {c.subtitle && (
                    <p className="mt-1.5 font-body text-sm text-muted-foreground line-clamp-2">
                      {c.subtitle}
                    </p>
                  )}
                  <div className="mt-auto pt-4 flex items-end justify-between gap-2 border-t border-border/60">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-xl font-bold text-terminal">
                        {formatBDT(c.discount_price ?? c.price)}
                      </span>
                      {hasDiscount && (
                        <span className="font-mono text-xs text-terminal/40 line-through">
                          {formatBDT(c.price)}
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-indigo-soft opacity-0 group-hover:opacity-100 transition">
                      {bn.courses.play} <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
