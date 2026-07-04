import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { createCourseCharge } from "@/lib/payments.functions";
import { supabase } from "@/integrations/supabase/client";
import { fmtBDT } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/checkout/$courseId")({
  head: () => ({ meta: [{ title: "চেকআউট — শিখো" }, { name: "robots", content: "noindex" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { courseId } = Route.useParams();
  const charge = useServerFn(createCourseCharge);
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("courses")
      .select("id,title,slug,price,discount_price,thumbnail_url,subtitle")
      .eq("id", courseId)
      .eq("is_published", true)
      .maybeSingle()
      .then(({ data }) => setCourse(data));
  }, [courseId]);

  async function pay() {
    setErr(null);
    setLoading(true);
    try {
      const res = await charge({ data: { courseId } });
      if (res.alreadyEnrolled) {
        navigate({ to: "/dashboard/courses/$id", params: { id: courseId } });
        return;
      }
      // Break out of the Lovable preview iframe — payment gateways send
      // X-Frame-Options: DENY, so navigating the iframe shows "refused to connect".
      const target = res.payment_url!;
      try {
        (window.top ?? window).location.href = target;
      } catch {
        window.open(target, "_blank", "noopener,noreferrer");
      }
    } catch (e: any) {
      setErr(e?.message ?? "কিছু ভুল হয়েছে");
      setLoading(false);
    }
  }

  if (!course) {
    return <div className="container-page py-16 font-body text-terminal/70">লোড হচ্ছে…</div>;
  }
  const amount = Number(course.discount_price ?? course.price ?? 0);

  return (
    <div className="container-page py-16 max-w-2xl">
      <div className="rounded-2xl border border-border bg-code-gray p-8">
        <div className="font-mono text-xs text-lime">$ checkout --secure</div>
        <h1 className="mt-2 font-bn-serif text-3xl font-bold text-terminal">চেকআউট</h1>
        <div className="mt-6 flex gap-4 items-center border-t border-border pt-6">
          {course.thumbnail_url && (
            <img src={course.thumbnail_url} alt="" className="h-20 w-32 rounded object-cover" />
          )}
          <div className="flex-1">
            <div className="font-bn-serif text-lg font-semibold text-terminal">{course.title}</div>
            {course.subtitle && (
              <div className="mt-1 text-sm text-terminal/60 font-body">{course.subtitle}</div>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-between border-t border-border pt-6 font-body">
          <span className="text-terminal/70">মোট</span>
          <span className="font-display text-2xl font-bold text-lime">{fmtBDT(amount)}</span>
        </div>
        <p className="mt-4 text-xs text-terminal/60 font-mono">
          bKash · Nagad · Rocket · Card — powered by UddoktaPay
        </p>
        {err && (
          <div className="mt-4 rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 font-body">
            {err}
          </div>
        )}
        <button
          onClick={pay}
          disabled={loading}
          className="mt-6 w-full rounded-md bg-lime px-6 py-4 font-mono text-sm font-bold text-ink hover:brightness-95 disabled:opacity-50"
        >
          {loading ? "প্রক্রিয়াকরণ…" : `${fmtBDT(amount)} — পেমেন্ট করুন →`}
        </button>
        <Link
          to="/courses/$slug"
          params={{ slug: course.slug }}
          className="mt-4 block text-center text-xs font-mono text-terminal/60 hover:text-lime"
        >
          ← কোর্সে ফিরে যান
        </Link>
      </div>
    </div>
  );
}
