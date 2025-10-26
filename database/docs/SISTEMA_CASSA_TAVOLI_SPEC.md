# 📋 SPECIFICHE COMPLETE SISTEMA CASSA E GESTIONE TAVOLI

## 📅 Data Creazione
26 Gennaio 2025

## 🎯 Obiettivo
Implementare un sistema completo di gestione cassa con:
- **Ordini al Banco** (rapidi, immediati)
- **Ordini al Tavolo** (con stati, conferme, portate multiple)
- **Tracking completo** per analytics dettagliate
- **Gestione Staff** con tracciamento azioni
- **Numerazione ordini** progressiva

---

## 📊 FLUSSI OPERATIVI

### 🍽️ ORDINE AL TAVOLO (da Cliente)

```
1. Cliente ordina da SlideCart → Seleziona Sala + Tavolo
   ↓
2. Ordine creato con status = "pending" (ATTESA CONFERMA)
   - Tavolo diventa OCCUPATO
   - Badge notifica su tasto "AL TAVOLO"
   ↓
3. Staff apre popup tavolo:
   - Può CONFERMARE → status = "preparing" (ATTIVO)
   - Può MODIFICARE → aggiunge/rimuove prodotti
   - Può ELIMINARE → status = deleted, tavolo LIBERO
   ↓
4. Se CONFERMA:
   - Tutti prodotti → "preparati" = true
   - Badge notifica sparisce
   - Tavolo ATTIVO (verde lampeggiante)
   ↓
5. Cliente può aggiungere prodotti (portate successive):
   - Nuovo batch_number++
   - Icona "+" appare sul tavolo
   - Prodotti NON preparati (prepared = false)
   ↓
6. Staff conferma aggiunte:
   - Nuovi prodotti → prepared = true
   - Icona "+" rimane (staff può aggiungere ancora)
   ↓
7. Chiusura tavolo:
   - PRECONTO → stampa, tavolo resta ATTIVO
   - SCONTRINO → stampa, tavolo → CHIUSO (bianco)
   - ELIMINA → tavolo → CHIUSO
```

### 🛒 ORDINE AL TAVOLO (da Staff)

```
1. Staff apre "Aggiungi Ordine" → Seleziona Sala + Tavolo
   ↓
2. Ordine creato con status = "preparing" (ATTIVO subito)
   - Tavolo OCCUPATO
   - Prodotti "preparati" = true
   ↓
3. Staff può aggiungere prodotti (richieste cliente)
   - Nuovo batch_number++
   ↓
4. Chiusura tavolo: PRECONTO/SCONTRINO/ELIMINA
```

### 🏪 ORDINE AL BANCO

```
1. Staff clicca "Al Banco"
   ↓
2. Seleziona prodotti (form già esistente)
   ↓
3. Clicca SCONTRINO o PRECONTO
   ↓
4. Ordine salvato come completato
   - order_type = "counter"
   - status = "completed"
```

---

## 🎨 STATI TAVOLO E COLORAZIONI

| Stato | Condizione | Colore | Animazione | Descrizione |
|-------|-----------|--------|------------|-------------|
| **ATTESA CONFERMA** | `status = 'pending'` | Giallo ocra (`warningColor`) | Nessuna | Cliente ha ordinato, staff deve confermare |
| **ATTIVO** | `status = 'preparing'` | Verde (`successColor`) | **Heartbeat continuo** | Tavolo in servizio, può ricevere aggiunte |
| **CHIUSO** | `status = 'completed'` | Grigio chiaro con bordo nero | Nessuna | Tavolo libero, disponibile |

### 🔔 NOTIFICHE

| Tipo | Posizione | Quando appare | Quando sparisce |
|------|-----------|---------------|-----------------|
| **Badge numero** | Alto destra tasto "AL TAVOLO" | Tavoli in `pending` > 0 | Quando tutti confermati/eliminati |
| **Icona "+"** | Alto destra card tavolo | Tavolo attivo con aggiunte NON confermate | Sempre presente (anche dopo conferma) |

---

## 🗄️ SCHEMA DATABASE - MODIFICHE

### 📦 TABELLA `orders` - Campi da aggiungere

