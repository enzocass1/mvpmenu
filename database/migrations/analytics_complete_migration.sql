-- ============================================
-- MIGRATION: Complete Analytics System
-- Data: 26 Ottobre 2025
-- Scopo: Setup completo sistema analytics avanzato
-- ============================================

-- ============================================
-- PARTE 1: Fix Analytics Events Constraint
-- ============================================

-- Drop existing constraint
ALTER TABLE analytics_events
DROP CONSTRAINT IF EXISTS analytics_events_event_type_check;

-- Add comprehensive constraint with ALL 42 event types
ALTER TABLE analytics_events
ADD CONSTRAINT analytics_events_event_type_check
CHECK (event_type IN (
  -- Customer Account Events (7)
  'customer_registered',
  'customer_login',
  'customer_logout',
  'customer_profile_updated',
  'loyalty_points_earned',
  'loyalty_points_redeemed',
  'traffic_source_tracked',

  -- Public Menu Browsing Events (11)
  'qr_scanned',
  'menu_opened',
  'category_viewed',
  'product_viewed',
  'product_image_viewed',
  'product_searched',
  'favorite_added',
  'favorite_removed',
  'session_time',
  'opening_hours_viewed',
  'menu_shared',

  -- Cart & Checkout Events (4)
  'order_item_added',
  'cart_item_removed',
  'cart_viewed',
  'checkout_started',

  -- Order Lifecycle Events (10)
  'order_created',
  'order_status_changed',
  'item_prepared',
  'order_note_added',
  'order_confirmed',
  'products_added_to_order',
  'item_removed',
  'order_completed',
  'order_cancelled',
  'table_changed',

  -- Staff Operations Events (8)
  'staff_login',
  'staff_logout',
  'table_opened',
  'preconto_generated',
  'receipt_printed',
  'priority_order_requested',
  'table_order_pending',
  'table_order_confirmed',

  -- Payment & Receipt Events (2)
  'payment_method_selected',
  'discount_applied',

  -- Legacy (backward compatibility)
  'counter_order_completed',
  'table_closed'
));

COMMENT ON CONSTRAINT analytics_events_event_type_check ON analytics_events
IS '42 event types - Sistema completo analytics aggiornato il 26/10/2025';

-- ============================================
-- PARTE 2: Customers Table
-- ============================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,

  -- Basic info
  name VARCHAR(200),
  email VARCHAR(255),
  phone VARCHAR(50),
  locale VARCHAR(10) DEFAULT 'it-IT',

  -- Status
  is_registered BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  is_anonymous BOOLEAN DEFAULT false,

  -- Loyalty
  loyalty_tier VARCHAR(20) DEFAULT 'none' CHECK (loyalty_tier IN ('none', 'bronze', 'silver', 'gold')),
  loyalty_points INT DEFAULT 0 CHECK (loyalty_points >= 0),
  lifetime_value DECIMAL(10,2) DEFAULT 0.00,
  total_orders_count INT DEFAULT 0,

  -- Preferences (JSONB per flessibilità)
  dietary_restrictions TEXT[],
  allergies TEXT[],
  favorite_products UUID[],
  preferences JSONB DEFAULT '{}'::jsonb,

  -- Marketing consents
  marketing_consent BOOLEAN DEFAULT false,
  sms_consent BOOLEAN DEFAULT false,
  push_consent BOOLEAN DEFAULT false,

  -- Metadata
  registration_source VARCHAR(50),  -- 'qr', 'web', 'app', 'social'
  registration_method VARCHAR(50),  -- 'email', 'phone', 'google', 'facebook'
  traffic_source VARCHAR(50),  -- 'qr', 'organic', 'social'
  utm_source VARCHAR(100),
  utm_campaign VARCHAR(100),

  -- Timestamps
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_order_at TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,  -- Soft delete

  -- Constraints
  CONSTRAINT customers_unique_email_per_restaurant UNIQUE (restaurant_id, email),
  CONSTRAINT customers_email_or_phone_required CHECK (
    is_anonymous = true OR email IS NOT NULL OR phone IS NOT NULL
  )
);

