-- =============================================================================
-- WrightAI — Supabase Migration (consolidated)
-- Run this in Supabase SQL Editor (Project → SQL Editor → New query).
--
-- HOW TO RUN
--   Paste the whole file and run it top to bottom, once. Every statement is
--   idempotent (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / etc.),
--   so re-running the whole file after a partial run or on an already-migrated
--   database is safe and a no-op for anything already applied.
--
--   Sections are ordered by dependency — don't reorder them:
--     1-2 assume `users` and `usage_events` already exist (created outside
--         this file, e.g. via the WorkOS/Supabase auth bootstrap) and must
--         run first since later sections add FKs/columns onto `users`.
--     3-7 are independent feature tables — order between them doesn't matter.
--     8   (Paddle) alters `plans`/`users` from section 1, so it must come
--         after section 1.
--     9   (Paddle price IDs) writes into the columns section 8 creates.
--     10  (RLS) must run last — it enables row-level security on every table
--         above and self-guards with an existence check per table, so it's
--         also safe to run standalone at any time after the rest exist.
-- =============================================================================


-- =============================================================================
-- 1. Plans + billing columns on `users`
-- =============================================================================

-- Plans table — source of truth for all quotas/feature flags.
-- Edit rows directly in Supabase Table Editor to change limits without deploys.
CREATE TABLE IF NOT EXISTS plans (
  id                              TEXT PRIMARY KEY,          -- 'free' | 'pro' | 'team' | 'enterprise'
  display_name                    TEXT NOT NULL,
  price_monthly_cents             INTEGER NOT NULL DEFAULT 0,
  price_annual_monthly_cents      INTEGER NOT NULL DEFAULT 0, -- per-month cost when billed annually

  -- Monthly quotas  (-1 = unlimited)
  docs_per_month                  INTEGER NOT NULL DEFAULT 100,
  chat_messages_per_month         INTEGER NOT NULL DEFAULT 0,
  drift_checks_per_month          INTEGER NOT NULL DEFAULT -1,
  repos_limit                     INTEGER NOT NULL DEFAULT 1,
  api_keys_limit                  INTEGER NOT NULL DEFAULT 1,

  -- Feature flags
  semantic_drift_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
  auto_pr_enabled                 BOOLEAN NOT NULL DEFAULT FALSE,
  github_action_comments_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  llms_txt_enabled                BOOLEAN NOT NULL DEFAULT TRUE,

  -- Stripe price IDs (superseded by Paddle in section 8; dropped there too)
  stripe_price_id_monthly         TEXT,
  stripe_price_id_annual          TEXT,

  is_active                       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default plans
INSERT INTO plans (
  id, display_name,
  price_monthly_cents, price_annual_monthly_cents,
  docs_per_month, chat_messages_per_month, drift_checks_per_month,
  repos_limit, api_keys_limit,
  semantic_drift_enabled, auto_pr_enabled, github_action_comments_enabled, llms_txt_enabled
) VALUES
  ('free',       'Free',       0,    0,    100,  0,    -1, 1,  1,  FALSE, FALSE, FALSE, TRUE),
  ('pro',        'Pro',        1800, 1400, 1000, 100,  -1, 5,  3,  TRUE,  TRUE,  TRUE,  TRUE),
  ('team',       'Team',       2000, 1600, -1,   -1,   -1, -1, 10, TRUE,  TRUE,  TRUE,  TRUE),
  ('enterprise', 'Enterprise', 0,    0,    -1,   -1,   -1, -1, -1, TRUE,  TRUE,  TRUE,  TRUE)
ON CONFLICT (id) DO NOTHING;

-- Extend users table with billing columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS plan                  TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id    TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status   TEXT NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS current_period_end    TIMESTAMPTZ;

-- Ensure plan references plans table (add FK only if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_plan_fkey'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_plan_fkey FOREIGN KEY (plan) REFERENCES plans(id);
  END IF;
END $$;

-- Index for fast plan lookups
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);


-- =============================================================================
-- 2. Email tracking + overage columns
-- =============================================================================

-- Plans table: overage rate for Pro soft-limit billing
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS overage_rate_per_doc DECIMAL(10,5) NOT NULL DEFAULT 0;

UPDATE plans SET overage_rate_per_doc = 0.008 WHERE id = 'pro';

-- Users table: email dedup tracking (stores YYYY-MM of last send to avoid duplicates)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS quota_warning_sent_month  TEXT,
  ADD COLUMN IF NOT EXISTS quota_exceeded_sent_month TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_day7_sent      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_day14_sent     BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for fast onboarding drip queries (daily Celery beat task)
CREATE INDEX IF NOT EXISTS idx_users_plan_created ON users(plan, created_at);
CREATE INDEX IF NOT EXISTS idx_users_onboarding   ON users(plan, onboarding_day7_sent, onboarding_day14_sent);

-- Helpful view: current month usage per user. Use in the Supabase dashboard
-- to monitor usage by plan.
CREATE OR REPLACE VIEW monthly_usage_summary AS
SELECT
  u.id           AS user_id,
  u.email,
  u.plan,
  DATE_TRUNC('month', NOW()) AS month,
  COUNT(*) FILTER (WHERE ue.event_type = 'docs_generated')    AS docs_generated,
  COUNT(*) FILTER (WHERE ue.event_type = 'chat_message')      AS chat_messages,
  COUNT(*) FILTER (WHERE ue.event_type = 'drift_checks_run')  AS drift_checks,
  SUM(COALESCE(ue.tokens, 0))                                  AS tokens_used
FROM users u
LEFT JOIN usage_events ue
  ON ue.user_id = u.id
 AND ue.created_at >= DATE_TRUNC('month', NOW())
GROUP BY u.id, u.email, u.plan;


-- =============================================================================
-- 3. Tokens table — replaces per-user .tokens.json files on the GCS Fuse mount
-- =============================================================================

-- Stores GitHub OAuth tokens (key = '_github_oauth') and per-repo deploy
-- tokens (key = a repo slug, e.g. 'owner/repo'), keyed by the same user
-- identifier already used for repo storage paths and Redis keys (last 12
-- chars of the API key — see user_id_from_api_key / _user_id_from_request).
-- This is NOT the users.id UUID, so there's no foreign key to users.
CREATE TABLE IF NOT EXISTS tokens (
  user_id    TEXT NOT NULL,
  key        TEXT NOT NULL,
  token      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, key)
);


