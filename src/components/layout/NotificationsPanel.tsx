import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell, UserPlus, CalendarClock, CheckCircle2, X, Circle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";

type NotifItem = {
  id: string;
  kind: "join_request" | "task_overdue" | "task_due_today";
  title: string;
  subtitle: string;
  icon: typeof UserPlus;
  iconClass: string;
  to: string;
  dotClass: string;
};

/**
 * Lightweight, derived notifications panel.
 *
 * Because the project has no dedicated `notifications` table in Supabase, we
 * derive a small feed of actionable items from data we already query:
 *   - Pending join-requests (admins/owners only)
 *   - Tasks the current user owns that are overdue
 *   - Tasks the current user owns that are due today
 *
 * Read/unread state is kept locally in `localStorage` (per-user) so each
 * actionable item can be marked as read by clicking it.
 */
const READ_KEY = (uid: string) => `notif:read:${uid}`;

function loadRead(uid: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY(uid)) || "[]"));
  } catch {
    return new Set();
  }
}

function saveRead(uid: string, ids: Set<string>) {
  try {
    localStorage.setItem(READ_KEY(uid), JSON.stringify(Array.from(ids)));
  } catch {
    /* ignore */
  }
}

export function NotificationsPanel() {
  const { org, membership, user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [readVersion, setReadVersion] = useState(0);

  const isAdmin = membership?.role === "owner" || membership?.role === "admin";

  const { data: pending } = useQuery({
    queryKey: ["notif-pending", org?.id],
    enabled: !!org && isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("organization_members")
        .select("id, user_id, created_at")
        .eq("org_id", org!.id)
        .eq("status", "pending");
      const ids = (data ?? []).map((m) => m.user_id);
      const profilesRes = ids.length
        ? await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", ids)
        : { data: [] as any[] };
      const pmap: Record<string, any> = {};
      (profilesRes.data ?? []).forEach((p) => (pmap[p.id] = p));
      return (data ?? []).map((m) => ({ ...m, profile: pmap[m.user_id] }));
    },
  });

  const { data: myTasks } = useQuery({
    queryKey: ["notif-mytasks", org?.id ?? user?.id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const q = org
        ? supabase
            .from("tasks")
            .select("id, title, due_date, completed_at, board_columns!inner(name), boards!inner(org_id)")
            .eq("boards.org_id", org.id)
        : supabase
            .from("tasks")
            .select("id, title, due_date, completed_at, board_columns!inner(name), boards!inner(owner_id)")
            .eq("boards.owner_id", user!.id);
      const { data } = await q;
      return (data ?? []) as any[];
    },
  });

  const items: NotifItem[] = useMemo(() => {
    const list: NotifItem[] = [];
    (pending ?? []).forEach((m: any) => {
      list.push({
        id: `pending:${m.id}`,
        kind: "join_request",
        title: `${m.profile?.full_name ?? m.profile?.email ?? "Someone"} wants to join`,
        subtitle: "Review their request on the Team page",
        icon: UserPlus,
        iconClass: "bg-[color-mix(in_oklab,var(--accent2)_18%,transparent)] text-[var(--accent2)]",
        to: "/team",
        dotClass: "bg-[var(--accent2)]",
      });
    });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    (myTasks ?? []).forEach((t: any) => {
      if (!t.due_date || t.completed_at) return;
      const d = new Date(t.due_date); d.setHours(0, 0, 0, 0);
      const isOverdue = d.getTime() < today.getTime();
      const isToday = d.getTime() === today.getTime();
      if (!isOverdue && !isToday) return;
      list.push({
        id: `${isOverdue ? "overdue" : "today"}:${t.id}`,
        kind: isOverdue ? "task_overdue" : "task_due_today",
        title: t.title,
        subtitle: isOverdue ? "Overdue — needs your attention" : "Due today",
        icon: isOverdue ? CalendarClock : Circle,
        iconClass: isOverdue
          ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300"
          : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
        to: "/tasks",
        dotClass: isOverdue ? "bg-red-500" : "bg-amber-500",
      });
    });
    return list;
  }, [pending, myTasks]);

  const read = user ? loadRead(user.id) : new Set<string>();
  void readVersion;
  const unread = items.filter((i) => !read.has(i.id));
  const total = items.length;

  const markRead = (id: string) => {
    if (!user) return;
    const r = loadRead(user.id);
    r.add(id);
    saveRead(user.id, r);
    setReadVersion((v) => v + 1);
  };

  const markAllRead = () => {
    if (!user) return;
    const r = loadRead(user.id);
    items.forEach((i) => r.add(i.id));
    saveRead(user.id, r);
    setReadVersion((v) => v + 1);
  };

  const handleClick = (item: NotifItem) => {
    markRead(item.id);
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["notif-pending"] });
    navigate({ to: item.to });
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        data-testid="notifications-btn"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread.length > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--accent2)] px-1 text-[9px] font-bold text-white shadow-sm"
            data-testid="notifications-badge"
          >
            {unread.length > 9 ? "9+" : unread.length}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setOpen(false)}
              data-testid="notifications-backdrop"
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] as const }}
              className="absolute right-0 z-40 mt-2 w-[360px] origin-top-right overflow-hidden rounded-2xl border border-border bg-popover shadow-[0_20px_60px_-20px_rgba(7,50,60,0.35)]"
              data-testid="notifications-panel"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <div className="text-sm font-semibold">Notifications</div>
                  <div className="text-[11px] text-muted-foreground">
                    {unread.length} unread · {total} total
                  </div>
                </div>
                {total > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-primary-700 hover:underline"
                    data-testid="notifications-mark-all"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                {items.length === 0 ? (
                  <div className="grid h-32 place-items-center text-sm text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                      <span>You're all caught up</span>
                    </div>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {items.map((item) => {
                      const isRead = read.has(item.id);
                      const Icon = item.icon;
                      return (
                        <li key={item.id}>
                          <button
                            onClick={() => handleClick(item)}
                            data-testid={`notification-item-${item.kind}`}
                            className={`group flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-muted/60 ${isRead ? "opacity-65" : ""}`}
                          >
                            <div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${item.iconClass}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-foreground">
                                {item.title}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {item.subtitle}
                              </div>
                            </div>
                            {!isRead && (
                              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.dotClass}`} />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {items.length > 0 && (
                <div className="border-t border-border px-4 py-2 text-right">
                  <button
                    onClick={() => setOpen(false)}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                    aria-label="Close notifications"
                  >
                    <X className="inline h-3 w-3" /> Close
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
