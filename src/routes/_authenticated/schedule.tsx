import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Loader2, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/_authenticated/schedule")({ component: SchedulePage });

// ── Types ─────────────────────────────────────────────────────────────────────

const REGIONS = ["EMEA", "APAC", "AMER"] as const;
type Region = (typeof REGIONS)[number];

const PROCESSES = ["Pre Processing", "Sign Creation", "Association", "Adjustment"] as const;
type Process = (typeof PROCESSES)[number];

type ScopeTab = "planned" | "actual";

type ScopeEntry = { date: string; volume: string; note: string };
type RegionEntry = { planned: ScopeEntry; actual: ScopeEntry };
type AllDelivery = Record<Process, Record<Region, RegionEntry>>;

const EMPTY_SCOPE: ScopeEntry = { date: "", volume: "", note: "" };

function emptyAll(): AllDelivery {
  return PROCESSES.reduce((acc, p) => {
    acc[p] = REGIONS.reduce((racc, r) => {
      racc[r] = { planned: { ...EMPTY_SCOPE }, actual: { ...EMPTY_SCOPE } };
      return racc;
    }, {} as Record<Region, RegionEntry>);
    return acc;
  }, {} as AllDelivery);
}

function rowsToDelivery(rows: any[]): AllDelivery {
  const out = emptyAll();
  for (const row of rows) {
    const p = row.process as Process;
    const r = row.region as Region;
    if (!PROCESSES.includes(p) || !REGIONS.includes(r)) continue;
    out[p][r] = {
      planned: { date: row.planned_date ?? "", volume: row.planned_volume ?? "", note: row.planned_note ?? "" },
      actual:  { date: row.actual_date  ?? "", volume: row.actual_volume  ?? "", note: row.actual_note  ?? "" },
    };
  }
  return out;
}

const REGION_ACCENT: Record<Region, { dot: string; activeBorder: string; headerBg: string }> = {
  EMEA: { dot: "bg-blue-400",    activeBorder: "border-blue-300",    headerBg: "bg-blue-50" },
  APAC: { dot: "bg-emerald-400", activeBorder: "border-emerald-300", headerBg: "bg-emerald-50" },
  AMER: { dot: "bg-violet-400",  activeBorder: "border-violet-300",  headerBg: "bg-violet-50" },
};

const SCOPE_CONFIG: Record<ScopeTab, { label: string; activeClass: string }> = {
  planned: { label: "Planned Scope", activeClass: "bg-primary-600 text-white" },
  actual:  { label: "Actual Scope",  activeClass: "bg-emerald-600 text-white" },
};

// ── Page ──────────────────────────────────────────────────────────────────────

