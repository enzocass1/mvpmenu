-- Migration 08: Fix Orphan Orders
-- Auto-assign table_id to orders that have table_number but no table_id
-- This fixes the discrepancy between Cart.jsx (uses table_number) and CassaPage.jsx (uses table_id)

-- ============================================
-- PROBLEMA RISOLTO:
-- ============================================
-- Gli ordini creati prima del fix avevano solo table_number ma non table_id
-- Cart.jsx li rileva come "occupati" (controlla table_number)
-- CassaPage.jsx li rileva come "orfani" (controlla table_id = NULL)
-- Risultato: Tavoli mostrati OCCUPATI nel QR menu ma DISPONIBILI nella dashboard

-- ============================================
-- SOLUZIONE:
-- ============================================
-- Trova tutti gli ordini con table_number ma senza table_id
-- Cerca il tavolo corrispondente (matching table_number + room_id)
-- Assegna automaticamente il table_id corretto

DO $$
DECLARE
  orphan_record RECORD;
  matching_table_id UUID;
  updated_count INT := 0;
BEGIN
  RAISE NOTICE '🔍 Cercando ordini orfani (con table_number ma senza table_id)...';

  -- Loop through all orphan orders (have table_number but no table_id)
  FOR orphan_record IN
    SELECT
      id,
      table_number,
      room_id,
      restaurant_id,
      customer_name,
      created_at,
      status
    FROM orders
    WHERE table_number IS NOT NULL
      AND table_id IS NULL
      AND status IN ('pending', 'preparing', 'ready', 'completed')
    ORDER BY created_at DESC
  LOOP
    -- Find matching table by number and room_id
    SELECT t.id INTO matching_table_id
    FROM tables t
    WHERE t.number = orphan_record.table_number
      AND (orphan_record.room_id IS NULL OR t.room_id = orphan_record.room_id)
      AND t.is_active = true
      AND t.restaurant_id = orphan_record.restaurant_id
    LIMIT 1;

    IF matching_table_id IS NOT NULL THEN
      -- Update the order with the correct table_id
      UPDATE orders
      SET table_id = matching_table_id
      WHERE id = orphan_record.id;

      updated_count := updated_count + 1;

      RAISE NOTICE '✅ Ordine % (%) - Assegnato al tavolo % → table_id: %',
        orphan_record.id,
        COALESCE(orphan_record.customer_name, 'Cliente'),
        orphan_record.table_number,
        matching_table_id;
    ELSE
      RAISE WARNING '⚠️ Ordine % - Tavolo % non trovato nel database (room_id: %)',
        orphan_record.id,
        orphan_record.table_number,
        orphan_record.room_id;
    END IF;
  END LOOP;

  IF updated_count > 0 THEN
    RAISE NOTICE '🎉 Migration completata! % ordini orfani sono stati riassegnati ai loro tavoli.', updated_count;
  ELSE
    RAISE NOTICE 'ℹ️ Nessun ordine orfano trovato. Tutti gli ordini sono già assegnati correttamente.';
  END IF;

  -- Show summary
  RAISE NOTICE '';
  RAISE NOTICE '📊 RIEPILOGO:';
  RAISE NOTICE '   - Ordini aggiornati: %', updated_count;
  RAISE NOTICE '   - Ordini ancora orfani: %', (
    SELECT COUNT(*)
    FROM orders
    WHERE table_number IS NOT NULL
      AND table_id IS NULL
      AND status IN ('pending', 'preparing', 'ready', 'completed')
  );

END $$;

-- Verify results
DO $$
DECLARE
  orphan_count INT;
  fixed_count INT;
BEGIN
  -- Count remaining orphans
  SELECT COUNT(*) INTO orphan_count
  FROM orders
  WHERE table_number IS NOT NULL
    AND table_id IS NULL
    AND status IN ('pending', 'preparing', 'ready', 'completed');

  -- Count recently fixed orders
  SELECT COUNT(*) INTO fixed_count
  FROM orders
  WHERE table_number IS NOT NULL
    AND table_id IS NOT NULL
    AND status IN ('pending', 'preparing', 'ready', 'completed');

  RAISE NOTICE '';
  RAISE NOTICE '✅ VERIFICA FINALE:';
  RAISE NOTICE '   - Ordini attivi con tavolo assegnato: %', fixed_count;
  RAISE NOTICE '   - Ordini ancora orfani: %', orphan_count;

  IF orphan_count > 0 THEN
    RAISE WARNING '⚠️ Attenzione: Ci sono ancora % ordini orfani. Potrebbero riferirsi a tavoli che non esistono più.', orphan_count;
  ELSE
    RAISE NOTICE '🎉 Perfetto! Nessun ordine orfano rilevato.';
  END IF;
END $$;
