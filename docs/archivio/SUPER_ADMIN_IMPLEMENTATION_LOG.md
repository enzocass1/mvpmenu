# Super Admin Dashboard - Implementation Log

**Data inizio**: 2025-10-27
**Versione**: 1.0.0
**Stato**: In sviluppo

---

## 📋 CONTESTO PROGETTO

### Punto di partenza
Eravamo nel mezzo del testing del sistema **Ruoli e Membri** quando ci siamo resi conto che serviva prima implementare:

1. Sistema di gestione piani abbonamento
2. Logica di downgrade automatico quando scade abbonamento
3. Super Admin Dashboard per gestire tutto il sistema
4. CRM per gestire ristoranti e loro abbonamenti

**Motivazione**: I membri devono perdere accesso alle funzionalità premium quando il ristorante perde l'abbonamento. Serviva quindi prima sistemare tutta la logica degli abbonamenti.

---

## 🎯 OBIETTIVO FINALE

Creare una **Super Admin Dashboard** completa con:

- ✅ Dashboard con KPI (MRR, ARR, Churn Rate, ecc.)
- ✅ Gestione Piani (CRUD piani abbonamento)
- ✅ CRM Ristoranti (gestione completa clienti)
- 🔄 Sistema Trial Period configurabile
- 🔄 Upgrade temporanei massivi
- ⏳ Analytics (future)
- ⏳ Integrazione Stripe (future)

---

## 📂 STRUTTURA GERARCHICA

### Super Admin
- Accesso completo al portale principale
- Gestisce tutti i ristoranti e vede loro incassi
- Gestisce registrazioni e business model
- Crea/modifica piani a pagamento dalla dashboard (senza passare da Stripe)
- Vede statistiche aggregate (MRR, ARR, Churn)

### Utenti Ristoranti
- Partono con piano **FREE** (o FREE Trial se configurato)
- Pagano per sbloccare funzionalità (Premium, Plus, Pro, ecc.)
- Se non pagano → downgrade automatico a FREE standard
- Perdono accesso alle funzionalità premium

---

## 🗂️ FILE CREATI/MODIFICATI

### Nuovi File

#### 1. SuperAdminLayout.jsx
**Path**: `src/components/ui/SuperAdminLayout.jsx`
**Linee**: 318
**Descrizione**: Layout dedicato Super Admin con sidebar e navigazione

**Features**:
- Sidebar con menu: Dashboard, Gestisci Piani, CRM Ristoranti, Analytics
- Logout con conferma
- Responsive (mobile/desktop)
- Stessi tokens styling dell'app principale

#### 2. SuperAdminDashboard.jsx
**Path**: `src/pages/superadmin/SuperAdminDashboard.jsx`
**Linee**: 245
**Descrizione**: Dashboard principale Super Admin

**Features**:
- KPI Cards: MRR Totale, Abbonamenti Attivi, Churn Rate, Nuovi del Mese
- Quick Actions: link rapidi a Gestisci Piani, CRM, Analytics
- Tabella Distribuzione Piani con badge Legacy
- Spinner e gestione errori

#### 3. PlansManagement.jsx
**Path**: `src/pages/superadmin/PlansManagement.jsx`
**Descrizione**: Gestione completa piani abbonamento

**Features**:
- Lista piani con statistiche (quanti ristoranti per piano)
- CRUD completo (Create, Read, Update, Delete)
- Toggle visibilità/attivazione piani
- Badge per piani Legacy
- Sezione Features con checkbox
- Sezione Limiti (staff, prodotti, ordini, tavoli, storage)

#### 4. RestaurantsManagement.jsx (CRM)
**Path**: `src/pages/superadmin/RestaurantsManagement.jsx`
**Linee**: ~700
**Descrizione**: CRM completo per gestione ristoranti

**Features**:
- Tabella con tutti i ristoranti
- Filtri avanzati: ricerca, per piano, per stato
- Statistiche aggregate: Totali, Attivi, Trial, Scaduti, Cancellati, Sospesi
- Azioni: Modifica piano, Sospendi account
- Export CSV con tutti i dati
- Badge per stato (Attivo, Trial, Scaduto, Sospeso, Cancellato)

#### 5. restaurantsService.js
**Path**: `src/services/restaurantsService.js`
**Linee**: ~300
**Descrizione**: Servizio per gestione ristoranti dal lato Super Admin

**Metodi**:
- `getAllRestaurants()` - Recupera tutti i ristoranti con dati abbonamento
- `updateRestaurantPlan()` - Cambia piano a ristorante
- `deleteRestaurant()` - Soft delete (sospensione)
- `hardDeleteRestaurant()` - Eliminazione permanente (DANGEROUS)
- `createSubscriptionEvent()` - Log eventi abbonamento
- `getRestaurantStats()` - Statistiche aggregate
- `exportToCSV()` - Genera CSV
- `downloadCSV()` - Download file CSV

