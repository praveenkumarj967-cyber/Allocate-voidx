import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatRange,
  priorityBadgeVariant,
  PRIORITY_LABELS,
  STATUS_LABELS,
  statusBadgeVariant,
} from "@/lib/booking-utils";
import { notifyWaitlist } from "@/lib/notifications";

export const Route = createFileRoute("/app/bookings")({
  component: MyBookingsPage,
});

function MyBookingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"upcoming" | "past" | "waitlist">("upcoming");

  const { data: bookings } = useQuery({
    queryKey: ["bookings-mine", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, resources(name, location)")
        .eq("user_id", user!.id)
        .order("start_time", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: waitlist } = useQuery({
    queryKey: ["waitlist-mine", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("waitlist")
        .select("*, resources(name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("my-bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["bookings-mine"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "waitlist", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["waitlist-mine"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user, qc]);

  const now = new Date();
  const upcoming = (bookings ?? []).filter(
    (b) => new Date(b.end_time) >= now && !["cancelled", "rejected"].includes(b.status),
  );
  const past = (bookings ?? []).filter(
    (b) => new Date(b.end_time) < now || ["cancelled", "rejected"].includes(b.status),
  );

  const cancel = async (id: string) => {
    // Get the resource name before cancelling
    const { data: b } = await supabase
      .from("bookings")
      .select("resource_id, resources(name)")
      .eq("id", id)
      .single();

    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Booking cancelled");
      if (b) {
        await notifyWaitlist({
          resourceId: b.resource_id,
          resourceName: (b.resources as any)?.name || "resource",
        });
      }
    }
  };

  const removeWaitlist = async (id: string) => {
    const { error } = await supabase.from("waitlist").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Removed from waitlist");
  };

  const list = tab === "upcoming" ? upcoming : tab === "past" ? past : [];

  return (
    <div>
      <PageHeader title="My bookings" description="Manage your bookings and waitlist entries." />

      <div className="mb-5 inline-flex rounded-md border border-border bg-card p-1">
        {(["upcoming", "past", "waitlist"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
            {t === "upcoming" && upcoming.length > 0 && ` (${upcoming.length})`}
            {t === "waitlist" && (waitlist?.length ?? 0) > 0 && ` (${waitlist!.length})`}
          </button>
        ))}
      </div>

      {tab === "waitlist" ? (
        <BookingTable
          empty="You're not on any waitlist."
          rows={(waitlist ?? []).map((w) => ({
            id: w.id,
            resource: w.resources?.name ?? "—",
            range: formatRange(new Date(w.requested_start), new Date(w.requested_end)),
            priority: w.priority,
            status: null,
            onAction: () => removeWaitlist(w.id),
            actionLabel: "Leave",
          }))}
        />
      ) : (
        <BookingTable
          empty={tab === "upcoming" ? "No upcoming bookings." : "No past bookings."}
          rows={list.map((b) => ({
            id: b.id,
            resource: b.resources?.name ?? "—",
            range: formatRange(new Date(b.start_time), new Date(b.end_time)),
            priority: b.priority,
            status: b.status,
            onAction:
              tab === "upcoming" && ["pending", "approved"].includes(b.status)
                ? () => cancel(b.id)
                : undefined,
            actionLabel: "Cancel",
          }))}
        />
      )}
    </div>
  );
}

function BookingTable({
  rows,
  empty,
}: {
  rows: Array<{
    id: string;
    resource: string;
    range: string;
    priority: "emergency" | "high" | "normal";
    status: string | null;
    onAction?: () => void;
    actionLabel: string;
  }>;
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
        {empty}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{r.resource}</div>
              <div className="text-xs text-muted-foreground">{r.range}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={priorityBadgeVariant(r.priority)}>{PRIORITY_LABELS[r.priority]}</Badge>
              {r.status && (
                <Badge variant={statusBadgeVariant(r.status as never)}>
                  {STATUS_LABELS[r.status as never]}
                </Badge>
              )}
              {r.onAction && (
                <Button variant="outline" size="sm" onClick={r.onAction}>
                  <X className="h-3.5 w-3.5" />
                  {r.actionLabel}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
