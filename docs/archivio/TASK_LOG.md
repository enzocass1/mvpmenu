# TASK LOG - Sessione Claude Code

**Data ultima modifica**: 26 Ottobre 2025
**Stato progetto**: In sviluppo - Sistema POS/Ordini
**Branch**: main

---

## 🎯 OBIETTIVI COMPLETATI QUESTA SESSIONE

### 1. Fix Step 6 - Modal Aggiungi Prodotti ✅
**File**: `src/components/CreateOrderModal.jsx`

- ✅ Rimossa funzione `loadExistingOrderItems()` - quando aggiungi prodotti, carrello vuoto
- ✅ Sostituita logica `updateExistingOrder()` per usare `ordersService.addProductsToOrder()`
- ✅ UI migliorata:
  - Titolo: "Aggiungi Prodotti a Ordine" (invece di "Modifica Ordine")
  - Info box: "📋 Aggiungi prodotti al **Tavolo X**"
  - Nascosti campi: Sala, Tavolo, Nome Cliente, Priority Order, Note
  - Bottone: "Aggiungi Prodotti"
  - Totale: "Totale Nuovi Prodotti"
- ✅ Validazione corretta per edit mode
- ✅ Alert con batch number: "Prodotti aggiunti come Batch 2!"

### 2. Permessi Sezione Ordini vs Cassa ✅
**File**: `src/components/TableDetailModal.jsx`, `src/pages/OrdersPage.jsx`, `src/pages/OrderDetailPage.jsx`

#### TableDetailModal.jsx (Cassa)
- ✅ Rimosso "Modifica" da ordini PENDING
- ✅ Aggiunto bottone "**Chiudi Tavolo**" per ordini PREPARING
- ✅ Nascosto "Cambia Tavolo" per ordini COMPLETED
- ✅ Nascosto tutte le azioni per ordini COMPLETED
- ✅ Aggiunta funzione `handleCloseTable()` → `ordersService.closeTableWithoutReceipt()`

#### OrdersPage.jsx (Lista Ordini)
- ✅ Impedito selezione ordini COMPLETED (checkbox disabilitato)
- ✅ Impedito eliminazione ordini COMPLETED (alert)
- ✅ Impedito swipe ordini COMPLETED su mobile
- ✅ **Soft delete** invece di hard delete
- ✅ Aggiunto Tab "**Eliminati**" per ordini deleted
- ✅ Query dinamica: carica ordini eliminati solo quando tab "Eliminati" selezionato

#### OrderDetailPage.jsx (Dettaglio Singolo)
- ✅ **"Modifica Ordine"** diventa **"Aggiungi Prodotti"** per ordini PREPARING
- ✅ Nascosto "Cambia Tavolo" per ordini PREPARING, COMPLETED, DELETED
- ✅ Nascosto "Elimina Ordine" per ordini PREPARING, COMPLETED, DELETED
- ✅ Rimosso "Completa Ordine" dalla funzione `getNextAction()`
- ✅ **Soft delete** con timeline event

### 3. ordersService.js - Nuove Funzioni ✅
**File**: `src/lib/ordersService.js`

- ✅ **`closeTableWithoutReceipt(orderId, staffId)`**
  - Chiude tavolo senza generare scontrino
  - Status → 'completed'
  - Registra `closed_at` timestamp
  - Timeline event: 'closed_without_receipt'

- ✅ **`generatePreconto()` - Timestamp aggiornati**
  - Aggiunto campo `preconto_generated_at`
  - Aggiunto evento timeline `preconto_generated`
  - Mantiene metadata `preconto_at` per backward compatibility

### 4. Documentazione Completa ✅

#### README.md
- ✅ Sezione completa "Regole Business - Gestione Ordini"
- ✅ Flusso ordine standard documentato
- ✅ Permessi per sezione Ordini vs Cassa
- ✅ Tabella timestamp obbligatori
- ✅ Architettura ordini e sistema batch

#### PIANO_IMPLEMENTAZIONE_CASSA.md
- ✅ Sezione "REGOLE BUSINESS - PERMESSI SEZIONE ORDINI vs CASSA"
- ✅ Documentati permessi per ogni stato ordine
- ✅ File implementazione per ogni regola

---

## 📊 REGOLE BUSINESS IMPLEMENTATE

### Sezione ORDINI (`/ordini` e `/ordini/:id`)

