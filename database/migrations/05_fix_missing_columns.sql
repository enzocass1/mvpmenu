-- ============================================
-- Migration 05: Fix Missing Columns
-- ============================================
-- Purpose: Add missing columns that are referenced in code but don't exist
-- Date: 27/10/2025
-- Priority: HIGH - Blocks tracking

BEGIN;

-- ============================================
-- FIX 1: Add order_number to analytics_events
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analytics_events' AND column_name = 'order_number'
  ) THEN
    ALTER TABLE analytics_events ADD COLUMN order_number INTEGER;
    CREATE INDEX IF NOT EXISTS idx_analytics_order_number ON analytics_events(order_number);
    RAISE NOTICE 'Column order_number added to analytics_events';
  ELSE
    RAISE NOTICE 'Column order_number already exists';
  END IF;
END $$;

-- ============================================
-- FIX 2: Add restaurant_id to tables (if missing)
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tables' AND column_name = 'restaurant_id'
  ) THEN
    -- Add column
    ALTER TABLE tables ADD COLUMN restaurant_id UUID;

    -- Add foreign key constraint
    ALTER TABLE tables
      ADD CONSTRAINT fk_tables_restaurant
      FOREIGN KEY (restaurant_id)
      REFERENCES restaurants(id)
      ON DELETE CASCADE;

    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_tables_restaurant_id ON tables(restaurant_id);

    RAISE NOTICE 'Column restaurant_id added to tables with FK and index';
  ELSE
    RAISE NOTICE 'Column restaurant_id already exists in tables';
  END IF;
END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify order_number added to analytics_events
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'analytics_events' AND column_name = 'order_number';

-- Expected result: 1 row
-- order_number | integer

-- Verify restaurant_id in tables
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tables' AND column_name = 'restaurant_id';

-- Expected result: 1 row (or already existed)
-- restaurant_id | uuid

-- Verify indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('analytics_events', 'tables')
  AND indexname IN ('idx_analytics_order_number', 'idx_tables_restaurant_id');

-- Expected result: 2 rows (or 1 if tables.restaurant_id already existed)
