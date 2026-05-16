import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Quote, Plus, FileText, Trash2, Loader2, Code } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/documents")({ component: DocsPage });

type Doc = { id: string; title: string; content: any; board_id: string | null; updated_at: string; created_by: string };

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
  const qc = useQueryClient();
  const [title, setTitle] = useState(doc.title);
  const [boardId, setBoardId] = useState<string | "">(doc.board_id ?? "");
  const [saving, setSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Start writing your runbook, SOP, or notes…" }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary-700 underline" } }),
    ],
    content: doc.content,
    editorProps: { attributes: { class: "prose prose-sm max-w-none focus:outline-none min-h-[400px]" } },
  });

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

  const saveMeta = async () => {
    await supabase.from("documents").update({ title: title || "Untitled", board_id: boardId || null }).eq("id", doc.id);
    qc.invalidateQueries({ queryKey: ["docs"] });
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
      </div>

      <EditorContent editor={editor} />
    </div>
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
