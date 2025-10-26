# 📋 SPECIFICHE COMPLETE SISTEMA CASSA E GESTIONE TAVOLI

## 📅 Data Creazione
26 Gennaio 2025

## 📅 Ultimo Aggiornamento
26 Ottobre 2025

## 🎯 Obiettivo
Implementare un sistema completo di gestione cassa con:
- **Ordini al Banco** (rapidi, immediati)
- **Ordini al Tavolo** (con stati, conferme, portate multiple)
- **Tracking completo** per analytics dettagliate
- **Gestione Staff** con tracciamento azioni
- **Numerazione ordini** progressiva (#1, #2, #3...)
- **Storico cambi tavolo** con timestamp e operatore

---

## 📋 SPECIFICHE UI - LISTA ORDINI (OrdersPage)

### Visualizzazione Card Ordine
Ogni card ordine deve mostrare:
1. **Numero Ordine**: `#order.order_number` (numerazione progressiva 1, 2, 3...)
   - NON usare UUID
   - Fallback a UUID solo se order_number non esiste

2. **Sala / Tavolo**: `{room.name} - Tavolo {table.number}`
   - Usare relazioni `order.room` e `order.table`
   - NON usare campi legacy `table_number`

3. **Numero Totale Prodotti**: `{order.order_items.length} articoli`
   - Mostrare SOLO il contatore
   - NON mostrare la lista dettagliata dei prodotti

4. **Storico Cambi Tavolo**: Se `order.table_change_logs.length > 0`
   - Mostrare sezione espandibile con sfondo info (azzurro)
   - Per ogni cambio: timestamp, sala/tavolo vecchio → nuovo, operatore
   - Ordinati dal più recente al più vecchio

---

## 📋 SPECIFICHE UI - DETTAGLIO ORDINE (OrderDetailPage)

### Pulsante "Torna agli Ordini"
- **Variant**: `ghost` (senza background)
- **Posizione**: In alto a sinistra sopra il titolo
- **Testo**: `← Torna agli Ordini`

### Visualizzazione Dati Ordine
1. **Numero Ordine**: `Ordine #{order.order_number}` (non UUID)
2. **Sala / Tavolo**: `{room.name} - Tavolo {table.number}`
   - Aggiornamento automatico dopo cambio tavolo

### Cambio Tavolo
- Quando l'utente cambia tavolo, la scheda deve aggiornarsi automaticamente
- Implementazione:
  - Chiudere modal
  - Delay di 300ms per commit Supabase
  - Ricaricare dati con `loadData()`
- Log console: `🔄 Tavolo cambiato, ricarico dati...`

### Query Dati
Caricare ordine con:
```javascript
.select(`
  *,
  table:tables (id, number),
  room:rooms (id, name),
  table_change_logs (
    id, changed_at, changed_by_name,
    old_room_name, old_table_number,
    new_room_name, new_table_number
  )
`)
```

---

## ⏱️ VISUALIZZAZIONE TEMPO ORDINI

### Ordini PENDING (In Attesa Conferma)

**PROBLEMA IDENTIFICATO:** Gli ordini in stato "pending" mostrano tempo fermo (00:00:00)

**SOLUZIONE:** Per ordini `pending`, NON mostrare timer real-time ma:

1. **Data e ora apertura**: `created_at` formattato
2. **Tempo trascorso statico**: Calcolato da `created_at` ma NON aggiornato in real-time

**Formato UI:**
```
┌─────────────────────────────┐
│ TAVOLO 5 - Sala Principale │
│                             │
│ Status: 🟡 IN ATTESA        │
│                             │
│ Aperto alle: 15:30         │  ← Data/ora statica
│ In attesa da: 5 minuti     │  ← Tempo trascorso calcolato
│                             │
│ [Conferma] [Modifica]       │
└─────────────────────────────┘
```

### Ordini PREPARING (Attivi)

**Timer Real-time:**
- Mostra tempo trascorso da `opened_at` (o `confirmed_at` se disponibile)
- Aggiornamento ogni secondo con `setInterval`
- Formato: `HH:MM:SS` (es. `01:23:45`)

**Formato UI:**
```
┌─────────────────────────────┐
│ TAVOLO 5 - Sala Principale │
│                             │
│ Status: 🟢 ATTIVO           │
│ Tempo: 01:23:45            │  ← Timer real-time
│                             │
│ [Aggiungi] [Preconto]       │
└─────────────────────────────┘
```

### Ordini COMPLETED (Chiusi)

**Tempo totale fisso:**
- Mostra durata totale: `closed_at - opened_at`
- NON aggiornato (ordine chiuso)
- Formato: `HH:MM:SS`

**Formato UI:**
```
┌─────────────────────────────┐
│ TAVOLO 5 - Sala Principale │
│                             │
│ Status: ⚪ CHIUSO           │
│ Durata totale: 02:15:30    │  ← Tempo fisso
│                             │
│ [Riapri]                    │
└─────────────────────────────┘
```

### Implementazione Logica Tempo

**CassaPage.jsx - TableDetailModal:**
```javascript
const getOrderTimeDisplay = (order) => {
  const now = Date.now()

  switch (order.status) {
    case 'pending':
      // Mostra data/ora apertura statica
      const openedDate = new Date(order.created_at)
      const minutesWaiting = Math.floor((now - openedDate.getTime()) / 60000)
      return {
        type: 'static',
        label: 'Aperto alle',
        time: openedDate.toLocaleString('it-IT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        waiting: `In attesa da ${minutesWaiting} minuti`
      }

    case 'preparing':
      // Timer real-time
      const startTime = new Date(order.opened_at || order.confirmed_at || order.created_at)
      const elapsed = Math.floor((now - startTime.getTime()) / 1000)
      const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0')
      const minutes = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0')
      const seconds = (elapsed % 60).toString().padStart(2, '0')
      return {
        type: 'realtime',
        label: 'Tempo',
        time: `${hours}:${minutes}:${seconds}`
      }

    case 'completed':
      // Durata totale fissa
      const start = new Date(order.opened_at || order.created_at)
      const end = new Date(order.closed_at)
      const duration = Math.floor((end.getTime() - start.getTime()) / 1000)
      const h = Math.floor(duration / 3600).toString().padStart(2, '0')
      const m = Math.floor((duration % 3600) / 60).toString().padStart(2, '0')
      const s = (duration % 60).toString().padStart(2, '0')
      return {
        type: 'fixed',
        label: 'Durata totale',
        time: `${h}:${m}:${s}`
      }
  }
}

// Uso in render:
const timeDisplay = getOrderTimeDisplay(selectedOrder)

{timeDisplay.type === 'static' && (
  <>
    <div>{timeDisplay.label}: {timeDisplay.time}</div>
    <div style={{ fontSize: '12px', color: '#666' }}>
      {timeDisplay.waiting}
    </div>
  </>
)}

{timeDisplay.type === 'realtime' && (
  <div>{timeDisplay.label}: {timeDisplay.time}</div>
)}

{timeDisplay.type === 'fixed' && (
  <div>{timeDisplay.label}: {timeDisplay.time}</div>
)}
```

### OrdersPage.jsx - Card Ordine

**Stesso comportamento:**
- `pending`: Data/ora statica + "In attesa da X minuti"
- `preparing`: Timer real-time aggiornato ogni secondo
- `completed`: Durata totale fissa

**Fix da applicare:**
```javascript
// OrdersPage.jsx - Dentro loadData() o render
const [currentTime, setCurrentTime] = useState(Date.now())

useEffect(() => {
  const interval = setInterval(() => {
    setCurrentTime(Date.now())
  }, 1000)
  return () => clearInterval(interval)
}, [])

// Poi usare getOrderTimeDisplay(order) per ogni card
```

---

## 👤 TRACCIAMENTO OPERATORE (OPERATOR TRACKING)

### Identificazione Operatore

Ogni azione sugli ordini deve tracciare chi l'ha eseguita:

1. **Proprietario** (Owner):
   - Utente autenticato con Supabase Auth
   - `session.user.id === restaurant.user_id`
   - Nome visualizzato: **"Proprietario"**
   - `staffSession.staff_id = null`

2. **Staff** (futuro):
   - Autenticazione via localStorage (`staff_session`)
   - Nome visualizzato: Nome dello staff member
   - `staffSession.staff_id = UUID dello staff`

### Implementazione staffSession

Tutti i componenti che creano/modificano ordini devono ricevere il prop `staffSession`:

```javascript
// Verifica se l'utente corrente è il proprietario
const staffSession = session?.user?.id === restaurant?.user_id ? {
  name: 'Proprietario',
  role: 'manager',
  restaurant_id: restaurant.id,
  staff_id: null
} : null
```

### Componenti Interessati

| Componente | Quando tracciare | staffSession |
|------------|-----------------|--------------|
| **CreateOrderModal** | Creazione nuovo ordine | Passato via prop |
| **CreateOrderModal** | Modifica ordine esistente | Passato via prop |
| **ChangeTableModal** | Cambio tavolo | Recuperato internamente |
| **OrderTimeline** | Eventi timeline | Visualizza staff_name |

### Schema Database per Tracciamento

**IMPORTANTE:** La tabella `order_timeline` deve avere sia `staff_name` (nome completo) che `staff_role` (ruolo):

```sql
-- Verifica struttura tabella order_timeline
-- Se manca staff_role, aggiungilo:
ALTER TABLE order_timeline
ADD COLUMN IF NOT EXISTS staff_role VARCHAR(50);

-- Indice per performance analytics
CREATE INDEX IF NOT EXISTS idx_order_timeline_staff_analytics
ON order_timeline(staff_name, staff_role, action, created_at);

-- Indice per filtraggio per ruolo
CREATE INDEX IF NOT EXISTS idx_order_timeline_staff_role
ON order_timeline(staff_role, created_at);
```

**Tabella `restaurant_staff` (già esistente, da estendere):**
```sql
-- Aggiungi nome e cognome se non esistono
ALTER TABLE restaurant_staff
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Aggiungi role come testo (in attesa sistema ruoli completo)
ALTER TABLE restaurant_staff
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Staff';

-- Constraint per ruoli validi (temporaneo)
ALTER TABLE restaurant_staff
ADD CONSTRAINT restaurant_staff_role_check
CHECK (role IN ('Admin', 'Proprietario', 'Manager', 'Cameriere', 'Cuoco', 'Barista', 'Staff'));
```

**Tabella `restaurants` - Nome proprietario:**
```sql
-- Aggiungi nome completo proprietario se non esiste
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS owner_first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS owner_last_name VARCHAR(100);

-- Il campo 'name' esistente sarà il nome del ristorante
-- owner_first_name e owner_last_name sono per il proprietario
```

### Registrazione Eventi

**Tabella `order_timeline` - Formato completo:**
```sql
INSERT INTO order_timeline (
  order_id,
  action,
  staff_id,
  staff_name,        -- Nome completo: "Vincenzo Cassese"
  staff_role,        -- Ruolo: "Admin", "Proprietario", "Cameriere"
  created_at
) VALUES (
  order_id,
  'created', -- o 'updated', 'confirmed', etc.
  staffSession?.staff_id || null,
  staffSession?.fullName || staffSession?.name || 'Staff',
  staffSession?.role || 'Staff',
  NOW()
)
```

**JavaScript - Costruzione staffSession completo:**
```javascript
// Per proprietario
const staffSession = {
  name: 'Vincenzo Cassese',      // Nome completo dal database
  fullName: 'Vincenzo Cassese',  // Alias per chiarezza
  role: 'Admin',                  // Ruolo del proprietario
  displayRole: 'Admin',           // Per UI
  restaurant_id: restaurant.id,
  staff_id: null,                 // null = proprietario
  isOwner: true
}

// Per staff member (futuro)
const staffSession = {
  name: 'Mario Rossi',
  fullName: 'Mario Rossi',
  role: 'Cameriere',
  displayRole: 'Cameriere',
  restaurant_id: restaurant.id,
  staff_id: 'uuid-dello-staff',
  isOwner: false
}
```

**Tabella `table_change_logs`:**
```sql
INSERT INTO table_change_logs (
  order_id,
  changed_by_user_id,
  changed_by_name,
  changed_at,
  old_room_id,
  old_table_id,
  new_room_id,
  new_table_id
) VALUES (
  order_id,
  user.id,
  'Proprietario', -- o nome staff
  NOW(),
  old_room_id,
  old_table_id,
  new_room_id,
  new_table_id
)
```

### Pagine con Logica Corretta

| Pagina | Status | Note |
|--------|--------|------|
| **CassaPage.jsx** | ✅ | Passa staffSession dinamico a CreateOrderModal |
| **OrdersPage.jsx** | ✅ | Passa staffSession dinamico a CreateOrderModal |
| **OrderDetailPage.jsx** | ✅ | Passa staffSession dinamico a CreateOrderModal |
| **StaffOrders.jsx** | ✅ | Già implementato con logica owner/staff |
| **OrderDetail.jsx** | ✅ | Già implementato con logica owner/staff |
| **ChangeTableModal.jsx** | ⚠️ | Usa `restaurant.name` invece di "Proprietario" |

### Fix Applicati

1. **CassaPage.jsx** (linee 2014-2019):
   - Aggiunto controllo dinamico `session?.user?.id === restaurant?.user_id`
   - Se true, passa staffSession con `name: 'Proprietario'`

2. **OrdersPage.jsx** (linee 674-679):
   - Aggiunto stesso controllo dinamico
   - Passa staffSession con `name: 'Proprietario'` se owner

3. **OrderDetailPage.jsx** (linee 693-698):
   - Sostituito staffSession hardcoded con controllo dinamico
   - Ora verifica se utente è proprietario

### Comportamento Atteso

Ogni evento nella timeline deve mostrare:
1. **Ruolo dell'operatore** (es. "Admin", "Proprietario", "Cameriere")
2. **Nome completo** (es. "Vincenzo Cassese")
3. **Data e ora** formattata (es. "26/10/2025, 15:06")

**Formato Timeline:**
```
[Icona Status] Azione Eseguita
               da [Ruolo] - [Nome Cognome]
               [Data], [Ora]
               [Dettagli aggiuntivi se presenti]
```

**Esempio reale:**
```
🟢 Creato
   da Admin - Vincenzo Cassese
   26/10/2025, 15:06

📝 Aggiornato
   da Cameriere - Mario Rossi
   26/10/2025, 15:30

🔄 Cambio Tavolo
   Da: Pizzettosa - Tavolo 3 → A: Interna - Tavolo 4
   da Admin - Vincenzo Cassese
   26/10/2025, 15:35
```

| Azione | Operatore | Visualizzazione Timeline |
|--------|-----------|-------------------------|
| Crea ordine | Proprietario | "Creato<br>da **Admin - Vincenzo Cassese**<br>26/10/2025, 15:06" |
| Crea ordine | Staff Cameriere | "Creato<br>da **Cameriere - Mario Rossi**<br>26/10/2025, 18:30" |
| Modifica ordine | Proprietario | "Aggiornato<br>da **Admin - Vincenzo Cassese**<br>26/10/2025, 15:45" |
| Cambia tavolo | Staff Manager | "Cambio Tavolo<br>Da: Sala A - Tavolo 1 → A: Sala B - Tavolo 5<br>da **Manager - Luca Bianchi**<br>26/10/2025, 19:00" |
| Conferma ordine | Staff Cameriere | "Confermato<br>da **Cameriere - Mario Rossi**<br>26/10/2025, 18:35" |

### Metriche Staff per Dashboard

Le dashboard devono poter filtrare e aggregare dati per:

1. **Per Ruolo:**
   - Numero ordini gestiti per ruolo
   - Tempo medio servizio per ruolo
   - Revenue generato per ruolo
   - Produttività per ruolo

2. **Per Membro Staff:**
   - Numero ordini creati da [Nome Cognome]
   - Numero ordini modificati da [Nome Cognome]
   - Tempo medio gestione ordine per [Nome Cognome]
   - Revenue generato da [Nome Cognome]

3. **Combinato (Ruolo + Nome):**
   - Comparazione performance tra membri dello stesso ruolo
   - Top performer per ruolo
   - Distribuzione workload

**Query esempio per analytics:**
```sql
-- Ordini per staff member
SELECT
  staff_name,
  staff_role,
  COUNT(*) as total_orders,
  SUM(total_amount) as total_revenue,
  AVG(total_amount) as avg_order_value
FROM order_timeline ot
JOIN orders o ON ot.order_id = o.id
WHERE ot.action = 'created'
  AND o.restaurant_id = ?
  AND ot.created_at BETWEEN ? AND ?
GROUP BY staff_name, staff_role
ORDER BY total_revenue DESC;

-- Performance per ruolo
SELECT
  staff_role,
  COUNT(DISTINCT staff_name) as members_count,
  COUNT(*) as total_orders,
  SUM(total_amount) as total_revenue,
  AVG(total_amount) as avg_order_value
FROM order_timeline ot
JOIN orders o ON ot.order_id = o.id
WHERE ot.action = 'created'
  AND o.restaurant_id = ?
GROUP BY staff_role
ORDER BY total_revenue DESC;
```

---

## 👥 SISTEMA STAFF (FUTURO - ROADMAP)

### Obiettivo

Implementare un sistema di gestione staff simile a Shopify:

1. **Ruoli predefiniti** con permessi configurabili
2. **Area membri** per creare/gestire utenti staff
3. **Assegnazione ruoli** a membri staff
4. **Tracciamento azioni** per ogni membro

### Architettura Proposta

#### 1. Tabella `staff_roles`

```sql
CREATE TABLE staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  name TEXT NOT NULL, -- es. "Cameriere", "Manager", "Cuoco"
  permissions JSONB NOT NULL, -- permessi configurabili
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Esempio permessi:**
```json
{
  "orders": {
    "create": true,
    "read": true,
    "update": true,
    "delete": false
  },
  "products": {
    "create": false,
    "read": true,
    "update": false,
    "delete": false
  },
  "analytics": {
    "view": false
  },
  "settings": {
    "manage": false
  }
}
```

#### 2. Modifiche a `restaurant_staff`

```sql
ALTER TABLE restaurant_staff
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES staff_roles(id);
```

#### 3. UI - Area Membri

**Nuova sezione in Settings:**
- Tab "Staff & Permessi"
- Sotto-tab:
  - **Membri**: Lista staff con azioni (crea, modifica, disabilita)
  - **Ruoli**: Gestione ruoli e permessi

**Creazione Ruolo:**
1. Nome ruolo
2. Selezione permessi (checkbox per ogni funzionalità)
3. Salva ruolo

**Creazione Membro:**
1. Nome e email
2. Password temporanea (cambiare al primo accesso)
3. Assegnazione ruolo
4. Salva membro

#### 4. Autenticazione Staff

**Login dedicato:**
- Route: `/staff/:subdomain/login`
- Credenziali: email + password
- Salva `staff_session` in localStorage con ruolo e permessi
- Redirect a `/staff/:subdomain/orders`

**Middleware permessi:**
```javascript
const checkPermission = (action, resource) => {
  const permissions = staffSession?.role?.permissions
  return permissions?.[resource]?.[action] === true
}

// Esempio utilizzo
if (!checkPermission('delete', 'orders')) {
  alert('Non hai i permessi per eliminare ordini')
  return
}
```

#### 5. Timeline con Staff

**Visualizzazione migliorata:**
```javascript
// Timeline event
{
  action: 'confirmed',
  staff_name: 'Mario Rossi',
  staff_role: 'Cameriere',
  created_at: '2025-10-26T14:30:00Z'
}
```

**UI:**
```
🟢 Ordine confermato
   da Mario Rossi (Cameriere)
   26 Ott 2025, 14:30
```

#### 6. Analytics Staff

**Metriche per membro:**
- Numero ordini gestiti
- Tempo medio di servizio
- Customer satisfaction (futuro)
- Produttività per turno

**Metriche per ruolo:**
- Performance comparativa
- Distribuzione workload

### Implementazione Timeline

1. **Fase 1**: Tabella `staff_roles` e UI gestione ruoli
2. **Fase 2**: Modifica `restaurant_staff` con `role_id`
3. **Fase 3**: UI gestione membri con assegnazione ruoli
4. **Fase 4**: Login staff e middleware permessi
5. **Fase 5**: Integrazione permessi in tutte le pagine
6. **Fase 6**: Analytics staff e reportistica

### Note Implementative

- Il proprietario ha sempre tutti i permessi (bypass middleware)
- Staff non può modificare altri staff (solo proprietario)
- Ruoli predefiniti: "Manager", "Cameriere", "Cuoco" (customizzabili)
- Log delle modifiche permessi in `audit_log` table

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
