-- Issue #11 (Tasks): owner asked for the leftmost column to read "New" rather
-- than "New Task" so the column header matches the status dropdown wording
-- (New / In Progress / On Hold / Error / Done). Idempotent rename — existing
-- task rows keep their column_id, so no task data is touched.
update public.board_columns
   set name = 'New'
 where name = 'New Task';
