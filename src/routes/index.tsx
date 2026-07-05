import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { motion, useScroll, useSpring, useTransform, useMotionValue, useMotionTemplate } from "motion/react";
import { useEffect, useState, useRef } from "react";
import { listPublishedCourses } from "@/lib/courses.functions";
import { bn } from "@/lib/i18n/bn";
import { formatBDT } from "@/lib/format";
import {
  Reveal,
  StaggerGroup,
  Magnetic,
  AnimatedText,
  fadeUp,
} from "@/components/motion-primitives";
import {
  Code2,
  Palette,
  Languages,
  Sheet,
  Search,
  Megaphone,
  Briefcase,
  Sparkles,
  Atom,
  LayoutDashboard,
} from "lucide-react";

const coursesQO = queryOptions({
  queryKey: ["home", "courses"],
  queryFn: () => listPublishedCourses(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "শিখো — বাংলায় শেখার নতুন ঠিকানা" },
      {
        name: "description",
        content:
          "বাংলায় ভিডিও কোর্স, নিরাপদ পেমেন্ট (bKash, Nagad, Rocket, কার্ড), আজীবন অ্যাক্সেস।",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(coursesQO),
  component: HomePage,
  errorComponent: ({ error }) => (
    <div className="container-page py-24 text-center font-mono text-muted-foreground">
      লোড করা যায়নি: {error.message}
    </div>
  ),
});

function Prompt({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-xs md:text-sm tracking-wider text-lime uppercase inline-flex items-center gap-1">
      <span className="text-wire">$</span> {children}
    </span>
  );
}

function TypingHeadline() {
  const phrases = ["প্রোগ্রামিং", "ডিজাইন", "ইংরেজি", "স্কিল ডেভেলপমেন্ট", "ক্যারিয়ার"];
  const [i, setI] = useState(0);
  const [text, setText] = useState("");
  const [del, setDel] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setText(phrases[0]);
      return;
    }
    const current = phrases[i % phrases.length];
    const speed = del ? 45 : 90;
    const t = setTimeout(() => {
      if (!del) {
        setText(current.slice(0, text.length + 1));
        if (text.length + 1 === current.length) setTimeout(() => setDel(true), 1400);
      } else {
        setText(current.slice(0, text.length - 1));
        if (text.length - 1 === 0) { setDel(false); setI(i + 1); }
      }
    }, speed);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, del, i]);

  return <span className="font-mono text-lime caret ml-2 inline-block min-w-[12ch] align-baseline">{text || "\u00A0"}</span>;
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, mass: 0.3 });
  return (
    <motion.div
      style={{ scaleX, transformOrigin: "0% 50%" }}
      className="fixed top-0 left-0 right-0 z-[60] h-[2px] bg-lime shadow-[0_0_12px_2px_rgba(200,255,77,0.6)]"
      aria-hidden
    />
  );
}

