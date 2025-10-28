# Bug Fix Session - 27 Ottobre 2024

## Riepilogo
Sessione di bug fixing per risolvere 6 problemi critici nel sistema di gestione ordini.

---

## Bug Risolti

### ✅ Bug #1: Error 400 aggiungendo prodotti a ordini in preparazione
**Sintomo**: Errore 400 quando si aggiungono prodotti a un ordine esistente in stato "preparing", sia da Cassa che da Ordini > ID.

**Root Cause**:
```
Errore Supabase PGRST204: "Could not find the 'option_values' column of 'order_items' in the schema cache"
```
La colonna `option_values` non esiste nella tabella `order_items` del database, ma il codice tentava di inserirla.

**Fix Applicata**:
- **File**: `src/lib/ordersService.js` (riga 582)
  - Rimossa riga: `option_values: item.option_values || null`
  - Aggiunto commento esplicativo

- **File**: `src/components/CreateOrderModal.jsx` (riga 578)
  - Rimossa riga: `option_values: p.option_values || null`
  - Aggiunto commento esplicativo

**Impatto**: Fix funziona sia da Cassa che da Ordini > ID grazie alla centralizzazione dei servizi.

---

### ✅ Bug #2: Errore analytics tracking (constraint violation)
**Sintomo**:
```
Errore tracciamento evento: {
  code: '23514',
  message: 'new row for relation "analytics_events" violates check constraint "analytics_events_event_type_check"'
}
```

**Root Cause**: I nomi degli eventi nel codice non corrispondevano ai nomi definiti nel database constraint (`database/migrations/01_analytics_constraint.sql`).

**Disallineamenti**:
- Codice usava: `table_products_added`
- Database richiedeva: `products_added_to_order`
- Codice usava: `table_preconto`
- Database richiedeva: `preconto_generated`

**Fix Applicata**:
- **File**: `src/lib/ordersService.js` (riga 621)
  - Modificato: `'table_products_added'` → `'products_added_to_order'`

- **File**: `src/lib/ordersService.js` (riga 1012)
  - Modificato: `'table_preconto'` → `'preconto_generated'`

- **File**: `src/utils/analytics.js` (righe 28-30)
  - Aggiornate costanti EVENT_TYPES con nomi corretti
  - Aggiunto commento: "Allineati con database constraint"

**Riferimento**: Constraint definito in `database/migrations/01_analytics_constraint.sql` (42 event types totali)

---

### ✅ Bug #3: Button "Conferma Ordine" visibile per ordini eliminati
**Sintomo**: Nella sezione Ordini > ID > Tab Eliminati, gli ordini soft-deleted mostravano ancora il pulsante "Conferma Ordine".

**Root Cause**: La condizione per mostrare il pulsante non verificava se l'ordine era eliminato (`deleted_at !== null`).

**Fix Applicata**:
- **File**: `src/pages/OrderDetailPage.jsx` (riga 658)
  - Prima: `{nextAction && (`
  - Dopo: `{nextAction && !order.deleted_at && (`

**Logica**: Il button ora viene nascosto se:
1. Non c'è azione successiva disponibile, OPPURE
2. L'ordine è stato eliminato (`deleted_at` non è null)

---

### ✅ Bug #4: Timer durata tavolo continua per ordini completati/eliminati
**Sintomo**: Il timer con testo rosso "Durata Tavolo" continuava a contare anche per ordini completati o eliminati.

**Root Cause**: Il `useEffect` che aggiorna il timer ogni secondo non verificava se l'ordine fosse eliminato.

**Fix Applicata**:
- **File**: `src/pages/OrderDetailPage.jsx` (riga 36)
  - Prima: `if (!order || order.status === 'completed') {`
  - Dopo: `if (!order || order.status === 'completed' || order.deleted_at) {`

**Comportamento**:
- Timer si ferma per ordini con status 'completed'
- Timer si ferma per ordini con `deleted_at !== null`
- Timer continua per ordini attivi (pending, confirmed, preparing)

---

### ✅ Bug #5: Tab "Confermati" ridondante in OrdersPage
**Sintomo**: Esistevano due tab per visualizzare ordini confermati:
- Tab "Confermati" (ridondante)
- Tab "In Preparazione" (che include già gli ordini confirmed)

**Motivo**: Gli ordini con status "confirmed" sono già inclusi nel tab "In Preparazione" poiché rappresentano ordini in fase di lavorazione.

**Fix Applicata**:
- **File**: `src/pages/OrdersPage.jsx` (riga 288)
  - Rimossa riga: `{ label: 'Confermati', value: 'confirmed' }`

**Tab finali**:
1. Tutti
2. Attivi
3. In Attesa (pending)
4. In Preparazione (include confirmed + preparing)
5. Completati
6. Eliminati

---

### ✅ Bug #6: Tavoli occupati selezionabili durante creazione ordine
**Sintomo**: Quando si crea un nuovo ordine, il sistema permetteva di selezionare tavoli già occupati da altri ordini attivi.

