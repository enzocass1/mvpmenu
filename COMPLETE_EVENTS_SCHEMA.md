# Schema Completo Eventi Analytics - MVP Menu
## Tracking End-to-End con Customer Registration

**Data**: 26 Ottobre 2025
**Versione**: 2.0 - Complete Extended Schema

---

## Indice Eventi per Categoria

1. [Customer Account Events](#1-customer-account-events) (7 eventi)
2. [Public Menu - Browsing Events](#2-public-menu---browsing-events) (11 eventi)
3. [Cart & Checkout Events](#3-cart--checkout-events) (4 eventi)
4. [Order Lifecycle Events](#4-order-lifecycle-events) (10 eventi)
5. [Staff Operations Events](#5-staff-operations-events) (8 eventi)
6. [Payment & Receipt Events](#6-payment--receipt-events) (2 eventi)

**TOTALE: 42 Eventi Tracciati**

---

## 1. Customer Account Events

### 1.1 Customer Registered (`customer_registered`)

**Trigger**: Nuovo cliente crea account

**Schema**:
```javascript
{
  event_type: 'customer_registered',
  restaurant_id: UUID,
  customer_id: UUID,
  created_at: TIMESTAMP,

  actor: {
    type: 'customer',
    customer_id: UUID,
    customer_name: STRING,
    customer_email: STRING,
    customer_phone: STRING,
    customer_locale: 'it-IT'
  },

  metadata: {
    registration_source: 'qr' | 'web' | 'app' | 'social',
    registration_method: 'email' | 'phone' | 'google' | 'facebook',
    marketing_consent: BOOLEAN,
    sms_consent: BOOLEAN,
    push_consent: BOOLEAN,
    referrer: STRING || null,
    utm_source: STRING || null,
    utm_campaign: STRING || null,
    device_type: 'mobile' | 'tablet' | 'desktop',
    user_agent: STRING
  }
}
```

**File**: `src/pages/CustomerRegistration.jsx` (da creare)

---

### 1.2 Customer Login (`customer_login`)

**Trigger**: Cliente esistente fa login

**Schema**:
```javascript
{
  event_type: 'customer_login',
  restaurant_id: UUID,
  customer_id: UUID,
  created_at: TIMESTAMP,

  actor: {
    type: 'customer',
    customer_id: UUID,
    customer_name: STRING,
    customer_email: STRING
  },

  metadata: {
    login_method: 'email' | 'phone' | 'google' | 'facebook',
    device_type: STRING,
    user_agent: STRING,
    ip_address: STRING || null,
    is_returning_customer: BOOLEAN,
    days_since_last_visit: INT || null
  }
}
```

**File**: `src/pages/CustomerLogin.jsx` (da creare)

---

### 1.3 Customer Logout (`customer_logout`)

**Trigger**: Cliente fa logout

**Schema**:
```javascript
{
  event_type: 'customer_logout',
  restaurant_id: UUID,
  customer_id: UUID,
  created_at: TIMESTAMP,

  metadata: {
    session_duration_seconds: INT,
    actions_performed: INT,
    orders_placed: INT
  }
}
```

---

### 1.4 Customer Profile Updated (`customer_profile_updated`)

**Trigger**: Cliente modifica profilo

**Schema**:
```javascript
{
  event_type: 'customer_profile_updated',
  restaurant_id: UUID,
  customer_id: UUID,
  created_at: TIMESTAMP,

  metadata: {
    fields_updated: ARRAY,  // ['name', 'phone', 'dietary_restrictions']
    previous_values: JSONB,
    new_values: JSONB
  }
}
```

---

### 1.5 Customer Loyalty Points Earned (`loyalty_points_earned`)

**Trigger**: Cliente guadagna punti loyalty

**Schema**:
```javascript
{
  event_type: 'loyalty_points_earned',
  restaurant_id: UUID,
  customer_id: UUID,
  order_id: UUID || null,
  created_at: TIMESTAMP,

  metadata: {
    points_earned: INT,
    points_balance_before: INT,
    points_balance_after: INT,
    earn_reason: 'order_completed' | 'birthday' | 'referral' | 'promotion',
    order_value: DECIMAL || null
  }
}
```

---

### 1.6 Customer Loyalty Points Redeemed (`loyalty_points_redeemed`)

**Trigger**: Cliente usa punti per sconto/reward

**Schema**:
```javascript
{
  event_type: 'loyalty_points_redeemed',
  restaurant_id: UUID,
  customer_id: UUID,
  order_id: UUID || null,
  created_at: TIMESTAMP,

  metadata: {
    points_redeemed: INT,
    points_balance_before: INT,
    points_balance_after: INT,
    reward_type: 'discount' | 'free_product' | 'upgrade',
    reward_value: DECIMAL,
    order_id: UUID || null
  }
}
```

---

### 1.7 Traffic Source Tracked (`traffic_source_tracked`)

**Trigger**: Primo accesso al sito (tracking origine)

**Schema**:
```javascript
{
  event_type: 'traffic_source_tracked',
  restaurant_id: UUID,
  customer_id: UUID || null,
  created_at: TIMESTAMP,

  metadata: {
    source: 'qr' | 'organic' | 'social' | 'direct' | 'paid',
    medium: STRING,  // 'qr', 'instagram', 'facebook', 'google', 'tiktok'
    campaign: STRING || null,

    // QR specific
    qr_table_id: UUID || null,
    qr_table_number: INT || null,

    // Social specific
    social_platform: 'instagram' | 'facebook' | 'tiktok' | 'twitter' || null,
    social_post_id: STRING || null,

    // UTM parameters
    utm_source: STRING || null,
    utm_medium: STRING || null,
    utm_campaign: STRING || null,
    utm_content: STRING || null,
    utm_term: STRING || null,

    // Referrer
    referrer: STRING || null,
    referrer_domain: STRING || null,

    // Device
    device_type: STRING,
    user_agent: STRING
  }
}
```

**Metriche**:
- Canale acquisizione più performante
- ROI per canale
- Conversion rate per source

---

## 2. Public Menu - Browsing Events

### 2.1 QR Scanned (`qr_scanned`)

**✅ Già implementato** - vedi `TIMELINE_EVENTS_REFERENCE.md`

**ESTENSIONE - Aggiungere**:
```javascript
metadata: {
  // ... existing
  is_first_visit: BOOLEAN,
  customer_id: UUID || null,  // Se customer loggato
  table_status: 'available' | 'occupied' | 'reserved'
}
```

---

### 2.2 Menu Opened (`menu_opened`)

**Trigger**: Cliente apre/visualizza il menu principale

**Schema**:
```javascript
{
  event_type: 'menu_opened',
  restaurant_id: UUID,
  customer_id: UUID || null,
  created_at: TIMESTAMP,

  metadata: {
    source: 'qr' | 'direct' | 'social',
    table_id: UUID || null,
    is_customer_registered: BOOLEAN,
    device_type: STRING,
    screen_orientation: 'portrait' | 'landscape'
  }
}
```

---

### 2.3 Category Viewed (`category_viewed`)

**✅ Già implementato** - vedi `TIMELINE_EVENTS_REFERENCE.md`

**ESTENSIONE - Aggiungere**:
```javascript
metadata: {
  // ... existing
  customer_id: UUID || null,
  category_position: INT,  // Posizione categoria nel menu
  time_spent_seconds: INT || null  // Calcolato quando passa a altra categoria
}
```

---

### 2.4 Product Viewed (`product_viewed`)

**✅ Già implementato**

**ESTENSIONE - Aggiungere tracciamento dettagliato**:
```javascript
metadata: {
  // ... existing
  customer_id: UUID || null,

  // Engagement dettagliato
  time_spent_seconds: INT,  // Tempo visualizzazione
  scroll_depth_percent: INT,  // 0-100, quanto ha scrollato descrizione
  images_viewed_count: INT,  // Quante immagini ha visto
  images_total: INT,

  // Varianti
  variant_viewed: STRING || null,
  variant_options_viewed: JSONB || null,

  // Azioni durante view
  added_to_favorites: BOOLEAN,
  added_to_cart: BOOLEAN,

  // Context
  view_source: 'category_list' | 'search' | 'favorites' | 'recommended'
}
```

**Implementazione**:
```javascript
// In PublicMenu.jsx
const [productViewStartTime, setProductViewStartTime] = useState({})
const [productScrollDepth, setProductScrollDepth] = useState({})
const [productImagesViewed, setProductImagesViewed] = useState({})

const handleProductExpand = (productId) => {
  setProductViewStartTime(prev => ({
    ...prev,
    [productId]: Date.now()
  }))
}

const handleProductCollapse = (productId) => {
  const viewDuration = Math.floor((Date.now() - productViewStartTime[productId]) / 1000)

  trackProductViewed(restaurant.id, productId, categoryId, {
    time_spent_seconds: viewDuration,
    scroll_depth_percent: productScrollDepth[productId] || 0,
    images_viewed_count: productImagesViewed[productId] || 1
  })
}

// Scroll tracking
const handleProductScroll = (productId, scrollPercent) => {
  setProductScrollDepth(prev => ({
    ...prev,
    [productId]: Math.max(prev[productId] || 0, scrollPercent)
  }))
}
```

---

### 2.5 Product Image Viewed (`product_image_viewed`)

**Trigger**: Cliente swipe/clicca su immagine prodotto (gallery)

**Schema**:
```javascript
{
  event_type: 'product_image_viewed',
  restaurant_id: UUID,
  product_id: UUID,
  customer_id: UUID || null,
  created_at: TIMESTAMP,

  metadata: {
    product_name: STRING,
    image_index: INT,  // 0, 1, 2, ...
    image_url: STRING,
    total_images: INT,
    view_duration_seconds: INT || null
  }
}
```

---

### 2.6 Product Search Performed (`product_searched`)

**Trigger**: Cliente usa search bar per cercare prodotto

**Schema**:
```javascript
{
  event_type: 'product_searched',
  restaurant_id: UUID,
  customer_id: UUID || null,
  created_at: TIMESTAMP,

  metadata: {
    search_query: STRING,
    search_query_normalized: STRING,  // lowercase, trimmed
    results_count: INT,
    results_product_ids: ARRAY,

    // Search outcome
    clicked_result: BOOLEAN,
    clicked_product_id: UUID || null,
    clicked_result_position: INT || null,

    // Context
    search_source: 'menu_top' | 'category' | 'empty_state',
    device_type: STRING
  }
}
```

**Metriche**:
- Most searched terms
- Zero-result searches (prodotti richiesti ma non disponibili)
- Search → Click conversion
- Search → Order conversion

---

### 2.7 Favorite Added (`favorite_added`)

**✅ Già implementato**

**ESTENSIONE**:
```javascript
metadata: {
  // ... existing
  customer_id: UUID || null,
  favorites_count_after: INT,
  time_since_product_view_seconds: INT
}
```

---

### 2.8 Favorite Removed (`favorite_removed`)

**✅ Già implementato**

**ESTENSIONE**: Come favorite_added

---

### 2.9 Session Time (`session_time`)

**✅ Già implementato**

**ESTENSIONE - Tracciamento dettagliato**:
```javascript
metadata: {
  // ... existing
  customer_id: UUID || null,

  // Pages/Sections visited
  pages_visited: ARRAY,  // ['menu', 'category_pizze', 'product_123', 'cart']
  unique_pages_count: INT,

  // Actions performed
  actions_performed: ARRAY,  // ['view_product', 'add_to_cart', 'add_favorite']
  actions_count: INT,

  // Engagement metrics
  categories_viewed: INT,
  products_viewed: INT,
  products_added_to_cart: INT,
  favorites_added: INT,
  searches_performed: INT,

  // Exit behavior
  exit_page: STRING,
  exit_reason: 'order_completed' | 'abandoned' | 'navigation' || null,

  // Visitor type
  is_return_visitor: BOOLEAN,
  previous_visit_date: TIMESTAMP || null,
  days_since_last_visit: INT || null
}
```

**Implementazione**:
```javascript
// In PublicMenu.jsx - Enhanced session tracking
const [sessionData, setSessionData] = useState({
  startTime: Date.now(),
  pagesVisited: [],
  actionsPerformed: [],
  categoriesViewed: new Set(),
  productsViewed: new Set(),
  productsAddedToCart: 0,
  favoritesAdded: 0,
  searchesPerformed: 0
})

const trackAction = (action, page) => {
  setSessionData(prev => ({
    ...prev,
    pagesVisited: [...new Set([...prev.pagesVisited, page])],
    actionsPerformed: [...prev.actionsPerformed, { action, timestamp: Date.now() }]
  }))
}

// On unmount or page leave
useEffect(() => {
  return () => {
    const duration = Math.floor((Date.now() - sessionData.startTime) / 1000)
    trackSessionTime(restaurant.id, duration, {
      pages_visited: sessionData.pagesVisited,
      actions_performed: sessionData.actionsPerformed.map(a => a.action),
      categories_viewed: sessionData.categoriesViewed.size,
      products_viewed: sessionData.productsViewed.size,
      // ... other metrics
    })
  }
}, [])
```

---

### 2.10 Opening Hours Viewed (`opening_hours_viewed`)

**Trigger**: Cliente clicca/espande orari di apertura

**Schema**:
```javascript
{
  event_type: 'opening_hours_viewed',
  restaurant_id: UUID,
  customer_id: UUID || null,
  created_at: TIMESTAMP,

  metadata: {
    is_currently_open: BOOLEAN,
    current_day: STRING,
    current_time: TIME,
    device_type: STRING
  }
}
```

---

### 2.11 Menu Shared (`menu_shared`)

**Trigger**: Cliente usa funzione "Condividi menu"

**Schema**:
```javascript
{
  event_type: 'menu_shared',
  restaurant_id: UUID,
  customer_id: UUID || null,
  created_at: TIMESTAMP,

  metadata: {
    share_method: 'whatsapp' | 'facebook' | 'instagram' | 'twitter' | 'copy_link' | 'email',
    share_content: 'full_menu' | 'product' | 'category',
    product_id: UUID || null,
    category_id: UUID || null,
    device_type: STRING
  }
}
```

---

## 3. Cart & Checkout Events

### 3.1 Item Added to Cart (`order_item_added`)

**✅ Già implementato**

**ESTENSIONE - Arricchire**:
```javascript
{
  event_type: 'order_item_added',
  restaurant_id: UUID,
  product_id: UUID,
  customer_id: UUID || null,
  created_at: TIMESTAMP,

  metadata: {
    // Prodotto COMPLETO (come richiesto)
    product_name: STRING,
    product_sku: STRING,
    product_price: DECIMAL,
    category_id: UUID,
    category_name: STRING,

    // Variante COMPLETA (come richiesto)
    variant_id: UUID || null,
    variant_title: STRING || null,
    variant_options: {
      size: STRING,
      temperature: STRING,
      // ... altre opzioni
    },
    variant_price_modifier: DECIMAL,  // +0.50 per size grande

    // Quantità e prezzi
    quantity: INT,
    unit_price: DECIMAL,  // Prezzo finale con variant modifier
    subtotal: DECIMAL,

    // Personalizzazioni
    notes: STRING || null,
    has_modifications: BOOLEAN,

    // Allergens & Diet
    allergens: ARRAY,  // ['gluten', 'dairy', 'nuts']
    dietary_tags: ARRAY,  // ['vegetarian', 'vegan', 'gluten-free']

    // Preparazione
    preparation_time_minutes: INT,
    is_available: BOOLEAN,

    // Cart state DOPO aggiunta
    cart_items_count_after: INT,
    cart_subtotal_after: DECIMAL,
    cart_total_after: DECIMAL,

    // Context
    added_from: 'product_view' | 'search' | 'favorites' | 'recommended',
    time_since_product_view_seconds: INT || null,

    // Customer context
    customer_id: UUID || null,
    is_customer_registered: BOOLEAN,
    customer_order_history_count: INT || null
  }
}
```

---

### 3.2 Item Removed from Cart (`cart_item_removed`)

**Trigger**: Cliente rimuove prodotto dal carrello

**Schema**:
```javascript
{
  event_type: 'cart_item_removed',
  restaurant_id: UUID,
  product_id: UUID,
  customer_id: UUID || null,
  created_at: TIMESTAMP,

  metadata: {
    // Prodotto rimosso
    product_name: STRING,
    product_sku: STRING,
    variant_title: STRING || null,
    quantity_removed: INT,
    subtotal_removed: DECIMAL,

    // Motivo (se disponibile)
    removal_reason: 'user_action' | 'out_of_stock' | 'price_changed' || null,

    // Time in cart
    time_in_cart_seconds: INT,

    // Cart state DOPO rimozione
    cart_items_count_after: INT,
    cart_subtotal_after: DECIMAL,
    cart_total_after: DECIMAL,

    // Context
    removed_from: 'cart_view' | 'checkout',
    device_type: STRING
  }
}
```

**Metriche**:
- Prodotti più rimossi (potenziali problemi)
- Cart abandonment rate
- Time in cart before removal

---

### 3.3 Cart Viewed (`cart_viewed`)

**Trigger**: Cliente apre/visualizza carrello

**Schema**:
```javascript
{
  event_type: 'cart_viewed',
  restaurant_id: UUID,
  customer_id: UUID || null,
  created_at: TIMESTAMP,

  metadata: {
    // Cart snapshot
    items_count: INT,
    unique_products_count: INT,
    cart_subtotal: DECIMAL,
    cart_total: DECIMAL,

    // Items in cart
    product_ids: ARRAY,
    product_skus: ARRAY,

    // Context
    viewed_from: 'menu' | 'product_page' | 'floating_button',
    time_since_last_addition_seconds: INT || null,

    // Customer
    customer_id: UUID || null,
    is_customer_registered: BOOLEAN,

    // Device
    device_type: STRING
  }
}
```

**Metriche**:
- Cart view → Checkout conversion
- Average cart value at view
- Items in cart when viewed

---

### 3.4 Checkout Started (`checkout_started`)

**Trigger**: Cliente clicca "Invia Ordine" / "Procedi al checkout"

**Schema**:
```javascript
{
  event_type: 'checkout_started',
  restaurant_id: UUID,
  customer_id: UUID || null,
  created_at: TIMESTAMP,

  metadata: {
    // Cart snapshot COMPLETO
    items_count: INT,
    unique_products_count: INT,
    cart_subtotal: DECIMAL,
    has_priority_order: BOOLEAN,
    priority_fee: DECIMAL,
    cart_total: DECIMAL,

    // Items dettagliati
    items: [
      {
        product_id: UUID,
        product_name: STRING,
        product_sku: STRING,
        variant_title: STRING || null,
        quantity: INT,
        unit_price: DECIMAL,
        subtotal: DECIMAL
      }
    ],

    // Table info
    table_id: UUID || null,
    table_number: INT || null,
    room_id: UUID || null,
    room_name: STRING || null,

    // Customer
    customer_id: UUID || null,
    customer_name: STRING || 'Cliente Incognito',
    is_customer_registered: BOOLEAN,

    // Session context
    session_duration_seconds: INT,
    time_since_first_add_to_cart_seconds: INT,

    // Device
    device_type: STRING
  }
}
```

**Metriche CRITICHE**:
- Checkout started → Order completed rate
- Checkout abandonment rate
- Time from checkout to order
- Average cart value at checkout

---

## 4. Order Lifecycle Events

### 4.1 Order Created (`order_created`)

**Trigger**: Ordine creato con successo

**Schema COMPLETO (come richiesto)**:
```javascript
{
  event_type: 'order_created',
  restaurant_id: UUID,
  order_id: UUID,
  customer_id: UUID || null,
  table_id: UUID || null,
  room_id: UUID || null,
  created_at: TIMESTAMP,

  // CHI (Customer registrato o incognito)
  actor: {
    type: 'customer' | 'staff' | 'owner',

    // Se customer
    customer_id: UUID || null,
    customer_name: STRING || 'Cliente Incognito',
    customer_email: STRING || null,
    customer_phone: STRING || null,
    customer_locale: 'it-IT',

    // Customer status
    is_registered: BOOLEAN,
    is_anonymous: BOOLEAN,  // true se "Cliente Incognito"
    is_first_order: BOOLEAN,

    // Customer loyalty
    loyalty_tier: 'none' | 'bronze' | 'silver' | 'gold' || null,
    loyalty_points_balance: INT || null,
    lifetime_value: DECIMAL || null,
    total_orders_count: INT || null,

    // Customer preferences
    dietary_restrictions: ARRAY || null,  // ['vegetarian', 'gluten-free']
    allergies: ARRAY || null,  // ['nuts', 'dairy']

    // Se staff/owner
    staff_id: UUID || null,
    staff_name: STRING || null,
    staff_role_display: STRING || null
  },

  // COSA (Ordine base)
  order_data: {
    id: UUID,
    order_number: STRING,
    status: 'pending',
    type: 'table' | 'counter',
    source: 'qr' | 'pos' | 'web' | 'app'
  },

  // COSA (Prodotti COMPLETI - come richiesto)
  items: [
    {
      // Identificazione
      product_id: UUID,
      product_name: STRING,
      product_sku: STRING,
      category_id: UUID,
      category_name: STRING,

      // Varianti COMPLETE (come richiesto)
      variant_id: UUID || null,
      variant_title: STRING || null,
      variant_options: {
        size: 'Normale' | 'Grande',
        temperature: 'Fredda' | 'Calda',
        crust: 'Classica' | 'Integrale',
        // ... altre opzioni variante
      },
      variant_price_modifier: DECIMAL,  // +0.50

      // Prezzi
      quantity: INT,
      unit_price: DECIMAL,  // Prezzo base prodotto
      final_unit_price: DECIMAL,  // unit_price + variant_price_modifier
      subtotal: DECIMAL,  // final_unit_price * quantity
      discount: DECIMAL,

      // Personalizzazioni
      notes: STRING || null,
      has_modifications: BOOLEAN,

      // Info nutrizionali/allergens
      allergens: ARRAY,  // ['gluten', 'dairy', 'nuts']
      dietary_tags: ARRAY,  // ['vegetarian', 'vegan']
      calories: INT || null,

      // Preparazione
      preparation_time_minutes: INT,
      batch_number: INT,  // 1 = prima portata, 2 = seconda, etc.
      prepared: BOOLEAN,
      prepared_at: TIMESTAMP || null,
      prepared_by_staff_id: UUID || null,

      // Availability
      is_available: BOOLEAN,
      stock_level: 'in_stock' | 'low_stock' | 'out_of_stock' || null
    }
  ],

  // DOVE (Location)
  location: {
    table_id: UUID || null,
    table_number: INT || null,
    room_id: UUID || null,
    room_name: STRING || null,
    seats: INT || null,
    table_status_before: STRING || null
  },

  // QUANTO (Money - come richiesto con Priority Order)
  money: {
    items_subtotal: DECIMAL,

    // Priority Order (come richiesto)
    priority_fee: DECIMAL,
    has_priority: BOOLEAN,

    // Altri fee
    service_fee: DECIMAL,
    delivery_fee: DECIMAL,

    // Sconti
    discount: DECIMAL,
    discount_code: STRING || null,
    discount_type: 'percentage' | 'fixed' | 'loyalty_points' || null,

    // Tasse
    tax: DECIMAL,
    tax_rate: DECIMAL,

    // Totale
    total: DECIMAL,
    currency: 'EUR',

    // Loyalty points
    loyalty_points_used: INT || null,
    loyalty_points_earned: INT || null
  },

  // QUANDO (Timing)
  timing: {
    created_at: TIMESTAMP,
    estimated_ready_at: TIMESTAMP || null,
    estimated_prep_time_minutes: INT || null,

    // Session timing
    session_start_time: TIMESTAMP || null,
    time_from_qr_scan_seconds: INT || null,
    time_from_first_product_view_seconds: INT || null,
    time_from_checkout_started_seconds: INT || null
  },

  // FLAGS
  flags: {
    is_priority_order: BOOLEAN,
    is_first_order: BOOLEAN,
    has_allergens: BOOLEAN,
    has_modifications: BOOLEAN,
    has_dietary_restrictions: BOOLEAN,
    has_discount: BOOLEAN,
    has_loyalty_redemption: BOOLEAN,
    is_peak_hour: BOOLEAN,
    is_weekend: BOOLEAN
  },

  // KPI (calcolati)
  kpi: {
    total_items_count: INT,
    unique_products_count: INT,
    unique_categories_count: INT,
    average_item_price: DECIMAL,
    has_upsell_potential: BOOLEAN,
    order_value_tier: 'low' | 'medium' | 'high'
  },

  // METADATA esteso
  metadata: {
    // Traffic source (come richiesto)
    traffic_source: 'qr' | 'organic' | 'social' | 'direct',
    traffic_medium: STRING,  // 'instagram', 'facebook', 'tiktok', 'google'
    utm_source: STRING || null,
    utm_campaign: STRING || null,
    social_platform: STRING || null,

    // Device
    device_type: 'mobile' | 'tablet' | 'desktop',
    user_agent: STRING,
    screen_width: INT,
    screen_height: INT,

    // Session behavior
    session_duration_seconds: INT,
    categories_browsed: INT,
    products_viewed: INT,
    favorites_added: INT,
    searches_performed: INT,

    // Restaurant context
    table_occupancy_percent: DECIMAL,  // % tavoli occupati
    staff_workload_level: 'low' | 'medium' | 'high',

    // Weather (se integrato)
    weather: STRING || null,
    temperature: INT || null,

    // Special events
    is_special_event: BOOLEAN,
    event_name: STRING || null,

    // Notes
    customer_notes: STRING || null,
    internal_notes: STRING || null
  }
}
```

**File**:
- `Cart.jsx` (customer order from QR)
- `CreateOrderModal.jsx` (staff order from POS)

---

### 4.2 Order Status Changed (`order_status_changed`)

**Trigger**: Cambio status ordine (pending → confirmed → preparing → completed)

**Schema**:
```javascript
{
  event_type: 'order_status_changed',
  restaurant_id: UUID,
  order_id: UUID,
  created_at: TIMESTAMP,

  actor: {
    type: 'staff' | 'owner' | 'system',
    staff_id: UUID || null,
    staff_name: STRING || null,
    staff_role_display: STRING || null
  },

  metadata: {
    previous_status: 'pending' | 'confirmed' | 'preparing' | 'completed',
    new_status: 'confirmed' | 'preparing' | 'completed',

    // Timing
    time_in_previous_status_seconds: INT,
    time_since_order_created_seconds: INT,

    // Context
    changed_reason: STRING || null,
    notes: STRING || null
  }
}
```

**Metriche**:
- Time in each status
- Bottlenecks nel workflow
- Staff performance per status change

---

### 4.3 Item Marked as Prepared (`item_prepared`)

**Trigger**: Cucina/staff segna item come preparato

**Schema**:
```javascript
{
  event_type: 'item_prepared',
  restaurant_id: UUID,
  order_id: UUID,
  product_id: UUID,
  created_at: TIMESTAMP,

  actor: {
    type: 'staff',
    staff_id: UUID,
    staff_name: STRING,
    staff_role_display: STRING  // 'Cuoco', 'Barista'
  },

  metadata: {
    product_name: STRING,
    product_sku: STRING,
    quantity: INT,
    batch_number: INT,

    // Timing
    preparation_time_seconds: INT,
    estimated_prep_time_minutes: INT,
    is_late: BOOLEAN,

    // Order progress
    items_prepared_count: INT,
    items_total_count: INT,
    order_completion_percent: DECIMAL
  }
}
```

**Metriche**:
- Velocità preparazione per prodotto
- Velocità per staff
- Prodotti in ritardo

---

### 4.4 Note Added to Order (`order_note_added`)

**Trigger**: Staff aggiunge nota a ordine

**Schema**:
```javascript
{
  event_type: 'order_note_added',
  restaurant_id: UUID,
  order_id: UUID,
  created_at: TIMESTAMP,

  actor: {
    type: 'staff' | 'owner',
    staff_id: UUID,
    staff_name: STRING
  },

  metadata: {
    note_text: STRING,
    note_type: 'internal' | 'customer_facing' | 'kitchen',
    note_priority: 'low' | 'medium' | 'high',
    order_status: STRING
  }
}
```

---

### 4.5 Order Confirmed (`order_confirmed`)

**✅ Già documentato** - vedi `TIMELINE_EVENTS_REFERENCE.md`

### 4.6 Products Added to Order (`products_added_to_order`)

**✅ Già documentato** (upsell)

### 4.7 Product Removed from Order (`item_removed`)

**✅ Già documentato**

### 4.8 Order Completed (`order_completed`)

**✅ Già documentato** - con tutti i prodotti

### 4.9 Order Cancelled/Deleted (`order_cancelled`)

**✅ Già documentato**

### 4.10 Table Changed (`table_changed`)

**✅ Già documentato**

---

## 5. Staff Operations Events

### 5.1 Staff Login (`staff_login`)

**Trigger**: Staff fa login al sistema

**Schema**:
```javascript
{
  event_type: 'staff_login',
  restaurant_id: UUID,
  staff_id: UUID,
  created_at: TIMESTAMP,

  actor: {
    type: 'staff',
    staff_id: UUID,
    staff_name: STRING,
    staff_role: STRING,
    staff_role_display: STRING
  },

  metadata: {
    login_method: 'pin' | 'password' | 'biometric',
    device_type: STRING,
    device_id: STRING || null,
    ip_address: STRING || null,
    location: STRING || null,
    shift_start_time: TIMESTAMP
  }
}
```

---

### 5.2 Staff Logout (`staff_logout`)

**Trigger**: Staff fa logout

**Schema**:
```javascript
{
  event_type: 'staff_logout',
  restaurant_id: UUID,
  staff_id: UUID,
  created_at: TIMESTAMP,

  metadata: {
    session_duration_seconds: INT,
    shift_duration_seconds: INT,

    // Performance durante turno
    orders_handled: INT,
    items_prepared: INT,
    revenue_generated: DECIMAL,

    logout_reason: 'end_shift' | 'break' | 'manual' | 'timeout'
  }
}
```

**Metriche**:
- Ore lavorate per staff
- Performance per turno
- Revenue per staff per shift

---

### 5.3 Table Opened (`table_opened`)

**Trigger**: Staff "apre" tavolo (occupa senza ancora creare ordine)

**Schema**:
```javascript
{
  event_type: 'table_opened',
  restaurant_id: UUID,
  table_id: UUID,
  room_id: UUID,
  created_at: TIMESTAMP,

  actor: {
    type: 'staff' | 'owner',
    staff_id: UUID,
    staff_name: STRING
  },

  metadata: {
    table_number: INT,
    room_name: STRING,
    seats: INT,
    party_size: INT || null,
    reservation_id: UUID || null,
    customer_name: STRING || null,

    // Context
    table_status_before: 'available',
    table_occupancy_percent: DECIMAL  // % tavoli già occupati
  }
}
```

**Metriche**:
- Tempo tavolo aperto → ordine creato
- Table turnover
- Peak occupancy times

---

### 5.4 Preconto Generated (`preconto_generated`)

**✅ Già documentato**

### 5.5 Receipt Printed (`receipt_printed`)

**Trigger**: Stampa scontrino/preconto

**Schema**:
```javascript
{
  event_type: 'receipt_printed',
  restaurant_id: UUID,
  order_id: UUID,
  created_at: TIMESTAMP,

  actor: {
    type: 'staff' | 'owner',
    staff_id: UUID,
    staff_name: STRING
  },

  metadata: {
    receipt_type: 'preconto' | 'scontrino_fiscale',
    receipt_number: INT || null,
    is_reprint: BOOLEAN,
    reprint_count: INT,
    order_total: DECIMAL,

    // Device
    printer_id: STRING || null,
    print_success: BOOLEAN
  }
}
```

**Metriche**:
- Reprint rate (ristampe multiple)
- Problemi stampante

---

### 5.6-5.8 Altri eventi già documentati

- Order status changed
- Item prepared
- Note added

---

## 6. Payment & Receipt Events

### 6.1 Payment Method Selected (`payment_method_selected`)

**Trigger**: Cliente/staff seleziona metodo pagamento

**Schema**:
```javascript
{
  event_type: 'payment_method_selected',
  restaurant_id: UUID,
  order_id: UUID,
  created_at: TIMESTAMP,

  actor: {
    type: 'customer' | 'staff' | 'owner',
    customer_id: UUID || null,
    staff_id: UUID || null
  },

  metadata: {
    payment_method: 'cash' | 'card' | 'digital_wallet' | 'app',
    payment_provider: STRING || null,  // 'stripe', 'sumup', 'satispay'
    order_total: DECIMAL,

    // Context
    selected_at_stage: 'checkout' | 'table_close',
    time_to_select_seconds: INT || null
  }
}
```

---

### 6.2 Discount Applied (`discount_applied`)

**Trigger**: Sconto applicato a ordine

**Schema**:
```javascript
{
  event_type: 'discount_applied',
  restaurant_id: UUID,
  order_id: UUID,
  created_at: TIMESTAMP,

  actor: {
    type: 'staff' | 'owner' | 'system',
    staff_id: UUID || null
  },

  metadata: {
    discount_type: 'percentage' | 'fixed_amount' | 'loyalty_points' | 'promo_code',
    discount_code: STRING || null,
    discount_value: DECIMAL,
    discount_percent: DECIMAL || null,

    // Impact
    order_subtotal_before: DECIMAL,
    order_subtotal_after: DECIMAL,
    savings: DECIMAL,

    // Context
    applied_reason: STRING || null,
    campaign_id: UUID || null
  }
}
```

---

## Database Schema Extensions

### Tabella `customers` (da creare)

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),

  -- Basic info
  name VARCHAR(200),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50),
  locale VARCHAR(10) DEFAULT 'it-IT',

  -- Status
  is_registered BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,

  -- Loyalty
  loyalty_tier VARCHAR(20) DEFAULT 'none',
  loyalty_points INT DEFAULT 0,
  lifetime_value DECIMAL(10,2) DEFAULT 0,
  total_orders_count INT DEFAULT 0,

  -- Preferences
  dietary_restrictions TEXT[],
  allergies TEXT[],
  favorite_products UUID[],

  -- Marketing
  marketing_consent BOOLEAN DEFAULT false,
  sms_consent BOOLEAN DEFAULT false,
  push_consent BOOLEAN DEFAULT false,

  -- Metadata
  registration_source VARCHAR(50),
  registration_method VARCHAR(50),

  -- Timestamps
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_order_at TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_customers_restaurant ON customers(restaurant_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_loyalty ON customers(loyalty_tier, loyalty_points);
```

---

## Summary per Priorità

### 🔴 ALTA PRIORITÀ (Implementare Subito)

1. **Order Created Enhanced** - Con tutti i dettagli prodotti/customer/priority
2. **Customer Registration System** - Tabella + eventi
3. **Cart Events** - Item removed, Cart viewed, Checkout started
4. **Traffic Source Tracking** - QR vs Organic vs Social
5. **Item Marked as Prepared** - Performance cucina
6. **Order Status Changed** - Workflow tracking

### 🟡 MEDIA PRIORITÀ

7. Staff Login/Logout
8. Table Opened
9. Receipt Printed
10. Product Viewed Enhanced (scroll, time, images)
11. Session Time Enhanced (pages, actions, exit)
12. Note Added to Order

### 🟢 BASSA PRIORITÀ

13. Product Search
14. Product Image Viewed
15. Menu Shared
16. Opening Hours Viewed
17. Payment Method Selected
18. Discount Applied

---

**TOTALE: 42 Eventi Completi Documentati**

**Prossimo step**: Conferma quali implementare e procedo con codice + migrations!