-- =============================================================================
-- 4. Per-file AST baseline snapshots — lets the server-side drift baseline
--    (core/parser/cache.py ASTCache.get_baseline) survive Cloud Run cold starts
-- =============================================================================

-- Per-file AST baseline (signatures + docstrings), used for structural drift
-- comparison. Keyed like drift_results (user_id = Supabase users.id,
-- repo_name = basename(repo_root), file_path relative to repo_root).
CREATE TABLE IF NOT EXISTS ast_baseline (
  user_id     TEXT NOT NULL,
  repo_name   TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  parsed_json TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, repo_name, file_path)
);

CREATE INDEX IF NOT EXISTS ast_baseline_user_repo_idx
  ON ast_baseline (user_id, repo_name);


-- =============================================================================
-- 5. Repo metadata, drift results, and LLM verdict cache — replaces 3 Redis
--    structures (wright:repos:v1:*, wright:repo:v1:*, wright:drift:v1:*)
-- =============================================================================

-- Connected-repo metadata. Replaces wright:repos:v1:{user_id} (Redis HASH,
-- 90-day TTL). user_id = last 12 chars of API key (same scheme as `tokens`).
CREATE TABLE IF NOT EXISTS repo_meta (
  user_id    TEXT NOT NULL,
  repo_slug  TEXT NOT NULL,
  git_url    TEXT NOT NULL,
  branch     TEXT NOT NULL,
  local_path TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, repo_slug)
);

