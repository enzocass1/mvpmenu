-- ============================================
-- SOLUZIONE ALTERNATIVA - Senza riavvio progetto
-- ============================================
-- Crea VIEWS invece di usare direttamente le tabelle
-- PostgREST riconosce le views anche senza riavvio

-- STEP 1: Crea views per tutte le tabelle fiscali
CREATE OR REPLACE VIEW v_rt_configurations AS
SELECT * FROM rt_configurations;

CREATE OR REPLACE VIEW v_tax_rates AS
SELECT * FROM tax_rates;

CREATE OR REPLACE VIEW v_payment_methods AS
SELECT * FROM payment_methods;

CREATE OR REPLACE VIEW v_fiscal_receipts AS
SELECT * FROM fiscal_receipts;

CREATE OR REPLACE VIEW v_fiscal_receipt_items AS
SELECT * FROM fiscal_receipt_items;

CREATE OR REPLACE VIEW v_fiscal_receipt_payments AS
SELECT * FROM fiscal_receipt_payments;

CREATE OR REPLACE VIEW v_fiscal_closures AS
SELECT * FROM fiscal_closures;

CREATE OR REPLACE VIEW v_rt_communication_logs AS
SELECT * FROM rt_communication_logs;

CREATE OR REPLACE VIEW v_rt_models_catalog AS
SELECT * FROM rt_models_catalog;

-- STEP 2: Grant permissions alle views
GRANT SELECT ON v_rt_configurations TO authenticated, anon;
GRANT SELECT ON v_tax_rates TO authenticated, anon;
GRANT SELECT ON v_payment_methods TO authenticated, anon;
GRANT SELECT ON v_fiscal_receipts TO authenticated, anon;
GRANT SELECT ON v_fiscal_receipt_items TO authenticated, anon;
GRANT SELECT ON v_fiscal_receipt_payments TO authenticated, anon;
GRANT SELECT ON v_fiscal_closures TO authenticated, anon;
GRANT SELECT ON v_rt_communication_logs TO authenticated, anon;
GRANT SELECT ON v_rt_models_catalog TO authenticated, anon;

-- STEP 3: Crea functions per INSERT/UPDATE (necessarie per views)
CREATE OR REPLACE FUNCTION upsert_rt_config(
  p_restaurant_id UUID,
  p_config JSONB
)
RETURNS rt_configurations AS $$
DECLARE
  result rt_configurations;
BEGIN
  INSERT INTO rt_configurations (
    restaurant_id,
    business_name,
    vat_number,
    tax_code,
    address,
    city,
    postal_code,
    province,
    rt_serial_number,
    rt_model,
    rt_manufacturer,
    rt_connection_type,
    rt_ip_address,
    rt_port,
    rt_com_port,
    middleware_url,
    middleware_api_key,
    lottery_enabled,
    auto_print_receipt,
    table_service_markup_percent
  )
  VALUES (
    p_restaurant_id,
    (p_config->>'business_name')::TEXT,
    (p_config->>'vat_number')::TEXT,
    (p_config->>'tax_code')::TEXT,
    (p_config->>'address')::TEXT,
    (p_config->>'city')::TEXT,
    (p_config->>'postal_code')::TEXT,
    (p_config->>'province')::TEXT,
    (p_config->>'rt_serial_number')::TEXT,
    (p_config->>'rt_model')::TEXT,
    (p_config->>'rt_manufacturer')::TEXT,
    (p_config->>'rt_connection_type')::TEXT,
    (p_config->>'rt_ip_address')::TEXT,
    COALESCE((p_config->>'rt_port')::INTEGER, 9100),
    (p_config->>'rt_com_port')::TEXT,
    (p_config->>'middleware_url')::TEXT,
    (p_config->>'middleware_api_key')::TEXT,
    COALESCE((p_config->>'lottery_enabled')::BOOLEAN, true),
    COALESCE((p_config->>'auto_print_receipt')::BOOLEAN, true),
    COALESCE((p_config->>'table_service_markup_percent')::DECIMAL, 0)
  )
  ON CONFLICT (restaurant_id)
  DO UPDATE SET
    business_name = EXCLUDED.business_name,
    vat_number = EXCLUDED.vat_number,
    tax_code = EXCLUDED.tax_code,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    postal_code = EXCLUDED.postal_code,
    province = EXCLUDED.province,
    rt_serial_number = EXCLUDED.rt_serial_number,
    rt_model = EXCLUDED.rt_model,
    rt_manufacturer = EXCLUDED.rt_manufacturer,
    rt_connection_type = EXCLUDED.rt_connection_type,
    rt_ip_address = EXCLUDED.rt_ip_address,
    rt_port = EXCLUDED.rt_port,
    rt_com_port = EXCLUDED.rt_com_port,
    middleware_url = EXCLUDED.middleware_url,
    middleware_api_key = EXCLUDED.middleware_api_key,
    lottery_enabled = EXCLUDED.lottery_enabled,
    auto_print_receipt = EXCLUDED.auto_print_receipt,
    table_service_markup_percent = EXCLUDED.table_service_markup_percent,
    updated_at = NOW()
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION upsert_rt_config TO authenticated;

-- Test che funzioni
SELECT 'Views create con successo' as status;
SELECT COUNT(*) as modelli_disponibili FROM v_rt_models_catalog;
