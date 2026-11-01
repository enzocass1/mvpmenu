# Analytics Tracking Strategy - Klaviyo-Style Rich Metadata

**Data**: 26 Ottobre 2025
**Obiettivo**: Implementare tracking granulare stile Klaviyo/Shopify per analytics avanzate

---

## Filosofia: Track Everything, Analyze Anything

Ogni evento DEVE contenere **tutti i dati necessari** per rispondere a qualsiasi domanda di business senza dover fare JOIN complessi.

### Principi Fondamentali

1. **Denormalizzazione voluta**: Salvare dati ridondanti per performance analytics
2. **Snapshot completo**: Ogni evento cattura lo stato completo al momento dell'azione
3. **Self-contained**: Ogni evento è autonomo e comprensibile senza contesto esterno
4. **Rich metadata**: Oggetti JSON annidati con tutti i dettagli rilevanti

---

## Struttura Standard Evento Analytics

### Template Base

```javascript
{
  // DOVE (Database)
  restaurant_id: UUID,
  event_type: STRING,
  created_at: TIMESTAMP,

  // CHI (Attore)
  actor: {
    type: 'staff' | 'owner' | 'customer' | 'system',
    staff_id: UUID || null,
    staff_name: STRING || null,
    staff_role: STRING || null,
    staff_role_display: STRING || null,
    user_id: UUID || null,
    user_email: STRING || null,
    customer_id: UUID || null,
    customer_name: STRING || null,
    customer_locale: STRING || null  // 'it-IT', 'en-US', etc.
  },

  // COSA (Oggetto principale)
  order: {
    id: UUID,
    order_number: STRING,  // "ORD-001"
    status: STRING,
    type: 'table' | 'counter' | 'delivery' | 'takeaway',
    source: 'pos' | 'qr' | 'web' | 'mobile'
  },

  // DOVE FISICO (Location)
  location: {
    table_id: UUID || null,
    table_number: INT || null,
    room_id: UUID || null,
    room_name: STRING || null,
    seats: INT || null
  },

  // PRODOTTI (Line Items)
  items: [
    {
      product_id: UUID,
      product_name: STRING,
      product_sku: STRING || null,
      category_id: UUID,
      category_name: STRING,
      variant_id: UUID || null,
      variant_title: STRING || null,
      variant_options: {
        size: STRING,
        temperature: STRING,
        // ... altre opzioni
      },
      quantity: INT,
      unit_price: DECIMAL,
      subtotal: DECIMAL,
      notes: STRING || null,
      batch_number: INT || null,
      prepared: BOOLEAN,
      prepared_at: TIMESTAMP || null,
      prepared_by_staff_id: UUID || null
    }
  ],

  // VALORI MONETARI
  money: {
    items_subtotal: DECIMAL,
    priority_fee: DECIMAL,
    service_fee: DECIMAL,
    discount: DECIMAL,
    tax: DECIMAL,
    total: DECIMAL,
    currency: STRING  // 'EUR'
  },

  // TIMELINE (Durate)
  timing: {
    created_at: TIMESTAMP,
    confirmed_at: TIMESTAMP || null,
    preparing_started_at: TIMESTAMP || null,
    completed_at: TIMESTAMP || null,
    time_to_confirm_seconds: INT || null,
    time_to_complete_seconds: INT || null,
    table_duration_seconds: INT || null
  },

  // FLAGS & TAGS
  flags: {
    is_priority: BOOLEAN,
    is_first_order: BOOLEAN,
    has_allergens: BOOLEAN,
    has_modifications: BOOLEAN,
    payment_method: STRING || null  // 'cash', 'card', 'digital'
  },

  // METADATA ESTESA (JSON)
  metadata: {
    // Browser/Device info (se da web)
    user_agent: STRING || null,
    screen_width: INT || null,
    screen_height: INT || null,
    device_type: 'mobile' | 'tablet' | 'desktop' || null,

    // Campaign tracking
    utm_source: STRING || null,
    utm_campaign: STRING || null,
    referrer: STRING || null,

    // Custom fields
    special_requests: STRING || null,
    delivery_notes: STRING || null,
    ...
  }
}
```

---

## Esempi Concreti per Ogni Evento

### 1. Ordine Creato (table_order_pending)

**Scenario**: Cliente scannerizza QR e crea ordine da public menu