**Root Cause**: La funzione `loadTables()` non verificava quali tavoli avessero ordini attivi.

**Fix Applicata**:

**1. Verifica ordini attivi** - `src/components/CreateOrderModal.jsx` (righe 132-151)
```javascript
// Load active orders for these tables (only if creating new order, not editing)
if (!existingOrder && tablesData && tablesData.length > 0) {
  const tableIds = tablesData.map(t => t.id)

  const { data: activeOrders, error: ordersError } = await supabase
    .from('orders')
    .select('table_id')
    .in('table_id', tableIds)
    .in('status', ['pending', 'confirmed', 'preparing']) // Active statuses
    .is('deleted_at', null)

  if (!ordersError && activeOrders) {
    const occupiedTableIds = new Set(activeOrders.map(o => o.table_id))

    // Mark tables as occupied
    tablesData.forEach(table => {
      table.is_occupied = occupiedTableIds.has(table.id)
    })
  }
}
```

**2. Disabilita tavoli occupati nel dropdown** - `src/components/CreateOrderModal.jsx` (righe 710-721)
```javascript
<option
  key={table.id}
  value={table.id}
  disabled={table.is_occupied}
  style={{
    color: table.is_occupied ? '#999' : 'inherit',
    fontStyle: table.is_occupied ? 'italic' : 'normal'
  }}
>
  Tavolo {table.number}{table.is_occupied ? ' - OCCUPATO' : ''}
</option>
```

**Comportamento**:
- Tavoli occupati: visibili ma NON selezionabili, testo grigio corsivo con etichetta "- OCCUPATO"
- Tavoli liberi: normalmente selezionabili
- Verifica avviene SOLO in modalità creazione, non in modalità modifica (per permettere di modificare ordini esistenti)

**Stati considerati "occupati"**: `pending`, `confirmed`, `preparing`
**Stati considerati "liberi"**: `completed`, `cancelled`, o ordini soft-deleted

---

## Debug Logging Aggiunto (poi rimosso)

Durante il troubleshooting, sono stati aggiunti log dettagliati per identificare l'errore:

**Logging temporaneo (rimosso dopo fix)**:
- `ordersService.js`: Log dettagliato dei dati inseriti e degli errori Supabase
- `CreateOrderModal.jsx`: JSON stringify dei prodotti inviati

**Motivo rimozione**: Una volta identificata la root cause, i log di debug sono stati rimossi per mantenere pulita la console in produzione.

---

## File Modificati

### File JavaScript/React
1. `src/lib/ordersService.js`
   - Riga 582: Rimosso `option_values`
   - Riga 621: Corretto nome evento analytics
   - Riga 1012: Corretto nome evento analytics

2. `src/components/CreateOrderModal.jsx`
   - Riga 132-151: Aggiunta verifica tavoli occupati
   - Riga 578: Rimosso `option_values`
   - Riga 710-721: Disabilitati tavoli occupati nel dropdown

3. `src/pages/OrderDetailPage.jsx`
   - Riga 36: Timer si ferma per ordini eliminati
   - Riga 658: Nascosto button per ordini eliminati

4. `src/pages/OrdersPage.jsx`
   - Riga 288: Rimosso tab "Confermati"

5. `src/utils/analytics.js`
   - Righe 28-30: Aggiornati EVENT_TYPES con nomi corretti

### File Database (riferimenti)
- `database/migrations/01_analytics_constraint.sql`: Constraint con 42 event types

---

## Test Eseguiti

### ✅ Test #1: Aggiunta prodotti a ordine in preparazione
**Scenario**: Aggiungere prodotti a un ordine esistente in stato "preparing"
**Location**: Cassa e Ordini > ID
**Risultato**: Prodotti aggiunti con successo come Batch #2, nessun errore 400

### ✅ Test #2: Button "Conferma Ordine" per ordini eliminati
**Scenario**: Visualizzare un ordine eliminato
**Location**: Ordini > ID > Tab Eliminati
**Risultato**: Button nascosto correttamente

### ✅ Test #3: Timer per ordini completati/eliminati
**Scenario**: Verificare che il timer si fermi
**Location**: OrderDetailPage
**Risultato**: Timer si ferma per ordini completed e deleted

### ✅ Test #4: Tab "Confermati" rimosso
**Scenario**: Visualizzare la lista tab in OrdersPage
**Location**: Ordini
**Risultato**: Tab non presente, ordini confermati visibili in "In Preparazione"

### ✅ Test #5: Analytics tracking
**Scenario**: Aggiungere prodotti e generare preconto
**Risultato**: Nessun errore constraint violation, eventi tracciati correttamente

### ✅ Test #6: Tavoli occupati
**Scenario**: Creare nuovo ordine e selezionare tavolo
**Location**: CassaPage > Crea Ordine
**Risultato**: Tavoli occupati mostrati come disabilitati con etichetta "- OCCUPATO"

