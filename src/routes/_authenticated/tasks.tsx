import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { Search, Loader2, ArrowUpDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tasks")({ component: TasksPage });

type Row = {
  id: string; title: string; description: string | null; priority: string;
  process_stage: string | null; due_date: string | null; column_id: string; board_id: string;
  created_at: string;
};

function TasksPage() {
  const { org, user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState<string>("all");
  const [stage, setStage] = useState<string>("all");
  const [sort, setSort] = useState<"created" | "priority" | "due">("created");

  const { data: boardsAndCols } = useQuery({
    queryKey: ["org-boards", org?.id ?? user?.id],
    enabled: !!user,
    queryFn: async () => {
      const q1 = org
        ? supabase.from("boards").select("id, name").eq("org_id", org.id)
        : supabase.from("boards").select("id, name").eq("owner_id", user!.id);
      const { data: boards } = await q1;
      const boardIds = (boards ?? []).map((b) => b.id);
      const { data: cols } = boardIds.length
        ? await supabase.from("board_columns").select("id, name, color, board_id").in("board_id", boardIds)
        : { data: [] as any[] };
      return { boards: boards ?? [], cols: cols ?? [], boardIds };
    },
  });

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["all-tasks", boardsAndCols?.boardIds],
    enabled: !!boardsAndCols,
    queryFn: async () => {
      if (!boardsAndCols?.boardIds.length) return [] as Row[];
      const { data } = await supabase.from("tasks").select("*").in("board_id", boardsAndCols.boardIds);
      return (data ?? []) as Row[];
    },
  });

  const stages = useMemo(() => {
    const s = new Set<string>();
    (tasks ?? []).forEach((t) => t.process_stage && s.add(t.process_stage));
    return Array.from(s);
  }, [tasks]);

  const colMap = useMemo(() => {
    const m: Record<string, { name: string; color: string | null }> = {};
    (boardsAndCols?.cols ?? []).forEach((c: any) => m[c.id] = { name: c.name, color: c.color });
    return m;
  }, [boardsAndCols]);

  const filtered = useMemo(() => {
    let r = (tasks ?? []).filter((t) =>
      (!q || t.title.toLowerCase().includes(q.toLowerCase()) || (t.description ?? "").toLowerCase().includes(q.toLowerCase())) &&
      (priority === "all" || t.priority === priority) &&
      (stage === "all" || t.process_stage === stage)
    );
    if (sort === "priority") {
      const order: any = { high: 0, medium: 1, low: 2 };
      r = [...r].sort((a, b) => (order[a.priority] ?? 3) - (order[b.priority] ?? 3));
    } else if (sort === "due") {
      r = [...r].sort((a, b) => (a.due_date ? +new Date(a.due_date) : Infinity) - (b.due_date ? +new Date(b.due_date) : Infinity));
    } else {
      r = [...r].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }
    return r;
  }, [tasks, q, priority, stage, sort]);

  const togglePriority = async (id: string, current: string) => {
    const nextP = current === "high" ? "low" : current === "low" ? "medium" : "high";
    await supabase.from("tasks").update({ priority: nextP }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["all-tasks"] });
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Tasks</h1>
        <p className="text-sm text-muted-foreground">All work across your workspace boards.</p>
      </div>

      <div className="card-surface flex flex-wrap items-center gap-2 p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or description…"
            className="input-field pl-9 py-2 text-sm" />
        </div>
        <Select label="Priority" value={priority} onChange={setPriority}
          options={[["all", "All priorities"], ["high", "High"], ["medium", "Medium"], ["low", "Low"]]} />
        <Select label="Stage" value={stage} onChange={setStage}
          options={[["all", "All stages"], ...stages.map((s) => [s, s] as [string, string])]} />
        <Select label="Sort" value={sort} onChange={(v) => setSort(v as any)}
          options={[["created", "Newest"], ["priority", "Priority"], ["due", "Due date"]]} />
      </div>

      <div className="card-surface overflow-hidden">
        {isLoading ? (
          <div className="grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="grid h-40 place-items-center text-sm text-muted-foreground">No tasks match your filters.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">Stage</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Priority</th>
                <th className="px-4 py-2 text-left">Due</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const col = colMap[t.column_id];
                return (
                  <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{t.title}</div>
                      {t.description && <div className="line-clamp-1 text-xs text-muted-foreground">{t.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.process_stage ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: col?.color ?? "#94a3b8" }} />
                        {col?.name ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => togglePriority(t.id, t.priority)}
                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${priorityClass(t.priority)}`}>
                        <ArrowUpDown className="h-3 w-3" /> {t.priority}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {t.due_date ? new Date(t.due_date).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input-field py-1.5 text-sm">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function priorityClass(p: string) {
  return p === "high" ? "bg-red-50 text-red-600"
    : p === "medium" ? "bg-amber-50 text-amber-600"
    : "bg-emerald-50 text-emerald-600";
}
