-- ===================================================================
-- MIGRAZIONE COMPLETA: Sistema Cassa e Gestione Tavoli
-- ===================================================================
-- Implementa il sistema completo di cassa con gestione tavoli e banco
-- come specificato in database/docs/SISTEMA_CASSA_TAVOLI_SPEC.md
-- ===================================================================

-- ============================================
-- PARTE 1: MODIFICHE TABELLA ORDERS
-- ============================================

-- 1.1 Aggiungi campo tipo ordine (tavolo o banco)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS order_type VARCHAR(10) DEFAULT 'table'
CHECK (order_type IN ('table', 'counter'));

COMMENT ON COLUMN orders.order_type IS 'Tipo di ordine: table (al tavolo) o counter (al banco)';

-- 1.2 Aggiungi numero ordine progressivo globale per ristorante
-- NOTA: Non usiamo SERIAL perché deve essere per ristorante
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS order_number INTEGER;

COMMENT ON COLUMN orders.order_number IS 'Numero ordine progressivo globale per ristorante (es. #1, #2, #3...)';

-- 1.3 Aggiungi riferimento al tavolo (foreign key alla tabella tables)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS table_id UUID REFERENCES tables(id) ON DELETE SET NULL;

COMMENT ON COLUMN orders.table_id IS 'Riferimento al tavolo specifico (foreign key a tables)';

-- 1.4 Aggiungi riferimento alla stanza (per ordini al tavolo)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id) ON DELETE SET NULL;

COMMENT ON COLUMN orders.room_id IS 'Sala/stanza in cui si trova il tavolo (per ordini al tavolo)';

-- 1.5 Aggiungi timestamp di apertura tavolo (quando passa da pending ad active)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN orders.opened_at IS 'Timestamp quando il tavolo viene aperto (conferma ordine e passa ad active)';

-- 1.6 Aggiungi timestamp di chiusura tavolo
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN orders.closed_at IS 'Timestamp quando il tavolo viene chiuso (scontrino emesso)';

-- 1.7 Aggiungi soft delete
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN orders.deleted_at IS 'Timestamp di eliminazione logica (soft delete) - NULL se attivo';

-- 1.8 Aggiungi tracking staff - chi ha creato l'ordine
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS created_by_staff_id UUID REFERENCES restaurant_staff(id) ON DELETE SET NULL;

COMMENT ON COLUMN orders.created_by_staff_id IS 'Staff che ha creato l''ordine (per ordini da staff o al banco)';

-- 1.9 Aggiungi tracking staff - chi ha confermato l'ordine
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS confirmed_by_staff_id UUID REFERENCES restaurant_staff(id) ON DELETE SET NULL;

COMMENT ON COLUMN orders.confirmed_by_staff_id IS 'Staff che ha confermato l''ordine (passa da pending ad active)';

-- 1.10 Aggiungi tracking staff - ultima modifica
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS modified_by_staff_id UUID REFERENCES restaurant_staff(id) ON DELETE SET NULL;

COMMENT ON COLUMN orders.modified_by_staff_id IS 'Ultimo staff che ha modificato l''ordine (aggiunte, eliminazioni)';

-- 1.11 Aggiungi timestamp di ultima modifica
-- (già esiste come updated_at, ma assicuriamoci)
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 1.12 Aggiungi importo priority order (costo servizio priority accumulato)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS priority_order_amount DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN orders.priority_order_amount IS 'Importo totale del servizio priority order (accumula se richiesto più volte)';

-- 1.13 Aggiungi metadati aggiuntivi in JSONB
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN orders.metadata IS 'Metadati aggiuntivi (preconto_generated, numero_scontrino, etc.)';


-- ============================================
-- PARTE 2: MODIFICHE TABELLA ORDER_ITEMS
-- ============================================

-- 2.1 Aggiungi numero batch/ondata
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS batch_number INTEGER DEFAULT 1;

COMMENT ON COLUMN order_items.batch_number IS 'Numero dell''ondata/batch di prodotti (1, 2, 3...) - NON si ricompatta mai';

-- 2.2 Aggiungi flag preparato (per staff)
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS prepared BOOLEAN DEFAULT false;

