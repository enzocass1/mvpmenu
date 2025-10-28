# Sistema Centralizzato per Eventi Timeline e Analytics

## 📋 Panoramica

Il sistema MVP Menu utilizza **DUE sistemi di tracciamento complementari ma separati**:

1. **Order Timeline** (`order_timeline`) - Audit trail dettagliato per ogni ordine
2. **Analytics Events** (`analytics_events`) - KPI business e metriche aggregate

---

## 🎯 Order Timeline - Audit Trail Operativo

### Scopo
Tracking preciso di **chi ha fatto cosa** su ogni singolo ordine. Per audit, debugging, gestione staff e timeline ordini.

### Tabella: `order_timeline`

```sql
CREATE TABLE order_timeline (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  action VARCHAR(50),  -- created, confirmed, completed, cancelled, etc.
  event_source VARCHAR(50),  -- ✨ NUOVO: da dove viene l'evento

  -- Chi ha fatto l'azione
  staff_id UUID,
  user_id UUID,
  staff_name VARCHAR(255),
  staff_role_display VARCHAR(100),
  created_by_type VARCHAR(50),  -- owner, staff, customer, system

  -- Cosa è cambiato
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  changes JSONB,
  notes TEXT,

  -- UI Enhancement
  is_expandable BOOLEAN,
  details_summary TEXT,

  created_at TIMESTAMP
);
```

### Event Sources (6 tipi)

| Source | Label | Descrizione |
|--------|-------|-------------|
| `public_menu` | Menu Pubblico (QR) | Cliente ordina da QR code |
| `table_service` | Servizio Tavoli | Staff gestisce tavolo |
| `counter` | Banco | Ordine banco/asporto |
| `orders_page` | Gestione Ordini | Modifiche da sezione Ordini |
| `cashier` | Cassa | Operazioni cassa (chiusura/preconto) |
| `system` | Sistema | Eventi automatici |

### Come Usare - API Centralizzata

**✅ SEMPRE usare [timelineService.js](src/lib/timelineService.js):**

```javascript
import {
  addTimelineEntry,
  buildOperatorInfo,
  EVENT_SOURCE,
  TIMELINE_ACTION
} from './timelineService'

// Esempio: Staff conferma ordine
await addTimelineEntry({
  orderId: '123',
  action: TIMELINE_ACTION.CONFIRMED,
  eventSource: EVENT_SOURCE.TABLE_SERVICE,
  operator: buildOperatorInfo({
    staffId: 'abc',
    createdByType: 'staff'
  }),
  data: {
    previousStatus: 'pending',
    newStatus: 'preparing',
    notes: 'Ordine confermato',
    isExpandable: false
  }
})
```

**❌ MAI fare INSERT diretti:**
```javascript
// ❌ SBAGLIATO - Non fare questo!
await supabase.from('order_timeline').insert({ ... })
```

---

## 📊 Analytics Events - KPI Business

### Scopo
Metriche business stile Shopify/Klaviyo per analisi aggregate, dashboard e decisioni strategiche.

### Tabella: `analytics_events`

```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  event_type VARCHAR(100),  -- 42 tipi diversi
  product_id UUID,
  category_id UUID,
  session_duration INTEGER,
  metadata JSONB,  -- Dati flessibili
  created_at TIMESTAMP
);
```

### Tipi di Eventi (42 totali)

#### Customer Account Events (7)
- `customer_registered`, `customer_login`, `customer_logout`
- `loyalty_points_earned`, `loyalty_points_redeemed`
- `traffic_source_tracked`

#### Public Menu Browsing Events (11)
- `qr_scanned` - Cliente scansiona QR
- `product_viewed` - Visualizza prodotto
- `category_viewed` - Entra in categoria
- `favorite_added` / `favorite_removed`
- `session_time` - Durata sessione
- `product_searched`, `menu_shared`, `product_image_viewed`
- `opening_hours_viewed`

#### Cart & Checkout Events (4)
- **`order_item_added`** - ⭐ "Add to cart"
- `cart_item_removed`
- `cart_viewed`
- `checkout_started`

#### Order Lifecycle Events (10)
- `order_created` - Ordine creato
- `order_status_changed` - Cambio stato
- **`order_completed`** - ⭐ Qui si calcola REVENUE
- `order_cancelled`
- `products_added_to_order` - Batch aggiunto
- `item_prepared`, `item_removed`
- `order_note_added`, `table_changed`

#### Staff Operations Events (8)
- `staff_login` / `staff_logout`
- `table_opened`, `preconto_generated`, `receipt_printed`
- `priority_order_requested`
- `table_order_pending`, `table_order_confirmed`

#### Payment & Receipt Events (2)
- `payment_method_selected`, `discount_applied`

#### Legacy (2)
- `counter_order_completed`, `table_closed`

### Come Usare - API Centralizzata

**✅ SEMPRE usare [analytics.js](src/utils/analytics.js):**

