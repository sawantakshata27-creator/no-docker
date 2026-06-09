import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { useAuth } from "@/lib/auth-store";
import { type ColumnRecord, type TaskRecord } from "@/lib/task-model";

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
  { name: "In Progress", position: 0, color: "#3b82f6" },
  { name: "On Hold", position: 1, color: "#f59e0b" },
  { name: "Error", position: 2, color: "#ef4444" },
  { name: "Done", position: 3, color: "#10b981" },
];

type BoardBundle = {
  board: BoardRow;
  columns: Column[];
  tasks: Task[];
} | null;

async function fetchBoardBundle(userId: string, orgId: string | undefined): Promise<BoardBundle> {
  const boardQuery = orgId
    ? supabase
        .from("boards")
        .select("id, name, key, scheduled_delivery_date, board_columns(*), tasks(*)")
        .eq("org_id", orgId)
        .order("created_at", { ascending: true })
        .limit(1)
        .single()
    : supabase
        .from("boards")
        .select("id, name, key, scheduled_delivery_date, board_columns(*), tasks(*)")
        .eq("owner_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

  const { data, error } = await boardQuery;
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  const row = data as any;
  const columns = ((row.board_columns ?? []) as Column[]).sort((a, b) => a.position - b.position);
  const tasks = ((row.tasks ?? []) as Task[]).sort((a, b) => a.position - b.position);
  return {
    board: { id: row.id, name: row.name, key: row.key, scheduled_delivery_date: row.scheduled_delivery_date },
    columns,
    tasks,
  };
}

function BoardPage() {
  const { user, org, membership } = useAuth();
  const queryClient = useQueryClient();

  const scopeKey = org?.id ?? user?.id;

  const { data: bundle, isLoading: bundleLoading, refetch: refetchBundle } = useQuery({
    queryKey: ["board-bundle", scopeKey],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: () => fetchBoardBundle(user!.id, org?.id),
  });

  const { data: members } = useQuery({
    queryKey: ["board-members", scopeKey],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      let memberIds: string[] = [];
      if (org) {
        const { data } = await supabase
          .from("organization_members")
          .select("user_id")
          .eq("org_id", org.id)
          .eq("status", "active");
        memberIds = (data ?? []).map((m) => m.user_id);
      } else {
        memberIds = [user!.id];
      }
      if (memberIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", memberIds);
      return (profiles ?? []).map((p) => ({ user_id: p.id, full_name: (p.full_name as string | null) ?? null }));
    },
  });

  const [provisioning, setProvisioning] = useState(false);
  const provisioningRef = useRef(false);

  useEffect(() => {
    if (bundleLoading || bundle !== null || bundle === undefined) return;
    if (provisioningRef.current) return;
    provisioningRef.current = true;
    setProvisioning(true);
    (async () => {
      try {
        const boardName = org?.name ? `${org.name} Board` : "My Board";
        const { data: newBoard, error: boardErr } = await supabase
          .from("boards")
          .insert((org
            ? { name: boardName, key: "MAIN", org_id: org.id, owner_id: user!.id }
            : { name: boardName, key: "MAIN", org_id: null, owner_id: user!.id }
          ) as any)
          .select("id")
          .single();
        if (boardErr || !newBoard) throw boardErr ?? new Error("Board insert returned no data");
        const { error: colErr } = await supabase
          .from("board_columns")
          .insert(DEFAULT_COLUMNS.map((c) => ({ ...c, board_id: newBoard.id })));
        if (colErr) throw colErr;
        await refetchBundle();
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to set up board");
        provisioningRef.current = false;
      } finally {
        setProvisioning(false);
      }
    })();
  }, [bundle, bundleLoading, org, user, refetchBundle]);

  const seedingRef = useRef(false);
  const [seedingColumns, setSeedingColumns] = useState(false);

  useEffect(() => {
    if (!bundle || bundle.columns.length > 0 || seedingRef.current) return;
    seedingRef.current = true;
    setSeedingColumns(true);
    supabase
      .from("board_columns")
      .insert(DEFAULT_COLUMNS.map((c) => ({ ...c, board_id: bundle.board.id })))
      .then(async ({ error }) => {
        if (error) { toast.error(error.message ?? "Failed to create default columns"); seedingRef.current = false; setSeedingColumns(false); return; }
        await refetchBundle();
        setSeedingColumns(false);
      });
  }, [bundle, refetchBundle]);

  const refetch = useMemo(
    () => async () => {
      await refetchBundle();
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-tasks"] });
    },
    [refetchBundle, queryClient],
  );

  const isLoading = bundleLoading || provisioning || seedingColumns;

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-3 pb-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex min-w-0 flex-col gap-2">
              <div className="h-9 animate-pulse rounded-xl bg-muted" />
              {[0, 1, 2].map((j) => <div key={j} className="h-20 animate-pulse rounded-xl bg-muted" />)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const board = bundle?.board ?? null;
  const columns = bundle?.columns ?? [];
  const tasks = bundle?.tasks ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Board</h1>
        <p className="text-sm text-muted-foreground">
          Open cards, quick-edit details, and drag tasks across workflow stages.
        </p>
      </div>
      <KanbanBoard
        boardId={board?.id ?? null}
        userId={user!.id}
        orgId={org?.id ?? ""}
        columns={columns}
        tasks={tasks}
        members={members ?? []}
        onChange={refetch}
      />
    </div>
  );
}

