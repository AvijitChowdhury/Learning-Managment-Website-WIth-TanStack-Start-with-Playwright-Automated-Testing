import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminOverview } from "@/lib/admin.functions";
import { fmtBDT } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminIndex,
});

function AdminIndex() {
  const fn = useServerFn(adminOverview);
  const { data, isLoading } = useQuery({ queryKey: ["admin-overview"], queryFn: () => fn() });
  if (isLoading) return <p className="text-terminal/60">লোড হচ্ছে…</p>;
  if (!data) return null;
  const stats = [
    { l: "মোট রেভিনিউ", v: fmtBDT(data.revenue) },
    { l: "পেইড অর্ডার", v: String(data.orderCount) },
    { l: "শিক্ষার্থী", v: String(data.studentCount) },
    { l: "কোর্স", v: String(data.courseCount) },
  ];
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l} className="rounded-2xl border border-border bg-code-gray p-6">
            <div className="font-mono text-xs text-terminal/60">{s.l}</div>
            <div className="mt-2 font-display text-3xl font-bold text-lime">{s.v}</div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-code-gray p-6">
        <h2 className="font-bn-serif text-xl font-bold text-terminal">টপ কোর্স</h2>
        <div className="mt-4 divide-y divide-border">
          {data.topCourses.map((c, i) => (
            <div key={i} className="py-3 flex justify-between font-body">
              <span className="text-terminal">{c.title}</span>
              <span className="font-mono text-sm text-terminal/70">
                {c.count} × <span className="text-lime">{fmtBDT(c.total)}</span>
              </span>
            </div>
          ))}
          {!data.topCourses.length && <p className="text-terminal/50 py-2">কোনো ডেটা নেই।</p>}
        </div>
      </div>
    </div>
  );
}
