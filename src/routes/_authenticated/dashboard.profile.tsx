import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { updateMyProfile } from "@/lib/learning.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  head: () => ({ meta: [{ title: "প্রোফাইল — শিখো" }, { name: "robots", content: "noindex" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = Route.useRouteContext();
  const update = useServerFn(updateMyProfile);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [pwd, setPwd] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setName(data?.name ?? "");
        setAvatar(data?.avatar_url ?? "");
      });
  }, [user.id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await update({ data: { name: name || undefined, avatar_url: avatar || undefined } });
      toast.success("সংরক্ষিত হয়েছে");
    } catch (e: any) {
      toast.error(e?.message ?? "সংরক্ষণ ব্যর্থ");
    } finally {
      setSaving(false);
    }
  }

  async function changePwd(e: React.FormEvent) {
    e.preventDefault();
    if (pwd.length < 6) return toast.error("কমপক্ষে ৬ অক্ষর");
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) toast.error(error.message);
    else {
      toast.success("পাসওয়ার্ড পরিবর্তিত");
      setPwd("");
    }
  }

  return (
    <div className="container-page py-12 max-w-xl">
      <Link to="/dashboard" className="font-mono text-xs text-terminal/60 hover:text-lime">
        ← ড্যাশবোর্ড
      </Link>
      <h1 className="mt-2 font-bn-serif text-3xl font-bold text-terminal">প্রোফাইল</h1>

      <form onSubmit={save} className="mt-6 rounded-2xl border border-border bg-code-gray p-6 space-y-4">
        <label className="block">
          <span className="font-mono text-xs text-terminal/60">নাম</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-ink px-3 py-2 font-body text-terminal focus:border-lime focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="font-mono text-xs text-terminal/60">অ্যাভাটার URL</span>
          <input
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-ink px-3 py-2 font-body text-terminal focus:border-lime focus:outline-none"
          />
        </label>
        <button
          disabled={saving}
          className="rounded-md bg-lime px-5 py-2 font-mono text-sm font-bold text-ink disabled:opacity-50"
        >
          {saving ? "সংরক্ষণ…" : "সংরক্ষণ করুন"}
        </button>
      </form>

      <form onSubmit={changePwd} className="mt-6 rounded-2xl border border-border bg-code-gray p-6 space-y-4">
        <h2 className="font-bn-serif text-lg font-semibold text-terminal">পাসওয়ার্ড পরিবর্তন</h2>
        <input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="নতুন পাসওয়ার্ড"
          className="w-full rounded-md border border-border bg-ink px-3 py-2 font-body text-terminal focus:border-lime focus:outline-none"
        />
        <button className="rounded-md border border-lime text-lime px-5 py-2 font-mono text-sm font-bold">
          পরিবর্তন করুন
        </button>
      </form>
    </div>
  );
}
