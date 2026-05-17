import { createFileRoute } from "@tanstack/react-router";
import { useRef, useMemo, useState } from "react";
import { Building2, Camera, Loader2, Lock, Moon, Sun, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { useTheme } from "@/lib/theme-store";
import { UserAvatar } from "@/components/ui/UserAvatar";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user, profile, org, membership, refreshProfile } = useAuth();
  const [tab, setTab] = useState<"profile" | "workspace" | "security">("profile");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, workspace, and security.</p>
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
              className={`flex flex-1 items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition lg:flex-none ${
                tab === tabOption.v
                  ? "bg-primary-50 font-medium text-primary-700"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <tabOption.i className="h-4 w-4 shrink-0" /> {tabOption.l}
            </button>
          ))}
        </nav>

        <div className="card-surface p-6">
          {tab === "profile" && (
            <ProfileTab
              profile={profile}
              userId={user?.id ?? ""}
              email={user?.email ?? ""}
              onSaved={refreshProfile}
            />
          )}
          {tab === "workspace" && (
            <WorkspaceTab org={org} role={membership?.role ?? "member"} onSaved={refreshProfile} />
          )}
          {tab === "security" && <SecurityTab email={user?.email ?? ""} />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ profile, userId, email, onSaved }: any) {
  const [name, setName] = useState(profile?.full_name ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastSavedName, setLastSavedName] = useState(profile?.full_name ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { dark, toggle } = useTheme();

  const hasChanges = useMemo(
    () => name.trim() !== (lastSavedName ?? "").trim(),
    [lastSavedName, name],
  );

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        // Fallback: store as data URL
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const dataUrl = ev.target?.result as string;
          const { error } = await supabase
            .from("profiles")
            .update({ avatar_url: dataUrl })
            .eq("id", userId);
          if (error) toast.error(error.message);
          else {
            await onSaved();
            toast.success("Photo updated");
          }
          setUploading(false);
        };
        reader.readAsDataURL(file);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) throw updateError;
      await onSaved();
      toast.success("Photo updated");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", userId);
    if (error) return toast.error(error.message);
    await onSaved();
    toast.success("Photo removed");
  };

  const save = async (nextName: string) => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: nextName.trim() || null })
      .eq("id", userId);
    setSaving(false);
    if (error) return toast.error(error.message);
    setLastSavedName(nextName);
    await onSaved();
    toast.success("Profile updated");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Profile</h2>

      {/* Avatar upload */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <UserAvatar
            name={profile?.full_name ?? profile?.email}
            avatarUrl={profile?.avatar_url}
            size="xl"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-card bg-primary-600 text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
            title="Upload photo"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
        </div>
        <div>
          <div className="font-medium">{profile?.full_name ?? "User"}</div>
          <div className="text-sm text-muted-foreground">{email}</div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:opacity-50"
            >
              Change photo
            </button>
            {profile?.avatar_url && (
              <button
                onClick={removePhoto}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-destructive"
              >
                Remove
              </button>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">JPG, PNG or GIF — max 5 MB</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoUpload}
        />
      </div>

      <div className="h-px bg-border" />

      <div className="space-y-4">
        <Field label="Email">
          <input className="input-field" value={email} disabled />
        </Field>
        <Field label="Full name">
          <input
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
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

      <div className="h-px bg-border" />

      {/* Theme preference */}
      <div>
        <div className="mb-3 text-sm font-medium">Appearance</div>
        <div className="flex items-center gap-3">
          {[
            { label: "Light", v: false, icon: Sun },
            { label: "Dark", v: true, icon: Moon },
          ].map(({ label, v, icon: Icon }) => (
            <button
              key={label}
              onClick={() => { if (dark !== v) toggle(); }}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition ${
                dark === v
                  ? "border-primary-500 bg-primary-50 font-medium text-primary-700"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkspaceTab({ org, role, onSaved }: any) {
  const [name, setName] = useState(org?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!org) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Workspace</h2>
        <p className="text-sm text-muted-foreground">You're not in a workspace yet.</p>
      </div>
    );
  }

  const canEdit = role === "owner";

  const copyCode = async () => {
    await navigator.clipboard.writeText(org.code);
    setCopied(true);
    toast.success("Org ID copied");
    setTimeout(() => setCopied(false), 1500);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("organizations").update({ name }).eq("id", org.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    onSaved();
    toast.success("Workspace updated");
  };

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Workspace</h2>

      {/* Org ID highlight */}
      <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5">
        <div className="mb-1 text-xs font-medium text-primary-600 uppercase tracking-wide">Org ID — share to invite members</div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-2xl font-bold text-primary-700">{org.code}</span>
          <button
            onClick={copyCode}
            className="rounded-lg border border-primary-200 bg-white px-3 py-1.5 text-xs font-medium text-primary-700 transition hover:bg-primary-100"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="mt-2 text-xs text-primary-600/70">
          New members paste this code during onboarding. Admins then approve their request.
        </p>
      </div>

      <Field label="Workspace name">
        <input
          className="input-field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canEdit}
        />
      </Field>

      <Field label="Your role">
        <input className="input-field capitalize" value={role} disabled />
      </Field>

      {canEdit && (
        <button
          onClick={save}
          className="btn-primary inline-flex items-center gap-2"
          disabled={saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save changes
        </button>
      )}
    </div>
  );
}

function SecurityTab({ email }: { email: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const change = async () => {
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return toast.error(error.message);
    setPassword("");
    setConfirm("");
    toast.success("Password updated successfully");
  };

  const sendReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) toast.error(error.message);
    else toast.success("Reset link sent to your email");
  };

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Security</h2>
      <Field label="New password">
        <input
          type="password"
          className="input-field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
      </Field>
      <Field label="Confirm password">
        <input
          type="password"
          className="input-field"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat password"
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={change}
          className="btn-primary inline-flex items-center gap-2"
          disabled={saving || !password}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Update password
        </button>
        <button
          onClick={sendReset}
          className="rounded-xl border border-border px-4 py-2 text-sm transition hover:bg-muted"
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
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
