import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  adminListInstructors,
  adminSaveInstructor,
  adminDeleteInstructor,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/instructors")({
  head: () => ({ meta: [{ title: "ইন্সট্রাক্টর — অ্যাডমিন" }, { name: "robots", content: "noindex" }] }),
  component: AdminInstructors,
});

const optUrl = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^https?:\/\/.+/i.test(v), "");

const instructorSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, ""),
  headline: z.string().trim().max(200).optional().or(z.literal("")),
  bio: z.string().trim().max(5000).optional().or(z.literal("")),
  avatar_url: optUrl.or(z.literal("")),
  cover_url: optUrl.or(z.literal("")),
  website_url: optUrl.or(z.literal("")),
  twitter_url: optUrl.or(z.literal("")),
  linkedin_url: optUrl.or(z.literal("")),
  github_url: optUrl.or(z.literal("")),
  youtube_url: optUrl.or(z.literal("")),
  years_experience: z
    .union([z.coerce.number().int().min(0).max(80), z.literal("").transform(() => null), z.null()])
    .optional(),
  expertise: z.string().trim().max(2000).optional().or(z.literal("")),
});

type FormState = {
  id?: string;
  name: string;
  slug: string;
  headline: string;
  bio: string;
  avatar_url: string;
  cover_url: string;
  website_url: string;
  twitter_url: string;
  linkedin_url: string;
  github_url: string;
  youtube_url: string;
  years_experience: string;
  expertise: string;
  is_published: boolean;
};

const emptyForm = (): FormState => ({
  name: "",
  slug: "",
  headline: "",
  bio: "",
  avatar_url: "",
  cover_url: "",
  website_url: "",
  twitter_url: "",
  linkedin_url: "",
  github_url: "",
  youtube_url: "",
  years_experience: "",
  expertise: "",
  is_published: true,
});

