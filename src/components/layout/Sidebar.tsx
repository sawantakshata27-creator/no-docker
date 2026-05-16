import { Link, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { LayoutDashboard, Kanban, FileText, BarChart3, Truck, Users, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, enabled: true },
  { to: "/board", label: "Kanban", icon: Kanban, enabled: true },
  { to: "/documents", label: "Documents", icon: FileText, enabled: false },
  { to: "/analytics", label: "Analytics", icon: BarChart3, enabled: false },
  { to: "/delivery", label: "Delivery", icon: Truck, enabled: false },
  { to: "/team", label: "Team", icon: Users, enabled: false },
  { to: "/settings", label: "Settings", icon: Settings, enabled: false },
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
          const cls = `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
            active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
          }`;
          const inner = (
            <>
              {active && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-white" />}
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </>
          );
          if (item.enabled) {
            return (
              <Link key={item.to} to={item.to} className={cls}>{inner}</Link>
            );
          }
          return (
            <button
              key={item.to}
              type="button"
              onClick={() => toast.info(`${item.label} is coming next — Dashboard and Kanban are in v1.`)}
              className={cls + " w-full text-left"}
            >{inner}{!collapsed && <span className="ml-auto rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wide">soon</span>}</button>
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
