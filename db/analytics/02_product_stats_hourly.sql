-- Statistiche prodotto con l'ORA (fasce orarie): sostituisce product_stats_daily.
-- Una riga per prodotto, per giorno, per ora (fuso Europe/Rome). Al momento della migrazione
-- la tabella giornaliera conteneva solo dati sintetici del ristorante demo.

DROP FUNCTION IF EXISTS track_product_stats(uuid, jsonb);
DROP TABLE IF EXISTS product_stats_daily;

CREATE TABLE IF NOT EXISTS product_stats_hourly (
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  day date NOT NULL,
  hour smallint NOT NULL CHECK (hour BETWEEN 0 AND 23),
  impressions integer NOT NULL DEFAULT 0,
  opens integer NOT NULL DEFAULT 0,
  cart_adds integer NOT NULL DEFAULT 0,
  cart_qty integer NOT NULL DEFAULT 0,
  ordered_qty integer NOT NULL DEFAULT 0,
  PRIMARY KEY (restaurant_id, product_id, day, hour)
);
CREATE INDEX IF NOT EXISTS idx_product_stats_hourly_day ON product_stats_hourly (restaurant_id, day);

ALTER TABLE product_stats_hourly ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON product_stats_hourly FROM anon;

DROP POLICY IF EXISTS psh_owner_read ON product_stats_hourly;
CREATE POLICY psh_owner_read ON product_stats_hourly
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS psh_admin_all ON product_stats_hourly;
CREATE POLICY psh_admin_all ON product_stats_hourly
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Incrementa i contatori dell'ora corrente (ora italiana).
-- p_events: [{ "p": product_id, "i": visualizzazioni, "o": aperture, "a": aggiunte, "q": pezzi aggiunti, "d": pezzi ordinati }]
CREATE OR REPLACE FUNCTION track_product_stats(p_restaurant_id uuid, p_events jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamp := now() AT TIME ZONE 'Europe/Rome';
BEGIN
  IF p_events IS NULL OR jsonb_typeof(p_events) <> 'array' OR jsonb_array_length(p_events) = 0 THEN
    RETURN;
  END IF;

  INSERT INTO product_stats_hourly AS s (restaurant_id, product_id, day, hour, impressions, opens, cart_adds, cart_qty, ordered_qty)
  SELECT p_restaurant_id, e.p, v_now::date, extract(hour FROM v_now)::smallint,
         least(sum(greatest(coalesce(e.i, 0), 0)), 5),
         least(sum(greatest(coalesce(e.o, 0), 0)), 5),
         least(sum(greatest(coalesce(e.a, 0), 0)), 20),
         least(sum(greatest(coalesce(e.q, 0), 0)), 200),
         least(sum(greatest(coalesce(e.d, 0), 0)), 200)
  FROM (SELECT * FROM jsonb_to_recordset(p_events) AS x(p uuid, i int, o int, a int, q int, d int) LIMIT 300) e
  JOIN products pr ON pr.id = e.p
  JOIN categories c ON c.id = pr.category_id AND c.restaurant_id = p_restaurant_id
  GROUP BY e.p
  ON CONFLICT (restaurant_id, product_id, day, hour) DO UPDATE SET
    impressions = s.impressions + EXCLUDED.impressions,
    opens       = s.opens + EXCLUDED.opens,
    cart_adds   = s.cart_adds + EXCLUDED.cart_adds,
    cart_qty    = s.cart_qty + EXCLUDED.cart_qty,
    ordered_qty = s.ordered_qty + EXCLUDED.ordered_qty;
END;
$$;
GRANT EXECUTE ON FUNCTION track_product_stats(uuid, jsonb) TO anon, authenticated;

-- Report già aggregato per la pagina Conversion Funnel (rispetta RLS: titolare o super admin).
-- p_product_id facoltativo: se indicato, solo quel prodotto (dettaglio prodotto).
CREATE OR REPLACE FUNCTION product_stats_report(p_restaurant_id uuid, p_start date, p_end date, p_product_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH s AS (
    SELECT * FROM product_stats_hourly
    WHERE restaurant_id = p_restaurant_id
      AND day BETWEEN p_start AND p_end
      AND (p_product_id IS NULL OR product_id = p_product_id)
  )
  SELECT json_build_object(
    'totals', (SELECT json_build_object(
        'impressions', coalesce(sum(impressions), 0), 'opens', coalesce(sum(opens), 0),
        'cart_adds', coalesce(sum(cart_adds), 0), 'cart_qty', coalesce(sum(cart_qty), 0),
        'ordered_qty', coalesce(sum(ordered_qty), 0)) FROM s),
    'by_product', (SELECT coalesce(json_agg(x), '[]'::json) FROM (
        SELECT product_id, sum(impressions)::int AS impressions, sum(opens)::int AS opens,
               sum(cart_adds)::int AS cart_adds, sum(cart_qty)::int AS cart_qty, sum(ordered_qty)::int AS ordered_qty
        FROM s GROUP BY product_id) x),
    'by_day', (SELECT coalesce(json_agg(x ORDER BY x.day), '[]'::json) FROM (
        SELECT day, sum(impressions)::int AS impressions, sum(opens)::int AS opens,
               sum(cart_adds)::int AS cart_adds, sum(ordered_qty)::int AS ordered_qty
        FROM s GROUP BY day) x),
    'by_hour', (SELECT coalesce(json_agg(x ORDER BY x.hour), '[]'::json) FROM (
        SELECT hour, sum(impressions)::int AS impressions, sum(opens)::int AS opens,
               sum(cart_adds)::int AS cart_adds, sum(cart_qty)::int AS cart_qty, sum(ordered_qty)::int AS ordered_qty
        FROM s GROUP BY hour) x),
    'by_weekday', (SELECT coalesce(json_agg(x ORDER BY x.weekday), '[]'::json) FROM (
        SELECT extract(isodow FROM day)::int AS weekday, sum(impressions)::int AS impressions, sum(opens)::int AS opens,
               sum(cart_adds)::int AS cart_adds, sum(cart_qty)::int AS cart_qty, sum(ordered_qty)::int AS ordered_qty
        FROM s GROUP BY 1) x)
  );
$$;
GRANT EXECUTE ON FUNCTION product_stats_report(uuid, date, date, uuid) TO authenticated;
