import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, ListChecks, Kanban, ArrowRight, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";

interface SearchResult {
  id: string;
  title: string;
  type: "task" | "document" | "board";
  description?: string;
  route: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const { org, user } = useAuth();

  const { data: results = [] } = useQuery({
    queryKey: ["global-search", query, org?.id],
    enabled: !!query && query.length > 1 && !!org,
    queryFn: async () => {
      const results: SearchResult[] = [];

      // Search tasks
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, description, board_id")
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(5);

      tasks?.forEach((task) => {
        results.push({
          id: task.id,
          title: task.title,
          type: "task",
          description: task.description,
          route: `/tasks`,
        });
      });

      // Search documents
      const { data: docs } = await supabase
        .from("documents")
        .select("id, title")
        .eq("org_id", org!.id)
        .ilike("title", `%${query}%`)
        .limit(5);

      docs?.forEach((doc) => {
        results.push({
          id: doc.id,
          title: doc.title,
          type: "document",
          route: `/documents`,
        });
      });

      // Search boards
      const { data: boards } = await supabase
        .from("boards")
        .select("id, name")
        .eq("org_id", org!.id)
        .ilike("name", `%${query}%`)
        .limit(3);

      boards?.forEach((board) => {
        results.push({
          id: board.id,
          title: board.name,
          type: "board",
          route: `/board`,
        });
      });

      return results;
    },
  });

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    },
    [],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelected(0);
    }
  }, [open]);

  const handleSelect = (result: SearchResult) => {
    navigate({ to: result.route });
    setOpen(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "task":
        return <ListChecks className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      case "board":
        return <Kanban className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  return (
    <div>
      <motion.button
        onClick={() => setOpen(true)}
        layout
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="group flex w-full max-w-xl items-center gap-2.5 rounded-full border border-border bg-card/60 px-4 py-2 text-sm text-muted-foreground shadow-sm transition hover:border-primary-300 hover:bg-card hover:shadow-md focus:border-primary-400 focus:outline-none"
        data-testid="global-search-trigger"
      >
        <Search className="h-4 w-4 shrink-0 transition group-hover:text-primary-600" />
        <div className="flex flex-1 items-center gap-2.5 overflow-hidden">
          <span className="flex-1 truncate text-left text-muted-foreground">
            Search tasks, documents, boards…
          </span>
          <kbd className="hidden shrink-0 rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
            ⌘K
          </kbd>
        </div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-[20%] z-50 w-full max-w-2xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            >
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <Search className="h-5 w-5 text-muted-foreground" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelected(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setSelected((s) => Math.min(s + 1, results.length - 1));
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setSelected((s) => Math.max(s - 1, 0));
                    }
                    if (e.key === "Enter" && results[selected]) {
                      handleSelect(results[selected]);
                    }
                  }}
                  placeholder="Search tasks, documents, boards..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <kbd className="rounded bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">
                  ESC
                </kbd>
              </div>

              <div className="max-h-[400px] overflow-y-auto p-2">
                {query.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      Start typing to search across your workspace
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/60">
                      Tasks, documents, and boards
                    </p>
                  </div>
                ) : query.length < 2 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Type at least 2 characters
                  </div>
                ) : results.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No results found for "{query}"
                  </div>
                ) : (
                  <div className="space-y-1">
                    {results.map((result, index) => (
                      <button
                        key={result.id}
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() => setSelected(index)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                          selected === index
                            ? "bg-primary-50 text-primary-700"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                            selected === index
                              ? "bg-primary-100 text-primary-700"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {getIcon(result.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{result.title}</div>
                          {result.description && (
                            <div className="line-clamp-1 text-xs text-muted-foreground">
                              {result.description}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                            {result.type}
                          </span>
                          {selected === index && (
                            <ArrowRight className="h-4 w-4 text-primary-600" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Recent searches coming soon
                </span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
                    Select
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
