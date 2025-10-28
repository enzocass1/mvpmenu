# Guida Implementazione Analytics Completo

**Data**: 26 Ottobre 2025
**Versione**: 1.0
**Sistema**: MVP Menu - Advanced Analytics Tracking

---

## 📋 Indice

1. [Setup Database](#1-setup-database)
2. [Implementazione Order Created Enhanced](#2-implementazione-order-created-enhanced)
3. [Implementazione Cart Events](#3-implementazione-cart-events)
4. [Implementazione Traffic Source](#4-implementazione-traffic-source)
5. [Implementazione Staff Events](#5-implementazione-staff-events)
6. [Implementazione Customer Registration](#6-implementazione-customer-registration)
7. [Testing](#7-testing)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Setup Database

### Step 1.1: Eseguire Migration SQL

Esegui il file di migration completo su Supabase:

```bash
# File: database/migrations/analytics_complete_migration.sql
```

Questo script crea:
- ✅ Constraint aggiornato per `analytics_events` (42 event types)
- ✅ Tabella `customers`
- ✅ Tabella `loyalty_tiers`
- ✅ Indexes ottimizzati
- ✅ Triggers automatici
- ✅ RLS policies
- ✅ View `customer_analytics`
- ✅ Function `get_or_create_anonymous_customer()`

### Step 1.2: Verifica Migration

Dopo l'esecuzione, verifica che tutto sia ok:

```sql
-- Verifica constraint analytics_events
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'analytics_events'::regclass
  AND conname = 'analytics_events_event_type_check';

-- Verifica tabella customers
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'customers'
ORDER BY ordinal_position;

-- Verifica view customer_analytics
SELECT * FROM customer_analytics LIMIT 1;
```

### Step 1.3: Test Function

Testa la funzione per customer anonimi:

```sql
SELECT get_or_create_anonymous_customer(
  'your-restaurant-id-here'::uuid,
  'test-session-123'
);
```

---

## 2. Implementazione Order Created Enhanced

### Step 2.1: Update Cart.jsx (Public Menu)

Quando cliente crea ordine da QR menu:

```javascript
// In Cart.jsx
import { trackOrderCreated } from '../utils/richAnalytics'
import { getOrCreateAnonymousCustomer } from '../utils/customerUtils'
import { getSavedTrafficSource } from '../hooks/useTrafficSource'

const handlePlaceOrder = async () => {
  try {
    // 1. Get or create anonymous customer
    const sessionId = localStorage.getItem('session_id') || crypto.randomUUID()
    const { customer } = await getOrCreateAnonymousCustomer(restaurant.id, sessionId)

    // 2. Get traffic source from localStorage
    const trafficSource = getSavedTrafficSource() || { source: 'qr' }

    // 3. Get session data
    const sessionData = {
      startTime: sessionStartTime, // Saved in state
      duration: Math.floor((Date.now() - sessionStartTime) / 1000),
      timeFromQRScan: Math.floor((Date.now() - qrScanTime) / 1000),
      categoriesBrowsed: categoriesViewed.size,
      productsViewed: productsViewed.size,
      favoritesAdded: favoritesCount
    }

    // 4. Create order in database
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert([{
        restaurant_id: restaurant.id,
        customer_id: customer.id,
        table_id: tableId,
        room_id: roomId,
        status: 'pending',
        total_amount: total,
        priority_order_amount: isPriorityOrder ? priorityFee : 0,
        is_priority_order: isPriorityOrder,
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (orderError) throw orderError

    // 5. Insert order items
    const orderItems = cart.map(item => ({
      order_id: newOrder.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_sku: item.sku || `SKU-${item.product_id.substring(0, 8)}`,
      category_id: item.category_id,
      category_name: item.category_name,
      variant_title: item.variant?.name || null,
      variant_options: item.variant?.options || {},
      quantity: item.quantity,
      product_price: item.price,
      subtotal: item.price * item.quantity,
      notes: item.notes,
      batch_number: 1
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) throw itemsError

    // 6. Track order_created event con TUTTI i dettagli
    await trackOrderCreated({
      restaurantId: restaurant.id,
      order: newOrder,
      items: orderItems,
      actor: {
        type: 'customer',
        customer_id: customer.id,
        customer_name: customer.name
      },
      customer: customer,
      location: {
        table_id: tableId,
        table_number: tableNumber,
        room_id: roomId,
        room_name: roomName
      },
      sessionData: sessionData,
      trafficSource: trafficSource,
      flags: {
        is_first_order: customer.total_orders_count === 0
      }
    })

    console.log('✅ Order created + Analytics tracked')

    // Clear cart
    setCart([])
    navigate('/order-confirmation')
  } catch (error) {
    console.error('[handlePlaceOrder] Error:', error)
  }
}
```

### Step 2.2: Update CreateOrderModal.jsx (Staff POS)

Quando staff crea ordine da gestionale:

```javascript
// In CreateOrderModal.jsx
import { trackOrderCreated } from '../utils/richAnalytics'

const handleCreateOrder = async () => {
  try {
    // 1. Create order
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert([{
        restaurant_id: restaurant.id,
        customer_id: null, // Staff order = no customer
        table_id: selectedTableId,
        room_id: selectedRoomId,
        status: 'pending',
        total_amount: total,
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (orderError) throw orderError

    // 2. Insert items
    const orderItems = selectedProducts.map(item => ({
      order_id: newOrder.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_sku: item.sku,
      quantity: item.quantity,
      product_price: item.price,
      subtotal: item.price * item.quantity,
      batch_number: 1
    }))

    await supabase.from('order_items').insert(orderItems)

    // 3. Track order_created
    await trackOrderCreated({
      restaurantId: restaurant.id,
      order: newOrder,
      items: orderItems,
      actor: {
        type: 'staff',
        staff_id: currentUser.id,
        staff_name: currentUser.name,
        staff_role_display: currentUser.displayRole
      },
      customer: null, // Staff order = Cliente Incognito
      location: {
        table_id: selectedTableId,
        table_number: selectedTableNumber,
        room_id: selectedRoomId,
        room_name: selectedRoomName
      },
      trafficSource: { source: 'pos' },
      flags: {}
    })

    console.log('✅ Staff order created + Analytics tracked')
    onClose()
  } catch (error) {
    console.error('[handleCreateOrder] Error:', error)
  }
}
```

---

## 3. Implementazione Cart Events

### Step 3.1: Track Cart Item Removed

```javascript
// In Cart.jsx
import { trackCartItemRemoved } from '../utils/richAnalytics'

const handleRemoveItem = async (productId) => {
  const itemToRemove = cart.find(item => item.product_id === productId)
  if (!itemToRemove) return

  const timeInCart = Math.floor((Date.now() - (itemToRemove.addedAt || Date.now())) / 1000)

  // Remove from cart
  const newCart = cart.filter(item => item.product_id !== productId)
  setCart(newCart)

  // Calculate new totals
  const newSubtotal = newCart.reduce((sum, item) => sum + item.subtotal, 0)
  const newTotal = newSubtotal + (isPriorityOrder ? priorityFee : 0)

  // Track event
  await trackCartItemRemoved({
    restaurantId: restaurant.id,
    productId: itemToRemove.product_id,
    productName: itemToRemove.product_name,
    productSku: itemToRemove.sku,
    variantTitle: itemToRemove.variant?.name,
    quantityRemoved: itemToRemove.quantity,
    subtotalRemoved: itemToRemove.subtotal,
    timeInCartSeconds: timeInCart,
    cartStateAfter: {
      itemsCount: newCart.length,
      subtotal: newSubtotal,
      total: newTotal
    },
    customerId: customer?.id || null,
    removedFrom: 'cart_view'
  })

  console.log('✅ Cart item removed + Analytics tracked')
}
```

### Step 3.2: Track Cart Viewed

```javascript
// In Cart.jsx
import { trackCartViewed } from '../utils/richAnalytics'

useEffect(() => {
  // Track quando viene aperto il modal carrello
  if (isCartOpen && cart.length > 0) {
    trackCartViewed({
      restaurantId: restaurant.id,
      itemsCount: cart.length,
      uniqueProductsCount: new Set(cart.map(i => i.product_id)).size,
      cartSubtotal: subtotal,
      cartTotal: total,
      productIds: cart.map(i => i.product_id),
      productSkus: cart.map(i => i.sku),
      customerId: customer?.id || null,
      viewedFrom: 'floating_button',
      timeSinceLastAdditionSeconds: lastAddTime
        ? Math.floor((Date.now() - lastAddTime) / 1000)
        : null
    })

    console.log('✅ Cart viewed + Analytics tracked')
  }
}, [isCartOpen])
```

### Step 3.3: Track Checkout Started

```javascript
// In Cart.jsx
import { trackCheckoutStarted } from '../utils/richAnalytics'

const handleCheckoutClick = async () => {
  // Track checkout started
  await trackCheckoutStarted({
    restaurantId: restaurant.id,
    items: cart.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name,
      product_sku: item.sku,
      variant_title: item.variant?.name,
      quantity: item.quantity,
      unit_price: item.price,
      subtotal: item.subtotal
    })),
    cartSubtotal: subtotal,
    hasPriorityOrder: isPriorityOrder,
    priorityFee: isPriorityOrder ? priorityFee : 0,
    cartTotal: total,
    tableId: tableId,
    tableNumber: tableNumber,
    roomId: roomId,
    roomName: roomName,
    customerId: customer?.id || null,
    customerName: customer?.name || 'Cliente Incognito',
    isCustomerRegistered: !!customer?.is_registered,
    sessionDurationSeconds: Math.floor((Date.now() - sessionStartTime) / 1000),
    timeSinceFirstAddSeconds: firstAddToCartTime
      ? Math.floor((Date.now() - firstAddToCartTime) / 1000)
      : null
  })

  console.log('✅ Checkout started + Analytics tracked')

  // Proceed to order placement
  setShowCheckout(true)
}
```

---

## 4. Implementazione Traffic Source

### Step 4.1: Add Hook to PublicMenu.jsx

```javascript
// In PublicMenu.jsx
import useTrafficSource from '../hooks/useTrafficSource'

function PublicMenu() {
  const { restaurantId, tableId, tableNumber } = useParams()
  const [customer, setCustomer] = useState(null)

  // Track traffic source automatically
  const trafficSource = useTrafficSource(
    restaurantId,
    tableId,
    tableNumber,
    customer?.id || null
  )

  useEffect(() => {
    console.log('🔍 Traffic source detected:', trafficSource)
  }, [trafficSource])

  // ... rest of component
}
```

L'hook `useTrafficSource` automaticamente:
- ✅ Detecta la sorgente (QR, organic, social)
- ✅ Traccia l'evento `traffic_source_tracked`
- ✅ Salva in localStorage per la sessione
- ✅ Parse UTM parameters
- ✅ Identifica social platform (Instagram, Facebook, TikTok)

---

## 5. Implementazione Staff Events

### Step 5.1: Track Staff Login

```javascript
// In StaffLogin.jsx
import { trackStaffLogin } from '../utils/richAnalytics'

const handleLogin = async (pin) => {
  try {
    // Authenticate staff
    const { data: staff, error } = await supabase
      .from('staff')
      .select('*')
      .eq('pin', pin)
      .single()

    if (error || !staff) {
      setError('PIN non valido')
      return
    }

    // Save to context/localStorage
    setCurrentUser(staff)
    localStorage.setItem('staff_id', staff.id)
    localStorage.setItem('staff_login_time', Date.now().toString())

    // Track staff login
    await trackStaffLogin({
      restaurantId: staff.restaurant_id,
      staffId: staff.id,
      staffName: staff.name,
      staffRole: staff.role,
      staffRoleDisplay: staff.displayRole,
      loginMethod: 'pin',
      deviceId: getDeviceId() // Helper function
    })

    console.log('✅ Staff login + Analytics tracked')
    navigate('/dashboard')
  } catch (error) {
    console.error('[handleLogin] Error:', error)
  }
}
```

### Step 5.2: Track Staff Logout

```javascript
// In Navbar.jsx or Dashboard.jsx
import { trackStaffLogout } from '../utils/richAnalytics'

const handleLogout = async () => {
  try {
    const loginTime = parseInt(localStorage.getItem('staff_login_time') || Date.now())
    const sessionDuration = Math.floor((Date.now() - loginTime) / 1000)

    // Get staff performance metrics (optional)
    const { data: metrics } = await supabase
      .rpc('get_staff_session_metrics', {
        p_staff_id: currentUser.id,
        p_login_time: new Date(loginTime).toISOString()
      })

    // Track staff logout
    await trackStaffLogout({
      restaurantId: currentUser.restaurant_id,
      staffId: currentUser.id,
      staffName: currentUser.name,
      sessionDurationSeconds: sessionDuration,
      ordersHandled: metrics?.orders_handled || 0,
      itemsPrepared: metrics?.items_prepared || 0,
      revenueGenerated: metrics?.revenue_generated || 0,
      logoutReason: 'manual'
    })

    console.log('✅ Staff logout + Analytics tracked')

    // Clear session
    localStorage.removeItem('staff_id')
    localStorage.removeItem('staff_login_time')
    setCurrentUser(null)
    navigate('/login')
  } catch (error) {
    console.error('[handleLogout] Error:', error)
  }
}
```

### Step 5.3: Track Item Prepared

```javascript
// In KitchenView.jsx or OrderDetailPage.jsx
import { trackItemPrepared } from '../utils/richAnalytics'

const handleMarkItemPrepared = async (orderItem) => {
  try {
    const preparationTime = Math.floor((Date.now() - new Date(orderItem.created_at).getTime()) / 1000)

    // Update item in database
    const { error } = await supabase
      .from('order_items')
      .update({
        prepared: true,
        prepared_at: new Date().toISOString(),
        prepared_by_staff_id: currentUser.id
      })
      .eq('id', orderItem.id)

    if (error) throw error

    // Get order progress
    const { data: allItems } = await supabase
      .from('order_items')
      .select('id, prepared')
      .eq('order_id', orderItem.order_id)

    const preparedCount = allItems.filter(i => i.prepared).length
    const totalCount = allItems.length

    // Track item_prepared
    await trackItemPrepared({
      restaurantId: currentUser.restaurant_id,
      orderId: orderItem.order_id,
      productId: orderItem.product_id,
      productName: orderItem.product_name,
      productSku: orderItem.product_sku,
      quantity: orderItem.quantity,
      batchNumber: orderItem.batch_number || 1,
      preparationTimeSeconds: preparationTime,
      estimatedPrepTimeMinutes: orderItem.preparation_time_minutes || 15,
      staffId: currentUser.id,
      staffName: currentUser.name,
      staffRoleDisplay: currentUser.displayRole,
      itemsPreparedCount: preparedCount,
      itemsTotalCount: totalCount
    })

    console.log('✅ Item prepared + Analytics tracked')
  } catch (error) {
    console.error('[handleMarkItemPrepared] Error:', error)
  }
}
```

---

## 6. Implementazione Customer Registration

### Step 6.1: Create CustomerRegistration Component

```javascript
// In src/pages/CustomerRegistration.jsx
import React, { useState } from 'react'
import { createCustomer } from '../utils/customerUtils'
import { getSavedTrafficSource } from '../hooks/useTrafficSource'
import { trackRichEvent } from '../utils/richAnalytics'

function CustomerRegistration({ restaurantId, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dietaryRestrictions: [],
    allergies: [],
    marketingConsent: false
  })

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const trafficSource = getSavedTrafficSource()

      // Create customer
      const { customer, error } = await createCustomer({
        restaurantId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        dietaryRestrictions: formData.dietaryRestrictions,
        allergies: formData.allergies,
        marketingConsent: formData.marketingConsent,
        registrationSource: trafficSource?.source || 'qr',
        registrationMethod: 'email',
        trafficSource: trafficSource?.source,
        utmSource: trafficSource?.utmParams?.source,
        utmCampaign: trafficSource?.utmParams?.campaign
      })

      if (error) throw error

      // Track customer_registered event
      await trackRichEvent({
        eventType: 'customer_registered',
        restaurantId,
        actor: {
          type: 'customer',
          customer_id: customer.id,
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone
        },
        order: {},
        items: [],
        location: {},
        money: {},
        timing: {},
        flags: {},
        metadata: {
          registration_source: trafficSource?.source || 'qr',
          registration_method: 'email',
          marketing_consent: formData.marketingConsent,
          traffic_source: trafficSource?.source,
          utm_source: trafficSource?.utmParams?.source,
          utm_campaign: trafficSource?.utmParams?.campaign,
          social_platform: trafficSource?.socialPlatform
        }
      })

      console.log('✅ Customer registered + Analytics tracked')

      // Save to localStorage
      localStorage.setItem('customer_id', customer.id)

      onSuccess(customer)
    } catch (error) {
      console.error('[CustomerRegistration] Error:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  )
}
```

---

## 7. Testing

### Test 7.1: Order Created da QR

1. Scansiona QR code
2. Aggiungi prodotti al carrello
3. Completa ordine
4. Verifica in Supabase:

```sql
SELECT
  event_type,
  actor->>'customer_name' as customer,
  actor->>'is_anonymous' as is_anonymous,
  items,
  money,
  flags,
  metadata->>'traffic_source' as source,
  metadata->>'social_platform' as social
FROM analytics_events
WHERE event_type = 'order_created'
ORDER BY created_at DESC
LIMIT 1;
```

### Test 7.2: Cart Events

1. Aggiungi prodotto al carrello
2. Apri carrello (verifica evento `cart_viewed`)
3. Rimuovi prodotto (verifica evento `cart_item_removed`)
4. Click "Invia Ordine" (verifica evento `checkout_started`)

```sql
SELECT event_type, metadata, created_at
FROM analytics_events
WHERE event_type IN ('cart_viewed', 'cart_item_removed', 'checkout_started')
ORDER BY created_at DESC;
```

### Test 7.3: Traffic Source

Test diversi scenari:

**QR Code**:
- URL: `http://localhost:5173/public-menu/rest-id/table/table-id`
- Expected: `source: 'qr'`

**Instagram**:
- URL: `http://localhost:5173/public-menu/rest-id?utm_source=instagram&utm_campaign=summer2024`
- Expected: `source: 'social', socialPlatform: 'instagram'`

**Google Organic**:
- Referrer: `https://www.google.com/`
- Expected: `source: 'organic', medium: 'google'`

```sql
SELECT
  metadata->>'source' as source,
  metadata->>'social_platform' as platform,
  metadata->>'utm_campaign' as campaign,
  COUNT(*)
FROM analytics_events
WHERE event_type = 'traffic_source_tracked'
GROUP BY 1, 2, 3;
```

### Test 7.4: Staff Events

1. Login come staff
2. Crea ordine
3. Marca item come preparato
4. Logout
5. Verifica eventi:

```sql
SELECT
  event_type,
  actor->>'staff_name' as staff,
  metadata->>'orders_handled' as orders,
  created_at
FROM analytics_events
WHERE staff_id = 'staff-id-here'
  AND event_type IN ('staff_login', 'staff_logout', 'item_prepared')
ORDER BY created_at DESC;
```

---

## 8. Troubleshooting

### Issue 8.1: 400 Error su analytics_events

**Sintomo**: `analytics_events?select=*: 400`

**Causa**: Event type non incluso nel constraint

**Fix**:
1. Verifica event_type esatto nel codice
2. Aggiungi al constraint in migration SQL
3. Re-run migration

### Issue 8.2: customer_id NULL

**Sintomo**: Ordini senza customer_id

**Causa**: Function `get_or_create_anonymous_customer` non funziona

**Fix**:
```sql
-- Test function
SELECT get_or_create_anonymous_customer(
  'restaurant-id'::uuid,
  'session-123'
);

-- Verifica RLS policy
SELECT * FROM customers WHERE restaurant_id = 'restaurant-id';
```

### Issue 8.3: Traffic Source non tracked

**Sintomo**: `traffic_source_tracked` event non creato

**Debug**:
```javascript
// In PublicMenu.jsx
const trafficSource = useTrafficSource(restaurantId, tableId, tableNumber, customerId)

useEffect(() => {
  console.log('🔍 Traffic Source Debug:', {
    trafficSource,
    localStorage: localStorage.getItem('traffic_source'),
    referrer: document.referrer,
    urlParams: window.location.search
  })
}, [trafficSource])
```

### Issue 8.4: Analytics query lenta

**Causa**: Missing indexes

**Fix**:
```sql
-- Verifica indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'analytics_events';

-- Se mancanti, aggiungili:
CREATE INDEX IF NOT EXISTS idx_analytics_events_customer
  ON analytics_events(restaurant_id, customer_id, created_at DESC)
  WHERE customer_id IS NOT NULL;
```

---

## ✅ Checklist Implementazione

### Database Setup
- [ ] Eseguito `analytics_complete_migration.sql`
- [ ] Verificato constraint con 42 event types
- [ ] Verificato tabella `customers` creata
- [ ] Testato function `get_or_create_anonymous_customer`
- [ ] Verificato RLS policies attive

### Order Created
- [ ] Implementato in `Cart.jsx` (QR orders)
- [ ] Implementato in `CreateOrderModal.jsx` (Staff orders)
- [ ] Test order da QR con "Cliente Incognito"
- [ ] Test order da staff con dati completi
- [ ] Verificato tutti i 5 pillars (CHI, COSA, QUANDO, DOVE, QUANTO)

### Cart Events
- [ ] Implementato `trackCartItemRemoved`
- [ ] Implementato `trackCartViewed`
- [ ] Implementato `trackCheckoutStarted`
- [ ] Test rimozione prodotto
- [ ] Test apertura carrello
- [ ] Test click checkout

### Traffic Source
- [ ] Hook `useTrafficSource` aggiunto a `PublicMenu.jsx`
- [ ] Test QR scan tracking
- [ ] Test Instagram/Facebook tracking
- [ ] Test organic tracking
- [ ] Verificato localStorage persistence

### Staff Events
- [ ] Implementato `trackStaffLogin`
- [ ] Implementato `trackStaffLogout`
- [ ] Implementato `trackItemPrepared`
- [ ] Test login/logout
- [ ] Test preparazione item

### Customer Registration
- [ ] Component `CustomerRegistration.jsx` creato
- [ ] Test registrazione nuov cliente
- [ ] Test evento `customer_registered`
- [ ] Verificato loyalty points = 0 all'inizio

---

## 📊 Query Analytics Utili

### Top Products Ordered
```sql
SELECT
  items->0->>'product_name' as product,
  items->0->>'product_sku' as sku,
  COUNT(*) as order_count,
  SUM((items->0->>'quantity')::int) as total_quantity
FROM analytics_events
WHERE event_type = 'order_created'
  AND restaurant_id = 'your-id'
GROUP BY 1, 2
ORDER BY order_count DESC
LIMIT 10;
```

### Traffic Source Performance
```sql
SELECT
  metadata->>'traffic_source' as source,
  metadata->>'social_platform' as platform,
  COUNT(DISTINCT actor->>'customer_id') as unique_customers,
  COUNT(*) as total_orders,
  SUM((money->>'total')::decimal) as total_revenue
FROM analytics_events
WHERE event_type = 'order_created'
  AND restaurant_id = 'your-id'
GROUP BY 1, 2
ORDER BY total_revenue DESC;
```

### Customer Segments
```sql
SELECT
  customer_segment,
  COUNT(*) as count,
  AVG(lifetime_value) as avg_ltv,
  AVG(total_orders_count) as avg_orders
FROM customer_analytics
WHERE restaurant_id = 'your-id'
GROUP BY customer_segment
ORDER BY count DESC;
```

### Staff Performance
```sql
SELECT
  actor->>'staff_name' as staff,
  COUNT(DISTINCT order_id) as orders_handled,
  COUNT(*) as items_prepared,
  AVG((metadata->>'preparation_time_seconds')::int) as avg_prep_time_sec
FROM analytics_events
WHERE event_type = 'item_prepared'
  AND restaurant_id = 'your-id'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY 1
ORDER BY orders_handled DESC;
```

---

**Fine della guida di implementazione**

Per domande o problemi, consulta:
- `COMPLETE_EVENTS_SCHEMA.md` - Schema completo eventi
- `ANALYTICS_TRACKING_STRATEGY.md` - Strategia tracking
- `richAnalytics.js` - Helper functions
