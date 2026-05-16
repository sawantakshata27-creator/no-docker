import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Building2, Loader2, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user, profile, org, membership, refreshProfile } = useAuth();
  const [tab, setTab] = useState<"profile" | "workspace" | "security">("profile");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile, workspace, and security.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="card-surface flex flex-row gap-1 p-2 lg:flex-col">
          {[
            { v: "profile", l: "Profile", i: User },
            { v: "workspace", l: "Workspace", i: Building2 },
            { v: "security", l: "Security", i: Lock },
          ].map((tabOption) => (
            <button
              key={tabOption.v}
              onClick={() => setTab(tabOption.v as typeof tab)}
              className={`flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-sm transition lg:flex-none ${tab === tabOption.v ? "bg-primary-50 font-medium text-primary-700" : "text-muted-foreground hover:bg-muted"}`}
            >
              <tabOption.i className="h-4 w-4" /> {tabOption.l}
            </button>
          ))}
        </nav>

        <div className="card-surface p-6">
          {tab === "profile" ? (
            <ProfileTab
              profile={profile}
              userId={user?.id ?? ""}
              email={user?.email ?? ""}
              onSaved={refreshProfile}
            />
          ) : null}
          {tab === "workspace" ? (
            <WorkspaceTab org={org} role={membership?.role ?? "member"} onSaved={refreshProfile} />
          ) : null}
          {tab === "security" ? <SecurityTab email={user?.email ?? ""} /> : null}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ profile, userId, email, onSaved }: any) {
  const [name, setName] = useState(profile?.full_name ?? "");
  const [saving, setSaving] = useState(false);
  const [lastSavedName, setLastSavedName] = useState(profile?.full_name ?? "");

  const hasChanges = useMemo(
    () => name.trim() !== (lastSavedName ?? "").trim(),
    [lastSavedName, name],
  );

  const save = async (nextName: string) => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: nextName.trim() || null })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    setLastSavedName(nextName);
    await onSaved();

    toast.success("Profile updated", {
      cancel: {
        label: "Cancel",
        onClick: async () => {
          const { error: revertError } = await supabase
            .from("profiles")
            .update({ full_name: profile?.full_name ?? null })
            .eq("id", userId);
          if (revertError) {
            toast.error(revertError.message);
            return;
          }
          setName(profile?.full_name ?? "");
          setLastSavedName(profile?.full_name ?? "");
          await onSaved();
          toast("Profile update cancelled");
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Profile</h2>
      <Field label="Email">
        <input className="input-field" value={email} disabled />
      </Field>
      <Field label="Full name">
        <input
          className="input-field"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <button
        onClick={() => save(name)}
        className="btn-primary inline-flex items-center gap-2"
        disabled={saving || !hasChanges}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save changes
      </button>
    </div>
  );
}

function WorkspaceTab({ org, role, onSaved }: any) {
  const [name, setName] = useState(org?.name ?? "");
  const [saving, setSaving] = useState(false);
  if (!org) return <p className="text-sm text-muted-foreground">You're not in a workspace.</p>;
  const canEdit = role === "owner";
  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("organizations").update({ name }).eq("id", org.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    onSaved();
    toast.success("Workspace updated");
  };
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Workspace</h2>
      <Field label="Name">
        <input
          className="input-field"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={!canEdit}
        />
      </Field>
      <Field label="Workspace code">
        <input className="input-field font-mono" value={org.code} disabled />
        <p className="mt-1 text-xs text-muted-foreground">
          Share this code so new members can join.
        </p>
      </Field>
      <Field label="Your role">
        <input className="input-field" value={role} disabled />
      </Field>
      {canEdit ? (
        <button
          onClick={save}
          className="btn-primary inline-flex items-center gap-2"
          disabled={saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save changes
        </button>
      ) : null}
    </div>
  );
}

function SecurityTab({ email }: { email: string }) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const change = async () => {
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return toast.error(error.message);
    setPassword("");
    toast.success("Password updated");
  };

  const sendReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) toast.error(error.message);
    else toast.success("Reset link sent");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Security</h2>
      <Field label="New password">
        <input
          type="password"
          className="input-field"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
        />
      </Field>
      <div className="flex gap-2">
        <button
          onClick={change}
          className="btn-primary inline-flex items-center gap-2"
          disabled={saving || !password}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Update password
        </button>
        <button
          onClick={sendReset}
          className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted"
        >
          Email reset link
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
