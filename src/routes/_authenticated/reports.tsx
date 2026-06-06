import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { Download, FileSpreadsheet, Printer, TrendingUp, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({ component: ReportsPage });

type RangeType = "week" | "month" | "custom";

function ReportsPage() {
  const { user, org } = useAuth();
  const [range, setRange] = useState<RangeType>("week");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [boardFilter, setBoardFilter] = useState<string>("all");

  const { start, end } = useMemo(() => {
    const now = new Date();
    if (range === "week") {
      const s = new Date(now); s.setDate(now.getDate() - 7); s.setHours(0,0,0,0);
      return { start: s.toISOString(), end: now.toISOString() };
    }
    if (range === "month") {
      const s = new Date(now); s.setDate(now.getDate() - 30); s.setHours(0,0,0,0);
      return { start: s.toISOString(), end: now.toISOString() };
    }
    return { start: customStart ? new Date(customStart).toISOString() : "", end: customEnd ? new Date(customEnd+"T23:59:59").toISOString() : "" };
  }, [range, customStart, customEnd]);

  const { data: boards } = useQuery({
    queryKey: ["report-boards", org?.id ?? user?.id],
    enabled: !!user,
    queryFn: async () => {
      const q = org
        ? supabase.from("boards").select("id, name").eq("org_id", org.id)
        : supabase.from("boards").select("id, name").eq("owner_id", user!.id);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["report-tasks", org?.id ?? user?.id, boardFilter, start, end],
    enabled: !!user && !!start && !!end,
    queryFn: async () => {
      let q = org
        ? supabase.from("tasks").select("id,title,priority,process_stage,column_id,board_id,created_at,completed_at,due_date, board_columns!inner(name), boards!inner(name,org_id)").eq("boards.org_id", org.id)
        : supabase.from("tasks").select("id,title,priority,process_stage,column_id,board_id,created_at,completed_at,due_date, board_columns!inner(name), boards!inner(name,owner_id)").eq("boards.owner_id", user!.id);
      q = q.gte("created_at", start).lte("created_at", end);
      if (boardFilter !== "all") q = (q as any).eq("board_id", boardFilter);
      const { data } = await q;
      return (data ?? []) as any[];
    },
  });

  const summary = useMemo(() => {
    if (!tasks) return null;
    const total = tasks.length;
    const completed = tasks.filter((t: any) => t.board_columns?.name?.toLowerCase() === "done").length;
    const pending = tasks.filter((t: any) => t.board_columns?.name?.toLowerCase() === "in progress").length;
    const onHold = tasks.filter((t: any) => t.board_columns?.name?.toLowerCase() === "on hold").length;
    const errors = tasks.filter((t: any) => t.board_columns?.name?.toLowerCase() === "error").length;
    const dpu = total ? errors / total : 0;
    const dpmo = Math.round(dpu * 1_000_000);
    const ftpr = total ? Math.round(completed / total * 100) : 0;
    // Group by process stage
    const byStage: Record<string, { done: number; error: number; total: number }> = {};
    tasks.forEach((t: any) => {
      const st = t.process_stage ?? "Unspecified";
      if (!byStage[st]) byStage[st] = { done: 0, error: 0, total: 0 };
      byStage[st].total++;
      if (t.board_columns?.name?.toLowerCase() === "done") byStage[st].done++;
      if (t.board_columns?.name?.toLowerCase() === "error") byStage[st].error++;
    });
    return { total, completed, pending, onHold, errors, dpu, dpmo, ftpr, byStage };
  }, [tasks]);

  const exportCsv = () => {
    if (!tasks) return;
    const rows = [
      ["ID","Title","Priority","Stage","Status","Board","Created At","Completed At","Due Date"],
      ...tasks.map((t: any) => [
        t.id, t.title, t.priority, t.process_stage, t.board_columns?.name,
        t.boards?.name, t.created_at, t.completed_at ?? "", t.due_date ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c: any) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `report-${range}-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 print:space-y-4" id="report-root">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Summary of task activity and quality metrics</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { v: "week" as const, l: "Last 7 days" },
            { v: "month" as const, l: "Last 30 days" },
            { v: "custom" as const, l: "Custom" },
          ].map(({ v, l }) => (
            <button key={v} onClick={() => setRange(v)}
              className={`rounded-xl border px-3 py-1.5 text-sm transition ${range === v ? "bg-primary-600 border-primary-600 text-white" : "border-border hover:bg-muted"}`}>
              {l}
            </button>
          ))}
          <select value={boardFilter} onChange={(e) => setBoardFilter(e.target.value)} className="input-field py-1.5 text-sm">
            <option value="all">All boards</option>
            {(boards ?? []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm hover:bg-muted">
            <Printer className="h-4 w-4" /> Print / PDF
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700">
            <FileSpreadsheet className="h-4 w-4" /> Export CSV / Excel
          </button>
        </div>
      </div>

      {range === "custom" && (
        <div className="flex items-center gap-3 print:hidden">
          <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="input-field text-sm" />
          <span className="text-sm text-muted-foreground">to</span>
          <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="input-field text-sm" />
        </div>
      )}

      {isLoading && <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>}

      {summary && (
        <div className="space-y-5">
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Tasks", value: summary.total, icon: TrendingUp, color: "text-primary-700 bg-primary-50" },
              { label: "Completed", value: summary.completed, icon: CheckCircle2, color: "text-emerald-700 bg-emerald-50" },
              { label: "Pending / Active", value: summary.pending, icon: Clock, color: "text-amber-700 bg-amber-50" },
              { label: "Error / On Hold", value: summary.errors + summary.onHold, icon: AlertCircle, color: "text-red-700 bg-red-50" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card-surface p-5">
                <div className={`inline-flex rounded-xl p-2 ${color}`}><Icon className="h-5 w-5" /></div>
                <div className="mt-3 text-2xl font-bold">{value}</div>
                <div className="mt-0.5 text-sm text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>

          {/* Quality metrics */}
          <div className="card-surface p-5">
            <h2 className="mb-4 font-semibold">Quality Metrics</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><div className="text-xs text-muted-foreground">DPU</div><div className="text-xl font-bold">{summary.dpu.toFixed(4)}</div></div>
              <div><div className="text-xs text-muted-foreground">DPMO</div><div className="text-xl font-bold">{summary.dpmo.toLocaleString()}</div></div>
              <div><div className="text-xs text-muted-foreground">FTPR</div><div className="text-xl font-bold">{summary.ftpr}%</div></div>
            </div>
          </div>

          {/* By stage table */}
          <div className="card-surface overflow-hidden">
            <div className="border-b border-border px-5 py-3 font-semibold">Tasks by Process Stage</div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">{["Stage","Total","Done","Error","FTPR %"].map(h=><th key={h} className="px-5 py-3 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-border">
                {Object.entries(summary.byStage).map(([stage, s]: any) => (
                  <tr key={stage} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium">{stage}</td>
                    <td className="px-5 py-3">{s.total}</td>
                    <td className="px-5 py-3 text-emerald-700">{s.done}</td>
                    <td className="px-5 py-3 text-red-600">{s.error}</td>
                    <td className="px-5 py-3">{s.total ? Math.round(s.done/s.total*100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}