import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-shell";
import { promoteToAdmin, seedSystemResources } from "@/lib/system-init";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Database, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { isAuthenticated, isAdmin, loading, user, refreshRoles } = useAuth();
  const [isSystemEmpty, setIsSystemEmpty] = useState(false);

  useEffect(() => {
    async function checkSystem() {
      if (!user) return;
      const { count } = await supabase.from("resources").select("*", { count: 'exact', head: true });
      setIsSystemEmpty(count === 0);
    }
    void checkSystem();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" />;

  const handleInit = async () => {
    if (!user) return;
    const ok1 = await promoteToAdmin(user.id);
    if (ok1) {
      await refreshRoles();
      await seedSystemResources();
      setIsSystemEmpty(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      {isSystemEmpty && !isAdmin && (
        <div className="bg-primary px-4 py-3 text-primary-foreground shadow-2xl relative z-[60]">
          <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Zap className="h-5 w-5 animate-pulse" />
              </div>
              <div className="text-sm">
                <p className="font-black uppercase tracking-widest leading-none mb-1">New System Detected</p>
                <p className="font-medium opacity-90">Initialize the platform to claim Administrative Control and seed resources.</p>
              </div>
            </div>
            <Button 
              variant="secondary" 
              onClick={handleInit}
              className="font-black rounded-xl h-10 px-6 shadow-lg shadow-black/20 hover:scale-105 transition-all"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Initialize Platform
            </Button>
          </div>
        </div>
      )}
      <AppShell mode="user">
        <Outlet />
      </AppShell>
    </div>
  );
}