```sql
-- Campi nuovi
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(10) DEFAULT 'table' CHECK (order_type IN ('table', 'counter'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number SERIAL NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by_staff_id UUID REFERENCES restaurant_staff(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_by_staff_id UUID REFERENCES restaurant_staff(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS modified_by_staff_id UUID REFERENCES restaurant_staff(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS has_pending_additions BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_priority_order BOOLEAN DEFAULT false;

-- Indici
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_room_id ON orders(room_id);
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(restaurant_id, order_number);

-- Modificare status per allinearlo
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'preparing', 'completed'));
```

**NOTA:**
- `order_number` è **SERIAL per ristorante** → progressivo globale #1, #2, #3...
- `opened_at` = timestamp apertura tavolo (cliente ordina o staff crea)
- `closed_at` = timestamp chiusura (scontrino/preconto/elimina)
- `deleted_at` = soft delete (se non null, ordine eliminato)
- `room_id` = riferimento sala (già esistente dalla migrazione rooms)

### 📦 TABELLA `order_items` - Campi da aggiungere

```sql
-- Campi nuovi
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS batch_number INT DEFAULT 1 NOT NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS prepared BOOLEAN DEFAULT false;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS prepared_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES v_product_variants(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_title TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS option_values JSONB;

-- Indici
CREATE INDEX IF NOT EXISTS idx_order_items_batch ON order_items(order_id, batch_number);
CREATE INDEX IF NOT EXISTS idx_order_items_prepared ON order_items(prepared);
```

**NOTA:**
- `batch_number` = ondata ordine (1 = prima, 2 = seconda, ecc.)
- `prepared` = prodotto segnato come preparato da staff
- `prepared_at` = timestamp quando marcato preparato
- `variant_id`, `variant_title`, `option_values` = dati varianti prodotto

### 📦 TABELLA `analytics_events` - Eventi nuovi

```sql
-- Modificare constraint per nuovi eventi
ALTER TABLE analytics_events DROP CONSTRAINT IF EXISTS analytics_events_event_type_check;
ALTER TABLE analytics_events ADD CONSTRAINT analytics_events_event_type_check CHECK (event_type IN (
  -- Eventi esistenti
  'favorite_added',
  'favorite_removed',
  'product_viewed',
  'category_viewed',
  'session_time',
  'qr_scanned',
  'order_item_added',
  'order_completed',
  'order_cancelled',

  -- Nuovi eventi tavoli
  'table_opened',
  'table_order_pending',
  'table_order_confirmed',
  'table_order_modified',
  'table_products_added',
  'table_preconto',
  'table_closed',

  -- Nuovi eventi banco
  'counter_order_created',
  'counter_order_completed',

  -- Eventi priority
  'priority_order_requested',

  -- Eventi staff
  'staff_action'
));

-- Aggiungi room_id per filtri analytics
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id) ON DELETE SET NULL;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS table_number INT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS batch_number INT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES restaurant_staff(id) ON DELETE SET NULL;

-- Indici
CREATE INDEX IF NOT EXISTS idx_analytics_room_id ON analytics_events(room_id) WHERE room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_table_number ON analytics_events(table_number) WHERE table_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_staff_id ON analytics_events(staff_id) WHERE staff_id IS NOT NULL;
```

---

## 🔢 NUMERAZIONE ORDINI

### Logica Numero Progressivo

```sql
-- Trigger per auto-generare order_number
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INT;
BEGIN
  -- Ottieni il prossimo numero per questo ristorante
  SELECT COALESCE(MAX(order_number), 0) + 1 INTO next_number
  FROM orders
  WHERE restaurant_id = NEW.restaurant_id;

  NEW.order_number = next_number;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_order_number
BEFORE INSERT ON orders
FOR EACH ROW
WHEN (NEW.order_number IS NULL)
EXECUTE FUNCTION set_order_number();
```

### Formato Display

- **Ordine #1** (non #001 o ORD-1)
- Sempre crescente per ristorante
- **NO reset giornaliero** → progressivo infinito

### Numero Scontrino Fiscale

