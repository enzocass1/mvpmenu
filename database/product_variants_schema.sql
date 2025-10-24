-- ============================================
-- PRODUCT VARIANTS SYSTEM - Stile Shopify
-- ============================================
-- Sistema completo per gestire varianti prodotto con opzioni multiple
-- Esempio: Prodotto "T-Shirt" → Opzioni: Size (S/M/L), Color (Red/Blue)
--          Varianti: S-Red, S-Blue, M-Red, M-Blue, L-Red, L-Blue

-- ============================================
-- 1. PRODUCT_VARIANT_OPTIONS (Opzioni tipo Size, Color, etc)
-- ============================================
CREATE TABLE IF NOT EXISTS product_variant_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- es. "Size", "Color", "Temperature"
  position INTEGER NOT NULL DEFAULT 0, -- Ordine di visualizzazione
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, name)
);

CREATE INDEX IF NOT EXISTS idx_product_variant_options_product_id ON product_variant_options(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variant_options_position ON product_variant_options(product_id, position);

COMMENT ON TABLE product_variant_options IS 'Opzioni varianti (es. Size, Color) per ogni prodotto';
COMMENT ON COLUMN product_variant_options.name IS 'Nome opzione (Size, Color, Temperature, etc)';
COMMENT ON COLUMN product_variant_options.position IS 'Ordine visualizzazione (0 = prima)';

-- ============================================
-- 2. PRODUCT_VARIANT_OPTION_VALUES (Valori delle opzioni: S/M/L, Red/Blue, etc)
-- ============================================
CREATE TABLE IF NOT EXISTS product_variant_option_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id UUID NOT NULL REFERENCES product_variant_options(id) ON DELETE CASCADE,
  value TEXT NOT NULL, -- es. "S", "M", "L" o "Red", "Blue"
  position INTEGER NOT NULL DEFAULT 0, -- Ordine visualizzazione
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(option_id, value)
);

CREATE INDEX IF NOT EXISTS idx_product_variant_option_values_option_id ON product_variant_option_values(option_id);
CREATE INDEX IF NOT EXISTS idx_product_variant_option_values_position ON product_variant_option_values(option_id, position);

COMMENT ON TABLE product_variant_option_values IS 'Valori possibili per ogni opzione (S/M/L per Size, Red/Blue per Color)';
COMMENT ON COLUMN product_variant_option_values.value IS 'Valore opzione (S, M, L, Red, Blue, Hot, Cold, etc)';

-- ============================================
-- 3. PRODUCT_VARIANTS (Combinazioni di opzioni)
-- ============================================
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT, -- Codice SKU univoco per la variante
  title TEXT NOT NULL, -- es. "S / Red", "Medium / Hot"

  -- Pricing (può essere diverso dal prodotto base)
  price DECIMAL(10,2), -- Se NULL, usa prezzo prodotto base
  compare_at_price DECIMAL(10,2), -- Prezzo di confronto (barrato)
  cost_per_item DECIMAL(10,2), -- Costo unitario per calcolo margini

  -- Inventory
  track_quantity BOOLEAN NOT NULL DEFAULT false,
  quantity INTEGER DEFAULT 0,
  allow_negative_inventory BOOLEAN NOT NULL DEFAULT false,

  -- Status
  is_available BOOLEAN NOT NULL DEFAULT true,

  -- Options values (JSON per velocità query)
  -- es. {"Size": "M", "Color": "Red"}
  option_values JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Position per ordinamento
  position INTEGER NOT NULL DEFAULT 0,

  -- Image (opzionale, specifica per variante)
  image_url TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_available ON product_variants(product_id, is_available);
CREATE INDEX IF NOT EXISTS idx_product_variants_option_values ON product_variants USING GIN (option_values);

COMMENT ON TABLE product_variants IS 'Varianti prodotto (combinazioni di opzioni)';
COMMENT ON COLUMN product_variants.title IS 'Titolo leggibile variante (es. "Medium / Hot")';
COMMENT ON COLUMN product_variants.option_values IS 'JSON con valori opzioni {"Size": "M", "Color": "Red"}';
COMMENT ON COLUMN product_variants.track_quantity IS 'Se true, traccia inventario per questa variante';
COMMENT ON COLUMN product_variants.quantity IS 'Quantità disponibile (se track_quantity = true)';

