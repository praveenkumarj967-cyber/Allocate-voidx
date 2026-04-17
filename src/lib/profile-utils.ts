import { supabase } from "@/integrations/supabase/client";

export interface ProfileLite {
  id: string;
  email: string | null;
  display_name: string | null;
}

/**
 * Fetch profile rows for a set of user IDs as a Map.
 * Workaround for not having a PostgREST FK between bookings and profiles.
 */
export async function fetchProfilesByIds(ids: string[]): Promise<Map<string, ProfileLite>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return new Map();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .in("id", unique);
  return new Map((data ?? []).map((p) => [p.id, p]));
}
