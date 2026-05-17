import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { Search, Loader2, ArrowUpDown, Pencil } from "lucide-react";
import { TaskDetailsDrawer } from "@/components/tasks/TaskDetailsDrawer";
import { type TaskRecord, type ColumnRecord } from "@/lib/task-model";

export const Route = createFileRoute("/_authenticated/tasks")({ component: TasksPage });

function TasksPage() {
  const { org, user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState<string>("all");
  const [stage, setStage] = useState<string>("all");
  const [sort, setSort] = useState<"created" | "priority" | "due">("created");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  // local optimistic overlay
  const [patches, setPatches] = useState<Record<string, Partial<TaskRecord>>>({});
  const [deleted, setDeleted] = useState<Set<string>>(new Set());

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
        ? await supabase
            .from("board_columns")
            .select("id, name, color, board_id, position")
            .in("board_id", boardIds)
        : { data: [] as any[] };
      return { boards: boards ?? [], cols: (cols ?? []) as ColumnRecord[], boardIds };
    },
  });

  const { data: rawTasks, isLoading } = useQuery({
    queryKey: ["all-tasks", boardsAndCols?.boardIds],
    enabled: !!boardsAndCols,
    queryFn: async () => {
      if (!boardsAndCols?.boardIds.length) return [] as TaskRecord[];
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .in("board_id", boardsAndCols.boardIds);
      return (data ?? []) as TaskRecord[];
    },
  });

  // Apply local patches + deleted filter on top of remote data
  const tasks: TaskRecord[] = useMemo(
    () =>
      (rawTasks ?? [])
        .filter((t) => !deleted.has(t.id))
        .map((t) => ({ ...t, ...(patches[t.id] ?? {}) })),
    [rawTasks, patches, deleted],
  );

  const stages = useMemo(() => {
    const s = new Set<string>();
    tasks.forEach((t) => t.process_stage && s.add(t.process_stage));
    return Array.from(s);
  }, [tasks]);

  const colMap = useMemo(() => {
    const m: Record<string, ColumnRecord> = {};
    (boardsAndCols?.cols ?? []).forEach((c) => (m[c.id] = c));
    return m;
  }, [boardsAndCols]);

  const cols = useMemo(
    () => [...(boardsAndCols?.cols ?? [])].sort((a, b) => a.position - b.position),
    [boardsAndCols],
  );

  const filtered = useMemo(() => {
    let r = tasks.filter(
      (t) =>
        (!q ||
          t.title.toLowerCase().includes(q.toLowerCase()) ||
          (t.description ?? "").toLowerCase().includes(q.toLowerCase())) &&
        (priority === "all" || t.priority === priority) &&
        (stage === "all" || t.process_stage === stage),
    );
    if (sort === "priority") {
      const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
      r = [...r].sort((a, b) => (order[a.priority] ?? 3) - (order[b.priority] ?? 3));
    } else if (sort === "due") {
      r = [...r].sort(
        (a, b) =>
          (a.due_date ? +new Date(a.due_date) : Infinity) -
          (b.due_date ? +new Date(b.due_date) : Infinity),
      );
    } else {
      r = [...r].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }
    return r;
  }, [tasks, q, priority, stage, sort]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  const patchTask = (taskId: string, patch: Partial<TaskRecord>) => {
    setPatches((prev) => ({ ...prev, [taskId]: { ...(prev[taskId] ?? {}), ...patch } }));
  };

  const removeTask = (taskId: string) => {
    setDeleted((prev) => new Set([...prev, taskId]));
    setSelectedTaskId(null);
    qc.invalidateQueries({ queryKey: ["all-tasks"] });
  };

  const togglePriority = async (id: string, current: string) => {
    const nextP = current === "high" ? "low" : current === "low" ? "medium" : "high";
    patchTask(id, { priority: nextP });
    await supabase.from("tasks").update({ priority: nextP }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["all-tasks"] });
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const handleStartEdit = (task: TaskRecord) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  };

  const handleSaveEdit = async () => {
    if (!editingTaskId || !editingTitle.trim()) {
      setEditingTaskId(null);
      return;
    }
    patchTask(editingTaskId, { title: editingTitle.trim() });
    await supabase.from("tasks").update({ title: editingTitle.trim() }).eq("id", editingTaskId);
    qc.invalidateQueries({ queryKey: ["all-tasks"] });
    qc.invalidateQueries({ queryKey: ["tasks"] });
    setEditingTaskId(null);
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditingTitle("");
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground">
          All work across your workspace.{" "}
          <span className="text-xs text-muted-foreground/60">Double-click title to edit inline.</span>
        </p>
      </div>

      <div className="card-surface flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title or description…"
            className="input-field py-2 pl-9 text-sm"
          />
        </div>
        <Select
          label="Priority"
          value={priority}
          onChange={setPriority}
          options={[
            ["all", "All priorities"],
            ["high", "High"],
            ["medium", "Medium"],
            ["low", "Low"],
          ]}
        />
        <Select
          label="Stage"
          value={stage}
          onChange={setStage}
          options={[["all", "All stages"], ...stages.map((s) => [s, s] as [string, string])]}
        />
        <Select
          label="Sort"
          value={sort}
          onChange={(v) => setSort(v as "created" | "priority" | "due")}
          options={[
            ["created", "Newest"],
            ["priority", "Priority"],
            ["due", "Due date"],
          ]}
        />
      </div>

      <div className="card-surface overflow-hidden">
        {isLoading ? (
          <div className="grid h-40 place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="grid h-40 place-items-center text-sm text-muted-foreground">
            No tasks match your filters.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">Stage</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Priority</th>
                <th className="px-4 py-2 text-left">Due</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const col = colMap[t.column_id];
                const isOverdue =
                  t.due_date && new Date(t.due_date) < today && !t.completed_at;
                const isSelected = selectedTaskId === t.id;
                return (
                  <tr
                    key={t.id}
                    onClick={() => {
                      if (editingTaskId !== t.id) setSelectedTaskId(t.id);
                    }}
                    className={`group cursor-pointer border-t border-border transition-colors
                      ${isOverdue ? "bg-red-50/40 hover:bg-red-50/70 dark:bg-red-500/5 dark:hover:bg-red-500/10" : "hover:bg-muted/30"}
                      ${isSelected ? "ring-2 ring-inset ring-primary-500/30" : ""}`}
                  >
                    <td className="px-4 py-3">
                      {editingTaskId === t.id ? (
                        <input
                          autoFocus
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={handleSaveEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit();
                            if (e.key === "Escape") handleCancelEdit();
                            e.stopPropagation();
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="input-field w-full py-1 text-sm font-medium"
                        />
                      ) : (
                        <div 
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(t);
                          }}
                          className="font-medium leading-snug"
                        >
                          {t.title}
                        </div>
                      )}
                      {t.description && editingTaskId !== t.id && (
                        <div className="line-clamp-1 text-xs text-muted-foreground">
                          {t.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t.process_stage ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: col?.color ?? "#94a3b8" }}
                        />
                        {col?.name ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePriority(t.id, t.priority);
                        }}
                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${priorityClass(t.priority)}`}
                      >
                        <ArrowUpDown className="h-3 w-3" /> {t.priority}
                      </button>
                    </td>
                    <td
                      className={`px-4 py-3 text-xs ${isOverdue ? "font-semibold text-red-600" : "text-muted-foreground"}`}
                    >
                      {t.due_date ? new Date(t.due_date).toLocaleDateString() : "—"}
                      {isOverdue && (
                        <span className="ml-1 rounded bg-red-100 px-1 py-0.5 text-[9px] text-red-700 dark:bg-red-500/20 dark:text-red-300">
                          Overdue
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 transition group-hover:opacity-100" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <TaskDetailsDrawer
        open={!!selectedTask}
        task={selectedTask}
        columns={cols}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(null);
        }}
        onTaskPatched={patchTask}
        onTaskDeleted={removeTask}
        onPersistError={() => qc.invalidateQueries({ queryKey: ["all-tasks"] })}
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field py-1.5 text-sm"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function priorityClass(p: string) {
  return p === "high"
    ? "bg-red-50 text-red-600"
    : p === "medium"
      ? "bg-amber-50 text-amber-600"
      : "bg-emerald-50 text-emerald-600";
}
