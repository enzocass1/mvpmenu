# Timeline Events Reference - MVP Menu

**Data creazione**: 26 Ottobre 2025
**Ultimo aggiornamento**: 26 Ottobre 2025
**Scopo**: Documentazione completa di tutti gli eventi tracciati nel sistema order_timeline e analytics_events

---

## Panoramica Sistema di Tracking

MVP Menu implementa un **sistema di tracking completo dual-layer** per garantire la tracciabilità end-to-end di tutta la customer journey:

### Due Sistemi Complementari

1. **`order_timeline`** - Timeline eventi specifici degli ordini con tracking staff/owner/customer
   - Focus: Eventi operativi interni (creazione ordini, modifiche, completamento)
   - Chi: Staff, Owner, System

2. **`analytics_events`** - Analytics generale per KPI, metriche, customer behavior
   - Focus: Customer journey completo (public menu browsing + ordini)
   - Chi: Customer, Staff, Owner, System

### Requisiti Fondamentali

✅ **Ogni evento DEVE tracciare** (i 5 pilastri):

1. **CHI** - Chi ha eseguito l'azione:
   - `staff_id` (se staff member)
   - `user_id` (se proprietario/owner)
   - `customer_id` (se cliente da public menu)
   - `created_by_type`: 'staff' | 'owner' | 'customer' | 'system'
   - `staff_role_display` (se staff/owner): ruolo leggibile

2. **COSA** - Cosa è successo:
   - Prodotti con SKU, varianti, prezzi, quantità
   - Dettagli dell'azione (`changes` JSONB)

3. **QUANDO** - Timestamp preciso:
   - `created_at` (timestamp evento)
   - Durate calcolate (es. tempo sessione, tempo ordine)

4. **DOVE** - Location:
   - Tavolo, sala (per ordini al tavolo)
   - Device type, browser (per eventi web)

5. **QUANTO** - Valori monetari:
   - Revenue, totali, sconti
   - KPI calcolati (es. revenue per minute)

---

## Schema Tabella `order_timeline`

