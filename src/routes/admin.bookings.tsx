import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { notifyUser } from "@/lib/notifications";
import {
  formatRange,
  priorityBadgeVariant,
  PRIORITY_LABELS,
  STATUS_LABELS,
  statusBadgeVariant,
  type BookingStatus,
} from "@/lib/booking-utils";

export const Route = createFileRoute("/admin/bookings")({
  component: AdminBookings,
});

function AdminBookings() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | BookingStatus>("pending");

  const { data: bookings } = useQuery({
    queryKey: ["admin-bookings", filter],
    queryFn: async () => {
      let q = supabase
        .from("bookings")
        .select("*, resources(name), profiles!bookings_user_id_fkey(display_name, email)")
        .order("start_time", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data } = await q.limit(100);
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("admin-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () =>
        qc.invalidateQueries({ queryKey: ["admin-bookings"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [qc]);

  const update = async (id: string, status: BookingStatus, userId: string, resourceName: string) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await notifyUser({
      userId,
      title: `Booking ${status}`,
      message: `Your booking for ${resourceName} was ${status}.`,
      type: status === "approved" ? "success" : "warning",
      link: "/app/bookings",
    });
    toast.success(`Booking ${status}`);
  };

  return (
    <div>
      <PageHeader title="Bookings" description="Approve, reject, and oversee all bookings." />

      <div className="mb-5 inline-flex flex-wrap rounded-md border border-border bg-card p-1">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {(bookings ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No bookings.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <ul className="divide-y divide-border">
            {(bookings ?? []).map((b) => (
              <li
                key={b.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {b.resources?.name} ·{" "}
                    <span className="text-muted-foreground">
                      {b.profiles?.display_name ?? b.profiles?.email}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatRange(new Date(b.start_time), new Date(b.end_time))}
                  </div>
                  {b.purpose && (
                    <div className="mt-1 text-xs italic text-muted-foreground">"{b.purpose}"</div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={priorityBadgeVariant(b.priority)}>
                    {PRIORITY_LABELS[b.priority]}
                  </Badge>
                  <Badge variant={statusBadgeVariant(b.status)}>{STATUS_LABELS[b.status]}</Badge>
                  {b.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          update(b.id, "approved", b.user_id, b.resources?.name ?? "resource")
                        }
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          update(b.id, "rejected", b.user_id, b.resources?.name ?? "resource")
                        }
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
