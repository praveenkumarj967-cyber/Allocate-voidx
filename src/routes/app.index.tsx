import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Camera, 
  Sparkles, 
  CalendarDays, 
  Boxes, 
  Clock, 
  Activity, 
  MapPin, 
  Zap, 
  CheckCircle2 
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecommendationSection } from "@/components/recommendation-section";
import { QRScannerDialog } from "@/components/qr-scanner-dialog";
import { cn } from "@/lib/utils";
import {
  formatRange,
  STATUS_LABELS,
} from "@/lib/booking-utils";

export const Route = createFileRoute("/app/")({
  component: UserOverview,
});

function UserOverview() {
  const { user, profile } = useAuth();
  const [showScanner, setShowScanner] = useState(false);

  const { data: bookings = [] } = useQuery({
    queryKey: ["my-bookings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("bookings")
        .select("*, resources(name, location)")
        .eq("user_id", user.id)
        .order("start_time", { ascending: true });
      return data ?? [];
    },
    enabled: !!user,
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const upcoming = bookings.filter((b: any) => b.status === "approved" || b.status === "pending");
  const pending = upcoming.filter((b: any) => b.status === "pending").length;

  const displayName = profile?.display_name || user?.email?.split('@')[0] || "Guest";
  const firstName = displayName.split(' ')[0];

  return (
    <div className="space-y-10 animate-slide">
      {/* Dynamic Header & Greeting */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-[0.2em]">
            <Sparkles className="h-4 w-4" />
            System Intelligence Active
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
            {greeting}, <span className="premium-gradient-text">{firstName}</span>
          </h1>
          <p className="text-muted-foreground font-medium max-w-md leading-relaxed">
            Your resources are optimized and ready. You have {upcoming.length} active sessions scheduled for today.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowScanner(true)} className="rounded-[1.25rem] h-14 px-8 font-black shadow-2xl shadow-primary/20 hover:scale-105 transition-all">
            <Camera className="mr-3 h-5 w-5" />
            Scan to Check-in
          </Button>
        </div>
      </div>

      {showScanner && <QRScannerDialog onClose={() => setShowScanner(false)} />}

      {/* Hero Stats HUD */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Bookings"
          value={upcoming.length}
          icon={CalendarDays}
          tone="default"
          hint="Across all locations"
        />
        <StatCard
          label="Pending Approval"
          value={pending}
          icon={Clock}
          tone="warning"
          hint="Awaiting admin review"
        />
        <StatCard
          label="Resources Available"
          value={12}
          icon={Boxes}
          tone="success"
          hint="Ready for instant booking"
        />
        <StatCard
          label="System Health"
          value="99.9%"
          icon={Activity}
          tone="success"
          hint="All systems operational"
        />
      </div>

      <RecommendationSection />

      {/* Main Content Grid */}
      <div className="grid gap-10 lg:grid-cols-3">
        {/* Schedule Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-3">
              Your Daily Timeline
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] font-bold">{upcoming.length}</Badge>
            </h2>
            <Link to="/app/bookings" className="text-xs font-bold text-primary hover:underline uppercase tracking-widest">
              View All
            </Link>
          </div>

          <div className="space-y-4">
            {upcoming.length === 0 ? (
              <div className="enterprise-card rounded-[2rem] p-12 text-center border-dashed border-2 bg-muted/30">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarDays className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-bold text-muted-foreground">Your schedule is clear for today.</p>
                <Button variant="link" asChild className="mt-2 text-primary">
                  <Link to="/app/resources">Browse Catalog</Link>
                </Button>
              </div>
            ) : (
              upcoming.map((b: any, i: number) => (
                <div 
                  key={b.id} 
                  className="enterprise-card group relative rounded-[2rem] p-6 flex items-center gap-6 transition-all hover:bg-primary/5"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="flex flex-col items-center justify-center h-16 w-16 rounded-2xl bg-muted text-foreground border border-border group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-500">
                    <span className="text-[10px] font-black uppercase tracking-tighter">{format(new Date(b.start_time), "MMM")}</span>
                    <span className="text-xl font-black">{format(new Date(b.start_time), "dd")}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                        {formatRange(new Date(b.start_time), new Date(b.end_time))}
                      </span>
                      {!b.checked_in_at && b.status === "approved" && (
                        <Badge variant="destructive" className="animate-pulse text-[8px] h-4 rounded-full px-2 border-none">SCAN REQUIRED</Badge>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-foreground truncate">{b.resources?.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mt-1">
                      <MapPin className="h-3 w-3" />
                      {b.resources?.location || "Main Site"}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <Badge className={cn(
                      "rounded-lg text-[9px] font-black uppercase tracking-widest px-2.5 py-1 border-none",
                      b.status === "approved" ? "bg-green-500 text-white" : "bg-amber-500 text-white"
                    )}>
                      {STATUS_LABELS[b.status as keyof typeof STATUS_LABELS]}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Insights Sidebar */}
        <div className="space-y-8">
          <div className="enterprise-card rounded-[2.5rem] p-8 bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/10 shadow-sm">
            <h3 className="text-lg font-black text-foreground mb-6 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Quick Insights
            </h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Peak Usage</div>
                  <div className="text-sm font-black">Mon, 10:00 - 12:00</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</div>
                  <div className="text-sm font-black">Elite Optimizer</div>
                </div>
              </div>
            </div>
            <Button variant="ghost" className="w-full mt-8 rounded-xl font-bold border border-primary/10 text-primary hover:bg-primary/5">
              Network Report
            </Button>
          </div>

          <div className="enterprise-card rounded-[2.5rem] p-8">
            <h3 className="text-lg font-black text-foreground mb-4">Neural Support</h3>
            <p className="text-xs text-muted-foreground font-medium mb-8 leading-relaxed">
              Facing localized latency? Our AI assistant is active and learning.
            </p>
            <Button className="w-full rounded-xl font-bold h-12 shadow-md">
              Talk to Assistant
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