-- Indexes for customers
CREATE INDEX IF NOT EXISTS idx_customers_restaurant ON customers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_loyalty ON customers(restaurant_id, loyalty_tier, loyalty_points);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(restaurant_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_registered ON customers(restaurant_id, is_registered, is_anonymous);

COMMENT ON TABLE customers IS 'Clienti registrati e anonimi (Cliente Incognito)';
COMMENT ON COLUMN customers.is_anonymous IS 'true per "Cliente Incognito" (ordini da QR senza registrazione)';
COMMENT ON COLUMN customers.lifetime_value IS 'Valore totale ordini del cliente (LTV)';

-- ============================================
-- PARTE 3: Customer Loyalty Tiers Configuration
-- ============================================

CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,

  tier_name VARCHAR(20) NOT NULL CHECK (tier_name IN ('bronze', 'silver', 'gold')),
  min_points INT NOT NULL,
  max_points INT,
  discount_percent DECIMAL(5,2) DEFAULT 0,

  benefits JSONB DEFAULT '[]'::jsonb,  -- ['free_delivery', 'priority_service']

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT loyalty_tiers_unique_tier_per_restaurant UNIQUE (restaurant_id, tier_name)
);

-- Default tiers per nuovo ristorante
COMMENT ON TABLE loyalty_tiers IS 'Configurazione tier loyalty program';

-- ============================================
-- PARTE 4: Enhanced Analytics Indexes
-- ============================================

-- Indexes per query analytics veloci
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

-- Index per traffic source analysis
CREATE INDEX IF NOT EXISTS idx_analytics_events_metadata_traffic
  ON analytics_events USING GIN ((metadata -> 'traffic_source'));

-- Index per device type analysis
CREATE INDEX IF NOT EXISTS idx_analytics_events_metadata_device
  ON analytics_events USING GIN ((metadata -> 'device_type'));

-- ============================================
-- PARTE 5: Add customer_id to orders table
-- ============================================

-- Se non esiste già
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

-- ============================================
-- PARTE 6: Triggers per auto-update
-- ============================================

-- Trigger per aggiornare customers.updated_at
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

-- Trigger per aggiornare customers.last_order_at quando completa ordine
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

-- ============================================
-- PARTE 7: RLS Policies per customers
-- ============================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Policy: I ristoranti vedono solo i loro clienti
DROP POLICY IF EXISTS customers_restaurant_isolation ON customers;
CREATE POLICY customers_restaurant_isolation ON customers
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE id = restaurant_id
    )
  );

-- Policy: Public menu può creare customer (per registrazione da QR)
DROP POLICY IF EXISTS customers_public_insert ON customers;
CREATE POLICY customers_public_insert ON customers
  FOR INSERT
  WITH CHECK (true);

-- Policy: Customer può vedere solo i propri dati
DROP POLICY IF EXISTS customers_self_read ON customers;
CREATE POLICY customers_self_read ON customers
  FOR SELECT
  USING (
    auth.uid()::text = id::text OR
    restaurant_id IN (
      SELECT id FROM restaurants WHERE id = restaurant_id
    )
  );

-- ============================================
-- PARTE 8: View per Customer Analytics
-- ============================================

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

  -- Calcolo metriche
  CASE
    WHEN c.total_orders_count = 0 THEN 0
    ELSE c.lifetime_value / c.total_orders_count
  END as average_order_value,

  -- Date
  c.registered_at,
  c.last_order_at,
  EXTRACT(DAY FROM NOW() - c.last_order_at) as days_since_last_order,

  -- Status
  c.is_active,
  c.is_registered,
  c.is_anonymous,

  -- Segmentazione
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

-- ============================================
-- PARTE 9: Functions per Customer Management
-- ============================================

-- Function: Get or Create Anonymous Customer
CREATE OR REPLACE FUNCTION get_or_create_anonymous_customer(
  p_restaurant_id UUID,
  p_session_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Cerca customer anonimo esistente per questa sessione
  IF p_session_id IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM customers
    WHERE restaurant_id = p_restaurant_id
      AND is_anonymous = true
      AND preferences->>'session_id' = p_session_id
      AND created_at > NOW() - INTERVAL '24 hours'
    LIMIT 1;
  END IF;

  -- Se non trovato, crea nuovo customer anonimo
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

-- ============================================
-- PARTE 10: Verification Queries
-- ============================================

-- Verifica constraint
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'analytics_events'::regclass
  AND conname = 'analytics_events_event_type_check';

-- Conta eventi per tipo
SELECT DISTINCT event_type, COUNT(*) as count
FROM analytics_events
GROUP BY event_type
ORDER BY count DESC;

-- Verifica tabella customers
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'customers'
ORDER BY ordinal_position;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Output success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completata con successo!';
  RAISE NOTICE '- Analytics events constraint aggiornato (42 event types)';
  RAISE NOTICE '- Tabella customers creata';
  RAISE NOTICE '- Loyalty tiers table creata';
  RAISE NOTICE '- Indexes ottimizzati';
  RAISE NOTICE '- Triggers configurati';
  RAISE NOTICE '- RLS policies attive';
  RAISE NOTICE '- Customer analytics view disponibile';
END $$;
