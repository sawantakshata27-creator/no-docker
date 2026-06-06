import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Layers3, Loader2, Pencil, Plus, Save, X } from "lucide-react";
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
};

const DEFAULT_COLUMNS = [
  { name: "New Task", position: 0, color: "#94a3b8" },
  { name: "In Progress", position: 1, color: "#3b82f6" },
  { name: "In Review", position: 2, color: "#f59e0b" },
  { name: "Done", position: 3, color: "#10b981" },
] as const;

function BoardPage() {
  const { user, org, membership } = useAuth();
  const queryClient = useQueryClient();
  const [creatingBoard, setCreatingBoard] = useState(false);

  const { data: boards, isLoading: boardsLoading } = useQuery({
    queryKey: ["boards", org?.id ?? user?.id],
    enabled: !!user,
    queryFn: async () => {
      const query = org
        ? supabase
            .from("boards")
            .select("id, name, key, scheduled_delivery_date")
            .eq("org_id", org.id)
        : supabase
            .from("boards")
            .select("id, name, key, scheduled_delivery_date")
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
    setCreatingBoard(true);
    try {
      const keyBase =
        (org?.name ?? "MAIN")
          .replace(/[^A-Z0-9]/gi, "")
          .slice(0, 4)
          .toUpperCase() || "MAIN";
      const boardName = org ? `${org.name} Workflow` : "My Workflow";
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
    return (
      <div className="card-surface grid min-h-[60vh] place-items-center p-8 text-center">
        <div className="max-w-md space-y-4">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-50 text-primary-700">
            <Layers3 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">No board yet</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a starter board with realistic workflow data so drag-and-drop, task details,
              and analytics are ready immediately.
            </p>
          </div>
          <button
            onClick={createStarterBoard}
            disabled={creatingBoard}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
          >
            {creatingBoard ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create starter board
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
