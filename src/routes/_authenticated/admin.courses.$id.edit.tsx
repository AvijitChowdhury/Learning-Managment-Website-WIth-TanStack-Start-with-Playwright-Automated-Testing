import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  adminGetCourseFull,
  adminSaveModule,
  adminDeleteModule,
  adminSaveLesson,
  adminDeleteLesson,
  adminReorderModules,
  adminReorderLessons,
  adminBulkImportLessons,
} from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/courses/$id/edit")({
  component: EditPage,
});

type LessonRow = {
  id: string;
  module_id: string;
  title: string;
  type: string;
  content_url: string | null;
  duration_sec: number | null;
  order: number;
  is_free_preview: boolean;
  description: string | null;
  assignment: string | null;
  resource_url: string | null;
};
type ModuleRow = { id: string; course_id: string; title: string; order: number };

// ---------- helpers ----------

function secToMmSs(sec: number | null | undefined): string {
  if (sec === null || sec === undefined || Number.isNaN(sec)) return "";
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
function mmSsToSec(v: string): number | null {
  const s = v.trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return Number(s);
  const m = s.match(/^(\d+):([0-5]?\d)$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  return NaN as unknown as number;
}
function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] ?? null;
      return u.searchParams.get("v");
    }
    return null;
  } catch {
    return null;
  }
}
function isValidUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// ---------- video preview ----------

