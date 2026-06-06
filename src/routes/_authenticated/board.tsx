import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, DollarSign, Globe, Layers3, Link2, Loader2, Pencil, Plus, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { BoardProductivityMetrics } from "@/components/board/BoardProductivityMetrics";
import { useAuth } from "@/lib/auth-store";
import { buildSeedTasks, type ColumnRecord, type TaskRecord } from "@/lib/task-model";

export const Route = createFileRoute("/_authenticated/board")({ component: BoardPage });

export type Column = ColumnRecord;
export type Task = TaskRecord;

type BoardRow = {
  id: string;
  name: string;
  key: string;
  scheduled_delivery_date: string | null;
  budget_total: number | null;
  budget_spent: number | null;
  is_public: boolean;
};

const DEFAULT_COLUMNS = [
  { name: "New", position: 0, color: "#94a3b8" },
  { name: "In Progress", position: 1, color: "#3b82f6" },
  { name: "On Hold", position: 2, color: "#f59e0b" },
  { name: "Error", position: 3, color: "#ef4444" },
  { name: "Done", position: 4, color: "#10b981" },
] as const;

function BoardPage() {
  const { user, org, membership } = useAuth();
  const queryClient = useQueryClient();
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");

  const { data: boards, isLoading: boardsLoading } = useQuery({
    queryKey: ["boards", org?.id ?? user?.id],
    enabled: !!user,
    queryFn: async () => {
      const query = org
        ? supabase
            .from("boards")
            .select("id, name, key, scheduled_delivery_date, budget_total, budget_spent, is_public")
            .eq("org_id", org.id)
        : supabase
            .from("boards")
            .select("id, name, key, scheduled_delivery_date, budget_total, budget_spent, is_public")
            .eq("owner_id", user!.id);
      const { data, error } = await query.order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BoardRow[];
    },
  });

  const board = boards?.[0] ?? null;
  const boardId = board?.id ?? null;
  const canEditSchedule = !org || membership?.role === "owner" || membership?.role === "admin";
  const { data: columns, isLoading: columnsLoading } = useQuery({
    queryKey: ["columns", boardId],
    enabled: !!boardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_columns")
        .select("*")
        .eq("board_id", boardId!)
        .order("position");
      if (error) throw error;
      return (data ?? []) as Column[];
    },
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", boardId],
    enabled: !!boardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("board_id", boardId!)
        .order("position");
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });

  const refetch = useMemo(
    () => () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
      queryClient.invalidateQueries({ queryKey: ["columns", boardId] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-tasks"] });
    },
    [boardId, queryClient],
  );

  const createStarterBoard = async () => {
    if (!user) return;
    const trimmedName = newBoardName.trim();
    setCreatingBoard(true);
    try {
      const defaultName = org ? `${org.name} Workflow` : "My Workflow";
      const boardName = trimmedName || defaultName;
      const keyBase =
        (trimmedName || org?.name || "MAIN")
          .replace(/[^A-Z0-9]/gi, "")
          .slice(0, 4)
          .toUpperCase() || "MAIN";
      const { data: board, error: boardError } = await supabase
        .from("boards")
        .insert({
          owner_id: user.id,
          org_id: org?.id ?? null,
          name: boardName,
          key: keyBase,
          description: "Primary workflow board",
        })
        .select("id, name, key")
        .single();

      if (boardError) throw boardError;

      const { data: insertedColumns, error: columnsError } = await supabase
        .from("board_columns")
        .insert(DEFAULT_COLUMNS.map((column) => ({ ...column, board_id: board.id })))
        .select("id, name, color, position");

      if (columnsError) throw columnsError;

      const seedTasks = buildSeedTasks(insertedColumns as ColumnRecord[], board.id, user.id);
      const { error: taskError } = await supabase.from("tasks").insert(seedTasks);
      if (taskError) throw taskError;

      await queryClient.invalidateQueries({ queryKey: ["boards", org?.id ?? user.id] });
      toast.success("Starter board created");
    } catch (error: any) {
      toast.error(error?.message || "Could not create board");
    } finally {
      setCreatingBoard(false);
    }
  };

  if (boardsLoading || (boardId && (columnsLoading || tasksLoading))) {
    return (
      <div className="grid h-96 place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!boardId || !columns) {
    const defaultName = org ? `${org.name} Workflow` : "My Workflow";
    const trimmedName = newBoardName.trim();
    return (
      <div className="card-surface grid min-h-[60vh] place-items-center p-8 text-center">
        <div className="w-full max-w-md space-y-5">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-50 text-primary-700">
            <Layers3 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Create your first board</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Name your board — we'll seed it with workflow columns (New → In Progress → On Hold →
              Error → Done) and a few sample tasks so drag-and-drop, task details, and analytics are
              ready immediately.
            </p>
          </div>
          <div className="space-y-2 text-left">
            <label
              htmlFor="new-board-name"
              className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Board name
            </label>
            <input
              id="new-board-name"
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !creatingBoard) createStarterBoard();
              }}
              placeholder={defaultName}
              disabled={creatingBoard}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 disabled:opacity-60"
              data-testid="new-board-name-input"
              autoFocus
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use <span className="font-medium text-foreground">{defaultName}</span>.
            </p>
          </div>
          <button
            onClick={createStarterBoard}
            disabled={creatingBoard}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
            data-testid="create-starter-board-btn"
          >
            {creatingBoard ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create board{trimmedName ? ` "${trimmedName}"` : ""}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Board</h1>
          <p className="text-sm text-muted-foreground">
            Open cards, quick-edit details, and drag tasks across workflow stages.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          {board && (
            <ScheduledDeliveryEditor
              board={board}
              canEdit={canEditSchedule}
              onSaved={() =>
                queryClient.invalidateQueries({
                  queryKey: ["boards", org?.id ?? user?.id],
                })
              }
            />
          )}
          {board && (
            <BudgetEditor
              board={board}
              canEdit={canEditSchedule}
              onSaved={() =>
                queryClient.invalidateQueries({
                  queryKey: ["boards", org?.id ?? user?.id],
                })
              }
            />
          )}
          {board && (
            <PublicShareToggle
              board={board}
              canEdit={canEditSchedule}
              onSaved={() =>
                queryClient.invalidateQueries({
                  queryKey: ["boards", org?.id ?? user?.id],
                })
              }
            />
          )}
        </div>
      </div>
      <BoardProductivityMetrics tasks={tasks ?? []} />
      <KanbanBoard
        boardId={boardId}
        userId={user!.id}
        columns={columns}
        tasks={tasks ?? []}
        onChange={refetch}
      />
    </div>
  );
}

