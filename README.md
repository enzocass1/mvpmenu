# MVP Menu - Sistema di Gestione Ristorante

Sistema completo di gestione ristorante con POS, menu digitale, ordini al tavolo e analytics avanzate.

## Tech Stack

- **Frontend**: React 19 + Vite
- **Backend**: Supabase (PostgreSQL + Auth)
- **Pagamenti**: Stripe (live mode)
- **Deployment**: Vercel
- **Design**: Sistema custom Shopify-like

## Funzionalità Principali

### 1. Gestione Menu
- CRUD categorie e prodotti
- Varianti prodotto (taglie, colori, etc.)
- Opzioni personalizzabili
- Sistema freemium (3 cat/9 prod free vs illimitato premium)

### 2. Sistema Ordini (POS)
- **Ordini al Tavolo**: Cliente ordina tramite QR code
- **Ordini al Banco**: Staff crea ordini diretti
- **Sistema Batch**: Gestione "portate" multiple
- **Priority Order**: Ordini con priorità (+€2.00)

### 3. Analytics Avanzate ⭐ NUOVA
- **42 Eventi Tracciati** - Sistema completo Klaviyo-style
- **5 Pillars Tracking**: CHI, COSA, QUANDO, DOVE, QUANTO
- **Customer System**: Clienti registrati + "Cliente Incognito"
- **Traffic Source**: QR, Organic, Social (Instagram, Facebook, TikTok)
- **Loyalty Program**: 4 tier (none, bronze, silver, gold)
- **Cart Events**: Item added/removed, cart viewed, checkout started
- **Staff Events**: Login/logout, item prepared, performance tracking
- **Customer Journey**: QR scan → Browse → View → Cart → Order completo
- Dashboard per prodotti, categorie, ordini, sessioni, clienti
- Heatmap temporale e comparazioni periodo su periodo

### 4. Sistema Abbonamenti
- Piano FREE: 3 categorie, 9 prodotti
- Piano PREMIUM: illimitato + features avanzate
- Integrazione Stripe per pagamenti

---

## Regole Business - Gestione Ordini

### Flusso Ordine Standard

```
CLIENTE ORDINA (QR) → pending (giallo)
    ↓
STAFF conferma → preparing (verde)
    ↓
STAFF può aggiungere prodotti (batch 2, 3, etc.)
    ↓
SOLO CASSA può chiudere tavolo
    ↓
ORDINE completed → archiviato (non modificabile)
```

### Permessi per Sezione

#### 📋 Sezione ORDINI (Futuro: Camerieri)

**Ordini PENDING**
- ✅ Può VISUALIZZARE ordine
- ✅ Può MODIFICARE ordine
- ✅ Può CAMBIARE TAVOLO
- ✅ Può ELIMINARE ordine (soft delete → tab "Eliminati")
- ✅ Può CONFERMARE ordine (pending → preparing)

**Ordini PREPARING**
- ✅ Può VISUALIZZARE ordine
- ✅ Può **AGGIUNGERE PRODOTTI** (batch system)
- ❌ NON può CAMBIARE TAVOLO
- ❌ NON può ELIMINARE ordine
- ❌ NON può COMPLETARE ordine (solo Cassa)

**Ordini COMPLETATI (completed)**
- ✅ Può VISUALIZZARE ordine (sola lettura)
- ❌ NON può MODIFICARE
- ❌ NON può CAMBIARE TAVOLO
- ❌ NON può ELIMINARE
- ❌ Checkbox disabilitato (non selezionabile)

**Ordini ELIMINATI (deleted)**
- ✅ Può VISUALIZZARE in tab "Eliminati"
- ❌ Nessuna azione disponibile
- 💾 Soft delete: ordine marcato con `deleted_at` ma non cancellato dal database

#### 💰 Sezione CASSA (Admin/Proprietario)

**Ordini PENDING**
- ✅ Conferma ordine (pending → preparing)
- ✅ Cambia tavolo
- ✅ Elimina ordine

