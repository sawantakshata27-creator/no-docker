import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth-store";
import { toast } from "sonner";
import { Mail, Lock, Loader2 } from "lucide-react";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  component: LoginPage,
});

type Mode = "signin" | "signup" | "magic" | "forgot";

function friendlyError(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "Email or password is incorrect.";
  if (/already registered/i.test(msg)) return "This email is already in use — try signing in.";
  if (/password should be/i.test(msg)) return msg;
  return msg;
}

function LoginPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const session = useAuth((s) => s.session);
  const profile = useAuth((s) => s.profile);
  const [mode, setMode] = useState<Mode>(search.mode === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      if (profile && !profile.onboarded) navigate({ to: "/onboarding" });
      else if (profile?.onboarded) navigate({ to: "/dashboard" });
    }
  }, [session, profile, navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Account created — welcome!");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        toast.success("Check your inbox for the sign-in link.");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback`,
        });
        if (error) throw error;
        toast.success("Password reset email sent.");
      }
    } catch (err: any) {
      toast.error(friendlyError(err.message ?? "Something went wrong"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/auth/callback` });
      if (r.error) throw r.error;
    } catch (err: any) {
      toast.error(err.message ?? "Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Left: brand panel */}
      <div className="hidden md:flex sidebar-gradient relative overflow-hidden p-12 text-white flex-col justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur font-bold">2D</div>
          <span className="font-semibold">2DS Workflow</span>
        </Link>
        <div>
          <h2 className="text-4xl font-bold leading-tight">Ship documents at scale.</h2>
          <p className="mt-4 text-white/70 max-w-md">
            Track every sign through creation, preprocessing, association, adjustment, QA and delivery — without leaving your board.
          </p>
        </div>
        <div className="text-xs text-white/50">© 2DS Workflow</div>
        <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-primary-500/30 blur-3xl" />
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 bg-surface">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold">
            {mode === "signup" ? "Create your account" : mode === "magic" ? "Magic link sign-in" : mode === "forgot" ? "Reset password" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup" ? "Start in under a minute." : mode === "magic" ? "We'll email you a one-tap sign-in link." : mode === "forgot" ? "We'll send a reset link to your email." : "Sign in to your workspace."}
          </p>

          {mode !== "forgot" && mode !== "magic" && (
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 font-medium hover:bg-muted disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
              Continue with Google
            </button>
          )}

          {mode !== "forgot" && mode !== "magic" && (
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
            </div>
          )}

          <form onSubmit={handleEmail} className="space-y-3">
            {mode === "signup" && (
              <input className="input-field" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input className="input-field pl-9" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {(mode === "signin" || mode === "signup") && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input className="input-field pl-9" type="password" placeholder="Password (min 8 chars)" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signup" ? "Create account" : mode === "magic" ? "Send magic link" : mode === "forgot" ? "Send reset link" : "Sign in"}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            {mode === "signin" ? (
              <>
                <button onClick={() => setMode("magic")} className="hover:text-primary-600">Use magic link</button>
                <button onClick={() => setMode("forgot")} className="hover:text-primary-600">Forgot password?</button>
                <button onClick={() => setMode("signup")} className="hover:text-primary-600">Create account</button>
              </>
            ) : (
              <button onClick={() => setMode("signin")} className="hover:text-primary-600">← Back to sign in</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
