-- =====================================================
-- MIGRATION: Sistema Ruoli Custom e Permessi Granulari
-- Data: 2025-10-26
-- Descrizione: Implementazione completa sistema ruoli
--              con permessi granulari e tracking avanzato
-- =====================================================

-- =====================================================
-- 1. TABELLA ROLES - Ruoli Custom per Ristorante
-- =====================================================

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,

  -- Identificazione ruolo
  name VARCHAR(100) NOT NULL,                    -- chiave interna (es: 'manager', 'waiter')
  display_name VARCHAR(100) NOT NULL,            -- nome visualizzato (es: 'Manager', 'Cameriere')
  description TEXT,                              -- descrizione del ruolo

  -- Permessi granulari (JSONB per flessibilità)
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Metadata
  is_system BOOLEAN NOT NULL DEFAULT false,      -- ruoli di sistema non eliminabili
  is_active BOOLEAN NOT NULL DEFAULT true,       -- ruolo attivo
  sort_order INTEGER DEFAULT 0,                  -- ordine visualizzazione

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,                               -- chi ha creato

  -- Vincoli
  UNIQUE(restaurant_id, name)                    -- nome unico per ristorante
);

-- Indici per performance
CREATE INDEX idx_roles_restaurant_id ON roles(restaurant_id);
CREATE INDEX idx_roles_is_active ON roles(restaurant_id, is_active) WHERE is_active = true;
CREATE INDEX idx_roles_is_system ON roles(is_system) WHERE is_system = true;

-- Trigger per updated_at
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policy
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ristoranti accedono ai propri ruoli"
  ON roles
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
      UNION
      SELECT restaurant_id FROM restaurant_staff WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 2. INSERIMENTO RUOLI DI SISTEMA DEFAULT
-- =====================================================

