import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
  BarChart, Bar, Cell, PieChart, Pie, LineChart, Line,
} from "recharts";
import { Download, TrendingUp, Target, Zap, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/analytics")({ component: Analytics });

type T = {
  id: string; title: string; priority: string; process_stage: string | null;
  column_id: string; board_id: string; created_at: string; completed_at: string | null;
  due_date: string | null; assignee_id: string | null;
};

function Analytics() {
  const { user, org } = useAuth();
  const [days, setDays] = useState(14);
  const [stage, setStage] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");

  const { data: tasks } = useQuery({
    queryKey: ["analytics-tasks", org?.id ?? user?.id],
    enabled: !!user,
    queryFn: async () => {
      const q = org
        ? supabase.from("tasks").select("id,title,priority,process_stage,column_id,board_id,created_at,completed_at,due_date,assignee_id, boards!inner(org_id)").eq("boards.org_id", org.id)
        : supabase.from("tasks").select("id,title,priority,process_stage,column_id,board_id,created_at,completed_at,due_date,assignee_id, boards!inner(owner_id)").eq("boards.owner_id", user!.id);
      const { data } = await q;
      return (data ?? []) as unknown as T[];
    },
  });

  const { data: cols } = useQuery({
    queryKey: ["analytics-cols", org?.id ?? user?.id],
    enabled: !!user,
    queryFn: async () => {
      const q = org
        ? supabase.from("board_columns").select("id,name,color,board_id, boards!inner(org_id)").eq("boards.org_id", org.id)
        : supabase.from("board_columns").select("id,name,color,board_id, boards!inner(owner_id)").eq("boards.owner_id", user!.id);
      const { data } = await q;
      return data ?? [];
    },
  });

  const stages = useMemo(
    () => Array.from(new Set((tasks ?? []).map((t) => t.process_stage).filter(Boolean))) as string[],
    [tasks],
  );

  const filtered = useMemo(
    () => (tasks ?? []).filter(
      (t) => (stage === "all" || t.process_stage === stage) && (priority === "all" || t.priority === priority),
    ),
    [tasks, stage, priority],
  );

  // Completion trend
  const trend = useMemo(() => {
    const arr: { day: string; created: number; completed: number }[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      arr.push({
        day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        created: filtered.filter((t) => t.created_at.slice(0, 10) === key).length,
        completed: filtered.filter((t) => t.completed_at?.slice(0, 10) === key).length,
      });
    }
    return arr;
  }, [filtered, days]);

  const byStage = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((t) => { if (t.process_stage) m.set(t.process_stage, (m.get(t.process_stage) ?? 0) + 1); });
    const palette = ["#0d9488", "#f97316", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
    return Array.from(m.entries()).map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }));
  }, [filtered]);

  const byStatus = useMemo(() => {
    const cm: Record<string, { name: string; color: string }> = {};
    (cols ?? []).forEach((c: any) => (cm[c.id] = { name: c.name, color: c.color ?? "#94a3b8" }));
    const m = new Map<string, { value: number; color: string }>();
    filtered.forEach((t) => {
      const c = cm[t.column_id]; if (!c) return;
      const cur = m.get(c.name) ?? { value: 0, color: c.color };
      cur.value++; m.set(c.name, cur);
    });
    return Array.from(m.entries()).map(([name, v]) => ({ name, value: v.value, color: v.color }));
  }, [filtered, cols]);

  const exportCsv = () => {
    if (!filtered.length) return toast.info("Nothing to export");
    const colNameMap: Record<string, string> = {};
    (cols ?? []).forEach((c: any) => (colNameMap[c.id] = c.name));
    const headers = ["title", "process", "status", "priority", "start_date", "due_date", "assignee_id", "completed_at"];
    const rows = filtered.map((t) => [
      JSON.stringify(t.title ?? ""),
      JSON.stringify(t.process_stage ?? ""),
      JSON.stringify(colNameMap[t.column_id] ?? ""),
      JSON.stringify(t.priority ?? ""),
      JSON.stringify(t.created_at ? t.created_at.slice(0, 10) : ""),
      JSON.stringify(t.due_date ? t.due_date.slice(0, 10) : ""),
      JSON.stringify(t.assignee_id ?? ""),
      JSON.stringify(t.completed_at ? t.completed_at.slice(0, 10) : ""),
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `tasks-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} tasks`);
  };

  // ── Advanced metrics ──────────────────────────────────────────────
  const completionRate = useMemo(() => {
    const done = filtered.filter((t) => t.completed_at).length;
    return filtered.length ? ((done / filtered.length) * 100).toFixed(1) : "0";
  }, [filtered]);

  const avgCompletionTime = useMemo(() => {
    const times = filtered
      .filter((t) => t.completed_at)
      .map((t) => new Date(t.completed_at!).getTime() - new Date(t.created_at).getTime());
    if (!times.length) return "N/A";
    const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
    const d = Math.floor(avgMs / (1000 * 60 * 60 * 24));
    return d > 0 ? `${d}d` : "<1d";
  }, [filtered]);

  const priorityDistribution = useMemo(() => [
    { priority: "High",   value: filtered.filter((t) => t.priority === "high").length,   color: "#ef4444" },
    { priority: "Medium", value: filtered.filter((t) => t.priority === "medium").length, color: "#f59e0b" },
    { priority: "Low",    value: filtered.filter((t) => t.priority === "low").length,    color: "#10b981" },
  ], [filtered]);

  const velocityTrend = useMemo(() => {
    const weeks: { week: string; completed: number }[] = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - i * 7);
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);
      weeks.push({
        week: `W${8 - i}`,
        completed: filtered.filter((t) => {
          if (!t.completed_at) return false;
          const d = new Date(t.completed_at);
          return d >= weekStart && d < weekEnd;
        }).length,
      });
    }
    return weeks;
  }, [filtered]);

  const tealColor = "oklch(0.50 0.13 195)";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Advanced Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Deep-dive into performance metrics, velocity, and productivity.
          </p>
        </div>
        <button onClick={exportCsv} className="btn-primary inline-flex items-center gap-2 text-sm">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Key metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Target,       label: "Completion Rate",     value: `${completionRate}%`, color: "bg-primary-50 text-primary-700" },
          { icon: Zap,          label: "Avg Completion Time", value: avgCompletionTime,    color: "bg-emerald-50 text-emerald-700" },
          { icon: TrendingUp,   label: "Tasks in View",       value: filtered.length,      color: "bg-blue-50 text-blue-700" },
          { icon: AlertCircle,  label: "High Priority",       value: priorityDistribution[0].value, color: "bg-red-50 text-red-700" },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -3 }}
            className="card-surface p-5"
          >
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${kpi.color}`}>
              <kpi.icon className="h-5 w-5" />
            </div>
            <div className="mt-4 font-display text-3xl font-bold tracking-tight">{kpi.value}</div>
            <div className="text-xs text-muted-foreground">{kpi.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="card-surface flex flex-wrap items-center gap-3 p-3 text-xs">
        <label className="flex items-center gap-2">Range
          <select className="input-field py-1.5 text-sm" value={days} onChange={(e) => setDays(+e.target.value)}>
            <option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option><option value={90}>90 days</option>
          </select>
        </label>
        <label className="flex items-center gap-2">Process
          <select className="input-field py-1.5 text-sm" value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="all">All</option>{stages.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2">Priority
          <select className="input-field py-1.5 text-sm" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="all">All</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
        </label>
        <span className="ml-auto text-muted-foreground">{filtered.length} tasks in view</span>
      </div>

      {/* Weekly velocity */}
      <div className="card-surface p-5">
        <h3 className="font-semibold">Weekly Velocity</h3>
        <p className="text-xs text-muted-foreground">Tasks completed per week (last 8 weeks)</p>
        <div className="mt-4 h-56">
          <ResponsiveContainer>
            <LineChart data={velocityTrend}>
              <defs>
                <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d9488" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", fontSize: 12 }} />
              <Line type="monotone" dataKey="completed" stroke="#0d9488" strokeWidth={3} dot={{ fill: "#0d9488", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trend + Priority donut */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-surface lg:col-span-2 p-5">
          <h3 className="font-semibold">Created vs Completed</h3>
          <p className="text-xs text-muted-foreground">Last {days} days</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} /><stop offset="100%" stopColor="#0d9488" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.35} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", fontSize: 12 }} />
                <Area type="monotone" dataKey="created" stroke="#0d9488" fill="url(#gC)" strokeWidth={2} name="Created" />
                <Area type="monotone" dataKey="completed" stroke="#10b981" fill="url(#gD)" strokeWidth={2} name="Completed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card-surface p-5">
          <h3 className="font-semibold">Priority Distribution</h3>
          <p className="text-xs text-muted-foreground">Breakdown by priority</p>
          <div className="mt-4 h-48">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={priorityDistribution} dataKey="value" nameKey="priority" innerRadius={50} outerRadius={75} paddingAngle={3}>
                  {priorityDistribution.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 text-xs">
            {priorityDistribution.map((s) => (
              <div key={s.priority} className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.priority}</span>
                <span className="font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stage bar + Status bar */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-surface p-5">
          <h3 className="font-semibold">Tasks by Process Stage</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <BarChart data={byStage} layout="vertical" margin={{ left: 24 }}>
                <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="var(--color-muted-foreground)" fontSize={11} width={120} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {byStage.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card-surface p-5">
          <h3 className="font-semibold">Status Overview</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <BarChart data={byStatus}>
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} angle={-15} textAnchor="end" height={60} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", fontSize: 12 }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {byStatus.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
