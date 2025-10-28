/**
 * Migration 14: Subscription Plans System (FIXED VERSION)
 *
 * Versione corretta che usa subscription_tier invece di is_premium
 *
 * @version 14.0.1
 * @date 2025-10-27
 */

-- ============================================
-- 1. TABELLA PIANI DI ABBONAMENTO
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Info Piano
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,

  -- Prezzi
  price_monthly DECIMAL(10,2) DEFAULT 0,
  price_yearly DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'EUR',

  -- Stripe (per integrazione futura)
  stripe_price_id_monthly VARCHAR(100),
  stripe_price_id_yearly VARCHAR(100),
  stripe_product_id VARCHAR(100),

  -- Features (array di feature keys)
  features JSONB DEFAULT '[]'::jsonb,

  -- Limiti
  limits JSONB DEFAULT '{
    "staff_members": -1,
    "products": -1,
    "orders_per_month": -1,
    "rooms": -1,
    "tables": -1,
    "storage_mb": -1
  }'::jsonb,

  -- Visibilità
  is_active BOOLEAN DEFAULT true,
  is_visible BOOLEAN DEFAULT true,
  is_legacy BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON subscription_plans(slug);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_visible ON subscription_plans(is_visible, is_active);

COMMENT ON TABLE subscription_plans IS 'Piani di abbonamento configurabili dal Super Admin';
COMMENT ON COLUMN subscription_plans.features IS 'Array di feature keys disponibili nel piano';
COMMENT ON COLUMN subscription_plans.limits IS 'Limiti del piano (-1 = unlimited)';
COMMENT ON COLUMN subscription_plans.is_legacy IS 'Piano legacy per utenti esistenti';


-- ============================================
-- 2. TABELLA FEATURE FLAGS
-- ============================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Info Feature
  key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50),

  -- Mapping Permission
  requires_permission VARCHAR(100),

  -- Configurazione
  is_active BOOLEAN DEFAULT true,
  is_beta BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_category ON feature_flags(category);
CREATE INDEX IF NOT EXISTS idx_feature_flags_active ON feature_flags(is_active);

COMMENT ON TABLE feature_flags IS 'Catalogo centralizzato di tutte le features disponibili';
COMMENT ON COLUMN feature_flags.key IS 'Chiave univoca feature (es: analytics.advanced)';
COMMENT ON COLUMN feature_flags.requires_permission IS 'Permission key richiesta per accedere';


-- ============================================
-- 3. AGGIORNAMENTO TABELLA RESTAURANTS
-- ============================================

-- Aggiungere colonne subscription
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS subscription_plan_id UUID REFERENCES subscription_plans(id),
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_metadata JSONB DEFAULT '{}'::jsonb;

