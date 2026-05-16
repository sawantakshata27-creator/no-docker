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
import { motion } from "framer-motion";
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
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="sidebar-gradient sticky top-0 flex h-screen flex-col text-white overflow-hidden"
    >
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 px-4 border-b border-white/10">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15 font-bold text-sm">
          2D
        </div>
        {!collapsed && (
          <motion.div
            initial={false}
            animate={{ opacity: 1 }}
            className="overflow-hidden"
          >
            <div className="font-semibold text-sm leading-tight">2DS Workflow</div>
            <div className="text-[11px] text-white/55 leading-tight">Enterprise OS</div>
          </motion.div>
        )}
      </div>

      {/* Org badge */}
      {!collapsed && org && (
        <div className="mx-3 mt-3 rounded-xl bg-white/10 px-3 py-2">
          <div className="text-[10px] font-medium text-white/50 uppercase tracking-wider">Workspace</div>
          <div className="mt-0.5 truncate text-xs font-semibold text-white">{org.name}</div>
          <div className="mt-0.5 font-mono text-[10px] text-white/50">{org.code}</div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-2 py-3 overflow-y-auto">
        {NAV.map((item) => {
          const active =
            pathname === item.to ||
            (item.to !== "/dashboard" && pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                active
                  ? "bg-white/15 text-white font-medium"
                  : "text-white/65 hover:bg-white/10 hover:text-white"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-white" />
              )}
              <item.icon className="h-4.5 w-4.5 shrink-0" style={{ width: 18, height: 18 }} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="mx-2 mb-3 flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <>
            <ChevronLeft className="h-4 w-4" />
            <span>Collapse</span>
          </>
        )}
      </button>
    </motion.aside>
  );
}
