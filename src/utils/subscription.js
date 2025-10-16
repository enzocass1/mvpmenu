// src/utils/subscription.js - VERSIONE SEMPLIFICATA

/**
 * Verifica se il ristorante ha accesso Premium
 */
export function checkPremiumAccess(restaurant) {
  // 1. Override manuale ha priorità assoluta
  if (restaurant?.is_manual_premium === true) {
    return {
      isPremium: true,
      reason: 'manual_override',
      source: restaurant.manual_premium_reason || 'Admin granted'
    }
  }
  
  // 2. Controllo subscription Stripe (SOLO active e past_due)
  if (restaurant?.subscription_tier === 'premium') {
    const status = restaurant.subscription_status
    
    // SOLO questi 2 status danno accesso Premium
    const validStatuses = ['active', 'past_due']
    
    if (validStatuses.includes(status)) {
      return {
        isPremium: true,
        reason: 'stripe_subscription',
        source: `Stripe payment (${status})`
      }
    }
  }
  
  // 3. Default: Free
  return {
    isPremium: false,
    reason: 'free_tier',
    source: 'No active subscription'
  }
}

// ... resto del file uguale ...