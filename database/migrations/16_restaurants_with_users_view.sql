/**
 * Migration 16: Create view for Super Admin to get restaurants with user emails
 *
 * This allows the Super Admin CRM to fetch restaurant data including owner email addresses
 * without exposing the auth.users table directly to the client.
 */

-- Drop function if it exists
DROP FUNCTION IF EXISTS get_restaurants_with_user_emails();

-- Create a secure view that joins restaurants with user emails
-- This view uses SECURITY DEFINER to run with elevated privileges
CREATE OR REPLACE VIEW restaurants_with_user_emails AS
SELECT
  r.id,
  r.name,
  r.subdomain,
  r.created_at,
  r.updated_at,
  r.subscription_status,
  r.subscription_started_at,
  r.subscription_expires_at,
  r.subscription_trial_ends_at,
  r.subscription_cancelled_at,
  r.subscription_metadata,
  r.user_id,
  r.subscription_plan_id,
  r.is_trial_used,
  sp.name as plan_name,
  sp.slug as plan_slug,
  sp.price_monthly as plan_price_monthly,
  sp.price_yearly as plan_price_yearly,
  sp.currency as plan_currency,
  sp.is_legacy as plan_is_legacy,
  COALESCE(au.email, 'N/A') as owner_email
FROM restaurants r
LEFT JOIN subscription_plans sp ON r.subscription_plan_id = sp.id
LEFT JOIN auth.users au ON r.user_id = au.id;

-- Grant select permission to authenticated users (Super Admin will use this)
GRANT SELECT ON restaurants_with_user_emails TO authenticated;

-- Add comment
COMMENT ON VIEW restaurants_with_user_emails IS
  'Returns all restaurants with subscription plan details and owner email. Used by Super Admin CRM.';
