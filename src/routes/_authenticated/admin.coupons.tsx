import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, TicketPercent } from "lucide-react";
import { toast } from "sonner";
import { deleteCoupon, listCoupons, upsertCoupon } from "@/lib/lms-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  head: () => ({ meta: [{ title: "কুপন — অ্যাডমিন" }, { name: "robots", content: "noindex" }] }),
  component: CouponsAdmin,
});

function CouponsAdmin() {
  const list = useServerFn(listCoupons);
  const upsert = useServerFn(upsertCoupon);
  const del = useServerFn(deleteCoupon);
  const qc = useQueryClient();

  const { data: coupons = [] } = useQuery({ queryKey: ["admin", "coupons"], queryFn: () => list() });

  const [code, setCode] = useState("");
  const [type, setType] = useState<"PERCENT" | "FLAT">("PERCENT");
  const [value, setValue] = useState<string>("10");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [maxUses, setMaxUses] = useState<string>("");
  const [active, setActive] = useState(true);

  const upsertMut = useMutation({
    mutationFn: (data: any) => upsert({ data }),
    onSuccess: () => {
      toast.success("সংরক্ষিত");
      setCode("");
      setValue("10");
      setStartsAt("");
      setEndsAt("");
      setMaxUses("");
      qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "সমস্যা হয়েছে"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("মুছে ফেলা হয়েছে");
      qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "মুছে ফেলা যায়নি"),
  });

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <TicketPercent className="h-6 w-6 text-lime" />
        <h2 className="font-bn-serif text-2xl font-bold text-terminal">কুপন ব্যবস্থাপনা</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display text-base font-semibold text-terminal">নতুন কুপন</h3>
          <div className="mt-4 grid gap-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
              placeholder="কোড (যেমন SAVE20)"
              maxLength={40}
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-lime"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-lime"
              >
                <option value="PERCENT">% ছাড়</option>
                <option value="FLAT">ফ্ল্যাট (৳)</option>
              </select>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                min={1}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-lime"
                placeholder="ভ্যালু"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 font-mono text-[11px] text-terminal/60">
                শুরু
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-terminal outline-none focus:border-lime"
                />
              </label>
              <label className="flex flex-col gap-1 font-mono text-[11px] text-terminal/60">
                শেষ
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-terminal outline-none focus:border-lime"
                />
              </label>
            </div>
            <input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="সর্বোচ্চ ব্যবহার (ঐচ্ছিক)"
              min={1}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-lime"
            />
            <label className="inline-flex items-center gap-2 text-sm text-terminal">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              সক্রিয়
            </label>
            <button
              disabled={upsertMut.isPending || !code.trim() || !value}
              onClick={() =>
                upsertMut.mutate({
                  code: code.trim(),
                  discount_type: type,
                  discount_value: Number(value),
                  starts_at: startsAt ? new Date(startsAt).toISOString() : null,
                  ends_at: endsAt ? new Date(endsAt).toISOString() : null,
                  max_uses: maxUses ? Number(maxUses) : null,
                  active,
                })
              }
              className="inline-flex items-center justify-center gap-2 rounded-md bg-lime px-4 py-2 font-mono text-xs font-bold text-ink disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> কুপন যোগ করুন
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3 font-mono text-xs text-terminal/70">
            মোট: {coupons.length}
          </div>
          <ul className="divide-y divide-border">
            {coupons.map((c: any) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <div className="font-mono text-sm font-bold text-terminal">{c.code}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-terminal/60">
                    {c.discount_type === "PERCENT" ? `${c.discount_value}%` : `৳${c.discount_value}`} · ব্যবহার:{" "}
                    {c.used_count}
                    {c.max_uses ? `/${c.max_uses}` : ""} ·{" "}
                    <span className={c.active ? "text-lime" : "text-destructive"}>
                      {c.active ? "সক্রিয়" : "বন্ধ"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => delMut.mutate(c.id)}
                  className="rounded-md border border-border p-1.5 text-terminal/60 hover:border-destructive hover:text-destructive"
                  aria-label="মুছুন"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
            {coupons.length === 0 && (
              <li className="p-5 text-sm text-terminal/60">এখনও কোনো কুপন নেই।</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
