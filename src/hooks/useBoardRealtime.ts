import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to Supabase Realtime for `tasks` and `board_columns` rows
 * belonging to `boardId`. Calls `onRemoteChange` whenever another client
 * inserts, updates, or deletes a row so the board stays in sync without
 * a manual refresh. The subscription is torn down when `boardId` changes
 * or the component unmounts.
 */
export function useBoardRealtime(boardId: string | null, onRemoteChange: () => void) {
  useEffect(() => {
    if (!boardId) return;

    const channel = supabase
      .channel(`board-realtime:${boardId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `board_id=eq.${boardId}` },
        onRemoteChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "board_columns", filter: `board_id=eq.${boardId}` },
        onRemoteChange,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, onRemoteChange]);
}
