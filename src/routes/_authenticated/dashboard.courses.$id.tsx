import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  getCoursePlayer,
  markLessonComplete,
  getLessonVideoUrl,
} from "@/lib/learning.functions";

export const Route = createFileRoute("/_authenticated/dashboard/courses/$id")({
  head: () => ({ meta: [{ title: "কোর্স প্লেয়ার — শিখো" }, { name: "robots", content: "noindex" }] }),
  component: PlayerPage,
});

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
    if (!data) return [];
    const modMap = new Map((data.modules ?? []).map((m: any) => [m.id, m]));
    return [...(data.lessons ?? [])].sort((a: any, b: any) => {
      const ma = (modMap.get(a.module_id) as any)?.order ?? 0;
      const mb = (modMap.get(b.module_id) as any)?.order ?? 0;
      return ma - mb || a.order - b.order;
    });
  }, [data]);

  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    if (!activeId && orderedLessons.length) setActiveId(orderedLessons[0].id);
  }, [orderedLessons, activeId]);

  const active = orderedLessons.find((l: any) => l.id === activeId);

  const mut = useMutation({
    mutationFn: (v: { lessonId: string; completed: boolean }) => markFn({ data: v }),
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

  if (isLoading) return <div className="container-page py-16 text-terminal/60">লোড…</div>;
  if (error)
    return (
      <div className="container-page py-16">
        <p className="text-red-400 font-body">{(error as Error).message}</p>
        <Link to="/dashboard" className="mt-4 inline-block text-lime font-mono text-sm">← ড্যাশবোর্ড</Link>
      </div>
    );
  if (!data?.course) return <div className="container-page py-16">কোর্স পাওয়া যায়নি</div>;

  const progressSet = new Set((data.progress ?? []).filter((p: any) => p.completed).map((p: any) => p.lesson_id));
  const isDone = active ? progressSet.has(active.id) : false;

  return (
    <div className="container-page py-8">
      <Link to="/dashboard" className="font-mono text-xs text-terminal/60 hover:text-lime">
        ← ড্যাশবোর্ড
      </Link>
      <h1 className="mt-2 font-bn-serif text-2xl font-bold text-terminal">{data.course.title}</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-code-gray overflow-hidden">
          {active?.type === "VIDEO" ? (
            videoUrl ? (
              <video src={videoUrl} controls className="aspect-video w-full bg-black" />
            ) : (
              <div className="aspect-video w-full grid place-items-center bg-black text-terminal/50 font-mono text-sm">
                ভিডিও লোড হচ্ছে…
              </div>
            )
          ) : active?.type === "TEXT" ? (
            <div className="p-8 prose prose-invert max-w-none font-body text-terminal">
              <div dangerouslySetInnerHTML={{ __html: (active.text_content ?? "").replace(/\n/g, "<br/>") }} />
            </div>
          ) : active?.type === "ATTACHMENT" ? (
            <div className="p-8">
              <a
                href={active.content_url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-lime px-5 py-3 font-mono text-sm font-bold text-ink inline-block"
              >
                ফাইল ডাউনলোড ↓
              </a>
            </div>
          ) : (
            <div className="p-8 text-terminal/60">কোনো পাঠ নির্বাচিত নয়</div>
          )}

          {active && (
            <div className="flex items-center justify-between border-t border-border p-4">
              <h2 className="font-bn-serif text-lg font-semibold text-terminal">{active.title}</h2>
              <button
                onClick={() => mut.mutate({ lessonId: active.id, completed: !isDone })}
                disabled={mut.isPending}
                className={`rounded-md px-4 py-2 font-mono text-xs font-bold ${
                  isDone
                    ? "border border-lime text-lime"
                    : "bg-lime text-ink hover:brightness-95"
                }`}
              >
                {isDone ? "✓ সম্পন্ন" : "সম্পন্ন হিসেবে চিহ্নিত করুন"}
              </button>
            </div>
          )}
        </div>

        <aside className="rounded-2xl border border-border bg-code-gray p-3 max-h-[75vh] overflow-y-auto">
          {data.modules.map((m: any) => (
            <div key={m.id} className="mb-3">
              <div className="px-2 py-1 font-mono text-[10px] uppercase text-terminal/50">
                {m.title}
              </div>
              {orderedLessons
                .filter((l: any) => l.module_id === m.id)
                .map((l: any) => {
                  const done = progressSet.has(l.id);
                  return (
                    <button
                      key={l.id}
                      onClick={() => setActiveId(l.id)}
                      className={`w-full text-left rounded-md px-3 py-2 font-body text-sm flex items-center gap-2 ${
                        l.id === activeId ? "bg-lime/10 text-lime" : "text-terminal/80 hover:bg-white/5"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${done ? "bg-lime" : "bg-border"}`} />
                      <span className="flex-1">{l.title}</span>
                      <span className="font-mono text-[10px] text-terminal/40">{l.type}</span>
                    </button>
                  );
                })}
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