-- Per-function drift results (dashboard function index). Replaces
-- wright:repo:v1:{user_id}:{repo_name} (Redis HASH, 7-day TTL). user_id here
-- is the Supabase users.id UUID (via _resolve_user/_resolve_user_id) — a
-- DIFFERENT scheme than repo_meta.user_id.
CREATE TABLE IF NOT EXISTS drift_results (
  user_id    TEXT NOT NULL,
  repo_name  TEXT NOT NULL,
  file_path  TEXT NOT NULL,
  func_name  TEXT NOT NULL,
  status     TEXT NOT NULL,
  reason     TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, repo_name, file_path, func_name)
);

CREATE INDEX IF NOT EXISTS drift_results_user_repo_idx
  ON drift_results (user_id, repo_name);

-- LLM verdict cache (L2), content-addressed and global (no user/repo scope).
-- Replaces wright:drift:v1:{src_hash}:{doc_hash} (Redis STRING,
-- WRIGHT_CACHE_TTL_DAYS TTL, default 30 days). TTL enforced on read via
-- updated_at filter, not row deletion.
CREATE TABLE IF NOT EXISTS drift_llm_cache (
  src_hash   TEXT NOT NULL,
  doc_hash   TEXT NOT NULL,
  status     TEXT NOT NULL,
  reason     TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (src_hash, doc_hash)
);

CREATE INDEX IF NOT EXISTS drift_llm_cache_src_hash_idx
  ON drift_llm_cache (src_hash);


-- =============================================================================
-- 6. Code embeddings table — Supabase pgvector backup for local Chroma stores
-- =============================================================================

-- Bidirectional backup of each repo's vector index. Every chunk upserted into
-- a repo's local Chroma collection during indexing is mirrored here, keyed by
-- the same (user_id, repo_slug) used for repo storage paths and Redis keys
-- (see user_id_from_api_key / _user_id_from_request). On a cold container
-- start (empty local Chroma), this table is the source of truth used to
-- rebuild the local collection. chat/generate/fix_pr retrieval queries this
-- table first via match_code_chunks(), falling back to local Chroma.
--
-- chunk_id = sha256(f"{file_path}:{start_line}:{source}") (core/parser/ast_chunker.py)
-- is unique per file/line/source but NOT scoped to a user or repo, so this
-- shared table needs the composite primary key below to avoid cross-user
-- collisions.
--
-- embedding is vector(1024) — voyage-code-3's default output dimension
-- (core/embeddings/voyage_embeddings.py does not pass output_dimension).
create extension if not exists vector;

create table if not exists code_embeddings (
  user_id     text not null,
  repo_slug   text not null,
  chunk_id    text not null,
  file_path   text not null,
  language    text,
  chunk_type  text,
  name        text,
  source      text,
  start_line  int,
  end_line    int,
  token_count int,
  embedding   vector(1024),
  updated_at  timestamptz not null default now(),
  primary key (user_id, repo_slug, chunk_id)
);

create index if not exists code_embeddings_embedding_idx
  on code_embeddings using hnsw (embedding vector_cosine_ops);

create index if not exists code_embeddings_user_repo_idx
  on code_embeddings (user_id, repo_slug);

-- supabase-py's .table() can't express the <=> distance operator, so
-- similarity search goes through this RPC (see PgVectorStore.search in
-- core/embeddings/pgvector_store.py).
create or replace function match_code_chunks(
  query_embedding vector(1024),
  match_user_id text,
  match_repo_slug text,
  match_count int default 10,
  filter_file_path text default null
) returns table (
  chunk_id text, file_path text, language text, chunk_type text, name text,
  source text, start_line int, end_line int, token_count int, distance float
) language sql stable as $$
  select chunk_id, file_path, language, chunk_type, name, source, start_line, end_line, token_count,
         embedding <=> query_embedding as distance
  from code_embeddings
  where user_id = match_user_id and repo_slug = match_repo_slug
    and (filter_file_path is null or file_path = filter_file_path)
  order by embedding <=> query_embedding
  limit match_count;
