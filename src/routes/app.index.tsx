import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, Boxes, Clock, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import {
  formatRange,
  priorityBadgeVariant,
  PRIORITY_LABELS,
  STATUS_LABELS,
  statusBadgeVariant,
} from "@/lib/booking-utils";

export const Route = createFileRoute("/app/")({
  component: UserOverview,
});

function UserOverview() {
  const { user } = useAuth();
  const [, force] = useState(0);

  const { data: bookings } = useQuery({
    queryKey: ["my-bookings", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, resources(name, location)")
        .eq("user_id", user!.id)
        .order("start_time", { ascending: true });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: resourceCount } = useQuery({
    queryKey: ["resource-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("resources")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("user-overview")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `user_id=eq.${user.id}` },
        () => force((n) => n + 1),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user]);

  const now = new Date();
  const upcoming = (bookings ?? []).filter(
    (b) => new Date(b.end_time) >= now && b.status !== "cancelled" && b.status !== "rejected",
  );
  const pending = upcoming.filter((b) => b.status === "pending").length;
  const approved = upcoming.filter((b) => b.status === "approved").length;
  const next = upcoming[0];

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Your bookings, resources, and live activity at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Upcoming"
          value={upcoming.length}
          icon={CalendarDays}
          tone="default"
          hint={`${approved} approved · ${pending} pending`}
        />
        <StatCard
          label="Active resources"
          value={resourceCount ?? "—"}
          icon={Boxes}
          tone="success"
        />
        <StatCard
          label="Next slot"
          value={next ? new Date(next.start_time).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}
          icon={Clock}
          hint={next ? new Date(next.start_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "No upcoming bookings"}
        />
        <StatCard
          label="Awaiting approval"
          value={pending}
          icon={AlertCircle}
          tone={pending > 0 ? "warning" : "default"}
        />
      </div>

      <div className="mt-8 rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold tracking-tight">Upcoming bookings</h2>
          <Link to="/app/bookings" className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-muted-foreground">No upcoming bookings.</p>
            <Link
              to="/app/resources"
              className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
            >
              Browse resources →
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {upcoming.slice(0, 5).map((b) => (
              <li key={b.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">
                    {b.resources?.name ?? "Resource"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatRange(new Date(b.start_time), new Date(b.end_time))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={priorityBadgeVariant(b.priority)}>
                    {PRIORITY_LABELS[b.priority]}
                  </Badge>
                  <Badge variant={statusBadgeVariant(b.status)}>{STATUS_LABELS[b.status]}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