**Ordini PREPARING**
- ✅ Aggiungi prodotti (batch system)
- ✅ Preconto (stampa ma NON chiude tavolo)
- ✅ Scontrino fiscale (stampa + chiude tavolo → completed)
- ✅ Chiudi tavolo (chiude senza stampa → completed)
- ✅ Cambia tavolo
- ✅ Elimina ordine

**Ordini COMPLETED**
- ✅ Visualizza (sola lettura)
- ❌ Nessuna azione disponibile
- ❌ Ordine archiviato permanentemente

### Timestamp Obbligatori

Tutte le azioni critiche registrano un timestamp:

| Azione | Campo Timestamp | Timeline Event |
|--------|----------------|----------------|
| **Preconto generato** | `preconto_generated_at` | `preconto_generated` |
| **Scontrino fiscale** | `closed_at` | `completed` |
| **Chiudi tavolo** | `closed_at` | `closed_without_receipt` |
| **Conferma ordine** | `confirmed_at` | `confirmed` |
| **Ordine creato** | `created_at` | `created` |

---

## Architettura Ordini

### Stati Ordine

```typescript
type OrderStatus = 'pending' | 'preparing' | 'completed' | 'cancelled'
```

- **pending**: Ordine creato, in attesa di conferma
- **preparing**: Ordine confermato, in preparazione
- **completed**: Ordine chiuso (con o senza scontrino)
- **cancelled**: Ordine annullato

### Sistema Batch (Portate Multiple)

Quando un tavolo aggiunge prodotti dopo l'ordine iniziale:

```javascript
// Ordine iniziale
Batch 1: Pizza Margherita x2, Coca Cola x1

// Cliente aggiunge dopo 15 minuti
Batch 2: Tiramisù x2, Caffè x2

// Cliente aggiunge dopo altri 10 minuti
Batch 3: Limoncello x2
```

**Funzione**: `ordersService.addProductsToOrder(orderId, items, staffId)`

- Calcola automaticamente il `batch_number` corretto
- Aggiorna `total_amount` dell'ordine
- Registra evento in `order_timeline`
- Traccia analytics

---

## Sviluppo

### Setup Locale

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Variabili Ambiente (.env.local)

```bash
# Google Maps
VITE_GOOGLE_MAPS_API_KEY=your_key

# Stripe (ATTENZIONE: Live keys!)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PRICE_ID=price_...

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Support
VITE_SUPPORT_EMAIL=support@example.com
VITE_FRONTEND_URL=https://your-app.vercel.app
```

### File Principali

```
src/
├── lib/
│   └── ordersService.js       # Logica ordini (1058 righe)
├── utils/
│   ├── analytics.js           # Analytics (1393 righe)
│   └── subscription.js        # Feature gating
├── components/
│   ├── ui/                    # Design system
│   ├── CreateOrderModal.jsx  # Modal crea/aggiungi prodotti
│   └── TableDetailModal.jsx  # Dettaglio ordine tavolo
├── pages/
│   ├── CassaPage.jsx          # Sistema POS/Cassa
│   ├── OrdersPage.jsx         # Lista ordini (camerieri)
│   └── ...
└── styles/
    └── tokens.js              # Design system tokens
```

---

## Database Schema (Supabase)

### Tabelle Principali

- `restaurants` - Dati ristorante
- `rooms` - Sale ristorante
- `tables` - Tavoli per sala
- `categories` - Categorie menu
- `products` - Prodotti menu
- `orders` - Ordini (+ `customer_id` ⭐)
- `order_items` - Prodotti ordinati
- `order_timeline` - Log azioni ordine
- `analytics_events` - Eventi tracciati (+ `customer_id`, `staff_id`, `order_id`, `product_id` ⭐)
- `restaurant_order_settings` - Configurazione ordini
- **`customers`** ⭐ NUOVO - Clienti registrati + anonimi (31 colonne)
- **`loyalty_tiers`** ⭐ NUOVO - Configurazione loyalty program

### View Principali

- `v_active_orders` - Ordini attivi ottimizzata
- `v_product_variants` - Varianti prodotto
- `v_product_variant_options` - Opzioni varianti
- **`customer_analytics`** ⭐ NUOVO - Metriche e segmentazione clienti

