import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  TrendingUp,
  ShoppingBag,
  Users,
  BookOpen,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { adminOverview, adminExportOrdersCsv, adminOverviewCharts } from "@/lib/admin.functions";
import { fmtBDT } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "অ্যাডমিন ওভারভিউ — শিখো" }, { name: "robots", content: "noindex" }] }),
  component: AdminIndex,
});

const STATUS_COLORS: Record<string, string> = {
  PAID: "#a3e635",
  PENDING: "#f59e0b",
  FAILED: "#ef4444",
  REFUNDED: "#60a5fa",
  CANCELLED: "#94a3b8",
};

function AdminIndex() {
  const fn = useServerFn(adminOverview);
  const chartsFn = useServerFn(adminOverviewCharts);
  const exportCsv = useServerFn(adminExportOrdersCsv);
  const { data, isLoading } = useQuery({ queryKey: ["admin-overview"], queryFn: () => fn() });
  const { data: charts } = useQuery({
    queryKey: ["admin-overview-charts"],
    queryFn: () => chartsFn(),
  });

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

  const kpis = [
    {
      l: "মোট বিক্রি",
      v: fmtBDT(data.revenue),
      Icon: TrendingUp,
      accent: "text-lime",
      ring: "from-lime/30 to-transparent",
    },
    {
      l: "মোট এনরোলমেন্ট",
      v: String(data.orderCount),
      Icon: ShoppingBag,
      accent: "text-terminal",
      ring: "from-indigo/30 to-transparent",
    },
    {
      l: "শিক্ষার্থী",
      v: String(data.studentCount),
      Icon: Users,
      accent: "text-terminal",
      ring: "from-sky-400/30 to-transparent",
    },
    {
      l: "কোর্স",
      v: String(data.courseCount),
      Icon: BookOpen,
      accent: "text-terminal",
      ring: "from-fuchsia-400/30 to-transparent",
    },
  ];

  const today = [
    {
      l: "আজকের এনরোলমেন্ট",
      v: String(data.todayEnrolCount),
      Icon: ShoppingBag,
      tone: "lime" as const,
    },
    {
      l: "আজকের বিক্রি",
      v: fmtBDT(data.todaySale),
      Icon: TrendingUp,
      tone: "lime" as const,
    },
    {
      l: "আজকের অসম্পূর্ণ অর্ডার",
      v: String(data.todayIncomplete),
      Icon: AlertTriangle,
      tone: "amber" as const,
    },
  ];

  const dayLabel = (iso: string) => {
    const d = new Date(iso + "T00:00:00Z");
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  };
  const revenueSeries = (charts?.days ?? []).map((d) => ({ ...d, label: dayLabel(d.date) }));
  const topCourseBars = data.topCourses.map((c) => ({
    name: c.title.length > 20 ? c.title.slice(0, 20) + "…" : c.title,
    revenue: c.total,
    orders: c.count,
  }));
  const statusPie = charts?.statusBreakdown ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bn-serif text-2xl font-bold text-terminal">সামগ্রিক ওভারভিউ</h2>
          <p className="font-mono text-xs text-terminal/60">গত ১৪ দিনের রিভিনিউ ও অর্ডার ট্রেন্ড</p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 font-mono text-xs text-terminal hover:border-lime hover:text-lime"
        >
          <Download className="h-3.5 w-3.5" /> CSV এক্সপোর্ট
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ l, v, Icon, accent, ring }) => (
          <div
            key={l}
            className={`relative overflow-hidden rounded-2xl border border-border bg-code-gray p-6`}
          >
            <div
              className={`pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-radial ${ring} blur-2xl`}
              style={{
                background: `radial-gradient(closest-side, ${
                  accent.includes("lime") ? "rgba(163,230,53,0.25)" : "rgba(99,102,241,0.18)"
                }, transparent)`,
              }}
            />
            <div className="relative flex items-center gap-2 font-mono text-xs text-terminal/60">
              <Icon className={`h-3.5 w-3.5 ${accent}`} /> {l}
            </div>
            <div className={`relative mt-2 font-display text-3xl font-bold ${accent}`}>{v}</div>
          </div>
        ))}
      </div>

      {/* Today activity */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 font-bn-serif text-lg font-bold text-terminal">
          <Clock className="h-4 w-4 text-amber-400" /> আজকের কার্যক্রম
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {today.map(({ l, v, Icon, tone }) => (
            <div key={l} className="rounded-2xl border border-border bg-code-gray p-6">
              <div className="flex items-center gap-2 font-mono text-xs text-terminal/60">
                <Icon
                  className={`h-3.5 w-3.5 ${tone === "amber" ? "text-amber-400" : "text-lime"}`}
                />{" "}
                {l}
              </div>
              <div
                className={`mt-2 font-display text-3xl font-bold ${
                  tone === "amber" ? "text-amber-400" : "text-lime"
                }`}
              >
                {v}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue trend */}
      <div className="rounded-2xl border border-border bg-code-gray p-4 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-bn-serif text-lg font-bold text-terminal">
            <TrendingUp className="h-4 w-4 text-lime" /> রিভিনিউ ট্রেন্ড (১৪ দিন)
          </h3>
          <span className="font-mono text-[11px] text-terminal/50">প্রতিদিনের পেইড অর্ডার</span>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <AreaChart data={revenueSeries} margin={{ top: 10, right: 12, bottom: 0, left: -8 }}>
              <defs>
                <linearGradient id="lime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a3e635" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#a3e635" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={{ stroke: "#334155" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={{ stroke: "#334155" }}
                tickLine={false}
                width={60}
                tickFormatter={(v: number) => (v >= 1000 ? `৳${Math.round(v / 1000)}k` : `৳${v}`)}
              />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  fontFamily: "monospace",
                  fontSize: 12,
                }}
                labelStyle={{ color: "#a3e635" }}
                formatter={(value: number, name: string) =>
                  name === "revenue" ? [fmtBDT(value), "রিভিনিউ"] : [value, "অর্ডার"]
                }
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#a3e635"
                strokeWidth={2}
                fill="url(#lime)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top courses bar + Status pie */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-border bg-code-gray p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bn-serif text-lg font-bold text-terminal">
              <BookOpen className="h-4 w-4 text-lime" /> টপ কোর্স (রিভিনিউ)
            </h3>
            <Link to="/admin/orders" className="font-mono text-xs text-terminal/60 hover:text-lime">
              সব অর্ডার →
            </Link>
          </div>
          {topCourseBars.length === 0 ? (
            <p className="py-8 text-center font-mono text-xs text-terminal/50">কোনো ডেটা নেই।</p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <BarChart
                  data={topCourseBars}
                  layout="vertical"
                  margin={{ top: 4, right: 16, bottom: 0, left: 8 }}
                >
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={{ stroke: "#334155" }}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `৳${Math.round(v / 1000)}k` : `৳${v}`
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "#e2e8f0", fontSize: 12 }}
                    width={130}
                    axisLine={{ stroke: "#334155" }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number, name: string) =>
                      name === "revenue" ? [fmtBDT(value), "রিভিনিউ"] : [value, "অর্ডার"]
                    }
                  />
                  <Bar dataKey="revenue" fill="#a3e635" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-code-gray p-4 sm:p-6">
          <h3 className="mb-3 flex items-center gap-2 font-bn-serif text-lg font-bold text-terminal">
            <CheckCircle2 className="h-4 w-4 text-lime" /> অর্ডার স্ট্যাটাস (১৪ দিন)
          </h3>
          {statusPie.length === 0 ? (
            <p className="py-8 text-center font-mono text-xs text-terminal/50">কোনো ডেটা নেই।</p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={statusPie}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {statusPie.map((s) => (
                      <Cell
                        key={s.status}
                        fill={STATUS_COLORS[s.status] ?? "#64748b"}
                        stroke="#0f172a"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, fontFamily: "monospace", color: "#94a3b8" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
