import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Files,
  Copy,
  Check,
  UserPlus,
} from "lucide-react";
import { motion, useSpring, useTransform } from "framer-motion";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

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
  const { user, profile, org, membership } = useAuth();
  const [codeCopied, setCodeCopied] = useState(false);

  const { data: tasks } = useQuery({
    queryKey: ["dashboard-tasks", org?.id ?? user?.id],
    enabled: !!user,
    queryFn: async () => {
      const q = org
        ? supabase
            .from("tasks")
            .select(
              "id, title, priority, completed_at, column_id, created_at, board_columns(name, color), boards!inner(org_id)",
            )
            .eq("boards.org_id", org.id)
        : supabase
            .from("tasks")
            .select(
              "id, title, priority, completed_at, column_id, created_at, board_columns(name, color), boards!inner(owner_id)",
            )
            .eq("boards.owner_id", user!.id);
      const { data } = await q.order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: pendingCount } = useQuery({
    queryKey: ["pending-count", org?.id],
    enabled: !!org && (membership?.role === "owner" || membership?.role === "admin"),
    queryFn: async () => {
      const { count } = await supabase
        .from("organization_members")
        .select("id", { count: "exact", head: true })
        .eq("org_id", org!.id)
        .eq("status", "pending");
      return count ?? 0;
    },
  });

  const total = tasks?.length ?? 0;
  const done = tasks?.filter((t: any) => t.board_columns?.name === "Done").length ?? 0;
  const inProgress = tasks?.filter((t: any) => t.board_columns?.name === "In Progress").length ?? 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdue = tasks?.filter((t: any) =>
    t.due_date &&
    new Date(t.due_date) < today &&
    t.board_columns?.name !== "Done"
  ).length ?? 0;

  const status = [
    { name: "Done", value: done, color: "#10b981" },
    { name: "In Progress", value: inProgress, color: "#3b82f6" },
    { name: "Backlog", value: Math.max(0, total - done - inProgress), color: "#94a3b8" },
  ];

  const copyOrgCode = async () => {
    if (!org) return;
    await navigator.clipboard.writeText(org.code);
    setCodeCopied(true);
    toast.success("Org ID copied");
    setTimeout(() => setCodeCopied(false), 1500);
  };

  const isAdmin = membership?.role === "owner" || membership?.role === "admin";

  const page = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
  };
  const sectionItem = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <motion.div className="space-y-6" variants={page} initial="hidden" animate="show">
      <motion.div
        variants={sectionItem}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <motion.div variants={sectionItem}>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Welcome back, {profile?.full_name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Here's what's happening across {org?.name ?? "your workspace"}.
          </p>
        </motion.div>
        {org && (
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={copyOrgCode}
            className="flex items-center gap-2.5 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 transition hover:bg-primary-100 hover:shadow-[0_8px_24px_-12px_rgba(124,58,237,0.35)]"
          >
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-primary-600">Org ID</div>
              <div className="font-mono text-sm font-bold text-primary-700">{org.code}</div>
            </div>
            {codeCopied ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4 text-primary-500" />
            )}
          </motion.button>
        )}
      </motion.div>

      {/* Admin: pending join requests banner */}
      {isAdmin && (pendingCount ?? 0) > 0 && (
        <Link
          to="/team"
          className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5 transition hover:bg-amber-100"
        >
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100">
            <UserPlus className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1 text-sm">
            <span className="font-semibold text-amber-800">{pendingCount} pending join request{pendingCount !== 1 ? "s" : ""}</span>
            <span className="ml-1 text-amber-700">— click to review on the Team page</span>
          </div>
        </Link>
      )}

      <motion.div variants={sectionItem} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Files, label: "Total tasks", value: total, delta: "+12%", color: "bg-primary-50 text-primary-700", trend: "up" as const },
          { icon: CheckCircle2, label: "Completed", value: done, delta: "+8%", color: "bg-emerald-50 text-emerald-600", trend: "up" as const },
          { icon: Clock, label: "In progress", value: inProgress, delta: "-3%", color: "bg-blue-50 text-blue-600", trend: "down" as const },
          { icon: AlertTriangle, label: "Overdue", value: overdue, delta: overdue > 0 ? `${overdue} tasks` : "Clear", color: "bg-amber-50 text-amber-600", trend: overdue > 0 ? "down" as const : "up" as const },
        ].map((kpi, i) => (
          <Kpi key={i} {...kpi} delay={i * 0.05} />
        ))}
      </motion.div>

      <motion.div variants={sectionItem} className="grid gap-4 lg:grid-cols-3">
        <motion.div
          variants={sectionItem}
          whileHover={{ y: -2 }}
          className="card-surface lg:col-span-2 p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold">Completion trend</h3>
              <p className="text-xs text-muted-foreground">Last 14 days</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
              +18%
            </span>
          </div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  fill="url(#g1)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <div className="card-surface p-5">
          <h3 className="font-semibold">Status mix</h3>
          <p className="text-xs text-muted-foreground">All boards</p>
          <div className="mt-4 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={status}
                  dataKey="value"
                  innerRadius={46}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {status.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 text-xs">
            {status.map((s) => (
              <div key={s.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="font-semibold">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-surface p-5 lg:col-span-2">
          <h3 className="font-semibold">Pipeline throughput</h3>
          <p className="text-xs text-muted-foreground">Files / hour by stage</p>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PROCESSES} layout="vertical" margin={{ left: 24 }}>
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#94a3b8"
                  fontSize={11}
                  width={100}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {PROCESSES.map((p, i) => (
                    <Cell key={i} fill={p.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-surface p-5">
          <h3 className="font-semibold">Recent tasks</h3>
          <p className="text-xs text-muted-foreground">Latest activity</p>
          <ul className="mt-4 space-y-3">
            {(tasks ?? []).slice(0, 5).map((t: any) => (
              <li key={t.id} className="flex items-start gap-3">
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: t.board_columns?.color ?? "#94a3b8" }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.board_columns?.name ?? "—"}</div>
                </div>
                <PriorityChip p={t.priority} />
              </li>
            ))}
            {(!tasks || tasks.length === 0) && (
              <li className="py-6 text-center text-sm text-muted-foreground">
                No tasks yet — head to the Kanban board.
              </li>
            )}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

function Kpi({ icon: Icon, label, value, delta, color, trend, delay }: any) {
  const spring = useSpring(0, { stiffness: 90, damping: 22 });
  const display = useTransform(spring, (v) => Math.round(v));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className="card-surface p-5 transition-shadow hover:shadow-[0_18px_40px_-16px_rgba(76,29,149,0.22)]"
    >
      <div className="flex items-start justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span
          className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${
            trend === "up" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
          }`}
        >
          {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {delta}
        </span>
      </div>
      <motion.div className="mt-4 font-display text-2xl font-bold">{display}</motion.div>
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
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${m[p] ?? m.low}`}>
      {p}
    </span>
  );
}
