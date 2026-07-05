import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle, ArrowLeft, LifeBuoy } from "lucide-react";

export const Route = createFileRoute("/checkout/error")({
  head: () => ({
    meta: [
      { title: "পেমেন্ট ব্যর্থ — Shikho" },
      { name: "description", content: "পেমেন্ট সম্পন্ন হয়নি। আবার চেষ্টা করুন বা সাপোর্টে যোগাযোগ করুন।" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentErrorPage,
});

function PaymentErrorPage() {
  return (
    <main className="min-h-[80vh] bg-background">
      <section className="container-page py-20 md:py-28">
        <div className="mx-auto max-w-lg rounded-xl border border-destructive/40 bg-card p-8 text-center shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-9 w-9 text-destructive" aria-hidden />
          </div>
          <h1 className="mt-6 font-bn-serif text-3xl font-extrabold text-terminal">
            পেমেন্ট সম্পন্ন হয়নি
          </h1>
          <p className="mt-3 text-sm text-terminal/70">
            আপনার লেনদেন সম্পন্ন করা যায়নি। কোনো টাকা কাটা হলে ২৪ ঘণ্টার মধ্যে ফেরত পাবেন।
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/courses"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-lime px-5 py-2.5 font-mono text-sm font-bold text-ink hover:brightness-95"
            >
              <ArrowLeft className="h-4 w-4" /> কোর্স পাতায় ফিরে যান
            </Link>
            <Link
              to="/dashboard/support"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-wire px-5 py-2.5 font-mono text-sm font-bold text-terminal hover:border-lime hover:text-lime"
            >
              <LifeBuoy className="h-4 w-4" /> সাপোর্টে যোগাযোগ করুন
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
