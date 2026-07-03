import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/checkout/cancelled")({
  head: () => ({ meta: [{ title: "বাতিল — শিখো" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="container-page py-24 max-w-xl text-center">
      <div className="rounded-2xl border border-border bg-code-gray p-10">
        <div className="font-mono text-xs text-amber-400">$ cancelled</div>
        <h1 className="mt-3 font-bn-serif text-3xl font-bold text-terminal">পেমেন্ট বাতিল</h1>
        <p className="mt-3 text-terminal/70 font-body">
          আপনি পেমেন্ট বাতিল করেছেন। প্রস্তুত হলে আবার চেষ্টা করুন।
        </p>
        <Link
          to="/courses"
          className="mt-6 inline-block rounded-md bg-lime px-5 py-3 font-mono text-sm font-bold text-ink"
        >
          কোর্স দেখুন
        </Link>
      </div>
    </div>
  ),
});
