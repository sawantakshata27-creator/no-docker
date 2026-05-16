import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Kanban, FileText, BarChart3, ListChecks, Users, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

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

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 248 }}
      transition={{ duration: 0.2 }}
      className="sidebar-gradient sticky top-0 flex h-screen flex-col text-white"
    >
      <div className="flex items-center gap-2 p-5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15 font-bold">2D</div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="font-semibold">2DS Workflow</div>
            <div className="text-[11px] text-white/60">Enterprise OS</div>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {active && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-white" />}
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => setCollapsed((c) => !c)}
        className="m-3 flex items-center justify-center gap-2 rounded-xl bg-primary-800/60 px-3 py-2 text-xs text-white/80 hover:bg-primary-800"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /> Collapse</>}
      </button>
    </motion.aside>
  );
}
