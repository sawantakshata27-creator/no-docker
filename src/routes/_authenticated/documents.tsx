import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import {
  Plus, FileText, FileSpreadsheet, FileImage, FileCode, FileArchive,
  File, Trash2, Loader2, Upload,
  FolderOpen, Download, Search, StickyNote, Save,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { pushNotification } from "@/lib/notifications";

export const Route = createFileRoute("/_authenticated/documents")({ component: DocsPage });

type FileAttachment = { id: string; name: string; size: number; path: string; url: string };
type TeamMember = { id: string; name: string; email: string };

// ── Main page ─────────────────────────────────────────────────────────────────

function DocsPage() {
  const { user, org } = useAuth();
  const [pageTab, setPageTab] = useState<"notes" | "files">("notes");

  const scopeFilter = org
    ? { column: "org_id", value: org.id }
    : { column: "created_by", value: user?.id ?? "" };

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members", org?.id],
    enabled: !!org,
    queryFn: async () => {
      const { data } = await supabase
        .from("organization_members")
        .select("user_id, profiles(id, full_name, email)")
        .eq("org_id", org!.id).eq("status", "active");
      return data?.map((m: any) => ({
        id: m.profiles.id,
        name: m.profiles.full_name || m.profiles.email,
        email: m.profiles.email,
      })) as TeamMember[] ?? [];
    },
  });

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="text-sm text-muted-foreground">Jot notes and share files with your team.</p>
      </div>

      {/* Page tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1 w-fit">
        {([
          { key: "notes", label: "Notes", icon: <StickyNote className="h-4 w-4" /> },
          { key: "files", label: "Files", icon: <FolderOpen className="h-4 w-4" /> },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setPageTab(t.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              pageTab === t.key ? "bg-primary-600 text-white shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {pageTab === "notes" && (
        <div className="flex-1 overflow-auto">
          <NotesTab userId={user?.id ?? ""} orgId={org?.id ?? ""} actorId={user?.id ?? ""} />
        </div>
      )}

      {pageTab === "files" && (
        <div className="flex-1 overflow-auto">
          <FilesHub scopeFilter={scopeFilter} teamMembers={teamMembers ?? []} />
        </div>
      )}
    </div>
  );
}

// ── Notes tab ─────────────────────────────────────────────────────────────────

type Note = { id: string; title: string; body: string; updatedAt: string };

function notesKey(userId: string) { return `notes:${userId}`; }
function loadNotes(userId: string): Note[] {
  try { const raw = localStorage.getItem(notesKey(userId)); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveNotes(userId: string, notes: Note[]) {
  try { localStorage.setItem(notesKey(userId), JSON.stringify(notes)); } catch {}
}

function NotesTab({ userId, orgId, actorId }: { userId: string; orgId: string; actorId: string }) {
  const [notes, setNotes] = useState<Note[]>(() => loadNotes(userId));
  const [activeNoteId, setActiveNoteId] = useState<string | null>(notes[0]?.id ?? null);
  const [saved, setSaved] = useState(true);
  const saveTimer = useRef<any>(null);

  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null;

  const notify = (kind: Parameters<typeof pushNotification>[0]["kind"], title: string) => {
    if (!orgId || !actorId) return;
    pushNotification({ orgId, actorId, kind, title, entityType: "note" });
  };

  const persist = (next: Note[]) => {
    setNotes(next);
    saveNotes(userId, next);
  };

  const createNote = () => {
    const note: Note = { id: crypto.randomUUID(), title: "New Note", body: "", updatedAt: new Date().toISOString() };
    const next = [note, ...notes];
    persist(next);
    setActiveNoteId(note.id);
    setSaved(true);
    notify("note_created", "New note created");
  };

  const deleteNote = (id: string) => {
    if (!confirm("Delete this note?")) return;
    const note = notes.find((n) => n.id === id);
    const next = notes.filter((n) => n.id !== id);
    persist(next);
    setActiveNoteId(next[0]?.id ?? null);
    notify("note_deleted", `Note deleted: ${note?.title || "Untitled"}`);
  };

  const patchNote = (id: string, patch: Partial<Note>) => {
    setSaved(false);
    clearTimeout(saveTimer.current);
    const next = notes.map((n) => n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n);
    setNotes(next);
    saveTimer.current = setTimeout(() => { saveNotes(userId, next); setSaved(true); }, 600);
  };

  const saveNow = () => {
    clearTimeout(saveTimer.current);
    saveNotes(userId, notes);
    setSaved(true);
    if (activeNote) notify("note_updated", `Note saved: ${activeNote.title || "Untitled"}`);
  };

  return (
    <div className="grid h-full gap-4 lg:grid-cols-[240px_1fr]" style={{ minHeight: "60vh" }}>
      {/* Notes list */}
      <aside className="card-surface flex flex-col overflow-hidden p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Notes ({notes.length})
          </span>
          <button
            onClick={createNote}
            className="flex items-center gap-1 rounded-lg bg-primary-600 px-2 py-1 text-xs font-semibold text-white hover:bg-primary-700"
          >
            <Plus className="h-3 w-3" /> New
          </button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {notes.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              No notes yet. Click <strong>New</strong> to jot one down.
            </p>
          )}
          {notes.map((n) => (
            <div key={n.id} className="flex items-center gap-1">
              <button
                onClick={() => setActiveNoteId(n.id)}
                className={`flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition ${
                  activeNoteId === n.id ? "bg-primary-50 text-primary-700" : "hover:bg-muted"
                }`}
              >
                <StickyNote className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{n.title || "Untitled"}</div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {new Date(n.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Note editor */}
      <div className="card-surface flex flex-col gap-3 p-5">
        {activeNote ? (
          <>
            <div className="flex items-center gap-3">
              <input
                value={activeNote.title}
                onChange={(e) => patchNote(activeNote.id, { title: e.target.value })}
                className="flex-1 bg-transparent text-xl font-bold outline-none placeholder-muted-foreground"
                placeholder="Note title…"
              />
              <button
                onClick={saveNow}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-primary-50 hover:text-primary-700"
              >
                <Save className="h-3.5 w-3.5" /> Save
              </button>
              <button
                onClick={() => deleteNote(activeNote.id)}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
            <div className="h-px bg-border" />
            <textarea
              value={activeNote.body}
              onChange={(e) => patchNote(activeNote.id, { body: e.target.value })}
              placeholder="Start writing your note…"
              className="flex-1 resize-none bg-transparent text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60"
              style={{ minHeight: "400px" }}
            />
          </>
        ) : (
          <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <StickyNote className="h-10 w-10 opacity-30" />
              <p>Select a note or click <strong>New</strong> to get started.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Files Hub ─────────────────────────────────────────────────────────────────

function FilesHub({
  scopeFilter,
  teamMembers,
}: {
  scopeFilter: { column: string; value: string };
  teamMembers: TeamMember[];
}) {
  const { user, org } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [search, setSearch] = useState("");

  const hubPrefix = org ? `${org.id}/shared` : `user/${user?.id}/shared`;

  const { data: files = [] } = useQuery({
    queryKey: ["hub-files", hubPrefix],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("document-files").list(hubPrefix, { limit: 200 });
      if (error || !data) return [] as FileAttachment[];
      return Promise.all(
        data.map(async (f) => {
          const { data: signed } = await supabase.storage
            .from("document-files")
            .createSignedUrl(`${hubPrefix}/${f.name}`, 3600);
          return {
            id: f.id ?? f.name,
            name: f.name,
            size: f.metadata?.size ?? 0,
            path: `${hubPrefix}/${f.name}`,
            url: signed?.signedUrl ?? "",
          } as FileAttachment;
        }),
      );
    },
  });

  const uploadFiles = useCallback(async (fileList: File[]) => {
    if (!fileList.length) return;
    setUploading(true);
    let success = 0;
    for (const file of fileList) {
      const { error } = await supabase.storage
        .from("document-files")
        .upload(`${hubPrefix}/${file.name}`, file, { upsert: true });
      if (error) { toast.error(`Failed: ${file.name} — ${error.message}`); }
      else success++;
    }
    if (success) {
      toast.success(`${success} file${success !== 1 ? "s" : ""} uploaded`);
      qc.invalidateQueries({ queryKey: ["hub-files", hubPrefix] });
      if (org && user) {
        pushNotification({
          orgId: org.id, actorId: user.id,
          kind: "file_uploaded",
          title: `${success} file${success !== 1 ? "s" : ""} uploaded`,
          entityType: "file",
        });
      }
    }
    setUploading(false);
  }, [hubPrefix, org, user, qc]);

  const handleInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    e.target.value = "";
    await uploadFiles(list);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    await uploadFiles(Array.from(e.dataTransfer.files));
  };

  const handleDelete = async (f: FileAttachment) => {
    if (!confirm(`Delete "${f.name}"?`)) return;
    const { error } = await supabase.storage.from("document-files").remove([f.path]);
    if (error) { toast.error(error.message); return; }
    toast.success("File deleted");
    qc.invalidateQueries({ queryKey: ["hub-files", hubPrefix] });
    if (org && user) {
      pushNotification({
        orgId: org.id, actorId: user.id,
        kind: "file_deleted",
        title: `File deleted: ${f.name}`,
        entityType: "file",
      });
    }
  };

  const filtered = files.filter((f) =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 text-center transition-colors ${
          dragOver ? "border-primary-400 bg-primary-50" : "border-border hover:border-primary-300 hover:bg-muted/30"
        }`}
      >
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-50 text-primary-600">
          {uploading ? <Loader2 className="h-7 w-7 animate-spin" /> : <Upload className="h-7 w-7" />}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {uploading ? "Uploading…" : "Drop files here or click to upload"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Any file type · visible to all team members
          </p>
        </div>
        <input ref={fileInputRef} type="file" multiple accept="*/*" className="hidden" onChange={handleInput} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <Upload className="h-4 w-4" /> Choose Files
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files…"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 pl-9 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} file{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* File list */}
      {filtered.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-3 py-16 text-center">
          <FolderOpen className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {search ? "No files match your search." : "No files uploaded yet. Drop files above to get started."}
          </p>
        </div>
      ) : (
        <div className="card-surface overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-[1fr_120px_140px_100px] gap-4 border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>File</span>
            <span>Size</span>
            <span>Type</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {filtered.map((f) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-[1fr_120px_140px_100px] items-center gap-4 px-4 py-3 transition hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted">
                      <FileIcon name={f.name} size="md" />
                    </div>
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm font-medium hover:text-primary-600 hover:underline"
                    >
                      {f.name}
                    </a>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatBytes(f.size)}</span>
                  <span className="truncate text-xs text-muted-foreground uppercase">
                    {f.name.split(".").pop() ?? "—"}
                  </span>
                  <div className="flex items-center justify-end gap-1">
                    <a
                      href={f.url}
                      download={f.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-primary-50 hover:text-primary-700"
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                    <button
                      onClick={() => handleDelete(f)}
                      className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-red-50 hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function FileIcon({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const cls = size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";
  if (["jpg","jpeg","png","gif","webp","svg","bmp","ico","tiff"].includes(ext)) return <FileImage className={`${cls} text-rose-500`} />;
  if (["xls","xlsx","csv","ods"].includes(ext)) return <FileSpreadsheet className={`${cls} text-emerald-600`} />;
  if (["ppt","pptx","odp"].includes(ext)) return <FileText className={`${cls} text-orange-500`} />;
  if (["doc","docx","odt","rtf"].includes(ext)) return <FileText className={`${cls} text-blue-500`} />;
  if (["pdf"].includes(ext)) return <FileText className={`${cls} text-red-600`} />;
  if (["txt","md","log"].includes(ext)) return <FileCode className={`${cls} text-muted-foreground`} />;
  if (["zip","rar","7z","tar","gz"].includes(ext)) return <FileArchive className={`${cls} text-yellow-600`} />;
  if (["js","ts","jsx","tsx","py","java","cs","html","css","json","xml"].includes(ext)) return <FileCode className={`${cls} text-violet-500`} />;
  return <File className={`${cls} text-muted-foreground`} />;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
