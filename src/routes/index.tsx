import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth-store";
import { toast } from "sonner";
import { Loader2, ArrowRight, Check, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({ component: Landing });

type Mode = "signin" | "signup";

function friendlyError(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "Email or password is incorrect.";
  if (/already registered/i.test(msg)) return "This email is already in use — try signing in.";
  return msg;
}

function Landing() {
  const navigate = useNavigate();
  const session = useAuth((s) => s.session);
  const profile = useAuth((s) => s.profile);

  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Handle ?join=CODE invite links
    // TODO: Replace localhost with production URL in invite link generation (team.tsx getInviteUrl)
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get("join");
    if (joinCode) {
      sessionStorage.setItem("pendingJoinCode", joinCode.toUpperCase());
    }

    if (session) {
      if (profile && !profile.onboarded) navigate({ to: "/onboarding" });
      else if (profile?.onboarded) navigate({ to: "/dashboard" });
    }
  }, [session, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
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
        toast.success("Account created — welcome aboard!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
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
      const r = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth/callback`,
      });
      if (r.error) throw r.error;
    } catch (err: any) {
      toast.error(err.message ?? "Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-foreground">
      {/* ── Full-bleed background image with glass overlay ── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage: `url("https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?auto=format&fit=crop&w=1800&q=80")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* glass gradient overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.99 0.008 85 / 0.82) 0%, oklch(0.96 0.025 195 / 0.72) 55%, oklch(0.92 0.04 195 / 0.65) 100%)",
          backdropFilter: "blur(12px) saturate(140%)",
          WebkitBackdropFilter: "blur(12px) saturate(140%)",
        }}
      />

      {/* ── Minimal Nav ── */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex items-center gap-2.5"
        >
          <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 to-primary-800 font-bold text-white shadow-lg">
            <span className="font-display text-sm">2D</span>
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">2DS Workflow</span>
        </motion.div>
        <motion.a
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          href="#auth"
          className="hidden rounded-full border border-primary-200 bg-white/50 px-4 py-1.5 text-xs font-semibold text-primary-700 backdrop-blur transition hover:bg-white/70 md:inline-block"
        >
          Sign in
        </motion.a>
      </nav>

      {/* ── Hero split ── */}
      <section
        id="auth"
        className="mx-auto grid max-w-7xl gap-12 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-20"
      >
        {/* Left copy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/60 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary-700 backdrop-blur">
            <Sparkles className="h-3 w-3" />
            The workflow OS for document teams
          </div>

          <h1 className="font-display text-[44px] font-extrabold leading-[0.98] tracking-[-0.04em] text-foreground md:text-[60px] lg:text-[72px]">
            Ship more.
            <br />
            Bottleneck{" "}
            <em className="not-italic text-primary-600">less.</em>
            <br />
            <span className="bg-gradient-to-br from-primary-600 to-primary-800 bg-clip-text text-transparent">
              Full control.
            </span>
          </h1>

          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-muted-foreground">
            2DS Workflow orchestrates your sign pipeline — Kanban boards, throughput
            analytics, runbooks, and a team that agrees on{" "}
            <strong className="font-semibold text-foreground">what's next</strong>.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              "Drag-and-drop Kanban across pipeline stages",
              "Live throughput & bottleneck detection",
              "Org codes — invite teammates in seconds",
              "Role-based access: Owner, Admin, Member",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-100 text-primary-700">
                  <Check className="h-3 w-3" />
                </span>
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap items-center gap-5">
            {["Jira-style boards", "Linear-speed", "Notion-like docs", "Supabase-powered"].map((l) => (
              <span key={l} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                {l}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Right: auth card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto w-full max-w-md"
        >
          <div
            className="overflow-hidden rounded-3xl border border-white/40 p-7 shadow-[0_32px_80px_-20px_rgba(7,50,60,0.28)]"
            style={{
              background: "rgba(255,255,255,0.72)",
              backdropFilter: "blur(32px) saturate(160%)",
              WebkitBackdropFilter: "blur(32px) saturate(160%)",
            }}
          >
            <h2 className="font-display text-xl font-bold tracking-tight">
              {mode === "signup" ? "Start in 60 seconds" : "Welcome back"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === "signup"
                ? "No credit card. No setup. Just clarity."
                : "Sign in to your workspace."}
            </p>

            {/* Tab toggle */}
            <div className="mt-5 flex rounded-xl border border-border/60 bg-muted/50 p-1">
              {(["signup", "signin"] as Mode[]).map((m) => (
                <button
                  key={m}
                  id={`auth-tab-${m}`}
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                    mode === m
                      ? "bg-primary-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "signup" ? "Sign up" : "Sign in"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              {mode === "signup" && (
                <input
                  id="auth-fullname"
                  className="input-field"
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoFocus
                />
              )}
              <input
                id="auth-email"
                className="input-field"
                type="email"
                placeholder="Work email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus={mode === "signin"}
              />
              <input
                id="auth-password"
                className="input-field"
                type="password"
                placeholder="Password (min 8 chars)"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                id="auth-submit"
                type="submit"
                disabled={loading}
                className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "signup" ? "Get started — it's free" : "Sign in"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> Or continue with{" "}
              <div className="h-px flex-1 bg-border" />
            </div>

            <button
              id="auth-google"
              onClick={handleGoogle}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-white/80 px-4 py-2.5 text-sm font-medium transition hover:bg-white disabled:opacity-50"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              {mode === "signup" ? "Already have an account? " : "Don't have an account? "}
              <button
                id="auth-switch"
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                className="font-medium text-primary-600 hover:underline"
              >
                {mode === "signup" ? "Sign in" : "Sign up free"}
              </button>
            </p>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/60">
              <span>🔒</span>
              <span>Encrypted at rest · SOC-2 ready infra</span>
            </div>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-white/20 py-6">
        <div className="mx-auto max-w-7xl px-6 text-center text-xs text-muted-foreground/70">
          © {new Date().getFullYear()} 2DS Workflow — Built for sign processing teams
        </div>
      </footer>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
