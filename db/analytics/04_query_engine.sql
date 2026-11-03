-- Motore di query delle Analytics (stile ShopifyQL): FROM <set di dati> SHOW <metriche> GROUP BY <dimensioni>
-- TIMESERIES <grana> DURING <periodo> ... Il client invia una richiesta strutturata (jsonb); il server
-- costruisce l'SQL SOLO da espressioni del catalogo qui sotto (nessun SQL arbitrario dal browser),
-- sempre filtrato sul ristorante del titolare.
--
-- Catalogo: analytics_datasets (base_sql con segnaposto :R ristorante, :S inizio, :E fine) e
-- analytics_fields (metriche = aggregati, dimensioni = espressioni sulle colonne della base; ts = istante).

CREATE TABLE IF NOT EXISTS analytics_datasets (
  name text PRIMARY KEY,
  label text NOT NULL,
  description text,
  position int NOT NULL DEFAULT 0,
  base_sql text NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_fields (
  dataset text NOT NULL REFERENCES analytics_datasets(name) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('metric', 'dimension')),
  label text NOT NULL,
  type text NOT NULL, -- number | money | percent | duration | text | hour | weekday | band | date | month | channel
  description text,
  expr text NOT NULL,
  position int NOT NULL DEFAULT 0,
  PRIMARY KEY (dataset, name)
);

ALTER TABLE analytics_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_fields ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON analytics_datasets, analytics_fields FROM anon, authenticated;

-- Query salvate dal titolare
CREATE TABLE IF NOT EXISTS analytics_saved_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  query text NOT NULL CHECK (length(query) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_saved_queries_restaurant ON analytics_saved_queries (restaurant_id);
ALTER TABLE analytics_saved_queries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON analytics_saved_queries FROM anon;
DROP POLICY IF EXISTS asq_owner ON analytics_saved_queries;
CREATE POLICY asq_owner ON analytics_saved_queries FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()))
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS asq_admin ON analytics_saved_queries;
CREATE POLICY asq_admin ON analytics_saved_queries FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

-- ===================== SET DI DATI =====================
-- Canale (stessa regola di service_report): banco se al banco, altrimenti la provenienza dell'ordine
-- Regola incasso (come Revenue Analytics): ordine completed, non eliminato, non "non pagato"

TRUNCATE analytics_fields;
DELETE FROM analytics_datasets;