- **Separato** da order_number
- **Reset giornaliero** → #1/giorno
- Formato: `#1`, `#2`, `#3`... (progressivo per giornata)
- Campo da aggiungere:

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS receipt_number INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS receipt_date DATE;
```

---

## 📱 INTERFACCIA UTENTE

### 🎛️ SEZIONE CASSA - Tab AL TAVOLO

#### Visualizzazione Griglia Tavoli

**Desktop:**
- Griglia flessibile (es. 3x3, 4x4) in base a numero tavoli
- Card tavolo mostra:
  - Numero tavolo
  - Colore sfondo stato
  - Badge/icona se occupato
  - Icona "+" se aggiunte non confermate

**Mobile:**
- Griglia 2x2 fissa
- Scroll verticale

#### Card Tavolo

```
┌─────────────────────┐
│ TAVOLO 5      [ + ] │ ← Icona aggiunte (se presenti)
│                     │
│   [COLORE STATO]    │ ← Verde/Giallo/Grigio
│                     │
│ 00:45:23           │ ← Tempo apertura (se attivo)
└─────────────────────┘
```

#### Badge Notifica Tasto "AL TAVOLO"

```
┌─────────────────────┐
│  AL TAVOLO    (3)   │ ← Badge rosso alto destra
└─────────────────────┘
```

### 🗨️ POPUP TAVOLO (Cliccando su tavolo attivo)

```
╔══════════════════════════════════════════════════╗
║ TAVOLO 5 - Sala Principale              [✕]    ║
║                                                  ║
║ Status: [🟢 ATTIVO]        Tempo: 00:45:23     ║
║ Ordine: #42                Priority: Sì ⚡      ║
║──────────────────────────────────────────────────║
║                                                  ║
║ 📦 PRODOTTI ORDINATI                             ║
║                                                  ║
║ ─── Ordine Iniziale (18:30) ───                 ║
║ ☑ Pizza Margherita x2        €16.00            ║
║ ☑ Coca-Cola x1               €3.50             ║
║   Note: "Senza ghiaccio"                        ║
║                                                  ║
║ ─── Seconda Portata (19:15) ───                 ║
║ ☐ Tiramisù x1                €5.00             ║
║ ☐ Caffè x2                   €4.00             ║
║                                                  ║
║ Note Ordine: "Cliente allergico alle noci"      ║
║                                                  ║
║──────────────────────────────────────────────────║
║ Subtotale:          €28.50                      ║
║ Priority (+€2):     €2.00                       ║
║ ─────────────────────────────                   ║
║ TOTALE:             €30.50                      ║
║──────────────────────────────────────────────────║
║                                                  ║
║ [Aggiungi Prodotti] [Preconto] [Scontrino]     ║
║                                  [Elimina]      ║
╚══════════════════════════════════════════════════╝
```

**Pulsanti azioni:**

| Stato | Pulsanti disponibili |
|-------|---------------------|
| **PENDING** | `[Conferma]` `[Modifica]` `[Elimina]` |
| **PREPARING** | `[Aggiungi Prodotti]` `[Preconto]` `[Scontrino]` `[Elimina]` |
| **DOPO PRECONTO** | `[Aggiungi Prodotti]` `[Scontrino]` `[Chiudi Tavolo]` `[Elimina]` |

### 🛒 MODAL AGGIUNGI PRODOTTI

Uguale a **AddToCartModal** con:
- Lista prodotti con ricerca autocomplete
- Selezione varianti
- Note prodotto
- Quantità
- Pulsante "Aggiungi a Ordine"

### 📋 SEZIONE ORDINI - Tab

```
┌────────────────────────────────────────────────┐
│  [TUTTI]  [AL BANCO]  [TAVOLO]  [ELIMINATI]   │
└────────────────────────────────────────────────┘
```

**Tab TAVOLO** ha tasto "Filtra":
- TUTTI
- IN ATTESA (pending)
- ATTIVO (preparing)
- CHIUSO (completed)

**Filtri data** (per tutte le tab):
- Oggi
- Ieri
- Ultimi 7 giorni
- Ultimi 30 giorni
- Personalizzato (da... al...)

**Ricerca:**
- Per numero ordine (#42)
- Per nome cliente
- Per prodotti (autocomplete)

---

## 📊 ANALYTICS - KPI DA TRACCIARE

### 📈 KPI Ordini

| Metrica | Descrizione | Filtri |
|---------|-------------|--------|
| **Totale Ordini** | Numero ordini completati | Tavolo/Banco, Sala, Periodo |
| **Revenue Totale** | Somma totale_amount | Tavolo/Banco, Sala, Periodo |
| **Scontrino Medio** | Revenue / Numero ordini | Tavolo/Banco, Sala, Periodo |
| **Prodotti per Ordine** | Media items per ordine | Tavolo/Banco, Sala, Periodo |
| **Tempo Medio Tavolo** | Media (closed_at - opened_at) | Sala, Periodo |
| **Ondate Medie** | Media batch_number per ordine | Sala, Periodo |
| **Tasso Priority** | % ordini con priority | Tavolo/Banco, Periodo |

### 📊 KPI Prodotti

| Metrica | Descrizione | Filtri |
|---------|-------------|--------|
| **Prodotti più Ordinati** | Top 10 by quantità | Tavolo/Banco, Periodo |
| **Revenue per Prodotto** | Somma subtotal per prodotto | Tavolo/Banco, Periodo |
| **Prodotti per Fascia Oraria** | Distribuzione 00:00-23:59 | Tavolo/Banco, Prodotto |
| **Prodotti per Giorno Settimana** | Lun-Dom | Tavolo/Banco, Prodotto |
| **Varianti più Vendute** | Top varianti | Periodo |

### 👨‍💼 KPI Staff

| Metrica | Descrizione | Filtri |
|---------|-------------|--------|
| **Ordini Confermati** | Numero ordini confermati | Staff, Periodo |
| **Tempo Medio Conferma** | Media (confirmed_at - created_at) | Staff, Periodo |
| **Modifiche Ordini** | Numero modifiche effettuate | Staff, Periodo |
| **Tavoli Gestiti** | Numero tavoli diversi | Staff, Periodo |

### 🏠 KPI Sale

| Metrica | Descrizione | Filtri |
|---------|-------------|--------|
| **Ordini per Sala** | Numero ordini | Sala, Periodo |
| **Revenue per Sala** | Totale revenue | Sala, Periodo |
| **Tavolo più Produttivo** | Top tavolo by revenue | Sala, Periodo |
| **Tasso Occupazione** | % tempo tavoli occupati | Sala, Periodo |

---

## 🔄 LOGICA OCCUPAZIONE TAVOLO

### Tavolo OCCUPATO quando:

```sql
-- Un tavolo è occupato se ha un ordine:
SELECT * FROM orders
WHERE restaurant_id = ?
  AND room_id = ?
  AND table_number = ?
  AND status IN ('pending', 'preparing')
  AND deleted_at IS NULL
