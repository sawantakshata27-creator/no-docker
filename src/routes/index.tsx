import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-store";
import { ArrowRight, Kanban, BarChart3, Sparkles, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  const session = useAuth((s) => s.session);
  return (
    <div className="min-h-screen bg-surface">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-600 text-white font-bold">2D</div>
          <span className="font-semibold">2DS Workflow</span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          {session ? (
            <Link to="/dashboard" className="btn-primary">Open app</Link>
          ) : (
            <>
              <Link to="/login" className="text-muted-foreground hover:text-foreground">Sign in</Link>
              <Link to="/login" search={{ mode: "signup" }} className="btn-primary">Get started</Link>
            </>
          )}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 pt-12 pb-24">
        <section className="text-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
            <Sparkles className="h-3 w-3" /> Built for high-volume document teams
          </span>
          <h1 className="mt-6 text-5xl font-bold tracking-tight md:text-6xl">
            The workflow OS for <span className="text-primary-600">sign processing</span> teams.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Notion's clarity. Jira's structure. Linear's speed. Move your pipeline from creation to delivery without leaving the canvas.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/login" search={{ mode: "signup" }} className="btn-primary inline-flex items-center gap-2">
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/login" className="rounded-xl border border-border bg-card px-4 py-2.5 font-medium hover:bg-muted">Sign in</Link>
          </div>
        </section>

        <section className="mt-20 grid gap-6 md:grid-cols-3">
          {[
            { icon: Kanban, title: "Drag-and-drop Kanban", desc: "Jira-style boards with smooth reordering across stages.", color: "bg-primary-50 text-primary-700" },
            { icon: BarChart3, title: "Throughput analytics", desc: "Pipeline bars, completion trends, and bottleneck detection.", color: "bg-blue-50 text-blue-600" },
            { icon: ShieldCheck, title: "Roles & auth", desc: "Admin / Manager / Member with secure row-level policies.", color: "bg-emerald-50 text-emerald-600" },
          ].map((f) => (
            <div key={f.title} className="card-surface p-6">
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${f.color}`}><f.icon className="h-5 w-5" /></div>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
