-- Statistiche prodotto del menu pubblico, a contatori giornalieri (una riga per prodotto al giorno):
--   impressions = scheda del prodotto vista nella lista (almeno metà a schermo per 1 secondo), 1 volta per visita
--   opens       = prodotto aperto ("Scopri di più" o finestra del prodotto), 1 volta per visita
--   cart_adds   = aggiunte al carrello (ogni volta), cart_qty = pezzi aggiunti
--   ordered_qty = pezzi ordinati dal menu (ordine inviato dal cliente)
-- Conteggi anonimi: nessun dato del cliente. Scrittura solo tramite track_product_stats().

CREATE TABLE IF NOT EXISTS product_stats_daily (
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  day date NOT NULL,
  impressions integer NOT NULL DEFAULT 0,
  opens integer NOT NULL DEFAULT 0,
  cart_adds integer NOT NULL DEFAULT 0,
  cart_qty integer NOT NULL DEFAULT 0,
  ordered_qty integer NOT NULL DEFAULT 0,
  PRIMARY KEY (restaurant_id, product_id, day)
);
CREATE INDEX IF NOT EXISTS idx_product_stats_daily_day ON product_stats_daily (restaurant_id, day);

ALTER TABLE product_stats_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON product_stats_daily FROM anon;

DROP POLICY IF EXISTS psd_owner_read ON product_stats_daily;
CREATE POLICY psd_owner_read ON product_stats_daily
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS psd_admin_all ON product_stats_daily;
CREATE POLICY psd_admin_all ON product_stats_daily
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Incrementa i contatori del giorno (fuso orario italiano).
-- p_events: [{ "p": product_id, "i": visualizzazioni, "o": aperture, "a": aggiunte, "q": pezzi aggiunti, "d": pezzi ordinati }]
-- Accetta solo prodotti di quel ristorante; ogni valore ha un tetto per singolo invio.
CREATE OR REPLACE FUNCTION track_product_stats(p_restaurant_id uuid, p_events jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_events IS NULL OR jsonb_typeof(p_events) <> 'array' OR jsonb_array_length(p_events) = 0 THEN
    RETURN;
  END IF;

  INSERT INTO product_stats_daily AS s (restaurant_id, product_id, day, impressions, opens, cart_adds, cart_qty, ordered_qty)
  SELECT p_restaurant_id, e.p, (now() AT TIME ZONE 'Europe/Rome')::date,
         least(sum(greatest(coalesce(e.i, 0), 0)), 5),
         least(sum(greatest(coalesce(e.o, 0), 0)), 5),
         least(sum(greatest(coalesce(e.a, 0), 0)), 20),
         least(sum(greatest(coalesce(e.q, 0), 0)), 200),
         least(sum(greatest(coalesce(e.d, 0), 0)), 200)
  FROM (SELECT * FROM jsonb_to_recordset(p_events) AS x(p uuid, i int, o int, a int, q int, d int) LIMIT 300) e
  JOIN products pr ON pr.id = e.p
  JOIN categories c ON c.id = pr.category_id AND c.restaurant_id = p_restaurant_id
  GROUP BY e.p
  ON CONFLICT (restaurant_id, product_id, day) DO UPDATE SET
    impressions = s.impressions + EXCLUDED.impressions,
    opens       = s.opens + EXCLUDED.opens,
    cart_adds   = s.cart_adds + EXCLUDED.cart_adds,
    cart_qty    = s.cart_qty + EXCLUDED.cart_qty,
    ordered_qty = s.ordered_qty + EXCLUDED.ordered_qty;
END;
$$;
GRANT EXECUTE ON FUNCTION track_product_stats(uuid, jsonb) TO anon, authenticated;
