import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { bn } from "@/lib/i18n/bn";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "ড্যাশবোর্ড — শিখো" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState<string>("");

  useEffect(() => {
    supabase
      .from("profiles")
      .select("name, email")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setName(data?.name ?? data?.email ?? ""));
  }, [user.id]);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="container-page py-16">
      <div className="rounded-2xl border border-border bg-code-gray p-8">
        <div className="font-mono text-xs text-lime">$ whoami</div>
        <h1 className="mt-3 font-bn-serif text-4xl font-bold text-terminal">
          স্বাগতম, <span className="text-lime">{name || "শিক্ষার্থী"}</span>
        </h1>
        <p className="mt-2 font-body text-terminal/70">
          আপনার কোর্সগুলো এখানে দেখতে পাবেন। এখনো কোনো কোর্স এনরোল করেননি?
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/courses"
            className="rounded-md bg-lime px-5 py-3 font-mono text-sm font-bold text-ink hover:brightness-95"
          >
            কোর্স ব্রাউজ করুন →
          </Link>
          <button
            onClick={handleSignOut}
            className="rounded-md border border-border px-5 py-3 font-mono text-sm text-terminal hover:border-lime hover:text-lime transition-colors"
          >
            {bn.nav.logout ?? "লগআউট"}
          </button>
        </div>
      </div>
    </div>
  );
}
