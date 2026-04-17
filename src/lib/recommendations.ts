import { supabase } from "@/integrations/supabase/client";

export interface Recommendation {
  id: string;
  name: string;
  reason: string;
  score: number;
  category?: string;
}

export async function getRecommendations(userId: string): Promise<Recommendation[]> {
  // 1. Fetch User's Booking History
  const { data: userBookings } = await supabase
    .from("bookings")
    .select("resource_id, resources(name, category_id, resource_categories(name))")
    .eq("user_id", userId);

  // 2. Fetch All Active Resources
  const { data: allResources } = await supabase
    .from("resources")
    .select("*, resource_categories(name)")
    .eq("status", "active");

  if (!allResources) return [];

  // 3. Simple Heuristic Engine
  const bookingCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};

  userBookings?.forEach((b: any) => {
    const rid = b.resource_id;
    const cid = b.resources?.category_id;
    bookingCounts[rid] = (bookingCounts[rid] || 0) + 1;
    if (cid) categoryCounts[cid] = (categoryCounts[cid] || 0) + 1;
  });

  // 4. Map and Score Resources
  const recommendations = allResources.map((r) => {
    let score = 0;
    let reason = "Recommended for you";

    // Affinity 1: Frequently Booked (Boost score significantly)
    if (bookingCounts[r.id]) {
      score += bookingCounts[r.id] * 10;
      reason = "Frequently used by you";
    }

    // Affinity 2: Category Match (Boost if user likes this category)
    if (r.category_id && categoryCounts[r.category_id]) {
      score += categoryCounts[r.category_id] * 5;
      if (!bookingCounts[r.id]) reason = `Similar to items you book in ${r.resource_categories?.name}`;
    }

    // Affinity 3: New/Trending (Small boost for novelty)
    score += Math.random() * 2; // Add a bit of variety

    return {
      id: r.id,
      name: r.name,
      reason,
      score,
      category: r.resource_categories?.name
    };
  });

  // Sort by score and return top 3
  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
