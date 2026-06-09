import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, Check, ChevronDown, GripVertical, Loader2, Plus, Save, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { pushNotification } from "@/lib/notifications";
import {
  DEFAULT_PROCESS_STAGES,
  estimatedHoursFor,
  type ColumnRecord,
  type TaskRecord,
} from "@/lib/task-model";

export type MemberOption = { user_id: string; full_name: string | null };

interface Props {
  boardId: string | null;
  userId: string;
  orgId: string;
  columns: ColumnRecord[];
  tasks: TaskRecord[];
  members?: MemberOption[];
  onChange: () => void;
}

export function KanbanBoard({ boardId, userId, orgId, columns, tasks: initialTasks, members = [], onChange }: Props) {
  const [tasks, setTasks] = useState<TaskRecord[]>(sortTasks(initialTasks));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const dragSnapshotRef = useRef<TaskRecord[]>(sortTasks(initialTasks));

  useEffect(() => {
    if (activeId !== null) return;
    const next = sortTasks(initialTasks);
    dragSnapshotRef.current = next;
    setTasks(next);
  }, [initialTasks, activeId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 2 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return rectIntersection(args);
  };

  const activeTask = tasks.find((t) => t.id === activeId) ?? null;

  // Hide the "New" column — tasks are created via the modal and go directly to a chosen column
  const orderedColumns = useMemo(
    () => [...columns]
      .filter((c) => c.name.toLowerCase() !== "new")
      .sort((a, b) => a.position - b.position),
    [columns],
  );

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    dragSnapshotRef.current = tasks;
  };

  const onDragOver = (event: DragOverEvent) => {
    if (!activeId || !event.over) return;
    const overId = String(event.over.id);
    if (overId === activeId) return;
    setTasks((prev) => applyTaskMove(prev, activeId, overId, orderedColumns));
  };

  const onDragCancel = (_event: DragCancelEvent) => {
    setActiveId(null);
    setTasks(dragSnapshotRef.current);
  };

  const persistTaskOrder = async (nextTasks: TaskRecord[], affectedColumnIds: string[]) => {
    const updates = nextTasks.filter(
      (t) => affectedColumnIds.includes(t.column_id) && !t.id.startsWith("optimistic-"),
    );
    const results = await Promise.all(
      updates.map((t) =>
        supabase
          .from("tasks")
          .update({ column_id: t.column_id, position: t.position, completed_at: t.completed_at ?? null })
          .eq("id", t.id),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const draggedId = String(event.active.id);
    setActiveId(null);
    if (!event.over) { setTasks(dragSnapshotRef.current); return; }
    const nextTasks = applyTaskMove(tasks, draggedId, String(event.over.id), orderedColumns);
    setTasks(nextTasks);
    const before = dragSnapshotRef.current.find((t) => t.id === draggedId);
    const after = nextTasks.find((t) => t.id === draggedId);
    const affectedColumnIds = Array.from(
      new Set([before?.column_id, after?.column_id].filter(Boolean) as string[]),
    );
    persistTaskOrder(nextTasks, affectedColumnIds)
      .then(() => setTimeout(() => onChange(), 500))
      .catch((err: any) => {
        setTasks(dragSnapshotRef.current);
        toast.error(err?.message || "Failed to save task movement");
        onChange();
      });
  };

  const addTask = async (columnId: string, title: string, processStage: string | null, assigneeIds: string[]) => {
    if (!title.trim() || !boardId) return;
    const columnTasks = tasks.filter((t) => t.column_id === columnId);
    const position = columnTasks.length
      ? Math.max(...columnTasks.map((t) => t.position)) + 1
      : 0;
    const tempId = `optimistic-${crypto.randomUUID()}`;
    const optimisticTask: TaskRecord = {
      id: tempId,
      board_id: boardId,
      title: title.trim(),
      description: null,
      priority: "medium",
      column_id: columnId,
      position,
      process_stage: processStage,
      due_date: null,
      start_date: null,
      end_date: null,
      error_count: 0,
      files_count: null,
      created_by: userId,
      completed_at: null,
      assignee_ids: assigneeIds,
    };
    setTasks((prev) => {
      const next = sortTasks([...prev, optimisticTask]);
      dragSnapshotRef.current = next;
      return next;
    });
    const { data, error } = await supabase
      .from("tasks")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ title: title.trim(), column_id: columnId, board_id: boardId, created_by: userId, position, priority: "medium", process_stage: processStage, assignee_ids: assigneeIds } as any)
      .select()
      .single();
    if (error || !data) {
      setTasks((prev) => {
        const next = prev.filter((t) => t.id !== tempId);
        dragSnapshotRef.current = next;
        return next;
      });
      toast.error(error?.message || "Failed to add task");
      return;
    }
    const realTask = data as TaskRecord;
    setTasks((prev) => {
      const next = sortTasks(prev.map((t) => (t.id === tempId ? realTask : t)));
      dragSnapshotRef.current = next;
      return next;
    });
    if (orgId && userId) {
      pushNotification({ orgId, actorId: userId, kind: "task_created", title: `Task created: ${realTask.title}`, entityType: "task", entityId: realTask.id });
    }
    onChange();
  };

  const patchTask = useCallback((taskId: string, patch: Partial<TaskRecord>) => {
    setTasks((prev) =>
      sortTasks(prev.map((t) => (t.id !== taskId ? t : { ...t, ...patch }))),
    );
  }, []);

  const removeTask = useCallback((taskId: string) => {
    setTasks((prev) => {
      const deletedTask = prev.find((t) => t.id === taskId);
      const reindexed = reindexTasks(
        prev.filter((t) => t.id !== taskId),
        orderedColumns,
      );
      dragSnapshotRef.current = reindexed;
      const affectedColumnId = deletedTask?.column_id;
      if (affectedColumnId) {
        persistTaskOrder(reindexed, [affectedColumnId])
          .then(() => onChange())
          .catch((err: any) => {
            toast.error(err?.message || "Failed to reindex after delete");
            onChange();
          });
      } else {
        onChange();
      }
      return reindexed;
    });
  }, [orderedColumns, onChange]);

  const normalizedFilter = filterQuery.trim().toLowerCase();
  const matchesFilter = (t: TaskRecord) => {
    if (!normalizedFilter) return true;
    const haystack = `${t.title} ${t.description ?? ""} ${t.process_stage ?? ""}`.toLowerCase();
    return haystack.includes(normalizedFilter);
  };
  const visibleCount = normalizedFilter ? tasks.filter(matchesFilter).length : tasks.length;

  return (
    <>
      {/* Toolbar: filter + global add task button */}
      <div className="mb-4 flex flex-wrap items-center gap-3" data-testid="board-filter-bar">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") setFilterQuery(""); }}
            placeholder="Filter cards by title, process or description…"
            className="input-field h-10 w-full pl-9 pr-9 text-sm"
            aria-label="Filter tasks"
          />
          {filterQuery && (
            <button
              type="button"
              onClick={() => setFilterQuery("")}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Clear filter"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {filterQuery && (
          <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 ring-1 ring-primary-200">
            {visibleCount} of {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
          </span>
        )}
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary ml-auto inline-flex items-center gap-2 text-sm"
        >
          <Plus className="h-4 w-4" /> Add Task
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragCancel={onDragCancel}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-6" style={{ alignItems: "flex-start" }}>
          {orderedColumns.map((column) => {
            const items = tasks
              .filter((t) => t.column_id === column.id && matchesFilter(t))
              .sort((a, b) => a.position - b.position);
            return (
              <ColumnDroppable
                key={column.id}
                id={column.id}
                count={items.length}
                name={column.name}
                color={column.color}
              >
                <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="min-h-[40px] space-y-3">
                    {items.map((t) => (
                      <SortableTaskCard
                        key={t.id}
                        task={t}
                        column={column}
                        members={members}
                        orgId={orgId}
                        userId={userId}
                        onSaved={patchTask}
                        onDeleted={removeTask}
                      />
                    ))}
                    {items.length === 0 && (
                      <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                        {normalizedFilter ? "No matches" : "No tasks yet"}
                      </div>
                    )}
                  </div>
                </SortableContext>
              </ColumnDroppable>
            );
          })}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? <DragGhost task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      {showAddModal && (
        <AddTaskModal
          columns={orderedColumns}
          members={members}
          onAdd={async (columnId, title, processStage, assigneeIds) => {
            await addTask(columnId, title, processStage, assigneeIds);
            setShowAddModal(false);
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </>
  );
}

// ── Add Task Modal ────────────────────────────────────────────────────────────

function AddTaskModal({
  columns,
  members,
  onAdd,
  onClose,
}: {
  columns: ColumnRecord[];
  members: MemberOption[];
  onAdd: (columnId: string, title: string, processStage: string | null, assigneeIds: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [columnId, setColumnId] = useState(columns[0]?.id ?? "");
  const [processStage, setProcessStage] = useState<string>("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!title.trim() || !columnId) return;
    setSaving(true);
    await onAdd(columnId, title, processStage || null, assigneeIds);
    setSaving(false);
  };

  const toggleAssignee = (id: string) =>
    setAssigneeIds((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold">Add Task</h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title…"
              className="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </div>

          {/* Column */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Column <span className="text-red-500">*</span>
            </label>
            <select
              value={columnId}
              onChange={(e) => setColumnId(e.target.value)}
              className="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Process stage */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Process Stage
            </label>
            <select
              value={processStage}
              onChange={(e) => setProcessStage(e.target.value)}
              className="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            >
              <option value="">— None —</option>
              {DEFAULT_PROCESS_STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Assignees */}
          {members.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Assignees
              </label>
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                {members.map((m) => {
                  const checked = assigneeIds.includes(m.user_id);
                  return (
                    <button
                      key={m.user_id}
                      type="button"
                      onClick={() => toggleAssignee(m.user_id)}
                      className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm transition hover:bg-muted"
                    >
                      <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border transition ${checked ? "border-primary-600 bg-primary-600" : "border-border"}`}>
                        {checked && <Check className="h-3 w-3 text-white" />}
                      </span>
                      <span className="truncate">{m.full_name ?? `User …${m.user_id.slice(-6)}`}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 border-t border-border pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim() || !columnId}
              className="btn-primary flex flex-1 items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? "Adding…" : "Add Task"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── Drag ghost (lightweight overlay while dragging) ───────────────────────────

function DragGhost({ task }: { task: TaskRecord }) {
  const hrs = estimatedHoursFor(task.files_count, task.process_stage);
  return (
    <div className="w-48 rotate-2 scale-105 rounded-xl border border-primary-300 bg-white p-3 shadow-2xl ring-2 ring-primary-500/40 backdrop-blur-sm">
      <p className="truncate text-sm font-semibold text-foreground">{task.title}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {task.process_stage ? (
          <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700 ring-1 ring-primary-200">
            {task.process_stage}
          </span>
        ) : null}
        {hrs ? (
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
            {hrs} hrs
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ── SortableTaskCard ──────────────────────────────────────────────────────────

function SortableTaskCard({
  task,
  column,
  members,
  orgId,
  userId,
  onSaved,
  onDeleted,
}: {
  task: TaskRecord;
  column: ColumnRecord;
  members: MemberOption[];
  orgId: string;
  userId: string;
  onSaved: (taskId: string, patch: Partial<TaskRecord>) => void;
  onDeleted: (taskId: string) => void;
}) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: task.id,
      transition: { duration: 0, easing: "linear" },
    });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0 : 1 }}
    >
      <KanbanTaskCard
        task={task}
        column={column}
        members={members}
        orgId={orgId}
        userId={userId}
        onSaved={onSaved}
        onDeleted={onDeleted}
        dragHandle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="grid h-5 w-4 shrink-0 cursor-grab place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
            aria-label={`Drag ${task.title}`}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        }
      />
    </div>
  );
}

// ── KanbanTaskCard ────────────────────────────────────────────────────────────

const FIELD_CLS =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 disabled:opacity-50";

const LABEL_CLS = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground";

function KanbanTaskCard({
  task,
  column,
  members,
  dragHandle,
  orgId,
  userId,
  onSaved,
  onDeleted,
}: {
  task: TaskRecord;
  column: ColumnRecord;
  members: MemberOption[];
  dragHandle?: React.ReactNode;
  orgId: string;
  userId: string;
  onSaved: (taskId: string, patch: Partial<TaskRecord>) => void;
  onDeleted: (taskId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<TaskRecord>(() => ({ ...task }));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Collapse on outside click
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expanded]);

  // Sync position/column after drags without clobbering unsaved edits
  useEffect(() => {
    setDraft((prev) => ({ ...prev, column_id: task.column_id, position: task.position }));
  }, [task.column_id, task.position]);

  const patch = <K extends keyof TaskRecord>(key: K, value: TaskRecord[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const estimatedHours = useMemo(
    () => estimatedHoursFor(draft.files_count, draft.process_stage),
    [draft.files_count, draft.process_stage],
  );

  const isOptimistic = task.id.startsWith("optimistic-");

  const cardStyle = useMemo(() => {
    const n = column.name.toLowerCase();
    if (n === "in progress") return { bg: "bg-blue-50",    border: "border-blue-200",    left: "bg-blue-400" };
    if (n === "on hold") return { bg: "bg-amber-50",  border: "border-amber-200",  left: "bg-amber-400" };
    if (n === "error"      || n === "errors")  return { bg: "bg-red-50",    border: "border-red-200",    left: "bg-red-400" };
    if (n === "done")                          return { bg: "bg-emerald-50", border: "border-emerald-200", left: "bg-emerald-400" };
    return { bg: "bg-white", border: "border-border", left: "bg-muted-foreground/30" };
  }, [column.name]);

  const isOverdue = useMemo(() => {
    if (!task.due_date || task.completed_at) return false;
    const due = new Date(task.due_date); due.setHours(0, 0, 0, 0);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return due < now;
  }, [task.due_date, task.completed_at]);

  const handleSave = async () => {
    if (isOptimistic) return;
    setSaving(true);
    try {
      // Build payload with all editable fields; cast to any because generated
      // types predate the start_date / end_date / error_count / assignee_ids migrations.
      const payload = {
        title: draft.title.trim() || task.title,
        process_stage: draft.process_stage ?? null,
        region: draft.region ?? null,
        due_date: draft.due_date ?? null,
        start_date: draft.start_date ?? null,
        end_date: draft.end_date ?? null,
        files_count: draft.files_count ?? null,
        error_count: draft.error_count ?? 0,
        assignee_ids: draft.assignee_ids ?? [],
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("tasks").update(payload as any).eq("id", task.id);
      if (error) throw error;
      onSaved(task.id, payload as Partial<TaskRecord>);
      toast.success("Saved");
      if (orgId && userId) {
        pushNotification({ orgId, actorId: userId, kind: "task_updated", title: `Task updated: ${payload.title}`, entityType: "task", entityId: task.id });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this task?")) return;
    setDeleting(true);
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    onDeleted(task.id);
    toast.success("Task deleted");
    if (orgId && userId) {
      pushNotification({ orgId, actorId: userId, kind: "task_deleted", title: `Task deleted: ${task.title}`, entityType: "task", entityId: task.id });
    }
  };

  const stopProp = (e: React.SyntheticEvent) => e.stopPropagation();

  const assigneeIds: string[] = draft.assignee_ids ?? [];

  return (
    <div ref={cardRef} className={`relative overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md ${cardStyle.bg} ${cardStyle.border}`}>
      {/* Left accent bar */}
      <span className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${cardStyle.left}`} />

      {/* ── Always-visible header ── */}
      <div className="flex items-start gap-2.5 pl-5 pr-4 pt-4 pb-3">
        <div className="mt-1">{dragHandle ?? <span className="h-5 w-4 shrink-0" />}</div>

        <div className="min-w-0 flex-1" onPointerDown={stopProp}>
          <input
            value={draft.title}
            onChange={(e) => patch("title", e.target.value)}
            onClick={stopProp}
            placeholder="Task title"
            className="w-full bg-transparent text-sm font-semibold leading-snug text-foreground outline-none placeholder-muted-foreground focus:underline focus:decoration-primary-400"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {/* Status chip */}
            <span
              className="rounded-md bg-white px-2 py-1 text-xs font-semibold leading-none ring-1"
              style={{
                color: column.color ?? "#94a3b8",
                boxShadow: `0 0 0 1px ${column.color ?? "#94a3b8"}60`,
              }}
            >
              {column.name}
            </span>
            {/* Process stage */}
            {draft.process_stage ? (
              <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-primary-700 ring-1 ring-primary-200 break-words whitespace-normal">
                {draft.process_stage}
              </span>
            ) : (
              <span className="rounded-md bg-white px-2 py-1 text-xs text-muted-foreground ring-1 ring-border break-words whitespace-normal">
                No process
              </span>
            )}
            {/* Overdue badge */}
            {isOverdue && (
              <span className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-semibold leading-none text-red-600 ring-1 ring-red-300">
                <AlertTriangle className="h-3 w-3" /> Overdue
              </span>
            )}
            {/* Assignee initials */}
            {assigneeIds.length === 0 ? (
              <span className="rounded-md bg-white px-2 py-1 text-xs leading-none text-muted-foreground ring-1 ring-border">
                Unassigned
              </span>
            ) : (
              <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold leading-none text-violet-700 ring-1 ring-violet-200">
                {assigneeIds.map((id) =>
                  getInitials(members.find((m) => m.user_id === id)?.full_name ?? null)
                ).join(" · ")}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => { stopProp(e); setExpanded((v) => !v); }}
          onPointerDown={stopProp}
          className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          <ChevronDown
            className="h-4 w-4 transition-transform duration-200"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
      </div>

      {/* ── Expandable panel ── */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: expanded ? "1fr" : "0fr",
          transition: "grid-template-rows 220ms ease-in-out",
        }}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 border-t border-border px-4 pb-4 pt-4" onPointerDown={stopProp}>

            {/* Process + Region */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className={LABEL_CLS}>Process</span>
                <select
                  value={draft.process_stage ?? ""}
                  onChange={(e) => patch("process_stage", e.target.value || null)}
                  className={FIELD_CLS}
                >
                  <option value="">— select —</option>
                  {DEFAULT_PROCESS_STAGES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <span className={LABEL_CLS}>Region</span>
                <select
                  value={draft.region ?? ""}
                  onChange={(e) => patch("region", (e.target.value || null) as "EMEA" | "APAC" | "AMER" | null)}
                  className={FIELD_CLS}
                >
                  <option value="">— select —</option>
                  <option value="EMEA">EMEA</option>
                  <option value="APAC">APAC</option>
                  <option value="AMER">AMER</option>
                </select>
              </div>
            </div>

            {/* Est Hours */}
            <div>
              <span className={LABEL_CLS}>Est. Hours</span>
              <div className="flex h-[38px] items-center rounded-lg border border-primary-200 bg-primary-50 px-3">
                <span className="text-sm font-bold text-primary-700">
                  {estimatedHours ? `${estimatedHours} hrs` : "—"}
                </span>
              </div>
            </div>

            {/* Assignees */}
            <div>
              <span className={LABEL_CLS}>Assignees</span>
              <AssigneeMultiSelect
                value={assigneeIds}
                members={members}
                onChange={(ids) => patch("assignee_ids", ids)}
              />
            </div>

            {/* Start + End dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className={LABEL_CLS}>Start Date</span>
                <input
                  type="date"
                  value={draft.start_date ?? ""}
                  onChange={(e) => patch("start_date", e.target.value || null)}
                  className={FIELD_CLS}
                />
              </div>
              <div>
                <span className={LABEL_CLS}>End Date</span>
                <input
                  type="date"
                  value={draft.end_date ?? ""}
                  onChange={(e) => patch("end_date", e.target.value || null)}
                  className={FIELD_CLS}
                />
              </div>
            </div>

            {/* Due date */}
            <div>
              <span className={LABEL_CLS}>Due Date</span>
              <input
                type="date"
                value={draft.due_date ? draft.due_date.slice(0, 10) : ""}
                onChange={(e) =>
                  patch("due_date", e.target.value ? new Date(`${e.target.value}T12:00:00`).toISOString() : null)
                }
                className={FIELD_CLS}
              />
            </div>

            {/* Files + Errors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className={LABEL_CLS}>Files</span>
                <input
                  type="number" min="0" step="1"
                  value={draft.files_count ?? ""}
                  onChange={(e) => patch("files_count", e.target.value === "" ? null : parseInt(e.target.value, 10))}
                  placeholder="0"
                  className={FIELD_CLS}
                />
              </div>
              <div>
                <span className={LABEL_CLS}>Errors</span>
                <input
                  type="number" min="0" step="1"
                  value={draft.error_count ?? ""}
                  onChange={(e) => patch("error_count", e.target.value === "" ? 0 : parseInt(e.target.value, 10))}
                  placeholder="0"
                  className={FIELD_CLS}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <button
                onClick={handleDelete}
                disabled={deleting || saving || isOptimistic}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || deleting || isOptimistic}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AssigneeMultiSelect ───────────────────────────────────────────────────────

function AssigneeMultiSelect({
  value,
  members,
  onChange,
}: {
  value: string[];
  members: MemberOption[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  const selected = members.filter((m) => value.includes(m.user_id));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`${FIELD_CLS} flex min-h-[38px] flex-wrap items-center gap-1.5 text-left`}
      >
        {selected.length === 0 ? (
          <span className="text-sm text-muted-foreground">Unassigned</span>
        ) : (
          selected.map((m) => (
            <span
              key={m.user_id}
              className="rounded-md bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-800"
            >
              {getInitials(m.full_name)}
            </span>
          ))
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-xl">
          {members.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">No members found</p>
          ) : (
            members.map((m) => {
              const checked = value.includes(m.user_id);
              return (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggle(m.user_id); }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-muted"
                >
                  <span
                    className={`grid h-4 w-4 shrink-0 place-items-center rounded border transition ${
                      checked ? "border-primary-600 bg-primary-600" : "border-border bg-transparent"
                    }`}
                  >
                    {checked && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span className="truncate">{m.full_name ?? `User …${m.user_id.slice(-6)}`}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

// ── ColumnDroppable ───────────────────────────────────────────────────────────

function ColumnDroppable({
  id, name, color, count, children,
}: {
  id: string;
  name: string;
  color: string | null;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-2xl border bg-white p-4 transition-all duration-150 ${
        isOver
          ? "border-primary-300 shadow-lg ring-2 ring-primary-500/50"
          : "border-border shadow-sm"
      }`}
    >
      <div className="mb-4 flex items-center gap-2.5">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: color ?? "#94a3b8" }} />
        <span className="flex-1 text-sm font-semibold tracking-tight">{name}</span>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function applyTaskMove(
  tasks: TaskRecord[],
  activeId: string,
  overId: string,
  columns: ColumnRecord[],
): TaskRecord[] {
  if (activeId === overId) return tasks;
  const activeTask = tasks.find((t) => t.id === activeId);
  if (!activeTask) return tasks;
  const overColumn = columns.find((c) => c.id === overId);
  const overTask = tasks.find((t) => t.id === overId);
  const targetColumnId = overColumn?.id ?? overTask?.column_id;
  if (!targetColumnId) return tasks;
  const sourceColumnId = activeTask.column_id;
  const grouped = new Map<string, TaskRecord[]>();
  columns.forEach((c) =>
    grouped.set(c.id, tasks.filter((t) => t.column_id === c.id).sort((a, b) => a.position - b.position)),
  );
  const sourceTasks = [...(grouped.get(sourceColumnId) ?? [])].filter((t) => t.id !== activeId);
  const targetTasks = sourceColumnId === targetColumnId ? sourceTasks : [...(grouped.get(targetColumnId) ?? [])];
  const targetIndex = overTask ? targetTasks.findIndex((t) => t.id === overTask.id) : targetTasks.length;
  const insertAt = targetIndex >= 0 ? targetIndex : targetTasks.length;
  const doneColumn = columns.find((c) => c.id === targetColumnId)?.name.toLowerCase().includes("done");
  const movedTask: TaskRecord = {
    ...activeTask,
    column_id: targetColumnId,
    completed_at: doneColumn ? (activeTask.completed_at ?? new Date().toISOString()) : null,
  };
  targetTasks.splice(insertAt, 0, movedTask);
  grouped.set(sourceColumnId, assignPositions(sourceTasks));
  grouped.set(targetColumnId, assignPositions(targetTasks));
  return reindexTasks(columns.flatMap((c) => grouped.get(c.id) ?? []), columns);
}

function assignPositions(tasks: TaskRecord[]) {
  return tasks.map((t, i) => ({ ...t, position: i }));
}

function reindexTasks(tasks: TaskRecord[], columns: ColumnRecord[]) {
  const grouped = new Map<string, TaskRecord[]>();
  columns.forEach((c) => grouped.set(c.id, []));
  tasks.forEach((t) => {
    const list = grouped.get(t.column_id) ?? [];
    list.push(t);
    grouped.set(t.column_id, list);
  });
  return columns.flatMap((c) =>
    (grouped.get(c.id) ?? [])
      .sort((a, b) => a.position - b.position)
      .map((t, i) => ({ ...t, position: i })),
  );
}

function sortTasks(tasks: TaskRecord[]) {
  return [...tasks].sort((a, b) => {
    if (a.column_id === b.column_id) return a.position - b.position;
    return a.column_id.localeCompare(b.column_id);
  });
}
