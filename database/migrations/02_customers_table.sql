-- ============================================
-- MIGRATION PART 2: Customers Table
-- ============================================

-- Drop view if exists (to recreate later)
DROP VIEW IF EXISTS customer_analytics;

-- Create customers table
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
  registration_source VARCHAR(50),
  registration_method VARCHAR(50),
  traffic_source VARCHAR(50),
  utm_source VARCHAR(100),
  utm_campaign VARCHAR(100),

  -- Timestamps
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_order_at TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT customers_unique_email_per_restaurant UNIQUE (restaurant_id, email),
  CONSTRAINT customers_email_or_phone_required CHECK (
    is_anonymous = true OR email IS NOT NULL OR phone IS NOT NULL
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_restaurant ON customers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_loyalty ON customers(restaurant_id, loyalty_tier, loyalty_points);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(restaurant_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_registered ON customers(restaurant_id, is_registered, is_anonymous);

-- Comments
COMMENT ON TABLE customers IS 'Clienti registrati e anonimi (Cliente Incognito)';
COMMENT ON COLUMN customers.is_anonymous IS 'true per "Cliente Incognito" (ordini da QR senza registrazione)';
COMMENT ON COLUMN customers.lifetime_value IS 'Valore totale ordini del cliente (LTV)';

-- Verification
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'customers'
ORDER BY ordinal_position;
