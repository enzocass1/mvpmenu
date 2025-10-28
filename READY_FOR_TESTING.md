# ✅ Analytics System - Ready for Testing

**Date**: 27 Ottobre 2025, 08:49
**Status**: 🟢 **ALL SYSTEMS GO** - Pronto per testing completo

---

## 🎉 Cosa è Stato Completato

### Database ✅ 100%

**4 Migration Eseguite con Successo**:
1. ✅ Migration 01: Constraint con 42 event types
2. ✅ Migration 02: Tabella customers (31 colonne)
3. ✅ Migration 03: Features (indexes, triggers, RLS, view, function)
4. ✅ Migration 04: JSONB rich columns (7 colonne + 7 GIN indexes)

**Totale Features Database**:
- 2 tabelle (`customers`, `loyalty_tiers`)
- 22 indexes (performance-optimized)
- 3 triggers (auto-update)
- 3 RLS policies (security)
- 1 view (`customer_analytics`)
- 1 function (`get_or_create_anonymous_customer()`)
- 7 JSONB columns per tracking ricco (5 Pillars)

### Helper Functions ✅ 100%

**3 File Completi**:
- ✅ `src/utils/richAnalytics.js` (950+ lines, 10 track functions)
- ✅ `src/utils/customerUtils.js` (250+ lines, 10 utility functions)
- ✅ `src/hooks/useTrafficSource.js` (170+ lines, auto-detection)

### Frontend Implementation ✅ 80%

**Ordini QR (Public Menu) - COMPLETO**:
- ✅ `src/pages/PublicMenu.jsx` - Traffic source detection
- ✅ `src/components/Cart.jsx` - Complete order tracking
  - ✅ `cart_viewed` event
  - ✅ `cart_item_removed` event
  - ✅ `checkout_started` event
  - ✅ `order_created` event con 5 Pillars completi

**Ordini Staff - TODO**:
- ⏳ `src/components/CreateOrderModal.jsx` - Track staff orders
- ⏳ Staff login/logout tracking
- ⏳ Kitchen item_prepared tracking

### Bug Fixes ✅ 100%

**2 Problemi Critici Risolti**:
1. ✅ Colonne JSONB mancanti → Migration 04 eseguita
2. ✅ Errore `table_start` → Fixed in Cart.jsx:132

---

## 🧪 Come Testare

### Test 1: Traffic Source Detection

1. Apri il menu pubblico con parametri QR:
   ```
   http://localhost:5173/#/public/RESTAURANT_ID?table_id=xxx&table_number=1
   ```

2. Apri la console del browser (F12)

3. Verifica che vedi:
   ```javascript
   ✅ Traffic source tracked: {
     source: "qr",
     medium: "qr",
     table_id: "xxx",
     table_number: "1"
   }
   ```

4. Verifica localStorage:
   ```javascript
   console.log(JSON.parse(localStorage.getItem('traffic_source')))
   // Dovrebbe mostrare: { source: "qr", medium: "qr", ... }
   ```

---

### Test 2: Cart Viewed Event

1. Con il menu pubblico aperto, aggiungi 2-3 prodotti al carrello

2. Clicca sull'icona del carrello per aprirlo

3. Verifica nella console:
   ```javascript
   ✅ Rich event tracked: cart_viewed
   ```

4. Verifica nel database Supabase:
   ```sql
   SELECT
     event_type,
     actor->>'customer_name' as customer,
     metadata->>'items_count' as items,
     created_at
   FROM analytics_events
   WHERE event_type = 'cart_viewed'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

---

### Test 3: Cart Item Removed Event

1. Nel carrello, clicca il pulsante "🗑️" per rimuovere un prodotto

2. Verifica nella console:
   ```javascript
   ✅ Rich event tracked: cart_item_removed
   ```

3. Verifica nel database:
   ```sql
   SELECT
     event_type,
     metadata->>'product_name' as product,
     metadata->>'quantity_removed' as quantity,
     metadata->>'subtotal_removed' as subtotal
   FROM analytics_events
   WHERE event_type = 'cart_item_removed'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

---

### Test 4: Checkout Started Event

1. Nel carrello, clicca "Procedi all'Ordine"

