import { Search, Bell, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { useNavigate } from "@tanstack/react-router";

export function Topbar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const initials = (profile?.full_name ?? profile?.email ?? "U")
    .split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-card/80 px-6 backdrop-blur">
      <div>
        <div className="text-xs text-muted-foreground">{greet}</div>
        <div className="text-sm font-semibold">{profile?.full_name ?? "there"} 👋</div>
      </div>
      <div className="relative ml-6 flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="input-field pl-9 pr-16 py-2 text-sm"
          placeholder="Search tasks, docs, people…"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘K</kbd>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button className="relative grid h-9 w-9 place-items-center rounded-xl hover:bg-muted">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
        </button>
        <div className="ml-2 flex items-center gap-2 rounded-xl border border-border pl-1 pr-3 py-1">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary-600 text-xs font-semibold text-white">{initials}</div>
          <div className="text-xs leading-tight">
            <div className="font-medium">{profile?.full_name ?? "User"}</div>
            <div className="text-muted-foreground">{profile?.team_name ?? ""}</div>
          </div>
          <button
            onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
            className="ml-1 grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
            title="Sign out"
          ><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
    </header>
  );
}
