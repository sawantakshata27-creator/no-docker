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
      animate={{ width: collapsed ? 83 : 256 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="sidebar-gradient sticky top-0 z-10 flex h-screen flex-col text-white shadow-2xl"
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
                    style={{ top: `${activeIndex * 48}px` }}
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
                      className={`group relative z-10 flex h-[48px] items-center gap-3.5 px-5 text-sm font-medium transition-all duration-200 ${
                        active
                          ? "text-foreground"
                          : "text-white/70 hover:text-white hover:translate-x-1"
                      }`}
                    >
                      <motion.span 
                        whileHover={{ scale: active ? 1 : 1.1 }} 
                        className="shrink-0"
                      >
                        <item.icon
                          style={{ width: 20, height: 20 }}
                          strokeWidth={active ? 2.5 : 2.2}
                        />
                      </motion.span>
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -4 }}
                            transition={{ duration: 0.2 }}
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
        whileHover={{ scale: 1.05, x: collapsed ? 2 : -2 }}
        whileTap={{ scale: 0.95 }}
        className="relative z-10 mx-3 mb-4 flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-gradient-to-br from-white/[0.15] to-white/[0.08] px-3 py-3 text-xs font-bold text-white shadow-xl backdrop-blur-sm transition-all hover:border-white/30 hover:from-white/20 hover:to-white/[0.12] hover:shadow-2xl"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" strokeWidth={2.8} />
        ) : (
          <>
            <ChevronLeft className="h-4 w-4" strokeWidth={2.8} />
            <span className="tracking-wide">COLLAPSE</span>
          </>
        )}
      </motion.button>
    </motion.aside>
  );
}
