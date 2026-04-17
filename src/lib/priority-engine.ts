import { supabase } from "@/integrations/supabase/client";
import { differenceInHours } from "date-fns";

export type Priority = "low" | "normal" | "high" | "urgent";

interface PriorityContext {
  purpose: string;
  startTime: Date;
  userId: string;
  resourceId: string;
}

export async function calculateDynamicPriority(ctx: PriorityContext): Promise<Priority> {
  let score = 0;
  const { purpose, startTime, userId } = ctx;
  const text = purpose.toLowerCase();

  // 1. Keyword Analysis (Urgency)
  const urgentKeywords = ["emergency", "critical", "broken", "surgery", "patient", "immediate", "deadline", "urgent"];
  const lowKeywords = ["maintenance", "future", "optional", "testing", "trial", "non-critical"];

  urgentKeywords.forEach(word => {
    if (text.includes(word)) score += 40;
  });

  lowKeywords.forEach(word => {
    if (text.includes(word)) score -= 20;
  });

  // 2. Time Sensitivity
  const hoursUntilStart = differenceInHours(startTime, new Date());
  if (hoursUntilStart < 2) score += 30; // Very urgent (starts soon)
  else if (hoursUntilStart < 24) score += 10; // Medium urgency (starts today)

  // 3. Past Usage Data (Using API/Database)
  const { data: history } = await supabase
    .from("bookings")
    .select("priority")
    .eq("user_id", userId)
    .limit(10);

  // If user has a history of 'urgent' requests, we might lower their priority slightly to prevent "Boy who cried wolf"
  const pastUrgentCount = history?.filter(h => h.priority === "urgent").length || 0;
  if (pastUrgentCount > 3) score -= 10;

  // 4. Final Scoring
  if (score >= 60) return "urgent";
  if (score >= 30) return "high";
  if (score >= 0) return "normal";
  return "low";
}
