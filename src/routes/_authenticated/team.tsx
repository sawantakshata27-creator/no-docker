import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { Copy, Check, UserPlus, Crown, Shield, User, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/team")({ component: TeamPage });

type Member = {
  id: string; user_id: string; role: "owner" | "admin" | "member"; status: "active" | "pending";
  created_at: string;
};

function TeamPage() {
  const { org, membership, user, switchOrg } = useAuth();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: members, isLoading } = useQuery({
    queryKey: ["members", org?.id],
    enabled: !!org,
    queryFn: async () => {
      const { data } = await supabase.from("organization_members")
        .select("id, user_id, role, status, created_at")
        .eq("org_id", org!.id);
      return (data ?? []) as Member[];
    },
  });

  // Fetch profiles for those members
  const userIds = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = useQuery({
    queryKey: ["member-profiles", userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", userIds);
      const m: Record<string, any> = {};
      (data ?? []).forEach((p) => m[p.id] = p);
      return m;
    },
  });

  const canManage = membership?.role === "owner" || membership?.role === "admin";

  if (!org) {
    return (
      <div className="card-surface grid h-[60vh] place-items-center p-10 text-center">
        <div>
          <h2 className="text-lg font-semibold">You're not in a workspace</h2>
          <p className="mt-1 text-sm text-muted-foreground">Create or join one to manage a team.</p>
        </div>
      </div>
    );
  }

  const copyCode = async () => {
    await navigator.clipboard.writeText(org.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Workspace code copied");
  };

  const approve = async (m: Member) => {
    await supabase.from("organization_members").update({ status: "active" }).eq("id", m.id);
    // Set as their current org if they don't have one
    await supabase.from("profiles").update({ current_org_id: org.id }).eq("id", m.user_id).is("current_org_id", null);
    qc.invalidateQueries({ queryKey: ["members", org.id] });
    toast.success("Member approved");
  };

  const reject = async (m: Member) => {
    await supabase.from("organization_members").delete().eq("id", m.id);
    qc.invalidateQueries({ queryKey: ["members", org.id] });
    toast.success("Request removed");
  };

  const changeRole = async (m: Member, role: Member["role"]) => {
    await supabase.from("organization_members").update({ role }).eq("id", m.id);
    qc.invalidateQueries({ queryKey: ["members", org.id] });
  };

  const remove = async (m: Member) => {
    if (!confirm("Remove this member from the workspace?")) return;
    await supabase.from("organization_members").delete().eq("id", m.id);
    qc.invalidateQueries({ queryKey: ["members", org.id] });
  };

  const pending = (members ?? []).filter((m) => m.status === "pending");
  const active = (members ?? []).filter((m) => m.status === "active");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="text-sm text-muted-foreground">Manage members, roles, and join requests.</p>
      </div>

      <div className="card-surface flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Invite members</h3>
          <p className="text-xs text-muted-foreground">Share this workspace code. New users paste it during onboarding to request access.</p>
        </div>
        <button onClick={copyCode} className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 font-mono text-sm hover:bg-muted">
          <span className="text-primary-700 font-semibold">{org.code}</span>
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
        </button>
      </div>

      {pending.length > 0 && (
        <div className="card-surface p-5">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <UserPlus className="h-4 w-4" /> Join requests
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{pending.length}</span>
          </h3>
          <ul className="divide-y divide-border">
            {pending.map((m) => {
              const p = profiles?.[m.user_id];
              return (
                <li key={m.id} className="flex items-center gap-3 py-2.5">
                  <Avatar name={p?.full_name ?? p?.email ?? "?"} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{p?.full_name ?? "Unknown user"}</div>
                    <div className="text-xs text-muted-foreground">{p?.email}</div>
                  </div>
                  {canManage ? (
                    <div className="flex gap-2">
                      <button onClick={() => approve(m)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">Approve</button>
                      <button onClick={() => reject(m)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">Decline</button>
                    </div>
                  ) : <span className="text-xs text-muted-foreground">Awaiting admin</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="card-surface p-5">
        <h3 className="mb-3 font-semibold">Members ({active.length})</h3>
        {isLoading ? (
          <div className="grid h-32 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary-600" /></div>
        ) : (
          <ul className="divide-y divide-border">
            {active.map((m) => {
              const p = profiles?.[m.user_id];
              const isSelf = m.user_id === user?.id;
              return (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <Avatar name={p?.full_name ?? p?.email ?? "?"} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{p?.full_name ?? "Unknown"} {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}</div>
                    <div className="text-xs text-muted-foreground">{p?.email}</div>
                  </div>
                  <RoleBadge role={m.role} />
                  {canManage && !isSelf && m.role !== "owner" && (
                    <>
                      <select value={m.role} onChange={(e) => changeRole(m, e.target.value as any)}
                        className="input-field py-1 text-xs">
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                      <button onClick={() => remove(m)} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-destructive">
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  return <div className="grid h-9 w-9 place-items-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">{initials}</div>;
}

function RoleBadge({ role }: { role: string }) {
  const map = {
    owner: { i: Crown, c: "bg-amber-50 text-amber-700" },
    admin: { i: Shield, c: "bg-blue-50 text-blue-700" },
    member: { i: User, c: "bg-muted text-muted-foreground" },
  }[role as "owner"] ?? { i: User, c: "bg-muted text-muted-foreground" };
  const Icon = map.i;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${map.c}`}><Icon className="h-3 w-3" />{role}</span>;
}