```javascript
import { trackEvent } from '../utils/analytics'

// Esempio: Tracciare revenue
await trackEvent('order_completed', {
  restaurant_id: restaurantId,
  order_id: orderId,
  metadata: {
    total_amount: 45.50,  // <-- REVENUE
    items_count: 5,
    receipt_number: 123
  }
})

// Esempio: Add to cart
await trackEvent('order_item_added', {
  restaurant_id: restaurantId,
  product_id: productId,
  category_id: categoryId,
  metadata: {
    quantity: 2,
    price: 12.00
  }
})
```

**❌ MAI fare INSERT diretti:**
```javascript
// ❌ SBAGLIATO - Non fare questo!
await supabase.from('analytics_events').insert({ ... })
```

---

## 🔄 Come Si Collegano i Due Sistemi

### Scenario: Ciclo di vita ordine completo

```javascript
// 1️⃣ STAFF CREA ORDINE DALLA CASSA
// Viene da CreateOrderModal o ordersService.createTableOrderByStaff

// ✅ Timeline Event
await addTimelineEntry({
  orderId: order.id,
  action: TIMELINE_ACTION.CREATED,
  eventSource: EVENT_SOURCE.TABLE_SERVICE,  // Staff dalla cassa
  operator: buildOperatorInfo({
    staffId: staffId,
    createdByType: 'staff'
  }),
  data: {
    newStatus: 'pending',
    notes: 'Ordine creato dallo staff',
    detailsSummary: '3 prodotti - Tavolo 12'
  }
})

// ✅ Analytics Event
await trackEvent('table_order_pending', {
  restaurant_id: restaurantId,
  order_id: order.id,
  items_count: 3,
  metadata: {
    total_amount: 35.00,
    created_by_staff: true
  }
})

// 2️⃣ STAFF CONFERMA ORDINE
// Viene da ordersService.confirmOrder()

// ✅ Timeline Event
await addTimelineEntry({
  orderId,
  action: TIMELINE_ACTION.CONFIRMED,
  eventSource: EVENT_SOURCE.TABLE_SERVICE,
  operator: buildOperatorInfo({
    staffId: staffId,
    createdByType: 'staff'
  }),
  data: {
    previousStatus: 'pending',
    newStatus: 'preparing',
    notes: 'Ordine confermato'
  }
})

// ✅ Analytics Event
await trackEvent('table_order_confirmed', {
  restaurant_id: restaurantId,
  order_id: orderId,
  metadata: {
    staff_id: staffId
  }
})

// 3️⃣ CASSA CHIUDE TAVOLO
// Viene da ordersService.closeTableOrder()

// ✅ Timeline Event
await addTimelineEntry({
  orderId,
  action: TIMELINE_ACTION.COMPLETED,
  eventSource: EVENT_SOURCE.CASHIER,  // Dalla cassa
  operator: buildOperatorInfo({
    staffId: staffId,
    createdByType: 'staff'
  }),
  data: {
    previousStatus: 'preparing',
    newStatus: 'completed',
    notes: 'Scontrino N. 123',
    detailsSummary: 'Scontrino N. 123'
  }
})

// ✅ Analytics Event (per REVENUE!)
await trackEvent('order_completed', {
  restaurant_id: restaurantId,
  order_id: orderId,
  metadata: {
    total_amount: 45.50,  // <-- KPI REVENUE
    receipt_number: 123
  }
})
```

---

## 📁 Architettura dei File

### File Centralizzati (da usare sempre)

1. **[src/lib/timelineService.js](src/lib/timelineService.js)** - Servizio Timeline
   - `addTimelineEntry()` - Aggiungi evento
   - `buildOperatorInfo()` - Costruisci info operatore
   - `loadOrderTimeline()` - Carica timeline formattata
   - `formatTimelineEntry()` - Formatta per UI
   - Costanti: `EVENT_SOURCE`, `TIMELINE_ACTION`

2. **[src/utils/analytics.js](src/utils/analytics.js)** - Servizio Analytics
   - `trackEvent()` - Traccia evento
   - `EVENT_TYPES` - Costanti per event_type
   - Funzioni query: `getAnalyticsEvents()`, `getTopProducts()`, etc.

3. **[src/lib/ordersService.js](src/lib/ordersService.js)** - Servizio Ordini
   - Usa **entrambi** i servizi sopra
   - `createTableOrder()`, `createTableOrderByStaff()`
   - `confirmOrder()`, `closeTableOrder()`
   - `addProductsToOrder()`, `removeProductFromOrder()`
   - Tutte le funzioni tracciano automaticamente timeline + analytics

### File Legacy (deprecati)

1. **[src/lib/orderOperations.js](src/lib/orderOperations.js)** - ⚠️ DEPRECATED
   - `addOrderTimelineEvent()` - Ora usa timelineService internamente
   - Mantenuto solo per backward compatibility
   - **NON usare per nuovo codice**

---

## ✅ Regole D'oro

### 1. Mai INSERT Diretti
```javascript
// ❌ SBAGLIATO
await supabase.from('order_timeline').insert({ ... })
await supabase.from('analytics_events').insert({ ... })

// ✅ CORRETTO
await addTimelineEntry({ ... })
await trackEvent('event_type', { ... })
```

