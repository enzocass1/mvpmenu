# Analytics Quick Reference Card

**MVP Menu - Advanced Analytics System**
**Quick reference per sviluppatori**

---

## 🚀 Quick Start

### Import Helper Functions

```javascript
// Analytics tracking
import {
  trackOrderCreated,
  trackCartViewed,
  trackCartItemRemoved,
  trackCheckoutStarted,
  trackItemPrepared,
  trackStaffLogin,
  trackStaffLogout,
  trackTrafficSource
} from '../utils/richAnalytics'

// Customer management
import {
  getOrCreateAnonymousCustomer,
  createCustomer,
  addLoyaltyPoints,
  getCustomerDisplayName
} from '../utils/customerUtils'

// Traffic source detection
import useTrafficSource from '../hooks/useTrafficSource'
```

---

## 📊 Common Tracking Patterns

### 1. Track Order Created (QR Menu)

```javascript
// In Cart.jsx - handlePlaceOrder()

// Get anonymous customer
const sessionId = localStorage.getItem('session_id') || crypto.randomUUID()
const { customer } = await getOrCreateAnonymousCustomer(restaurantId, sessionId)

// Get traffic source
const trafficSource = JSON.parse(localStorage.getItem('traffic_source')) || { source: 'qr' }

// Track order
await trackOrderCreated({
  restaurantId,
  order: createdOrder,
  items: orderItems,
  actor: { type: 'customer', customer_id: customer.id },
  customer: customer,
  location: { table_id, table_number, room_id, room_name },
  sessionData: {
    duration: sessionDuration,
    timeFromQRScan: timeFromQRScan
  },
  trafficSource: trafficSource
})
```

### 2. Track Cart Events

```javascript
// Cart Viewed
await trackCartViewed({
  restaurantId,
  itemsCount: cart.length,
  uniqueProductsCount: new Set(cart.map(i => i.product_id)).size,
  cartSubtotal: subtotal,
  cartTotal: total,
  productIds: cart.map(i => i.product_id),
  customerId: customer?.id
})

// Item Removed
await trackCartItemRemoved({
  restaurantId,
  productId: item.product_id,
  productName: item.product_name,
  productSku: item.sku,
  quantityRemoved: item.quantity,
  subtotalRemoved: item.subtotal,
  timeInCartSeconds: Math.floor((Date.now() - item.addedAt) / 1000),
  cartStateAfter: { itemsCount: newCart.length, subtotal, total },
  customerId: customer?.id
})

// Checkout Started
await trackCheckoutStarted({
  restaurantId,
  items: cart,
  cartSubtotal: subtotal,
  hasPriorityOrder: isPriorityOrder,
  priorityFee: priorityFee,
  cartTotal: total,
  tableId, tableNumber, roomId, roomName,
  customerId: customer?.id,
  sessionDurationSeconds: sessionDuration
})
```

### 3. Track Staff Events

```javascript
// Staff Login
await trackStaffLogin({
  restaurantId: staff.restaurant_id,
  staffId: staff.id,
  staffName: staff.name,
  staffRole: staff.role,
  staffRoleDisplay: staff.displayRole,
  loginMethod: 'pin'
})

// Staff Logout
const loginTime = parseInt(localStorage.getItem('staff_login_time'))
const sessionDuration = Math.floor((Date.now() - loginTime) / 1000)

await trackStaffLogout({
  restaurantId: staff.restaurant_id,
  staffId: staff.id,
  staffName: staff.name,
  sessionDurationSeconds: sessionDuration,
  ordersHandled: metricsCount,
  revenueGenerated: totalRevenue
})

// Item Prepared
await trackItemPrepared({
  restaurantId,
  orderId: orderItem.order_id,
  productId: orderItem.product_id,
  productName: orderItem.product_name,
  productSku: orderItem.product_sku,
  quantity: orderItem.quantity,
  preparationTimeSeconds: prepTime,
  estimatedPrepTimeMinutes: 15,
  staffId: currentUser.id,
  staffName: currentUser.name,
  staffRoleDisplay: currentUser.displayRole,
  itemsPreparedCount: preparedCount,
  itemsTotalCount: totalCount
})
```

### 4. Traffic Source Detection

```javascript
// In PublicMenu.jsx
const trafficSource = useTrafficSource(
  restaurantId,
  tableId,
  tableNumber,
  customer?.id
)

// Hook automatically:
// - Detects source (qr, organic, social, paid, direct)
// - Identifies social platform (instagram, facebook, tiktok)
// - Parses UTM parameters
// - Tracks 'traffic_source_tracked' event
// - Saves to localStorage (24h cache)

// Access data:
console.log(trafficSource.source)         // 'social'
console.log(trafficSource.socialPlatform) // 'instagram'
console.log(trafficSource.utmParams)      // { source, campaign, ... }
```

