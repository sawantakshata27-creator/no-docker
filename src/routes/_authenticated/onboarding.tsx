import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { toast } from "sonner";
import { ArrowRight, Loader2, Check, Users, Briefcase, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({ component: Onboarding });

const ROLES = [
  { value: "manager", label: "Manager", desc: "I oversee a team and plan work", icon: Briefcase },
  { value: "member", label: "Team member", desc: "I work on tasks day-to-day", icon: User },
  { value: "admin", label: "Admin / Owner", desc: "I run the whole workspace", icon: Users },
];

function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [teamName, setTeamName] = useState("");
  const [role, setRole] = useState<string>("member");
  const [loading, setLoading] = useState(false);

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Update profile
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ full_name: fullName, team_name: teamName, onboarded: true })
        .eq("id", user.id);
      if (pErr) throw pErr;

      // 2. Insert chosen role if not member (member already auto-assigned)
      if (role !== "member") {
        await supabase.from("user_roles").insert({ user_id: user.id, role: role as any });
      }

      // 3. Create default board + columns + sample tasks
      const { data: board, error: bErr } = await supabase
        .from("boards")
        .insert({ owner_id: user.id, name: `${teamName || "My"} Board`, key: "MAIN", description: "Your first workflow board" })
        .select()
        .single();
      if (bErr) throw bErr;

      const cols = [
        { name: "Backlog", position: 0, color: "#94a3b8" },
        { name: "In Progress", position: 1, color: "#3b82f6" },
        { name: "In Review", position: 2, color: "#f59e0b" },
        { name: "Done", position: 3, color: "#10b981" },
      ].map((c) => ({ ...c, board_id: board.id }));
      const { data: insertedCols, error: cErr } = await supabase.from("board_columns").insert(cols).select();
      if (cErr) throw cErr;

      // Sample tasks
      const backlog = insertedCols!.find((c) => c.name === "Backlog")!;
      const inProgress = insertedCols!.find((c) => c.name === "In Progress")!;
      const sampleTasks = [
        { title: "Welcome to 2DS Workflow 👋", description: "Drag this card to another column.", column_id: backlog.id, position: 0, priority: "high", process_stage: "Sign Creation" },
        { title: "Pre-process Q4 batch", description: "Sample task to play with.", column_id: backlog.id, position: 1, priority: "medium", process_stage: "Pre-processing" },
        { title: "QA association review", description: "Try clicking to edit.", column_id: inProgress.id, position: 0, priority: "low", process_stage: "QA" },
      ].map((t) => ({ ...t, board_id: board.id, created_by: user.id }));
      await supabase.from("tasks").insert(sampleTasks);

      await refreshProfile();
      toast.success("You're all set!");
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
        <input
          autoFocus
          className="input-field text-lg"
          placeholder="Jane Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      ),
      canContinue: fullName.trim().length > 1,
    },
    {
      title: "Name your workspace",
      subtitle: "This is where your team and boards will live.",
      content: (
        <input
          autoFocus
          className="input-field text-lg"
          placeholder="Acme Operations"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
        />
      ),
      canContinue: teamName.trim().length > 1,
    },
    {
      title: "What's your role?",
      subtitle: "We'll tailor your starting view.",
      content: (
        <div className="space-y-2">
          {ROLES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRole(r.value)}
              className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
                role === r.value ? "border-primary-600 bg-primary-50" : "border-border bg-card hover:bg-muted"
              }`}
            >
              <div className={`grid h-10 w-10 place-items-center rounded-lg ${role === r.value ? "bg-primary-600 text-white" : "bg-muted text-muted-foreground"}`}>
                <r.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{r.label}</div>
                <div className="text-xs text-muted-foreground">{r.desc}</div>
              </div>
              {role === r.value && <Check className="h-5 w-5 text-primary-600" />}
            </button>
          ))}
        </div>
      ),
      canContinue: true,
    },
    {
      title: "You're ready to go 🎉",
      subtitle: "We'll set up your first board with sample tasks so you can try drag-and-drop right away.",
      content: (
        <div className="card-surface space-y-3 p-5 bg-primary-50/60">
          <Row label="Name" value={fullName} />
          <Row label="Workspace" value={teamName} />
          <Row label="Role" value={ROLES.find((r) => r.value === role)?.label ?? role} />
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
          <motion.div
            className="h-full bg-primary-600"
            initial={false}
            animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.25 }}
            className="card-surface p-8"
          >
            <h1 className="text-2xl font-semibold">{current.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{current.subtitle}</p>
            <div className="mt-6">{current.content}</div>
            <div className="mt-8 flex justify-between">
              <button
                onClick={back}
                disabled={step === 0}
                className="rounded-xl px-4 py-2 text-sm text-muted-foreground disabled:opacity-30 hover:bg-muted"
              >Back</button>
              <button
                onClick={isLast ? finish : next}
                disabled={!current.canContinue || loading}
                className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isLast ? "Enter workspace" : "Continue"}
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
