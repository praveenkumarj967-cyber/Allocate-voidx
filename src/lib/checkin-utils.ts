import { supabase } from "@/integrations/supabase/client";
import { isBefore, subMinutes, addMinutes } from "date-fns";
import { notifyUser } from "./notifications";

/**
 * Checks for bookings that have started but haven't checked in.
 * Cancels them and promotes the next waitlist entry.
 */
export async function runNoShowCleanup() {
  const now = new Date();

  // 1. Find bookings that started > 10 mins ago and haven't checked in
  const { data: noShows } = await supabase
    .from("bookings")
    .select("*, resources(name)")
    .eq("status", "approved")
    .is("checked_in_at", null)
    .lt("start_time", subMinutes(now, 10).toISOString()); // 10-minute grace period

  if (!noShows || noShows.length === 0) return;

  for (const booking of noShows) {
    // 2. Cancel the no-show booking
    await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", booking.id);

    // 3. Notify the user
    await notifyUser({
      userId: booking.user_id,
      title: "Booking Cancelled (No-Show)",
      message: `You didn't check in for "${booking.resources?.name}". Your slot has been given to the next person.`,
      type: "destructive"
    });

    // 4. Find the next person on the waitlist
    const { data: waitlist } = await supabase
      .from("waitlist")
      .select("*")
      .eq("resource_id", booking.resource_id)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1);

    if (waitlist && waitlist[0]) {
      const entry = waitlist[0];
      
      // 5. Promote waitlist to a real booking
      await supabase.from("bookings").insert({
        resource_id: entry.resource_id,
        user_id: entry.user_id,
        start_time: now.toISOString(), // Start now!
        end_time: entry.requested_end,
        priority: entry.priority,
        status: "approved",
        purpose: "Auto-promoted from Waitlist"
      });

      // 6. Delete waitlist entry
      await supabase.from("waitlist").delete().eq("id", entry.id);

      // 7. Notify the lucky winner
      await notifyUser({
        userId: entry.user_id,
        title: "Good news! Early Slot Available",
        message: `A slot opened up for "${booking.resources?.name}". You've been promoted! You can start now.`,
        type: "success",
        link: "/app/bookings"
      });
    }
  }
}

export function getCheckInQR(resourceId: string) {
  // Use a public QR API to generate a link to the check-in page
  const checkInUrl = `${window.location.origin}/app/check-in/${resourceId}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(checkInUrl)}`;
}
