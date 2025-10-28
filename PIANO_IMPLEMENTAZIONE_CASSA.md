# PIANO IMPLEMENTAZIONE SISTEMA CASSA - Step by Step

## Status: IN CORSO

### ✅ STEP 1: FONDAMENTA (COMPLETATO)
**Commit**: `53c3bde`

- ✅ Creato `src/lib/ordersService.js` con 25+ funzioni
- ✅ Creato `src/styles/cassa-animations.css` con animazioni
- ✅ Aggiornato state CassaPage.jsx
- ✅ Import ordersService e analytics

**TEST**: Compilazione OK, nessun errore

---

### ✅ STEP 2: CARICAMENTO DATI CON NUOVO SISTEMA (COMPLETATO)
**File**: `src/pages/CassaPage.jsx`

**Modifiche**:
1. ✅ Aggiunta funzione `loadActiveOrders()` che usa `ordersService.getActiveOrders()`
2. ✅ Aggiunta funzione `loadPendingCount()` che usa `ordersService.getPendingOrdersCount()`
3. ✅ Chiamate entrambe da `loadData()`
4. ✅ Aggiunto `useEffect` con interval per aggiornare ogni 30 secondi

**TEST**: ✅ activeOrders e pendingCount vengono caricati correttamente

---

### ✅ STEP 3: BADGE NOTIFICHE TAB "AL TAVOLO" (COMPLETATO)
**File**: `src/pages/CassaPage.jsx`

**Modifiche**:
1. ✅ Modificato il pulsante "Al Tavolo" per mostrare badge con `pendingCount`
2. ✅ Applicata classe `badge-pulse` se pendingCount > 0

**TEST**: ✅ Badge appare quando ci sono ordini pending

---

### ✅ STEP 4: GRIGLIA TAVOLI CON NUOVI STATI (COMPLETATO)
**File**: `src/pages/CassaPage.jsx`

**Modifiche**:
1. ✅ Calcolato stato per ogni tavolo usando activeOrders:
   - `pending` → giallo (classe `table-status-pending`)
   - `preparing` → verde + heartbeat (classe `table-status-active table-active`)
   - `completed` o nessun ordine → grigio (classe `table-status-closed`)
2. ✅ Mostrata icona "+" se tavolo ha prodotti non confermati (`has_pending_items`)
3. ✅ Mostrato timer real-time con `ordersService.formatElapsedTime()`

**TEST**: ✅ Verificato che:
- Tavoli pending siano gialli
- Tavoli attivi siano verdi e "pulsino"
- Tavoli chiusi siano grigi
- Timer si aggiorni (tramite auto-refresh ogni 30sec)

---

### ✅ STEP 5: POPUP DETTAGLIO TAVOLO (COMPLETATO)
**File**: `src/pages/CassaPage.jsx`, `src/components/TableDetailModal.jsx`

**Modifiche**:
1. ✅ Modificato `handleTableClick` per caricare ordine completo con `ordersService.getOrderWithItems()`
2. ✅ Integrato componente `TableDetailModal` (già creato nello Step 1):
   - Header: Numero tavolo, sala, status, timer
   - Body: Lista prodotti raggruppati per batch con separatori
   - Footer: Azioni (Conferma, Aggiungi Prodotti, Preconto, Scontrino, Elimina)
3. ✅ Mostrato checkbox preparato per ogni prodotto
4. ✅ Mostrato priority order se presente
5. ✅ Calcolato e mostrato totale (items + priority)

**TEST**: ✅ Verificato che:
- Cliccando su tavolo si apra popup
- Prodotti siano raggruppati per batch
- Azioni corrette per stato ordine
- Modal si integri correttamente

---

### 🔄 STEP 6: MODAL AGGIUNGI PRODOTTI A TAVOLO
**File**: `src/pages/CassaPage.jsx`

**Modifiche**:
1. Riutilizzare logica seleziona prodotti (già esistente)
2. Modificare submit per chiamare `ordersService.addProductsToOrder()` con batch number
3. Mostrare quale batch sta per creare (es. "Batch 2")

**TEST**: Verificare che:
- Modal permetta di selezionare prodotti
- Prodotti vengano aggiunti con batch corretto
- Popup si aggiorni mostrando nuovo batch

---

### 🔄 STEP 7: AZIONI ORDINE (Conferma/Preconto/Scontrino/Elimina)
**File**: `src/pages/CassaPage.jsx`

**Modifiche**:
1. Implementare `handleConfirmOrder()` → `ordersService.confirmOrder()`
2. Implementare `handlePreconto()` → `ordersService.generatePreconto()` + stampa HTML
3. Implementare `handleScontrino()` → `ordersService.generateScontrino()` + stampa HTML
4. Implementare `handleDeleteOrder()` → `ordersService.deleteOrder()`
5. Creare template HTML per stampa preconto/scontrino

**TEST**: Verificare che:
- Conferma passi ordine da pending a preparing
- Preconto generi stampa ma non chiuda tavolo
- Scontrino generi stampa e chiuda tavolo
- Elimina rimuova ordine (soft delete)

---

### 🔄 STEP 8: SEZIONE ORDINI (STORICO)
**File**: `src/pages/CassaPage.jsx`

**Modifiche**:
1. Aggiungere tab "ORDINI" nel mode toggle
2. Creare UI con:
   - Sub-tab: TUTTI | AL BANCO | AL TAVOLO | ELIMINATI
   - Filtri: IN ATTESA | ATTIVO | CHIUSO (per tavolo)
   - Filtri data: Oggi | Ieri | 7gg | 30gg | Personalizzato
   - Ricerca per numero ordine / nome cliente
