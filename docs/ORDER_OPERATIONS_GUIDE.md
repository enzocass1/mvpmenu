# Order Operations Guide
**Sistema Centralizzato per Gestione Ordini**

**Last Updated**: 27 Ottobre 2025
**Status**: ✅ Production Ready (Preparato per Sistema Ruoli Futuro)

---

## 📚 Table of Contents

1. [Panoramica](#panoramica)
2. [Stati Ordine](#stati-ordine)
3. [Occupazione Tavoli](#occupazione-tavoli)
4. [Operazioni Centralizzate](#operazioni-centralizzate)
5. [Punti di Accesso](#punti-di-accesso)
6. [Sistema Ruoli Futuro](#sistema-ruoli-futuro)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## 📖 Panoramica

**orderOperations.js** è il servizio centralizzato che gestisce TUTTE le operazioni sugli ordini nel sistema MVP Menu.

### Problema Risolto

Prima di questo servizio, la logica era duplicata in più componenti:
- ❌ OrdersPage.jsx aveva la sua logica di eliminazione
- ❌ OrderDetailPage.jsx aveva una logica diversa
- ❌ Cart.jsx aveva una logica diversa per occupazione tavoli
- ❌ Risultato: **Inconsistenze, bug e errori 409**

### Soluzione

✅ **Fonte Unica di Verità** per:
- Soft delete ordini (singolo e bulk)
- Timeline events
- Occupazione tavoli
- Validazione staff_id vs proprietario

---

## 🔄 Stati Ordine

### Stati Disponibili

```javascript
export const ORDER_STATUS = {
  PENDING: 'pending',         // Nuovo ordine, non ancora confermato
  CONFIRMED: 'confirmed',     // Confermato dallo staff (deprecato, usa preparing)
  PREPARING: 'preparing',     // In preparazione in cucina
  READY: 'ready',             // Pronto per essere servito
  COMPLETED: 'completed',     // Completato e pagato
  CANCELLED: 'cancelled',     // Annullato
}
```

### Transizioni di Stato

```
┌─────────┐
│ PENDING │──────────────┐
└────┬────┘              │
     │                   │
     │ conferma          │ annulla
     ▼                   ▼
┌───────────┐      ┌───────────┐
│ PREPARING │      │ CANCELLED │
└─────┬─────┘      └───────────┘
      │
      │ completa
      ▼
┌───────────┐      ┌───────────┐
│   READY   │      │ COMPLETED │
└─────┬─────┘      └───────────┘
      │
      │ serve
      ▼
┌───────────┐
│ COMPLETED │
└───────────┘
```

### Stati che Occupano Tavolo

```javascript
export const OCCUPIED_STATUSES = ['pending', 'confirmed', 'preparing']
```

Un tavolo è considerato **OCCUPATO** se ha almeno un ordine con:
- `status IN ('pending', 'confirmed', 'preparing')`
- `deleted_at IS NULL`

### Stati Finali (Tavolo Libero)

```javascript
export const FINAL_STATUSES = ['completed', 'cancelled']
```

---

## 🪑 Occupazione Tavoli

### Logica Centralizzata

```javascript
import { getOccupiedTables, isTableOccupied } from '../lib/orderOperations'

// Ottieni TUTTI i tavoli occupati per un ristorante
const occupiedTables = await getOccupiedTables(restaurantId)
// Returns: [{table_id, table_number, room_id}, ...]

// Controlla se un tavolo SPECIFICO è occupato
const isOccupied = await isTableOccupied(restaurantId, tableNumber, roomId)
// Returns: boolean
```

### Query Interna

```sql
SELECT table_id, table_number, room_id
FROM orders
WHERE restaurant_id = $1
  AND status IN ('pending', 'confirmed', 'preparing')
  AND deleted_at IS NULL  -- CRITICAL: Filtra soft-deleted
```

**CRITICAL**: Il filtro `deleted_at IS NULL` è **ESSENZIALE** per evitare che ordini eliminati mantengano i tavoli occupati.

---

## 🛠️ Operazioni Centralizzate

### 1. Soft Delete Singolo Ordine

```javascript
import { softDeleteOrder } from '../lib/orderOperations'

const deleteOrder = async () => {
  const result = await softDeleteOrder(orderId, session, restaurant)

  if (!result.success) {
    console.error('Errore:', result.error)
    alert(result.error)
    return
  }

  // Successo!
  console.log('Ordine eliminato:', result.data)
  navigate('/ordini')
}
```

**Parametri**:
- `orderId` (string) - UUID dell'ordine
- `session` (object) - Sessione auth (contiene user.id)
- `restaurant` (object) - Dati ristorante (contiene user_id per confronto)

**Returns**:
```javascript
{
  success: true,
  data: { /* order record */ }
}
// oppure
{
  success: false,
  error: "Messaggio errore"
}
```

### 2. Soft Delete Bulk (Multipli Ordini)

```javascript
import { softDeleteOrders } from '../lib/orderOperations'

const deleteMultiple = async (orderIds) => {
  const result = await softDeleteOrders(orderIds, session, restaurant)

  if (!result.success) {
    console.error('Errore:', result.error)
    return
  }

  // Successo!
  console.log(`${result.data.length} ordini eliminati`)
}
```

**Parametri**:
- `orderIds` (string[]) - Array di UUID ordini
- `session` (object) - Sessione auth
- `restaurant` (object) - Dati ristorante

**Returns**:
```javascript
{
  success: true,
  data: [/* array of order records */]
}
```

### 3. Timeline Event (usato internamente)

```javascript
import { addOrderTimelineEvent } from '../lib/orderOperations'

const result = await addOrderTimelineEvent({
  orderId: 'uuid-ordine',
  action: 'cancelled',  // Must be in CHECK constraint
  session: session,
  restaurant: restaurant,
  changes: {
    soft_delete: true,
    reason: 'Annullato dal proprietario'
  },
  previousStatus: 'pending',
  newStatus: 'deleted'
})
```

**Actions Valide** (da CHECK constraint):
- `created`
- `confirmed`
- `preparing`
- `completed`
- `cancelled` ← **Usato per soft delete**
- `updated`
- `item_added`
- `item_removed`
- `item_updated`

---

## 📍 Punti di Accesso

### Dove Si Eliminano Ordini

1. **OrdersPage.jsx** - Lista ordini (bulk delete)
   - Usa: `softDeleteOrders()`
   - Path: `/ordini`
   - Azione: Seleziona multipli ordini → Elimina

2. **OrderDetailPage.jsx** - Dettaglio ordine singolo
   - Usa: `softDeleteOrder()`
   - Path: `/ordini/:orderId`
   - Azione: Click "Elimina Ordine"

3. **TableDetailModal.jsx** - Gestione tavolo (TODO)
   - Usa: `softDeleteOrder()`
   - Path: Modal da `/cassa`
   - Azione: Chiudi tavolo → Elimina ordine

### Dove Si Controlla Occupazione

1. **Cart.jsx** - Slidecart menu pubblico QR
   - Usa: `getOccupiedTables()`
   - Path: Componente nel PublicMenu
   - Azione: Mostra dropdown tavoli, marca "Occupato"

2. **CassaPage.jsx** - Dashboard tavoli
   - Usa: Logica diretta con `v_active_orders`
   - Path: `/cassa`
   - Azione: Colora tavoli occupati, mostra ordini

3. **CreateOrderModal.jsx** - Creazione ordine staff
   - Usa: Logica simile a Cart (TODO: refactor)
   - Path: Modal da `/cassa`
   - Azione: Selezione tavolo per nuovo ordine

---

## ✅ Best Practices

### DO ✅

1. **Usa SEMPRE il servizio centralizzato** per eliminare ordini
   ```javascript
   import { softDeleteOrder, softDeleteOrders } from '../lib/orderOperations'
   ```

2. **Passa SEMPRE `session` e `restaurant`** alle funzioni
   ```javascript
   await softDeleteOrder(orderId, session, restaurant)
   ```

3. **Controlla SEMPRE il risultato** prima di continuare
   ```javascript
   const result = await softDeleteOrder(...)
   if (!result.success) {
     alert(result.error)
     return
   }
   ```

4. **Usa `getOccupiedTables()`** per logica occupazione tavoli
   ```javascript
   const occupied = await getOccupiedTables(restaurantId)
   ```

### DON'T ❌

1. **NON usare direttamente** `supabase.from('orders').update()`
   ```javascript
   // ❌ SBAGLIATO
   await supabase.from('orders').update({
     deleted_at: new Date().toISOString(),
     modified_by_staff_id: session.user.id  // FK CONSTRAINT ERROR!
   })
   ```

2. **NON assumere** che `session.user.id` sia valido per `modified_by_staff_id`
   ```javascript
   // ❌ SBAGLIATO - Il proprietario non è in restaurant_staff
   modified_by_staff_id: session.user.id
   ```

3. **NON dimenticare** `deleted_at IS NULL` nelle query
   ```javascript
   // ❌ SBAGLIATO
   .in('status', ['pending', 'preparing'])
   // ✅ CORRETTO
   .in('status', ['pending', 'preparing'])
   .is('deleted_at', null)
   ```

4. **NON creare** logica di eliminazione custom
   ```javascript
   // ❌ SBAGLIATO - Duplicazione logica
   const myDeleteFunction = async () => {
     // ... custom delete logic
   }
   ```

---

## 🔧 Troubleshooting

### Errore 409: Foreign Key Constraint

**Errore**:
```
insert or update on table "orders" violates foreign key constraint "orders_modified_by_staff_id_fkey"
Key is not present in table "restaurant_staff".
```

**Causa**: Si sta usando `session.user.id` (proprietario) per `modified_by_staff_id`, ma il proprietario NON è in `restaurant_staff`.

**Soluzione**: Usa il servizio centralizzato che gestisce automaticamente:
```javascript
await softDeleteOrder(orderId, session, restaurant)
// Internally uses: modified_by_staff_id: null (for owner)
```

---

### Errore 400: Column Does Not Exist

**Errore**:
```
POST /rest/v1/order_timeline 400 (Bad Request)
column "user_id" does not exist
```

**Causa**: Si sta cercando di inserire colonne che non esistono in `order_timeline`.

**Colonne ESISTENTI**:
- `id`, `order_id`, `staff_id`, `staff_name`, `action`, `previous_status`, `new_status`, `changes`, `notes`, `created_at`

**Colonne NON ESISTENTI**:
- ❌ `user_id`
- ❌ `created_by_type`

**Soluzione**: Usa `addOrderTimelineEvent()` che usa solo colonne esistenti.

---

### Tavoli Rimangono Occupati Dopo Eliminazione

**Sintomo**: Elimino un ordine ma il tavolo rimane mostrato come "Occupato" nel QR menu.

**Causa**: La query per occupazione tavoli NON filtra per `deleted_at IS NULL`.

**Soluzione**: Usa `getOccupiedTables()` che filtra automaticamente:
```javascript
// ❌ SBAGLIATO
const { data } = await supabase.from('orders')
  .select('table_number, room_id')
  .in('status', ['pending', 'preparing'])

// ✅ CORRETTO
const occupied = await getOccupiedTables(restaurantId)
```

---

### Ordini Confermati Mostrati Come Disponibili

**Sintomo**: Ordine ha status `confirmed` ma tavolo mostrato come disponibile.

**Causa**: La query occupa

zione non include `confirmed` negli stati.

**Soluzione**: `getOccupiedTables()` include automaticamente `confirmed`:
```javascript
.in('status', ['pending', 'confirmed', 'preparing'])
```

---

## 📊 Statistiche

### Files Refactored

1. ✅ `src/lib/orderOperations.js` - Servizio creato (nuovo)
2. ✅ `src/pages/OrderDetailPage.jsx` - Refactored per usare servizio
3. ✅ `src/pages/OrdersPage.jsx` - Refactored per usare servizio
4. ✅ `src/components/Cart.jsx` - Refactored per usare `getOccupiedTables()`

### Funzioni Centralizzate

- `softDeleteOrder()` - Elimina singolo ordine
- `softDeleteOrders()` - Elimina multipli ordini (bulk)
- `getOccupiedTables()` - Ottieni tavoli occupati
- `isTableOccupied()` - Controlla se tavolo specifico è occupato
- `addOrderTimelineEvent()` - Aggiungi evento timeline
- `getStaffIdForModification()` - Helper per validare staff_id
- `getOperatorName()` - Helper per nome operatore

### Punti di Eliminazione

- 2 files usano `softDeleteOrder()` (singolo)
- 1 file usa `softDeleteOrders()` (bulk)
- 1 file usa `getOccupiedTables()` (occupazione)

---

## 🚀 Next Steps (TODO)

1. ⏳ **Refactor ordersService.js**
   - Fix tutti gli usi di `modified_by_staff_id`
   - Usa helper `getStaffIdForModification()`

2. ⏳ **Refactor TableDetailModal.jsx**
   - Usa `softDeleteOrder()` per eliminazione
   - Usa `getOccupiedTables()` per stato

3. ⏳ **Refactor CreateOrderModal.jsx**
   - Usa `getOccupiedTables()` per selezione tavolo

4. ⏳ **Testing Completo**
   - Test eliminazione da tutti i punti
   - Test occupazione tavoli da QR e dashboard
   - Test con proprietario e staff

5. ⏳ **Monitoraggio**
   - Aggiungi metriche per tracking eliminazioni
   - Log centralized per debugging

---

**Created**: 27 Ottobre 2025
**Author**: Claude (Anthropic)
**Version**: 1.0.0

---

## 🔐 Sistema Ruoli Futuro

### Preparazione per Sistema Permessi

Il sistema è stato progettato per supportare facilmente un futuro sistema di ruoli e permessi.

**Status Attuale**: ✅ **Pronto per Ruoli**

Tutte le funzioni accettano già parametri per identificare l'utente:
- `session` - Sessione auth con user.id
- `restaurant` - Dati ristorante per confronto owner
- `staffId` - NULL per proprietario, UUID per staff

### Architettura Attuale

```javascript
// orderOperations.js - Già preparato
const getStaffIdForModification = (session, restaurant) => {
  // Proprietario → NULL
  if (session.user?.id === restaurant.user_id) {
    return null
  }
  // Staff → staff_id (FUTURO: da sessione staff)
  return null
}
```

### Dove Aggiungere Controlli Permessi

Quando il sistema ruoli sarà implementato, aggiungere controlli in questi punti:

```javascript
// 1. orderOperations.js
export const softDeleteOrder = async (orderId, session, restaurant) => {
  // TODO: Aggiungi check permesso
  // const canDelete = await hasPermission(session, 'orders.delete')
  // if (!canDelete) return { success: false, error: 'Permesso negato' }
  
  // ... resto logica
}

// 2. ordersService.js
export const confirmOrder = async (orderId, staffId) => {
  // TODO: Aggiungi check permesso
  // const canConfirm = await hasPermission(staffSession, 'orders.confirm')
  
  // ... resto logica
}

// 3. OrderDetailPage.jsx
const updateOrderStatus = async (newStatus) => {
  // TODO: Aggiungi check UI
  // if (!canModifyOrder) {
  //   alert('Non hai i permessi per modificare questo ordine')
  //   return
  // }
  
  // ... resto logica
}
```

### Placeholder nel Codice

Cerca questi commenti per trovare punti di integrazione:

```bash
# Trova tutti i TODO relativi a ruoli
grep -r "TODO.*ruoli\|TODO.*permission\|TODO.*staff_id" src/
```

Risultati tipici:
- `OrderDetailPage.jsx:150` - TODO ruoli per update status
- `ordersService.js:588` - TODO check permission per modify

### Documentazione Completa

Per l'architettura completa del sistema ruoli futuro, vedi:
**[docs/FUTURE_ROLES_SYSTEM.md](./FUTURE_ROLES_SYSTEM.md)**

Include:
- 5 Ruoli pianificati (Owner, Manager, Waiter, Kitchen, Cashier)
- Matrice permessi completa
- Schema database
- Piano di implementazione
- Migration path

### Benefici Architettura Attuale

✅ **Zero Refactoring Necessario**
- Tutte le funzioni già accettano parametri giusti
- Logica centralizzata in un unico punto
- Facile aggiungere wrapper con controlli permessi

✅ **Backward Compatible**
- Funziona ora senza ruoli (tutti = proprietario)
- Funzionerà dopo con ruoli attivati
- Nessun breaking change per codice esistente

✅ **Future-Proof**
- Struttura dati già supporta staff_id
- Timeline tracking già registra chi ha fatto cosa
- Database schema pronto per estensione

---

