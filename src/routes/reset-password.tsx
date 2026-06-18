import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Activity, KeyRound } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Update password — Allocate" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { isAuthenticated, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    toast.success("Password updated successfully! Please sign in with your new password.");
    
    // Clear the recovery session and redirect to login
    await signOut();
    void navigate({ to: "/login" });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Verifying session…</div>
      </div>
    );
  }

  // If the user lands here and is not authenticated (no active recovery session)
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Activity className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">Allocate</span>
          </Link>

          <div className="rounded-lg border border-destructive/20 bg-card p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Invalid or Expired Link</h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              This password reset link is invalid, has expired, or was already used. Please request a new reset link.
            </p>
            <Link to="/forgot-password" className="mt-6 flex w-full">
              <Button className="w-full">
                Request new link
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Activity className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight">Allocate</span>
        </Link>

        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-xl font-semibold tracking-tight">Set new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter a secure new password for your account.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Updating password…" : "Reset password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