3. Caricare ordini con `ordersService.getOrders()` con filtri
4. Mostrare lista ordini con dettagli

**TEST**: Verificare che:
- Tab funzioni correttamente
- Filtri funzionino
- Ricerca funzioni
- Ordini si carichino correttamente

---

### ✅ STEP 9: AL BANCO - INTEGRAZIONE NUOVO SISTEMA (COMPLETATO)
**File**: `src/pages/CassaPage.jsx`

**Modifiche**:
1. ✅ Modificato `handleScontrinoFiscale()` per AL BANCO
2. ✅ Chiamato `ordersService.createCounterOrder()` con carrello
3. ✅ Generato scontrino con HTML print (80mm thermal)
4. ✅ Aggiunto receipt number progressivo giornaliero

**TEST**: ✅ Verificato che:
- Ordini al banco vengano creati correttamente
- Scontrino venga generato con numero progressivo

---

### 🔄 STEP 10: ANALYTICS EVENTI
**File**: `src/pages/CassaPage.jsx`, `src/utils/analytics.js`

**Modifiche**:
1. Trackare eventi usando `trackEvent()`:
   - `table_order_pending` quando cliente ordina
   - `table_order_confirmed` quando staff conferma
   - `table_products_added` quando si aggiungono prodotti
   - `table_preconto` quando si genera preconto
   - `table_closed` quando si chiude tavolo
   - `counter_order_completed` quando ordine banco completato
2. Aggiornare constraint analytics_events per nuovi eventi

**TEST**: Verificare che eventi vengano trackati in analytics_events

---

### 🔄 STEP 11: OTTIMIZZAZIONI E POLISH
**File**: Vari

**Modifiche**:
1. Aggiungere loading states
2. Aggiungere error handling
3. Aggiungere conferme per azioni critiche (elimina)
4. Ottimizzare re-render
5. Aggiungere tooltip/help text
6. Test mobile responsive

**TEST**: Test completo end-to-end

---

### 🔄 STEP 12: DOCUMENTAZIONE E CLEANUP
**File**: README

**Modifiche**:
1. Aggiornare README con nuove funzionalità
2. Documentare API ordersService
3. Cleanup console.log
4. Cleanup codice morto

**TEST**: Verifica finale tutto il sistema

---

## TESTING CHECKLIST

### Flusso Tavolo (Cliente)
- [ ] Cliente ordina da menu pubblico
- [ ] Ordine appare come pending (giallo) in cassa
- [ ] Badge notifica appare su tab AL TAVOLO
- [ ] Staff apre popup tavolo
- [ ] Staff conferma ordine → passa a verde + heartbeat
- [ ] Cliente aggiunge prodotti (2° batch)
- [ ] Icona "+" appare sul tavolo
- [ ] Staff conferma nuovo batch
- [ ] Staff genera preconto → stampa, tavolo resta attivo
- [ ] Staff genera scontrino → stampa, tavolo chiude

### Flusso Tavolo (Staff)
- [ ] Staff crea ordine diretto per tavolo
- [ ] Ordine creato subito come attivo (verde)
- [ ] Staff aggiunge prodotti successivamente
- [ ] Staff chiude con scontrino

### Flusso Banco
- [ ] Staff seleziona prodotti
- [ ] Staff genera scontrino
- [ ] Ordine salvato come completed

### Sezione Ordini
- [ ] Filtri funzionano correttamente
- [ ] Ricerca funziona
- [ ] Ordini eliminati appaiono in tab ELIMINATI

### Analytics
- [ ] Eventi vengono trackati correttamente
- [ ] Dati disponibili per dashboard future

---

## NOTE IMPLEMENTAZIONE

### Priority Order
Non implementato nella UI principale (richiede prodotto speciale "Ordine Prioritario").
Funzionalità disponibile in ordersService ma non esposta in UI.

### Stampante Termica
Per ora HTML print → window.print()
Integrazione stampante termica: TODO futuro

### Real-time Updates
Per ora polling ogni 30 secondi.
Supabase Realtime: TODO futuro se necessario

### Varianti Prodotto
Già supportate nel sistema esistente, mantenute compatibili.

---

## REGOLE BUSINESS - PERMESSI SEZIONE ORDINI vs CASSA

### Sezione ORDINI (`/ordini` e `/ordini/:id`)

**Ordini PENDING**
- ✅ Visualizza, Modifica, Cambia Tavolo, Elimina, Conferma
- ✅ Tutti i bottoni disponibili

**Ordini PREPARING**
- ✅ Visualizza (sola lettura)
- ❌ NON può modificare
- ❌ NON può cambiare tavolo
- ❌ NON può eliminare
- ❌ NON può completare (solo Cassa)
- **Implementazione**: OrderDetailPage.jsx - bottoni nascosti per `status === 'preparing'`

**Ordini COMPLETED**
- ✅ Visualizza (sola lettura)
- ❌ Nessuna azione disponibile
- ❌ Checkbox disabilitato in lista
- **Implementazione**: OrdersPage.jsx + OrderDetailPage.jsx

### Sezione CASSA (`/cassa`)

**Tutti gli ordini (pending, preparing)**
- ✅ Tutte le azioni disponibili
- ✅ Può completare ordini (Scontrino, Chiudi Tavolo)
- ✅ Può modificare/eliminare anche ordini preparing
- **Implementazione**: CassaPage.jsx + TableDetailModal.jsx

**Ordini COMPLETED**
- ✅ Visualizza (sola lettura)
- ❌ Nessuna azione disponibile

---

## FINE PIANO