function VideoPreview({ url }: { url: string }) {
  const yt = extractYouTubeId(url);
  if (yt) {
    return (
      <div className="aspect-video w-full max-w-md overflow-hidden rounded border border-border bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${yt}`}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <video
      controls
      src={url}
      className="aspect-video w-full max-w-md rounded border border-border bg-black"
    />
  );
}

// ---------- CSV import dialog ----------

const TEMPLATE_CSV = `title,videoUrl,content,duration,freePreview
Introduction,https://youtu.be/xxxxxxxxxxx,"Welcome notes",5:30,true
Module recap,https://example.com/video.mp4,,120,false
`;

function ImportLessonsButton({
  moduleId,
  onDone,
}: {
  moduleId: string;
  onDone: () => void;
}) {
  const importFn = useServerFn(adminBulkImportLessons);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setBusy(true);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        const rows = (result.data ?? []).map((r) => ({
          title: r.title ?? r.Title ?? "",
          videoUrl: r.videoUrl ?? r.videourl ?? r.video_url ?? r.url ?? "",
          content: r.content ?? r.notes ?? "",
          duration: r.duration ?? "",
          freePreview: r.freePreview ?? r.freepreview ?? r.free_preview ?? "false",
        }));
        try {
          const res = await importFn({ data: { module_id: moduleId, rows } });
          if (res.failed === 0) {
            toast.success(`Imported ${res.created} lesson${res.created === 1 ? "" : "s"}`);
          } else {
            const preview = res.failures
              .slice(0, 3)
              .map((f) => `row ${f.row}: ${f.reason}`)
              .join("; ");
            toast.warning(
              `Imported ${res.created}, skipped ${res.failed}. ${preview}${
                res.failures.length > 3 ? "…" : ""
              }`,
              { duration: 8000 },
            );
          }
          onDone();
        } catch (e: any) {
          toast.error(e?.message ?? "Import failed");
        } finally {
          setBusy(false);
          if (inputRef.current) inputRef.current.value = "";
        }
      },
      error: (err) => {
        toast.error(`CSV parse error: ${err.message}`);
        setBusy(false);
      },
    });
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <button
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="rounded border border-lime/50 px-2 py-1 font-mono text-[10px] text-lime hover:bg-lime/10 disabled:opacity-50"
      >
        {busy ? "…" : "⬆ CSV import"}
      </button>
      <a
        href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE_CSV)}`}
        download="lessons-template.csv"
        className="rounded border border-border px-2 py-1 font-mono text-[10px] text-terminal/70 hover:text-lime"
      >
        template
      </a>
    </div>
  );
}

// ---------- sortable module ----------

function SortableModule({
  m,
  children,
  onRename,
  onDelete,
}: {
  m: ModuleRow;
  children: React.ReactNode;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `mod:${m.id}`,
    data: { type: "module", moduleId: m.id },
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      className="rounded-2xl border border-border bg-code-gray p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab rounded border border-border px-2 py-2 font-mono text-xs text-terminal/60 hover:text-lime"
          title="Drag to reorder module"
        >
          ⋮⋮
        </button>
        <input
          defaultValue={m.title}
          onBlur={(e) => {
            if (e.target.value !== m.title && e.target.value.trim()) onRename(e.target.value.trim());
          }}
          className="flex-1 rounded-md border border-border bg-ink px-3 py-2 font-bn-serif text-terminal"
        />
        <button
          onClick={() => confirm("ডিলিট করবেন?") && onDelete()}
          className="rounded-md border border-red-400/40 px-3 py-2 font-mono text-xs text-red-300"
        >
          মুছুন
        </button>
      </div>
      {children}
    </div>
  );
}

// ---------- sortable lesson ----------

function SortableLesson({
  lesson,
  onSave,
  onDelete,
}: {
  lesson: LessonRow;
  onSave: (patch: Partial<LessonRow>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `les:${lesson.id}`,
    data: { type: "lesson", moduleId: lesson.module_id, lessonId: lesson.id },
  });
  const [local, setLocal] = useState<LessonRow>(lesson);
  const [expanded, setExpanded] = useState(false);
  const [durationStr, setDurationStr] = useState(secToMmSs(lesson.duration_sec));
  const dirty = JSON.stringify(local) !== JSON.stringify(lesson);
  const set = (patch: Partial<LessonRow>) => setLocal({ ...local, ...patch });

  const videoOk = !!local.content_url && isValidUrl(local.content_url);
  const missingVideo = local.type === "VIDEO" && !local.content_url;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={`rounded-md border p-3 space-y-2 ${
        missingVideo ? "border-amber-400/50 bg-amber-500/5" : "border-border bg-ink"
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab rounded border border-border px-2 py-1 font-mono text-[10px] text-terminal/60 hover:text-lime"
          title="Drag to reorder or move to another module"
        >
          ⋮⋮
        </button>
        <input
          value={local.title}
          onChange={(e) => set({ title: e.target.value })}
          className="flex-1 rounded border border-border bg-code-gray px-2 py-1 text-sm text-terminal"
        />
        <select
          value={local.type}
          onChange={(e) => set({ type: e.target.value })}
          className="rounded border border-border bg-code-gray px-2 py-1 font-mono text-xs text-terminal"
        >
          <option value="VIDEO">VIDEO</option>
          <option value="TEXT">TEXT</option>
          <option value="ATTACHMENT">ATTACHMENT</option>
        </select>
        <label className="flex items-center gap-1 font-mono text-[10px] text-terminal/70">
          <input
            type="checkbox"
            checked={local.is_free_preview}
            onChange={(e) => set({ is_free_preview: e.target.checked })}
          />
          ফ্রি
        </label>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="rounded border border-border px-2 py-1 font-mono text-[10px] text-terminal/70 hover:text-lime"
        >
          {expanded ? "▲" : "▼"}
        </button>
        <button
          disabled={!dirty}
          onClick={() => {
            const sec = mmSsToSec(durationStr);
            if (Number.isNaN(sec)) {
              toast.error("Duration must be seconds or mm:ss");
              return;
            }
            onSave({ ...local, duration_sec: sec });
          }}
          className={`rounded px-3 py-1 font-mono text-[11px] font-bold ${
            dirty
              ? "bg-lime text-ink hover:bg-lime/90 animate-pulse"
              : "border border-border bg-code-gray text-terminal/40"
          }`}
        >
          {dirty ? "💾 সেভ" : "✓ সেভড"}
        </button>

        <button
          onClick={() => confirm("ডিলিট?") && onDelete()}
          className="rounded border border-red-400/40 px-2 py-1 font-mono text-[10px] text-red-300"
        >
          ✕
        </button>
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_120px]">
        <input
          value={local.content_url ?? ""}
          onChange={(e) => set({ content_url: e.target.value })}
          placeholder="Video URL (YouTube বা direct .mp4)"
          className={`rounded border px-2 py-1 font-mono text-xs text-terminal ${
            local.content_url && !videoOk
              ? "border-red-400/60 bg-red-500/5"
              : "border-border bg-code-gray"
          }`}
        />
        <input
          value={durationStr}
          onChange={(e) => setDurationStr(e.target.value)}
          onBlur={() => {
            const sec = mmSsToSec(durationStr);
            if (Number.isNaN(sec)) {
              toast.error("Duration must be mm:ss");
              return;
            }
            if (sec !== local.duration_sec) set({ duration_sec: sec });
          }}
          placeholder="mm:ss"
          className="rounded border border-border bg-code-gray px-2 py-1 font-mono text-xs text-terminal"
        />
      </div>

      {missingVideo && (
        <p className="font-mono text-[10px] text-amber-400">⚠ Missing video URL</p>
      )}

      {videoOk && <VideoPreview url={local.content_url!} />}

      {expanded && (
        <div className="grid gap-2 border-t border-border pt-2">
          <label className="block">
            <span className="font-mono text-[10px] text-terminal/60">বিবরণ / নোট</span>
            <textarea
              rows={2}
              value={local.description ?? ""}
              onChange={(e) => set({ description: e.target.value })}
              className="mt-1 w-full rounded border border-border bg-code-gray px-2 py-1 text-xs text-terminal"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] text-terminal/60">অ্যাসাইনমেন্ট</span>
            <textarea
              rows={2}
              value={local.assignment ?? ""}
              onChange={(e) => set({ assignment: e.target.value })}
              className="mt-1 w-full rounded border border-border bg-code-gray px-2 py-1 text-xs text-terminal"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] text-terminal/60">রিসোর্স লিংক</span>
            <input
              value={local.resource_url ?? ""}
              onChange={(e) => set({ resource_url: e.target.value })}
              placeholder="https://…"
              className="mt-1 w-full rounded border border-border bg-code-gray px-2 py-1 font-mono text-xs text-terminal"
            />
          </label>
        </div>
      )}
    </div>
  );
}

