-- =====================================================
-- MIGRATION: Cleanup Duplicate Timeline Events
-- Data: 2025-10-27
-- Descrizione: Elimina eventi timeline duplicati creati
--              dal vecchio trigger prima della disabilitazione.
--              Gli eventi del trigger NON hanno event_source,
--              mentre gli eventi del codice applicativo ce l'hanno.
-- =====================================================
-- Problema risolto:
--   - Elimina "Ordine creato" duplicato senza dettagli
--   - Elimina "In preparazione" duplicato senza dettagli
--   - Elimina TUTTI gli eventi vecchi senza event_source
-- =====================================================
-- IMPORTANTE: Questa migration elimina SOLO eventi duplicati
--             creati dal vecchio trigger (event_source IS NULL).
--             Mantiene tutti gli eventi dettagliati creati dal
--             codice applicativo (event_source IS NOT NULL).
-- =====================================================

BEGIN;

-- =====================================================
-- 1. BACKUP COUNT (per log)
-- =====================================================

DO $$
DECLARE
  total_events INTEGER;
  events_without_source INTEGER;
  events_with_source INTEGER;
BEGIN
  -- Conta totale eventi
  SELECT COUNT(*) INTO total_events FROM order_timeline;

  -- Conta eventi senza event_source (da eliminare)
  SELECT COUNT(*) INTO events_without_source
  FROM order_timeline
  WHERE event_source IS NULL;

  -- Conta eventi con event_source (da mantenere)
  SELECT COUNT(*) INTO events_with_source
  FROM order_timeline
  WHERE event_source IS NOT NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'STATO PRIMA DELLA PULIZIA:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Totale eventi timeline: %', total_events;
  RAISE NOTICE 'Eventi senza event_source (duplicati da trigger): %', events_without_source;
  RAISE NOTICE 'Eventi con event_source (dettagliati): %', events_with_source;
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- 2. ELIMINA EVENTI DUPLICATI SENZA event_source
-- =====================================================

-- Gli eventi creati dal vecchio trigger hanno event_source IS NULL
-- Gli eventi creati dal codice applicativo hanno event_source IS NOT NULL
DELETE FROM order_timeline
WHERE event_source IS NULL;

-- =====================================================
-- 3. VERIFICA FINALE
-- =====================================================

DO $$
DECLARE
  remaining_events INTEGER;
  deleted_events INTEGER;
BEGIN
  -- Conta eventi rimasti
  SELECT COUNT(*) INTO remaining_events FROM order_timeline;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ PULIZIA COMPLETATA CON SUCCESSO!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Eventi timeline rimasti: %', remaining_events;
  RAISE NOTICE '';
  RAISE NOTICE 'Risultato:';
  RAISE NOTICE '  ✅ Eliminati tutti gli eventi duplicati senza dettagli';
  RAISE NOTICE '  ✅ Mantenuti tutti gli eventi dettagliati con event_source';
  RAISE NOTICE '  ✅ Timeline ora mostra solo eventi puliti e dettagliati';
  RAISE NOTICE '';
  RAISE NOTICE 'Verifica:';
  RAISE NOTICE '  → Controlla la timeline di un ordine esistente';
  RAISE NOTICE '  → NON dovresti più vedere duplicati';
  RAISE NOTICE '  → Ogni evento ha event_source, details_summary, notes';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =====================================================
-- 4. QUERY DI VERIFICA (opzionale)
-- =====================================================

-- Query per verificare che non ci siano più eventi senza event_source
SELECT COUNT(*) as eventi_senza_source
FROM order_timeline
WHERE event_source IS NULL;
-- Deve ritornare 0

-- Query per vedere un campione di eventi rimasti
SELECT
  id,
  order_id,
  action,
  event_source,
  details_summary,
  created_at
FROM order_timeline
ORDER BY created_at DESC
LIMIT 10;
-- Tutti devono avere event_source NOT NULL
