-- =====================================================
-- TEST: Sistema Ruoli e Timeline
-- Data: 2025-10-26
-- Descrizione: Script completo per testare il sistema
--              ruoli, permessi e timeline
-- =====================================================

-- =====================================================
-- PARTE 1: VERIFICA SETUP INIZIALE
-- =====================================================

-- Test 1.1: Verifica ruoli creati per ogni ristorante
SELECT
  r.id as restaurant_id,
  r.name as restaurant_name,
  COUNT(ro.id) as num_ruoli,
  STRING_AGG(ro.display_name, ', ' ORDER BY ro.sort_order) as ruoli_presenti
FROM restaurants r
LEFT JOIN roles ro ON r.id = ro.restaurant_id
GROUP BY r.id, r.name
ORDER BY r.name;

-- Output atteso: Ogni ristorante deve avere 6 ruoli
-- ✅ PASS se num_ruoli = 6 per ogni ristorante
-- ❌ FAIL se num_ruoli != 6

-- Test 1.2: Verifica dettagli ruoli
SELECT
  r.name as ristorante,
  ro.display_name as ruolo,
  ro.is_system,
  ro.is_active,
  ro.permissions -> 'orders' ->> 'create' as can_create_orders,
  ro.permissions -> 'cassa' ->> 'access' as can_access_cassa,
  ro.permissions -> 'settings' ->> 'update' as can_update_settings
FROM restaurants r
JOIN roles ro ON r.id = ro.restaurant_id
ORDER BY r.name, ro.sort_order;

-- Output atteso:
-- Admin: can_create_orders=true, can_access_cassa=true, can_update_settings=true
-- Manager: can_create_orders=true, can_access_cassa=true, can_update_settings=false
-- Cameriere: can_create_orders=true, can_access_cassa=false, can_update_settings=false
-- ✅ PASS se permessi corrispondono

-- Test 1.3: Verifica staff migrati con role_id
SELECT
  s.name as staff_name,
  s.email,
  s.role_legacy as vecchio_ruolo,
  r.display_name as nuovo_ruolo,
  r.name as role_name,
  res.name as ristorante
FROM restaurant_staff s
LEFT JOIN roles r ON s.role_id = r.id
LEFT JOIN restaurants res ON s.restaurant_id = res.id
ORDER BY res.name, r.sort_order;

-- Output atteso: Ogni staff deve avere nuovo_ruolo (NOT NULL)
-- ✅ PASS se role_id presente per tutti
-- ❌ FAIL se qualche staff ha nuovo_ruolo = NULL

-- =====================================================
-- PARTE 2: TEST PERMISSION CHECKING FUNCTIONS
-- =====================================================

-- Test 2.1: Verifica funzione staff_has_permission
DO $$
DECLARE
  test_staff_id UUID;
  has_create_orders BOOLEAN;
  has_access_cassa BOOLEAN;
  has_update_settings BOOLEAN;
BEGIN
  -- Prendi primo staff con ruolo Manager
  SELECT s.id INTO test_staff_id
  FROM restaurant_staff s
  JOIN roles r ON s.role_id = r.id
  WHERE r.name = 'manager'
  LIMIT 1;

  IF test_staff_id IS NULL THEN
    RAISE NOTICE '❌ FAIL: Nessuno staff con ruolo Manager trovato';
    RETURN;
  END IF;

  -- Test permessi
  has_create_orders := staff_has_permission(test_staff_id, 'orders.create');
  has_access_cassa := staff_has_permission(test_staff_id, 'cassa.access');
  has_update_settings := staff_has_permission(test_staff_id, 'settings.update');

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Test Permission Checking - Manager';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Staff ID: %', test_staff_id;
  RAISE NOTICE 'orders.create: % (atteso: true)', has_create_orders;
  RAISE NOTICE 'cassa.access: % (atteso: true)', has_access_cassa;
  RAISE NOTICE 'settings.update: % (atteso: false)', has_update_settings;

  IF has_create_orders = true AND has_access_cassa = true AND has_update_settings = false THEN
    RAISE NOTICE '✅ PASS: Permessi Manager corretti';
  ELSE
    RAISE NOTICE '❌ FAIL: Permessi Manager non corretti';
  END IF;
END $$;

-- Test 2.2: Verifica funzione get_staff_permissions
SELECT
  s.name as staff_name,
  r.display_name as ruolo,
  get_staff_permissions(s.id) as permissions_full
FROM restaurant_staff s
JOIN roles r ON s.role_id = r.id
LIMIT 3;

-- Output atteso: JSONB completo con tutti i permessi
-- ✅ PASS se ritorna oggetto JSONB valido

-- =====================================================
-- PARTE 3: TEST TIMELINE TRACKING
-- =====================================================

-- Test 3.1: Verifica colonne timeline
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'order_timeline'
  AND column_name IN ('user_id', 'created_by_type', 'staff_role_display')
ORDER BY column_name;

-- Output atteso: 3 righe con le nuove colonne
-- ✅ PASS se tutte e 3 le colonne esistono

-- Test 3.2: Verifica timeline esistenti
SELECT
  o.order_number,
  ot.action,
  ot.created_by_type,
  ot.staff_name,
  ot.staff_role_display,
  ot.created_at
FROM order_timeline ot
JOIN orders o ON ot.order_id = o.id
WHERE o.deleted_at IS NULL
ORDER BY ot.created_at DESC
LIMIT 10;

-- Output atteso: Timeline con created_by_type e staff_role_display popolati
-- ⚠️  Se NULL: ordini creati prima della migrazione (normale)
-- ✅ PASS se ordini nuovi hanno campi popolati

