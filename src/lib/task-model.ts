export type TaskRecord = {
  id: string;
  board_id: string;
  title: string;
  description: string | null;
  priority: "high" | "medium" | "low" | string;
  column_id: string;
  position: number;
  process_stage: string | null;
  due_date: string | null;
  created_by?: string;
  created_at?: string;
  completed_at?: string | null;
  assignee_id?: string | null;
};

export type ColumnRecord = {
  id: string;
  name: string;
  color: string | null;
  position: number;
  board_id?: string;
};

export const PRIORITY_OPTIONS = ["high", "medium", "low"] as const;

// Process options shown in the Task drawer. Trimmed from the legacy 6-stage list
// to the 4 stages tracked for productivity metrics. Renamed in the UI from
// "Process stage" → "Process" (see issue #11). "QA" and "Delivery" were removed
// per the owner's spec; existing tasks with those values still render (just not
// selectable going forward).
export const DEFAULT_PROCESS_STAGES = [
  "Sign Creation",
  "Pre-processing",
  "Association",
  "Adjustment",
] as const;

// Owner-specified throughput targets (files per hour) for each process stage.
// Used to (a) surface the expected pace inside the Task drawer next to the
// Process dropdown, and (b) compute actual vs target productivity from
// completed tasks in board-level metrics widgets. See issue #11 — Tasks
// (process-wise productivity metrics).
export const PROCESS_PRODUCTIVITY_TARGETS: Record<(typeof DEFAULT_PROCESS_STAGES)[number], number> =
  {
    "Sign Creation": 5.6,
    "Pre-processing": 15,
    Association: 13,
    Adjustment: 228,
  };

export function productivityTargetFor(stage: string | null | undefined): number | null {
  if (!stage) return null;
  if (stage in PROCESS_PRODUCTIVITY_TARGETS) {
    return PROCESS_PRODUCTIVITY_TARGETS[stage as (typeof DEFAULT_PROCESS_STAGES)[number]];
  }
  return null;
}

export function priorityClass(priority: string) {
  if (priority === "high") return "bg-red-50 text-red-600 border-red-100";
  if (priority === "medium") return "bg-amber-50 text-amber-600 border-amber-100";
  return "bg-emerald-50 text-emerald-600 border-emerald-100";
}

// Seed-task title pools keyed by column role rather than the legacy column name.
// The leftmost column was renamed Backlog → New Task → New (see migrations
// 20260120120000_rename_backlog_to_new_task.sql and
// 20260123120000_rename_new_task_to_new.sql, plus issues #11 and #46). Keeping
// the internal key in sync with the user-visible "New" wording prevents fresh
// readers from thinking we still ship a "Backlog" column.
const titlePools = {
  new: [
    "Validate signer packet batch",
    "Queue OCR cleanup for intake set",
    "Review missing page exceptions",
    "Prepare outbound delivery package",
    "Confirm scanned index mapping",
  ],
  active: [
    "Resolve low-confidence association",
    "Normalize incoming batch naming",
    "Patch signature zone coordinates",
    "Audit duplicate signer references",
    "Re-run pre-processing rules",
  ],
  review: [
    "QA sampled sign bundle",
    "Verify delivery manifest counts",
    "Approve adjustment notes",
    "Check post-association output",
    "Review high-priority escalations",
  ],
};

function randomOf<T>(values: T[]) {
  return values[Math.floor(Math.random() * values.length)];
}

export function buildSeedTasks(columns: ColumnRecord[], boardId: string, userId: string) {
  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);
  const now = Date.now();

  return sortedColumns.flatMap((column, columnIndex) => {
    const count = columnIndex === 0 ? 7 : columnIndex === sortedColumns.length - 1 ? 4 : 6;
    const pool =
      columnIndex === 0
        ? titlePools.new
        : columnIndex === sortedColumns.length - 1
          ? titlePools.review
          : titlePools.active;

    return Array.from({ length: count }, (_, index) => {
      const title = `${randomOf(pool)} #${Math.floor(Math.random() * 90 + 10)}`;
      const stage = randomOf([...DEFAULT_PROCESS_STAGES]);
      const priority = randomOf(["high", "medium", "medium", "low"]);
      const dueOffset = (columnIndex + 1) * 86400000 + index * 21600000;

      return {
        title,
        description: `Auto-generated sample workload for ${stage.toLowerCase()} with realistic throughput variance and follow-up steps.`,
        board_id: boardId,
        column_id: column.id,
        created_by: userId,
        position: index,
        priority,
        process_stage: stage,
        due_date: new Date(now + dueOffset).toISOString(),
      };
    });
  });
}
