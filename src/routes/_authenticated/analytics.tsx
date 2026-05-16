import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, Cell, PieChart, Pie } from "recharts";
import { Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/analytics")({ component: Analytics });

type T = { id: string; title: string; priority: string; process_stage: string | null; column_id: string; board_id: string; created_at: string; completed_at: string | null };

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
        ? supabase.from("tasks").select("id,title,priority,process_stage,column_id,board_id,created_at,completed_at, boards!inner(org_id)").eq("boards.org_id", org.id)
        : supabase.from("tasks").select("id,title,priority,process_stage,column_id,board_id,created_at,completed_at, boards!inner(owner_id)").eq("boards.owner_id", user!.id);
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

  const stages = useMemo(() => Array.from(new Set((tasks ?? []).map((t) => t.process_stage).filter(Boolean))), [tasks]) as string[];

  const filtered = useMemo(() => (tasks ?? []).filter((t) =>
    (stage === "all" || t.process_stage === stage) &&
    (priority === "all" || t.priority === priority)
  ), [tasks, stage, priority]);

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
    const palette = ["#7c3aed", "#3b82f6", "#10b981", "#f59e0b", "#06b6d4", "#ef4444"];
    return Array.from(m.entries()).map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }));
  }, [filtered]);

  const byStatus = useMemo(() => {
    const cm: Record<string, { name: string; color: string }> = {};
    (cols ?? []).forEach((c: any) => cm[c.id] = { name: c.name, color: c.color ?? "#94a3b8" });
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
    const header = ["id", "title", "priority", "process_stage", "created_at", "completed_at"];
    const rows = filtered.map((t) => header.map((h) => JSON.stringify((t as any)[h] ?? "")).join(","));
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `tasks-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} tasks`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Drill into throughput and completion across your workspace.</p>
        </div>
        <button onClick={exportCsv} className="btn-primary inline-flex items-center gap-2 text-sm">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="card-surface flex flex-wrap items-center gap-3 p-3 text-xs">
        <label className="flex items-center gap-2">Range
          <select className="input-field py-1.5 text-sm" value={days} onChange={(e) => setDays(+e.target.value)}>
            <option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option><option value={90}>90 days</option>
          </select>
        </label>
        <label className="flex items-center gap-2">Stage
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

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-surface lg:col-span-2 p-5">
          <h3 className="font-semibold">Created vs completed</h3>
          <p className="text-xs text-muted-foreground">Last {days} days</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} /><stop offset="100%" stopColor="#7c3aed" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.35} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Area type="monotone" dataKey="created" stroke="#7c3aed" fill="url(#gC)" strokeWidth={2} />
                <Area type="monotone" dataKey="completed" stroke="#10b981" fill="url(#gD)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card-surface p-5">
          <h3 className="font-semibold">Status mix</h3>
          <div className="mt-4 h-48">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byStatus} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={3}>
                  {byStatus.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 text-xs">
            {byStatus.map((s) => (
              <div key={s.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name}</span>
                <span className="font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card-surface p-5">
        <h3 className="font-semibold">Tasks by process stage</h3>
        <div className="mt-4 h-64">
          <ResponsiveContainer>
            <BarChart data={byStage} layout="vertical" margin={{ left: 24 }}>
              <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={120} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {byStage.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