function SchedulePage() {
  const { org } = useAuth();
  const qc = useQueryClient();
  const [activeProcess, setActiveProcess] = useState<Process>(PROCESSES[0]);
  const [scopeTabs, setScopeTabs] = useState<Record<Region, ScopeTab>>({
    EMEA: "planned", APAC: "planned", AMER: "planned",
  });
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState<AllDelivery>(emptyAll);

  const { isLoading } = useQuery({
    queryKey: ["scheduled-delivery", org?.id],
    enabled: !!org,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("scheduled_delivery")
        .select("*")
        .eq("org_id", org!.id);
      if (error) throw error;
      const delivery = rowsToDelivery(data ?? []);
      setLocal(delivery);
      return delivery;
    },
  });

  // ── Auto-sync actuals from Done tasks ────────────────────────────────────────
  const { data: doneTasks } = useQuery({
    queryKey: ["done-tasks-for-schedule", org?.id],
    enabled: !!org,
    refetchInterval: 60_000,
    queryFn: async () => {
      // Get Done column ids for this org's boards
      const { data: cols } = await supabase
        .from("board_columns")
        .select("id, boards!inner(org_id)")
        .eq("boards.org_id", org!.id)
        .ilike("name", "done");
      const doneColIds = (cols ?? []).map((c: any) => c.id);
      if (!doneColIds.length) return [];
      const { data: tasks } = await (supabase as any)
        .from("tasks")
        .select("process_stage, region, files_count")
        .in("column_id", doneColIds)
        .not("region", "is", null)
        .not("process_stage", "is", null);
      return (tasks ?? []) as { process_stage: string; region: string; files_count: number | null }[];
    },
  });

  useEffect(() => {
    if (!org || !doneTasks) return;
    // Aggregate files_count by (process, region)
    const totals: Record<string, Record<string, number>> = {};
    for (const t of doneTasks) {
      const p = t.process_stage as string;
      const r = t.region as string;
      if (!totals[p]) totals[p] = {};
      totals[p][r] = (totals[p][r] ?? 0) + (t.files_count ?? 1);
    }
    // Build upserts only for rows that have a computed total
    const upserts: any[] = [];
    for (const proc of PROCESSES) {
      for (const region of REGIONS) {
        const vol = totals[proc]?.[region];
        if (vol !== undefined) {
          upserts.push({
            org_id: org.id,
            process: proc,
            region,
            actual_volume: String(vol),
          });
        }
      }
    }
    if (!upserts.length) return;
    ;(supabase as any)
      .from("scheduled_delivery")
      .upsert(upserts, { onConflict: "org_id,process,region" })
      .then(({ error }: { error: any }) => {
        if (!error) {
          qc.invalidateQueries({ queryKey: ["scheduled-delivery", org.id] });
        }
      });
  }, [doneTasks, org]);

  const patch = (
    process: Process, region: Region, scope: ScopeTab,
    field: keyof ScopeEntry, value: string,
  ) =>
    setLocal((prev) => ({
      ...prev,
      [process]: {
        ...prev[process],
        [region]: {
          ...prev[process][region],
          [scope]: { ...prev[process][region][scope], [field]: value },
        },
      },
    }));

  const handleSave = async () => {
    if (!org) return;
    setSaving(true);
    try {
      const upserts = REGIONS.map((r) => {
        const entry = local[activeProcess][r];
        return {
          org_id: org.id,
          process: activeProcess,
          region: r,
          planned_date:   entry.planned.date   || null,
          planned_volume: entry.planned.volume  || null,
          planned_note:   entry.planned.note    || null,
          actual_date:    entry.actual.date     || null,
          actual_volume:  entry.actual.volume   || null,
          actual_note:    entry.actual.note     || null,
        };
      });
      const { error } = await (supabase as any)
        .from("scheduled_delivery")
        .upsert(upserts, { onConflict: "org_id,process,region" });
      if (error) throw error;
      toast.success(`${activeProcess} delivery saved`);
      qc.invalidateQueries({ queryKey: ["scheduled-delivery", org.id] });
      // Broadcast so dashboard picks up instantly even if postgres_changes is delayed
      supabase.channel(`schedule-saved-${org.id}`).send({ type: "broadcast", event: "saved", payload: {} });
    } catch (err: any) {
      toast.error(err?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!org) return (
    <div className="py-20 text-center text-sm text-muted-foreground">
      Join or create an organisation to use Scheduled Delivery.
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Scheduled Delivery</h1>
        <p className="text-sm text-muted-foreground">
          Set and track planned vs actual scope per process and region.
        </p>
      </div>

      {/* Process tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1">
        {PROCESSES.map((p) => (
          <button
            key={p}
            onClick={() => setActiveProcess(p)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
              activeProcess === p
                ? "bg-primary-600 text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Region cards — 3-column grid */}
          <div className="grid grid-cols-3 gap-5">
            {REGIONS.map((region) => {
              const accent = REGION_ACCENT[region];
              const activeScope = scopeTabs[region];
              const entry = local[activeProcess][region][activeScope];
              const plannedDate = local[activeProcess][region].planned.date;
              const actualDate  = local[activeProcess][region].actual.date;

              const fmtDate = (d: string) =>
                d ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined, {
                  month: "short", day: "numeric", year: "numeric",
                }) : null;

              return (
                <div key={region} className={`card-surface flex flex-col rounded-xl border ${accent.activeBorder} overflow-hidden`}>
                  {/* Region header */}
                  <div className={`flex items-center justify-between px-4 py-3 ${accent.headerBg}`}>
                    <div className="flex items-center gap-2.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${accent.dot}`} />
                      <span className="text-sm font-bold text-foreground">{region}</span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      {fmtDate(plannedDate) && (
                        <span className="text-[10px] text-primary-600 font-medium">P: {fmtDate(plannedDate)}</span>
                      )}
                      {fmtDate(actualDate) && (
                        <span className="text-[10px] text-emerald-600 font-medium">A: {fmtDate(actualDate)}</span>
                      )}
                    </div>
                  </div>

                  {/* Planned / Actual tabs */}
                  <div className="flex gap-1 border-b border-border bg-muted/30 px-3 py-2">
                    {(["planned", "actual"] as ScopeTab[]).map((tab) => {
                      const cfg = SCOPE_CONFIG[tab];
                      const isActive = activeScope === tab;
                      return (
                        <button
                          key={tab}
                          onClick={() => setScopeTabs((prev) => ({ ...prev, [region]: tab }))}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-all ${
                            isActive ? cfg.activeClass + " shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white/70" />}
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Fields */}
                  <div className="flex flex-col gap-4 p-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {activeScope === "planned" ? "Planned" : "Actual"} Date
                      </label>
                      <input
                        type="date"
                        value={entry.date}
                        onChange={(e) => patch(activeProcess, region, activeScope, "date", e.target.value)}
                        className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {activeScope === "planned" ? "Planned" : "Actual"} Scope
                      </label>
                      <input
                        type="text"
                        value={entry.volume}
                        onChange={(e) => patch(activeProcess, region, activeScope, "volume", e.target.value)}
                        placeholder={activeScope === "planned" ? "e.g. 500 units" : "e.g. 480 units"}
                        className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <StickyNote className="h-3.5 w-3.5" /> Note
                      </label>
                      <textarea
                        value={entry.note}
                        onChange={(e) => patch(activeProcess, region, activeScope, "note", e.target.value)}
                        placeholder={`Notes for ${region} ${activeScope} scope…`}
                        rows={3}
                        className="w-full resize-none rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : `Save ${activeProcess}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
