-- ============================================
-- MIGRATION PART 2: Customers Table (SIMPLE VERSION)
-- ============================================

-- Drop existing objects
DROP VIEW IF EXISTS customer_analytics CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Create customers table - NO CONSTRAINTS INLINE
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,

  name VARCHAR(200),
  email VARCHAR(255),
  phone VARCHAR(50),
  locale VARCHAR(10) DEFAULT 'it-IT',

  is_registered BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  is_anonymous BOOLEAN DEFAULT false,

  loyalty_tier VARCHAR(20) DEFAULT 'none',
  loyalty_points INT DEFAULT 0,
  lifetime_value DECIMAL(10,2) DEFAULT 0.00,
  total_orders_count INT DEFAULT 0,

  dietary_restrictions TEXT[],
  allergies TEXT[],
  favorite_products UUID[],
  preferences JSONB DEFAULT '{}'::jsonb,

  marketing_consent BOOLEAN DEFAULT false,
  sms_consent BOOLEAN DEFAULT false,
  push_consent BOOLEAN DEFAULT false,

  registration_source VARCHAR(50),
  registration_method VARCHAR(50),
  traffic_source VARCHAR(50),
  utm_source VARCHAR(100),
  utm_campaign VARCHAR(100),

  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_order_at TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Add foreign key
ALTER TABLE customers
  ADD CONSTRAINT fk_customers_restaurant
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;

-- Add check constraints
ALTER TABLE customers
  ADD CONSTRAINT check_loyalty_tier
  CHECK (loyalty_tier IN ('none', 'bronze', 'silver', 'gold'));

ALTER TABLE customers
  ADD CONSTRAINT check_loyalty_points
  CHECK (loyalty_points >= 0);

ALTER TABLE customers
  ADD CONSTRAINT check_email_or_phone
  CHECK (is_anonymous = true OR email IS NOT NULL OR phone IS NOT NULL);

-- Add unique constraint
ALTER TABLE customers
  ADD CONSTRAINT unique_email_per_restaurant
  UNIQUE (restaurant_id, email);

-- Create indexes
CREATE INDEX idx_customers_restaurant ON customers(restaurant_id);
CREATE INDEX idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_customers_loyalty ON customers(restaurant_id, loyalty_tier, loyalty_points);
CREATE INDEX idx_customers_active ON customers(restaurant_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_registered ON customers(restaurant_id, is_registered, is_anonymous);

-- Comments
COMMENT ON TABLE customers IS 'Clienti registrati e anonimi (Cliente Incognito)';
COMMENT ON COLUMN customers.is_anonymous IS 'true per "Cliente Incognito" (ordini da QR senza registrazione)';
COMMENT ON COLUMN customers.lifetime_value IS 'Valore totale ordini del cliente (LTV)';

-- Verification query
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'customers'
ORDER BY ordinal_position;
