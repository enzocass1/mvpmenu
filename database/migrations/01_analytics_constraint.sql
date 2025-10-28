-- ============================================
-- MIGRATION PART 1: Fix Analytics Events Constraint
-- ============================================

-- Drop existing constraint
ALTER TABLE analytics_events
DROP CONSTRAINT IF EXISTS analytics_events_event_type_check;

-- Add comprehensive constraint with ALL 42 event types
ALTER TABLE analytics_events
ADD CONSTRAINT analytics_events_event_type_check
CHECK (event_type IN (
  -- Customer Account Events (7)
  'customer_registered',
  'customer_login',
  'customer_logout',
  'customer_profile_updated',
  'loyalty_points_earned',
  'loyalty_points_redeemed',
  'traffic_source_tracked',

  -- Public Menu Browsing Events (11)
  'qr_scanned',
  'menu_opened',
  'category_viewed',
  'product_viewed',
  'product_image_viewed',
  'product_searched',
  'favorite_added',
  'favorite_removed',
  'session_time',
  'opening_hours_viewed',
  'menu_shared',

  -- Cart & Checkout Events (4)
  'order_item_added',
  'cart_item_removed',
  'cart_viewed',
  'checkout_started',

  -- Order Lifecycle Events (10)
  'order_created',
  'order_status_changed',
  'item_prepared',
  'order_note_added',
  'order_confirmed',
  'products_added_to_order',
  'item_removed',
  'order_completed',
  'order_cancelled',
  'table_changed',

  -- Staff Operations Events (8)
  'staff_login',
  'staff_logout',
  'table_opened',
  'preconto_generated',
  'receipt_printed',
  'priority_order_requested',
  'table_order_pending',
  'table_order_confirmed',

  -- Payment & Receipt Events (2)
  'payment_method_selected',
  'discount_applied',

  -- Legacy (backward compatibility)
  'counter_order_completed',
  'table_closed'
));

COMMENT ON CONSTRAINT analytics_events_event_type_check ON analytics_events
IS '42 event types - Sistema completo analytics aggiornato il 26/10/2025';

-- Verification
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'analytics_events'::regclass
  AND conname = 'analytics_events_event_type_check';
