-- ===================================================================
-- MIGRATION: Add operator_order_action event type to analytics_events
-- ===================================================================

-- Update constraint to include new event type for operator analytics
ALTER TABLE analytics_events
DROP CONSTRAINT IF EXISTS analytics_events_event_type_check;

ALTER TABLE analytics_events
ADD CONSTRAINT analytics_events_event_type_check
CHECK (event_type IN (
  'favorite_added',
  'favorite_removed',
  'product_viewed',
  'category_viewed',
  'session_time',
  'qr_scanned',
  'order_item_added',
  'order_completed',
  'order_cancelled',
  'operator_order_action'  -- New event type for tracking operator actions
));

COMMENT ON CONSTRAINT analytics_events_event_type_check ON analytics_events IS
'Event types: favorite_added, favorite_removed, product_viewed, category_viewed, session_time, qr_scanned, order_item_added, order_completed, order_cancelled, operator_order_action';

-- ===================================================================
-- VIEWS FOR OPERATOR ANALYTICS
-- ===================================================================

-- View per statistiche operatore
CREATE OR REPLACE VIEW operator_statistics AS
SELECT
  (metadata->>'staff_id')::UUID as staff_id,
  metadata->>'staff_name' as staff_name,
  restaurant_id,
  DATE(created_at) as date,
  COUNT(*) as total_actions,
  COUNT(DISTINCT (metadata->>'order_id')::UUID) as orders_handled,
  COUNT(*) FILTER (WHERE metadata->>'action' = 'confirmed') as orders_confirmed,
  COUNT(*) FILTER (WHERE metadata->>'action' = 'preparing') as orders_prepared,
  COUNT(*) FILTER (WHERE metadata->>'action' = 'completed') as orders_completed
FROM analytics_events
WHERE event_type = 'operator_order_action'
  AND metadata->>'staff_id' IS NOT NULL
GROUP BY (metadata->>'staff_id')::UUID, metadata->>'staff_name', restaurant_id, DATE(created_at);

COMMENT ON VIEW operator_statistics IS 'Statistiche aggregate per operatore (camerieri/staff) per analytics';

-- ===================================================================
-- NOTES
-- ===================================================================
-- Questo migration aggiunge:
-- 1. Nuovo event type 'operator_order_action' per tracciare azioni degli operatori
-- 2. View 'operator_statistics' per analizzare performance operatori
--
-- Metadata per operator_order_action:
-- {
--   "order_id": "uuid",
--   "staff_id": "uuid",
--   "staff_name": "string",
--   "action": "confirmed|preparing|completed",
--   "previous_status": "pending|confirmed|preparing",
--   "table_number": number
-- }
