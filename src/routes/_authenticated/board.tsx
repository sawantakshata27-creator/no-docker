import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/board")({ component: BoardPage });

export type Column = { id: string; name: string; color: string | null; position: number };
export type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  column_id: string;
  position: number;
  process_stage: string | null;
  due_date: string | null;
};

function BoardPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [boardId, setBoardId] = useState<string | null>(null);

  // Load first board
  useEffect(() => {
    if (!user) return;
    supabase.from("boards").select("id").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle()
      .then(({ data }) => setBoardId(data?.id ?? null));
  }, [user]);

  const { data: columns } = useQuery({
    queryKey: ["columns", boardId],
    enabled: !!boardId,
    queryFn: async () => {
      const { data } = await supabase.from("board_columns").select("*").eq("board_id", boardId!).order("position");
      return (data ?? []) as Column[];
    },
  });

  const { data: tasks } = useQuery({
    queryKey: ["tasks", boardId],
    enabled: !!boardId,
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*").eq("board_id", boardId!).order("position");
      return (data ?? []) as Task[];
    },
  });

  const ready = boardId && columns && tasks;

  const refetch = useMemo(() => () => {
    qc.invalidateQueries({ queryKey: ["tasks", boardId] });
    qc.invalidateQueries({ queryKey: ["columns", boardId] });
  }, [qc, boardId]);

  if (!ready) {
    return <div className="grid h-96 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary-600" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Board</h1>
          <p className="text-sm text-muted-foreground">Drag cards across stages — Jira-style.</p>
        </div>
      </div>
      <KanbanBoard
        boardId={boardId!}
        userId={user!.id}
        columns={columns!}
        tasks={tasks!}
        onChange={refetch}
      />
    </div>
  );
}