// ---------- page ----------

function EditPage() {
  const { id } = Route.useParams();
  const load = useServerFn(adminGetCourseFull);
  const saveMod = useServerFn(adminSaveModule);
  const delMod = useServerFn(adminDeleteModule);
  const saveLesson = useServerFn(adminSaveLesson);
  const delLesson = useServerFn(adminDeleteLesson);
  const reorderMods = useServerFn(adminReorderModules);
  const reorderLes = useServerFn(adminReorderLessons);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["admin-course", id],
    queryFn: () => load({ data: { id } }),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-course", id] });

  const mSave = useMutation({
    mutationFn: (v: any) => saveMod({ data: v }),
    onSuccess: () => {
      toast.success("মডিউল সেভ হয়েছে");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "সেভ ব্যর্থ"),
  });
  const mDel = useMutation({
    mutationFn: (v: any) => delMod({ data: v }),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "ডিলিট ব্যর্থ"),
  });
  const lSave = useMutation({
    mutationFn: (v: any) => saveLesson({ data: v }),
    onSuccess: () => {
      toast.success("পাঠ সেভ হয়েছে");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "সেভ ব্যর্থ — ভিডিও URL সঠিক কিনা দেখুন"),
  });
  const lDel = useMutation({
    mutationFn: (v: any) => delLesson({ data: v }),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "ডিলিট ব্যর্থ"),
  });


  const [newModTitle, setNewModTitle] = useState("");
  // local optimistic state for DnD
  const [localModules, setLocalModules] = useState<ModuleRow[] | null>(null);
  const [localLessons, setLocalLessons] = useState<LessonRow[] | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const modules: ModuleRow[] = localModules ?? (data?.modules ?? []);
  const lessons: LessonRow[] = localLessons ?? (data?.lessons ?? []);

  const lessonsByModule = useMemo(() => {
    const map = new Map<string, LessonRow[]>();
    modules.forEach((m) => map.set(m.id, []));
    [...lessons]
      .sort((a, b) => a.order - b.order)
      .forEach((l) => {
        const arr = map.get(l.module_id);
        if (arr) arr.push(l);
      });
    return map;
  }, [modules, lessons]);

  if (!data) return <p className="text-terminal/60">লোড হচ্ছে…</p>;
  const { course } = data;

  const findLessonModule = (lessonId: string) =>
    lessons.find((l) => l.id === lessonId)?.module_id ?? null;

  const persistLessonOrder = (updated: LessonRow[]) => {
    reorderLes({
      data: {
        updates: updated.map((l) => ({ id: l.id, module_id: l.module_id, order: l.order })),
      },
    })
      .then(invalidate)
      .catch((e) => toast.error(e?.message ?? "Reorder failed"));
  };

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeType = active.data.current?.type;
    if (activeType !== "lesson") return;

    const activeLessonId = active.data.current?.lessonId as string;
    const overId = String(over.id);
    const overType = over.data.current?.type;

    const fromModule = findLessonModule(activeLessonId);
    const toModule =
      overType === "lesson"
        ? (over.data.current?.moduleId as string)
        : overType === "module-drop"
          ? (over.data.current?.moduleId as string)
          : overType === "module"
            ? (over.data.current?.moduleId as string)
            : null;
    if (!toModule || !fromModule || fromModule === toModule) return;

    // move lesson to end of new module locally
    setLocalLessons((prev) => {
      const base = prev ?? lessons;
      const withNewMod = base.map((l) =>
        l.id === activeLessonId ? { ...l, module_id: toModule } : l,
      );
      return normalizeOrders(withNewMod);
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over) return;

    // module reorder
    if (active.data.current?.type === "module" && over.data.current?.type === "module") {
      const oldIdx = modules.findIndex((m) => m.id === active.data.current?.moduleId);
      const newIdx = modules.findIndex((m) => m.id === over.data.current?.moduleId);
      if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return;
      const next = arrayMove(modules, oldIdx, newIdx).map((m, i) => ({ ...m, order: i }));
      setLocalModules(next);
      reorderMods({
        data: {
          course_id: id,
          order: next.map((m) => ({ id: m.id, order: m.order })),
        },
      })
        .then(invalidate)
        .catch((e) => toast.error(e?.message ?? "Reorder failed"));
      return;
    }

    // lesson reorder within module
    if (active.data.current?.type === "lesson" && over.data.current?.type === "lesson") {
      const activeLessonId = active.data.current?.lessonId as string;
      const overLessonId = over.data.current?.lessonId as string;
      const modId = over.data.current?.moduleId as string;
      const list = (localLessons ?? lessons).filter((l) => l.module_id === modId);
      const oldIdx = list.findIndex((l) => l.id === activeLessonId);
      const newIdx = list.findIndex((l) => l.id === overLessonId);
      if (oldIdx < 0 || newIdx < 0) return;
      const moved = arrayMove(list, oldIdx, newIdx).map((l, i) => ({ ...l, order: i }));
      const others = (localLessons ?? lessons).filter((l) => l.module_id !== modId);
      const next = [...others, ...moved];
      setLocalLessons(next);
      persistLessonOrder(next);
      return;
    }

    // cross-module drop already applied in dragOver; persist
    if (localLessons) persistLessonOrder(localLessons);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/courses" className="font-mono text-xs text-terminal/60 hover:text-lime">
          ← সব কোর্স
        </Link>
        <h2 className="font-bn-serif text-2xl font-bold text-terminal">{course?.title}</h2>
        <p className="mt-1 font-mono text-[10px] text-terminal/60">
          Curriculum — drag modules or lessons to reorder. Drop lessons onto another module to move.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-code-gray p-6">
        <div className="flex gap-2">
          <input
            value={newModTitle}
            onChange={(e) => setNewModTitle(e.target.value)}
            placeholder="নতুন মডিউলের নাম"
            className="flex-1 rounded-md border border-border bg-ink px-3 py-2 font-body text-terminal"
          />
          <button
            onClick={() => {
              if (!newModTitle.trim()) return;
              mSave.mutate({ course_id: id, title: newModTitle.trim(), order: modules.length });
              setNewModTitle("");
            }}
            className="rounded-md bg-lime px-4 font-mono text-xs font-bold text-ink"
          >
            + মডিউল
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setActiveDragId(String(e.active.id))}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveDragId(null);
          setLocalLessons(null);
          setLocalModules(null);
        }}
      >
        <SortableContext
          items={modules.map((m) => `mod:${m.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {modules.map((m) => {
              const modLessons = lessonsByModule.get(m.id) ?? [];
              return (
                <SortableModule
                  key={m.id}
                  m={m}
                  onRename={(title) =>
                    mSave.mutate({ id: m.id, course_id: id, title, order: m.order })
                  }
                  onDelete={() => mDel.mutate({ id: m.id })}
                >
                  <SortableContext
                    items={modLessons.map((l) => `les:${l.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2 border-l border-border pl-4">
                      {modLessons.length === 0 && (
                        <ModuleDropZone moduleId={m.id} />
                      )}
                      {modLessons.map((l) => (
                        <SortableLesson
                          key={l.id}
                          lesson={l}
                          onSave={(patch) => lSave.mutate({ ...l, ...patch })}
                          onDelete={() => lDel.mutate({ id: l.id })}
                        />
                      ))}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          onClick={() =>
                            lSave.mutate({
                              module_id: m.id,
                              title: "নতুন পাঠ",
                              type: "VIDEO",
                              order: modLessons.length,
                              is_free_preview: false,
                            })
                          }
                          className="font-mono text-xs text-lime hover:underline"
                        >
                          + পাঠ যোগ করুন
                        </button>
                        <ImportLessonsButton moduleId={m.id} onDone={invalidate} />
                      </div>
                    </div>
                  </SortableContext>
                </SortableModule>
              );
            })}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeDragId ? (
            <div className="rounded-md border border-lime/60 bg-code-gray px-3 py-2 font-mono text-xs text-terminal">
              {activeDragId.startsWith("mod:") ? "Moving module…" : "Moving lesson…"}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function ModuleDropZone({ moduleId }: { moduleId: string }) {
  const { setNodeRef, isOver } = useSortable({
    id: `mod-drop:${moduleId}`,
    data: { type: "module-drop", moduleId },
  });
  return (
    <div
      ref={setNodeRef}
      className={`rounded border border-dashed px-2 py-3 text-center font-mono text-[10px] ${
        isOver ? "border-lime text-lime" : "border-border text-terminal/40"
      }`}
    >
      কোনো পাঠ নেই — এখানে drop করুন
    </div>
  );
}

function normalizeOrders(lessons: LessonRow[]): LessonRow[] {
  const byMod = new Map<string, LessonRow[]>();
  lessons.forEach((l) => {
    if (!byMod.has(l.module_id)) byMod.set(l.module_id, []);
    byMod.get(l.module_id)!.push(l);
  });
  const out: LessonRow[] = [];
  byMod.forEach((arr) => {
    arr
      .sort((a, b) => a.order - b.order)
      .forEach((l, i) => out.push({ ...l, order: i }));
  });
  return out;
}
