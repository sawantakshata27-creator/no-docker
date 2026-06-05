import { useEffect, useMemo, useRef, useState } from "react";
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
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, GripVertical, Plus, Search, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TaskDetailsDrawer } from "@/components/tasks/TaskDetailsDrawer";
import { priorityClass, type ColumnRecord, type TaskRecord } from "@/lib/task-model";

interface Props {
  boardId: string;
  userId: string;
  columns: ColumnRecord[];
  tasks: TaskRecord[];
  onChange: () => void;
}

export function KanbanBoard({ boardId, userId, columns, tasks: initialTasks, onChange }: Props) {
  const [tasks, setTasks] = useState<TaskRecord[]>(sortTasks(initialTasks));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const dragSnapshotRef = useRef<TaskRecord[]>(sortTasks(initialTasks));

  useEffect(() => {
    if (activeId !== null) return;
    const next = sortTasks(initialTasks);
    dragSnapshotRef.current = next;
    setTasks(next);
  }, [initialTasks, activeId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Custom collision: prefer card targets, fall back to columns
  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return rectIntersection(args);
  };

  const activeTask = tasks.find((task) => task.id === activeId) ?? null;
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const orderedColumns = useMemo(
    () => [...columns].sort((a, b) => a.position - b.position),
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
    const updates = nextTasks.filter((task) => affectedColumnIds.includes(task.column_id));
    const results = await Promise.all(
      updates.map((task) =>
        supabase
          .from("tasks")
          .update({
            column_id: task.column_id,
            position: task.position,
            completed_at: task.completed_at ?? null,
          })
          .eq("id", task.id),
      ),
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const draggedTaskId = String(event.active.id);
    setActiveId(null);

    if (!event.over) {
      setTasks(dragSnapshotRef.current);
      return;
    }

    const nextTasks = applyTaskMove(tasks, draggedTaskId, String(event.over.id), orderedColumns);
    setTasks(nextTasks);

    const before = dragSnapshotRef.current.find((task) => task.id === draggedTaskId);
    const after = nextTasks.find((task) => task.id === draggedTaskId);
    const affectedColumnIds = Array.from(
      new Set([before?.column_id, after?.column_id].filter(Boolean) as string[]),
    );

    // Persist in background without blocking UI
    persistTaskOrder(nextTasks, affectedColumnIds)
      .then(() => {
        // Debounced onChange to avoid too many refetches
        setTimeout(() => onChange(), 500);
      })
      .catch((error: any) => {
        setTasks(dragSnapshotRef.current);
        toast.error(error?.message || "Failed to save task movement");
        onChange();
      });
  };

  const addTask = async (columnId: string) => {
    const title = newTitle.trim();
    if (!title) return;

    // Compute next position from the current MAX in the column (not count).
    // This is collision-proof even when previous deletes left gaps in the
    // position sequence on the backend (deletes only reindex frontend state).
    const columnTasks = tasks.filter((task) => task.column_id === columnId);
    const position = columnTasks.length
      ? Math.max(...columnTasks.map((task) => task.position)) + 1
      : 0;
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title,
        column_id: columnId,
        board_id: boardId,
        created_by: userId,
        position,
        priority: "medium",
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    const nextTask = data as TaskRecord;
    setTasks((prev) => sortTasks([...prev, nextTask]));
    dragSnapshotRef.current = sortTasks([...tasks, nextTask]);
    setAddingTo(null);
    setNewTitle("");
    setSelectedTaskId(nextTask.id);
    onChange();
  };

  const patchTask = (taskId: string, patch: Partial<TaskRecord>) => {
    setTasks((prev) =>
      sortTasks(
        prev.map((task) => {
          if (task.id !== taskId) return task;
          return { ...task, ...patch };
        }),
      ),
    );
  };

  const removeTask = (taskId: string) => {
    setTasks((prev) =>
      reindexTasks(
        prev.filter((task) => task.id !== taskId),
        orderedColumns,
      ),
    );
    dragSnapshotRef.current = reindexTasks(
      tasks.filter((task) => task.id !== taskId),
      orderedColumns,
    );
    setSelectedTaskId((current) => (current === taskId ? null : current));
    onChange();
  };

  const normalizedFilter = filterQuery.trim().toLowerCase();
  const matchesFilter = (task: TaskRecord) => {
    if (!normalizedFilter) return true;
    const haystack = `${task.title} ${task.description ?? ""} ${task.process_stage ?? ""}`.toLowerCase();
    return haystack.includes(normalizedFilter);
  };
  const visibleCount = normalizedFilter ? tasks.filter(matchesFilter).length : tasks.length;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3" data-testid="board-filter-bar">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={filterQuery}
            onChange={(event) => setFilterQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setFilterQuery("");
            }}
            placeholder="Filter cards by title or description..."
            className="input-field h-10 w-full pl-9 pr-9 text-sm"
            data-testid="board-filter-input"
            aria-label="Filter tasks"
          />
          {filterQuery ? (
            <button
              type="button"
              onClick={() => setFilterQuery("")}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Clear filter"
              title="Clear filter (Esc)"
              data-testid="board-filter-clear-btn"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {filterQuery ? (
          <span
            className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 ring-1 ring-primary-200"
            data-testid="board-filter-count"
          >
            {visibleCount} of {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
          </span>
        ) : null}
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragCancel={onDragCancel}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-5 overflow-x-auto pb-6">
          {orderedColumns.map((column) => {
            const items = tasks
              .filter((task) => task.column_id === column.id && matchesFilter(task))
              .sort((a, b) => a.position - b.position);
            return (
              <ColumnDroppable
                key={column.id}
                id={column.id}
                count={items.length}
                name={column.name}
                color={column.color}
              >
                <SortableContext
                  items={items.map((task) => task.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="min-h-[40px] space-y-2.5">
                    {items.map((task) => (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        onOpen={() => setSelectedTaskId(task.id)}
                        selected={selectedTaskId === task.id}
                      />
                    ))}
                    {items.length === 0 && normalizedFilter ? (
                      <div
                        className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground"
                        data-testid={`board-filter-empty-${column.id}`}
                      >
                        No matches
                      </div>
                    ) : null}
                  </div>
                </SortableContext>

                {addingTo === column.id ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      autoFocus
                      value={newTitle}
                      onChange={(event) => setNewTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          addTask(column.id);
                        }
                        if (event.key === "Escape") {
                          setAddingTo(null);
                          setNewTitle("");
                        }
                      }}
                      className="input-field min-h-[70px] text-sm resize-none"
                      placeholder="What needs doing?"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => addTask(column.id)}
                        className="btn-primary py-2 text-xs font-semibold"
                      >
                        Add Card
                      </button>
                      <button
                        onClick={() => {
                          setAddingTo(null);
                          setNewTitle("");
                        }}
                        className="rounded-lg px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingTo(column.id)}
                    className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Add card
                  </button>
                )}
              </ColumnDroppable>
            );
          })}
        </div>

        <DragOverlay 
          dropAnimation={{
            duration: 150,
            easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          }}
        >
          {activeTask ? <TaskCard task={activeTask} dragging /> : null}
        </DragOverlay>
      </DndContext>

      <TaskDetailsDrawer
        open={!!selectedTask}
        task={selectedTask}
        columns={orderedColumns}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(null);
        }}
        onTaskPatched={patchTask}
        onTaskDeleted={removeTask}
        onPersistError={onChange}
      />
    </>
  );
}