INSERT INTO analytics_datasets (name, label, description, position, base_sql) VALUES
('sales', 'Vendite', 'Un elemento per ordine: incasso, ordini, scontrino medio, margine. Cassa, banco, tavoli e menu QR.', 1, $q$
SELECT o.id, o.created_at AS ts, o.order_type, o.status, coalesce(o.payment_status, 'paid') AS payment_status,
  o.total_amount, coalesce(o.priority_order_amount, 0) AS priority_amount, o.table_number,
  (o.deleted_at IS NOT NULL OR o.status = 'cancelled') AS is_void,
  (o.status = 'completed' AND o.deleted_at IS NULL AND coalesce(o.payment_status, 'paid') <> 'unpaid') AS is_paid,
  CASE WHEN o.order_type = 'counter' THEN 'banco'
       ELSE coalesce(o.source, CASE WHEN o.created_by_staff_id IS NOT NULL THEN 'staff' ELSE 'menu' END) END AS channel,
  CASE WHEN o.order_type <> 'counter' AND coalesce(o.source, CASE WHEN o.created_by_staff_id IS NOT NULL THEN 'staff' ELSE 'menu' END) = 'menu'
       THEN 'Cliente (menu QR)' ELSE coalesce(cs.name, 'Titolare') END AS taken_by,
  CASE WHEN o.closed_at IS NULL THEN NULL ELSE coalesce(cl.name, 'Titolare') END AS closed_by,
  rm.name AS room,
  coalesce(it.sales, 0) AS items_sales, coalesce(it.qty, 0) AS items_qty, coalesce(it.cost, 0) AS items_cost
FROM orders o
LEFT JOIN restaurant_staff cs ON cs.id = o.created_by_staff_id
LEFT JOIN restaurant_staff cl ON cl.id = o.closed_by_staff_id
LEFT JOIN rooms rm ON rm.id = o.room_id
LEFT JOIN LATERAL (SELECT sum(oi.subtotal) AS sales, sum(oi.quantity) AS qty, sum(coalesce(oc.product_cost, 0) * oi.quantity) AS cost
                   FROM order_items oi LEFT JOIN order_item_costs oc ON oc.order_item_id = oi.id WHERE oi.order_id = o.id) it ON true
WHERE o.restaurant_id = :R AND o.created_at >= :S AND o.created_at < :E
$q$),
('products', 'Prodotti venduti', 'Un elemento per prodotto ordinato: pezzi, vendite, costo e margine per prodotto e categoria.', 2, $q$
SELECT oi.id, o.created_at AS ts, oi.order_id, oi.quantity, oi.subtotal, coalesce(oc.product_cost, 0) * oi.quantity AS cost,
  coalesce(nullif(trim(oi.product_name), ''), trim(p.name)) AS product, trim(c.name) AS category, nullif(trim(oi.variant_title), '') AS variant,
  (o.deleted_at IS NOT NULL OR o.status = 'cancelled') AS is_void,
  (o.status = 'completed' AND o.deleted_at IS NULL AND coalesce(o.payment_status, 'paid') <> 'unpaid') AS is_paid,
  CASE WHEN o.order_type = 'counter' THEN 'banco'
       ELSE coalesce(o.source, CASE WHEN o.created_by_staff_id IS NOT NULL THEN 'staff' ELSE 'menu' END) END AS channel,
  coalesce(ab.name, CASE WHEN o.order_type <> 'counter' AND coalesce(o.source, 'menu') = 'menu' THEN 'Cliente (menu QR)' ELSE 'Titolare' END) AS added_by
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
LEFT JOIN products p ON p.id = oi.product_id
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN restaurant_staff ab ON ab.id = oi.added_by_staff_id
LEFT JOIN order_item_costs oc ON oc.order_item_id = oi.id
WHERE o.restaurant_id = :R AND o.created_at >= :S AND o.created_at < :E
$q$),
('menu', 'Menu: visti e aperti', 'Statistiche del menu online per prodotto e ora: schede viste, aperte, aggiunte al carrello e ordinate.', 3, $q$
SELECT ((s.day + make_interval(hours => s.hour))::timestamp AT TIME ZONE 'Europe/Rome') AS ts,
  trim(p.name) AS product, trim(c.name) AS category,
  s.impressions, s.opens, s.cart_adds, s.cart_qty, s.ordered_qty
FROM product_stats_hourly s
JOIN products p ON p.id = s.product_id
LEFT JOIN categories c ON c.id = p.category_id
WHERE s.restaurant_id = :R
  AND s.day >= ((:S)::timestamptz AT TIME ZONE 'Europe/Rome')::date - 1
  AND s.day <= ((:E)::timestamptz AT TIME ZONE 'Europe/Rome')::date
$q$),
('visits', 'Visite al menu', 'Aperture del menu online: visite, tempo sul menu, categorie e prodotti aperti, preferiti, dispositivi.', 4, $q$
SELECT e.created_at AS ts, e.event_type, e.session_duration,
  CASE WHEN e.event_type <> 'traffic_source_tracked' THEN NULL
       WHEN e.metadata->>'device_type' IN ('mobile', 'tablet', 'desktop') THEN e.metadata->>'device_type'
       ELSE 'mobile' END AS device,
  CASE WHEN e.event_type <> 'traffic_source_tracked' THEN NULL
       WHEN e.metadata->>'user_agent' ~ 'iPhone|iPad' THEN 'iPhone / iPad'
       WHEN e.metadata->>'user_agent' ~ 'Android' THEN 'Android' ELSE 'Altro' END AS os,
  CASE WHEN e.event_type <> 'traffic_source_tracked' THEN NULL ELSE coalesce(e.metadata->>'source', 'direct') END AS source,
  trim(c.name) AS category, trim(p.name) AS product
FROM analytics_events e
LEFT JOIN categories c ON c.id = e.category_id
LEFT JOIN products p ON p.id = e.product_id
WHERE e.restaurant_id = :R AND e.created_at >= :S AND e.created_at < :E
  AND e.event_type IN ('traffic_source_tracked', 'session_time', 'product_viewed', 'category_viewed', 'favorite_added', 'favorite_removed')
$q$),
('service', 'Servizio', 'Un elemento per ordine: attesa approvazione degli ordini dal QR, permanenza al tavolo, rifiutati.', 5, $q$
SELECT o.id, o.created_at AS ts, o.order_type,
  (o.deleted_at IS NOT NULL OR o.status = 'cancelled') AS is_void,
  CASE WHEN o.order_type = 'counter' THEN 'banco'
       ELSE coalesce(o.source, CASE WHEN o.created_by_staff_id IS NOT NULL THEN 'staff' ELSE 'menu' END) END AS channel,
  CASE WHEN o.confirmed_at IS NULL THEN NULL ELSE coalesce(ap.name, 'Titolare') END AS approved_by,
  CASE WHEN o.closed_at IS NULL THEN NULL ELSE coalesce(cl.name, 'Titolare') END AS closed_by,
  CASE WHEN o.order_type <> 'counter' AND coalesce(o.source, 'menu') = 'menu' AND o.confirmed_at >= o.created_at
            AND o.confirmed_at - o.created_at < interval '3 hours'
       THEN extract(epoch FROM o.confirmed_at - o.created_at) END AS approval_sec,
  CASE WHEN o.order_type = 'table' AND o.status = 'completed' AND o.deleted_at IS NULL AND o.closed_at > o.created_at
            AND o.closed_at - o.created_at < interval '12 hours'
       THEN extract(epoch FROM o.closed_at - o.created_at) END AS stay_sec,
  (o.status = 'cancelled' AND o.confirmed_at IS NULL AND coalesce(o.metadata->>'discarded', '') = ''
   AND o.order_type <> 'counter' AND coalesce(o.source, 'menu') = 'menu') AS is_rejected,
  coalesce(it.qty, 0) AS items_qty
FROM orders o
LEFT JOIN restaurant_staff ap ON ap.id = o.confirmed_by_staff_id
LEFT JOIN restaurant_staff cl ON cl.id = o.closed_by_staff_id
LEFT JOIN LATERAL (SELECT sum(quantity) AS qty FROM order_items WHERE order_id = o.id) it ON true
WHERE o.restaurant_id = :R AND o.created_at >= :S AND o.created_at < :E
$q$),
('kitchen', 'Comande', 'Un elemento per comanda dei tavoli: tempi di preparazione, chi l''ha aggiunta e chi l''ha preparata.', 6, $q$
SELECT x.order_id, x.batch_number, x.started_at AS ts, x.prepared_at, x.pezzi, x.channel,
  coalesce(pb.name, CASE WHEN x.prepared_at IS NULL THEN NULL ELSE 'Titolare' END) AS prepared_by,
  coalesce(ab.name, CASE WHEN x.batch_number = 1 AND x.channel = 'menu' THEN 'Cliente (menu QR)' ELSE 'Titolare' END) AS added_by,
  CASE WHEN x.prepared_at - x.started_at >= interval '10 seconds' AND x.prepared_at - x.started_at < interval '4 hours'
       THEN extract(epoch FROM x.prepared_at - x.started_at) END AS prep_sec
FROM (
  SELECT oi.order_id, oi.batch_number,
    min(coalesce(oi.sent_at, o.confirmed_at, o.created_at)) AS started_at,
    max(oi.prepared_at) AS prepared_at, sum(oi.quantity) AS pezzi,
    (array_agg(oi.prepared_by_staff_id) FILTER (WHERE oi.prepared_by_staff_id IS NOT NULL))[1] AS prepared_by_id,
    (array_agg(oi.added_by_staff_id) FILTER (WHERE oi.added_by_staff_id IS NOT NULL))[1] AS added_by_id,
    min(coalesce(o.source, CASE WHEN o.created_by_staff_id IS NOT NULL THEN 'staff' ELSE 'menu' END)) AS channel
  FROM order_items oi JOIN orders o ON o.id = oi.order_id
  WHERE o.restaurant_id = :R AND o.order_type = 'table' AND o.deleted_at IS NULL AND o.status <> 'cancelled'
    AND o.created_at >= (:S)::timestamptz - interval '1 day' AND o.created_at < :E
  GROUP BY oi.order_id, oi.batch_number
) x
LEFT JOIN restaurant_staff pb ON pb.id = x.prepared_by_id
LEFT JOIN restaurant_staff ab ON ab.id = x.added_by_id
$q$);

