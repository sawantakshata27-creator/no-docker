import { Check, Copy, LogOut, Moon, Sun, Settings2, AlertTriangle } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";
import { useTheme } from "@/lib/theme-store";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { NotificationsPanel } from "./NotificationsPanel";
import { GlobalSearch } from "./GlobalSearch";
import { OrgSwitcher } from "./OrgSwitcher";

export function Topbar() {
  const { profile, org, signOut } = useAuth();
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
  const [copied, setCopied] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const copyCode = async () => {
    if (!org) return;
    await navigator.clipboard.writeText(org.code);
    setCopied(true);
    toast.success("Org ID copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  };

  const handleLogout = async () => {
    await signOut();
    setLogoutConfirm(false);
    navigate({ to: "/login" });
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      data-testid="app-topbar"
      className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-6 backdrop-blur-xl"
    >
      <div className="min-w-0">
        <div className="text-[11px] font-medium tracking-wider text-muted-foreground/80 uppercase">
          {greet}
        </div>
        <div className="truncate text-sm font-semibold text-foreground">
          {profile?.full_name ?? "there"}
        </div>
      </div>

      <GlobalSearch />

      <OrgSwitcher />

      <motion.div
        className="ml-auto flex items-center gap-1.5"
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggle}
          data-testid="theme-toggle"
          className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          <AnimatePresence mode="wait">
            {dark ? (
              <motion.span key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <Sun className="h-4 w-4" />
              </motion.span>
            ) : (
              <motion.span key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <Moon className="h-4 w-4" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        <NotificationsPanel />

        <button
          onClick={() => navigate({ to: "/settings" })}
          data-testid="topbar-profile-btn"
          className="ml-1.5 flex items-center gap-2.5 rounded-full border border-border bg-card px-2 py-1 transition hover:border-primary-300 hover:bg-muted/40"
          title="Open profile settings"
        >
          <UserAvatar name={profile?.full_name ?? profile?.email} avatarUrl={profile?.avatar_url} size="sm" />
          <motion.div className="hidden text-xs leading-tight lg:block" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            <motion.div layout className="font-semibold">{profile?.full_name ?? "User"}</motion.div>
            <motion.div layout className="text-muted-foreground">{org?.code ?? "No org"}</motion.div>
          </motion.div>
          <Settings2 className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
        </button>

        {/* Logout with confirmation pop-up */}
        <div className="relative">
          <AnimatePresence>
            {logoutConfirm && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-2xl border border-border bg-popover shadow-xl"
                data-testid="logout-confirm-panel"
              >
                <div className="p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Sign out?
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    You'll need to sign in again to access your workspace.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      id="logout-confirm-btn"
                      onClick={handleLogout}
                      className="flex-1 rounded-lg bg-destructive px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                    >
                      Yes, sign out
                    </button>
                    <button
                      id="logout-cancel-btn"
                      onClick={() => setLogoutConfirm(false)}
                      className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {logoutConfirm && (
            <div className="fixed inset-0 z-40" onClick={() => setLogoutConfirm(false)} />
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setLogoutConfirm((v) => !v)}
            data-testid="signout-btn"
            className="relative z-50 grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </motion.button>
        </div>
      </motion.div>
    </motion.header>
  );
}
