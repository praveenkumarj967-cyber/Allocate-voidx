import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, AlertTriangle, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isWithinInterval, subMinutes, addMinutes } from "date-fns";
import { notifyAdmins } from "@/lib/notifications";

export const Route = createFileRoute("/app/check-in/$id")({
  component: CheckInPage,
});

function CheckInPage() {
  const { id: resourceId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "too_early">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;

    const performCheckIn = async () => {
      // 1. Find the active booking for this user and resource
      const now = new Date();
      const { data: bookings } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user.id)
        .eq("resource_id", resourceId)
        .eq("status", "approved")
        .is("checked_in_at", null);

      if (!bookings || bookings.length === 0) {
        setStatus("error");
        setMessage("No active booking found for this resource.");
        return;
      }

      // 2. Check the "10-minute" window
      const activeBooking = bookings.find(b => {
        const start = new Date(b.start_time);
        const end = new Date(b.end_time);
        // Window: 10 mins before start until end of booking
        return isWithinInterval(now, {
          start: subMinutes(start, 10),
          end: end
        });
      });

      if (!activeBooking) {
        setStatus("too_early");
        setMessage("You can only check in starting 10 minutes before your booking.");
        return;
      }

      // 3. Update the booking
      const { error } = await supabase
        .from("bookings")
        .update({ checked_in_at: now.toISOString() })
        .eq("id", activeBooking.id);

      if (error) {
        setStatus("error");
        setMessage(error.message);
      } else {
        // 4. Notify Admins
        const { data: resourceData } = await supabase.from("resources").select("name").eq("id", resourceId).single();
        await notifyAdmins({
          title: "Check-in Successful",
          message: `${user.email?.split("@")[0]} has checked into "${resourceData?.name || "Resource"}".`,
          type: "success",
          link: "/admin/bookings"
        });

        setStatus("success");
        toast.success("Check-in successful! Enjoy your session.");
      }
    };

    void performCheckIn();
  }, [resourceId, user]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="enterprise-card max-w-sm rounded-[2rem] p-10 shadow-2xl">
        {status === "loading" && (
          <div className="space-y-4">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <h1 className="text-xl font-bold">Verifying Check-in...</h1>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-2xl font-black">Success!</h1>
              <p className="mt-2 text-sm text-muted-foreground font-medium">
                Your presence has been recorded. You're all set to use the resource.
              </p>
            </div>
            <Button className="w-full rounded-xl" onClick={() => navigate({ to: "/app" })}>
              Go to Dashboard
            </Button>
          </div>
        )}

        {(status === "error" || status === "too_early") && (
          <div className="space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-warning/10 text-warning">
              <AlertTriangle className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-2xl font-black">{status === "too_early" ? "Too Early" : "Oops!"}</h1>
              <p className="mt-2 text-sm text-muted-foreground font-medium">
                {message}
              </p>
            </div>
            <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate({ to: "/app" })}>
              Back to App
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
