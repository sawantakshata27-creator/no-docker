import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { Copy, Check, UserPlus, Crown, Shield, User, X, Loader2, Users, Link2, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/ui/UserAvatar";

export const Route = createFileRoute("/_authenticated/team")({ component: TeamPage });

type Member = {
  id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "stakeholder";
  status: "active" | "pending";
  created_at: string;
};

function TeamPage() {
  const { org, membership, user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [joiningAnother, setJoiningAnother] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  const { data: members, isLoading } = useQuery({
    queryKey: ["members", org?.id],
    enabled: !!org,
    queryFn: async () => {
      const { data } = await supabase
        .from("organization_members")
        .select("id, user_id, role, status, created_at")
        .eq("org_id", org!.id)
        .order("created_at", { ascending: true });
      return (data ?? []) as Member[];
    },
  });

  const userIds = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = useQuery({
    queryKey: ["member-profiles", userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", userIds);
      const m: Record<string, any> = {};
      (data ?? []).forEach((p) => (m[p.id] = p));
      return m;
    },
  });

  const canManage = membership?.role === "owner" || membership?.role === "admin";

  if (!org) {
    return (
      <div className="card-surface grid h-[60vh] place-items-center p-10 text-center">
        <div>
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-muted">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No workspace yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Create or join a workspace to manage your team.</p>
        </div>
      </div>
    );
  }

  const copyCode = async () => {
    await navigator.clipboard.writeText(org.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Org ID copied");
  };

  // TODO: Replace window.location.origin with your production domain when deploying
  const getInviteUrl = () =>
    `${window.location.origin}/?join=${org.code}`;

  const copyInviteLink = async () => {
    await navigator.clipboard.writeText(getInviteUrl());
    toast.success("Invite link copied — share it with teammates!");
  };

  const copyInviteMessage = async () => {
    const msg = `You've been invited to join "${org.name}" on 2DS Workflow.\n\nClick to join: ${getInviteUrl()}\n\nOr sign up manually and enter Org ID: ${org.code}`;
    await navigator.clipboard.writeText(msg);
    toast.success("Invite message copied — paste it anywhere!");
  };

  const joinAnotherOrg = async () => {
    if (!user || !joinCode.trim()) return;
    setJoinLoading(true);
    try {
      const { data: targetOrg, error: oErr } = await supabase
        .from("organizations").select("id, name").eq("code", joinCode.trim().toUpperCase()).maybeSingle();
      if (oErr) throw oErr;
      if (!targetOrg) throw new Error("No workspace found with that code");
      const { error: mErr } = await supabase
        .from("organization_members")
        .insert({ org_id: targetOrg.id, user_id: user.id, role: "member", status: "pending" });
      if (mErr && !mErr.message.includes("duplicate")) throw mErr;
      toast.success(`Request sent to join "${targetOrg.name}". An admin will approve you.`);
      setJoiningAnother(false);
      setJoinCode("");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to join workspace");
    } finally {
      setJoinLoading(false);
    }
  };

  const approve = async (m: Member) => {
    await supabase.from("organization_members").update({ status: "active" }).eq("id", m.id);
    await supabase
      .from("profiles")
      .update({ current_org_id: org.id })
      .eq("id", m.user_id)
      .is("current_org_id", null);
    qc.invalidateQueries({ queryKey: ["members", org.id] });
    toast.success("Member approved and notified");
  };

  const reject = async (m: Member) => {
    await supabase.from("organization_members").delete().eq("id", m.id);
    qc.invalidateQueries({ queryKey: ["members", org.id] });
    toast.success("Request declined");
  };

  const changeRole = async (m: Member, role: Member["role"]) => {
    await supabase.from("organization_members").update({ role }).eq("id", m.id);
    qc.invalidateQueries({ queryKey: ["members", org.id] });
    toast.success("Role updated");
  };

  const remove = async (m: Member) => {
    if (!confirm("Remove this member from the workspace?")) return;
    await supabase.from("organization_members").delete().eq("id", m.id);
    qc.invalidateQueries({ queryKey: ["members", org.id] });
    toast.success("Member removed");
  };

  const pending = (members ?? []).filter((m) => m.status === "pending");
  const active = (members ?? []).filter((m) => m.status === "active");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="text-sm text-muted-foreground">Manage members, roles, and join requests.</p>
      </div>

      {/* Org ID card */}
      <div className="card-surface p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold">Invite members</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Share the link or Org ID. New users will be guided through onboarding with the join code pre-filled.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5">
              <span className="font-mono text-lg font-bold text-primary-700">{org.code}</span>
            </div>
            <button
              onClick={copyCode}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium transition hover:bg-muted"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy ID"}
            </button>
            <button
              onClick={copyInviteLink}
              className="inline-flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2.5 text-sm font-medium text-primary-700 transition hover:bg-primary-100"
            >
              <Link2 className="h-4 w-4" />
              Copy invite link
            </button>
            <button
              onClick={copyInviteMessage}
              className="inline-flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2.5 text-sm font-medium text-primary-700 transition hover:bg-primary-100"
            >
              <UserPlus className="h-4 w-4" />
              Copy full message
            </button>
          </div>
        </div>

        {/* Join another workspace */}
        <div className="mt-4 border-t border-border pt-4">
          {joiningAnother ? (
            <div className="flex items-center gap-3">
              <input
                autoFocus
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter workspace code e.g. ACME-7Q2X"
                className="input-field flex-1 py-2 font-mono text-sm uppercase tracking-widest"
                onKeyDown={(e) => { if (e.key === "Enter") joinAnotherOrg(); if (e.key === "Escape") setJoiningAnother(false); }}
              />
              <button
                onClick={joinAnotherOrg}
                disabled={joinLoading || joinCode.trim().length < 4}
                className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
              >
                {joinLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send request"}
              </button>
              <button onClick={() => { setJoiningAnother(false); setJoinCode(""); }} className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setJoiningAnother(true)}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-primary-700"
            >
              <PlusCircle className="h-4 w-4" />
              Join another workspace
            </button>
          )}
        </div>
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="card-surface overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <UserPlus className="h-4 w-4 text-amber-600" />
            <h3 className="font-semibold">Join requests</h3>
            <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {pending.length}
            </span>
          </div>
          <ul className="divide-y divide-border">
            {pending.map((m) => {
              const p = profiles?.[m.user_id];
              return (
                <li key={m.id} className="flex items-center gap-4 px-5 py-4">
                  <UserAvatar name={p?.full_name ?? p?.email} avatarUrl={p?.avatar_url} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{p?.full_name ?? "Unknown user"}</div>
                    <div className="text-xs text-muted-foreground">{p?.email}</div>
                  </div>
                  <span className="hidden rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 sm:inline">
                    Pending
                  </span>
                  {canManage ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => approve(m)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => reject(m)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs transition hover:bg-muted"
                      >
                        Decline
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Awaiting admin</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Active members */}
      <div className="card-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-semibold">Members</h3>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            {active.length} active
          </span>
        </div>
        {isLoading ? (
          <div className="grid h-32 place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
          </div>
        ) : active.length === 0 ? (
          <div className="grid h-24 place-items-center text-sm text-muted-foreground">
            No active members yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {active.map((m) => {
              const p = profiles?.[m.user_id];
              const isSelf = m.user_id === user?.id;
              return (
                <li key={m.id} className="flex items-center gap-4 px-5 py-4">
                  <UserAvatar name={p?.full_name ?? p?.email} avatarUrl={p?.avatar_url} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {p?.full_name ?? "Unknown"}
                      {isSelf && (
                        <span className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] text-primary-700">
                          you
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{p?.email}</div>
                  </div>
                  <RoleBadge role={m.role} />
                  {canManage && !isSelf && m.role !== "owner" && (
                    <div className="flex items-center gap-2">
                      <select
                        value={m.role}
                        onChange={(e) => changeRole(m, e.target.value as any)}
                        className="input-field py-1 text-xs"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                    <option value="stakeholder">Stakeholder (read-only)</option>
                      </select>
                      <button
                        onClick={() => remove(m)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-red-50 hover:text-destructive"
                        title="Remove member"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
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

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { icon: any; cls: string }> = {
    owner: { icon: Crown, cls: "bg-amber-50 text-amber-700 border-amber-200" },
    admin: { icon: Shield, cls: "bg-blue-50 text-blue-700 border-blue-200" },
    member: { icon: User, cls: "bg-muted text-muted-foreground border-border" },
  };
  const { icon: Icon, cls } = map[role] ?? map.member;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs capitalize ${cls}`}>
      <Icon className="h-3 w-3" />
      {role}
    </span>
  );
}
