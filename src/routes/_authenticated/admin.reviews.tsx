import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListReviews, adminToggleReview } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  component: AdminReviews,
});

function AdminReviews() {
  const list = useServerFn(adminListReviews);
  const toggle = useServerFn(adminToggleReview);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-reviews"], queryFn: () => list() });
  const mut = useMutation({
    mutationFn: (v: any) => toggle({ data: v }),
    onSuccess: () => {
      toast.success("আপডেটেড");
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
  });

  return (
    <div className="space-y-3">
      {data?.map((r: any) => (
        <div key={r.id} className="rounded-xl border border-border bg-code-gray p-4">
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <div className="font-bn-serif text-terminal font-semibold">{r.courses?.title ?? "—"}</div>
              <div className="font-mono text-[11px] text-terminal/50">
                {r.profiles?.name ?? r.profiles?.email ?? "—"} · {new Date(r.created_at).toLocaleDateString("bn-BD")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lime">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
              <button
                onClick={() => mut.mutate({ id: r.id, hidden: !r.is_hidden })}
                className={`rounded-md border px-3 py-1 font-mono text-xs ${
                  r.is_hidden
                    ? "border-lime text-lime"
                    : "border-red-400/40 text-red-300"
                }`}
              >
                {r.is_hidden ? "আনহাইড" : "হাইড"}
              </button>
            </div>
          </div>
          {r.comment && <p className="mt-2 font-body text-terminal/80">{r.comment}</p>}
        </div>
      ))}
      {data && data.length === 0 && <p className="text-terminal/60">কোনো রিভিউ নেই।</p>}
    </div>
  );
}
