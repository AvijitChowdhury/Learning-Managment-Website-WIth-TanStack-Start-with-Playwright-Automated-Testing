import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  adminGetCourseFull,
  adminSaveModule,
  adminDeleteModule,
  adminSaveLesson,
  adminDeleteLesson,
} from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/courses/$id/edit")({
  component: EditPage,
});

function EditPage() {
  const { id } = Route.useParams();
  const load = useServerFn(adminGetCourseFull);
  const saveMod = useServerFn(adminSaveModule);
  const delMod = useServerFn(adminDeleteModule);
  const saveLesson = useServerFn(adminSaveLesson);
  const delLesson = useServerFn(adminDeleteLesson);
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ["admin-course", id], queryFn: () => load({ data: { id } }) });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-course", id] });

  const mSave = useMutation({ mutationFn: (v: any) => saveMod({ data: v }), onSuccess: invalidate });
  const mDel = useMutation({ mutationFn: (v: any) => delMod({ data: v }), onSuccess: invalidate });
  const lSave = useMutation({ mutationFn: (v: any) => saveLesson({ data: v }), onSuccess: invalidate });
  const lDel = useMutation({ mutationFn: (v: any) => delLesson({ data: v }), onSuccess: invalidate });

  const [newModTitle, setNewModTitle] = useState("");

  if (!data) return <p className="text-terminal/60">লোড হচ্ছে…</p>;
  const { course, modules, lessons } = data;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/courses" className="font-mono text-xs text-terminal/60 hover:text-lime">
          ← সব কোর্স
        </Link>
        <h2 className="font-bn-serif text-2xl font-bold text-terminal">{course?.title}</h2>
      </div>

      <div className="rounded-2xl border border-border bg-code-gray p-6">
        <div className="flex gap-2">
          <input
            value={newModTitle}
            onChange={(e) => setNewModTitle(e.target.value)}
            placeholder="নতুন মডিউলের নাম"
            className="flex-1 rounded-md border border-border bg-ink px-3 py-2 text-terminal font-body"
          />
          <button
            onClick={() => {
              if (!newModTitle) return;
              mSave.mutate({ course_id: id, title: newModTitle, order: modules.length });
              setNewModTitle("");
            }}
            className="rounded-md bg-lime px-4 font-mono text-xs font-bold text-ink"
          >
            + মডিউল
          </button>
        </div>
      </div>

      {modules.map((m: any) => {
        const modLessons = lessons.filter((l: any) => l.module_id === m.id).sort((a: any, b: any) => a.order - b.order);
        return (
          <div key={m.id} className="rounded-2xl border border-border bg-code-gray p-4 space-y-3">
            <div className="flex gap-2 items-center">
              <input
                defaultValue={m.title}
                onBlur={(e) => {
                  if (e.target.value !== m.title)
                    mSave.mutate({ id: m.id, course_id: id, title: e.target.value, order: m.order });
                }}
                className="flex-1 rounded-md border border-border bg-ink px-3 py-2 font-bn-serif text-terminal"
              />
              <button
                onClick={() => confirm("ডিলিট করবেন?") && mDel.mutate({ id: m.id })}
                className="rounded-md border border-red-400/40 text-red-300 px-3 py-2 font-mono text-xs"
              >
                মুছুন
              </button>
            </div>

            <div className="space-y-2 pl-4 border-l border-border">
              {modLessons.map((l: any) => (
                <LessonRow
                  key={l.id}
                  lesson={l}
                  onSave={(patch: any) => lSave.mutate({ ...l, ...patch })}
                  onDelete={() => lDel.mutate({ id: l.id })}
                />
              ))}
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
                className="text-lime font-mono text-xs hover:underline"
              >
                + পাঠ যোগ করুন
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LessonRow({
  lesson,
  onSave,
  onDelete,
}: {
  lesson: any;
  onSave: (patch: any) => void;
  onDelete: () => void;
}) {
  const [local, setLocal] = useState(lesson);
  const [expanded, setExpanded] = useState(false);
  const dirty = JSON.stringify(local) !== JSON.stringify(lesson);
  const set = (patch: any) => setLocal({ ...local, ...patch });

  return (
    <div className="rounded-md border border-border bg-ink p-3 space-y-2">
      <div className="grid gap-2 md:grid-cols-[1fr_120px_1fr_auto_auto_auto]">
        <input
          value={local.title}
          onChange={(e) => set({ title: e.target.value })}
          className="rounded border border-border bg-code-gray px-2 py-1 text-terminal text-sm"
        />
        <select
          value={local.type}
          onChange={(e) => set({ type: e.target.value })}
          className="rounded border border-border bg-code-gray px-2 py-1 text-terminal font-mono text-xs"
        >
          <option value="VIDEO">VIDEO</option>
          <option value="TEXT">TEXT</option>
          <option value="ATTACHMENT">ATTACHMENT</option>
        </select>
        <input
          value={local.content_url ?? ""}
          onChange={(e) => set({ content_url: e.target.value })}
          placeholder="YouTube URL বা স্টোরেজ path"
          className="rounded border border-border bg-code-gray px-2 py-1 text-terminal text-xs font-mono"
        />
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
        <div className="flex gap-1">
          {dirty && (
            <button
              onClick={() => onSave(local)}
              className="rounded bg-lime px-2 py-1 font-mono text-[10px] font-bold text-ink"
            >
              সেভ
            </button>
          )}
          <button
            onClick={() => confirm("ডিলিট?") && onDelete()}
            className="rounded border border-red-400/40 text-red-300 px-2 py-1 font-mono text-[10px]"
          >
            ✕
          </button>
        </div>
      </div>

      {expanded && (
        <div className="grid gap-2 pt-2 border-t border-border">
          <label className="block">
            <span className="font-mono text-[10px] text-terminal/60">সময় (সেকেন্ড)</span>
            <input
              type="number"
              min={0}
              value={local.duration_sec ?? ""}
              onChange={(e) =>
                set({ duration_sec: e.target.value ? Number(e.target.value) : null })
              }
              className="mt-1 w-32 rounded border border-border bg-code-gray px-2 py-1 text-terminal text-xs font-mono"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] text-terminal/60">বিবরণ</span>
            <textarea
              rows={2}
              value={local.description ?? ""}
              onChange={(e) => set({ description: e.target.value })}
              className="mt-1 w-full rounded border border-border bg-code-gray px-2 py-1 text-terminal text-xs font-body"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] text-terminal/60">অ্যাসাইনমেন্ট</span>
            <textarea
              rows={2}
              value={local.assignment ?? ""}
              onChange={(e) => set({ assignment: e.target.value })}
              className="mt-1 w-full rounded border border-border bg-code-gray px-2 py-1 text-terminal text-xs font-body"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] text-terminal/60">রিসোর্স লিংক</span>
            <input
              value={local.resource_url ?? ""}
              onChange={(e) => set({ resource_url: e.target.value })}
              placeholder="https://…"
              className="mt-1 w-full rounded border border-border bg-code-gray px-2 py-1 text-terminal text-xs font-mono"
            />
          </label>
        </div>
      )}
    </div>
  );
}
