import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, CalendarDays, Boxes, AlertTriangle, Clock } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { fetchProfilesByIds } from "@/lib/profile-utils";
import { PageHeader, StatCard } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import {
  formatRange,
  priorityBadgeVariant,
  PRIORITY_LABELS,
  STATUS_LABELS,
  statusBadgeVariant,
} from "@/lib/booking-utils";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const qc = useQueryClient();

  const { data: bookings } = useQuery({
    queryKey: ["admin-bookings-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, resources(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      const list = data ?? [];
      const profMap = await fetchProfilesByIds(list.map((b) => b.user_id));
      return list.map((b) => ({ ...b, profile: profMap.get(b.user_id) ?? null }));
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["admin-counts"],
    queryFn: async () => {
      const [pending, active, resources, suggestions] = await Promise.all([
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("status", "approved")
          .gte("end_time", new Date().toISOString()),
        supabase.from("resources").select("id", { count: "exact", head: true }),
        supabase
          .from("reallocation_suggestions")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);
      return {
        pending: pending.count ?? 0,
        active: active.count ?? 0,
        resources: resources.count ?? 0,
        suggestions: suggestions.count ?? 0,
      };
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("admin-dash")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-bookings-recent"] });
        qc.invalidateQueries({ queryKey: ["admin-counts"] });
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reallocation_suggestions" },
        () => qc.invalidateQueries({ queryKey: ["admin-counts"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [qc]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Real-time view of bookings and resource activity."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pending approvals"
          value={counts?.pending ?? "—"}
          icon={Clock}
          tone={counts && counts.pending > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Active bookings"
          value={counts?.active ?? "—"}
          icon={CalendarDays}
          tone="success"
        />
        <StatCard label="Resources" value={counts?.resources ?? "—"} icon={Boxes} />
        <StatCard
          label="Reallocation reviews"
          value={counts?.suggestions ?? "—"}
          icon={AlertTriangle}
          tone={counts && counts.suggestions > 0 ? "destructive" : "default"}
        />
      </div>

      <div className="mt-8 rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">Recent activity</h2>
          </div>
          <Link to="/admin/bookings" className="text-xs font-medium text-primary hover:underline">
            All bookings
          </Link>
        </div>
        {(bookings ?? []).length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No bookings yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {(bookings ?? []).slice(0, 10).map((b) => (
              <li key={b.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">
                    {b.resources?.name} ·{" "}
                    <span className="text-muted-foreground">
                      {b.profile?.display_name ?? b.profile?.email}
                    </span>
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
