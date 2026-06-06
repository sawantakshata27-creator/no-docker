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
  hours: number;
  actual: number | null;
};

// Files-per-hour = completion throughput per stage.
//
//   actual = completed_count / hours_between_first_and_latest_completion
//
// Previously we divided by sum(completed_at - created_at), which conflates
// per-task latency (a backlog item created days before it was finished) with
// throughput, and crushes the rate toward zero for any board with old tasks
// (see issue #30: "0.0 / 5.6 files/hr · 2 done"). Spanning consecutive
// completions instead measures how fast files actually leave the stage.
//
// Tasks without a valid `completed_at` are excluded. Stages with fewer than
// two completions render as "—" (one data point can't define a rate).
function computeMetrics(tasks: TaskRecord[]): StageMetric[] {
  const completionTimes: Record<string, number[]> = {};
  for (const stage of DEFAULT_PROCESS_STAGES) completionTimes[stage] = [];

  for (const task of tasks) {
    const stage = task.process_stage as (typeof DEFAULT_PROCESS_STAGES)[number] | null;
    if (!stage || !(stage in completionTimes)) continue;
    if (!task.completed_at) continue;
    const t = new Date(task.completed_at).getTime();
    if (!Number.isFinite(t)) continue;
    completionTimes[stage].push(t);
  }

  return DEFAULT_PROCESS_STAGES.map((stage) => {
    const times = completionTimes[stage].sort((a, b) => a - b);
    const completed = times.length;
    const target = PROCESS_PRODUCTIVITY_TARGETS[stage];
    if (completed < 2) {
      return { stage, target, completed, hours: 0, actual: null };
    }
    const spanHours = (times[times.length - 1] - times[0]) / 3_600_000;
    const actual = spanHours > 0 ? completed / spanHours : null;
    return { stage, target, completed, hours: spanHours, actual };
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
            Files completed per hour vs target — measured across each stage’s completion window.
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
                  ? "No completions yet"
                  : m.actual == null
                    ? `${m.completed} done · need 2+ to rate`
                    : `${m.completed} done · ${pct ?? "—"}% of target`}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
