-- ===================================================================
-- SCHEMA DATABASE PER GESTIONE ORDINI AL TAVOLO
-- ===================================================================

-- 1. Tabella per impostazioni ordini del ristorante
-- ===================================================================
CREATE TABLE IF NOT EXISTS restaurant_order_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL UNIQUE REFERENCES restaurants(id) ON DELETE CASCADE,
  orders_enabled BOOLEAN NOT NULL DEFAULT false,
  number_of_tables INTEGER DEFAULT 0 CHECK (number_of_tables >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_restaurant_order_settings_restaurant_id ON restaurant_order_settings(restaurant_id);

-- RLS
ALTER TABLE restaurant_order_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ristoratori possono gestire proprie impostazioni ordini"
  ON restaurant_order_settings
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Lettura pubblica impostazioni ordini per menu pubblico"
  ON restaurant_order_settings
  FOR SELECT
  USING (true);

COMMENT ON TABLE restaurant_order_settings IS 'Impostazioni ordini al tavolo per ogni ristorante';


-- 2. Tabella camerieri (staff/manager)
-- ===================================================================
CREATE TABLE IF NOT EXISTS restaurant_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'waiter' CHECK (role IN ('waiter', 'manager')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(restaurant_id, email)
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_restaurant_staff_restaurant_id ON restaurant_staff(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_staff_email ON restaurant_staff(email);

-- RLS
ALTER TABLE restaurant_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ristoratori possono gestire proprio staff"
  ON restaurant_staff
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff può leggere propri dati"
  ON restaurant_staff
  FOR SELECT
  USING (id::text = current_setting('app.staff_id', true));

COMMENT ON TABLE restaurant_staff IS 'Camerieri e staff del ristorante';


-- 3. Tabella clienti (opzionale per storico ordini)
-- ===================================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_customers_restaurant_id ON customers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ristoratori possono gestire propri clienti"
  ON customers
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff può leggere clienti"
  ON customers
  FOR SELECT
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM restaurant_staff
      WHERE id::text = current_setting('app.staff_id', true)
    )
  );

COMMENT ON TABLE customers IS 'Clienti del ristorante (registrati)';


-- 4. Tabella ordini
-- ===================================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  table_number INTEGER NOT NULL CHECK (table_number > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'completed', 'cancelled')),
  customer_name TEXT,
  customer_notes TEXT,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  confirmed_by UUID REFERENCES restaurant_staff(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_table_number ON orders(table_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created ON orders(restaurant_id, created_at);

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ristoratori possono gestire propri ordini"
  ON orders
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff può gestire ordini del proprio ristorante"
  ON orders
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM restaurant_staff
      WHERE id::text = current_setting('app.staff_id', true) AND is_active = true
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM restaurant_staff
      WHERE id::text = current_setting('app.staff_id', true) AND is_active = true
    )
  );

CREATE POLICY "Clienti possono vedere propri ordini"
  ON orders
  FOR SELECT
  USING (
    customer_id::text = current_setting('app.customer_id', true)
  );

CREATE POLICY "Inserimento pubblico ordini"
  ON orders
  FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE orders IS 'Ordini al tavolo';
COMMENT ON COLUMN orders.status IS 'Stati: pending (nuovo), confirmed (confermato da staff), preparing (in preparazione), completed (completato), cancelled (annullato)';


