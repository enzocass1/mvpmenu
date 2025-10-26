-- ============================================
-- MIGRATION: Staff Tracking & Analytics
-- Data: 26 Ottobre 2025
-- Scopo: Aggiungere campi per tracciamento completo staff
--        con ruolo e nome/cognome per metriche dashboard
-- ============================================

-- ============================================
-- 1. TABELLA order_timeline - Aggiungi staff_role
-- ============================================

-- Verifica se staff_role esiste già, altrimenti aggiungilo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_timeline'
    AND column_name = 'staff_role'
  ) THEN
    ALTER TABLE order_timeline
    ADD COLUMN staff_role VARCHAR(50);

    COMMENT ON COLUMN order_timeline.staff_role IS 'Ruolo dello staff member che ha eseguito l''azione (Admin, Cameriere, Manager, ecc.)';
  END IF;
END $$;

-- Indici per performance analytics
CREATE INDEX IF NOT EXISTS idx_order_timeline_staff_analytics
ON order_timeline(staff_name, staff_role, action, created_at);

CREATE INDEX IF NOT EXISTS idx_order_timeline_staff_role
ON order_timeline(staff_role, created_at)
WHERE staff_role IS NOT NULL;

-- ============================================
-- 2. TABELLA restaurant_staff - Estendi con nome/cognome e ruolo
-- ============================================

-- Aggiungi first_name se non esiste
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurant_staff'
    AND column_name = 'first_name'
  ) THEN
    ALTER TABLE restaurant_staff
    ADD COLUMN first_name VARCHAR(100);

    COMMENT ON COLUMN restaurant_staff.first_name IS 'Nome dello staff member';
  END IF;
END $$;

-- Aggiungi last_name se non esiste
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurant_staff'
    AND column_name = 'last_name'
  ) THEN
    ALTER TABLE restaurant_staff
    ADD COLUMN last_name VARCHAR(100);

    COMMENT ON COLUMN restaurant_staff.last_name IS 'Cognome dello staff member';
  END IF;
END $$;

-- Aggiungi role se non esiste
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurant_staff'
    AND column_name = 'role'
  ) THEN
    ALTER TABLE restaurant_staff
    ADD COLUMN role VARCHAR(50) DEFAULT 'Staff';

    COMMENT ON COLUMN restaurant_staff.role IS 'Ruolo temporaneo in attesa sistema ruoli completo';
  END IF;
END $$;

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

-- Aggiungi owner_first_name se non esiste
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants'
    AND column_name = 'owner_first_name'
  ) THEN
    ALTER TABLE restaurants
    ADD COLUMN owner_first_name VARCHAR(100);

    COMMENT ON COLUMN restaurants.owner_first_name IS 'Nome del proprietario del ristorante';
  END IF;
END $$;

-- Aggiungi owner_last_name se non esiste
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants'
    AND column_name = 'owner_last_name'
  ) THEN
    ALTER TABLE restaurants
    ADD COLUMN owner_last_name VARCHAR(100);

    COMMENT ON COLUMN restaurants.owner_last_name IS 'Cognome del proprietario del ristorante';
  END IF;
END $$;

-- ============================================
-- 4. TABELLA table_change_logs - Aggiungi staff_role
-- ============================================

-- Aggiungi changed_by_role se non esiste
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'table_change_logs'
    AND column_name = 'changed_by_role'
  ) THEN
    ALTER TABLE table_change_logs
    ADD COLUMN changed_by_role VARCHAR(50);

    COMMENT ON COLUMN table_change_logs.changed_by_role IS 'Ruolo dello staff member che ha cambiato il tavolo';
  END IF;
END $$;

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

-- ============================================
-- VERIFICA FINALE
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

-- Query di verifica: mostra struttura restaurant_staff
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'restaurant_staff'
  AND column_name IN ('name', 'first_name', 'last_name', 'role')
ORDER BY ordinal_position;

-- Query di verifica: mostra indici creati
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('order_timeline', 'restaurant_staff', 'table_change_logs')
  AND indexname LIKE '%staff%'
ORDER BY tablename, indexname;

-- ============================================
-- NOTE IMPLEMENTATIVE
-- ============================================

/*
DOPO AVER ESEGUITO QUESTA MIGRATION:

1. Aggiornare le query JavaScript per includere staff_role:
   ```javascript
   await supabase.from('order_timeline').insert({
     order_id: orderId,
     action: 'created',
     staff_id: staffSession?.staff_id || null,
     staff_name: staffSession?.fullName || 'Staff',
     staff_role: staffSession?.role || 'Staff',  // <-- NUOVO
     created_at: new Date().toISOString()
   })
   ```

2. Popolare restaurants.owner_first_name e owner_last_name
   da interfaccia utente (Settings > Profilo)

3. Aggiornare CreateOrderModal e altri componenti per passare
   staffSession con campo 'role':
   ```javascript
   const staffSession = {
     name: 'Vincenzo Cassese',
     fullName: 'Vincenzo Cassese',
     role: 'Admin',  // <-- IMPORTANTE
     restaurant_id: restaurant.id,
     staff_id: null
   }
   ```

4. Dashboard Analytics può ora usare le view:
   - v_staff_orders_analytics (per membro)
   - v_role_performance_analytics (per ruolo)
*/