#### 6. plansService.js
**Path**: `src/services/plansService.js`
**Descrizione**: Servizio per gestione piani abbonamento

**Metodi**:
- `getAllPlans()` - Recupera tutti i piani
- `getPlanById()` - Recupera piano specifico
- `createPlan()` - Crea nuovo piano
- `updatePlan()` - Modifica piano esistente
- `deletePlan()` - Elimina piano
- `getPlansStatistics()` - Statistiche utilizzo piani
- `getRecentEvents()` - Eventi recenti abbonamenti

#### 7. Alert.jsx
**Path**: `src/components/ui/Alert.jsx`
**Linee**: 90
**Descrizione**: Componente Alert UI mancante

**Varianti**: info, success, warning, error

### File Modificati

#### 1. App.jsx
**Modifiche**:
- Rimosso import `Checkout` (vecchio sistema Stripe)
- Rimossa route `/checkout`
- Aggiunte route Super Admin:
  - `/super-admin/login`
  - `/super-admin/dashboard`
  - `/super-admin/plans`
  - `/super-admin/restaurants`

#### 2. Sidebar.jsx
**Modifiche**:
- Aggiunto parametro `onLogout`
- Aggiunto pulsante "Esci" con conferma
- Styling rosso per logout

#### 3. DashboardLayout.jsx
**Modifiche**:
- Passato prop `onLogout` a Sidebar

#### 4. Home.jsx
**Modifiche**:
- Aggiunto pulsante logout nel page header (backup)

#### 5. index.js (components/ui)
**Modifiche**:
- Aggiunto export Alert component

### File Eliminati

#### Vecchio Sistema Stripe
- ❌ `src/pages/Checkout.jsx` - Vecchia pagina checkout hardcoded
- ❌ `api/create-checkout-session.js` - Vecchia API Stripe
- ❌ `api/create-customer-portal.js` - Vecchio customer portal

**Motivo rimozione**: Conflitto con nuovo sistema dinamico. Stripe sarà reintegrato dopo con logica nuova.

---

## 🗄️ STRUTTURA DATABASE

### Tabelle Principali

#### subscription_plans
```sql
- id (UUID)
- name (VARCHAR) - Nome piano
- slug (VARCHAR) - URL-friendly name
- description (TEXT)
- price_monthly (DECIMAL)
- price_yearly (DECIMAL)
- currency (VARCHAR)
- stripe_price_id_monthly (VARCHAR) - Per integrazione futura
- stripe_price_id_yearly (VARCHAR)
- stripe_product_id (VARCHAR)
- features (JSONB) - Array feature keys
- limits (JSONB) - Limiti piano
- is_active (BOOLEAN)
- is_visible (BOOLEAN)
- is_legacy (BOOLEAN)
- sort_order (INTEGER)
- metadata (JSONB)
```

#### restaurants (colonne aggiunte)
```sql
- subscription_plan_id (UUID FK)
- subscription_status (VARCHAR) - active, trial, expired, cancelled, suspended
- subscription_started_at (TIMESTAMPTZ)
- subscription_expires_at (TIMESTAMPTZ)
- subscription_trial_ends_at (TIMESTAMPTZ)
- subscription_cancelled_at (TIMESTAMPTZ)
- subscription_metadata (JSONB)
```

#### subscription_events
```sql
- id (UUID)
- restaurant_id (UUID FK)
- plan_id (UUID FK)
- event_type (VARCHAR) - es: subscription.upgraded
- event_data (JSONB)
- amount (DECIMAL)
- currency (VARCHAR)
- stripe_event_id (VARCHAR)
- created_at (TIMESTAMPTZ)
```

#### super_admins
```sql
- id (UUID)
- email (VARCHAR)
- password_hash (TEXT)
- name (VARCHAR)
- two_factor_enabled (BOOLEAN)
- is_active (BOOLEAN)
- permissions (JSONB)
```

---

## 🔐 ROUTING

### Public Routes
- `/landing` - Landing page pubblica
- `/login` - Login ristoranti
- `/super-admin/login` - Login Super Admin (separato)

### Super Admin Routes (Protected)
- `/super-admin/dashboard` - Dashboard principale
- `/super-admin/plans` - Gestione piani
- `/super-admin/restaurants` - CRM ristoranti
- `/super-admin/analytics` - Analytics (future)

### Restaurant Routes (Protected)
- `/dashboard` - Home ristorante
- `/ordini` - Gestione ordini
- `/prodotti` - Gestione prodotti
- `/canali` - Gestione canali
- `/impostazioni` - Impostazioni
- `/piano` - Gestione abbonamento
- `/utenti` - Ruoli e Membri

