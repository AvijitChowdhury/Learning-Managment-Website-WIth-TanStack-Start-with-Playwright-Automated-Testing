import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listMyOrders } from "@/lib/learning.functions";
import { fmtBDT } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/orders")({
  head: () => ({ meta: [{ title: "অর্ডার — শিখো" }, { name: "robots", content: "noindex" }] }),
  component: OrdersPage,
});

const statusColor: Record<string, string> = {
  PAID: "text-lime border-lime/40 bg-lime/10",
  PENDING: "text-amber-300 border-amber-400/40 bg-amber-400/10",
  FAILED: "text-red-300 border-red-400/40 bg-red-400/10",
  CANCELLED: "text-terminal/60 border-border bg-white/5",
  REFUNDED: "text-blue-300 border-blue-400/40 bg-blue-400/10",
};

function OrdersPage() {
  const fetchOrders = useServerFn(listMyOrders);
  const { data, isLoading } = useQuery({ queryKey: ["my-orders"], queryFn: () => fetchOrders() });

  return (
    <div className="container-page py-12">
      <Link to="/dashboard" className="font-mono text-xs text-terminal/60 hover:text-lime">
        ← ড্যাশবোর্ড
      </Link>
      <h1 className="mt-2 font-bn-serif text-3xl font-bold text-terminal">অর্ডার হিস্ট্রি</h1>

      {isLoading && <p className="mt-6 text-terminal/60 font-body">লোড হচ্ছে…</p>}
      {data && data.length === 0 && (
        <p className="mt-6 text-terminal/60 font-body">কোনো অর্ডার নেই।</p>
      )}
      <div className="mt-6 space-y-3">
        {data?.map((o: any) => (
          <div
            key={o.id}
            className="rounded-xl border border-border bg-code-gray p-4 flex flex-wrap items-center gap-4"
          >
            <div className="flex-1 min-w-[200px]">
              <div className="font-bn-serif text-terminal font-semibold">
                {o.course?.title ?? "—"}
              </div>
              <div className="mt-1 font-mono text-xs text-terminal/50">
                #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleString("bn-BD")}
              </div>
              {o.payment_method && (
                <div className="mt-1 font-mono text-[10px] text-terminal/40">
                  {o.payment_method} · {o.transaction_id ?? "—"}
                </div>
              )}
            </div>
            <div className="font-display text-xl font-bold text-terminal">{fmtBDT(Number(o.amount))}</div>
            <span
              className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase ${
                statusColor[o.status] ?? "text-terminal/60 border-border"
              }`}
            >
              {o.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
