-- ============================================
-- Migration 04: Add JSONB Rich Columns to analytics_events
-- ============================================
-- Purpose: Add Klaviyo-style JSONB columns for rich event tracking
-- Date: 27/10/2025
-- Status: Ready for execution

BEGIN;

-- Add JSONB columns to analytics_events table
-- These columns store the "5 Pillars" rich metadata

DO $$
BEGIN
  -- Add actor column (CHI - Who performed the action)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analytics_events' AND column_name = 'actor'
  ) THEN
    ALTER TABLE analytics_events ADD COLUMN actor JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Column actor added to analytics_events';
  ELSE
    RAISE NOTICE 'Column actor already exists';
  END IF;

  -- Add order_data column (Order context)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analytics_events' AND column_name = 'order_data'
  ) THEN
    ALTER TABLE analytics_events ADD COLUMN order_data JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Column order_data added to analytics_events';
  ELSE
    RAISE NOTICE 'Column order_data already exists';
  END IF;

  -- Add items column (COSA - What was ordered/prepared)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analytics_events' AND column_name = 'items'
  ) THEN
    ALTER TABLE analytics_events ADD COLUMN items JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE 'Column items added to analytics_events';
  ELSE
    RAISE NOTICE 'Column items already exists';
  END IF;

  -- Add money column (QUANTO - How much money)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analytics_events' AND column_name = 'money'
  ) THEN
    ALTER TABLE analytics_events ADD COLUMN money JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Column money added to analytics_events';
  ELSE
    RAISE NOTICE 'Column money already exists';
  END IF;

  -- Add timing column (QUANDO - When and duration)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analytics_events' AND column_name = 'timing'
  ) THEN
    ALTER TABLE analytics_events ADD COLUMN timing JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Column timing added to analytics_events';
  ELSE
    RAISE NOTICE 'Column timing already exists';
  END IF;

  -- Add flags column (Boolean flags for filtering)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analytics_events' AND column_name = 'flags'
  ) THEN
    ALTER TABLE analytics_events ADD COLUMN flags JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Column flags added to analytics_events';
  ELSE
    RAISE NOTICE 'Column flags already exists';
  END IF;

  -- Add kpi column (Computed KPI metrics)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analytics_events' AND column_name = 'kpi'
  ) THEN
    ALTER TABLE analytics_events ADD COLUMN kpi JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Column kpi added to analytics_events';
  ELSE
    RAISE NOTICE 'Column kpi already exists';
  END IF;

END $$;

-- Add GIN indexes for JSONB columns (for fast queries)
CREATE INDEX IF NOT EXISTS idx_analytics_actor_gin ON analytics_events USING GIN (actor);
CREATE INDEX IF NOT EXISTS idx_analytics_order_data_gin ON analytics_events USING GIN (order_data);
CREATE INDEX IF NOT EXISTS idx_analytics_items_gin ON analytics_events USING GIN (items);
CREATE INDEX IF NOT EXISTS idx_analytics_money_gin ON analytics_events USING GIN (money);
CREATE INDEX IF NOT EXISTS idx_analytics_timing_gin ON analytics_events USING GIN (timing);
CREATE INDEX IF NOT EXISTS idx_analytics_flags_gin ON analytics_events USING GIN (flags);
CREATE INDEX IF NOT EXISTS idx_analytics_kpi_gin ON analytics_events USING GIN (kpi);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify columns added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'analytics_events'
  AND column_name IN ('actor', 'order_data', 'items', 'money', 'timing', 'flags', 'kpi')
ORDER BY column_name;

-- Expected result: 7 rows
-- actor       | jsonb | '{}'::jsonb
-- flags       | jsonb | '{}'::jsonb
-- items       | jsonb | '[]'::jsonb
-- kpi         | jsonb | '{}'::jsonb
-- money       | jsonb | '{}'::jsonb
-- order_data  | jsonb | '{}'::jsonb
-- timing      | jsonb | '{}'::jsonb

-- Verify indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'analytics_events'
  AND indexname LIKE 'idx_analytics_%_gin'
ORDER BY indexname;

-- Expected result: 7 indexes with GIN access method
