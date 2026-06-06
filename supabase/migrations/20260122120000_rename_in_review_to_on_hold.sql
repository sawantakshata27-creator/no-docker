-- Rename legacy "In Review" board columns to "On Hold" to match the owner-spec
-- Status dropdown from issue #11 comment 1 (New / In Progress / On Hold / Error / Done).
-- Idempotent: only renames rows still called "In Review"; safe to re-run.
-- No schema change, no task data moved (`column_id` is preserved).

update public.board_columns
   set name = 'On Hold'
 where name = 'In Review';
