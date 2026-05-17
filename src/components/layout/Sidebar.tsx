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

  const activeIndex = NAV.findIndex(
    (item) => pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to)),
  );

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 252 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="sidebar-gradient sticky top-0 z-20 flex h-screen flex-col text-white shadow-2xl"
      data-testid="app-sidebar"
    >
      {/* Logo */}
      <div className="relative z-10 flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15 font-display text-sm font-semibold shadow-inner backdrop-blur">
          2D
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="logo-text"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <div className="font-display text-sm leading-tight font-semibold">2DS Workflow</div>
              <div className="text-[10px] leading-tight tracking-[0.18em] text-white/50 uppercase">
                Enterprise OS
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Org */}
      <AnimatePresence initial={false}>
        {!collapsed && org && (
          <motion.div
            key="org-badge"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="relative z-10 mx-3 mt-3 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2.5 backdrop-blur"
          >
            <div className="text-[9px] font-semibold tracking-[0.18em] text-white/45 uppercase">
              Workspace
            </div>
            <div className="mt-0.5 truncate text-sm font-semibold text-white">{org.name}</div>
            <div className="mt-1 inline-block rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/70">
              {org.code}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav */}
      <nav className="relative z-10 mt-3 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="relative">
          {activeIndex >= 0 && (
            <motion.div
              className="sidebar-cutout"
              initial={false}
              animate={{ top: `${activeIndex * 50}px` }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
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
                className={`group relative z-10 flex h-[50px] items-center gap-3.5 px-5 text-sm font-semibold transition-colors ${
                  active ? "text-primary-700" : "text-white/65 hover:text-white"
                }`}
              >
                <motion.span whileHover={{ scale: active ? 1 : 1.08 }} className="shrink-0">
                  <item.icon
                    style={{ width: 20, height: 20 }}
                    strokeWidth={active ? 2.6 : 2}
                  />
                </motion.span>
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      transition={{ duration: 0.18 }}
                      className="truncate whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {active && (
                  <motion.span
                    layoutId="sidebar-dot"
                    className="ml-auto h-1.5 w-1.5 rounded-full bg-accent2"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Floating collapse toggle */}
      <motion.button
        onClick={() => setCollapsed((c) => !c)}
        data-testid="sidebar-collapse-btn"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        animate={{ rotate: collapsed ? 0 : 0 }}
        className="absolute top-20 -right-3.5 z-30 grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-foreground shadow-md transition hover:border-primary-300 hover:bg-primary-50"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <motion.span
          key={collapsed ? "r" : "l"}
          initial={{ rotate: -45, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </motion.span>
      </motion.button>

      {/* Footer chip */}
      <div className="relative z-10 m-3 mt-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="h-2 w-2 animate-pulse-soft rounded-full bg-success" />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                className="text-[11px] leading-tight text-white/70 whitespace-nowrap"
              >
                <div className="font-semibold text-white/85">All systems normal</div>
                <div className="text-white/45">Live · Updated now</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}
