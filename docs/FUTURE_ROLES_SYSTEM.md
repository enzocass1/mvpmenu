# Sistema Ruoli - Pianificazione Futura

**Status**: 📋 Pianificato (Non Implementato)
**Priority**: 🟡 Medium (Dopo MVP)
**Created**: 27 Ottobre 2025

---

## 🎯 Obiettivo

Implementare un sistema di **ruoli e permessi** che permetta di controllare chi può fare cosa nel sistema MVP Menu.

---

## 👥 Ruoli Pianificati

### 1. Proprietario (Owner)
**Accesso**: Dashboard completa
**Permessi**: TUTTO

- ✅ Gestione ristorante (impostazioni, menu, prodotti)
- ✅ Gestione staff (crea/modifica/elimina staff)
- ✅ Gestione ordini (crea, conferma, modifica, elimina)
- ✅ Gestione tavoli e sale
- ✅ Analytics e report
- ✅ Impostazioni fiscali e pagamenti
- ✅ Gestione clienti e loyalty

### 2. Manager
**Accesso**: Dashboard completa (limitata)
**Permessi**: Gestione operativa

- ✅ Visualizza ordini (tutti)
- ✅ Conferma ordini
- ✅ Modifica ordini
- ✅ Elimina ordini (solo pending/preparing)
- ✅ Gestione tavoli (apertura/chiusura)
- ✅ Gestione turni staff
- ❌ Modifica impostazioni ristorante
- ❌ Gestione staff (solo visualizzazione)
- ❌ Impostazioni fiscali

### 3. Cameriere (Waiter)
**Accesso**: Dashboard basilare
**Permessi**: Solo ordini e tavoli

- ✅ Visualizza ordini assegnati a lui
- ✅ Crea nuovi ordini
- ✅ Modifica ordini propri (prima della conferma)
- ✅ Conferma ordini
- ✅ Gestione tavoli (apertura/chiusura)
- ❌ Elimina ordini
- ❌ Visualizza ordini di altri camerieri
- ❌ Accesso analytics
- ❌ Modifica prezzi

### 4. Cucina (Kitchen)
**Accesso**: Kitchen Display System (KDS)
**Permessi**: Solo visualizzazione e preparazione

- ✅ Visualizza ordini in preparazione
- ✅ Marca items come preparati
- ✅ Notifica ordini pronti
- ❌ Modifica ordini
- ❌ Visualizza prezzi
- ❌ Accesso dashboard

### 5. Cassa (Cashier)
**Accesso**: POS limitato
**Permessi**: Solo chiusura ordini

- ✅ Visualizza ordini pronti
- ✅ Chiudi ordini (completed)
- ✅ Genera scontrini/ricevute
- ✅ Visualizza totali
- ❌ Modifica ordini
- ❌ Elimina ordini
- ❌ Accesso impostazioni

---

## 🔐 Matrice Permessi

| Operazione | Owner | Manager | Waiter | Kitchen | Cashier |
|-----------|-------|---------|--------|---------|---------|
| **ORDINI** |
| Crea ordine | ✅ | ✅ | ✅ | ❌ | ❌ |
| Visualizza ordini (tutti) | ✅ | ✅ | ❌* | ❌* | ❌* |
| Visualizza ordini propri | ✅ | ✅ | ✅ | ✅ | ✅ |
| Conferma ordine | ✅ | ✅ | ✅ | ❌ | ❌ |
| Modifica ordine | ✅ | ✅ | ✅** | ❌ | ❌ |
| Elimina ordine | ✅ | ✅*** | ❌ | ❌ | ❌ |
| Chiudi ordine (pagamento) | ✅ | ✅ | ❌ | ❌ | ✅ |
| **TAVOLI** |
| Gestione sale | ✅ | ✅ | ❌ | ❌ | ❌ |
| Apri/Chiudi tavolo | ✅ | ✅ | ✅ | ❌ | ❌ |
| Cambia tavolo | ✅ | ✅ | ✅ | ❌ | ❌ |
| **MENU** |
| Modifica menu | ✅ | ❌ | ❌ | ❌ | ❌ |
| Modifica prezzi | ✅ | ❌ | ❌ | ❌ | ❌ |
| **STAFF** |
| Gestione staff | ✅ | ❌ | ❌ | ❌ | ❌ |
| Visualizza staff | ✅ | ✅ | ❌ | ❌ | ❌ |
| **ANALYTICS** |
| Visualizza report | ✅ | ✅ | ❌ | ❌ | ❌ |
| Esporta dati | ✅ | ❌ | ❌ | ❌ | ❌ |

\* = Solo ordini relativi al proprio turno/area
\** = Solo prima della conferma
\*** = Solo ordini pending/preparing, non completed

