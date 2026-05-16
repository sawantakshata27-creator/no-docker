import { useEffect, useRef, useState } from "react";
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
  const [draft, setDraft] = useState<TaskRecord | null>(task);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<number | null>(null);
  const pendingPatchRef = useRef<Partial<TaskRecord>>({});

  useEffect(() => {
    setDraft(task);
    pendingPatchRef.current = {};
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [task?.id, open]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const persistPatch = async (task: TaskRecord, patch: Partial<TaskRecord>) => {
    if (!Object.keys(patch).length) return;
    setSaving(true);
    const error = onPersistPatch
      ? await onPersistPatch(task, patch)
          .then(() => null)
          .catch((persistError) => persistError)
      : (await supabase.from("tasks").update(patch).eq("id", task.id)).error;
    setSaving(false);
    if (error) {
      toast.error((error as any).message || "Failed to update task");
      onPersistError?.();
      return;
    }
  };

  const queuePersist = (task: TaskRecord, patch: Partial<TaskRecord>) => {
    pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      const nextPatch = pendingPatchRef.current;
      pendingPatchRef.current = {};
      await persistPatch(task, nextPatch);
      timerRef.current = null;
    }, 350);
  };

  const patchDraft = (patch: Partial<TaskRecord>) => {
    if (!draft) return;
    const next = { ...draft, ...patch };
    setDraft(next);
    onTaskPatched(draft.id, patch);
    queuePersist(draft, patch);
  };

  const handleDelete = async () => {
    if (!draft) return;
    const confirmed = window.confirm("Delete this task?");
    if (!confirmed) return;
    const { error } = await supabase.from("tasks").delete().eq("id", draft.id);
    if (error) {
      toast.error(error.message || "Failed to delete task");
      return;
    }
    onTaskDeleted?.(draft.id);
    onOpenChange(false);
    toast.success("Task deleted");
  };

  const handleColumnChange = (columnId: string) => {
    const targetIndex = columns.findIndex((column) => column.id === columnId);
    const isDoneColumn = columns[targetIndex]?.name.toLowerCase().includes("done");
    patchDraft({
      column_id: columnId,
      completed_at: isDoneColumn ? new Date().toISOString() : null,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        {draft ? (
          <div className="space-y-6">
            <SheetHeader>
              <div className="flex items-start justify-between gap-4 pr-8">
                <div className="space-y-2">
                  <SheetTitle>Task details</SheetTitle>
                  <SheetDescription>
                    Quick edits save automatically and stay synced with your board.
                  </SheetDescription>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "Saving…" : "Saved"}
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
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Description</span>
                <textarea
                  className="input-field min-h-32 resize-y"
                  value={draft.description ?? ""}
                  onChange={(event) => patchDraft({ description: event.target.value || null })}
                  placeholder="Add notes, blockers, or next steps"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Status">
                <select
                  className="input-field"
                  value={draft.column_id}
                  onChange={(event) => handleColumnChange(event.target.value)}
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
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </Field>

              <Field label="Process stage">
                <select
                  className="input-field"
                  value={draft.process_stage ?? ""}
                  onChange={(event) => patchDraft({ process_stage: event.target.value || null })}
                >
                  <option value="">No stage</option>
                  {DEFAULT_PROCESS_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
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

            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="text-xs text-muted-foreground">Task ID {draft.id.slice(0, 8)}</div>
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" /> Delete task
              </button>
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
