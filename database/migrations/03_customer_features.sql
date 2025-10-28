-- ============================================
-- MIGRATION PART 3: Customer Features
-- ============================================

-- Loyalty Tiers Table
CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  tier_name VARCHAR(20) NOT NULL CHECK (tier_name IN ('bronze', 'silver', 'gold')),
  min_points INT NOT NULL,
  max_points INT,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  benefits JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT loyalty_tiers_unique_tier_per_restaurant UNIQUE (restaurant_id, tier_name)
);

COMMENT ON TABLE loyalty_tiers IS 'Configurazione tier loyalty program';

-- Add customer_id to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
    CREATE INDEX idx_orders_customer ON orders(customer_id) WHERE customer_id IS NOT NULL;
    COMMENT ON COLUMN orders.customer_id IS 'Cliente che ha fatto ordine (registrato o Cliente Incognito)';
  END IF;
END $$;

-- Enhanced Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_customer
  ON analytics_events(restaurant_id, customer_id, created_at DESC)
  WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_order
  ON analytics_events(restaurant_id, order_id, event_type)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_product
  ON analytics_events(restaurant_id, product_id, event_type)
  WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_staff
  ON analytics_events(restaurant_id, staff_id, event_type, created_at DESC)
  WHERE staff_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_metadata_traffic
  ON analytics_events USING GIN ((metadata -> 'traffic_source'));

CREATE INDEX IF NOT EXISTS idx_analytics_events_metadata_device
  ON analytics_events USING GIN ((metadata -> 'device_type'));

-- Triggers
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_customers_updated_at ON customers;
CREATE TRIGGER trigger_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();

CREATE OR REPLACE FUNCTION update_customer_last_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.customer_id IS NOT NULL THEN
    UPDATE customers
    SET
      last_order_at = NEW.completed_at,
      total_orders_count = total_orders_count + 1,
      lifetime_value = lifetime_value + COALESCE(NEW.total_amount, 0)
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_customer_last_order ON orders;
CREATE TRIGGER trigger_update_customer_last_order
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
  EXECUTE FUNCTION update_customer_last_order();

-- RLS Policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customers_restaurant_isolation ON customers;
CREATE POLICY customers_restaurant_isolation ON customers
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE id = restaurant_id
    )
  );

DROP POLICY IF EXISTS customers_public_insert ON customers;
CREATE POLICY customers_public_insert ON customers
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS customers_self_read ON customers;
CREATE POLICY customers_self_read ON customers
  FOR SELECT
  USING (
    auth.uid()::text = id::text OR
    restaurant_id IN (
      SELECT id FROM restaurants WHERE id = restaurant_id
    )
  );

-- Customer Analytics View
CREATE OR REPLACE VIEW customer_analytics AS
SELECT
  c.id,
  c.restaurant_id,
  c.name,
  c.email,
  c.loyalty_tier,
  c.loyalty_points,
  c.lifetime_value,
  c.total_orders_count,
  CASE
    WHEN c.total_orders_count = 0 THEN 0
    ELSE c.lifetime_value / c.total_orders_count
  END as average_order_value,
  c.registered_at,
  c.last_order_at,
  EXTRACT(DAY FROM NOW() - c.last_order_at) as days_since_last_order,
  c.is_active,
  c.is_registered,
  c.is_anonymous,
  CASE
    WHEN c.is_anonymous THEN 'anonymous'
    WHEN c.total_orders_count = 0 THEN 'registered_no_orders'
    WHEN c.total_orders_count = 1 THEN 'one_time_customer'
    WHEN c.total_orders_count BETWEEN 2 AND 5 THEN 'occasional_customer'
    WHEN c.total_orders_count > 5 THEN 'loyal_customer'
  END as customer_segment,
  CASE
    WHEN c.last_order_at IS NULL THEN 'never_ordered'
    WHEN c.last_order_at > NOW() - INTERVAL '7 days' THEN 'active'
    WHEN c.last_order_at > NOW() - INTERVAL '30 days' THEN 'recent'
    WHEN c.last_order_at > NOW() - INTERVAL '90 days' THEN 'at_risk'
    ELSE 'churned'
  END as customer_status
FROM customers c
WHERE c.deleted_at IS NULL;

COMMENT ON VIEW customer_analytics IS 'Vista analytics clienti con metriche e segmentazione';

-- Function: Get or Create Anonymous Customer
CREATE OR REPLACE FUNCTION get_or_create_anonymous_customer(
  p_restaurant_id UUID,
  p_session_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  IF p_session_id IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM customers
    WHERE restaurant_id = p_restaurant_id
      AND is_anonymous = true
      AND preferences->>'session_id' = p_session_id
      AND created_at > NOW() - INTERVAL '24 hours'
    LIMIT 1;
  END IF;

  IF v_customer_id IS NULL THEN
    INSERT INTO customers (
      restaurant_id,
      name,
      is_registered,
      is_anonymous,
      preferences
    ) VALUES (
      p_restaurant_id,
      'Cliente Incognito',
      false,
      true,
      jsonb_build_object('session_id', COALESCE(p_session_id, gen_random_uuid()::text))
    )
    RETURNING id INTO v_customer_id;
  END IF;

  RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_or_create_anonymous_customer IS
  'Ottiene o crea customer anonimo "Cliente Incognito" per ordini da QR senza registrazione';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completata con successo!';
  RAISE NOTICE '- Customers table pronta';
  RAISE NOTICE '- Loyalty tiers table creata';
  RAISE NOTICE '- Triggers configurati';
  RAISE NOTICE '- RLS policies attive';
  RAISE NOTICE '- View customer_analytics disponibile';
  RAISE NOTICE '- Function get_or_create_anonymous_customer disponibile';
END $$;
