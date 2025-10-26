# Timeline Events Reference

## Overview

Every order operation is now tracked in the `order_timeline` table with complete metadata, including:
- Who performed the action (staff_id with name and role)
- When it happened (timestamp)
- What changed (previous/new status)
- Additional details (notes, changes JSON)

This allows for comprehensive audit trails and analytics for future dashboards.

## Events Tracked

### 1. Order Creation

#### Customer-Created Order
**Action**: `created`
**Status**: `null` → `pending`
**Triggered by**: `createTableOrder()`
**Metadata**:
```javascript
{
  createdByType: 'customer',
  newStatus: 'pending',
  notes: 'Ordine creato dal cliente - [Nome Cliente]',
  changes: {
    items_count: 3,
    is_priority: false
  }
}
```

**Example Timeline Entry**:
```
Ordine creato
Cliente Incognito
Ordine creato dal cliente - Mario Rossi
26 Ott 2025, 20:30
```

#### Staff-Created Order
**Action**: `created`
**Status**: `null` → `preparing`
**Triggered by**: `createTableOrderByStaff()`
**Metadata**:
```javascript
{
  newStatus: 'preparing',
  notes: 'Tavolo aperto dallo staff per [Nome Cliente]',
  changes: {
    items_count: 5,
    is_priority: false
  }
}
```

**Example Timeline Entry**:
```
Ordine creato
da Cameriere - Luca Verdi
Tavolo aperto dallo staff per famiglia Bianchi
26 Ott 2025, 20:35
```

---

### 2. Order Confirmation

**Action**: `confirmed`
**Status**: `pending` → `preparing`
**Triggered by**: `confirmOrder()`
**Metadata**:
```javascript
{
  previousStatus: 'pending',
  newStatus: 'preparing',
  notes: 'Ordine confermato e messo in preparazione'
}
```

**Example Timeline Entry**:
```
Ordine confermato
da Admin - Vincenzo Cassese
Ordine confermato e messo in preparazione
26 Ott 2025, 20:40
```

**⚠️ IMPORTANTE**: Questo è l'evento che il cliente segnalava mancante!

---

### 3. Order Completion

**Action**: `completed`
**Status**: `preparing` → `completed`
**Triggered by**: `closeTableOrder()` / `generateScontrino()`
**Metadata**:
```javascript
{
  previousStatus: 'preparing',
  newStatus: 'completed',
  notes: 'Scontrino fiscale N. 142', // o 'Tavolo chiuso'
  changes: {
    receipt_number: 142
  }
}
```

**Example Timeline Entry**:
```
Completato
da Cassiere - Anna Neri
Scontrino fiscale N. 142
26 Ott 2025, 21:15
```

---

### 4. Order Cancellation

**Action**: `cancelled`
**Status**: `[any]` → `cancelled`
**Triggered by**: `deleteOrder()`
**Metadata**:
```javascript
{
  previousStatus: 'pending', // o 'preparing'
  newStatus: 'cancelled',
  notes: 'Ordine annullato e rimosso'
}
```

**Example Timeline Entry**:
```
Annullato
da Admin - Vincenzo Cassese
Ordine annullato e rimosso
26 Ott 2025, 20:45
```

---

### 5. Product Addition

**Action**: `item_added`
**Status**: N/A (no status change)
**Triggered by**: `addProductsToOrder()`
**Metadata**:
```javascript
{
  notes: 'Aggiunti 2 prodotti (Batch #2)',
  changes: {
    batch_number: 2,
    items_count: 2,
    products: [
      { name: 'Pizza Margherita', qty: 1 },
      { name: 'Coca Cola', qty: 2 }
    ]
  }
}
```

**Example Timeline Entry**:
```
Prodotto aggiunto
da Cameriere - Luca Verdi
Aggiunti 2 prodotti (Batch #2)
[Dettagli modifiche]
  - Pizza Margherita x1
  - Coca Cola x2
26 Ott 2025, 20:50
```

---

### 6. Product Removal

**Action**: `item_removed`
**Status**: N/A (no status change)
**Triggered by**: `removeProductFromOrder()`
**Metadata**:
```javascript
{
  notes: 'Rimosso: Pizza Margherita (x1)',
  changes: {
    batch_number: 1,
    product_name: 'Pizza Margherita',
    quantity: 1
  }
}
```

**Example Timeline Entry**:
```
Prodotto rimosso
da Cameriere - Luca Verdi
Rimosso: Pizza Margherita (x1)
26 Ott 2025, 20:52
```

---

## Database Schema

### order_timeline Table

