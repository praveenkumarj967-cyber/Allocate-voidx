import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/app-shell";
import { Activity, Clock, CheckCircle2, XCircle } from "lucide-react";
import { hoursBetween } from "@/lib/booking-utils";

export const Route = createFileRoute("/admin/analytics")({
  component: AdminAnalytics,
});

function AdminAnalytics() {
  const { data: bookings } = useQuery({
    queryKey: ["analytics-bookings"],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data } = await supabase
        .from("bookings")
        .select("*, resources(name)")
        .gte("created_at", since.toISOString());
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const list = bookings ?? [];
    const total = list.length;
    const approved = list.filter((b) => b.status === "approved" || b.status === "completed").length;
    const pending = list.filter((b) => b.status === "pending").length;
    const rejected = list.filter((b) => b.status === "rejected" || b.status === "displaced").length;
    const totalHours = list
      .filter((b) => ["approved", "completed"].includes(b.status))
      .reduce((acc, b) => acc + hoursBetween(new Date(b.start_time), new Date(b.end_time)), 0);
    return { total, approved, pending, rejected, totalHours };
  }, [bookings]);

  const utilization = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookings ?? []) {
      if (!["approved", "completed"].includes(b.status)) continue;
      const name = b.resources?.name ?? "Unknown";
      const hrs = hoursBetween(new Date(b.start_time), new Date(b.end_time));
      map.set(name, (map.get(name) ?? 0) + hrs);
    }
    return Array.from(map.entries())
      .map(([name, hours]) => ({ name, hours: Number(hours.toFixed(1)) }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8);
  }, [bookings]);

  const priorityMix = useMemo(() => {
    const map = { emergency: 0, high: 0, normal: 0 };
    for (const b of bookings ?? []) map[b.priority]++;
    return [
      { name: "Normal", value: map.normal, color: "var(--color-muted-foreground)" },
      { name: "High", value: map.high, color: "var(--color-high-priority)" },
      { name: "Emergency", value: map.emergency, color: "var(--color-emergency)" },
    ];
  }, [bookings]);

  const dailyVolume = useMemo(() => {
    const days: Array<{ day: string; bookings: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const count = (bookings ?? []).filter(
        (b) => new Date(b.created_at) >= d && new Date(b.created_at) < next,
      ).length;
      days.push({
        day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        bookings: count,
      });
    }
    return days;
  }, [bookings]);

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Last 30 days of booking activity and resource utilization."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total bookings" value={stats.total} icon={Activity} />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} tone="success" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} tone="warning" />
        <StatCard
          label="Rejected/Displaced"
          value={stats.rejected}
          icon={XCircle}
          tone="destructive"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold tracking-tight">Daily booking volume</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="bookings" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold tracking-tight">Priority mix</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityMix}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {priorityMix.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-5">
        <h3 className="mb-1 text-sm font-semibold tracking-tight">Utilization by resource</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Total approved/completed booked hours · Top 8
        </p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={utilization} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(v) => `${v} h`}
              />
              <Bar dataKey="hours" fill="var(--color-chart-2)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