---

## ✅ FUNZIONALITÀ IMPLEMENTATE

### 1. Super Admin Dashboard
- [x] KPI Cards (MRR, Abbonamenti Attivi, Churn Rate)
- [x] Quick Actions
- [x] Tabella distribuzione piani
- [x] Spinner loading
- [x] Gestione errori

### 2. Gestione Piani
- [x] Lista piani con statistiche
- [x] Crea nuovo piano
- [x] Modifica piano esistente
- [x] Elimina piano
- [x] Toggle visibilità/attivazione
- [x] Badge Legacy
- [x] Features con checkbox
- [x] Limiti configurabili

### 3. CRM Ristoranti
- [x] Tabella completa ristoranti
- [x] Filtri avanzati (ricerca, piano, stato)
- [x] Statistiche aggregate
- [x] Export CSV
- [x] Soft delete (sospensione)
- [x] Badge stato abbonamento
- [ ] Modifica piano (UI presente, logica da completare)
- [ ] Import CSV

### 4. Sistema Abbonamenti
- [x] Database schema completo
- [x] Service layer (plansService, restaurantsService)
- [x] Eventi abbonamento tracciati
- [ ] Downgrade automatico (da implementare)
- [ ] Trial period configurabile (da implementare)
- [ ] Upgrade temporanei (da implementare)

---

## 🔄 PROSSIMI STEP

### Priorità Alta
1. **Sistema Trial Period Configurabile**
   - Configurare giorni trial per piano FREE
   - Distinzione FREE trial vs FREE standard
   - Logica scadenza trial → downgrade a FREE

2. **Upgrade Temporanei Massivi**
   - Dare upgrade temporaneo a tutti o specifici utenti
   - Impostare durata (X giorni)
   - Downgrade automatico alla scadenza

3. **Modale Modifica Piano CRM**
   - Completare funzionalità cambio piano da CRM
   - Validazione e conferma
   - Aggiornamento database

4. **Import CSV CRM**
   - Caricamento massivo dati
   - Validazione CSV
   - Preview prima import

### Priorità Media
5. **Logica Downgrade Automatico**
   - Cron job o funzione periodica
   - Controllo `subscription_expires_at`
   - Downgrade a FREE se scaduto

6. **Sistema gestione piani dinamici**
   - Già quasi completo
   - Testare funzionalità CRUD

### Priorità Bassa
7. **Integrazione Stripe**
   - Webhook per pagamenti
   - Sincronizzazione piani Stripe ↔ Database
   - Checkout flow

8. **Analytics Super Admin**
   - Grafici MRR/ARR nel tempo
   - Conversion funnel
   - Churn analysis

---

## 🎨 DESIGN SYSTEM

### Tokens Utilizzati
Tutto il sistema Super Admin usa i tokens centralizzati da `src/styles/tokens.js`:

- **Spacing**: `tokens.spacing.xs/sm/md/lg/xl/2xl`
- **Colors**: `tokens.colors.primary/gray/error/success/warning`
- **Typography**: `tokens.typography.fontSize/fontWeight`
- **Border Radius**: `tokens.borderRadius.sm/md/lg`

### Componenti Riutilizzati
- `Card` - Container principale
- `Button` - Pulsanti con varianti (primary, secondary, outline)
- `Badge` - Tag per stati/info
- `Spinner` - Loading indicator
- `Alert` - Messaggi di errore/successo
- `KPICard` - Card metriche

---

## 📊 SISTEMA IBRIDO RICHIESTO

Il sistema è stato progettato come **ibrido**:

1. **Super Admin crea piano in dashboard**:
   - Nome, prezzo, features, limiti
   - Tutto salvato nel database

2. **Funziona in 2 modalità**:
   - **Modalità Manuale**: Super Admin assegna piano senza pagamento
   - **Modalità Stripe**: Webhook Stripe → aggiorna database

3. **Prezzo dal database, non da Stripe**:
   - Stripe è solo "processore pagamenti"
   - Logica piani completamente nel database
   - Super Admin ha controllo totale

---

## 🐛 PROBLEMI RISOLTI

### 1. JSX Syntax Error SuperAdminDashboard
**Errore**: Tag `<SuperAdminLayout>` mismatched
**Fix**: Riscrittura completa file con struttura JSX pulita

### 2. Alert Component Missing
**Errore**: Import Alert non trovato
**Fix**: Creato componente Alert.jsx con 4 varianti

### 3. Invalid Color Token
**Errore**: `tokens.colors.red[600]` non esiste
**Fix**: Usato `tokens.colors.error.base`