function applyTaskMove(
  tasks: TaskRecord[],
  activeId: string,
  overId: string,
  columns: ColumnRecord[],
) {
  if (activeId === overId) return tasks;

  const activeTask = tasks.find((task) => task.id === activeId);
  if (!activeTask) return tasks;

  const overColumn = columns.find((column) => column.id === overId);
  const overTask = tasks.find((task) => task.id === overId);
  const targetColumnId = overColumn?.id ?? overTask?.column_id;
  if (!targetColumnId) return tasks;

  const sourceColumnId = activeTask.column_id;
  const grouped = new Map<string, TaskRecord[]>();
  columns.forEach((column) =>
    grouped.set(
      column.id,
      tasks.filter((task) => task.column_id === column.id).sort((a, b) => a.position - b.position),
    ),
  );

  const sourceTasks = [...(grouped.get(sourceColumnId) ?? [])].filter(
    (task) => task.id !== activeId,
  );
  const targetTasks =
    sourceColumnId === targetColumnId ? sourceTasks : [...(grouped.get(targetColumnId) ?? [])];

  const targetIndex = overTask
    ? targetTasks.findIndex((task) => task.id === overTask.id)
    : targetTasks.length;
  const insertAt = targetIndex >= 0 ? targetIndex : targetTasks.length;
  const doneColumn = columns
    .find((column) => column.id === targetColumnId)
    ?.name.toLowerCase()
    .includes("done");
  const movedTask: TaskRecord = {
    ...activeTask,
    column_id: targetColumnId,
    completed_at: doneColumn ? (activeTask.completed_at ?? new Date().toISOString()) : null,
  };

  targetTasks.splice(insertAt, 0, movedTask);
  grouped.set(sourceColumnId, assignPositions(sourceTasks));
  grouped.set(targetColumnId, assignPositions(targetTasks));

  return reindexTasks(
    columns.flatMap((column) => grouped.get(column.id) ?? []),
    columns,
  );
}

