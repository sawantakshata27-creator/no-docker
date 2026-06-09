import { LogOut, Settings2, ChevronDown } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-store";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { NotificationsPanel } from "./NotificationsPanel";
import { GlobalSearch } from "./GlobalSearch";
import { OrgSwitcher } from "./OrgSwitcher";

export function Topbar() {
  const { profile, org, signOut } = useAuth();
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (profileDropdownOpen && profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileDropdownOpen]);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      data-testid="app-topbar"
      className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-card/70 px-6 backdrop-blur-xl"
    >
      <div className="min-w-0 shrink-0 pl-3">
        <div className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground/80 uppercase">
          {greet}
        </div>
        <div className="truncate text-sm font-semibold text-foreground">
          {profile?.full_name ?? "there"}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center">
        <GlobalSearch />
      </div>

      <div className="hidden shrink-0 md:block">
        <OrgSwitcher />
      </div>

      <motion.div
        className="flex shrink-0 items-center gap-1.5"
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
      >
        <NotificationsPanel />

        <div className="relative ml-1.5" ref={profileRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            data-testid="topbar-profile-btn"
            className="flex items-center gap-2.5 rounded-full border border-border bg-card px-2 py-1 transition hover:border-primary-300 hover:bg-muted/40"
            title="Profile menu"
          >
            <UserAvatar name={profile?.full_name ?? profile?.email} avatarUrl={profile?.avatar_url} size="sm" />
            <div className="hidden text-xs leading-tight lg:block">
              <div className="font-semibold">{profile?.full_name ?? "User"}</div>
              <div className="text-muted-foreground">{org?.code ?? "No org"}</div>
            </div>
            <ChevronDown className={`mr-1 h-3.5 w-3.5 text-muted-foreground transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {profileDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border border-border bg-popover shadow-xl"
                data-testid="profile-dropdown"
              >
                <div className="p-1.5">
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate({ to: "/settings" });
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground transition hover:bg-muted"
                  >
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Settings</span>
                  </button>
                  <div className="my-1 h-px bg-border" />
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive transition hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="font-medium">Sign out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </motion.div>
    </motion.header>
  );
}
