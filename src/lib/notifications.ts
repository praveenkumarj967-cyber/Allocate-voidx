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
