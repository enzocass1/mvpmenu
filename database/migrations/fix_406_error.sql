-- ============================================
-- FIX 406 NOT ACCEPTABLE ERROR
-- ============================================
-- This script diagnoses and fixes the 406 error when accessing fiscal tables
-- Execute this in Supabase SQL Editor

-- Step 1: Verify tables exist and have data
SELECT 'Tables Check' as step;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('rt_configurations', 'tax_rates', 'payment_methods', 'fiscal_receipts',
                   'fiscal_receipt_items', 'fiscal_receipt_payments', 'fiscal_closures',
                   'rt_communication_logs', 'rt_models_catalog');

-- Step 2: Check if RLS is properly disabled
SELECT 'RLS Status' as step;
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('rt_configurations', 'tax_rates', 'payment_methods', 'fiscal_receipts',
                  'fiscal_receipt_items', 'fiscal_receipt_payments', 'fiscal_closures',
                  'rt_communication_logs', 'rt_models_catalog');

-- Step 3: Grant explicit permissions to authenticated and anon roles
GRANT ALL ON TABLE rt_configurations TO authenticated;
GRANT ALL ON TABLE rt_configurations TO anon;
GRANT SELECT ON TABLE rt_configurations TO anon;

GRANT ALL ON TABLE tax_rates TO authenticated;
GRANT ALL ON TABLE tax_rates TO anon;
GRANT SELECT ON TABLE tax_rates TO anon;

GRANT ALL ON TABLE payment_methods TO authenticated;
GRANT ALL ON TABLE payment_methods TO anon;
GRANT SELECT ON TABLE payment_methods TO anon;

GRANT ALL ON TABLE fiscal_receipts TO authenticated;
GRANT ALL ON TABLE fiscal_receipts TO anon;
GRANT SELECT ON TABLE fiscal_receipts TO anon;

GRANT ALL ON TABLE fiscal_receipt_items TO authenticated;
GRANT ALL ON TABLE fiscal_receipt_items TO anon;
GRANT SELECT ON TABLE fiscal_receipt_items TO anon;

GRANT ALL ON TABLE fiscal_receipt_payments TO authenticated;
GRANT ALL ON TABLE fiscal_receipt_payments TO anon;
GRANT SELECT ON TABLE fiscal_receipt_payments TO anon;

GRANT ALL ON TABLE fiscal_closures TO authenticated;
GRANT ALL ON TABLE fiscal_closures TO anon;
GRANT SELECT ON TABLE fiscal_closures TO anon;

GRANT ALL ON TABLE rt_communication_logs TO authenticated;
GRANT ALL ON TABLE rt_communication_logs TO anon;
GRANT SELECT ON TABLE rt_communication_logs TO anon;

GRANT ALL ON TABLE rt_models_catalog TO authenticated;
GRANT ALL ON TABLE rt_models_catalog TO anon;
GRANT SELECT ON TABLE rt_models_catalog TO anon;

-- Step 4: Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Step 5: Test query that should work
SELECT 'Test Query' as step;
SELECT COUNT(*) as rt_models_count FROM rt_models_catalog;
SELECT COUNT(*) as rt_configs_count FROM rt_configurations;

-- Step 6: Check for any blocking policies
SELECT 'Policy Check' as step;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('rt_configurations', 'tax_rates', 'payment_methods', 'fiscal_receipts',
                  'fiscal_receipt_items', 'fiscal_receipt_payments', 'fiscal_closures',
                  'rt_communication_logs', 'rt_models_catalog');

-- Step 7: Verify columns are accessible
SELECT 'Column Check' as step;
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'rt_configurations'
ORDER BY ordinal_position;

-- Step 8: Test a simple select
SELECT 'Direct Select Test' as step;
SELECT * FROM rt_configurations LIMIT 1;
SELECT * FROM rt_models_catalog LIMIT 3;

SELECT 'Fix Applied' as status;