-- ============================================
-- 4. Modifica ORDER_ITEMS per supportare varianti
-- ============================================
-- Aggiungi colonna variant_id (può essere NULL se prodotto senza varianti)
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS variant_title TEXT; -- Cache del titolo variante

CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON order_items(variant_id);

COMMENT ON COLUMN order_items.variant_id IS 'Se presente, riferimento alla variante specifica ordinata';
COMMENT ON COLUMN order_items.variant_title IS 'Titolo variante (cache per performance, es. "M / Red")';

-- ============================================
-- 5. TRIGGERS per auto-update timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_product_variants_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_variant_options_timestamp
  BEFORE UPDATE ON product_variant_options
  FOR EACH ROW
  EXECUTE FUNCTION update_product_variants_timestamp();

CREATE TRIGGER update_product_variants_timestamp_trigger
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_product_variants_timestamp();

-- ============================================
-- 6. RLS POLICIES
-- ============================================

-- product_variant_options
ALTER TABLE product_variant_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ristoratori possono gestire opzioni varianti propri prodotti"
  ON product_variant_options
  FOR ALL
  USING (
    product_id IN (
      SELECT p.id FROM products p
      INNER JOIN categories c ON p.category_id = c.id
      INNER JOIN restaurants r ON c.restaurant_id = r.id
      WHERE r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    product_id IN (
      SELECT p.id FROM products p
      INNER JOIN categories c ON p.category_id = c.id
      INNER JOIN restaurants r ON c.restaurant_id = r.id
      WHERE r.user_id = auth.uid()
    )
  );

CREATE POLICY "Lettura pubblica opzioni varianti"
  ON product_variant_options
  FOR SELECT
  USING (true);

-- product_variant_option_values
ALTER TABLE product_variant_option_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ristoratori possono gestire valori opzioni varianti"
  ON product_variant_option_values
  FOR ALL
  USING (
    option_id IN (
      SELECT id FROM product_variant_options
    )
  )
  WITH CHECK (
    option_id IN (
      SELECT id FROM product_variant_options
    )
  );

CREATE POLICY "Lettura pubblica valori opzioni"
  ON product_variant_option_values
  FOR SELECT
  USING (true);

-- product_variants
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ristoratori possono gestire varianti propri prodotti"
  ON product_variants
  FOR ALL
  USING (
    product_id IN (
      SELECT p.id FROM products p
      INNER JOIN categories c ON p.category_id = c.id
      INNER JOIN restaurants r ON c.restaurant_id = r.id
      WHERE r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    product_id IN (
      SELECT p.id FROM products p
      INNER JOIN categories c ON p.category_id = c.id
      INNER JOIN restaurants r ON c.restaurant_id = r.id
      WHERE r.user_id = auth.uid()
    )
  );

CREATE POLICY "Lettura pubblica varianti disponibili"
  ON product_variants
  FOR SELECT
  USING (is_available = true);

CREATE POLICY "Staff può leggere tutte le varianti del proprio ristorante"
  ON product_variants
  FOR SELECT
  USING (
    product_id IN (
      SELECT p.id FROM products p
      INNER JOIN categories c ON p.category_id = c.id
      WHERE c.restaurant_id IN (
        SELECT restaurant_id FROM restaurant_staff
        WHERE id::text = current_setting('app.staff_id', true) AND is_active = true
      )
    )
  );

-- ============================================
-- 7. VIEWS per query veloci
-- ============================================

-- View per ottenere prodotti con le loro varianti complete
CREATE OR REPLACE VIEW products_with_variants AS
SELECT
  p.id as product_id,
  p.name as product_name,
  p.price as base_price,
  p.image_url as product_image,
  c.restaurant_id,

  -- Varianti (array JSON)
  COALESCE(
    json_agg(
      json_build_object(
        'id', pv.id,
        'title', pv.title,
        'sku', pv.sku,
        'price', COALESCE(pv.price, p.price),
        'compare_at_price', pv.compare_at_price,
        'is_available', pv.is_available,
        'track_quantity', pv.track_quantity,
        'quantity', pv.quantity,
        'option_values', pv.option_values,
        'image_url', COALESCE(pv.image_url, p.image_url)
      ) ORDER BY pv.position
    ) FILTER (WHERE pv.id IS NOT NULL),
    '[]'::json
  ) as variants,

  -- Opzioni (array JSON)
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'id', pvo.id,
          'name', pvo.name,
          'position', pvo.position,
          'values', (
            SELECT json_agg(
              json_build_object(
                'id', pvov.id,
                'value', pvov.value,
                'position', pvov.position
              ) ORDER BY pvov.position
            )
            FROM product_variant_option_values pvov
            WHERE pvov.option_id = pvo.id
          )
        ) ORDER BY pvo.position
      )
      FROM product_variant_options pvo
      WHERE pvo.product_id = p.id
    ),
    '[]'::json
  ) as options,

  -- Flag se ha varianti
  EXISTS(SELECT 1 FROM product_variants WHERE product_id = p.id) as has_variants