-- 5. Tabella item ordini (prodotti nell'ordine)
-- ===================================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  product_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  notes TEXT,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accesso order_items segue policy orders"
  ON order_items
  FOR ALL
  USING (
    order_id IN (SELECT id FROM orders)
  )
  WITH CHECK (
    order_id IN (SELECT id FROM orders)
  );

COMMENT ON TABLE order_items IS 'Prodotti contenuti in ogni ordine';
COMMENT ON COLUMN order_items.notes IS 'Note del cliente per il prodotto (es. caffè lungo, senza lattosio, etc)';


-- 6. Tabella timeline ordini (storico modifiche)
-- ===================================================================
CREATE TABLE IF NOT EXISTS order_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES restaurant_staff(id) ON DELETE SET NULL,
  staff_name TEXT,
  action TEXT NOT NULL CHECK (action IN ('created', 'confirmed', 'preparing', 'completed', 'cancelled', 'updated', 'item_added', 'item_removed', 'item_updated')),
  previous_status TEXT,
  new_status TEXT,
  changes JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_order_timeline_order_id ON order_timeline(order_id);
CREATE INDEX IF NOT EXISTS idx_order_timeline_staff_id ON order_timeline(staff_id);
CREATE INDEX IF NOT EXISTS idx_order_timeline_created_at ON order_timeline(created_at);

-- RLS
ALTER TABLE order_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accesso timeline segue policy orders"
  ON order_timeline
  FOR ALL
  USING (
    order_id IN (SELECT id FROM orders)
  )
  WITH CHECK (
    order_id IN (SELECT id FROM orders)
  );

COMMENT ON TABLE order_timeline IS 'Timeline storico modifiche ordini con operatore';
COMMENT ON COLUMN order_timeline.action IS 'Tipo di azione: created, confirmed, preparing, completed, cancelled, updated, item_added, item_removed, item_updated';
COMMENT ON COLUMN order_timeline.changes IS 'Dettagli modifiche in formato JSON';


-- 7. Aggiornare tabella analytics_events per nuovi eventi ordini
-- ===================================================================
ALTER TABLE analytics_events
DROP CONSTRAINT IF EXISTS analytics_events_event_type_check;

ALTER TABLE analytics_events
ADD CONSTRAINT analytics_events_event_type_check
CHECK (event_type IN (
  'favorite_added',
  'favorite_removed',
  'product_viewed',
  'category_viewed',
  'session_time',
  'qr_scanned',
  'order_item_added',
  'order_completed',
  'order_cancelled'
));

-- Aggiungere colonna order_id
ALTER TABLE analytics_events
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_order_id ON analytics_events(order_id) WHERE order_id IS NOT NULL;


-- 7. Funzione per calcolare totale ordine
-- ===================================================================
CREATE OR REPLACE FUNCTION calculate_order_total(p_order_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  total DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(subtotal), 0) INTO total
  FROM order_items
  WHERE order_id = p_order_id;

  RETURN total;
END;
$$ LANGUAGE plpgsql;


-- 8. Trigger per aggiornare total_amount ordine
-- ===================================================================
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE orders
  SET total_amount = calculate_order_total(NEW.order_id),
      updated_at = NOW()
  WHERE id = NEW.order_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_total
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW
EXECUTE FUNCTION update_order_total();


-- 9. Trigger per aggiornare updated_at
-- ===================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_restaurant_order_settings_updated_at
BEFORE UPDATE ON restaurant_order_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurant_staff_updated_at
BEFORE UPDATE ON restaurant_staff
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- 10. Trigger per tracciare modifiche ordini nella timeline
-- ===================================================================
CREATE OR REPLACE FUNCTION track_order_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Traccia cambio stato
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO order_timeline (order_id, staff_id, staff_name, action, previous_status, new_status)
    VALUES (
      NEW.id,
      NEW.confirmed_by,
      (SELECT name FROM restaurant_staff WHERE id = NEW.confirmed_by),
      NEW.status,
      OLD.status,
      NEW.status
    );
  END IF;

  -- Traccia creazione ordine
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO order_timeline (order_id, action, new_status)
    VALUES (NEW.id, 'created', 'pending');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_order_changes
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION track_order_changes();


-- 11. View per statistiche ordini
-- ===================================================================
CREATE OR REPLACE VIEW order_statistics AS
SELECT
  o.restaurant_id,
  DATE(o.created_at) as order_date,
  o.status,
  COUNT(o.id) as total_orders,
  SUM(o.total_amount) as total_revenue,
  AVG(o.total_amount) as average_order_value,
  SUM(oi.quantity) as total_items,
  AVG(o.total_amount / NULLIF(
    (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id), 0
  )) as average_item_value
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.restaurant_id, DATE(o.created_at), o.status;

COMMENT ON VIEW order_statistics IS 'Statistiche aggregate ordini per analytics';


-- ===================================================================
-- COMMENTI FINALI
-- ===================================================================
-- Schema completo per gestione ordini al tavolo con analytics
