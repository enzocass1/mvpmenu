-- Lo storico dell'ordine rifiutava l'evento "preconto generato" (non era tra le azioni ammesse):
-- generatePreconto() lo scriveva ma l'inserimento falliva in silenzio. Aggiunto all'elenco.
ALTER TABLE order_timeline DROP CONSTRAINT IF EXISTS order_timeline_action_check;
ALTER TABLE order_timeline ADD CONSTRAINT order_timeline_action_check CHECK (action = ANY (ARRAY[
  'created', 'confirmed', 'preparing', 'completed', 'cancelled', 'updated',
  'item_added', 'item_removed', 'item_updated', 'table_changed',
  'priority_added', 'priority_removed', 'reopened', 'payment_added', 'note_updated',
  'preconto_generated'
]));
