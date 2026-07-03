import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListOrders, adminSetOrderStatus } from "@/lib/admin.functions";
import { fmtBDT } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: AdminOrders,
});

const STATUSES = ["PAID", "PENDING", "FAILED", "REFUNDED", "CANCELLED"] as const;

function AdminOrders() {
  const list = useServerFn(adminListOrders);
  const setStatus = useServerFn(adminSetOrderStatus);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-orders"], queryFn: () => list() });
  const mut = useMutation({
    mutationFn: (v: { orderId: string; status: any }) => setStatus({ data: v }),
    onSuccess: () => {
      toast.success("আপডেটেড");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "ব্যর্থ"),
  });

  return (
    <div className="rounded-2xl border border-border bg-code-gray overflow-hidden">
      <div className="p-4 font-mono text-xs text-terminal/60">$ orders --all</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm font-body">
          <thead className="text-left text-terminal/60 font-mono text-xs uppercase">
            <tr className="border-t border-border">
              <th className="p-3">তারিখ</th>
              <th className="p-3">ইউজার</th>
              <th className="p-3">কোর্স</th>
              <th className="p-3">অ্যামাউন্ট</th>
              <th className="p-3">মেথড</th>
              <th className="p-3">Txn</th>
              <th className="p-3">স্ট্যাটাস</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="p-4 text-terminal/50">লোড…</td></tr>
            )}
            {data?.map((o: any) => (
              <tr key={o.id} className="border-t border-border/50 text-terminal/90">
                <td className="p-3 font-mono text-xs text-terminal/70">
                  {new Date(o.created_at).toLocaleString("bn-BD")}
                </td>
                <td className="p-3">{o.profiles?.name ?? o.profiles?.email ?? "—"}</td>
                <td className="p-3">{o.courses?.title ?? "—"}</td>
                <td className="p-3 font-mono">{fmtBDT(Number(o.amount))}</td>
                <td className="p-3 font-mono text-xs">{o.payment_method ?? "—"}</td>
                <td className="p-3 font-mono text-[10px] text-terminal/60">{o.transaction_id ?? "—"}</td>
                <td className="p-3">
                  <select
                    value={o.status}
                    onChange={(e) => mut.mutate({ orderId: o.id, status: e.target.value })}
                    className="rounded border border-border bg-ink px-2 py-1 font-mono text-xs text-terminal"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
