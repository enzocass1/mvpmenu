-- Costi d'acquisto privati (fase 1 di 2).
-- products.cost, product_variants.cost_per_item e order_items.product_cost stavano in tabelle leggibili
-- da chiunque (menu pubblico, ordini): un estraneo poteva ricavare i margini del locale.
-- Ora i costi vivono in tabelle separate visibili solo al titolare (e al super admin).
-- La fase 2 (07_drop_public_cost_columns.sql) elimina le vecchie colonne dopo il deploy dell'app.

BEGIN;

CREATE TABLE IF NOT EXISTS product_costs (
  product_id uuid PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  cost numeric NOT NULL DEFAULT 0 CHECK (cost >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS variant_costs (
  variant_id uuid PRIMARY KEY REFERENCES product_variants(id) ON DELETE CASCADE,
  cost numeric NOT NULL DEFAULT 0 CHECK (cost >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- costo al momento della vendita (resta fisso anche se poi cambi il costo del prodotto)
CREATE TABLE IF NOT EXISTS order_item_costs (
  order_item_id uuid PRIMARY KEY REFERENCES order_items(id) ON DELETE CASCADE,
  product_cost numeric NOT NULL DEFAULT 0
);

ALTER TABLE product_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_costs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON product_costs, variant_costs, order_item_costs FROM anon;

DROP POLICY IF EXISTS product_costs_owner ON product_costs;
CREATE POLICY product_costs_owner ON product_costs FOR ALL TO authenticated
  USING (product_id IN (SELECT p.id FROM products p JOIN categories c ON c.id = p.category_id
                        JOIN restaurants r ON r.id = c.restaurant_id WHERE r.user_id = auth.uid()))
  WITH CHECK (product_id IN (SELECT p.id FROM products p JOIN categories c ON c.id = p.category_id
                             JOIN restaurants r ON r.id = c.restaurant_id WHERE r.user_id = auth.uid()));
DROP POLICY IF EXISTS variant_costs_owner ON variant_costs;
CREATE POLICY variant_costs_owner ON variant_costs FOR ALL TO authenticated
  USING (variant_id IN (SELECT v.id FROM product_variants v JOIN products p ON p.id = v.product_id
                        JOIN categories c ON c.id = p.category_id JOIN restaurants r ON r.id = c.restaurant_id WHERE r.user_id = auth.uid()))
  WITH CHECK (variant_id IN (SELECT v.id FROM product_variants v JOIN products p ON p.id = v.product_id
                             JOIN categories c ON c.id = p.category_id JOIN restaurants r ON r.id = c.restaurant_id WHERE r.user_id = auth.uid()));
-- i costi delle vendite si scrivono solo in automatico: il titolare li legge
DROP POLICY IF EXISTS order_item_costs_owner ON order_item_costs;
CREATE POLICY order_item_costs_owner ON order_item_costs FOR SELECT TO authenticated
  USING (order_item_id IN (SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id
                           JOIN restaurants r ON r.id = o.restaurant_id WHERE r.user_id = auth.uid()));
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['product_costs', 'variant_costs', 'order_item_costs'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_admin', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin())', t || '_admin', t);
  END LOOP;
END $$;

-- copia dei costi esistenti
INSERT INTO product_costs (product_id, cost)
  SELECT id, cost FROM products WHERE coalesce(cost, 0) > 0
  ON CONFLICT (product_id) DO UPDATE SET cost = EXCLUDED.cost, updated_at = now();
INSERT INTO variant_costs (variant_id, cost)
  SELECT id, cost_per_item FROM product_variants WHERE coalesce(cost_per_item, 0) > 0
  ON CONFLICT (variant_id) DO UPDATE SET cost = EXCLUDED.cost, updated_at = now();
INSERT INTO order_item_costs (order_item_id, product_cost)
  SELECT id, product_cost FROM order_items WHERE coalesce(product_cost, 0) > 0
  ON CONFLICT (order_item_id) DO UPDATE SET product_cost = EXCLUDED.product_cost;

-- a ogni prodotto venduto si salva il costo del momento (variante, se ha un costo, altrimenti prodotto)
DROP TRIGGER IF EXISTS trg_set_order_item_cost ON order_items;
DROP FUNCTION IF EXISTS set_order_item_cost();
CREATE OR REPLACE FUNCTION snapshot_order_item_cost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_cost numeric;
BEGIN
  v_cost := coalesce((SELECT cost FROM variant_costs WHERE variant_id = NEW.variant_id AND cost > 0),
                     (SELECT cost FROM product_costs WHERE product_id = NEW.product_id), 0);
  IF v_cost > 0 THEN
    INSERT INTO order_item_costs (order_item_id, product_cost) VALUES (NEW.id, v_cost)
    ON CONFLICT (order_item_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION snapshot_order_item_cost() FROM public, anon, authenticated;
DROP TRIGGER IF EXISTS trg_snapshot_order_item_cost ON order_items;
CREATE TRIGGER trg_snapshot_order_item_cost AFTER INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION snapshot_order_item_cost();

-- margini per ordine: costo dalla tabella privata (chi non è il titolare vede costo 0)
CREATE OR REPLACE VIEW v_order_margins WITH (security_invoker = true) AS
SELECT o.id, o.restaurant_id, o.order_type, o.status, o.payment_status, o.deleted_at, o.created_at,
  o.total_amount::numeric AS revenue,
  COALESCE(sum(oc.product_cost * oi.quantity::numeric), 0::numeric) AS cost,
  o.total_amount - COALESCE(sum(oc.product_cost * oi.quantity::numeric), 0::numeric) AS margin
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN order_item_costs oc ON oc.order_item_id = oi.id
GROUP BY o.id;

-- varianti senza il costo (la vista è letta anche dal menu pubblico)
DROP VIEW IF EXISTS v_product_variants;
CREATE VIEW v_product_variants WITH (security_invoker = true) AS
SELECT id, product_id, sku, title, price, compare_at_price, track_quantity, quantity, allow_negative_inventory,
  is_available, option_values, "position", image_url, created_at, updated_at, committed, low_stock_threshold
FROM product_variants;
GRANT SELECT ON v_product_variants TO anon, authenticated;

-- Esplora dati: costi delle vendite dalla tabella privata
UPDATE analytics_datasets SET base_sql = replace(base_sql,
  'LEFT JOIN LATERAL (SELECT sum(subtotal) AS sales, sum(quantity) AS qty, sum(coalesce(product_cost, 0) * quantity) AS cost
                   FROM order_items WHERE order_id = o.id) it ON true',
  'LEFT JOIN LATERAL (SELECT sum(oi.subtotal) AS sales, sum(oi.quantity) AS qty, sum(coalesce(oc.product_cost, 0) * oi.quantity) AS cost
                   FROM order_items oi LEFT JOIN order_item_costs oc ON oc.order_item_id = oi.id WHERE oi.order_id = o.id) it ON true')
WHERE name = 'sales';
UPDATE analytics_datasets SET base_sql = replace(replace(base_sql,
  'coalesce(oi.product_cost, 0) * oi.quantity AS cost', 'coalesce(oc.product_cost, 0) * oi.quantity AS cost'),
  'LEFT JOIN restaurant_staff ab ON ab.id = oi.added_by_staff_id',
  'LEFT JOIN restaurant_staff ab ON ab.id = oi.added_by_staff_id
LEFT JOIN order_item_costs oc ON oc.order_item_id = oi.id')
WHERE name = 'products';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM analytics_datasets WHERE base_sql ~ '(\mproduct_cost\M)' AND base_sql !~ 'order_item_costs') THEN
    RAISE EXCEPTION 'Esplora dati: aggiornamento dei costi non riuscito';
  END IF;
END $$;

COMMIT;
