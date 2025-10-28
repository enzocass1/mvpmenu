# Feature Request: Sistema Ruoli Completo

**Data Richiesta**: 27 Ottobre 2025
**Priorità**: Media
**Status**: Pianificato (non ancora implementato)

---

## 📋 Descrizione Generale

Implementare un sistema completo di gestione ruoli e permessi per lo staff del ristorante, simile a **Shopify** / **Discord** / **Forum Management Systems**.

### Obiettivo
Permettere al **proprietario/admin** del ristorante di:
1. Creare ruoli custom con nomi personalizzati
2. Assegnare funzioni/permessi a ciascun ruolo
3. Assegnare uno o più ruoli ai membri dello staff
4. Tracciare nella timeline chi ha fatto cosa con il proprio ruolo visibile

---

## 🎯 Requisiti Funzionali

### 1. Gestione Ruoli (Amministratore)
**Chi può accedere**: Solo il proprietario/admin dell'account

**Funzionalità**:
- ✅ Creare nuovi ruoli con nomi custom (es: "Manager", "Cameriere", "Cuoco", "Cassiere", "Barista", ecc.)
- ✅ Modificare nome e permessi dei ruoli esistenti
- ✅ Eliminare ruoli (soft delete se ci sono membri assegnati)
- ✅ Ordinare ruoli per gerarchia (drag & drop opzionale)
- ✅ Duplicare ruoli (per creare varianti simili)

**Permessi Assegnabili**:
Ogni ruolo può avere uno o più permessi tra:

#### A. Gestione Ordini
- `orders.view` - Visualizzare ordini
- `orders.create` - Creare nuovi ordini
- `orders.edit` - Modificare ordini esistenti
- `orders.confirm` - Confermare ordini (pending → preparing)
- `orders.delete` - Eliminare ordini
- `orders.add_products` - Aggiungere prodotti a ordini in preparazione

#### B. Gestione Tavoli
- `tables.view` - Visualizzare stato tavoli
- `tables.open` - Aprire tavoli
- `tables.change` - Cambiare tavolo di un ordine
- `tables.close` - Chiudere tavoli (completare ordini)

#### C. Gestione Cassa
- `cashier.access` - Accedere alla cassa
- `cashier.close_orders` - Chiudere ordini dalla cassa
- `cashier.print_receipt` - Stampare scontrini
- `cashier.generate_preconto` - Generare preconti

#### D. Gestione Prodotti
- `products.view` - Visualizzare prodotti
- `products.create` - Creare nuovi prodotti
- `products.edit` - Modificare prodotti
- `products.delete` - Eliminare prodotti
- `products.manage_categories` - Gestire categorie

#### E. Gestione Staff
- `staff.view` - Visualizzare lista staff
- `staff.create` - Creare nuovi membri staff
- `staff.edit` - Modificare membri staff
- `staff.delete` - Eliminare membri staff
- `staff.manage_roles` - Gestire ruoli (solo admin)

#### F. Gestione Ristorante
- `restaurant.view_analytics` - Visualizzare analytics e KPI
- `restaurant.edit_settings` - Modificare impostazioni ristorante
- `restaurant.manage_rooms_tables` - Gestire sale e tavoli

#### G. Gestione Clienti
- `customers.view` - Visualizzare lista clienti
- `customers.edit` - Modificare dati clienti
- `customers.delete` - Eliminare clienti

---

### 2. Gestione Membri Staff

**Chi può accedere**: Proprietario/admin + chi ha permesso `staff.view`

**Funzionalità**:
- ✅ Invitare nuovi membri staff tramite email
- ✅ Assegnare uno o più ruoli a ciascun membro
- ✅ Modificare ruoli assegnati in qualsiasi momento
- ✅ Disattivare/riattivare membri (soft delete)
- ✅ Eliminare membri permanentemente (hard delete)
- ✅ Visualizzare storico attività di ciascun membro

