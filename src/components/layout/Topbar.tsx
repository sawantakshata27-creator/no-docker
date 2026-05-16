import { Bell, Check, Copy, LogOut, Search, Settings2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";

export function Topbar() {
  const { profile, org, signOut } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const initials = (profile?.full_name ?? profile?.email ?? "U")
    .split(" ")
    .map((segment) => segment[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const copyCode = async () => {
    if (!org) return;
    await navigator.clipboard.writeText(org.code);
    setCopied(true);
    toast.success("Workspace code copied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-card/80 px-6 backdrop-blur">
      <div>
        <div className="text-xs text-muted-foreground">{greet}</div>
        <div className="text-sm font-semibold">{profile?.full_name ?? "there"}</div>
      </div>

      {org ? (
        <button
          onClick={copyCode}
          className="ml-4 hidden items-center gap-2 rounded-xl border border-border bg-muted/50 px-2.5 py-1 text-xs hover:bg-muted md:flex"
          title="Click to copy workspace code"
        >
          <span className="font-medium">{org.name}</span>
          <span className="rounded bg-primary-50 px-1.5 py-0.5 font-mono text-[10px] text-primary-700">
            {org.code}
          </span>
          {copied ? (
            <Check className="h-3 w-3 text-emerald-600" />
          ) : (
            <Copy className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
      ) : null}

      <div className="relative ml-auto max-w-md flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="input-field py-2 pl-9 pr-16 text-sm"
          placeholder="Search tasks, docs, people…"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative grid h-9 w-9 place-items-center rounded-xl hover:bg-muted">
          <Bell className="h-4 w-4" />
        </button>
        <button
          onClick={() => navigate({ to: "/settings" })}
          className="ml-2 flex items-center gap-2 rounded-xl border border-border pl-1 pr-2 py-1 text-left transition hover:border-primary-500/40 hover:bg-muted/40"
          title="Open profile settings"
        >
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary-600 text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="text-xs leading-tight">
            <div className="font-medium">{profile?.full_name ?? "User"}</div>
            <div className="text-muted-foreground">{org?.name ?? "Personal workspace"}</div>
          </div>
          <div className="ml-1 grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
            <Settings2 className="h-4 w-4" />
          </div>
        </button>
        <button
          onClick={async () => {
            await signOut();
            navigate({ to: "/login" });
          }}
          className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-destructive"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