```

### Tavolo LIBERO quando:

- `status = 'completed'`
- OPPURE `deleted_at IS NOT NULL`

### Selezione Tavolo da SlideCart:

```javascript
// Recupera tavoli occupati
const { data: occupiedTables } = await supabase
  .from('orders')
  .select('table_number, room_id')
  .eq('restaurant_id', restaurantId)
  .in('status', ['pending', 'preparing'])
  .is('deleted_at', null)

// Disabilita tavoli occupati nel select
<option
  value={table.number}
  disabled={isOccupied(table.number, selectedRoom)}
>
  Tavolo {table.number} {isOccupied ? '(Occupato)' : ''}
</option>
```

---

## 🧮 LOGICA PRECONTO/SCONTRINO

### PRECONTO

**Azione:**
1. Genera stampa HTML → Print
2. Mostra totale attuale
3. **NON chiude tavolo** (status resta `preparing`)
4. Campo `has_preconto = true` (opzionale)

**Se aggiunti prodotti dopo preconto:**
- Nuovo preconto mostra **TUTTO** (totale aggiornato)

**UI:**
Dopo preconto appare pulsante `[Chiudi Tavolo]` per chiusura manuale.

### SCONTRINO FISCALE

**Azione:**
1. Genera numero scontrino giornaliero
2. Genera stampa HTML → Print (poi integrazione stampante)
3. **Chiude tavolo**: `status = 'completed'`, `closed_at = NOW()`

**Numero Scontrino:**
```sql
-- Ottieni prossimo numero per oggi
SELECT COALESCE(MAX(receipt_number), 0) + 1
FROM orders
WHERE restaurant_id = ?
  AND receipt_date = CURRENT_DATE
```

---

## 🗑️ ELIMINAZIONE ORDINI

### Ordine Eliminato

**Azione:**
```sql
UPDATE orders
SET deleted_at = NOW(),
    status = 'completed',
    closed_at = NOW(),
    modified_by_staff_id = ?
