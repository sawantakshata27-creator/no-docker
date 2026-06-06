-- Issue #46 — Add a per-task file count so the Task Details drawer can capture
-- the total files to process for a given process stage and auto-calculate the
-- estimated production hours (file_count / files_per_hour target).
--
-- The column is nullable because most existing tasks don't carry a count yet;
-- the UI treats null/0 as "not set" and hides the auto-calc line.
alter table public.tasks
  add column if not exists file_count integer;

alter table public.tasks
  add constraint tasks_file_count_non_negative
  check (file_count is null or file_count >= 0);
