/**
 * Rich Analytics Tracking - Klaviyo/Shopify Style
 * Tracking granulare con metadata completi per analytics avanzate
 */

import { supabase } from '../supabaseClient'

// ============================================
// HELPER FUNCTIONS - Sanitize & Format
// ============================================

/**
 * Ottieni metadata browser/device
 */
export const getBrowserMetadata = () => {
  if (typeof window === 'undefined') return {}

  const getDeviceType = () => {
    const width = window.innerWidth
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }

  return {
    user_agent: navigator.userAgent,
    screen_width: window.innerWidth,
    screen_height: window.innerHeight,
    device_type: getDeviceType(),
    language: navigator.language,
    referrer: document.referrer || null,
    timestamp: new Date().toISOString()
  }
}

/**
 * Sanitize actor info (chi ha fatto l'azione)
 */
export const sanitizeActor = (actor = {}) => ({
  type: actor.type || actor.created_by_type || 'system',
  staff_id: actor.staff_id || null,
  staff_name: actor.staff_name || null,
  staff_role: actor.staff_role || null,
  staff_role_display: actor.staff_role_display || actor.displayRole || null,
  user_id: actor.user_id || null,
  user_email: actor.user_email || null,
  customer_id: actor.customer_id || null,
  customer_name: actor.customer_name || null,
  customer_locale: actor.customer_locale || 'it-IT'
})

/**
 * Sanitize order data
 */
export const sanitizeOrder = (order = {}) => ({
  id: order.id,
  order_number: order.order_number || null,
  status: order.status,
  type: order.type || (order.table_id ? 'table' : 'counter'),
  source: order.source || 'pos',
  receipt_number: order.receipt_number || null,
  fiscal_receipt_id: order.fiscal_receipt_id || null
})

/**
 * Sanitize product item (snapshot completo)
 */
export const sanitizeItem = (item) => ({
  product_id: item.product_id,
  product_name: item.product_name,
  product_sku: item.product_sku || item.sku || `SKU-${item.product_id?.substring(0, 8)}`,
  category_id: item.category_id || null,
  category_name: item.category_name || null,
  variant_id: item.variant_id || null,
  variant_title: item.variant_title || null,
  variant_options: item.variant_options || {},
  quantity: item.quantity,
  unit_price: parseFloat(item.product_price || item.unit_price || 0),
  subtotal: parseFloat(item.subtotal || 0),
  notes: item.notes || null,
  batch_number: item.batch_number || 1,
  prepared: item.prepared || false,
  prepared_at: item.prepared_at || null,
  prepared_by_staff_id: item.prepared_by_staff_id || null
})

/**
 * Sanitize money data
 */
export const sanitizeMoney = (money = {}, items = []) => {
  const itemsSubtotal = items.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0)

  return {
    items_subtotal: money.items_subtotal || itemsSubtotal,
    priority_fee: parseFloat(money.priority_fee || money.priority_order_amount || 0),
    service_fee: parseFloat(money.service_fee || 0),
    discount: parseFloat(money.discount || 0),
    tax: parseFloat(money.tax || 0),
    total: parseFloat(money.total || money.total_amount || 0),
    currency: money.currency || 'EUR',
    payment_method: money.payment_method || null,
    tip: parseFloat(money.tip || 0)
  }
}

/**
 * Sanitize timing data
 */
export const sanitizeTiming = (timing = {}, order = {}) => {
  const now = new Date()
  const createdAt = new Date(order.created_at || timing.created_at || now)
  const confirmedAt = timing.confirmed_at ? new Date(timing.confirmed_at) : null
  const completedAt = timing.completed_at ? new Date(timing.completed_at) : null

  return {
    created_at: createdAt.toISOString(),
    confirmed_at: confirmedAt?.toISOString() || null,
    preparing_started_at: timing.preparing_started_at || confirmedAt?.toISOString() || null,
    completed_at: completedAt?.toISOString() || null,

    // Durate calcolate (in secondi)
    time_to_confirm_seconds: confirmedAt
      ? Math.floor((confirmedAt - createdAt) / 1000)
      : null,
    time_to_complete_seconds: completedAt
      ? Math.floor((completedAt - createdAt) / 1000)
      : null,
    table_duration_seconds: order.opened_at && completedAt
      ? Math.floor((completedAt - new Date(order.opened_at)) / 1000)
      : null
  }
}