-- Indici
CREATE INDEX IF NOT EXISTS idx_restaurants_subscription_plan ON restaurants(subscription_plan_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_subscription_expires ON restaurants(subscription_expires_at);

COMMENT ON COLUMN restaurants.subscription_plan_id IS 'Foreign key al piano di abbonamento';
COMMENT ON COLUMN restaurants.subscription_status IS 'active, cancelled, expired, trial, suspended (già esiste)';
COMMENT ON COLUMN restaurants.subscription_metadata IS 'Dati Stripe: customer_id, subscription_id, payment_method';


-- ============================================
-- 4. TABELLA SUPER ADMINS
-- ============================================

CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Credenziali
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,

  -- Info Personali
  name VARCHAR(200),
  avatar_url TEXT,

  -- 2FA
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret TEXT,
  backup_codes JSONB DEFAULT '[]'::jsonb,

  -- Sicurezza
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  last_login_ip INET,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,

  -- Permissions (per futuri multi-admin)
  permissions JSONB DEFAULT '["*"]'::jsonb,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_super_admins_email ON super_admins(email);
CREATE INDEX IF NOT EXISTS idx_super_admins_active ON super_admins(is_active);

COMMENT ON TABLE super_admins IS 'Creatori app con accesso completo al sistema';
COMMENT ON COLUMN super_admins.two_factor_secret IS 'Secret TOTP per Google Authenticator';
COMMENT ON COLUMN super_admins.permissions IS 'Wildcard * = full access';


-- ============================================
-- 5. TABELLA SUBSCRIPTION EVENTS
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),

  -- Event Info
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,

  -- Billing
  amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'EUR',

  -- Stripe
  stripe_event_id VARCHAR(100),
  stripe_invoice_id VARCHAR(100),
  stripe_payment_intent_id VARCHAR(100),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_subscription_events_restaurant ON subscription_events(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created ON subscription_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe ON subscription_events(stripe_event_id);

COMMENT ON TABLE subscription_events IS 'Log di tutti gli eventi subscription (upgrade, downgrade, payment, etc)';


-- ============================================
-- 6. TABELLA SUPER ADMIN AUDIT LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS super_admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  super_admin_id UUID REFERENCES super_admins(id) ON DELETE SET NULL,

  -- Action Info
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,

  -- Changes
  changes JSONB DEFAULT '{}'::jsonb,

  -- Request Info
  ip_address INET,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_super_admin_logs_admin ON super_admin_logs(super_admin_id);
CREATE INDEX IF NOT EXISTS idx_super_admin_logs_action ON super_admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_super_admin_logs_entity ON super_admin_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_super_admin_logs_created ON super_admin_logs(created_at DESC);

COMMENT ON TABLE super_admin_logs IS 'Audit log di tutte le azioni dei Super Admin';


-- ============================================
-- 7. TABELLA REVENUE ANALYTICS
-- ============================================

CREATE TABLE IF NOT EXISTS revenue_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Time dimension
  date DATE NOT NULL,
  month VARCHAR(7), -- YYYY-MM
  year INTEGER,

  -- Plan dimension
  plan_id UUID REFERENCES subscription_plans(id),
  plan_name VARCHAR(100),

  -- Metrics
  new_subscriptions INTEGER DEFAULT 0,
  cancelled_subscriptions INTEGER DEFAULT 0,
  active_subscriptions INTEGER DEFAULT 0,

  mrr DECIMAL(10,2) DEFAULT 0, -- Monthly Recurring Revenue
  arr DECIMAL(10,2) DEFAULT 0, -- Annual Recurring Revenue

  revenue_new DECIMAL(10,2) DEFAULT 0,
  revenue_renewal DECIMAL(10,2) DEFAULT 0,
  revenue_total DECIMAL(10,2) DEFAULT 0,

  churn_rate DECIMAL(5,2) DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint per date + plan
  UNIQUE(date, plan_id)
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_revenue_analytics_date ON revenue_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_analytics_month ON revenue_analytics(month DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_analytics_plan ON revenue_analytics(plan_id);
CREATE INDEX IF NOT EXISTS idx_revenue_analytics_year ON revenue_analytics(year DESC);

COMMENT ON TABLE revenue_analytics IS 'Analytics giornaliere per revenue tracking';
COMMENT ON COLUMN revenue_analytics.mrr IS 'Monthly Recurring Revenue';
COMMENT ON COLUMN revenue_analytics.arr IS 'Annual Recurring Revenue';
COMMENT ON COLUMN revenue_analytics.churn_rate IS 'Tasso di abbandono (%)';


-- ============================================
-- 8. TRIGGERS
-- ============================================

-- Trigger per updated_at su subscription_plans
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER trigger_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_plans_updated_at();

-- Trigger per updated_at su feature_flags
CREATE OR REPLACE FUNCTION update_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER trigger_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_flags_updated_at();

-- Trigger per updated_at su super_admins
CREATE OR REPLACE FUNCTION update_super_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_super_admins_updated_at ON super_admins;
CREATE TRIGGER trigger_super_admins_updated_at
  BEFORE UPDATE ON super_admins
  FOR EACH ROW
  EXECUTE FUNCTION update_super_admins_updated_at();


-- ============================================
-- 9. POPOLARE PIANI INIZIALI
-- ============================================

-- Piano FREE
INSERT INTO subscription_plans (
  name,
  slug,
  description,
  price_monthly,
  price_yearly,
  features,
  limits,
  is_visible,
  sort_order
) VALUES (
  'Free',
  'free',
  'Piano gratuito con funzionalità base',
  0,
  0,
  '["orders.view", "orders.create", "products.view", "products.manage", "cashier.basic", "analytics.basic"]'::jsonb,
  '{
    "staff_members": 2,
    "products": 50,
    "orders_per_month": 100,
    "rooms": 1,
    "tables": 10,
    "storage_mb": 100
  }'::jsonb,
  true,
  1
)
ON CONFLICT (slug) DO NOTHING;

-- Piano PREMIUM
INSERT INTO subscription_plans (
  name,
  slug,
  description,
  price_monthly,
  price_yearly,
  features,
  limits,
  is_visible,
  sort_order
) VALUES (
  'Premium',
  'premium',
  'Piano completo per ristoranti professionali',
  49,
  490,
  '["*"]'::jsonb,
  '{
    "staff_members": -1,
    "products": -1,
    "orders_per_month": -1,
    "rooms": -1,
    "tables": -1,
    "storage_mb": -1
  }'::jsonb,
  true,
  2
)
ON CONFLICT (slug) DO NOTHING;

