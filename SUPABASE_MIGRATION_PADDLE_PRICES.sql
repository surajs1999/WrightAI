-- =============================================================================
-- WrightAI: Populate Paddle Price IDs in plans table
-- Run in Supabase SQL Editor → New query → paste and run
-- =============================================================================

-- Populate the pro plan with Paddle price IDs fetched from the Paddle dashboard.
--   Monthly ($18/mo) : pri_01kt5dztgzehbz8b1gwd2y58k9
--   Annual  ($168/yr): pri_01kt5e1gwgysmdgmjq73xecde2

UPDATE plans
SET
  paddle_price_id_monthly = 'pri_01kt5dztgzehbz8b1gwd2y58k9',
  paddle_price_id_annual  = 'pri_01kt5e1gwgysmdgmjq73xecde2'
WHERE id = 'pro';

-- Verify the update
SELECT id, paddle_price_id_monthly, paddle_price_id_annual FROM plans;
