import { supabase } from "@/integrations/supabase/client";

type NotifKind =
  | "task_created"
  | "task_updated"
  | "task_deleted"
  | "file_uploaded"
  | "file_deleted"
  | "note_created"
  | "note_updated"
  | "note_deleted";

const ROUTE: Record<NotifKind, string> = {
  task_created: "/board",
  task_updated: "/board",
  task_deleted: "/board",
  file_uploaded: "/documents",
  file_deleted: "/documents",
  note_created: "/documents",
  note_updated: "/documents",
  note_deleted: "/documents",
};

const SUBTITLE: Record<NotifKind, string> = {
  task_created: "New task added to Kanban",
  task_updated: "Task details updated",
  task_deleted: "Task removed from board",
  file_uploaded: "File added to Documents",
  file_deleted: "File removed from Documents",
  note_created: "New note created in Documents",
  note_updated: "Note saved in Documents",
  note_deleted: "Note deleted from Documents",
};

export async function pushNotification({
  orgId,
  actorId,
  kind,
  title,
  entityType,
  entityId,
}: {
  orgId: string;
  actorId: string;
  kind: NotifKind;
  title: string;
  entityType?: string;
  entityId?: string;
}) {
  await (supabase as any).from("notifications").insert({
    org_id: orgId,
    actor_id: actorId,
    kind,
    title,
    subtitle: SUBTITLE[kind],
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    route: ROUTE[kind],
  });
}