COMMENT ON COLUMN order_items.prepared IS 'Se true, lo staff ha marcato il prodotto come preparato';

-- 2.3 Aggiungi timestamp preparazione
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS prepared_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN order_items.prepared_at IS 'Timestamp quando il prodotto è stato marcato come preparato';

-- 2.4 Aggiungi tracking staff - chi ha aggiunto il prodotto
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS added_by_staff_id UUID REFERENCES restaurant_staff(id) ON DELETE SET NULL;

COMMENT ON COLUMN order_items.added_by_staff_id IS 'Staff che ha aggiunto questo prodotto all''ordine';


-- ============================================
-- PARTE 3: INDICI PER PERFORMANCE
-- ============================================

-- 3.1 Indice per trovare rapidamente ordini di un ristorante
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id) WHERE deleted_at IS NULL;

-- 3.2 Indice per ordini per tipo
CREATE INDEX IF NOT EXISTS idx_orders_type ON orders(order_type) WHERE deleted_at IS NULL;

-- 3.3 Indice per ordini per tavolo
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id) WHERE deleted_at IS NULL;

-- 3.4 Indice per ordini per stanza
CREATE INDEX IF NOT EXISTS idx_orders_room_id ON orders(room_id) WHERE deleted_at IS NULL;

-- 3.5 Indice per ordini non eliminati
CREATE INDEX IF NOT EXISTS idx_orders_not_deleted ON orders(id) WHERE deleted_at IS NULL;

-- 3.6 Indice per ordini in attesa di conferma
CREATE INDEX IF NOT EXISTS idx_orders_pending ON orders(restaurant_id, status)
WHERE status = 'pending' AND deleted_at IS NULL;

-- 3.7 Indice per ordini attivi
CREATE INDEX IF NOT EXISTS idx_orders_active ON orders(restaurant_id, status)
WHERE status = 'preparing' AND deleted_at IS NULL;

-- 3.8 Indice per numero ordine (per ricerca rapida)
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(restaurant_id, order_number);

-- 3.9 Indice per data creazione (per filtri temporali)
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(restaurant_id, created_at DESC);

-- 3.10 Indice su batch_number in order_items
CREATE INDEX IF NOT EXISTS idx_order_items_batch ON order_items(order_id, batch_number);

-- 3.11 Indice su prodotti preparati
CREATE INDEX IF NOT EXISTS idx_order_items_prepared ON order_items(order_id, prepared);

-- 3.12 Indice GIN su metadata per query JSONB
CREATE INDEX IF NOT EXISTS idx_orders_metadata_gin ON orders USING GIN (metadata);


-- ============================================
-- PARTE 4: FUNZIONE AUTO-INCREMENT ORDER_NUMBER
-- ============================================

CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Se order_number non è già impostato, calcola il prossimo
  IF NEW.order_number IS NULL THEN
    SELECT COALESCE(MAX(order_number), 0) + 1
    INTO NEW.order_number
    FROM orders
    WHERE restaurant_id = NEW.restaurant_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_order_number() IS 'Imposta automaticamente il numero ordine progressivo per ristorante';

-- Crea trigger
DROP TRIGGER IF EXISTS trigger_set_order_number ON orders;
CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();


-- ============================================
-- PARTE 5: FUNZIONE AUTO-SET OPENED_AT
-- ============================================

CREATE OR REPLACE FUNCTION set_opened_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando lo status passa a 'preparing' e opened_at è NULL, impostalo
  IF NEW.status = 'preparing' AND OLD.status != 'preparing' AND NEW.opened_at IS NULL THEN
    NEW.opened_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_opened_at() IS 'Imposta automaticamente opened_at quando l''ordine passa a preparing';

-- Crea trigger
DROP TRIGGER IF EXISTS trigger_set_opened_at ON orders;
CREATE TRIGGER trigger_set_opened_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_opened_at();


-- ============================================
-- PARTE 6: FUNZIONE AUTO-SET CLOSED_AT
-- ============================================

CREATE OR REPLACE FUNCTION set_closed_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando lo status passa a 'completed' e closed_at è NULL, impostalo
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.closed_at IS NULL THEN
    NEW.closed_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_closed_at() IS 'Imposta automaticamente closed_at quando l''ordine passa a completed';