```sql
CREATE TABLE order_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id),
  staff_id UUID REFERENCES staff(id),
  user_id UUID REFERENCES users(id),
  created_by_type TEXT CHECK (created_by_type IN ('staff', 'owner', 'customer', 'system')),
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  changes JSONB,
  notes TEXT,
  staff_name TEXT,           -- Populated by trigger
  staff_role_display TEXT,   -- Populated by trigger (es: "da Admin - Vincenzo Cassese")
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Trigger Automatico

Il trigger `populate_timeline_staff_info()` popola automaticamente:
- `staff_name`: Nome dello staff member
- `staff_role_display`: Ruolo + Nome (es: "da Admin - Vincenzo Cassese")

Questo avviene DOPO l'insert, quindi non serve fare query aggiuntive nel codice.

---

## Utilizzo per Analytics

### Query Esempio: Operatore più attivo

```sql
SELECT
  staff_name,
  staff_role_display,
  COUNT(*) as total_actions,
  COUNT(CASE WHEN action = 'confirmed' THEN 1 END) as orders_confirmed,
  COUNT(CASE WHEN action = 'completed' THEN 1 END) as orders_completed,
  COUNT(CASE WHEN action = 'item_added' THEN 1 END) as products_added
FROM order_timeline
WHERE created_by_type IN ('staff', 'owner')
  AND created_at >= '2025-10-01'
  AND created_at < '2025-11-01'
GROUP BY staff_name, staff_role_display
ORDER BY total_actions DESC;
```

### Query Esempio: Tempo medio tra conferma e completamento

```sql
WITH order_timings AS (
  SELECT
    order_id,
    MIN(CASE WHEN action = 'confirmed' THEN created_at END) as confirmed_at,
    MIN(CASE WHEN action = 'completed' THEN created_at END) as completed_at
  FROM order_timeline
  GROUP BY order_id
)
SELECT
  AVG(EXTRACT(EPOCH FROM (completed_at - confirmed_at)) / 60) as avg_minutes
FROM order_timings
WHERE confirmed_at IS NOT NULL
  AND completed_at IS NOT NULL;
```

### Query Esempio: Prodotti più modificati (aggiunti/rimossi)

```sql
SELECT
  changes->>'product_name' as product_name,
  COUNT(*) as modification_count,
  SUM(CASE WHEN action = 'item_added' THEN 1 ELSE 0 END) as times_added,
  SUM(CASE WHEN action = 'item_removed' THEN 1 ELSE 0 END) as times_removed
FROM order_timeline
WHERE action IN ('item_added', 'item_removed')
  AND changes->>'product_name' IS NOT NULL
GROUP BY changes->>'product_name'
ORDER BY modification_count DESC
LIMIT 20;
```

---

## Prossimi Passi

### Eventi da Aggiungere (Opzionali)

1. **Modifica Note Ordine**
   - Action: `notes_updated`
   - Changes: `{ old_notes, new_notes }`

2. **Cambio Tavolo**
   - Action: `table_changed`
   - Changes: `{ old_table_id, new_table_id, old_room_id, new_room_id }`
   - **Nota**: Già implementato in `ChangeTableModal.jsx`

3. **Modifica Quantità Prodotto**
   - Action: `item_quantity_updated`
   - Changes: `{ product_name, old_qty, new_qty }`

4. **Generazione Preconto**
   - Action: `preconto_generated`
   - Notes: "Preconto richiesto"

### Dashboard Analytics

Con questi dati puoi creare:
- **Staff Performance Dashboard**: Chi lavora di più, chi conferma più ordini, ecc.
- **Order Flow Analysis**: Tempo medio per ogni step
- **Product Popularity**: Prodotti più ordinati/rimossi
- **Customer Behavior**: Quanto tempo tra creazione ordine e conferma
- **Peak Hours**: Orari di maggior attività per tipo di azione

---

## Testing

Per verificare che tutto funzioni:

1. **Crea ordine da cliente** → Verifica evento `created` con `createdByType: 'customer'`
2. **Conferma ordine** → Verifica evento `confirmed` con metadata staff
3. **Aggiungi prodotti** → Verifica evento `item_added` con lista prodotti
4. **Rimuovi prodotto** → Verifica evento `item_removed` con dettagli
5. **Completa ordine** → Verifica evento `completed` con numero scontrino
6. **Annulla ordine** → Verifica evento `cancelled`

Query di test:
```sql
SELECT
  action,
  staff_name,
  staff_role_display,
  notes,
  created_at
FROM order_timeline
WHERE order_id = 'ORDER_ID_QUI'
ORDER BY created_at ASC;
```

---

## Note Implementative

- ✅ Tutti gli eventi hanno `await addTimelineEntry()` nei servizi
- ✅ Il trigger database popola automaticamente nome e ruolo staff
- ✅ Analytics events separati (analytics_events table) per metriche business
- ✅ Timeline events per audit trail e compliance
- ⚠️ orderTimeline.js contiene JSX ma ha estensione .js (da rinominare se necessario)

## Risolve

- ❌ "non mi escono i metadati di chi ha confermato" → ✅ RISOLTO con `addTimelineEntry()` in `confirmOrder()`
- ❌ "non mi da la timeline di confermato" → ✅ RISOLTO, ora traccia evento `confirmed`
- ❌ "console errors analytics_events" → ✅ RISOLTO con fix firma `trackEvent()`
- ❌ "restaurant_id undefined" → ✅ RISOLTO, ora passa correttamente nei parametri
