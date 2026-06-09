import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, ReferenceLine,
} from "recharts";
import {
  ArrowUpRight, ArrowDownRight, CheckCircle2, Clock, AlertTriangle,
  Files, Copy, Check, UserPlus, Download, Target, GitPullRequest,
  XCircle, Users,
} from "lucide-react";
import { motion, useSpring, useTransform } from "framer-motion";
import { useState, useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { DEFAULT_PROCESS_STAGES, PROCESS_PRODUCTIVITY_TARGETS } from "@/lib/task-model";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

// ── Types ─────────────────────────────────────────────────────────────────────

type T = {
  id: string; title: string; priority: string; process_stage: string | null;
  column_id: string; board_id: string; created_at: string; completed_at: string | null;
  due_date: string | null; assignee_ids: string[] | null;
  board_columns?: { name: string; color: string } | null;
};

type MemberProfile = { user_id: string; full_name: string | null };

const REGIONS = ["EMEA", "APAC", "AMER"] as const;
type Region = (typeof REGIONS)[number];


// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard() {
  const { user, profile, org, membership } = useAuth();
  const qc = useQueryClient();
  const [codeCopied, setCodeCopied] = useState(false);
  const [days, setDays] = useState(14);
  const [stage, setStage] = useState("all");
  const [priority, setPriority] = useState("all");

  // Realtime — two channels for reliability:
  // 1. postgres_changes on scheduled_delivery (no filter, works without RLS realtime)
  // 2. broadcast channel that the schedule save page fires after upsert
  const orgIdRef = useRef(org?.id);
  orgIdRef.current = org?.id;
  useEffect(() => {
    if (!org?.id) return;
    const invalidate = () =>
      qc.invalidateQueries({ queryKey: ["scheduled-delivery", orgIdRef.current] });

    const pgChannel = supabase
      .channel(`dashboard-schedule-pg-${org.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "scheduled_delivery" }, invalidate)
      .subscribe();

    const bcChannel = supabase
      .channel(`schedule-saved-${org.id}`)
      .on("broadcast", { event: "saved" }, invalidate)
      .subscribe();

    return () => {
      supabase.removeChannel(pgChannel);
      supabase.removeChannel(bcChannel);
    };
  }, [org?.id, qc]);

  const { data: scheduleRows_raw } = useQuery({
    queryKey: ["scheduled-delivery", org?.id],
    enabled: !!org,
    staleTime: 0,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("scheduled_delivery")
        .select("process,region,planned_volume,actual_volume")
        .eq("org_id", org!.id);
      if (error) throw error;
      return (Array.isArray(data) ? data : []) as { process: string; region: string; planned_volume: string | null; actual_volume: string | null }[];
    },
  });

  // ── Tasks query ──────────────────────────────────────────────────────────────
  const { data: tasks } = useQuery({
    queryKey: ["dashboard-tasks", org?.id ?? user?.id],
    enabled: !!user,
    queryFn: async () => {
      const q = org
        ? supabase.from("tasks")
            .select("id,title,priority,process_stage,column_id,board_id,created_at,completed_at,due_date,assignee_ids,board_columns(name,color),boards!inner(org_id)")
            .eq("boards.org_id", org.id)
        : supabase.from("tasks")
            .select("id,title,priority,process_stage,column_id,board_id,created_at,completed_at,due_date,assignee_ids,board_columns(name,color),boards!inner(owner_id)")
            .eq("boards.owner_id", user!.id);
      const { data } = await q.order("created_at", { ascending: false });
      return (data ?? []) as unknown as T[];
    },
  });

  // ── Board columns query ──────────────────────────────────────────────────────
  const { data: cols } = useQuery({
    queryKey: ["dashboard-cols", org?.id ?? user?.id],
    enabled: !!user,
    queryFn: async () => {
      const q = org
        ? supabase.from("board_columns").select("id,name,color,board_id,boards!inner(org_id)").eq("boards.org_id", org.id)
        : supabase.from("board_columns").select("id,name,color,board_id,boards!inner(owner_id)").eq("boards.owner_id", user!.id);
      const { data } = await q;
      return data ?? [];
    },
  });

  // ── Members query (for assignee breakdown) ───────────────────────────────────
  const { data: members } = useQuery({
    queryKey: ["dashboard-members", org?.id ?? user?.id],
    enabled: !!user,
    queryFn: async () => {
      let memberIds: string[] = [];
      if (org) {
        const { data } = await supabase
          .from("organization_members").select("user_id").eq("org_id", org.id).eq("status", "active");
        memberIds = (data ?? []).map((m: any) => m.user_id);
      } else {
        memberIds = [user!.id];
      }
      if (!memberIds.length) return [] as MemberProfile[];
      const { data: profiles } = await supabase.from("profiles").select("id,full_name").in("id", memberIds);
      return (profiles ?? []).map((p: any) => ({ user_id: p.id, full_name: p.full_name ?? null })) as MemberProfile[];
    },
  });

  // ── Pending join requests ────────────────────────────────────────────────────
  const { data: pendingCount } = useQuery({
    queryKey: ["pending-count", org?.id],
    enabled: !!org && (membership?.role === "owner" || membership?.role === "admin"),
    queryFn: async () => {
      const { count } = await supabase
        .from("organization_members").select("id", { count: "exact", head: true })
        .eq("org_id", org!.id).eq("status", "pending");
      return count ?? 0;
    },
  });

  // ── Column name lookup ───────────────────────────────────────────────────────
  const colMap = useMemo(() => {
    const m: Record<string, { name: string; color: string }> = {};
    (cols ?? []).forEach((c: any) => (m[c.id] = { name: c.name, color: c.color ?? "#94a3b8" }));
    return m;
  }, [cols]);

  // ── KPI counts (live from Kanban columns) ────────────────────────────────────
  const colName = (t: T) => colMap[t.column_id]?.name ?? "";
  const total      = tasks?.length ?? 0;
  const done       = tasks?.filter((t) => colName(t) === "Done").length ?? 0;
  const inProgress = tasks?.filter((t) => colName(t) === "In Progress").length ?? 0;
  const inReview   = tasks?.filter((t) => colName(t) === "On Hold").length ?? 0;
  const inError    = tasks?.filter((t) => colName(t) === "Error").length ?? 0;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdue = tasks?.filter((t) =>
    t.due_date && new Date(t.due_date) < today && colName(t) !== "Done"
  ).length ?? 0;

  // ── Filters ──────────────────────────────────────────────────────────────────
  const stages = useMemo(
    () => Array.from(new Set((tasks ?? []).map((t) => t.process_stage).filter(Boolean))) as string[],
    [tasks],
  );
  const filtered = useMemo(
    () => (tasks ?? []).filter(
      (t) => (stage === "all" || t.process_stage === stage) &&
             (priority === "all" || t.priority === priority),
    ),
    [tasks, stage, priority],
  );

  // ── Completion trend ─────────────────────────────────────────────────────────
  const completionTrend = useMemo(() => {
    const now = new Date();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().slice(0, 10);
      return {
        day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        created: filtered.filter((t) => t.created_at?.slice(0, 10) === key).length,
        completed: filtered.filter((t) => t.completed_at?.slice(0, 10) === key).length,
      };
    });
  }, [filtered, days]);

  // ── Priority distribution ────────────────────────────────────────────────────
  const priorityDist = useMemo(() => [
    { priority: "High",   value: filtered.filter((t) => t.priority === "high").length,   color: "#ef4444" },
    { priority: "Medium", value: filtered.filter((t) => t.priority === "medium").length, color: "#f59e0b" },
    { priority: "Low",    value: filtered.filter((t) => t.priority === "low").length,    color: "#10b981" },
  ], [filtered]);

  // ── By process stage ─────────────────────────────────────────────────────────
  const byStage = useMemo(() => {
    const palette = ["#0d9488", "#f97316", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
    const m = new Map<string, number>();
    filtered.forEach((t) => { if (t.process_stage) m.set(t.process_stage, (m.get(t.process_stage) ?? 0) + 1); });
    return Array.from(m.entries()).map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }));
  }, [filtered]);

  // ── By Kanban status ─────────────────────────────────────────────────────────
  const byStatus = useMemo(() => {
    const m = new Map<string, { value: number; color: string }>();
    filtered.forEach((t) => {
      const c = colMap[t.column_id]; if (!c) return;
      const cur = m.get(c.name) ?? { value: 0, color: c.color };
      cur.value++; m.set(c.name, cur);
    });
    return Array.from(m.entries()).map(([name, v]) => ({ name, value: v.value, color: v.color }));
  }, [filtered, colMap]);

  // ── Assignee task breakdown ──────────────────────────────────────────────────
  const assigneeRows = useMemo(() => {
    if (!members?.length) return [];
    return members.map((m) => {
      const mine = (tasks ?? []).filter((t) => (t.assignee_ids ?? []).includes(m.user_id));
      return {
        user_id: m.user_id,
        name: m.full_name ?? `User …${m.user_id.slice(-6)}`,
        total:      mine.length,
        done:       mine.filter((t) => colName(t) === "Done").length,
        inProgress: mine.filter((t) => colName(t) === "In Progress").length,
        inReview:   mine.filter((t) => colName(t) === "On Hold").length,
        inError:    mine.filter((t) => colName(t) === "Error").length,
        overdue:    mine.filter((t) => t.due_date && new Date(t.due_date) < today && colName(t) !== "Done").length,
      };
    }).sort((a, b) => b.total - a.total);
  }, [members, tasks, colMap]);

  // ── Planned vs Actual from Supabase scheduled_delivery ──────────────────────
  const scheduleRows = useMemo(() => {
    const raw = Array.isArray(scheduleRows_raw) ? scheduleRows_raw : [];
    const toNum = (v: string | null) => { const n = parseFloat(v ?? ""); return isNaN(n) ? 0 : n; };
    const rows: PvaRow[] = [];
    for (const proc of DEFAULT_PROCESS_STAGES) {
      for (const region of REGIONS) {
        const dbRow = raw.find((r: any) => r.process === proc && r.region === region);
        const planned = toNum(dbRow?.planned_volume ?? null);
        const actual  = toNum(dbRow?.actual_volume  ?? null);
        const tasksDone = (tasks ?? []).filter(
          (t) => t.process_stage === proc && (t as any).region === region && colName(t) === "Done"
        ).length;
        const pct = planned > 0 ? Math.round((actual / planned) * 100) : null;
        rows.push({ proc, region, planned, actual, tasksDone, pct });
      }
    }
    return rows;
  }, [scheduleRows_raw, tasks, colMap]);

  // ── CSV export ───────────────────────────────────────────────────────────────
  const exportCsv = () => {
    if (!filtered.length) return toast.info("Nothing to export");
    const headers = ["title", "process", "priority", "status", "created_at", "due_date", "completed_at"];
    const rows = filtered.map((t) => [
      JSON.stringify(t.title ?? ""),
      JSON.stringify(t.process_stage ?? ""),
      JSON.stringify(t.priority ?? ""),
      JSON.stringify(colName(t)),
      JSON.stringify(t.created_at?.slice(0, 10) ?? ""),
      JSON.stringify(t.due_date?.slice(0, 10) ?? ""),
      JSON.stringify(t.completed_at?.slice(0, 10) ?? ""),
    ].join(","));
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `tasks-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} tasks`);
  };

  const copyOrgCode = async () => {
    if (!org) return;
    await navigator.clipboard.writeText(org.code);
    setCodeCopied(true); toast.success("Org ID copied");
    setTimeout(() => setCodeCopied(false), 1500);
  };

  const isAdmin = membership?.role === "owner" || membership?.role === "admin";
  const page = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.03 } } };
  const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] } } };

  return (
    <motion.div className="space-y-6" variants={page} initial="hidden" animate="show">

      {/* Top bar */}
      <motion.div variants={item} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Live sync with Kanban and Scheduled Delivery.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="btn-primary inline-flex items-center gap-2 text-sm">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </motion.div>

      {/* Pending requests banner */}
      {isAdmin && (pendingCount ?? 0) > 0 && (
        <Link to="/team" className="flex items-center gap-3 rounded-xl border border-border bg-muted px-5 py-3.5 transition hover:bg-muted/70">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted-foreground/10">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 text-sm">
            <span className="font-semibold text-foreground">{pendingCount} pending join request{pendingCount !== 1 ? "s" : ""}</span>
            <span className="ml-1 text-muted-foreground">— click to review on the Team page</span>
          </div>
        </Link>
      )}

      {/* KPI row — live Kanban column counts */}
      <motion.div variants={item} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi icon={Files}         label="Total Tasks"  value={total}      color="bg-primary-50 text-primary-700"  delay={0}    />
        <Kpi icon={CheckCircle2}  label="Done"         value={done}       color="bg-emerald-50 text-emerald-600"  delay={0.05} trend="up" />
        <Kpi icon={Clock}         label="In Progress"  value={inProgress} color="bg-blue-50 text-blue-600"        delay={0.10} />
        <Kpi icon={GitPullRequest}label="On Hold"      value={inReview}   color="bg-amber-50 text-amber-600"      delay={0.15} />
        <Kpi icon={XCircle}       label="Error"        value={inError}    color="bg-red-50 text-red-600"          delay={0.20} trend={inError > 0 ? "down" : "up"} />
      </motion.div>

      {/* Filters */}
      <motion.div variants={item} className="card-surface flex flex-wrap items-center gap-3 p-3 text-xs">
        <label className="flex items-center gap-2">Range
          <select className="input-field py-1.5 text-sm" value={days} onChange={(e) => setDays(+e.target.value)}>
            <option value={7}>7 days</option><option value={14}>14 days</option>
            <option value={30}>30 days</option><option value={90}>90 days</option>
          </select>
        </label>
        <label className="flex items-center gap-2">Process
          <select className="input-field py-1.5 text-sm" value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="all">All</option>
            {stages.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2">Priority
          <select className="input-field py-1.5 text-sm" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="all">All</option>
            <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
        </label>
        <span className="ml-auto text-muted-foreground">{filtered.length} tasks in view</span>
      </motion.div>

      {/* Planned vs Actual Scope (from Schedule Delivery) */}
      <motion.div variants={item}>
        <PlannedVsActualScope rows={scheduleRows} />
      </motion.div>

      {/* Stage bar + Priority donut */}
      <motion.div variants={item} className="grid gap-4 lg:grid-cols-3">
        <div className="card-surface lg:col-span-2 p-5">
          <h3 className="font-semibold">Tasks by Process Stage</h3>
          <p className="text-xs text-muted-foreground">Task count per stage</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStage} layout="vertical" margin={{ left: 24 }}>
                <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="var(--color-muted-foreground)" fontSize={11} width={120} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)", color: "var(--color-foreground)", fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {byStage.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card-surface p-5">
          <h3 className="font-semibold">Priority Distribution</h3>
          <p className="text-xs text-muted-foreground">Breakdown by priority</p>
          <div className="mt-4 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={priorityDist} dataKey="value" nameKey="priority" innerRadius={46} outerRadius={70} paddingAngle={3}>
                  {priorityDist.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-card)", color: "var(--color-foreground)", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 text-xs">
            {priorityDist.map((s) => (
              <div key={s.priority} className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.priority}</span>
                <span className="font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* User-level assignee breakdown */}
      <motion.div variants={item}>
        <AssigneeBreakdown rows={assigneeRows} />
      </motion.div>

      {/* Status overview + Recent tasks */}
      <motion.div variants={item} className="grid gap-4 lg:grid-cols-2">
        <div className="card-surface p-5">
          <h3 className="font-semibold">Status Overview</h3>
          <p className="text-xs text-muted-foreground">Tasks per Kanban column</p>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStatus}>
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} angle={-15} textAnchor="end" height={50} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", fontSize: 12 }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {byStatus.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-surface p-5">
          <h3 className="font-semibold">Recent Tasks</h3>
          <p className="text-xs text-muted-foreground">Latest activity</p>
          <ul className="mt-4 space-y-3">
            {(tasks ?? []).slice(0, 6).map((t) => (
              <li key={t.id} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: colMap[t.column_id]?.color ?? "#94a3b8" }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{colMap[t.column_id]?.name ?? "—"}</div>
                </div>
                <PriorityChip p={t.priority} />
              </li>
            ))}
            {(!tasks || tasks.length === 0) && (
              <li className="py-6 text-center text-sm text-muted-foreground">No tasks yet — head to the Kanban board.</li>
            )}
          </ul>
        </div>
      </motion.div>

    </motion.div>
  );
}

// ── Planned vs Actual Scope (from Schedule Delivery) ─────────────────────────

type PvaRow = { proc: string; region: string; planned: number; actual: number; tasksDone: number; pct: number | null };

const REGION_DOT: Record<string, string> = {
  EMEA: "bg-blue-400", APAC: "bg-emerald-400", AMER: "bg-violet-400",
};

function PlannedVsActualScope({ rows }: { rows: PvaRow[] }) {
  const hasData = rows.some((r) => r.planned > 0 || r.actual > 0);

  return (
    <div className="card-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-50 text-primary-700">
          <Target className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Planned vs Actual Scope</h3>
          <p className="text-xs text-muted-foreground">From Scheduled Delivery · by process &amp; region</p>
        </div>
      </div>

      {!hasData ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No data — set planned volumes in <Link to="/schedule" className="text-primary-600 underline underline-offset-2">Scheduled Delivery</Link>.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DEFAULT_PROCESS_STAGES.map((proc) => {
            const procRows = rows.filter((r) => r.proc === proc);
            return (
              <div key={proc} className="rounded-lg border border-border bg-muted/30 overflow-hidden">
                {/* Process label */}
                <div className="px-3 py-1.5 bg-muted/60 border-b border-border">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground">{proc}</span>
                </div>
                {/* Region rows */}
                <div className="divide-y divide-border">
                  {procRows.map((r) => {
                    const pct = r.planned > 0 ? Math.round((r.actual / r.planned) * 100) : null;
                    return (
                      <div key={r.region} className="px-3 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${REGION_DOT[r.region] ?? "bg-gray-400"}`} />
                            <span className="text-[11px] font-medium text-muted-foreground">{r.region}</span>
                          </div>
                          {pct !== null && <span className="text-[11px] font-semibold text-primary-600">{pct}%</span>}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold tabular-nums">{r.actual > 0 ? r.actual : "—"}</span>
                          {r.planned > 0 && <span className="text-[11px] text-muted-foreground">/ {r.planned}</span>}
                        </div>
                        {r.planned > 0 && (
                          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-border">
                            <div className="h-full rounded-full bg-primary-500 transition-all duration-500"
                              style={{ width: `${Math.min(pct ?? 0, 100)}%` }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Assignee / User-level breakdown ──────────────────────────────────────────

type AssigneeRow = {
  user_id: string; name: string; total: number;
  done: number; inProgress: number; inReview: number; inError: number; overdue: number;
};

function AssigneeBreakdown({ rows }: { rows: AssigneeRow[] }) {
  if (!rows.length) return null;

  return (
    <div className="card-surface p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-50 text-primary-700">
          <Users className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-semibold">Team Task Allocation</h3>
          <p className="text-xs text-muted-foreground">Per-user breakdown from Kanban assignees</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="pb-2 pr-4">Member</th>
              <th className="pb-2 pr-4 text-center">Total</th>
              <th className="pb-2 pr-4 text-center text-emerald-600">Done</th>
              <th className="pb-2 pr-4 text-center text-blue-600">In Progress</th>
              <th className="pb-2 pr-4 text-center text-amber-600">On Hold</th>
              <th className="pb-2 pr-4 text-center text-red-600">Error</th>
              <th className="pb-2 text-center text-red-500">Overdue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => {
              const pctDone = r.total > 0 ? Math.round((r.done / r.total) * 100) : 0;
              const initials = r.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
              return (
                <tr key={r.user_id} className="group">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                        {initials}
                      </div>
                      <div>
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{pctDone}% complete</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-center font-semibold tabular-nums">{r.total}</td>
                  <td className="py-3 pr-4 text-center">
                    <span className="inline-block min-w-[1.5rem] rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 tabular-nums">{r.done}</span>
                  </td>
                  <td className="py-3 pr-4 text-center">
                    <span className="inline-block min-w-[1.5rem] rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-700 tabular-nums">{r.inProgress}</span>
                  </td>
                  <td className="py-3 pr-4 text-center">
                    <span className="inline-block min-w-[1.5rem] rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700 tabular-nums">{r.inReview}</span>
                  </td>
                  <td className="py-3 pr-4 text-center">
                    <span className={`inline-block min-w-[1.5rem] rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ${r.inError > 0 ? "bg-red-50 text-red-700" : "text-muted-foreground"}`}>{r.inError}</span>
                  </td>
                  <td className="py-3 text-center">
                    <span className={`inline-block min-w-[1.5rem] rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ${r.overdue > 0 ? "bg-red-100 text-red-700" : "text-muted-foreground"}`}>{r.overdue}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── KPI card ─────────────────────────────────────────────────────────────────

function Kpi({ icon: Icon, label, value, color, delay, trend }: {
  icon: any; label: string; value: number; color: string; delay: number; trend?: "up" | "down";
}) {
  const spring = useSpring(0, { stiffness: 90, damping: 22 });
  const display = useTransform(spring, (v) => Math.round(v));
  useEffect(() => { spring.set(value); }, [spring, value]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }} whileHover={{ y: -4 }}
      className="card-surface p-5 transition-shadow hover:shadow-[0_18px_40px_-16px_rgba(76,29,149,0.22)]">
      <div className="flex items-start justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}><Icon className="h-5 w-5" /></div>
        {trend && (
          <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${trend === "up" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
            {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          </span>
        )}
      </div>
      <motion.div className="mt-4 font-display text-2xl font-bold tabular-nums">{display}</motion.div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </motion.div>
  );
}

function PriorityChip({ p }: { p: string }) {
  const m: Record<string, string> = { high: "bg-red-50 text-red-600", medium: "bg-amber-50 text-amber-600", low: "bg-emerald-50 text-emerald-600" };
  return <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${m[p] ?? m.low}`}>{p}</span>;
}
