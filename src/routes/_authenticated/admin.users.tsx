import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { adminListUsers } from "@/lib/admin.functions";
import { fmtBDT } from "@/lib/format";
import { Mail, Search, Shield, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "ইউজার — অ্যাডমিন" }, { name: "robots", content: "noindex" }] }),
  component: AdminUsers,
});

function AdminUsers() {
  const list = useServerFn(adminListUsers);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-users"], queryFn: () => list() });
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "STUDENT">("ALL");

  const rows = useMemo(() => {
    const all = data ?? [];
    const needle = q.trim().toLowerCase();
    return all.filter((u: any) => {
      if (roleFilter !== "ALL" && !(u.roles ?? []).includes(roleFilter)) return false;
      if (!needle) return true;
      return (
        (u.email ?? "").toLowerCase().includes(needle) ||
        (u.name ?? "").toLowerCase().includes(needle) ||
        u.id.toLowerCase().includes(needle)
      );
    });
  }, [data, q, roleFilter]);

  const counts = useMemo(() => {
    const all = data ?? [];
    return {
      total: all.length,
      admins: all.filter((u: any) => (u.roles ?? []).includes("ADMIN")).length,
      students: all.filter((u: any) => (u.roles ?? []).includes("STUDENT")).length,
    };
  }, [data]);

  return (
    <div className="rounded-2xl border border-border bg-code-gray overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border">
        <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-terminal/70">
          <span><UserIcon className="inline h-3.5 w-3.5 mr-1 text-lime" /> মোট {counts.total}</span>
          <span><Shield className="inline h-3.5 w-3.5 mr-1 text-lime" /> অ্যাডমিন {counts.admins}</span>
          <span>স্টুডেন্ট {counts.students}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {(["ALL", "ADMIN", "STUDENT"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`rounded-md px-3 py-1.5 font-mono text-xs transition ${
                  roleFilter === r
                    ? "bg-lime text-ink font-bold"
                    : "border border-border text-terminal/70 hover:text-lime hover:border-lime/40"
                }`}
              >
                {r === "ALL" ? "সব" : r === "ADMIN" ? "অ্যাডমিন" : "স্টুডেন্ট"}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-terminal/50" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="নাম / ইমেইল খুঁজুন…"
              className="rounded-md border border-border bg-ink pl-7 pr-3 py-1.5 font-mono text-xs text-terminal placeholder:text-terminal/40 focus:border-lime focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm font-body">
          <thead className="text-left text-terminal/60 font-mono text-xs uppercase">
            <tr className="border-t border-border">
              <th className="p-3">ইউজার</th>
              <th className="p-3">ইমেইল</th>
              <th className="p-3">রোল</th>
              <th className="p-3">এনরোলমেন্ট</th>
              <th className="p-3">অর্ডার</th>
              <th className="p-3">মোট খরচ</th>
              <th className="p-3">জয়েন</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="p-4 text-terminal/50 font-mono text-xs">লোড…</td></tr>
            )}
            {error && (
              <tr><td colSpan={7} className="p-4 text-red-300 font-mono text-xs">{(error as any)?.message ?? "ব্যর্থ"}</td></tr>
            )}
            {!isLoading && !error && rows.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-terminal/50 font-mono text-xs">কোনো ইউজার নেই</td></tr>
            )}
            {rows.map((u: any) => (
              <tr key={u.id} className="border-t border-border/50 text-terminal/90 align-top">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-ink border border-border grid place-items-center text-[10px] font-mono text-terminal/60">
                        {(u.name ?? u.email ?? "?").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold">{u.name ?? "—"}</div>
                      <div className="font-mono text-[10px] text-terminal/40">{u.id.slice(0, 8)}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  {u.email ? (
                    <a href={`mailto:${u.email}`} className="inline-flex items-center gap-1 font-mono text-[11px] text-terminal/80 hover:text-lime">
                      <Mail className="h-3 w-3" /> {u.email}
                    </a>
                  ) : <span className="text-terminal/40">—</span>}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {(u.roles ?? []).map((r: string) => (
                      <span
                        key={r}
                        className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase ${
                          r === "ADMIN"
                            ? "border-lime/50 text-lime bg-lime/10"
                            : "border-border text-terminal/70"
                        }`}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-3 font-mono text-xs">{u.enrollments}</td>
                <td className="p-3 font-mono text-xs">
                  {u.paidOrders}<span className="text-terminal/40"> / {u.orders}</span>
                </td>
                <td className="p-3 font-mono text-xs">{fmtBDT(Number(u.totalSpent))}</td>
                <td className="p-3 font-mono text-[10px] text-terminal/60">
                  {new Date(u.created_at).toLocaleDateString("bn-BD")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
