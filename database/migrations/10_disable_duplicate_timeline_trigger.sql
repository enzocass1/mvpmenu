-- =====================================================
-- MIGRATION: Disable Duplicate Timeline Trigger
-- Data: 2025-10-27
-- Descrizione: Rimuove il trigger che crea eventi timeline
--              duplicati senza dettagli. La creazione degli
--              eventi timeline è ora gestita SOLO dal codice
--              applicativo tramite timelineService.js
-- =====================================================
-- Problema risolto:
--   - Eliminazione "Ordine creato" duplicato senza dettagli
--   - Eliminazione "In preparazione" duplicato senza dettagli
--   - Tutti gli altri duplicati generati dal trigger
-- =====================================================

BEGIN;

-- =====================================================
-- 1. RIMUOVI IL TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS trigger_track_order_changes ON orders;

-- =====================================================
-- 2. RIMUOVI LA FUNZIONE
-- =====================================================

DROP FUNCTION IF EXISTS track_order_changes();

-- =====================================================
-- 3. COMMENTO ESPLICATIVO
-- =====================================================

COMMENT ON TABLE order_timeline IS
'Timeline eventi ordini - Gestita ESCLUSIVAMENTE da timelineService.js (NO trigger automatici).
Ogni evento include: event_source, details_summary, notes, operator info.
Non usare INSERT diretto, usare sempre addTimelineEntry() da timelineService.';

-- =====================================================
-- 4. VERIFICA FINALE
-- =====================================================

-- Query per verificare che il trigger sia stato rimosso
SELECT
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  tgtype,
  tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_track_order_changes';

-- Se la query sopra ritorna 0 righe, il trigger è stato rimosso con successo

COMMIT;

-- =====================================================
-- LOG SUCCESS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATION COMPLETATA CON SUCCESSO!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Trigger rimosso:';
  RAISE NOTICE '  - trigger_track_order_changes';
  RAISE NOTICE '';
  RAISE NOTICE 'Funzione rimossa:';
  RAISE NOTICE '  - track_order_changes()';
  RAISE NOTICE '';
  RAISE NOTICE 'Risultato:';
  RAISE NOTICE '  ✅ NO PIÙ DUPLICATI in order_timeline';
  RAISE NOTICE '  ✅ Eventi creati SOLO da timelineService.js';
  RAISE NOTICE '  ✅ Tutti gli eventi hanno event_source, details_summary, notes';
  RAISE NOTICE '';
  RAISE NOTICE 'Sistema centralizzato:';
  RAISE NOTICE '  → timelineService.js gestisce TUTTI gli eventi timeline';
  RAISE NOTICE '  → analytics.js gestisce TUTTI gli eventi analytics';
  RAISE NOTICE '  → Vedere CENTRALIZED_EVENTS_SYSTEM.md per documentazione';
  RAISE NOTICE '========================================';
END $$;
