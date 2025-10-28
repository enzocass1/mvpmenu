-- =====================================================
-- MIGRATION 20: Auto-populate staff_role_id in Timeline
-- Data: 2025-10-27
-- Descrizione: Popola automaticamente staff_role_id quando
--              viene creato un evento timeline, prendendo
--              il primary_role_id dello staff member
-- =====================================================
-- Funzionalità:
--   - Trigger che popola staff_role_id da restaurant_staff.primary_role_id
--   - Viene eseguito BEFORE INSERT su order_timeline
--   - Supporta sia staff_id che user_id (proprietario)
-- =====================================================

BEGIN;

-- =====================================================
-- 1. FUNZIONE TRIGGER: Popola staff_role_id
-- =====================================================

CREATE OR REPLACE FUNCTION populate_timeline_staff_role()
RETURNS TRIGGER AS $$
DECLARE
  v_role_id UUID;
BEGIN
  -- Solo se staff_role_id non è già impostato
  IF NEW.staff_role_id IS NULL THEN

    -- Caso 1: Staff member (restaurant_staff)
    IF NEW.staff_id IS NOT NULL THEN
      -- Ottieni primary_role_id dello staff
      SELECT primary_role_id
      INTO v_role_id
      FROM restaurant_staff
      WHERE id = NEW.staff_id;

      IF v_role_id IS NOT NULL THEN
        NEW.staff_role_id := v_role_id;
        RAISE DEBUG 'Timeline: Popolato staff_role_id = % per staff_id = %', v_role_id, NEW.staff_id;
      END IF;

    -- Caso 2: Proprietario (user_id da auth.users)
    -- Il proprietario dovrebbe avere un ruolo "Proprietario" creato automaticamente
    -- Per ora lasciamo NULL se è il proprietario, verrà gestito in futuro
    ELSIF NEW.user_id IS NOT NULL THEN
      -- TODO futuro: Cercare ruolo "Proprietario" per questo ristorante
      -- Per ora lasciamo NULL
      RAISE DEBUG 'Timeline: user_id presente (proprietario), staff_role_id rimane NULL';
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION populate_timeline_staff_role() IS
  'Popola automaticamente staff_role_id nella timeline da restaurant_staff.primary_role_id';

-- =====================================================
-- 2. CREA TRIGGER
-- =====================================================

-- Drop trigger se esiste (per re-run migration)
DROP TRIGGER IF EXISTS trigger_populate_timeline_staff_role ON order_timeline;

CREATE TRIGGER trigger_populate_timeline_staff_role
BEFORE INSERT ON order_timeline
FOR EACH ROW
EXECUTE FUNCTION populate_timeline_staff_role();

COMMENT ON TRIGGER trigger_populate_timeline_staff_role ON order_timeline IS
  'Auto-popola staff_role_id da primary_role_id dello staff member';

-- =====================================================
-- 3. BACKFILL: Popola staff_role_id per eventi esistenti
-- =====================================================

-- Aggiorna eventi esistenti che hanno staff_id ma non hanno staff_role_id
UPDATE order_timeline ot
SET staff_role_id = rs.primary_role_id
FROM restaurant_staff rs
WHERE ot.staff_id = rs.id
  AND ot.staff_role_id IS NULL
  AND rs.primary_role_id IS NOT NULL;

-- Log risultati backfill
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Backfill completato: % eventi timeline aggiornati con staff_role_id', v_updated_count;
END $$;

-- =====================================================
-- 4. VERIFICA FINALE
-- =====================================================

DO $$
DECLARE
  v_total_timeline INTEGER;
  v_with_role INTEGER;
  v_with_staff INTEGER;
  v_coverage_pct NUMERIC;
BEGIN
  -- Count totali
  SELECT COUNT(*) INTO v_total_timeline FROM order_timeline;
  SELECT COUNT(*) INTO v_with_role FROM order_timeline WHERE staff_role_id IS NOT NULL;
  SELECT COUNT(*) INTO v_with_staff FROM order_timeline WHERE staff_id IS NOT NULL;

  -- Calcola copertura (solo eventi con staff_id)
  IF v_with_staff > 0 THEN
    v_coverage_pct := (v_with_role::NUMERIC / v_with_staff::NUMERIC) * 100;
  ELSE
    v_coverage_pct := 0;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATION 20 COMPLETATA!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Trigger creato:';
  RAISE NOTICE '  → populate_timeline_staff_role()';
  RAISE NOTICE '  → BEFORE INSERT ON order_timeline';
  RAISE NOTICE '';
  RAISE NOTICE 'Eventi timeline:';
  RAISE NOTICE '  → Totali: %', v_total_timeline;
  RAISE NOTICE '  → Con staff_id: %', v_with_staff;
  RAISE NOTICE '  → Con staff_role_id: % (% percent copertura)', v_with_role, ROUND(v_coverage_pct, 1);
  RAISE NOTICE '';
  RAISE NOTICE 'Note:';
  RAISE NOTICE '  - Eventi futuri avranno staff_role_id popolato automaticamente';
  RAISE NOTICE '  - Verifica che staff members abbiano primary_role_id assegnato';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =====================================================
-- 5. QUERY DI VERIFICA (opzionale)
-- =====================================================

-- Verifica eventi con ruolo popolato
SELECT
  ot.id,
  ot.action,
  ot.staff_name,
  sr.name as role_name,
  ot.created_at
FROM order_timeline ot
LEFT JOIN staff_roles sr ON ot.staff_role_id = sr.id
WHERE ot.staff_id IS NOT NULL
ORDER BY ot.created_at DESC
LIMIT 10;

-- Verifica eventi SENZA ruolo (per debug)
SELECT
  ot.id,
  ot.action,
  ot.staff_name,
  ot.staff_id,
  rs.primary_role_id,
  ot.created_at
FROM order_timeline ot
LEFT JOIN restaurant_staff rs ON ot.staff_id = rs.id
WHERE ot.staff_id IS NOT NULL
  AND ot.staff_role_id IS NULL
ORDER BY ot.created_at DESC
LIMIT 10;