```sql
CREATE TABLE order_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- CHI ha fatto l'azione
  staff_id UUID REFERENCES restaurant_staff(id) ON DELETE SET NULL,
  user_id UUID,  -- Owner ID (restaurants.user_id)
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  created_by_type VARCHAR(20) CHECK (created_by_type IN ('staff', 'owner', 'customer', 'system')),

  -- Info staff (popolato automaticamente da trigger o manualmente)
  staff_name TEXT,
  staff_role VARCHAR(50),
  staff_role_display VARCHAR(100),  -- Es. "Cameriere" invece di "waiter"

  -- COSA è successo
  action TEXT NOT NULL CHECK (action IN (
    'created', 'confirmed', 'preparing', 'completed', 'cancelled', 'deleted',
    'updated', 'item_added', 'item_removed', 'item_updated',
    'preconto_generated', 'table_changed', 'priority_added'
  )),

  -- Cambio di stato
  previous_status TEXT,
  new_status TEXT,

  -- Dettagli (JSON)
  changes JSONB,
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Eventi Tracciati - Public Menu (Customer Journey)

Il Public Menu traccia la **completa customer journey** dal momento in cui il cliente scansiona il QR fino alla creazione dell'ordine.

### Customer Journey Flow

```
QR Scan → Browse Menu → View Categories → View Products →
Add to Cart → Complete Order
```

Ogni step è tracciato per analytics comportamentale e ottimizzazione UX.

---

### 1. QR Code Scansionato (`qr_scanned`)

**Contesto**: Cliente scansiona QR code del tavolo

**File**: `PublicMenu.jsx` (useEffect iniziale)

**Analytics Event**:
```javascript
{
  restaurant_id: UUID,
  event_type: 'qr_scanned',
  created_at: TIMESTAMP,

  // Metadata automatico
  metadata: {
    source: 'qr',
    scan_time: '2025-10-26T14:31:42.123Z',
    user_agent: 'Mozilla/5.0...',
    device_type: 'mobile',
    screen_width: 390,
    screen_height: 844,
    referrer: null
  }
}
```

**Metriche derivabili**:
- QR scan rate per tavolo
- Device usage distribution
- Peak scan times
- Scan → Order conversion rate

---

### 2. Categoria Visualizzata (`category_viewed`)

**Contesto**: Cliente clicca su una categoria nel menu

**File**: `PublicMenu.jsx` (onClick categoria)

**Analytics Event**:
```javascript
{
  restaurant_id: UUID,
  event_type: 'category_viewed',
  category_id: UUID,
  created_at: TIMESTAMP,

  metadata: {
    category_name: 'Pizze',
    products_count: 12,
    user_agent: '...',
    device_type: 'mobile'
  }
}
```

**Metriche derivabili**:
- Categorie più visualizzate
- Sequenza di navigazione (category flow)
- Tempo medio per categoria
- Categorie con maggior conversione

---

### 3. Prodotto Visualizzato (`product_viewed`)

**Contesto**: Cliente espande un prodotto per vedere dettagli

**File**: `PublicMenu.jsx` (toggleExpandedProducts)

**Analytics Event**:
```javascript
{
  restaurant_id: UUID,
  event_type: 'product_viewed',
  product_id: UUID,
  category_id: UUID,
  created_at: TIMESTAMP,

  metadata: {
    product_name: 'Pizza Margherita',
    product_price: 7.00,
    category_name: 'Pizze',
    has_variants: true,
    variants_count: 3,
    user_agent: '...',
    device_type: 'mobile',
    view_duration_seconds: null  // Calcolato dopo
  }
}
```

**Metriche derivabili**:
- Prodotti più visualizzati
- View → Add to cart conversion rate
- Tempo medio visualizzazione
- Prodotti con alto bounce rate
- Varianti più scelte

---

### 4. Preferito Aggiunto/Rimosso (`favorite_added` / `favorite_removed`)

**Contesto**: Cliente aggiunge/rimuove prodotto dai preferiti (cuore)

**File**: `PublicMenu.jsx` (handleToggleFavorite)

**Analytics Event**:
```javascript
{
  restaurant_id: UUID,
  event_type: 'favorite_added',  // o 'favorite_removed'
  product_id: UUID,
  category_id: UUID,
  created_at: TIMESTAMP,

  metadata: {
    product_name: 'Pizza Margherita',
    category_name: 'Pizze',
    favorites_count_after: 5,  // Totale preferiti dopo azione
    user_agent: '...',
    device_type: 'mobile'
  }
}
```

**Metriche derivabili**:
- Prodotti più "preferiti"
- Favorite → Order conversion rate
- Prodotti salvati ma mai ordinati
- Customer engagement level

---

### 5. Prodotto Aggiunto al Carrello (`order_item_added`)

**Contesto**: Cliente aggiunge prodotto al carrello (modal Add to Cart)

**File**: `PublicMenu.jsx` (handleAddToCart)

**Analytics Event**:
```javascript
{
  restaurant_id: UUID,
  event_type: 'order_item_added',
  product_id: UUID,
  created_at: TIMESTAMP,

  metadata: {
    product_name: 'Pizza Margherita',
    variant_id: UUID || null,
    variant_title: 'Normale',
    quantity: 2,
    unit_price: 7.00,
    subtotal: 14.00,
    notes: 'Senza origano',
    cart_items_count_after: 3,
    cart_total_after: 24.00,
    user_agent: '...',
    device_type: 'mobile'
  }
}
```

**Metriche derivabili**:
- Add to cart rate per prodotto
- Cart abandonment rate
- Average cart value
- Most added products
- Varianti più scelte

---

### 6. Tempo Sessione (`session_time`)

**Contesto**: Tracciamento automatico quando cliente lascia il sito

**File**: `PublicMenu.jsx` (useSessionTracking hook)

**Analytics Event**:
```javascript
{
  restaurant_id: UUID,
  event_type: 'session_time',
  session_duration: 320,  // secondi
  created_at: TIMESTAMP,

  metadata: {
    pages_viewed: 1,
    categories_viewed: 4,
    products_viewed: 8,
    products_added_to_cart: 2,
    order_completed: true,
    user_agent: '...',
    device_type: 'mobile'
  }
}
```

**Metriche derivabili**:
- Average session duration
- Session duration by device
- Engagement score
- Time to order
- Bounce rate

---

### 7. Ordine Creato da Public Menu

**Contesto**: Cliente completa checkout e crea ordine

**File**: `Cart.jsx` (handleSubmitOrder)

**Timeline Entry** (in `order_timeline`):
```javascript
{
  order_id: orderId,
  action: 'created',
  customer_id: customerId || null,
  created_by_type: 'customer',
  new_status: 'pending',
  notes: `Ordine creato dal cliente via QR - ${customerName}`,
  changes: {
    items_count: 3,
    is_priority: false,
    table_id: tableId,
    room_id: roomId,
    source: 'qr'
  }
}
```

**Analytics Event** (in `analytics_events`):
```javascript
{
  restaurant_id: UUID,
  event_type: 'table_order_pending',
  order_id: UUID,
  created_at: TIMESTAMP,

  // Relazioni
  table_id: UUID,
  room_id: UUID,
  customer_id: UUID || null,

  // Dati denormalizzati
  order_number: 'ORD-042',

  // JSONB ricchi
  actor: {
    type: 'customer',
    customer_id: UUID,
    customer_name: 'Mario Rossi',
    customer_locale: 'it-IT'
  },

  order_data: {
    id: UUID,
    order_number: 'ORD-042',
    status: 'pending',
    type: 'table',
    source: 'qr'
  },

  items: [
    {
      product_id: UUID,
      product_name: 'Pizza Margherita',
      product_sku: 'PIZZA-MARG-001',
      category_name: 'Pizze',
      variant_title: 'Normale',
      quantity: 2,
      unit_price: 7.00,
      subtotal: 14.00,
      notes: 'Senza origano'
    },
    // ... altri prodotti
  ],

  location: {
    table_id: UUID,
    table_number: 6,
    room_id: UUID,
    room_name: 'Sala Interna'
  },

  money: {
    items_subtotal: 20.00,
    priority_fee: 2.00,
    total: 22.00,
    currency: 'EUR'
  },

  timing: {
    created_at: TIMESTAMP,
    qr_scanned_at: TIMESTAMP,
    time_from_scan_to_order_seconds: 120
  },

  flags: {
    is_priority: true,
    is_first_order: true,
    has_modifications: true
  },

  metadata: {
    session_duration_seconds: 180,
    categories_browsed: 3,
    products_viewed: 8,
    favorites_added: 2,
    device_type: 'mobile',
    user_agent: '...'
  }
}
```

**Metriche derivabili**:
- QR scan → Order conversion rate
- Time to order from scan
- Average order value from QR
- Products per order
- Session behavior before order

---

## Public Menu Analytics - Funnel Completo

```
1. QR Scanned                 (100%)
   ↓
