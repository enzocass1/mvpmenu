-- =====================================================
-- MIGRATION: Timeline Event Source Tracking
-- Data: 2025-10-27
-- Descrizione: Aggiunge tracking fonte evento per timeline ordini
--              Implementa sistema CRM-style per tracciare:
--              - Fonte evento (public_menu, table_service, counter, orders_page, cashier)
--              - UI enhancement (is_expandable, details_summary)
-- =====================================================
-- Riferimento: docs/TIMELINE_ENHANCEMENT_PROJECT.md
-- =====================================================

BEGIN;

-- =====================================================
-- 1. AGGIUNGI EVENT_SOURCE COLUMN
-- =====================================================

ALTER TABLE order_timeline
ADD COLUMN IF NOT EXISTS event_source VARCHAR(50);

-- Constraint per valori validi
ALTER TABLE order_timeline
DROP CONSTRAINT IF EXISTS order_timeline_event_source_check;

ALTER TABLE order_timeline
ADD CONSTRAINT order_timeline_event_source_check
CHECK (event_source IN (
  'public_menu',    -- Cliente ordina da QR code (menu pubblico)
  'table_service',  -- Staff gestisce tavolo (apertura, conferma, modifiche)
  'counter',        -- Ordine banco/asporto
  'orders_page',    -- Modifiche da sezione Gestione Ordini
  'cashier',        -- Operazioni cassa (completamento, scontrini)
  'system'          -- Eventi automatici/sistema
));

-- Indice per analytics e performance
CREATE INDEX IF NOT EXISTS idx_order_timeline_event_source
ON order_timeline(event_source, created_at)
WHERE event_source IS NOT NULL;

-- Indice composito per queries comuni
CREATE INDEX IF NOT EXISTS idx_order_timeline_source_action
ON order_timeline(event_source, action, created_at)
WHERE event_source IS NOT NULL;

-- Commento
COMMENT ON COLUMN order_timeline.event_source IS 'Fonte evento: public_menu (QR cliente), table_service (gestione tavoli), counter (banco), orders_page (gestione ordini), cashier (cassa), system (automatico)';

-- =====================================================
-- 2. AGGIUNGI UI ENHANCEMENT COLUMNS
-- =====================================================

-- is_expandable: indica se l'evento ha dettagli espandibili nella UI
ALTER TABLE order_timeline
ADD COLUMN IF NOT EXISTS is_expandable BOOLEAN DEFAULT false;

-- details_summary: sommario breve dei dettagli per preview
ALTER TABLE order_timeline
ADD COLUMN IF NOT EXISTS details_summary TEXT;

-- Indice per performance UI
CREATE INDEX IF NOT EXISTS idx_order_timeline_expandable
ON order_timeline(is_expandable, created_at)
WHERE is_expandable = true;

-- Commenti
COMMENT ON COLUMN order_timeline.is_expandable IS 'Se true, evento ha dettagli espandibili con toggle nella UI';
COMMENT ON COLUMN order_timeline.details_summary IS 'Sommario breve dettagli per preview (es: "Pizza Margherita x1, Coca Cola x2")';

-- =====================================================
-- 3. POPOLA event_source PER RECORD ESISTENTI
-- =====================================================

-- Logica intelligente basata su created_by_type e action
UPDATE order_timeline
SET event_source = CASE
  -- Cliente da QR menu
  WHEN created_by_type = 'customer' THEN 'public_menu'

  -- Operazioni cassa
  WHEN action IN ('completed', 'preconto_generated') THEN 'cashier'

  -- Sistema automatico
  WHEN created_by_type = 'system' THEN 'system'

  -- Default: table_service per staff/owner
  WHEN created_by_type IN ('staff', 'owner') THEN 'table_service'

  -- Fallback
  ELSE 'system'
END
WHERE event_source IS NULL;

-- =====================================================
-- 4. POPOLA is_expandable PER RECORD ESISTENTI
-- =====================================================

-- Eventi che hanno dettagli nel campo changes
UPDATE order_timeline
SET is_expandable = true
WHERE changes IS NOT NULL
  AND changes::text != '{}'
  AND changes::text != 'null'
  AND is_expandable = false;

-- =====================================================
-- 5. GENERA details_summary PER RECORD ESISTENTI
-- =====================================================

-- Per item_added: lista prodotti
UPDATE order_timeline
SET details_summary = (
  SELECT string_agg(
    format('%s (x%s)', p->>'name', p->>'qty'),
    ', '
  )
  FROM jsonb_array_elements(changes->'products') AS p
)
WHERE action = 'item_added'
  AND changes ? 'products'
  AND details_summary IS NULL;

-- Per item_removed: prodotto rimosso
UPDATE order_timeline
SET details_summary = format(
  '%s (x%s)',
  changes->>'product_name',
  changes->>'quantity'
)
WHERE action = 'item_removed'
  AND changes ? 'product_name'
  AND details_summary IS NULL;

-- Per table_changed: da tavolo X a tavolo Y
UPDATE order_timeline
SET details_summary = format(
  'Da %s T%s → %s T%s',
  COALESCE(changes->>'old_room_name', 'Sala'),
  changes->>'old_table_number',
  COALESCE(changes->>'new_room_name', 'Sala'),
  changes->>'new_table_number'
)
WHERE action = 'table_changed'
  AND changes ? 'new_table_number'
  AND details_summary IS NULL;

-- =====================================================
-- 6. VIEWS ANALYTICS - Event Source Performance
-- =====================================================

