-- Analytics columns for usage_events table
-- Run this in the Supabase SQL editor.
-- All columns are nullable so existing rows are unaffected.

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
-- Index for language distribution queries
CREATE INDEX IF NOT EXISTS idx_usage_events_language ON usage_events (language);
-- Index for fallback rate queries
CREATE INDEX IF NOT EXISTS idx_usage_events_fallback ON usage_events (is_fallback) WHERE is_fallback = TRUE;
