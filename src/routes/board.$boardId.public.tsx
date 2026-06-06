import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/board/$boardId/public")({
  component: PublicBoardPage,
});

function PublicBoardPage() {
  const { boardId } = Route.useParams();

  const { data: board, isLoading: boardLoading, error: boardError } = useQuery({
    queryKey: ["public-board", boardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boards")
        .select("id, name, key, is_public")
        .eq("id", boardId)
        .eq("is_public", true)
        .single();
      if (error) throw new Error("Board not found or not public");
      return data;
    },
  });

  const { data: columns } = useQuery({
    queryKey: ["public-board-columns", boardId],
    enabled: !!board,
    queryFn: async () => {
      const { data } = await supabase
        .from("board_columns")
        .select("id, name, color, position")
        .eq("board_id", boardId)
        .order("position");
      return data ?? [];
    },
  });

  const { data: tasks } = useQuery({
    queryKey: ["public-board-tasks", boardId],
    enabled: !!board,
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("id, title, priority, column_id, process_stage")
        .eq("board_id", boardId)
        .order("position");
      return data ?? [];
    },
  });

  if (boardLoading) {
    return (
      <div className="grid h-screen place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (boardError || !board) {
    return (
      <div className="grid h-screen place-items-center text-center p-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Board not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This board is not publicly available or the link is incorrect.
          </p>
        </div>
      </div>
    );
  }

  const tasksByColumn = (columns ?? []).reduce((acc: any, col: any) => {
    acc[col.id] = (tasks ?? []).filter((t: any) => t.column_id === col.id);
    return acc;
  }, {});

  const PRIORITY_COLORS: Record<string, string> = {
    high: "bg-red-50 text-red-600",
    medium: "bg-amber-50 text-amber-600",
    low: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{board.name}</h1>
            <p className="text-sm text-gray-500">Public read-only view · {board.key}</p>
          </div>
          <span className="ml-auto rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            View only
          </span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {(columns ?? []).map((col: any) => {
            const colTasks = tasksByColumn[col.id] ?? [];
            return (
              <div key={col.id} className="w-64 shrink-0 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.color }} />
                  <span className="text-sm font-semibold text-gray-800">{col.name}</span>
                  <span className="ml-auto text-xs text-gray-400">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map((task: any) => (
                    <div key={task.id} className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
                      <div className="text-xs font-medium text-gray-800 line-clamp-2">{task.title}</div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {task.priority && (
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${PRIORITY_COLORS[task.priority] ?? ""}`}>
                            {task.priority}
                          </span>
                        )}
                        {task.process_stage && (
                          <span className="text-[10px] text-gray-400">{task.process_stage}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {colTasks.length === 0 && (
                    <div className="py-4 text-center text-xs text-gray-400">No tasks</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}