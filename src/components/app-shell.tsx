import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Boxes,
  Bell,
  LogOut,
  ShieldCheck,
  Activity,
  Users,
  AlertTriangle,
  Menu,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatAssistant } from "@/components/chat-assistant";
import { runNoShowCleanup } from "@/lib/checkin-utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const userNav: NavItem[] = [
  { to: "/app", label: "Overview", icon: LayoutDashboard },
  { to: "/app/resources", label: "Resources", icon: Boxes },
  { to: "/app/bookings", label: "My Bookings", icon: CalendarDays },
];

const adminNav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: Activity },
  { to: "/admin/resources", label: "Resources", icon: Boxes },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarDays },
  { to: "/admin/reallocations", label: "Reallocations", icon: AlertTriangle },
  { to: "/admin/analytics", label: "Analytics", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
];

export function AppShell({ children, mode }: { children: ReactNode; mode: "user" | "admin" }) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || "Guest";
  const firstName = displayName.split(' ')[0];

  const nav = mode === "admin" ? adminNav : userNav;

  useEffect(() => {
    // Run cleanup on mount and every 5 minutes
    runNoShowCleanup();
    const interval = setInterval(runNoShowCleanup, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnread(count ?? 0);
    };
    void load();

    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen bg-background/50 selection:bg-primary/20">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 transition-all duration-500 ease-out lg:static lg:translate-x-0 p-4",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col enterprise-card rounded-[2.5rem] border-white/20 dark:border-white/5 overflow-hidden">
          <div className="flex h-20 items-center justify-between px-8">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-500 text-white shadow-xl shadow-primary/20 group-hover:rotate-12 transition-all duration-500">
                <Activity className="h-5 w-5" />
              </div>
              <span className="text-xl font-black tracking-tight text-foreground bg-clip-text">
                Allocate
              </span>
            </Link>
            <button
              className="lg:hidden p-2 hover:bg-muted rounded-full"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-4 overflow-y-auto">
            <div className="px-4 mb-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
              Navigation
            </div>
            {nav.map((item) => {
              const active =
                router.state.location.pathname === item.to ||
                (item.to !== "/app" &&
                  item.to !== "/admin" &&
                  router.state.location.pathname.startsWith(item.to));
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-4 rounded-2xl px-4 py-3.5 text-sm font-bold transition-all duration-300 group",
                    active
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-primary/5 hover:text-primary hover:translate-x-2",
                  )}
                >
                  <Icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", active ? "text-primary-foreground" : "text-muted-foreground/40 group-hover:text-primary")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border/50 bg-muted/20">
            {isAdmin && mode === "user" && (
              <Link
                to="/admin"
                className="flex items-center gap-3 rounded-2xl bg-card border border-border/50 px-4 py-3 text-xs font-bold text-foreground transition-all hover:border-primary/50 hover:shadow-lg"
              >
                <ShieldCheck className="h-4 w-4 text-primary" />
                Admin Dashboard
              </Link>
            )}
            {isAdmin && mode === "admin" && (
              <Link
                to="/app"
                className="flex items-center gap-3 rounded-2xl bg-card border border-border/50 px-4 py-3 text-xs font-bold text-foreground transition-all hover:border-primary/50 hover:shadow-lg"
              >
                <Boxes className="h-4 w-4 text-primary" />
                User View
              </Link>
            )}
            <button
              onClick={handleSignOut}
              className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-xs font-bold text-destructive transition-all hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col p-4 lg:p-6">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between rounded-[2rem] border border-white/20 bg-white/60 dark:bg-slate-950/60 backdrop-blur-2xl px-8 shadow-sm">
          <div className="flex items-center gap-6">
            <button className="lg:hidden p-2 -ml-2 text-muted-foreground" onClick={() => setMobileOpen(true)}>
              <Menu className="h-6 w-6" />
            </button>
            <div className="hidden md:flex flex-col">
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] animate-pulse">
                {(() => {
                  const hour = new Date().getHours();
                  if (hour < 12) return "🌅 Morning Protocol";
                  if (hour < 17) return "☀️ Afternoon Protocol";
                  return "🌙 Evening Protocol";
                })()}
              </span>
              <span className="text-sm font-black text-foreground">
                {(() => {
                  const hour = new Date().getHours();
                  if (hour < 12) return "Good Morning";
                  if (hour < 17) return "Good Afternoon";
                  return "Good Evening";
                })()}, <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">{firstName}</span>
              </span>
            </div>
            <div className="flex md:hidden items-center gap-2">
              <div className={cn(
                "h-2 w-2 rounded-full animate-pulse",
                mode === "admin" ? "bg-primary" : "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
              )} />
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground/70">
                {mode === "admin" ? "Admin" : "User"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-xl bg-muted/30 border border-border/50">
              <div className={cn(
                "h-2 w-2 rounded-full",
                mode === "admin" ? "bg-primary" : "bg-green-500"
              )} />
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/70">
                {mode === "admin" ? "Admin Workspace" : "User Workspace"}
              </span>
            </div>
            <Link to="/app/notifications" className="relative h-11 w-11 flex items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-primary-foreground shadow-lg ring-2 ring-white dark:ring-slate-950">
                  {unread}
                </span>
              )}
            </Link>
            <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-border/50">
              <div className="text-right">
                <div className="text-sm font-black text-foreground leading-tight">{displayName}</div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{isAdmin ? "Administrator" : "Member"}</div>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-secondary to-muted border border-border flex items-center justify-center font-bold text-primary">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 py-8 px-2 max-w-7xl mx-auto w-full">{children}</main>
        <ChatAssistant />
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-col gap-4 border-b border-border/50 pb-8 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-2 text-base text-muted-foreground font-medium">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: typeof Activity;
  tone?: "default" | "success" | "warning" | "destructive";
}) {
  const toneClass = {
    default: "text-primary bg-primary/10",
    success: "text-green-600 bg-green-50",
    warning: "text-amber-600 bg-amber-50",
    destructive: "text-red-600 bg-red-50",
  }[tone];
  return (
    <div className="enterprise-card rounded-2xl p-6 animate-slide">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {label}
          </div>
          <div className="text-3xl font-black tabular-nums text-foreground tracking-tight">{value}</div>
          {hint && <div className="text-[10px] font-medium text-muted-foreground">{hint}</div>}
        </div>
        {Icon && (
          <div className={cn("rounded-xl p-3 shadow-sm", toneClass)}>
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
    </div>
  );
}
