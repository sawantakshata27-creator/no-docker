-- Add start_date, end_date, error_count to tasks; rename column "On Hold" -> "In Review"
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS error_count integer NOT NULL DEFAULT 0;

-- Rename "On Hold" columns back to "In Review" (reverting 20260122 migration per new spec)
UPDATE public.board_columns
   SET name = 'In Review'
 WHERE name = 'On Hold';

-- Rename legacy "Pre-processing" process stage to "Pre Processing"
UPDATE public.tasks
   SET process_stage = 'Pre Processing'
 WHERE process_stage = 'Pre-processing';
