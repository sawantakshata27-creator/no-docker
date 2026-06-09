import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Kanban,
  FileText,
  ListChecks,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-store";

const NAV_TOP = [
  { to: "/dashboard",  label: "Dashboard",          icon: LayoutDashboard },
  { to: "/board",      label: "Kanban",              icon: Kanban },
  { to: "/tasks",      label: "Tasks",               icon: ListChecks },
  { to: "/schedule",   label: "Scheduled Delivery",  icon: CalendarClock },
] as const;

const NAV_BOTTOM = [
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/team",      label: "Team",      icon: Users },
  { to: "/settings",  label: "Settings",  icon: Settings },
] as const;

const NAV = [...NAV_TOP, ...NAV_BOTTOM] as const;


// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { org } = useAuth();

  const activeIndex = NAV.findIndex(
    (item) => pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to)),
  );

  return (
    <>
      <motion.aside
        animate={{ width: collapsed ? 76 : 252 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="sidebar-gradient sticky top-0 z-20 flex h-screen flex-col text-white shadow-2xl"
        data-testid="app-sidebar"
      >
        {/* Logo */}
        <div className="relative z-10 flex shrink-0 justify-center border-b border-white/10 py-4">
          <AnimatePresence initial={false} mode="wait">
            {collapsed ? (
              <motion.img
                key="icon"
                src="/image.png"
                alt="Logo"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.18 }}
                className="object-contain"
                style={{ height: 52, width: 52 }}
              />
            ) : (
              <motion.img
                key="full"
                src="/IMG2.png"
                alt="Logo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="object-contain"
                style={{ height: 75}}
              />
            )}
          </AnimatePresence>
        </div>

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

            {/* Top nav items */}
            {NAV_TOP.map((item, i) => {
              const active = activeIndex === i;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  data-testid={`nav-${item.to.replace("/", "")}`}
                  className={`group relative z-10 flex h-[50px] items-center gap-3.5 text-sm font-semibold transition-all ${
                    collapsed ? "justify-center px-0" : "px-5"
                  } ${active ? "text-primary-700 drop-shadow-sm" : "text-white/65 hover:text-white"}`}
                >
                  <motion.span whileHover={{ scale: active ? 1 : 1.08 }} className="shrink-0">
                    <item.icon style={{ width: 20, height: 20 }} strokeWidth={active ? 2.6 : 2} />
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
                </Link>
              );
            })}

            {/* Bottom nav items: Documents, Analytics, Team, Settings */}
            {NAV_BOTTOM.map((item, i) => {
              const active = activeIndex === NAV_TOP.length + i;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  data-testid={`nav-${item.to.replace("/", "")}`}
                  className={`group relative z-10 flex h-[50px] items-center gap-3.5 text-sm font-semibold transition-all ${
                    collapsed ? "justify-center px-0" : "px-5"
                  } ${active ? "text-primary-700 drop-shadow-sm" : "text-white/65 hover:text-white"}`}
                >
                  <motion.span whileHover={{ scale: active ? 1 : 1.08 }} className="shrink-0">
                    <item.icon style={{ width: 20, height: 20 }} strokeWidth={active ? 2.6 : 2} />
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
          className="absolute top-16 -right-3.5 z-30 grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-foreground shadow-md transition hover:border-primary-300 hover:bg-primary-50"
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

        {/* Workspace badge — bottom */}
        <AnimatePresence initial={false}>
          {!collapsed && org && (
            <motion.div
              key="org-badge"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="relative z-10 mx-3 mb-3 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2.5 backdrop-blur"
            >
              <div className="text-[9px] font-semibold tracking-[0.18em] text-white/45 uppercase">Workspace</div>
              <div className="mt-0.5 truncate text-sm font-semibold text-white">{org.name}</div>
              <div className="mt-1 inline-block rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/70">
                {org.code}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

    </>
  );
}
