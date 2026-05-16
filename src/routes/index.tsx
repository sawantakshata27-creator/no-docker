import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth-store";
import { toast } from "sonner";
import {
  Loader2,
  Kanban,
  BarChart3,
  ShieldCheck,
  FileText,
  ArrowRight,
  Check,
} from "lucide-react";

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
    <div className="min-h-screen bg-white dark:bg-[oklch(0.15_0.03_270)]">
      {/* Nav */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-600 font-bold text-white text-sm">
            2D
          </div>
          <span className="font-semibold text-foreground">2DS Workflow</span>
        </div>
        <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
        </div>
      </nav>

      {/* Hero section — Jira-style split */}
      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-12 lg:grid-cols-2 lg:items-center lg:py-20">
        {/* Left: hero copy */}
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
            Built for document-processing teams
          </div>
          <h1 className="text-5xl font-extrabold leading-[1.08] tracking-tight text-foreground md:text-6xl lg:text-[64px]">
            More output.
            <br />
            Less bottleneck.
            <br />
            <span className="text-primary-600">Full control.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            2DS Workflow orchestrates your sign pipeline from creation to delivery — with Kanban boards, throughput analytics, and real-time team collaboration.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              "Drag-and-drop Kanban across all pipeline stages",
              "Real-time throughput charts and bottleneck alerts",
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

          <div className="mt-10 flex flex-wrap items-center gap-6">
            {LOGOS.map((l) => (
              <span key={l} className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
                {l}
              </span>
            ))}
          </div>
        </div>

        {/* Right: auth form card */}
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]">
            <div className="mb-6 flex rounded-xl border border-border p-1">
              {(["signup", "signin"] as Mode[]).map((m) => (
                <button
                  key={m}
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

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "signup" && (
                <input
                  className="input-field"
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoFocus
                />
              )}
              <input
                className="input-field"
                type="email"
                placeholder="Work email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus={mode === "signin"}
              />
              <input
                className="input-field"
                type="password"
                placeholder="Password (min 8 chars)"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "signup" ? "Get started free" : "Sign in"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> Or continue with <div className="h-px flex-1 bg-border" />
            </div>

            <button
              onClick={handleGoogle}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
            >
              <GoogleIcon />
              Google
            </button>

            {mode === "signin" && (
              <div className="mt-4 text-center">
                <Link to="/login" search={{ mode: "forgot" }} className="text-xs text-muted-foreground hover:text-primary-600">
                  Forgot password?
                </Link>
              </div>
            )}

            <p className="mt-5 text-center text-xs text-muted-foreground">
              {mode === "signup"
                ? "Already have an account? "
                : "Don't have an account? "}
              <button
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                className="font-medium text-primary-600 hover:underline"
              >
                {mode === "signup" ? "Sign in" : "Sign up free"}
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="border-t border-border bg-surface py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Every team starts here
            </h2>
            <p className="mt-3 text-muted-foreground">
              Flexible views, org-wide visibility, and zero-admin setup.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4" id="how-it-works">
            {FEATURES.map((f) => (
              <div key={f.title} className="card-surface p-6">
                <div
                  className={`mb-4 grid h-11 w-11 place-items-center rounded-xl ${f.color}`}
                >
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to ship faster?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Sign up above and create your workspace in under 2 minutes.
          </p>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} 2DS Workflow — Built for sign processing teams
        </div>
      </footer>
    </div>
  );
}

const LOGOS = ["Jira-style boards", "Linear-speed", "Notion-like docs", "Supabase-powered"];

const FEATURES = [
  { icon: Kanban, title: "Drag-and-drop Kanban", desc: "Move tasks across pipeline stages with smooth real-time updates.", color: "bg-primary-50 text-primary-700" },
  { icon: BarChart3, title: "Throughput analytics", desc: "Completion trends, pipeline bars, and bottleneck detection.", color: "bg-blue-50 text-blue-600" },
  { icon: ShieldCheck, title: "Roles & permissions", desc: "Owner, Admin, and Member roles with row-level Supabase policies.", color: "bg-emerald-50 text-emerald-600" },
  { icon: FileText, title: "Rich documents", desc: "Write runbooks, SOPs, and notes with a full-featured rich-text editor.", color: "bg-amber-50 text-amber-600" },
];

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
