import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Kanban,
  FileText,
  BarChart3,
  ListChecks,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-store";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/board", label: "Kanban", icon: Kanban },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/team", label: "Team", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { org } = useAuth();

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 248 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="sidebar-gradient sticky top-0 z-10 flex h-screen flex-col text-white"
      data-testid="app-sidebar"
    >
      <div className="relative z-10 flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15 font-display text-sm font-bold shadow-inner backdrop-blur">
          2D
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              key="logo-text"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-sm leading-tight font-semibold"
              >
                2DS Workflow
              </motion.div>
              <div className="text-[10px] leading-tight tracking-wider text-white/50 uppercase">
                Enterprise OS
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {!collapsed && org && (
          <motion.div
            key="org-badge"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="relative z-10 mx-3 mt-3 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2.5 backdrop-blur"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-[9px] font-semibold tracking-[0.18em] text-white/45 uppercase"
            >
              Workspace
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-0.5 truncate text-sm font-semibold text-white"
            >
              {org.name}
            </motion.div>
            <div className="mt-1 inline-block rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/70">
              {org.code}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden py-4">
        <div className="relative">
          {(() => {
            const activeIndex = NAV.findIndex(
              (item) => pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to))
            );
            return (
              <>
                {activeIndex >= 0 && (
                  <div
                    className="sidebar-cutout"
                    style={{ top: `${activeIndex * 44}px` }}
                  />
                )}
                {NAV.map((item, i) => {
                  const active = activeIndex === i;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      title={collapsed ? item.label : undefined}
                      data-testid={`nav-${item.to.replace("/", "")}`}
                      className={`group relative z-10 flex h-[44px] items-center gap-3 pl-5 pr-3 text-sm transition-colors duration-200 ${
                        active
                          ? "font-medium text-foreground"
                          : "text-white/65 hover:text-white"
                      }`}
                    >
                      <motion.span whileHover={{ x: active ? 0 : 2 }} className="shrink-0">
                        <item.icon
                          style={{ width: 18, height: 18 }}
                          strokeWidth={active ? 2.4 : 2}
                        />
                      </motion.span>
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="truncate"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Link>
                  );
                })}
              </>
            );
          })()}
        </div>
      </nav>

      <motion.button
        onClick={() => setCollapsed((c) => !c)}
        data-testid="sidebar-collapse-btn"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="relative z-10 mx-2 mb-3 flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 px-3 py-2.5 text-xs font-semibold text-white/70 shadow-lg backdrop-blur transition-all hover:border-white/25 hover:from-white/15 hover:to-white/10 hover:text-white"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        ) : (
          <>
            <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
            <span>Collapse</span>
          </>
        )}
      </motion.button>
    </motion.aside>
  );
}
