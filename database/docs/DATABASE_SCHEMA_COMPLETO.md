# 🗄️ SCHEMA DATABASE COMPLETO - MVPMenu

## 📅 Data Ultimo Aggiornamento
26 Gennaio 2025

## 📋 INDICE
1. [Tabelle Principali](#tabelle-principali)
2. [Trigger e Functions](#trigger-e-functions)
3. [Views](#views)
4. [RLS Policies](#rls-policies)
5. [Indici](#indici)
6. [Constraints](#constraints)

---

## 📦 TABELLE PRINCIPALI

### 1. `restaurants`
Tabella principale ristoranti (schema già esistente, non modificato nelle migration)

```sql
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  theme_config JSONB, -- Configurazione tema
  opening_hours JSONB, -- Orari apertura
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indici:**
- `idx_restaurants_user_id` ON `user_id`
- `idx_restaurants_subdomain` UNIQUE ON `subdomain`

---

### 2. `categories`
Categorie prodotti (schema già esistente)

```sql
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(restaurant_id, name)
);
```

**Indici:**
- `idx_categories_restaurant_id` ON `restaurant_id`
- `idx_categories_position` ON `position`

---

### 3. `products`
Prodotti (schema già esistente)

```sql
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indici:**
- `idx_products_category_id` ON `category_id`
- `idx_products_available` ON `is_available`

---

### 4. `rooms`
Sale/ambienti del ristorante

```sql
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(restaurant_id, name)
);
```

**Indici:**
- `idx_rooms_restaurant_id` ON `restaurant_id`
- `idx_rooms_is_active` ON `is_active`

**Trigger:**
- `update_rooms_updated_at` → `update_updated_at_column()`

---

### 5. `tables`
Tavoli per ogni sala

```sql
CREATE TABLE public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  seats INTEGER DEFAULT 4 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, number),
  CHECK (number > 0),
  CHECK (seats > 0)
);
```

**Indici:**
- `idx_tables_room_id` ON `room_id`
- `idx_tables_is_active` ON `is_active`

**Trigger:**
- `update_tables_updated_at` → `update_updated_at_column()`

---

### 6. `restaurant_order_settings`
Impostazioni ordini per ogni ristorante

```sql
CREATE TABLE public.restaurant_order_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL UNIQUE REFERENCES restaurants(id) ON DELETE CASCADE,
  orders_enabled BOOLEAN NOT NULL DEFAULT false,
  number_of_tables INTEGER DEFAULT 0 CHECK (number_of_tables >= 0),
  priority_order_enabled BOOLEAN NOT NULL DEFAULT false,
  priority_order_price DECIMAL(10,2) DEFAULT 0 CHECK (priority_order_price >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indici:**
- `idx_restaurant_order_settings_restaurant_id` ON `restaurant_id`

**Trigger:**
- `update_restaurant_order_settings_updated_at` → `update_updated_at_column()`

---

### 7. `restaurant_staff`
Staff/camerieri del ristorante

```sql
CREATE TABLE public.restaurant_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password TEXT, -- Password in chiaro (SOLO DEMO)
  role TEXT NOT NULL DEFAULT 'waiter' CHECK (role IN ('waiter', 'manager')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(restaurant_id, email)
);
```

**Indici:**
- `idx_restaurant_staff_restaurant_id` ON `restaurant_id`
- `idx_restaurant_staff_email` ON `email`

**Trigger:**
- `update_restaurant_staff_updated_at` → `update_updated_at_column()`

---

### 8. `customers`
Clienti del ristorante (opzionale)

```sql
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indici:**
- `idx_customers_restaurant_id` ON `restaurant_id`
- `idx_customers_email` ON `email`
- `idx_customers_phone` ON `phone`

**Trigger:**
- `update_customers_updated_at` → `update_updated_at_column()`

---

### 9. `orders`
Ordini al tavolo

```sql
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  table_number INTEGER NOT NULL CHECK (table_number > 0),
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'completed', 'cancelled')),
  customer_name TEXT,
  customer_notes TEXT,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'EUR',

  -- Staff tracking
  confirmed_by UUID REFERENCES restaurant_staff(id) ON DELETE SET NULL,

  -- Timestamps
  confirmed_at TIMESTAMP WITH TIME ZONE,
  preparing_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Priority Order
  is_priority_order BOOLEAN NOT NULL DEFAULT false,
  priority_order_amount DECIMAL(10,2) DEFAULT 0
);
```

**Indici:**
- `idx_orders_restaurant_id` ON `restaurant_id`
- `idx_orders_customer_id` ON `customer_id`
- `idx_orders_status` ON `status`
- `idx_orders_table_number` ON `table_number`
- `idx_orders_room_id` ON `room_id`
- `idx_orders_created_at` ON `created_at`
- `idx_orders_restaurant_status` ON `(restaurant_id, status)`
- `idx_orders_restaurant_created` ON `(restaurant_id, created_at)`
- `idx_orders_priority` ON `is_priority_order` WHERE `is_priority_order = true`

**Trigger:**
- `update_orders_updated_at` → `update_updated_at_column()`
- `trigger_track_order_changes` → `track_order_changes()`

---

### 10. `order_items`
Prodotti contenuti negli ordini

```sql
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  product_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  notes TEXT,
  subtotal DECIMAL(10,2) NOT NULL,

  -- Varianti prodotto
  variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT,
  variant_title TEXT,
  option_values JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indici:**
- `idx_order_items_order_id` ON `order_id`
- `idx_order_items_product_id` ON `product_id`
- `idx_order_items_variant_id` ON `variant_id`

**Trigger:**
- `trigger_update_order_total` → `update_order_total()`

---

### 11. `order_timeline`
Storico modifiche ordini

```sql
CREATE TABLE public.order_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES restaurant_staff(id) ON DELETE SET NULL,
  staff_name TEXT,
  action TEXT NOT NULL CHECK (action IN (
    'created', 'confirmed', 'preparing', 'completed', 'cancelled',
    'updated', 'item_added', 'item_removed', 'item_updated'
  )),
  previous_status TEXT,
  new_status TEXT,
  changes JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indici:**
- `idx_order_timeline_order_id` ON `order_id`
- `idx_order_timeline_staff_id` ON `staff_id`
- `idx_order_timeline_created_at` ON `created_at`

---

### 12. `product_variant_options`
Opzioni varianti prodotto (es. Size, Color)

```sql
CREATE TABLE public.product_variant_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Size", "Color", "Temperature"
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, name)
);
```

**Indici:**
- `idx_product_variant_options_product_id` ON `product_id`
- `idx_product_variant_options_position` ON `(product_id, position)`

**Trigger:**
- `update_product_variant_options_timestamp` → `update_product_variants_timestamp()`

---

### 13. `product_variant_option_values`
Valori opzioni (es. S, M, L)

```sql
CREATE TABLE public.product_variant_option_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id UUID NOT NULL REFERENCES product_variant_options(id) ON DELETE CASCADE,
  value TEXT NOT NULL, -- "S", "M", "L"
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(option_id, value)
);
```

**Indici:**
- `idx_product_variant_option_values_option_id` ON `option_id`
- `idx_product_variant_option_values_position` ON `(option_id, position)`

---

### 14. `product_variants`
Varianti prodotto (combinazioni opzioni)

```sql
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT,
  title TEXT NOT NULL, -- "S / Red"

  -- Pricing
  price DECIMAL(10,2),
  compare_at_price DECIMAL(10,2),
  cost_per_item DECIMAL(10,2),

  -- Inventory
  track_quantity BOOLEAN NOT NULL DEFAULT false,
  quantity INTEGER DEFAULT 0,
  allow_negative_inventory BOOLEAN NOT NULL DEFAULT false,

  -- Status
  is_available BOOLEAN NOT NULL DEFAULT true,

  -- Options (JSON)
  option_values JSONB NOT NULL DEFAULT '{}'::jsonb,

  position INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indici:**
- `idx_product_variants_product_id` ON `product_id`
- `idx_product_variants_sku` ON `sku` WHERE `sku IS NOT NULL`
- `idx_product_variants_available` ON `(product_id, is_available)`
- `idx_product_variants_option_values` USING GIN ON `option_values`

**Trigger:**
- `update_product_variants_timestamp_trigger` → `update_product_variants_timestamp()`

---

### 15. `analytics_events`
Eventi analytics per tracciamento

```sql
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'favorite_added', 'favorite_removed', 'product_viewed',
    'category_viewed', 'session_time', 'qr_scanned',
    'order_item_added', 'order_completed', 'order_cancelled'
  )),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  session_duration INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indici:**
- `idx_analytics_restaurant_id` ON `restaurant_id`
- `idx_analytics_event_type` ON `event_type`
- `idx_analytics_created_at` ON `created_at`
- `idx_analytics_restaurant_event` ON `(restaurant_id, event_type)`
- `idx_analytics_restaurant_created` ON `(restaurant_id, created_at)`
- `idx_analytics_product_id` ON `product_id` WHERE `product_id IS NOT NULL`
- `idx_analytics_category_id` ON `category_id` WHERE `category_id IS NOT NULL`
- `idx_analytics_order_id` ON `order_id` WHERE `order_id IS NOT NULL`

---

## ⚙️ TRIGGER E FUNCTIONS

### 1. `update_updated_at_column()`
Aggiorna automaticamente `updated_at` su UPDATE

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Usato da:**
- `restaurant_order_settings`
- `restaurant_staff`
- `customers`
- `orders`
- `rooms`
- `tables`

---

### 2. `update_product_variants_timestamp()`
Aggiorna timestamp varianti prodotto

```sql
CREATE OR REPLACE FUNCTION update_product_variants_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Usato da:**
- `product_variant_options`
- `product_variants`

---

### 3. `calculate_order_total(p_order_id UUID)`
Calcola totale ordine (prodotti + priority)

```sql
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

  -- Somma totale
  total := items_total + priority_amount;

  RETURN total;
END;
$$ LANGUAGE plpgsql;
```

---

### 4. `update_order_total()`
Trigger per aggiornare `total_amount` ordine quando cambiano `order_items`

```sql
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE orders
  SET total_amount = calculate_order_total(NEW.order_id),
      updated_at = NOW()
  WHERE id = NEW.order_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Trigger:**
```sql
CREATE TRIGGER trigger_update_order_total
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW
EXECUTE FUNCTION update_order_total();
```

---

### 5. `track_order_changes()`
Traccia modifiche ordini in `order_timeline`

```sql
CREATE OR REPLACE FUNCTION track_order_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Traccia cambio stato
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO order_timeline (order_id, staff_id, staff_name, action, previous_status, new_status)
    VALUES (
      NEW.id,
      NEW.confirmed_by,
      (SELECT name FROM restaurant_staff WHERE id = NEW.confirmed_by),
      NEW.status,
      OLD.status,
      NEW.status
    );
  END IF;

  -- Traccia creazione
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO order_timeline (order_id, action, new_status)
    VALUES (NEW.id, 'created', 'pending');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Trigger:**
```sql
CREATE TRIGGER trigger_track_order_changes
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION track_order_changes();
```

---

## 👁️ VIEWS

### 1. `order_statistics`
Statistiche aggregate ordini

```sql
CREATE OR REPLACE VIEW order_statistics AS
SELECT
  o.restaurant_id,
  DATE(o.created_at) as order_date,
  o.status,
  COUNT(o.id) as total_orders,
  SUM(o.total_amount) as total_revenue,
  AVG(o.total_amount) as average_order_value,
  SUM(oi.quantity) as total_items,
  AVG(o.total_amount / NULLIF(
    (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id), 0
  )) as average_item_value
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.restaurant_id, DATE(o.created_at), o.status;
```

---

### 2. `products_with_variants`
Prodotti con varianti complete (JSON aggregato)

```sql
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

  EXISTS(SELECT 1 FROM product_variants WHERE product_id = p.id) as has_variants

FROM products p
INNER JOIN categories c ON p.category_id = c.id
LEFT JOIN product_variants pv ON pv.product_id = p.id
GROUP BY p.id, p.name, p.price, p.image_url, c.restaurant_id;
```

---

### 3. `v_product_variant_options`
View workaround PostgREST

```sql
CREATE OR REPLACE VIEW v_product_variant_options AS
SELECT * FROM product_variant_options;
```

---

### 4. `v_product_variant_option_values`
View workaround PostgREST

```sql
CREATE OR REPLACE VIEW v_product_variant_option_values AS
SELECT * FROM product_variant_option_values;
```

---

### 5. `v_product_variants`
View workaround PostgREST

```sql
CREATE OR REPLACE VIEW v_product_variants AS
SELECT * FROM product_variants;
```

---

## 🔒 RLS POLICIES (Row Level Security)

### Tabella: `rooms`

1. **Users can view own restaurant rooms**
   - SELECT
   - Condizione: `restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())`

2. **Users can insert own restaurant rooms**
   - INSERT
   - Condizione: `restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())`

3. **Users can update own restaurant rooms**
   - UPDATE
   - Condizione: `restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())`

4. **Users can delete own restaurant rooms**
   - DELETE
   - Condizione: `restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())`

---

### Tabella: `tables`

1. **Users can view own restaurant tables**
   - SELECT
   - Condizione: `room_id IN (SELECT id FROM rooms WHERE restaurant_id IN (...))`

2. **Users can insert own restaurant tables**
   - INSERT
   - Condizione: `room_id IN (SELECT id FROM rooms WHERE restaurant_id IN (...))`

3. **Users can update own restaurant tables**
   - UPDATE
   - Condizione: `room_id IN (SELECT id FROM rooms WHERE restaurant_id IN (...))`

4. **Users can delete own restaurant tables**
   - DELETE
   - Condizione: `room_id IN (SELECT id FROM rooms WHERE restaurant_id IN (...))`

---

### Tabella: `restaurant_order_settings`

1. **Ristoratori possono gestire proprie impostazioni ordini**
   - ALL
   - Condizione: `restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())`

2. **Lettura pubblica impostazioni ordini per menu pubblico**
   - SELECT
   - Condizione: `true`

---

### Tabella: `restaurant_staff`

1. **Ristoratori possono gestire proprio staff**
   - ALL
   - Condizione: `restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())`

2. **Staff può leggere propri dati**
   - SELECT
   - Condizione: `id::text = current_setting('app.staff_id', true)`

---

### Tabella: `customers`

1. **Ristoratori possono gestire propri clienti**
   - ALL
   - Condizione: `restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())`

2. **Staff può leggere clienti**
   - SELECT
   - Condizione: `restaurant_id IN (SELECT restaurant_id FROM restaurant_staff WHERE id::text = current_setting('app.staff_id', true))`

---

### Tabella: `orders`

1. **Ristoratori possono gestire propri ordini**
   - ALL
   - Condizione: `restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())`

2. **Staff può gestire ordini del proprio ristorante**
   - ALL
   - Condizione: `restaurant_id IN (SELECT restaurant_id FROM restaurant_staff WHERE id::text = current_setting('app.staff_id', true) AND is_active = true)`

3. **Clienti possono vedere propri ordini**
   - SELECT
   - Condizione: `customer_id::text = current_setting('app.customer_id', true)`

4. **Inserimento pubblico ordini**
   - INSERT
   - Condizione: `true`

---

### Tabella: `order_items`

1. **Accesso order_items segue policy orders**
   - ALL
   - Condizione: `order_id IN (SELECT id FROM orders)`

---

### Tabella: `order_timeline`

1. **Accesso timeline segue policy orders**
   - ALL
   - Condizione: `order_id IN (SELECT id FROM orders)`

---

### Tabella: `product_variant_options`

1. **Ristoratori possono gestire opzioni varianti propri prodotti**
   - ALL
   - Condizione: `product_id IN (SELECT p.id FROM products p INNER JOIN categories c ON p.category_id = c.id INNER JOIN restaurants r ON c.restaurant_id = r.id WHERE r.user_id = auth.uid())`

2. **Lettura pubblica opzioni varianti**
   - SELECT
   - Condizione: `true`

---

### Tabella: `product_variant_option_values`

1. **Ristoratori possono gestire valori opzioni varianti**
   - ALL
   - Condizione: `option_id IN (SELECT id FROM product_variant_options)`

2. **Lettura pubblica valori opzioni**
   - SELECT
   - Condizione: `true`

---

### Tabella: `product_variants`

1. **Ristoratori possono gestire varianti propri prodotti**
   - ALL
   - Condizione: `product_id IN (SELECT p.id FROM products p INNER JOIN categories c ON p.category_id = c.id INNER JOIN restaurants r ON c.restaurant_id = r.id WHERE r.user_id = auth.uid())`

2. **Lettura pubblica varianti disponibili**
   - SELECT
   - Condizione: `is_available = true`

3. **Staff può leggere tutte le varianti del proprio ristorante**
   - SELECT
   - Condizione: `product_id IN (SELECT p.id FROM products p INNER JOIN categories c ON p.category_id = c.id WHERE c.restaurant_id IN (SELECT restaurant_id FROM restaurant_staff WHERE id::text = current_setting('app.staff_id', true) AND is_active = true))`

---

### Tabella: `analytics_events`

1. **Ristoratori possono vedere i propri analytics**
   - SELECT
   - Condizione: `restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())`

2. **Inserimento pubblico eventi analytics**
   - INSERT
   - Condizione: `true`

---

## 📊 CONSTRAINTS

### CHECK Constraints

**orders:**
- `table_number > 0`
- `status IN ('pending', 'confirmed', 'preparing', 'completed', 'cancelled')`

**tables:**
- `number > 0`
- `seats > 0`

**restaurant_order_settings:**
- `number_of_tables >= 0`
- `priority_order_price >= 0`

**order_items:**
- `quantity > 0`

**restaurant_staff:**
- `role IN ('waiter', 'manager')`

**order_timeline:**
- `action IN ('created', 'confirmed', 'preparing', 'completed', 'cancelled', 'updated', 'item_added', 'item_removed', 'item_updated')`

**analytics_events:**
- `event_type IN ('favorite_added', 'favorite_removed', 'product_viewed', 'category_viewed', 'session_time', 'qr_scanned', 'order_item_added', 'order_completed', 'order_cancelled')`

---

### UNIQUE Constraints

**restaurants:**
- `subdomain` UNIQUE

**categories:**
- `(restaurant_id, name)` UNIQUE

**rooms:**
- `(restaurant_id, name)` UNIQUE

**tables:**
- `(room_id, number)` UNIQUE

**restaurant_order_settings:**
- `restaurant_id` UNIQUE

**restaurant_staff:**
- `(restaurant_id, email)` UNIQUE

**product_variant_options:**
- `(product_id, name)` UNIQUE

**product_variant_option_values:**
- `(option_id, value)` UNIQUE

---

## 📝 NOTE IMPORTANTI

### ⚠️ MODIFICHE NECESSARIE PER SISTEMA CASSA

**Le seguenti modifiche devono essere applicate per implementare il sistema cassa/tavoli:**

1. **Tabella `orders`** - Aggiungere campi:
   - `order_type VARCHAR(10)` → 'table' | 'counter'
   - `order_number SERIAL` → #1, #2, #3...
   - `opened_at TIMESTAMP`
   - `closed_at TIMESTAMP`
   - `deleted_at TIMESTAMP` → Soft delete
   - `created_by_staff_id UUID`
   - `confirmed_by_staff_id UUID`
   - `modified_by_staff_id UUID`
   - `has_pending_additions BOOLEAN`
   - `receipt_number INT`
   - `receipt_date DATE`

2. **Tabella `order_items`** - Aggiungere campi:
   - `batch_number INT DEFAULT 1`
   - `prepared BOOLEAN DEFAULT false`
   - `prepared_at TIMESTAMP`

3. **Tabella `analytics_events`** - Aggiungere eventi:
   - `table_opened`, `table_order_pending`, `table_order_confirmed`
   - `table_order_modified`, `table_products_added`, `table_preconto`, `table_closed`
   - `counter_order_created`, `counter_order_completed`
   - `priority_order_requested`, `staff_action`
   - Aggiungere campi: `room_id`, `table_number`, `batch_number`, `staff_id`

4. **Trigger** - Creare:
   - `set_order_number()` → Auto-incremento order_number per ristorante

5. **Views** - Creare:
   - View per ordini con filtri (TUTTI/BANCO/TAVOLO/ELIMINATI)
   - View per tavoli occupati

Vedi **SISTEMA_CASSA_TAVOLI_SPEC.md** per dettagli completi implementazione.

---

## 📚 DOCUMENTAZIONE CORRELATA

- `SISTEMA_CASSA_TAVOLI_SPEC.md` → Specifiche sistema cassa/tavoli
- `PUBLIC_MENU_UI_ELEMENTS_ANALYSIS.md` → Analisi elementi UI menu pubblico
- `analytics.js` → Funzioni tracciamento eventi

---

## ✅ STATUS SCHEMA

**Ultimo aggiornamento:** 26 Gennaio 2025
**Versione:** 1.0
**Tabelle totali:** 15
**Trigger totali:** 5
**Views totali:** 5
**RLS Policies totali:** 30+

**Modifiche pending:** Sistema Cassa/Tavoli (vedi SISTEMA_CASSA_TAVOLI_SPEC.md)
