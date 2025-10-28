# Analytics Implementation - Hotfix Required

**Date**: 27/10/2025
**Priority**: 🔴 HIGH - Blocca il funzionamento del tracking

---

## 🐛 Problemi Identificati

### ✅ RISOLTI (Migration 04)

#### 1. Colonne JSONB Mancanti in `analytics_events` ✅

**Errore**:
```
"Could not find the 'actor' column of 'analytics_events' in the schema cache"
```

**Causa**:
Le colonne JSONB per i "5 Pillars" **non sono mai state aggiunte** alla tabella `analytics_events` nel database di produzione. Il file `richAnalytics.js` cerca di inserire dati in colonne che non esistono.

**Colonne Mancanti**:
- `actor` (JSONB) - CHI: Customer/Staff info
- `order_data` (JSONB) - Order context
- `items` (JSONB) - COSA: Products ordered/prepared
- `money` (JSONB) - QUANTO: Money breakdown
- `timing` (JSONB) - QUANDO: Timestamps and durations
- `flags` (JSONB) - Boolean flags for filtering
- `kpi` (JSONB) - Computed KPI metrics

**Soluzione**:
✅ Eseguire migration **`database/migrations/04_analytics_jsonb_columns.sql`**

---

#### 2. Colonna `table_start` Non Esiste in `rooms` ✅

**Errore**:
```
column rooms.table_start does not exist
```

**Causa**:
Il codice in `Cart.jsx` cerca di ordinare le sale per una colonna `table_start` che non esiste nello schema.

**Soluzione**:
✅ **RISOLTO** - Cambiato `.order('table_start')` in `.order('name')` in Cart.jsx:132

---

### ✅ RISOLTI (Migration 05)

#### 3. Colonna `order_number` Non Esiste in `analytics_events` ✅

**Errore**:
```
"Could not find the 'order_number' column of 'analytics_events' in the schema cache"
```

**Causa**:
Il file `richAnalytics.js` cerca di inserire il campo `order_number` ma la colonna non esiste in `analytics_events`.

**Colonna Mancante**:
- `order_number` (INTEGER) - Numero progressivo ordine

**Soluzione**:
✅ **RISOLTO** - Migration 05 eseguita con successo

---

#### 4. Colonna `restaurant_id` Non Esiste in `tables` ✅

**Errore**:
```
column tables.restaurant_id does not exist
```

**Causa**:
Il codice in `Cart.jsx` cerca di filtrare i tavoli per `restaurant_id`, ma questa colonna potrebbe non esistere nella tabella `tables` (dipende dallo schema esistente).

**Colonna Mancante**:
- `restaurant_id` (UUID) - FK verso restaurants

**Soluzione**:
✅ **RISOLTO** - Migration 05 eseguita con successo (colonna + FK constraint + index creati)

---

## ✅ Azioni da Eseguire

### Step 1: Eseguire Migration 04 su Supabase ✅ FATTO

✅ **COMPLETATO** - Migration 04 eseguita con successo (7 colonne JSONB + 7 GIN indexes)

### Step 2: Verificare Fix in Cart.jsx ✅ FATTO

✅ **COMPLETATO** - Il fix per `.order('name')` è già stato applicato.

### Step 3: Eseguire Migration 05 su Supabase ✅ FATTO

✅ **COMPLETATO** - Migration 05 eseguita con successo:
- `order_number` aggiunto a `analytics_events`
- `restaurant_id` aggiunto a `tables` (con FK e index)
- 2 indexes creati

### Step 4: Refresh Browser e Testare ⏳ PROSSIMO STEP

**IMPORTANTE**: Ora che tutte le migration sono completate, devi fare un **hard refresh** del browser per eliminare la cache dello schema Supabase.

Dopo aver eseguito la migration:

1. Refresh del browser (CTRL+SHIFT+R)
2. Apri il menu pubblico via QR
3. Aggiungi prodotti al carrello
4. Apri il carrello
5. Verifica nella console del browser:
   - ✅ `✅ Traffic source tracked: {...}` (nessun errore)
   - ✅ `✅ Rich event tracked: cart_viewed` (nessun errore)
6. Clicca "Procedi all'Ordine"
7. Verifica nella console:
   - ✅ `✅ Rich event tracked: checkout_started` (nessun errore)
8. Completa l'ordine
9. Verifica nella console:
   - ✅ `✅ Rich event tracked: order_created` (nessun errore)

### Step 4: Verificare Dati nel Database

