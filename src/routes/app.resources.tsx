import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Clock, DollarSign, CalendarPlus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookingDialog } from "@/components/booking-dialog";
import { statusResourceVariant } from "@/lib/booking-utils";
import type { Database } from "@/integrations/supabase/types";

type Resource = Database["public"]["Tables"]["resources"]["Row"] & {
  resource_categories: { name: string; icon: string | null } | null;
};

export const Route = createFileRoute("/app/resources")({
  component: ResourcesPage,
});

function ResourcesPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [maxCost, setMaxCost] = useState<string>("");
  const [bookingResource, setBookingResource] = useState<Resource | null>(null);

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

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, description, location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
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

      <div className="mb-5">
        <Input
          type="number"
          min="0"
          placeholder="Max hourly cost (optional)"
          value={maxCost}
          onChange={(e) => setMaxCost(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Loading resources…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">No resources match your filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <article
              key={r.id}
              className="flex flex-col rounded-lg border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {r.resource_categories?.name}
                  </div>
                  <h3 className="mt-1 truncate text-base font-semibold text-foreground">
                    {r.name}
                  </h3>
                </div>
                <Badge variant={statusResourceVariant(r.status)}>{r.status}</Badge>
              </div>
              {r.description && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
              )}
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                {r.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="truncate">{r.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {r.opening_time.slice(0, 5)} – {r.closing_time.slice(0, 5)}
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  {Number(r.hourly_cost) === 0 ? "Free" : `$${r.hourly_cost}/hr`}
                </div>
                <div>Capacity: {r.capacity}</div>
              </dl>
              <Button
                className="mt-5 w-full"
                disabled={r.status !== "active"}
                onClick={() => setBookingResource(r)}
              >
                <CalendarPlus className="h-4 w-4" />
                {r.status === "active" ? "Book" : "Unavailable"}
              </Button>
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
