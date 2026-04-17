import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { statusResourceVariant } from "@/lib/booking-utils";
import type { Database } from "@/integrations/supabase/types";

type Resource = Database["public"]["Tables"]["resources"]["Row"];
type Category = Database["public"]["Tables"]["resource_categories"]["Row"];

export const Route = createFileRoute("/admin/resources")({
  component: AdminResources,
});

function AdminResources() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Resource | "new" | null>(null);
  const [catEditing, setCatEditing] = useState<Category | "new" | null>(null);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("resource_categories").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: resources } = useQuery({
    queryKey: ["admin-resources"],
    queryFn: async () => {
      const { data } = await supabase
        .from("resources")
        .select("*, resource_categories(name)")
        .order("name");
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("admin-res")
      .on("postgres_changes", { event: "*", schema: "public", table: "resources" }, () =>
        qc.invalidateQueries({ queryKey: ["admin-resources"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [qc]);

  const deleteResource = async (id: string) => {
    if (!confirm("Delete this resource? Existing bookings will be removed.")) return;
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Resource deleted");
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category? Resources must be empty.")) return;
    const { error } = await supabase.from("resource_categories").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Category deleted");
  };

  return (
    <div>
      <PageHeader
        title="Resources"
        description="Manage categories, resources, and their constraints."
        actions={
          <>
            <Button variant="outline" onClick={() => setCatEditing("new")}>
              <Plus className="h-4 w-4" /> Category
            </Button>
            <Button onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" /> Resource
            </Button>
          </>
        }
      />

      {/* Categories */}
      <h2 className="mb-3 text-sm font-semibold tracking-tight">Categories</h2>
      <div className="mb-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {(categories ?? []).map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-md border border-border bg-card p-3"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{c.name}</div>
              {c.description && (
                <div className="truncate text-xs text-muted-foreground">{c.description}</div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => setCatEditing(c)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => deleteCategory(c.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Resources */}
      <h2 className="mb-3 text-sm font-semibold tracking-tight">Resources</h2>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {(resources ?? []).length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No resources yet. Add one to get started.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {(resources ?? []).map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {r.resource_categories?.name}
                  </div>
                  <div className="truncate text-sm font-semibold">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.location ?? "—"} · ${r.hourly_cost}/hr · cap {r.capacity} ·{" "}
                    {r.opening_time.slice(0, 5)}–{r.closing_time.slice(0, 5)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusResourceVariant(r.status)}>{r.status}</Badge>
                  {r.auto_approve && <Badge variant="muted">Auto-approve</Badge>}
                  <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteResource(r.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <ResourceForm
          resource={editing === "new" ? null : editing}
          categories={categories ?? []}
          onClose={() => setEditing(null)}
        />
      )}
      {catEditing && (
        <CategoryForm
          category={catEditing === "new" ? null : catEditing}
          onClose={() => setCatEditing(null)}
        />
      )}
    </div>
  );
}

function CategoryForm({
  category,
  onClose,
}: {
  category: Category | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "package");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    if (category) {
      const { error } = await supabase
        .from("resource_categories")
        .update({ name, description, icon })
        .eq("id", category.id);
      if (error) toast.error(error.message);
      else {
        toast.success("Category updated");
        onClose();
      }
    } else {
      const { error } = await supabase
        .from("resource_categories")
        .insert({ name, description, icon });
      if (error) toast.error(error.message);
      else {
        toast.success("Category created");
        onClose();
      }
    }
    setSubmitting(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="cname">Name</Label>
            <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cdesc">Description</Label>
            <Textarea
              id="cdesc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="cicon">Icon (lucide name)</Label>
            <Input id="cicon" value={icon} onChange={(e) => setIcon(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !name.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResourceForm({
  resource,
  categories,
  onClose,
}: {
  resource: Resource | null;
  categories: Category[];
  onClose: () => void;
}) {
  const [name, setName] = useState(resource?.name ?? "");
  const [description, setDescription] = useState(resource?.description ?? "");
  const [categoryId, setCategoryId] = useState(resource?.category_id ?? categories[0]?.id ?? "");
  const [capacity, setCapacity] = useState(resource?.capacity ?? 1);
  const [hourlyCost, setHourlyCost] = useState(Number(resource?.hourly_cost ?? 0));
  const [openingTime, setOpeningTime] = useState(resource?.opening_time?.slice(0, 5) ?? "09:00");
  const [closingTime, setClosingTime] = useState(resource?.closing_time?.slice(0, 5) ?? "18:00");
  const [location, setLocation] = useState(resource?.location ?? "");
  const [status, setStatus] = useState(resource?.status ?? "active");
  const [autoApprove, setAutoApprove] = useState(resource?.auto_approve ?? false);
  const [maxHours, setMaxHours] = useState(resource?.max_hours_per_user_per_week ?? 20);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!categoryId) {
      toast.error("Pick a category");
      return;
    }
    setSubmitting(true);
    const payload = {
      name,
      description,
      category_id: categoryId,
      capacity,
      hourly_cost: hourlyCost,
      opening_time: openingTime,
      closing_time: closingTime,
      location: location || null,
      status,
      auto_approve: autoApprove,
      max_hours_per_user_per_week: maxHours,
    };
    if (resource) {
      const { error } = await supabase.from("resources").update(payload).eq("id", resource.id);
      if (error) toast.error(error.message);
      else {
        toast.success("Resource updated");
        onClose();
      }
    } else {
      const { error } = await supabase.from("resources").insert(payload);
      if (error) toast.error(error.message);
      else {
        toast.success("Resource created");
        onClose();
      }
    }
    setSubmitting(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{resource ? "Edit resource" : "New resource"}</DialogTitle>
          <DialogDescription>Configure availability, cost and constraints.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <Label>Capacity</Label>
            <Input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Hourly cost ($)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={hourlyCost}
              onChange={(e) => setHourlyCost(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Fair-use cap (h/week)</Label>
            <Input
              type="number"
              min={1}
              value={maxHours}
              onChange={(e) => setMaxHours(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Opening time</Label>
            <Input
              type="time"
              value={openingTime}
              onChange={(e) => setOpeningTime(e.target.value)}
            />
          </div>
          <div>
            <Label>Closing time</Label>
            <Input
              type="time"
              value={closingTime}
              onChange={(e) => setClosingTime(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3 sm:col-span-2">
            <div>
              <Label>Auto-approve bookings</Label>
              <p className="text-xs text-muted-foreground">
                Skip admin approval for non-conflicting requests.
              </p>
            </div>
            <Switch checked={autoApprove} onCheckedChange={setAutoApprove} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !name.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