function slugify(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function AdminInstructors() {
  const list = useServerFn(adminListInstructors);
  const save = useServerFn(adminSaveInstructor);
  const del = useServerFn(adminDeleteInstructor);
  const qc = useQueryClient();

  const { data: items } = useQuery({
    queryKey: ["admin-instructors"],
    queryFn: () => list(),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const avatarRef = useRef<HTMLInputElement | null>(null);
  const coverRef = useRef<HTMLInputElement | null>(null);

  const parsed = useMemo(() => {
    const r = instructorSchema.safeParse(form);
    if (r.success) return { valid: true, bad: new Set<string>() };
    const bad = new Set<string>();
    for (const issue of r.error.issues) {
      const first = issue.path[0];
      if (typeof first === "string") bad.add(first);
    }
    return { valid: false, bad };
  }, [form]);

  const mut = useMutation({
    mutationFn: (payload: any) => save({ data: payload }),
    onSuccess: () => {
      toast.success(form.id ? "আপডেট হয়েছে" : "ইন্সট্রাক্টর যোগ হয়েছে");
      qc.invalidateQueries({ queryKey: ["admin-instructors"] });
      setOpen(false);
      setForm(emptyForm());
    },
    onError: (e: any) => toast.error(e?.message ?? "ব্যর্থ"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("ডিলিট হয়েছে");
      qc.invalidateQueries({ queryKey: ["admin-instructors"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "ডিলিট ব্যর্থ"),
  });

  function edit(row: any) {
    setForm({
      id: row.id,
      name: row.name ?? "",
      slug: row.slug ?? "",
      headline: row.headline ?? "",
      bio: row.bio ?? "",
      avatar_url: row.avatar_url ?? "",
      cover_url: row.cover_url ?? "",
      website_url: row.website_url ?? "",
      twitter_url: row.twitter_url ?? "",
      linkedin_url: row.linkedin_url ?? "",
      github_url: row.github_url ?? "",
      youtube_url: row.youtube_url ?? "",
      years_experience: row.years_experience?.toString() ?? "",
      expertise: (row.expertise ?? []).join(", "),
      is_published: row.is_published,
    });
    setOpen(true);
  }

  function confirmDelete(row: any) {
    if (row.course_count > 0) {
      toast.error(`এই ইন্সট্রাক্টরের সাথে ${row.course_count}টি কোর্স যুক্ত। প্রথমে সরিয়ে নিন।`);
      return;
    }
    toast(`"${row.name}" ডিলিট করবেন?`, {
      duration: 8000,
      action: { label: "হ্যাঁ, ডিলিট", onClick: () => delMut.mutate(row.id) },
      cancel: { label: "বাতিল", onClick: () => {} },
    });
  }

  async function uploadImage(file: File, target: "avatar" | "cover") {
    if (!file.type.startsWith("image/")) return toast.error("শুধু ইমেজ ফাইল");
    if (file.size > 5 * 1024 * 1024) return toast.error("সর্বোচ্চ ৫MB");
    setUploading(target);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `instructors/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("course-thumbnails")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage
        .from("course-thumbnails")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr || !signed?.signedUrl) throw sErr ?? new Error("URL তৈরি ব্যর্থ");
      setForm((f) => ({ ...f, [target === "avatar" ? "avatar_url" : "cover_url"]: signed.signedUrl }));
      toast.success("আপলোড হয়েছে");
    } catch (e: any) {
      toast.error(e?.message ?? "আপলোড ব্যর্থ");
    } finally {
      setUploading(null);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed.valid) {
      const map: Record<string, string> = {
        name: "নাম",
        slug: "স্লাগ",
        headline: "হেডলাইন",
        bio: "পরিচিতি",
        avatar_url: "অ্যাভাটার URL",
        cover_url: "কভার URL",
        website_url: "ওয়েবসাইট",
        twitter_url: "Twitter",
        linkedin_url: "LinkedIn",
        github_url: "GitHub",
        youtube_url: "YouTube",
        years_experience: "অভিজ্ঞতা",
        expertise: "দক্ষতা",
      };
      toast.error(`পূরণ করুন: ${[...parsed.bad].map((k) => map[k] ?? k).join(", ")}`);
      return;
    }
    const expertise = form.expertise
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 30);
    mut.mutate({
      id: form.id,
      name: form.name.trim(),
      slug: form.slug.trim(),
      headline: form.headline.trim() || null,
      bio: form.bio.trim() || null,
      avatar_url: form.avatar_url.trim() || null,
      cover_url: form.cover_url.trim() || null,
      website_url: form.website_url.trim() || null,
      twitter_url: form.twitter_url.trim() || null,
      linkedin_url: form.linkedin_url.trim() || null,
      github_url: form.github_url.trim() || null,
      youtube_url: form.youtube_url.trim() || null,
      years_experience: form.years_experience === "" ? null : Number(form.years_experience),
      expertise,
      is_published: form.is_published,
    });
  }

  const invalidCls = (k: string) =>
    parsed.bad.has(k)
      ? "border-red-400/60 focus:border-red-400"
      : "border-border focus:border-lime";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bn-serif text-xl font-bold text-terminal">ইন্সট্রাক্টর</h2>
          <p className="font-mono text-[11px] text-terminal/50">
            কোর্সে দেখানোর জন্য ইন্সট্রাক্টর প্রোফাইল যোগ ও ব্যবস্থাপনা করুন।
          </p>
        </div>
        <button
          onClick={() => {
            if (open) {
              setOpen(false);
              setForm(emptyForm());
            } else {
              setForm(emptyForm());
              setOpen(true);
            }
          }}
          className="rounded-md bg-lime px-4 py-2 font-mono text-xs font-bold text-ink"
        >
          {open ? "বন্ধ করুন" : "+ নতুন ইন্সট্রাক্টর"}
        </button>
      </div>

      {open && (
        <form
          onSubmit={submit}
          className="grid gap-4 rounded-2xl border border-border bg-code-gray p-6 md:grid-cols-2"
        >
          <div className="md:col-span-2 rounded-lg border border-lime/30 bg-lime/5 px-4 py-3 font-body text-xs text-terminal/80">
            <span className="font-mono text-lime">টিপ:</span>{" "}
            নাম, স্লাগ ও ছবি দিন। বাকি ফিল্ড ঐচ্ছিক — কোর্স ডিটেইল পেজে যা যা রাখতে চান।
          </div>

          {/* Avatar + Cover */}
          <div className="md:col-span-2 grid gap-4 md:grid-cols-[160px_1fr]">
            <div className="space-y-2">
              <span className="font-mono text-xs text-terminal/60">অ্যাভাটার</span>
              <div className="aspect-square overflow-hidden rounded-full border border-border bg-ink">
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center font-mono text-[10px] text-terminal/40">
                    ছবি নেই
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => avatarRef.current?.click()}
                disabled={uploading === "avatar"}
                className="w-full rounded-md border border-lime/40 bg-lime/10 px-2 py-1.5 font-mono text-[11px] text-lime hover:bg-lime/20 disabled:opacity-40"
              >
                {uploading === "avatar" ? "আপলোড…" : "আপলোড"}
              </button>
              <input
                ref={avatarRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadImage(f, "avatar");
                  if (avatarRef.current) avatarRef.current.value = "";
                }}
              />
              <input
                type="url"
                placeholder="অথবা URL"
                value={form.avatar_url}
                onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                className={`w-full rounded-md border bg-ink px-2 py-1.5 text-xs text-terminal focus:outline-none font-body ${invalidCls("avatar_url")}`}
              />
            </div>

            <div className="space-y-2">
              <span className="font-mono text-xs text-terminal/60">কভার ইমেজ (ঐচ্ছিক)</span>
              <div className="aspect-[3/1] overflow-hidden rounded-md border border-border bg-ink">
                {form.cover_url ? (
                  <img src={form.cover_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center font-mono text-[10px] text-terminal/40">
                    কভার নেই
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => coverRef.current?.click()}
                  disabled={uploading === "cover"}
                  className="rounded-md border border-lime/40 bg-lime/10 px-3 py-1.5 font-mono text-[11px] text-lime hover:bg-lime/20 disabled:opacity-40"
                >
                  {uploading === "cover" ? "আপলোড…" : "আপলোড"}
                </button>
                <input
                  ref={coverRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImage(f, "cover");
                    if (coverRef.current) coverRef.current.value = "";
                  }}
                />
                <input
                  type="url"
                  placeholder="অথবা URL"
                  value={form.cover_url}
                  onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
                  className={`flex-1 rounded-md border bg-ink px-2 py-1.5 text-xs text-terminal focus:outline-none font-body ${invalidCls("cover_url")}`}
                />
              </div>
            </div>
          </div>

          <label className="block">
            <span className="font-mono text-xs text-terminal/60">
              নাম<span className="text-lime"> *</span>
            </span>
            <input
              type="text"
              placeholder="উদা: শাহরিয়ার হাসান"
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => ({
                  ...f,
                  name,
                  slug: !f.id && (!f.slug || f.slug === slugify(f.name)) ? slugify(name) : f.slug,
                }));
              }}
              className={`mt-1 w-full rounded-md border bg-ink px-3 py-2 text-terminal focus:outline-none font-body ${invalidCls("name")}`}
            />
          </label>

          <label className="block">
            <span className="font-mono text-xs text-terminal/60">
              স্লাগ<span className="text-lime"> *</span>
            </span>
            <input
              type="text"
              placeholder="shahriar-hasan"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className={`mt-1 w-full rounded-md border bg-ink px-3 py-2 text-terminal focus:outline-none font-body ${invalidCls("slug")}`}
            />
            <span className="mt-1 block font-mono text-[11px] text-terminal/50">শুধু ছোট হাতের ইংরেজি, সংখ্যা, হাইফেন।</span>
          </label>

          <label className="block md:col-span-2">
            <span className="font-mono text-xs text-terminal/60">হেডলাইন</span>
            <input
              type="text"
              placeholder="সিনিয়র সফটওয়্যার ইঞ্জিনিয়ার · ex-Google"
              value={form.headline}
              onChange={(e) => setForm({ ...form, headline: e.target.value })}
              className={`mt-1 w-full rounded-md border bg-ink px-3 py-2 text-terminal focus:outline-none font-body ${invalidCls("headline")}`}
            />
          </label>

          <label className="block md:col-span-2">
            <span className="font-mono text-xs text-terminal/60">পরিচিতি (বায়ো)</span>
            <textarea
              rows={4}
              placeholder="ইন্সট্রাক্টর সম্পর্কে ২-৩ প্যারা লিখুন।"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className={`mt-1 w-full rounded-md border bg-ink px-3 py-2 text-terminal focus:outline-none font-body ${invalidCls("bio")}`}
            />
          </label>

          <label className="block">
            <span className="font-mono text-xs text-terminal/60">অভিজ্ঞতা (বছর)</span>
            <input
              type="number"
              min={0}
              placeholder="8"
              value={form.years_experience}
              onChange={(e) => setForm({ ...form, years_experience: e.target.value })}
              className={`mt-1 w-full rounded-md border bg-ink px-3 py-2 text-terminal focus:outline-none font-body ${invalidCls("years_experience")}`}
            />
          </label>

          <label className="block">
            <span className="font-mono text-xs text-terminal/60">দক্ষতা (কমা দিয়ে আলাদা)</span>
            <input
              type="text"
              placeholder="Python, React, System Design"
              value={form.expertise}
              onChange={(e) => setForm({ ...form, expertise: e.target.value })}
              className={`mt-1 w-full rounded-md border bg-ink px-3 py-2 text-terminal focus:outline-none font-body ${invalidCls("expertise")}`}
            />
          </label>

          {[
            { k: "website_url", l: "ওয়েবসাইট", ph: "https://example.com" },
            { k: "linkedin_url", l: "LinkedIn", ph: "https://linkedin.com/in/…" },
            { k: "twitter_url", l: "Twitter / X", ph: "https://x.com/…" },
            { k: "github_url", l: "GitHub", ph: "https://github.com/…" },
            { k: "youtube_url", l: "YouTube", ph: "https://youtube.com/@…" },
          ].map((f) => (
            <label key={f.k} className="block">
              <span className="font-mono text-xs text-terminal/60">{f.l}</span>
              <input
                type="url"
                placeholder={f.ph}
                value={(form as any)[f.k]}
                onChange={(e) => setForm({ ...form, [f.k]: e.target.value } as FormState)}
                className={`mt-1 w-full rounded-md border bg-ink px-3 py-2 text-terminal focus:outline-none font-body ${invalidCls(f.k)}`}
              />
            </label>
          ))}

          <label className="flex items-start gap-2 md:col-span-2 font-mono text-xs text-terminal">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={form.is_published}
              onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
            />
            <span>
              পাবলিশ করুন
              <span className="block text-terminal/50">
                আনচেক করলে কোর্স পেজে দেখানো হবে না।
              </span>
            </span>
          </label>

          <button
            type="submit"
            disabled={mut.isPending}
            className="md:col-span-2 rounded-md bg-lime px-5 py-3 font-mono text-sm font-bold text-ink disabled:opacity-40"
          >
            {mut.isPending ? "সংরক্ষণ হচ্ছে…" : form.id ? "আপডেট করুন" : "সংরক্ষণ করুন"}
          </button>
        </form>
      )}

      <div className="grid gap-3">
        {items?.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-code-gray/50 px-4 py-10 text-center font-mono text-xs text-terminal/50">
            এখনো কোনো ইন্সট্রাক্টর নেই। "+ নতুন ইন্সট্রাক্টর" চাপুন।
          </div>
        )}
        {items?.map((row: any) => (
          <div
            key={row.id}
            className="flex items-center gap-4 rounded-xl border border-border bg-code-gray p-4"
          >
            {row.avatar_url ? (
              <img
                src={row.avatar_url}
                alt=""
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-full bg-lime/10 font-mono text-sm font-bold text-lime">
                {row.name?.slice(0, 1) ?? "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-bn-serif font-semibold text-terminal">{row.name}</div>
              <div className="truncate font-mono text-[11px] text-terminal/50">
                /{row.slug}
                {row.headline ? ` · ${row.headline}` : ""}
              </div>
              <div className="font-mono text-[10px] text-terminal/40">
                {row.course_count} কোর্সে যুক্ত
              </div>
            </div>
            <span
              className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase ${
                row.is_published
                  ? "border-lime/40 bg-lime/10 text-lime"
                  : "border-border text-terminal/60"
              }`}
            >
              {row.is_published ? "PUBLISHED" : "DRAFT"}
            </span>
            <button
              onClick={() => edit(row)}
              className="rounded-md border border-border px-3 py-1 font-mono text-xs text-terminal hover:border-lime hover:text-lime"
            >
              এডিট
            </button>
            <button
              onClick={() => confirmDelete(row)}
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
