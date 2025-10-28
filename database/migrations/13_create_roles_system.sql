-- =====================================================
-- MIGRATION: Create Roles & Permissions System
-- Data: 2025-10-27
-- Descrizione: Crea sistema completo ruoli e permessi
--              per gestione staff con tracciamento KPI
-- =====================================================
-- Funzionalità:
--   - Tabella staff_roles con permessi granulari
--   - Tabella staff_role_assignments (many-to-many)
--   - Collegamento con restaurant_staff
--   - Tracking ruolo in order_timeline per KPI
--   - Ruoli predefiniti: Proprietario, Manager, Cameriere, Cassiere
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREA TABELLA RUOLI
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]', -- Array di stringhe: ["orders.view", "orders.create", ...]
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color per UI badge
  is_system_role BOOLEAN DEFAULT FALSE, -- TRUE per ruoli predefiniti (Proprietario)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(restaurant_id, name),

  -- Constraint per validare formato color hex
  CONSTRAINT valid_color_format CHECK (color ~* '^#[0-9A-F]{6}$')
);

COMMENT ON TABLE staff_roles IS 'Ruoli staff con permessi granulari per controllo accessi e KPI';
COMMENT ON COLUMN staff_roles.permissions IS 'Array JSON di permission keys (es: ["orders.view", "cashier.access"])';
COMMENT ON COLUMN staff_roles.color IS 'Colore hex per badge UI (es: #3B82F6)';
COMMENT ON COLUMN staff_roles.is_system_role IS 'TRUE per ruoli predefiniti non modificabili/eliminabili';

CREATE INDEX idx_staff_roles_restaurant ON staff_roles(restaurant_id);
CREATE INDEX idx_staff_roles_system ON staff_roles(is_system_role) WHERE is_system_role = TRUE;

-- =====================================================
-- 2. CREA TABELLA ASSEGNAZIONI RUOLI
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_role_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES restaurant_staff(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES staff_roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id), -- Proprietario che ha assegnato

  UNIQUE(staff_id, role_id)
);

COMMENT ON TABLE staff_role_assignments IS 'Assegnazioni ruoli a membri staff (many-to-many)';
COMMENT ON COLUMN staff_role_assignments.assigned_by IS 'User ID del proprietario che ha assegnato il ruolo';

CREATE INDEX idx_staff_role_assignments_staff ON staff_role_assignments(staff_id);
CREATE INDEX idx_staff_role_assignments_role ON staff_role_assignments(role_id);

-- =====================================================
-- 3. MODIFICA TABELLA RESTAURANT_STAFF
-- =====================================================

-- Aggiungi colonna per ruolo primario (per performance e display)
ALTER TABLE restaurant_staff
ADD COLUMN IF NOT EXISTS primary_role_id UUID REFERENCES staff_roles(id) ON DELETE SET NULL;

COMMENT ON COLUMN restaurant_staff.primary_role_id IS 'Ruolo principale mostrato in timeline e analytics. Se NULL, staff senza ruolo assegnato.';

CREATE INDEX idx_restaurant_staff_role ON restaurant_staff(primary_role_id) WHERE primary_role_id IS NOT NULL;

-- =====================================================
-- 4. MODIFICA TABELLA ORDER_TIMELINE
-- =====================================================

-- Aggiungi colonna per tracciare ruolo usato nell'azione (per KPI)
ALTER TABLE order_timeline
ADD COLUMN IF NOT EXISTS staff_role_id UUID REFERENCES staff_roles(id) ON DELETE SET NULL;

COMMENT ON COLUMN order_timeline.staff_role_id IS 'Ruolo dello staff al momento dell azione. Usato per KPI e analytics per ruolo.';

CREATE INDEX idx_order_timeline_staff_role ON order_timeline(staff_role_id) WHERE staff_role_id IS NOT NULL;

-- =====================================================
-- 5. SEED: RUOLI PREDEFINITI
-- =====================================================

-- Inserisci ruoli predefiniti per ogni ristorante esistente
DO $$
DECLARE
  restaurant_record RECORD;
  owner_role_id UUID;
  manager_role_id UUID;
  waiter_role_id UUID;
  cashier_role_id UUID;