2. Verifica nella console:
   ```javascript
   ✅ Rich event tracked: checkout_started
   ```

3. Verifica nel database:
   ```sql
   SELECT
     event_type,
     money->>'cart_subtotal' as subtotal,
     money->>'cart_total' as total,
     flags->>'has_priority_order' as is_priority,
     timing->>'session_duration' as session_seconds
   FROM analytics_events
   WHERE event_type = 'checkout_started'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

---

### Test 5: Order Created Event (IL PIÙ IMPORTANTE!)

1. Completa l'ordine (seleziona sala, tavolo, conferma)

2. Verifica nella console:
   ```javascript
   ✅ Rich event tracked: order_created
   ```

3. Verifica nel database - **I 5 PILLARS**:
   ```sql
   SELECT
     event_type,
     -- CHI (Who)
     actor->>'type' as actor_type,
     actor->>'customer_name' as customer,
     actor->>'is_anonymous' as is_anonymous,

     -- COSA (What)
     jsonb_array_length(items) as products_count,
     items->0->>'product_name' as first_product,
     items->0->>'quantity' as quantity,

     -- QUANDO (When)
     timing->>'session_duration' as session_seconds,
     timing->>'time_from_qr_scan' as time_from_qr,

     -- DOVE (Where)
     order_data->>'table_number' as table,
     order_data->>'room_name' as room,

     -- QUANTO (How Much)
     money->>'subtotal' as subtotal,
     money->>'priority_fee' as priority_fee,
     money->>'total' as total,

     -- FLAGS
     flags->>'is_first_order' as is_first_order,
     flags->>'is_priority_order' as is_priority,

     created_at
   FROM analytics_events
   WHERE event_type = 'order_created'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

---

### Test 6: Anonymous Customer Creation

1. Verifica che un cliente anonimo sia stato creato:
   ```sql
   SELECT
     id,
     name,
     is_anonymous,
     is_registered,
     total_orders_count,
     lifetime_value,
     preferences->>'session_id' as session_id,
     created_at
   FROM customers
   WHERE is_anonymous = true
   ORDER BY created_at DESC
   LIMIT 5;
   ```

2. Dovrebbe mostrare:
   - `name`: "Cliente Incognito"
   - `is_anonymous`: true
   - `is_registered`: false
   - `session_id`: UUID univoco

---

### Test 7: Traffic Source da Social Media (OPZIONALE)

1. Simula visita da Instagram modificando il referrer:
   ```javascript
   // In console browser, prima di aprire il menu:
   Object.defineProperty(document, 'referrer', {
     value: 'https://www.instagram.com/some-post',
     configurable: true
   });
   ```

2. Poi apri il menu pubblico

3. Verifica che il traffic source sia:
   ```javascript
   {
     source: "social",
     medium: "instagram",
     social_platform: "Instagram",
     referrer: "https://www.instagram.com/some-post"
   }
   ```

---

## ✅ Checklist Test Completo

- [ ] **Traffic source detection**: QR detected correttamente
- [ ] **Cart viewed**: Evento salvato quando carrello aperto
- [ ] **Cart item removed**: Evento salvato quando prodotto rimosso
- [ ] **Checkout started**: Evento salvato quando procede a ordine
- [ ] **Order created**: Evento salvato con TUTTI i 5 Pillars
- [ ] **Anonymous customer**: "Cliente Incognito" creato automaticamente
- [ ] **Session ID**: Session ID salvato in localStorage
- [ ] **JSONB columns**: Tutte le colonne JSONB popolate correttamente
- [ ] **No errors**: Nessun errore 400 o 500 nella console browser
- [ ] **No SQL errors**: Nessun errore Supabase

---

## 🐛 Se Trovi Errori

### Errore: "Could not find column 'actor'"

**Causa**: Migration 04 non eseguita
**Soluzione**: Verifica che la migration 04 sia stata eseguita:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'analytics_events'
  AND column_name IN ('actor', 'items', 'money', 'timing', 'flags', 'kpi');