-- Funzione helper per creare ruoli default
CREATE OR REPLACE FUNCTION create_default_roles_for_restaurant(p_restaurant_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Admin (proprietario)
  INSERT INTO roles (restaurant_id, name, display_name, description, is_system, permissions, sort_order)
  VALUES (
    p_restaurant_id,
    'admin',
    'Admin',
    'Accesso completo a tutte le funzionalità',
    true,
    '{
      "orders": {"create": true, "read": true, "update": true, "delete": true, "confirm": true, "complete": true},
      "cassa": {"access": true, "close_day": true, "fiscal_receipts": true},
      "tables": {"create": true, "read": true, "update": true, "delete": true, "change": true},
      "products": {"create": true, "read": true, "update": true, "delete": true},
      "staff": {"create": true, "read": true, "update": true, "delete": true},
      "analytics": {"view_all": true, "export": true},
      "settings": {"read": true, "update": true}
    }'::jsonb,
    1
  ) ON CONFLICT (restaurant_id, name) DO NOTHING;

  -- Manager
  INSERT INTO roles (restaurant_id, name, display_name, description, is_system, permissions, sort_order)
  VALUES (
    p_restaurant_id,
    'manager',
    'Manager',
    'Gestione completa operativa, senza accesso a impostazioni critiche',
    true,
    '{
      "orders": {"create": true, "read": true, "update": true, "delete": true, "confirm": true, "complete": true},
      "cassa": {"access": true, "close_day": true, "fiscal_receipts": true},
      "tables": {"create": true, "read": true, "update": true, "delete": false, "change": true},
      "products": {"create": true, "read": true, "update": true, "delete": false},
      "staff": {"create": false, "read": true, "update": false, "delete": false},
      "analytics": {"view_all": true, "export": false},
      "settings": {"read": true, "update": false}
    }'::jsonb,
    2
  ) ON CONFLICT (restaurant_id, name) DO NOTHING;

  -- Cameriere
  INSERT INTO roles (restaurant_id, name, display_name, description, is_system, permissions, sort_order)
  VALUES (
    p_restaurant_id,
    'waiter',
    'Cameriere',
    'Gestione ordini e tavoli',
    true,
    '{
      "orders": {"create": true, "read": true, "update": true, "delete": false, "confirm": true, "complete": true},
      "cassa": {"access": false, "close_day": false, "fiscal_receipts": false},
      "tables": {"create": false, "read": true, "update": false, "delete": false, "change": true},
      "products": {"create": false, "read": true, "update": false, "delete": false},
      "staff": {"create": false, "read": false, "update": false, "delete": false},
      "analytics": {"view_all": false, "export": false},
      "settings": {"read": false, "update": false}
    }'::jsonb,
    3
  ) ON CONFLICT (restaurant_id, name) DO NOTHING;

  -- Cuoco
  INSERT INTO roles (restaurant_id, name, display_name, description, is_system, permissions, sort_order)
  VALUES (
    p_restaurant_id,
    'cook',
    'Cuoco',
    'Visualizzazione ordini cucina',
    true,
    '{
      "orders": {"create": false, "read": true, "update": true, "delete": false, "confirm": false, "complete": false},
      "cassa": {"access": false, "close_day": false, "fiscal_receipts": false},
      "tables": {"create": false, "read": true, "update": false, "delete": false, "change": false},
      "products": {"create": false, "read": true, "update": false, "delete": false},
      "staff": {"create": false, "read": false, "update": false, "delete": false},
      "analytics": {"view_all": false, "export": false},
      "settings": {"read": false, "update": false}
    }'::jsonb,
    4
  ) ON CONFLICT (restaurant_id, name) DO NOTHING;

  -- Barista
  INSERT INTO roles (restaurant_id, name, display_name, description, is_system, permissions, sort_order)
  VALUES (
    p_restaurant_id,
    'bartender',
    'Barista',
    'Visualizzazione ordini bar',
    true,
    '{
      "orders": {"create": false, "read": true, "update": true, "delete": false, "confirm": false, "complete": false},
      "cassa": {"access": false, "close_day": false, "fiscal_receipts": false},
      "tables": {"create": false, "read": true, "update": false, "delete": false, "change": false},
      "products": {"create": false, "read": true, "update": false, "delete": false},
      "staff": {"create": false, "read": false, "update": false, "delete": false},
      "analytics": {"view_all": false, "export": false},
      "settings": {"read": false, "update": false}
    }'::jsonb,
    5
  ) ON CONFLICT (restaurant_id, name) DO NOTHING;

  -- Cassiere
  INSERT INTO roles (restaurant_id, name, display_name, description, is_system, permissions, sort_order)
  VALUES (
    p_restaurant_id,
    'cashier',
    'Cassiere',
    'Accesso cassa e chiusura giornata',
    true,
    '{
      "orders": {"create": true, "read": true, "update": false, "delete": false, "confirm": false, "complete": true},
      "cassa": {"access": true, "close_day": true, "fiscal_receipts": true},
      "tables": {"create": false, "read": true, "update": false, "delete": false, "change": false},
      "products": {"create": false, "read": true, "update": false, "delete": false},
      "staff": {"create": false, "read": false, "update": false, "delete": false},
      "analytics": {"view_all": false, "export": false},
      "settings": {"read": false, "update": false}
    }'::jsonb,
    6
  ) ON CONFLICT (restaurant_id, name) DO NOTHING;

END;
$$ LANGUAGE plpgsql;

-- Commento
COMMENT ON TABLE roles IS 'Ruoli custom per ristorante con permessi granulari JSONB';
COMMENT ON COLUMN roles.permissions IS 'Struttura JSONB: {"resource": {"action": true/false}}';
COMMENT ON FUNCTION create_default_roles_for_restaurant IS 'Crea ruoli di sistema default per nuovo ristorante';

-- =====================================================
-- 3. FIX RESTAURANT_STAFF - Risoluzione Conflitto Role
-- =====================================================

-- Rinomina colonna role legacy per evitare conflitto
ALTER TABLE restaurant_staff
  RENAME COLUMN role TO role_legacy;

-- Aggiungi colonna role_id per FK a roles
ALTER TABLE restaurant_staff
  ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;

-- Indice per performance
CREATE INDEX IF NOT EXISTS idx_restaurant_staff_role_id ON restaurant_staff(role_id);