-- Test 3.3: Simulazione inserimento timeline con trigger
DO $$
DECLARE
  test_order_id UUID;
  test_staff_id UUID;
  test_role_display TEXT;
BEGIN
  -- Prendi primo ordine e staff
  SELECT id INTO test_order_id FROM orders WHERE deleted_at IS NULL LIMIT 1;
  SELECT id INTO test_staff_id FROM restaurant_staff LIMIT 1;

  IF test_order_id IS NULL OR test_staff_id IS NULL THEN
    RAISE NOTICE '⚠️  SKIP: Nessun ordine o staff per test';
    RETURN;
  END IF;

  -- Inserisci entry timeline
  INSERT INTO order_timeline (
    order_id,
    action,
    staff_id,
    notes
  ) VALUES (
    test_order_id,
    'updated',
    test_staff_id,
    '🧪 TEST: Verifica trigger auto-population'
  );

  -- Verifica che trigger abbia popolato i campi
  SELECT staff_role_display INTO test_role_display
  FROM order_timeline
  WHERE order_id = test_order_id
    AND notes LIKE '%TEST:%'
  ORDER BY created_at DESC
  LIMIT 1;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Test Trigger Auto-Population';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Order ID: %', test_order_id;
  RAISE NOTICE 'Staff ID: %', test_staff_id;
  RAISE NOTICE 'staff_role_display popolato: %', test_role_display;

  IF test_role_display IS NOT NULL THEN
    RAISE NOTICE '✅ PASS: Trigger popola staff_role_display';
  ELSE
    RAISE NOTICE '❌ FAIL: Trigger NON popola staff_role_display';
  END IF;

  -- Cleanup test entry
  DELETE FROM order_timeline
  WHERE order_id = test_order_id
    AND notes LIKE '%TEST:%';

  RAISE NOTICE 'Test entry rimossa';
END $$;

-- =====================================================
-- PARTE 4: TEST ANALYTICS VIEWS
-- =====================================================

-- Test 4.1: Verifica v_role_performance_analytics
SELECT
  role_name,
  orders_created,
  orders_completed,
  total_revenue,
  members_count
FROM v_role_performance_analytics
ORDER BY total_revenue DESC NULLS LAST
LIMIT 10;

-- Output atteso: Aggregati per ruolo
-- ✅ PASS se ritorna dati (anche se 0)
-- ❌ FAIL se errore SQL

-- Test 4.2: Verifica v_staff_member_analytics
SELECT
  staff_name,
  staff_role_display,
  orders_created,
  total_revenue,
  unique_tables_served,
  avg_seconds_per_order
FROM v_staff_member_analytics
ORDER BY total_revenue DESC NULLS LAST
LIMIT 10;

-- Output atteso: KPI per singolo staff
-- ✅ PASS se ritorna dati
-- ❌ FAIL se errore SQL

-- Test 4.3: Verifica v_staff_daily_metrics
SELECT
  staff_name,
  date,
  daily_orders_created,
  daily_revenue,
  hours_worked
FROM v_staff_daily_metrics
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, daily_revenue DESC
LIMIT 20;

-- Output atteso: Metriche giornaliere ultimi 7 giorni
-- ✅ PASS se ritorna dati
-- ❌ FAIL se errore SQL

-- =====================================================
-- PARTE 5: TEST DISPLAY FORMAT
-- =====================================================

-- Test 5.1: Verifica formato display timeline
WITH timeline_samples AS (
  SELECT
    ot.action,
    ot.created_by_type,
    ot.staff_name,
    ot.staff_role_display,
    CASE
      WHEN ot.staff_role_display IS NOT NULL THEN ot.staff_role_display
      WHEN ot.staff_name IS NOT NULL THEN ot.staff_name
      WHEN ot.created_by_type = 'customer' THEN 'Cliente Incognito'
      ELSE 'Sistema'
    END as display_text
  FROM order_timeline ot
  WHERE ot.created_at > CURRENT_DATE - INTERVAL '7 days'
  LIMIT 20
)
SELECT
  action,
  created_by_type,
  display_text,
  COUNT(*) as count
FROM timeline_samples
GROUP BY action, created_by_type, display_text
ORDER BY count DESC;

-- Output atteso: Display text nel formato corretto
-- ✅ PASS se vedi "da Admin - Nome Cognome" per staff/owner
-- ✅ PASS se vedi "Cliente Incognito" per customer
-- ✅ PASS se vedi "Sistema" per system

-- =====================================================
-- PARTE 6: SUMMARY TEST RESULTS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 SUMMARY TEST SISTEMA RUOLI';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Esegui tutte le query sopra e verifica:';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Test 1.1: Ogni ristorante ha 6 ruoli';
  RAISE NOTICE '✅ Test 1.2: Permessi ruoli corretti';
  RAISE NOTICE '✅ Test 1.3: Staff migrati con role_id';
  RAISE NOTICE '✅ Test 2.1: staff_has_permission() funziona';
  RAISE NOTICE '✅ Test 2.2: get_staff_permissions() ritorna JSONB';
  RAISE NOTICE '✅ Test 3.1: Nuove colonne timeline esistono';
  RAISE NOTICE '✅ Test 3.2: Timeline ordini popolate';
  RAISE NOTICE '✅ Test 3.3: Trigger auto-population funziona';
  RAISE NOTICE '✅ Test 4.1-4.3: Analytics views funzionano';
  RAISE NOTICE '✅ Test 5.1: Display format corretto';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