$$;


-- =============================================================================
-- 7. Analytics columns for usage_events table
-- =============================================================================

-- All columns are nullable/defaulted so existing rows are unaffected.
ALTER TABLE usage_events
  ADD COLUMN IF NOT EXISTS model              TEXT,
  ADD COLUMN IF NOT EXISTS is_fallback        BOOLEAN  DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cache_hit          BOOLEAN  DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS retry_count        INTEGER  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_ms        INTEGER,
  ADD COLUMN IF NOT EXISTS cache_read_tokens  INTEGER  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversation_turns INTEGER  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS context_chunks     INTEGER  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS doc_style          TEXT,
  ADD COLUMN IF NOT EXISTS quality            TEXT;

-- Index for per-model breakdown queries
CREATE INDEX IF NOT EXISTS idx_usage_events_model    ON usage_events (model);
-- Index for language distribution queries (usage_events.language predates this file)
CREATE INDEX IF NOT EXISTS idx_usage_events_language ON usage_events (language);
-- Index for fallback rate queries
CREATE INDEX IF NOT EXISTS idx_usage_events_fallback ON usage_events (is_fallback) WHERE is_fallback = TRUE;


-- =============================================================================
-- 8. Paddle billing — depends on section 1 (plans, users)
-- =============================================================================

-- Add Paddle price ID columns to plans table.
-- Fill these in via Supabase Table Editor after creating your products in
-- the Paddle dashboard (Catalog → Products). Price IDs look like: pri_01abc123...
-- (section 9 below writes the current production values for the `pro` plan)
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS paddle_price_id_monthly TEXT,
  ADD COLUMN IF NOT EXISTS paddle_price_id_annual  TEXT;

-- Add Paddle customer/subscription columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS paddle_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_users_paddle_customer ON users(paddle_customer_id);

-- Drop old Stripe columns (safe — Stripe was never used in production)
ALTER TABLE plans
  DROP COLUMN IF EXISTS stripe_price_id_monthly,
  DROP COLUMN IF EXISTS stripe_price_id_annual;

ALTER TABLE users
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS stripe_subscription_id;


-- =============================================================================
-- 9. Populate Paddle price IDs — depends on section 8's columns existing
-- =============================================================================

-- Current production Paddle price IDs for the `pro` plan (fetched from the
-- Paddle dashboard). Matches the $18/mo monthly and $168/yr ($14/mo) annual
-- pricing shown on /pricing and tracked via ga.beginCheckout's `value`.
--   Monthly ($18/mo) : pri_01kt5dztgzehbz8b1gwd2y58k9
--   Annual  ($168/yr): pri_01kt5e1gwgysmdgmjq73xecde2
UPDATE plans
SET
  paddle_price_id_monthly = 'pri_01kt5dztgzehbz8b1gwd2y58k9',
  paddle_price_id_annual  = 'pri_01kt5e1gwgysmdgmjq73xecde2'
WHERE id = 'pro';

-- Verify the update
SELECT id, paddle_price_id_monthly, paddle_price_id_annual FROM plans;


-- =============================================================================
-- 10. Row Level Security (RLS) — must run last (references every table above)
-- =============================================================================

-- Blocks anon/authenticated key access to all user-scoped tables. The service
-- role (used by the API server) bypasses RLS automatically via the BYPASSRLS
-- privilege in Supabase.
--
-- Safe to run multiple times and in any order relative to the sections above
-- — each block skips silently if the table hasn't been created yet.
--
-- These policies guard against direct Supabase API abuse (e.g. someone using
-- the project's anon key to read other users' data). The application layer
-- already filters by user_id on every query; RLS is a database-level safety net.

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