### 5. Customer Management

```javascript
// Get or create anonymous customer
const { customer } = await getOrCreateAnonymousCustomer(restaurantId, sessionId)
// Returns: { id, name: 'Cliente Incognito', is_anonymous: true }

// Create registered customer
const { customer } = await createCustomer({
  restaurantId,
  name: 'Mario Rossi',
  email: 'mario@example.com',
  phone: '+39123456789',
  dietaryRestrictions: ['vegetarian'],
  allergies: ['nuts'],
  marketingConsent: true,
  registrationSource: 'qr'
})

// Add loyalty points (10% of order total)
await addLoyaltyPoints(customerId, points, 'order_completed', orderId)
// Auto-calculates tier: bronze (100+), silver (500+), gold (1000+)

// Display customer name
const displayName = getCustomerDisplayName(customer)
// Returns: 'Mario Rossi' or 'Cliente Incognito'
```

---

## 🗄️ Database Queries

### Get Events by Type

```sql
SELECT *
FROM analytics_events
WHERE restaurant_id = 'your-id'
  AND event_type = 'order_created'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Get Customer Analytics

```sql
SELECT *
FROM customer_analytics
WHERE restaurant_id = 'your-id'
  AND customer_segment IN ('loyal_customer', 'occasional_customer')
ORDER BY lifetime_value DESC;
```

### Traffic Source Performance

```sql
SELECT
  metadata->>'traffic_source' as source,
  COUNT(*) as orders,
  SUM((money->>'total')::decimal) as revenue
FROM analytics_events
WHERE event_type = 'order_created'
  AND restaurant_id = 'your-id'
GROUP BY 1
ORDER BY revenue DESC;
```

### Staff Performance

```sql
SELECT
  actor->>'staff_name' as staff,
  COUNT(*) as items_prepared,
  AVG((metadata->>'preparation_time_seconds')::int) as avg_prep_time
FROM analytics_events
WHERE event_type = 'item_prepared'
  AND restaurant_id = 'your-id'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY 1
ORDER BY items_prepared DESC;
```

---

## 🔧 Helper Functions Reference

### richAnalytics.js

| Function | Purpose | Returns |
|----------|---------|---------|
| `trackOrderCreated()` | Track order with 5 pillars | `Promise<{success, eventData}>` |
| `trackProductsAdded()` | Track upsell (batch 2+) | `Promise<{success, eventData}>` |
| `trackOrderCompleted()` | Track order completion | `Promise<{success, eventData}>` |
| `trackCartViewed()` | Track cart open | `Promise<{success, eventData}>` |
| `trackCartItemRemoved()` | Track item removal | `Promise<{success, eventData}>` |
| `trackCheckoutStarted()` | Track checkout click | `Promise<{success, eventData}>` |
| `trackItemPrepared()` | Track kitchen prep | `Promise<{success, eventData}>` |
| `trackStaffLogin()` | Track staff login | `Promise<{success, eventData}>` |
| `trackStaffLogout()` | Track staff logout | `Promise<{success, eventData}>` |
| `trackTrafficSource()` | Track traffic origin | `Promise<{success, eventData}>` |

### customerUtils.js

| Function | Purpose | Returns |
|----------|---------|---------|
| `getOrCreateAnonymousCustomer()` | Get/create "Cliente Incognito" | `Promise<{customer}>` |
| `getCustomerById()` | Fetch customer by ID | `Promise<{customer}>` |
| `getCustomerByEmail()` | Fetch customer by email | `Promise<{customer}>` |
| `createCustomer()` | Register new customer | `Promise<{customer}>` |
| `updateCustomer()` | Update customer profile | `Promise<{customer}>` |
| `addLoyaltyPoints()` | Add loyalty points | `Promise<{newBalance, newTier}>` |
| `redeemLoyaltyPoints()` | Redeem points | `Promise<{newBalance, newTier}>` |
| `getCustomerAnalytics()` | Fetch analytics view | `Promise<{analytics}>` |
| `getCustomerOrders()` | Get order history | `Promise<{orders}>` |
| `isCustomerRegistered()` | Check if registered | `boolean` |
| `getCustomerDisplayName()` | Format display name | `string` |

---

## 📋 Event Types (42 Total)

### Customer Account (7)
- `customer_registered`
- `customer_login`
- `customer_logout`
- `customer_profile_updated`
- `loyalty_points_earned`
- `loyalty_points_redeemed`
- `traffic_source_tracked`

### Public Menu (11)
- `qr_scanned`
- `menu_opened`
- `category_viewed`
- `product_viewed`
- `product_image_viewed`
- `product_searched`
- `favorite_added`
- `favorite_removed`
- `session_time`
- `opening_hours_viewed`
- `menu_shared`

### Cart & Checkout (4)
- `order_item_added`
- `cart_item_removed`
- `cart_viewed`
- `checkout_started`

### Order Lifecycle (10)
- `order_created` ⭐
- `order_status_changed`
- `item_prepared` ⭐
- `order_note_added`
- `order_confirmed`
- `products_added_to_order`
- `item_removed`
- `order_completed`
- `order_cancelled`
- `table_changed`

### Staff Operations (8)
- `staff_login` ⭐
- `staff_logout` ⭐
- `table_opened`
- `preconto_generated`
- `receipt_printed`
- `priority_order_requested`
- `table_order_pending`
- `table_order_confirmed`

### Payment (2)
- `payment_method_selected`
- `discount_applied`

⭐ = High priority, implement first

---

## 🎯 The 5 Pillars

Every event tracks:

### 1. CHI (Who)
```javascript
actor: {
  type: 'customer' | 'staff' | 'owner',
  customer_id, customer_name, customer_email,
  is_registered, is_anonymous,
  loyalty_tier, loyalty_points_balance,
  dietary_restrictions, allergies,
  staff_id, staff_name, staff_role_display
}
```

### 2. COSA (What)
```javascript
items: [{
  product_id, product_name, product_sku,
  category_id, category_name,
  variant_title, variant_options,
  quantity, unit_price, subtotal,
  allergens, dietary_tags,
  batch_number, prepared
}]
```

### 3. QUANDO (When)
```javascript
timing: {
  created_at: ISO8601,
  time_from_qr_scan_seconds,
  time_from_first_product_view_seconds,
  session_duration_seconds,
  estimated_prep_time_minutes
}
```

### 4. DOVE (Where)
```javascript
location: {
  table_id, table_number,
  room_id, room_name,
  seats
}

