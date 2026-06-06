-- Rename legacy "Backlog" board columns to "New Task" to match the owner-spec
-- naming from issue #11 (Tasks) and issue #8 (Kanban). Idempotent: only renames
-- rows that still hold the legacy name. Existing tasks keep their column_id, so
-- no task data is moved.
update public.board_columns
   set name = 'New Task'
 where name = 'Backlog';
