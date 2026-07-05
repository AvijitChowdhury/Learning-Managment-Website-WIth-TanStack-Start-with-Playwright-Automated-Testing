import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Download, TrendingUp, ShoppingBag, Users, BookOpen, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { adminOverview, adminExportOrdersCsv } from "@/lib/admin.functions";
import { fmtBDT } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminIndex,
});

function AdminIndex() {
  const fn = useServerFn(adminOverview);
  const exportCsv = useServerFn(adminExportOrdersCsv);
  const { data, isLoading } = useQuery({ queryKey: ["admin-overview"], queryFn: () => fn() });

  async function handleExport() {
    try {
      const res = await exportCsv();
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message ?? "এক্সপোর্ট ব্যর্থ");
    }
  }


  if (isLoading) return <p className="text-terminal/60">লোড হচ্ছে…</p>;
  if (!data) return null;

  const overall = [
    { l: "মোট এনরোলমেন্ট", v: String(data.orderCount), Icon: ShoppingBag },
    { l: "মোট বিক্রি", v: fmtBDT(data.revenue), Icon: TrendingUp },
    { l: "শিক্ষার্থী", v: String(data.studentCount), Icon: Users },
    { l: "কোর্স", v: String(data.courseCount), Icon: BookOpen },
  ];

  const today = [
    { l: "আজকের এনরোলমেন্ট", v: String(data.todayEnrolCount), Icon: ShoppingBag, tone: "lime" },
    { l: "আজকের বিক্রি", v: fmtBDT(data.todaySale), Icon: TrendingUp, tone: "lime" },
    { l: "আজকের অসম্পূর্ণ অর্ডার", v: String(data.todayIncomplete), Icon: AlertTriangle, tone: "amber" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bn-serif text-xl font-bold text-terminal">সামগ্রিক ওভারভিউ</h2>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 font-mono text-xs text-terminal hover:border-lime hover:text-lime"
        >
          <Download className="h-3.5 w-3.5" /> CSV এক্সপোর্ট
        </button>

      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overall.map(({ l, v, Icon }) => (
          <div key={l} className="rounded-2xl border border-border bg-code-gray p-6">
            <div className="flex items-center gap-2 font-mono text-xs text-terminal/60">
              <Icon className="h-3.5 w-3.5" /> {l}
            </div>
            <div className="mt-2 font-display text-3xl font-bold text-lime">{v}</div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 font-bn-serif text-xl font-bold text-terminal">
          <Clock className="h-5 w-5 text-amber" /> আজকের কার্যক্রম
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {today.map(({ l, v, Icon, tone }) => (
            <div key={l} className="rounded-2xl border border-border bg-code-gray p-6">
              <div className="flex items-center gap-2 font-mono text-xs text-terminal/60">
                <Icon className={`h-3.5 w-3.5 ${tone === "amber" ? "text-amber" : "text-lime"}`} /> {l}
              </div>
              <div
                className={`mt-2 font-display text-3xl font-bold ${tone === "amber" ? "text-amber" : "text-lime"}`}
              >
                {v}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-code-gray p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bn-serif text-xl font-bold text-terminal">টপ কোর্স</h2>
          <Link
            to="/admin/orders"
            className="font-mono text-xs text-terminal/60 hover:text-lime"
          >
            সব অর্ডার →
          </Link>
        </div>
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
