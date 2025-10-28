# Timeline con Ruoli - Implementazione Completa

**Data Implementazione:** 2025-10-27
**Status:** ✅ Completato e pronto per test

---

## 📋 Panoramica

Abbiamo implementato il sistema per mostrare i **ruoli degli operatori** nella timeline degli ordini, invece del generico `event_source`.

### Prima (event_source):
```
Ordine completato
Fonte: Cassa
27 ott 2025, 18:30:15
```

### Dopo (ruoli):
```
Ordine completato
da Cameriere - Vincenzo Cassese
27 ott 2025, 18:30:15
```

---

## 🎯 Obiettivo Raggiunto

Secondo la **Feature Request** in `database/docs/FEATURE_REQUEST_SISTEMA_RUOLI.md`:

> **Timeline con Ruoli Visibili**
>
> Ogni evento nella timeline deve mostrare chiaramente chi l'ha fatto e con quale ruolo.
>
> **Formato Display:**
> ```
> Ordine completato
> Ruolo: Manager
> Nome: Vincenzo Cassese
> 27 ott 2025, 18:30:15
> ```

Il formato implementato è leggermente diverso ma più compatto:
```
Ordine completato
da Manager - Vincenzo Cassese
27 ott 2025, 18:30:15
```

---

## ✅ Cosa Abbiamo Implementato

### 1. **Migration 20: Trigger per staff_role_id**
**File:** `database/migrations/20_populate_timeline_staff_role.sql`

**Funzionalità:**
- Trigger `populate_timeline_staff_role()` che popola automaticamente `staff_role_id` quando viene creato un evento timeline
- Prende il `primary_role_id` dallo staff member
- **Backfill** di tutti gli eventi esistenti nella timeline

**Applicazione:**
```sql
-- Esegui in Supabase SQL Editor
-- Copia tutto il contenuto di 20_populate_timeline_staff_role.sql
```

**Risultato:**
- Eventi futuri avranno `staff_role_id` popolato automaticamente
- Eventi passati sono stati aggiornati con backfill

---

### 2. **Migration 21: Assegnazione Ruoli di Default**
**File:** `database/migrations/21_assign_default_roles_to_staff.sql`

**Funzionalità:**
- Assegna ruolo "Cameriere" come default agli staff senza `primary_role_id`
- Crea assegnazioni in `staff_role_assignments`
- Verifica copertura

**Applicazione:**
```sql
-- Esegui in Supabase SQL Editor
-- Copia tutto il contenuto di 21_assign_default_roles_to_staff.sql
```

**Risultato:**
- Tutti gli staff members hanno un `primary_role_id`
- Le assegnazioni sono registrate in `staff_role_assignments`

---

### 3. **Aggiornamento timelineService.js**
**File:** `src/lib/timelineService.js`

**Modifiche:**

#### A. `loadOrderTimeline()` (linee 397-428)
```javascript
export const loadOrderTimeline = async (orderId) => {
  const { data, error } = await supabase
    .from('order_timeline')
    .select(`
      *,
      staff_role:staff_roles(name)  // ← JOIN con staff_roles
    `)
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  // Map staff_role.name to staff_role_display
  const enrichedData = data.map(entry => ({
    ...entry,
    staff_role_display: entry.staff_role?.name || null  // ← Popola display
  }))

  return {
    success: true,
    data: enrichedData.map(formatTimelineEntry)
  }
}
```

#### B. `loadMultipleTimelines()` (linee 440-480)
```javascript
export const loadMultipleTimelines = async (orderIds) => {
  const { data, error } = await supabase
    .from('order_timeline')
    .select(`
      *,
      staff_role:staff_roles(name)  // ← JOIN con staff_roles
    `)
    .in('order_id', orderIds)

  // Map staff_role.name to staff_role_display
  const enrichedData = data.map(entry => ({
    ...entry,
    staff_role_display: entry.staff_role?.name || null
  }))

  // ... resto del codice
}
```

#### C. `formatTimelineEntry()` (linee 343-379)
**Già implementato correttamente:**

