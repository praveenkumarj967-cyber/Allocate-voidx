import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, MapPin, Clock, DollarSign, CalendarPlus, X, Boxes, Camera } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCheckInQR } from "@/lib/checkin-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookingDialog } from "@/components/booking-dialog";
import { statusResourceVariant } from "@/lib/booking-utils";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Resource = Database["public"]["Tables"]["resources"]["Row"] & {
  resource_categories: { name: string; icon: string | null } | null;
};

export const Route = createFileRoute("/app/resources")({
  component: ResourcesPage,
});

function ResourcesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [maxCost, setMaxCost] = useState<string>("");
  const [bookingResource, setBookingResource] = useState<Resource | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel("public-resources")
      .on("postgres_changes", { event: "*", schema: "public", table: "resources" }, () => {
        void qc.invalidateQueries({ queryKey: ["resources-public"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "resource_categories" }, () => {
        void qc.invalidateQueries({ queryKey: ["categories"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("resource_categories").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: resources, isLoading } = useQuery({
    queryKey: ["resources-public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("resources")
        .select("*, resource_categories(name, icon)")
        .order("name");
      return (data as Resource[]) ?? [];
    },
  });

  const filtered = useMemo(() => {
    let list = resources ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.location?.toLowerCase().includes(q),
      );
    }
    if (categoryFilter !== "all") {
      list = list.filter((r) => r.category_id === categoryFilter);
    }
    if (maxCost) {
      const c = Number(maxCost);
      if (!Number.isNaN(c)) list = list.filter((r) => Number(r.hourly_cost) <= c);
    }
    return list;
  }, [resources, search, categoryFilter, maxCost]);

  return (
    <div>
      <PageHeader
        title="Resources"
        description="Browse, filter, and book available resources."
      />

      <div className="mb-8 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, description, location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 rounded-xl"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(categories ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Input
            type="number"
            min="0"
            placeholder="Max hourly cost (optional)"
            value={maxCost}
            onChange={(e) => setMaxCost(e.target.value)}
            className="max-w-[200px] h-9 text-xs rounded-lg"
          />
          
          {(search || categoryFilter !== "all" || maxCost) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">Active Filters:</span>
              {search && (
                <Badge variant="secondary" className="gap-1 pl-2 pr-1 h-6 text-[10px] rounded-full">
                  "{search}"
                  <button onClick={() => setSearch("")} className="hover:text-primary"><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {categoryFilter !== "all" && (
                <Badge variant="secondary" className="gap-1 pl-2 pr-1 h-6 text-[10px] rounded-full">
                  {categories?.find(c => c.id === categoryFilter)?.name}
                  <button onClick={() => setCategoryFilter("all")} className="hover:text-primary"><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {maxCost && (
                <Badge variant="secondary" className="gap-1 pl-2 pr-1 h-6 text-[10px] rounded-full">
                  Under ${maxCost}
                  <button onClick={() => setMaxCost("")} className="hover:text-primary"><X className="h-3 w-3" /></button>
                </Badge>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setSearch(""); setCategoryFilter("all"); setMaxCost(""); }}
                className="h-6 px-2 text-[10px] font-bold text-destructive hover:bg-destructive/10"
              >
                Clear All
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          {filtered.length === resources?.length 
            ? `Showing all ${resources?.length} resources` 
            : `Found ${filtered.length} matches`}
        </p>
      </div>
      {isLoading ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="enterprise-card rounded-3xl p-16 text-center border-dashed border-2 bg-muted/20">
          <Boxes className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
          <p className="text-xl font-bold text-muted-foreground uppercase tracking-widest mb-4">No Resources Found</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-8">
            The platform is active but the catalog is currently empty.
          </p>
          <Button 
            onClick={async () => {
              const { seedSystemResources } = await import("@/lib/system-init");
              await seedSystemResources();
              void qc.invalidateQueries({ queryKey: ["resources-public"] });
            }}
            className="rounded-xl font-black h-12 px-8 shadow-xl shadow-primary/20"
          >
            <Zap className="mr-2 h-4 w-4" />
            Seed Demo Catalog
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((r, i) => (
            <article
              key={r.id}
              className="enterprise-card group relative rounded-2xl p-6 flex flex-col animate-slide overflow-hidden"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
                  <Boxes className="h-5 w-5" />
                </div>
                <Badge className={cn(
                  "rounded-full px-3 py-1 font-bold text-[8px] uppercase tracking-widest border-none shadow-sm",
                  r.status === "active" ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                )}>
                  {r.status}
                </Badge>
              </div>
 
              <div className="flex-1 min-w-0 relative group/qr">
                <div className="text-[8px] font-bold text-primary uppercase tracking-[0.2em] mb-1">
                  {r.resource_categories?.name?.split(' ')[0] || "CORE"}
                </div>
                <h3 className="text-lg font-black text-foreground leading-tight tracking-tight mb-2 group-hover:text-primary transition-colors truncate">
                  {r.name}
                </h3>
                
                {/* Compressed Clean-QR Overlay */}
                <div className="absolute inset-0 bg-white/95 dark:bg-slate-950/95 flex flex-col items-center justify-center opacity-0 group-hover/qr:opacity-100 transition-all duration-300 rounded-2xl scale-95 group-hover/qr:scale-100 backdrop-blur-md border border-primary/20">
                  <div className="h-24 w-24 border border-primary/10 rounded-2xl p-2 bg-white flex items-center justify-center shadow-lg">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(window.location.origin + '/app/check-in/' + r.id)}`} alt="QR" className="h-full w-full" />
                  </div>
                  <span className="mt-2 text-[8px] font-bold text-primary uppercase tracking-widest">Scan On-site</span>
                </div>
              </div>
 
              <div className="mt-4 space-y-4 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-[9px] uppercase tracking-widest truncate max-w-[60px]">
                    <MapPin className="h-3 w-3 text-primary/50" />
                    {r.location?.split(' ')[0] || "S-01"}
                  </div>
                  <div className="flex items-center gap-1 text-xl font-black text-foreground tracking-tighter">
                    <span className="text-[10px] text-primary/70">$</span>
                    {Number(r.hourly_cost) === 0 ? "0" : r.hourly_cost}
                  </div>
                </div>
 
                <Button
                  className={cn(
                    "w-full rounded-xl font-bold text-[10px] uppercase tracking-widest h-10 transition-all duration-300 shadow-md",
                    r.status === "active" ? "bg-primary text-white hover:shadow-primary/20" : "bg-muted text-muted-foreground"
                  )}
                  disabled={r.status !== "active"}
                  onClick={() => setBookingResource(r)}
                >
                  {r.status === "active" ? "Initialize" : "OFFLINE"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}


      {bookingResource && (
        <BookingDialog
          resource={bookingResource}
          onOpenChange={(open: boolean) => !open && setBookingResource(null)}
        />
      )}
    </div>
  );
}
