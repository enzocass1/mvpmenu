-- ============================================
-- TEST DIAGNOSTICO COMPLETO
-- ============================================
-- Esegui questo su Supabase SQL Editor per capire esattamente cosa non va

-- TEST 1: Le tabelle esistono?
SELECT
    '1. ESISTENZA TABELLE' as test,
    COUNT(*) as tabelle_fiscali_trovate
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('rt_configurations', 'tax_rates', 'payment_methods', 'fiscal_receipts',
                   'fiscal_receipt_items', 'fiscal_receipt_payments', 'fiscal_closures',
                   'rt_communication_logs', 'rt_models_catalog');
-- ATTESO: 9

-- TEST 2: Che dati ci sono dentro?
SELECT '2. DATI MODELLI RT' as test, COUNT(*) as modelli_rt FROM rt_models_catalog;
-- ATTESO: 11

SELECT '2. DATI RT CONFIG' as test, COUNT(*) as configurazioni FROM rt_configurations;
-- ATTESO: 0 (perché non hai ancora salvato nulla)

-- TEST 3: RLS è disabilitato?
SELECT
    '3. RLS STATUS' as test,
    tablename,
    rowsecurity as rls_attivo
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('rt_configurations', 'tax_rates', 'payment_methods', 'rt_models_catalog')
ORDER BY tablename;
-- ATTESO: rls_attivo = false per tutte

-- TEST 4: I permessi ci sono?
SELECT
    '4. PERMESSI' as test,
    grantee as ruolo,
    table_name as tabella,
    privilege_type as permesso
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'rt_configurations'
AND grantee IN ('authenticated', 'anon')
ORDER BY grantee, privilege_type;
-- ATTESO: almeno SELECT per anon e authenticated

-- TEST 5: Ci sono policy attive? (non dovrebbero esserci)
SELECT
    '5. POLICY ATTIVE' as test,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('rt_configurations', 'tax_rates', 'payment_methods', 'rt_models_catalog');
-- ATTESO: 0 (perché abbiamo disabilitato RLS)

-- TEST 6: La struttura della tabella è corretta?
SELECT
    '6. STRUTTURA rt_configurations' as test,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'rt_configurations'
ORDER BY ordinal_position;
-- ATTESO: ~30 colonne

-- TEST 7: Query diretta funziona?
SELECT '7. QUERY DIRETTA' as test;
SELECT id, manufacturer, model_name, is_active
FROM rt_models_catalog
WHERE is_active = true
LIMIT 5;
-- ATTESO: 5 righe con modelli Epson, Custom, RCH, ecc

-- TEST 8: Schema search path
SELECT '8. SEARCH PATH' as test, current_schemas(true) as schema_path;
-- ATTESO: {pg_catalog, public, ...}

-- TEST 9: Verifica owner delle tabelle
SELECT
    '9. OWNER TABELLE' as test,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('rt_configurations', 'rt_models_catalog')
ORDER BY tablename;
-- ATTESO: owner = postgres

-- TEST 10: C'è qualche trigger che potrebbe interferire?
SELECT
    '10. TRIGGERS' as test,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN ('rt_configurations', 'rt_models_catalog');
-- ATTESO: Solo updated_at_trigger

-- RIEPILOGO FINALE
SELECT '========== RIEPILOGO ==========' as risultato;
SELECT
    'Se tutti i test sopra mostrano valori attesi,' as diagnosi,
    'il problema è sicuramente la cache PostgREST.' as causa,
    'SOLUZIONE: Riavvia il progetto Supabase.' as fix;
