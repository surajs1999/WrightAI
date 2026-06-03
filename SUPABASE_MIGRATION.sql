-- =============================================================================
-- WrightAI Pricing Infrastructure Migration
-- Run this in Supabase SQL editor (Project → SQL Editor → New query)
-- =============================================================================

-- 1. Plans table — source of truth for all quotas/feature flags.
--    Edit rows directly in Supabase Table Editor to change limits without deploys.
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

  -- Stripe price IDs (fill in after creating products in Stripe dashboard)
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


-- 2. Extend users table with billing columns
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


-- 3. Email tracking + overage columns
--    Run this block after the initial migration if you already applied the first version.

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


-- 4. Helpful view: current month usage per user
--    Use this in Supabase dashboard to monitor usage by plan.
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
