# Mapping Completo Funzioni App - MVP Menu

**Data Analisi**: 27 Ottobre 2025
**Scopo**: Mappare tutte le funzioni disponibili nell'app per creare struttura permessi granulare

---

## 📊 STRUTTURA PERMESSI GRANULARE

### 1. GESTIONE ORDINI (`orders`)

#### 1.1 Visualizzazione Ordini
- `orders.view_all` - Visualizzare tutti gli ordini (tutte le pagine)
- `orders.view_own` - Visualizzare solo i propri ordini creati
- `orders.view_details` - Vedere dettagli completi ordine (timeline, prodotti, note)

#### 1.2 Creazione e Modifica
- `orders.create` - Creare nuovi ordini
- `orders.edit` - Modificare ordini esistenti (pending/confirmed)
- `orders.add_products` - Aggiungere prodotti a ordini in preparazione
- `orders.remove_products` - Rimuovere prodotti da ordini
- `orders.edit_quantities` - Modificare quantità prodotti

#### 1.3 Cambio Stato
- `orders.confirm` - Confermare ordini (pending → preparing/confirmed)
- `orders.start_preparing` - Mettere in preparazione
- `orders.complete` - Completare ordini (chiudere tavoli)

#### 1.4 Cancellazione
- `orders.cancel` - Annullare ordini
- `orders.delete` - Eliminare ordini (soft delete)

#### 1.5 Operazioni Speciali
- `orders.add_notes` - Aggiungere note agli ordini
- `orders.set_priority` - Impostare ordini come prioritari
- `orders.change_table` - Cambiare tavolo di un ordine
- `orders.generate_preconto` - Generare preconto

**File Coinvolti**:
- `src/pages/OrdersPage.jsx` - Lista ordini
- `src/pages/OrderDetailPage.jsx` - Dettaglio singolo ordine
- `src/pages/StaffOrders.jsx` - Ordini per staff
- `src/lib/ordersService.js` - Logica business ordini
- `src/lib/orderOperations.js` - Operazioni soft delete

---

### 2. GESTIONE TAVOLI (`tables`)

#### 2.1 Visualizzazione
- `tables.view` - Visualizzare stato tavoli e sale

#### 2.2 Operazioni Tavoli
- `tables.open` - Aprire tavoli (creare ordini per tavoli)
- `tables.change` - Cambiare tavolo di un ordine
- `tables.close` - Chiudere tavoli (completare ordini)

#### 2.3 Configurazione (Solo Admin)
- `tables.manage` - Creare/modificare/eliminare tavoli e sale

**File Coinvolti**:
- `src/components/ChangeTableModal.jsx` - Cambio tavolo
- `src/components/CreateOrderModal.jsx` - Apertura tavolo (creazione ordine)

---

### 3. GESTIONE CASSA (`cashier`)

#### 3.1 Accesso
- `cashier.access` - Accedere alla pagina cassa

#### 3.2 Operazioni Cassa
- `cashier.view_orders` - Visualizzare ordini in cassa
- `cashier.close_tables` - Chiudere tavoli dalla cassa
- `cashier.print_receipt` - Stampare scontrini fiscali
- `cashier.generate_preconto` - Generare preconti
- `cashier.view_totals` - Visualizzare totali giornalieri

**File Coinvolti**:
- `src/pages/CassaPage.jsx` - Pagina cassa principale

---

### 4. GESTIONE PRODOTTI (`products`)

#### 4.1 Visualizzazione
- `products.view` - Visualizzare lista prodotti e categorie

#### 4.2 Creazione e Modifica
- `products.create` - Creare nuovi prodotti
- `products.edit` - Modificare prodotti esistenti
- `products.delete` - Eliminare prodotti
- `products.manage_variants` - Gestire varianti prodotti (taglie, ingredienti)
- `products.manage_categories` - Creare/modificare/eliminare categorie
- `products.upload_images` - Caricare immagini prodotti

#### 4.3 Impostazioni Prodotti
- `products.set_availability` - Impostare disponibilità (attivo/disattivo)
- `products.set_prices` - Modificare prezzi
- `products.set_priority` - Impostare ordine visualizzazione

**File Coinvolti**:
- `src/pages/ProductsPage.jsx` - Gestione prodotti

---

### 5. GESTIONE STAFF (`staff`)

#### 5.1 Visualizzazione
- `staff.view` - Visualizzare lista membri staff e loro ruoli

#### 5.2 Gestione Membri
- `staff.create` - Invitare/creare nuovi membri staff
- `staff.edit` - Modificare dati membri (nome, email, telefono)
- `staff.delete` - Eliminare membri staff
- `staff.deactivate` - Disattivare/riattivare membri

#### 5.3 Gestione Ruoli (Solo Proprietario)
- `staff.manage_roles` - Creare/modificare/eliminare ruoli
- `staff.assign_roles` - Assegnare ruoli ai membri
- `staff.view_permissions` - Visualizzare permessi dei ruoli

