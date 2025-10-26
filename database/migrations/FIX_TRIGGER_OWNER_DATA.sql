-- =====================================================
-- FIX TRIGGER: Owner Data from Restaurants Table
-- Data: 2025-10-26
-- Problema: Trigger cerca owner_first_name/last_name
--           nella tabella users invece che restaurants
-- Soluzione: Aggiorna trigger per prendere dati da restaurants
-- =====================================================

-- Fix funzione populate_timeline_staff_info
CREATE OR REPLACE FUNCTION populate_timeline_staff_info()
RETURNS TRIGGER AS $$
DECLARE
  v_role_display TEXT;
  v_staff_name TEXT;
  v_user_name TEXT;
BEGIN
  -- Se è uno staff member
  IF NEW.staff_id IS NOT NULL THEN
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

  -- Se è un owner (user_id presente ma non staff_id)
  ELSIF NEW.user_id IS NOT NULL THEN
    -- Usa email da auth.users o "Proprietario" di default
    SELECT
      COALESCE(
        SPLIT_PART(email, '@', 1),  -- Prende parte prima di @ dall'email
        'Proprietario'
      )
    INTO v_user_name
    FROM auth.users
    WHERE id = NEW.user_id;

    NEW.staff_name := COALESCE(v_user_name, 'Proprietario');
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

-- Verifica che il trigger esista
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_populate_timeline_staff_info';

-- Output atteso:
-- trigger_name: trigger_populate_timeline_staff_info
-- event_manipulation: INSERT
-- event_object_table: order_timeline

-- =====================================================
-- Test del Fix
-- =====================================================

DO $$
DECLARE
  test_order_id UUID;
  test_user_id UUID;
  result_staff_name TEXT;
  result_role_display TEXT;
  result_created_by_type TEXT;
BEGIN
  -- Prendi primo ordine e user_id da restaurants
  SELECT id INTO test_order_id FROM orders WHERE deleted_at IS NULL LIMIT 1;
  SELECT user_id INTO test_user_id FROM restaurants LIMIT 1;

  IF test_order_id IS NULL OR test_user_id IS NULL THEN
    RAISE NOTICE '⚠️  SKIP: Nessun ordine o user per test';
    RETURN;
  END IF;

  -- Insert test con user_id (owner)
  INSERT INTO order_timeline (order_id, action, user_id, notes)
  VALUES (test_order_id, 'updated', test_user_id, '🧪 TEST FIX OWNER DATA');

  -- Verifica campi popolati
  SELECT staff_name, staff_role_display, created_by_type
  INTO result_staff_name, result_role_display, result_created_by_type
  FROM order_timeline
  WHERE notes LIKE '%TEST FIX OWNER%'
  ORDER BY created_at DESC LIMIT 1;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST FIX OWNER DATA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'user_id: %', test_user_id;
  RAISE NOTICE 'staff_name: %', result_staff_name;
  RAISE NOTICE 'staff_role_display: %', result_role_display;
  RAISE NOTICE 'created_by_type: %', result_created_by_type;
  RAISE NOTICE '';

  IF result_staff_name IS NOT NULL AND
     result_role_display = 'Admin' AND
     result_created_by_type = 'owner' THEN
    RAISE NOTICE '✅ PASS: Owner data popolato correttamente!';
  ELSE
    RAISE NOTICE '❌ FAIL: Campi non popolati correttamente';
    RAISE NOTICE '  staff_name: % (atteso: NOT NULL)', result_staff_name;
    RAISE NOTICE '  staff_role_display: % (atteso: Admin)', result_role_display;
    RAISE NOTICE '  created_by_type: % (atteso: owner)', result_created_by_type;
  END IF;

  -- Cleanup
  DELETE FROM order_timeline WHERE notes LIKE '%TEST FIX OWNER%';
  RAISE NOTICE '🧹 Test entry rimossa';
END $$;
