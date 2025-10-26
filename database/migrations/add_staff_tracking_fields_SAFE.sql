-- ============================================
-- MIGRATION: Staff Tracking & Analytics (SAFE VERSION)
-- Data: 26 Ottobre 2025
-- ============================================

-- IMPORTANTE: Esegui questa migration quando l'app è FERMA
-- per evitare deadlock

BEGIN;

-- ============================================
-- 1. TABELLA order_timeline - Aggiungi staff_role
-- ============================================

ALTER TABLE order_timeline
ADD COLUMN IF NOT EXISTS staff_role VARCHAR(50);

COMMENT ON COLUMN order_timeline.staff_role IS 'Ruolo dello staff member che ha eseguito l''azione (Admin, Cameriere, Manager, ecc.)';

-- Indici per performance analytics
CREATE INDEX IF NOT EXISTS idx_order_timeline_staff_analytics
ON order_timeline(staff_name, staff_role, action, created_at);

CREATE INDEX IF NOT EXISTS idx_order_timeline_staff_role
ON order_timeline(staff_role, created_at)
WHERE staff_role IS NOT NULL;

-- ============================================
-- 2. TABELLA restaurant_staff - Estendi con nome/cognome e ruolo
-- ============================================

ALTER TABLE restaurant_staff
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);

COMMENT ON COLUMN restaurant_staff.first_name IS 'Nome dello staff member';

ALTER TABLE restaurant_staff
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

COMMENT ON COLUMN restaurant_staff.last_name IS 'Cognome dello staff member';

ALTER TABLE restaurant_staff
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Staff';

COMMENT ON COLUMN restaurant_staff.role IS 'Ruolo temporaneo in attesa sistema ruoli completo';

-- Constraint per ruoli validi (drop se esiste, poi ricrea)
ALTER TABLE restaurant_staff
DROP CONSTRAINT IF EXISTS restaurant_staff_role_check;

ALTER TABLE restaurant_staff
ADD CONSTRAINT restaurant_staff_role_check
CHECK (role IN ('Admin', 'Proprietario', 'Manager', 'Cameriere', 'Cuoco', 'Barista', 'Staff'));

-- Indice per ricerca per ruolo
CREATE INDEX IF NOT EXISTS idx_restaurant_staff_role
ON restaurant_staff(restaurant_id, role)
WHERE role IS NOT NULL;

-- ============================================
-- 3. TABELLA restaurants - Nome proprietario
-- ============================================

ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS owner_first_name VARCHAR(100);

COMMENT ON COLUMN restaurants.owner_first_name IS 'Nome del proprietario del ristorante';

ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS owner_last_name VARCHAR(100);

COMMENT ON COLUMN restaurants.owner_last_name IS 'Cognome del proprietario del ristorante';

-- ============================================
-- 4. TABELLA table_change_logs - Aggiungi staff_role
-- ============================================

ALTER TABLE table_change_logs
ADD COLUMN IF NOT EXISTS changed_by_role VARCHAR(50);

COMMENT ON COLUMN table_change_logs.changed_by_role IS 'Ruolo dello staff member che ha cambiato il tavolo';

-- Indice per analytics cambi tavolo
CREATE INDEX IF NOT EXISTS idx_table_change_logs_staff
ON table_change_logs(changed_by_name, changed_by_role, changed_at);

-- ============================================
-- 5. VIEW per Analytics Staff
-- ============================================

-- View per ordini raggruppati per staff
CREATE OR REPLACE VIEW v_staff_orders_analytics AS
SELECT
  ot.staff_name,
  ot.staff_role,
  o.restaurant_id,
  COUNT(*) as total_orders,
  COUNT(DISTINCT o.id) as unique_orders,
  SUM(o.total_amount) as total_revenue,
  AVG(o.total_amount) as avg_order_value,
  MIN(ot.created_at) as first_order_date,
  MAX(ot.created_at) as last_order_date
FROM order_timeline ot
JOIN orders o ON ot.order_id = o.id
WHERE ot.action = 'created'
  AND o.deleted_at IS NULL
GROUP BY ot.staff_name, ot.staff_role, o.restaurant_id;

COMMENT ON VIEW v_staff_orders_analytics IS 'Analytics aggregati per staff member (nome + ruolo)';

-- View per performance per ruolo
CREATE OR REPLACE VIEW v_role_performance_analytics AS
SELECT
  ot.staff_role,
  o.restaurant_id,
  COUNT(DISTINCT ot.staff_name) as members_count,
  COUNT(*) as total_orders,
  SUM(o.total_amount) as total_revenue,
  AVG(o.total_amount) as avg_order_value,
  MIN(ot.created_at) as first_order_date,
  MAX(ot.created_at) as last_order_date
FROM order_timeline ot
JOIN orders o ON ot.order_id = o.id
WHERE ot.action = 'created'
  AND o.deleted_at IS NULL
  AND ot.staff_role IS NOT NULL
GROUP BY ot.staff_role, o.restaurant_id;

COMMENT ON VIEW v_role_performance_analytics IS 'Performance aggregata per ruolo staff';

-- ============================================
-- 6. FUNZIONI UTILITY
-- ============================================

-- Funzione per ottenere nome completo da first_name + last_name
CREATE OR REPLACE FUNCTION get_full_name(p_first_name VARCHAR, p_last_name VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
  IF p_first_name IS NOT NULL AND p_last_name IS NOT NULL THEN
    RETURN p_first_name || ' ' || p_last_name;
  ELSIF p_first_name IS NOT NULL THEN
    RETURN p_first_name;
  ELSIF p_last_name IS NOT NULL THEN
    RETURN p_last_name;
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_full_name IS 'Concatena nome e cognome in formato "Nome Cognome"';

COMMIT;

-- ============================================
-- VERIFICA FINALE (esegui DOPO il COMMIT)
-- ============================================

-- Query di verifica: mostra struttura order_timeline
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'order_timeline'
  AND column_name IN ('staff_name', 'staff_role', 'staff_id', 'action')
ORDER BY ordinal_position;

-- Query di verifica: mostra struttura restaurants
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'restaurants'
  AND column_name IN ('name', 'owner_first_name', 'owner_last_name')
ORDER BY ordinal_position;

-- ============================================
-- STEP SUCCESSIVO: Popola i dati del proprietario
-- ============================================

/*
-- SOSTITUISCI 'tuo_user_id' con il tuo user_id reale
-- SOSTITUISCI 'Vincenzo' e 'Cassese' con il tuo nome e cognome

UPDATE restaurants
SET
  owner_first_name = 'Vincenzo',
  owner_last_name = 'Cassese'
WHERE user_id = 'tuo_user_id';

-- Per trovare il tuo user_id:
SELECT id, email FROM auth.users WHERE email = 'tua_email@example.com';
*/
