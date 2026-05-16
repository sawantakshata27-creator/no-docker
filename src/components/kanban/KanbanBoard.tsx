import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
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

  // Sync external task changes via effect (not during render)
  useEffect(() => {
    if (activeId !== null) return; // never overwrite while dragging
    setTasks(initialTasks);
  }, [initialTasks, activeId]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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

    setTasks((prev) => {
      const activeT = prev.find((t) => t.id === activeIdStr);
      if (!activeT) return prev;

      // Over a column
      const overCol = columns.find((c) => c.id === overIdStr);
      if (overCol) {
        if (activeT.column_id === overCol.id) return prev;
        return prev.map((t) => (t.id === activeIdStr ? { ...t, column_id: overCol.id } : t));
      }

      // Over another task in a different column → move into that column at that task's index
      const overT = prev.find((t) => t.id === overIdStr);
      if (overT && activeT.column_id !== overT.column_id) {
        return prev.map((t) => (t.id === activeIdStr ? { ...t, column_id: overT.column_id } : t));
      }
      return prev;
    });
  };

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const activeT = tasks.find((t) => t.id === activeIdStr);
    if (!activeT) return;

    const overCol = columns.find((c) => c.id === overIdStr);
    const overT = tasks.find((t) => t.id === overIdStr);
    const targetColId = overCol?.id ?? overT?.column_id ?? activeT.column_id;

    const colTasks = tasks.filter((t) => t.column_id === targetColId);
    const oldIdx = colTasks.findIndex((t) => t.id === activeIdStr);
    const newIdx = overT
      ? colTasks.findIndex((t) => t.id === overIdStr)
      : colTasks.length - 1;
    const reordered = oldIdx >= 0 && newIdx >= 0 ? arrayMove(colTasks, oldIdx, newIdx) : colTasks;

    const next = tasks.filter((t) => t.column_id !== targetColId);
    reordered.forEach((t, i) => next.push({ ...t, position: i, column_id: targetColId }));
    setTasks(next);

    // Persist only the moved card (smaller payload, avoids RLS upsert pitfalls)
    const movedIndex = reordered.findIndex((t) => t.id === activeIdStr);
    const { error } = await supabase
      .from("tasks")
      .update({ column_id: targetColId, position: movedIndex })
      .eq("id", activeIdStr);

    // Then update siblings' positions in the destination column
    if (!error) {
      await Promise.all(
        reordered
          .filter((t) => t.id !== activeIdStr)
          .map((t, i) => {
            const pos = reordered.findIndex((x) => x.id === t.id);
            return supabase.from("tasks").update({ position: pos }).eq("id", t.id);
          })
      );
    }

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
      <DragOverlay dropAnimation={null}>{activeTask ? <TaskCard task={activeTask} dragging /> : null}</DragOverlay>
    </DndContext>
  );
}

function ColumnDroppable({ id, name, color, count, children }: { id: string; name: string; color: string | null; count: number; children: React.ReactNode }) {
  // Use plain droppable for the column container itself (sortable is wrong for the column)
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex w-[300px] shrink-0 flex-col rounded-2xl border border-border bg-muted/40 p-3 transition ${isOver ? "ring-2 ring-primary-500/40 bg-primary-50/50" : ""}`}
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
      layout="position"
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
