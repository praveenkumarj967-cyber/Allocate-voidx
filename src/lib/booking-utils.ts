import type { Database } from "@/integrations/supabase/types";

export type BookingPriority = Database["public"]["Enums"]["booking_priority"];
export type BookingStatus = Database["public"]["Enums"]["booking_status"];
export type ResourceStatus = Database["public"]["Enums"]["resource_status"];

export const PRIORITY_RANK: Record<BookingPriority, number> = {
  emergency: 3,
  high: 2,
  normal: 1,
};

export const PRIORITY_LABELS: Record<BookingPriority, string> = {
  emergency: "Emergency",
  high: "High",
  normal: "Normal",
};

export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  approved: "Accepted",
  rejected: "Rejected",
  cancelled: "Cancelled",
  completed: "Completed",
  displaced: "Displaced",
};

export function priorityBadgeVariant(p: BookingPriority) {
  if (p === "emergency") return "emergency" as const;
  if (p === "high") return "highPriority" as const;
  return "muted" as const;
}

export function statusBadgeVariant(s: BookingStatus) {
  switch (s) {
    case "approved":
      return "success" as const;
    case "pending":
      return "warning" as const;
    case "rejected":
    case "displaced":
      return "destructive" as const;
    case "completed":
      return "secondary" as const;
    default:
      return "muted" as const;
  }
}

export function statusResourceVariant(s: ResourceStatus) {
  if (s === "active") return "success" as const;
  if (s === "maintenance") return "warning" as const;
  return "muted" as const;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

export function hoursBetween(start: Date, end: Date): number {
  return Math.max(0, (end.getTime() - start.getTime()) / 3_600_000);
}

/**
 * Find the next available slot of `durationMinutes` for a resource,
 * scanning forward from `from` within opening hours.
 * Existing bookings array should be sorted; returns null if not found within `lookAheadDays`.
 */
export function findNextAvailableSlot(opts: {
  from: Date;
  durationMinutes: number;
  openingTime: string; // HH:MM
  closingTime: string; // HH:MM
  bookings: TimeRange[];
  lookAheadDays?: number;
}): TimeRange | null {
  const { from, durationMinutes, openingTime, closingTime, bookings } = opts;
  const lookAhead = opts.lookAheadDays ?? 14;
  const sorted = [...bookings].sort((a, b) => a.start.getTime() - b.start.getTime());

  const [openH, openM] = openingTime.split(":").map(Number);
  const [closeH, closeM] = closingTime.split(":").map(Number);

  let cursor = new Date(from);
  // round up to next 15 min
  cursor.setSeconds(0, 0);
  cursor.setMinutes(Math.ceil(cursor.getMinutes() / 15) * 15);

  const limit = new Date(from);
  limit.setDate(limit.getDate() + lookAhead);

  while (cursor < limit) {
    // clamp into opening hours
    const dayOpen = new Date(cursor);
    dayOpen.setHours(openH, openM, 0, 0);
    const dayClose = new Date(cursor);
    dayClose.setHours(closeH, closeM, 0, 0);

    if (cursor < dayOpen) cursor = dayOpen;
    if (cursor >= dayClose) {
      // jump to next day open
      cursor = new Date(dayOpen);
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }

    const slotEnd = new Date(cursor.getTime() + durationMinutes * 60_000);
    if (slotEnd > dayClose) {
      cursor = new Date(dayOpen);
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }

    const conflict = sorted.find((b) => rangesOverlap({ start: cursor, end: slotEnd }, b));
    if (!conflict) {
      return { start: cursor, end: slotEnd };
    }
    // jump to end of conflict
    cursor = new Date(conflict.end);
    cursor.setMinutes(Math.ceil(cursor.getMinutes() / 15) * 15);
  }
  return null;
}

export function formatRange(start: Date, end: Date): string {
  const sameDay = start.toDateString() === end.toDateString();
  const dateOpts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  if (sameDay) {
    return `${start.toLocaleDateString(undefined, dateOpts)} · ${start.toLocaleTimeString(undefined, timeOpts)} – ${end.toLocaleTimeString(undefined, timeOpts)}`;
  }
  return `${start.toLocaleString(undefined, { ...dateOpts, ...timeOpts })} → ${end.toLocaleString(undefined, { ...dateOpts, ...timeOpts })}`;
}
