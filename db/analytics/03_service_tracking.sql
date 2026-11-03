-- Tracciamento servizio e staff: da dove arriva l'ordine, chi lo prende, chi lo prepara, chi lo chiude.
--   orders.source               'menu' (cliente dal QR) | 'staff' (app staff) | 'cassa' | 'ordini' (pannello Ordini)
--   orders.closed_by_staff_id   chi ha chiuso il tavolo / battuto lo scontrino (NULL = titolare)
--   order_items.prepared_by_staff_id  chi ha segnato la comanda come preparata (NULL = titolare)
-- Le colonne esistenti created_by_staff_id / confirmed_by_staff_id / added_by_staff_id completano il quadro.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_source_check;
ALTER TABLE orders ADD CONSTRAINT orders_source_check
  CHECK (source IS NULL OR source IN ('menu', 'staff', 'cassa', 'ordini'));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS closed_by_staff_id uuid
  REFERENCES restaurant_staff(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS prepared_by_staff_id uuid
  REFERENCES restaurant_staff(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created ON orders (restaurant_id, created_at);

-- Ordini già esistenti: ricava la provenienza dalla cronologia (evento "created")
UPDATE orders o SET source = CASE
    WHEN o.order_type = 'counter' THEN 'cassa'
    WHEN t.event_source = 'public_menu' OR t.created_by_type = 'customer' THEN 'menu'
    WHEN t.staff_id IS NOT NULL OR o.created_by_staff_id IS NOT NULL OR o.confirmed_by IS NOT NULL THEN 'staff'
    WHEN t.created_by_type = 'owner' THEN 'cassa'
    ELSE NULL END
FROM (SELECT DISTINCT ON (order_id) order_id, event_source, created_by_type, staff_id
      FROM order_timeline WHERE action = 'created' ORDER BY order_id, created_at) t
WHERE t.order_id = o.id AND o.source IS NULL;

UPDATE orders SET source = 'cassa' WHERE source IS NULL AND order_type = 'counter';

-- Ordini presi dal cameriere con la versione precedente dell'app: il creatore era solo nel vecchio
-- campo confirmed_by (scritto alla creazione) o nella cronologia
UPDATE orders o SET created_by_staff_id = coalesce(o.confirmed_by, t.staff_id)
FROM (SELECT DISTINCT ON (order_id) order_id, staff_id
      FROM order_timeline WHERE action = 'created' ORDER BY order_id, created_at) t
WHERE t.order_id = o.id AND o.source = 'staff' AND o.created_by_staff_id IS NULL
  AND coalesce(o.confirmed_by, t.staff_id) IS NOT NULL;

-- Provenienza di riserva per chi non la indica (es. app non ancora aggiornata sul telefono):
-- banco = cassa; cameriere = ha il vecchio confirmed_by; titolare collegato = cassa; altrimenti cliente dal QR
CREATE OR REPLACE FUNCTION orders_default_source()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.source IS NULL THEN
    NEW.source := CASE
      WHEN NEW.order_type = 'counter' THEN 'cassa'
      WHEN NEW.created_by_staff_id IS NOT NULL OR NEW.confirmed_by IS NOT NULL THEN 'staff'
      WHEN auth.uid() IS NOT NULL THEN 'cassa'
      ELSE 'menu' END;
  END IF;
  IF NEW.source = 'staff' AND NEW.created_by_staff_id IS NULL AND NEW.confirmed_by IS NOT NULL THEN
    NEW.created_by_staff_id := NEW.confirmed_by;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_orders_default_source ON orders;
CREATE TRIGGER trg_orders_default_source BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION orders_default_source();

-- Report del servizio per la pagina "Staff e servizio" (titolare o super admin).
-- Tempi in secondi. Periodo sulle date italiane di creazione dell'ordine.
CREATE OR REPLACE FUNCTION service_report(p_restaurant_id uuid, p_start date, p_end date)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT (EXISTS (SELECT 1 FROM restaurants WHERE id = p_restaurant_id AND user_id = auth.uid()) OR is_super_admin()) THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;

  WITH
  base AS (
    SELECT o.*,
      (o.created_at AT TIME ZONE 'Europe/Rome') AS local_ts,
      CASE WHEN o.order_type = 'counter' THEN 'banco'
           ELSE coalesce(o.source, CASE WHEN o.created_by_staff_id IS NOT NULL THEN 'staff' ELSE 'menu' END)
      END AS channel,
      (o.deleted_at IS NOT NULL OR o.status = 'cancelled') AS is_void
    FROM orders o
    WHERE o.restaurant_id = p_restaurant_id
      AND (o.created_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_start AND p_end
  ),
  -- comande (batch) dei tavoli: partenza = invio in cucina, oppure approvazione per la prima comanda
  batches AS (
    SELECT oi.order_id, oi.batch_number,
      min(coalesce(oi.sent_at, b.confirmed_at, b.created_at)) AS started_at,
      max(oi.prepared_at) AS prepared_at,
      (array_agg(oi.prepared_by_staff_id) FILTER (WHERE oi.prepared_by_staff_id IS NOT NULL))[1] AS prepared_by,
      (array_agg(oi.added_by_staff_id) FILTER (WHERE oi.added_by_staff_id IS NOT NULL))[1] AS added_by,
      sum(oi.quantity) AS pezzi
    FROM order_items oi JOIN base b ON b.id = oi.order_id
    WHERE NOT b.is_void AND b.order_type = 'table'
    GROUP BY oi.order_id, oi.batch_number
  ),
  -- tempo di preparazione: escluse le comande segnate "pronte" all'istante (meno di 10 s: segnatura
  -- automatica di prima o comanda già pronta), che non misurano una vera preparazione
  bt AS (
    SELECT bb.*,
      CASE WHEN bb.prepared_at IS NOT NULL AND bb.prepared_at - bb.started_at >= interval '10 seconds'
                AND bb.prepared_at - bb.started_at < interval '4 hours'
           THEN extract(epoch FROM bb.prepared_at - bb.started_at) END AS prep_sec,
      extract(hour FROM bb.started_at AT TIME ZONE 'Europe/Rome')::int AS hour,
      extract(hour FROM bb.prepared_at AT TIME ZONE 'Europe/Rome')::int AS prep_hour
    FROM batches bb
  ),
  items AS (
    SELECT oi.order_id, sum(oi.quantity) AS pezzi, count(*) AS righe, count(DISTINCT oi.batch_number) AS comande
    FROM order_items oi JOIN base b ON b.id = oi.order_id
    GROUP BY oi.order_id
  ),
  o AS (
    SELECT b.*,
      coalesce(i.pezzi, 0) AS pezzi, coalesce(i.righe, 0) AS righe, coalesce(i.comande, 0) AS comande,
      (b.status = 'completed' AND b.deleted_at IS NULL AND coalesce(b.payment_status, 'paid') <> 'unpaid') AS is_paid,
      extract(hour FROM b.local_ts)::int AS hour,
      extract(isodow FROM b.local_ts)::int AS weekday,
      extract(hour FROM b.confirmed_at AT TIME ZONE 'Europe/Rome')::int AS confirmed_hour,
      extract(hour FROM b.closed_at AT TIME ZONE 'Europe/Rome')::int AS closed_hour,
      extract(hour FROM coalesce(b.deleted_at, b.updated_at, b.created_at) AT TIME ZONE 'Europe/Rome')::int AS void_hour,
      -- rifiutato dallo staff: ordine dal QR annullato senza approvazione (non le pulizie tecniche)
      (b.status = 'cancelled' AND b.confirmed_at IS NULL AND b.channel = 'menu'
        AND coalesce(b.metadata->>'discarded', '') = '') AS is_rejected,
      CASE WHEN b.channel = 'menu' AND b.confirmed_at IS NOT NULL AND b.confirmed_at >= b.created_at
                AND b.confirmed_at - b.created_at < interval '3 hours'
           THEN extract(epoch FROM b.confirmed_at - b.created_at) END AS approval_sec,
      CASE WHEN b.order_type = 'table' AND b.status = 'completed' AND b.closed_at > b.created_at
                AND b.closed_at - b.created_at < interval '12 hours'
           THEN extract(epoch FROM b.closed_at - b.created_at) END AS stay_sec,
      (SELECT extract(epoch FROM min(x.prepared_at) - b.created_at) FROM bt x
        WHERE x.order_id = b.id AND x.prep_sec IS NOT NULL) AS first_ready_sec
    FROM base b LEFT JOIN items i ON i.order_id = b.id
  ),
  ok AS (SELECT * FROM o WHERE NOT is_void),
  staff AS (
    SELECT s.id::text AS key, s.name, coalesce(r.name, CASE s.role_legacy WHEN 'manager' THEN 'Manager' ELSE 'Staff' END) AS role, s.is_active
    FROM restaurant_staff s LEFT JOIN staff_roles r ON r.id = s.primary_role_id
    WHERE s.restaurant_id = p_restaurant_id
  ),
  -- ogni azione attribuita a una persona: id dello staff oppure 'owner' (titolare)
  acts AS (
    SELECT coalesce(created_by_staff_id::text, 'owner') AS key, 'preso' AS kind, id AS order_id, hour,
           pezzi::numeric AS pezzi, CASE WHEN is_paid THEN total_amount ELSE 0 END AS amount, NULL::numeric AS sec
      FROM ok WHERE channel <> 'menu'
    UNION ALL
    SELECT coalesce(confirmed_by_staff_id::text, 'owner'), 'approvato', id, confirmed_hour, pezzi, 0, approval_sec
      FROM ok WHERE channel = 'menu' AND confirmed_at IS NOT NULL
    UNION ALL
    SELECT coalesce(x.added_by::text, 'owner'), 'comanda', x.order_id, x.hour, x.pezzi, 0, NULL
      FROM bt x WHERE x.batch_number > 1
    UNION ALL
    -- conta chi ha preparato anche le comande pronte all'istante (il tempo resta escluso dalla media);
    -- fuori solo le vecchie segnature automatiche senza persona
    SELECT coalesce(x.prepared_by::text, 'owner'), 'preparata', x.order_id, x.prep_hour, x.pezzi, 0, x.prep_sec
      FROM bt x WHERE x.prepared_at IS NOT NULL AND (x.prep_sec IS NOT NULL OR x.prepared_by IS NOT NULL)
    UNION ALL
    SELECT coalesce(closed_by_staff_id::text, 'owner'), 'chiuso', id, closed_hour, pezzi,
           CASE WHEN is_paid THEN total_amount ELSE 0 END, NULL
      FROM ok WHERE order_type = 'table' AND status = 'completed' AND closed_at IS NOT NULL
    UNION ALL
    SELECT coalesce(closed_by_staff_id::text, 'owner'), 'non_pagato', id, closed_hour, pezzi,
           coalesce((metadata->>'lost_amount')::numeric, total_amount), NULL
      FROM ok WHERE payment_status = 'unpaid'
    UNION ALL
    SELECT coalesce(modified_by_staff_id::text, 'owner'), 'rifiutato', id, void_hour, pezzi, 0, NULL
      FROM o WHERE is_rejected
  ),
  people AS (
    SELECT a.key,
      coalesce(s.name, CASE WHEN a.key = 'owner' THEN 'Titolare' ELSE 'Staff rimosso' END) AS name,
      coalesce(s.role, CASE WHEN a.key = 'owner' THEN 'Titolare' ELSE '' END) AS role,
      count(*) FILTER (WHERE kind = 'preso') AS presi,
      coalesce(sum(amount) FILTER (WHERE kind = 'preso'), 0) AS presi_incasso,
      coalesce(sum(pezzi) FILTER (WHERE kind = 'preso'), 0) AS presi_pezzi,
      count(*) FILTER (WHERE kind = 'approvato') AS approvati,
      avg(sec) FILTER (WHERE kind = 'approvato') AS approvazione_media,
      count(*) FILTER (WHERE kind = 'comanda') AS comande,
      coalesce(sum(pezzi) FILTER (WHERE kind = 'comanda'), 0) AS comande_pezzi,
      count(*) FILTER (WHERE kind = 'preparata') AS preparate,
      avg(sec) FILTER (WHERE kind = 'preparata') AS preparazione_media,
      count(*) FILTER (WHERE kind = 'chiuso') AS chiusi,
      coalesce(sum(amount) FILTER (WHERE kind = 'chiuso'), 0) AS chiusi_incasso,
      count(*) FILTER (WHERE kind = 'non_pagato') AS non_pagati,
      coalesce(sum(amount) FILTER (WHERE kind = 'non_pagato'), 0) AS non_pagati_importo,
      count(*) FILTER (WHERE kind = 'rifiutato') AS rifiutati,
      count(DISTINCT order_id) FILTER (WHERE kind IN ('preso', 'approvato')) AS gestiti
    FROM acts a LEFT JOIN staff s ON s.key = a.key
    GROUP BY a.key, s.name, s.role
  ),
  stats AS (
    SELECT
      (SELECT json_build_object('n', count(approval_sec), 'avg', avg(approval_sec),
         'median', percentile_cont(0.5) WITHIN GROUP (ORDER BY approval_sec),
         'p90', percentile_cont(0.9) WITHIN GROUP (ORDER BY approval_sec)) FROM ok) AS approval,
      (SELECT json_build_object('n', count(prep_sec), 'avg', avg(prep_sec),
         'median', percentile_cont(0.5) WITHIN GROUP (ORDER BY prep_sec),
         'p90', percentile_cont(0.9) WITHIN GROUP (ORDER BY prep_sec)) FROM bt) AS prep,
      (SELECT json_build_object('n', count(first_ready_sec), 'avg', avg(first_ready_sec),
         'median', percentile_cont(0.5) WITHIN GROUP (ORDER BY first_ready_sec),
         'p90', percentile_cont(0.9) WITHIN GROUP (ORDER BY first_ready_sec)) FROM ok) AS first_ready,
      (SELECT json_build_object('n', count(stay_sec), 'avg', avg(stay_sec),
         'median', percentile_cont(0.5) WITHIN GROUP (ORDER BY stay_sec),
         'p90', percentile_cont(0.9) WITHIN GROUP (ORDER BY stay_sec)) FROM ok) AS stay
  )
  SELECT json_build_object(
    'totals', (SELECT json_build_object(
        'orders', count(*),
        'revenue', coalesce(sum(total_amount) FILTER (WHERE is_paid), 0),
        'paid_orders', count(*) FILTER (WHERE is_paid),
        'pezzi', coalesce(sum(pezzi), 0),
        'pezzi_medi', avg(pezzi),
        'righe_medie', avg(righe),
        'comande_medie', avg(comande) FILTER (WHERE order_type = 'table'),
        'tavoli', count(*) FILTER (WHERE order_type = 'table'),
        'banco', count(*) FILTER (WHERE order_type = 'counter'),
        'aperti', count(*) FILTER (WHERE status IN ('pending', 'confirmed', 'preparing')),
        'non_pagati', count(*) FILTER (WHERE payment_status = 'unpaid'),
        'importo_perso', coalesce(sum(coalesce((metadata->>'lost_amount')::numeric, total_amount)) FILTER (WHERE payment_status = 'unpaid'), 0),
        'rifiutati', (SELECT count(*) FROM o WHERE is_rejected),
        'annullati', (SELECT count(*) FROM o WHERE is_void)
      ) FROM ok),
    'timings', (SELECT json_build_object('approval', approval, 'prep', prep, 'first_ready', first_ready, 'stay', stay) FROM stats),
    'by_channel', (SELECT coalesce(json_agg(x ORDER BY x.orders DESC), '[]'::json) FROM (
        SELECT channel, count(*) AS orders,
          coalesce(sum(total_amount) FILTER (WHERE is_paid), 0) AS revenue,
          count(*) FILTER (WHERE is_paid) AS paid_orders,
          avg(pezzi) AS pezzi_medi, avg(approval_sec) AS approvazione_media,
          avg(first_ready_sec) AS primo_pronto_medio, avg(stay_sec) AS permanenza_media
        FROM ok GROUP BY channel) x),
    'by_staff', (SELECT coalesce(json_agg(p ORDER BY p.gestiti DESC, p.chiusi DESC), '[]'::json) FROM people p),
    -- ordini per ora di arrivo, comande per ora di partenza: anche le ore con sole comande in preparazione
    'by_hour', (SELECT coalesce(json_agg(x ORDER BY x.hour), '[]'::json) FROM (
        SELECT coalesce(h.hour, p.hour) AS hour, coalesce(h.orders, 0) AS orders, coalesce(h.pezzi, 0) AS pezzi,
               coalesce(h.revenue, 0) AS revenue, h.approvazione_media, coalesce(h.approvazioni, 0) AS approvazioni,
               p.preparazione_media, coalesce(p.comande, 0) AS comande
        FROM (SELECT hour, count(*) AS orders, sum(pezzi) AS pezzi,
                coalesce(sum(total_amount) FILTER (WHERE is_paid), 0) AS revenue,
                avg(approval_sec) AS approvazione_media, count(approval_sec) AS approvazioni
              FROM ok GROUP BY hour) h
        FULL JOIN (SELECT hour, avg(prep_sec) AS preparazione_media, count(prep_sec) AS comande
                   FROM bt WHERE prep_sec IS NOT NULL GROUP BY hour) p ON p.hour = h.hour) x),
    'by_weekday', (SELECT coalesce(json_agg(x ORDER BY x.weekday), '[]'::json) FROM (
        SELECT weekday, count(*) AS orders, sum(pezzi) AS pezzi,
          coalesce(sum(total_amount) FILTER (WHERE is_paid), 0) AS revenue, avg(approval_sec) AS approvazione_media,
          count(approval_sec) AS approvazioni
        FROM ok GROUP BY weekday) x),
    'by_staff_hour', (SELECT coalesce(json_agg(x), '[]'::json) FROM (
        SELECT key, hour, count(DISTINCT order_id) AS orders
        FROM acts WHERE kind IN ('preso', 'approvato', 'comanda', 'chiuso') GROUP BY key, hour) x),
    'prep_buckets', (SELECT coalesce(json_agg(x ORDER BY x.ord), '[]'::json) FROM (
        SELECT CASE WHEN prep_sec < 300 THEN 1 WHEN prep_sec < 600 THEN 2 WHEN prep_sec < 900 THEN 3
                    WHEN prep_sec < 1200 THEN 4 WHEN prep_sec < 1800 THEN 5 ELSE 6 END AS ord,
               count(*) AS comande
        FROM bt WHERE prep_sec IS NOT NULL GROUP BY 1) x),
    'approval_buckets', (SELECT coalesce(json_agg(x ORDER BY x.ord), '[]'::json) FROM (
        SELECT CASE WHEN approval_sec < 60 THEN 1 WHEN approval_sec < 180 THEN 2 WHEN approval_sec < 300 THEN 3
                    WHEN approval_sec < 600 THEN 4 ELSE 5 END AS ord,
               count(*) AS ordini
        FROM ok WHERE approval_sec IS NOT NULL GROUP BY 1) x),
    'slowest', (SELECT coalesce(json_agg(x ORDER BY x.prep_sec DESC), '[]'::json) FROM (
        SELECT b.order_number, b.table_number, x.batch_number, x.prep_sec, x.pezzi,
               to_char(x.started_at AT TIME ZONE 'Europe/Rome', 'DD/MM HH24:MI') AS quando,
               coalesce(s.name, 'Titolare') AS preparato_da, b.channel
        FROM bt x JOIN base b ON b.id = x.order_id LEFT JOIN staff s ON s.key = x.prepared_by::text
        WHERE x.prep_sec IS NOT NULL
        ORDER BY x.prep_sec DESC LIMIT 8) x)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION service_report(uuid, date, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION service_report(uuid, date, date) TO authenticated;
