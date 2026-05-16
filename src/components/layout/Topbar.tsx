import { Bell, Check, Copy, LogOut, Moon, Sun, Settings2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";
import { useTheme } from "@/lib/theme-store";
import { UserAvatar } from "@/components/ui/UserAvatar";

export function Topbar() {
  const { profile, org, signOut } = useAuth();
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
  const [copied, setCopied] = useState(false);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const copyCode = async () => {
    if (!org) return;
    await navigator.clipboard.writeText(org.code);
    setCopied(true);
    toast.success("Org ID copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
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

      {org && (
        <button
          onClick={copyCode}
          data-testid="topbar-org-code"
          className="ml-3 hidden items-center gap-2 rounded-full border border-border bg-muted/50 px-3.5 py-1.5 text-xs transition hover:border-primary-200 hover:bg-muted md:flex"
          title="Click to copy Org ID"
        >
          <span className="font-medium text-foreground">{org.name}</span>
          <span className="rounded-full bg-primary-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary-700">
            {org.code}
          </span>
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.span
                key="copied"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
              >
                <Check className="h-3 w-3 text-emerald-600" />
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
              >
                <Copy className="h-3 w-3 text-muted-foreground" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      )}

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
              <motion.span
                key="sun"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Sun className="h-4 w-4" />
              </motion.span>
            ) : (
              <motion.span
                key="moon"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Moon className="h-4 w-4" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          data-testid="notifications-btn"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 animate-pulse-soft rounded-full bg-[oklch(0.72_0.17_25)]" />
        </motion.button>

        <button
          onClick={() => navigate({ to: "/settings" })}
          data-testid="topbar-profile-btn"
          className="ml-1.5 flex items-center gap-2.5 rounded-full border border-border bg-card px-2 py-1 transition hover:border-primary-300 hover:bg-muted/40"
          title="Open profile settings"
        >
          <UserAvatar
            name={profile?.full_name ?? profile?.email}
            avatarUrl={profile?.avatar_url}
            size="sm"
          />
          <motion.div
            className="hidden text-xs leading-tight lg:block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <motion.div layout className="font-semibold">
              {profile?.full_name ?? "User"}
            </motion.div>
            <motion.div layout className="text-muted-foreground">
              {org?.name ?? "No workspace"}
            </motion.div>
          </motion.div>
          <Settings2 className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
        </button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={async () => {
            await signOut();
            navigate({ to: "/login" });
          }}
          data-testid="signout-btn"
          className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </motion.button>
      </motion.div>
    </motion.header>
  );
}
