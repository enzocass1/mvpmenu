// Disponibilità/scorta condivisa (menu pubblico, Cassa, ecc.)
//
//  - "tracked": il prodotto/variante ha il tracciamento scorte attivo
//  - "available": disponibile = giacenza − impegnato (Infinity se non tracciato)
//  - "esaurito": disponibile <= 0
//  - "low": disponibile <= soglia minima (solo per uso interno/app)

export function getAvailability(item) {
  if (!item || !item.track_quantity) {
    return { tracked: false, available: Infinity, esaurito: false, low: false }
  }
  const q = Number(item.quantity || 0)
  const c = Number(item.committed || 0)
  const available = q - c
  const threshold = Number(item.low_stock_threshold || 0)
  return { tracked: true, available, esaurito: available <= 0, low: available <= threshold }
}

// Esaurito a livello di PRODOTTO, considerando le varianti:
//  - senza varianti: dipende dal prodotto stesso
//  - con varianti: esaurito solo se TUTTE le varianti sono tracciate ed esaurite
export function isProductEsaurito(product) {
  if (Array.isArray(product?.variants) && product.variants.length) {
    const variants = product.variants
    if (!variants.every(v => v.track_quantity)) return false // c'è almeno una variante sempre disponibile
    return variants.every(v => getAvailability(v).esaurito)
  }
  return getAvailability(product).esaurito
}

// Scorta bassa a livello di prodotto (per uso interno/app)
export function isProductLow(product) {
  if (Array.isArray(product?.variants) && product.variants.length) {
    const tracked = product.variants.filter(v => v.track_quantity)
    if (tracked.length === 0) return false
    return tracked.some(v => getAvailability(v).low)
  }
  return getAvailability(product).low
}