-- Crea trigger
DROP TRIGGER IF EXISTS trigger_set_closed_at ON orders;
CREATE TRIGGER trigger_set_closed_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_closed_at();


-- ============================================
-- PARTE 7: FUNZIONE AUTO-MARK PREPARED
-- ============================================

CREATE OR REPLACE FUNCTION auto_mark_prepared_on_confirm()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando un ordine viene confermato (passa a preparing), marca tutti i prodotti come preparati
  IF NEW.status = 'preparing' AND OLD.status = 'pending' THEN
    UPDATE order_items
    SET prepared = true,
        prepared_at = NOW()
    WHERE order_id = NEW.id
      AND prepared = false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_mark_prepared_on_confirm() IS 'Marca automaticamente tutti i prodotti come preparati quando l''ordine viene confermato';

-- Crea trigger
DROP TRIGGER IF EXISTS trigger_auto_mark_prepared ON orders;
CREATE TRIGGER trigger_auto_mark_prepared
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_mark_prepared_on_confirm();


-- ============================================
-- PARTE 8: VIEW PER STATISTICHE CASSA
-- ============================================

CREATE OR REPLACE VIEW v_cassa_statistics AS
SELECT
  o.restaurant_id,
  o.order_type,
  o.status,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT CASE WHEN o.status = 'pending' THEN o.id END) as pending_orders,
  COUNT(DISTINCT CASE WHEN o.status = 'preparing' THEN o.id END) as active_orders,
  COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END) as completed_orders,
  COALESCE(SUM(o.total_amount), 0) as total_revenue,
  COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total_amount ELSE 0 END), 0) as completed_revenue,
  COALESCE(AVG(CASE WHEN o.closed_at IS NOT NULL AND o.opened_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (o.closed_at - o.opened_at)) END), 0) as avg_service_time_seconds
FROM orders o
WHERE o.deleted_at IS NULL
GROUP BY o.restaurant_id, o.order_type, o.status;

COMMENT ON VIEW v_cassa_statistics IS 'Statistiche aggregate per il sistema cassa (tavoli e banco)';

-- Grant permissions
GRANT SELECT ON v_cassa_statistics TO authenticated;


-- ============================================
-- PARTE 9: VIEW PER ORDINI ATTIVI CON DETTAGLI
-- ============================================