-- ===================== METRICHE =====================
INSERT INTO analytics_fields (dataset, name, kind, label, type, description, expr, position) VALUES
-- Vendite
('sales', 'orders', 'metric', 'Ordini', 'number', 'Ordini ricevuti (anche aperti), esclusi gli annullati', 'count(*) FILTER (WHERE NOT is_void)', 1),
('sales', 'total_sales', 'metric', 'Incasso', 'money', 'Totale degli ordini chiusi e pagati (come Revenue Analytics)', 'coalesce(sum(total_amount) FILTER (WHERE is_paid), 0)', 2),
('sales', 'paid_orders', 'metric', 'Ordini incassati', 'number', 'Ordini chiusi e pagati', 'count(*) FILTER (WHERE is_paid)', 3),
('sales', 'average_order_value', 'metric', 'Scontrino medio', 'money', 'Incasso diviso ordini incassati', 'CASE WHEN count(*) FILTER (WHERE is_paid) > 0 THEN sum(total_amount) FILTER (WHERE is_paid) / count(*) FILTER (WHERE is_paid) END', 4),
('sales', 'gross_sales', 'metric', 'Venduto lordo', 'money', 'Valore dei prodotti degli ordini chiusi, pagati e non pagati', 'coalesce(sum(items_sales) FILTER (WHERE status = ''completed'' AND NOT is_void), 0)', 5),
('sales', 'unpaid_sales', 'metric', 'Non pagato', 'money', 'Importo dei tavoli chiusi senza pagare', 'coalesce(sum(total_amount) FILTER (WHERE NOT is_void AND payment_status = ''unpaid''), 0)', 6),
('sales', 'unpaid_orders', 'metric', 'Ordini non pagati', 'number', 'Tavoli chiusi senza pagare', 'count(*) FILTER (WHERE NOT is_void AND payment_status = ''unpaid'')', 7),
('sales', 'priority_fees', 'metric', 'Supplementi priorità', 'money', 'Supplementi degli ordini prioritari incassati', 'coalesce(sum(priority_amount) FILTER (WHERE is_paid), 0)', 8),
('sales', 'items_sold', 'metric', 'Pezzi venduti', 'number', 'Pezzi negli ordini incassati', 'coalesce(sum(items_qty) FILTER (WHERE is_paid), 0)', 9),
('sales', 'items_per_order', 'metric', 'Pezzi per ordine', 'number', 'Media dei pezzi per ordine incassato', 'avg(items_qty) FILTER (WHERE is_paid)', 10),
('sales', 'cost_of_goods', 'metric', 'Costo prodotti', 'money', 'Costo dei prodotti venduti (ordini incassati)', 'coalesce(sum(items_cost) FILTER (WHERE is_paid), 0)', 11),
('sales', 'gross_profit', 'metric', 'Margine', 'money', 'Incasso meno costo dei prodotti', 'coalesce(sum(total_amount - items_cost) FILTER (WHERE is_paid), 0)', 12),
('sales', 'margin_percent', 'metric', 'Margine %', 'percent', 'Margine sull''incasso', 'CASE WHEN sum(total_amount) FILTER (WHERE is_paid) > 0 THEN 100 * sum(total_amount - items_cost) FILTER (WHERE is_paid) / sum(total_amount) FILTER (WHERE is_paid) END', 13),
('sales', 'open_orders', 'metric', 'Ordini aperti', 'number', 'Ordini ancora aperti (in attesa o al tavolo)', 'count(*) FILTER (WHERE NOT is_void AND status IN (''pending'', ''confirmed'', ''preparing''))', 14),
('sales', 'cancelled_orders', 'metric', 'Ordini annullati', 'number', 'Ordini rifiutati o eliminati', 'count(*) FILTER (WHERE is_void)', 15),
('sales', 'table_orders', 'metric', 'Ordini al tavolo', 'number', NULL, 'count(*) FILTER (WHERE NOT is_void AND order_type = ''table'')', 16),
('sales', 'counter_orders', 'metric', 'Ordini al banco', 'number', NULL, 'count(*) FILTER (WHERE NOT is_void AND order_type = ''counter'')', 17),
-- Prodotti venduti
('products', 'quantity_sold', 'metric', 'Pezzi venduti', 'number', 'Pezzi negli ordini chiusi e pagati', 'coalesce(sum(quantity) FILTER (WHERE is_paid), 0)', 1),
('products', 'product_sales', 'metric', 'Vendite prodotto', 'money', 'Valore venduto (ordini incassati)', 'coalesce(sum(subtotal) FILTER (WHERE is_paid), 0)', 2),
('products', 'product_cost', 'metric', 'Costo', 'money', 'Costo dei pezzi venduti', 'coalesce(sum(cost) FILTER (WHERE is_paid), 0)', 3),
('products', 'product_profit', 'metric', 'Margine', 'money', 'Vendite meno costo', 'coalesce(sum(subtotal - cost) FILTER (WHERE is_paid), 0)', 4),
('products', 'margin_percent', 'metric', 'Margine %', 'percent', NULL, 'CASE WHEN sum(subtotal) FILTER (WHERE is_paid) > 0 THEN 100 * sum(subtotal - cost) FILTER (WHERE is_paid) / sum(subtotal) FILTER (WHERE is_paid) END', 5),
('products', 'orders', 'metric', 'Ordini', 'number', 'Ordini incassati che contengono il prodotto', 'count(DISTINCT order_id) FILTER (WHERE is_paid)', 6),
('products', 'average_price', 'metric', 'Prezzo medio', 'money', 'Vendite diviso pezzi', 'CASE WHEN sum(quantity) FILTER (WHERE is_paid) > 0 THEN sum(subtotal) FILTER (WHERE is_paid) / sum(quantity) FILTER (WHERE is_paid) END', 7),
('products', 'quantity_ordered', 'metric', 'Pezzi ordinati', 'number', 'Tutti i pezzi ordinati, anche dei tavoli ancora aperti', 'coalesce(sum(quantity) FILTER (WHERE NOT is_void), 0)', 8),
-- Menu
('menu', 'views', 'metric', 'Visualizzazioni', 'number', 'Schede viste nella lista (almeno 1 secondo a schermo)', 'coalesce(sum(impressions), 0)', 1),
('menu', 'opens', 'metric', 'Aperture', 'number', 'Prodotti aperti dai clienti', 'coalesce(sum(opens), 0)', 2),
('menu', 'cart_adds', 'metric', 'Aggiunte al carrello', 'number', NULL, 'coalesce(sum(cart_adds), 0)', 3),
('menu', 'cart_quantity', 'metric', 'Pezzi nel carrello', 'number', NULL, 'coalesce(sum(cart_qty), 0)', 4),
('menu', 'ordered_quantity', 'metric', 'Pezzi ordinati dal menu', 'number', NULL, 'coalesce(sum(ordered_qty), 0)', 5),
('menu', 'open_rate', 'metric', '% apertura', 'percent', 'Aperture su visualizzazioni', 'CASE WHEN sum(impressions) > 0 THEN 100.0 * sum(opens) / sum(impressions) END', 6),
('menu', 'add_to_cart_rate', 'metric', '% aggiunta', 'percent', 'Aggiunte al carrello su aperture', 'CASE WHEN sum(opens) > 0 THEN 100.0 * sum(cart_adds) / sum(opens) END', 7),
('menu', 'order_rate', 'metric', '% ordinato', 'percent', 'Pezzi ordinati su pezzi messi nel carrello', 'CASE WHEN sum(cart_qty) > 0 THEN 100.0 * sum(ordered_qty) / sum(cart_qty) END', 8),
-- Visite
('visits', 'visits', 'metric', 'Visite', 'number', 'Aperture del menu online', 'count(*) FILTER (WHERE event_type = ''traffic_source_tracked'')', 1),
('visits', 'product_opens', 'metric', 'Prodotti aperti', 'number', NULL, 'count(*) FILTER (WHERE event_type = ''product_viewed'')', 2),
('visits', 'category_opens', 'metric', 'Categorie aperte', 'number', NULL, 'count(*) FILTER (WHERE event_type = ''category_viewed'')', 3),
('visits', 'favorites_added', 'metric', 'Aggiunti ai preferiti', 'number', NULL, 'count(*) FILTER (WHERE event_type = ''favorite_added'')', 4),
('visits', 'avg_time_on_menu', 'metric', 'Tempo medio sul menu', 'duration', 'Media delle visite sotto l''ora', 'avg(session_duration) FILTER (WHERE event_type = ''session_time'' AND session_duration < 3600)', 5),
('visits', 'median_time_on_menu', 'metric', 'Tempo tipico sul menu', 'duration', 'Mediana della durata delle visite', 'percentile_cont(0.5) WITHIN GROUP (ORDER BY session_duration) FILTER (WHERE event_type = ''session_time'')', 6),
('visits', 'opens_per_visit', 'metric', 'Prodotti aperti per visita', 'number', NULL, 'CASE WHEN count(*) FILTER (WHERE event_type = ''traffic_source_tracked'') > 0 THEN 1.0 * count(*) FILTER (WHERE event_type = ''product_viewed'') / count(*) FILTER (WHERE event_type = ''traffic_source_tracked'') END', 7),
-- Servizio
('service', 'orders', 'metric', 'Ordini', 'number', 'Ordini ricevuti, esclusi gli annullati', 'count(*) FILTER (WHERE NOT is_void)', 1),
('service', 'approved_orders', 'metric', 'Ordini QR approvati', 'number', 'Ordini dei clienti dal QR approvati dallo staff', 'count(approval_sec)', 2),
('service', 'avg_approval_time', 'metric', 'Attesa approvazione media', 'duration', NULL, 'avg(approval_sec)', 3),
('service', 'median_approval_time', 'metric', 'Attesa approvazione tipica', 'duration', 'Mediana', 'percentile_cont(0.5) WITHIN GROUP (ORDER BY approval_sec)', 4),
('service', 'p90_approval_time', 'metric', 'Attesa approvazione (9 su 10)', 'duration', '9 ordini su 10 approvati entro', 'percentile_cont(0.9) WITHIN GROUP (ORDER BY approval_sec)', 5),
('service', 'avg_table_time', 'metric', 'Permanenza media al tavolo', 'duration', 'Dal primo ordine alla chiusura', 'avg(stay_sec)', 6),
('service', 'median_table_time', 'metric', 'Permanenza tipica al tavolo', 'duration', 'Mediana', 'percentile_cont(0.5) WITHIN GROUP (ORDER BY stay_sec)', 7),
('service', 'rejected_orders', 'metric', 'Ordini rifiutati', 'number', 'Ordini dal QR rifiutati dallo staff', 'count(*) FILTER (WHERE is_rejected)', 8),
('service', 'items_per_order', 'metric', 'Pezzi per ordine', 'number', NULL, 'avg(items_qty) FILTER (WHERE NOT is_void)', 9),
-- Comande
('kitchen', 'batches', 'metric', 'Comande', 'number', 'Comande dei tavoli', 'count(*)', 1),
('kitchen', 'prepared_batches', 'metric', 'Comande preparate', 'number', NULL, 'count(*) FILTER (WHERE prepared_at IS NOT NULL)', 2),
('kitchen', 'avg_prep_time', 'metric', 'Preparazione media', 'duration', 'Da quando la comanda parte a quando è pronta', 'avg(prep_sec)', 3),
('kitchen', 'median_prep_time', 'metric', 'Preparazione tipica', 'duration', 'Mediana', 'percentile_cont(0.5) WITHIN GROUP (ORDER BY prep_sec)', 4),
('kitchen', 'p90_prep_time', 'metric', 'Preparazione (9 su 10)', 'duration', '9 comande su 10 pronte entro', 'percentile_cont(0.9) WITHIN GROUP (ORDER BY prep_sec)', 5),
('kitchen', 'items', 'metric', 'Pezzi', 'number', NULL, 'coalesce(sum(pezzi), 0)', 6);

