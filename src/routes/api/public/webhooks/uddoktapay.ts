import { createFileRoute } from "@tanstack/react-router";
import { verifyAndFulfill } from "@/lib/payments.functions";

export const Route = createFileRoute("/api/public/webhooks/uddoktapay")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const key = request.headers.get("rt-uddoktapay-api-key");
        if (!key || key !== (process.env.UDDOKTAPAY_API_KEY ?? "")) {
          return new Response("unauthorized", { status: 401 });
        }
        let body: any = {};
        try {
          body = await request.json();
        } catch {
          return new Response("bad json", { status: 400 });
        }
        const invoice = body?.invoice_id || body?.metadata?.invoice_id;
        if (!invoice) return new Response("missing invoice_id", { status: 400 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        try {
          const r = await verifyAndFulfill(String(invoice), supabaseAdmin);
          return Response.json({ ok: true, status: r.status });
        } catch (e: any) {
          console.error("webhook error", e);
          return new Response(e?.message ?? "error", { status: 500 });
        }
      },
    },
  },
});