**Informazioni Membro**:
```json
{
  "id": "uuid",
  "email": "staff@email.com",
  "nome": "Mario",
  "cognome": "Rossi",
  "telefono": "+39 333 1234567",
  "roles": ["manager_role_id", "cashier_role_id"],
  "created_at": "2025-10-27T10:00:00Z",
  "invited_by": "admin_user_id",
  "status": "active" | "inactive" | "pending_invitation"
}
```

---

### 3. Timeline con Ruoli Visibili

**Obiettivo**: Ogni evento nella timeline deve mostrare chiaramente chi l'ha fatto e con quale ruolo.

**Formato Display**:
```
Ordine completato
Ruolo: Manager
Nome: Vincenzo Cassese
27 ott 2025, 18:30:15
```

```
Prodotto aggiunto
Ruolo: Cameriere
Nome: Gianna Esposito
27 ott 2025, 18:25:42
```

```
Ordine creato
Ruolo: Proprietario
Nome: Admin
27 ott 2025, 18:20:10
```

**Regole**:
- Se utente ha 1 ruolo → mostra quel ruolo
- Se utente ha più ruoli → mostra il ruolo "principale" (il primo assegnato o quello con priorità più alta)
- Se è il proprietario → mostra sempre "Proprietario"
- L'`event_source` tecnico (cassa, tavoli, ecc.) rimane nel database ma NON viene mostrato nella UI

---

## 🗄️ Schema Database Proposto

### Tabella: `staff_roles`
```sql
CREATE TABLE staff_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, -- "Manager", "Cameriere", "Cuoco", etc.
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]', -- Array di stringhe: ["orders.view", "orders.create", ...]
  color VARCHAR(7), -- Hex color per UI (es: "#3B82F6")
  priority INTEGER DEFAULT 0, -- Per ordinamento gerarchico
  is_system_role BOOLEAN DEFAULT FALSE, -- TRUE per ruoli predefiniti (Proprietario, Admin)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, -- Soft delete

  UNIQUE(restaurant_id, name)
);

CREATE INDEX idx_staff_roles_restaurant ON staff_roles(restaurant_id) WHERE deleted_at IS NULL;
```

### Tabella: `staff_role_assignments`
```sql
CREATE TABLE staff_role_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES restaurant_staff(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES staff_roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id), -- Chi ha assegnato il ruolo

  UNIQUE(staff_id, role_id)
);

CREATE INDEX idx_staff_role_assignments_staff ON staff_role_assignments(staff_id);
CREATE INDEX idx_staff_role_assignments_role ON staff_role_assignments(role_id);
```

### Modifiche Tabella: `restaurant_staff`
```sql
-- Aggiungi colonna per ruolo primario (per performance)
ALTER TABLE restaurant_staff
ADD COLUMN primary_role_id UUID REFERENCES staff_roles(id) ON DELETE SET NULL;

-- Il ruolo primario è quello mostrato nella timeline
-- Se NULL, lo staff non ha ruoli assegnati (solo accesso base)
```

### Modifiche Tabella: `order_timeline`
```sql
-- Aggiungi colonna per ruolo usato nell'azione
ALTER TABLE order_timeline
ADD COLUMN staff_role_id UUID REFERENCES staff_roles(id) ON DELETE SET NULL;

-- Quando si crea un evento timeline, salvare il ruolo primario dello staff in quel momento
-- Questo permette di tracciare il ruolo anche se viene cambiato successivamente
```

---

## 🎨 UI Proposta

### 1. Pagina Gestione Ruoli (`/impostazioni/ruoli`)

