/**
 * Customer Management Utilities
 * Gestione clienti registrati e "Cliente Incognito"
 */

import { supabase } from '../supabaseClient'

/**
 * Get or create anonymous customer for QR orders
 *
 * @param {string} restaurantId - Restaurant ID
 * @param {string} sessionId - Session ID (from localStorage)
 * @returns {Promise<object>} Customer object
 */
export const getOrCreateAnonymousCustomer = async (restaurantId, sessionId = null) => {
  try {
    // Usa funzione PostgreSQL per atomicità
    const { data, error } = await supabase
      .rpc('get_or_create_anonymous_customer', {
        p_restaurant_id: restaurantId,
        p_session_id: sessionId
      })

    if (error) throw error

    return { success: true, customer: data }
  } catch (error) {
    console.error('[getOrCreateAnonymousCustomer] Error:', error)
    return { success: false, error }
  }
}

/**
 * Get customer by ID
 */
export const getCustomerById = async (customerId) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .is('deleted_at', null)
      .single()

    if (error) throw error

    return { success: true, customer: data }
  } catch (error) {
    console.error('[getCustomerById] Error:', error)
    return { success: false, error }
  }
}

/**
 * Get customer by email
 */
export const getCustomerByEmail = async (restaurantId, email) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('email', email)
      .is('deleted_at', null)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found

    return { success: true, customer: data || null }
  } catch (error) {
    console.error('[getCustomerByEmail] Error:', error)
    return { success: false, error }
  }
}

/**
 * Create registered customer
 */
export const createCustomer = async ({
  restaurantId,
  name,
  email = null,
  phone = null,
  locale = 'it-IT',
  dietaryRestrictions = [],
  allergies = [],
  marketingConsent = false,
  smsConsent = false,
  pushConsent = false,
  registrationSource = 'qr',
  registrationMethod = 'email',
  trafficSource = null,
  utmSource = null,
  utmCampaign = null
}) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .insert([
        {
          restaurant_id: restaurantId,
          name,
          email,
          phone,
          locale,
          is_registered: true,
          is_anonymous: false,
          dietary_restrictions: dietaryRestrictions,
          allergies: allergies,
          marketing_consent: marketingConsent,
          sms_consent: smsConsent,
          push_consent: pushConsent,
          registration_source: registrationSource,
          registration_method: registrationMethod,
          traffic_source: trafficSource,
          utm_source: utmSource,
          utm_campaign: utmCampaign,
          registered_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (error) throw error

    console.log('✅ Customer creato:', data.id)
    return { success: true, customer: data }
  } catch (error) {
    console.error('[createCustomer] Error:', error)
    return { success: false, error }
  }
}

/**
 * Update customer profile
 */
export const updateCustomer = async (customerId, updates) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId)
      .select()
      .single()

    if (error) throw error

    console.log('✅ Customer aggiornato:', customerId)
    return { success: true, customer: data }
  } catch (error) {
    console.error('[updateCustomer] Error:', error)
    return { success: false, error }
  }
}

/**
 * Add loyalty points to customer
 */
export const addLoyaltyPoints = async (customerId, points, reason = 'order_completed', orderId = null) => {
  try {
    // Get current customer
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('loyalty_points')
      .eq('id', customerId)
      .single()

    if (fetchError) throw fetchError

    const currentPoints = customer.loyalty_points || 0
    const newPoints = currentPoints + points

    // Determine tier
    let newTier = 'none'
    if (newPoints >= 1000) newTier = 'gold'
    else if (newPoints >= 500) newTier = 'silver'
    else if (newPoints >= 100) newTier = 'bronze'

    // Update customer
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        loyalty_points: newPoints,
        loyalty_tier: newTier,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId)

    if (updateError) throw updateError

    console.log(`✅ ${points} loyalty points aggiunti a customer ${customerId}`)
    return {
      success: true,
      pointsAdded: points,
      newBalance: newPoints,
      newTier
    }
  } catch (error) {
    console.error('[addLoyaltyPoints] Error:', error)
    return { success: false, error }
  }
}

/**
 * Redeem loyalty points
 */
export const redeemLoyaltyPoints = async (customerId, points, rewardType = 'discount', rewardValue = 0, orderId = null) => {
  try {
    // Get current customer
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('loyalty_points, loyalty_tier')
      .eq('id', customerId)
      .single()

    if (fetchError) throw fetchError

    const currentPoints = customer.loyalty_points || 0

    // Check if has enough points
    if (currentPoints < points) {
      return {
        success: false,
        error: 'Insufficient loyalty points',
        currentPoints,
        pointsNeeded: points
      }
    }

    const newPoints = currentPoints - points

    // Determine new tier
    let newTier = 'none'
    if (newPoints >= 1000) newTier = 'gold'
    else if (newPoints >= 500) newTier = 'silver'
    else if (newPoints >= 100) newTier = 'bronze'

    // Update customer
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        loyalty_points: newPoints,
        loyalty_tier: newTier,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId)

    if (updateError) throw updateError

    console.log(`✅ ${points} loyalty points riscattati da customer ${customerId}`)
    return {
      success: true,
      pointsRedeemed: points,
      newBalance: newPoints,
      newTier,
      rewardType,
      rewardValue
    }
  } catch (error) {
    console.error('[redeemLoyaltyPoints] Error:', error)
    return { success: false, error }
  }
}

/**
 * Get customer analytics
 */
export const getCustomerAnalytics = async (restaurantId, customerId = null) => {
  try {
    let query = supabase
      .from('customer_analytics')
      .select('*')
      .eq('restaurant_id', restaurantId)

    if (customerId) {
      query = query.eq('id', customerId)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, analytics: data }
  } catch (error) {
    console.error('[getCustomerAnalytics] Error:', error)
    return { success: false, error }
  }
}

/**
 * Get customer order history
 */
export const getCustomerOrders = async (customerId, limit = 20) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        table:tables(id, number),
        room:rooms(id, name)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return { success: true, orders: data }
  } catch (error) {
    console.error('[getCustomerOrders] Error:', error)
    return { success: false, error }
  }
}

/**
 * Check if customer is registered
 */
export const isCustomerRegistered = (customer) => {
  return customer && customer.is_registered && !customer.is_anonymous
}

/**
 * Format customer name for display
 */
export const getCustomerDisplayName = (customer) => {
  if (!customer) return 'Cliente Incognito'
  if (customer.is_anonymous) return 'Cliente Incognito'
  return customer.name || customer.email || 'Cliente'
}

export default {
  getOrCreateAnonymousCustomer,
  getCustomerById,
  getCustomerByEmail,
  createCustomer,
  updateCustomer,
  addLoyaltyPoints,
  redeemLoyaltyPoints,
  getCustomerAnalytics,
  getCustomerOrders,
  isCustomerRegistered,
  getCustomerDisplayName
}