**File Coinvolti**:
- DA CREARE: `src/pages/UsersPage.jsx` - Gestione utenti (ruoli + membri)

---

### 6. GESTIONE MENU PUBBLICO (`public_menu`)

#### 6.1 Configurazione
- `public_menu.view_settings` - Visualizzare impostazioni menu pubblico
- `public_menu.edit_settings` - Modificare impostazioni (tema, layout, orari)
- `public_menu.manage_qr` - Generare/scaricare QR code

**File Coinvolti**:
- `src/pages/PublicMenu.jsx` - Menu pubblico clienti
- `src/pages/SettingsPage.jsx` - Impostazioni menu

---

### 7. ANALYTICS E REPORT (`analytics`)

#### 7.1 Visualizzazione Analytics
- `analytics.view` - Accedere alla sezione analytics
- `analytics.view_revenue` - Visualizzare revenue e vendite
- `analytics.view_products` - Vedere prodotti più venduti
- `analytics.view_conversion` - Vedere funnel di conversione
- `analytics.view_time_analysis` - Analisi per fasce orarie
- `analytics.view_aov` - Vedere Average Order Value

#### 7.2 Esportazione
- `analytics.export` - Esportare dati analytics (CSV, PDF)

**File Coinvolti**:
- `src/pages/AnalyticsPage.jsx` - Hub analytics
- `src/pages/RevenueAnalytics.jsx` - Revenue
- `src/pages/TopProductsOrdered.jsx` - Top prodotti
- `src/pages/ConversionFunnel.jsx` - Conversion funnel
- `src/pages/TimeBasedAnalysis.jsx` - Analisi temporale
- `src/pages/AOVAnalysis.jsx` - AOV

---

### 8. GESTIONE RISTORANTE (`restaurant`)

#### 8.1 Impostazioni Generali
- `restaurant.view_settings` - Visualizzare impostazioni ristorante
- `restaurant.edit_settings` - Modificare dati ristorante (nome, indirizzo, contatti)
- `restaurant.edit_opening_hours` - Modificare orari apertura
- `restaurant.manage_rooms` - Gestire sale (creare/modificare/eliminare)

#### 8.2 Impostazioni Fiscali
- `restaurant.view_fiscal` - Visualizzare impostazioni fiscali
- `restaurant.edit_fiscal` - Modificare impostazioni fiscali (P.IVA, scontrini)

#### 8.3 Piano e Abbonamento
- `restaurant.view_subscription` - Visualizzare piano attuale
- `restaurant.manage_subscription` - Gestire abbonamento (upgrade/downgrade)

**File Coinvolti**:
- `src/pages/SettingsPage.jsx` - Impostazioni generali
- `src/pages/FiscalSettings.jsx` - Impostazioni fiscali
- `src/pages/PlanPage.jsx` - Gestione piano

---

### 9. GESTIONE CLIENTI (`customers`)

#### 9.1 Visualizzazione
- `customers.view` - Visualizzare lista clienti registrati

#### 9.2 Gestione
- `customers.edit` - Modificare dati clienti
- `customers.delete` - Eliminare clienti
- `customers.view_orders` - Vedere storico ordini clienti
- `customers.manage_loyalty` - Gestire punti fedeltà

**File Coinvolti**:
- DA IMPLEMENTARE: Gestione clienti non ancora completa nell'app

---

### 10. CANALI VENDITA (`channels`)

#### 10.1 Gestione
- `channels.view` - Visualizzare canali vendita attivi
- `channels.manage` - Configurare canali (QR menu, delivery, ecc.)

**File Coinvolti**:
- `src/pages/ChannelsPage.jsx` - Gestione canali

---

## 📋 MATRICE PERMESSI SUGGERITA

### Ruolo: PROPRIETARIO (Owner)
**Permessi**: TUTTI (accesso completo senza restrizioni)

### Ruolo Suggerito: MANAGER
**Permessi**:
```javascript
[
  // Ordini - accesso completo
  'orders.view_all',
  'orders.view_details',
  'orders.create',
  'orders.edit',
  'orders.add_products',
  'orders.remove_products',
  'orders.edit_quantities',
  'orders.confirm',
  'orders.start_preparing',
  'orders.complete',
  'orders.cancel',
  'orders.delete',
  'orders.add_notes',
  'orders.set_priority',
  'orders.change_table',
  'orders.generate_preconto',

  // Tavoli - accesso completo
  'tables.view',
  'tables.open',
  'tables.change',
  'tables.close',

  // Cassa - accesso completo
  'cashier.access',
  'cashier.view_orders',
  'cashier.close_tables',
  'cashier.print_receipt',
  'cashier.generate_preconto',
  'cashier.view_totals',

  // Prodotti - solo visualizzazione
  'products.view',

  // Staff - visualizzazione
  'staff.view',

  // Analytics - accesso completo
  'analytics.view',
  'analytics.view_revenue',
  'analytics.view_products',
  'analytics.view_conversion',
  'analytics.view_time_analysis',
  'analytics.view_aov',
  'analytics.export'
]
```

