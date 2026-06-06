import { useMemo } from "react";
import { Gauge } from "lucide-react";
import {
  DEFAULT_PROCESS_STAGES,
  PROCESS_PRODUCTIVITY_TARGETS,
  type TaskRecord,
} from "@/lib/task-model";

interface BoardProductivityMetricsProps {
  tasks: TaskRecord[];
}

type StageMetric = {
  stage: (typeof DEFAULT_PROCESS_STAGES)[number];
  target: number;
  completed: number;
  actual: number | null;
};

// Files-per-hour computed from a rolling 24-hour window:
//   actual = (tasks completed in last 24h at this stage) / 24
// This replaces the older "sum of per-task lifetimes" denominator, which
// over-counted idle queue time and yielded near-zero throughput even when
// the team was active (see issue #30). Stages with zero recent completions
// render as "—" (no fake throughput, no division-by-zero).
const ROLLING_WINDOW_HOURS = 24;

function computeMetrics(tasks: TaskRecord[]): StageMetric[] {
  const buckets: Record<string, number> = {};
  for (const stage of DEFAULT_PROCESS_STAGES) buckets[stage] = 0;

  const cutoffMs = Date.now() - ROLLING_WINDOW_HOURS * 3_600_000;

  for (const task of tasks) {
    const stage = task.process_stage as (typeof DEFAULT_PROCESS_STAGES)[number] | null;
    if (!stage || !(stage in buckets)) continue;
    if (!task.completed_at) continue;
    const endMs = new Date(task.completed_at).getTime();
    if (!Number.isFinite(endMs) || endMs < cutoffMs) continue;
    buckets[stage] += 1;
  }

  return DEFAULT_PROCESS_STAGES.map((stage) => {
    const completed = buckets[stage];
    const actual = completed > 0 ? completed / ROLLING_WINDOW_HOURS : null;
    return { stage, target: PROCESS_PRODUCTIVITY_TARGETS[stage], completed, actual };
  });
}

function pctOfTarget(actual: number | null, target: number): number | null {
  if (actual == null || target <= 0) return null;
  return Math.round((actual / target) * 100);
}

function statusTone(pct: number | null): string {
  if (pct == null) return "border-border bg-muted/30 text-muted-foreground";
  if (pct >= 100) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (pct >= 70) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
}

export function BoardProductivityMetrics({ tasks }: BoardProductivityMetricsProps) {
  const metrics = useMemo(() => computeMetrics(tasks), [tasks]);

  return (
    <section
      className="card-surface p-4"
      data-testid="board-productivity-metrics"
      aria-label="Process productivity metrics"
    >
      <header className="mb-3 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-50 text-primary-700">
          <Gauge className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Process productivity</h2>
          <p className="text-[11px] text-muted-foreground">
            Files processed per hour (24-hour rolling window). Uses <em>files_count</em> per task where set, else 1 task = 1 unit.
          </p>
        </div>
      </header>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => {
          const pct = pctOfTarget(m.actual, m.target);
          return (
            <div
              key={m.stage}
              className={`rounded-xl border px-3 py-2.5 ${statusTone(pct)}`}
              data-testid={`productivity-card-${m.stage.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="text-[11px] font-medium uppercase tracking-wide opacity-80">
                {m.stage}
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span
                  className="text-xl font-bold tabular-nums"
                  data-testid={`productivity-actual-${m.stage.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {m.actual == null ? "—" : m.actual.toFixed(m.actual < 10 ? 1 : 0)}
                </span>
                <span className="text-[11px] opacity-70">/ {m.target} files/hr</span>
              </div>
              <div className="mt-1 text-[11px] opacity-80">
                {m.completed === 0
                  ? "No completions in last 24h"
                  : `${m.completed} done in last 24h · ${pct ?? "—"}% of target`}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
