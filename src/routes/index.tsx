import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Activity, CalendarDays, Boxes, AlertTriangle, ShieldCheck, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Activity className="h-4 w-4" />
            </div>
            <span className="text-base font-semibold tracking-tight">Allocate</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-12 pt-16 lg:px-8 lg:pt-24">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Live operational dashboard
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Smart resource allocation,{" "}
            <span className="text-primary">without the chaos.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Allocate manages limited resources — labs, rooms, beds, equipment — with
            priority-based scheduling, fair-use limits, and admin-confirmed emergency
            reallocation. Built for teams that can't afford a double-booking.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup">
              <Button size="lg">Create free account</Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">
                I have an account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 lg:px-8 lg:py-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-lg border border-border bg-card p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <f.icon className="h-4 w-4" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Allocate. Built for fair, efficient resource use.
      </footer>
    </div>
  );
}
