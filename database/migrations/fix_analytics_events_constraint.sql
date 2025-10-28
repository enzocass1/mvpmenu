-- ============================================
-- MIGRATION: Fix Analytics Events Constraint
-- Data: 26 Ottobre 2025
-- Scopo: Aggiungere tutti gli event types mancanti
--        per eliminare errori 400 su analytics_events
-- ============================================

-- Drop existing constraint
ALTER TABLE analytics_events
DROP CONSTRAINT IF EXISTS analytics_events_event_type_check;

-- Add comprehensive constraint with ALL event types
ALTER TABLE analytics_events
ADD CONSTRAINT analytics_events_event_type_check
CHECK (event_type IN (
  -- Public Menu Events
  'favorite_added',
  'favorite_removed',
  'product_viewed',
  'category_viewed',
  'session_time',
  'qr_scanned',

  -- Order Lifecycle Events
  'table_order_pending',
  'table_order_confirmed',
  'counter_order_completed',
  'table_closed',
  'order_cancelled',
  'order_item_added',
  'order_completed',

  -- Order Actions
  'products_added_to_order',
  'priority_order_requested',
  'preconto_generated',
  'table_changed',

  -- Legacy (backward compatibility)
  'order_created',
  'order_confirmed'
));

COMMENT ON CONSTRAINT analytics_events_event_type_check ON analytics_events IS 'Constraint aggiornato il 26/10/2025 per includere tutti gli event types del sistema';

-- Verify constraint
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'analytics_events'::regclass
AND conname = 'analytics_events_event_type_check';

-- ============================================
-- Verification Query
-- ============================================
-- Controlla quali event types sono stati usati finora
SELECT DISTINCT event_type, COUNT(*) as count
FROM analytics_events
GROUP BY event_type
ORDER BY count DESC;