-- Piano PREMIUM LEGACY (per utenti esistenti)
INSERT INTO subscription_plans (
  name,
  slug,
  description,
  price_monthly,
  price_yearly,
  features,
  limits,
  is_visible,
  is_legacy,
  sort_order
) VALUES (
  'Premium Legacy',
  'premium-legacy',
  'Piano legacy per utenti Premium esistenti - Mantiene tutte le funzionalità attuali',
  0,
  0,
  '["*"]'::jsonb,
  '{
    "staff_members": -1,
    "products": -1,
    "orders_per_month": -1,
    "rooms": -1,
    "tables": -1,
    "storage_mb": -1
  }'::jsonb,
  false,
  true,
  999
)
ON CONFLICT (slug) DO NOTHING;

-- Piano SUPER ADMIN (nascosto, per te)
INSERT INTO subscription_plans (
  name,
  slug,
  description,
  price_monthly,
  price_yearly,
  features,
  limits,
  is_visible,
  sort_order
) VALUES (
  'Super Admin',
  'super-admin',
  'Accesso completo per amministratori sistema',
  0,
  0,
  '["*"]'::jsonb,
  '{
    "staff_members": -1,
    "products": -1,
    "orders_per_month": -1,
    "rooms": -1,
    "tables": -1,
    "storage_mb": -1
  }'::jsonb,
  false,
  998
)
ON CONFLICT (slug) DO NOTHING;


-- ============================================
-- 10. POPOLARE FEATURE FLAGS
-- ============================================

