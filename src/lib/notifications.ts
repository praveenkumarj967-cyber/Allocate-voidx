import { supabase } from "@/integrations/supabase/client";

export async function notifyUser(opts: {
  userId: string;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  link?: string;
}) {
  await supabase.from("notifications").insert({
    user_id: opts.userId,
    title: opts.title,
    message: opts.message,
    type: opts.type ?? "info",
    link: opts.link ?? null,
  });
}

export async function notifyAdmins(opts: {
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  link?: string;
}) {
  // Find all admin IDs
  const { data: admins } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  if (!admins || admins.length === 0) return;

  await supabase.from("notifications").insert(
    admins.map((a) => ({
      user_id: a.user_id,
      title: opts.title,
      message: opts.message,
      type: opts.type ?? "info",
      link: opts.link ?? null,
    }))
  );
}

export async function notifyWaitlist(opts: {
  resourceId: string;
  resourceName: string;
}) {
  // Find all users on the waitlist for this resource
  const { data: waiting } = await supabase
    .from("waitlist")
    .select("user_id")
    .eq("resource_id", opts.resourceId);

  if (!waiting || waiting.length === 0) return;

  // Send a notification to each user
  await supabase.from("notifications").insert(
    waiting.map((w) => ({
      user_id: w.user_id,
      title: "Slot Available!",
      message: `A slot for "${opts.resourceName}" has just opened up. Book it now before someone else does!`,
      type: "success",
      link: "/app/resources",
    }))
  );
}
