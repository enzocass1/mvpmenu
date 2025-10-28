-- =====================================================
-- MIGRATION: Cleanup System Ghost Events
-- Data: 2025-10-27
-- Descrizione: Elimina eventi "fantasma" creati da vecchie
--              versioni del codice con event_source='system'
--              ma senza dettagli (details_summary e notes NULL).
-- =====================================================
-- Problema risolto:
--   - Elimina duplicati tipo "Ordine creato" senza dettagli
--   - Elimina duplicati tipo "In preparazione" senza dettagli
--   - Mantiene eventi "system" che HANNO dettagli (legittimi)
-- =====================================================
-- IMPORTANTE: Questa migration elimina SOLO eventi fantasma
--             con event_source='system' MA senza informazioni
--             (details_summary IS NULL AND notes IS NULL).
--
--             Mantiene eventi system che hanno almeno uno tra
--             details_summary o notes (sono eventi legittimi).
-- =====================================================

BEGIN;

-- =====================================================
-- 1. BACKUP COUNT (per log)
-- =====================================================

DO $$
DECLARE
  total_events INTEGER;
  system_events INTEGER;
  ghost_events INTEGER;
  good_system_events INTEGER;
BEGIN
  -- Conta totale eventi
  SELECT COUNT(*) INTO total_events FROM order_timeline;

  -- Conta tutti gli eventi system
  SELECT COUNT(*) INTO system_events
  FROM order_timeline
  WHERE event_source = 'system';

  -- Conta eventi fantasma (system SENZA dettagli)
  SELECT COUNT(*) INTO ghost_events
  FROM order_timeline
  WHERE event_source = 'system'
    AND details_summary IS NULL
    AND notes IS NULL;

  -- Conta eventi system legittimi (CON dettagli)
  SELECT COUNT(*) INTO good_system_events
  FROM order_timeline
  WHERE event_source = 'system'
    AND (details_summary IS NOT NULL OR notes IS NOT NULL);

  RAISE NOTICE '========================================';
  RAISE NOTICE 'STATO PRIMA DELLA PULIZIA:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Totale eventi timeline: %', total_events;
  RAISE NOTICE 'Eventi con source=system: %', system_events;
  RAISE NOTICE '  → Eventi fantasma (senza dettagli): %', ghost_events;
  RAISE NOTICE '  → Eventi legittimi (con dettagli): %', good_system_events;
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- 2. MOSTRA EVENTI FANTASMA CHE VERRANNO ELIMINATI
-- =====================================================

DO $$
DECLARE
  ghost_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Eventi fantasma che verranno eliminati:';
  RAISE NOTICE '----------------------------------------';

  FOR ghost_record IN
    SELECT
      id,
      action,
      event_source,
      created_by_type,
      TO_CHAR(created_at, 'DD Mon YYYY HH24:MI:SS') as formatted_date
    FROM order_timeline
    WHERE event_source = 'system'
      AND details_summary IS NULL
      AND notes IS NULL
    ORDER BY created_at DESC
    LIMIT 10
  LOOP
    RAISE NOTICE '  - Action: %, Source: %, Type: %, Date: %',
      ghost_record.action,
      ghost_record.event_source,
      ghost_record.created_by_type,
      ghost_record.formatted_date;
  END LOOP;

  RAISE NOTICE '';
END $$;

-- =====================================================
-- 3. ELIMINA EVENTI FANTASMA
-- =====================================================

-- Elimina SOLO eventi system che NON hanno né details_summary né notes
-- Questi sono chiaramente duplicati/fantasmi senza informazioni utili
DELETE FROM order_timeline
WHERE event_source = 'system'
  AND details_summary IS NULL
  AND notes IS NULL;

-- =====================================================
-- 4. VERIFICA FINALE
-- =====================================================

DO $$
DECLARE
  remaining_events INTEGER;
  remaining_system_events INTEGER;
BEGIN
  -- Conta eventi rimasti
  SELECT COUNT(*) INTO remaining_events FROM order_timeline;

  -- Conta eventi system rimasti (dovrebbero essere solo quelli con dettagli)
  SELECT COUNT(*) INTO remaining_system_events
  FROM order_timeline
  WHERE event_source = 'system';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ PULIZIA COMPLETATA CON SUCCESSO!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Eventi timeline rimasti: %', remaining_events;
  RAISE NOTICE 'Eventi system rimasti (con dettagli): %', remaining_system_events;
  RAISE NOTICE '';
  RAISE NOTICE 'Risultato:';
  RAISE NOTICE '  ✅ Eliminati tutti gli eventi fantasma senza dettagli';
  RAISE NOTICE '  ✅ Mantenuti eventi system legittimi (con dettagli)';
  RAISE NOTICE '  ✅ Timeline ora mostra solo eventi con informazioni';
  RAISE NOTICE '';
  RAISE NOTICE 'Verifica:';
  RAISE NOTICE '  → Ricarica la timeline (Ctrl+Shift+R per hard refresh)';
  RAISE NOTICE '  → NON dovresti più vedere duplicati';
  RAISE NOTICE '  → Ogni evento ha dettagli o notes';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =====================================================
-- 5. QUERY DI VERIFICA (opzionale)
-- =====================================================

-- Query per verificare che non ci siano più eventi fantasma
SELECT COUNT(*) as eventi_fantasma_rimasti
FROM order_timeline
WHERE event_source = 'system'
  AND details_summary IS NULL
  AND notes IS NULL;
-- Deve ritornare 0

-- Query per vedere eventi system rimasti (dovrebbero avere dettagli)
SELECT
  id,
  action,
  event_source,
  details_summary,
  notes,
  created_at
FROM order_timeline
WHERE event_source = 'system'
ORDER BY created_at DESC
LIMIT 10;
-- Tutti dovrebbero avere almeno uno tra details_summary o notes
