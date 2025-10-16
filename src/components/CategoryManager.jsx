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

// Export per compatibilità con componenti esistenti
export const FREE_LIMITS = {
  MAX_CATEGORIES: LIMITS.free.categories,
  MAX_ITEMS_PER_CATEGORY: LIMITS.free.itemsPerCategory
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

// ============================================
// FUNZIONI DI COMPATIBILITÀ CON VECCHI NOMI
// ============================================

/**
 * @deprecated Usa canCreateItem invece
 * Mantenuto per compatibilità con componenti esistenti
 */
export function canAddItem(restaurant, currentCount) {
  return canCreateItem(restaurant, currentCount)
}

/**
 * @deprecated Usa canCreateCategory invece
 */
export function canAddCategory(restaurant, currentCount) {
  return canCreateCategory(restaurant, currentCount)
}

// ============================================
// FUNZIONI PER VISIBILITÀ MENU PUBBLICO
// ============================================

/**
 * Verifica se una categoria è visibile nel menu pubblico
 * Una categoria è visibile se:
 * 1. Ha is_visible = true (non nascosta dall'utente)
 * 2. È dentro i limiti del piano (per utenti free)
 * 
 * IMPORTANTE: Questa funzione serve SOLO per determinare la visibilità 
 * nel menu pubblico, non per la dashboard admin
 */
export function isCategoryVisible(category, categoryIndex, restaurant) {
  // Se la categoria è nascosta dall'utente, non è visibile
  if (category.is_visible === false) {
    return false
  }

  // Ottieni i limiti effettivi
  const limits = getEffectiveLimits(restaurant)
  
  // Se è premium, tutte le categorie visibili (is_visible=true) sono mostrate
  if (limits.plan === 'premium') {
    return true
  }
  
  // Se è free, solo le prime N categorie sono visibili
  return categoryIndex < limits.categories
}

/**
 * Verifica se un prodotto è visibile nel menu pubblico
 * Un prodotto è visibile se:
 * 1. Ha is_visible = true (non nascosto dall'utente)
 * 2. È dentro i limiti del piano (per utenti free)
 */
export function isProductVisible(product, productIndex, restaurant) {
  // Se il prodotto è nascosto dall'utente, non è visibile
  if (product.is_visible === false) {
    return false
  }

  // Ottieni i limiti effettivi
  const limits = getEffectiveLimits(restaurant)
  
  // Se è premium, tutti i prodotti visibili (is_visible=true) sono mostrati
  if (limits.plan === 'premium') {
    return true
  }
  
  // Se è free, solo i primi N prodotti per categoria sono visibili
  return productIndex < limits.itemsPerCategory
}

/**
 * @deprecated - Usa isProductVisible invece
 * Verifica se un item deve essere visibile (non nascosto)
 * NOTA: Questa funzione ora considera anche i limiti del piano
 */
export function isItemVisible(item, itemIndex, restaurant) {
  return isProductVisible(item, itemIndex, restaurant)
}

/**
 * Conta quante categorie sono nascoste dal menu pubblico
 * Restituisce il numero di categorie che superano il limite FREE
 */
export function getHiddenCategoriesCount(categories, restaurant) {
  if (!restaurant || !categories) {
    return 0
  }

  const limits = getEffectiveLimits(restaurant)
  
  // Se è premium, nessuna categoria è nascosta per limiti del piano
  if (limits.plan === 'premium') {
    // Conta solo quelle con is_visible = false
    return categories.filter(c => c.is_visible === false).length
  }
  
  // Se è free, conta le categorie oltre il limite E quelle nascoste dall'utente
  const visibleCategories = categories.filter(c => c.is_visible !== false)
  const categoriesOverLimit = Math.max(0, visibleCategories.length - limits.categories)
  const categoriesHiddenByUser = categories.filter(c => c.is_visible === false).length
  
  return categoriesOverLimit + categoriesHiddenByUser
}

/**
 * Conta quanti prodotti sono nascosti in una categoria
 */
export function getHiddenProductsCountInCategory(products, restaurant) {
  if (!restaurant || !products) {
    return 0
  }

  const limits = getEffectiveLimits(restaurant)
  
  // Se è premium, nessun prodotto è nascosto per limiti del piano
  if (limits.plan === 'premium') {
    // Conta solo quelli con is_visible = false
    return products.filter(p => p.is_visible === false).length
  }
  
  // Se è free, conta i prodotti oltre il limite E quelli nascosti dall'utente
  const visibleProducts = products.filter(p => p.is_visible !== false)
  const productsOverLimit = Math.max(0, visibleProducts.length - limits.itemsPerCategory)
  const productsHiddenByUser = products.filter(p => p.is_visible === false).length
  
  return productsOverLimit + productsHiddenByUser
}

/**
 * Conta quante categorie e prodotti sono nascosti in totale
 * Restituisce { hiddenCategories, hiddenItems }
 */
export function getHiddenCounts(restaurant, categories) {
  if (!restaurant || !categories) {
    return { hiddenCategories: 0, hiddenItems: 0 }
  }

  const hiddenCategories = getHiddenCategoriesCount(categories, restaurant)
  
  // Per contare i prodotti nascosti, dovremmo avere accesso a tutti i prodotti
  // Ma questa funzione viene chiamata solo con le categorie
  // Quindi restituiamo 0 per ora - il conteggio viene fatto nel ProductManager
  return { hiddenCategories, hiddenItems: 0 }
}

export default CategoryManager