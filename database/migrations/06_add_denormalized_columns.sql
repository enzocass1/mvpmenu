-- ============================================
-- Migration 06: Add Denormalized Columns
-- ============================================
-- Purpose: Add denormalized columns for fast queries (avoid JOINs)
-- Date: 27/10/2025
-- Priority: HIGH - Blocks tracking

BEGIN;

-- ============================================
-- FIX 1: Add product_sku and staff_name to analytics_events
-- ============================================

DO $$
BEGIN
  -- Add product_sku (for quick product queries without JOIN)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analytics_events' AND column_name = 'product_sku'
  ) THEN
    ALTER TABLE analytics_events ADD COLUMN product_sku VARCHAR(100);
    CREATE INDEX IF NOT EXISTS idx_analytics_product_sku ON analytics_events(product_sku);
    RAISE NOTICE 'Column product_sku added to analytics_events';
  ELSE
    RAISE NOTICE 'Column product_sku already exists';
  END IF;

  -- Add staff_name (for quick staff queries without JOIN)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analytics_events' AND column_name = 'staff_name'
  ) THEN
    ALTER TABLE analytics_events ADD COLUMN staff_name VARCHAR(200);
    CREATE INDEX IF NOT EXISTS idx_analytics_staff_name ON analytics_events(staff_name);
    RAISE NOTICE 'Column staff_name added to analytics_events';
  ELSE
    RAISE NOTICE 'Column staff_name already exists';
  END IF;
END $$;

-- ============================================
-- FIX 2: Add table_number to tables (if missing)
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tables' AND column_name = 'table_number'
  ) THEN
    ALTER TABLE tables ADD COLUMN table_number INTEGER;
    CREATE INDEX IF NOT EXISTS idx_tables_table_number ON tables(table_number);
    RAISE NOTICE 'Column table_number added to tables';
  ELSE
    RAISE NOTICE 'Column table_number already exists';
  END IF;
END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify product_sku and staff_name in analytics_events
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'analytics_events'
  AND column_name IN ('product_sku', 'staff_name');

-- Expected result: 2 rows

-- Verify table_number in tables
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tables' AND column_name = 'table_number';

-- Expected result: 1 row (or already existed)

-- Verify indexes
SELECT indexname
FROM pg_indexes
WHERE tablename IN ('analytics_events', 'tables')
  AND indexname IN ('idx_analytics_product_sku', 'idx_analytics_staff_name', 'idx_tables_table_number');

-- Expected result: 3 indexes (or less if some columns existed)