/**
 * Sanitize location data
 */
export const sanitizeLocation = (location = {}) => ({
  table_id: location.table_id || null,
  table_number: location.table_number || null,
  room_id: location.room_id || null,
  room_name: location.room_name || null,
  seats: location.seats || null
})

/**
 * Calcola KPI per l'ordine
 */
export const calculateOrderKPIs = (order, items = [], timing = {}) => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const uniqueProducts = new Set(items.map(i => i.product_id)).size
  const uniqueCategories = new Set(items.map(i => i.category_id).filter(Boolean)).size
  const totalRevenue = items.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0)

  const tableDurationMinutes = timing.table_duration_seconds
    ? timing.table_duration_seconds / 60
    : null

  return {
    total_batches: Math.max(...items.map(i => i.batch_number || 1)),
    total_items_count: totalItems,
    unique_products_count: uniqueProducts,
    unique_categories_count: uniqueCategories,
    average_item_price: totalItems > 0 ? totalRevenue / totalItems : 0,
    revenue_per_minute: tableDurationMinutes
      ? totalRevenue / tableDurationMinutes
      : null,
    revenue_per_seat: (order.seats && order.seats > 0)
      ? totalRevenue / order.seats
      : null
  }
}

// ============================================
// MAIN FUNCTION - Create Rich Event
// ============================================

/**
 * Crea evento analytics con metadata ricchi stile Klaviyo
 *
 * @param {object} params
 * @param {string} params.eventType - Tipo evento
 * @param {string} params.restaurantId - ID ristorante
 * @param {object} params.actor - Chi ha fatto l'azione
 * @param {object} params.order - Dati ordine
 * @param {array} params.items - Array prodotti
 * @param {object} params.location - Location (tavolo, sala)
 * @param {object} params.money - Valori monetari
 * @param {object} params.timing - Timestamp e durate
 * @param {object} params.flags - Boolean flags
 * @param {object} params.kpi - KPI calcolati (opzionali, verranno calcolati auto)
 * @param {object} params.metadata - Metadata extra
 */
export const createRichEventData = ({
  eventType,
  restaurantId,
  actor = {},
  order = {},
  items = [],
  location = {},
  money = {},
  timing = {},
  flags = {},
  kpi = null,
  metadata = {}
}) => {
  // Sanitize tutti i dati
  const cleanActor = sanitizeActor(actor)
  const cleanOrder = sanitizeOrder(order)
  const cleanItems = items.map(sanitizeItem)
  const cleanLocation = sanitizeLocation(location)
  const cleanMoney = sanitizeMoney(money, cleanItems)
  const cleanTiming = sanitizeTiming(timing, order)

  // Calcola KPI se non forniti
  const cleanKPI = kpi || calculateOrderKPIs(
    { ...order, ...cleanLocation },
    cleanItems,
    cleanTiming
  )

  return {
    // Base fields
    restaurant_id: restaurantId,
    event_type: eventType,
    created_at: new Date().toISOString(),

    // Foreign keys (per JOIN veloci)
    order_id: order.id || null,
    product_id: cleanItems[0]?.product_id || null,
    category_id: cleanItems[0]?.category_id || null,
    table_id: cleanLocation.table_id,
    room_id: cleanLocation.room_id,
    staff_id: cleanActor.staff_id,
    customer_id: cleanActor.customer_id,

    // Campi denormalizzati (per query senza JOIN)
    order_number: cleanOrder.order_number,
    product_sku: cleanItems[0]?.product_sku || null,
    staff_name: cleanActor.staff_name,

    // JSONB ricchi
    actor: cleanActor,
    order_data: cleanOrder,
    items: cleanItems,
    money: cleanMoney,
    timing: cleanTiming,
    flags: {
      ...flags,
      has_items: cleanItems.length > 0,
      has_multiple_batches: cleanItems.some(i => i.batch_number > 1)
    },
    kpi: cleanKPI,
    metadata: {
      ...getBrowserMetadata(),
      ...metadata,
      event_created_at: new Date().toISOString()
    }
  }
}

