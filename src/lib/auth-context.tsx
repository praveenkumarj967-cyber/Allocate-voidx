import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "user";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: { display_name: string | null } | null;
  roles: AppRole[];
  isAdmin: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<{ display_name: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (userId: string) => {
    try {
      // Fetch in background without blocking the UI
      const [rolesRes, profileRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("display_name").eq("id", userId).single(),
      ]);
      
      if (rolesRes.data) {
        setRoles(rolesRes.data.map((r) => r.role as AppRole));
      }
      if (profileRes.data) {
        setProfile(profileRes.data);
      }
    } catch (err) {
      console.error("Background data load error:", err);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(initialSession);
        
        // INSTANT PASS: Set loading to false as soon as we know the session status
        setLoading(false);

        if (initialSession?.user) {
          void loadUserData(initialSession.user.id);
        }
      } catch (err) {
        console.error("Auth init error:", err);
        if (mounted) setLoading(false);
      }
    }

    void initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      
      setSession(newSession);
      
      // If logging out, clear data
      if (!newSession) {
        setRoles([]);
        setProfile(null);
        setLoading(false);
      } else {
        // If logging in, fetch data in background
        void loadUserData(newSession.user.id);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    roles,
    isAdmin: roles.includes("admin"),
    isAuthenticated: !!session,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refreshRoles: async () => {
      if (session?.user) {
        await loadUserData(session.user.id);
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}