INSERT INTO feature_flags (key, name, description, category, requires_permission, is_active) VALUES
  -- ORDERS
  ('orders.view', 'Visualizza Ordini', 'Permette di visualizzare la lista ordini', 'orders', 'orders.view_all', true),
  ('orders.create', 'Crea Ordini', 'Permette di creare nuovi ordini', 'orders', 'orders.create', true),
  ('orders.manage', 'Gestisci Ordini', 'Permette di modificare/cancellare ordini', 'orders', 'orders.manage', true),
  ('orders.advanced_filters', 'Filtri Avanzati', 'Filtri avanzati per ricerca ordini', 'orders', 'orders.view_all', true),
  ('orders.export', 'Esporta Ordini', 'Esportazione ordini in CSV/Excel', 'orders', 'orders.view_all', true),

  -- PRODUCTS
  ('products.view', 'Visualizza Prodotti', 'Permette di visualizzare i prodotti', 'products', 'products.view', true),
  ('products.manage', 'Gestisci Prodotti', 'Permette di creare/modificare prodotti', 'products', 'products.manage', true),
  ('products.categories', 'Gestisci Categorie', 'Gestione categorie prodotti', 'products', 'products.manage', true),
  ('products.variants', 'Varianti Prodotto', 'Gestione varianti (taglie, colori)', 'products', 'products.manage', true),
  ('products.inventory', 'Gestione Inventario', 'Tracking inventario magazzino', 'products', 'products.manage', true),

  -- ANALYTICS
  ('analytics.basic', 'Analytics Base', 'Dashboard analytics base', 'analytics', 'analytics.view_reports', true),
  ('analytics.advanced', 'Analytics Avanzate', 'Report avanzati e custom', 'analytics', 'analytics.view_reports', true),
  ('analytics.realtime', 'Analytics Real-time', 'Dati in tempo reale', 'analytics', 'analytics.view_reports', true),
  ('analytics.export', 'Esporta Report', 'Esportazione report in PDF/Excel', 'analytics', 'analytics.export_data', true),

  -- CASHIER
  ('cashier.basic', 'Cassa Base', 'Funzionalità cassa base', 'cashier', 'cashier.access', true),
  ('cashier.advanced', 'Cassa Avanzata', 'Funzioni avanzate cassa', 'cashier', 'cashier.access', true),

  -- STAFF
  ('staff.view', 'Visualizza Staff', 'Visualizzare membri staff', 'staff', 'staff.view', true),
  ('staff.manage', 'Gestisci Staff', 'Gestione completa staff', 'staff', 'staff.manage', true),
  ('staff.roles', 'Ruoli Personalizzati', 'Creare ruoli custom', 'staff', 'staff.manage', true),

  -- CHANNELS
  ('channels.view', 'Visualizza Canali', 'Visualizzare canali vendita', 'channels', 'channels.view', true),
  ('channels.manage', 'Gestisci Canali', 'Gestione canali vendita', 'channels', 'channels.manage', true),

  -- RESTAURANT
  ('restaurant.settings', 'Impostazioni', 'Impostazioni ristorante', 'restaurant', 'restaurant.manage_settings', true),
  ('restaurant.api', 'API Access', 'Accesso API REST', 'restaurant', 'restaurant.manage_settings', true)
ON CONFLICT (key) DO NOTHING;


-- ============================================
-- 11. MIGRARE RISTORANTI ESISTENTI
-- ============================================

-- Assegnare piano "Premium Legacy" a ristoranti con subscription_tier = 'premium'
UPDATE restaurants
SET
  subscription_plan_id = (SELECT id FROM subscription_plans WHERE slug = 'premium-legacy'),
  subscription_started_at = COALESCE(subscription_started_at, created_at),
  subscription_metadata = COALESCE(subscription_metadata, '{}'::jsonb) || jsonb_build_object(
    'migrated_from', 'subscription_tier',
    'migration_date', NOW(),
    'original_tier', subscription_tier
  )
WHERE subscription_tier = 'premium'
  AND subscription_plan_id IS NULL;

-- Assegnare piano "Free" a ristoranti con subscription_tier = 'free' o NULL
UPDATE restaurants
SET
  subscription_plan_id = (SELECT id FROM subscription_plans WHERE slug = 'free'),
  subscription_started_at = COALESCE(subscription_started_at, created_at),
  subscription_metadata = COALESCE(subscription_metadata, '{}'::jsonb) || jsonb_build_object(
    'migrated_from', 'subscription_tier',
    'migration_date', NOW(),
    'original_tier', COALESCE(subscription_tier, 'none')
  )
WHERE (subscription_tier = 'free' OR subscription_tier IS NULL OR subscription_tier NOT IN ('premium', 'free'))
  AND subscription_plan_id IS NULL;


-- ============================================
-- 12. GRANT PERMISSIONS
-- ============================================

-- Grant accesso alle tabelle
GRANT ALL ON subscription_plans TO authenticated;
GRANT ALL ON feature_flags TO authenticated;
GRANT ALL ON subscription_events TO authenticated;
GRANT ALL ON revenue_analytics TO authenticated;
GRANT ALL ON super_admins TO authenticated;
GRANT ALL ON super_admin_logs TO authenticated;


-- ============================================
-- MIGRATION COMPLETATA
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 14: Subscription Plans System completata con successo!';
  RAISE NOTICE '📦 4 piani creati (Free, Premium, Premium Legacy, Super Admin)';
  RAISE NOTICE '🎯 23 feature flags popolate';
  RAISE NOTICE '🔄 Ristoranti esistenti migrati automaticamente';
  RAISE NOTICE '📊 Revenue analytics abilitata';
  RAISE NOTICE '🔐 Super Admin system pronto';
END $$;