### Functions

- **`get_or_create_anonymous_customer(restaurant_id, session_id)`** ⭐ NUOVO
  - Gestisce "Cliente Incognito" per ordini QR
  - Session-based caching (24h)

---

## Deploy

### Vercel

```bash
# Deploy automatico via GitHub
git push origin main

# Deploy manuale
vercel --prod
```

### Configurazione Vercel (vercel.json)

- SPA routing con rewrites
- CORS headers per API routes
- Redirects da vecchi URL hash-based

---

## 📊 Analytics System Documentation

### Quick Links

- **[Complete Events Schema](./docs/archivio/COMPLETE_EVENTS_SCHEMA.md)** - Tutti i 42 eventi documentati
- **[Implementation Guide](./docs/archivio/ANALYTICS_IMPLEMENTATION_GUIDE.md)** - Guida step-by-step
- **[Quick Reference](./docs/archivio/ANALYTICS_QUICK_REFERENCE.md)** - Reference card per sviluppatori
- **[Migration Log](./docs/archivio/DATABASE_MIGRATION_LOG.md)** - Log migrations database
- **[Session Summary](./docs/archivio/SESSION_ANALYTICS_IMPLEMENTATION.md)** - Riepilogo lavoro svolto

### Event Categories (42 Total)

1. **Customer Account** (7 eventi)
   - customer_registered, customer_login, customer_logout, customer_profile_updated
   - loyalty_points_earned, loyalty_points_redeemed, traffic_source_tracked

2. **Public Menu Browsing** (11 eventi)
   - qr_scanned, menu_opened, category_viewed, product_viewed, product_image_viewed
   - product_searched, favorite_added/removed, session_time, opening_hours_viewed, menu_shared

3. **Cart & Checkout** (4 eventi)
   - order_item_added, cart_item_removed, cart_viewed, checkout_started

4. **Order Lifecycle** (10 eventi)
   - order_created, order_status_changed, item_prepared, order_note_added
   - order_confirmed, products_added_to_order, item_removed, order_completed, order_cancelled, table_changed

5. **Staff Operations** (8 eventi)
   - staff_login, staff_logout, table_opened, preconto_generated
   - receipt_printed, priority_order_requested, table_order_pending, table_order_confirmed

6. **Payment & Receipt** (2 eventi)
   - payment_method_selected, discount_applied

### The 5 Pillars

Ogni evento traccia:
- **CHI**: Customer/Staff/Owner con dettagli completi
- **COSA**: Prodotti con SKU, varianti, prezzi, quantità
- **QUANDO**: Timestamp preciso + durate + sessione
- **DOVE**: Tavolo, sala, location, device
- **QUANTO**: Revenue, totali, sconti, loyalty points

### Helper Functions

- `trackOrderCreated()` - Track order con 5 pillars completi
- `trackCartViewed()` - Track apertura carrello
- `trackCartItemRemoved()` - Track rimozione prodotto
- `trackCheckoutStarted()` - Track inizio checkout
- `trackItemPrepared()` - Track preparazione cucina
- `trackStaffLogin/Logout()` - Track sessioni staff
- `trackTrafficSource()` - Track origine traffico
- `getOrCreateAnonymousCustomer()` - Gestisce "Cliente Incognito"

---

## Roadmap

- [x] ✅ **Advanced Analytics System** - Completato 26/10/2025
  - [x] 42 eventi tracciati
  - [x] Customer system (registrati + anonimi)
  - [x] Traffic source tracking
  - [x] Loyalty program (4 tier)
  - [ ] UI Dashboard analytics (in progress)
- [ ] Sistema prenotazioni
- [ ] Gestione staff avanzata (ruoli, turni)
- [ ] Integrazione stampante fiscale
- [ ] App mobile nativa (React Native)
- [ ] Multi-ristorante (chain management)

---

## Supporto

Per supporto o segnalazione bug:
- Email: enzocassese91@gmail.com
- GitHub Issues: https://github.com/your-repo/issues

---

## Licenza

Proprietario - Tutti i diritti riservati
