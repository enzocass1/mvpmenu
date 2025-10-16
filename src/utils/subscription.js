// src/utils/subscription.js

/**
 * Limiti piano FREE
 */
export const FREE_LIMITS = {
  CATEGORIES: 3,
  PRODUCTS_PER_CATEGORY: 3
}

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

/**
 * Verifica se è possibile scaricare il QR Code
 */
export function canDownloadQRCode(restaurant) {
  const { isPremium } = checkPremiumAccess(restaurant)
  return isPremium
}

/**
 * Verifica se è possibile esportare backup
 */
export function canExportBackup(restaurant) {
  const { isPremium } = checkPremiumAccess(restaurant)
  return isPremium
}

/**
 * Verifica se è possibile aggiungere un nuovo item (categoria o prodotto)
 */
export function canAddItem(restaurant, currentCount, itemType) {
  const { isPremium } = checkPremiumAccess(restaurant)
  
  if (isPremium) return true
  
  const limit = itemType === 'category' 
    ? FREE_LIMITS.CATEGORIES 
    : FREE_LIMITS.PRODUCTS_PER_CATEGORY
    
  return currentCount < limit
}

/**
 * Verifica se un item è visibile in base ai limiti Free/Premium
 */
export function isItemVisible(restaurant, itemIndex, itemType) {
  const { isPremium } = checkPremiumAccess(restaurant)
  
  if (isPremium) return true
  
  const limit = itemType === 'category' 
    ? FREE_LIMITS.CATEGORIES 
    : FREE_LIMITS.PRODUCTS_PER_CATEGORY
    
  return itemIndex < limit
}

/**
 * Ottiene info sul piano corrente
 */
export function getPlanInfo(restaurant) {
  const { isPremium, reason, source } = checkPremiumAccess(restaurant)
  
  return {
    isPremium,
    planName: isPremium ? 'Premium' : 'Free',
    reason,
    source,
    limits: isPremium ? null : FREE_LIMITS
  }
}

/**
 * Verifica lo stato di salute dell'abbonamento
 * Restituisce alert se ci sono problemi con il pagamento o rinnovo
 */
export function getSubscriptionHealth(restaurant) {
  const { isPremium } = checkPremiumAccess(restaurant)
  
  if (!isPremium || !restaurant?.subscription_status) {
    return {
      isHealthy: true,
      severity: null,
      message: null,
      actionRequired: false,
      action: null
    }
  }
  
  const status = restaurant.subscription_status
  const updatedAt = restaurant.updated_at ? new Date(restaurant.updated_at) : null
  const now = new Date()
  
  // Calcola giorni dalla data di aggiornamento
  let daysSinceUpdate = null
  if (updatedAt) {
    const diffTime = now - updatedAt
    daysSinceUpdate = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  }
  
  // 1. CRITICAL: Pagamento fallito o cancellato
  if (status === 'past_due') {
    return {
      isHealthy: false,
      severity: 'warning',
      message: 'Il pagamento del tuo abbonamento è in sospeso. Aggiorna il metodo di pagamento per evitare l\'interruzione del servizio.',
      actionRequired: true,
      action: 'update_payment'
    }
  }
  
  // 2. WARNING: Abbonamento in scadenza (ultimi 3 giorni)
  if (status === 'active' && daysSinceUpdate !== null && daysSinceUpdate >= 27) {
    const daysRemaining = 30 - daysSinceUpdate
    return {
      isHealthy: true,
      severity: 'info',
      message: `Il tuo abbonamento Premium si rinnoverà tra ${daysRemaining} giorni.`,
      actionRequired: false,
      action: null
    }
  }
  
  // 3. Tutto OK
  return {
    isHealthy: true,
    severity: null,
    message: null,
    actionRequired: false,
    action: null
  }
}