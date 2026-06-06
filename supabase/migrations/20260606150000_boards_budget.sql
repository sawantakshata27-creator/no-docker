-- Issue #54: add budget_total and budget_spent columns to boards table
ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS budget_total numeric CHECK (budget_total >= 0),
  ADD COLUMN IF NOT EXISTS budget_spent numeric NOT NULL DEFAULT 0 CHECK (budget_spent >= 0);
