import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  PlayCircle,
  FileText,
  Paperclip,
  Menu,
  X,
  Search,
  ListTree,
  Info,
  Star,
  HelpCircle,
} from "lucide-react";
import {
  getCoursePlayer,
  markLessonComplete,
  getLessonVideoUrl,
  submitReview,
} from "@/lib/learning.functions";
import { formatBnNumber } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/courses/$id")({
  head: () => ({
    meta: [
      { title: "কোর্স প্লেয়ার — শিখো" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlayerPage,
});

function fmtDur(sec?: number | null) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${formatBnNumber(h)}ঘ ${formatBnNumber(m % 60)}মি`;
  }
  return `${formatBnNumber(m)}:${formatBnNumber(s).padStart(2, "০")}`;
}

function LessonIcon({ type, active }: { type: string; active: boolean }) {
  const cls = `h-4 w-4 shrink-0 ${active ? "text-indigo-soft" : "text-terminal/50"}`;
  if (type === "VIDEO") return <PlayCircle className={cls} />;
  if (type === "TEXT") return <FileText className={cls} />;
  return <Paperclip className={cls} />;
}

function PlayerPage() {
  const { id } = Route.useParams();
  const fetchPlayer = useServerFn(getCoursePlayer);
  const markFn = useServerFn(markLessonComplete);
  const videoFn = useServerFn(getLessonVideoUrl);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["player", id],
    queryFn: () => fetchPlayer({ data: { courseId: id } }),
  });

  const orderedLessons = useMemo(() => {
    if (!data) return [] as any[];
    const modMap = new Map((data.modules ?? []).map((m: any) => [m.id, m]));
    return [...(data.lessons ?? [])].sort((a: any, b: any) => {
      const ma = (modMap.get(a.module_id) as any)?.order ?? 0;
      const mb = (modMap.get(b.module_id) as any)?.order ?? 0;
      return ma - mb || a.order - b.order;
    });
  }, [data]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "todo" | "done" | "video" | "text">("all");
  const [tab, setTab] = useState<"curriculum" | "info" | "reviews" | "faq">("curriculum");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const reviewFn = useServerFn(submitReview);
  const reviewMut = useMutation({
    mutationFn: (v: { rating: number; comment: string }) =>
      reviewFn({ data: { courseId: id, ...v } }),
    onSuccess: () => {
      toast.success("রিভিউ জমা হয়েছে");
      setComment("");
      setRating(0);
    },
    onError: (e: any) => toast.error(e?.message ?? "রিভিউ জমা হয়নি"),
  });

  useEffect(() => {
    if (!activeId && orderedLessons.length) setActiveId(orderedLessons[0].id);
  }, [orderedLessons, activeId]);

  // Auto-expand module containing active lesson
  useEffect(() => {
    if (!activeId || !data) return;
    const active = orderedLessons.find((l: any) => l.id === activeId);
    if (active) setOpenModules((s) => ({ ...s, [active.module_id]: true }));
  }, [activeId, orderedLessons, data]);

  const active = orderedLessons.find((l: any) => l.id === activeId);
  const activeIdx = orderedLessons.findIndex((l: any) => l.id === activeId);
  const prev = activeIdx > 0 ? orderedLessons[activeIdx - 1] : null;
  const next =
    activeIdx >= 0 && activeIdx < orderedLessons.length - 1
      ? orderedLessons[activeIdx + 1]
      : null;

  const mut = useMutation({
    mutationFn: (v: { lessonId: string; completed: boolean }) =>
      markFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["player", id] });
      qc.invalidateQueries({ queryKey: ["my-enrollments"] });
    },
  });

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  useEffect(() => {
    setVideoUrl(null);
    if (active?.type === "VIDEO") {
      videoFn({ data: { lessonId: active.id } })
        .then((r) => setVideoUrl(r.url))
        .catch(() => setVideoUrl(null));
    }
  }, [active?.id, active?.type, videoFn]);

  if (isLoading)
    return (
      <div className="container-page py-16 text-terminal/60 font-mono text-sm">
        <span className="animate-pulse">লোড হচ্ছে…</span>
      </div>
    );
  if (error)
    return (
      <div className="container-page py-16">
        <p className="text-destructive font-body">{(error as Error).message}</p>
        <Link
          to="/dashboard"
          className="mt-4 inline-block text-indigo-soft font-mono text-sm hover:text-indigo"
        >
          ← ড্যাশবোর্ড
        </Link>
      </div>
    );
  if (!data?.course)
    return (
      <div className="container-page py-16 text-terminal">কোর্স পাওয়া যায়নি</div>
    );

  const progressSet = new Set(
    (data.progress ?? [])
      .filter((p: any) => p.completed)
      .map((p: any) => p.lesson_id),
  );
  const isDone = active ? progressSet.has(active.id) : false;
  const totalLessons = orderedLessons.length;
  const doneCount = orderedLessons.filter((l: any) => progressSet.has(l.id))
    .length;
  const pct = totalLessons
    ? Math.round((doneCount / totalLessons) * 100)
    : 0;

  const goto = (lid: string) => {
    setActiveId(lid);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-ink">
      {/* Top bar */}
      <div className="border-b border-border bg-code-gray/60 backdrop-blur">
        <div className="container-page flex items-center gap-3 py-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-navy px-3 py-2 font-mono text-xs text-terminal hover:border-indigo/50 hover:text-indigo-soft transition"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">ড্যাশবোর্ড</span>
          </Link>
          <button
            className="lg:hidden rounded-md border border-border bg-navy p-2 text-terminal"
            onClick={() => setSidebarOpen((s) => !s)}
            aria-label="menu"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-base md:text-lg font-bold text-terminal truncate">
              {data.course.title}
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <div className="font-mono text-[11px] text-terminal/60">
                {formatBnNumber(doneCount)} / {formatBnNumber(totalLessons)} পাঠ
              </div>
              <div className="font-mono text-[11px] text-indigo-soft">
                {formatBnNumber(pct)}% সম্পন্ন
              </div>
            </div>
            <div className="w-32 h-2 rounded-full bg-navy overflow-hidden border border-border">
              <div
                className="h-full bg-brand-gradient transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container-page py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Player */}
          <div className="min-w-0">
            <div className="rounded-2xl border border-border bg-code-gray overflow-hidden shadow-soft">
              {active?.type === "VIDEO" ? (
                videoUrl ? (
                  <video
                    key={active.id}
                    src={videoUrl}
                    controls
                    className="aspect-video w-full bg-black"
                  />
                ) : (
                  <div className="aspect-video w-full grid place-items-center bg-black text-terminal/50 font-mono text-sm">
                    <span className="animate-pulse">ভিডিও লোড হচ্ছে…</span>
                  </div>
                )
              ) : active?.type === "TEXT" ? (
                <div className="p-6 md:p-8 prose prose-invert max-w-none font-body text-terminal">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: (active.text_content ?? "").replace(
                        /\n/g,
                        "<br/>",
                      ),
                    }}
                  />
                </div>
              ) : active?.type === "ATTACHMENT" ? (
                <div className="p-8">
                  <a
                    href={active.content_url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md bg-brand-gradient px-5 py-3 font-mono text-sm font-bold text-white inline-flex items-center gap-2"
                  >
                    <Paperclip className="h-4 w-4" />
                    ফাইল ডাউনলোড
                  </a>
                </div>
              ) : (
                <div className="p-8 text-terminal/60 font-body">
                  কোনো পাঠ নির্বাচিত নয়
                </div>
              )}
            </div>

            {/* Lesson meta + actions */}
            {active && (
              <div className="mt-4 rounded-2xl border border-border bg-code-gray p-4 md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] uppercase tracking-wider text-indigo-soft">
                      পাঠ {formatBnNumber(activeIdx + 1)} / {formatBnNumber(totalLessons)}
                    </div>
                    <h2 className="mt-1 font-display text-xl font-bold text-terminal">
                      {active.title}
                    </h2>
                    {active.duration_sec ? (
                      <div className="mt-1 font-mono text-xs text-terminal/60">
                        সময়: {fmtDur(active.duration_sec)}
                      </div>
                    ) : null}
                  </div>
                  <button
                    onClick={() =>
                      mut.mutate({ lessonId: active.id, completed: !isDone })
                    }
                    disabled={mut.isPending}
                    className={`rounded-md px-4 py-2 font-mono text-xs font-bold inline-flex items-center gap-2 transition ${
                      isDone
                        ? "border border-indigo-soft text-indigo-soft bg-indigo/10"
                        : "bg-brand-gradient text-white hover:brightness-110"
                    }`}
                  >
                    {isDone ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> সম্পন্ন
                      </>
                    ) : (
                      "সম্পন্ন হিসেবে চিহ্নিত করুন"
                    )}
                  </button>
                </div>

                {(active.description || active.assignment || active.resource_url) && (
                  <div className="mt-5 space-y-4 border-t border-border pt-4 font-body text-sm text-terminal/90">
                    {active.description && (
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-wider text-terminal/50 mb-1">বিবরণ</div>
                        <p className="whitespace-pre-line">{active.description}</p>
                      </div>
                    )}
                    {active.assignment && (
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-wider text-terminal/50 mb-1">অ্যাসাইনমেন্ট</div>
                        <p className="whitespace-pre-line rounded-md border border-indigo/30 bg-indigo/5 p-3">{active.assignment}</p>
                      </div>
                    )}
                    {active.resource_url && (
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-wider text-terminal/50 mb-1">রিসোর্স</div>
                        <a
                          href={active.resource_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md border border-lime/50 bg-lime/10 px-3 py-1.5 font-mono text-xs text-lime hover:bg-lime hover:text-ink"
                        >
                          <Paperclip className="h-3.5 w-3.5" /> ডাউনলোড / দেখুন
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Prev / Next */}
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
                  <button
                    disabled={!prev}
                    onClick={() => prev && goto(prev.id)}
                    className="flex-1 rounded-md border border-border bg-navy px-3 py-2 text-left font-body text-sm text-terminal disabled:opacity-40 hover:border-indigo/50 transition"
                  >
                    <div className="flex items-center gap-2 text-terminal/50 font-mono text-[10px] uppercase">
                      <ChevronLeft className="h-3 w-3" /> পূর্ববর্তী
                    </div>
                    <div className="mt-0.5 truncate">
                      {prev?.title ?? "—"}
                    </div>
                  </button>
                  <button
                    disabled={!next}
                    onClick={() => next && goto(next.id)}
                    className="flex-1 rounded-md border border-border bg-navy px-3 py-2 text-right font-body text-sm text-terminal disabled:opacity-40 hover:border-indigo/50 transition"
                  >
                    <div className="flex items-center justify-end gap-2 text-terminal/50 font-mono text-[10px] uppercase">
                      পরবর্তী <ChevronRight className="h-3 w-3" />
                    </div>
                    <div className="mt-0.5 truncate">
                      {next?.title ?? "—"}
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside
            className={`${
              sidebarOpen
                ? "fixed inset-x-0 bottom-0 top-16 z-30 overflow-y-auto"
                : "hidden"
            } lg:static lg:block lg:z-auto`}
          >
            <div className="lg:sticky lg:top-20 rounded-2xl border border-border bg-code-gray max-h-[calc(100vh-6rem)] overflow-hidden flex flex-col">
              {/* Tab bar */}
              <div className="flex border-b border-border">
                {(
                  [
                    ["curriculum", "কারিকুলাম", ListTree],
                    ["info", "তথ্য", Info],
                    ["reviews", "রিভিউ", Star],
                    ["faq", "প্রশ্ন", HelpCircle],
                  ] as const
                ).map(([k, label, Icon]) => (
                  <button
                    key={k}
                    onClick={() => setTab(k)}
                    className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 font-mono text-[10px] transition border-b-2 ${
                      tab === k
                        ? "border-indigo-soft text-indigo-soft bg-indigo/5"
                        : "border-transparent text-terminal/60 hover:text-terminal hover:bg-white/5"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {tab === "curriculum" && (
                <>
                  <div className="px-4 py-3 border-b border-border space-y-3">
                    <div>
                      <div className="font-display text-sm font-bold text-terminal">
                        কোর্স কারিকুলাম
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-terminal/60">
                        {formatBnNumber(data.modules.length)} মডিউল ·{" "}
                        {formatBnNumber(totalLessons)} পাঠ
                      </div>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-terminal/40" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="পাঠ খুঁজুন…"
                        className="w-full rounded-md border border-border bg-navy pl-8 pr-7 py-1.5 font-body text-sm text-terminal placeholder:text-terminal/40 focus:outline-none focus:border-indigo/60"
                      />
                      {query && (
                        <button
                          onClick={() => setQuery("")}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-terminal/50 hover:text-terminal"
                          aria-label="clear"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(
                        [
                          ["all", "সব"],
                          ["todo", "বাকি"],
                          ["done", "সম্পন্ন"],
                          ["video", "ভিডিও"],
                          ["text", "টেক্সট"],
                        ] as const
                      ).map(([k, label]) => (
                        <button
                          key={k}
                          onClick={() => setFilter(k)}
                          className={`rounded-full px-2.5 py-1 font-mono text-[10px] transition ${
                            filter === k
                              ? "bg-indigo/20 text-indigo-soft border border-indigo/50"
                              : "border border-border text-terminal/60 hover:text-terminal hover:border-indigo/30"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2">
                    {(() => {
                      const q = query.trim().toLowerCase();
                      const matches = (l: any) => {
                        if (q && !String(l.title ?? "").toLowerCase().includes(q))
                          return false;
                        if (filter === "todo" && progressSet.has(l.id)) return false;
                        if (filter === "done" && !progressSet.has(l.id)) return false;
                        if (filter === "video" && l.type !== "VIDEO") return false;
                        if (filter === "text" && l.type !== "TEXT") return false;
                        return true;
                      };
                      const searching = q.length > 0 || filter !== "all";
                      const modulesRendered = data.modules
                        .map((m: any, mi: number) => {
                          const items = orderedLessons.filter(
                            (l: any) => l.module_id === m.id && matches(l),
                          );
                          return { m, mi, items };
                        })
                        .filter(({ items }) => !searching || items.length > 0);

                      if (modulesRendered.length === 0)
                        return (
                          <div className="px-3 py-8 text-center font-body text-sm text-terminal/50">
                            কোনো পাঠ পাওয়া যায়নি
                          </div>
                        );

                      return modulesRendered.map(({ m, mi, items }) => {
                        const allItems = orderedLessons.filter(
                          (l: any) => l.module_id === m.id,
                        );
                        const modDone = allItems.filter((l: any) =>
                          progressSet.has(l.id),
                        ).length;
                        const isOpen = searching
                          ? true
                          : (openModules[m.id] ?? true);
                        return (
                          <div key={m.id} className="mb-2">
                            <button
                              onClick={() =>
                                setOpenModules((s) => ({ ...s, [m.id]: !isOpen }))
                              }
                              className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-white/5"
                            >
                              <span className="font-mono text-[10px] text-indigo-soft w-6 shrink-0">
                                {formatBnNumber(mi + 1).padStart(2, "০")}
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="block font-body text-sm font-semibold text-terminal truncate">
                                  {m.title}
                                </span>
                                <span className="block font-mono text-[10px] text-terminal/50">
                                  {formatBnNumber(modDone)}/
                                  {formatBnNumber(allItems.length)} সম্পন্ন
                                </span>
                              </span>
                              <ChevronRight
                                className={`h-4 w-4 text-terminal/40 transition-transform ${
                                  isOpen ? "rotate-90" : ""
                                }`}
                              />
                            </button>
                            {isOpen && (
                              <div className="mt-1 space-y-0.5 pl-2">
                                {items.map((l: any) => {
                                  const done = progressSet.has(l.id);
                                  const activeLesson = l.id === activeId;
                                  return (
                                    <button
                                      key={l.id}
                                      onClick={() => goto(l.id)}
                                      className={`w-full text-left rounded-md px-2 py-2 font-body text-sm flex items-center gap-2 transition ${
                                        activeLesson
                                          ? "bg-indigo/15 text-terminal border border-indigo/40"
                                          : "text-terminal/80 hover:bg-white/5 border border-transparent"
                                      }`}
                                    >
                                      {done ? (
                                        <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-soft" />
                                      ) : activeLesson ? (
                                        <LessonIcon type={l.type} active />
                                      ) : (
                                        <Circle className="h-4 w-4 shrink-0 text-terminal/30" />
                                      )}
                                      <span className="flex-1 min-w-0 truncate">
                                        {l.title}
                                      </span>
                                      {l.duration_sec ? (
                                        <span className="font-mono text-[10px] text-terminal/40 shrink-0">
                                          {fmtDur(l.duration_sec)}
                                        </span>
                                      ) : null}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </>
              )}

              {tab === "info" && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div>
                    <div className="font-display text-sm font-bold text-terminal">
                      {data.course.title}
                    </div>
                    {data.course.subtitle && (
                      <p className="mt-1 font-body text-sm text-terminal/70">
                        {data.course.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md border border-border bg-navy p-3">
                      <div className="font-mono text-[10px] text-terminal/50">মডিউল</div>
                      <div className="mt-1 font-display text-lg font-bold text-terminal">
                        {formatBnNumber(data.modules.length)}
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-navy p-3">
                      <div className="font-mono text-[10px] text-terminal/50">পাঠ</div>
                      <div className="mt-1 font-display text-lg font-bold text-terminal">
                        {formatBnNumber(totalLessons)}
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-navy p-3">
                      <div className="font-mono text-[10px] text-terminal/50">সম্পন্ন</div>
                      <div className="mt-1 font-display text-lg font-bold text-indigo-soft">
                        {formatBnNumber(doneCount)}
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-navy p-3">
                      <div className="font-mono text-[10px] text-terminal/50">অগ্রগতি</div>
                      <div className="mt-1 font-display text-lg font-bold text-indigo-soft">
                        {formatBnNumber(pct)}%
                      </div>
                    </div>
                  </div>
                  {data.course.description && (
                    <div>
                      <div className="font-mono text-[10px] uppercase text-terminal/50 mb-1">
                        বিবরণ
                      </div>
                      <p className="font-body text-sm text-terminal/80 whitespace-pre-line leading-relaxed">
                        {data.course.description}
                      </p>
                    </div>
                  )}
                  <div className="rounded-md border border-indigo/30 bg-indigo/5 p-3">
                    <div className="font-mono text-[10px] uppercase text-indigo-soft">
                      রেজিস্ট্রেশন
                    </div>
                    <div className="mt-1 font-body text-sm text-terminal/80">
                      আপনি এই কোর্সে এনরোল্ড আছেন। আজীবন অ্যাক্সেস উপভোগ করুন।
                    </div>
                  </div>
                </div>
              )}

              {tab === "reviews" && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div>
                    <div className="font-display text-sm font-bold text-terminal">
                      রিভিউ লিখুন
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-terminal/50">
                      আপনার অভিজ্ঞতা শেয়ার করুন
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setRating(n)}
                        className="transition hover:scale-110"
                        aria-label={`${n} star`}
                      >
                        <Star
                          className={`h-6 w-6 ${
                            n <= rating
                              ? "fill-amber text-amber"
                              : "text-terminal/30"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="আপনার মতামত লিখুন…"
                    rows={4}
                    className="w-full rounded-md border border-border bg-navy p-2 font-body text-sm text-terminal placeholder:text-terminal/40 focus:outline-none focus:border-indigo/60 resize-none"
                  />
                  <button
                    onClick={() =>
                      rating > 0 && reviewMut.mutate({ rating, comment })
                    }
                    disabled={rating === 0 || reviewMut.isPending}
                    className="w-full rounded-md bg-brand-gradient px-4 py-2 font-mono text-xs font-bold text-white disabled:opacity-40 hover:brightness-110 transition"
                  >
                    {reviewMut.isPending ? "জমা হচ্ছে…" : "রিভিউ জমা দিন"}
                  </button>
                  <Link
                    to="/courses/$slug"
                    params={{ slug: data.course.slug }}
                    className="block text-center font-mono text-[11px] text-indigo-soft hover:text-indigo underline underline-offset-4"
                  >
                    সব রিভিউ দেখুন →
                  </Link>
                </div>
              )}

              {tab === "faq" && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {[
                    {
                      q: "কোর্স কতদিন দেখতে পাবো?",
                      a: "একবার এনরোল করলে আজীবন অ্যাক্সেস — যেকোনো ডিভাইসে যেকোনো সময়।",
                    },
                    {
                      q: "সার্টিফিকেট পাবো কি?",
                      a: "সকল পাঠ সম্পন্ন করলে ডিজিটাল সার্টিফিকেট পাওয়া যাবে।",
                    },
                    {
                      q: "মোবাইলে দেখা যাবে?",
                      a: "হ্যাঁ, মোবাইল, ট্যাবলেট, ল্যাপটপ — যেকোনো ডিভাইসে চলবে।",
                    },
                    {
                      q: "সাপোর্ট কীভাবে পাবো?",
                      a: "প্রশ্ন থাকলে support@shikho.app এ ইমেইল করুন — ২৪ ঘণ্টার মধ্যে উত্তর।",
                    },
                    {
                      q: "রিফান্ড পলিসি কী?",
                      a: "প্রথম ৭ দিনের মধ্যে সন্তুষ্ট না হলে সম্পূর্ণ রিফান্ড।",
                    },
                  ].map((f, i) => (
                    <details
                      key={i}
                      className="group rounded-md border border-border bg-navy p-3 open:border-indigo/40"
                    >
                      <summary className="cursor-pointer list-none flex items-start justify-between gap-2">
                        <span className="font-body text-sm font-semibold text-terminal">
                          {f.q}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-terminal/50 transition group-open:rotate-90" />
                      </summary>
                      <p className="mt-2 font-body text-sm text-terminal/70 leading-relaxed">
                        {f.a}
                      </p>
                    </details>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
