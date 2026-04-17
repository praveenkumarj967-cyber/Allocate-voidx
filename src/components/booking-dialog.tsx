import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Sparkles, CheckCircle2, Clock } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  PRIORITY_RANK,
  findNextAvailableSlot,
  formatRange,
  hoursBetween,
  rangesOverlap,
  type BookingPriority,
} from "@/lib/booking-utils";
import { notifyUser } from "@/lib/notifications";
import type { Database } from "@/integrations/supabase/types";

type Resource = Database["public"]["Tables"]["resources"]["Row"];

interface Props {
  resource: Resource;
  onOpenChange: (open: boolean) => void;
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BookingDialog({ resource, onOpenChange }: Props) {
  const { user } = useAuth();

  // default: next hour, 1h slot
  const defaultStart = useMemo(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  }, []);
  const defaultEnd = useMemo(() => {
    const d = new Date(defaultStart);
    d.setHours(d.getHours() + 1);
    return d;
  }, [defaultStart]);

  const [start, setStart] = useState(toLocalInput(defaultStart));
  const [end, setEnd] = useState(toLocalInput(defaultEnd));
  const [priority, setPriority] = useState<BookingPriority>("normal");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Existing bookings on this resource (active only)
  const [existing, setExisting] = useState<
    Array<Database["public"]["Tables"]["bookings"]["Row"]>
  >([]);

