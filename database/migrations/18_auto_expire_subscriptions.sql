-- Migration 18: Automatic Expiration of Trial Periods and Temporary Upgrades
-- This migration creates functions to automatically expire trial periods and temporary upgrades

-- ============================================================================
-- Function 1: Expire Trial Periods
-- ============================================================================
-- This function finds all restaurants with expired trial periods and marks them as expired

CREATE OR REPLACE FUNCTION expire_trial_periods()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count INTEGER;
  v_expired_restaurants JSONB;
BEGIN
  -- Find and update expired trial periods
  WITH expired_trials AS (
    UPDATE restaurants
    SET
      subscription_status = 'expired',
      updated_at = NOW()
    WHERE
      subscription_status = 'trial'
      AND subscription_trial_ends_at IS NOT NULL
      AND subscription_trial_ends_at < NOW()
    RETURNING id, name, subscription_trial_ends_at
  )
  SELECT
    COUNT(*)::INTEGER,
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'id', id,
        'name', name,
        'trial_ended_at', subscription_trial_ends_at
      )
    )
  INTO v_expired_count, v_expired_restaurants
  FROM expired_trials;

  -- Log the expiration
  RAISE NOTICE 'Expired % trial periods', v_expired_count;

  RETURN JSONB_BUILD_OBJECT(
    'success', true,
    'expired_count', COALESCE(v_expired_count, 0),
    'expired_restaurants', COALESCE(v_expired_restaurants, '[]'::JSONB),
    'executed_at', NOW()
  );
END;
$$;

-- ============================================================================
-- Function 2: Expire Temporary Upgrades
-- ============================================================================
-- This function finds all expired temporary upgrades and restores original plans

CREATE OR REPLACE FUNCTION expire_temporary_upgrades()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count INTEGER;
  v_expired_upgrades JSONB;
  v_upgrade RECORD;
BEGIN
  -- Find all expired temporary upgrades
  FOR v_upgrade IN
    SELECT
      tu.id,
      tu.restaurant_id,
      tu.original_plan_id,
      tu.temporary_plan_id,
      tu.expires_at,
      r.name as restaurant_name,
      op.name as original_plan_name,
      tp.name as temporary_plan_name
    FROM temporary_upgrades tu
    JOIN restaurants r ON r.id = tu.restaurant_id
    LEFT JOIN subscription_plans op ON op.id = tu.original_plan_id
    LEFT JOIN subscription_plans tp ON tp.id = tu.temporary_plan_id
    WHERE
      tu.is_active = true
      AND tu.expires_at < NOW()
  LOOP
    -- Restore original plan for this restaurant
    UPDATE restaurants
    SET
      subscription_plan_id = v_upgrade.original_plan_id,
      subscription_status = 'active',
      subscription_expires_at = NULL, -- Remove expiration since we're back to original plan
      updated_at = NOW()
    WHERE id = v_upgrade.restaurant_id;

    -- Mark the temporary upgrade as inactive
    UPDATE temporary_upgrades
    SET
      is_active = false,
      updated_at = NOW()
    WHERE id = v_upgrade.id;

    RAISE NOTICE 'Expired temporary upgrade for restaurant % (% → %)',
      v_upgrade.restaurant_name,
      v_upgrade.temporary_plan_name,
      v_upgrade.original_plan_name;
  END LOOP;

  -- Get summary of expired upgrades
  WITH expired_upgrades AS (
    SELECT
      tu.id,
      r.name as restaurant_name,
      op.name as original_plan_name,
      tp.name as temporary_plan_name,
      tu.expires_at
    FROM temporary_upgrades tu
    JOIN restaurants r ON r.id = tu.restaurant_id
    LEFT JOIN subscription_plans op ON op.id = tu.original_plan_id
    LEFT JOIN subscription_plans tp ON tp.id = tu.temporary_plan_id
    WHERE
      tu.is_active = false
      AND tu.expires_at < NOW()
      AND tu.updated_at > NOW() - INTERVAL '1 minute' -- Just updated
  )
  SELECT
    COUNT(*)::INTEGER,
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'id', id,
        'restaurant_name', restaurant_name,
        'original_plan', original_plan_name,
        'temporary_plan', temporary_plan_name,
        'expired_at', expires_at
      )
    )
  INTO v_expired_count, v_expired_upgrades
  FROM expired_upgrades;

  RETURN JSONB_BUILD_OBJECT(
    'success', true,
    'expired_count', COALESCE(v_expired_count, 0),
    'expired_upgrades', COALESCE(v_expired_upgrades, '[]'::JSONB),
    'executed_at', NOW()
  );
END;
$$;

-- ============================================================================
-- Function 3: Master Function - Expire All Subscriptions
-- ============================================================================
-- This is the main function that should be called by cron job

CREATE OR REPLACE FUNCTION expire_all_subscriptions()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trial_result JSONB;
  v_upgrade_result JSONB;
BEGIN
  -- Expire trial periods
  v_trial_result := expire_trial_periods();

  -- Expire temporary upgrades
  v_upgrade_result := expire_temporary_upgrades();

  -- Return combined results
  RETURN JSONB_BUILD_OBJECT(
    'success', true,
    'trial_periods', v_trial_result,
    'temporary_upgrades', v_upgrade_result,
    'executed_at', NOW()
  );
END;
$$;

-- ============================================================================
-- Grant Execute Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION expire_trial_periods() TO authenticated;
GRANT EXECUTE ON FUNCTION expire_temporary_upgrades() TO authenticated;
GRANT EXECUTE ON FUNCTION expire_all_subscriptions() TO authenticated;

-- ============================================================================
-- pg_cron Setup (Optional - requires pg_cron extension)
-- ============================================================================
-- Note: pg_cron might not be available on all Supabase plans
-- If available, uncomment the following lines to enable automatic expiration every hour

-- Enable pg_cron extension (if not already enabled)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the expiration job to run every hour at minute 0
-- SELECT cron.schedule(
--   'expire-subscriptions-hourly',
--   '0 * * * *',  -- Every hour at minute 0
--   $$SELECT expire_all_subscriptions();$$
-- );

-- Alternative: Run every day at midnight
-- SELECT cron.schedule(
--   'expire-subscriptions-daily',
--   '0 0 * * *',  -- Every day at midnight
--   $$SELECT expire_all_subscriptions();$$
-- );

-- To manually check scheduled jobs:
-- SELECT * FROM cron.job;

-- To manually run the job:
-- SELECT expire_all_subscriptions();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION expire_trial_periods() IS
'Automatically expires trial periods that have passed their end date. Returns JSON with count and list of expired restaurants.';

COMMENT ON FUNCTION expire_temporary_upgrades() IS
'Automatically expires temporary upgrades and restores original subscription plans. Returns JSON with count and list of expired upgrades.';

COMMENT ON FUNCTION expire_all_subscriptions() IS
'Master function that expires both trial periods and temporary upgrades. This should be called by cron job or manually. Returns combined JSON results.';