/**
 * Track rich event (wrapper per createRichEventData + insert)
 */
export const trackRichEvent = async (params) => {
  try {
    const eventData = createRichEventData(params)

    const { error } = await supabase
      .from('analytics_events')
      .insert([eventData])

    if (error) {
      console.error('[trackRichEvent] Errore insert:', error)
      console.error('[trackRichEvent] Event type:', params.eventType)
      return { success: false, error }
    }

    console.log(`✅ Rich event tracked: ${params.eventType}`)
    return { success: true, eventData }
  } catch (error) {
    console.error('[trackRichEvent] Errore:', error)
    return { success: false, error }
  }
}

// ============================================
// CONVENIENCE FUNCTIONS - Per eventi comuni
// ============================================

/**
 * Track ordine creato con TUTTI i dettagli (5 pillars completi)
 *
 * @param {object} params
 * @param {string} params.restaurantId - ID ristorante
 * @param {object} params.order - Ordine completo
 * @param {array} params.items - Array prodotti con SKU, varianti, prezzi
 * @param {object} params.actor - CHI (customer/staff/owner)
 * @param {object} params.location - DOVE (tavolo, sala)
 * @param {object} params.customer - Dati cliente completi (registrato o "Cliente Incognito")
 * @param {object} params.sessionData - Dati sessione browsing
 * @param {object} params.trafficSource - Traffic source (QR/organic/social)
 * @param {object} params.flags - Boolean flags
 */