WHERE id = ?
```

**Effetti:**
- Tavolo diventa LIBERO
- Ordine va in tab ELIMINATI
- **NON conteggiato in KPI principali**
- Dashboard "Ordini Eliminati" separata

### Tavolo/Sala Eliminati

**Ordini associati:**
- **NON vengono eliminati**
- Rimangono in analytics (room_id/table_number conservati)

**Rationale:**
Ristoratore può modificare configurazione sale nel tempo senza perdere storico.

---

## ⏱️ TEMPO APERTURA TAVOLO

### Calcolo

```javascript
// opened_at = primo ordine cliente o apertura staff
const elapsedSeconds = Math.floor((Date.now() - new Date(order.opened_at)) / 1000)

// Format 00:45:23
const hours = Math.floor(elapsedSeconds / 3600).toString().padStart(2, '0')
const minutes = Math.floor((elapsedSeconds % 3600) / 60).toString().padStart(2, '0')
const seconds = (elapsedSeconds % 60).toString().padStart(2, '0')
const formatted = `${hours}:${minutes}:${seconds}`
```

### Aggiornamento

**Real-time:**
- `setInterval` ogni 1 secondo
- Aggiorna UI

---

## 🎨 ANIMAZIONE VERDE LAMPEGGIANTE

### CSS Heartbeat

```css
@keyframes heartbeat {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

.table-active {
  background-color: var(--success-color);
  animation: heartbeat 1.5s ease-in-out infinite;
}
```

---

## 📝 PRIORITY ORDER

### Gestione

**Ogni richiesta ordine:**
- Cliente può selezionare priority
- Supplemento `€2.00` (configurabile)

**Se aggiunti 3 priority in 3 ondate:**
- 3 voci separate in `order_items`
- Totale: `€6.00`

**Tracking:**
```sql
-- Conteggio priority per ordine
SELECT COUNT(*) FROM order_items
WHERE order_id = ?
  AND product_id = (SELECT id FROM products WHERE name = 'Ordine Prioritario')
```

---

## 🔧 IMPLEMENTAZIONE - PIANO STEP-BY-STEP

### FASE 1: Database Schema ✅
1. Creare migration SQL con modifiche
2. Applicare a Supabase
3. Testare constraints e trigger

### FASE 2: Backend Logic
1. Funzioni utility per calcoli
2. Query ottimizzate per occupazione tavoli
3. Trigger auto-numerazione

### FASE 3: UI Cassa - Tab AL TAVOLO
1. Griglia tavoli responsive
2. Colori stati
3. Animazione heartbeat
4. Badge notifiche

### FASE 4: Popup Tavolo
1. Layout completo
2. Lista prodotti con checkbox
3. Separatori batch
4. Pulsanti azioni

### FASE 5: Modal Aggiungi Prodotti
1. Lista prodotti con ricerca
2. Autocomplete
3. Varianti
4. Aggiungi a ordine esistente

### FASE 6: Sezione Ordini - Tab
1. Tab TUTTI/BANCO/TAVOLO/ELIMINATI
2. Filtri IN ATTESA/ATTIVO/CHIUSO
3. Filtri data
4. Ricerca

### FASE 7: Stampe
1. Template HTML preconto
2. Template HTML scontrino
3. Print browser
4. (Futuro) Integrazione stampante

### FASE 8: Analytics
1. Nuovi eventi tracking
2. Dashboard ordini
3. Dashboard prodotti
4. Dashboard staff/sale

### FASE 9: Testing
1. Test flusso completo tavolo
2. Test flusso banco
3. Test multi-utente
4. Test edge cases

### FASE 10: Ottimizzazioni
1. Performance query
2. Indici database
3. Cache
4. Real-time updates

---

## 📚 DOMANDE APERTE (Da chiarire prima di implementare)

Tutte le domande sono state chiarite! ✅

---

## ✅ CHECKLIST PRE-IMPLEMENTAZIONE

- [x] Schema database definito
- [x] Flussi operativi chiari
- [x] Stati tavolo definiti
- [x] Colorazioni/animazioni specificate
- [x] Analytics events identificati
- [x] KPI da tracciare elencate
- [x] Logica occupazione tavolo
- [x] Numerazione ordini
- [x] Preconto/scontrino logica
- [x] Eliminazioni soft delete
- [x] Priority order gestione
- [x] Tempo apertura calcolo
- [x] Batch number fisso
- [x] Staff tracking
- [x] Tutti i punti user confermati

## 🚀 READY TO IMPLEMENT!

Documento completo e pronto per sviluppo.
Prossimo step: Creazione migration SQL.
