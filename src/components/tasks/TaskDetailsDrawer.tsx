import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  priorityClass,
  type ColumnRecord,
  type TaskRecord,
  DEFAULT_PROCESS_STAGES,
} from "@/lib/task-model";

interface TaskDetailsDrawerProps {
  open: boolean;
  task: TaskRecord | null;
  columns: ColumnRecord[];
  onOpenChange: (open: boolean) => void;
  onTaskPatched: (taskId: string, patch: Partial<TaskRecord>) => void;
  onPersistPatch?: (task: TaskRecord, patch: Partial<TaskRecord>) => Promise<void>;
  onTaskDeleted?: (taskId: string) => void;
  onPersistError?: () => void;
}

// Fields that can be edited from the drawer and persisted via "Save".
const EDITABLE_FIELDS: (keyof TaskRecord)[] = [
  "title",
  "description",
  "priority",
  "process_stage",
  "due_date",
  "column_id",
  "completed_at",
];

function pickEditable(task: TaskRecord): Partial<TaskRecord> {
  const out: Partial<TaskRecord> = {};
  for (const key of EDITABLE_FIELDS) {
    (out as any)[key] = task[key] ?? null;
  }
  return out;
}

function diffPatch(
  current: Partial<TaskRecord>,
  next: Partial<TaskRecord>,
): Partial<TaskRecord> {
  const patch: Partial<TaskRecord> = {};
  for (const key of EDITABLE_FIELDS) {
    if ((current as any)[key] !== (next as any)[key]) {
      (patch as any)[key] = (next as any)[key];
    }
  }
  return patch;
}

export function TaskDetailsDrawer({
  open,
  task,
  columns,
  onOpenChange,
  onTaskPatched,
  onPersistPatch,
  onTaskDeleted,
  onPersistError,
}: TaskDetailsDrawerProps) {
  // `draft` is a local working copy. Edits no longer persist until the user
  // clicks "Save task". Closing/changing tasks discards unsaved edits.
  const [draft, setDraft] = useState<TaskRecord | null>(task);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setDraft(task);
  }, [task?.id, open]);

  const baseline = useMemo<Partial<TaskRecord> | null>(
    () => (task ? pickEditable(task) : null),
    [task?.id, open],
  );

  const dirtyPatch = useMemo<Partial<TaskRecord>>(() => {
    if (!draft || !baseline) return {};
    return diffPatch(baseline, pickEditable(draft));
  }, [draft, baseline]);

  const isDirty = Object.keys(dirtyPatch).length > 0;

  const patchDraft = (patch: Partial<TaskRecord>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  };

  const handleColumnChange = (columnId: string) => {
    const targetIndex = columns.findIndex((column) => column.id === columnId);
    const isDoneColumn = columns[targetIndex]?.name.toLowerCase().includes("done");
    patchDraft({
      column_id: columnId,
      completed_at: isDoneColumn
        ? (draft?.completed_at ?? new Date().toISOString())
        : null,
    });
  };

  const handleSave = async () => {
    if (!draft || !task) return;
    if (!isDirty) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      if (onPersistPatch) {
        await onPersistPatch(task, dirtyPatch);
      } else {
        const { error } = await supabase
          .from("tasks")
          .update(dirtyPatch)
          .eq("id", task.id);
        if (error) throw error;
      }
      // Bubble the patch up so the board/list reflects the new values without
      // waiting for a refetch.
      onTaskPatched(task.id, dirtyPatch);
      toast.success("Task saved");
    } catch (error: any) {
      toast.error(error?.message || "Failed to save task");
      onPersistError?.();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!draft) return;
    const confirmed = window.confirm("Delete this task?");
    if (!confirmed) return;
    setDeleting(true);
    const { error } = await supabase.from("tasks").delete().eq("id", draft.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message || "Failed to delete task");
      return;
    }
    onTaskDeleted?.(draft.id);
    onOpenChange(false);
    toast.success("Task deleted");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && isDirty) {
      const discard = window.confirm("Discard unsaved changes?");
      if (!discard) return;
    }
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        {draft ? (
          <div className="space-y-6">
            <SheetHeader>
              <div className="flex items-start justify-between gap-4 pr-8">
                <div className="space-y-2">
                  <SheetTitle>Task details</SheetTitle>
                  <SheetDescription>
                    Edit fields below and press <strong>Save task</strong> to persist your
                    changes.
                  </SheetDescription>
                </div>
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                    isDirty
                      ? "border-amber-300 bg-amber-50 text-amber-700"
                      : "border-border bg-muted/40 text-muted-foreground"
                  }`}
                  data-testid="task-dirty-indicator"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "Saving…" : isDirty ? "Unsaved changes" : "All changes saved"}
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Title</span>
                <input
                  className="input-field text-lg font-semibold"
                  value={draft.title}
                  onChange={(event) => patchDraft({ title: event.target.value })}
                  placeholder="Untitled task"
                  data-testid="task-title-input"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Description</span>
                <textarea
                  className="input-field min-h-32 resize-y"
                  value={draft.description ?? ""}
                  onChange={(event) => patchDraft({ description: event.target.value || null })}
                  placeholder="Add notes, blockers, or next steps"
                  data-testid="task-description-input"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Status">
                <select
                  className="input-field"
                  value={draft.column_id}
                  onChange={(event) => handleColumnChange(event.target.value)}
                  data-testid="task-status-select"
                >
                  {columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Priority">
                <select
                  className="input-field"
                  value={draft.priority}
                  onChange={(event) => patchDraft({ priority: event.target.value })}
                  data-testid="task-priority-select"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </Field>

              <Field label="Process">
                <select
                  className="input-field"
                  value={draft.process_stage ?? ""}
                  onChange={(event) => patchDraft({ process_stage: event.target.value || null })}
                  data-testid="task-process-select"
                >
                  {!draft.process_stage ? <option value="">Select process…</option> : null}
                  {DEFAULT_PROCESS_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                  {draft.process_stage &&
                  !DEFAULT_PROCESS_STAGES.includes(
                    draft.process_stage as (typeof DEFAULT_PROCESS_STAGES)[number],
                  ) ? (
                    <option value={draft.process_stage}>{draft.process_stage} (legacy)</option>
                  ) : null}
                </select>
              </Field>

              <Field label="Due date">
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="date"
                    className="input-field pl-9"
                    value={draft.due_date ? draft.due_date.slice(0, 10) : ""}
                    onChange={(event) =>
                      patchDraft({
                        due_date: event.target.value
                          ? new Date(`${event.target.value}T12:00:00`).toISOString()
                          : null,
                      })
                    }
                    data-testid="task-due-date-input"
                  />
                </div>
              </Field>
            </div>

            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="text-xs font-medium text-muted-foreground">Live preview</div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded border px-2 py-1 text-[10px] font-medium uppercase ${priorityClass(draft.priority)}`}
                >
                  {draft.priority}
                </span>
                {draft.process_stage ? (
                  <span className="rounded bg-primary-50 px-2 py-1 text-[10px] font-medium text-primary-700">
                    {draft.process_stage}
                  </span>
                ) : null}
                {draft.due_date ? (
                  <span className="rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                    Due {new Date(draft.due_date).toLocaleDateString()}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div className="text-xs text-muted-foreground">Task ID {draft.id.slice(0, 8)}</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="task-delete-btn"
                >
                  <Trash2 className="h-4 w-4" /> {deleting ? "Deleting…" : "Delete task"}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || deleting || !isDirty}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="task-save-btn"
                >
                  <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save task"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
