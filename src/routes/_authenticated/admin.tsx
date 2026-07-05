import { createFileRoute, Outlet, Link, redirect, useRouterState } from "@tanstack/react-router";
import { isCurrentUserAdmin } from "@/lib/admin.functions";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  BookOpen,
  FolderTree,
  TicketPercent,
  Star,
  ArrowLeft,
  Terminal,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "অ্যাডমিন — শিখো" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    try {
      const r = await isCurrentUserAdmin();
      if (!r.admin) throw redirect({ to: "/dashboard" });
    } catch (e) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "ওভারভিউ", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "অর্ডার", icon: ShoppingBag, exact: false },
  { to: "/admin/users", label: "ইউজার", icon: Users, exact: false },
  { to: "/admin/courses", label: "কোর্স", icon: BookOpen, exact: false },
  { to: "/admin/categories", label: "ক্যাটেগরি", icon: FolderTree, exact: false },
  { to: "/admin/coupons", label: "কুপন", icon: TicketPercent, exact: false },
  { to: "/admin/reviews", label: "রিভিউ", icon: Star, exact: false },
] as const;

function AdminSidebarNav() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-border">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-lime text-ink">
            <Terminal className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-mono text-[10px] text-lime">$ sudo</span>
              <span className="font-bn-serif text-sm font-bold text-terminal">অ্যাডমিন</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-wider text-terminal/50">
              কন্ট্রোল
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const active = isActive(item.to, item.exact);
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={
                        active
                          ? "bg-lime/15 text-lime hover:bg-lime/20 hover:text-lime data-[active=true]:bg-lime/15 data-[active=true]:text-lime"
                          : "text-terminal/80 hover:bg-white/5 hover:text-lime"
                      }
                    >
                      <Link to={item.to} className="flex items-center gap-2 font-mono text-xs">
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="ড্যাশবোর্ডে ফিরুন"
              className="text-terminal/70 hover:text-lime hover:bg-white/5"
            >
              <Link to="/dashboard" className="flex items-center gap-2 font-mono text-xs">
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span>ড্যাশবোর্ড</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function AdminHeader() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const current = [...NAV].reverse().find((n) =>
    n.exact ? pathname === n.to : pathname === n.to || pathname.startsWith(n.to + "/"),
  );
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-ink/80 px-4 backdrop-blur">
      <SidebarTrigger className="text-terminal hover:text-lime" />
      <div className="h-5 w-px bg-border" />
      <div className="flex items-center gap-2 font-mono text-xs text-terminal/60">
        <span className="text-lime">~/admin</span>
        {current && current.to !== "/admin" && (
          <>
            <span className="text-terminal/30">/</span>
            <span className="text-terminal">{current.label}</span>
          </>
        )}
      </div>
    </header>
  );
}

function AdminLayout() {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-ink">
        <AdminSidebarNav />
        <SidebarInset className="flex-1 bg-ink">
          <AdminHeader />
          <main className="flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
