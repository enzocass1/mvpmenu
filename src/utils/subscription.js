// src/utils/subscription.js

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
  
  // 2. Controllo subscription Stripe
  if (restaurant?.subscription_tier === 'premium') {
    const now = new Date()
    const endsAt = restaurant.subscription_ends_at ? new Date(restaurant.subscription_ends_at) : null
    const status = restaurant.subscription_status
    
    // LOGICA CORRETTA:
    // - 'active': sempre premium
    // - 'past_due': premium fino a quando Stripe non cancella (grace period)
    // - 'canceled': premium fino a subscription_ends_at
    // - 'unpaid', 'incomplete', 'incomplete_expired': no premium
    
    const validStatuses = ['active', 'past_due', 'canceled']
    
    if (validStatuses.includes(status)) {
      // Se c'è una data di scadenza, verifica che non sia passata
      if (endsAt) {
        if (endsAt > now) {
          return {
            isPremium: true,
            reason: 'stripe_subscription',
            source: `Stripe payment (${status})`,
            expiresAt: endsAt
          }
        }
      } else {
        // Nessuna data di scadenza = subscription attiva
        return {
          isPremium: true,
          reason: 'stripe_subscription',
          source: `Stripe payment (${status})`
        }
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
 * Limiti per piano Free
 */
export const FREE_LIMITS = {
  MAX_CATEGORIES: 3,
  MAX_ITEMS_PER_CATEGORY: 3,
  MAX_TOTAL_ITEMS: 9
}

/**
 * Verifica se può scaricare il QR Code
 */
export function canDownloadQRCode(restaurant) {
  return checkPremiumAccess(restaurant).isPremium
}

/**
 * Verifica se può esportare/importare backup
 */
export function canExportBackup(restaurant) {
  return checkPremiumAccess(restaurant).isPremium
}

/**
 * Ottiene informazioni sul piano
 */
export function getPlanInfo(restaurant) {
  const premiumCheck = checkPremiumAccess(restaurant)
  const { isPremium } = premiumCheck
  
  let statusMessage = ''
  if (isPremium && restaurant?.subscription_status === 'past_due') {
    statusMessage = ' (Problema pagamento - Verifica carta)'
  } else if (isPremium && restaurant?.subscription_status === 'canceled' && restaurant?.subscription_ends_at) {
    const endsAt = new Date(restaurant.subscription_ends_at)
    statusMessage = ` (Scade il ${endsAt.toLocaleDateString('it-IT')})`
  }
  
  return {
    isPremium,
    planName: isPremium ? 'Premium' : 'Free',
    planColor: isPremium ? '#2E7D32' : '#666',
    statusMessage,
    expiresAt: premiumCheck.expiresAt
  }
}

/**
 * Verifica se può aggiungere una nuova categoria
 */
export function canAddCategory(restaurant, currentCategoriesCount) {
  const { isPremium } = checkPremiumAccess(restaurant)
  if (isPremium) return true
  return currentCategoriesCount < FREE_LIMITS.MAX_CATEGORIES
}

/**
 * Verifica se può aggiungere un nuovo prodotto in una categoria
 */
export function canAddItem(restaurant, currentItemsInCategory) {
  const { isPremium } = checkPremiumAccess(restaurant)
  if (isPremium) return true
  return currentItemsInCategory < FREE_LIMITS.MAX_ITEMS_PER_CATEGORY
}

/**
 * Verifica se una categoria è visibile (per menu pubblico)
 */
export function isCategoryVisible(restaurant, categoryIndex) {
  const { isPremium } = checkPremiumAccess(restaurant)
  if (isPremium) return true
  return categoryIndex < FREE_LIMITS.MAX_CATEGORIES
}

/**
 * Verifica se un prodotto è visibile (per menu pubblico)
 */
export function isItemVisible(restaurant, itemIndex) {
  const { isPremium } = checkPremiumAccess(restaurant)
  if (isPremium) return true
  return itemIndex < FREE_LIMITS.MAX_ITEMS_PER_CATEGORY
}

/**
 * Conta quanti elementi sono nascosti
 */
export function getHiddenCounts(restaurant, categories) {
  const { isPremium } = checkPremiumAccess(restaurant)
  if (isPremium) return { hiddenCategories: 0, hiddenItems: 0 }
  
  const totalCategories = categories.length
  const hiddenCategories = Math.max(0, totalCategories - FREE_LIMITS.MAX_CATEGORIES)
  
  let hiddenItems = 0
  categories.forEach((cat, index) => {
    const itemsCount = cat.items?.length || 0
    if (index < FREE_LIMITS.MAX_CATEGORIES) {
      // Categoria visibile, conta items nascosti
      hiddenItems += Math.max(0, itemsCount - FREE_LIMITS.MAX_ITEMS_PER_CATEGORY)
    } else {
      // Categoria nascosta, tutti gli items sono nascosti
      hiddenItems += itemsCount
    }
  })
  
  return { hiddenCategories, hiddenItems }
}

/**
 * Verifica lo stato di salute della subscription
 */
export function getSubscriptionHealth(restaurant) {
  const { isPremium } = checkPremiumAccess(restaurant)
  
  if (!isPremium) {
    return {
      status: 'free',
      message: 'Piano Free attivo',
      severity: 'info',
      actionRequired: false
    }
  }
  
  const status = restaurant?.subscription_status
  const endsAt = restaurant?.subscription_ends_at ? new Date(restaurant.subscription_ends_at) : null
  
  // Problema di pagamento
  if (status === 'past_due') {
    return {
      status: 'warning',
      message: 'Il pagamento non è andato a buon fine. Aggiorna il metodo di pagamento per evitare l\'interruzione del servizio.',
      severity: 'warning',
      actionRequired: true,
      action: 'update_payment'
    }
  }
  
  // Cancellato ma ancora attivo
  if (status === 'canceled' && endsAt) {
    const daysLeft = Math.ceil((endsAt - new Date()) / (1000 * 60 * 60 * 24))
    return {
      status: 'expiring',
      message: `L'abbonamento scadrà tra ${daysLeft} giorn${daysLeft === 1 ? 'o' : 'i'}. Rinnova per mantenere l'accesso Premium.`,
      severity: 'info',
      actionRequired: true,
      action: 'renew',
      daysLeft
    }
  }
  
  // Tutto ok
  return {
    status: 'active',
    message: 'Abbonamento Premium attivo',
    severity: 'success',
    actionRequired: false
  }
}