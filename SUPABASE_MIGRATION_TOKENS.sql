-- =============================================================================
-- Tokens table — replaces per-user .tokens.json files on the GCS Fuse mount
-- Run this in Supabase SQL editor (Project → SQL Editor → New query)
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