| Stato | Azioni Disponibili |
|-------|-------------------|
| **PENDING** | ✅ Visualizza, Modifica, Cambia Tavolo, Elimina, Conferma |
| **PREPARING** | ✅ Visualizza, **Aggiungi Prodotti**<br>❌ NON modifica, NON cambia tavolo, NON elimina, NON completa |
| **COMPLETED** | ✅ Visualizza (sola lettura)<br>❌ Nessuna azione |
| **DELETED** | ✅ Visualizza (sola lettura)<br>❌ Nessuna azione |

### Sezione CASSA (`/cassa`)

| Stato | Azioni Disponibili |
|-------|-------------------|
| **PENDING** | ✅ Conferma, Cambia Tavolo, Elimina |
| **PREPARING** | ✅ **Aggiungi Prodotti**, Preconto, Scontrino, **Chiudi Tavolo**, Cambia Tavolo, Elimina |
| **COMPLETED** | ✅ Visualizza (sola lettura)<br>❌ Nessuna azione |

---

## 🔧 MODIFICHE TECNICHE DETTAGLIATE

### Soft Delete Implementation

**Prima (Hard Delete)**:
```javascript
// Cancellava fisicamente da database
await supabase.from('orders').delete().eq('id', orderId)
await supabase.from('order_items').delete().eq('order_id', orderId)
await supabase.from('analytics_events').delete().eq('order_id', orderId)
```

**Dopo (Soft Delete)**:
```javascript
// Marca come eliminato con timestamp
await supabase.from('orders').update({
  deleted_at: new Date().toISOString(),
  modified_by_staff_id: session?.user?.id
}).eq('id', orderId)

// Timeline event
await supabase.from('order_timeline').insert({
  order_id: orderId,
  action: 'deleted',
  user_id: session?.user?.id,
  created_by_type: 'owner'
})
```

### Tab Eliminati - Query Dinamica

```javascript
// useEffect ricarica quando cambia activeFilter
useEffect(() => {
  if (session) loadData()
}, [session, activeFilter])

// Query condizionale
if (activeFilter === 'deleted') {
  query = query.not('deleted_at', 'is', null)  // Solo deleted
} else {
  query = query.is('deleted_at', null)  // Escludi deleted
}
```

### Batch System - addProductsToOrder

```javascript
// Calcola automaticamente batch_number
const result = await ordersService.addProductsToOrder(
  orderId,
  items,
  staffId
)

// Mostra batch number
alert(`Prodotti aggiunti come Batch ${result.batchNumber}!`)
```

---

## 🗂️ FILE MODIFICATI QUESTA SESSIONE

| File | Modifiche | Righe Modificate |
|------|----------|------------------|
| `CreateOrderModal.jsx` | Step 6 - Aggiungi prodotti con batch | ~150 |
| `TableDetailModal.jsx` | Permessi cassa + Chiudi Tavolo | ~80 |
| `OrdersPage.jsx` | Soft delete + Tab Eliminati | ~100 |
| `OrderDetailPage.jsx` | Permessi ordini + Soft delete | ~60 |
| `ordersService.js` | closeTableWithoutReceipt + timestamp preconto | ~50 |
| `README.md` | Documentazione completa regole business | ~150 |
| `PIANO_IMPLEMENTAZIONE_CASSA.md` | Sezione permessi | ~40 |

---

## ⚠️ PROBLEMI NOTI DA RISOLVERE

### 1. Timeline NON traccia correttamente staff/user
**Problema**: Gli eventi timeline non registrano correttamente `staff_name` e `staff_role_display`

**Causa**:
- Non viene passato `staffSession` con info complete
- Trigger database potrebbe non funzionare correttamente
- `staff_id` e `user_id` spesso null

**Fix Necessario**:
```javascript
// Passare staffSession completo a tutte le funzioni ordersService
const staffSession = {
  staff_id: staffData?.id || null,
  user_id: session?.user?.id || null,
  name: staffData?.name || ownerName,
  role: staffData?.role || 'owner',
  isOwner: !staffData
}

// Aggiornare tutte le chiamate
await ordersService.confirmOrder(orderId, staffSession.staff_id)
await ordersService.addProductsToOrder(orderId, items, staffSession.staff_id)
```