2. Menu Browsed               (95%)   - 5% bounce immediatamente
   ↓
3. Category Viewed            (90%)   - Browse ma non approfondiscono
   ↓
4. Product Viewed             (75%)   - Vedono i dettagli
   ↓
5. Product Added to Cart      (40%)   - Aggiungono al carrello
   ↓
6. Order Completed            (35%)   - 5% cart abandonment
```

**Ogni step è tracciato** per identificare drop-off points e ottimizzare il funnel.

---

## Eventi Tracciati - Order Lifecycle

### 1. Ordine Creato (`created`)

**Contesti**:
- Cliente da public menu (QR code)
- Staff da cassa/ordini (tavolo o banco)
- Owner da cassa/ordini

**File**:
- `ordersService.js`: `createTableOrder()`, `createCounterOrder()`
- `CreateOrderModal.jsx`: manual order creation

**Timeline Entry**:
```javascript
{
  order_id: orderId,
  action: 'created',
  staff_id: staffId || null,
  user_id: userId || null,
  customer_id: customerId || null,
  created_by_type: 'staff' | 'owner' | 'customer',
  new_status: 'pending' | 'preparing',
  notes: `Ordine creato da ${type}`,
  changes: {
    items_count: 5,
    is_priority: false,
    table_id: '...',
    room_id: '...'
  }
}
```

**Analytics Event**:
```javascript
trackEvent('table_order_pending', {
  restaurant_id,
  order_id,
  table_id,
  room_id,
  staff_id,
  user_id,
  items_count,
  is_priority,
  total
})
```

---

### 2. Ordine Confermato (`confirmed`)

**Contesto**: Staff conferma ordine pending → mette in preparing

**File**: `ordersService.js`: `confirmOrder()`

**Timeline Entry**:
```javascript
{
  order_id: orderId,
  action: 'confirmed',
  staff_id: staffId,
  user_id: userId || null,
  created_by_type: 'staff' | 'owner',
  previous_status: 'pending',
  new_status: 'preparing',
  notes: 'Ordine confermato e messo in preparazione'
}
```

**Analytics Event**:
```javascript
trackEvent('table_order_confirmed', {
  restaurant_id,
  order_id,
  table_id,
  room_id,
  staff_id,
  user_id
})
```

---

### 3. Prodotti Aggiunti (`item_added`)

**Contesto**: Aggiunta prodotti a ordine existing (batch system)

**File**: `ordersService.js`: `addProductsToOrder()`

**Timeline Entry**:
```javascript
{
  order_id: orderId,
  action: 'item_added',
  staff_id: staffId,
  user_id: userId || null,
  created_by_type: 'staff' | 'owner',
  notes: `Aggiunti ${count} prodotti (Batch #${batchNumber})`,
  changes: {
    batch_number: 2,
    items_count: 3,
    products: [
      { name: 'Pizza Margherita', qty: 2 },
      { name: 'Coca Cola', qty: 1 }
    ]
  }
}
```

**Analytics Event**:
```javascript
trackEvent('products_added_to_order', {
  restaurant_id,
  order_id,
  batch_number,
  items_count,
  staff_id,
  user_id
})
```

---

### 4. Prodotto Rimosso (`item_removed`)

**Contesto**: Rimozione singolo prodotto da ordine

**File**: `ordersService.js`: `removeOrderItem()`

**Timeline Entry**:
```javascript
{
  order_id: orderId,
  action: 'item_removed',
  staff_id: staffId,
  user_id: userId || null,
  created_by_type: 'staff' | 'owner',
  notes: `Rimosso: ${productName} (x${quantity})`,
  changes: {
    batch_number: 1,
    product_name: 'Pizza Margherita',
    quantity: 1,
    product_id: '...'
  }
}
```

---

### 5. Preconto Generato (`preconto_generated`)

**Contesto**: Generazione preconto (scontrino non fiscale)

**File**: `ordersService.js`: `generatePreconto()`

**Timeline Entry**:
```javascript
{
  order_id: orderId,
  action: 'preconto_generated',
  staff_id: staffId,
  user_id: userId || null,
  created_by_type: 'staff' | 'owner',
  notes: 'Preconto generato',
  changes: {
    timestamp: '2025-10-26T12:30:00Z'
  }
}
```

**Analytics Event**:
```javascript
trackEvent('preconto_generated', {
  restaurant_id,
  order_id,
  table_id,
  staff_id,
  user_id
})
```

---

### 6. Ordine Completato (`completed`)

**Contesto**: Chiusura tavolo con scontrino fiscale

**File**: `ordersService.js`: `closeTableOrder()`, `generateScontrino()`

**Timeline Entry**:
```javascript
{
  order_id: orderId,
  action: 'completed',
  staff_id: staffId,
  user_id: userId || null,
  created_by_type: 'staff' | 'owner',
  previous_status: 'preparing',
  new_status: 'completed',
  notes: 'Scontrino fiscale N. 42' | 'Tavolo chiuso',
  changes: {
    receipt_number: 42
  }
}
```

**Analytics Event**:
```javascript
trackEvent('table_closed', {
  restaurant_id,
  order_id,
  table_id,
  room_id,
  staff_id,
  user_id,
  receipt_number
})
```

---

### 7. Ordine Annullato/Eliminato (`cancelled` | `deleted`)

**Contesto**: Soft delete ordine (status → completed, deleted_at → timestamp)

**File**:
- `ordersService.js`: `deleteOrder()`
- `OrderDetailPage.jsx`: manual delete
- `OrdersPage.jsx`: bulk delete

**Timeline Entry**:
```javascript
{
  order_id: orderId,
  action: 'deleted' | 'cancelled',
  staff_id: staffId || null,
  user_id: userId || null,
  created_by_type: 'staff' | 'owner',
  previous_status: 'pending' | 'preparing',
  new_status: 'cancelled',
  notes: 'Ordine annullato e rimosso',
  changes: {
    soft_delete: true,
    bulk_delete: false
  }
}
```

**Analytics Event**:
```javascript
trackEvent('order_cancelled', {
  restaurant_id,
  order_id,
  table_id,
  room_id,
  staff_id,
  user_id
})
```

---

### 8. Tavolo Cambiato (`table_changed`)

**Contesto**: Spostamento ordine a diverso tavolo/sala

**File**: `ChangeTableModal.jsx`

**Timeline Entry**:
```javascript
{
  order_id: orderId,
  action: 'table_changed',
  staff_id: staffId,
  user_id: userId || null,
  created_by_type: 'staff' | 'owner',
  notes: `Spostato da Sala ${oldRoom} Tavolo ${oldTable} → Sala ${newRoom} Tavolo ${newTable}`,
  changes: {
    old_room_id: '...',
    old_room_name: 'Interna',
    old_table_id: '...',
    old_table_number: 5,
    new_room_id: '...',
    new_room_name: 'Esterna',
    new_table_id: '...',
    new_table_number: 12
  }
}
```

---

### 9. Priority Order Aggiunto (`priority_added`)

**Contesto**: Aggiunta costo priority order

**File**: `ordersService.js`: `addPriorityToOrder()`

**Timeline Entry**:
```javascript
{
  order_id: orderId,
  action: 'priority_added',
  staff_id: staffId || null,
  user_id: userId || null,
  customer_id: customerId || null,
  created_by_type: 'staff' | 'owner' | 'customer',
  notes: 'Priority order richiesto',
  changes: {
    amount: 2.00,
    total_priority: 2.00
  }
}
```

**Analytics Event**:
```javascript
trackEvent('priority_order_requested', {
  order_id,
  amount,
  total_priority
})
```

---

## Problemi Attuali Identificati

### ❌ Problema 1: Analytics 400 Errors

**Errore**: `analytics_events?select=*: 400`

**Causa Probabile**: Query malformate o constraint mancanti

**Soluzione**: Audit completo query analytics e fix constraints

---

### ❌ Problema 2: Staff Info Mancanti in Timeline

**Problema**: `staff_name` e `staff_role_display` spesso NULL

**Causa**: La funzione `addTimelineEntry()` non riceve l'oggetto staff completo, solo `staffId`

**Soluzione**:
1. Modificare tutte le chiamate per passare `staffSession` completo
2. Popolare manualmente staff_name e staff_role_display
3. Verificare che il trigger DB (se esiste) funzioni correttamente

**File da modificare**:
- `ordersService.js` - Tutte le funzioni che chiamano `addTimelineEntry()`
- `CreateOrderModal.jsx`
- `OrderDetailPage.jsx`
- `OrdersPage.jsx`
- `ChangeTableModal.jsx`

---

### ❌ Problema 3: Tracking Owner vs Staff

**Problema**: Non sempre viene distinto correttamente owner da staff

**Causa**: La funzione `addTimelineEntry()` riceve solo `staffId`, non `userId` e `created_by_type`

**Soluzione**: Modificare firma function per accettare oggetto completo:

```javascript
const addTimelineEntry = async (orderId, action, userInfo = {}, data = {}) => {
  const entry = {
    order_id: orderId,
    staff_id: userInfo.staff_id || null,
    user_id: userInfo.user_id || null,
    customer_id: userInfo.customer_id || null,
    created_by_type: userInfo.created_by_type || 'system',
    staff_name: userInfo.staff_name || null,
    staff_role: userInfo.staff_role || null,
    staff_role_display: userInfo.staff_role_display || null,
    action: action,
    previous_status: data.previousStatus || null,
    new_status: data.newStatus || null,
    changes: data.changes || null,
    notes: data.notes || null,
    created_at: new Date().toISOString()
  }

  await supabase.from('order_timeline').insert(entry)
}
```

---

### ❌ Problema 4: Eventi Mancanti

**Eventi NON tracciati attualmente**:
- ❌ Modifica quantità prodotto esistente (`item_updated`)
- ❌ Modifica note ordine (`order_updated`)
- ❌ Ordine messo in attesa dopo preparing
- ❌ Riassegnazione tavolo a ordine orfano

**Soluzione**: Implementare tracking per questi eventi

---

## Schema Analytics Events

### Tipi Evento Supportati

```javascript
const ORDER_EVENT_TYPES = {
  // Lifecycle
  TABLE_ORDER_PENDING: 'table_order_pending',
  TABLE_ORDER_CONFIRMED: 'table_order_confirmed',
  COUNTER_ORDER_COMPLETED: 'counter_order_completed',
  TABLE_CLOSED: 'table_closed',
  ORDER_CANCELLED: 'order_cancelled',

  // Azioni
  PRODUCTS_ADDED: 'products_added_to_order',
  PRIORITY_REQUESTED: 'priority_order_requested',
  PRECONTO_GENERATED: 'preconto_generated',

  // Public Menu (esistenti)
  FAVORITE_ADDED: 'favorite_added',
  FAVORITE_REMOVED: 'favorite_removed',
  PRODUCT_VIEWED: 'product_viewed',
  CATEGORY_VIEWED: 'category_viewed',
  SESSION_TIME: 'session_time',
  QR_SCANNED: 'qr_scanned'
}
```

### Metadata Standard

Ogni evento analytics DEVE includere:

```javascript
{
  restaurant_id: UUID,  // OBBLIGATORIO
  event_type: STRING,   // OBBLIGATORIO

  // Entità
  order_id: UUID || null,
  product_id: UUID || null,
  category_id: UUID || null,
  table_id: UUID || null,
  room_id: UUID || null,

  // Chi
  staff_id: UUID || null,
  user_id: UUID || null,
  customer_id: UUID || null,

  // Cosa
  metadata: {
    items_count: INT,
    total: DECIMAL,
    is_priority: BOOLEAN,
    batch_number: INT,
    receipt_number: INT,
    source: 'web' | 'qr' | 'staff' | 'owner',
    ...
  },

  created_at: TIMESTAMP
}
```

---

## KPI Derivati da Timeline & Analytics

### Metriche Ordini
- **Tempo medio ordine pending → confirmed**: `TIMESTAMP(confirmed) - TIMESTAMP(created)`
- **Tempo medio ordine confirmed → completed**: `TIMESTAMP(completed) - TIMESTAMP(confirmed)`
- **Durata tavolo**: `TIMESTAMP(completed) - TIMESTAMP(opened_at)`
- **Ordini per staff member**: `COUNT(DISTINCT order_id) GROUP BY staff_id`
- **Prodotti più ordinati**: `COUNT(product_id) FROM order_items`

### Metriche Staff Performance
- **Ordini gestiti per staff**: `COUNT(*) FROM order_timeline WHERE staff_id = X`
- **Tempo medio conferma**: `AVG(time_diff) WHERE action = 'confirmed'`
- **Ordini annullati per staff**: `COUNT(*) WHERE action = 'cancelled'`

### Metriche Revenue
- **Revenue per staff**: `SUM(total_amount) FROM orders WHERE created_by_staff_id = X`
- **Revenue per tavolo**: `SUM(total_amount) GROUP BY table_id`
- **Revenue per ora del giorno**: `SUM(total_amount) GROUP BY HOUR(created_at)`

---

## Checklist Implementazione

### Fase 1: Fix Analytics 400 Errors
- [ ] Identificare query analytics che causano 400
- [ ] Verificare constraint `event_type` in DB
- [ ] Aggiungere nuovi event types al constraint
- [ ] Testare tutte le chiamate `trackEvent()`

### Fase 2: Fix Timeline Staff Tracking
- [ ] Modificare `addTimelineEntry()` signature
- [ ] Aggiornare tutte le chiamate in `ordersService.js`
- [ ] Aggiornare chiamate in `CreateOrderModal.jsx`
- [ ] Aggiornare chiamate in `OrderDetailPage.jsx`
- [ ] Aggiornare chiamate in `OrdersPage.jsx`
- [ ] Aggiornare chiamate in `ChangeTableModal.jsx`

### Fase 3: Aggiungere Eventi Mancanti
- [ ] `item_updated` - modifica quantità
- [ ] `order_updated` - modifica note/dettagli
- [ ] Tavolo riassegnato a ordine orfano

### Fase 4: Testing & Validation
- [ ] Test creazione ordine (customer, staff, owner)
- [ ] Test conferma ordine
- [ ] Test aggiunta prodotti
- [ ] Test eliminazione ordine
- [ ] Test cambio tavolo
- [ ] Test scontrino/preconto
- [ ] Verificare tutti i campi popolati in `order_timeline`
- [ ] Verificare analytics events creati correttamente

### Fase 5: Documentation
- [ ] Aggiornare README.md
- [ ] Aggiornare TASK_LOG.md
- [ ] Aggiornare PIANO_IMPLEMENTAZIONE_CASSA.md
- [ ] Creare CURRENT_CONTEXT.md
- [ ] Aggiornare CONVERSATION_LOG.md

---

## Note Tecniche

### Database Triggers

Verificare se esistono triggers che auto-popolano `staff_name` e `staff_role_display`:

```sql
-- Trigger per popolare staff info automaticamente
CREATE OR REPLACE FUNCTION order_timeline_populate_user_info()
RETURNS TRIGGER AS $$
BEGIN
  -- Se staff_id presente, popola nome e ruolo
  IF NEW.staff_id IS NOT NULL THEN
    SELECT
      CONCAT(first_name, ' ', last_name),
      role_display
    INTO NEW.staff_name, NEW.staff_role_display
    FROM restaurant_staff
    WHERE id = NEW.staff_id;
  END IF;

  -- Se user_id presente (owner), popola nome
  IF NEW.user_id IS NOT NULL AND NEW.staff_id IS NULL THEN
    SELECT
      CONCAT(owner_first_name, ' ', owner_last_name),
      'Proprietario'
    INTO NEW.staff_name, NEW.staff_role_display
    FROM restaurants
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_order_timeline_populate_user_info
BEFORE INSERT ON order_timeline
FOR EACH ROW
EXECUTE FUNCTION order_timeline_populate_user_info();
```

---

**Fine Documento**
