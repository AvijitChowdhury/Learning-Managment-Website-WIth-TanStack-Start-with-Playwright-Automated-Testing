import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listMyEnrollments } from "@/lib/learning.functions";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({ meta: [{ title: "ড্যাশবোর্ড — শিখো" }, { name: "robots", content: "noindex" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchEnrollments = useServerFn(listMyEnrollments);
  const { data: enrollments, isLoading } = useQuery({
    queryKey: ["my-enrollments"],
    queryFn: () => fetchEnrollments(),
  });

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="container-page py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-xs text-lime">$ whoami</div>
          <h1 className="mt-2 font-bn-serif text-4xl font-bold text-terminal">
            স্বাগতম, <span className="text-lime">{user.user_metadata?.name ?? user.email}</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            to="/dashboard/orders"
            className="rounded-md border border-border px-4 py-2 font-mono text-xs text-terminal hover:border-lime hover:text-lime"
          >
            অর্ডার
          <Link
            to="/dashboard/support"
            className="rounded-md border border-border px-4 py-2 font-mono text-xs text-terminal hover:border-lime hover:text-lime"
          >
            সাপোর্ট
          </Link>
          <Link
            to="/dashboard/profile"
            className="rounded-md border border-border px-4 py-2 font-mono text-xs text-terminal hover:border-lime hover:text-lime"
          >
            প্রোফাইল
          </Link>

          <button
            onClick={handleSignOut}
            className="rounded-md border border-border px-4 py-2 font-mono text-xs text-terminal hover:border-red-400 hover:text-red-400"
          >
            লগআউট
          </button>
        </div>
      </div>

      <h2 className="mt-10 font-bn-serif text-2xl font-bold text-terminal">আমার কোর্স</h2>

      {isLoading && <p className="mt-4 font-body text-terminal/60">লোড হচ্ছে…</p>}

      {enrollments && enrollments.length === 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-code-gray p-8 text-center">
          <p className="font-body text-terminal/70">
            এখনো কোনো কোর্স এনরোল করেননি।
          </p>
          <Link
            to="/courses"
            className="mt-4 inline-block rounded-md bg-lime px-5 py-3 font-mono text-sm font-bold text-ink"
          >
            কোর্স ব্রাউজ করুন →
          </Link>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {enrollments?.map((e: any) => (
          <Link
            key={e.id}
            to="/dashboard/courses/$id"
            params={{ id: e.course.id }}
            className="group rounded-2xl border border-border bg-code-gray overflow-hidden hover:border-lime transition-colors"
          >
            {e.course.thumbnail_url && (
              <img
                src={e.course.thumbnail_url}
                alt=""
                className="h-40 w-full object-cover group-hover:scale-105 transition-transform"
              />
            )}
            <div className="p-4">
              <div className="font-bn-serif text-lg font-semibold text-terminal">{e.course.title}</div>
              <div className="mt-3 h-2 rounded bg-border overflow-hidden">
                <div className="h-full bg-lime" style={{ width: `${e.progress_pct ?? 0}%` }} />
              </div>
              <div className="mt-2 font-mono text-xs text-terminal/60">
                {e.progress_pct ?? 0}% সম্পন্ন
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