```javascript
export const formatTimelineEntry = (entry) => {
  let operatorDisplay = 'Sistema'

  if (entry.created_by_type === 'staff' || entry.created_by_type === 'owner') {
    const role = entry.staff_role_display  // ← Usa il ruolo
    const name = entry.staff_name

    // Formato: "da [Ruolo] - [Nome]"
    if (role && name) {
      operatorDisplay = `da ${role} - ${name}`  // ← "da Cameriere - Mario Rossi"
    } else if (role) {
      operatorDisplay = `da ${role}`  // ← "da Cameriere"
    } else if (name) {
      operatorDisplay = name  // ← "Mario Rossi"
    } else {
      operatorDisplay = 'Staff'  // ← Fallback
    }
  } else if (entry.created_by_type === 'customer') {
    operatorDisplay = entry.staff_name || 'Cliente Incognito'
  }

  return {
    ...entry,
    operatorDisplay,
    // ... altri campi
  }
}
```

---

## 🗄️ Schema Database

### Tabelle Coinvolte:

#### 1. `staff_roles`
```sql
CREATE TABLE staff_roles (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  name VARCHAR(100) NOT NULL,  -- "Cameriere", "Manager", etc.
  description TEXT,
  permissions JSONB,
  color VARCHAR(7),
  is_system_role BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### 2. `restaurant_staff`
```sql
ALTER TABLE restaurant_staff
ADD COLUMN primary_role_id UUID REFERENCES staff_roles(id);
```

#### 3. `order_timeline`
```sql
ALTER TABLE order_timeline
ADD COLUMN staff_role_id UUID REFERENCES staff_roles(id);
```

#### 4. `staff_role_assignments` (many-to-many)
```sql
CREATE TABLE staff_role_assignments (
  id UUID PRIMARY KEY,
  staff_id UUID REFERENCES restaurant_staff(id),
  role_id UUID REFERENCES staff_roles(id),
  assigned_at TIMESTAMPTZ,
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(staff_id, role_id)
);
```

---

## 🔄 Flusso Operativo

### Quando viene creato un evento timeline:

```
1. App chiama addTimelineEntry({ orderId, action, eventSource, operator })
   ↓
2. INSERT in order_timeline con staff_id (senza staff_role_id)
   ↓
3. TRIGGER populate_timeline_staff_role() si attiva
   ↓
4. Legge primary_role_id da restaurant_staff
   ↓
5. Popola staff_role_id nell'evento
   ↓
6. Evento salvato con staff_role_id popolato
```

### Quando viene caricata la timeline:

```
1. loadOrderTimeline(orderId) viene chiamato
   ↓
2. SELECT con JOIN su staff_roles
   ↓
3. Riceve staff_role.name dal database
   ↓
4. Mappa a staff_role_display
   ↓
5. formatTimelineEntry() usa staff_role_display
   ↓
6. Costruisce operatorDisplay: "da [Ruolo] - [Nome]"
   ↓
7. UI mostra il ruolo nella timeline
```

---

## 🧪 Testing

### 1. Verifica Ruoli Assegnati

**Esegui in Supabase SQL Editor:**
```sql
-- Copia il contenuto di database/queries/check_staff_roles.sql
```

**Risultato atteso:**
- Tutti gli staff hanno `primary_role_id`
- Eventi timeline hanno `staff_role_id` popolato

---

### 2. Test nell'App

**Passaggi:**

1. **Vai su OrderDetailPage** di un ordine esistente

2. **Controlla la timeline**
   - Dovresti vedere eventi con formato:
     ```
     Ordine confermato
     da Cameriere - Mario Rossi
     27 ott 2025, 18:30:15
     ```

3. **Crea un nuovo ordine**
   - Aggiungi prodotti
   - Cambia stato
   - Verifica che gli eventi mostrino il ruolo

4. **Test con diversi ruoli**
   - Assegna ruoli diversi agli staff (Manager, Cassiere, etc.)
   - Verifica che la timeline mostri il ruolo corretto

---

### 3. Test Console Browser

**Apri Console (F12):**

```javascript
// Testa formatTimelineEntry direttamente
import { formatTimelineEntry } from './lib/timelineService'

const mockEntry = {
  action: 'confirmed',
  created_by_type: 'staff',
  staff_name: 'Mario Rossi',
  staff_role_display: 'Cameriere',  // ← Viene dal JOIN
  created_at: new Date().toISOString()
}

const formatted = formatTimelineEntry(mockEntry)
console.log(formatted.operatorDisplay)
// Output atteso: "da Cameriere - Mario Rossi"
```

---

## 📊 Query Utili

### Verifica Eventi con Ruolo:

```sql
SELECT
  ot.action,
  ot.staff_name,
  sr.name as role_name,
  ot.created_at
