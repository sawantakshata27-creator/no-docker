import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, GripVertical, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Column, Task } from "@/routes/_authenticated/board";
import { motion } from "framer-motion";

interface Props {
  boardId: string;
  userId: string;
  columns: Column[];
  tasks: Task[];
  onChange: () => void;
}

export function KanbanBoard({ boardId, userId, columns, tasks: initialTasks, onChange }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  // Sync if parent data changes
  if (initialTasks !== tasks && activeId === null) {
    // shallow check by length+ids
    const aIds = initialTasks.map((t) => t.id).join(",");
    const bIds = tasks.map((t) => t.id).join(",");
    if (aIds !== bIds) setTasks(initialTasks);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const tasksByCol = (colId: string) =>
    tasks.filter((t) => t.column_id === colId).sort((a, b) => a.position - b.position);

  const activeTask = tasks.find((t) => t.id === activeId);

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    if (activeIdStr === overIdStr) return;

    const activeTask = tasks.find((t) => t.id === activeIdStr);
    if (!activeTask) return;

    // Dragging over a column container
    const overColumn = columns.find((c) => c.id === overIdStr);
    if (overColumn && activeTask.column_id !== overColumn.id) {
      setTasks((prev) => prev.map((t) => (t.id === activeIdStr ? { ...t, column_id: overColumn.id } : t)));
      return;
    }

    // Dragging over another task
    const overTask = tasks.find((t) => t.id === overIdStr);
    if (overTask && activeTask.column_id !== overTask.column_id) {
      setTasks((prev) => prev.map((t) => (t.id === activeIdStr ? { ...t, column_id: overTask.column_id } : t)));
    }
  };

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    const activeTask = tasks.find((t) => t.id === activeIdStr);
    if (!activeTask) return;

    let nextTasks = [...tasks];
    const overTask = tasks.find((t) => t.id === overIdStr);
    const targetColId = overTask?.column_id ?? activeTask.column_id;

    // Reorder within the destination column
    const colTasks = nextTasks.filter((t) => t.column_id === targetColId);
    const oldIndex = colTasks.findIndex((t) => t.id === activeIdStr);
    const newIndex = overTask ? colTasks.findIndex((t) => t.id === overIdStr) : colTasks.length - 1;

    const reordered = oldIndex >= 0 && newIndex >= 0 ? arrayMove(colTasks, oldIndex, newIndex) : colTasks;

    nextTasks = nextTasks.filter((t) => t.column_id !== targetColId);
    reordered.forEach((t, i) => nextTasks.push({ ...t, position: i }));
    setTasks(nextTasks);

    // Persist updated positions + column for the moved task and its column siblings
    const updates = reordered.map((t, i) => ({
      id: t.id,
      column_id: targetColId,
      position: i,
      board_id: boardId,
      title: t.title,
      created_by: userId,
    }));
    const { error } = await supabase.from("tasks").upsert(updates);
    if (error) {
      toast.error("Failed to save changes");
      onChange();
    }
  };

  const addTask = async (colId: string) => {
    const title = newTitle.trim();
    if (!title) return;
    setAddingTo(null);
    setNewTitle("");
    const position = tasksByCol(colId).length;
    const { data, error } = await supabase
      .from("tasks")
      .insert({ title, column_id: colId, board_id: boardId, created_by: userId, position, priority: "medium" })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setTasks((prev) => [...prev, data as Task]);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const items = tasksByCol(col.id);
          return (
            <ColumnDroppable key={col.id} id={col.id} count={items.length} name={col.name} color={col.color}>
              <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2 min-h-[40px]">
                  {items.map((t) => <SortableTaskCard key={t.id} task={t} />)}
                </div>
              </SortableContext>
              {addingTo === col.id ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addTask(col.id); } if (e.key === "Escape") { setAddingTo(null); setNewTitle(""); } }}
                    className="input-field min-h-[60px] text-sm"
                    placeholder="What needs doing?"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => addTask(col.id)} className="btn-primary py-1.5 text-xs">Add</button>
                    <button onClick={() => { setAddingTo(null); setNewTitle(""); }} className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingTo(col.id)}
                  className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                ><Plus className="h-3.5 w-3.5" /> Add card</button>
              )}
            </ColumnDroppable>
          );
        })}
      </div>
      <DragOverlay>{activeTask ? <TaskCard task={activeTask} dragging /> : null}</DragOverlay>
    </DndContext>
  );
}

function ColumnDroppable({ id, name, color, count, children }: { id: string; name: string; color: string | null; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex w-[300px] shrink-0 flex-col rounded-2xl border border-border bg-muted/40 p-3 transition ${isOver ? "ring-2 ring-primary-500/40" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: color ?? "#94a3b8" }} />
          <span className="text-sm font-semibold">{name}</span>
          <span className="rounded-full bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground">{count}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

function SortableTaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} />
    </div>
  );
}

function TaskCard({ task, dragging = false }: { task: Task; dragging?: boolean }) {
  const priorityColor: Record<string, string> = {
    high: "bg-red-50 text-red-600 border-red-100",
    medium: "bg-amber-50 text-amber-600 border-amber-100",
    low: "bg-emerald-50 text-emerald-600 border-emerald-100",
  };
  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      className={`group cursor-grab rounded-xl border border-border bg-card p-3 shadow-sm transition active:cursor-grabbing ${dragging ? "rotate-2 shadow-xl ring-2 ring-primary-500/40" : ""}`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          {task.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase ${priorityColor[task.priority] ?? priorityColor.low}`}>{task.priority}</span>
            {task.process_stage && (
              <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700">{task.process_stage}</span>
            )}
            {task.due_date && (
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Calendar className="h-3 w-3" /> {new Date(task.due_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