metadata: {
  device_type: 'mobile' | 'tablet' | 'desktop',
  screen_width, screen_height
}
```

### 5. QUANTO (How Much)
```javascript
money: {
  items_subtotal,
  priority_fee,
  service_fee,
  discount,
  tax,
  total,
  currency: 'EUR',
  loyalty_points_used,
  loyalty_points_earned
}
```

---

## 🐛 Common Issues & Fixes

### Issue: 400 Error on analytics_events

**Causa**: Event type not in constraint

**Fix**:
```sql
-- Run migration to update constraint
-- File: database/migrations/analytics_complete_migration.sql
```

### Issue: customer_id is NULL

**Causa**: Forgot to get/create customer

**Fix**:
```javascript
const { customer } = await getOrCreateAnonymousCustomer(restaurantId, sessionId)
// Then use customer.id
```

### Issue: Traffic source not detected

**Causa**: Hook not added or localStorage cleared

**Debug**:
```javascript
console.log('Traffic Source:', localStorage.getItem('traffic_source'))
console.log('Referrer:', document.referrer)
console.log('URL params:', window.location.search)
```

### Issue: Slow analytics queries

**Fix**: Ensure indexes exist
```sql
-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'analytics_events';

-- If missing, run migration again
```

---

## ✅ Implementation Checklist

### Database
- [ ] Run `analytics_complete_migration.sql` on Supabase
- [ ] Verify constraint with 42 event types
- [ ] Test `get_or_create_anonymous_customer()` function
- [ ] Verify indexes created

### Order Created
- [ ] Import tracking functions in Cart.jsx
- [ ] Get/create anonymous customer
- [ ] Get traffic source from localStorage
- [ ] Call `trackOrderCreated()` with all 5 pillars
- [ ] Test QR order

### Cart Events
- [ ] Track `cart_viewed` when modal opens
- [ ] Track `cart_item_removed` on remove
- [ ] Track `checkout_started` on checkout click
- [ ] Test all 3 events

### Traffic Source
- [ ] Add `useTrafficSource` hook to PublicMenu.jsx
- [ ] Test QR detection
- [ ] Test Instagram tracking
- [ ] Test organic tracking

### Staff Events
- [ ] Track login in StaffLogin.jsx
- [ ] Track logout in Navbar.jsx
- [ ] Track item prepared in KitchenView
- [ ] Test all events

---

## 📚 Documentation Links

- [Complete Events Schema](./COMPLETE_EVENTS_SCHEMA.md) - All 42 events documented
- [Implementation Guide](./ANALYTICS_IMPLEMENTATION_GUIDE.md) - Step-by-step implementation
- [Tracking Strategy](./ANALYTICS_TRACKING_STRATEGY.md) - Klaviyo-style approach
- [Session Summary](./SESSION_ANALYTICS_IMPLEMENTATION.md) - What was built

---

**Last Updated**: 26 Ottobre 2025
**Version**: 1.0
**Status**: Ready for Implementation
