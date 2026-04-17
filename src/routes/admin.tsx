import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center">
          <h1 className="text-lg font-semibold">Admin only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You don't have access to this area. Ask an existing admin to grant you the role.
          </p>
        </div>
      </div>
    );
  }
  return (
    <AppShell mode="admin">
      <Outlet />
    </AppShell>
  );
}
