-- ============================================
-- VIEWS per Product Variants (Workaround PostgREST)
-- ============================================
-- Creare queste views per evitare problemi 406 con PostgREST

CREATE OR REPLACE VIEW v_product_variant_options AS
SELECT * FROM product_variant_options;

CREATE OR REPLACE VIEW v_product_variant_option_values AS
SELECT * FROM product_variant_option_values;

CREATE OR REPLACE VIEW v_product_variants AS
SELECT * FROM product_variants;

-- Grant permissions
GRANT SELECT ON v_product_variant_options TO authenticated, anon;
GRANT SELECT ON v_product_variant_option_values TO authenticated, anon;
GRANT SELECT ON v_product_variants TO authenticated, anon;

-- Forza reload PostgREST
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

SELECT '✅ Views per varianti create con successo' as status;