### Ruolo Suggerito: CAMERIERE
**Permessi**:
```javascript
[
  // Ordini - operazioni base
  'orders.view_all',
  'orders.view_details',
  'orders.create',
  'orders.edit',
  'orders.add_products',
  'orders.edit_quantities',
  'orders.confirm',
  'orders.add_notes',
  'orders.set_priority',

  // Tavoli - operazioni base
  'tables.view',
  'tables.open',
  'tables.change',

  // Prodotti - solo visualizzazione
  'products.view'
]
```

### Ruolo Suggerito: CASSIERE
**Permessi**:
```javascript
[
  // Ordini - solo visualizzazione e completamento
  'orders.view_all',
  'orders.view_details',
  'orders.complete',
  'orders.generate_preconto',

  // Cassa - accesso completo
  'cashier.access',
  'cashier.view_orders',
  'cashier.close_tables',
  'cashier.print_receipt',
  'cashier.generate_preconto',
  'cashier.view_totals',

  // Tavoli - solo chiusura
  'tables.view',
  'tables.close',

  // Prodotti - solo visualizzazione
  'products.view'
]
```

### Ruolo Suggerito: CUOCO
**Permessi**:
```javascript
[
  // Ordini - solo visualizzazione e cambio stato
  'orders.view_all',
  'orders.view_details',
  'orders.start_preparing',

  // Prodotti - solo visualizzazione
  'products.view'
]
```

---

## 🔧 IMPLEMENTAZIONE TECNICA

### Schema Database Proposto

```sql
-- Tabella ruoli
CREATE TABLE staff_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]', -- Array di stringhe permission keys
  color VARCHAR(7), -- Hex color per UI
  is_system_role BOOLEAN DEFAULT FALSE, -- TRUE per "Proprietario"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(restaurant_id, name)
);

-- Tabella assegnazioni ruoli a staff
CREATE TABLE staff_role_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES restaurant_staff(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES staff_roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),

  UNIQUE(staff_id, role_id)
);

-- Modifica tabella restaurant_staff
ALTER TABLE restaurant_staff
ADD COLUMN primary_role_id UUID REFERENCES staff_roles(id) ON DELETE SET NULL;

-- Modifica tabella order_timeline per tracciare ruolo
ALTER TABLE order_timeline
ADD COLUMN staff_role_id UUID REFERENCES staff_roles(id) ON DELETE SET NULL;
```

### Struttura Permessi JSON

```javascript
// Esempio ruolo "Manager" salvato in staff_roles.permissions
{
  "permissions": [
    "orders.view_all",
    "orders.create",
    "orders.edit",
    "cashier.access",
    "analytics.view"
    // ... altri permessi
  ]
}
```

---

## 📁 FILE DA CREARE

### Backend Services
1. `src/lib/rolesService.js` - CRUD ruoli
2. `src/lib/permissionsService.js` - Verifica permessi
3. `src/lib/staffService.js` - CRUD membri staff

### Frontend Pages
1. `src/pages/UsersPage.jsx` - Pagina principale Impostazioni > Utenti
2. `src/components/RolesTable.jsx` - Tabella ruoli
3. `src/components/RoleModal.jsx` - Modal crea/modifica ruolo
4. `src/components/MembersTable.jsx` - Tabella membri
5. `src/components/MemberModal.jsx` - Modal crea/modifica membro
6. `src/components/PermissionsCheckboxTree.jsx` - Albero permessi con checkbox

### Hooks
1. `src/hooks/usePermissions.js` - Hook per verificare permessi
2. `src/hooks/useRoles.js` - Hook per gestire ruoli
3. `src/hooks/useStaff.js` - Hook per gestire staff

---

## 🎯 PRIORITÀ IMPLEMENTAZIONE

### Fase 1: Database + Backend (30 min)
- ✅ Creare migration con tabelle
- ✅ Creare rolesService.js
- ✅ Creare permissionsService.js

### Fase 2: UI Ruoli (45 min)
- ✅ Creare UsersPage.jsx (layout base)
- ✅ Creare RolesTable.jsx
- ✅ Creare RoleModal.jsx con checkbox permessi
- ✅ Implementare CRUD ruoli

### Fase 3: UI Membri (45 min)
- ✅ Creare MembersTable.jsx
- ✅ Creare MemberModal.jsx
- ✅ Implementare CRUD membri
- ✅ Assegnazione ruoli a membri

### Fase 4: Integration (30 min)
- ✅ Aggiornare timeline per mostrare ruoli
- ✅ Aggiornare tutti i servizi per tracciare ruolo nelle azioni
- ✅ Testing completo

**TOTALE STIMA**: 2.5 - 3 ore

---

**Prossimo Step**: Creare migration database con tabelle e dati iniziali