CREATE OR REPLACE VIEW v_active_orders AS
SELECT
  o.id,
  o.restaurant_id,
  o.order_number,
  o.order_type,
  o.status,
  o.table_id,
  t.number as table_number,
  o.room_id,
  r.name as room_name,
  o.customer_name,
  o.total_amount,
  o.created_at,
  o.opened_at,
  o.closed_at,
  o.created_by_staff_id,
  cs.name as created_by_staff_name,
  o.confirmed_by_staff_id,
  cfs.name as confirmed_by_staff_name,
  o.modified_by_staff_id,
  ms.name as modified_by_staff_name,
  -- Calcola il tempo trascorso dall'apertura
  CASE
    WHEN o.opened_at IS NOT NULL AND o.closed_at IS NULL
    THEN EXTRACT(EPOCH FROM (NOW() - o.opened_at))
    ELSE 0
  END as elapsed_seconds,
  -- Conta prodotti totali
  (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as total_items,
  -- Conta prodotti preparati
  (SELECT COUNT(*) FROM order_items WHERE order_id = o.id AND prepared = true) as prepared_items,
  -- Conta batch
  (SELECT COALESCE(MAX(batch_number), 0) FROM order_items WHERE order_id = o.id) as max_batch,
  -- Check se ci sono prodotti non confermati (batch > 1 e non tutti preparati)
  (SELECT COUNT(*) FROM order_items WHERE order_id = o.id AND prepared = false) > 0 as has_pending_items
FROM orders o
LEFT JOIN tables t ON o.table_id = t.id
LEFT JOIN rooms r ON o.room_id = r.id
LEFT JOIN restaurant_staff cs ON o.created_by_staff_id = cs.id
LEFT JOIN restaurant_staff cfs ON o.confirmed_by_staff_id = cfs.id
LEFT JOIN restaurant_staff ms ON o.modified_by_staff_id = ms.id
WHERE o.deleted_at IS NULL
  AND o.status IN ('pending', 'preparing');

COMMENT ON VIEW v_active_orders IS 'Vista degli ordini attivi (pending e preparing) con tutti i dettagli e statistiche';

-- Grant permissions
GRANT SELECT ON v_active_orders TO authenticated;


-- ============================================
-- PARTE 10: FUNZIONE PER OTTENERE PROSSIMO BATCH NUMBER
-- ============================================

CREATE OR REPLACE FUNCTION get_next_batch_number(p_order_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_batch INTEGER;
BEGIN
  SELECT COALESCE(MAX(batch_number), 0) + 1
  INTO next_batch
  FROM order_items
  WHERE order_id = p_order_id;

  RETURN next_batch;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_next_batch_number(UUID) IS 'Restituisce il prossimo numero batch per un ordine';


-- ============================================
-- PARTE 11: FUNZIONE PER SOFT DELETE ORDINE
-- ============================================

CREATE OR REPLACE FUNCTION soft_delete_order(p_order_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE orders
  SET deleted_at = NOW()
  WHERE id = p_order_id
    AND deleted_at IS NULL;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION soft_delete_order(UUID) IS 'Elimina logicamente un ordine (soft delete)';


-- ============================================
-- PARTE 12: FUNZIONE PER RESTORE ORDINE
-- ============================================

CREATE OR REPLACE FUNCTION restore_order(p_order_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE orders
  SET deleted_at = NULL
  WHERE id = p_order_id
    AND deleted_at IS NOT NULL;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION restore_order(UUID) IS 'Ripristina un ordine eliminato logicamente';


-- ============================================
-- PARTE 13: AGGIORNAMENTO RLS POLICIES
-- ============================================

-- Drop vecchie policy se esistono
DROP POLICY IF EXISTS "Authenticated users can view orders for their restaurant" ON orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders for their restaurant" ON orders;
DROP POLICY IF EXISTS "Authenticated users can update orders for their restaurant" ON orders;
DROP POLICY IF EXISTS "Authenticated users can delete orders for their restaurant" ON orders;

-- Policy per SELECT - esclude ordini eliminati
CREATE POLICY "Users can view non-deleted orders for their restaurant" ON orders
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND deleted_at IS NULL
  );

-- Policy per INSERT
CREATE POLICY "Users can create orders for their restaurant" ON orders
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Policy per UPDATE - solo ordini non eliminati
CREATE POLICY "Users can update non-deleted orders for their restaurant" ON orders
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Policy per DELETE - solo soft delete (tramite UPDATE di deleted_at)
CREATE POLICY "Users can soft-delete orders for their restaurant" ON orders
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
  );


-- ============================================
-- PARTE 14: AGGIORNAMENTO CALCOLO TOTALE
-- ============================================

-- Aggiorna la funzione calculate_order_total per includere priority_order_amount
CREATE OR REPLACE FUNCTION calculate_order_total(p_order_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  items_total DECIMAL(10,2);
  priority_amount DECIMAL(10,2);
  total DECIMAL(10,2);
BEGIN
  -- Somma subtotali items
  SELECT COALESCE(SUM(subtotal), 0) INTO items_total
  FROM order_items WHERE order_id = p_order_id;

  -- Ottieni priority_order_amount
  SELECT COALESCE(priority_order_amount, 0) INTO priority_amount
  FROM orders WHERE id = p_order_id;

  -- Calcola totale
  total := items_total + priority_amount;
  RETURN total;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_order_total(UUID) IS 'Calcola il totale ordine includendo items e priority_order_amount';

-- Assicuriamoci che venga ricalcolato quando cambiano order_items
CREATE OR REPLACE FUNCTION recalculate_order_total_on_items_change()
RETURNS TRIGGER AS $$
DECLARE
  order_total DECIMAL(10,2);
BEGIN
  -- Ottieni order_id (da NEW se INSERT/UPDATE, da OLD se DELETE)
  IF TG_OP = 'DELETE' THEN
    SELECT calculate_order_total(OLD.order_id) INTO order_total;
    UPDATE orders SET total_amount = order_total WHERE id = OLD.order_id;
  ELSE
    SELECT calculate_order_total(NEW.order_id) INTO order_total;
    UPDATE orders SET total_amount = order_total WHERE id = NEW.order_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_order_total_on_items_change() IS 'Ricalcola automaticamente total_amount quando cambiano order_items';

-- Crea trigger su order_items
DROP TRIGGER IF EXISTS trigger_recalculate_total_on_items ON order_items;
CREATE TRIGGER trigger_recalculate_total_on_items
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_order_total_on_items_change();

-- Trigger per ricalcolare totale quando cambia priority_order_amount
CREATE OR REPLACE FUNCTION recalculate_order_total_on_priority_change()
RETURNS TRIGGER AS $$
DECLARE
  order_total DECIMAL(10,2);
BEGIN
  -- Se priority_order_amount è cambiato, ricalcola il totale
  IF OLD.priority_order_amount IS DISTINCT FROM NEW.priority_order_amount THEN
    SELECT calculate_order_total(NEW.id) INTO order_total;
    NEW.total_amount = order_total;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_order_total_on_priority_change() IS 'Ricalcola automaticamente total_amount quando cambia priority_order_amount';

DROP TRIGGER IF EXISTS trigger_recalculate_total_on_priority ON orders;
CREATE TRIGGER trigger_recalculate_total_on_priority
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_order_total_on_priority_change();


-- ============================================
-- PARTE 15: SEED DATA PER TESTING (OPZIONALE)
-- ============================================

-- Questa parte è commentata - decommentare solo per testing/sviluppo

/*
-- Esempio: Crea un ordine al tavolo
INSERT INTO orders (
  restaurant_id,
  table_id,
  room_id,
  order_type,
  status,
  customer_name,
  created_by_staff_id
) VALUES (
  'YOUR_RESTAURANT_ID_HERE',
  'YOUR_TABLE_ID_HERE',
  'YOUR_ROOM_ID_HERE',
  'table',
  'pending',
  'Cliente Test',
  'YOUR_STAFF_ID_HERE'
);

-- Esempio: Aggiungi prodotti (batch 1)
INSERT INTO order_items (
  order_id,
  product_id,
  quantity,
  price,
  batch_number,
  prepared,
  added_by_staff_id
) VALUES (
  'ORDER_ID_FROM_ABOVE',
  'PRODUCT_ID_HERE',
  2,
  10.50,
  1,
  false,
  'YOUR_STAFF_ID_HERE'
);
*/


-- ============================================
-- PARTE 16: VERIFICA MIGRAZIONE
-- ============================================

-- Query di verifica da eseguire dopo la migrazione

-- Verifica colonne orders
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN (
    'order_type', 'order_number', 'table_id', 'room_id', 'opened_at', 'closed_at',
    'deleted_at', 'created_by_staff_id', 'confirmed_by_staff_id',
    'modified_by_staff_id', 'priority_order_amount', 'metadata'
  )
ORDER BY column_name;

-- Verifica colonne order_items
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'order_items'
  AND column_name IN ('batch_number', 'prepared', 'prepared_at', 'added_by_staff_id')
ORDER BY column_name;

-- Verifica indici
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('orders', 'order_items')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Verifica triggers
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('orders', 'order_items')
  AND trigger_name LIKE 'trigger_%'
ORDER BY event_object_table, trigger_name;

-- Verifica views
SELECT
  table_name,
  view_definition
FROM information_schema.views
WHERE table_name LIKE 'v_cassa%' OR table_name LIKE 'v_active%'
ORDER BY table_name;

-- Verifica funzioni
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name IN (
  'set_order_number',
  'set_opened_at',
  'set_closed_at',
  'auto_mark_prepared_on_confirm',
  'get_next_batch_number',
  'soft_delete_order',
  'restore_order',
  'calculate_order_total',
  'recalculate_order_total_on_items_change',
  'recalculate_order_total_on_priority_change'
)
ORDER BY routine_name;


-- ===================================================================
-- FINE MIGRAZIONE
-- ===================================================================

SELECT '✅ Migrazione sistema cassa e tavoli completata con successo!' as status;
SELECT 'Eseguire le query di verifica sopra per validare la migrazione' as next_step;
