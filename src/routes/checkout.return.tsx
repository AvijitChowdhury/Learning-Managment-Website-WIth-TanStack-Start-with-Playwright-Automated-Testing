import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { verifyPaymentByInvoice } from "@/lib/payments.functions";


export const Route = createFileRoute("/checkout/return")({
  head: () => ({ meta: [{ title: "পেমেন্ট যাচাই — শিখো" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    invoice_id: typeof s.invoice_id === "string" ? s.invoice_id : undefined,
  }),
  component: ReturnPage,
});

function ReturnPage() {
  const { invoice_id } = Route.useSearch();
  const verify = useServerFn(verifyPaymentByInvoice);
  const [state, setState] = useState<
    { s: "loading" } | { s: "paid"; courseId?: string } | { s: "pending" } | { s: "failed"; msg?: string }
  >({ s: "loading" });

  useEffect(() => {
    if (!invoice_id) {
      setState({ s: "failed", msg: "invoice_id missing" });
      return;
    }
    verify({ data: { invoice_id } })
      .then((r) => {
        if (r.status === "PAID") setState({ s: "paid", courseId: r.courseId });
        else if (r.status === "PENDING") setState({ s: "pending" });
        else setState({ s: "failed" });
      })
      .catch((e) => setState({ s: "failed", msg: e?.message }));
  }, [invoice_id, verify]);

  return (
    <div className="container-page py-24 max-w-xl text-center">
      <div className="rounded-2xl border border-border bg-code-gray p-10">
        {state.s === "loading" && (
          <>
            <div className="font-mono text-xs text-lime">$ verifying payment…</div>
            <h1 className="mt-3 font-bn-serif text-3xl font-bold text-terminal">যাচাই করা হচ্ছে…</h1>
          </>
        )}
        {state.s === "paid" && (
          <>
            <div className="font-mono text-xs text-lime">$ success</div>
            <h1 className="mt-3 font-bn-serif text-3xl font-bold text-terminal">
              পেমেন্ট সফল 🎉
            </h1>
            <p className="mt-3 text-terminal/70 font-body">
              অভিনন্দন — কোর্সে এনরোল করা হয়েছে। এখনই শুরু করুন।
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {state.courseId && (
                <Link
                  to="/dashboard/courses/$id"
                  params={{ id: state.courseId }}
                  className="rounded-md bg-lime px-5 py-3 font-mono text-sm font-bold text-ink"
                >
                  কোর্স শুরু করুন →
                </Link>
              )}
              <Link
                to="/dashboard"
                className="rounded-md border border-border px-5 py-3 font-mono text-sm text-terminal hover:border-lime"
              >
                ড্যাশবোর্ড
              </Link>
            </div>
          </>
        )}
        {state.s === "pending" && (
          <>
            <div className="font-mono text-xs text-amber-400">$ pending</div>
            <h1 className="mt-3 font-bn-serif text-3xl font-bold text-terminal">অপেক্ষমাণ</h1>
            <p className="mt-3 text-terminal/70 font-body">
              পেমেন্ট এখনো প্রসেস হচ্ছে। কিছুক্ষণ পরে ড্যাশবোর্ড থেকে চেক করুন।
            </p>
            <Link
              to="/dashboard/orders"
              className="mt-6 inline-block rounded-md bg-lime px-5 py-3 font-mono text-sm font-bold text-ink"
            >
              অর্ডার হিস্ট্রি
            </Link>
          </>
        )}
        {state.s === "failed" && (
          <>
            <div className="font-mono text-xs text-red-400">$ failed</div>
            <h1 className="mt-3 font-bn-serif text-3xl font-bold text-terminal">পেমেন্ট ব্যর্থ</h1>
            <p className="mt-3 text-terminal/70 font-body">{state.msg ?? "আবার চেষ্টা করুন।"}</p>
            <Link
              to="/courses"
              className="mt-6 inline-block rounded-md bg-lime px-5 py-3 font-mono text-sm font-bold text-ink"
            >
              কোর্স দেখুন
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