```
Dovrebbe restituire 7 righe.

---

### Errore: "column rooms.table_start does not exist"

**Causa**: Bug in Cart.jsx (già fixato)
**Soluzione**: Verifica che Cart.jsx:132 usi `.order('name')` invece di `.order('table_start')`

---

### Errore: Funzione trackOrderCreated non trovata

**Causa**: Import mancante
**Soluzione**: Verifica che Cart.jsx abbia:
```javascript
import { trackOrderCreated, trackCartViewed, trackCartItemRemoved, trackCheckoutStarted } from '../utils/richAnalytics'
```

---

### Nessun evento salvato nel database

**Causa Possibile 1**: Supabase RLS policies bloccano insert
**Soluzione**: Verifica policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'analytics_events';
```

**Causa Possibile 2**: Errore silenzioso in tracking
**Soluzione**: Controlla console browser per errori JavaScript

---

## 📊 Query Utili per Verificare Dati

### Ultimi 10 eventi
```sql
SELECT
  event_type,
  actor->>'customer_name' as customer,
  order_data->>'table_number' as table,
  money->>'total' as total,
  created_at
FROM analytics_events
ORDER BY created_at DESC
LIMIT 10;
```

### Conteggio eventi per tipo
```sql
SELECT
  event_type,
  COUNT(*) as total,
  MAX(created_at) as last_event
FROM analytics_events
GROUP BY event_type
ORDER BY total DESC;
```

### Clienti anonimi con ordini
```sql
SELECT
  c.id,
  c.name,
  c.total_orders_count,
  c.lifetime_value,
  c.created_at,
  COUNT(ae.id) as tracked_events
FROM customers c
LEFT JOIN analytics_events ae ON ae.customer_id = c.id
WHERE c.is_anonymous = true
GROUP BY c.id, c.name, c.total_orders_count, c.lifetime_value, c.created_at
ORDER BY c.created_at DESC;
```

### Traffic sources breakdown
```sql
SELECT
  metadata->>'source' as source,
  metadata->>'medium' as medium,
  metadata->>'social_platform' as social_platform,
  COUNT(*) as count
FROM analytics_events
WHERE event_type = 'traffic_source_tracked'
GROUP BY
  metadata->>'source',
  metadata->>'medium',
  metadata->>'social_platform'
ORDER BY count DESC;
```

---

## 🎯 Risultato Atteso

Dopo il test completo dovresti avere:

✅ **4 eventi per ogni ordine QR**:
1. `traffic_source_tracked` (quando apre menu)
2. `cart_viewed` (quando apre carrello)
3. `checkout_started` (quando procede all'ordine)
4. `order_created` (quando conferma ordine)

✅ **1 cliente anonimo** per sessione (cached 24h)

✅ **Tutti i 5 Pillars** in ogni evento `order_created`:
- CHI: Customer info, loyalty tier
- COSA: Products, SKU, variants, categories
- QUANDO: Timestamps, session duration
- DOVE: Table, room, device
- QUANTO: Money breakdown, fees

✅ **Nessun errore** nella console browser

✅ **Performance**: Eventi salvati in < 100ms

---

## 📞 Next Steps

Dopo aver verificato che il tracking QR funziona:

1. **Implementare tracking staff** (CreateOrderModal.jsx)
2. **Implementare staff login/logout** tracking
3. **Implementare item_prepared** tracking in cucina
4. **Creare dashboard analytics** (opzionale)
5. **Implementare customer registration** (opzionale)

---

## 📚 Documentazione Completa

- **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** - Stato implementazione
- **[DATABASE_MIGRATION_LOG.md](./DATABASE_MIGRATION_LOG.md)** - Log migration
- **[HOTFIX_ANALYTICS_ERRORS.md](./HOTFIX_ANALYTICS_ERRORS.md)** - Bug fixes
- **[ANALYTICS_QUICK_REFERENCE.md](./ANALYTICS_QUICK_REFERENCE.md)** - Quick reference
- **[COMPLETE_EVENTS_SCHEMA.md](./COMPLETE_EVENTS_SCHEMA.md)** - Tutti i 42 eventi

---

**Buon Testing!** 🚀

Se tutto funziona correttamente, avrai un sistema analytics **enterprise-grade** tipo Klaviyo per il tuo MVP Menu! 🎉
