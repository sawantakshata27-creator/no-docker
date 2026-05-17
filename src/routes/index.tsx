import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useState } from "react";
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
  Rocket,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

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
  const [isHoveringCTA, setIsHoveringCTA] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface text-foreground">
      {/* Enhanced Backdrop orbs with parallax */}
      <motion.div 
        className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-primary-300/40 to-primary-600/30 blur-[120px]"
        animate={{
          y: [0, 30, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div 
        className="pointer-events-none absolute top-1/3 -right-32 h-[440px] w-[440px] rounded-full bg-gradient-to-br from-accent2/40 to-primary-200/30 blur-[140px]"
        animate={{
          x: [0, 40, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div 
        className="pointer-events-none absolute bottom-0 left-1/4 h-[380px] w-[380px] rounded-full bg-gradient-to-tr from-primary-200/40 to-transparent blur-[120px]"
        animate={{
          x: [0, -30, 0],
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute h-2 w-2 rounded-full bg-primary-400/30"
          style={{
            left: `${20 + i * 15}%`,
            top: `${30 + i * 10}%`,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
        />
      ))}

      {/* Nav */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <Link to="/" className="flex items-center gap-2.5" data-testid="landing-logo">
            <motion.div 
              className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 font-display text-sm font-semibold text-white shadow-lg shadow-primary-600/30"
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              2D
            </motion.div>
            <span className="font-display text-lg font-semibold tracking-tight">2DS Workflow</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="nav-link text-sm">Features</a>
            <a href="#workflow" className="nav-link text-sm">Workflow</a>
            <a href="#pricing" className="nav-link text-sm">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/login"
              className="btn-primary inline-flex items-center gap-2"
              data-testid="landing-get-started-btn"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-36 pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
            <motion.div 
              initial={{ opacity: 0, y: 24 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div 
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-200/70 bg-primary-50/60 px-3.5 py-1.5 backdrop-blur"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary-700" />
                </motion.div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-700">
                  Kanban-powered workflow system
                </span>
              </motion.div>

              <h1 className="font-display text-[3.25rem] leading-[1.02] tracking-tight md:text-[4.25rem]">
                <motion.span 
                  className="block"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  Document workflow.
                </motion.span>
                <motion.span 
                  className="block italic text-primary-700"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  Chaos eliminated.
                </motion.span>
              </h1>

              <motion.p 
                className="mt-7 max-w-xl text-[1.0625rem] leading-relaxed text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                A powerful workspace for moving documents through creation, QA and delivery. 
                Kanban boards, real-time analytics, and team controls — all in one place.
              </motion.p>

              <motion.div 
                className="mt-10 flex flex-wrap items-center gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.9 }}
              >
                <Link
                  to="/login"
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 px-8 py-4 text-base font-semibold text-white shadow-2xl shadow-primary-600/50 transition-all hover:shadow-primary-600/70 hover:scale-105 active:scale-95"
                  data-testid="hero-get-started-btn"
                  onMouseEnter={() => setIsHoveringCTA(true)}
                  onMouseLeave={() => setIsHoveringCTA(false)}
                >
                  {/* Animated gradient overlay */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-accent2/30 via-primary-500/30 to-accent2/30"
                    animate={{
                      x: isHoveringCTA ? ['-100%', '100%'] : '0%',
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: isHoveringCTA ? Infinity : 0,
                      ease: "linear"
                    }}
                  />
                  
                  {/* Sparkle effect */}
                  <motion.div
                    className="absolute inset-0"
                    animate={{
                      background: isHoveringCTA 
                        ? 'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.2) 0%, transparent 50%)'
                        : 'transparent'
                    }}
                  />
                  
                  <span className="relative z-10 flex items-center gap-2">
                    <Rocket className="h-5 w-5" />
                    Get Started Free
                    <motion.div
                      animate={{ x: isHoveringCTA ? 5 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </motion.div>
                  </span>
                </Link>
                
                <a
                  href="#workflow"
                  className="btn-ghost inline-flex items-center gap-2"
                  data-testid="hero-watch-demo-btn"
                >
                  <PlayCircle className="h-4 w-4 text-primary-700" />
                  Watch a 90-sec tour
                </a>
              </motion.div>

              <motion.div 
                className="mt-12 flex items-center gap-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.1 }}
              >
                <div className="flex -space-x-2.5">
                  {[
                    "from-primary-500 to-primary-700",
                    "from-accent2 to-primary-500",
                    "from-primary-600 to-primary-800",
                    "from-accent2 to-primary-700",
                  ].map((g, i) => (
                    <motion.div 
                      key={i} 
                      className={`h-9 w-9 rounded-full border-2 border-background bg-gradient-to-br ${g}`}
                      initial={{ scale: 0, x: -20 }}
                      animate={{ scale: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 1.2 + i * 0.1 }}
                      whileHover={{ scale: 1.2, zIndex: 10 }}
                    />
                  ))}
                </div>
                <div className="text-sm">
                  <div className="font-semibold">1,200+ teams</div>
                  <div className="text-muted-foreground">shipping with 2DS</div>
                </div>
              </motion.div>
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
                whileHover={{ y: -8, scale: 1.02 }}
                className="group card-surface relative overflow-hidden p-7 cursor-pointer"
              >
                <motion.div 
                  className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br from-primary-200/40 to-transparent blur-2xl transition-opacity group-hover:opacity-100 opacity-40"
                  whileHover={{ scale: 1.3 }}
                />
                <div className="relative">
                  <motion.div 
                    className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-md shadow-primary-600/25"
                    whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <f.icon className="h-5 w-5" />
                  </motion.div>
                  <h3 className="font-display text-xl group-hover:text-primary-700 transition-colors">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </div>
                
                {/* Animated border on hover */}
                <motion.div
                  className="absolute inset-0 rounded-[1.25rem] border-2 border-primary-500/0 group-hover:border-primary-500/20"
                  transition={{ duration: 0.3 }}
                />
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
            {/* Animated background gradient */}
            <div className="pointer-events-none absolute inset-0 opacity-10">
              <motion.div
                className="absolute top-0 right-0 h-64 w-64 rounded-full bg-gradient-to-br from-primary-400 to-accent2 blur-3xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>

            <div className="relative grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="font-display text-3xl md:text-4xl">
                  A workflow that <span className="italic text-primary-700">stays out of the way.</span>
                </h2>
                <p className="mt-4 text-muted-foreground">
                  Six clean stages, optimistic drag-and-drop, deep linking on every card. Your team learns it in five minutes.
                </p>
                <ul className="mt-7 space-y-3 text-sm">
                  {["Create → Preprocess → Associate", "Adjust → QA → Deliver", "Branch and assign without leaving the board"].map((t, i) => (
                    <motion.li 
                      key={t} 
                      className="flex items-center gap-2.5"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1, duration: 0.5 }}
                    >
                      <CheckCircle2 className="h-4 w-4 text-primary-600" />
                      <span>{t}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>

              <div className="relative">
                <div className="flex flex-wrap items-center justify-center gap-2 md:flex-nowrap">
                  {["Create", "Preprocess", "Associate", "Adjust", "QA", "Deliver"].map((stage, i, arr) => (
                    <div key={stage} className="flex items-center gap-2">
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.07 }}
                        whileHover={{ scale: 1.1, y: -5 }}
                        className="rounded-full border border-primary-200 bg-card px-3.5 py-1.5 text-xs font-semibold text-primary-700 shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-primary-400"
                      >
                        {stage}
                      </motion.div>
                      {i < arr.length - 1 && (
                        <motion.span 
                          className="text-muted-foreground/60"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.07 + 0.1 }}
                        >
                          →
                        </motion.span>
                      )}
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
            onMouseMove={handleMouseMove}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 p-14 text-center shadow-2xl shadow-primary-700/30 animate-gradient"
          >
            <div className="pointer-events-none absolute inset-0 opacity-30">
              <motion.div 
                className="absolute top-0 right-1/4 h-72 w-72 rounded-full bg-accent2/30 blur-[100px]"
                animate={{
                  x: [0, 50, 0],
                  y: [0, 30, 0],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <motion.div 
                className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-primary-300/40 blur-[100px]"
                animate={{
                  x: [0, -40, 0],
                  y: [0, -20, 0],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>

            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="mx-auto mb-5 h-12 w-12 text-white/80" />
              </motion.div>
              
              <motion.h2 
                className="font-display text-3xl text-white md:text-5xl"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                Ready to ship faster?
              </motion.h2>
              
              <motion.p 
                className="mt-3 text-primary-50/85"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                Free for small teams. No credit card. Cancel anytime.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                <Link
                  to="/login"
                  className="group mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-semibold text-primary-700 shadow-2xl transition-all hover:-translate-y-1 hover:bg-primary-50 hover:shadow-[0_20px_50px_rgba(255,255,255,0.3)] active:translate-y-0"
                  data-testid="cta-get-started-btn"
                >
                  <Rocket className="h-4 w-4" />
                  Get Started
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </motion.div>
                </Link>
              </motion.div>

              <motion.div 
                className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-primary-50/75"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
              >
                {[
                  { icon: CheckCircle2, text: "14-day trial" },
                  { icon: CheckCircle2, text: "No setup fees" },
                  { icon: CheckCircle2, text: "Cancel anytime" }
                ].map((item, i) => (
                  <motion.span 
                    key={i}
                    className="inline-flex items-center gap-1.5"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.7 + i * 0.1 }}
                  >
                    <item.icon className="h-3.5 w-3.5" /> {item.text}
                  </motion.span>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-border/60 bg-background/60 px-6 py-8 backdrop-blur">
        <motion.div 
          className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 md:flex-row"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-2.5">
            <motion.div 
              className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 font-display text-xs font-semibold text-white"
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6 }}
            >
              2D
            </motion.div>
            <span className="font-display text-sm font-semibold">2DS Workflow</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} 2DS Workflow. Built for teams who ship.</p>
        </motion.div>
      </footer>
    </div>
  );
}
