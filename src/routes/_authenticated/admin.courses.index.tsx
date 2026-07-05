import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import { adminListCourses, adminSaveCourse, adminListCategories, adminDeleteCourse } from "@/lib/admin.functions";
import { fmtBDT } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const httpUrl = z.string().trim().url().refine((v) => /^https?:\/\//i.test(v), "");
const optionalHttpUrl = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^https?:\/\/.+/i.test(v), "");

const courseSchema = z.object({
  title: z.string().trim().min(3).max(120),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, ""),
  subtitle: z.string().trim().max(160).optional().or(z.literal("")),
  thumbnail_url: httpUrl,
  price: z.coerce.number().int().min(0).max(1_000_000),
  discount_price: z
    .union([z.coerce.number().int().min(0).max(1_000_000), z.literal("").transform(() => null), z.null()])
    .optional(),
  intro_video_url: optionalHttpUrl.or(z.literal("")),
  total_duration: z.string().trim().max(40).optional().or(z.literal("")),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  what_you_learn: z.string().trim().max(2000).optional().or(z.literal("")),
  gift_resources: z.string().trim().max(1000).optional().or(z.literal("")),
});

type FieldDef = {
  key: string;
  label: string;
  tip: string;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "number" | "url";
};

const TEXT_FIELDS: FieldDef[] = [
  { key: "title", label: "শিরোনাম", tip: "সংক্ষিপ্ত ও স্পষ্ট নাম, ৩–১২০ অক্ষর।", required: true, placeholder: "উদা: পাইথন হাতেখড়ি" },
  { key: "slug", label: "স্লাগ", tip: "শুধু ছোট হাতের ইংরেজি অক্ষর, সংখ্যা ও হাইফেন (-)। URL-এ ব্যবহার হবে।", required: true, placeholder: "python-hatekhori" },
  { key: "subtitle", label: "সাবটাইটেল", tip: "এক লাইনে কোর্সের প্রতিশ্রুতি। সর্বোচ্চ ১৬০ অক্ষর।", placeholder: "শূন্য থেকে শুরু করে প্রজেক্ট পর্যন্ত" },
  
  { key: "price", label: "মূল্য (BDT)", tip: "পূর্ণসংখ্যা টাকায়। ফ্রি কোর্সের জন্য 0।", required: true, type: "number", placeholder: "999" },
  { key: "discount_price", label: "ডিসকাউন্ট মূল্য", tip: "ঐচ্ছিক। থাকলে মূল দামের কম হতে হবে।", type: "number", placeholder: "699" },
  { key: "intro_video_url", label: "ইন্ট্রো ভিডিও URL", tip: "ঐচ্ছিক। YouTube/Vimeo/MP4 লিংক (https://)।", type: "url", placeholder: "https://youtu.be/…" },
  { key: "total_duration", label: "মোট সময়", tip: "যেভাবে শিক্ষার্থীদের দেখাতে চান। উদা: ১২ ঘণ্টা।", placeholder: "১২ ঘণ্টা" },
];

