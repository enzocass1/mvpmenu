/**
 * Migration 17: Super Admin RPC Function for Temporary Upgrades
 *
 * Creates a SECURITY DEFINER function to allow Super Admin to apply temporary upgrades
 * bypassing RLS policies.
 */

-- Drop if exists
DROP FUNCTION IF EXISTS super_admin_apply_temp_upgrade(UUID, UUID, TIMESTAMPTZ);

-- Create function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION super_admin_apply_temp_upgrade(
  p_restaurant_id UUID,
  p_temp_plan_id UUID,
  p_expires_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Update restaurant plan
  UPDATE restaurants
  SET
    subscription_plan_id = p_temp_plan_id,
    subscription_status = 'active',
    subscription_expires_at = p_expires_at,
    updated_at = NOW()
  WHERE id = p_restaurant_id
  RETURNING jsonb_build_object(
    'id', id,
    'subscription_plan_id', subscription_plan_id,
    'subscription_status', subscription_status,
    'subscription_expires_at', subscription_expires_at
  ) INTO v_result;

  -- Check if update was successful
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Restaurant not found: %', p_restaurant_id;
  END IF;

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users (Super Admin uses authenticated role)
GRANT EXECUTE ON FUNCTION super_admin_apply_temp_upgrade(UUID, UUID, TIMESTAMPTZ) TO authenticated;

-- Add comment
COMMENT ON FUNCTION super_admin_apply_temp_upgrade IS
  'Allows Super Admin to apply temporary upgrade bypassing RLS policies. SECURITY DEFINER function.';
