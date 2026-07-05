import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, TicketPercent, Pencil, X, Calendar } from "lucide-react";
import { toast } from "sonner";
import { deleteCoupon, listCoupons, upsertCoupon } from "@/lib/lms-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  head: () => ({ meta: [{ title: "কুপন — অ্যাডমিন" }, { name: "robots", content: "noindex" }] }),
  component: CouponsAdmin,
});

// ISO string → yyyy-MM-dd (local date) for <input type="date">
function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// yyyy-MM-dd → ISO. `endOfDay=true` sets 23:59:59 local time so the coupon
// stays valid through the entire end date.
function dateInputToIso(v: string, endOfDay = false): string | null {
  if (!v) return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const dt = new Date(
    +y,
    +mo - 1,
    +d,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
  );
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("bn-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function validityLine(c: any): string {
  const s = c.starts_at ? fmtDate(c.starts_at) : "এখন";
  const e = c.ends_at ? fmtDate(c.ends_at) : "অনির্দিষ্ট";
  return `${s} → ${e}`;
}

function couponStatus(c: any): { label: string; tone: "lime" | "amber" | "red" | "muted" } {
  if (!c.active) return { label: "বন্ধ", tone: "muted" };
  const now = new Date();
  if (c.starts_at && new Date(c.starts_at).getTime() > now.getTime())
    return { label: "শীঘ্রই সক্রিয়", tone: "amber" };
  if (c.ends_at && new Date(c.ends_at).getTime() < now.getTime())
    return { label: "মেয়াদ শেষ", tone: "red" };
  if (c.max_uses != null && (c.used_count ?? 0) >= c.max_uses)
    return { label: "সীমা শেষ", tone: "red" };
  if (c.ends_at) {
    const left = daysBetween(now, new Date(c.ends_at));
    if (left <= 7) return { label: `${left} দিন বাকি`, tone: "amber" };
  }
  return { label: "সক্রিয়", tone: "lime" };
}


type FormState = {
  id?: string;
  code: string;
  type: "PERCENT" | "FLAT";
  value: string;
  startsAt: string;
  endsAt: string;
  maxUses: string;
  active: boolean;
};

const emptyForm: FormState = {
  code: "",
  type: "PERCENT",
  value: "10",
  startsAt: "",
  endsAt: "",
  maxUses: "",
  active: true,
};

function CouponsAdmin() {
  const list = useServerFn(listCoupons);
  const upsert = useServerFn(upsertCoupon);
  const del = useServerFn(deleteCoupon);
  const qc = useQueryClient();

  const { data: coupons = [] } = useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: () => list(),
  });

  const [form, setForm] = useState<FormState>(emptyForm);
  const editing = !!form.id;

  const startEdit = (c: any) =>
    setForm({
      id: c.id,
      code: c.code,
      type: c.discount_type,
      value: String(c.discount_value),
      startsAt: isoToLocalInput(c.starts_at),
      endsAt: isoToLocalInput(c.ends_at),
      maxUses: c.max_uses ? String(c.max_uses) : "",
      active: !!c.active,
    });

  const reset = () => setForm(emptyForm);

  const upsertMut = useMutation({
    mutationFn: (data: any) => upsert({ data }),
    onSuccess: () => {
      toast.success(editing ? "কুপন আপডেট হয়েছে" : "কুপন যোগ হয়েছে");
      reset();
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

  const submit = () => {
    if (!form.code.trim() || !form.value) return;
    if (form.startsAt && form.endsAt && new Date(form.startsAt) >= new Date(form.endsAt)) {
      toast.error("শুরুর তারিখ শেষের তারিখের আগে হতে হবে");
      return;
    }
    upsertMut.mutate({
      id: form.id,
      code: form.code.trim(),
      discount_type: form.type,
      discount_value: Number(form.value),
      starts_at: localInputToIso(form.startsAt),
      ends_at: localInputToIso(form.endsAt),
      max_uses: form.maxUses ? Number(form.maxUses) : null,
      active: form.active,
    });
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <TicketPercent className="h-6 w-6 text-lime" />
        <h2 className="font-bn-serif text-2xl font-bold text-terminal">কুপন ব্যবস্থাপনা</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-terminal">
              {editing ? "কুপন এডিট করুন" : "নতুন কুপন"}
            </h3>
            {editing && (
              <button
                onClick={reset}
                className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 font-mono text-[10px] text-terminal/70 hover:border-lime hover:text-lime"
              >
                <X className="h-3 w-3" /> বাতিল
              </button>
            )}
          </div>
          <div className="mt-4 grid gap-3">
            <input
              value={form.code}
              onChange={(e) =>
                setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })
              }
              placeholder="কোড (যেমন SAVE20)"
              maxLength={40}
              disabled={editing}
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-lime disabled:opacity-60"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-lime"
              >
                <option value="PERCENT">% ছাড়</option>
                <option value="FLAT">ফ্ল্যাট (৳)</option>
              </select>
              <input
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                min={1}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-lime"
                placeholder="ভ্যালু"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 font-mono text-[11px] text-terminal/60">
                শুরু (আপনার সময়)
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-terminal outline-none focus:border-lime"
                />
              </label>
              <label className="flex flex-col gap-1 font-mono text-[11px] text-terminal/60">
                শেষ (আপনার সময়)
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                  min={form.startsAt || undefined}
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-terminal outline-none focus:border-lime"
                />
              </label>
            </div>
            <input
              type="number"
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
              placeholder="সর্বোচ্চ ব্যবহার (ঐচ্ছিক)"
              min={1}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-lime"
            />
            <label className="inline-flex items-center gap-2 text-sm text-terminal">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              সক্রিয়
            </label>
            <button
              disabled={upsertMut.isPending || !form.code.trim() || !form.value}
              onClick={submit}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-lime px-4 py-2 font-mono text-xs font-bold text-ink disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> {editing ? "আপডেট" : "কুপন যোগ করুন"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3 font-mono text-xs text-terminal/70">
            মোট: {coupons.length}
          </div>
          <ul className="divide-y divide-border">
            {coupons.map((c: any) => {
              const st = couponStatus(c);
              const toneCls =
                st.tone === "lime"
                  ? "text-lime border-lime/40 bg-lime/10"
                  : st.tone === "amber"
                    ? "text-amber-400 border-amber-400/40 bg-amber-400/10"
                    : st.tone === "red"
                      ? "text-red-300 border-red-400/40 bg-red-500/10"
                      : "text-terminal/60 border-border bg-code-gray";
              return (
                <li key={c.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold text-terminal">{c.code}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${toneCls}`}
                        >
                          {st.label}
                        </span>
                        <span className="rounded-full border border-border bg-code-gray px-2 py-0.5 font-mono text-[10px] text-terminal/70">
                          {c.discount_type === "PERCENT"
                            ? `${c.discount_value}% ছাড়`
                            : `৳${c.discount_value} ছাড়`}
                        </span>
                      </div>
                      <div className="mt-1.5 grid gap-1 font-mono text-[11px] text-terminal/60 sm:grid-cols-2">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-lime" />
                          শুরু: <span className="text-terminal/80">{fmtDate(c.starts_at)}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-amber-400" />
                          শেষ: <span className="text-terminal/80">{fmtDate(c.ends_at)}</span>
                        </span>
                        <span>
                          ব্যবহার: {c.used_count ?? 0}
                          {c.max_uses ? ` / ${c.max_uses}` : " (আনলিমিটেড)"}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        onClick={() => startEdit(c)}
                        className="rounded-md border border-border p-1.5 text-terminal/70 hover:border-lime hover:text-lime"
                        aria-label="এডিট"
                        title="এডিট"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => confirm(`ডিলিট করবেন "${c.code}"?`) && delMut.mutate(c.id)}
                        className="rounded-md border border-border p-1.5 text-terminal/60 hover:border-destructive hover:text-destructive"
                        aria-label="মুছুন"
                        title="মুছুন"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
            {coupons.length === 0 && (
              <li className="p-5 text-sm text-terminal/60">এখনও কোনো কুপন নেই।</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