-- ===================== DIMENSIONI =====================
INSERT INTO analytics_fields (dataset, name, kind, label, type, description, expr, position) VALUES
('sales', 'channel', 'dimension', 'Canale', 'channel', 'Menu QR, app staff, cassa, pannello Ordini, banco', 'channel', 1),
('sales', 'order_type', 'dimension', 'Tavolo o banco', 'text', NULL, 'CASE order_type WHEN ''counter'' THEN ''Banco'' ELSE ''Tavolo'' END', 2),
('sales', 'taken_by', 'dimension', 'Preso da', 'text', 'Chi ha preso l''ordine', 'taken_by', 3),
('sales', 'closed_by', 'dimension', 'Chiuso da', 'text', 'Chi ha chiuso il tavolo o battuto lo scontrino', 'closed_by', 4),
('sales', 'room', 'dimension', 'Sala', 'text', NULL, 'room', 5),
('sales', 'table', 'dimension', 'Tavolo', 'number', NULL, 'table_number', 6),
('sales', 'payment', 'dimension', 'Pagamento', 'text', NULL, 'CASE WHEN payment_status = ''unpaid'' THEN ''Non pagato'' ELSE ''Pagato'' END', 7),
('sales', 'status', 'dimension', 'Stato', 'text', NULL, 'CASE WHEN is_void THEN ''Annullato'' WHEN status = ''completed'' THEN ''Chiuso'' WHEN status = ''pending'' THEN ''In attesa'' ELSE ''Aperto'' END', 8),
('products', 'product', 'dimension', 'Prodotto', 'text', NULL, 'product', 1),
('products', 'category', 'dimension', 'Categoria', 'text', NULL, 'category', 2),
('products', 'variant', 'dimension', 'Variante', 'text', NULL, 'variant', 3),
('products', 'channel', 'dimension', 'Canale', 'channel', NULL, 'channel', 4),
('products', 'added_by', 'dimension', 'Inserito da', 'text', 'Chi ha inserito il prodotto nell''ordine', 'added_by', 5),
('menu', 'product', 'dimension', 'Prodotto', 'text', NULL, 'product', 1),
('menu', 'category', 'dimension', 'Categoria', 'text', NULL, 'category', 2),
('visits', 'device', 'dimension', 'Dispositivo', 'text', 'Telefono, tablet o computer (solo visite)', 'device', 1),
('visits', 'os', 'dimension', 'Sistema', 'text', 'iPhone o Android (solo visite)', 'os', 2),
('visits', 'source', 'dimension', 'Provenienza', 'text', 'Diretta (QR), Google, altri siti (solo visite)', 'source', 3),
('visits', 'category', 'dimension', 'Categoria', 'text', 'Per categorie e prodotti aperti', 'category', 4),
('visits', 'product', 'dimension', 'Prodotto', 'text', 'Per prodotti aperti e preferiti', 'product', 5),
('service', 'channel', 'dimension', 'Canale', 'channel', NULL, 'channel', 1),
('service', 'approved_by', 'dimension', 'Approvato da', 'text', NULL, 'approved_by', 2),
('service', 'closed_by', 'dimension', 'Chiuso da', 'text', NULL, 'closed_by', 3),
('kitchen', 'prepared_by', 'dimension', 'Preparata da', 'text', NULL, 'prepared_by', 1),
('kitchen', 'added_by', 'dimension', 'Aggiunta da', 'text', NULL, 'added_by', 2),
('kitchen', 'channel', 'dimension', 'Canale', 'channel', NULL, 'channel', 3);

