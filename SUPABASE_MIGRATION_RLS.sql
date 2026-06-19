-- =============================================================================
-- Row Level Security (RLS) — blocks anon/authenticated key access to all
-- user-scoped tables. The service role (used by the API server) bypasses RLS
-- automatically via the BYPASSRLS privilege in Supabase.
--
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to run multiple times and in any order relative to other migrations —
-- each block skips silently if the table hasn't been created yet.
--
-- These policies guard against direct Supabase API abuse (e.g. someone using
-- the project's anon key to read other users' data). The application layer
-- already filters by user_id on every query; RLS is a database-level safety net.
-- =============================================================================

-- ── users ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "block_direct_access" ON users;
    CREATE POLICY "block_direct_access" ON users
      FOR ALL TO anon, authenticated USING (false);
  END IF;
END $$;

-- ── usage_events ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usage_events') THEN
    ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "block_direct_access" ON usage_events;
    CREATE POLICY "block_direct_access" ON usage_events
      FOR ALL TO anon, authenticated USING (false);
  END IF;
END $$;

-- ── repo_meta ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'repo_meta') THEN
    ALTER TABLE repo_meta ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "block_direct_access" ON repo_meta;
    CREATE POLICY "block_direct_access" ON repo_meta
      FOR ALL TO anon, authenticated USING (false);
  END IF;
END $$;

-- ── tokens ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tokens') THEN
    ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "block_direct_access" ON tokens;
    CREATE POLICY "block_direct_access" ON tokens
      FOR ALL TO anon, authenticated USING (false);
  END IF;
END $$;

-- ── code_embeddings ──────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'code_embeddings') THEN
    ALTER TABLE code_embeddings ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "block_direct_access" ON code_embeddings;
    CREATE POLICY "block_direct_access" ON code_embeddings
      FOR ALL TO anon, authenticated USING (false);
  END IF;
END $$;

-- ── drift_results ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'drift_results') THEN
    ALTER TABLE drift_results ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "block_direct_access" ON drift_results;
    CREATE POLICY "block_direct_access" ON drift_results
      FOR ALL TO anon, authenticated USING (false);
  END IF;
END $$;

-- ── ast_baseline ──────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ast_baseline') THEN
    ALTER TABLE ast_baseline ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "block_direct_access" ON ast_baseline;
    CREATE POLICY "block_direct_access" ON ast_baseline
      FOR ALL TO anon, authenticated USING (false);
  END IF;
END $$;

-- ── drift_llm_cache ──────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'drift_llm_cache') THEN
    ALTER TABLE drift_llm_cache ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "block_direct_access" ON drift_llm_cache;
    CREATE POLICY "block_direct_access" ON drift_llm_cache
      FOR ALL TO anon, authenticated USING (false);
  END IF;
END $$;

-- ── plans ─────────────────────────────────────────────────────────────────────
-- Plans are public pricing data — allow reads, block writes.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plans') THEN
    ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "public_read" ON plans;
    DROP POLICY IF EXISTS "block_direct_writes" ON plans;
    CREATE POLICY "public_read" ON plans
      FOR SELECT TO anon, authenticated USING (true);
    CREATE POLICY "block_direct_writes" ON plans
      FOR ALL TO anon, authenticated USING (false);
  END IF;
END $$;