```javascript
{
  restaurant_id: '9eb17ab1-c2ed-4c3c-90ac-3b08e469bb08',
  event_type: 'table_order_pending',
  created_at: '2025-10-26T14:32:15.234Z',

  actor: {
    type: 'customer',
    customer_id: 'f3a8b2c1-...',
    customer_name: 'Mario Rossi',
    customer_locale: 'it-IT'
  },

  order: {
    id: '12b71a4e-3f4d-435c-a21f-507d88218c27',
    order_number: 'ORD-042',
    status: 'pending',
    type: 'table',
    source: 'qr'
  },

  location: {
    table_id: 'f4487e09-8e38-452d-828c-1897e16f88d4',
    table_number: 6,
    room_id: 'd7be6cff-1033-4c0f-8e27-54967132019e',
    room_name: 'Sala Interna',
    seats: 4
  },

  items: [
    {
      product_id: 'a1b2c3d4-...',
      product_name: 'Pizza Margherita',
      product_sku: 'PIZZA-MARG-001',
      category_id: 'cat-pizza',
      category_name: 'Pizze',
      variant_id: 'var-normal',
      variant_title: 'Normale',
      variant_options: {
        size: 'Normale',
        crust: 'Classica'
      },
      quantity: 2,
      unit_price: 7.00,
      subtotal: 14.00,
      notes: 'Senza origano',
      batch_number: 1,
      prepared: false
    },
    {
      product_id: 'b2c3d4e5-...',
      product_name: 'Coca Cola',
      product_sku: 'BEV-COCA-330',
      category_id: 'cat-beverages',
      category_name: 'Bevande',
      variant_id: 'var-33cl',
      variant_title: '33cl',
      variant_options: {
        size: '33cl',
        temperature: 'Fredda'
      },
      quantity: 2,
      unit_price: 3.00,
      subtotal: 6.00,
      notes: null,
      batch_number: 1,
      prepared: false
    }
  ],

  money: {
    items_subtotal: 20.00,
    priority_fee: 2.00,
    service_fee: 0.00,
    discount: 0.00,
    tax: 4.40,  // 22% IVA
    total: 22.00,
    currency: 'EUR'
  },

  timing: {
    created_at: '2025-10-26T14:32:15.234Z',
    confirmed_at: null,
    preparing_started_at: null,
    completed_at: null,
    time_to_confirm_seconds: null,
    time_to_complete_seconds: null,
    table_duration_seconds: null
  },

  flags: {
    is_priority: true,
    is_first_order: true,
    has_allergens: false,
    has_modifications: true,
    payment_method: null
  },

  metadata: {
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)...',
    screen_width: 390,
    screen_height: 844,
    device_type: 'mobile',
    utm_source: 'qr_table_6',
    utm_campaign: 'summer_promo_2025',
    referrer: null,
    qr_scanned_at: '2025-10-26T14:31:42.123Z',
    table_previous_status: 'available'
  }
}
```

**Metriche derivabili**:
- Revenue per prodotto
- Prodotti più ordinati per ora del giorno
- Conversione QR scan → ordine
- Device usage (mobile vs desktop)
- Tavoli più performanti
- Priority order adoption rate

---

### 2. Prodotti Aggiunti (products_added_to_order)

**Scenario**: Staff aggiunge seconda portata a tavolo esistente

```javascript
{
  restaurant_id: '9eb17ab1-c2ed-4c3c-90ac-3b08e469bb08',
  event_type: 'products_added_to_order',
  created_at: '2025-10-26T14:45:22.567Z',

  actor: {
    type: 'staff',
    staff_id: 'staff-001',
    staff_name: 'Luca Bianchi',
    staff_role: 'waiter',
    staff_role_display: 'Cameriere'
  },

  order: {
    id: '12b71a4e-3f4d-435c-a21f-507d88218c27',
    order_number: 'ORD-042',
    status: 'preparing',
    type: 'table',
    source: 'pos'  // Aggiunta da POS
  },

  location: {
    table_id: 'f4487e09-8e38-452d-828c-1897e16f88d4',
    table_number: 6,
    room_id: 'd7be6cff-1033-4c0f-8e27-54967132019e',
    room_name: 'Sala Interna',
    seats: 4
  },

  items: [
    {
      product_id: 'c3d4e5f6-...',
      product_name: 'Tiramisu',
      product_sku: 'DESSERT-TIRAMISU',
      category_id: 'cat-desserts',
      category_name: 'Dolci',
      variant_id: null,
      variant_title: null,
      variant_options: {},
      quantity: 1,
      unit_price: 6.00,
      subtotal: 6.00,
      notes: null,
      batch_number: 2,  // Seconda portata
      prepared: false
    }
  ],

  // Valori INCREMENTALI (solo i prodotti aggiunti)
  money: {
    items_subtotal: 6.00,
    priority_fee: 0.00,
    service_fee: 0.00,
    discount: 0.00,
    tax: 1.32,
    total: 6.00,
    currency: 'EUR'
  },

  // Valori CUMULATIVI dell'ordine completo
  order_totals: {
    total_items_count: 5,  // 2 pizze + 2 coca + 1 tiramisu
    total_items_subtotal: 26.00,
    total_revenue: 28.00,
    previous_total: 22.00,
    new_total: 28.00,
    delta: 6.00
  },

  timing: {
    created_at: '2025-10-26T14:32:15.234Z',
    confirmed_at: '2025-10-26T14:33:10.123Z',
    preparing_started_at: '2025-10-26T14:33:10.123Z',
    this_addition_at: '2025-10-26T14:45:22.567Z',
    seconds_since_creation: 787  // ~13 minuti
  },

  flags: {
    is_second_batch: true,
    batch_number: 2,
    is_upsell: true,  // Aggiunta dopo ordine iniziale
    added_by_staff: true
  },

  metadata: {
    batch_info: {
      batch_number: 2,
      previous_batches: 1,
      batch_label: 'Seconda Portata'
    },
    upsell_opportunity: true,
    staff_suggestion: false,
    time_between_batches_seconds: 787
  }
}
```

