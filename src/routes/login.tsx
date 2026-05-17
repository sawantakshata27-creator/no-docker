import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth-store";
import { toast } from "sonner";
import { Mail, Lock, Loader2, Sparkles, ArrowLeft } from "lucide-react";

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
  const [showSuccess, setShowSuccess] = useState(false);

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
        setShowSuccess(true);
        setTimeout(() => {
          toast.success("Account created — welcome!");
        }, 800);
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
    <motion.div
      className="grid min-h-screen md:grid-cols-[1.05fr_1fr]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="sidebar-gradient relative hidden flex-col justify-between overflow-hidden p-12 text-white md:flex"
      >
        <motion.div
          className="orb orb-1 opacity-30"
          style={{ top: "10%", left: "-12%" }}
          animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="orb orb-2 opacity-25"
          style={{ bottom: "-15%", right: "-15%" }}
          animate={{ x: [0, -25, 0], y: [0, 20, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />

        <Link to="/" className="relative z-10 flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15 font-display font-bold backdrop-blur">
            2D
          </div>
          <span className="font-display text-lg font-semibold">2DS Workflow</span>
        </Link>

        <motion.div
          className="relative z-10 max-w-md"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
          }}
        >
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 16 },
              show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
            }}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wider text-white/80 uppercase backdrop-blur"
          >
            <Sparkles className="h-3 w-3" />
            Workflow OS
          </motion.div>
          <motion.h2
            variants={{
              hidden: { opacity: 0, y: 16 },
              show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
            }}
            className="mt-5 font-display text-[44px] leading-[1.05] font-semibold tracking-tight"
          >
            Ship documents
            <br /> at scale.
          </motion.h2>
          <motion.p
            variants={{
              hidden: { opacity: 0, y: 16 },
              show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
            }}
            className="mt-5 max-w-md text-[15px] leading-relaxed text-white/75"
          >
            Track every sign through creation, preprocessing, association, adjustment, QA and
            delivery — without leaving your board.
          </motion.p>

          <motion.ul
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.4 } },
            }}
            className="mt-8 space-y-2.5 text-sm text-white/70"
          >
            {["Drag-and-drop Kanban", "Real-time throughput charts", "Org codes & roles"].map(
              (t) => (
                <motion.li
                  key={t}
                  variants={{
                    hidden: { opacity: 0, x: -10 },
                    show: { opacity: 1, x: 0 },
                  }}
                  className="flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                  {t}
                </motion.li>
              ),
            )}
          </motion.ul>
        </motion.div>

        <motion.div
          className="relative z-10 text-xs text-white/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          © 2DS Workflow
        </motion.div>
      </motion.div>

      <div className="flex items-center justify-center bg-surface p-6">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="card-glass w-full max-w-sm p-8"
        >
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Back to home
          </Link>

          <motion.h1
            key={`title-${mode}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="font-display text-3xl font-semibold tracking-tight"
          >
            {mode === "signup"
              ? "Create your account"
              : mode === "magic"
                ? "Magic link sign-in"
                : mode === "forgot"
                  ? "Reset password"
                  : "Welcome back"}
          </motion.h1>
          <motion.p
            key={`sub-${mode}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="mt-1.5 text-sm text-muted-foreground"
          >
            {mode === "signup"
              ? "Start in under a minute."
              : mode === "magic"
                ? "We'll email you a one-tap sign-in link."
                : mode === "forgot"
                  ? "We'll send a reset link to your email."
                  : "Sign in to your workspace."}
          </motion.p>

          {mode !== "forgot" && mode !== "magic" && (
            <button
              onClick={handleGoogle}
              disabled={loading}
              data-testid="google-login-btn"
              className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:border-primary-300 hover:bg-muted disabled:opacity-50"
            >
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
              Continue with Google
            </button>
          )}

          {mode !== "forgot" && mode !== "magic" && (
            <div className="my-5 flex items-center gap-3 text-[11px] tracking-wider text-muted-foreground/70 uppercase">
              <motion.div layout className="h-px flex-1 bg-border" /> or{" "}
              <motion.div layout className="h-px flex-1 bg-border" />
            </div>
          )}

          <form onSubmit={handleEmail} className="space-y-2.5">
            <AnimatePresence mode="popLayout">
              {mode === "signup" && (
                <motion.input
                  key="fullname"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="input-field"
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  data-testid="login-fullname-input"
                />
              )}
            </AnimatePresence>
            <div className="relative">
              <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="input-field pl-9"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email-input"
              />
            </div>
            {(mode === "signin" || mode === "signup") && (
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="input-field pl-9"
                  type="password"
                  placeholder="Password (min 8 chars)"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="login-password-input"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit-btn"
              className="btn-primary mt-1.5 flex w-full items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signup"
                ? "Create account"
                : mode === "magic"
                  ? "Send magic link"
                  : mode === "forgot"
                    ? "Send reset link"
                    : "Sign in"}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            {mode === "signin" ? (
              <>
                <button onClick={() => setMode("magic")} className="hover:text-primary-700">
                  Use magic link
                </button>
                <button onClick={() => setMode("forgot")} className="hover:text-primary-700">
                  Forgot password?
                </button>
                <button onClick={() => setMode("signup")} className="hover:text-primary-700">
                  Create account
                </button>
              </>
            ) : (
              <button
                onClick={() => setMode("signin")}
                className="inline-flex items-center gap-1 hover:text-primary-700"
              >
                <ArrowLeft className="h-3 w-3" /> Back to sign in
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
