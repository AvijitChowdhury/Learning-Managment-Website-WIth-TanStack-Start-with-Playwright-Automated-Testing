import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { installGoogleTranslateFix } from "@/lib/google-translate-fix";
import { supabase } from "@/integrations/supabase/client";
import { isCurrentUserAdmin } from "@/lib/admin.functions";
import { bn } from "@/lib/i18n/bn";
import { Toaster } from "@/components/ui/sonner";

if (typeof window !== "undefined") {
  installGoogleTranslateFix();
}


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">৪০৪</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">পেজ পাওয়া যায়নি</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          আপনি যে পেজটি খুঁজছেন তা নেই বা সরিয়ে ফেলা হয়েছে।
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            হোমে ফিরুন
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">এই পেজটি লোড হয়নি</h1>
        <p className="mt-2 text-sm text-muted-foreground">কিছু ভুল হয়েছে। আবার চেষ্টা করুন।</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            আবার চেষ্টা
          </button>
          <a href="/" className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground">
            হোমে ফিরুন
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "শিখো — বাংলায় শেখার নতুন ঠিকানা" },
      {
        name: "description",
        content: "বাংলায় ভিডিও কোর্স, নিরাপদ পেমেন্ট (bKash, Nagad, Rocket, কার্ড), আজীবন অ্যাক্সেস।",
      },
      { name: "author", content: "Shikho" },
      { property: "og:title", content: "শিখো — বাংলায় শেখার নতুন ঠিকানা" },
      { property: "og:description", content: "বাংলায় ভিডিও কোর্স, নিরাপদ পেমেন্ট (bKash, Nagad, Rocket, কার্ড), আজীবন অ্যাক্সেস।" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "bn_BD" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "শিখো — বাংলায় শেখার নতুন ঠিকানা" },
      { name: "description", content: "বাংলায় ভিডিও কোর্স, নিরাপদ পেমেন্ট (bKash, Nagad, Rocket, কার্ড), আজীবন অ্যাক্সেস।" },
      { name: "twitter:description", content: "বাংলায় ভিডিও কোর্স, নিরাপদ পেমেন্ট (bKash, Nagad, Rocket, কার্ড), আজীবন অ্যাক্সেস।" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/9d399e3d-ccdd-4014-a2f0-f0f5722e8fd4" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/9d399e3d-ccdd-4014-a2f0-f0f5722e8fd4" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Manrope:wght@300;400;500;600;700;800&family=Baloo+Da+2:wght@500;600;700;800&family=Tiro+Bangla:ital@0;1&family=Hind+Siliguri:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="bn">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Header() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setSignedIn(event !== "SIGNED_OUT");
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  const checkAdmin = useServerFn(isCurrentUserAdmin);
  const { data: adminInfo } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => checkAdmin(),
    enabled: signedIn,
  });
  const isAdmin = !!adminInfo?.admin;
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-ink/80 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-lime text-ink font-mono font-bold">
            শি
          </span>
          <span className="font-display text-lg font-extrabold text-terminal">{bn.brand}</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm font-body text-terminal/80">
          {isAdmin ? (
            <Link to="/admin" className="hover:text-lime transition-colors">অ্যাডমিন ড্যাশবোর্ড</Link>
          ) : (
            <>
              <Link to="/" className="hover:text-lime transition-colors">{bn.nav.home}</Link>
              <Link to="/courses" className="hover:text-lime transition-colors">{bn.nav.courses}</Link>
              {signedIn && (
                <Link to="/dashboard" className="hover:text-lime transition-colors">{bn.nav.dashboard}</Link>
              )}
            </>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {signedIn ? (
            isAdmin ? (
              <Link
                to="/admin"
                className="rounded-md bg-lime px-4 py-2 text-sm font-mono font-bold text-ink hover:brightness-95"
              >
                অ্যাডমিন ড্যাশবোর্ড
              </Link>
            ) : (
              <Link
                to="/dashboard"
                className="rounded-md bg-lime px-4 py-2 text-sm font-mono font-bold text-ink hover:brightness-95"
              >
                {bn.nav.dashboard}
              </Link>
            )
          ) : (
            <Link
              to="/auth"
              className="rounded-md bg-lime px-4 py-2 text-sm font-mono font-bold text-ink hover:brightness-95"
            >
              {bn.nav.login}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}


function Footer() {
  return (
    <footer className="mt-24 border-t border-border/70 bg-code-gray/60">
      <div className="container-page py-10 text-sm font-mono text-terminal/60 flex flex-col md:flex-row justify-between gap-4">
        <p>
          <span className="text-lime">$</span> © {new Date().getFullYear()} {bn.brand} — {bn.footer.rights}
        </p>
        <div className="flex gap-6">
          <Link to="/courses" className="hover:text-lime">{bn.nav.courses}</Link>
          <Link to="/auth" className="hover:text-lime">{bn.nav.login}</Link>
        </div>
      </div>
    </footer>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}
