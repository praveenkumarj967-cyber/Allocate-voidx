import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X, AlertTriangle } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfilesByIds } from "@/lib/profile-utils";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { notifyUser } from "@/lib/notifications";
import {
  formatRange,
  priorityBadgeVariant,
  PRIORITY_LABELS,
} from "@/lib/booking-utils";

export const Route = createFileRoute("/admin/reallocations")({
  component: AdminReallocations,
});

function AdminReallocations() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: items } = useQuery({
    queryKey: ["reallocations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reallocation_suggestions")
        .select(
          `*,
           emergency:bookings!reallocation_suggestions_emergency_booking_id_fkey(*, resources(name)),
           displaced:bookings!reallocation_suggestions_displaced_booking_id_fkey(*, resources(name))`,
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      const list = data ?? [];
      const ids = list.flatMap((s) => [s.emergency?.user_id, s.displaced?.user_id]).filter(Boolean) as string[];
      const profMap = await fetchProfilesByIds(ids);
      return list.map((s) => ({
        ...s,
        emergency: s.emergency ? { ...s.emergency, profile: profMap.get(s.emergency.user_id) ?? null } : null,
        displaced: s.displaced ? { ...s.displaced, profile: profMap.get(s.displaced.user_id) ?? null } : null,
      }));
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("admin-realloc")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reallocation_suggestions" },
        () => qc.invalidateQueries({ queryKey: ["reallocations"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [qc]);

  const approve = async (s: NonNullable<typeof items>[number]) => {
    if (!user) return;
    // Mark displaced booking
    await supabase
      .from("bookings")
      .update({ status: "displaced", displaced_by_booking_id: s.emergency_booking_id })
      .eq("id", s.displaced_booking_id);
    // Mark emergency approved
    await supabase
      .from("bookings")
      .update({ status: "approved" })
      .eq("id", s.emergency_booking_id);
    // Resolve suggestion
    await supabase
      .from("reallocation_suggestions")
      .update({ status: "approved", resolved_by: user.id, resolved_at: new Date().toISOString() })
      .eq("id", s.id);

    if (s.displaced) {
      await notifyUser({
        userId: s.displaced.user_id,
        title: "Booking displaced by emergency",
        message: `Your booking for ${s.displaced.resources?.name} on ${formatRange(new Date(s.displaced.start_time), new Date(s.displaced.end_time))} was displaced by an emergency request. Please rebook.`,
        type: "error",
        link: "/app/bookings",
      });
    }
    if (s.emergency) {
      await notifyUser({
        userId: s.emergency.user_id,
        title: "Emergency booking approved",
        message: `Your emergency booking for ${s.emergency.resources?.name} has been approved.`,
        type: "success",
        link: "/app/bookings",
      });
    }
    toast.success("Reallocation approved");
  };

  const reject = async (s: NonNullable<typeof items>[number]) => {
    if (!user) return;
    await supabase
      .from("bookings")
      .update({ status: "rejected" })
      .eq("id", s.emergency_booking_id);
    await supabase
      .from("reallocation_suggestions")
      .update({ status: "rejected", resolved_by: user.id, resolved_at: new Date().toISOString() })
      .eq("id", s.id);

    if (s.emergency) {
      await notifyUser({
        userId: s.emergency.user_id,
        title: "Emergency reallocation denied",
        message: `Your emergency booking for ${s.emergency.resources?.name} was not approved for reallocation.`,
        type: "warning",
        link: "/app/bookings",
      });
    }
    toast.success("Reallocation rejected");
  };

  return (
    <div>
      <PageHeader
        title="Reallocation reviews"
        description="Emergency requests that conflict with existing bookings. Confirm displacement or reject."
      />

      {(items ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No pending reallocations.
        </div>
      ) : (
        <ul className="space-y-3">
          {(items ?? []).map((s) => (
            <li key={s.id} className="rounded-lg border border-warning/40 bg-warning/5 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-warning-foreground" />
                Reallocation suggestion
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-border bg-card p-3">
                  <div className="text-xs uppercase text-muted-foreground">Incoming</div>
                  <div className="mt-1 text-sm font-medium">
                    {s.emergency?.resources?.name ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.emergency?.profiles?.display_name ?? s.emergency?.profiles?.email}
                  </div>
                  {s.emergency && (
                    <div className="mt-1 text-xs">
                      {formatRange(
                        new Date(s.emergency.start_time),
                        new Date(s.emergency.end_time),
                      )}
                    </div>
                  )}
                  {s.emergency && (
                    <Badge
                      className="mt-2"
                      variant={priorityBadgeVariant(s.emergency.priority)}
                    >
                      {PRIORITY_LABELS[s.emergency.priority]}
                    </Badge>
                  )}
                </div>
                <div className="rounded-md border border-border bg-card p-3">
                  <div className="text-xs uppercase text-muted-foreground">Will displace</div>
                  <div className="mt-1 text-sm font-medium">
                    {s.displaced?.resources?.name ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.displaced?.profiles?.display_name ?? s.displaced?.profiles?.email}
                  </div>
                  {s.displaced && (
                    <div className="mt-1 text-xs">
                      {formatRange(
                        new Date(s.displaced.start_time),
                        new Date(s.displaced.end_time),
                      )}
                    </div>
                  )}
                  {s.displaced && (
                    <Badge
                      className="mt-2"
                      variant={priorityBadgeVariant(s.displaced.priority)}
                    >
                      {PRIORITY_LABELS[s.displaced.priority]}
                    </Badge>
                  )}
                </div>
              </div>
              {s.reason && (
                <p className="mt-3 text-xs italic text-muted-foreground">{s.reason}</p>
              )}
              <div className="mt-4 flex gap-2">
                <Button onClick={() => void approve(s)}>
                  <Check className="h-4 w-4" /> Approve reallocation
                </Button>
                <Button variant="outline" onClick={() => void reject(s)}>
                  <X className="h-4 w-4" /> Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
