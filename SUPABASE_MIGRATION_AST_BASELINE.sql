-- =============================================================================
-- Per-file AST baseline snapshots — lets the server-side drift baseline
-- (core/parser/cache.py ASTCache.get_baseline) survive Cloud Run cold starts.
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
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
