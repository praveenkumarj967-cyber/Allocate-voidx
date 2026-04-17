import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Activity, CalendarDays, Boxes, AlertTriangle, ShieldCheck, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Allocate — Smart Resource Allocation & Booking" },
      {
        name: "description",
        content:
          "Priority-based booking, real-time scheduling, and intelligent reallocation for labs, rooms, beds and equipment.",
      },
      { property: "og:title", content: "Allocate — Smart Resource Allocation & Booking" },
      {
        property: "og:description",
        content:
          "Priority-based booking, real-time scheduling, and intelligent reallocation for limited resources.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const [stats, setStats] = useState({ resources: 0, categories: 0, users: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [{ count: resCount }, { count: catCount }, { count: userCount }] = await Promise.all([
        supabase.from("resources").select("*", { count: "exact", head: true }),
        supabase.from("resource_categories").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
      ]);
      setStats({
        resources: resCount || 0,
        categories: catCount || 0,
        users: userCount || 0,
      });
    };
    void fetchStats();
  }, []);

  if (!loading && isAuthenticated) {
    return <Navigate to={isAdmin ? "/admin" : "/app"} />;
  }

  const features = [
    {
      icon: Zap,
      title: "Priority allocation",
      desc: "Emergency, high, and normal priorities. Higher priorities can override lower ones with admin-confirmed reallocation.",
    },
    {
      icon: CalendarDays,
      title: "Smart scheduling",
      desc: "Suggests the next available slot, respects opening hours, and prevents conflicts in real time.",
    },
    {
      icon: Boxes,
      title: "Dynamic catalog",
      desc: "Admins manage categories, capacity, hours, costs and constraints — visible instantly to users.",
    },
    {
      icon: AlertTriangle,
      title: "Reallocation review",
      desc: "Emergency conflicts surface as suggestions. Admins confirm displacement; affected users are notified.",
    },
    {
      icon: ShieldCheck,
      title: "Fair-use limits",
      desc: "Per-resource weekly hour caps prevent over-booking and ensure equitable distribution.",
    },
    {
      icon: Activity,
      title: "Realtime dashboard",
      desc: "Live booking activity, utilization analytics, and instant notifications across the team.",
    },
  ];

  return (
    <div className="min-h-screen bg-background bg-grid selection:bg-primary/20">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">Allocate</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" className="font-medium">
                Sign in
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="rounded-full px-6 font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 lg:px-8 lg:pt-32">
          {/* Background Glow */}
          <div className="absolute left-1/2 top-0 -z-10 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
          
          <div className="text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
              <span className="flex h-2 w-2 items-center justify-center">
                <span className="absolute h-2 w-2 animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Now live for distributed teams
            </div>
            <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Smart resource allocation,{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                without the chaos.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              The priority-based booking system for shared resources. Labs, equipment, rooms — 
              managed with intelligent reallocation and fair-use limits.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link to="/signup">
                <Button size="lg" className="h-12 rounded-full px-8 text-base font-bold shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                  Launch Workspace
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="h-12 rounded-full px-8 text-base font-semibold backdrop-blur-sm transition-all hover:bg-muted">
                  View Demo
                </Button>
              </Link>
            </div>
            
            <div className="mt-16 grid grid-cols-3 gap-8 border-t border-border/50 pt-10">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{stats.resources}</div>
                <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Resources</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{stats.categories}</div>
                <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Categories</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{stats.users}</div>
                <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Active Users</div>
              </div>
            </div>
          </div>

          {/* Dashboard Preview Visual */}
          <div className="relative mt-20 overflow-hidden rounded-2xl border border-border/50 bg-card p-2 shadow-2xl lg:mt-24">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-primary/5" />
            <div className="relative overflow-hidden rounded-xl border border-border/50 bg-background/50">
              <div className="flex h-10 items-center border-b border-border/50 bg-muted/50 px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-destructive/50" />
                  <div className="h-3 w-3 rounded-full bg-warning/50" />
                  <div className="h-3 w-3 rounded-full bg-success/50" />
                </div>
                <div className="mx-auto h-5 w-64 rounded-md bg-muted" />
              </div>
              <div className="grid grid-cols-12 h-[300px] lg:h-[400px]">
                <div className="col-span-3 border-r border-border/50 bg-muted/20 p-4 space-y-3">
                  <div className="h-4 w-full rounded bg-muted animate-pulse" />
                  <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                  <div className="h-8 w-full rounded-lg bg-primary/20 mt-8" />
                </div>
                <div className="col-span-9 p-6">
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-24 rounded-xl border border-border/50 bg-card p-4 space-y-2">
                         <div className="h-3 w-1/2 rounded bg-muted" />
                         <div className="h-6 w-3/4 rounded bg-muted/50" />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <div className="h-4 w-1/4 rounded bg-muted" />
                    <div className="h-32 rounded-xl border border-border/50 bg-card/50 flex items-center justify-center">
                      <CalendarDays className="h-12 w-12 text-muted animate-float" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 lg:px-8 lg:py-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to stay organized</h2>
            <p className="mt-4 text-muted-foreground">Modern features for mission-critical resource management.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="group relative rounded-2xl border border-border/50 bg-card p-8 transition-all hover:border-primary/30 hover:shadow-xl hover:-translate-y-1">
                <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-lg font-bold text-foreground tracking-tight">{f.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 py-12 px-4">
        <div className="mx-auto max-w-6xl flex flex-col items-center justify-between gap-6 sm:flex-row lg:px-8">
          <div className="flex items-center gap-2 grayscale opacity-50 transition-all hover:grayscale-0 hover:opacity-100">
            <Activity className="h-5 w-5" />
            <span className="text-sm font-bold tracking-tight uppercase">Allocate</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Allocate. Built for efficiency.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="#" className="hover:text-primary transition-colors">Privacy</Link>
            <Link to="#" className="hover:text-primary transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

