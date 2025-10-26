-- ============================================
-- FIX DEFINITIVO - Rimuovi TUTTE le RLS Policies
-- ============================================
-- Il problema: le tabelle hanno policies RLS ma RLS è disabilitato
-- Supabase blocca l'accesso per questa configurazione inconsistente
-- SOLUZIONE: Rimuovere TUTTE le policies

-- STEP 1: Rimuovi policies da rt_configurations
DROP POLICY IF EXISTS "Users can view own restaurant RT config" ON rt_configurations;
DROP POLICY IF EXISTS "Users can insert own restaurant RT config" ON rt_configurations;
DROP POLICY IF EXISTS "Users can update own restaurant RT config" ON rt_configurations;
DROP POLICY IF EXISTS "Users can delete own restaurant RT config" ON rt_configurations;

-- STEP 2: Rimuovi policies da tax_rates
DROP POLICY IF EXISTS "Users can manage own restaurant tax rates" ON tax_rates;

-- STEP 3: Rimuovi policies da payment_methods
DROP POLICY IF EXISTS "Users can manage own restaurant payment methods" ON payment_methods;

-- STEP 4: Rimuovi policies da fiscal_receipts
DROP POLICY IF EXISTS "Users can manage own restaurant fiscal receipts" ON fiscal_receipts;

-- STEP 5: Rimuovi policies da fiscal_receipt_items
DROP POLICY IF EXISTS "Users can manage own fiscal receipt items" ON fiscal_receipt_items;

-- STEP 6: Rimuovi policies da fiscal_receipt_payments
DROP POLICY IF EXISTS "Users can manage own fiscal receipt payments" ON fiscal_receipt_payments;

-- STEP 7: Rimuovi policies da fiscal_closures
DROP POLICY IF EXISTS "Users can manage own restaurant fiscal closures" ON fiscal_closures;

-- STEP 8: Rimuovi policies da rt_communication_logs
DROP POLICY IF EXISTS "Users can view own restaurant RT logs" ON rt_communication_logs;

-- STEP 9: Rimuovi policies da rt_models_catalog
DROP POLICY IF EXISTS "Authenticated users can view RT models catalog" ON rt_models_catalog;

-- STEP 10: Conferma che RLS è DISABILITATO (dovrebbe essere già così)
ALTER TABLE rt_configurations DISABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods DISABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_receipt_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_receipt_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_closures DISABLE ROW LEVEL SECURITY;
ALTER TABLE rt_communication_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE rt_models_catalog DISABLE ROW LEVEL SECURITY;

-- STEP 11: Assicurati che i GRANT siano presenti
GRANT ALL ON TABLE rt_configurations TO authenticated;
GRANT SELECT ON TABLE rt_configurations TO anon;

GRANT ALL ON TABLE tax_rates TO authenticated;
GRANT SELECT ON TABLE tax_rates TO anon;

GRANT ALL ON TABLE payment_methods TO authenticated;
GRANT SELECT ON TABLE payment_methods TO anon;

GRANT ALL ON TABLE fiscal_receipts TO authenticated;
GRANT SELECT ON TABLE fiscal_receipts TO anon;

GRANT ALL ON TABLE fiscal_receipt_items TO authenticated;
GRANT SELECT ON TABLE fiscal_receipt_items TO anon;

GRANT ALL ON TABLE fiscal_receipt_payments TO authenticated;
GRANT SELECT ON TABLE fiscal_receipt_payments TO anon;

GRANT ALL ON TABLE fiscal_closures TO authenticated;
GRANT SELECT ON TABLE fiscal_closures TO anon;

GRANT ALL ON TABLE rt_communication_logs TO authenticated;
GRANT SELECT ON TABLE rt_communication_logs TO anon;

GRANT ALL ON TABLE rt_models_catalog TO authenticated;
GRANT SELECT ON TABLE rt_models_catalog TO anon;

-- STEP 12: Forza reload schema PostgREST
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- STEP 13: Verifica finale - non dovrebbero esserci policy
SELECT
    'VERIFICA FINALE: Policy Rimaste' as test,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('rt_configurations', 'tax_rates', 'payment_methods', 'fiscal_receipts',
                  'fiscal_receipt_items', 'fiscal_receipt_payments', 'fiscal_closures',
                  'rt_communication_logs', 'rt_models_catalog');
-- ATTESO: 0 (zero policies)

-- STEP 14: Test query diretta
SELECT 'TEST QUERY' as test;
SELECT id, manufacturer, model_name FROM rt_models_catalog LIMIT 3;

SELECT '✅ FIX COMPLETATO - Tutte le policies rimosse' as status;
