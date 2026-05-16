import { Bell, Check, Copy, LogOut, Moon, Sun, Settings2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/90 px-6 backdrop-blur">
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{greet}</div>
        <div className="truncate text-sm font-semibold">{profile?.full_name ?? "there"}</div>
      </div>

      {org && (
        <button
          onClick={copyCode}
          className="ml-3 hidden items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-1.5 text-xs transition hover:bg-muted md:flex"
          title="Click to copy Org ID"
        >
          <span className="font-medium text-foreground">{org.name}</span>
          <span className="rounded-md bg-primary-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary-700">
            {org.code}
          </span>
          {copied ? (
            <Check className="h-3 w-3 text-emerald-600" />
          ) : (
            <Copy className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
      )}

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={toggle}
          className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button className="relative grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted">
          <Bell className="h-4 w-4" />
        </button>

        <button
          onClick={() => navigate({ to: "/settings" })}
          className="ml-1 flex items-center gap-2.5 rounded-xl border border-border px-2 py-1 transition hover:border-primary-500/40 hover:bg-muted/40"
          title="Open profile settings"
        >
          <UserAvatar
            name={profile?.full_name ?? profile?.email}
            avatarUrl={profile?.avatar_url}
            size="sm"
          />
          <div className="hidden text-xs leading-tight lg:block">
            <div className="font-medium">{profile?.full_name ?? "User"}</div>
            <div className="text-muted-foreground">{org?.name ?? "No workspace"}</div>
          </div>
          <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        <button
          onClick={async () => {
            await signOut();
            navigate({ to: "/login" });
          }}
          className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-destructive"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
