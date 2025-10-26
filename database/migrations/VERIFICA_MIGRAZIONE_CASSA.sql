-- ===================================================================
-- QUERY DI VERIFICA MIGRAZIONE SISTEMA CASSA
-- ===================================================================
-- Eseguire queste query su Supabase SQL Editor per validare la migrazione
-- ===================================================================

-- ============================================
-- 1. VERIFICA COLONNE TABELLA ORDERS
-- ============================================
-- Dovrebbero apparire 12 nuove colonne

SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN (
    'order_type', 'order_number', 'table_id', 'room_id', 'opened_at', 'closed_at',
    'deleted_at', 'created_by_staff_id', 'confirmed_by_staff_id',
    'modified_by_staff_id', 'priority_order_amount', 'metadata'
  )
ORDER BY column_name;

-- RISULTATO ATTESO: 12 righe
-- order_type: character varying
-- order_number: integer
-- table_id: uuid
-- room_id: uuid
-- opened_at: timestamp with time zone
-- closed_at: timestamp with time zone
-- deleted_at: timestamp with time zone
-- created_by_staff_id: uuid
-- confirmed_by_staff_id: uuid
-- modified_by_staff_id: uuid
-- priority_order_amount: numeric
-- metadata: jsonb


-- ============================================
-- 2. VERIFICA COLONNE TABELLA ORDER_ITEMS
-- ============================================
-- Dovrebbero apparire 4 nuove colonne

SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'order_items'
  AND column_name IN ('batch_number', 'prepared', 'prepared_at', 'added_by_staff_id')
ORDER BY column_name;

-- RISULTATO ATTESO: 4 righe
-- batch_number: integer (default 1)
-- prepared: boolean (default false)
-- prepared_at: timestamp with time zone
-- added_by_staff_id: uuid


-- ============================================
-- 3. VERIFICA INDICI
-- ============================================
-- Dovrebbero apparire ~12 nuovi indici

SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('orders', 'order_items')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- RISULTATI ATTESI (tra gli altri):
-- idx_orders_type
-- idx_orders_table_id
-- idx_orders_room_id
-- idx_orders_not_deleted
-- idx_orders_pending
-- idx_orders_active
-- idx_orders_number
-- idx_order_items_batch
-- idx_order_items_prepared
-- idx_orders_metadata_gin


-- ============================================
-- 4. VERIFICA TRIGGERS
-- ============================================
-- Dovrebbero apparire 6 trigger

SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('orders', 'order_items')
  AND trigger_name LIKE 'trigger_%'
ORDER BY event_object_table, trigger_name;

-- RISULTATI ATTESI:
-- trigger_set_order_number (orders, BEFORE INSERT)
-- trigger_set_opened_at (orders, BEFORE UPDATE)
-- trigger_set_closed_at (orders, BEFORE UPDATE)
-- trigger_auto_mark_prepared (orders, AFTER UPDATE)
-- trigger_recalculate_total_on_priority (orders, BEFORE UPDATE)
-- trigger_recalculate_total_on_items (order_items, AFTER INSERT/UPDATE/DELETE)


-- ============================================
-- 5. VERIFICA VIEWS
-- ============================================
-- Dovrebbero apparire 2 views

SELECT
  table_name,
  view_definition
FROM information_schema.views
WHERE table_name LIKE 'v_cassa%' OR table_name LIKE 'v_active%'
ORDER BY table_name;

-- RISULTATI ATTESI:
-- v_cassa_statistics
-- v_active_orders


-- ============================================
-- 6. VERIFICA FUNZIONI
-- ============================================
-- Dovrebbero apparire 10 funzioni

SELECT
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name IN (
  'set_order_number',
  'set_opened_at',
  'set_closed_at',
  'auto_mark_prepared_on_confirm',
  'get_next_batch_number',
  'soft_delete_order',
  'restore_order',
  'calculate_order_total',
  'recalculate_order_total_on_items_change',
  'recalculate_order_total_on_priority_change'
)
ORDER BY routine_name;