export const trackOrderCreated = async ({
  restaurantId,
  order,
  items,
  actor,
  location,
  customer = null,
  sessionData = {},
  trafficSource = {},
  flags = {}
}) => {
  // Calcola KPI ordine
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const uniqueProducts = new Set(items.map(i => i.product_id)).size
  const uniqueCategories = new Set(items.map(i => i.category_id).filter(Boolean)).size
  const itemsSubtotal = items.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0)
  const averageItemPrice = totalItems > 0 ? itemsSubtotal / totalItems : 0

  // Determina order value tier
  let orderValueTier = 'low'
  if (order.total_amount >= 50) orderValueTier = 'high'
  else if (order.total_amount >= 20) orderValueTier = 'medium'

  // Build complete actor (CHI)
  const completeActor = {
    type: actor.type || 'customer',

    // Customer info (registrato o "Cliente Incognito")
    customer_id: customer?.id || actor.customer_id || null,
    customer_name: customer?.name || actor.customer_name || 'Cliente Incognito',
    customer_email: customer?.email || actor.customer_email || null,
    customer_phone: customer?.phone || actor.customer_phone || null,
    customer_locale: customer?.locale || actor.customer_locale || 'it-IT',

    // Customer status
    is_registered: customer?.is_registered || false,
    is_anonymous: customer?.is_anonymous || true,
    is_first_order: customer?.total_orders_count === 0 || flags.is_first_order || false,

    // Loyalty
    loyalty_tier: customer?.loyalty_tier || 'none',
    loyalty_points_balance: customer?.loyalty_points || 0,
    lifetime_value: customer?.lifetime_value || 0,
    total_orders_count: customer?.total_orders_count || 0,

    // Preferences
    dietary_restrictions: customer?.dietary_restrictions || [],
    allergies: customer?.allergies || [],

    // Staff (se ordine creato da staff)
    staff_id: actor.staff_id || null,
    staff_name: actor.staff_name || null,
    staff_role_display: actor.staff_role_display || null
  }

  // Build complete items array (COSA)
  const completeItems = items.map(item => ({
    // Identificazione
    product_id: item.product_id,
    product_name: item.product_name,
    product_sku: item.product_sku || item.sku || `SKU-${item.product_id?.substring(0, 8)}`,
    category_id: item.category_id || null,
    category_name: item.category_name || null,

    // Varianti COMPLETE
    variant_id: item.variant_id || null,
    variant_title: item.variant_title || null,
    variant_options: item.variant_options || {},
    variant_price_modifier: parseFloat(item.variant_price_modifier || 0),

    // Prezzi
    quantity: item.quantity,
    unit_price: parseFloat(item.product_price || item.unit_price || 0),
    final_unit_price: parseFloat(item.product_price || item.unit_price || 0) + parseFloat(item.variant_price_modifier || 0),
    subtotal: parseFloat(item.subtotal || 0),
    discount: parseFloat(item.discount || 0),

    // Personalizzazioni
    notes: item.notes || null,
    has_modifications: !!item.notes,

    // Allergens & Diet
    allergens: item.allergens || [],
    dietary_tags: item.dietary_tags || [],
    calories: item.calories || null,

    // Preparazione
    preparation_time_minutes: item.preparation_time_minutes || 15,
    batch_number: item.batch_number || 1,
    prepared: item.prepared || false,
    prepared_at: item.prepared_at || null,

    // Availability
    is_available: item.is_available !== false
  }))

  // Flags completi
  const hasAllergens = completeItems.some(i => i.allergens && i.allergens.length > 0)
  const hasModifications = completeItems.some(i => i.has_modifications)
  const hasDietaryRestrictions = completeActor.dietary_restrictions && completeActor.dietary_restrictions.length > 0

  const now = new Date()
  const isPeakHour = now.getHours() >= 12 && now.getHours() <= 14 || now.getHours() >= 19 && now.getHours() <= 21
  const isWeekend = now.getDay() === 0 || now.getDay() === 6

  return trackRichEvent({
    eventType: 'order_created',
    restaurantId,
    order: {
      ...order,
      order_number: order.order_number || null,
      type: order.table_id ? 'table' : 'counter',
      source: trafficSource.source || (actor.type === 'customer' ? 'qr' : 'pos')
    },
    items: completeItems,
    actor: completeActor,
    location,
    money: {
      items_subtotal: itemsSubtotal,
      priority_fee: parseFloat(order.priority_order_amount || 0),
      service_fee: parseFloat(order.service_fee || 0),
      discount: parseFloat(order.discount || 0),
      tax: parseFloat(order.tax || 0),
      total: parseFloat(order.total_amount || 0),
      currency: 'EUR',
      loyalty_points_used: order.loyalty_points_used || null,
      loyalty_points_earned: Math.floor(parseFloat(order.total_amount || 0) * 0.1) // 10% in punti
    },
    timing: {
      created_at: order.created_at || new Date().toISOString(),
      estimated_ready_at: order.estimated_ready_at || null,
      estimated_prep_time_minutes: order.estimated_prep_time_minutes || 30,
      session_start_time: sessionData.startTime ? new Date(sessionData.startTime).toISOString() : null,
      time_from_qr_scan_seconds: sessionData.timeFromQRScan || null,
      time_from_first_product_view_seconds: sessionData.timeFromFirstView || null,
      time_from_checkout_started_seconds: sessionData.timeFromCheckout || null
    },
    flags: {
      is_priority_order: order.is_priority_order || false,
      is_first_order: completeActor.is_first_order,
      has_allergens: hasAllergens,
      has_modifications: hasModifications,
      has_dietary_restrictions: hasDietaryRestrictions,
      has_discount: parseFloat(order.discount || 0) > 0,
      has_loyalty_redemption: !!order.loyalty_points_used,
      is_peak_hour: isPeakHour,
      is_weekend: isWeekend,
      ...flags
    },
    kpi: {
      total_items_count: totalItems,
      unique_products_count: uniqueProducts,
      unique_categories_count: uniqueCategories,
      average_item_price: averageItemPrice,
      has_upsell_potential: totalItems < 3 && itemsSubtotal < 20,
      order_value_tier: orderValueTier
    },
    metadata: {
      // Traffic source (QR/organic/social)
      traffic_source: trafficSource.source || 'qr',
      traffic_medium: trafficSource.medium || null,
      utm_source: trafficSource.utm_source || null,
      utm_campaign: trafficSource.utm_campaign || null,
      utm_content: trafficSource.utm_content || null,
      social_platform: trafficSource.social_platform || null,

      // Session behavior
      session_duration_seconds: sessionData.duration || null,
      categories_browsed: sessionData.categoriesBrowsed || 0,
      products_viewed: sessionData.productsViewed || 0,
      favorites_added: sessionData.favoritesAdded || 0,
      searches_performed: sessionData.searchesPerformed || 0,

      // Context
      customer_notes: order.customer_notes || null,
      internal_notes: order.internal_notes || null,
      source: actor.type === 'customer' ? 'qr' : 'pos'
    }
  })
}