function assignPositions(tasks: TaskRecord[]) {
  return tasks.map((task, index) => ({ ...task, position: index }));
}

function reindexTasks(tasks: TaskRecord[], columns: ColumnRecord[]) {
  const grouped = new Map<string, TaskRecord[]>();
  columns.forEach((column) => grouped.set(column.id, []));
  tasks.forEach((task) => {
    const list = grouped.get(task.column_id) ?? [];
    list.push(task);
    grouped.set(task.column_id, list);
  });

  return columns.flatMap((column) =>
    (grouped.get(column.id) ?? [])
      .sort((a, b) => a.position - b.position)
      .map((task, index) => ({ ...task, position: index })),
  );
}

function sortTasks(tasks: TaskRecord[]) {
  return [...tasks].sort((a, b) => {
    if (a.column_id === b.column_id) return a.position - b.position;
    return a.column_id.localeCompare(b.column_id);
  });
}

function ColumnDroppable({
  id,
  name,
  color,
  count,
  children,
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
      className={`flex w-[320px] shrink-0 flex-col rounded-2xl border bg-muted/30 p-4 transition-all duration-150 ${isOver ? "ring-2 ring-primary-500/50 bg-primary-50/60 border-primary-300 shadow-lg" : "border-border shadow-sm"}`}
    >
      <div className="mb-4 flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 rounded-full shadow-sm" style={{ background: color ?? "#94a3b8" }} />
          <span className="text-sm font-semibold tracking-tight">{name}</span>
          <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground shadow-sm">
            {count}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}

function SortableTaskCard({
  task,
  onOpen,
  selected,
}: {
  task: TaskRecord;
  onOpen: () => void;
  selected: boolean;
}) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id,
    transition: {
      duration: 200,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        selected={selected}
        onOpen={onOpen}
        dragHandle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            onClick={(event) => event.stopPropagation()}
            className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Drag ${task.title}`}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        }
      />
    </div>
  );
}

function TaskCard({
  task,
  dragging = false,
  selected = false,
  onOpen,
  dragHandle,
}: {
  task: TaskRecord;
  dragging?: boolean;
  selected?: boolean;
  onOpen?: () => void;
  dragHandle?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(task.title); }, [task.title]);

  const commitEdit = async () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (!trimmed || trimmed === task.title) { setDraft(task.title); return; }
    await supabase.from("tasks").update({ title: trimmed }).eq("id", task.id);
  };

  return (
    <motion.div
      layout="position"
      layoutId={`task-${task.id}`}
      transition={{
        layout: { duration: 0.2, ease: [0.25, 1, 0.5, 1] }
      }}
      onClick={editing ? undefined : onOpen}
      className={`group rounded-xl border bg-card p-3.5 shadow-sm transition-all duration-150 ${onOpen && !editing ? "cursor-pointer" : ""} ${selected ? "border-primary-500 ring-2 ring-primary-500/25 shadow-md" : "border-border"} ${dragging ? "rotate-2 scale-105 shadow-2xl ring-2 ring-primary-500/50" : "hover:border-primary-400 hover:shadow-md hover:scale-[1.01]"}`}
    >
      <div className="flex items-start gap-2.5">
        {dragHandle ?? <span className="mt-0.5 h-6 w-6" />}
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              ref={inputRef}
              className="input-field py-1.5 text-sm font-medium"
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
                if (e.key === "Escape") { setDraft(task.title); setEditing(false); }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <p
              className="text-[0.9375rem] font-medium leading-snug text-foreground"
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditing(true);
                setTimeout(() => inputRef.current?.select(), 0);
              }}
              title="Double-click to rename"
            >
              {task.title}
            </p>
          )}
          {task.description && !editing ? (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{task.description}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${priorityClass(task.priority)}`}>
              {task.priority}
            </span>
            {task.process_stage ? (
              <span className="rounded-md bg-primary-50 px-2 py-1 text-[10px] font-semibold text-primary-700 ring-1 ring-primary-200">
                {task.process_stage}
              </span>
            ) : null}
            {task.due_date ? (
              <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                <Calendar className="h-3 w-3" /> {new Date(task.due_date).toLocaleDateString()}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