---

## 🏗️ Architettura Tecnica

### Database Schema

```sql
-- Tabella ruoli (già esistente: restaurant_staff.role)
-- Estendere con nuova tabella roles

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL, -- 'owner', 'manager', 'waiter', 'kitchen', 'cashier'
  display_name VARCHAR(100) NOT NULL, -- 'Proprietario', 'Manager', 'Cameriere', etc.
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array di permessi
  is_system_role BOOLEAN DEFAULT false, -- Ruoli predefiniti non modificabili
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(restaurant_id, name)
);

-- Tabella permessi
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE, -- 'orders.create', 'orders.delete', etc.
  display_name VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'orders', 'tables', 'menu', 'staff', 'analytics'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Relazione staff → role
ALTER TABLE restaurant_staff
ADD COLUMN role_id UUID REFERENCES roles(id) ON DELETE SET NULL;

-- Backward compatibility: mantenere anche 'role' VARCHAR per transizione
```

### Permessi Chiave

```javascript
const PERMISSIONS = {
  // Orders
  ORDERS_VIEW_ALL: 'orders.view_all',
  ORDERS_VIEW_OWN: 'orders.view_own',
  ORDERS_CREATE: 'orders.create',
  ORDERS_CONFIRM: 'orders.confirm',
  ORDERS_UPDATE: 'orders.update',
  ORDERS_DELETE: 'orders.delete',
  ORDERS_COMPLETE: 'orders.complete',

  // Tables
  TABLES_MANAGE: 'tables.manage',
  TABLES_OPEN: 'tables.open',
  TABLES_CLOSE: 'tables.close',
  TABLES_CHANGE: 'tables.change',

  // Menu
  MENU_VIEW: 'menu.view',
  MENU_UPDATE: 'menu.update',
  MENU_PRICES: 'menu.prices',

  // Staff
  STAFF_MANAGE: 'staff.manage',
  STAFF_VIEW: 'staff.view',

  // Analytics
  ANALYTICS_VIEW: 'analytics.view',
  ANALYTICS_EXPORT: 'analytics.export',

  // Settings
  SETTINGS_RESTAURANT: 'settings.restaurant',
  SETTINGS_FISCAL: 'settings.fiscal',
  SETTINGS_PAYMENTS: 'settings.payments'
}
```

---

## 🔧 Implementazione

### Fase 1: Database Setup

```sql
-- 1. Crea tabella roles con ruoli predefiniti
INSERT INTO roles (restaurant_id, name, display_name, permissions, is_system_role)
SELECT
  id as restaurant_id,
  'owner' as name,
  'Proprietario' as display_name,
  '["*"]'::jsonb as permissions, -- Tutti i permessi
  true as is_system_role
FROM restaurants;

-- Ripeti per manager, waiter, kitchen, cashier
```

### Fase 2: Servizio Permessi

**File**: `src/lib/permissionsService.js`

```javascript
/**
 * Controlla se l'utente ha un permesso specifico
 * @param {object} user - Oggetto utente con role_id
 * @param {string} permission - Permesso da controllare
 * @returns {Promise<boolean>}
 */
export const hasPermission = async (user, permission) => {
  // Owner ha sempre tutti i permessi
  if (user.is_owner) return true

  // Carica role con permessi
  const { data: role } = await supabase
    .from('roles')
    .select('permissions')
    .eq('id', user.role_id)
    .single()

  if (!role) return false

  // Wildcard '*' = tutti i permessi
  if (role.permissions.includes('*')) return true

  // Check permesso specifico
  return role.permissions.includes(permission)
}

/**
 * Middleware per proteggere funzioni
 */
export const requirePermission = (permission) => {
  return async (user, ...args) => {
    const allowed = await hasPermission(user, permission)
    if (!allowed) {
      throw new Error(`Permesso negato: ${permission}`)
    }
    // Continua con la funzione originale
  }
}
```

### Fase 3: Refactor ordersService.js

```javascript
import { hasPermission, PERMISSIONS } from './permissionsService'

export const confirmOrder = async (orderId, staffSession) => {
  // Check permessi
  if (staffSession && !staffSession.is_owner) {
    const canConfirm = await hasPermission(staffSession, PERMISSIONS.ORDERS_CONFIRM)
    if (!canConfirm) {
      return { success: false, error: 'Non hai i permessi per confermare ordini' }
    }
  }

  // ... resto della logica
}
```

### Fase 4: UI Guards

