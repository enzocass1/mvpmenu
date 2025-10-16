// src/utils/subscription.js

const LIMITS = {
  free: {
    categories: 3,
    itemsPerCategory: 3
  },
  premium: {
    categories: Infinity,
    itemsPerCategory: Infinity
  }
}

/**
 * Verifica se l'utente ha accesso premium VALIDO
 * Solo 'active' e 'trialing' danno accesso completo
 */
export function checkPremiumAccess(restaurant) {
  if (!restaurant) {
    return {
      isPremium: false,
      isActive: false,
      hasValidAccess: false,
      reason: 'no_restaurant'
    }
  }

  const isPremiumTier = restaurant.subscription_tier === 'premium'
  const validStatuses = ['active', 'trialing']
  const isActiveStatus = validStatuses.includes(restaurant.subscription_status)
  const hasValidAccess = isPremiumTier && isActiveStatus

  return {
    isPremium: isPremiumTier,
    isActive: isActiveStatus,
    hasValidAccess: hasValidAccess,
    status: restaurant.subscription_status,
    reason: !hasValidAccess && isPremiumTier 
      ? `status_${restaurant.subscription_status || 'missing'}` 
      : 'ok'
  }
}

/**
 * Ottiene i limiti EFFETTIVI basandosi sullo status reale
 * past_due, expired, canceled = limiti FREE
 */
export function getEffectiveLimits(restaurant) {
  const access = checkPremiumAccess(restaurant)
  
  // Solo se ha accesso VALIDO restituisce limiti premium
  if (access.hasValidAccess) {
    return {
      categories: LIMITS.premium.categories,
      itemsPerCategory: LIMITS.premium.itemsPerCategory,
      plan: 'premium'
    }
  }
  
  // Altrimenti sempre limiti free (anche per past_due, expired, etc)
  return {
    categories: LIMITS.free.categories,
    itemsPerCategory: LIMITS.free.itemsPerCategory,
    plan: 'free'
  }
}

/**
 * Verifica se può scaricare il QR Code
 * Solo con accesso premium VALIDO
 */
export function canDownloadQRCode(restaurant) {
  const access = checkPremiumAccess(restaurant)
  return access.hasValidAccess
}

/**
 * Verifica se può esportare backup
 * Solo con accesso premium VALIDO
 */
export function canExportBackup(restaurant) {
  const access = checkPremiumAccess(restaurant)
  return access.hasValidAccess
}

/**
 * Ottiene informazioni sul piano (per UI)
 */
export function getPlanInfo(restaurant) {
  if (!restaurant) {
    return {
      name: 'Free',
      maxCategories: LIMITS.free.categories,
      maxItemsPerCategory: LIMITS.free.itemsPerCategory,
      features: ['Fino a 3 categorie', 'Fino a 3 prodotti per categoria']
    }
  }

  const access = checkPremiumAccess(restaurant)
  const limits = getEffectiveLimits(restaurant)

  if (access.hasValidAccess) {
    return {
      name: 'Premium',
      maxCategories: limits.categories,
      maxItemsPerCategory: limits.itemsPerCategory,
      features: [
        'Categorie illimitate',
        'Prodotti illimitati',
        'Download QR Code',
        'Backup del menu',
        'Supporto prioritario'
      ]
    }
  }

  return {
    name: 'Free',
    maxCategories: limits.categories,
    maxItemsPerCategory: limits.itemsPerCategory,
    features: ['Fino a 3 categorie', 'Fino a 3 prodotti per categoria']
  }
}

/**
 * Verifica lo stato di salute dell'abbonamento
 * Restituisce alert da mostrare all'utente
 */
export function getSubscriptionHealth(restaurant) {
  if (!restaurant) return null

  const isPremiumTier = restaurant.subscription_tier === 'premium'
  if (!isPremiumTier) return null

  const status = restaurant.subscription_status

  // Premium attivo o in trial = tutto ok
  if (status === 'active' || status === 'trialing') {
    return null
  }

  // Past due = richiede aggiornamento pagamento
  if (status === 'past_due') {
    return {
      severity: 'warning',
      actionRequired: true,
      action: 'update_payment',
      message: 'Il pagamento del tuo abbonamento è in sospeso. Aggiorna il metodo di pagamento per evitare l\'interruzione del servizio.'
    }
  }

  // Incomplete = pagamento incompleto
  if (status === 'incomplete' || status === 'incomplete_expired') {
    return {
      severity: 'warning',
      actionRequired: true,
      action: 'update_payment',
      message: 'Il pagamento dell\'abbonamento non è stato completato. Completa il pagamento per attivare il piano Premium.'
    }
  }

  // Canceled = abbonamento cancellato
  if (status === 'canceled') {
    return {
      severity: 'info',
      actionRequired: true,
      action: 'reactivate',
      message: 'Il tuo abbonamento Premium è stato cancellato. Puoi riattivarlo in qualsiasi momento.'
    }
  }

  // Expired = scaduto (per abbonamenti manuali)
  if (status === 'expired') {
    return {
      severity: 'warning',
      actionRequired: true,
      action: 'renew',
      message: 'Il tuo abbonamento Premium è scaduto. Rinnova per continuare ad utilizzare tutte le funzionalità.'
    }
  }

  // Unpaid = non pagato
  if (status === 'unpaid') {
    return {
      severity: 'warning',
      actionRequired: true,
      action: 'update_payment',
      message: 'L\'abbonamento non è stato pagato. Aggiorna il metodo di pagamento per continuare.'
    }
  }

  return null
}

/**
 * Verifica se può creare una nuova categoria
 */
export function canCreateCategory(restaurant, currentCount) {
  const limits = getEffectiveLimits(restaurant)
  return currentCount < limits.categories
}

/**
 * Verifica se può creare un nuovo prodotto in una categoria
 */
export function canCreateItem(restaurant, currentCount) {
  const limits = getEffectiveLimits(restaurant)
  return currentCount < limits.itemsPerCategory
}

/**
 * Ottiene il messaggio di limite raggiunto
 */
export function getLimitMessage(type, restaurant) {
  const limits = getEffectiveLimits(restaurant)
  const access = checkPremiumAccess(restaurant)

  if (type === 'category') {
    if (access.hasValidAccess) {
      return 'Nessun limite sulle categorie'
    }
    return `Hai raggiunto il limite di ${limits.categories} categorie. Passa a Premium per avere categorie illimitate.`
  }

  if (type === 'item') {
    if (access.hasValidAccess) {
      return 'Nessun limite sui prodotti'
    }
    return `Hai raggiunto il limite di ${limits.itemsPerCategory} prodotti per categoria. Passa a Premium per avere prodotti illimitati.`
  }

  return ''
}