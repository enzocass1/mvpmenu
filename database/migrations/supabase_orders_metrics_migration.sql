-- ===================================================================
-- MIGRAZIONE: Aggiungi campi per metriche temporali ordini
-- ===================================================================

-- Aggiungi timestamp per lo stato "preparing"
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS preparing_at TIMESTAMP WITH TIME ZONE;

-- Aggiungi flag per priority order (se non esiste già)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS is_priority_order BOOLEAN DEFAULT false;

-- Aggiungi importo priority order
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS priority_order_amount DECIMAL(10,2) DEFAULT 0;

-- Commenti
COMMENT ON COLUMN orders.preparing_at IS 'Timestamp quando l''ordine passa in preparazione';
COMMENT ON COLUMN orders.is_priority_order IS 'Flag che indica se è un ordine prioritario';
COMMENT ON COLUMN orders.priority_order_amount IS 'Importo pagato per il priority order';