const AREA_FIELDS: FieldDef[] = [
  { key: "description", label: "কোর্স বিবরণ", tip: "কোর্সে কী থাকবে, কারা করবেন, প্রয়োজনীয়তা — ২–৩ প্যারা।" },
  { key: "what_you_learn", label: "কী শিখবেন", tip: "প্রতি লাইনে একটি পয়েন্ট লিখুন (৫–৮টি সেরা)।" },
  { key: "gift_resources", label: "উপহার রিসোর্স", tip: "ঐচ্ছিক। পিডিএফ, টেমপ্লেট, চিটশিট ইত্যাদির তালিকা।" },
];


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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

  async function handleThumbUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("শুধু ইমেজ ফাইল আপলোড করুন");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("ফাইলের সর্বোচ্চ সাইজ ৫MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("course-thumbnails")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage
        .from("course-thumbnails")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr || !signed?.signedUrl) throw sErr ?? new Error("URL তৈরি ব্যর্থ");
      setForm((f: any) => ({ ...f, thumbnail_url: signed.signedUrl }));
      toast.success("থাম্বনেইল আপলোড হয়েছে");
    } catch (e: any) {
      toast.error(e?.message ?? "আপলোড ব্যর্থ");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }



  const parsed = useMemo(() => {
    const candidate = {
      ...form,
      price: form.price === "" ? undefined : form.price,
      discount_price: form.discount_price === "" || form.discount_price == null ? null : form.discount_price,
    };
    const result = courseSchema.safeParse(candidate);
    if (!result.success) {
      const bad = new Set<string>();
      for (const issue of result.error.issues) {
        const first = issue.path[0];
        if (typeof first === "string") bad.add(first);
      }
      // extra rule: discount must be < price when set
      const p = Number(form.price);
      const d = form.discount_price === "" || form.discount_price == null ? null : Number(form.discount_price);
      if (d != null && !Number.isNaN(d) && !Number.isNaN(p) && d >= p) bad.add("discount_price");
      return { valid: false, invalidKeys: bad };
    }
    const p = Number(form.price);
    const d = form.discount_price === "" || form.discount_price == null ? null : Number(form.discount_price);
    if (d != null && d >= p) return { valid: false, invalidKeys: new Set(["discount_price"]) };
    return { valid: true, invalidKeys: new Set<string>() };
  }, [form]);

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
            if (!parsed.valid) {
              const labelMap: Record<string, string> = {
                ...Object.fromEntries(TEXT_FIELDS.map((f) => [f.key, f.label])),
                ...Object.fromEntries(AREA_FIELDS.map((f) => [f.key, f.label])),
                thumbnail_url: "থাম্বনেইল",
              };
              const missing = [...parsed.invalidKeys].map((k) => labelMap[k] ?? k);
              toast.error(`পূরণ করুন: ${missing.join(", ")}`);
              return;
            }
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
          className="rounded-2xl border border-border bg-code-gray p-6 grid gap-4 md:grid-cols-2"
        >
          <div className="md:col-span-2 rounded-lg border border-lime/30 bg-lime/5 px-4 py-3 font-body text-xs text-terminal/80">
            <span className="font-mono text-lime">টিপ:</span> প্রতিটি ফিল্ডের নিচের হিন্ট মেনে চলুন। কোনো ফিল্ড লাল হলে সেটা ঠিক করুন — সংরক্ষণ বাটন সবসময় সক্রিয়, ভুল থাকলে কোন ফিল্ডে সমস্যা তা জানানো হবে।
          </div>


          <div className="md:col-span-2 rounded-lg border border-border bg-ink/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-terminal/60">
                থাম্বনেইল<span className="text-lime"> *</span>
              </span>
              <span className="font-mono text-[11px] text-terminal/50">16:9 · সর্বোচ্চ ৫MB</span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[160px_1fr]">
              <div className="relative aspect-video overflow-hidden rounded-md border border-border bg-ink">
                {form.thumbnail_url ? (
                  <img src={form.thumbnail_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center font-mono text-[10px] text-terminal/40">
                    কোনো ইমেজ নেই
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="rounded-md border border-lime/40 bg-lime/10 px-3 py-2 font-mono text-xs text-lime hover:bg-lime/20 disabled:opacity-40"
                  >
                    {uploading ? "আপলোড হচ্ছে…" : "ইমেজ আপলোড"}
                  </button>
                  {form.thumbnail_url && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, thumbnail_url: "" })}
                      className="rounded-md border border-border px-3 py-2 font-mono text-xs text-terminal/70 hover:border-red-400 hover:text-red-300"
                    >
                      মুছুন
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleThumbUpload(file);
                    }}
                  />
                </div>
                <div className="font-mono text-[11px] text-terminal/50">অথবা সরাসরি ইমেজের লিংক দিন:</div>
                <input
                  type="url"
                  placeholder="https://…/thumb.jpg"
                  value={form.thumbnail_url ?? ""}
                  onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                  className={`w-full rounded-md border bg-ink px-3 py-2 text-terminal font-body focus:outline-none ${
                    parsed.invalidKeys.has("thumbnail_url") ? "border-border/70 focus:border-lime" : "border-border focus:border-lime"
                  }`}
                />
              </div>
            </div>
          </div>



          {TEXT_FIELDS.map((f) => {
            const invalid = parsed.invalidKeys.has(f.key);
            return (
              <label key={f.key} className="block">
                <span className="font-mono text-xs text-terminal/60">
                  {f.label}
                  {f.required && <span className="text-lime"> *</span>}
                </span>
                <input
                  type={f.type === "number" ? "number" : f.type === "url" ? "url" : "text"}
                  inputMode={f.type === "number" ? "numeric" : undefined}
                  placeholder={f.placeholder}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className={`mt-1 w-full rounded-md border bg-ink px-3 py-2 text-terminal focus:outline-none font-body ${
                    invalid ? "border-border/70 focus:border-lime" : "border-border focus:border-lime"
                  }`}
                />
                <span className="mt-1 block font-mono text-[11px] text-terminal/50">{f.tip}</span>
              </label>
            );
          })}

          {AREA_FIELDS.map((f) => (
            <label key={f.key} className="block md:col-span-2">
              <span className="font-mono text-xs text-terminal/60">{f.label}</span>
              <textarea
                rows={3}
                value={form[f.key] ?? ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-ink px-3 py-2 text-terminal focus:border-lime focus:outline-none font-body"
              />
              <span className="mt-1 block font-mono text-[11px] text-terminal/50">{f.tip}</span>
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
            <span className="mt-1 block font-mono text-[11px] text-terminal/50">শিক্ষার্থীর প্রত্যাশিত পর্যায়।</span>
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
            <span className="mt-1 block font-mono text-[11px] text-terminal/50">কোর্সটি কোন বিষয়ে পড়ে সেটি বেছে নিন।</span>
          </label>

          <label className="flex items-start gap-2 font-mono text-xs text-terminal md:col-span-2">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={form.is_published}
              onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
            />
            <span>
              পাবলিশ করুন
              <span className="block text-terminal/50">চেক করলে কোর্সটি সাথে সাথে সবার জন্য দৃশ্যমান হবে। খসড়া রাখতে চাইলে আনচেক রাখুন।</span>
            </span>
          </label>

          <button
            type="submit"
            disabled={!parsed.valid || mut.isPending}
            className="md:col-span-2 rounded-md bg-lime px-5 py-3 font-mono text-sm font-bold text-ink disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {mut.isPending ? "সংরক্ষণ হচ্ছে…" : "সংরক্ষণ করুন"}
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
            <button
              onClick={() => confirmDelete(c)}
              disabled={delMut.isPending}
              className="rounded-md border border-red-400/40 px-3 py-1 font-mono text-xs text-red-300 hover:border-red-400 hover:bg-red-500/10 disabled:opacity-50"
            >
              ডিলিট
            </button>

          </div>
        ))}
      </div>
    </div>
  );
}