---

## Impatto e Benefici

### Miglioramenti UX
- ✅ Creazione ordini più sicura (impossibile aprire tavolo già occupato)
- ✅ UI più pulita (tab ridondante rimosso)
- ✅ Informazioni accurate (timer si ferma quando dovrebbe)
- ✅ Prevenzione errori utente (button nascosti quando non applicabili)

### Miglioramenti Tecnici
- ✅ Analytics tracking funzionante al 100%
- ✅ Conformità al database schema
- ✅ Codice più manutenibile (nomi eventi standardizzati)
- ✅ Prevenzione race conditions (verifica tavoli occupati)

### Robustezza Sistema
- ✅ Fix centralizzati (funzionano da Cassa e Ordini)
- ✅ Logica consistente in tutto il sistema
- ✅ Meno errori in console
- ✅ Migliore tracciabilità eventi

---

## Note Tecniche

### Sistema di Batch
Il sistema utilizza un meccanismo di **batch numerici** per tracciare aggiunte successive di prodotti:
- Batch #1: Prodotti iniziali dell'ordine
- Batch #2: Prima aggiunta successiva
- Batch #3: Seconda aggiunta successiva
- etc.

Questo permette di:
- Tracciare quando sono stati aggiunti i prodotti
- Gestire la preparazione per lotti
- Mantenere uno storico delle modifiche

### Stati Ordine
Stati considerati "attivi" (tavolo occupato):
- `pending`: In attesa di conferma
- `confirmed`: Confermato dal cliente
- `preparing`: In preparazione

Stati considerati "chiusi" (tavolo libero):
- `completed`: Completato e pagato
- `cancelled`: Annullato
- `deleted_at !== null`: Eliminato (soft delete)

### Centralizzazione Servizi
Tutti i fix sfruttano la centralizzazione in `ordersService.js`, che garantisce:
- Comportamento consistente da Cassa e Ordini
- Single source of truth per operazioni sugli ordini
- Timeline tracking automatico
- Analytics tracking integrato

---

## Prossimi Step Consigliati

### 🔴 Priorità Alta

1. **Testing Completo Pre-Produzione**
   - Test end-to-end di tutti i workflow
   - Verifica performance con carico
   - Test su browser diversi

2. **Validazione Database Schema**
   - Verificare che tutti i campi usati nel codice esistano nel DB
   - Audit delle colonne nullable vs NOT NULL
   - Verifica integrità referenziale

3. **RLS Policies Review**
   - Audit delle policy Supabase per sicurezza
   - Verificare che staff possa solo modificare ordini del proprio ristorante
   - Test con utenti reali (non admin)

### 🟡 Priorità Media

4. **Analytics Dashboard**
   - Creare dashboard per visualizzare eventi tracciati
   - Report su ordini per fascia oraria
   - Analisi prodotti più venduti

5. **Error Handling Migliorato**
   - Gestione errori di rete più robusta
   - Retry automatico per operazioni fallite
   - Notifiche utente più descrittive

6. **Ottimizzazione Performance**
   - Implementare caching per query frequenti (tavoli, sale, prodotti)
   - Ridurre chiamate ridondanti al database
   - Lazy loading per lista ordini

### 🟢 Priorità Bassa

7. **UX Enhancements**
   - Animazioni per transizioni stato ordine
   - Feedback visivo durante salvataggio
   - Shortcuts da tastiera per operazioni frequenti

8. **Documentazione**
   - User manual per staff
   - Video tutorial operazioni base
   - FAQ per problemi comuni

9. **Feature Future**
   - Notifiche push per ordini pronti
   - Integrazione stampante termica
   - Report fiscali automatici

---

## Lessons Learned

1. **Importanza logging dettagliato**: Il JSON stringify dell'errore Supabase ha permesso di identificare immediatamente la root cause

2. **Database schema come source of truth**: Verificare sempre che il codice sia allineato con il database effettivo

3. **Centralizzazione servizi paga**: Un fix in `ordersService.js` risolve il problema sia in Cassa che in Ordini

4. **Test in modalità utente reale**: Alcuni bug emersi solo testando il flusso completo da UI

---

## Metriche

- **Bug risolti**: 6
- **File modificati**: 5
- **Linee di codice modificate**: ~50
- **Tempo sessione**: ~2 ore
- **Test passed**: 6/6 (100%)
- **Breaking changes**: 0
- **Backward compatibility**: Mantenuta

---

## Autori
- Session date: 27 Ottobre 2024
- Fix implementate con Claude Code

---

## Changelog Rapido

```
[27-10-2024]
FIXED: Error 400 inserting order_items (removed option_values column)
FIXED: Analytics constraint violation (aligned event names with DB)
FIXED: "Conferma Ordine" button visible for deleted orders
FIXED: Timer continues for completed/deleted orders
REMOVED: Redundant "Confermati" tab
ADDED: Occupied tables validation in order creation
```
