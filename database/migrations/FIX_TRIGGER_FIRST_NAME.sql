-- =====================================================
-- FIX: Trigger first_name/last_name → name
-- Data: 2025-10-26
-- Descrizione: Fix trigger che usano first_name/last_name
--              per usare solo 'name' (schema corretto)
-- =====================================================

-- IMPORTANTE: Eseguire se ricevi errore:
-- "ERROR: 42703: column s.first_name does not exist"

-- =====================================================
-- FIX TRIGGER populate_timeline_staff_info
-- =====================================================

CREATE OR REPLACE FUNCTION populate_timeline_staff_info()
RETURNS TRIGGER AS $$
DECLARE
  v_role_display TEXT;
  v_staff_name TEXT;
  v_user_name TEXT;
BEGIN
  -- Se è uno staff member
  IF NEW.staff_id IS NOT NULL THEN
    -- Recupera display_name del ruolo e nome staff
    SELECT
      r.display_name,
      s.name
    INTO v_role_display, v_staff_name
    FROM restaurant_staff s
    LEFT JOIN roles r ON s.role_id = r.id
    WHERE s.id = NEW.staff_id;

    NEW.staff_role_display := v_role_display;
    NEW.staff_name := COALESCE(NEW.staff_name, v_staff_name);
    NEW.created_by_type := 'staff';

  -- Se è il proprietario (user_id)
  ELSIF NEW.user_id IS NOT NULL THEN
    -- Recupera nome proprietario da restaurants
    SELECT
      COALESCE(
        NULLIF(TRIM(owner_first_name || ' ' || owner_last_name), ''),
        'Proprietario'
      )
    INTO v_user_name
    FROM restaurants
    WHERE user_id = NEW.user_id;

    NEW.staff_name := v_user_name;
    NEW.staff_role_display := 'Admin';
    NEW.created_by_type := 'owner';

  -- Se non c'è né staff né user (cliente o sistema)
  ELSE
    IF NEW.created_by_type IS NULL THEN
      NEW.created_by_type := 'system';
    END IF;

    IF NEW.created_by_type = 'customer' THEN
      NEW.staff_name := COALESCE(NEW.staff_name, 'Cliente Incognito');
      NEW.staff_role_display := 'Cliente';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FIX TRIGGER populate_table_change_staff_info
-- =====================================================

CREATE OR REPLACE FUNCTION populate_table_change_staff_info()
RETURNS TRIGGER AS $$
DECLARE
  v_role_display TEXT;
  v_staff_name TEXT;
  v_user_name TEXT;
BEGIN
  -- Se è uno staff member
  IF NEW.changed_by_user_id IS NOT NULL AND NEW.changed_by_type IS NULL THEN
    -- Check se è staff
    SELECT
      r.display_name,
      s.name
    INTO v_role_display, v_staff_name
    FROM restaurant_staff s
    LEFT JOIN roles r ON s.role_id = r.id
    WHERE s.id::text = NEW.changed_by_user_id::text;

    IF FOUND THEN
      NEW.changed_by_role_display := v_role_display;
      NEW.changed_by_name := COALESCE(NEW.changed_by_name, v_staff_name);
      NEW.changed_by_type := 'staff';
    ELSE
      -- È il proprietario
      SELECT
        COALESCE(
          NULLIF(TRIM(owner_first_name || ' ' || owner_last_name), ''),
          'Proprietario'
        )
      INTO v_user_name
      FROM restaurants
      WHERE user_id::text = NEW.changed_by_user_id::text;

      NEW.changed_by_name := v_user_name;
      NEW.changed_by_role_display := 'Admin';
      NEW.changed_by_type := 'owner';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICA FIX
-- =====================================================

-- Verifica che trigger siano stati aggiornati
SELECT
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname IN ('populate_timeline_staff_info', 'populate_table_change_staff_info');

-- Output atteso: Definizione funzioni aggiornate (senza first_name/last_name)

-- =====================================================
-- FINE FIX
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FIX TRIGGER COMPLETATO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Trigger aggiornati:';
  RAISE NOTICE '- populate_timeline_staff_info()';
  RAISE NOTICE '- populate_table_change_staff_info()';
  RAISE NOTICE '';
  RAISE NOTICE 'Ora puoi eseguire i test senza errori!';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
