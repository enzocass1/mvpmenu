# Timeline Enhancement Project - CRM-Style System

**Data Inizio**: 27 Ottobre 2025
**Status**: 🔄 In Progress
**Priorità**: 🔴 Alta
**Tipo**: Major Feature Enhancement

---

## 📋 Indice

1. [Problema Attuale](#problema-attuale)
2. [Visione del Cliente](#visione-del-cliente)
3. [Analisi Tecnica](#analisi-tecnica)
4. [Root Cause Analysis](#root-cause-analysis)
5. [Soluzione Proposta](#soluzione-proposta)
6. [Piano di Implementazione](#piano-di-implementazione)
7. [Riferimenti](#riferimenti)

---

## 🐛 Problema Attuale

### Segnalazione Utente

> **Quote Diretta:**
> ```
> guarda la timeline:
>
> Prodotto Aggiunto
> Proprietario
> 27/10/2025, 15:14
>
> Cambio Tavolo
> Pizzettosa T4 → Pizzettosa T6
> Vincenzo Cassese
> 27/10/2025, 15:13
>
> Confermato
> Proprietario
> 27/10/2025, 15:08
>
> In Preparazione
> 27/10/2025, 15:08
>
> Creato
> da Admin - Proprietario
> 27/10/2025, 15:07
>
> I log di chi ha fatto cosa sono sempre differenti.
> ```

### Sintomi Identificati

1. **Inconsistent Operator Display**
   - "Proprietario" (solo ruolo)
   - "Vincenzo Cassese" (solo nome)
   - "da Admin - Proprietario" (ruolo + nome completo)
   - Nessun operatore mostrato ("In Preparazione")

2. **Missing Event Context**
   - Nessuna indicazione della **fonte evento** (tavolo/banco/ordini/public menu)
   - Dettagli nascosti, nessuna espandibilità
   - Informazioni limitate per analisi

3. **Not CRM-Style**
   - Nessun sistema di tracking professionale
   - Mancano metriche e analytics avanzate
   - UI non espandibile con toggle

---

## 🎯 Visione del Cliente

### Richieste Esplicite (Quote Dirette)

1. **"I log di chi ha fatto cosa sono sempre differenti. Bisogna focalizzarci adesso su questo aspetto."**

2. **"Analizza la documentazione per la mia richiesta di metriche, eventi, ruoli e membri come klaviyo/shopify come fosse un crm"**

3. **"Ti ricordo che gli eventi possono essere creati da tavolo, da banco, da ordini e da public menu."**

4. **"Ogni timestamp avrà un toggle di apertura per vedere cosa è accaduto."**

5. **"Trascrivi questa nuova richiesta nei log e ragiona in modo molto avanzato."**

6. **"Segui il processo creativo per le funzionalità dell'app e miglioriamo questo servizio di timeline ordine"**

### Sistema Ideale Richiesto

**Stile Klaviyo/Shopify CRM:**
- Timeline professionale con eventi espandibili
- Ogni evento mostra: Chi, Cosa, Quando, Dove, Perché
- Toggle per aprire dettagli nascosti
- Tracking completo operatore + fonte evento
- Analytics avanzate per metriche business
- Sistema consistente e predittibile

---

## 🔍 Analisi Tecnica

### Architettura Attuale

#### 1. Database Schema - `order_timeline` Table

**File**: `database/migrations/supabase_orders_schema.sql` (linee 250-261)

```sql
CREATE TABLE IF NOT EXISTS order_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES restaurant_staff(id) ON DELETE SET NULL,
  staff_name TEXT,
  action TEXT NOT NULL CHECK (action IN ('created', 'confirmed', 'preparing',
    'completed', 'cancelled', 'updated', 'item_added', 'item_removed',
    'item_updated', 'table_changed')),
  previous_status TEXT,
  new_status TEXT,
  changes JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Colonne Aggiunte da Roles System Migration:**

**File**: `database/migrations/create_roles_system.sql` (linee 261-264)

```sql
ALTER TABLE order_timeline
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_type VARCHAR(20) CHECK (created_by_type IN ('staff', 'customer', 'system', 'owner')),
  ADD COLUMN IF NOT EXISTS staff_role_display TEXT;
```

**Colonne Totali Disponibili:**
- `id` - UUID primaria
- `order_id` - FK a orders
- `staff_id` - FK a restaurant_staff (NULL se owner/customer/system)
- `staff_name` - Nome operatore (popolato da trigger)
- `staff_role_display` - Display ruolo (popolato da trigger)
- `user_id` - FK a auth.users (se owner)
- `created_by_type` - Enum: 'staff', 'owner', 'customer', 'system'
- `action` - Tipo evento (CHECK constraint)
- `previous_status` - Status precedente
- `new_status` - Nuovo status
- `changes` - JSONB con dettagli modifiche
- `notes` - Note testuali
- `created_at` - Timestamp

#### 2. Database Trigger - Auto-Population

**File**: `database/migrations/FIX_TRIGGER_OWNER_DATA.sql` (linee 10-61)

```sql
CREATE OR REPLACE FUNCTION populate_timeline_staff_info()
RETURNS TRIGGER AS $$
DECLARE
  v_role_display TEXT;
  v_staff_name TEXT;
  v_user_name TEXT;
BEGIN
  -- Path 1: Staff Member
  IF NEW.staff_id IS NOT NULL THEN
    SELECT r.display_name, s.name
    INTO v_role_display, v_staff_name
    FROM restaurant_staff s
    LEFT JOIN roles r ON s.role_id = r.id
    WHERE s.id = NEW.staff_id;

    NEW.staff_role_display := v_role_display;
    NEW.staff_name := COALESCE(NEW.staff_name, v_staff_name);
    NEW.created_by_type := 'staff';

  -- Path 2: Owner
  ELSIF NEW.user_id IS NOT NULL THEN
    SELECT COALESCE(SPLIT_PART(email, '@', 1), 'Proprietario')
    INTO v_user_name
    FROM auth.users
    WHERE id = NEW.user_id;

    NEW.staff_name := COALESCE(v_user_name, 'Proprietario');
    NEW.staff_role_display := 'Admin';
    NEW.created_by_type := 'owner';

  -- Path 3: Customer/System
  ELSE
    IF NEW.created_by_type IS NULL THEN
      NEW.created_by_type := 'system';
    END IF;

    IF NEW.created_by_type = 'customer' THEN
      NEW.staff_name := COALESCE(NEW.staff_name, 'Cliente Incognito');
      NEW.staff_role_display := 'Cliente';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Trigger Execution:**
- Tipo: `BEFORE INSERT`
- Tabella: `order_timeline`
- Quando: Prima di ogni insert
- Effetto: Popola automaticamente `staff_name`, `staff_role_display`, `created_by_type`

#### 3. Application Layer - `ordersService.js`

**File**: `src/lib/ordersService.js` (linea 28)

**Funzione Principale:**
```javascript
const addTimelineEntry = async (orderId, action, userInfo = {}, data = {}) => {
  try {
    // Handle null/undefined userInfo
    if (!userInfo) {
      userInfo = {}
    }

    // Backward compatibility: se userInfo è una stringa (vecchia signature), convertila
    if (typeof userInfo === 'string') {
      console.warn('[addTimelineEntry] DEPRECATED: Passing staffId as string. Use userInfo object instead.')
      userInfo = {
        staff_id: userInfo,
        staff_name: null
      }
    }

    // Build entry with ONLY columns that exist in order_timeline table
    const entry = {
      order_id: orderId,
      action: action,

      // Staff info
      staff_id: userInfo.staff_id || null,
      staff_name: userInfo.staff_name || null,

      // Owner info
      user_id: userInfo.user_id || null,

      // Actor type
      created_by_type: data.createdByType || null,

      // Status transitions
      previous_status: data.previousStatus || null,
      new_status: data.newStatus || null,

      // Additional metadata
      changes: data.changes || null,
      notes: data.notes || null,

      created_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('order_timeline')
      .insert(entry)

    if (error) {
      console.error('[addTimelineEntry] Errore insert:', error)
      throw error
    }

    console.log(`✅ Timeline event added: ${action} for order ${orderId} by ${entry.staff_name || 'System'}`)
    return true
  } catch (error) {
    console.error('[addTimelineEntry] Errore aggiunta timeline:', error)
    return false
  }
}
```

**Usage Patterns Trovati (9 occorrenze):**

| Linea | Action | UserInfo Passed | Note |
|-------|--------|-----------------|------|
| 153 | `created` | `null` | Ordine da cliente (QR menu) |
| 246 | `created` | `staffId` (STRING ⚠️) | Ordine da staff (tavolo) |
| 385 | `confirmed` | `staffId` (STRING ⚠️) | Conferma ordine |
| 432 | `completed` | `staffId` (STRING ⚠️) | Completa ordine (cassa) |
| 499 | `cancelled` | `staffId` (STRING ⚠️) | Annulla ordine |
| 598 | `item_added` | `staffId` (STRING ⚠️) | Aggiungi prodotti |
| 684 | `item_removed` | `staffId` (STRING ⚠️) | Rimuovi prodotto |
| 993 | `preconto_generated` | `staffId` (STRING ⚠️) | Preconto |

**Problemi Identificati:**
- ⚠️ 8 su 9 chiamate passano STRING invece di OBJECT
- ⚠️ Funzione ha backward compatibility ma mostra warning
- ⚠️ Nessuna chiamata passa `user_id` per proprietario
- ⚠️ Nessuna chiamata setta `created_by_type` esplicitamente

#### 4. Utility Layer - `orderTimeline.jsx`

**File**: `src/utils/orderTimeline.jsx` (linee 21-86)

**FIRMA DIVERSA!**
```javascript
export const addTimelineEntry = async (orderId, action, staffId = null, data = {}) => {
  // ...
  const entry = {
    order_id: orderId,
    staff_id: staffId,
    user_id: data.userId || null,
    created_by_type: data.createdByType || (staffId ? 'staff' : 'system'),
    action: action,
    previous_status: data.previousStatus || null,
    new_status: data.newStatus || null,
    changes: data.changes || null,
    notes: data.notes || null
  }
  // ...
}
```

**Differenze Chiave:**
- `staffId` è il **secondo parametro** direttamente (STRING, non object)
- Logica `created_by_type` automatica: `staffId ? 'staff' : 'system'`
- Commento: "staff_name e staff_role_display vengono popolati automaticamente dal trigger"

**Funzione Formatting:**
```javascript
export const formatTimelineEntry = (entry) => {
  const actionLabels = {
    created: 'Ordine creato',
    confirmed: 'Ordine confermato',
    preparing: 'In preparazione',
    completed: 'Completato',
    cancelled: 'Annullato',
    updated: 'Ordine modificato',
    item_added: 'Prodotto aggiunto',
    item_removed: 'Prodotto rimosso',
    item_updated: 'Prodotto modificato',
    table_changed: 'Tavolo modificato'
  }

  // Determina nome operatore basato su created_by_type
  let operatorName = 'Sistema'
  let operatorRole = null

  if (entry.created_by_type === 'staff' || entry.created_by_type === 'owner') {
    operatorName = entry.staff_name || 'Staff'
    operatorRole = entry.staff_role_display || null
  } else if (entry.created_by_type === 'customer') {
    operatorName = 'Cliente Incognito'
    operatorRole = null
  }

  return {
    ...entry,
    actionLabel: actionLabels[entry.action] || entry.action,
    description,
    operatorName,
    operatorRole,
    operatorDisplay: operatorRole || operatorName, // ⚠️ Qui la logica display!
    formattedDate: new Date(entry.created_at).toLocaleString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}
```

**Problemi Identificati:**
- `operatorDisplay: operatorRole || operatorName` - mostra SOLO ruolo se disponibile
- Non concatena "da [Ruolo] - [Nome]" come utente si aspetta
- Non gestisce formati misti

#### 5. React Component - `TimelineView`

**File**: `src/utils/orderTimeline.jsx` (linee 214-271)

```javascript
function TimelineView({ orderId }) {
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTimeline()
  }, [orderId])

  const loadTimeline = async () => {
    // ... fetch da order_timeline
    const formatted = data.map(formatTimelineEntry)
    setTimeline(formatted)
  }

  return (
    <div style={styles.timeline}>
      {timeline.map((entry, index) => (
        <div key={entry.id} style={styles.timelineItem}>
          <div style={styles.timelineDot} />
          {index < timeline.length - 1 && <div style={styles.timelineLine} />}

          <div style={styles.timelineContent}>
            <div style={styles.timelineHeader}>
              <span style={styles.timelineAction}>{entry.actionLabel}</span>
              {entry.description && (
                <span style={styles.timelineDescription}>{entry.description}</span>
              )}
            </div>

            <div style={styles.timelineFooter}>
              <span style={styles.timelineOperator}>{entry.operatorDisplay}</span>
              <span style={styles.timelineDate}>{entry.formattedDate}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

**Problemi Identificati:**
- Nessun toggle per espandere dettagli
- Non mostra `changes` JSONB
- Non mostra fonte evento (tavolo/banco/ordini/public menu)
- Design non stile Klaviyo/Shopify

---

## 🎯 Root Cause Analysis

### Issue #1: Inconsistent Operator Display

**Root Cause:**
```javascript
// orderTimeline.jsx:127
operatorDisplay: operatorRole || operatorName
```

**Problema:**
- Se `operatorRole` esiste → mostra SOLO ruolo ("Proprietario", "Admin")
- Se `operatorRole` NULL → mostra SOLO nome ("Vincenzo Cassese")
- Nessuna logica per combinare entrambi ("da Admin - Vincenzo Cassese")

**Evidenza dal Timeline Utente:**
1. "Proprietario" → `operatorRole` = "Proprietario", `operatorName` = NULL/vuoto
2. "Vincenzo Cassese" → `operatorRole` = NULL, `operatorName` = "Vincenzo Cassese"
3. "da Admin - Proprietario" → Formato CORRETTO (probabilmente inserito manualmente o da logica diversa)

**Fix Richiesto:**
```javascript
// CORRETTO
operatorDisplay: operatorRole && operatorName
  ? `da ${operatorRole} - ${operatorName}`
  : operatorRole || operatorName || 'Sistema'
```

---

### Issue #2: Missing Event Source Tracking

**Root Cause:**
La tabella `order_timeline` **NON ha** una colonna per tracciare la fonte dell'evento.

**Richiesta Utente:**
> "Ti ricordo che gli eventi possono essere creati da tavolo, da banco, da ordini e da public menu."

**Eventi per Fonte:**

| Fonte | Descrizione | Eventi Tipici |
|-------|-------------|---------------|
| **Public Menu (QR)** | Cliente ordina da QR code | `created` (customer) |
| **Tavolo (Table)** | Staff apre tavolo | `created` (staff), `confirmed`, `item_added` |
| **Banco (Counter)** | Ordine da banco/asporto | `created` (staff), `completed` |
| **Ordini (Orders Page)** | Modifiche da sezione Ordini | `item_added`, `item_removed`, `cancelled` |
| **Cassa (Cashier)** | Operazioni cassa | `completed`, `preconto_generated` |

**Fix Richiesto:**
```sql
ALTER TABLE order_timeline
ADD COLUMN event_source VARCHAR(50) CHECK (event_source IN (
  'public_menu',  -- QR code cliente
  'table',        -- Gestione tavoli
  'counter',      -- Banco/asporto
  'orders_page',  -- Sezione Ordini
  'cashier'       -- Cassa
));
```

---

### Issue #3: No Expandable Details

**Root Cause:**
Il componente `TimelineView` mostra solo header/footer, non i dettagli in `changes` JSONB.

**Richiesta Utente:**
> "Ogni timestamp avrà un toggle di apertura per vedere cosa è accaduto."

**Dati Disponibili ma Non Mostrati:**

**Esempio `item_added` event:**
```json
{
  "changes": {
    "batch_number": 2,
    "items_count": 2,
    "products": [
      {"name": "Pizza Margherita", "qty": 1},
      {"name": "Coca Cola", "qty": 2}
    ]
  },
  "notes": "Aggiunti 2 prodotti (Batch #2)"
}
```

**Attualmente Mostrato:**
```
Prodotto aggiunto
Proprietario
27/10/2025, 15:14
```

**Dovrebbe Mostrare (con toggle):**
```
▼ Prodotto aggiunto                          [CLIC per espandere]
  da Admin - Vincenzo Cassese
  27/10/2025, 15:14

  [ESPANSO ▼]
  📦 Batch #2
  ✓ Pizza Margherita (x1)
  ✓ Coca Cola (x2)

  📍 Fonte: Sezione Ordini
  👤 Operatore: Vincenzo Cassese (Admin)
  🕐 Timestamp: 27 Ott 2025, 15:14:32
```

---

### Issue #4: Signature Mismatch Between Layers

**Root Cause:**
Doppia definizione di `addTimelineEntry()` con firme diverse.

**File 1**: `src/lib/ordersService.js`
```javascript
const addTimelineEntry = async (orderId, action, userInfo = {}, data = {})
```

**File 2**: `src/utils/orderTimeline.jsx`
```javascript
export const addTimelineEntry = async (orderId, action, staffId = null, data = {})
```

**Problema:**
- `ordersService.js` NON importa da `orderTimeline.jsx`
- Hanno la propria implementazione indipendente
- 8 su 9 chiamate in `ordersService.js` passano STRING invece di OBJECT

**Fix Richiesto:**
1. **Centralizzare** una singola implementazione
2. **Deprecare** firma vecchia con STRING
3. **Migrare** tutte le chiamate al nuovo formato OBJECT

---

### Issue #5: Owner Not Properly Tracked

**Root Cause:**
Nessuna chiamata a `addTimelineEntry()` passa `user_id` per il proprietario.

**Evidenza:**
```javascript
// src/lib/ordersService.js - TUTTE le chiamate:
await addTimelineEntry(orderId, 'confirmed', staffId, {...})
//                                           ^^^^^^^ STRING, non object con user_id
```

**Trigger Si Aspetta:**
```javascript
// Se user_id IS NOT NULL → owner
NEW.user_id IS NOT NULL
```

**Ma Codice Passa:**
```javascript
// SEMPRE NULL perché staffId è STRING, non { user_id: ... }
userInfo.user_id || null  // → sempre NULL
```

**Fix Richiesto:**
```javascript
// PRIMA (broken):
await addTimelineEntry(orderId, 'confirmed', staffId, {...})

// DOPO (fixed):
await addTimelineEntry(orderId, 'confirmed', {
  staff_id: staffId,
  user_id: isOwner ? currentUserId : null,
  staff_name: currentUserName
}, {...})
```

---

## 💡 Soluzione Proposta

### Phase 1: Database Schema Enhancement

#### 1.1 Aggiungi Event Source Column

**File**: `database/migrations/09_timeline_event_source.sql`

```sql
-- =====================================================
-- MIGRATION: Timeline Event Source Tracking
-- Data: 2025-10-27
-- Descrizione: Aggiunge tracking fonte evento
-- =====================================================

BEGIN;

-- Aggiungi colonna event_source
ALTER TABLE order_timeline
ADD COLUMN IF NOT EXISTS event_source VARCHAR(50) CHECK (event_source IN (
  'public_menu',    -- Cliente ordina da QR code
  'table_service',  -- Staff gestisce tavolo
  'counter',        -- Ordine banco/asporto
  'orders_page',    -- Modifiche da sezione Ordini
  'cashier',        -- Operazioni cassa
  'system'          -- Eventi automatici
));

-- Indice per analytics
CREATE INDEX IF NOT EXISTS idx_order_timeline_event_source
ON order_timeline(event_source, created_at)
WHERE event_source IS NOT NULL;

-- Default per record esistenti
UPDATE order_timeline
SET event_source = CASE
  WHEN created_by_type = 'customer' THEN 'public_menu'
  WHEN created_by_type = 'staff' THEN 'table_service'
  WHEN created_by_type = 'system' THEN 'system'
  ELSE 'table_service'
END
WHERE event_source IS NULL;

COMMIT;

-- Commento
COMMENT ON COLUMN order_timeline.event_source IS 'Fonte dell''evento: public_menu, table_service, counter, orders_page, cashier, system';
```

#### 1.2 Aggiungi Colonne per UI Enhancement

```sql
-- Aggiungi metadata per UI
ALTER TABLE order_timeline
ADD COLUMN IF NOT EXISTS is_expandable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS details_summary TEXT;

-- Indice per performance
CREATE INDEX IF NOT EXISTS idx_order_timeline_expandable
ON order_timeline(is_expandable)
WHERE is_expandable = true;

COMMENT ON COLUMN order_timeline.is_expandable IS 'Se true, evento ha dettagli espandibili';
COMMENT ON COLUMN order_timeline.details_summary IS 'Sommario dettagli per preview';
```

---

### Phase 2: Application Layer Refactor

#### 2.1 Centralizza Timeline Service

**File**: `src/lib/timelineService.js` (NUOVO)

```javascript
/**
 * timelineService.js
 * Servizio centralizzato per gestione timeline ordini
 *
 * SINGOLA FONTE DI VERITÀ per:
 * - Inserimento eventi timeline
 * - Formatting consistente
 * - Event source tracking
 */

import { supabase } from '../supabaseClient'

// ============================================
// EVENT SOURCES - Costanti
// ============================================

export const EVENT_SOURCE = {
  PUBLIC_MENU: 'public_menu',     // Cliente QR code
  TABLE_SERVICE: 'table_service', // Staff tavolo
  COUNTER: 'counter',             // Banco/asporto
  ORDERS_PAGE: 'orders_page',     // Sezione Ordini
  CASHIER: 'cashier',             // Cassa
  SYSTEM: 'system'                // Eventi automatici
}

// ============================================
// ACTION TYPES - Costanti
// ============================================

export const TIMELINE_ACTION = {
  CREATED: 'created',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  UPDATED: 'updated',
  ITEM_ADDED: 'item_added',
  ITEM_REMOVED: 'item_removed',
  ITEM_UPDATED: 'item_updated',
  TABLE_CHANGED: 'table_changed',
  PRECONTO_GENERATED: 'preconto_generated'
}

// ============================================
// OPERATOR INFO - Helper
// ============================================

/**
 * Costruisce userInfo object consistente
 * @param {object} params
 * @param {string} params.staffId - UUID staff member
 * @param {string} params.userId - UUID proprietario (auth.users)
 * @param {string} params.staffName - Nome operatore
 * @param {string} params.createdByType - 'staff', 'owner', 'customer', 'system'
 */
export const buildOperatorInfo = ({
  staffId = null,
  userId = null,
  staffName = null,
  createdByType = null
}) => {
  return {
    staff_id: staffId,
    user_id: userId,
    staff_name: staffName,
    created_by_type: createdByType
  }
}

// ============================================
// ADD TIMELINE ENTRY - Funzione Principale
// ============================================

/**
 * Aggiunge evento a timeline ordine
 *
 * NUOVA FIRMA CONSISTENTE (no più STRING staffId!)
 *
 * @param {object} params
 * @param {string} params.orderId - UUID ordine
 * @param {string} params.action - Azione (usa TIMELINE_ACTION constants)
 * @param {string} params.eventSource - Fonte evento (usa EVENT_SOURCE constants)
 * @param {object} params.operator - Info operatore (usa buildOperatorInfo)
 * @param {object} params.data - Dati aggiuntivi
 * @param {string} params.data.previousStatus - Status precedente
 * @param {string} params.data.newStatus - Nuovo status
 * @param {object} params.data.changes - Dettagli modifiche JSONB
 * @param {string} params.data.notes - Note testuali
 * @param {boolean} params.data.isExpandable - Se ha dettagli espandibili
 * @param {string} params.data.detailsSummary - Sommario per preview
 *
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const addTimelineEntry = async ({
  orderId,
  action,
  eventSource,
  operator = {},
  data = {}
}) => {
  try {
    // Validazione
    if (!orderId) throw new Error('orderId è richiesto')
    if (!action) throw new Error('action è richiesto')
    if (!eventSource) throw new Error('eventSource è richiesto')

    // Build entry
    const entry = {
      order_id: orderId,
      action: action,
      event_source: eventSource,

      // Operator info (trigger popolerà il resto)
      staff_id: operator.staff_id || null,
      user_id: operator.user_id || null,
      staff_name: operator.staff_name || null,
      created_by_type: operator.created_by_type || null,

      // Status transitions
      previous_status: data.previousStatus || null,
      new_status: data.newStatus || null,

      // Metadata
      changes: data.changes || null,
      notes: data.notes || null,
      is_expandable: data.isExpandable || false,
      details_summary: data.detailsSummary || null,

      created_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('order_timeline')
      .insert(entry)

    if (error) {
      console.error('[Timeline] Errore insert:', error)
      throw error
    }

    console.log(`✅ Timeline: ${action} | Source: ${eventSource} | Order: ${orderId}`)
    return { success: true }

  } catch (error) {
    console.error('[Timeline] Errore:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// FORMATTING - Consistente
// ============================================

/**
 * Formatta entry timeline per UI
 * LOGICA CONSISTENTE per operator display
 */
export const formatTimelineEntry = (entry) => {
  const actionLabels = {
    created: 'Ordine creato',
    confirmed: 'Ordine confermato',
    preparing: 'In preparazione',
    completed: 'Completato',
    cancelled: 'Annullato',
    updated: 'Ordine modificato',
    item_added: 'Prodotto aggiunto',
    item_removed: 'Prodotto rimosso',
    item_updated: 'Prodotto modificato',
    table_changed: 'Tavolo modificato',
    preconto_generated: 'Preconto generato'
  }

  const sourceLabels = {
    public_menu: '📱 Menu Pubblico (QR)',
    table_service: '🍽️ Servizio Tavoli',
    counter: '🏪 Banco',
    orders_page: '📋 Gestione Ordini',
    cashier: '💰 Cassa',
    system: '⚙️ Sistema'
  }

  // Operator Display - LOGICA CONSISTENTE
  let operatorDisplay = 'Sistema'

  if (entry.created_by_type === 'staff' || entry.created_by_type === 'owner') {
    const role = entry.staff_role_display
    const name = entry.staff_name

    // Formato: "da [Ruolo] - [Nome]"
    if (role && name) {
      operatorDisplay = `da ${role} - ${name}`
    } else if (role) {
      operatorDisplay = `da ${role}`
    } else if (name) {
      operatorDisplay = name
    } else {
      operatorDisplay = 'Staff'
    }
  } else if (entry.created_by_type === 'customer') {
    operatorDisplay = entry.staff_name || 'Cliente Incognito'
  }

  return {
    ...entry,
    actionLabel: actionLabels[entry.action] || entry.action,
    sourceLabel: sourceLabels[entry.event_source] || entry.event_source,
    operatorDisplay,
    formattedDate: new Date(entry.created_at).toLocaleString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }
}

// ============================================
// LOAD TIMELINE - Helper
// ============================================

/**
 * Carica timeline per ordine
 */
export const loadOrderTimeline = async (orderId) => {
  try {
    const { data, error } = await supabase
      .from('order_timeline')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return {
      success: true,
      data: data.map(formatTimelineEntry)
    }
  } catch (error) {
    console.error('[Timeline] Errore caricamento:', error)
    return {
      success: false,
      error: error.message,
      data: []
    }
  }
}
```

---

#### 2.2 Migra ordersService.js

**File**: `src/lib/ordersService.js`

```javascript
// IMPORT nuovo servizio centralizzato
import {
  addTimelineEntry,
  buildOperatorInfo,
  EVENT_SOURCE,
  TIMELINE_ACTION
} from './timelineService'

// ============================================
// RIMUOVI vecchia funzione addTimelineEntry
// ============================================
// const addTimelineEntry = async (...) { ... }  // ❌ DELETE

// ============================================
// AGGIORNA tutte le chiamate
// ============================================

// ESEMPIO 1: Ordine creato da cliente (QR menu)
// PRIMA (linea 153):
await addTimelineEntry(order.id, 'created', null, {
  createdByType: 'customer',
  newStatus: 'pending',
  notes: `Ordine creato dal cliente${customerName ? ` - ${customerName}` : ''}`,
  changes: { items_count: items.length, is_priority: isPriority }
})

// DOPO:
await addTimelineEntry({
  orderId: order.id,
  action: TIMELINE_ACTION.CREATED,
  eventSource: EVENT_SOURCE.PUBLIC_MENU,
  operator: buildOperatorInfo({
    createdByType: 'customer',
    staffName: customerName || 'Cliente Incognito'
  }),
  data: {
    newStatus: 'pending',
    notes: `Ordine creato dal cliente${customerName ? ` - ${customerName}` : ''}`,
    changes: {
      items_count: items.length,
      is_priority: isPriority
    },
    isExpandable: true,
    detailsSummary: `${items.length} prodotti${isPriority ? ' - PRIORITARIO' : ''}`
  }
})

// ESEMPIO 2: Ordine confermato da staff
// PRIMA (linea 385):
await addTimelineEntry(orderId, 'confirmed', staffId, {
  previousStatus: 'pending',
  newStatus: 'preparing',
  notes: 'Ordine confermato e messo in preparazione'
})

// DOPO:
await addTimelineEntry({
  orderId,
  action: TIMELINE_ACTION.CONFIRMED,
  eventSource: EVENT_SOURCE.TABLE_SERVICE,
  operator: buildOperatorInfo({
    staffId: staffId,
    createdByType: 'staff'
  }),
  data: {
    previousStatus: 'pending',
    newStatus: 'preparing',
    notes: 'Ordine confermato e messo in preparazione'
  }
})

// ESEMPIO 3: Prodotti aggiunti (con dettagli espandibili)
// PRIMA (linea 598):
await addTimelineEntry(orderId, 'item_added', staffId, {
  notes: `Aggiunti ${items.length} prodotti (Batch #${batchNumber})`,
  changes: {
    batch_number: batchNumber,
    items_count: items.length,
    products: items.map(i => ({ name: i.product_name, qty: i.quantity }))
  }
})

// DOPO:
await addTimelineEntry({
  orderId,
  action: TIMELINE_ACTION.ITEM_ADDED,
  eventSource: EVENT_SOURCE.ORDERS_PAGE, // o TABLE_SERVICE in base al contesto
  operator: buildOperatorInfo({
    staffId: staffId,
    createdByType: 'staff'
  }),
  data: {
    notes: `Aggiunti ${items.length} prodotti (Batch #${batchNumber})`,
    changes: {
      batch_number: batchNumber,
      items_count: items.length,
      products: items.map(i => ({
        name: i.product_name,
        qty: i.quantity,
        price: i.product_price
      }))
    },
    isExpandable: true,
    detailsSummary: items.map(i => `${i.product_name} (x${i.quantity})`).join(', ')
  }
})
```

---

### Phase 3: UI Enhancement - CRM-Style Timeline

#### 3.1 Enhanced Timeline Component

**File**: `src/components/TimelineCRM.jsx` (NUOVO)

```javascript
import React, { useState, useEffect } from 'react'
import { tokens } from '../styles/tokens'
import { loadOrderTimeline } from '../lib/timelineService'

/**
 * TimelineCRM - Klaviyo/Shopify Style Timeline
 *
 * Features:
 * - Expandable events con toggle
 * - Event source badge
 * - Consistent operator display
 * - Professional design
 */
function TimelineCRM({ orderId }) {
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState(new Set())

  useEffect(() => {
    loadTimeline()
  }, [orderId])

  const loadTimeline = async () => {
    setLoading(true)
    const result = await loadOrderTimeline(orderId)
    if (result.success) {
      setTimeline(result.data)
    }
    setLoading(false)
  }

  const toggleExpand = (eventId) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }

  if (loading) {
    return <div style={styles.loading}>Caricamento timeline...</div>
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Timeline Ordine</h3>

      <div style={styles.timeline}>
        {timeline.map((event, index) => {
          const isExpanded = expandedIds.has(event.id)
          const hasDetails = event.is_expandable && event.changes

          return (
            <div key={event.id} style={styles.eventWrapper}>
              {/* Dot + Line */}
              <div style={styles.leftColumn}>
                <div style={{
                  ...styles.dot,
                  backgroundColor: getDotColor(event.action)
                }} />
                {index < timeline.length - 1 && (
                  <div style={styles.line} />
                )}
              </div>

              {/* Content */}
              <div style={styles.eventCard}>
                {/* Header */}
                <div
                  style={{
                    ...styles.eventHeader,
                    cursor: hasDetails ? 'pointer' : 'default'
                  }}
                  onClick={() => hasDetails && toggleExpand(event.id)}
                >
                  <div style={styles.headerLeft}>
                    {hasDetails && (
                      <span style={styles.expandIcon}>
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    )}
                    <span style={styles.actionLabel}>
                      {event.actionLabel}
                    </span>
                    {event.sourceLabel && (
                      <span style={styles.sourceBadge}>
                        {event.sourceLabel}
                      </span>
                    )}
                  </div>
                  <span style={styles.timestamp}>
                    {event.formattedDate}
                  </span>
                </div>

                {/* Operator */}
                <div style={styles.operator}>
                  <span style={styles.operatorIcon}>👤</span>
                  <span style={styles.operatorText}>
                    {event.operatorDisplay}
                  </span>
                </div>

                {/* Notes (sempre visibili se presenti) */}
                {event.notes && (
                  <div style={styles.notes}>
                    {event.notes}
                  </div>
                )}

                {/* Dettagli Espandibili */}
                {hasDetails && isExpanded && (
                  <div style={styles.expandedDetails}>
                    {renderEventDetails(event)}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// HELPERS - Rendering
// ============================================

const getDotColor = (action) => {
  const colors = {
    created: tokens.colors.info.base,
    confirmed: tokens.colors.success.base,
    preparing: tokens.colors.warning.base,
    completed: tokens.colors.success.dark,
    cancelled: tokens.colors.error.base,
    item_added: tokens.colors.info.base,
    item_removed: tokens.colors.error.light,
    table_changed: tokens.colors.warning.base
  }
  return colors[action] || tokens.colors.gray[400]
}

const renderEventDetails = (event) => {
  const { changes, action } = event

  // Item Added
  if (action === 'item_added' && changes?.products) {
    return (
      <div style={styles.detailsSection}>
        <div style={styles.detailsTitle}>
          📦 Prodotti Aggiunti (Batch #{changes.batch_number})
        </div>
        <ul style={styles.productList}>
          {changes.products.map((p, i) => (
            <li key={i} style={styles.productItem}>
              <span style={styles.productName}>{p.name}</span>
              <span style={styles.productQty}>x{p.qty}</span>
              {p.price && (
                <span style={styles.productPrice}>
                  €{(p.price * p.qty).toFixed(2)}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  // Item Removed
  if (action === 'item_removed' && changes) {
    return (
      <div style={styles.detailsSection}>
        <div style={styles.detailsTitle}>🗑️ Prodotto Rimosso</div>
        <div style={styles.removalInfo}>
          <div>{changes.product_name}</div>
          <div>Quantità: {changes.quantity}</div>
          {changes.batch_number && (
            <div>Batch #{changes.batch_number}</div>
          )}
        </div>
      </div>
    )
  }

  // Table Changed
  if (action === 'table_changed' && changes) {
    return (
      <div style={styles.detailsSection}>
        <div style={styles.detailsTitle}>🔄 Cambio Tavolo</div>
        <div style={styles.tableChangeInfo}>
          <div style={styles.tableChangeRow}>
            <span style={styles.label}>Da:</span>
            <span>{changes.old_room_name} - Tavolo {changes.old_table_number}</span>
          </div>
          <div style={styles.tableChangeRow}>
            <span style={styles.label}>A:</span>
            <span>{changes.new_room_name} - Tavolo {changes.new_table_number}</span>
          </div>
        </div>
      </div>
    )
  }

  // Generic JSONB
  return (
    <div style={styles.detailsSection}>
      <div style={styles.detailsTitle}>📋 Dettagli</div>
      <pre style={styles.jsonDisplay}>
        {JSON.stringify(changes, null, 2)}
      </pre>
    </div>
  )
}

// ============================================
// STYLES - Klaviyo/Shopify Inspired
// ============================================

const styles = {
  container: {
    padding: tokens.spacing.lg,
    backgroundColor: tokens.colors.white
  },

  title: {
    fontSize: tokens.typography.fontSize.xl,
    fontWeight: tokens.typography.fontWeight.bold,
    marginBottom: tokens.spacing.lg,
    color: tokens.colors.gray[900]
  },

  loading: {
    textAlign: 'center',
    padding: tokens.spacing.xl,
    color: tokens.colors.gray[500]
  },

  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.md
  },

  eventWrapper: {
    display: 'flex',
    gap: tokens.spacing.md
  },

  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '24px'
  },

  dot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: `2px solid ${tokens.colors.white}`,
    boxShadow: '0 0 0 2px currentColor',
    flexShrink: 0
  },

  line: {
    width: '2px',
    flex: 1,
    backgroundColor: tokens.colors.gray[200],
    marginTop: tokens.spacing.xs,
    marginBottom: tokens.spacing.xs
  },

  eventCard: {
    flex: 1,
    backgroundColor: tokens.colors.gray[50],
    border: `1px solid ${tokens.colors.gray[200]}`,
    borderRadius: tokens.borderRadius.lg,
    padding: tokens.spacing.md,
    transition: 'all 0.2s ease'
  },

  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm
  },

  expandIcon: {
    fontSize: '10px',
    color: tokens.colors.gray[500],
    width: '12px'
  },

  actionLabel: {
    fontSize: tokens.typography.fontSize.md,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.gray[900]
  },

  sourceBadge: {
    fontSize: tokens.typography.fontSize.xs,
    padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
    backgroundColor: tokens.colors.info.light,
    color: tokens.colors.info.dark,
    borderRadius: tokens.borderRadius.full,
    fontWeight: tokens.typography.fontWeight.medium
  },

  timestamp: {
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.gray[500]
  },

  operator: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    marginTop: tokens.spacing.xs
  },

  operatorIcon: {
    fontSize: '14px'
  },

  operatorText: {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.gray[700],
    fontWeight: tokens.typography.fontWeight.medium
  },

  notes: {
    marginTop: tokens.spacing.sm,
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.gray[600],
    fontStyle: 'italic'
  },

  expandedDetails: {
    marginTop: tokens.spacing.md,
    paddingTop: tokens.spacing.md,
    borderTop: `1px solid ${tokens.colors.gray[300]}`
  },

  detailsSection: {
    marginBottom: tokens.spacing.md
  },

  detailsTitle: {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.semibold,
    marginBottom: tokens.spacing.sm,
    color: tokens.colors.gray[800]
  },

  productList: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  },

  productItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: tokens.spacing.sm,
    backgroundColor: tokens.colors.white,
    borderRadius: tokens.borderRadius.md,
    marginBottom: tokens.spacing.xs
  },

  productName: {
    flex: 1,
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.gray[900]
  },

  productQty: {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.gray[600],
    fontWeight: tokens.typography.fontWeight.medium,
    marginLeft: tokens.spacing.md
  },

  productPrice: {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.gray[900],
    fontWeight: tokens.typography.fontWeight.semibold,
    marginLeft: tokens.spacing.md
  },

  removalInfo: {
    padding: tokens.spacing.sm,
    backgroundColor: tokens.colors.error.light,
    borderRadius: tokens.borderRadius.md,
    fontSize: tokens.typography.fontSize.sm
  },

  tableChangeInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.xs,
    padding: tokens.spacing.sm,
    backgroundColor: tokens.colors.white,
    borderRadius: tokens.borderRadius.md
  },

  tableChangeRow: {
    display: 'flex',
    gap: tokens.spacing.md,
    fontSize: tokens.typography.fontSize.sm
  },

  label: {
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.gray[700],
    minWidth: '40px'
  },

  jsonDisplay: {
    backgroundColor: tokens.colors.gray[900],
    color: tokens.colors.gray[100],
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
    fontSize: tokens.typography.fontSize.xs,
    overflow: 'auto',
    maxHeight: '300px'
  }
}

export default TimelineCRM
```

---

## 📅 Piano di Implementazione

### Sprint 1: Foundation (Giorni 1-2)

#### Giorno 1: Database Migration
- [ ] Crea `database/migrations/09_timeline_event_source.sql`
- [ ] Aggiungi colonne `event_source`, `is_expandable`, `details_summary`
- [ ] Test migration su database development
- [ ] Update database schema documentation

#### Giorno 2: Timeline Service
- [ ] Crea `src/lib/timelineService.js` con nuova API
- [ ] Implementa constants (EVENT_SOURCE, TIMELINE_ACTION)
- [ ] Implementa `buildOperatorInfo()`
- [ ] Implementa `addTimelineEntry()` centralizzato
- [ ] Implementa `formatTimelineEntry()` con logica consistente
- [ ] Implementa `loadOrderTimeline()`
- [ ] Unit tests per service

---

### Sprint 2: Migration (Giorni 3-4)

#### Giorno 3: Refactor ordersService.js
- [ ] Import nuovo `timelineService`
- [ ] Rimuovi vecchia funzione `addTimelineEntry`
- [ ] Migra tutte le 9 chiamate:
  - [ ] Line 153: Customer order created
  - [ ] Line 246: Staff order created
  - [ ] Line 385: Order confirmed
  - [ ] Line 432: Order completed
  - [ ] Line 499: Order cancelled
  - [ ] Line 598: Items added
  - [ ] Line 684: Item removed
  - [ ] Line 993: Preconto generated
- [ ] Test completo flusso ordini

#### Giorno 4: Refactor Altri File
- [ ] Cerca tutti i file che usano `addTimelineEntry`
- [ ] ChangeTableModal.jsx - migra timeline insert
- [ ] Verifica non ci siano altre chiamate
- [ ] Test cross-component

---

### Sprint 3: UI Enhancement (Giorni 5-7)

#### Giorno 5: TimelineCRM Component
- [ ] Crea `src/components/TimelineCRM.jsx`
- [ ] Implementa layout base (dot + line + card)
- [ ] Implementa toggle expand/collapse
- [ ] Implementa event source badges
- [ ] Implementa operator display consistente

#### Giorno 6: Event Details Rendering
- [ ] Rendering `item_added` details
- [ ] Rendering `item_removed` details
- [ ] Rendering `table_changed` details
- [ ] Rendering generic JSONB fallback
- [ ] Styling finale Klaviyo/Shopify-style

#### Giorno 7: Integration
- [ ] Replace `TimelineView` con `TimelineCRM` in OrderDetailPage
- [ ] Test completo UI
- [ ] Responsive design mobile
- [ ] Performance optimization

---

### Sprint 4: Testing & Documentation (Giorni 8-9)

#### Giorno 8: Testing
- [ ] Test end-to-end tutti i flussi:
  - [ ] Ordine da QR (public_menu)
  - [ ] Ordine da tavolo (table_service)
  - [ ] Ordine da banco (counter)
  - [ ] Modifiche da Ordini (orders_page)
  - [ ] Completamento da Cassa (cashier)
- [ ] Test operator display consistency
- [ ] Test expandable details
- [ ] Bug fixing

#### Giorno 9: Documentation
- [ ] Update ORDER_OPERATIONS_GUIDE.md
- [ ] Update TIMELINE_EVENTS_REFERENCE.md
- [ ] Create TIMELINE_SERVICE_API.md (nuova API reference)
- [ ] Create MIGRATION_GUIDE_TIMELINE.md (guida per altri developer)
- [ ] Screenshot UI per docs

---

## 📊 Success Metrics

### Technical Metrics

- [ ] **100% Consistent Operator Display**
  - Formato: "da [Ruolo] - [Nome]" ovunque
  - Zero variazioni casuali

- [ ] **100% Event Source Tracking**
  - Tutti gli eventi hanno `event_source` popolato
  - Badge visibili nella UI

- [ ] **Expandable Events**
  - Eventi con `is_expandable = true` mostrano toggle
  - Dettagli JSONB renderizzati correttamente

- [ ] **Zero Breaking Changes**
  - Backward compatibility mantenuta
  - Nessuna chiamata fallisce

### User Experience Metrics

- [ ] **Professional Look**
  - UI simile a Klaviyo/Shopify
  - Feedback positivo da utente

- [ ] **Information Accessibility**
  - Tutti i dettagli accessibili con 1 click
  - Nessuna informazione nascosta

- [ ] **Performance**
  - Timeline carica in < 500ms
  - Smooth expand/collapse animations

---

## 🔗 Riferimenti

### File Analizzati

1. `database/migrations/supabase_orders_schema.sql` - Schema base order_timeline
2. `database/migrations/create_roles_system.sql` - Roles system e trigger
3. `database/migrations/FIX_TRIGGER_OWNER_DATA.sql` - Fix trigger owner
4. `database/migrations/add_staff_tracking_fields_SAFE.sql` - Staff tracking
5. `database/docs/TIMELINE_EVENTS_REFERENCE.md` - Timeline events reference
6. `src/lib/ordersService.js` - Main orders service
7. `src/utils/orderTimeline.jsx` - Timeline utility e component
8. `docs/ORDER_OPERATIONS_GUIDE.md` - Operations guide
9. `docs/BUGFIX_SESSION_27_10_2024.md` - Bug fix session log
10. `docs/FIX_CHANGE_TABLE_MODAL.md` - Change table fix

### Documentazione Correlata

- **CENTRALIZATION_SUMMARY.md** - Centralizzazione servizi
- **FUTURE_ROLES_SYSTEM.md** - Sistema ruoli futuro
- **SHOPIFY_FOR_RESTAURANTS_ANALYSIS.md** - Analisi CRM systems

---

## ✅ Checklist Pre-Implementation

Prima di iniziare l'implementazione, verifica:

- [ ] Database backup completo
- [ ] Development environment pronto
- [ ] Test database separato disponibile
- [ ] User approval per design UI
- [ ] Nessun deployment production pianificato durante sprint
- [ ] Team informato delle modifiche
- [ ] Documentazione esistente letta

---

## 📝 Note Finali

### Priorità

**🔴 CRITICO - Deve essere fatto:**
- Consistent operator display
- Event source tracking
- Migration tutte le chiamate

**🟡 IMPORTANTE - Altamente raccomandato:**
- Expandable events UI
- CRM-style design
- Comprehensive testing

**🟢 NICE-TO-HAVE - Se c'è tempo:**
- Advanced analytics views
- Export timeline to PDF
- Timeline filtering

### Rischi e Mitigazioni

**Rischio**: Breaking changes per chiamate esistenti
**Mitigazione**: Backward compatibility in timelineService

**Rischio**: Trigger database non funziona come atteso
**Mitigazione**: Test approfonditi su dev environment prima di production

**Rischio**: UI troppo complessa per mobile
**Mitigazione**: Design mobile-first, progressive enhancement

---

**Documento Creato**: 27 Ottobre 2025
**Ultima Modifica**: 27 Ottobre 2025
**Autore**: Claude Code (con supervisione utente)
**Status**: 📋 Planning Complete - Ready for Implementation
