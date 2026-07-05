import { createFileRoute, Link } from "@tanstack/react-router";
import { PlayCircle, Sparkles, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/free-class")({
  head: () => ({
    meta: [
      { title: "ফ্রি ডেমো ক্লাস — Shikho" },
      { name: "description", content: "রেজিস্ট্রেশনের আগে বিনামূল্যে একটি সম্পূর্ণ ক্লাস দেখুন — শিক্ষকের পড়ানোর ধরন ও কোর্সের মান যাচাই করুন।" },
      { property: "og:title", content: "ফ্রি ডেমো ক্লাস — Shikho" },
      { property: "og:description", content: "বিনামূল্যে একটি সম্পূর্ণ ক্লাস দেখুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FreeClassPage,
});

function FreeClassPage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="container-page py-14 md:py-20">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber/40 bg-amber/10 px-3 py-1 font-mono text-xs text-amber">
            <Sparkles className="h-3.5 w-3.5" /> বিনামূল্যে
          </span>
          <h1 className="mt-4 font-bn-serif text-4xl md:text-5xl font-extrabold leading-tight text-terminal">
            ফ্রি ডেমো ক্লাস দেখুন
          </h1>
          <p className="mt-4 max-w-2xl font-body text-lg text-terminal/75">
            রেজিস্ট্রেশনের আগে একটি সম্পূর্ণ ক্লাস দেখুন। শিক্ষকের পড়ানোর ধরন, কনটেন্টের গভীরতা এবং কোর্সের মান নিজে যাচাই করুন।
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-lg">
            <div className="aspect-video w-full bg-black">
              <iframe
                className="h-full w-full"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                title="Free demo class"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-6">
              <h2 className="font-display text-xl font-semibold text-terminal">ডেমো ক্লাস: শুরু হোক শেখার যাত্রা</h2>
              <p className="mt-2 text-sm text-terminal/70">
                এই ক্লাসে আপনি একটি টপিকের সম্পূর্ণ পাঠদান দেখতে পাবেন — ঠিক যেমনটা পেইড কোর্সে থাকে।
              </p>
            </div>
          </div>

          <aside className="rounded-xl border border-border bg-card p-6 h-fit">
            <h3 className="font-display text-lg font-semibold text-terminal">এই ক্লাসে যা পাবেন</h3>
            <ul className="mt-4 space-y-3 text-sm text-terminal/80">
              {[
                "সম্পূর্ণ একটি লেসন — কোনো কাটছাঁট নেই",
                "HD ভিডিও কোয়ালিটি",
                "মোবাইল/ট্যাব/ল্যাপটপে চালানোর সুবিধা",
                "শিক্ষকের পড়ানোর স্টাইল সরাসরি দেখুন",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/courses"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-lime px-4 py-3 font-mono text-sm font-bold text-ink hover:brightness-95"
            >
              <PlayCircle className="h-4 w-4" /> সব কোর্স দেখুন
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