**File da modificare**:
- `CassaPage.jsx` - Passare staffSession a tutte le funzioni
- `OrderDetailPage.jsx` - Idem
- `ordersService.js` - Verificare tutti i `addTimelineEntry()` calls

---

## 📝 TODO PROSSIMA SESSIONE

### Alta Priorità

1. **Fix Timeline Tracking** 🔴
   - [ ] Passare `staffSession` completo a tutte le funzioni ordersService
   - [ ] Verificare trigger database `order_timeline_populate_user_info`
   - [ ] Testare che tutti gli eventi registrino correttamente staff/user

2. **Test Completo Soft Delete** 🟡
   - [ ] Testare eliminazione singola
   - [ ] Testare eliminazione multipla
   - [ ] Verificare tab "Eliminati" carichi correttamente
   - [ ] Testare che ordini deleted non possano essere modificati

3. **Test Step 6 - Aggiungi Prodotti** 🟡
   - [ ] Testare aggiunta prodotti a ordine pending
   - [ ] Testare aggiunta prodotti a ordine preparing
   - [ ] Verificare che batch_number sia corretto
   - [ ] Verificare che total_amount venga aggiornato

### Media Priorità

4. **Chiudi Tavolo senza Scontrino** 🟢
   - [ ] Testare funzione closeTableWithoutReceipt
   - [ ] Verificare che registri closed_at
   - [ ] Verificare timeline event

5. **Preconto Timestamp** 🟢
   - [ ] Verificare che preconto_generated_at venga salvato
   - [ ] Testare che timeline event funzioni

### Bassa Priorità

6. **Ottimizzazioni UI** 🔵
   - [ ] Aggiungere loading states
   - [ ] Migliorare error handling
   - [ ] Aggiungere tooltips

---

## 🚀 COME RIPRENDERE IL LAVORO

### Quick Start

```bash
# 1. Avvia dev server
npm run dev

# 2. Apri browser
http://localhost:5173

# 3. Testa funzionalità principali
# - Vai su /cassa → Crea ordine tavolo
# - Conferma ordine (pending → preparing)
# - Clicca "Aggiungi Prodotti" → Verifica batch 2
# - Prova "Chiudi Tavolo"
# - Vai su /ordini → Verifica tab "Eliminati"
```

### Priority Fix: Timeline Tracking

**File da modificare**: `src/pages/CassaPage.jsx`

Cerca tutte le chiamate a `ordersService.*` e passa `staffSession`:

```javascript
// PRIMA
await ordersService.confirmOrder(order.id, null)

// DOPO
const staffSession = {
  staff_id: staff?.id || null,
  user_id: session?.user?.id || null,
  name: staff?.name || `${restaurant.owner_first_name} ${restaurant.owner_last_name}`,
  role: staff?.role || 'admin',
  isOwner: !staff
}

await ordersService.confirmOrder(order.id, staffSession.staff_id)
```

---

## 📚 RIFERIMENTI UTILI

### Documentazione
- [README.md](./README.md) - Overview progetto
- [PIANO_IMPLEMENTAZIONE_CASSA.md](./PIANO_IMPLEMENTAZIONE_CASSA.md) - Piano implementazione POS

### File Chiave
- `src/lib/ordersService.js` - Logica ordini (1058 righe)
- `src/utils/analytics.js` - Analytics (1393 righe)
- `src/pages/CassaPage.jsx` - Sistema POS
- `src/pages/OrdersPage.jsx` - Lista ordini
- `src/components/TableDetailModal.jsx` - Dettaglio ordine cassa

### Database Schema
- Tabella `orders` - Campo `deleted_at` per soft delete
- Tabella `order_timeline` - Eventi tracciati
- Trigger `order_timeline_populate_user_info` - Auto-popola staff info

---

## ✅ CHECKLIST PRE-DEPLOY

Quando tutto è pronto per deploy:

- [ ] Tutti i test passano
- [ ] Timeline tracking funziona correttamente
- [ ] Soft delete testato (singolo e multiplo)
- [ ] Tab "Eliminati" funziona
- [ ] Step 6 "Aggiungi Prodotti" funziona con batch
- [ ] Bottone "Chiudi Tavolo" funziona
- [ ] README.md aggiornato
- [ ] Nessun console.log in produzione
- [ ] Build compila senza warning
- [ ] Test su mobile responsive

---

**Fine Task Log - Sessione 26 Ottobre 2025**