-- View: Performance per fonte evento
CREATE OR REPLACE VIEW v_timeline_source_analytics AS
SELECT
  ot.event_source,
  o.restaurant_id,

  -- Conteggi per tipo azione
  COUNT(*) as total_events,
  COUNT(DISTINCT ot.order_id) as unique_orders,
  COUNT(DISTINCT CASE WHEN ot.action = 'created' THEN ot.order_id END) as orders_created,
  COUNT(DISTINCT CASE WHEN ot.action = 'completed' THEN ot.order_id END) as orders_completed,

  -- Metriche prodotti
  COUNT(CASE WHEN ot.action = 'item_added' THEN 1 END) as items_added_events,
  COUNT(CASE WHEN ot.action = 'item_removed' THEN 1 END) as items_removed_events,

  -- Metriche tavoli
  COUNT(CASE WHEN ot.action = 'table_changed' THEN 1 END) as table_changes,

  -- Revenue (solo per completed)
  SUM(CASE WHEN ot.action = 'completed' THEN o.total_amount ELSE 0 END) as total_revenue,

  -- Temporal
  MIN(ot.created_at) as first_event_date,
  MAX(ot.created_at) as last_event_date,
  COUNT(DISTINCT DATE(ot.created_at)) as active_days

FROM order_timeline ot
JOIN orders o ON ot.order_id = o.id
WHERE o.deleted_at IS NULL
  AND ot.event_source IS NOT NULL
GROUP BY ot.event_source, o.restaurant_id;

COMMENT ON VIEW v_timeline_source_analytics IS 'Analytics per fonte evento - tracking efficacia canali (QR menu, tavoli, banco, etc.)';

-- View: Distribuzione eventi per fonte e azione
CREATE OR REPLACE VIEW v_timeline_source_action_matrix AS
SELECT
  ot.event_source,
  ot.action,
  o.restaurant_id,
  COUNT(*) as event_count,
  COUNT(DISTINCT ot.order_id) as unique_orders,
  COUNT(DISTINCT ot.staff_id) as unique_operators
  -- Nota: avg_minutes_to_next_event rimosso per evitare errore window function in aggregate
  -- Può essere calcolato con query separata se necessario
FROM order_timeline ot
JOIN orders o ON ot.order_id = o.id
WHERE o.deleted_at IS NULL
  AND ot.event_source IS NOT NULL
GROUP BY ot.event_source, ot.action, o.restaurant_id;

COMMENT ON VIEW v_timeline_source_action_matrix IS 'Matrice fonte x azione per analisi workflow';

-- =====================================================
-- 7. FUNZIONE HELPER - Get Event Source Label
-- =====================================================

CREATE OR REPLACE FUNCTION get_event_source_label(p_event_source VARCHAR)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE p_event_source
    WHEN 'public_menu' THEN 'Menu Pubblico (QR)'
    WHEN 'table_service' THEN 'Servizio Tavoli'
    WHEN 'counter' THEN 'Banco'
    WHEN 'orders_page' THEN 'Gestione Ordini'
    WHEN 'cashier' THEN 'Cassa'
    WHEN 'system' THEN 'Sistema'
    ELSE p_event_source
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_event_source_label IS 'Ritorna label UI per event_source con emoji';

COMMIT;

-- =====================================================
-- VERIFICA FINALE
-- =====================================================

-- Query di test: mostra nuove colonne
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'order_timeline'
  AND column_name IN ('event_source', 'is_expandable', 'details_summary')
ORDER BY ordinal_position;

-- Query di test: conta record per event_source
SELECT
  event_source,
  get_event_source_label(event_source) as label,
  COUNT(*) as count,
  COUNT(CASE WHEN is_expandable THEN 1 END) as expandable_count
FROM order_timeline
GROUP BY event_source
ORDER BY count DESC;

-- Query di test: sample records con nuovi campi
SELECT
  id,
  action,
  event_source,
  get_event_source_label(event_source) as source_label,
  is_expandable,
  details_summary,
  created_at
FROM order_timeline
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- LOG SUCCESS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATION COMPLETATA CON SUCCESSO!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Colonne aggiunte:';
  RAISE NOTICE '  - event_source (VARCHAR(50) con CHECK constraint)';
  RAISE NOTICE '  - is_expandable (BOOLEAN default false)';
  RAISE NOTICE '  - details_summary (TEXT)';
  RAISE NOTICE '';
  RAISE NOTICE 'Indici creati:';
  RAISE NOTICE '  - idx_order_timeline_event_source';
  RAISE NOTICE '  - idx_order_timeline_source_action';
  RAISE NOTICE '  - idx_order_timeline_expandable';
  RAISE NOTICE '';
  RAISE NOTICE 'Views analytics create:';
  RAISE NOTICE '  - v_timeline_source_analytics';
  RAISE NOTICE '  - v_timeline_source_action_matrix';
  RAISE NOTICE '';
  RAISE NOTICE 'Funzioni helper:';
  RAISE NOTICE '  - get_event_source_label(event_source)';
  RAISE NOTICE '';
  RAISE NOTICE 'Record esistenti aggiornati:';
  RAISE NOTICE '  - event_source popolato con logica intelligente';
  RAISE NOTICE '  - is_expandable settato per eventi con changes';
  RAISE NOTICE '  - details_summary generato per item_added/removed/table_changed';
  RAISE NOTICE '';
  RAISE NOTICE 'Prossimo step:';
  RAISE NOTICE '  → Creare src/lib/timelineService.js';
  RAISE NOTICE '  → Vedere docs/TIMELINE_ENHANCEMENT_PROJECT.md';
  RAISE NOTICE '========================================';
END $$;
