import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
  Sparkles,
  Layers3,
  Zap,
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
      import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
      import { useState, useEffect } from "react";
      import { motion } from "framer-motion";
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
        Sparkles,
        Layers3,
        Zap,
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

        // Staggered entrance variants
        const container = {
          hidden: {},
          show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
        };
        const item = {
          hidden: { opacity: 0, y: 14 },
          show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
        };

        return (
          <div className="relative min-h-screen overflow-hidden bg-surface text-foreground">
            {/* Animated background orbs */}
            <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
              <div className="orb orb-1" style={{ top: "-180px", left: "-160px" }} />
              <div className="orb orb-2" style={{ top: "10%", right: "-120px" }} />
              <div className="orb orb-3" style={{ bottom: "-180px", left: "30%" }} />
            </div>

            {/* Nav */}
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-2.5"
              >
                <div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 to-primary-800 font-bold text-white shadow-[0_8px_24px_-8px_rgba(124,58,237,0.6)]">
                  <span className="font-display text-sm">2D</span>
                  <span className="absolute inset-0 grain rounded-2xl" />
                </div>
                <span className="font-display text-lg font-semibold tracking-tight">2DS Workflow</span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="hidden items-center gap-7 text-sm md:flex"
              >
                <a href="#features" className="nav-link">Features</a>
                <a href="#how-it-works" className="nav-link">How it works</a>
                <a
                  href="#auth"
                  className="rounded-full border border-primary-200 bg-primary-50/60 px-4 py-1.5 text-xs font-semibold text-primary-700 backdrop-blur transition hover:bg-primary-100"
                >
                  Sign in
                </a>
              </motion.div>
            </nav>

            {/* Hero — asymmetric split */}
            <section className="relative mx-auto max-w-7xl px-6 pt-8 pb-16 lg:pt-16">
              <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
                {/* Left: hero copy */}
                <motion.div variants={container} initial="hidden" animate="show">
                  <motion.div variants={item} className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/70 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary-700 shadow-sm backdrop-blur">
                    <Sparkles className="h-3 w-3" />
                    The workflow OS for document teams
                  </motion.div>

                  <motion.h1
                    variants={item}
                    className="font-display text-[44px] leading-[0.98] tracking-[-0.04em] text-foreground md:text-[64px] lg:text-[78px]"
                  >
                    Ship more.
                    <br />
                    Bottleneck{" "}
                    <span className="relative inline-block">
                      <span className="relative z-10 italic font-medium text-primary-700">less.</span>
                      <svg
                        aria-hidden
                        viewBox="0 0 220 18"
                        className="absolute -bottom-1 left-0 h-3 w-full"
                        preserveAspectRatio="none"
                      >
                        <path
                          d="M3 12 C 60 2, 140 18, 217 6"
                          stroke="oklch(0.72 0.17 25)"
                          strokeWidth="4"
                          strokeLinecap="round"
                          fill="none"
                        />
                      </svg>
                    </span>
                    <br />
                    <span className="bg-gradient-to-br from-primary-600 via-primary-700 to-[oklch(0.4_0.18_320)] bg-clip-text text-transparent">
                      Full control.
                    </span>
                  </motion.h1>

                  <motion.p variants={item} className="mt-7 max-w-lg text-[17px] leading-relaxed text-muted-foreground">
                    2DS Workflow orchestrates your sign pipeline from creation to delivery — Kanban
                    boards, throughput analytics, runbooks, and a team that finally agrees on{" "}
                    <span className="font-semibold text-foreground">what&apos;s next</span>.
                  </motion.p>

                  <motion.ul variants={item} className="mt-9 grid max-w-md gap-3">
                    {[
                      "Drag-and-drop Kanban across pipeline stages",
                      "Live throughput & bottleneck detection",
                      "Org codes — invite teammates in seconds",
                      "Role-based access for Owner, Admin, Member",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm text-foreground/85">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-600 text-white shadow-sm">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                        {f}
                      </li>
                    ))}
                  </motion.ul>

                  {/* Trust ticker */}
                  <motion.div variants={item} className="mt-12 ticker">
                    <div className="flex flex-wrap items-center gap-x-9 gap-y-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/60">
                      <span className="flex items-center gap-1.5"><Layers3 className="h-3 w-3" /> Jira-style boards</span>
                      <span className="flex items-center gap-1.5"><Zap className="h-3 w-3" /> Linear-speed</span>
                      <span className="flex items-center gap-1.5"><FileText className="h-3 w-3" /> Notion-like docs</span>
                      <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> Supabase-powered</span>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Right: auth panel — frosted glass + slightly offset */}
                <motion.div
                  id="auth"
                  initial={{ opacity: 0, y: 30, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="lg:mt-6 lg:translate-x-4"
                >
                  <div className="card-glass relative p-7">
                    {/* corner ornament */}
                    <div className="absolute -right-3 -top-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[oklch(0.72_0.17_25)] to-[oklch(0.55_0.22_15)] text-white shadow-[0_8px_24px_-8px_rgba(239,68,68,0.5)] rotate-6">
                      <Sparkles className="h-5 w-5" />
                    </div>

                    <div className="mb-1.5 font-display text-2xl font-semibold tracking-tight">
                      {mode === "signup" ? "Start in 60 seconds" : "Welcome back"}
                    </div>
                    <div className="mb-5 text-sm text-muted-foreground">
                      {mode === "signup"
                        ? "No credit card. No setup. Just clarity."
                        : "Sign in to your workspace."}
                    </div>

                    {/* Mode toggle with sliding indicator */}
                    <div className="relative mb-5 flex rounded-full border border-border bg-muted/40 p-1">
                      {(["signup", "signin"] as Mode[]).map((m, idx) => {
                        const active = mode === m;
                        return (
                          <button
                            key={m}
                            onClick={() => setMode(m)}
                            data-testid={`auth-mode-${m}`}
                            className={`relative z-10 flex-1 rounded-full py-2 text-sm font-medium transition ${
                              active ? "text-white" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {m === "signup" ? "Sign up" : "Sign in"}
                            {active && (
                              <motion.span
                                layoutId="auth-pill"
                                className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 shadow-sm"
                                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                                style={{ originX: idx === 0 ? 0 : 1 }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-2.5">
                      {mode === "signup" && (
                        <motion.input
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="input-field"
                          placeholder="Full name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          data-testid="signup-fullname-input"
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
                        data-testid="auth-email-input"
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
                        data-testid="auth-password-input"
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        data-testid="auth-submit-btn"
                        className="btn-primary mt-2 flex w-full items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {mode === "signup" ? "Get started — it's free" : "Sign in"}
                        {!loading && <ArrowRight className="h-4 w-4" />}
                      </button>
                    </form>

                    <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground/70">
                      <div className="h-px flex-1 bg-border" /> Or continue with{" "}
                      <div className="h-px flex-1 bg-border" />
                    </div>

                    <button
                      onClick={handleGoogle}
                      disabled={loading}
                      data-testid="google-signin-btn"
                      className="flex w-full items-center justify-center gap-2.5 rounded-full border border-border bg-white/80 px-4 py-2.5 text-sm font-medium transition hover:border-primary-300 hover:bg-white disabled:opacity-50"
                    >
                      <GoogleIcon />
                      Continue with Google
                    </button>

                    {mode === "signin" && (
                      <div className="mt-4 text-center">
                        <Link
                          to="/login"
                          search={{ mode: "forgot" }}
                          className="text-xs text-muted-foreground hover:text-primary-700"
                        >
                          Forgot password?
                        </Link>
                      </div>
                    )}

                    <p className="mt-5 text-center text-xs text-muted-foreground">
                      {mode === "signup" ? "Already have an account? " : "Don't have an account? "}
                      <button
                        onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                        className="font-semibold text-primary-700 hover:underline"
                      >
                        {mode === "signup" ? "Sign in" : "Sign up free"}
                      </button>
                    </p>
                  </div>

                  {/* Small attestation under card */}
                  <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                    <ShieldCheck className="h-3 w-3 text-emerald-600" /> Encrypted at rest · SOC2-ready infra
                  </div>
                </motion.div>
              </div>
            </section>

            {/* Features section */}
            <section id="features" className="relative mx-auto max-w-7xl px-6 py-24">
              <div className="mb-14 max-w-2xl">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-700">
                  Built for throughput
                </div>
                <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
                  Everything your pipeline needs.
                  <br />
                  <span className="text-muted-foreground">Nothing it doesn&apos;t.</span>
                </h2>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" id="how-it-works">
                {FEATURES.map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                    whileHover={{ y: -4 }}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-[0_18px_40px_-16px_rgba(76,29,149,0.25)] hover:border-primary-200"
                  >
                    <div
                      className={`mb-5 grid h-12 w-12 place-items-center rounded-xl ${f.color} ring-1 ring-black/5`}
                    >
                      <f.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-display text-lg font-semibold tracking-tight">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                    <ArrowRight className="absolute right-5 top-5 h-4 w-4 -translate-x-1 text-muted-foreground/40 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 group-hover:text-primary-600" />
                  </motion.div>
                ))}
              </div>
            </section>

            {/* CTA section */}
            <section className="mx-auto max-w-5xl px-6 pb-24">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-[oklch(0.4_0.2_320)] p-12 text-center text-white shadow-[0_40px_80px_-20px_rgba(46,16,101,0.45)]"
              >
                <div className="grain pointer-events-none absolute inset-0 rounded-3xl" />
                <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -left-20 -bottom-20 h-60 w-60 rounded-full bg-[oklch(0.72_0.17_25)]/30 blur-3xl" />

                <h2 className="relative font-display text-3xl font-semibold tracking-tight md:text-5xl">
                  Stop chasing tasks.
                  <br />
                  Start shipping work.
                </h2>
                <p className="relative mt-4 text-white/75">
                  Spin up your workspace in under 2 minutes. Invite teammates with a single code.
                </p>
                <a
                  href="#auth"
                  className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary-700 shadow-lg transition hover:bg-white/90"
                >
                  Get started free <ArrowRight className="h-4 w-4" />
                </a>
              </motion.div>
            </section>

            <footer className="border-t border-border/60 bg-surface/80 backdrop-blur">
              <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground">
                <span>© {new Date().getFullYear()} 2DS Workflow — Built for sign processing teams</span>
                <span className="flex items-center gap-1.5 font-mono text-[10px]">
                  <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-emerald-500" /> All
                  systems operational
                </span>
              </div>
            </footer>
          </div>
        );
      }

      const FEATURES = [
        {
          icon: Kanban,
          title: "Drag-and-drop Kanban",
          desc: "Move tasks across pipeline stages with smooth, real-time updates.",
          color: "bg-primary-50 text-primary-700",
        },
        {
          icon: BarChart3,
          title: "Throughput analytics",
          desc: "Completion trends, pipeline bars, bottleneck detection in one view.",
          color: "bg-[oklch(0.94_0.06_245)] text-[oklch(0.45_0.18_245)]",
        },
        {
          icon: ShieldCheck,
          title: "Roles & permissions",
          desc: "Owner, Admin, Member roles with row-level Supabase policies.",
          color: "bg-emerald-50 text-emerald-700",
        },
        {
          icon: FileText,
          title: "Rich documents",
          desc: "Write runbooks, SOPs and notes with a full-featured rich-text editor.",
          color: "bg-[oklch(0.95_0.07_25)] text-[oklch(0.52_0.18_25)]",
        },
      ];

      function GoogleIcon() {
        return (
          <svg viewBox="0 0 24 24" className="h-4 w-4">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
            />
          </svg>
        );
      }
