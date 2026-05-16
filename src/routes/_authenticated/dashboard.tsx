import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { ArrowUpRight, ArrowDownRight, CheckCircle2, Clock, AlertTriangle, Files } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

// Throughput constants (files/hr) — used for pipeline bars
const PROCESSES = [
  { name: "Sign Creation", value: 5.6, color: "#7c3aed" },
  { name: "Pre-processing", value: 15, color: "#3b82f6" },
  { name: "Association", value: 228, color: "#10b981" },
  { name: "Adjustment", value: 13, color: "#f59e0b" },
  { name: "QA", value: 20, color: "#06b6d4" },
  { name: "Delivery", value: 50, color: "#ef4444" },
];

const TREND = Array.from({ length: 14 }, (_, i) => ({
  day: `D${i + 1}`,
  completed: Math.round(20 + Math.sin(i / 2) * 8 + Math.random() * 6),
}));

function Dashboard() {
  const { user, profile, org } = useAuth();
  const { data: tasks } = useQuery({
    queryKey: ["dashboard-tasks", org?.id ?? user?.id],
    enabled: !!user,
    queryFn: async () => {
      const q = org
        ? supabase.from("tasks").select("id, title, priority, completed_at, column_id, created_at, board_columns(name, color), boards!inner(org_id)").eq("boards.org_id", org.id)
        : supabase.from("tasks").select("id, title, priority, completed_at, column_id, created_at, board_columns(name, color), boards!inner(owner_id)").eq("boards.owner_id", user!.id);
      const { data } = await q.order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const total = tasks?.length ?? 0;
  const done = tasks?.filter((t: any) => t.board_columns?.name === "Done").length ?? 0;
  const inProgress = tasks?.filter((t: any) => t.board_columns?.name === "In Progress").length ?? 0;
  const overdue = 0;

  const status = [
    { name: "Done", value: done, color: "#10b981" },
    { name: "In Progress", value: inProgress, color: "#3b82f6" },
    { name: "Backlog", value: Math.max(0, total - done - inProgress), color: "#94a3b8" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {profile?.full_name?.split(" ")[0] ?? "there"}</h1>
        <p className="text-sm text-muted-foreground">Here's what's happening across your pipeline.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi icon={Files} label="Total tasks" value={total} delta="+12%" color="bg-primary-50 text-primary-700" trend="up" />
        <Kpi icon={CheckCircle2} label="Completed" value={done} delta="+8%" color="bg-emerald-50 text-emerald-600" trend="up" />
        <Kpi icon={Clock} label="In progress" value={inProgress} delta="-3%" color="bg-blue-50 text-blue-600" trend="down" />
        <Kpi icon={AlertTriangle} label="Overdue" value={overdue} delta="0%" color="bg-amber-50 text-amber-600" trend="up" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-surface lg:col-span-2 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Completion trend</h3>
              <p className="text-xs text-muted-foreground">Last 14 days</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">+18%</span>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Area type="monotone" dataKey="completed" stroke="#7c3aed" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-surface p-5">
          <h3 className="font-semibold">Status mix</h3>
          <p className="text-xs text-muted-foreground">All boards</p>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={status} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={3}>
                  {status.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 text-xs">
            {status.map((s) => (
              <div key={s.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name}</span>
                <span className="font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-surface p-5 lg:col-span-2">
          <h3 className="font-semibold">Pipeline throughput</h3>
          <p className="text-xs text-muted-foreground">Files / hour by stage</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PROCESSES} layout="vertical" margin={{ left: 24 }}>
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={100} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {PROCESSES.map((p, i) => <Cell key={i} fill={p.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-surface p-5">
          <h3 className="font-semibold">Recent tasks</h3>
          <p className="text-xs text-muted-foreground">Last activity</p>
          <ul className="mt-4 space-y-3">
            {(tasks ?? []).slice(0, 5).map((t: any) => (
              <li key={t.id} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: t.board_columns?.color ?? "#94a3b8" }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.board_columns?.name ?? "—"}</div>
                </div>
                <PriorityChip p={t.priority} />
              </li>
            ))}
            {(!tasks || tasks.length === 0) && (
              <li className="py-6 text-center text-sm text-muted-foreground">No tasks yet — head to the Kanban.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, delta, color, trend }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-surface p-5">
      <div className="flex items-start justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}><Icon className="h-5 w-5" /></div>
        <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${trend === "up" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
          {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {delta}
        </span>
      </div>
      <div className="mt-4 text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </motion.div>
  );
}

function PriorityChip({ p }: { p: string }) {
  const m: Record<string, string> = {
    high: "bg-red-50 text-red-600",
    medium: "bg-amber-50 text-amber-600",
    low: "bg-emerald-50 text-emerald-600",
  };
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${m[p] ?? m.low}`}>{p}</span>;
}