```javascript
// In OrderDetailPage.jsx
import { hasPermission, PERMISSIONS } from '../lib/permissionsService'

function OrderDetailPage({ session }) {
  const [canDelete, setCanDelete] = useState(false)
  const [canModify, setCanModify] = useState(false)

  useEffect(() => {
    const checkPermissions = async () => {
      setCanDelete(await hasPermission(session, PERMISSIONS.ORDERS_DELETE))
      setCanModify(await hasPermission(session, PERMISSIONS.ORDERS_UPDATE))
    }
    checkPermissions()
  }, [session])

  return (
    // ...
    {canDelete && (
      <Button onClick={deleteOrder}>Elimina Ordine</Button>
    )}
  )
}
```

---

## 🎨 UI/UX Considerations

### Dashboard Adaptivo

```javascript
const getDashboardLayout = (role) => {
  switch(role) {
    case 'owner':
    case 'manager':
      return 'full' // Dashboard completa con sidebar

    case 'waiter':
      return 'simplified' // Solo Cassa + Ordini

    case 'kitchen':
      return 'kds' // Kitchen Display System fullscreen

    case 'cashier':
      return 'pos' // POS semplificato

    default:
      return 'full'
  }
}
```

### Sidebar Menu

```javascript
const getSidebarItems = (permissions) => {
  const items = []

  if (permissions.includes('orders.view_all')) {
    items.push({ label: 'Ordini', path: '/ordini' })
  }

  if (permissions.includes('tables.manage')) {
    items.push({ label: 'Cassa', path: '/cassa' })
  }

  if (permissions.includes('analytics.view')) {
    items.push({ label: 'Analytics', path: '/analytics' })
  }

  // ... etc
  return items
}
```

---

## 📝 Migration Path

### Step 1: Preparazione (COMPLETATO ✅)
- ✅ Tutte le funzioni usano servizio centralizzato
- ✅ `modified_by_staff_id` gestito correttamente (NULL per owner)
- ✅ Timeline tracking per tutte le operazioni

### Step 2: Database Schema (TODO)
- Crea tabelle `roles` e `permissions`
- Popola ruoli predefiniti
- Migra `restaurant_staff.role` → `role_id`

### Step 3: Servizio Permessi (TODO)
- Crea `permissionsService.js`
- Implementa `hasPermission()` e `requirePermission()`

### Step 4: Refactor Services (TODO)
- Aggiungi controlli permessi a `ordersService.js`
- Aggiungi controlli permessi a `orderOperations.js`
- Wrapper per tutte le operazioni CRUD

### Step 5: UI Guards (TODO)
- Nascondi pulsanti basati su permessi
- Mostra messaggi "Permesso negato"
- Dashboard adaptivo per ruolo

### Step 6: Testing (TODO)
- Test con ogni ruolo
- Test transizioni permessi
- Test edge cases

---

## ⚠️ Note Implementazione ATTUALI

### Codice Preparato per Ruoli

Tutti i servizi sono già strutturati per accettare `staffSession`:

```javascript
// orderOperations.js
export const softDeleteOrder = async (orderId, session, restaurant) => {
  // Determina automaticamente se owner o staff
  const staffId = getStaffIdForModification(session, restaurant)
  // ... resto logica
}

// ordersService.js
export const confirmOrder = async (orderId, staffId) => {
  // staffId può essere:
  // - null = proprietario
  // - UUID = staff member
  // FUTURO: Aggiungeremo controllo permessi qui
}
```

### Placeholder TODO nel Codice

Cerca questi commenti per trovare dove aggiungere controlli permessi:

```javascript
// TODO: Quando implementeremo sistema ruoli, passare staff_id qui
// TODO: Check permission ORDERS_DELETE
// TODO: Check permission ORDERS_UPDATE
```

---

## 🚀 Vantaggi Sistema Ruoli

1. **Sicurezza**: Controllo granulare chi può fare cosa
2. **Flessibilità**: Proprietario può creare ruoli custom
3. **Audit**: Tracking completo di chi ha fatto ogni azione
4. **Scalabilità**: Supporta team grandi con ruoli multipli
5. **Compliance**: Richiesto per certificazioni (es. ISO, PCI-DSS)

---

## 📊 Priorità Implementazione

| Fase | Priority | Effort | Impact |
|------|----------|--------|--------|
| Database Schema | 🔴 High | Medium | High |
| Servizio Permessi | 🔴 High | Medium | High |
| Refactor Services | 🟡 Medium | High | High |
| UI Guards | 🟡 Medium | Medium | Medium |
| Dashboard Adaptivo | 🟢 Low | High | Low |

---

**Next Review**: Dopo completamento MVP base
**Owner**: Da definire
**Estimated Time**: 2-3 settimane

---

## 📚 Risorse

- [Role-Based Access Control (RBAC) - Wikipedia](https://en.wikipedia.org/wiki/Role-based_access_control)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Permission Models Comparison](https://docs.permit.io/concepts/rbac/)
