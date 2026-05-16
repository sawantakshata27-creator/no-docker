import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { toast } from "sonner";
import { ArrowRight, Loader2, Check, Users, Building2, KeyRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({ component: Onboarding });

function genCode(name: string) {
  const slug = (name || "TEAM").toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 5) || "TEAM";
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${slug}-${rand}`;
}

function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [mode, setMode] = useState<"create" | "join">("create");
  const [orgName, setOrgName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await supabase.from("profiles").update({ full_name: fullName, onboarded: true }).eq("id", user.id);

      if (mode === "create") {
        const code = genCode(orgName);
        const { data: org, error: oErr } = await supabase
          .from("organizations")
          .insert({ name: orgName, code, owner_id: user.id })
          .select()
          .single();
        if (oErr) throw oErr;

        // Seed first org board
        const { data: board, error: bErr } = await supabase
          .from("boards")
          .insert({ owner_id: user.id, org_id: org.id, name: `${orgName} Board`, key: "MAIN", description: "Main workflow board" })
          .select().single();
        if (bErr) throw bErr;

        const cols = [
          { name: "Backlog", position: 0, color: "#94a3b8" },
          { name: "In Progress", position: 1, color: "#3b82f6" },
          { name: "In Review", position: 2, color: "#f59e0b" },
          { name: "Done", position: 3, color: "#10b981" },
        ].map((c) => ({ ...c, board_id: board.id }));
        const { data: insertedCols } = await supabase.from("board_columns").insert(cols).select();
        const backlog = insertedCols!.find((c) => c.name === "Backlog")!;
        const inProgress = insertedCols!.find((c) => c.name === "In Progress")!;
        await supabase.from("tasks").insert([
          { title: "Welcome to 2DS Workflow", description: "Drag this card to another column.", column_id: backlog.id, position: 0, priority: "high", process_stage: "Sign Creation", board_id: board.id, created_by: user.id },
          { title: "Invite your team", description: `Share code ${code} from the Team page.`, column_id: backlog.id, position: 1, priority: "medium", process_stage: "Pre-processing", board_id: board.id, created_by: user.id },
          { title: "Try the Documents page", description: "Write your first runbook.", column_id: inProgress.id, position: 0, priority: "low", process_stage: "QA", board_id: board.id, created_by: user.id },
        ]);
      } else {
        // Join existing org by code → creates pending membership
        const { data: org, error: oErr } = await supabase
          .from("organizations").select("id, name").eq("code", joinCode.trim().toUpperCase()).maybeSingle();
        if (oErr) throw oErr;
        if (!org) throw new Error("No workspace found with that code");
        const { error: mErr } = await supabase
          .from("organization_members")
          .insert({ org_id: org.id, user_id: user.id, role: "member", status: "pending" });
        if (mErr && !mErr.message.includes("duplicate")) throw mErr;
        toast.success(`Request sent to join ${org.name}. An admin will approve you shortly.`);
      }

      await refreshProfile();
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: "What should we call you?",
      subtitle: "We'll use this on your profile and assignments.",
      content: (
        <input autoFocus className="input-field text-lg" placeholder="Jane Doe"
          value={fullName} onChange={(e) => setFullName(e.target.value)} />
      ),
      canContinue: fullName.trim().length > 1,
    },
    {
      title: "Create or join a workspace?",
      subtitle: "Admins create a workspace and share its code. Members join with it.",
      content: (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { v: "create", t: "Create workspace", d: "I'm setting things up.", icon: Building2 },
            { v: "join", t: "Join existing", d: "I have a workspace code.", icon: KeyRound },
          ].map((o) => (
            <button key={o.v} onClick={() => setMode(o.v as any)}
              className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition ${mode === o.v ? "border-primary-600 bg-primary-50" : "border-border bg-card hover:bg-muted"}`}>
              <div className={`grid h-10 w-10 place-items-center rounded-lg ${mode === o.v ? "bg-primary-600 text-white" : "bg-muted"}`}><o.icon className="h-5 w-5" /></div>
              <div className="font-semibold">{o.t}</div>
              <div className="text-xs text-muted-foreground">{o.d}</div>
            </button>
          ))}
        </div>
      ),
      canContinue: true,
    },
    mode === "create" ? {
      title: "Name your workspace",
      subtitle: "Your team, boards, and documents will live here.",
      content: (
        <input autoFocus className="input-field text-lg" placeholder="Acme Operations"
          value={orgName} onChange={(e) => setOrgName(e.target.value)} />
      ),
      canContinue: orgName.trim().length > 1,
    } : {
      title: "Enter the workspace code",
      subtitle: "Ask your admin for the code shown on their Team page.",
      content: (
        <input autoFocus className="input-field text-lg uppercase tracking-widest" placeholder="ACME-7Q2X"
          value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} />
      ),
      canContinue: joinCode.trim().length >= 4,
    },
    {
      title: mode === "create" ? "You're ready to launch" : "Request to join",
      subtitle: mode === "create"
        ? "We'll create your workspace and seed your first board."
        : "We'll send your request to the workspace admins for approval.",
      content: (
        <div className="card-surface space-y-3 p-5 bg-primary-50/60">
          <Row label="Name" value={fullName} />
          <Row label="Action" value={mode === "create" ? `Create "${orgName}"` : `Join ${joinCode}`} />
        </div>
      ),
      canContinue: true,
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="grid min-h-screen place-items-center bg-surface p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>Step {step + 1} of {steps.length}</span>
          <span>{Math.round(((step + 1) / steps.length) * 100)}%</span>
        </div>
        <div className="mb-8 h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div className="h-full bg-primary-600" initial={false}
            animate={{ width: `${((step + 1) / steps.length) * 100}%` }} transition={{ duration: 0.4 }} />
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.25 }} className="card-surface p-8">
            <h1 className="text-2xl font-semibold">{current.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{current.subtitle}</p>
            <div className="mt-6">{current.content}</div>
            <div className="mt-8 flex justify-between">
              <button onClick={back} disabled={step === 0} className="rounded-xl px-4 py-2 text-sm text-muted-foreground disabled:opacity-30 hover:bg-muted">Back</button>
              <button onClick={isLast ? finish : next} disabled={!current.canContinue || loading} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isLast ? (mode === "create" ? "Create workspace" : "Send request") : "Continue"}
                {!isLast && !loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}
