import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  adminListOrders,
  adminSetOrderStatus,
  adminExportOrdersCsv,
  adminSetOrderMethod,
  PAYMENT_METHODS,
} from "@/lib/admin.functions";
import { fmtBDT } from "@/lib/format";
import { toast } from "sonner";
import { Mail, Phone, Download, Pencil, Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: AdminOrders,
});

const STATUSES = ["PAID", "PENDING", "FAILED", "REFUNDED", "CANCELLED"] as const;
type Tab = "ALL" | "INCOMPLETE" | "PAID";

function AdminOrders() {
  const list = useServerFn(adminListOrders);
  const setStatus = useServerFn(adminSetOrderStatus);
  const setMethod = useServerFn(adminSetOrderMethod);
  const exportCsv = useServerFn(adminExportOrdersCsv);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-orders"], queryFn: () => list() });
  const [tab, setTab] = useState<Tab>("ALL");
  const [editing, setEditing] = useState<string | null>(null);
  const [draftMethod, setDraftMethod] = useState<string>("");
  const [draftTxn, setDraftTxn] = useState<string>("");

  const mut = useMutation({
    mutationFn: (v: { orderId: string; status: any }) => setStatus({ data: v }),
    onSuccess: (res: any) => {
      toast.success(res?.enrolled ? "পেইড — ইউজারকে কোর্স অ্যাক্সেস দেওয়া হয়েছে" : "আপডেটেড");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "ব্যর্থ"),
  });

  const methodMut = useMutation({
    mutationFn: (v: { orderId: string; payment_method: string | null; transaction_id: string | null }) =>
      setMethod({ data: v }),
    onSuccess: () => {
      toast.success("মেথড আপডেটেড");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "মেথড আপডেট ব্যর্থ"),
  });

  const filtered = useMemo(() => {
    const all = data ?? [];
    if (tab === "INCOMPLETE") return all.filter((o: any) => ["PENDING", "FAILED", "CANCELLED"].includes(o.status));
    if (tab === "PAID") return all.filter((o: any) => o.status === "PAID");
    return all;
  }, [data, tab]);

  const counts = useMemo(() => {
    const all = data ?? [];
    return {
      all: all.length,
      incomplete: all.filter((o: any) => ["PENDING", "FAILED", "CANCELLED"].includes(o.status)).length,
      paid: all.filter((o: any) => o.status === "PAID").length,
    };
  }, [data]);

  async function handleExport() {
    try {
      const { csv, filename } = await exportCsv();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message ?? "এক্সপোর্ট ব্যর্থ");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-code-gray overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border gap-3 flex-wrap">
        <div className="flex gap-1">
          {(
            [
              ["ALL", `সব (${counts.all})`],
              ["INCOMPLETE", `অসম্পূর্ণ (${counts.incomplete})`],
              ["PAID", `পেইড (${counts.paid})`],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k as Tab)}
              className={`rounded-md px-3 py-1.5 font-mono text-xs transition ${
                tab === k
                  ? "bg-lime text-ink font-bold"
                  : "border border-border text-terminal/70 hover:text-lime hover:border-lime/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1 rounded-md border border-lime px-3 py-1.5 font-mono text-xs text-lime hover:bg-lime hover:text-ink"
        >
          <Download className="h-3.5 w-3.5" /> CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm font-body">
          <thead className="text-left text-terminal/60 font-mono text-xs uppercase">
            <tr className="border-t border-border">
              <th className="p-3">তারিখ</th>
              <th className="p-3">ইউজার</th>
              <th className="p-3">যোগাযোগ</th>
              <th className="p-3">কোর্স</th>
              <th className="p-3">অ্যামাউন্ট</th>
              <th className="p-3">মেথড</th>
              <th className="p-3">স্ট্যাটাস</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="p-4 text-terminal/50">লোড…</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-terminal/50 font-mono text-xs">কোনো অর্ডার নেই</td></tr>
            )}
            {filtered.map((o: any) => (
              <tr key={o.id} className="border-t border-border/50 text-terminal/90 align-top">
                <td className="p-3 font-mono text-xs text-terminal/70">
                  {new Date(o.created_at).toLocaleString("bn-BD")}
                </td>
                <td className="p-3">{o.profiles?.name ?? o.profiles?.email ?? "—"}</td>
                <td className="p-3 space-y-1">
                  {o.profiles?.email && (
                    <a
                      href={`mailto:${o.profiles.email}`}
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-terminal/80 hover:text-lime"
                    >
                      <Mail className="h-3 w-3" /> {o.profiles.email}
                    </a>
                  )}
                  {o.sender_number && (
                    <a
                      href={`tel:${o.sender_number}`}
                      className="block inline-flex items-center gap-1 font-mono text-[11px] text-terminal/80 hover:text-lime"
                    >
                      <Phone className="h-3 w-3" /> {o.sender_number}
                    </a>
                  )}
                  {!o.profiles?.email && !o.sender_number && <span className="text-terminal/40">—</span>}
                </td>
                <td className="p-3">{o.courses?.title ?? "—"}</td>
                <td className="p-3 font-mono">{fmtBDT(Number(o.amount))}</td>
                <td className="p-3 font-mono text-xs">
                  {editing === o.id ? (
                    <div className="flex flex-col gap-1 min-w-[10rem]">
                      <select
                        value={draftMethod}
                        onChange={(e) => setDraftMethod(e.target.value)}
                        className="rounded border border-border bg-ink px-2 py-1 font-mono text-xs text-terminal"
                      >
                        <option value="">— নেই —</option>
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <input
                        value={draftTxn}
                        onChange={(e) => setDraftTxn(e.target.value)}
                        placeholder="Transaction ID"
                        className="rounded border border-border bg-ink px-2 py-1 font-mono text-[11px] text-terminal"
                      />
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={methodMut.isPending}
                          onClick={() =>
                            methodMut.mutate({
                              orderId: o.id,
                              payment_method: draftMethod || null,
                              transaction_id: draftTxn || null,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded border border-lime px-2 py-0.5 text-[11px] text-lime hover:bg-lime hover:text-ink"
                        >
                          <Check className="h-3 w-3" /> সেভ
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[11px] text-terminal/70 hover:text-lime"
                        >
                          <X className="h-3 w-3" /> বাতিল
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(o.id);
                        setDraftMethod(o.payment_method ?? "");
                        setDraftTxn(o.transaction_id ?? "");
                      }}
                      className="group inline-flex flex-col items-start gap-0.5 text-left hover:text-lime"
                    >
                      <span className="inline-flex items-center gap-1">
                        <span className={o.payment_method ? "" : "text-terminal/40"}>
                          {o.payment_method || "সেট করুন"}
                        </span>
                        <Pencil className="h-3 w-3 opacity-40 group-hover:opacity-100" />
                      </span>
                      {o.transaction_id && (
                        <span className="text-[10px] text-terminal/50">{o.transaction_id}</span>
                      )}
                    </button>
                  )}
                </td>
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