**Metriche derivabili**:
- Tasso di upsell (% ordini con batch > 1)
- Revenue medio per batch
- Prodotti più ordinati come seconda/terza portata
- Performance staff (chi fa più upsell)
- Tempo medio tra portate

---

### 3. Ordine Completato (table_closed)

**Scenario**: Staff chiude tavolo con scontrino fiscale

```javascript
{
  restaurant_id: '9eb17ab1-c2ed-4c3c-90ac-3b08e469bb08',
  event_type: 'table_closed',
  created_at: '2025-10-26T15:12:45.789Z',

  actor: {
    type: 'owner',
    user_id: 'owner-uuid',
    user_email: 'enzocassese91@gmail.com',
    staff_name: 'Vincenzo Cassese',
    staff_role_display: 'Proprietario'
  },

  order: {
    id: '12b71a4e-3f4d-435c-a21f-507d88218c27',
    order_number: 'ORD-042',
    status: 'completed',
    type: 'table',
    source: 'qr',
    receipt_number: 123,
    fiscal_receipt_id: 'FISC-2025-123'
  },

  location: {
    table_id: 'f4487e09-8e38-452d-828c-1897e16f88d4',
    table_number: 6,
    room_id: 'd7be6cff-1033-4c0f-8e27-54967132019e',
    room_name: 'Sala Interna',
    seats: 4,
    turnover_count: 3  // Terzo tavolo della giornata
  },

  // Tutti i prodotti ordinati (somma di tutti i batch)
  items: [
    {
      product_id: 'a1b2c3d4-...',
      product_name: 'Pizza Margherita',
      product_sku: 'PIZZA-MARG-001',
      category_id: 'cat-pizza',
      category_name: 'Pizze',
      quantity: 2,
      unit_price: 7.00,
      subtotal: 14.00,
      batch_number: 1,
      prepared: true,
      prepared_at: '2025-10-26T14:38:22.123Z'
    },
    {
      product_id: 'b2c3d4e5-...',
      product_name: 'Coca Cola',
      product_sku: 'BEV-COCA-330',
      category_id: 'cat-beverages',
      category_name: 'Bevande',
      quantity: 2,
      unit_price: 3.00,
      subtotal: 6.00,
      batch_number: 1,
      prepared: true
    },
    {
      product_id: 'c3d4e5f6-...',
      product_name: 'Tiramisu',
      product_sku: 'DESSERT-TIRAMISU',
      category_id: 'cat-desserts',
      category_name: 'Dolci',
      quantity: 1,
      unit_price: 6.00,
      subtotal: 6.00,
      batch_number: 2,
      prepared: true
    }
  ],

  money: {
    items_subtotal: 26.00,
    priority_fee: 2.00,
    service_fee: 0.00,
    discount: 0.00,
    tax: 6.16,  // 22% IVA
    total: 28.00,
    currency: 'EUR',
    payment_method: 'card',
    tip: 2.00
  },

  timing: {
    created_at: '2025-10-26T14:32:15.234Z',
    confirmed_at: '2025-10-26T14:33:10.123Z',
    preparing_started_at: '2025-10-26T14:33:10.123Z',
    first_item_prepared_at: '2025-10-26T14:38:22.123Z',
    all_items_prepared_at: '2025-10-26T14:52:10.456Z',
    completed_at: '2025-10-26T15:12:45.789Z',

    // Durate calcolate
    time_to_confirm_seconds: 55,
    time_to_first_dish_seconds: 367,  // ~6 min
    time_to_prepare_all_seconds: 1195,  // ~20 min
    table_duration_seconds: 2430,  // ~40 min
    table_duration_formatted: '00:40:30'
  },

  flags: {
    is_priority: true,
    had_multiple_batches: true,
    had_upsell: true,
    payment_method: 'card',
    has_tip: true,
    is_peak_hour: true  // Ora di punta
  },

  // KPI dell'ordine
  kpi: {
    total_batches: 2,
    total_items_count: 5,
    unique_products_count: 3,
    unique_categories_count: 3,
    average_item_price: 5.20,
    revenue_per_minute: 0.69,  // €28 / 40.5 min
    revenue_per_seat: 7.00,  // €28 / 4 seats

    // Performance
    preparation_speed_score: 8.5,  // 1-10
    staff_efficiency_score: 9.0,
    customer_wait_time_acceptable: true
  },

  metadata: {
    session_id: 'sess-abc123',
    original_qr_scan_time: '2025-10-26T14:31:42.123Z',
    time_from_scan_to_order: 33,  // secondi

    // Analytics avanzate
    day_of_week: 'Saturday',
    hour_of_day: 15,
    is_weekend: true,
    is_lunch_time: true,
    weather: 'sunny',  // Se integrato
    table_occupancy_before: 0.75,  // 75% tavoli occupati

    // Customer behavior
    customer_returned_table: false,
    complaint_filed: false,
    feedback_rating: null
  }
}
```

