import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, FolderTree } from "lucide-react";
import { toast } from "sonner";
import { deleteCategory, listCategories, upsertCategory } from "@/lib/lms-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => ({ meta: [{ title: "ক্যাটেগরি — অ্যাডমিন" }, { name: "robots", content: "noindex" }] }),
  component: CategoriesAdmin,
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function CategoriesAdmin() {
  const list = useServerFn(listCategories);
  const upsert = useServerFn(upsertCategory);
  const del = useServerFn(deleteCategory);
  const qc = useQueryClient();

  const { data: cats = [] } = useQuery({ queryKey: ["admin", "categories"], queryFn: () => list() });

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [description, setDescription] = useState("");

  const upsertMut = useMutation({
    mutationFn: (data: any) => upsert({ data }),
    onSuccess: () => {
      toast.success("সংরক্ষিত");
      setName("");
      setSlug("");
      setParentId("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "সমস্যা হয়েছে"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("মুছে ফেলা হয়েছে");
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "মুছে ফেলা যায়নি"),
  });

  const parents = cats.filter((c: any) => !c.parent_id);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <FolderTree className="h-6 w-6 text-lime" />
        <h2 className="font-bn-serif text-2xl font-bold text-terminal">ক্যাটেগরি ব্যবস্থাপনা</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display text-base font-semibold text-terminal">নতুন / সাব-ক্যাটেগরি</h3>
          <div className="mt-4 space-y-3">
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug || slug === slugify(name)) setSlug(slugify(e.target.value));
              }}
              placeholder="নাম"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-lime"
            />
            <input
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="slug (a-z, 0-9, -)"
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-lime"
            />
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-lime"
            >
              <option value="">— প্যারেন্ট নেই (টপ-লেভেল) —</option>
              {parents.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="বিবরণ (ঐচ্ছিক)"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-lime"
            />
            <button
              disabled={upsertMut.isPending || !name.trim() || !slug.trim()}
              onClick={() =>
                upsertMut.mutate({
                  name: name.trim(),
                  slug: slug.trim(),
                  parent_id: parentId || null,
                  description: description.trim() || null,
                })
              }
              className="inline-flex items-center gap-2 rounded-md bg-lime px-4 py-2 font-mono text-xs font-bold text-ink disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> যোগ করুন
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3 font-mono text-xs text-terminal/70">
            মোট: {cats.length}
          </div>
          <ul className="divide-y divide-border">
            {parents.map((p: any) => {
              const children = cats.filter((c: any) => c.parent_id === p.id);
              return (
                <li key={p.id} className="px-5 py-3">
                  <Row cat={p} onDelete={() => delMut.mutate(p.id)} />
                  {children.length > 0 && (
                    <ul className="mt-2 ml-6 space-y-2 border-l border-border pl-4">
                      {children.map((c: any) => (
                        <li key={c.id}>
                          <Row cat={c} onDelete={() => delMut.mutate(c.id)} />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
            {parents.length === 0 && (
              <li className="p-5 text-sm text-terminal/60">এখনও কোনো ক্যাটেগরি নেই।</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Row({ cat, onDelete }: { cat: any; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-medium text-terminal">{cat.name}</div>
        <div className="font-mono text-[11px] text-terminal/60">{cat.slug}</div>
      </div>
      <button
        onClick={onDelete}
        className="rounded-md border border-border p-1.5 text-terminal/60 hover:border-destructive hover:text-destructive"
        aria-label="মুছুন"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