```sql
-- Verifica eventi salvati
SELECT
  event_type,
  created_at,
  actor->>'type' as actor_type,
  actor->>'customer_name' as customer_name,
  money->>'subtotal' as subtotal,
  money->>'total' as total,
  timing->>'session_duration' as session_duration,
  flags->>'is_first_order' as is_first_order
FROM analytics_events
WHERE event_type IN ('traffic_source_tracked', 'cart_viewed', 'checkout_started', 'order_created')
ORDER BY created_at DESC
LIMIT 10;

-- Verifica clienti anonimi creati
SELECT
  id,
  name,
  is_anonymous,
  is_registered,
  preferences->>'session_id' as session_id,
  created_at
FROM customers
WHERE is_anonymous = true
ORDER BY created_at DESC
LIMIT 5;
```

---

## 📋 Checklist Post-Fix

- [ ] Migration 04 eseguita con successo
- [ ] 7 colonne JSONB aggiunte
- [ ] 7 indexes GIN creati
- [ ] Cart.jsx compila senza errori
- [ ] Nessun errore 400 nella console del browser
- [ ] Eventi `traffic_source_tracked` salvati
- [ ] Eventi `cart_viewed` salvati
- [ ] Eventi `checkout_started` salvati
- [ ] Eventi `order_created` salvati con tutti i 5 pillars
- [ ] Clienti anonimi creati automaticamente
- [ ] Traffic source detection funzionante

---

## 🎯 Risultato Atteso

Dopo il fix:
- ✅ Tracking completo funzionante
- ✅ Nessun errore nella console
- ✅ Tutti gli eventi salvati in `analytics_events`
- ✅ Clienti anonimi creati in `customers`
- ✅ Traffic source detection funzionante (QR, Instagram, organic, etc.)
- ✅ I 5 Pillars (CHI, COSA, QUANDO, DOVE, QUANTO) presenti in ogni evento

---

## 📝 Note

### Perché Questo Errore?

Le colonne JSONB **non erano state incluse** nella migration 03 (`03_customer_features_fixed.sql`). Quella migration aggiungeva solo le colonne base (`customer_id`, `staff_id`, `order_id`, `product_id`) ma non le colonne JSONB per i dati ricchi.

Il file `richAnalytics.js` assume che queste colonne esistano, ma non sono mai state create.

### Lesson Learned

Quando si creano helper functions che inseriscono dati in colonne specifiche, **verificare sempre che le colonne esistano nel database** prima di testare il codice frontend.

In futuro: eseguire `DESCRIBE table_name;` o controllare `information_schema.columns` per verificare lo schema prima di scrivere codice che dipende da colonne specifiche.

---

## 🆘 Se la Migration Fallisce

Se la migration 04 dovesse fallare:

1. Controlla quale colonna già esiste:
   ```sql
   SELECT column_name
   FROM information_schema.columns
   WHERE table_name = 'analytics_events'
     AND column_name IN ('actor', 'order_data', 'items', 'money', 'timing', 'flags', 'kpi');
   ```

2. Esegui manualmente solo le colonne mancanti:
   ```sql
   ALTER TABLE analytics_events ADD COLUMN actor JSONB DEFAULT '{}'::jsonb;
   ALTER TABLE analytics_events ADD COLUMN order_data JSONB DEFAULT '{}'::jsonb;
   ALTER TABLE analytics_events ADD COLUMN items JSONB DEFAULT '[]'::jsonb;
   ALTER TABLE analytics_events ADD COLUMN money JSONB DEFAULT '{}'::jsonb;
   ALTER TABLE analytics_events ADD COLUMN timing JSONB DEFAULT '{}'::jsonb;
   ALTER TABLE analytics_events ADD COLUMN flags JSONB DEFAULT '{}'::jsonb;
   ALTER TABLE analytics_events ADD COLUMN kpi JSONB DEFAULT '{}'::jsonb;
   ```

3. Crea gli indici:
   ```sql
   CREATE INDEX idx_analytics_actor_gin ON analytics_events USING GIN (actor);
   CREATE INDEX idx_analytics_order_data_gin ON analytics_events USING GIN (order_data);
   CREATE INDEX idx_analytics_items_gin ON analytics_events USING GIN (items);
   CREATE INDEX idx_analytics_money_gin ON analytics_events USING GIN (money);
   CREATE INDEX idx_analytics_timing_gin ON analytics_events USING GIN (timing);
   CREATE INDEX idx_analytics_flags_gin ON analytics_events USING GIN (flags);
   CREATE INDEX idx_analytics_kpi_gin ON analytics_events USING GIN (kpi);
   ```

---

**Status**: ✅ **FULLY RESOLVED** - Migration 04 ✅ + Migration 05 ✅
**Next**: Refresh browser and test end-to-end tracking