**Metriche derivabili**:
- **Revenue Metrics**: Revenue totale, per tavolo, per ora, per staff
- **Performance**: Tempo medio preparazione, durata tavolo, efficienza cucina
- **Product Analytics**: Best sellers, categorie top, prezzi medi
- **Staff Analytics**: Revenue per staff, velocità servizio, upsell rate
- **Customer Analytics**: Comportamento cliente, tempo di permanenza
- **Operational**: Table turnover, peak hours, occupancy rate

---

## Struttura Database `analytics_events`

### Schema Ottimizzato

```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Indici base
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  event_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Relazioni (nullable per flessibilità)
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES restaurant_staff(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- Dati denormalizzati per performance
  order_number VARCHAR(50),
  product_sku VARCHAR(100),
  staff_name VARCHAR(200),

  -- Metadata JSONB (ricco e flessibile)
  actor JSONB,  -- Chi ha fatto l'azione
  order_data JSONB,  -- Snapshot ordine
  items JSONB,  -- Array prodotti
  money JSONB,  -- Valori monetari
  timing JSONB,  -- Durate e timestamp
  flags JSONB,  -- Boolean flags
  kpi JSONB,  -- KPI calcolati
  metadata JSONB,  -- Tutto il resto

  -- Indici per query comuni
  CONSTRAINT analytics_events_event_type_check CHECK (event_type IN (...))
);

-- Indici per performance
CREATE INDEX idx_analytics_restaurant_time ON analytics_events(restaurant_id, created_at DESC);
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type, created_at DESC);
CREATE INDEX idx_analytics_order ON analytics_events(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_analytics_staff ON analytics_events(staff_id, created_at DESC) WHERE staff_id IS NOT NULL;
CREATE INDEX idx_analytics_product ON analytics_events(product_id) WHERE product_id IS NOT NULL;

-- GIN index per JSON queries
CREATE INDEX idx_analytics_metadata_gin ON analytics_events USING GIN (metadata);
CREATE INDEX idx_analytics_items_gin ON analytics_events USING GIN (items);
CREATE INDEX idx_analytics_money_gin ON analytics_events USING GIN (money);
```

---

## Helper Functions per Tracking

### `createRichEventData()` - Builder per eventi completi

