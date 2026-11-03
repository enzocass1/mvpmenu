-- Costi d'acquisto privati (fase 2 di 2): dopo il deploy dell'app che usa product_costs / variant_costs /
-- order_item_costs, si eliminano le vecchie colonne leggibili da chiunque.
BEGIN;
ALTER TABLE products DROP COLUMN IF EXISTS cost;
ALTER TABLE product_variants DROP COLUMN IF EXISTS cost_per_item;
ALTER TABLE order_items DROP COLUMN IF EXISTS product_cost;
COMMIT;