  // Fair-use: hours user already booked this week on this resource
  const [weekHours, setWeekHours] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data: bks } = await supabase
        .from("bookings")
        .select("*")
        .eq("resource_id", resource.id)
        .in("status", ["pending", "approved"]);
      setExisting(bks ?? []);

      if (user) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        const { data: mine } = await supabase
          .from("bookings")
          .select("start_time,end_time,status")
          .eq("user_id", user.id)
          .eq("resource_id", resource.id)
          .in("status", ["pending", "approved", "completed"])
          .gte("start_time", weekStart.toISOString());
        const hrs = (mine ?? []).reduce(
          (acc, b) => acc + hoursBetween(new Date(b.start_time), new Date(b.end_time)),
          0,
        );
        setWeekHours(hrs);
      }
    };
    void load();
  }, [resource.id, user]);

  const startDate = new Date(start);
  const endDate = new Date(end);
  const validRange = endDate > startDate;
  const requestedHours = validRange ? hoursBetween(startDate, endDate) : 0;
  const totalCost = requestedHours * Number(resource.hourly_cost);

  // Conflicts at requested time
  const conflicts = validRange
    ? existing.filter((b) =>
        rangesOverlap(
          { start: startDate, end: endDate },
          { start: new Date(b.start_time), end: new Date(b.end_time) },
        ),
      )
    : [];

  // Higher priority can override lower priority
  const overridable = conflicts.filter(
    (c) => PRIORITY_RANK[priority] > PRIORITY_RANK[c.priority],
  );
  const blocking = conflicts.filter(
    (c) => PRIORITY_RANK[priority] <= PRIORITY_RANK[c.priority],
  );

  // Fair-use check
  const remainingFairHours = resource.max_hours_per_user_per_week - weekHours;
  const exceedsFairUse =
    priority !== "emergency" && requestedHours > remainingFairHours;

  // Suggestion: next available
  const nextAvailable = useMemo(() => {
    if (!validRange) return null;
    return findNextAvailableSlot({
      from: startDate,
      durationMinutes: Math.round(requestedHours * 60),
      openingTime: resource.opening_time.slice(0, 5),
      closingTime: resource.closing_time.slice(0, 5),
      bookings: existing.map((b) => ({
        start: new Date(b.start_time),
        end: new Date(b.end_time),
      })),
    });
  }, [
    existing,
    requestedHours,
    resource.opening_time,
    resource.closing_time,
    startDate,
    validRange,
  ]);

  const applySuggestion = () => {
    if (!nextAvailable) return;
    setStart(toLocalInput(nextAvailable.start));
    setEnd(toLocalInput(nextAvailable.end));
  };

  const submit = async (mode: "book" | "waitlist") => {
    if (!user) return;
    if (!validRange) {
      toast.error("End time must be after start time");
      return;
    }

    if (mode === "waitlist") {
      setSubmitting(true);
      const { error } = await supabase.from("waitlist").insert({
        resource_id: resource.id,
        user_id: user.id,
        requested_start: startDate.toISOString(),
        requested_end: endDate.toISOString(),
        priority,
      });
      setSubmitting(false);
      if (error) toast.error(error.message);
      else {
        toast.success("Added to waitlist");
        onOpenChange(false);
      }
      return;
    }

    if (exceedsFairUse) {
      toast.error(
        `Fair-use cap reached (${resource.max_hours_per_user_per_week}h/week). Use Emergency or join waitlist.`,
      );
      return;
    }

    if (blocking.length > 0) {
      toast.error("This time conflicts with a booking of equal or higher priority. Try the next available slot or join the waitlist.");
      return;
    }

    setSubmitting(true);
    const autoApproved = resource.auto_approve && overridable.length === 0;
    const status = autoApproved ? "approved" : "pending";

    const { data: created, error } = await supabase
      .from("bookings")
      .insert({
        resource_id: resource.id,
        user_id: user.id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        priority,
        purpose: purpose || null,
        total_cost: totalCost,
        status,
        auto_approved: autoApproved,
      })
      .select()
      .single();

    if (error || !created) {
      setSubmitting(false);
      toast.error(error?.message ?? "Failed to create booking");
      return;
    }

    // If overriding lower-priority bookings, create reallocation suggestions for admin review
    if (overridable.length > 0) {
      await supabase.from("reallocation_suggestions").insert(
        overridable.map((c) => ({
          emergency_booking_id: created.id,
          displaced_booking_id: c.id,
          reason: `Higher priority "${priority}" requested overlapping slot.`,
        })),
      );
      // Notify the user that displacement is pending admin review
      await notifyUser({
        userId: user.id,
        title: "Reallocation pending review",
        message: `Your ${priority} booking conflicts with ${overridable.length} existing booking(s). An admin will review the reallocation.`,
        type: "warning",
        link: "/app/bookings",
      });
    }

    setSubmitting(false);
    toast.success(autoApproved ? "Booking confirmed" : "Booking submitted for approval");
    onOpenChange(false);
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Book {resource.name}</DialogTitle>
          <DialogDescription>
            Opening hours {resource.opening_time.slice(0, 5)} – {resource.closing_time.slice(0, 5)}{" "}
            · ${resource.hourly_cost}/hr · cap {resource.max_hours_per_user_per_week}h/week
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="start">Start</Label>
              <Input
                id="start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end">End</Label>
              <Input
                id="end"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as BookingPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Emergency overrides lower priorities (admin-confirmed) and bypasses fair-use caps.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="purpose">Purpose (optional)</Label>
            <Textarea
              id="purpose"
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="What will you use this for?"
            />
          </div>

          {/* Live insights */}
          <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span className="tabular-nums font-medium">{requestedHours.toFixed(2)} h</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total cost</span>
              <span className="tabular-nums font-medium">
                {Number(resource.hourly_cost) === 0 ? "Free" : `$${totalCost.toFixed(2)}`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Your week so far</span>
              <span className="tabular-nums font-medium">
                {weekHours.toFixed(1)} / {resource.max_hours_per_user_per_week} h
              </span>
            </div>
          </div>

          {blocking.length > 0 && (
            <Alert tone="destructive" icon={AlertTriangle}>
              Conflicts with {blocking.length} equal/higher priority booking(s). Pick another slot.
            </Alert>
          )}
          {overridable.length > 0 && blocking.length === 0 && (
            <Alert tone="warning" icon={AlertTriangle}>
              Will request reallocation of {overridable.length} lower-priority booking(s). Admin
              will review before displacement.
            </Alert>
          )}
          {exceedsFairUse && (
            <Alert tone="warning" icon={AlertTriangle}>
              Exceeds your weekly fair-use cap by{" "}
              {(requestedHours - remainingFairHours).toFixed(1)} h.
            </Alert>
          )}
          {conflicts.length === 0 && validRange && !exceedsFairUse && (
            <Alert tone="success" icon={CheckCircle2}>
              Slot looks open
              {resource.auto_approve ? " — auto-approve enabled" : " — pending admin approval"}.
            </Alert>
          )}
          {nextAvailable &&
            (conflicts.length > 0 ||
              startDate.toISOString() !== nextAvailable.start.toISOString()) && (
              <div className="flex items-start justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium text-foreground">Suggested next slot</div>
                    <div className="text-muted-foreground">
                      {formatRange(nextAvailable.start, nextAvailable.end)}
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={applySuggestion}>
                  Use
                </Button>
              </div>
            )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => void submit("waitlist")}
            disabled={submitting || !validRange}
          >
            <Clock className="h-4 w-4" />
            Join waitlist
          </Button>
          <Button onClick={() => void submit("book")} disabled={submitting || !validRange}>
            {submitting ? "Booking…" : "Confirm booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Alert({
  children,
  tone,
  icon: Icon,
}: {
  children: React.ReactNode;
  tone: "destructive" | "warning" | "success";
  icon: typeof AlertTriangle;
}) {
  const cls = {
    destructive: "border-destructive/30 bg-destructive/5 text-destructive",
    warning: "border-warning/40 bg-warning/10 text-foreground",
    success: "border-success/30 bg-success/10 text-foreground",
  }[tone];
  return (
    <div className={`flex items-start gap-2 rounded-md border p-3 text-xs ${cls}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