-- RISULTATI ATTESI: 10 funzioni
-- set_order_number: FUNCTION
-- set_opened_at: FUNCTION
-- set_closed_at: FUNCTION
-- auto_mark_prepared_on_confirm: FUNCTION
-- get_next_batch_number: FUNCTION
-- soft_delete_order: FUNCTION
-- restore_order: FUNCTION
-- calculate_order_total: FUNCTION
-- recalculate_order_total_on_items_change: FUNCTION
-- recalculate_order_total_on_priority_change: FUNCTION


-- ============================================
-- 7. VERIFICA RLS POLICIES
-- ============================================
-- Dovrebbero apparire le nuove policy

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;

-- RISULTATI ATTESI:
-- Users can view non-deleted orders for their restaurant (SELECT)
-- Users can create orders for their restaurant (INSERT)
-- Users can update non-deleted orders for their restaurant (UPDATE)
-- Users can soft-delete orders for their restaurant (UPDATE)


-- ============================================
-- 8. TEST FUNZIONALITÀ
-- ============================================

-- Test 1: Verifica che get_next_batch_number funzioni
-- (restituirà 1 se non ci sono items per quell'order_id)
SELECT get_next_batch_number('00000000-0000-0000-0000-000000000000'::uuid) as next_batch;
-- ATTESO: 1

-- Test 2: Verifica view v_cassa_statistics
SELECT * FROM v_cassa_statistics LIMIT 5;
-- ATTESO: Statistiche aggregate (può essere vuoto se non ci sono ordini)

-- Test 3: Verifica view v_active_orders
SELECT * FROM v_active_orders LIMIT 5;
-- ATTESO: Ordini attivi con dettagli (può essere vuoto se non ci sono ordini attivi)


-- ============================================
-- 9. RIEPILOGO FINALE
-- ============================================

-- Conta colonne aggiunte in orders
SELECT COUNT(*) as colonne_orders
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN (
    'order_type', 'order_number', 'table_id', 'room_id', 'opened_at', 'closed_at',
    'deleted_at', 'created_by_staff_id', 'confirmed_by_staff_id',
    'modified_by_staff_id', 'priority_order_amount', 'metadata'
  );
-- ATTESO: 12

-- Conta colonne aggiunte in order_items
SELECT COUNT(*) as colonne_order_items
FROM information_schema.columns
WHERE table_name = 'order_items'
  AND column_name IN ('batch_number', 'prepared', 'prepared_at', 'added_by_staff_id');
-- ATTESO: 4

-- Conta trigger creati
SELECT COUNT(*) as trigger_count
FROM information_schema.triggers
WHERE event_object_table IN ('orders', 'order_items')
  AND trigger_name LIKE 'trigger_%';
-- ATTESO: 6 o più

-- Conta funzioni create
SELECT COUNT(*) as funzioni_count
FROM information_schema.routines
WHERE routine_name IN (
  'set_order_number',
  'set_opened_at',
  'set_closed_at',
  'auto_mark_prepared_on_confirm',
  'get_next_batch_number',
  'soft_delete_order',
  'restore_order',
  'calculate_order_total',
  'recalculate_order_total_on_items_change',
  'recalculate_order_total_on_priority_change'
);
-- ATTESO: 10

-- Conta views create
SELECT COUNT(*) as views_count
FROM information_schema.views
WHERE table_name LIKE 'v_cassa%' OR table_name LIKE 'v_active%';
-- ATTESO: 2


-- ===================================================================
-- FINE VERIFICA
-- ===================================================================

SELECT
  '✅ Se tutti i conteggi corrispondono, la migrazione è completata correttamente!' as messaggio,
  'Controlla che: 12 colonne orders, 4 colonne order_items, 6+ triggers, 10 funzioni, 2 views' as checklist;
