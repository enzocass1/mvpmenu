-- ===================================================================
-- MIGRATION: Add Priority Order Feature
-- ===================================================================
-- Aggiunge i campi per la funzionalità Priority Order alla tabella
-- restaurant_order_settings

-- 1. Aggiungi colonne per priority order
-- ===================================================================
ALTER TABLE restaurant_order_settings
ADD COLUMN IF NOT EXISTS priority_order_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS priority_order_price DECIMAL(10,2) DEFAULT 0 CHECK (priority_order_price >= 0);

COMMENT ON COLUMN restaurant_order_settings.priority_order_enabled IS 'Se true, i clienti possono pagare per ricevere il proprio ordine prioritariamente';
COMMENT ON COLUMN restaurant_order_settings.priority_order_price IS 'Prezzo del servizio Priority Order (es. 2.00 euro)';

-- 2. Aggiungi colonna priority_order alla tabella orders
-- ===================================================================
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS is_priority_order BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS priority_order_amount DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN orders.is_priority_order IS 'Se true, il cliente ha pagato per ricevere l ordine prioritariamente';
COMMENT ON COLUMN orders.priority_order_amount IS 'Importo pagato per il servizio Priority Order';

-- 3. Aggiorna la funzione calculate_order_total per includere priority order
-- ===================================================================
CREATE OR REPLACE FUNCTION calculate_order_total(p_order_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  items_total DECIMAL(10,2);
  priority_amount DECIMAL(10,2);
  total DECIMAL(10,2);
BEGIN
  -- Calcola totale prodotti
  SELECT COALESCE(SUM(subtotal), 0) INTO items_total
  FROM order_items
  WHERE order_id = p_order_id;

  -- Ottieni importo priority order
  SELECT COALESCE(priority_order_amount, 0) INTO priority_amount
  FROM orders
  WHERE id = p_order_id;

  -- Somma totale prodotti + priority order
  total := items_total + priority_amount;

  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- 4. Crea indici per migliorare le performance
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_orders_priority ON orders(is_priority_order) WHERE is_priority_order = true;

-- ===================================================================
-- VERIFICA MIGRAZIONE
-- ===================================================================
-- Dopo aver eseguito questo script, verifica con:
--
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'restaurant_order_settings'
--   AND column_name IN ('priority_order_enabled', 'priority_order_price');
--
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'orders'
--   AND column_name IN ('is_priority_order', 'priority_order_amount');
-- ===================================================================
