-- Rename "New Task" board columns to "New" to match the owner-spec status
-- dropdown labels from issue #11 comment 1 (`New / In Progress / On Hold /
-- Error / Done`). Idempotent: only renames rows that still hold the legacy
-- name. Existing tasks keep their column_id, so no task data is moved.
update public.board_columns
   set name = 'New'
 where name = 'New Task';