**Layout**:
```
┌─────────────────────────────────────────────────┐
│ Gestione Ruoli                      [+ Nuovo Ruolo] │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌─────────────────────────────────────────┐   │
│ │ 🟦 Manager                               │   │
│ │ Accesso completo eccetto impostazioni    │   │
│ │ 12 permessi • 3 membri                   │   │
│ │                    [Modifica] [Elimina]  │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ ┌─────────────────────────────────────────┐   │
│ │ 🟩 Cameriere                             │   │
│ │ Gestione ordini e tavoli                 │   │
│ │ 8 permessi • 5 membri                    │   │
│ │                    [Modifica] [Elimina]  │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ ┌─────────────────────────────────────────┐   │
│ │ 🟨 Cassiere                              │   │
│ │ Accesso cassa e chiusura ordini          │   │
│ │ 6 permessi • 2 membri                    │   │
│ │                    [Modifica] [Elimina]  │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 2. Modal Crea/Modifica Ruolo

**Form**:
```
┌─────────────────────────────────────────────────┐
│ Crea Nuovo Ruolo                        [X]     │
├─────────────────────────────────────────────────┤
│                                                 │
│ Nome Ruolo *                                    │
│ [Cameriere__________________________]           │
│                                                 │
│ Descrizione                                     │
│ [Gestisce ordini e servizio ai tavoli_______]  │
│                                                 │
│ Colore Badge                                    │
│ [#22C55E] 🟩                                    │
│                                                 │
│ ┌─────────────────────────────────────────┐   │
│ │ Permessi                                 │   │
│ │                                          │   │
│ │ ✅ Gestione Ordini                       │   │
│ │    ☑️ Visualizzare ordini                │   │
│ │    ☑️ Creare nuovi ordini                │   │
│ │    ☑️ Modificare ordini                  │   │
│ │    ☑️ Confermare ordini                  │   │
│ │    ☐ Eliminare ordini                    │   │
│ │                                          │   │
│ │ ✅ Gestione Tavoli                       │   │
│ │    ☑️ Visualizzare tavoli                │   │
│ │    ☑️ Aprire tavoli                      │   │
│ │    ☑️ Cambiare tavolo                    │   │
│ │    ☐ Chiudere tavoli                     │   │
│ │                                          │   │
│ │ ⬜ Gestione Cassa                        │   │
│ │    ☐ Accedere alla cassa                 │   │
│ │    ☐ Chiudere ordini                     │   │
│ │                                          │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│               [Annulla]  [Salva Ruolo]          │
└─────────────────────────────────────────────────┘
```

### 3. Pagina Gestione Staff (`/impostazioni/staff`)

**Layout**:
```
┌─────────────────────────────────────────────────┐
│ Gestione Staff                     [+ Invita Staff] │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌─────────────────────────────────────────┐   │
│ │ 👤 Vincenzo Cassese                      │   │
│ │ vincenzo@email.com • +39 333 1234567     │   │
│ │ 🟦 Manager  🟨 Cassiere                  │   │
│ │ Attivo da: 15 gen 2025                   │   │
│ │                    [Modifica] [Disattiva]│   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ ┌─────────────────────────────────────────┐   │
│ │ 👤 Gianna Esposito                       │   │
│ │ gianna@email.com • +39 333 9876543       │   │
│ │ 🟩 Cameriere                             │   │
│ │ Attivo da: 20 gen 2025                   │   │
│ │                    [Modifica] [Disattiva]│   │
│ └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🔧 Implementazione Backend

### 1. Servizio Ruoli (`src/lib/rolesService.js`)

**Funzioni Principali**:
```javascript
// Crea nuovo ruolo
createRole(restaurantId, { name, description, permissions, color, priority })

// Ottieni tutti i ruoli di un ristorante
getRoles(restaurantId)

// Ottieni ruolo per ID
getRole(roleId)

// Aggiorna ruolo
updateRole(roleId, updates)

// Elimina ruolo (soft delete)
deleteRole(roleId)

// Assegna ruolo a staff
assignRoleToStaff(staffId, roleId, assignedBy)

// Rimuovi ruolo da staff
removeRoleFromStaff(staffId, roleId)

// Ottieni ruoli di uno staff
getStaffRoles(staffId)

// Verifica se staff ha permesso
hasPermission(staffId, permission)
```

### 2. Hook Permessi (`src/hooks/usePermissions.js`)

```javascript
const { hasPermission, userRoles, primaryRole } = usePermissions(staffId)

// Uso nei componenti
if (hasPermission('orders.create')) {
  // Mostra bottone "Crea Ordine"
}

if (hasPermission('cashier.access')) {
  // Mostra link alla Cassa
}
```

### 3. Middleware Permessi

**Per proteggere route e azioni**:
```javascript
// In ogni operazione critica
await checkPermission(staffId, 'orders.delete')
  .then(() => deleteOrder(orderId))
  .catch(() => throw new Error('Permesso negato'))
```

---

## 📊 Migrazione Dati Esistenti

**Quando implementeremo il sistema**:
1. Creare ruoli predefiniti:
   - **Proprietario** (tutti i permessi)
   - **Manager** (tutti i permessi eccetto `staff.manage_roles`)
   - **Staff Base** (permessi base: `orders.view`, `orders.create`, `tables.view`)

2. Migrare staff esistenti:
   - Proprietario → ruolo "Proprietario"
   - Tutti gli altri staff → ruolo "Staff Base"

3. Aggiornare timeline esistente:
   - Assegnare `staff_role_id` a eventi passati basandosi su `staff_id`

---

## ✅ Checklist Implementazione

### Fase 1: Database
- [ ] Creare tabella `staff_roles`
- [ ] Creare tabella `staff_role_assignments`
- [ ] Aggiungere `primary_role_id` a `restaurant_staff`
- [ ] Aggiungere `staff_role_id` a `order_timeline`
- [ ] Creare indici per performance
- [ ] Scrivere migration per dati esistenti

### Fase 2: Backend Services
- [ ] Creare `rolesService.js` con tutte le funzioni CRUD
- [ ] Creare `permissionsService.js` per verifica permessi
- [ ] Aggiornare `timelineService.js` per tracciare ruolo
- [ ] Aggiornare tutti i servizi per verificare permessi

### Fase 3: Frontend UI
- [ ] Creare pagina `/impostazioni/ruoli`
- [ ] Creare modal Crea/Modifica Ruolo
- [ ] Creare pagina `/impostazioni/staff`
- [ ] Creare modal Invita/Modifica Staff
- [ ] Aggiungere selector permessi con checkbox gerarchici
- [ ] Aggiungere badge ruoli colorati

### Fase 4: Hook e Utils
- [ ] Creare hook `usePermissions()`
- [ ] Creare hook `useRoles()`
- [ ] Aggiornare `useAuth()` per includere ruoli
- [ ] Creare HOC `withPermission()` per proteggere componenti

### Fase 5: Timeline Updates
- [ ] Aggiornare `formatTimelineEntry()` per mostrare ruolo invece di event_source
- [ ] Aggiornare UI timeline in `OrderDetailPage`
- [ ] Testare visualizzazione con diversi ruoli

### Fase 6: Testing
- [ ] Test creazione/modifica/eliminazione ruoli
- [ ] Test assegnazione ruoli a staff
- [ ] Test verifica permessi
- [ ] Test timeline con ruoli visibili
- [ ] Test migrazione dati esistenti

---

## 🚀 Stima Tempi

**Totale**: 3-4 ore di sviluppo

- Database + Migrations: 30 minuti
- Backend Services: 1 ora
- Frontend UI: 1.5 ore
- Timeline Integration: 30 minuti
- Testing: 30 minuti

---

## 🎯 Benefici

1. **Chiarezza Operativa**: Sempre chiaro chi ha fatto cosa e con quale ruolo
2. **Sicurezza**: Ogni membro ha solo i permessi necessari
3. **Flessibilità**: Il proprietario crea ruoli su misura per il suo ristorante
4. **Scalabilità**: Sistema pronto per ristoranti con molti staff
5. **Audit Trail**: Timeline dettagliata con ruoli tracciati

---

## 📝 Note Aggiuntive

- Questo sistema è **completamente separato** dal fix rapido della timeline
- Verrà implementato come **progetto separato** dopo il fix urgente
- Compatibile con il sistema centralizzato di eventi già implementato
- Non richiede modifiche al sistema analytics esistente

---

**Ultima Modifica**: 27 Ottobre 2025
**Autore**: Claude + Vincenzo
**Status**: Documentato, pronto per implementazione futura
