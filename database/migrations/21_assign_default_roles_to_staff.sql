-- =====================================================
-- MIGRATION 21: Assign Default Roles to Existing Staff
-- Data: 2025-10-27
-- Descrizione: Assegna un ruolo di default agli staff
--              members che non hanno primary_role_id
-- =====================================================
-- Funzionalità:
--   - Trova staff senza primary_role_id
--   - Assegna ruolo "Cameriere" come default
--   - Crea assegnazione in staff_role_assignments
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ASSEGNA RUOLO PRIMARIO AGLI STAFF SENZA RUOLO
-- =====================================================

-- Per ogni staff member senza primary_role_id,
-- assegna il ruolo "Cameriere" del loro ristorante

UPDATE restaurant_staff rs
SET primary_role_id = (
  SELECT sr.id
  FROM staff_roles sr
  WHERE sr.restaurant_id = rs.restaurant_id
    AND sr.name = 'Cameriere'
  LIMIT 1
)
WHERE rs.primary_role_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM staff_roles sr
    WHERE sr.restaurant_id = rs.restaurant_id
      AND sr.name = 'Cameriere'
  );

-- Log risultati
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Assegnato ruolo Cameriere a % staff members', v_updated_count;
END $$;

-- =====================================================
-- 2. CREA ASSEGNAZIONI IN STAFF_ROLE_ASSIGNMENTS
-- =====================================================

-- Per ogni staff con primary_role_id, assicurati che esista
-- anche l'assegnazione in staff_role_assignments

INSERT INTO staff_role_assignments (staff_id, role_id, assigned_at, assigned_by)
SELECT
  rs.id as staff_id,
  rs.primary_role_id as role_id,
  NOW() as assigned_at,
  NULL as assigned_by -- Assegnazione automatica migrazione
FROM restaurant_staff rs
WHERE rs.primary_role_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM staff_role_assignments sra
    WHERE sra.staff_id = rs.id
      AND sra.role_id = rs.primary_role_id
  )
ON CONFLICT (staff_id, role_id) DO NOTHING;

-- Log risultati
DO $$
DECLARE
  v_inserted_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  RAISE NOTICE '✅ Create % assegnazioni ruoli in staff_role_assignments', v_inserted_count;
END $$;

-- =====================================================
-- 3. VERIFICA FINALE
-- =====================================================

DO $$
DECLARE
  v_total_staff INTEGER;
  v_with_role INTEGER;
  v_without_role INTEGER;
  v_coverage_pct NUMERIC;
BEGIN
  -- Count totali
  SELECT COUNT(*) INTO v_total_staff
  FROM restaurant_staff;

  SELECT COUNT(*) INTO v_with_role
  FROM restaurant_staff
  WHERE primary_role_id IS NOT NULL;

  SELECT COUNT(*) INTO v_without_role
  FROM restaurant_staff
  WHERE primary_role_id IS NULL;

  -- Calcola copertura
  IF v_total_staff > 0 THEN
    v_coverage_pct := (v_with_role::NUMERIC / v_total_staff::NUMERIC) * 100;
  ELSE
    v_coverage_pct := 0;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATION 21 COMPLETATA!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Staff Members:';
  RAISE NOTICE '  → Totali: %', v_total_staff;
  RAISE NOTICE '  → Con ruolo: % (% percent)', v_with_role, ROUND(v_coverage_pct, 1);
  RAISE NOTICE '  → Senza ruolo: %', v_without_role;
  RAISE NOTICE '';

  IF v_without_role > 0 THEN
    RAISE WARNING 'Attenzione: % staff members ancora senza ruolo!', v_without_role;
    RAISE NOTICE 'Possibili cause:';
    RAISE NOTICE '  - Ristorante senza ruolo "Cameriere" creato';
    RAISE NOTICE '  - Esegui la migration 13 per creare ruoli predefiniti';
  END IF;

  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =====================================================
-- 4. QUERY DI VERIFICA (opzionale)
-- =====================================================

-- Verifica staff con ruoli
SELECT
  r.name as restaurant_name,
  rs.full_name as staff_name,
  sr.name as role_name,
  sr.color as role_color
FROM restaurant_staff rs
JOIN restaurants r ON rs.restaurant_id = r.id
LEFT JOIN staff_roles sr ON rs.primary_role_id = sr.id
ORDER BY r.name, rs.full_name;

-- Verifica staff ANCORA senza ruoli (se ce ne sono)
SELECT
  r.name as restaurant_name,
  rs.id as staff_id,
  rs.full_name as staff_name,
  rs.email
FROM restaurant_staff rs
JOIN restaurants r ON rs.restaurant_id = r.id
WHERE rs.primary_role_id IS NULL
ORDER BY r.name, rs.full_name;
