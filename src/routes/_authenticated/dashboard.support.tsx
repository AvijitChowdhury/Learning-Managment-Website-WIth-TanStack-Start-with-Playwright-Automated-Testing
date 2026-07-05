import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, MessageSquarePlus, Send, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { createThread, getThread, listMyThreads, postReply } from "@/lib/lms-admin.functions";

export const Route = createFileRoute("/_authenticated/dashboard/support")({
  head: () => ({ meta: [{ title: "সাপোর্ট ফোরাম — শিখো" }, { name: "robots", content: "noindex" }] }),
  component: SupportPage,
});

function SupportPage() {
  const list = useServerFn(listMyThreads);
  const create = useServerFn(createThread);
  const qc = useQueryClient();
  const router = useRouter();

  const { data: threads = [] } = useQuery({ queryKey: ["support", "threads"], queryFn: () => list() });
  const [openId, setOpenId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const createMut = useMutation({
    mutationFn: (data: { subject: string; body: string }) => create({ data }),
    onSuccess: (t) => {
      toast.success("থ্রেড তৈরি হয়েছে");
      setSubject("");
      setBody("");
      qc.invalidateQueries({ queryKey: ["support"] });
      setOpenId(t.id);
      router.invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "সমস্যা হয়েছে"),
  });

  return (
    <div className="container-page py-8">
      <div className="flex items-center gap-3">
        <LifeBuoy className="h-6 w-6 text-lime" />
        <h1 className="font-bn-serif text-3xl font-bold text-terminal">সাপোর্ট ফোরাম</h1>
      </div>
      <p className="mt-2 text-sm text-terminal/70">
        কোর্স, পেমেন্ট বা টেকনিক্যাল সমস্যা নিয়ে প্রশ্ন করুন। অ্যাডমিন টিম উত্তর দেবে।
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Thread list + new form */}
        <section className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-terminal">
              <MessageSquarePlus className="h-4 w-4 text-lime" /> নতুন প্রশ্ন
            </h2>
            <div className="mt-4 space-y-3">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="বিষয়"
                maxLength={200}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-terminal outline-none focus:border-lime"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="বিস্তারিত লিখুন…"
                rows={4}
                maxLength={4000}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-terminal outline-none focus:border-lime"
              />
              <button
                disabled={createMut.isPending || subject.trim().length < 3 || body.trim().length < 3}
                onClick={() => createMut.mutate({ subject: subject.trim(), body: body.trim() })}
                className="inline-flex items-center gap-2 rounded-md bg-lime px-4 py-2 font-mono text-xs font-bold text-ink disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" /> পাঠান
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-3 font-mono text-xs text-terminal/70">
              আপনার থ্রেড ({threads.length})
            </div>
            <ul className="divide-y divide-border">
              {threads.length === 0 && (
                <li className="p-5 text-sm text-terminal/60">এখনও কোনো থ্রেড নেই।</li>
              )}
              {threads.map((t: any) => (
                <li key={t.id}>
                  <button
                    onClick={() => setOpenId(t.id)}
                    className={`flex w-full items-start justify-between gap-3 px-5 py-3 text-left hover:bg-muted/40 ${
                      openId === t.id ? "bg-muted/40" : ""
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium text-terminal">{t.subject}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-terminal/60">
                        {t.courses?.title ?? "সাধারণ"} • {new Date(t.updated_at).toLocaleDateString("bn-BD")}
                      </div>
                    </div>
                    <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-terminal/70">
                      {t.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Detail */}
        <section className="rounded-xl border border-border bg-card p-5 min-h-[300px]">
          {openId ? (
            <ThreadDetail id={openId} />
          ) : (
            <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-terminal/60">
              বাঁদিক থেকে একটি থ্রেড নির্বাচন করুন।
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ThreadDetail({ id }: { id: string }) {
  const get = useServerFn(getThread);
  const reply = useServerFn(postReply);
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const { data } = useQuery({ queryKey: ["support", "thread", id], queryFn: () => get({ data: { id } }) });

  const replyMut = useMutation({
    mutationFn: (b: string) => reply({ data: { thread_id: id, body: b } }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["support", "thread", id] });
      qc.invalidateQueries({ queryKey: ["support", "threads"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "সমস্যা হয়েছে"),
  });

  if (!data?.thread) return <div className="text-sm text-terminal/60">লোড হচ্ছে…</div>;
  const { thread, replies } = data;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border pb-3">
        <h3 className="font-display text-lg font-semibold text-terminal">{thread.subject}</h3>
        <div className="mt-1 font-mono text-[11px] text-terminal/60">
          তৈরি: {new Date(thread.created_at).toLocaleString("bn-BD")}
        </div>
      </div>

      <ol className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
        {replies.map((r: any) => (
          <li
            key={r.id}
            className={`rounded-md border p-3 ${
              r.is_admin ? "border-lime/40 bg-lime/5" : "border-border bg-background"
            }`}
          >
            <div className="mb-1 flex items-center gap-2 font-mono text-[11px] text-terminal/60">
              {r.is_admin ? (
                <>
                  <ShieldCheck className="h-3 w-3 text-lime" /> অ্যাডমিন
                </>
              ) : (
                <>
                  <UserRound className="h-3 w-3" /> আপনি
                </>
              )}
              <span>· {new Date(r.created_at).toLocaleString("bn-BD")}</span>
            </div>
            <div className="whitespace-pre-wrap text-sm text-terminal">{r.body}</div>
          </li>
        ))}
      </ol>

      <div className="mt-4 border-t border-border pt-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder="উত্তর লিখুন…"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-terminal outline-none focus:border-lime"
        />
        <div className="mt-2 flex justify-end">
          <button
            disabled={replyMut.isPending || body.trim().length === 0}
            onClick={() => replyMut.mutate(body.trim())}
            className="inline-flex items-center gap-2 rounded-md bg-lime px-4 py-2 font-mono text-xs font-bold text-ink disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" /> পাঠান
          </button>
        </div>
      </div>
    </div>
  );
}
