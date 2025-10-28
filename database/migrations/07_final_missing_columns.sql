-- ============================================
-- Migration 07: FINAL Missing Columns
-- ============================================
-- Purpose: Add ALL remaining missing columns (should be the LAST one!)
-- Date: 27/10/2025
-- Priority: CRITICAL - Final fix

BEGIN;

-- ============================================
-- Add remaining FK and location columns
-- ============================================

DO $$
BEGIN
  -- Add room_id (location tracking)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analytics_events' AND column_name = 'room_id'
  ) THEN
    ALTER TABLE analytics_events ADD COLUMN room_id UUID;
    CREATE INDEX IF NOT EXISTS idx_analytics_room_id ON analytics_events(room_id);
    RAISE NOTICE 'Column room_id added to analytics_events';
  ELSE
    RAISE NOTICE 'Column room_id already exists';
  END IF;

  -- Add table_id (table tracking)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analytics_events' AND column_name = 'table_id'
  ) THEN
    ALTER TABLE analytics_events ADD COLUMN table_id UUID;
    CREATE INDEX IF NOT EXISTS idx_analytics_table_id ON analytics_events(table_id);
    RAISE NOTICE 'Column table_id added to analytics_events';
  ELSE
    RAISE NOTICE 'Column table_id already exists';
  END IF;

  -- Add category_id (product category tracking)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analytics_events' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE analytics_events ADD COLUMN category_id UUID;
    CREATE INDEX IF NOT EXISTS idx_analytics_category_id ON analytics_events(category_id);
    RAISE NOTICE 'Column category_id added to analytics_events';
  ELSE
    RAISE NOTICE 'Column category_id already exists';
  END IF;

END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify all 3 columns added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'analytics_events'
  AND column_name IN ('room_id', 'table_id', 'category_id')
ORDER BY column_name;

-- Expected result: 3 rows

-- Verify indexes
SELECT indexname
FROM pg_indexes
WHERE tablename = 'analytics_events'
  AND indexname IN ('idx_analytics_room_id', 'idx_analytics_table_id', 'idx_analytics_category_id');

-- Expected result: 3 indexes

-- Final check: Count ALL columns in analytics_events
SELECT COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_name = 'analytics_events';

-- Expected: Should be around 27-30 columns now
