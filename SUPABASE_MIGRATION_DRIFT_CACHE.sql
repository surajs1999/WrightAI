-- =============================================================================
-- Repo metadata, drift results, and LLM verdict cache — replaces 3 Redis
-- structures (wright:repos:v1:*, wright:repo:v1:*, wright:drift:v1:*).
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
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