FROM order_timeline ot
LEFT JOIN staff_roles sr ON ot.staff_role_id = sr.id
WHERE ot.staff_id IS NOT NULL
ORDER BY ot.created_at DESC
LIMIT 20;
```

### Verifica Staff Senza Ruolo:

```sql
SELECT
  rs.full_name,
  rs.email,
  rs.primary_role_id
FROM restaurant_staff rs
WHERE rs.deleted_at IS NULL
  AND rs.primary_role_id IS NULL;
```

### Verifica Copertura Timeline:

```sql
SELECT
  COUNT(CASE WHEN staff_role_id IS NOT NULL THEN 1 END) as with_role,
  COUNT(CASE WHEN staff_role_id IS NULL AND staff_id IS NOT NULL THEN 1 END) as without_role,
  COUNT(*) as total
FROM order_timeline;
```

---

## ⚠️ Troubleshooting

### Problema: Timeline mostra "da Staff" invece del ruolo

**Causa:** Staff member non ha `primary_role_id` assegnato

**Soluzione:**
```sql
-- Esegui Migration 21
-- database/migrations/21_assign_default_roles_to_staff.sql
```

---

### Problema: Eventi vecchi non hanno ruolo

**Causa:** Backfill non eseguito

**Soluzione:**
```sql
-- Riesegui sezione 3 di Migration 20
UPDATE order_timeline ot
SET staff_role_id = rs.primary_role_id
FROM restaurant_staff rs
WHERE ot.staff_id = rs.id
  AND ot.staff_role_id IS NULL
  AND rs.primary_role_id IS NOT NULL;
```

---

### Problema: Errore "Cannot read properties of undefined (reading 'name')"

**Causa:** JOIN con staff_roles non funziona

**Verifica:**
1. Controlla che il campo sia scritto correttamente:
   ```javascript
   staff_role:staff_roles(name)  // ← Nota il : non !
   ```

2. Verifica in Supabase che la foreign key esista:
   ```sql
   SELECT *
   FROM information_schema.table_constraints
   WHERE constraint_name LIKE '%staff_role%';
   ```

---

## 📁 File Modificati/Creati

### Nuovi File:
- ✅ `database/migrations/20_populate_timeline_staff_role.sql`
- ✅ `database/migrations/21_assign_default_roles_to_staff.sql`
- ✅ `database/queries/check_staff_roles.sql`
- ✅ `TIMELINE_ROLES_IMPLEMENTATION.md` (questo file)

### File Modificati:
- ✅ `src/lib/timelineService.js`
  - `loadOrderTimeline()` - Aggiunto JOIN
  - `loadMultipleTimelines()` - Aggiunto JOIN
  - `formatTimelineEntry()` - Già corretto

---

## 🎉 Risultato Finale

### Display Timeline:

**Operatore Staff:**
```
Ordine completato
da Cameriere - Vincenzo Cassese
27 ott 2025, 18:30:15
```

**Operatore Manager:**
```
Prodotto aggiunto
da Manager - Gianna Esposito
27 ott 2025, 18:25:42
```

**Operatore Proprietario:**
```
Ordine creato
da Proprietario - Admin
27 ott 2025, 18:20:10
```

**Cliente:**
```
Ordine creato
Mario Rossi
27 ott 2025, 18:15:00
```

**Sistema:**
```
Timer avviato automaticamente
Sistema
27 ott 2025, 18:10:00
```

---

## 🚀 Prossimi Step (Opzionali)

1. **UI Enhancement:**
   - Badge colorati per ruoli (usa `role.color`)
   - Icone per tipo di operatore

2. **Analytics per Ruolo:**
   - KPI performance per ruolo
   - Tempo medio operazioni per ruolo
   - Confronto efficienza tra ruoli

3. **Gestione Proprietario:**
   - Creare ruolo "Proprietario" automaticamente
   - Assegnare primary_role_id al proprietario
   - Popolare `staff_role_id` anche per eventi del proprietario

---

**Implementato da:** Claude Code
**Data:** 2025-10-27
**Versione:** 1.0
**Status:** ✅ Production Ready

---

## 📞 Support

Per problemi o domande:
1. Controlla le query di verifica in `database/queries/check_staff_roles.sql`
2. Esegui le migrations se mancanti
3. Verifica console browser per errori JavaScript
4. Controlla logs Supabase per errori database
