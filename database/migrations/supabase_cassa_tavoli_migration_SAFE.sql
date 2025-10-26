-- ===================================================================
-- MIGRAZIONE SAFE: Sistema Cassa e Gestione Tavoli
-- ===================================================================
-- Versione SAFE con ordine di esecuzione ottimizzato
-- ===================================================================

-- ============================================
-- FASE 1: DROP VIEWS E TRIGGER ESISTENTI
-- ============================================
-- Rimuoviamo prima le views che potrebbero fare riferimento alle colonne

DROP VIEW IF EXISTS v_cassa_statistics CASCADE;
DROP VIEW IF EXISTS v_active_orders CASCADE;

-- Drop trigger che potrebbero interferire
DROP TRIGGER IF EXISTS trigger_recalculate_total_on_items ON order_items;
DROP TRIGGER IF EXISTS trigger_recalculate_total_on_priority ON orders;
DROP TRIGGER IF EXISTS trigger_set_order_number ON orders;
DROP TRIGGER IF EXISTS trigger_set_opened_at ON orders;
DROP TRIGGER IF EXISTS trigger_set_closed_at ON orders;
DROP TRIGGER IF EXISTS trigger_auto_mark_prepared ON orders;


-- ============================================
-- FASE 2: MODIFICHE TABELLA ORDERS
-- ============================================

-- 2.1 Aggiungi campo tipo ordine (tavolo o banco)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'order_type'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_type VARCHAR(10) DEFAULT 'table' CHECK (order_type IN ('table', 'counter'));
  END IF;
END $$;

COMMENT ON COLUMN orders.order_type IS 'Tipo di ordine: table (al tavolo) o counter (al banco)';

-- 2.2 Aggiungi numero ordine progressivo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'order_number'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_number INTEGER;
  END IF;
END $$;

COMMENT ON COLUMN orders.order_number IS 'Numero ordine progressivo globale per ristorante (es. #1, #2, #3...)';

-- 2.3 Aggiungi riferimento al tavolo (IMPORTANTE!)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'table_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN table_id UUID REFERENCES tables(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN orders.table_id IS 'Riferimento al tavolo specifico (foreign key a tables)';

-- 2.4 Aggiungi riferimento alla stanza
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'room_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN room_id UUID REFERENCES rooms(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN orders.room_id IS 'Sala/stanza in cui si trova il tavolo';

-- 2.5 Aggiungi timestamp apertura
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'opened_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN opened_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

COMMENT ON COLUMN orders.opened_at IS 'Timestamp quando il tavolo viene aperto (conferma ordine)';

-- 2.6 Aggiungi timestamp chiusura
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN closed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

COMMENT ON COLUMN orders.closed_at IS 'Timestamp quando il tavolo viene chiuso (scontrino)';

-- 2.7 Aggiungi soft delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

COMMENT ON COLUMN orders.deleted_at IS 'Soft delete - NULL se attivo';

-- 2.8 Aggiungi tracking staff - creatore
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'created_by_staff_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN created_by_staff_id UUID REFERENCES restaurant_staff(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN orders.created_by_staff_id IS 'Staff che ha creato l''ordine';

-- 2.9 Aggiungi tracking staff - conferma
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'confirmed_by_staff_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN confirmed_by_staff_id UUID REFERENCES restaurant_staff(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN orders.confirmed_by_staff_id IS 'Staff che ha confermato l''ordine';

-- 2.10 Aggiungi tracking staff - modifica
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'modified_by_staff_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN modified_by_staff_id UUID REFERENCES restaurant_staff(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN orders.modified_by_staff_id IS 'Ultimo staff che ha modificato l''ordine';

-- 2.11 Aggiungi priority order amount
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'priority_order_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN priority_order_amount DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

COMMENT ON COLUMN orders.priority_order_amount IS 'Importo totale servizio priority (accumula)';

-- 2.12 Aggiungi metadata
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE orders ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

