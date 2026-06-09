-- Grant schema usage to PostgREST roles.
-- "permission denied for schema public" is thrown when these grants are missing,
-- even though RLS policies are correct. This happens on Supabase projects where
-- the default public schema grants were revoked (post-2023 projects do this).

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Ensure PostgREST can read all existing tables (RLS still enforces row-level access)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Ensure sequences (used by DEFAULT gen_random_uuid() etc) are accessible
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Make sure future tables also get these grants automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