-- Migra dati esistenti (mapping role_legacy → role_id)
-- Questa funzione verrà eseguita manualmente o da trigger
CREATE OR REPLACE FUNCTION migrate_staff_roles_to_new_system()
RETURNS VOID AS $$
DECLARE
  staff_record RECORD;
  role_mapping RECORD;
BEGIN
  FOR staff_record IN
    SELECT id, restaurant_id, role_legacy
    FROM restaurant_staff
    WHERE role_id IS NULL
  LOOP
    -- Trova role_id corrispondente
    SELECT id INTO role_mapping
    FROM roles
    WHERE restaurant_id = staff_record.restaurant_id
      AND (
        (staff_record.role_legacy = 'manager' AND name = 'manager')
        OR (staff_record.role_legacy = 'waiter' AND name = 'waiter')
      )
    LIMIT 1;

    -- Assegna role_id
    IF FOUND THEN
      UPDATE restaurant_staff
      SET role_id = role_mapping.id
      WHERE id = staff_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Commento
COMMENT ON COLUMN restaurant_staff.role_legacy IS 'DEPRECATED: Usa role_id. Mantenuto per compatibilità.';
COMMENT ON COLUMN restaurant_staff.role_id IS 'Riferimento al ruolo custom in tabella roles';

-- =====================================================
-- 4. AGGIORNAMENTO ORDER_TIMELINE - Tracking Completo
-- =====================================================

-- Aggiungi nuove colonne per tracking
ALTER TABLE order_timeline
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_type VARCHAR(20) CHECK (created_by_type IN ('staff', 'customer', 'system', 'owner')),
  ADD COLUMN IF NOT EXISTS staff_role_display TEXT;

