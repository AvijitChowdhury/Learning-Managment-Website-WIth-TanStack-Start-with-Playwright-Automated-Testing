import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createCourseCharge } from "@/lib/payments.functions";
import { previewCoupon } from "@/lib/lms-admin.functions";
import { isCurrentUserAdmin } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { fmtBDT } from "@/lib/format";


export const Route = createFileRoute("/_authenticated/checkout/$courseId")({
  head: () => ({ meta: [{ title: "চেকআউট — শিখো" }, { name: "robots", content: "noindex" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { courseId } = Route.useParams();
  const charge = useServerFn(createCourseCharge);
  const preview = useServerFn(previewCoupon);
  const checkAdmin = useServerFn(isCurrentUserAdmin);
  const navigate = useNavigate();
  const { data: adminInfo } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => checkAdmin(),
  });
  const [course, setCourse] = useState<any>(null);

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number; final: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    if (adminInfo?.admin) {
      navigate({ to: "/admin", replace: true });
    }
  }, [adminInfo?.admin, navigate]);

  useEffect(() => {
    supabase
      .from("courses")
      .select("id,title,slug,price,discount_price,thumbnail_url,subtitle")
      .eq("id", courseId)
      .eq("is_published", true)
      .maybeSingle()
      .then(({ data }) => setCourse(data));
  }, [courseId]);


  const baseAmount = Number(course?.discount_price ?? course?.price ?? 0);
  const finalAmount = applied ? applied.final : baseAmount;

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setCouponMsg(null);
    setCouponLoading(true);
    try {
      const res = await preview({ data: { code: couponInput.trim(), amount: baseAmount } });
      setApplied({ code: res.code, discount: res.discount, final: res.final });
      setCouponMsg(`কুপন প্রয়োগ হয়েছে — ${fmtBDT(res.discount)} ছাড়`);
    } catch (e: any) {
      setApplied(null);
      setCouponMsg(e?.message ?? "কুপন যাচাই ব্যর্থ");
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setApplied(null);
    setCouponInput("");
    setCouponMsg(null);
  }

  async function pay() {
    setErr(null);
    setLoading(true);
    try {
      const res = await charge({
        data: { courseId, couponCode: applied?.code },
      });
      if (res.alreadyEnrolled) {
        navigate({ to: "/dashboard/courses/$id", params: { id: courseId } });
        return;
      }
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

        {/* Coupon */}
        <div className="mt-6 border-t border-border pt-6">
          <div className="font-mono text-xs text-terminal/60 mb-2">কুপন কোড</div>
          {applied ? (
            <div className="flex items-center justify-between rounded-md border border-lime/40 bg-lime/10 px-3 py-2">
              <div className="font-mono text-sm text-lime">{applied.code}</div>
              <button
                onClick={removeCoupon}
                className="font-mono text-[11px] text-terminal/70 hover:text-red-300"
              >
                সরান
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="COUPON20"
                className="flex-1 rounded-md border border-border bg-ink px-3 py-2 font-mono text-sm text-terminal focus:border-lime focus:outline-none"
              />
              <button
                onClick={applyCoupon}
                disabled={couponLoading || !couponInput.trim()}
                className="rounded-md border border-lime px-4 font-mono text-xs font-bold text-lime hover:bg-lime hover:text-ink disabled:opacity-50"
              >
                {couponLoading ? "…" : "প্রয়োগ"}
              </button>
            </div>
          )}
          {couponMsg && (
            <p className={`mt-2 font-mono text-[11px] ${applied ? "text-lime" : "text-red-300"}`}>
              {couponMsg}
            </p>
          )}
        </div>

        <div className="mt-6 border-t border-border pt-6 space-y-2 font-body">
          <div className="flex justify-between text-terminal/70">
            <span>সাবটোটাল</span>
            <span className="font-mono">{fmtBDT(baseAmount)}</span>
          </div>
          {applied && (
            <div className="flex justify-between text-lime">
              <span>ছাড় ({applied.code})</span>
              <span className="font-mono">− {fmtBDT(applied.discount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-border">
            <span className="text-terminal/70">মোট</span>
            <span className="font-display text-2xl font-bold text-lime">{fmtBDT(finalAmount)}</span>
          </div>
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
          {loading ? "প্রক্রিয়াকরণ…" : `${fmtBDT(finalAmount)} — পেমেন্ট করুন →`}
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