-- Dimensioni di tempo comuni a tutti i set di dati (ora italiana)
INSERT INTO analytics_fields (dataset, name, kind, label, type, description, expr, position)
SELECT d.name, t.name, 'dimension', t.label, t.type, t.description, t.expr, 100 + t.pos
FROM analytics_datasets d CROSS JOIN (VALUES
  ('hour_of_day', 'Ora del giorno', 'hour', 'Da 0 a 23', 'extract(hour FROM ts AT TIME ZONE ''Europe/Rome'')::int', 1),
  ('day_of_week', 'Giorno della settimana', 'weekday', 'Da lunedì a domenica', 'extract(isodow FROM ts AT TIME ZONE ''Europe/Rome'')::int', 2),
  ('day_part', 'Fascia oraria', 'band', 'Mattina, pranzo, pomeriggio, aperitivo, sera, notte', 'CASE WHEN extract(hour FROM ts AT TIME ZONE ''Europe/Rome'') BETWEEN 6 AND 10 THEN 1 WHEN extract(hour FROM ts AT TIME ZONE ''Europe/Rome'') BETWEEN 11 AND 14 THEN 2 WHEN extract(hour FROM ts AT TIME ZONE ''Europe/Rome'') BETWEEN 15 AND 17 THEN 3 WHEN extract(hour FROM ts AT TIME ZONE ''Europe/Rome'') BETWEEN 18 AND 20 THEN 4 WHEN extract(hour FROM ts AT TIME ZONE ''Europe/Rome'') BETWEEN 21 AND 23 THEN 5 ELSE 6 END', 3),
  ('date', 'Giorno', 'date', NULL, 'to_char(ts AT TIME ZONE ''Europe/Rome'', ''YYYY-MM-DD'')', 4),
  ('month', 'Mese', 'month', NULL, 'to_char(ts AT TIME ZONE ''Europe/Rome'', ''YYYY-MM'')', 5)
) AS t(name, label, type, description, expr, pos);