function HomePage() {
  const { data } = useSuspenseQuery(coursesQO);
  const featured = data.courses.slice(0, 6);

  // Cinematic: mouse spotlight on hero
  const heroRef = useRef<HTMLElement>(null);
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const spotlight = useMotionTemplate`radial-gradient(600px circle at ${mx}% ${my}%, rgba(200,255,77,0.10), transparent 60%)`;

  // Cinematic: parallax on hero content driven by page scroll
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, -80]);
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0.35]);
  const terminalY = useTransform(scrollY, [0, 600], [0, -40]);
  const terminalRotate = useTransform(scrollY, [0, 600], [0, -2]);

  const tags = [
    { label: "পাইথন", Icon: Code2, color: "#3B82F6" },
    { label: "ডিজাইন", Icon: Palette, color: "#EC4899" },
    { label: "আইইএলটিএস", Icon: Languages, color: "#8B5CF6" },
    { label: "এক্সেল", Icon: Sheet, color: "#22C55E" },
    { label: "এসইও", Icon: Search, color: "#F59E0B" },
    { label: "মার্কেটিং", Icon: Megaphone, color: "#EF4444" },
    { label: "ফ্রিল্যান্সিং", Icon: Briefcase, color: "#14B8A6" },
    { label: "এআই", Icon: Sparkles, color: "#C8FF4D" },
    { label: "রিঅ্যাক্ট", Icon: Atom, color: "#06B6D4" },
    { label: "ইউআই/ইউএক্স", Icon: LayoutDashboard, color: "#F97316" },
  ];

  return (
    <>
      <ScrollProgress />

      {/* Hero */}
      <section
        ref={heroRef}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          mx.set(((e.clientX - r.left) / r.width) * 100);
          my.set(((e.clientY - r.top) / r.height) * 100);
        }}
        className="relative overflow-hidden border-b border-border"
      >
        <div className="absolute inset-0 terminal-grid opacity-40" aria-hidden />
        <div className="absolute inset-0 scanlines pointer-events-none" aria-hidden />
        <motion.div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{ background: spotlight }}
          aria-hidden
        />

        <motion.div
          className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #C8FF4D 0%, transparent 60%)" }}
          animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />
        <motion.div
          className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #3A5F3F 0%, transparent 60%)" }}
          animate={{ x: [0, -30, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative container-page grid gap-6 py-10 md:py-14 lg:grid-cols-[1.1fr_1fr] lg:items-center"
        >
          <div>
            <Prompt>$ boot shikho.sh</Prompt>
            <h1 className="mt-3 font-bn-serif text-[2.4rem] md:text-[4rem] font-extrabold leading-[1.05] text-terminal">
              <AnimatedText text={bn.home.heroTitle} />
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.7 }}
                className="block mt-2 font-display text-xl md:text-2xl font-semibold text-terminal/80"
              >
                এখন শিখছি <TypingHeadline />
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.7 }}
              className="mt-3 max-w-xl font-body text-lg leading-8 text-terminal/75"
            >
              {bn.home.heroSubtitle}
            </motion.p>


            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.6 }}
              transition={{ delay: 0.1, duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <motion.div
                whileHover={{ y: -3, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
              >
                <Link
                  to="/courses"
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-md bg-lime px-6 py-3 font-mono text-sm font-bold text-ink glow-lime"
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" aria-hidden />
                  <span className="relative">চেকআউট শুরু করুন</span>
                  <motion.span aria-hidden className="relative" animate={{ x: [0, 4, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>→</motion.span>
                </Link>
              </motion.div>

              <motion.div
                whileHover={{ y: -3, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
              >
                <Link
                  to="/courses"
                  className="inline-flex items-center gap-2 rounded-md border border-wire px-6 py-3 font-mono text-sm font-bold text-terminal hover:border-lime hover:text-lime hover:shadow-[0_10px_30px_-12px_rgba(200,255,77,0.35)] transition-all"
                >
                  কোর্স মডিউল দেখুন
                </Link>
              </motion.div>

              <motion.div
                whileHover={{ y: -3, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
              >
                <Link
                  to="/free-class"
                  className="inline-flex items-center gap-2 rounded-md border border-amber/50 px-6 py-3 font-mono text-sm font-bold text-amber hover:bg-amber/10 hover:shadow-[0_10px_30px_-12px_rgba(245,158,11,0.35)] transition-all"
                >
                  ফ্রি ক্লাস
                </Link>
              </motion.div>
            </motion.div>


            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6, duration: 0.8 }}
              className="mt-10 flex flex-wrap items-center gap-6 text-xs font-mono text-terminal/60"
            >
              <span><span className="text-amber">★ 4.9</span> / 5.0 রেটিং</span>
              <span className="h-1 w-1 rounded-full bg-wire" />
              <span>১২,০০০+ শিক্ষার্থী</span>
              <span className="h-1 w-1 rounded-full bg-wire" />
              <span>{data.courses.length}+ কোর্স</span>
            </motion.div>
          </div>

          {/* Terminal window preview */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
            whileHover={{ y: -6 }}
            style={{ y: terminalY, rotate: terminalRotate }}
            className="rounded-xl border border-border bg-code-gray shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              {["bg-destructive/80", "bg-amber", "bg-lime"].map((c, i) => (
                <span key={i} className={`h-3 w-3 rounded-full ${c}`} />
              ))}
              <span className="ml-3 font-mono text-xs text-terminal/60">~/shikho/catalog</span>
            </div>
            <div className="p-5 font-mono text-sm space-y-2">
              <div><span className="text-lime">$</span> ls courses/</div>
              {featured.slice(0, 4).map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + i * 0.12 }}
                  className="flex justify-between gap-3 text-terminal/80"
                >
                  <span className="truncate">
                    <span className="text-wire">├─</span> {c.title}
                  </span>
                  <span className="text-lime shrink-0">{formatBDT(c.discount_price ?? c.price)}</span>
                </motion.div>
              ))}
              <div className="pt-2 text-terminal/50">
                <span className="text-lime">$</span> enroll --lifetime <span className="caret" />
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Marquee */}
        <div className="relative mt-4 md:mt-6 border-y border-border bg-code-gray/60 py-0.5 overflow-hidden max-w-5xl mx-auto rounded-md">
          <div className="marquee-track flex gap-6 whitespace-nowrap font-body text-xs text-terminal/80">
            {Array.from({ length: 2 }).map((_, k) => (
              <div key={k} className="flex gap-8 pr-8">
                {tags.map(({ label, Icon, color }) => (
                  <span
                    key={`${k}-${label}`}
                    className="flex flex-col items-center gap-2 hover:text-lime transition-colors"
                  >
                    <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                    <span className="whitespace-pre-line text-center">{label}</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Why */}
      <motion.section
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
        className="border-b border-border"
      >
        <div className="container-page py-20">
          <Reveal>
            <Prompt>$ cat features.md</Prompt>
            <motion.h2
              initial={{ opacity: 0, y: 20, letterSpacing: "0.05em" }}
              whileInView={{ opacity: 1, y: 0, letterSpacing: "0em" }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.2, 0.7, 0.2, 1] }}
              className="mt-4 font-bn-serif text-4xl md:text-5xl font-bold text-terminal"
            >
              {bn.home.whyTitle.replace(/শিখো$/, "")}
              <span className="text-lime">শিখো</span>
            </motion.h2>
          </Reveal>
          <StaggerGroup className="mt-12 grid gap-5 md:grid-cols-3">
            {bn.home.why.map((w, i) => (
              <motion.div
                key={w.t}
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -6, borderColor: "#C8FF4D" }}
                className="group relative overflow-hidden rounded-xl border border-border bg-code-gray p-6"
              >
                <div className="font-mono text-xs text-wire">./{String(i + 1).padStart(2, "0")}</div>
                <h3 className="mt-3 font-display text-xl font-bold text-terminal">{w.t}</h3>
                <p className="mt-2 font-body text-sm leading-relaxed text-terminal/70">{w.d}</p>
              </motion.div>
            ))}
          </StaggerGroup>
        </div>
      </motion.section>



      {/* Featured courses */}
      <motion.section
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
        className="border-b border-border"
      >
        <div className="container-page py-20">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <Reveal>
              <Prompt>$ ls featured/</Prompt>
              <h2 className="mt-4 font-bn-serif text-4xl md:text-5xl font-bold text-terminal">
                জনপ্রিয় <span className="text-lime">কোর্স</span>
              </h2>
            </Reveal>
            <Link to="/courses" className="font-mono text-sm text-lime hover:underline">
              সব কোর্স →
            </Link>
          </div>

          {featured.length === 0 ? (
            <p className="mt-10 font-mono text-terminal/60">{bn.courses.empty}</p>
          ) : (
            <StaggerGroup className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((c, i) => (
                <motion.div key={c.id} variants={fadeUp} custom={i} whileHover={{ y: -8 }}>
                  <Link
                    to="/courses/$slug"
                    params={{ slug: c.slug }}
                    className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-code-gray transition hover:border-lime/60 hover:shadow-[0_20px_60px_-20px_rgba(200,255,77,0.35)]"
                  >
                    <div className="aspect-video w-full bg-ink overflow-hidden relative">
                      {c.thumbnail_url ? (
                        <img
                          src={c.thumbnail_url}
                          alt={c.title}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full terminal-grid opacity-60" />
                      )}
                      <div className="absolute top-3 left-3 rounded-md bg-ink/80 backdrop-blur px-2 py-1 font-mono text-xs text-lime">
                        ./course_{String(i + 1).padStart(2, "0")}
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-display text-lg font-bold text-terminal line-clamp-2">{c.title}</h3>
                      {c.subtitle && (
                        <p className="mt-1 font-body text-sm text-terminal/60 line-clamp-2">{c.subtitle}</p>
                      )}
                      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-lg font-bold text-lime">
                            {formatBDT(c.discount_price ?? c.price)}
                          </span>
                          {c.discount_price && (
                            <span className="font-mono text-xs text-terminal/50 line-through">
                              {formatBDT(c.price)}
                            </span>
                          )}
                        </div>
                        <motion.span
                          className="font-mono text-lime"
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 1.8, repeat: Infinity }}
                        >
                          →
                        </motion.span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </StaggerGroup>
          )}
        </div>
      </motion.section>

      {/* CTA band */}
      <motion.section
        initial={{ opacity: 0, y: 60, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
        className="border-b border-border bg-lime text-ink relative overflow-hidden"
      >
        <motion.div
          aria-hidden
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "repeating-linear-gradient(45deg, #0B0F0E 0 2px, transparent 2px 22px)",
          }}
          animate={{ backgroundPosition: ["0px 0px", "44px 44px"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
        <div className="relative container-page flex flex-col items-start gap-8 py-16 md:flex-row md:items-center md:justify-between">
          <Reveal>
            <span className="font-mono text-xs font-bold tracking-widest uppercase">
              $ ./start --now
            </span>
            <h2 className="mt-3 font-bn-serif text-3xl md:text-4xl font-extrabold leading-tight">
              আজই শুরু করুন — <span className="underline decoration-4 underline-offset-4">প্রথম লেকচার ফ্রি</span>
            </h2>
            <p className="mt-3 max-w-xl font-body text-ink/80">
              সাইন-আপ করে ড্যাশবোর্ডে চলে যান। bKash, Nagad, Rocket ও কার্ডে নিরাপদ পেমেন্ট।
            </p>
          </Reveal>
          <Magnetic
            href="/auth"
            className="rounded-md bg-ink px-7 py-4 font-mono text-sm font-bold text-lime hover:bg-code-gray inline-block"
          >
            ফ্রি অ্যাকাউন্ট — খুলুন →
          </Magnetic>
        </div>
      </motion.section>
    </>
  );
}
