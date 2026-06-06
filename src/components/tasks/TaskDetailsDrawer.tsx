import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-store";
import { CalendarDays, ExternalLink, Hash, MessageSquare, Paperclip, Save, Send, Trash2, Upload, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
// Issue #22 item 2: surface task details as a centered modal instead of a
// right-side sheet so it reads more like Jira's task detail view.
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  priorityClass,
  type ColumnRecord,
  type TaskRecord,
  DEFAULT_PROCESS_STAGES,
  productivityTargetFor,
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
  "files_count",
  "assignee_id",
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
  // Tracks the last-known-saved editable snapshot. Updated when the drawer opens
  // and again after a successful Save so we don't keep showing "Unsaved changes"
  // or prompting to discard already-persisted edits (issue #22).
  const [savedBaseline, setSavedBaseline] = useState<Partial<TaskRecord> | null>(
    () => (task ? pickEditable(task) : null),
  );
  const { org } = useAuth();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch active org members for the assignee dropdown
  const { data: orgMembers } = useQuery({
    queryKey: ["org-members-for-drawer", org?.id],
    enabled: !!org,
    queryFn: async () => {
      const { data } = await supabase
        .from("organization_members")
        .select("user_id, profiles(id, full_name, email)")
        .eq("org_id", org!.id)
        .eq("status", "active");
      return (data ?? []).map((m: any) => ({
        id: m.profiles.id as string,
        label: (m.profiles.full_name || m.profiles.email) as string,
      }));
    },
  });

  useEffect(() => {
    if (!open) return;
    setDraft(task);
    setSavedBaseline(task ? pickEditable(task) : null);
  }, [task?.id, open]);

  const dirtyPatch = useMemo<Partial<TaskRecord>>(() => {
    if (!draft || !savedBaseline) return {};
    return diffPatch(savedBaseline, pickEditable(draft));
  }, [draft, savedBaseline]);

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
      setSavedBaseline(pickEditable(draft));
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        data-testid="task-details-modal"
        className="max-h-[85vh] w-[min(96vw,40rem)] max-w-[40rem] overflow-y-auto"
      >
        {draft ? (
          <div className="space-y-6">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4 pr-8">
                <div className="space-y-2">
                  <DialogTitle>Task details</DialogTitle>
                  <DialogDescription>
                    Edit fields below and press <strong>Save task</strong> to persist your
                    changes.
                  </DialogDescription>
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
            </DialogHeader>

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
                {(() => {
                  const target = productivityTargetFor(draft.process_stage);
                  if (target == null) return null;
                  return (
                    <span
                      className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                      data-testid="task-process-productivity-target"
                    >
                      <span className="font-medium text-foreground">Target:</span>
                      {target} files/hr
                    </span>
                  );
                })()}
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

              <Field label="Files count">
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="input-field pl-9"
                    value={draft.files_count ?? ""}
                    onChange={(event) =>
                      patchDraft({
                        files_count: event.target.value === "" ? null : parseInt(event.target.value, 10),
                      })
                    }
                    placeholder="0"
                    data-testid="task-files-count-input"
                  />
                </div>
                {(() => {
                  const count = draft.files_count;
                  const target = productivityTargetFor(draft.process_stage);
                  if (!count || count <= 0 || !draft.created_at) return null;
                  const hoursElapsed = (Date.now() - new Date(draft.created_at).getTime()) / 3600000;
                  if (hoursElapsed <= 0) return null;
                  const actual = (count / hoursElapsed).toFixed(1);
                  const pct = target ? Math.round((count / hoursElapsed / target) * 100) : null;
                  return (
                    <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground" data-testid="task-productivity-actual">
                      Actual: <span className="font-medium text-foreground">{actual} files/hr</span>
                      {pct != null && (
                        <span className={`ml-1 rounded px-1 py-0.5 text-[10px] font-semibold ${pct >= 100 ? "bg-emerald-50 text-emerald-700" : pct >= 70 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                          {pct}% of target
                        </span>
                      )}
                    </span>
                  );
                })()}
              </Field>

              <Field label="Assignee">
                <div className="relative">
                  <UserCircle2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    className="input-field pl-9"
                    value={draft.assignee_id ?? ""}
                    onChange={(event) =>
                      patchDraft({ assignee_id: event.target.value || null })
                    }
                    data-testid="task-assignee-select"
                  >
                    <option value="">Unassigned</option>
                    {(orgMembers ?? []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
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
      </DialogContent>
    </Dialog>
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

// ── TaskComments ─────────────────────────────────────────────────────────────

type TaskComment = {
  id: string;
  task_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null } | null;
};

function TaskComments({ taskId }: { taskId: string }) {
  const { user, membership } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: comments = [] } = useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: async () => {
      const { data } = await supabase
        .from("task_comments")
        .select("*, profiles(full_name, email)")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
      return (data ?? []) as TaskComment[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`task-comments:${taskId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_comments", filter: `task_id=eq.${taskId}` },
        () => { qc.invalidateQueries({ queryKey: ["task-comments", taskId] }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [taskId, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  const canDelete = (comment: TaskComment) =>
    comment.user_id === user?.id || membership?.role === "owner" || membership?.role === "admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !user) return;
    setSubmitting(true);
    await supabase.from("task_comments").insert({ task_id: taskId, user_id: user.id, body: body.trim() });
    setBody("");
    qc.invalidateQueries({ queryKey: ["task-comments", taskId] });
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("task_comments").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["task-comments", taskId] });
  };

  return (
    <div className="border-t border-border px-6 py-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        Comments {comments.length > 0 && <span className="text-xs font-normal text-muted-foreground">({comments.length})</span>}
      </div>
      <div className="mb-3 max-h-52 space-y-2.5 overflow-y-auto">
        {comments.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">No comments yet. Be the first!</p>
        )}
        {comments.map((c) => {
          const name = c.profiles?.full_name || c.profiles?.email || "Unknown";
          const initials = name.slice(0, 2).toUpperCase();
          const ts = new Date(c.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
          return (
            <div key={c.id} className="group flex gap-2.5">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700">
                {initials}
              </div>
              <div className="flex-1 rounded-xl bg-muted/40 px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold">{name}</span>
                  <span className="text-[10px] text-muted-foreground">{ts}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-xs text-foreground">{c.body}</p>
              </div>
              {canDelete(c) && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="self-start pt-2 opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment…"
          className="input-field flex-1 text-sm"
          disabled={submitting}
          data-testid="comment-input"
        />
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40"
          data-testid="comment-submit"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

// ── TaskAttachments ───────────────────────────────────────────────────────────

type TaskAttachment = {
  id: string;
  task_id: string;
  storage_path: string;
  filename: string;
  size: number;
  uploaded_by: string | null;
  created_at: string;
  uploader_name?: string | null;
};

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];
const MAX_MB = 20;

function TaskAttachments({ taskId }: { taskId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: attachments = [] } = useQuery({
    queryKey: ["task-attachments", taskId],
    queryFn: async () => {
      const { data } = await supabase
        .from("task_attachments")
        .select("*, profiles(full_name, email)")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });
      return (data ?? []).map((a: any) => ({
        ...a,
        uploader_name: a.profiles?.full_name || a.profiles?.email || null,
      })) as TaskAttachment[];
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !user) return;

    const oversized = files.filter((f) => f.size > MAX_MB * 1024 * 1024);
    if (oversized.length) {
      toast.error(`File too large — max ${MAX_MB} MB per file`);
      e.target.value = "";
      return;
    }
    const invalid = files.filter((f) => !ALLOWED_TYPES.includes(f.type));
    if (invalid.length) {
      toast.error("Unsupported file type");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      for (const file of files) {
        const path = `${taskId}/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("task-attachments")
          .upload(path, file, { upsert: false });
        if (uploadErr) throw uploadErr;
        await supabase.from("task_attachments").insert({
          task_id: taskId,
          storage_path: path,
          filename: file.name,
          size: file.size,
          uploaded_by: user.id,
        });
      }
      toast.success(`${files.length} file(s) attached`);
      qc.invalidateQueries({ queryKey: ["task-attachments", taskId] });
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (att: TaskAttachment) => {
    if (!confirm(`Remove ${att.filename}?`)) return;
    await supabase.storage.from("task-attachments").remove([att.storage_path]);
    await supabase.from("task_attachments").delete().eq("id", att.id);
    qc.invalidateQueries({ queryKey: ["task-attachments", taskId] });
    toast.success("Attachment removed");
  };

  const getSignedUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from("task-attachments")
      .createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="border-t border-border px-6 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          Attachments {attachments.length > 0 && <span className="text-xs font-normal text-muted-foreground">({attachments.length})</span>}
        </div>
        <label className="flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-primary-50 hover:text-primary-700">
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Uploading…" : "Attach"}
          <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp,.svg" className="hidden" disabled={uploading} onChange={handleUpload} />
        </label>
      </div>
      {attachments.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground">No attachments yet</p>
      ) : (
        <div className="space-y-1.5">
          {attachments.map((a) => (
            <div key={a.id} className="group flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs">
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <button onClick={() => getSignedUrl(a.storage_path)} className="flex-1 truncate text-left font-medium hover:text-primary-600 hover:underline">
                {a.filename}
              </button>
              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">{(a.size / 1024).toFixed(0)} KB</span>
              {a.uploader_name && <span className="hidden truncate text-muted-foreground sm:block">· {a.uploader_name}</span>}
              {(a.uploaded_by === user?.id) && (
                <button onClick={() => handleDelete(a)} className="opacity-0 transition group-hover:opacity-100 hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}