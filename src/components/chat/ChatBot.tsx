import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, FileText, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { askGemini, type GeminiMessage } from "@/lib/gemini";
import { extractFileText } from "@/lib/extractFileText";

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;
const STORAGE_KEY = "chatbot_session";

type FileItem = { name: string; path: string; url: string };
type Message = { role: "user" | "model"; text: string };
type Session = { selectedFile: FileItem | null; messages: Message[] };

function loadSession(): Session {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { selectedFile: null, messages: [] };
}

function saveSession(session: Session) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session)); } catch {}
}

export function ChatBot() {
  const { org, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(() => loadSession().selectedFile);
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [fileText, setFileText] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => loadSession().messages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const filePickerRef = useRef<HTMLDivElement>(null);

  // Persist session on every change
  useEffect(() => {
    saveSession({ selectedFile, messages });
  }, [selectedFile, messages]);

  // Re-extract file text on mount if session had a file selected
  useEffect(() => {
    if (!selectedFile || fileText) return;
    setExtracting(true);
    extractFileText(selectedFile.url, selectedFile.name)
      .then((text) => setFileText(text))
      .catch(() => {}) // signed URL may have expired — user can reselect
      .finally(() => setExtracting(false));
  }, []);

  // Load org files when opened
  useEffect(() => {
    if (!open || !org || !profile) return;
    const prefix = `${org.id}/shared`;
    supabase.storage
      .from("document-files")
      .list(prefix, { limit: 200 })
      .then(async ({ data, error }) => {
        if (error || !data) return;
        const items: FileItem[] = [];
        for (const f of data) {
          const { data: signed } = await supabase.storage
            .from("document-files")
            .createSignedUrl(`${prefix}/${f.name}`, 3600);
          if (signed?.signedUrl) {
            items.push({ name: f.name, path: `${prefix}/${f.name}`, url: signed.signedUrl });
          }
        }
        setFiles(items);
      });
  }, [open, org, profile]);

  // Close file picker on outside click
  useEffect(() => {
    if (!filePickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (!filePickerRef.current?.contains(e.target as Node)) setFilePickerOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filePickerOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSelectFile = async (file: FileItem) => {
    setSelectedFile(file);
    setFilePickerOpen(false);
    setFileText(null);
    setMessages([]);
    setExtracting(true);
    try {
      const text = await extractFileText(file.url, file.name);
      setFileText(text);
      setMessages([{
        role: "model",
        text: `I've read **${file.name}**. Ask me anything about it!`,
      }]);
    } catch (err: any) {
      toast.error(err?.message ?? "Could not read file.");
      setSelectedFile(null);
    } finally {
      setExtracting(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading || !fileText) return;
    if (!API_KEY) {
      toast.error("Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.");
      return;
    }

    const userMsg: Message = { role: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Build conversation for OpenRouter (OpenAI-compatible format)
      const systemMessage: GeminiMessage = {
        role: "user",
        content: `You are a helpful assistant. The user has provided the following document:\n--- DOCUMENT START ---\n${fileText}\n--- DOCUMENT END ---\nAnswer questions about this document clearly and concisely.`,
      };

      const history: GeminiMessage[] = messages
        .filter((m) => m.text !== `I've read **${selectedFile?.name}**. Ask me anything about it!`)
        .map((m) => ({
          role: m.role === "model" ? "assistant" : "user",
          content: m.text,
        }));

      const allMessages: GeminiMessage[] = [
        systemMessage,
        ...history,
        { role: "user", content: userMsg.text },
      ];

      const reply = await askGemini(API_KEY, allMessages);
      setMessages((prev) => [...prev, { role: "model", text: reply }]);
    } catch (err: any) {
      toast.error(err?.message ?? "Gemini request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating bubble */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-xl"
        style={{
          background: "linear-gradient(135deg, oklch(0.640 0.112 188) 0%, oklch(0.535 0.100 188) 100%)",
        }}
        title="Document Assistant"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
              <X className="h-6 w-6 text-white" />
            </motion.span>
          ) : (
            <motion.span key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }}>
              <MessageCircle className="h-6 w-6 text-white" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 right-6 z-50 flex w-96 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            style={{ height: 520 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3"
              style={{ background: "linear-gradient(135deg, oklch(0.640 0.112 188) 0%, oklch(0.535 0.100 188) 100%)" }}
            >
              <MessageCircle className="h-5 w-5 shrink-0 text-white" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">Document Assistant</div>
                <div className="truncate text-[11px] text-white/70">
                  {selectedFile ? selectedFile.name : "Select a file to start"}
                </div>
              </div>
            </div>

            {/* File picker */}
            <div className="border-b border-border px-3 py-2" ref={filePickerRef}>
              <button
                onClick={() => setFilePickerOpen((v) => !v)}
                className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm transition hover:bg-muted"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-left text-sm">
                  {selectedFile ? selectedFile.name : "Choose a document…"}
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${filePickerOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {filePickerOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 z-10 mx-3 mt-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-card shadow-xl"
                  >
                    {files.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-muted-foreground">No files uploaded yet.</p>
                    ) : (
                      files.map((f) => (
                        <button
                          key={f.path}
                          onClick={() => handleSelectFile(f)}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition hover:bg-muted"
                        >
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{f.name}</span>
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {extracting && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Reading document…
                </div>
              )}
              {!selectedFile && !extracting && (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                  <FileText className="h-10 w-10 opacity-30" />
                  <p>Select a document above to start chatting.</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "rounded-br-sm text-white"
                        : "rounded-bl-sm bg-muted text-foreground"
                    }`}
                    style={m.role === "user" ? {
                      background: "linear-gradient(135deg, oklch(0.640 0.112 188) 0%, oklch(0.535 0.100 188) 100%)",
                    } : {}}
                  >
                    {m.role === "user" ? m.text : (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          ul: ({ children }) => <ul className="ml-4 list-disc space-y-0.5 my-1">{children}</ul>,
                          ol: ({ children }) => <ol className="ml-4 list-decimal space-y-0.5 my-1">{children}</ol>,
                          li: ({ children }) => <li>{children}</li>,
                          code: ({ children }) => <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-xs">{children}</code>,
                          h1: ({ children }) => <h1 className="font-bold text-base mb-1">{children}</h1>,
                          h2: ({ children }) => <h2 className="font-bold mb-1">{children}</h2>,
                          h3: ({ children }) => <h3 className="font-semibold mb-1">{children}</h3>,
                        }}
                      >
                        {m.text}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-3">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={!fileText || loading || extracting}
                  placeholder={fileText ? "Ask about the document…" : "Select a file first…"}
                  className="flex-1 rounded-full border border-border bg-muted/40 px-4 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || !fileText || loading || extracting}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, oklch(0.640 0.112 188) 0%, oklch(0.535 0.100 188) 100%)" }}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