/**
 * Track prodotti aggiunti
 */
export const trackProductsAdded = async ({
  restaurantId,
  order,
  newItems,
  allItems,
  actor,
  location,
  batchNumber
}) => {
  return trackRichEvent({
    eventType: 'products_added_to_order',
    restaurantId,
    order,
    items: newItems,
    actor,
    location,
    money: {
      items_subtotal: newItems.reduce((sum, i) => sum + parseFloat(i.subtotal || 0), 0)
    },
    flags: {
      is_upsell: true,
      is_second_batch: batchNumber > 1,
      batch_number: batchNumber,
      added_by_staff: actor.type === 'staff' || actor.type === 'owner'
    },
    metadata: {
      batch_number: batchNumber,
      total_items_after: allItems.length,
      new_items_count: newItems.length
    }
  })
}

/**
 * Track ordine completato
 */
export const trackOrderCompleted = async ({
  restaurantId,
  order,
  items,
  actor,
  location,
  receiptNumber
}) => {
  return trackRichEvent({
    eventType: 'table_closed',
    restaurantId,
    order,
    items,
    actor,
    location,
    money: {
      total_amount: order.total_amount,
      priority_order_amount: order.priority_order_amount
    },
    timing: {
      created_at: order.created_at,
      confirmed_at: order.confirmed_at,
      completed_at: order.closed_at || new Date().toISOString()
    },
    flags: {
      is_priority: order.is_priority_order || false,
      had_multiple_batches: items.some(i => i.batch_number > 1),
      had_upsell: items.some(i => i.batch_number > 1),
      payment_method: order.payment_method || null
    },
    metadata: {
      receipt_number: receiptNumber,
      fiscal_receipt_id: order.fiscal_receipt_id
    }
  })
}

/**
 * Track traffic source (QR/organic/social)
 */
export const trackTrafficSource = async ({
  restaurantId,
  customerId = null,
  source,
  medium = null,
  socialPlatform = null,
  qrTableId = null,
  qrTableNumber = null,
  utmParams = {}
}) => {
  const referrer = typeof document !== 'undefined' ? document.referrer : null
  const referrerDomain = referrer ? new URL(referrer).hostname : null

  return trackRichEvent({
    eventType: 'traffic_source_tracked',
    restaurantId,
    actor: {
      type: 'customer',
      customer_id: customerId
    },
    order: {},
    items: [],
    location: {},
    money: {},
    timing: {},
    flags: {
      is_qr: source === 'qr',
      is_social: source === 'social',
      is_organic: source === 'organic'
    },
    metadata: {
      source: source,
      medium: medium,
      campaign: utmParams.campaign || null,

      // QR specific
      qr_table_id: qrTableId,
      qr_table_number: qrTableNumber,

      // Social specific
      social_platform: socialPlatform,
      social_post_id: utmParams.post_id || null,

      // UTM parameters
      utm_source: utmParams.source || null,
      utm_medium: utmParams.medium || null,
      utm_campaign: utmParams.campaign || null,
      utm_content: utmParams.content || null,
      utm_term: utmParams.term || null,

      // Referrer
      referrer: referrer,
      referrer_domain: referrerDomain,

      // Device info (auto-added by trackRichEvent)
    }
  })
}

