/**
 * Utility per gestire i preferiti del menu pubblico
 * Utilizza localStorage per persistenza tra sessioni
 */

const FAVORITES_KEY = 'mvpmenu_favorites'

/**
 * Struttura dei dati salvati:
 * {
 *   [subdomain]: {
 *     [productId]: {
 *       id: string,
 *       name: string,
 *       price: number,
 *       categoryName: string,
 *       categoryId: string,
 *       timestamp: number
 *     }
 *   }
 * }
 */

/**
 * Ottieni tutti i preferiti per un ristorante specifico
 */
export const getFavorites = (subdomain) => {
  try {
    const allFavorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '{}')
    return allFavorites[subdomain] || {}
  } catch (error) {
    console.error('Errore nel recupero dei preferiti:', error)
    return {}
  }
}

/**
 * Ottieni array di preferiti per un ristorante specifico
 */
export const getFavoritesArray = (subdomain) => {
  const favorites = getFavorites(subdomain)
  return Object.values(favorites).sort((a, b) => b.timestamp - a.timestamp)
}

/**
 * Verifica se un prodotto è nei preferiti
 */
export const isFavorite = (subdomain, productId) => {
  const favorites = getFavorites(subdomain)
  return !!favorites[productId]
}

/**
 * Aggiungi un prodotto ai preferiti
 */
export const addFavorite = (subdomain, product, categoryName, categoryId) => {
  try {
    const allFavorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '{}')

    if (!allFavorites[subdomain]) {
      allFavorites[subdomain] = {}
    }

    allFavorites[subdomain][product.id] = {
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description,
      image_url: product.image_url,
      categoryName: categoryName,
      categoryId: categoryId,
      timestamp: Date.now()
    }

    localStorage.setItem(FAVORITES_KEY, JSON.stringify(allFavorites))
    return true
  } catch (error) {
    console.error('Errore nell\'aggiunta ai preferiti:', error)
    return false
  }
}

/**
 * Rimuovi un prodotto dai preferiti
 */
export const removeFavorite = (subdomain, productId) => {
  try {
    const allFavorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '{}')

    if (allFavorites[subdomain]) {
      delete allFavorites[subdomain][productId]

      // Se non ci sono più preferiti per questo ristorante, rimuovi l'oggetto
      if (Object.keys(allFavorites[subdomain]).length === 0) {
        delete allFavorites[subdomain]
      }

      localStorage.setItem(FAVORITES_KEY, JSON.stringify(allFavorites))
    }

    return true
  } catch (error) {
    console.error('Errore nella rimozione dai preferiti:', error)
    return false
  }
}

/**
 * Toggle favorito (aggiungi o rimuovi)
 */
export const toggleFavorite = (subdomain, product, categoryName, categoryId) => {
  if (isFavorite(subdomain, product.id)) {
    return removeFavorite(subdomain, product.id)
  } else {
    return addFavorite(subdomain, product, categoryName, categoryId)
  }
}

/**
 * Ottieni il numero totale di preferiti per un ristorante
 */
export const getFavoritesCount = (subdomain) => {
  const favorites = getFavorites(subdomain)
  return Object.keys(favorites).length
}

/**
 * Cancella tutti i preferiti per un ristorante specifico
 */
export const clearFavorites = (subdomain) => {
  try {
    const allFavorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '{}')
    delete allFavorites[subdomain]
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(allFavorites))
    return true
  } catch (error) {
    console.error('Errore nella cancellazione dei preferiti:', error)
    return false
  }
}

/**
 * Event listener per sincronizzare i preferiti tra tab/finestre
 */
export const onFavoritesChange = (callback) => {
  const handleStorageChange = (e) => {
    if (e.key === FAVORITES_KEY) {
      callback()
    }
  }

  window.addEventListener('storage', handleStorageChange)

  // Ritorna funzione per rimuovere il listener
  return () => window.removeEventListener('storage', handleStorageChange)
}
