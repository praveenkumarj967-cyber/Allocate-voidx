import { useQuery } from "@tanstack/react-query";
import { Sparkles, ArrowRight, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { getRecommendations } from "@/lib/recommendations";
import { Button } from "@/components/ui/button";

export function RecommendationSection() {
  const { user } = useAuth();

  const { data: recs, isLoading } = useQuery({
    queryKey: ["recommendations", user?.id],
    queryFn: () => getRecommendations(user!.id),
    enabled: !!user,
  });

  if (isLoading || !recs || recs.length === 0) return null;

  return (
    <div className="mt-12 animate-slide" style={{ animationDelay: '0.3s' }}>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight text-foreground">Predicted for You</h2>
        </div>
        <Link to="/app/resources" className="text-xs font-bold text-primary hover:underline uppercase tracking-widest">
          Browse Catalog
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {recs.map((r, i) => (
          <div
            key={r.id}
            className="enterprise-card group relative rounded-2xl p-5 transition-all hover:scale-[1.02] bg-gradient-to-br from-card to-primary/5"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <Zap className="h-4 w-4" />
              </div>
              <div className="text-[10px] font-bold text-primary/70 uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded">
                {r.category}
              </div>
            </div>
            
            <h3 className="font-bold text-foreground leading-tight">{r.name}</h3>
            <p className="mt-1 text-[11px] text-muted-foreground font-medium">
              {r.reason}
            </p>

            <Link to="/app/resources" className="mt-4 block">
              <Button size="sm" variant="ghost" className="w-full h-8 text-[10px] font-bold uppercase tracking-widest group-hover:bg-primary group-hover:text-primary-foreground">
                Book Again <ArrowRight className="ml-2 h-3 w-3" />
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
