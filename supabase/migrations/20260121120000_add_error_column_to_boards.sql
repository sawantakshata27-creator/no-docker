-- Add an "Error" column to every existing board, slotted between "In Review"
-- and "Done", per the owner spec in issue #8 (Kanban) and issue #11 (Tasks).
-- Idempotent: only touches boards that don't already have an "Error" column.
--
-- Strategy per board:
--   1. Bump position of every column whose position >= the current "Done"
--      column's position, so a slot opens up where "Done" used to be.
--   2. Insert the new "Error" column at that freed slot with the red status
--      colour (#ef4444). The relative visual order becomes:
--      New Task → In Progress → In Review → Error → Done.
--
-- Boards without a "Done" column (custom layouts) are left untouched.
-- No tasks are moved; tasks reference columns by id, which is preserved.

do $$
declare
  rec record;
begin
  for rec in
    select dc.board_id, dc.position as done_pos
      from public.board_columns dc
     where dc.name = 'Done'
       and not exists (
         select 1
           from public.board_columns ec
          where ec.board_id = dc.board_id
            and ec.name = 'Error'
       )
  loop
    update public.board_columns
       set position = position + 1
     where board_id = rec.board_id
       and position >= rec.done_pos;

    insert into public.board_columns (board_id, name, position, color)
    values (rec.board_id, 'Error', rec.done_pos, '#ef4444');
  end loop;
end
$$;
