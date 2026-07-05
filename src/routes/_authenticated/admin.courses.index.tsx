import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminListCourses, adminSaveCourse, adminListCategories, adminDeleteCourse } from "@/lib/admin.functions";
import { fmtBDT } from "@/lib/format";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/admin/courses/")({
  component: AdminCourses,
});

function AdminCourses() {
  const list = useServerFn(adminListCourses);
  const cats = useServerFn(adminListCategories);
  const save = useServerFn(adminSaveCourse);
  const del = useServerFn(adminDeleteCourse);
  const qc = useQueryClient();

  const { data: courses } = useQuery({ queryKey: ["admin-courses"], queryFn: () => list() });
  const { data: categories } = useQuery({ queryKey: ["admin-categories"], queryFn: () => cats() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    title: "",
    slug: "",
    price: 0,
    discount_price: null,
    level: "BEGINNER",
    is_published: false,
    subtitle: "",
    thumbnail_url: "",
    category_id: null,
    description: "",
    what_you_learn: "",
    gift_resources: "",
    intro_video_url: "",
    total_duration: "",
  });

  const mut = useMutation({
    mutationFn: (v: any) => save({ data: v }),
    onSuccess: () => {
      toast.success("সংরক্ষিত");
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      setOpen(false);
      setForm({
        title: "", slug: "", price: 0, discount_price: null, level: "BEGINNER",
        is_published: false, subtitle: "", thumbnail_url: "", category_id: null,
        description: "", what_you_learn: "", gift_resources: "", intro_video_url: "", total_duration: "",
      });
    },
    onError: (e: any) => toast.error(e?.message ?? "ব্যর্থ"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("কোর্স ডিলিট হয়েছে");
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "ডিলিট ব্যর্থ"),
  });

  function confirmDelete(c: any) {
    toast(`"${c.title}" ডিলিট করবেন?`, {
      description: "পুরো কোর্স, মডিউল, পাঠ, এনরোলমেন্ট ও রিভিউ মুছে যাবে। এই কাজ ফিরিয়ে আনা যাবে না।",
      duration: 10000,
      action: {
        label: "হ্যাঁ, ডিলিট",
        onClick: () => delMut.mutate(c.id),
      },
      cancel: { label: "বাতিল", onClick: () => {} },
    });
  }


  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-bn-serif text-xl font-bold text-terminal">কোর্স</h2>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-md bg-lime px-4 py-2 font-mono text-xs font-bold text-ink"
        >
          {open ? "বন্ধ করুন" : "+ নতুন কোর্স"}
        </button>
      </div>

      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const wyl = (form.what_you_learn ?? "")
              .split("\n")
              .map((s: string) => s.trim())
              .filter(Boolean);
            mut.mutate({
              ...form,
              price: Number(form.price),
              discount_price: form.discount_price ? Number(form.discount_price) : null,
              category_id: form.category_id || null,
              what_you_learn: wyl.length ? wyl : null,
            });
          }}
          className="rounded-2xl border border-border bg-code-gray p-6 grid gap-3 md:grid-cols-2"
        >
          {[
            ["title", "শিরোনাম"],
            ["slug", "স্লাগ"],
            ["subtitle", "সাবটাইটেল"],
            ["thumbnail_url", "থাম্বনেইল URL"],
            ["price", "মূল্য (BDT)"],
            ["discount_price", "ডিসকাউন্ট মূল্য"],
            ["intro_video_url", "ইন্ট্রো ভিডিও URL"],
            ["total_duration", "মোট সময় (উদা: ১২ ঘণ্টা)"],
          ].map(([k, l]) => (
            <label key={k} className="block">
              <span className="font-mono text-xs text-terminal/60">{l}</span>
              <input
                value={form[k as string] ?? ""}
                onChange={(e) => setForm({ ...form, [k as string]: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-ink px-3 py-2 text-terminal focus:border-lime focus:outline-none font-body"
              />
            </label>
          ))}
          {[
            ["description", "কোর্স বিবরণ"],
            ["what_you_learn", "কী শিখবেন (প্রতি লাইনে একটি)"],
            ["gift_resources", "উপহার রিসোর্স"],
          ].map(([k, l]) => (
            <label key={k} className="block md:col-span-2">
              <span className="font-mono text-xs text-terminal/60">{l}</span>
              <textarea
                rows={3}
                value={form[k as string] ?? ""}
                onChange={(e) => setForm({ ...form, [k as string]: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-ink px-3 py-2 text-terminal focus:border-lime focus:outline-none font-body"
              />
            </label>
          ))}
          <label className="block">
            <span className="font-mono text-xs text-terminal/60">লেভেল</span>
            <select
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
              className="mt-1 w-full rounded-md border border-border bg-ink px-3 py-2 text-terminal font-mono"
            >
              <option value="BEGINNER">BEGINNER</option>
              <option value="INTERMEDIATE">INTERMEDIATE</option>
              <option value="ADVANCED">ADVANCED</option>
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-xs text-terminal/60">ক্যাটাগরি</span>
            <select
              value={form.category_id ?? ""}
              onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}
              className="mt-1 w-full rounded-md border border-border bg-ink px-3 py-2 text-terminal font-mono"
            >
              <option value="">— নেই —</option>
              {(categories ?? []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 font-mono text-xs text-terminal md:col-span-2">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
            />
            পাবলিশ করুন
          </label>
          <button className="md:col-span-2 rounded-md bg-lime px-5 py-3 font-mono text-sm font-bold text-ink">
            সংরক্ষণ করুন
          </button>
        </form>
      )}

      <div className="grid gap-3">
        {courses?.map((c: any) => (
          <div key={c.id} className="rounded-xl border border-border bg-code-gray p-4 flex items-center gap-4">
            {c.thumbnail_url && <img src={c.thumbnail_url} alt="" className="h-14 w-24 rounded object-cover" />}
            <div className="flex-1">
              <div className="font-bn-serif text-terminal font-semibold">{c.title}</div>
              <div className="font-mono text-[11px] text-terminal/50">/{c.slug} · {c.level}</div>
            </div>
            <div className="font-display text-terminal">{fmtBDT(Number(c.discount_price ?? c.price ?? 0))}</div>
            <span
              className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase ${
                c.is_published ? "text-lime border-lime/40 bg-lime/10" : "text-terminal/60 border-border"
              }`}
            >
              {c.is_published ? "PUBLISHED" : "DRAFT"}
            </span>
            <Link
              to="/admin/courses/$id/edit"
              params={{ id: c.id }}
              className="rounded-md border border-border px-3 py-1 font-mono text-xs text-terminal hover:border-lime hover:text-lime"
            >
              এডিট
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
