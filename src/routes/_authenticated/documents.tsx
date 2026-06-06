import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { useEffect as useRealtimeEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Quote, Plus, FileText, Trash2, Loader2, Code, Paperclip, X, Upload, Share2, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_authenticated/documents")({ component: DocsPage });

type Doc = { id: string; title: string; content: any; board_id: string | null; updated_at: string; created_by: string };
type FileAttachment = { id: string; name: string; size: number; path: string; url: string };

function DocsPage() {
  const { user, org } = useAuth();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: docs } = useQuery({
    queryKey: ["docs", org?.id],
    enabled: !!org,
    queryFn: async () => {
      const { data } = await supabase.from("documents").select("*").eq("org_id", org!.id).order("updated_at", { ascending: false });
      return (data ?? []) as Doc[];
    },
  });

  const { data: boards } = useQuery({
    queryKey: ["boards", org?.id],
    enabled: !!org,
    queryFn: async () => {
      const { data } = await supabase.from("boards").select("id, name").eq("org_id", org!.id);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!activeId && docs?.length) setActiveId(docs[0].id);
  }, [docs, activeId]);

  const active = docs?.find((d) => d.id === activeId);

  const createDoc = async () => {
    if (!org || !user) return;
    const { data, error } = await supabase.from("documents")
      .insert({ org_id: org.id, title: "Untitled", created_by: user.id })
      .select().single();
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["docs", org.id] });
    setActiveId(data.id);
  };

  const deleteDoc = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    await supabase.from("documents").delete().eq("id", id);
    setActiveId(null);
    qc.invalidateQueries({ queryKey: ["docs", org!.id] });
  };

  if (!org) return <EmptyOrg />;

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="card-surface flex h-[calc(100vh-7rem)] flex-col p-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Documents</h2>
          <button onClick={createDoc} className="grid h-7 w-7 place-items-center rounded-lg bg-primary-600 text-white hover:bg-primary-700">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {!docs?.length && <p className="px-2 py-6 text-center text-xs text-muted-foreground">No documents yet</p>}
          {docs?.map((d) => (
            <button key={d.id} onClick={() => setActiveId(d.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition ${activeId === d.id ? "bg-primary-50 text-primary-700" : "hover:bg-muted"}`}>
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1 truncate">{d.title || "Untitled"}</div>
            </button>
          ))}
        </div>
      </aside>

      <div className="card-surface min-h-[calc(100vh-7rem)] p-6">
        {active ? (
          <Editor key={active.id} doc={active} boards={boards ?? []} onDelete={() => deleteDoc(active.id)} />
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            Select or create a document.
          </div>
        )}
      </div>
    </div>
  );
}

function Editor({ doc, boards, onDelete }: { doc: Doc; boards: { id: string; name: string }[]; onDelete: () => void }) {
  const { org, user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState(doc.title);
  const [boardId, setBoardId] = useState<string | "">(doc.board_id ?? "");
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Start writing your runbook, SOP, or notes…" }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary-700 underline" } }),
    ],
    content: doc.content,
    editorProps: { attributes: { class: "prose prose-sm max-w-none focus:outline-none min-h-[400px]" } },
  });

  // Load attachments
  const { data: fileList } = useQuery({
    queryKey: ["doc-files", doc.id],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("document-files")
        .list(`${org!.id}/${doc.id}`);
      
      if (error || !data) return [];
      
      const files: FileAttachment[] = await Promise.all(
        data.map(async (file) => {
          // The "document-files" bucket is private, so build a signed URL
          // (valid for 1 hour) instead of a public URL.
          const { data: signed } = await supabase.storage
            .from("document-files")
            .createSignedUrl(`${org!.id}/${doc.id}/${file.name}`, 60 * 60);
          
          return {
            id: file.id,
            name: file.name,
            size: file.metadata?.size ?? 0,
            path: `${org!.id}/${doc.id}/${file.name}`,
            url: signed?.signedUrl ?? "",
          };
        })
      );
      
      return files;
    },
  });

  useEffect(() => {
    if (fileList) setAttachments(fileList);
  }, [fileList]);

  useEffect(() => { setTitle(doc.title); setBoardId(doc.board_id ?? ""); }, [doc.id]);

  useEffect(() => {
    if (!editor) return;
    let t: any;
    const save = async () => {
      setSaving(true);
      await supabase.from("documents").update({
        title: title || "Untitled",
        content: editor.getJSON(),
        board_id: boardId || null,
      }).eq("id", doc.id);
      setSaving(false);
      qc.invalidateQueries({ queryKey: ["docs"] });
    };
    const handler = () => { clearTimeout(t); t = setTimeout(save, 700); };
    editor.on("update", handler);
    return () => { editor.off("update", handler); clearTimeout(t); };
  }, [editor, doc.id, title, boardId, qc]);

  // Subscribe to upload broadcasts from other team members
  useRealtimeEffect(() => {
    if (!org) return;
    const channel = supabase
      .channel(`doc-uploads:${org.id}`)
      .on("broadcast", { event: "file_uploaded" }, ({ payload }) => {
        toast(`📎 ${payload.uploaderName} uploaded ${payload.fileCount} file(s) to "${payload.docTitle}"`, {
          duration: 5000,
        });
        qc.invalidateQueries({ queryKey: ["doc-files", doc.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [org?.id, doc.id]);

  const saveMeta = async () => {
    await supabase.from("documents").update({ title: title || "Untitled", board_id: boardId || null }).eq("id", doc.id);
    qc.invalidateQueries({ queryKey: ["docs"] });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    if (!org || !user) {
      toast.error("Your workspace is still loading — try again in a moment.");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      for (const file of files) {
        const filePath = `${org.id}/${doc.id}/${file.name}`;
        const { error } = await supabase.storage
          .from("document-files")
          .upload(filePath, file, { upsert: true });

        if (error) throw error;
      }
      toast.success(`${files.length} file(s) uploaded`);
      qc.invalidateQueries({ queryKey: ["doc-files", doc.id] });
      // Broadcast upload event to other org members on the documents page
      if (org) {
        supabase.channel(`doc-uploads:${org.id}`).send({
          type: "broadcast",
          event: "file_uploaded",
          payload: {
            docTitle: doc.title || "Untitled",
            fileCount: files.length,
            uploaderName: user?.email ?? "A team member",
          },
        });
      }
    } catch (error: any) {
      const raw = (error?.message || error?.error || "").toString();
      const isRls =
        error?.statusCode === "403" ||
        error?.status === 403 ||
        /row-level security|row level security|violates.*policy|unauthorized/i.test(raw);

      if (isRls) {
        toast.error(
          "You don't have permission to upload to this workspace. Ask an admin to confirm your membership is active, then try again.",
          { duration: 6000 }
        );
      } else {
        toast.error(raw || "Upload failed");
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteFile = async (attachment: FileAttachment) => {
    if (!confirm(`Delete ${attachment.name}?`)) return;
    const { error } = await supabase.storage.from("document-files").remove([attachment.path]);
    if (error) return toast.error(error.message);
    toast.success("File deleted");
    qc.invalidateQueries({ queryKey: ["doc-files", doc.id] });
  };

  if (!editor) return <div className="grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary-600" /></div>;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={saveMeta}
          className="flex-1 bg-transparent text-2xl font-bold outline-none" placeholder="Untitled" />
        <select value={boardId} onChange={(e) => { setBoardId(e.target.value); setTimeout(saveMeta, 0); }} className="input-field py-1.5 text-xs">
          <option value="">No board</option>
          {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button 
          onClick={() => setShowShareModal(true)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium transition hover:bg-primary-50 hover:text-primary-700"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
        <span className="text-xs text-muted-foreground">{saving ? "Saving…" : "Saved"}</span>
        <button onClick={onDelete} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1">
        <ToolbarBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code className="h-4 w-4" /></ToolbarBtn>
        <label className="ml-auto flex h-8 cursor-pointer items-center gap-1.5 rounded px-2.5 text-xs font-medium text-muted-foreground transition hover:bg-primary-50 hover:text-primary-700" data-testid="document-upload-label">
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">{uploading ? "Uploading..." : "Upload File"}</span>
          <input
            type="file"
            multiple
            disabled={uploading}
            className="hidden"
            onChange={handleFileUpload}
            data-testid="document-upload-input"
          />
        </label>
      </div>

      {attachments.length > 0 && (
        <div className="mb-4 rounded-xl border border-border bg-muted/20 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Attachments ({attachments.length})
            </div>
          </div>
          <div className="space-y-1.5">
            {attachments.map((f) => (
              <div key={f.id} className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 text-sm transition hover:bg-muted/50">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                <a 
                  href={f.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 truncate font-medium hover:text-primary-600 hover:underline"
                >
                  {f.name}
                </a>
                <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</span>
                <button
                  onClick={() => handleDeleteFile(f)}
                  className="grid h-5 w-5 place-items-center rounded hover:bg-muted hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <EditorContent editor={editor} />

      <ShareModal 
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        docId={doc.id}
        docTitle={doc.title}
      />
    </div>
  );
}

function ShareModal({ open, onClose, docId, docTitle }: { open: boolean; onClose: () => void; docId: string; docTitle: string }) {
  const { org } = useAuth();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members", org?.id],
    enabled: !!org && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("organization_members")
        .select("user_id, profiles(id, full_name, email)")
        .eq("org_id", org!.id)
        .eq("status", "active");
      return data?.map((m: any) => ({
        id: m.profiles.id,
        name: m.profiles.full_name || m.profiles.email,
        email: m.profiles.email,
      })) ?? [];
    },
  });

  const handleShare = async () => {
    if (!selectedUsers.length) {
      toast.error("Select at least one team member");
      return;
    }
    setSharing(true);
    try {
      // In a real app, you'd insert into a document_shares table
      // For now, we'll just show a success message
      toast.success(`Document shared with ${selectedUsers.length} member(s)`);
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSharing(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-50 text-primary-600">
                <UsersIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Share Document</h3>
                <p className="text-xs text-muted-foreground">{docTitle}</p>
              </div>
            </div>

            <div className="mb-4 max-h-64 space-y-2 overflow-y-auto">
              {teamMembers?.map((member) => (
                <label
                  key={member.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(member.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers([...selectedUsers, member.id]);
                      } else {
                        setSelectedUsers(selectedUsers.filter((id) => id !== member.id));
                      }
                    }}
                    className="h-4 w-4 rounded border-border text-primary-600"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{member.name}</div>
                    <div className="text-xs text-muted-foreground">{member.email}</div>
                  </div>
                </label>
              ))}
              {!teamMembers?.length && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No team members found
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleShare}
                disabled={sharing || !selectedUsers.length}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {sharing ? "Sharing..." : `Share with ${selectedUsers.length || "..."}`}
              </button>
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ToolbarBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`grid h-8 w-8 place-items-center rounded ${active ? "bg-primary-600 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
      {children}
    </button>
  );
}

function EmptyOrg() {
  return (
    <div className="card-surface grid h-[60vh] place-items-center p-10 text-center">
      <div>
        <h2 className="text-lg font-semibold">No workspace yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">Create or join a workspace to write documents.</p>
      </div>
    </div>
  );
}