/**
 * Track item removed from cart
 */
export const trackCartItemRemoved = async ({
  restaurantId,
  productId,
  productName,
  productSku,
  variantTitle = null,
  quantityRemoved,
  subtotalRemoved,
  timeInCartSeconds,
  cartStateAfter,
  customerId = null,
  removedFrom = 'cart_view'
}) => {
  return trackRichEvent({
    eventType: 'cart_item_removed',
    restaurantId,
    actor: {
      type: 'customer',
      customer_id: customerId
    },
    order: {},
    items: [{
      product_id: productId,
      product_name: productName,
      product_sku: productSku,
      variant_title: variantTitle,
      quantity: quantityRemoved,
      subtotal: subtotalRemoved
    }],
    location: {},
    money: {
      items_subtotal: cartStateAfter.subtotal,
      total: cartStateAfter.total
    },
    timing: {},
    flags: {
      cart_became_empty: cartStateAfter.itemsCount === 0
    },
    metadata: {
      time_in_cart_seconds: timeInCartSeconds,
      cart_items_count_after: cartStateAfter.itemsCount,
      cart_subtotal_after: cartStateAfter.subtotal,
      cart_total_after: cartStateAfter.total,
      removed_from: removedFrom
    }
  })
}

/**
 * Track cart viewed
 */
export const trackCartViewed = async ({
  restaurantId,
  itemsCount,
  uniqueProductsCount,
  cartSubtotal,
  cartTotal,
  productIds = [],
  productSkus = [],
  customerId = null,
  viewedFrom = 'menu',
  timeSinceLastAdditionSeconds = null
}) => {
  return trackRichEvent({
    eventType: 'cart_viewed',
    restaurantId,
    actor: {
      type: 'customer',
      customer_id: customerId,
      is_registered: !!customerId
    },
    order: {},
    items: [],
    location: {},
    money: {
      items_subtotal: cartSubtotal,
      total: cartTotal
    },
    timing: {},
    flags: {
      cart_empty: itemsCount === 0,
      cart_has_items: itemsCount > 0
    },
    metadata: {
      items_count: itemsCount,
      unique_products_count: uniqueProductsCount,
      product_ids: productIds,
      product_skus: productSkus,
      viewed_from: viewedFrom,
      time_since_last_addition_seconds: timeSinceLastAdditionSeconds
    }
  })
}

/**
 * Track checkout started
 */
export const trackCheckoutStarted = async ({
  restaurantId,
  items,
  cartSubtotal,
  hasPriorityOrder = false,
  priorityFee = 0,
  cartTotal,
  tableId = null,
  tableNumber = null,
  roomId = null,
  roomName = null,
  customerId = null,
  customerName = 'Cliente Incognito',
  isCustomerRegistered = false,
  sessionDurationSeconds,
  timeSinceFirstAddSeconds
}) => {
  return trackRichEvent({
    eventType: 'checkout_started',
    restaurantId,
    actor: {
      type: 'customer',
      customer_id: customerId,
      customer_name: customerName,
      is_registered: isCustomerRegistered,
      is_anonymous: !isCustomerRegistered
    },
    order: {
      type: 'table',
      source: 'qr'
    },
    items: items.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name,
      product_sku: item.product_sku,
      variant_title: item.variant_title || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal
    })),
    location: {
      table_id: tableId,
      table_number: tableNumber,
      room_id: roomId,
      room_name: roomName
    },
    money: {
      items_subtotal: cartSubtotal,
      priority_fee: priorityFee,
      total: cartTotal
    },
    timing: {
      created_at: new Date().toISOString()
    },
    flags: {
      has_priority_order: hasPriorityOrder
    },
    kpi: {
      total_items_count: items.reduce((sum, i) => sum + i.quantity, 0),
      unique_products_count: items.length
    },
    metadata: {
      session_duration_seconds: sessionDurationSeconds,
      time_since_first_add_to_cart_seconds: timeSinceFirstAddSeconds
    }
  })
}