-- Indici per analytics
CREATE INDEX IF NOT EXISTS idx_order_timeline_user_id ON order_timeline(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_timeline_created_by_type ON order_timeline(created_by_type);
CREATE INDEX IF NOT EXISTS idx_order_timeline_staff_role_display ON order_timeline(staff_role_display) WHERE staff_role_display IS NOT NULL;

-- Aggiorna constraint action per includere nuovi eventi
ALTER TABLE order_timeline
  DROP CONSTRAINT IF EXISTS order_timeline_action_check;

ALTER TABLE order_timeline
  ADD CONSTRAINT order_timeline_action_check
  CHECK (action IN (
    'created', 'confirmed', 'preparing', 'completed', 'cancelled', 'updated',
    'item_added', 'item_removed', 'item_updated',
    'table_changed', 'priority_added', 'priority_removed',
    'reopened', 'payment_added', 'note_updated'
  ));

-- Commenti
COMMENT ON COLUMN order_timeline.user_id IS 'User ID proprietario se azione fatta da owner';
COMMENT ON COLUMN order_timeline.staff_id IS 'Staff ID se azione fatta da staff member';
COMMENT ON COLUMN order_timeline.created_by_type IS 'Tipo operatore: staff, customer, system, owner';
COMMENT ON COLUMN order_timeline.staff_role_display IS 'Snapshot display_name del ruolo al momento dell''azione';

-- =====================================================
-- 5. AGGIORNAMENTO TABLE_CHANGE_LOGS - Tracking Completo
-- =====================================================

-- Aggiungi colonna per tracking user_id (proprietario)
ALTER TABLE table_change_logs
  ADD COLUMN IF NOT EXISTS changed_by_user_id UUID,
  ADD COLUMN IF NOT EXISTS changed_by_type VARCHAR(20) CHECK (changed_by_type IN ('staff', 'owner', 'system')),
  ADD COLUMN IF NOT EXISTS changed_by_role_display TEXT;

-- Indici
CREATE INDEX IF NOT EXISTS idx_table_change_logs_user_id ON table_change_logs(changed_by_user_id) WHERE changed_by_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_table_change_logs_type ON table_change_logs(changed_by_type);

-- Commenti
COMMENT ON COLUMN table_change_logs.changed_by_user_id IS 'User ID proprietario se cambio fatto da owner';
COMMENT ON COLUMN table_change_logs.changed_by_type IS 'Tipo operatore: staff, owner, system';
COMMENT ON COLUMN table_change_logs.changed_by_role_display IS 'Snapshot display_name ruolo al momento del cambio';

-- =====================================================
-- 6. TRIGGER PER POPOLARE AUTOMATICAMENTE STAFF_ROLE
-- =====================================================

CREATE OR REPLACE FUNCTION populate_timeline_staff_info()
RETURNS TRIGGER AS $$
DECLARE
  v_role_display TEXT;
  v_staff_name TEXT;
  v_user_name TEXT;
BEGIN
  -- Se è uno staff member
  IF NEW.staff_id IS NOT NULL THEN
    -- Recupera display_name del ruolo e nome staff
    SELECT
      r.display_name,
      COALESCE(
        NULLIF(TRIM(s.first_name || ' ' || s.last_name), ''),
        s.name
      )
    INTO v_role_display, v_staff_name
    FROM restaurant_staff s
    LEFT JOIN roles r ON s.role_id = r.id
    WHERE s.id = NEW.staff_id;

    NEW.staff_role_display := v_role_display;
    NEW.staff_name := COALESCE(NEW.staff_name, v_staff_name);
    NEW.created_by_type := 'staff';

  -- Se è il proprietario (user_id)
  ELSIF NEW.user_id IS NOT NULL THEN
    -- Recupera nome proprietario da restaurants
    SELECT
      COALESCE(
        NULLIF(TRIM(owner_first_name || ' ' || owner_last_name), ''),
        'Proprietario'
      )
    INTO v_user_name
    FROM restaurants
    WHERE user_id = NEW.user_id;

    NEW.staff_name := v_user_name;
    NEW.staff_role_display := 'Admin';
    NEW.created_by_type := 'owner';

  -- Se non c'è né staff né user (cliente o sistema)
  ELSE
    IF NEW.created_by_type IS NULL THEN
      NEW.created_by_type := 'system';
    END IF;

    IF NEW.created_by_type = 'customer' THEN
      NEW.staff_name := COALESCE(NEW.staff_name, 'Cliente Incognito');
      NEW.staff_role_display := 'Cliente';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger BEFORE INSERT per popolare info
DROP TRIGGER IF EXISTS trigger_populate_timeline_staff_info ON order_timeline;
CREATE TRIGGER trigger_populate_timeline_staff_info
  BEFORE INSERT ON order_timeline
  FOR EACH ROW
  EXECUTE FUNCTION populate_timeline_staff_info();

-- Stesso trigger per table_change_logs
CREATE OR REPLACE FUNCTION populate_table_change_staff_info()
RETURNS TRIGGER AS $$
DECLARE
  v_role_display TEXT;
  v_staff_name TEXT;
  v_user_name TEXT;
BEGIN
  -- Se è uno staff member
  IF NEW.changed_by_user_id IS NOT NULL AND NEW.changed_by_type IS NULL THEN
    -- Check se è staff
    SELECT
      r.display_name,
      COALESCE(
        NULLIF(TRIM(s.first_name || ' ' || s.last_name), ''),
        s.name
      )
    INTO v_role_display, v_staff_name
    FROM restaurant_staff s
    LEFT JOIN roles r ON s.role_id = r.id
    WHERE s.id::text = NEW.changed_by_user_id::text;

    IF FOUND THEN
      NEW.changed_by_role_display := v_role_display;
      NEW.changed_by_name := COALESCE(NEW.changed_by_name, v_staff_name);
      NEW.changed_by_type := 'staff';
    ELSE
      -- È il proprietario
      SELECT
        COALESCE(
          NULLIF(TRIM(owner_first_name || ' ' || owner_last_name), ''),
          'Proprietario'
        )
      INTO v_user_name
      FROM restaurants
      WHERE user_id::text = NEW.changed_by_user_id::text;

      NEW.changed_by_name := v_user_name;
      NEW.changed_by_role_display := 'Admin';
      NEW.changed_by_type := 'owner';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_populate_table_change_staff_info ON table_change_logs;
CREATE TRIGGER trigger_populate_table_change_staff_info
  BEFORE INSERT ON table_change_logs
  FOR EACH ROW
  EXECUTE FUNCTION populate_table_change_staff_info();

-- =====================================================
-- 7. VIEWS ANALYTICS ESTENSIBILI
-- =====================================================

-- View: Performance per ruolo (estensibile)
DROP VIEW IF EXISTS v_role_performance_analytics CASCADE;
CREATE OR REPLACE VIEW v_role_performance_analytics AS
SELECT
  ot.staff_role_display as role_name,
  o.restaurant_id,

  -- Metriche ordini
  COUNT(DISTINCT CASE WHEN ot.action = 'created' THEN ot.order_id END) as orders_created,
  COUNT(DISTINCT CASE WHEN ot.action = 'confirmed' THEN ot.order_id END) as orders_confirmed,
  COUNT(DISTINCT CASE WHEN ot.action = 'completed' THEN ot.order_id END) as orders_completed,
  COUNT(DISTINCT CASE WHEN ot.action = 'cancelled' THEN ot.order_id END) as orders_cancelled,

  -- Metriche revenue
  SUM(CASE WHEN ot.action = 'completed' THEN o.total_amount ELSE 0 END) as total_revenue,
  AVG(CASE WHEN ot.action = 'completed' THEN o.total_amount END) as avg_order_value,

  -- Metriche tavoli
  COUNT(DISTINCT CASE WHEN ot.action = 'table_changed' THEN ot.order_id END) as table_changes,

  -- Membri unici per ruolo
  COUNT(DISTINCT ot.staff_name) as members_count,

  -- Temporal
  MIN(ot.created_at) as first_action_date,
  MAX(ot.created_at) as last_action_date

FROM order_timeline ot
JOIN orders o ON ot.order_id = o.id
WHERE o.deleted_at IS NULL
  AND ot.staff_role_display IS NOT NULL
GROUP BY ot.staff_role_display, o.restaurant_id;

-- View: Performance per staff member (estensibile)
DROP VIEW IF EXISTS v_staff_member_analytics CASCADE;
CREATE OR REPLACE VIEW v_staff_member_analytics AS
SELECT
  ot.staff_id,
  ot.staff_name,
  ot.staff_role_display,
  o.restaurant_id,

  -- Metriche ordini
  COUNT(DISTINCT CASE WHEN ot.action = 'created' THEN ot.order_id END) as orders_created,
  COUNT(DISTINCT CASE WHEN ot.action = 'confirmed' THEN ot.order_id END) as orders_confirmed,
  COUNT(DISTINCT CASE WHEN ot.action = 'completed' THEN ot.order_id END) as orders_completed,
  COUNT(DISTINCT CASE WHEN ot.action = 'cancelled' THEN ot.order_id END) as orders_cancelled,

  -- Metriche revenue
  SUM(CASE WHEN ot.action = 'completed' THEN o.total_amount ELSE 0 END) as total_revenue,
  AVG(CASE WHEN ot.action = 'completed' THEN o.total_amount END) as avg_order_value,

  -- Metriche tavoli
  COUNT(DISTINCT CASE WHEN o.table_id IS NOT NULL THEN o.table_id END) as unique_tables_served,
  COUNT(DISTINCT CASE WHEN ot.action = 'table_changed' THEN ot.order_id END) as table_changes_made,

  -- Metriche prodotti
  COUNT(DISTINCT CASE WHEN ot.action = 'item_added' THEN ot.id END) as items_added,

  -- Temporal
  MIN(ot.created_at) as first_action_date,
  MAX(ot.created_at) as last_action_date,

  -- Performance
  EXTRACT(EPOCH FROM (MAX(ot.created_at) - MIN(ot.created_at))) / NULLIF(COUNT(DISTINCT ot.order_id), 0) as avg_seconds_per_order

FROM order_timeline ot
JOIN orders o ON ot.order_id = o.id
WHERE o.deleted_at IS NULL
  AND ot.staff_id IS NOT NULL
GROUP BY ot.staff_id, ot.staff_name, ot.staff_role_display, o.restaurant_id;

-- View: Metriche giornaliere per staff (estensibile)
CREATE OR REPLACE VIEW v_staff_daily_metrics AS
SELECT
  ot.staff_id,
  ot.staff_name,
  ot.staff_role_display,
  o.restaurant_id,
  DATE(ot.created_at) as date,

  -- Conteggi giornalieri
  COUNT(DISTINCT CASE WHEN ot.action = 'created' THEN ot.order_id END) as daily_orders_created,
  COUNT(DISTINCT CASE WHEN ot.action = 'completed' THEN ot.order_id END) as daily_orders_completed,
  SUM(CASE WHEN ot.action = 'completed' THEN o.total_amount ELSE 0 END) as daily_revenue,

  -- Tavoli
  COUNT(DISTINCT o.table_id) as daily_tables_served,

  -- Timing
  MIN(ot.created_at) as shift_start,
  MAX(ot.created_at) as shift_end,
  EXTRACT(EPOCH FROM (MAX(ot.created_at) - MIN(ot.created_at))) / 3600 as hours_worked

FROM order_timeline ot
JOIN orders o ON ot.order_id = o.id
WHERE o.deleted_at IS NULL
  AND ot.staff_id IS NOT NULL
GROUP BY ot.staff_id, ot.staff_name, ot.staff_role_display, o.restaurant_id, DATE(ot.created_at);

-- Commenti
COMMENT ON VIEW v_role_performance_analytics IS 'Analytics aggregati per ruolo - estensibile con nuove metriche';
COMMENT ON VIEW v_staff_member_analytics IS 'Analytics per singolo staff member - KPI completi';
COMMENT ON VIEW v_staff_daily_metrics IS 'Metriche giornaliere per staff - tracking turni e performance';

-- =====================================================
-- 8. FUNZIONI HELPER PER PERMESSI
-- =====================================================

-- Funzione per verificare se staff ha permesso
CREATE OR REPLACE FUNCTION staff_has_permission(
  p_staff_id UUID,
  p_permission_path TEXT  -- es: 'orders.create', 'cassa.access'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_permissions JSONB;
  v_parts TEXT[];
  v_resource TEXT;
  v_action TEXT;
  v_has_permission BOOLEAN;
BEGIN
  -- Split permission path
  v_parts := string_to_array(p_permission_path, '.');
  v_resource := v_parts[1];
  v_action := v_parts[2];

  -- Recupera permessi del ruolo dello staff
  SELECT r.permissions
  INTO v_permissions
  FROM restaurant_staff s
  JOIN roles r ON s.role_id = r.id
  WHERE s.id = p_staff_id;

  -- Se non trovato, nega permesso
  IF v_permissions IS NULL THEN
    RETURN false;
  END IF;

  -- Controlla permesso nel JSONB
  v_has_permission := COALESCE(
    (v_permissions -> v_resource ->> v_action)::boolean,
    false
  );

  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql STABLE;

-- Funzione per ottenere tutti i permessi di uno staff
CREATE OR REPLACE FUNCTION get_staff_permissions(p_staff_id UUID)
RETURNS JSONB AS $$
  SELECT r.permissions
  FROM restaurant_staff s
  JOIN roles r ON s.role_id = r.id
  WHERE s.id = p_staff_id;
$$ LANGUAGE sql STABLE;

-- Commenti
COMMENT ON FUNCTION staff_has_permission IS 'Verifica se staff ha un permesso specifico (es: orders.create)';
COMMENT ON FUNCTION get_staff_permissions IS 'Ritorna tutti i permessi JSONB dello staff';

-- =====================================================
-- FINE MIGRATION
-- =====================================================

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Migration create_roles_system.sql completata con successo!';
  RAISE NOTICE 'Prossimi step:';
  RAISE NOTICE '1. Eseguire create_default_roles_for_restaurant() per ogni ristorante';
  RAISE NOTICE '2. Eseguire migrate_staff_roles_to_new_system() per migrare staff esistenti';
END $$;