### 4. Checkout Route Conflict
**Errore**: Vecchio sistema Stripe in conflitto
**Fix**: Rimosso completamente vecchio sistema

---

## 📝 NOTE IMPLEMENTAZIONE

### Autenticazione Super Admin
- Sistema separato da auth ristoranti
- Usa `localStorage.getItem('superAdminSession')`
- Password hash con bcrypt
- 2FA opzionale (da implementare)

### RLS (Row Level Security)
- Tabelle Super Admin NON hanno RLS
- Accesso solo via funzioni server-side
- Mai esporre direttamente a client

### CSV Export/Import
- Export: genera CSV con tutti i dati ristorante
- Import: caricamento massivo (da implementare)
- Validazione: controllo formato e duplicati

### Soft Delete
- Non eliminiamo mai ristoranti fisicamente
- Soft delete = `subscription_status: 'suspended'`
- Possibilità di riattivare in futuro

---

## 🚀 DEPLOYMENT NOTES

### Environment Variables
```env
# Super Admin
SUPER_ADMIN_SESSION_SECRET=xxx

# Stripe (future)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Database
SUPABASE_URL=xxx
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### Security Checklist
- [ ] Validare input Super Admin
- [ ] Rate limiting su login Super Admin
- [ ] Log audit per azioni critiche
- [ ] 2FA obbligatorio per Super Admin
- [ ] Backup automatico database
- [ ] Monitoring errori Sentry

---

## 📚 RISORSE

### Documentazione
- Database Schema: `database/migrations/14_subscription_plans_system_FIXED.sql`
- Events Schema: `COMPLETE_EVENTS_SCHEMA.md`
- Subscription Log: `SUBSCRIPTION_SYSTEM_LOG.md`

### Testing
- URL Super Admin: `http://localhost:5175/#/super-admin/login`
- Test user: (da creare con script)

---

## ✍️ CHANGELOG

### 2025-10-27 - v1.0.0
- ✅ Creato SuperAdminLayout component
- ✅ Creato SuperAdminDashboard
- ✅ Creato PlansManagement (CRUD completo)
- ✅ Creato RestaurantsManagement (CRM)
- ✅ Creato restaurantsService
- ✅ Creato plansService
- ✅ Rimosso vecchio sistema Stripe
- ✅ Aggiunto logout a Sidebar
- ✅ Creato Alert component

### 2025-10-27 - v1.1.0 (In Progress)
- 🔄 Sistema Trial Period configurabile
- 🔄 Upgrade temporanei massivi
- 🔄 Distinzione FREE trial vs FREE standard

### 2025-10-27 - v1.2.0 CRM Fixes & Temporary Upgrades
- ✅ Fixed column mismatch error (owner_id → user_id)
- ✅ Created Migration 16: restaurants_with_users_view (database view for security)
- ✅ Fixed Modal backgrounds - Aligned to design system (Modal component)
- ✅ Fixed PlansManagement styling - Added SuperAdminLayout wrapper
- ✅ Implemented Temporary Upgrades Modal in CRM
- ✅ All modals now use standard Modal component (Header, Body, Footer)
- ✅ Consistent design system across entire Super Admin dashboard

**Issues Fixed**:
1. **Column Name Mismatch** (`owner_id` vs `user_id`)
   - Error: "column restaurants.owner_id does not exist"
   - Fix: Changed to `user_id` in restaurantsService.js

2. **403 Forbidden - Admin API**
   - Error: Permission denied using `supabase.auth.admin.getUserById()`
   - Fix: Created database view `restaurants_with_user_emails` with SECURITY DEFINER

3. **Modal Background Not Visible**
   - Issue: Custom inline styles instead of design system
   - Fix: Replaced with standard Modal component (dark overlay now visible)

4. **PlansManagement Inconsistent Styling**
   - Issue: Not using SuperAdminLayout, custom styles
   - Fix: Wrapped with SuperAdminLayout, aligned headers with tokens

**New Features**:
- ✅ **Temporary Upgrades Modal** - Assign time-limited plan upgrades
  - Select temporary plan (filtered to exclude current)
  - Set duration in days (1-365)
  - Automatic expiration date calculation
  - Optional reason field
  - Full integration with subscriptionManagementService

**Files Modified**:
- `src/services/restaurantsService.js` - Uses database view instead of admin API
- `src/pages/superadmin/RestaurantsManagement.jsx` - All modals redesigned + Temp Upgrade
- `src/pages/superadmin/PlansManagement.jsx` - SuperAdminLayout alignment
- `database/migrations/16_restaurants_with_users_view.sql` - NEW view for security

---

**Fine Log** - Ultimo aggiornamento: 2025-10-27 18:00
