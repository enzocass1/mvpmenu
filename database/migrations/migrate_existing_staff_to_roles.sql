-- =====================================================
-- SCRIPT: Migra staff esistenti al nuovo sistema ruoli
-- Data: 2025-10-26
-- Descrizione: Assegna role_id agli staff esistenti
--              basandosi sul loro role_legacy
-- =====================================================

-- IMPORTANTE: Eseguire DOPO populate_default_roles_all_restaurants.sql

DO $$
DECLARE
  staff_record RECORD;
  role_record RECORD;
  total_staff INTEGER := 0;
  migrated_staff INTEGER := 0;
  skipped_staff INTEGER := 0;
BEGIN
  -- Conta staff totali
  SELECT COUNT(*) INTO total_staff
  FROM restaurant_staff
  WHERE role_id IS NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Inizio migrazione staff esistenti';
  RAISE NOTICE 'Staff da migrare: %', total_staff;
  RAISE NOTICE '========================================';

  -- Loop su tutti gli staff senza role_id
  FOR staff_record IN
    SELECT
      s.id,
      s.restaurant_id,
      s.name,
      s.role_legacy
    FROM restaurant_staff s
    WHERE s.role_id IS NULL
    ORDER BY s.created_at DESC
  LOOP
    RAISE NOTICE '';
    RAISE NOTICE 'Staff: % (legacy role: %)',
      staff_record.name,
      staff_record.role_legacy;

    -- Trova role_id corrispondente
    SELECT id INTO role_record
    FROM roles
    WHERE restaurant_id = staff_record.restaurant_id
      AND (
        (staff_record.role_legacy = 'manager' AND name = 'manager')
        OR (staff_record.role_legacy = 'waiter' AND name = 'waiter')
        OR (staff_record.role_legacy = 'cameriere' AND name = 'waiter')
      )
    LIMIT 1;

    -- Assegna role_id
    IF FOUND THEN
      UPDATE restaurant_staff
      SET role_id = role_record.id
      WHERE id = staff_record.id;

      migrated_staff := migrated_staff + 1;
      RAISE NOTICE '  ✅ Migrato a role_id: %', role_record.id;
    ELSE
      -- Se non trova mapping, assegna ruolo "waiter" di default
      SELECT id INTO role_record
      FROM roles
      WHERE restaurant_id = staff_record.restaurant_id
        AND name = 'waiter'
      LIMIT 1;

      IF FOUND THEN
        UPDATE restaurant_staff
        SET role_id = role_record.id
        WHERE id = staff_record.id;

        migrated_staff := migrated_staff + 1;
        RAISE NOTICE '  ⚠️  Assegnato ruolo default "Cameriere" (role_id: %)', role_record.id;
      ELSE
        skipped_staff := skipped_staff + 1;
        RAISE WARNING '  ❌ Nessun ruolo trovato per restaurant_id: %', staff_record.restaurant_id;
      END IF;
    END IF;

  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migrazione completata!';
  RAISE NOTICE 'Staff migrati: %', migrated_staff;
  RAISE NOTICE 'Staff saltati: %', skipped_staff;
  RAISE NOTICE '========================================';

  -- Verifica finale
  RAISE NOTICE '';
  RAISE NOTICE 'Verifica: Staff per ruolo';
  RAISE NOTICE '----------------------------------------';

  FOR staff_record IN
    SELECT
      ro.display_name as role_name,
      COUNT(s.id) as staff_count,
      STRING_AGG(s.name, ', ') as staff_list
    FROM restaurant_staff s
    JOIN roles ro ON s.role_id = ro.id
    GROUP BY ro.display_name, ro.sort_order
    ORDER BY ro.sort_order
  LOOP
    RAISE NOTICE '% → % persone: %',
      staff_record.role_name,
      staff_record.staff_count,
      staff_record.staff_list;
  END LOOP;

END $$;

-- Query di verifica finale (puoi eseguirla separatamente)
-- SELECT
--   s.name as staff_name,
--   r.display_name as ruolo,
--   s.role_legacy as vecchio_ruolo,
--   res.name as ristorante
-- FROM restaurant_staff s
-- LEFT JOIN roles r ON s.role_id = r.id
-- LEFT JOIN restaurants res ON s.restaurant_id = res.id
-- ORDER BY res.name, r.sort_order;
