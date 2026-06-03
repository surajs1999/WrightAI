-- =============================================================================
-- WrightAI Paddle Migration
-- Run this AFTER the original SUPABASE_MIGRATION.sql
-- Supabase SQL Editor → New query → paste and run
-- =============================================================================

-- 1. Add Paddle price ID columns to plans table
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS paddle_price_id_monthly TEXT,
  ADD COLUMN IF NOT EXISTS paddle_price_id_annual  TEXT;

-- Note: fill these in via Supabase Table Editor after creating
-- your products in the Paddle dashboard (Catalog → Products).
-- Price IDs look like: pri_01abc123...


-- 2. Add Paddle customer/subscription columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS paddle_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_users_paddle_customer ON users(paddle_customer_id);


-- 3. Drop old Stripe columns (safe — Stripe was never used in production)
ALTER TABLE plans
  DROP COLUMN IF EXISTS stripe_price_id_monthly,
  DROP COLUMN IF EXISTS stripe_price_id_annual;

ALTER TABLE users
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS stripe_subscription_id;
