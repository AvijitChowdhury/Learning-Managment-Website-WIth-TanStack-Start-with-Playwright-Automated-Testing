import { createFileRoute, Outlet, Link, redirect } from "@tanstack/react-router";
import { isCurrentUserAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "অ্যাডমিন — শিখো" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    try {
      const r = await isCurrentUserAdmin();
      if (!r.admin) throw redirect({ to: "/dashboard" });
    } catch (e) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="font-mono text-xs text-lime">$ sudo</div>
          <h1 className="font-bn-serif text-3xl font-bold text-terminal">অ্যাডমিন</h1>
        </div>
        <nav className="flex flex-wrap gap-2 font-mono text-xs">
          {[
            { to: "/admin", label: "ওভারভিউ" },
            { to: "/admin/orders", label: "অর্ডার" },
            { to: "/admin/courses", label: "কোর্স" },
            { to: "/admin/reviews", label: "রিভিউ" },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/admin" }}
              className="rounded-md border border-border px-3 py-2 text-terminal hover:border-lime hover:text-lime [&.active]:border-lime [&.active]:text-lime"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  );
}
