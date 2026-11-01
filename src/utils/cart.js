// Logica pura del carrello del menu pubblico (testabile senza React)

/**
 * Chiave univoca di una riga del carrello: stesso prodotto con variante o note
 * diverse = righe diverse (es. "Spritz Aperol" e "Spritz Campari")
 */
export const cartLineKey = (item) =>
  `${item.id}|${item.variant_id || ''}|${item.notes || ''}`

/**
 * Aggiunge un prodotto: se la riga esiste già ne somma la quantità
 */
export const addCartItem = (items, newItem) => {
  const key = cartLineKey(newItem)
  const existing = items.find(item => cartLineKey(item) === key)

  if (!existing) return [...items, newItem]

  return items.map(item =>
    cartLineKey(item) === key
      ? { ...item, quantity: item.quantity + newItem.quantity }
      : item
  )
}

/**
 * Imposta la quantità di una riga (sotto 1 la riga viene rimossa)
 */
export const updateCartItemQuantity = (items, lineKey, quantity) => {
  if (quantity < 1) return removeCartItem(items, lineKey)
  return items.map(item => (cartLineKey(item) === lineKey ? { ...item, quantity } : item))
}

export const removeCartItem = (items, lineKey) =>
  items.filter(item => cartLineKey(item) !== lineKey)

/**
 * Numero di pezzi nel carrello (non di righe)
 */
export const countCartPieces = (items) =>
  items.reduce((sum, item) => sum + item.quantity, 0)
