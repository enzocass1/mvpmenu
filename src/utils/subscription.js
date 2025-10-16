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

export const FREE_LIMITS = {
  MAX_CATEGORIES: LIMITS.free.categories,
  MAX_ITEMS_PER_CATEGORY: LIMITS.free.itemsPerCategory
}

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

export function getEffectiveLimits(restaurant) {
  const access = checkPremiumAccess(restaurant)
  
  if (access.hasValidAccess) {
    return {
      categories: LIMITS.premium.categories,
      itemsPerCategory: LIMITS.premium.itemsPerCategory,
      plan: 'premium'
    }
  }
  
  return {
    categories: LIMITS.free.categories,
    itemsPerCategory: LIMITS.free.itemsPerCategory,
    plan: 'free'
  }
}

export function canDownloadQRCode(restaurant) {
  const access = checkPremiumAccess(restaurant)
  return access.hasValidAccess
}

export function canExportBackup(restaurant) {
  const access = checkPremiumAccess(restaurant)
  return access.hasValidAccess
}

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

export function getSubscriptionHealth(restaurant) {
  if (!restaurant) return null

  const isPremiumTier = restaurant.subscription_tier === 'premium'
  if (!isPremiumTier) return null

  const status = restaurant.subscription_status

  if (status === 'active' || status === 'trialing') {
    return null
  }

  if (status === 'past_due') {
    return {
      severity: 'warning',
      actionRequired: true,
      action: 'update_payment',
      message: 'Il pagamento del tuo abbonamento è in sospeso. Aggiorna il metodo di pagamento per evitare l\'interruzione del servizio.'
    }
  }

  if (status === 'incomplete' || status === 'incomplete_expired') {
    return {
      severity: 'warning',
      actionRequired: true,
      action: 'update_payment',
      message: 'Il pagamento dell\'abbonamento non è stato completato. Completa il pagamento per attivare il piano Premium.'
    }
  }

  if (status === 'canceled') {
    return {
      severity: 'info',
      actionRequired: true,
      action: 'reactivate',
      message: 'Il tuo abbonamento Premium è stato cancellato. Puoi riattivarlo in qualsiasi momento.'
    }
  }

  if (status === 'expired') {
    return {
      severity: 'warning',
      actionRequired: true,
      action: 'renew',
      message: 'Il tuo abbonamento Premium è scaduto. Rinnova per continuare ad utilizzare tutte le funzionalità.'
    }
  }

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

export function canCreateCategory(restaurant, currentCount) {
  const limits = getEffectiveLimits(restaurant)
  return currentCount < limits.categories
}

export function canCreateItem(restaurant, currentCount) {
  const limits = getEffectiveLimits(restaurant)
  return currentCount < limits.itemsPerCategory
}

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

export function canAddItem(restaurant, currentCount) {
  return canCreateItem(restaurant, currentCount)
}

export function canAddCategory(restaurant, currentCount) {
  return canCreateCategory(restaurant, currentCount)
}

export function isCategoryVisible(category, categoryIndex, restaurant) {
  if (category.is_visible === false) {
    return false
  }

  const limits = getEffectiveLimits(restaurant)
  
  if (limits.plan === 'premium') {
    return true
  }
  
  return categoryIndex < limits.categories
}

export function isProductVisible(product, productIndex, restaurant) {
  if (product.is_visible === false) {
    return false
  }

  const limits = getEffectiveLimits(restaurant)
  
  if (limits.plan === 'premium') {
    return true
  }
  
  return productIndex < limits.itemsPerCategory
}

export function isItemVisible(item, itemIndex, restaurant) {
  return isProductVisible(item, itemIndex, restaurant)
}

export function getHiddenCategoriesCount(categories, restaurant) {
  if (!restaurant || !categories) {
    return 0
  }

  const limits = getEffectiveLimits(restaurant)
  
  if (limits.plan === 'premium') {
    return categories.filter(c => c.is_visible === false).length
  }
  
  const visibleCategories = categories.filter(c => c.is_visible !== false)
  const categoriesOverLimit = Math.max(0, visibleCategories.length - limits.categories)
  const categoriesHiddenByUser = categories.filter(c => c.is_visible === false).length
  
  return categoriesOverLimit + categoriesHiddenByUser
}

export function getHiddenProductsCountInCategory(products, restaurant) {
  if (!restaurant || !products) {
    return 0
  }

  const limits = getEffectiveLimits(restaurant)
  
  if (limits.plan === 'premium') {
    return products.filter(p => p.is_visible === false).length
  }
  
  const visibleProducts = products.filter(p => p.is_visible !== false)
  const productsOverLimit = Math.max(0, visibleProducts.length - limits.itemsPerCategory)
  const productsHiddenByUser = products.filter(p => p.is_visible === false).length
  
  return productsOverLimit + productsHiddenByUser
}

export function getHiddenCounts(restaurant, categories) {
  if (!restaurant || !categories) {
    return { hiddenCategories: 0, hiddenItems: 0 }
  }

  const hiddenCategories = getHiddenCategoriesCount(categories, restaurant)
  
  return { hiddenCategories, hiddenItems: 0 }
}