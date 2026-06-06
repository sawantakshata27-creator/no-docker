import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { motion, AnimatePresence } from "framer-motion";

type Msg = { role: "user" | "bot"; text: string };

const GREET = "👋 Hi! I'm your PM Bot. Ask me about tasks, overdue items, sprint progress, or team assignments.";

const SUGGESTIONS = [
  "How many tasks are overdue?",
  "What's the sprint progress?",
  "Who has the most tasks?",
  "How many tasks are in Error?",
  "How many tasks were completed this week?",
];

async function handleQuery(input: string, userId: string, orgId: string | null): Promise<string> {
  const q = input.toLowerCase();

  // Fetch tasks for context
  const boardQ = orgId
    ? supabase.from("tasks").select("id, title, priority, due_date, assignee_id, completed_at, board_columns(name), boards!inner(org_id)").eq("boards.org_id", orgId)
    : supabase.from("tasks").select("id, title, priority, due_date, assignee_id, completed_at, board_columns(name), boards!inner(owner_id)").eq("boards.owner_id", userId);
  const { data: tasks } = await boardQ;
  if (!tasks?.length) return "I couldn't find any tasks in your workspace yet.";

  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);

  if (q.includes("overdue")) {
    const overdue = tasks.filter((t: any) => t.due_date && new Date(t.due_date) < now && t.board_columns?.name?.toLowerCase() !== "done");
    if (!overdue.length) return "✅ No tasks are overdue! Great work.";
    const list = overdue.slice(0, 5).map((t: any) => `• ${t.title}`).join("\n");
    return `⚠️ ${overdue.length} overdue task${overdue.length !== 1 ? "s" : ""}:\n${list}${overdue.length > 5 ? `\n… and ${overdue.length - 5} more` : ""}`;
  }

  if (q.includes("progress") || q.includes("sprint")) {
    const done = tasks.filter((t: any) => t.board_columns?.name?.toLowerCase() === "done").length;
    const total = tasks.length;
    const pct = total ? Math.round(done / total * 100) : 0;
    return `📊 Sprint progress: ${done}/${total} tasks done (${pct}%).\n${pct >= 80 ? "🎉 Excellent progress!" : pct >= 50 ? "⚡ More than halfway there!" : "💪 Keep going!"}`;
  }

  if (q.includes("who has the most") || q.includes("most tasks")) {
    const counts: Record<string, number> = {};
    tasks.forEach((t: any) => { if (t.assignee_id) counts[t.assignee_id] = (counts[t.assignee_id] ?? 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) return "No tasks are assigned yet.";
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", sorted.slice(0, 3).map(([id]) => id));
    const pm = (profiles ?? []).reduce((m: any, p: any) => ({ ...m, [p.id]: p.full_name }), {});
    const lines = sorted.slice(0, 3).map(([id, n]) => `• ${pm[id] ?? id.slice(0, 8)}: ${n} task${n !== 1 ? "s" : ""}`).join("\n");
    return `👥 Top assignees:\n${lines}`;
  }

  if (q.includes("error")) {
    const err = tasks.filter((t: any) => t.board_columns?.name?.toLowerCase() === "error");
    return err.length
      ? `🔴 ${err.length} task${err.length !== 1 ? "s" : ""} in Error:\n${err.slice(0, 5).map((t: any) => `• ${t.title}`).join("\n")}`
      : "✅ No tasks in the Error column right now.";
  }

  if (q.includes("completed") || q.includes("done")) {
    const comp = tasks.filter((t: any) => t.completed_at && new Date(t.completed_at) >= weekAgo);
    return `✅ ${comp.length} task${comp.length !== 1 ? "s" : ""} completed in the last 7 days.`;
  }

  if (q.includes("total") || q.includes("how many tasks")) {
    return `📋 Total tasks: ${tasks.length}`;
  }

  return "I'm not sure how to answer that yet. Try asking about overdue tasks, sprint progress, or who has the most tasks.";
}

export function PMBot() {
  const { user, org } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "bot", text: GREET }]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading || !user) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const reply = await handleQuery(msg, user.id, org?.id ?? null);
      setMsgs((m) => [...m, { role: "bot", text: reply }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating trigger */}
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-primary-600 text-white shadow-2xl hover:bg-primary-700"
        title="PM Bot"
        data-testid="pm-bot-button">
        <AnimatePresence mode="wait">
          {open
            ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X className="h-6 w-6" /></motion.span>
            : <motion.span key="b" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><Bot className="h-6 w-6" /></motion.span>
          }
        </AnimatePresence>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed bottom-24 right-6 z-50 flex w-80 sm:w-96 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            style={{ maxHeight: "70vh" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border bg-primary-600 px-4 py-3 text-white">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/20"><Bot className="h-5 w-5" /></div>
              <div>
                <div className="text-sm font-semibold">PM Bot</div>
                <div className="text-[11px] text-primary-100">Project Manager Assistant</div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "bot" && <div className="mr-2 mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-100"><MessageSquare className="h-3.5 w-3.5 text-primary-700" /></div>}
                  <div className={`max-w-[80%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm ${m.role === "user" ? "bg-primary-600 text-white rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="mr-2 mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-100"><MessageSquare className="h-3.5 w-3.5 text-primary-700" /></div>
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-muted px-3.5 py-3"><Loader2 className="h-4 w-4 animate-spin text-primary-600" /></div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggestions */}
            {msgs.length < 3 && (
              <div className="px-3 pb-1 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full border border-border px-2.5 py-1 text-[11px] hover:bg-muted transition">
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex items-center gap-2 border-t border-border p-2.5">
              <input
                value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Ask PM Bot…" className="flex-1 rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-primary-400" />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                className="grid h-9 w-9 place-items-center rounded-xl bg-primary-600 text-white disabled:opacity-50 hover:bg-primary-700">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}