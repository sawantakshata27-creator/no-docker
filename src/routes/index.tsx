import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
  Users,
  Workflow,
  Sparkles,
  Globe,
  TrendingUp,
  PlayCircle,
} from "lucide-react";

export const Route = createFileRoute("/")({ component: LandingPage });

const FEATURES = [
  { icon: Workflow, title: "Kanban that flows", body: "Drag, drop, ship. A fluid pipeline that mirrors how your team actually works." },
  { icon: TrendingUp, title: "Live throughput", body: "Spot bottlenecks instantly with cycle-time, WIP, and velocity charts updated in real time." },
  { icon: Users, title: "Team-first roles", body: "Org codes, granular roles, and approvals that keep everyone in their lane — and in sync." },
  { icon: Shield, title: "Built secure", body: "Row-level security, audit trails, and SSO-ready foundations baked in from day zero." },
  { icon: Zap, title: "Snappy by default", body: "Optimistic updates, edge-cached reads, and zero-flicker theming for an app that just feels fast." },
  { icon: Globe, title: "Anywhere, any device", body: "Beautiful on the laptop, sharp on mobile. One workspace for distributed document teams." },
];

function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-surface text-foreground">
      {/* Backdrop orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-primary-300/40 to-primary-600/30 blur-[120px] animate-pulse-soft" />
      <div className="pointer-events-none absolute top-1/3 -right-32 h-[440px] w-[440px] rounded-full bg-gradient-to-br from-accent2/40 to-primary-200/30 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-[380px] w-[380px] rounded-full bg-gradient-to-tr from-primary-200/40 to-transparent blur-[120px]" />

      {/* Nav */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <Link to="/" className="flex items-center gap-2.5" data-testid="landing-logo">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 font-display text-sm font-semibold text-white shadow-lg shadow-primary-600/30">
              2D
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">2DS Workflow</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="nav-link text-sm">Features</a>
            <a href="#workflow" className="nav-link text-sm">Workflow</a>
            <a href="#pricing" className="nav-link text-sm">Pricing</a>
          </div>

          <Link
            to="/login"
            className="btn-primary inline-flex items-center gap-2"
            data-testid="landing-get-started-btn"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-36 pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-200/70 bg-primary-50/60 px-3.5 py-1.5 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-primary-700" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-700">
                  Workflow OS for document teams
                </span>
              </div>

              <h1 className="font-display text-[3.25rem] leading-[1.02] tracking-tight md:text-[4.25rem]">
                <span className="block">Ship documents.</span>
                <span className="block italic text-primary-700">Skip the chaos.</span>
              </h1>

              <p className="mt-7 max-w-xl text-[1.0625rem] leading-relaxed text-muted-foreground">
                A calm, fast workspace for moving every sign through creation, QA and delivery. Kanban,
                analytics, and team controls — without the tab juggling.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  to="/login"
                  className="btn-primary inline-flex items-center gap-2 text-base"
                  data-testid="hero-get-started-btn"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#workflow"
                  className="btn-ghost inline-flex items-center gap-2"
                  data-testid="hero-watch-demo-btn"
                >
                  <PlayCircle className="h-4 w-4 text-primary-700" />
                  Watch a 90-sec tour
                </a>
              </div>

              <div className="mt-12 flex items-center gap-5">
                <div className="flex -space-x-2.5">
                  {[
                    "from-primary-500 to-primary-700",
                    "from-accent2 to-primary-500",
                    "from-primary-600 to-primary-800",
                    "from-accent2 to-primary-700",
                  ].map((g, i) => (
                    <div key={i} className={`h-9 w-9 rounded-full border-2 border-background bg-gradient-to-br ${g}`} />
                  ))}
                </div>
                <div className="text-sm">
                  <div className="font-semibold">1,200+ teams</div>
                  <div className="text-muted-foreground">shipping with 2DS</div>
                </div>
              </div>
            </motion.div>

            {/* Right Visual */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="relative"
            >
              <div className="card-glass relative overflow-hidden p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Today's board
                  </div>
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-success/80" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { name: "In Progress", color: "bg-primary-500", count: 7, tasks: ["Annotate batch #482", "QA approve sign-pack"] },
                    { name: "In Review", color: "bg-accent2", count: 4, tasks: ["Adjust HR pack 12B", "Map IDs → tags"] },
                    { name: "Done", color: "bg-success", count: 28, tasks: ["Deliver legal pack 9A"] },
                  ].map((col, i) => (
                    <motion.div
                      key={col.name}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 + i * 0.12 }}
                      className="rounded-xl border border-border/60 bg-background/50 p-3 backdrop-blur"
                    >
                      <div className="mb-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[11px] font-semibold">
                          <span className={`h-2 w-2 rounded-full ${col.color}`} />
                          {col.name}
                        </div>
                        <span className="rounded-full bg-card px-1.5 text-[10px] font-medium text-muted-foreground">
                          {col.count}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {col.tasks.map((t) => (
                          <div key={t} className="rounded-lg border border-border bg-card px-2.5 py-2 text-[11px] font-medium leading-snug shadow-sm">
                            {t}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-5 rounded-xl border border-border/60 bg-background/40 p-4 backdrop-blur">
                  <div className="mb-2 flex items-end justify-between">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Throughput</div>
                    <div className="text-xs font-semibold text-primary-700">+23% wk</div>
                  </div>
                  <div className="flex h-12 items-end gap-1.5">
                    {[35, 50, 42, 60, 55, 72, 68, 80, 64, 78, 90, 85].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: h / 100 }}
                        transition={{ delay: 0.6 + i * 0.04, duration: 0.5 }}
                        style={{ transformOrigin: "bottom" }}
                        className="flex-1 rounded-t bg-gradient-to-t from-primary-600 to-accent2"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Built for momentum
            </div>
            <h2 className="font-display text-4xl leading-tight md:text-5xl">
              Everything your team needs, <span className="italic text-primary-700">nothing it doesn't.</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              The essentials done right — without the toolbar bloat.
            </p>
          </motion.div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -4 }}
                className="group card-surface relative overflow-hidden p-7"
              >
                <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br from-primary-200/40 to-transparent blur-2xl transition-opacity group-hover:opacity-100 opacity-40" />
                <div className="relative">
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-md shadow-primary-600/25">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-xl">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow strip */}
      <section id="workflow" className="relative px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="card-glass relative overflow-hidden p-10 md:p-14"
          >
            <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
              <div>
                <h2 className="font-display text-3xl md:text-4xl">A workflow that <span className="italic text-primary-700">stays out of the way.</span></h2>
                <p className="mt-4 text-muted-foreground">
                  Six clean stages, optimistic drag-and-drop, deep linking on every card. Your team learns it in five minutes.
                </p>
                <ul className="mt-7 space-y-3 text-sm">
                  {["Create → Preprocess → Associate", "Adjust → QA → Deliver", "Branch and assign without leaving the board"].map((t) => (
                    <li key={t} className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-primary-600" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative">
                <div className="flex flex-wrap items-center justify-center gap-2 md:flex-nowrap">
                  {["Create", "Preprocess", "Associate", "Adjust", "QA", "Deliver"].map((stage, i, arr) => (
                    <div key={stage} className="flex items-center gap-2">
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.07 }}
                        className="rounded-full border border-primary-200 bg-card px-3.5 py-1.5 text-xs font-semibold text-primary-700 shadow-sm"
                      >
                        {stage}
                      </motion.div>
                      {i < arr.length - 1 && <span className="text-muted-foreground/60">→</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="relative px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 p-14 text-center shadow-2xl shadow-primary-700/30 animate-gradient"
          >
            <div className="pointer-events-none absolute inset-0 opacity-30">
              <div className="absolute top-0 right-1/4 h-72 w-72 rounded-full bg-accent2/30 blur-[100px]" />
              <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-primary-300/40 blur-[100px]" />
            </div>

            <div className="relative">
              <Sparkles className="mx-auto mb-5 h-12 w-12 text-white/80" />
              <h2 className="font-display text-3xl text-white md:text-5xl">Ready to ship faster?</h2>
              <p className="mt-3 text-primary-50/85">Free for small teams. No credit card. Cancel anytime.</p>

              <Link
                to="/login"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-semibold text-primary-700 shadow-2xl transition hover:-translate-y-0.5 hover:bg-primary-50"
                data-testid="cta-get-started-btn"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-primary-50/75">
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> 14-day trial</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> No setup fees</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Cancel anytime</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-border/60 bg-background/60 px-6 py-8 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 md:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 font-display text-xs font-semibold text-white">2D</div>
            <span className="font-display text-sm font-semibold">2DS Workflow</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} 2DS Workflow. Built for teams who ship.</p>
        </div>
      </footer>
    </div>
  );
}