function ScheduledDeliveryEditor({
  board,
  canEdit,
  onSaved,
}: {
  board: BoardRow;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string>(board.scheduled_delivery_date ?? "");
  const [saving, setSaving] = useState(false);

  const formatted = board.scheduled_delivery_date
    ? new Date(`${board.scheduled_delivery_date}T00:00:00`).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const startEdit = () => {
    setValue(board.scheduled_delivery_date ?? "");
    setEditing(true);
  };

  const cancel = () => {
    setValue(board.scheduled_delivery_date ?? "");
    setEditing(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const next = value ? value : null;
      const { error } = await supabase
        .from("boards")
        .update({ scheduled_delivery_date: next })
        .eq("id", board.id);
      if (error) throw error;
      toast.success(next ? "Delivery date updated" : "Delivery date cleared");
      setEditing(false);
      onSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update delivery date";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit && !formatted) return null;

  return (
    <div
      className="card-surface flex items-center gap-3 px-4 py-2.5"
      data-testid="scheduled-delivery-editor"
    >
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-50 text-primary-700">
        <CalendarClock className="h-4 w-4" />
      </div>
      <div className="min-w-[10rem]">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Scheduled delivery
        </div>
        {editing ? (
          <input
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-0.5 w-40 rounded-md border border-border bg-card px-2 py-1 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            data-testid="scheduled-delivery-input"
            autoFocus
          />
        ) : (
          <div
            className="mt-0.5 text-sm font-semibold text-foreground"
            data-testid="scheduled-delivery-value"
          >
            {formatted ?? <span className="text-muted-foreground">Not scheduled</span>}
          </div>
        )}
      </div>
      {canEdit && !editing && (
        <button
          onClick={startEdit}
          className="ml-1 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-primary-50 hover:text-primary-700"
          title="Edit scheduled delivery date"
          data-testid="edit-scheduled-delivery-btn"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {canEdit && editing && (
        <div className="ml-1 flex items-center gap-1">
          <button
            onClick={save}
            disabled={saving}
            className="grid h-8 w-8 place-items-center rounded-lg bg-primary-600 text-white transition hover:bg-primary-700 disabled:opacity-50"
            title="Save"
            data-testid="save-scheduled-delivery-btn"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          </button>
          <button
            onClick={cancel}
            disabled={saving}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-destructive disabled:opacity-50"
            title="Cancel"
            data-testid="cancel-scheduled-delivery-btn"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function BudgetEditor({
  board,
  canEdit,
  onSaved,
}: {
  board: BoardRow;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [total, setTotal] = useState<string>(board.budget_total?.toString() ?? "");
  const [spent, setSpent] = useState<string>(board.budget_spent?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const pct = board.budget_total ? Math.round(((board.budget_spent ?? 0) / board.budget_total) * 100) : null;
  const overBudget = pct !== null && pct >= 80;
  const remaining = (board.budget_total ?? 0) - (board.budget_spent ?? 0);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("boards")
        .update({
          budget_total: total ? parseFloat(total) : null,
          budget_spent: spent ? parseFloat(spent) : null,
        })
        .eq("id", board.id);
      if (error) throw error;
      toast.success("Budget updated");
      setEditing(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update budget");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`card-surface flex items-center gap-3 px-4 py-2.5 ${overBudget ? "border-amber-300 bg-amber-50" : ""}`}
      data-testid="budget-editor"
    >
      <div className={`grid h-9 w-9 place-items-center rounded-xl ${overBudget ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
        <DollarSign className="h-4 w-4" />
      </div>
      <div className="min-w-[10rem]">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Budget{pct !== null && (
            <span className={`ml-1 rounded px-1 py-0.5 text-[9px] font-bold ${pct >= 100 ? "bg-red-100 text-red-700" : pct >= 80 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
              {pct}%
            </span>
          )}
        </div>
        {editing ? (
          <div className="mt-0.5 flex gap-1.5">
            <input type="number" min="0" placeholder="Total $" value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="w-24 rounded-md border border-border bg-card px-2 py-1 text-sm outline-none focus:border-primary-400"
              data-testid="budget-total-input" />
            <input type="number" min="0" placeholder="Spent $" value={spent}
              onChange={(e) => setSpent(e.target.value)}
              className="w-24 rounded-md border border-border bg-card px-2 py-1 text-sm outline-none focus:border-primary-400"
              data-testid="budget-spent-input" />
          </div>
        ) : (
          <div className="mt-0.5 text-sm font-semibold text-foreground" data-testid="budget-value">
            {board.budget_total != null ? (
              <>
                <span>${(board.budget_spent ?? 0).toLocaleString()} / ${board.budget_total.toLocaleString()}</span>
                {overBudget && <span className="ml-1.5 text-xs font-normal text-amber-600">⚠ High spend</span>}
                <div className="mt-1 text-xs font-normal text-muted-foreground">
                  Remaining: ${remaining >= 0 ? "" : "-"}${Math.abs(remaining).toLocaleString()}
                </div>
              </>
            ) : (
              <span className="text-muted-foreground">No budget set</span>
            )}
          </div>
        )}
      </div>
      {canEdit && !editing && (
        <button onClick={() => { setTotal(board.budget_total?.toString() ?? ""); setSpent(board.budget_spent?.toString() ?? ""); setEditing(true); }}
          className="ml-1 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-emerald-50 hover:text-emerald-700"
          title="Edit budget" data-testid="edit-budget-btn">
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {canEdit && editing && (
        <div className="ml-1 flex items-center gap-1">
          <button onClick={save} disabled={saving}
            className="grid h-8 w-8 place-items-center rounded-lg bg-primary-600 text-white transition hover:bg-primary-700 disabled:opacity-50"
            title="Save" data-testid="save-budget-btn">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          </button>
          <button onClick={() => setEditing(false)} disabled={saving}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-destructive disabled:opacity-50"
            title="Cancel">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function PublicShareToggle({
  board,
  canEdit,
  onSaved,
}: {
  board: BoardRow;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggle = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("boards").update({ is_public: !board.is_public }).eq("id", board.id);
      if (error) throw error;
      toast.success(board.is_public ? "Public link disabled" : "Public link enabled");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/board/${board.id}/public`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Public link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`card-surface flex items-center gap-3 px-4 py-2.5 ${board.is_public ? "border-blue-200 bg-blue-50" : ""}`} data-testid="public-share-toggle">
      <div className={`grid h-9 w-9 place-items-center rounded-xl ${board.is_public ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"}`}>
        <Globe className="h-4 w-4" />
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Public link</div>
        <div className="mt-0.5 text-sm font-semibold">{board.is_public ? "Enabled" : "Disabled"}</div>
      </div>
      {canEdit && (
        <button onClick={toggle} disabled={saving}
          className={`ml-1 relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${board.is_public ? "bg-blue-600" : "bg-muted-foreground/30"}`}
          title={board.is_public ? "Disable public link" : "Enable public link"}>
          <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${board.is_public ? "translate-x-5" : ""}`} />
        </button>
      )}
      {board.is_public && (
        <button onClick={copyLink}
          className="ml-1 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-blue-100 hover:text-blue-700"
          title="Copy public link">
          {copied ? <Save className="h-4 w-4 text-emerald-600" /> : <Link2 className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}