COMMENT ON COLUMN orders.metadata IS 'Metadati aggiuntivi (preconto, scontrino, etc.)';


-- ============================================
-- FASE 3: MODIFICHE TABELLA ORDER_ITEMS
-- ============================================

-- 3.1 Aggiungi batch_number
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'batch_number'
  ) THEN
    ALTER TABLE order_items ADD COLUMN batch_number INTEGER DEFAULT 1;
  END IF;
END $$;

COMMENT ON COLUMN order_items.batch_number IS 'Numero ondata/batch - NON si ricompatta mai';

-- 3.2 Aggiungi prepared flag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'prepared'
  ) THEN
    ALTER TABLE order_items ADD COLUMN prepared BOOLEAN DEFAULT false;
  END IF;
END $$;

COMMENT ON COLUMN order_items.prepared IS 'Se true, lo staff ha marcato come preparato';

-- 3.3 Aggiungi prepared_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'prepared_at'
  ) THEN
    ALTER TABLE order_items ADD COLUMN prepared_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

COMMENT ON COLUMN order_items.prepared_at IS 'Timestamp preparazione';

-- 3.4 Aggiungi tracking staff
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'added_by_staff_id'
  ) THEN
    ALTER TABLE order_items ADD COLUMN added_by_staff_id UUID REFERENCES restaurant_staff(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN order_items.added_by_staff_id IS 'Staff che ha aggiunto il prodotto';


-- ============================================
-- FASE 4: INDICI
-- ============================================

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id_v2 ON orders(restaurant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_type ON orders(order_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_table_id_v2 ON orders(table_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_room_id_v2 ON orders(room_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_not_deleted ON orders(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_pending ON orders(restaurant_id, status) WHERE status = 'pending' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_active ON orders(restaurant_id, status) WHERE status = 'preparing' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(restaurant_id, order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at_v2 ON orders(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_batch ON order_items(order_id, batch_number);
CREATE INDEX IF NOT EXISTS idx_order_items_prepared ON order_items(order_id, prepared);
CREATE INDEX IF NOT EXISTS idx_orders_metadata_gin ON orders USING GIN (metadata);


-- ============================================
-- FASE 5: FUNZIONI
-- ============================================

-- 5.1 Auto-increment order_number
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    SELECT COALESCE(MAX(order_number), 0) + 1
    INTO NEW.order_number
    FROM orders
    WHERE restaurant_id = NEW.restaurant_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.2 Auto-set opened_at
CREATE OR REPLACE FUNCTION set_opened_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'preparing' AND OLD.status != 'preparing' AND NEW.opened_at IS NULL THEN
    NEW.opened_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.3 Auto-set closed_at
CREATE OR REPLACE FUNCTION set_closed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.closed_at IS NULL THEN
    NEW.closed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.4 Auto-mark prepared on confirm
CREATE OR REPLACE FUNCTION auto_mark_prepared_on_confirm()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'preparing' AND OLD.status = 'pending' THEN
    UPDATE order_items
    SET prepared = true, prepared_at = NOW()
    WHERE order_id = NEW.id AND prepared = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.5 Get next batch number
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

-- 5.6 Soft delete order
CREATE OR REPLACE FUNCTION soft_delete_order(p_order_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE orders
  SET deleted_at = NOW()
  WHERE id = p_order_id AND deleted_at IS NULL;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 5.7 Restore order
CREATE OR REPLACE FUNCTION restore_order(p_order_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE orders
  SET deleted_at = NULL
  WHERE id = p_order_id AND deleted_at IS NOT NULL;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 5.8 Calculate order total
CREATE OR REPLACE FUNCTION calculate_order_total(p_order_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  items_total DECIMAL(10,2);
  priority_amount DECIMAL(10,2);
  total DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(subtotal), 0) INTO items_total
  FROM order_items WHERE order_id = p_order_id;

  SELECT COALESCE(priority_order_amount, 0) INTO priority_amount
  FROM orders WHERE id = p_order_id;

  total := items_total + priority_amount;
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- 5.9 Recalculate total on items change
CREATE OR REPLACE FUNCTION recalculate_order_total_on_items_change()
RETURNS TRIGGER AS $$
DECLARE
  order_total DECIMAL(10,2);
BEGIN
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

-- 5.10 Recalculate total on priority change
CREATE OR REPLACE FUNCTION recalculate_order_total_on_priority_change()
RETURNS TRIGGER AS $$
DECLARE
  order_total DECIMAL(10,2);
BEGIN
  IF OLD.priority_order_amount IS DISTINCT FROM NEW.priority_order_amount THEN
    SELECT calculate_order_total(NEW.id) INTO order_total;
    NEW.total_amount = order_total;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- FASE 6: TRIGGER
-- ============================================

CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

CREATE TRIGGER trigger_set_opened_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_opened_at();

CREATE TRIGGER trigger_set_closed_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_closed_at();

CREATE TRIGGER trigger_auto_mark_prepared
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_mark_prepared_on_confirm();

CREATE TRIGGER trigger_recalculate_total_on_items
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_order_total_on_items_change();

CREATE TRIGGER trigger_recalculate_total_on_priority
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_order_total_on_priority_change();


-- ============================================
-- FASE 7: VIEWS
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

GRANT SELECT ON v_cassa_statistics TO authenticated;

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
  CASE
    WHEN o.opened_at IS NOT NULL AND o.closed_at IS NULL
    THEN EXTRACT(EPOCH FROM (NOW() - o.opened_at))
    ELSE 0
  END as elapsed_seconds,
  (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as total_items,
  (SELECT COUNT(*) FROM order_items WHERE order_id = o.id AND prepared = true) as prepared_items,
  (SELECT COALESCE(MAX(batch_number), 0) FROM order_items WHERE order_id = o.id) as max_batch,
  (SELECT COUNT(*) FROM order_items WHERE order_id = o.id AND prepared = false) > 0 as has_pending_items
FROM orders o
LEFT JOIN tables t ON o.table_id = t.id
LEFT JOIN rooms r ON o.room_id = r.id
LEFT JOIN restaurant_staff cs ON o.created_by_staff_id = cs.id
LEFT JOIN restaurant_staff cfs ON o.confirmed_by_staff_id = cfs.id
LEFT JOIN restaurant_staff ms ON o.modified_by_staff_id = ms.id
WHERE o.deleted_at IS NULL
  AND o.status IN ('pending', 'preparing');

GRANT SELECT ON v_active_orders TO authenticated;


-- ============================================
-- FASE 8: RLS POLICIES (DROP E RICREA)
-- ============================================

-- Drop vecchie policy
DROP POLICY IF EXISTS "Authenticated users can view orders for their restaurant" ON orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders for their restaurant" ON orders;
DROP POLICY IF EXISTS "Authenticated users can update orders for their restaurant" ON orders;
DROP POLICY IF EXISTS "Authenticated users can delete orders for their restaurant" ON orders;
DROP POLICY IF EXISTS "Users can view non-deleted orders for their restaurant" ON orders;
DROP POLICY IF EXISTS "Users can create orders for their restaurant" ON orders;
DROP POLICY IF EXISTS "Users can update non-deleted orders for their restaurant" ON orders;
DROP POLICY IF EXISTS "Users can soft-delete orders for their restaurant" ON orders;

-- Ricrea policy
CREATE POLICY "Users can view non-deleted orders" ON orders
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

CREATE POLICY "Users can create orders" ON orders
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update non-deleted orders" ON orders
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL)
  WITH CHECK (auth.uid() IS NOT NULL);


-- ===================================================================
-- FINE MIGRAZIONE SAFE
-- ===================================================================

SELECT '✅ Migrazione SAFE completata con successo!' as status;