/**
 * Track item prepared (kitchen)
 */
export const trackItemPrepared = async ({
  restaurantId,
  orderId,
  productId,
  productName,
  productSku,
  quantity,
  batchNumber = 1,
  preparationTimeSeconds,
  estimatedPrepTimeMinutes,
  staffId,
  staffName,
  staffRoleDisplay,
  itemsPreparedCount,
  itemsTotalCount
}) => {
  const isLate = preparationTimeSeconds > estimatedPrepTimeMinutes * 60
  const completionPercent = (itemsPreparedCount / itemsTotalCount) * 100

  return trackRichEvent({
    eventType: 'item_prepared',
    restaurantId,
    actor: {
      type: 'staff',
      staff_id: staffId,
      staff_name: staffName,
      staff_role_display: staffRoleDisplay
    },
    order: {
      id: orderId
    },
    items: [{
      product_id: productId,
      product_name: productName,
      product_sku: productSku,
      quantity: quantity,
      batch_number: batchNumber
    }],
    location: {},
    money: {},
    timing: {
      created_at: new Date().toISOString()
    },
    flags: {
      is_late: isLate
    },
    metadata: {
      preparation_time_seconds: preparationTimeSeconds,
      estimated_prep_time_minutes: estimatedPrepTimeMinutes,
      items_prepared_count: itemsPreparedCount,
      items_total_count: itemsTotalCount,
      order_completion_percent: completionPercent
    }
  })
}

/**
 * Track staff login
 */
export const trackStaffLogin = async ({
  restaurantId,
  staffId,
  staffName,
  staffRole,
  staffRoleDisplay,
  loginMethod = 'pin',
  deviceId = null
}) => {
  return trackRichEvent({
    eventType: 'staff_login',
    restaurantId,
    actor: {
      type: 'staff',
      staff_id: staffId,
      staff_name: staffName,
      staff_role: staffRole,
      staff_role_display: staffRoleDisplay
    },
    order: {},
    items: [],
    location: {},
    money: {},
    timing: {
      created_at: new Date().toISOString()
    },
    flags: {},
    metadata: {
      login_method: loginMethod,
      device_id: deviceId,
      shift_start_time: new Date().toISOString()
    }
  })
}

/**
 * Track staff logout
 */
export const trackStaffLogout = async ({
  restaurantId,
  staffId,
  staffName,
  sessionDurationSeconds,
  ordersHandled = 0,
  itemsPrepared = 0,
  revenueGenerated = 0,
  logoutReason = 'manual'
}) => {
  return trackRichEvent({
    eventType: 'staff_logout',
    restaurantId,
    actor: {
      type: 'staff',
      staff_id: staffId,
      staff_name: staffName
    },
    order: {},
    items: [],
    location: {},
    money: {
      total: revenueGenerated
    },
    timing: {
      created_at: new Date().toISOString()
    },
    flags: {},
    metadata: {
      session_duration_seconds: sessionDurationSeconds,
      shift_duration_seconds: sessionDurationSeconds,
      orders_handled: ordersHandled,
      items_prepared: itemsPrepared,
      revenue_generated: revenueGenerated,
      logout_reason: logoutReason
    }
  })
}

export default {
  createRichEventData,
  trackRichEvent,
  trackOrderCreated,
  trackProductsAdded,
  trackOrderCompleted,
  trackTrafficSource,
  trackCartItemRemoved,
  trackCartViewed,
  trackCheckoutStarted,
  trackItemPrepared,
  trackStaffLogin,
  trackStaffLogout,
  getBrowserMetadata,
  sanitizeActor,
  sanitizeOrder,
  sanitizeItem,
  sanitizeMoney,
  sanitizeTiming,
  sanitizeLocation,
  calculateOrderKPIs
}