### 2. Sempre Specificare event_source
```javascript
// ❌ SBAGLIATO - diventa 'system' di default
await addTimelineEntry({
  orderId,
  action: 'created',
  // ❌ Manca event_source!
})

// ✅ CORRETTO
await addTimelineEntry({
  orderId,
  action: TIMELINE_ACTION.CREATED,
  eventSource: EVENT_SOURCE.TABLE_SERVICE,  // ✅ Specificato
  operator: buildOperatorInfo({ ... }),
  data: { ... }
})
```

### 3. Usa ordersService per Operazioni Ordini
```javascript
// ❌ SBAGLIATO - gestisci manualmente INSERT + timeline
const { data: order } = await supabase.from('orders').insert({ ... })
await addTimelineEntry({ ... })
await trackEvent({ ... })

// ✅ CORRETTO - ordersService gestisce tutto
const result = await ordersService.createTableOrderByStaff({
  restaurantId,
  tableId,
  items,
  staffId
})
// ✅ Ha già creato ordine + timeline + analytics automaticamente!
```

### 4. Formatta Sempre Operator Info
```javascript
// ❌ SBAGLIATO - info incompleta
await addTimelineEntry({
  orderId,
  action: 'created',
  eventSource: EVENT_SOURCE.TABLE_SERVICE,
  operator: {
    staffId: 'abc'  // ❌ Manca created_by_type, staff_name
  }
})

// ✅ CORRETTO - usa buildOperatorInfo
await addTimelineEntry({
  orderId,
  action: TIMELINE_ACTION.CREATED,
  eventSource: EVENT_SOURCE.TABLE_SERVICE,
  operator: buildOperatorInfo({
    staffId: 'abc',
    createdByType: 'staff',  // ✅ Specificato
    staffName: 'Mario Rossi'
  }),
  data: { ... }
})
```

---

## 🔍 Come Calcolare KPI

### Revenue Totale

```javascript
const events = await getAnalyticsEvents(
  restaurantId,
  'order_completed',
  startDate,
  endDate
)

const totalRevenue = events.reduce((sum, e) =>
  sum + (e.metadata?.total_amount || 0), 0
)
```

### Add to Cart Rate

```javascript
const views = await getTotalEventsCount(
  restaurantId,
  'product_viewed',
  startDate,
  endDate
)

const cartAdds = await getTotalEventsCount(
  restaurantId,
  'order_item_added',
  startDate,
  endDate
)

const conversionRate = (cartAdds / views) * 100
```

### Top Products

```javascript
const topProducts = await getTopProducts(
  restaurantId,
  'product_viewed',
  startDate,
  endDate,
  limit
)
```

---

## 📝 Checklist per Nuovo Codice

Quando scrivi nuovo codice che crea/modifica ordini:

- [ ] Ho usato `ordersService.*` invece di INSERT diretti?
- [ ] Se ho aggiunto timeline events, ho usato `addTimelineEntry()`?
- [ ] Ho specificato `eventSource` corretto?
- [ ] Ho usato `buildOperatorInfo()` per costruire operator?
- [ ] Ho tracciato analytics event con `trackEvent()`?
- [ ] Ho usato event_type corretto da `EVENT_TYPES`?
- [ ] Ho incluso metadata utili per KPI (total_amount, items_count)?

---

## 🎨 UI - Timeline Display

La timeline viene visualizzata in [OrderDetailPage.jsx](src/pages/OrderDetailPage.jsx).

**Formato Consistente:**
```
[Action Label]  [Event Source Badge]
Details Summary
Notes
da [Ruolo] - [Nome]  <-- Operator Display
27 ott 2025, 16:55:50
```

**Esempio:**
```
Ordine Creato   [Servizio Tavoli]
3 prodotti - Tavolo 12
Ordine creato dallo staff
da Admin - Proprietario
27 ott 2025, 16:55:50
```

---

## 🚀 Migration Completata

**Files Migrati:**
- ✅ [src/components/CreateOrderModal.jsx](src/components/CreateOrderModal.jsx) - Usa timelineService + trackEvent
- ✅ [src/lib/orderOperations.js](src/lib/orderOperations.js) - Internamente usa timelineService
- ✅ [src/lib/ordersService.js](src/lib/ordersService.js) - Già migrato (9 callsites)
- ✅ [src/pages/OrderDetailPage.jsx](src/pages/OrderDetailPage.jsx) - Usa loadOrderTimeline()

**Tutti i timeline events ora hanno:**
- ✅ `event_source` specificato
- ✅ Operator info formattato consistentemente
- ✅ Details summary e notes
- ✅ UI enhancement fields

---

## 📚 Riferimenti

- [TIMELINE_EVENTS_REFERENCE.md](TIMELINE_EVENTS_REFERENCE.md) - Riferimento completo eventi timeline
- [database/migrations/09_timeline_event_source.sql](database/migrations/09_timeline_event_source.sql) - Migration database
- [database/migrations/01_analytics_constraint.sql](database/migrations/01_analytics_constraint.sql) - Constraint analytics events

---

**Data Creazione**: 27 Ottobre 2025
**Ultima Modifica**: 27 Ottobre 2025
**Versione**: 1.0