FROM products p
INNER JOIN categories c ON p.category_id = c.id
LEFT JOIN product_variants pv ON pv.product_id = p.id
GROUP BY p.id, p.name, p.price, p.image_url, c.restaurant_id;

COMMENT ON VIEW products_with_variants IS 'Vista completa prodotti con tutte le varianti e opzioni';

-- Grant permissions sulla view
GRANT SELECT ON products_with_variants TO authenticated, anon;

-- ============================================
-- 8. FUNZIONI HELPER
-- ============================================

-- Funzione per creare varianti automaticamente da opzioni
-- (utile per generare tutte le combinazioni possibili)
CREATE OR REPLACE FUNCTION generate_product_variants(p_product_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- TODO: Implementare logica per generare tutte le combinazioni
  -- Per ora solo placeholder, implementazione frontend
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_product_variants IS 'Genera automaticamente tutte le combinazioni di varianti per un prodotto';

-- ============================================
-- 9. ESEMPIO DATI
-- ============================================
-- Decommentare per testare

/*
-- Esempio: Prodotto "Caffè" con varianti Size e Temperature
INSERT INTO product_variant_options (product_id, name, position) VALUES
  ('UUID_PRODOTTO_CAFFE', 'Size', 0),
  ('UUID_PRODOTTO_CAFFE', 'Temperature', 1);

-- Valori per Size
INSERT INTO product_variant_option_values (option_id, value, position)
SELECT id, 'Small', 0 FROM product_variant_options WHERE name = 'Size' AND product_id = 'UUID_PRODOTTO_CAFFE'
UNION ALL
SELECT id, 'Medium', 1 FROM product_variant_options WHERE name = 'Size' AND product_id = 'UUID_PRODOTTO_CAFFE'
UNION ALL
SELECT id, 'Large', 2 FROM product_variant_options WHERE name = 'Size' AND product_id = 'UUID_PRODOTTO_CAFFE';

-- Valori per Temperature
INSERT INTO product_variant_option_values (option_id, value, position)
SELECT id, 'Hot', 0 FROM product_variant_options WHERE name = 'Temperature' AND product_id = 'UUID_PRODOTTO_CAFFE'
UNION ALL
SELECT id, 'Cold', 1 FROM product_variant_options WHERE name = 'Temperature' AND product_id = 'UUID_PRODOTTO_CAFFE';

-- Varianti (6 combinazioni: Small/Medium/Large × Hot/Cold)
INSERT INTO product_variants (product_id, title, price, option_values, position) VALUES
  ('UUID_PRODOTTO_CAFFE', 'Small / Hot', 2.00, '{"Size": "Small", "Temperature": "Hot"}'::jsonb, 0),
  ('UUID_PRODOTTO_CAFFE', 'Small / Cold', 2.50, '{"Size": "Small", "Temperature": "Cold"}'::jsonb, 1),
  ('UUID_PRODOTTO_CAFFE', 'Medium / Hot', 2.50, '{"Size": "Medium", "Temperature": "Hot"}'::jsonb, 2),
  ('UUID_PRODOTTO_CAFFE', 'Medium / Cold', 3.00, '{"Size": "Medium", "Temperature": "Cold"}'::jsonb, 3),
  ('UUID_PRODOTTO_CAFFE', 'Large / Hot', 3.00, '{"Size": "Large", "Temperature": "Hot"}'::jsonb, 4),
  ('UUID_PRODOTTO_CAFFE', 'Large / Cold', 3.50, '{"Size": "Large", "Temperature": "Cold"}'::jsonb, 5);
*/

SELECT '✅ Product Variants Schema creato con successo' as status;
