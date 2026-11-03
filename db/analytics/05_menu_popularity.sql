-- Popolarità nel menu.
-- 1) menu_popular_products: i prodotti più aperti dai clienti, in ordine (solo l'elenco, senza numeri),
--    per la sezione automatica "I più visti" del menu Editor. È pubblica: la legge il menu dei clienti.
-- 2) menu_view_counts: quante volte sono stati aperti prodotti e categorie, solo per il titolare,
--    per ordinare le categorie (e i prodotti) per popolarità in Prodotti e nell'editor.
-- Le visite del titolare e le anteprime non vengono registrate, quindi non pesano.

BEGIN;

CREATE OR REPLACE FUNCTION menu_popular_products(p_restaurant_id uuid, p_days int DEFAULT 180, p_limit int DEFAULT 60)
RETURNS TABLE (product_id uuid, rank int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.product_id, (row_number() OVER (ORDER BY v.views DESC, v.product_id))::int
  FROM (
    SELECT e.product_id, count(*) AS views
    FROM analytics_events e
    WHERE e.restaurant_id = p_restaurant_id
      AND e.event_type = 'product_viewed'
      AND e.product_id IS NOT NULL
      AND e.created_at >= now() - make_interval(days => least(greatest(coalesce(p_days, 180), 1), 730))
    GROUP BY e.product_id
  ) v
  JOIN products p ON p.id = v.product_id AND p.is_visible IS NOT FALSE
  JOIN categories c ON c.id = p.category_id AND c.restaurant_id = p_restaurant_id AND c.is_visible IS NOT FALSE
  ORDER BY v.views DESC, v.product_id
  LIMIT least(greatest(coalesce(p_limit, 60), 1), 100);
$$;
REVOKE ALL ON FUNCTION menu_popular_products(uuid, int, int) FROM public;
GRANT EXECUTE ON FUNCTION menu_popular_products(uuid, int, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION menu_view_counts(p_restaurant_id uuid, p_days int DEFAULT 180)
RETURNS TABLE (kind text, item_id uuid, views bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin()
     AND NOT EXISTS (SELECT 1 FROM restaurants r WHERE r.id = p_restaurant_id AND r.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;
  RETURN QUERY
  SELECT CASE WHEN e.event_type = 'product_viewed' THEN 'product' ELSE 'category' END,
         CASE WHEN e.event_type = 'product_viewed' THEN e.product_id ELSE e.category_id END,
         count(*)
  FROM analytics_events e
  WHERE e.restaurant_id = p_restaurant_id
    AND ((e.event_type = 'product_viewed' AND e.product_id IS NOT NULL)
      OR (e.event_type = 'category_viewed' AND e.category_id IS NOT NULL))
    AND e.created_at >= now() - make_interval(days => least(greatest(coalesce(p_days, 180), 1), 730))
  GROUP BY 1, 2;
END;
$$;
REVOKE ALL ON FUNCTION menu_view_counts(uuid, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION menu_view_counts(uuid, int) TO authenticated;

COMMIT;
