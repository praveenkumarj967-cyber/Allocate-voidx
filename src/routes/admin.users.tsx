import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shield, ShieldOff } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const { user: me, refreshRoles } = useAuth();
  const qc = useQueryClient();

  const { data: profiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at");
      return data ?? [];
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*");
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("admin-users")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () =>
        qc.invalidateQueries({ queryKey: ["all-roles"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [qc]);

  const isAdmin = (uid: string) => (roles ?? []).some((r) => r.user_id === uid && r.role === "admin");

  const grant = async (uid: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: "admin" });
    if (error) toast.error(error.message);
    else {
      toast.success("Admin role granted");
      if (uid === me?.id) await refreshRoles();
    }
  };
  const revoke = async (uid: string) => {
    if (uid === me?.id && !confirm("Remove your own admin role?")) return;
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", uid)
      .eq("role", "admin");
    if (error) toast.error(error.message);
    else {
      toast.success("Admin role revoked");
      if (uid === me?.id) await refreshRoles();
    }
  };

  return (
    <div>
      <PageHeader
        title="Users"
        description="Grant or revoke admin access. The first admin must be created in the database."
      />

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <ul className="divide-y divide-border">
          {(profiles ?? []).map((p) => {
            const admin = isAdmin(p.id);
            return (
              <li
                key={p.id}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {p.display_name ?? p.email}
                    {p.id === me?.id && (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{p.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={admin ? "default" : "muted"}>{admin ? "Admin" : "User"}</Badge>
                  {admin ? (
                    <Button size="sm" variant="outline" onClick={() => revoke(p.id)}>
                      <ShieldOff className="h-3.5 w-3.5" /> Revoke
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => grant(p.id)}>
                      <Shield className="h-3.5 w-3.5" /> Make admin
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
