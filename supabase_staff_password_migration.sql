-- ===================================================================
-- MIGRAZIONE: Aggiungi campo password in chiaro per staff
-- ===================================================================
-- NOTA: Questo è SOLO per scopo demo/sviluppo. In produzione non
-- salvare MAI password in chiaro!
-- ===================================================================

-- Aggiungi colonna password in chiaro
ALTER TABLE restaurant_staff
ADD COLUMN IF NOT EXISTS password TEXT;

-- Commento
COMMENT ON COLUMN restaurant_staff.password IS 'Password in chiaro (SOLO PER DEMO - non usare in produzione)';
