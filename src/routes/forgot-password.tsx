import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Activity, ArrowLeft } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ title: "Reset password — Allocate" }],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to={isAdmin ? "/admin" : "/app"} />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSuccess(true);
    toast.success("Password reset link sent to your email!");
  };

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
          <h1 className="text-xl font-semibold tracking-tight">Forgot password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email address to receive a password reset link.
          </p>

          {success ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-md bg-primary/5 border border-primary/20 p-4 text-sm text-muted-foreground leading-relaxed">
                We've sent a link to <strong className="text-foreground">{email}</strong> to reset your password. Please check your inbox and spam folder.
              </div>
              <Link to="/login" className="flex w-full">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to sign in
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Sending link…" : "Send recovery link"}
              </Button>
              
              <div className="mt-4 flex justify-center">
                <Link to="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