-- ===================== CATALOGO PER L'APP (senza le espressioni SQL) =====================
CREATE OR REPLACE FUNCTION analytics_catalog()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(json_agg(json_build_object(
    'name', d.name, 'label', d.label, 'description', d.description,
    'fields', (SELECT json_agg(json_build_object('name', f.name, 'kind', f.kind, 'label', f.label, 'type', f.type, 'description', f.description)
                               ORDER BY f.kind DESC, f.position)
               FROM analytics_fields f WHERE f.dataset = d.name)
  ) ORDER BY d.position), '[]'::json)
  FROM analytics_datasets d;
$$;
REVOKE ALL ON FUNCTION analytics_catalog() FROM public, anon;
GRANT EXECUTE ON FUNCTION analytics_catalog() TO authenticated;

-- ===================== ESECUZIONE =====================
-- p_spec: { from, show[], group_by[], timeseries, start, end (YYYY-MM-DD, ora italiana, inclusi),
--           where[{field, op, value}], having[{field, op, value}], order_by[{field, dir}], limit }
CREATE OR REPLACE FUNCTION analytics_query(p_restaurant_id uuid, p_spec jsonb)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ds analytics_datasets%ROWTYPE;
  v_from timestamptz; v_to timestamptz; v_start date; v_end date;
  v_base text; v_grain text;
  v_dims text[] := '{}'; v_mets text[] := '{}'; v_names text[] := '{}';
  v_where text := 'TRUE'; v_having text := ''; v_order text := ''; v_limit int;
  v_expr text; v_op text; v_val jsonb; v_item jsonb; v_name text;
  v_sql text; v_rows json;
