-- Issue #46: Add files_count column to tasks table
-- files_count tracks how many files/documents are processed by a task.
-- Used to auto-calculate actual productivity (files/hr) vs process target.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS files_count integer NOT NULL DEFAULT 0;