```javascript
/**
 * Crea oggetto evento ricco con tutti i metadati
 */
export const createRichEventData = ({
  eventType,
  restaurantId,
  actor,
  order,
  items = [],
  location = {},
  money = {},
  timing = {},
  flags = {},
  kpi = {},
  metadata = {}
}) => {
  return {
    restaurant_id: restaurantId,
    event_type: eventType,
    created_at: new Date().toISOString(),

    // Foreign keys per JOIN veloci
    order_id: order?.id || null,
    product_id: items[0]?.product_id || null,
    category_id: items[0]?.category_id || null,
    table_id: location?.table_id || null,
    room_id: location?.room_id || null,
    staff_id: actor?.staff_id || null,
    customer_id: actor?.customer_id || null,

    // Dati denormalizzati
    order_number: order?.order_number || null,
    product_sku: items[0]?.product_sku || null,
    staff_name: actor?.staff_name || null,

    // JSONB ricchi
    actor: sanitizeActor(actor),
    order_data: sanitizeOrder(order),
    items: items.map(sanitizeItem),
    money: sanitizeMoney(money),
    timing: sanitizeTiming(timing),
    flags: flags,
    kpi: kpi,
    metadata: {
      ...getBrowserMetadata(),
      ...metadata
    }
  }
}

// Helper per snapshot prodotto completo
const sanitizeItem = (item) => ({
  product_id: item.product_id,
  product_name: item.product_name,
  product_sku: item.product_sku || item.sku || null,
  category_id: item.category_id,
  category_name: item.category_name,
  variant_id: item.variant_id || null,
  variant_title: item.variant_title || null,
  variant_options: item.variant_options || {},
  quantity: item.quantity,
  unit_price: parseFloat(item.product_price || item.unit_price || 0),
  subtotal: parseFloat(item.subtotal || 0),
  notes: item.notes || null,
  batch_number: item.batch_number || 1,
  prepared: item.prepared || false,
  prepared_at: item.prepared_at || null,
  prepared_by_staff_id: item.prepared_by_staff_id || null
})

// Helper per metadata browser
const getBrowserMetadata = () => {
  if (typeof window === 'undefined') return {}

  return {
    user_agent: navigator.userAgent,
    screen_width: window.innerWidth,
    screen_height: window.innerHeight,
    device_type: getDeviceType(),
    language: navigator.language,
    referrer: document.referrer || null,
    timestamp: new Date().toISOString()
  }
}
```

---

## Query Analytics Esempio

### Query Shopify-style: Revenue per prodotto nell'ultimo mese

```sql
SELECT
  item->>'product_name' as product_name,
  item->>'product_sku' as sku,
  item->>'category_name' as category,
  COUNT(DISTINCT order_id) as orders_count,
  SUM((item->>'quantity')::int) as units_sold,
  SUM((item->>'subtotal')::decimal) as total_revenue,
  AVG((item->>'unit_price')::decimal) as avg_price,
  AVG((item->>'quantity')::int) as avg_quantity_per_order
FROM analytics_events,
  jsonb_array_elements(items) as item
WHERE
  restaurant_id = 'xxx'
  AND event_type = 'table_closed'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY
  item->>'product_name',
  item->>'product_sku',
  item->>'category_name'
ORDER BY total_revenue DESC
LIMIT 20;
```

### Query: Performance staff per giorno della settimana

```sql
SELECT
  actor->>'staff_name' as staff_name,
  EXTRACT(DOW FROM created_at) as day_of_week,
  COUNT(DISTINCT order_id) as orders_handled,
  SUM((money->>'total')::decimal) as total_revenue,
  AVG((timing->>'table_duration_seconds')::int) as avg_table_duration,
  SUM(CASE WHEN flags->>'had_upsell' = 'true' THEN 1 ELSE 0 END) as upsell_count
FROM analytics_events
WHERE
  restaurant_id = 'xxx'
  AND event_type = 'table_closed'
  AND actor->>'type' = 'staff'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY
  actor->>'staff_name',
  day_of_week
ORDER BY total_revenue DESC;
```

---

## Implementation Checklist

### Fase 1: Database & Schema
- [x] Creare migration SQL per analytics_events constraint
- [ ] Eseguire migration su Supabase
- [ ] Verificare indici JSONB esistenti
- [ ] Aggiungere indici mancanti

### Fase 2: Helper Functions
- [ ] Creare `createRichEventData()` in `analytics.js`
- [ ] Creare `sanitizeActor()`, `sanitizeOrder()`, `sanitizeItem()`
- [ ] Creare `trackRichEvent()` wrapper
- [ ] Creare `calculateKPIs()` helper

### Fase 3: Integration
- [ ] Aggiornare `ordersService.js` per usare tracking ricco
- [ ] Aggiornare tutti i `trackEvent()` con metadata completo
- [ ] Aggiornare `addTimelineEntry()` per salvare snapshot
- [ ] Testare eventi in tutti i flussi

### Fase 4: Testing & Validation
- [ ] Test ordine da QR (customer)
- [ ] Test ordine da POS (staff)
- [ ] Test aggiunta prodotti (upsell)
- [ ] Test completamento ordine
- [ ] Verificare JSON completo in DB
- [ ] Query di esempio funzionanti

### Fase 5: Documentation
- [ ] Aggiornare README.md
- [ ] Creare esempi query analytics
- [ ] Documentare struttura JSONB
- [ ] Guide per estrarre metriche

---

**Prossimo Step**: Implementare helper functions `createRichEventData()` e aggiornare tutto il tracking nel codebase.