BEGIN
  IF NOT (EXISTS (SELECT 1 FROM restaurants WHERE id = p_restaurant_id AND user_id = auth.uid()) OR is_super_admin()) THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;
  PERFORM set_config('statement_timeout', '15000', true);

  SELECT * INTO v_ds FROM analytics_datasets WHERE name = p_spec->>'from';
  IF NOT FOUND THEN RAISE EXCEPTION 'Set di dati sconosciuto: %', coalesce(p_spec->>'from', '(vuoto)'); END IF;

  v_start := (p_spec->>'start')::date; v_end := (p_spec->>'end')::date;
  IF v_start IS NULL OR v_end IS NULL OR v_end < v_start THEN RAISE EXCEPTION 'Periodo non valido'; END IF;
  IF v_end - v_start > 1100 THEN RAISE EXCEPTION 'Periodo troppo lungo (massimo 3 anni)'; END IF;
  v_from := v_start::timestamp AT TIME ZONE 'Europe/Rome';
  v_to := (v_end + 1)::timestamp AT TIME ZONE 'Europe/Rome';
  v_base := replace(replace(replace(v_ds.base_sql, ':R', quote_literal(p_restaurant_id)),
                                                   ':S', quote_literal(v_from)), ':E', quote_literal(v_to));

  -- serie temporale
  v_grain := nullif(p_spec->>'timeseries', '');
  IF v_grain IS NOT NULL THEN
    IF v_grain NOT IN ('hour', 'day', 'week', 'month', 'quarter', 'year') THEN RAISE EXCEPTION 'TIMESERIES non valido: %', v_grain; END IF;
    v_dims := v_dims || format('to_char(date_trunc(%L, ts AT TIME ZONE ''Europe/Rome''), ''YYYY-MM-DD"T"HH24:MI'') AS bucket', v_grain);
    v_names := v_names || 'bucket'::text;
  END IF;

  -- dimensioni
  FOR v_item IN SELECT * FROM jsonb_array_elements(coalesce(p_spec->'group_by', '[]'::jsonb)) LOOP
    v_name := v_item #>> '{}';
    SELECT expr INTO v_expr FROM analytics_fields WHERE dataset = v_ds.name AND name = v_name AND kind = 'dimension';
    IF v_expr IS NULL THEN RAISE EXCEPTION 'Dimensione sconosciuta in %: %', v_ds.name, v_name; END IF;
    IF v_name = ANY (v_names) THEN CONTINUE; END IF;
    v_dims := v_dims || format('(%s) AS %I', v_expr, v_name);
    v_names := v_names || v_name;
  END LOOP;
  IF array_length(v_dims, 1) > 4 THEN RAISE EXCEPTION 'Troppe dimensioni (massimo 3 più il tempo)'; END IF;

  -- metriche
  FOR v_item IN SELECT * FROM jsonb_array_elements(coalesce(p_spec->'show', '[]'::jsonb)) LOOP
    v_name := v_item #>> '{}';
    SELECT expr INTO v_expr FROM analytics_fields WHERE dataset = v_ds.name AND name = v_name AND kind = 'metric';
    IF v_expr IS NULL THEN RAISE EXCEPTION 'Metrica sconosciuta in %: %', v_ds.name, v_name; END IF;
    IF v_name = ANY (v_names) THEN CONTINUE; END IF;
    v_mets := v_mets || format('(%s) AS %I', v_expr, v_name);
    v_names := v_names || v_name;
  END LOOP;
  IF coalesce(array_length(v_mets, 1), 0) = 0 THEN RAISE EXCEPTION 'Indica almeno una metrica in SHOW'; END IF;
  IF array_length(v_mets, 1) > 20 THEN RAISE EXCEPTION 'Troppe metriche (massimo 20)'; END IF;

  -- filtri sulle dimensioni (WHERE)
  FOR v_item IN SELECT * FROM jsonb_array_elements(coalesce(p_spec->'where', '[]'::jsonb)) LOOP
    SELECT expr INTO v_expr FROM analytics_fields WHERE dataset = v_ds.name AND name = v_item->>'field' AND kind = 'dimension';
    IF v_expr IS NULL THEN RAISE EXCEPTION 'Filtro su un campo sconosciuto: %', v_item->>'field'; END IF;
    v_op := upper(coalesce(v_item->>'op', '='));
    v_val := v_item->'value';
    v_where := v_where || ' AND ' || CASE
      WHEN v_op IN ('IN', 'NOT IN') THEN format('(%s)::text %s (%s)', v_expr, v_op,
        (SELECT string_agg(quote_literal(x #>> '{}'), ', ') FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_val) = 'array' THEN v_val ELSE jsonb_build_array(v_val) END) x))
      WHEN v_op = 'CONTAINS' THEN format('(%s)::text ILIKE %L', v_expr, '%' || (v_val #>> '{}') || '%')
      WHEN v_op = 'IS NULL' THEN format('(%s) IS NULL', v_expr)
      WHEN v_op = 'IS NOT NULL' THEN format('(%s) IS NOT NULL', v_expr)
      WHEN v_op IN ('=', '!=', '<>') THEN format('(%s)::text %s %L', v_expr, CASE WHEN v_op = '=' THEN '=' ELSE '<>' END, v_val #>> '{}')
      WHEN v_op IN ('>', '>=', '<', '<=') THEN format('(%s)::numeric %s %s', v_expr, v_op, (v_val #>> '{}')::numeric)
      ELSE NULL END;
    IF v_where IS NULL THEN RAISE EXCEPTION 'Operatore non valido: %', v_op; END IF;
  END LOOP;

  -- filtri sulle metriche (HAVING)
  FOR v_item IN SELECT * FROM jsonb_array_elements(coalesce(p_spec->'having', '[]'::jsonb)) LOOP
    SELECT expr INTO v_expr FROM analytics_fields WHERE dataset = v_ds.name AND name = v_item->>'field' AND kind = 'metric';
    IF v_expr IS NULL THEN RAISE EXCEPTION 'HAVING su una metrica sconosciuta: %', v_item->>'field'; END IF;
    v_op := coalesce(v_item->>'op', '>');
    IF v_op NOT IN ('=', '!=', '<>', '>', '>=', '<', '<=') THEN RAISE EXCEPTION 'Operatore non valido: %', v_op; END IF;
    v_having := v_having || CASE WHEN v_having = '' THEN ' HAVING ' ELSE ' AND ' END
      || format('(%s) %s %s', v_expr, CASE WHEN v_op = '!=' THEN '<>' ELSE v_op END, (v_item->>'value')::numeric);
  END LOOP;

  -- ordinamento
  FOR v_item IN SELECT * FROM jsonb_array_elements(coalesce(p_spec->'order_by', '[]'::jsonb)) LOOP
    v_name := v_item->>'field';
    IF NOT v_name = ANY (v_names) THEN RAISE EXCEPTION 'ORDER BY: % non è tra i campi mostrati', v_name; END IF;
    v_order := v_order || CASE WHEN v_order = '' THEN ' ORDER BY ' ELSE ', ' END
      || format('%I %s NULLS LAST', v_name, CASE WHEN upper(coalesce(v_item->>'dir', 'ASC')) = 'DESC' THEN 'DESC' ELSE 'ASC' END);
  END LOOP;
  IF v_order = '' THEN
    v_order := CASE WHEN v_grain IS NOT NULL THEN ' ORDER BY bucket'
                    WHEN array_length(v_dims, 1) > 0 THEN format(' ORDER BY %I DESC NULLS LAST', split_part(v_names[array_length(v_dims, 1) + 1], ' ', 1))
                    ELSE '' END;
  END IF;
  v_limit := least(greatest(coalesce((p_spec->>'limit')::int, 1000), 1), 5000);

  -- i dati del periodo si leggono una sola volta (MATERIALIZED) per righe e totali
  v_sql := format('WITH f AS MATERIALIZED (SELECT * FROM (%s) b WHERE b.ts >= %L AND b.ts < %L AND %s)', v_base, v_from, v_to, v_where);
  IF v_grain IS NOT NULL AND array_length(v_dims, 1) = 1 THEN
    -- serie temporale senza altre dimensioni: tutti gli intervalli del periodo, anche quelli vuoti
    v_sql := v_sql || format(
      ', r AS (SELECT %s FROM f GROUP BY 1%s) '
      'SELECT json_build_object(''rows'', (SELECT coalesce(json_agg(x ORDER BY x.bucket), ''[]''::json) FROM ('
      '  SELECT s.bucket, %s FROM (SELECT to_char(g, ''YYYY-MM-DD"T"HH24:MI'') AS bucket '
      '    FROM generate_series(date_trunc(%L, %L::timestamp), date_trunc(%L, %L::timestamp), %L::interval) g) s '
      '  LEFT JOIN r USING (bucket) ORDER BY s.bucket LIMIT %s) x), ',
      array_to_string(v_dims || v_mets, ', '), v_having,
      (SELECT string_agg(format('r.%I', n), ', ') FROM unnest(v_names[2:]) n),
      v_grain, v_start::timestamp, v_grain, (v_end + 1)::timestamp - interval '1 second', CASE WHEN v_grain = 'quarter' THEN '3 months' ELSE '1 ' || v_grain END, v_limit);
  ELSE
    v_sql := v_sql || format(' SELECT json_build_object(''rows'', (SELECT coalesce(json_agg(x), ''[]''::json) FROM (SELECT %s FROM f%s%s%s LIMIT %s) x), ',
      array_to_string(v_dims || v_mets, ', '),
      CASE WHEN array_length(v_dims, 1) > 0 THEN ' GROUP BY ' || (SELECT string_agg(i::text, ', ') FROM generate_series(1, array_length(v_dims, 1)) i) ELSE '' END,
      v_having, v_order, v_limit);
  END IF;
  -- totali su tutto il periodo filtrato (come WITH TOTALS)
  v_sql := v_sql || format('''totals'', (SELECT row_to_json(t) FROM (SELECT %s FROM f) t))', array_to_string(v_mets, ', '));
  EXECUTE v_sql INTO v_rows;

  RETURN v_rows;
END;
$$;
REVOKE ALL ON FUNCTION analytics_query(uuid, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION analytics_query(uuid, jsonb) TO authenticated;
