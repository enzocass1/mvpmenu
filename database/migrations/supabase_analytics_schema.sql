-- Tabella per tracciare tutti gli eventi analytics
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('favorite_added', 'favorite_removed', 'product_viewed', 'category_viewed', 'session_time', 'qr_scanned')),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  session_duration INTEGER, -- in secondi, solo per event_type = 'session_time'
  metadata JSONB, -- dati extra come user agent, source, etc
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_analytics_restaurant_id ON analytics_events(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_restaurant_event ON analytics_events(restaurant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_restaurant_created ON analytics_events(restaurant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_product_id ON analytics_events(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_category_id ON analytics_events(category_id) WHERE category_id IS NOT NULL;

-- Row Level Security (RLS)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Policy: I ristoratori possono vedere solo i propri analytics
CREATE POLICY "Ristoratori possono vedere i propri analytics"
  ON analytics_events
  FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

-- Policy: Inserimento pubblico per tracciamento (dal menu pubblico)
CREATE POLICY "Inserimento pubblico eventi analytics"
  ON analytics_events
  FOR INSERT
  WITH CHECK (true);

-- Commenti
COMMENT ON TABLE analytics_events IS 'Tracciamento eventi analytics per ogni ristorante';
COMMENT ON COLUMN analytics_events.event_type IS 'Tipo di evento: favorite_added, favorite_removed, product_viewed, category_viewed, session_time, qr_scanned';
COMMENT ON COLUMN analytics_events.session_duration IS 'Durata sessione in secondi (solo per event_type = session_time)';
COMMENT ON COLUMN analytics_events.metadata IS 'Dati extra in formato JSON (user_agent, source, referrer, etc)';