BEGIN
  FOR restaurant_record IN SELECT id FROM restaurants
  LOOP
    RAISE NOTICE 'Creazione ruoli predefiniti per ristorante: %', restaurant_record.id;

    -- 1. RUOLO: PROPRIETARIO (tutti i permessi)
    INSERT INTO staff_roles (restaurant_id, name, description, permissions, color, is_system_role)
    VALUES (
      restaurant_record.id,
      'Proprietario',
      'Accesso completo a tutte le funzionalità del sistema',
      '["*"]'::jsonb, -- Wildcard: tutti i permessi
      '#8B5CF6', -- Violet
      TRUE
    )
    RETURNING id INTO owner_role_id;

    -- 2. RUOLO: MANAGER (gestione completa eccetto impostazioni)
    INSERT INTO staff_roles (restaurant_id, name, description, permissions, color, is_system_role)
    VALUES (
      restaurant_record.id,
      'Manager',
      'Gestione completa ordini, cassa, tavoli e analytics',
      jsonb_build_array(
        -- Ordini - accesso completo
        'orders.view_all', 'orders.view_details', 'orders.create', 'orders.edit',
        'orders.add_products', 'orders.remove_products', 'orders.edit_quantities',
        'orders.confirm', 'orders.start_preparing', 'orders.complete',
        'orders.cancel', 'orders.delete', 'orders.add_notes', 'orders.set_priority',
        'orders.change_table', 'orders.generate_preconto',
        -- Tavoli - accesso completo
        'tables.view', 'tables.open', 'tables.change', 'tables.close',
        -- Cassa - accesso completo
        'cashier.access', 'cashier.view_orders', 'cashier.close_tables',
        'cashier.print_receipt', 'cashier.generate_preconto', 'cashier.view_totals',
        -- Prodotti - solo visualizzazione
        'products.view',
        -- Staff - visualizzazione
        'staff.view',
        -- Analytics - accesso completo
        'analytics.view', 'analytics.view_revenue', 'analytics.view_products',
        'analytics.view_conversion', 'analytics.view_time_analysis', 'analytics.view_aov',
        'analytics.export'
      ),
      '#3B82F6', -- Blue
      FALSE
    )
    RETURNING id INTO manager_role_id;

    -- 3. RUOLO: CAMERIERE (operazioni base ordini e tavoli)
    INSERT INTO staff_roles (restaurant_id, name, description, permissions, color, is_system_role)
    VALUES (
      restaurant_record.id,
      'Cameriere',
      'Gestione ordini e servizio tavoli',
      jsonb_build_array(
        -- Ordini - operazioni base
        'orders.view_all', 'orders.view_details', 'orders.create', 'orders.edit',
        'orders.add_products', 'orders.edit_quantities', 'orders.confirm',
        'orders.add_notes', 'orders.set_priority',
        -- Tavoli - operazioni base
        'tables.view', 'tables.open', 'tables.change',
        -- Prodotti - solo visualizzazione
        'products.view'
      ),
      '#22C55E', -- Green
      FALSE
    )
    RETURNING id INTO waiter_role_id;

    -- 4. RUOLO: CASSIERE (solo cassa e chiusura)
    INSERT INTO staff_roles (restaurant_id, name, description, permissions, color, is_system_role)
    VALUES (
      restaurant_record.id,
      'Cassiere',
      'Gestione cassa e chiusura ordini',
      jsonb_build_array(
        -- Ordini - solo visualizzazione e completamento
        'orders.view_all', 'orders.view_details', 'orders.complete', 'orders.generate_preconto',
        -- Cassa - accesso completo
        'cashier.access', 'cashier.view_orders', 'cashier.close_tables',
        'cashier.print_receipt', 'cashier.generate_preconto', 'cashier.view_totals',
        -- Tavoli - solo chiusura
        'tables.view', 'tables.close',
        -- Prodotti - solo visualizzazione
        'products.view'
      ),
      '#F59E0B', -- Amber
      FALSE
    )
    RETURNING id INTO cashier_role_id;

    RAISE NOTICE '  ✅ Creati 4 ruoli predefiniti';

  END LOOP;
END $$;

-- =====================================================
-- 6. FUNZIONE: AUTO-UPDATE TIMESTAMP
-- =====================================================

CREATE OR REPLACE FUNCTION update_staff_roles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_staff_roles_timestamp
BEFORE UPDATE ON staff_roles
FOR EACH ROW
EXECUTE FUNCTION update_staff_roles_timestamp();

-- =====================================================
-- 7. VERIFICA FINALE
-- =====================================================

DO $$
DECLARE
  total_roles INTEGER;
  total_restaurants INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_restaurants FROM restaurants;
  SELECT COUNT(*) INTO total_roles FROM staff_roles;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATION COMPLETATA CON SUCCESSO!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tabelle create:';
  RAISE NOTICE '  → staff_roles';
  RAISE NOTICE '  → staff_role_assignments';
  RAISE NOTICE '';
  RAISE NOTICE 'Colonne aggiunte:';
  RAISE NOTICE '  → restaurant_staff.primary_role_id';
  RAISE NOTICE '  → order_timeline.staff_role_id';
  RAISE NOTICE '';
  RAISE NOTICE 'Ruoli predefiniti creati:';
  RAISE NOTICE '  → % ristoranti × 4 ruoli = % ruoli totali', total_restaurants, total_roles;
  RAISE NOTICE '';
  RAISE NOTICE 'Prossimi step:';
  RAISE NOTICE '  1. Creare UI Impostazioni > Utenti';
  RAISE NOTICE '  2. Assegnare ruoli ai membri staff esistenti';
  RAISE NOTICE '  3. Integrare verifica permessi nel codice';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =====================================================
-- 8. QUERY DI VERIFICA (opzionale)
-- =====================================================

-- Verifica ruoli creati per ogni ristorante
SELECT
  r.name as restaurant_name,
  sr.name as role_name,
  sr.description,
  sr.color,
  sr.is_system_role,
  jsonb_array_length(sr.permissions) as permissions_count
FROM staff_roles sr
JOIN restaurants r ON sr.restaurant_id = r.id
ORDER BY r.name, sr.is_system_role DESC, sr.name;

-- Verifica struttura tabelle
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('staff_roles', 'staff_role_assignments')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
