import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { MessageSquare, ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { adminListReviews, adminToggleReview } from "@/lib/admin.functions";

const PAGE_SIZE = 20;

const searchSchema = z.object({
  page: fallback(z.number().int().min(1), 1).default(1),
  courseId: fallback(z.string().uuid().or(z.literal("")), "").default(""),
});

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  head: () => ({
    meta: [{ title: "রিভিউ — অ্যাডমিন" }, { name: "robots", content: "noindex" }],
  }),
  validateSearch: zodValidator(searchSchema),
  component: AdminReviews,
});

function AdminReviews() {
  const { page, courseId } = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/reviews" });
  const list = useServerFn(adminListReviews);
  const toggle = useServerFn(adminToggleReview);
  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-reviews", page, courseId || null],
    queryFn: () =>
      list({
        data: {
          page,
          pageSize: PAGE_SIZE,
          courseId: courseId || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });

  const mut = useMutation({
    mutationFn: (v: { id: string; hidden: boolean }) => toggle({ data: v }),
    onSuccess: () => {
      toast.success("আপডেটেড");
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "আপডেট করা যায়নি"),
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const courses = data?.courses ?? [];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const filtered = !!courseId;

  const goPage = (p: number) =>
    navigate({
      search: (prev: { page: number; courseId: string }) => ({
        ...prev,
        page: Math.min(Math.max(1, p), totalPages),
      }),
    });
  const setCourse = (id: string) =>
    navigate({
      search: (prev: { page: number; courseId: string }) => ({
        ...prev,
        courseId: id,
        page: 1,
      }),
    });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <MessageSquare className="h-6 w-6 text-lime" />
        <h2 className="font-bn-serif text-2xl font-bold text-terminal">রিভিউ ব্যবস্থাপনা</h2>
        <span className="font-mono text-xs text-terminal/50">
          মোট: {total.toLocaleString("bn-BD")}
        </span>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <Filter className="h-4 w-4 text-terminal/60" />
        <label className="font-mono text-[11px] text-terminal/70">কোর্স:</label>
        <select
          value={courseId}
          onChange={(e) => setCourse(e.target.value)}
          className="min-w-[220px] max-w-[360px] rounded-md border border-border bg-background px-2 py-1.5 text-sm text-terminal outline-none focus:border-lime"
        >
          <option value="">সব কোর্স</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        {filtered && (
          <button
            onClick={() => setCourse("")}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 font-mono text-[10px] text-terminal/70 hover:border-lime hover:text-lime"
          >
            <X className="h-3 w-3" /> ফিল্টার সাফ করুন
          </button>
        )}
        <div className="ml-auto font-mono text-[11px] text-terminal/50">
          {isFetching ? "লোড হচ্ছে…" : total > 0 ? `${from}–${to} / ${total}` : ""}
        </div>
      </div>

      {/* States */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-border bg-code-gray"
            />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-400/40 bg-red-500/5 p-6 text-center">
          <p className="font-mono text-sm text-red-300">
            রিভিউ লোড করা যায়নি: {(error as any)?.message ?? "অজানা ত্রুটি"}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-3 rounded-md border border-red-400/50 px-3 py-1 font-mono text-xs text-red-200 hover:bg-red-500/10"
          >
            আবার চেষ্টা করুন
          </button>
        </div>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-terminal/40" />
          <h3 className="mt-3 font-bn-serif text-lg font-semibold text-terminal">
            {filtered ? "এই কোর্সের কোনো রিভিউ নেই" : "এখনো কোনো রিভিউ জমা হয়নি"}
          </h3>
          <p className="mt-1 font-mono text-xs text-terminal/60">
            {filtered
              ? "অন্য কোর্স নির্বাচন করুন বা ফিল্টার সাফ করুন।"
              : "শিক্ষার্থীরা কোর্স রিভিউ দেওয়া শুরু করলে এখানে দেখা যাবে।"}
          </p>
          {filtered && (
            <button
              onClick={() => setCourse("")}
              className="mt-4 inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 font-mono text-xs text-terminal/80 hover:border-lime hover:text-lime"
            >
              <X className="h-3 w-3" /> ফিল্টার সাফ করুন
            </button>
          )}
        </div>
      )}

      {/* Rows */}
      {!isLoading && !isError && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((r: any) => (
            <div
              key={r.id}
              className={`rounded-xl border p-4 ${
                r.is_hidden
                  ? "border-amber-400/30 bg-amber-500/5"
                  : "border-border bg-code-gray"
              }`}
            >
              <div className="flex flex-wrap justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bn-serif font-semibold text-terminal">
                    {r.courses?.title ?? "— (deleted course)"}
                  </div>
                  <div className="font-mono text-[11px] text-terminal/50">
                    {r.profiles?.name ?? r.profiles?.email ?? "— (unknown user)"} ·{" "}
                    {new Date(r.created_at).toLocaleDateString("bn-BD")}
                    {r.is_hidden && (
                      <span className="ml-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-1.5 py-0.5 text-amber-300">
                        হাইড করা
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lime" aria-label={`${r.rating} out of 5`}>
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </span>
                  <button
                    onClick={() => mut.mutate({ id: r.id, hidden: !r.is_hidden })}
                    disabled={mut.isPending}
                    className={`rounded-md border px-3 py-1 font-mono text-xs disabled:opacity-50 ${
                      r.is_hidden
                        ? "border-lime text-lime hover:bg-lime/10"
                        : "border-red-400/40 text-red-300 hover:bg-red-500/10"
                    }`}
                  >
                    {r.is_hidden ? "আনহাইড" : "হাইড"}
                  </button>
                </div>
              </div>
              {r.comment && (
                <p className="mt-2 whitespace-pre-line font-body text-terminal/80">{r.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => goPage(page - 1)}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 font-mono text-xs text-terminal disabled:opacity-40"
          >
            <ChevronLeft className="h-3 w-3" /> আগের
          </button>
          <span className="font-mono text-xs text-terminal/70">
            পৃষ্ঠা {page} / {totalPages}
          </span>
          <button
            onClick={() => goPage(page + 1)}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 font-mono text-xs text-terminal disabled:opacity-40"
          >
            পরের <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
