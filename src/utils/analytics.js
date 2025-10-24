/**
 * Utility per tracciamento eventi analytics
 * Invia eventi a Supabase per ogni ristorante
 */

import { supabase } from '../supabaseClient'

/**
 * Tipi di eventi supportati
 */
export const EVENT_TYPES = {
  FAVORITE_ADDED: 'favorite_added',
  FAVORITE_REMOVED: 'favorite_removed',
  PRODUCT_VIEWED: 'product_viewed',
  CATEGORY_VIEWED: 'category_viewed',
  SESSION_TIME: 'session_time',
  QR_SCANNED: 'qr_scanned'
}

/**
 * Traccia un evento analytics
 * @param {string} restaurantId - ID del ristorante
 * @param {string} eventType - Tipo di evento (usa EVENT_TYPES)
 * @param {object} options - Opzioni aggiuntive
 * @returns {Promise<boolean>} - True se successo
 */
export const trackEvent = async (restaurantId, eventType, options = {}) => {
  try {
    if (!restaurantId) {
      console.warn('trackEvent: restaurantId mancante')
      return false
    }

    const eventData = {
      restaurant_id: restaurantId,
      event_type: eventType,
      product_id: options.productId || null,
      category_id: options.categoryId || null,
      session_duration: options.sessionDuration || null,
      metadata: {
        user_agent: navigator.userAgent,
        source: options.source || 'web',
        referrer: document.referrer || null,
        screen_width: window.innerWidth,
        screen_height: window.innerHeight,
        ...options.metadata
      }
    }

    const { error } = await supabase
      .from('analytics_events')
      .insert([eventData])

    if (error) {
      console.error('Errore tracciamento evento:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Errore trackEvent:', error)
    return false
  }
}

/**
 * Traccia aggiunta preferito
 */
export const trackFavoriteAdded = (restaurantId, productId, categoryId) => {
  return trackEvent(restaurantId, EVENT_TYPES.FAVORITE_ADDED, {
    productId,
    categoryId
  })
}

/**
 * Traccia rimozione preferito
 */
export const trackFavoriteRemoved = (restaurantId, productId) => {
  return trackEvent(restaurantId, EVENT_TYPES.FAVORITE_REMOVED, {
    productId
  })
}

/**
 * Traccia visualizzazione prodotto
 */
export const trackProductViewed = (restaurantId, productId, categoryId) => {
  return trackEvent(restaurantId, EVENT_TYPES.PRODUCT_VIEWED, {
    productId,
    categoryId
  })
}

/**
 * Traccia visualizzazione categoria
 */
export const trackCategoryViewed = (restaurantId, categoryId) => {
  return trackEvent(restaurantId, EVENT_TYPES.CATEGORY_VIEWED, {
    categoryId
  })
}

/**
 * Traccia tempo sessione
 */
export const trackSessionTime = (restaurantId, durationSeconds) => {
  // Traccia solo se la sessione è > 5 secondi (evita bot/refresh)
  if (durationSeconds < 5) return false

  return trackEvent(restaurantId, EVENT_TYPES.SESSION_TIME, {
    sessionDuration: Math.round(durationSeconds)
  })
}

/**
 * Traccia scan QR code
 */
export const trackQRScanned = (restaurantId) => {
  return trackEvent(restaurantId, EVENT_TYPES.QR_SCANNED, {
    source: 'qr',
    metadata: {
      scan_time: new Date().toISOString()
    }
  })
}

/**
 * Hook per tracciare il tempo di sessione automaticamente
 * Usa nei componenti con useEffect
 */
export const useSessionTracking = (restaurantId) => {
  let startTime = Date.now()
  let isTracked = false

  const trackSession = () => {
    if (isTracked || !restaurantId) return

    const duration = (Date.now() - startTime) / 1000
    trackSessionTime(restaurantId, duration)
    isTracked = true
  }

  // Traccia quando l'utente lascia la pagina
  const handleBeforeUnload = () => {
    trackSession()
  }

  // Traccia quando la tab diventa invisibile
  const handleVisibilityChange = () => {
    if (document.hidden) {
      trackSession()
    }
  }

  // Aggiungi event listeners
  window.addEventListener('beforeunload', handleBeforeUnload)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  // Cleanup function
  return () => {
    trackSession() // Traccia prima di smontare
    window.removeEventListener('beforeunload', handleBeforeUnload)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}

/**
 * Funzioni per query analytics (usate nella dashboard)
 */

/**
 * Ottieni eventi per range di date
 */
export const getAnalyticsEvents = async (restaurantId, eventType, startDate, endDate) => {
  try {
    let query = supabase
      .from('analytics_events')
      .select('*')
      .eq('restaurant_id', restaurantId)

    if (eventType) {
      query = query.eq('event_type', eventType)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Errore getAnalyticsEvents:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Errore getAnalyticsEvents:', error)
    return []
  }
}

/**
 * Ottieni conteggio eventi aggregati per giorno
 */
export const getEventsCountByDay = async (restaurantId, eventType, startDate, endDate) => {
  try {
    const events = await getAnalyticsEvents(restaurantId, eventType, startDate, endDate)

    // Aggrega per giorno
    const countsByDay = {}

    events.forEach(event => {
      const date = new Date(event.created_at).toISOString().split('T')[0]
      countsByDay[date] = (countsByDay[date] || 0) + 1
    })

    return Object.entries(countsByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  } catch (error) {
    console.error('Errore getEventsCountByDay:', error)
    return []
  }
}

/**
 * Ottieni conteggio eventi aggregati per fascia oraria (mezz'ora)
 */
export const getEventsCountByHalfHour = async (restaurantId, eventType, startDate, endDate) => {
  try {
    const events = await getAnalyticsEvents(restaurantId, eventType, startDate, endDate)

    // Aggrega per fascia oraria di 30 minuti
    const countsByHour = {}

    events.forEach(event => {
      const date = new Date(event.created_at)
      const hour = date.getHours()
      const minutes = date.getMinutes() < 30 ? '00' : '30'
      const timeSlot = `${hour.toString().padStart(2, '0')}:${minutes}`

      countsByHour[timeSlot] = (countsByHour[timeSlot] || 0) + 1
    })

    return Object.entries(countsByHour)
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => a.time.localeCompare(b.time))
  } catch (error) {
    console.error('Errore getEventsCountByHalfHour:', error)
    return []
  }
}

/**
 * Ottieni prodotti più visti/preferiti
 */
export const getTopProducts = async (restaurantId, eventType, startDate, endDate, limit = 10) => {
  try {
    const events = await getAnalyticsEvents(restaurantId, eventType, startDate, endDate)

    // Conta occorrenze per prodotto
    const productCounts = {}

    events.forEach(event => {
      if (event.product_id) {
        productCounts[event.product_id] = (productCounts[event.product_id] || 0) + 1
      }
    })

    // Ordina e prendi top N
    const topProducts = Object.entries(productCounts)
      .map(([productId, count]) => ({ productId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)

    // Carica dettagli prodotti
    if (topProducts.length > 0) {
      const productIds = topProducts.map(p => p.productId)
      const { data: products } = await supabase
        .from('products')
        .select('id, name, price, image_url, category_id')
        .in('id', productIds)

      return topProducts.map(tp => {
        const product = products?.find(p => p.id === tp.productId)
        return {
          ...tp,
          ...product
        }
      })
    }

    return []
  } catch (error) {
    console.error('Errore getTopProducts:', error)
    return []
  }
}

/**
 * Ottieni categorie più visualizzate
 */
export const getTopCategories = async (restaurantId, startDate, endDate, limit = 10) => {
  try {
    const events = await getAnalyticsEvents(restaurantId, EVENT_TYPES.CATEGORY_VIEWED, startDate, endDate)

    // Conta occorrenze per categoria
    const categoryCounts = {}

    events.forEach(event => {
      if (event.category_id) {
        categoryCounts[event.category_id] = (categoryCounts[event.category_id] || 0) + 1
      }
    })

    // Ordina e prendi top N
    const topCategories = Object.entries(categoryCounts)
      .map(([categoryId, count]) => ({ categoryId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)

    // Carica dettagli categorie
    if (topCategories.length > 0) {
      const categoryIds = topCategories.map(c => c.categoryId)
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name, image_url')
        .in('id', categoryIds)

      return topCategories.map(tc => {
        const category = categories?.find(c => c.id === tc.categoryId)
        return {
          ...tc,
          ...category
        }
      })
    }

    return []
  } catch (error) {
    console.error('Errore getTopCategories:', error)
    return []
  }
}

/**
 * Ottieni tempo medio sessione
 */
export const getAverageSessionTime = async (restaurantId, startDate, endDate) => {
  try {
    const events = await getAnalyticsEvents(restaurantId, EVENT_TYPES.SESSION_TIME, startDate, endDate)

    if (events.length === 0) return 0

    const totalSeconds = events.reduce((sum, event) => sum + (event.session_duration || 0), 0)
    const averageSeconds = totalSeconds / events.length

    return Math.round(averageSeconds)
  } catch (error) {
    console.error('Errore getAverageSessionTime:', error)
    return 0
  }
}

/**
 * Ottieni conteggio totale eventi
 */
export const getTotalEventsCount = async (restaurantId, eventType, startDate, endDate) => {
  try {
    const events = await getAnalyticsEvents(restaurantId, eventType, startDate, endDate)
    return events.length
  } catch (error) {
    console.error('Errore getTotalEventsCount:', error)
    return 0
  }
}

/**
 * FUNZIONI ANALYTICS AVANZATE
 */

/**
 * Calcola il tempo medio di visualizzazione per prodotto
 */
export const getAverageViewTimeByProduct = async (restaurantId, productId, startDate, endDate) => {
  try {
    const events = await getAnalyticsEvents(restaurantId, EVENT_TYPES.PRODUCT_VIEWED, startDate, endDate)
    const productEvents = events.filter(e => e.product_id === productId)

    if (productEvents.length === 0) return 0

    // Stima basata sul tempo tra visualizzazioni consecutive
    let totalTime = 0
    let count = 0

    for (let i = 0; i < productEvents.length - 1; i++) {
      const timeDiff = new Date(productEvents[i + 1].created_at) - new Date(productEvents[i].created_at)
      if (timeDiff < 300000) { // Ignora gap > 5 minuti
        totalTime += timeDiff / 1000
        count++
      }
    }

    return count > 0 ? Math.round(totalTime / count) : 30 // Default 30s
  } catch (error) {
    console.error('Errore getAverageViewTimeByProduct:', error)
    return 0
  }
}

/**
 * Trova la fascia oraria top per un prodotto/categoria
 */
export const getTopTimeSlot = async (restaurantId, eventType, entityId = null, startDate, endDate) => {
  try {
    const events = await getAnalyticsEvents(restaurantId, eventType, startDate, endDate)

    const filteredEvents = entityId
      ? events.filter(e => e.product_id === entityId || e.category_id === entityId)
      : events

    const hourCounts = {}

    filteredEvents.forEach(event => {
      const hour = new Date(event.created_at).getHours()
      const slot = `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`
      hourCounts[slot] = (hourCounts[slot] || 0) + 1
    })

    const topSlot = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0]

    return topSlot ? topSlot[0] : 'N/A'
  } catch (error) {
    console.error('Errore getTopTimeSlot:', error)
    return 'N/A'
  }
}

/**
 * Trova il giorno della settimana top
 */
export const getTopDayOfWeek = async (restaurantId, eventType, entityId = null, startDate, endDate) => {
  try {
    const events = await getAnalyticsEvents(restaurantId, eventType, startDate, endDate)

    const filteredEvents = entityId
      ? events.filter(e => e.product_id === entityId || e.category_id === entityId)
      : events

    const dayCounts = {}
    const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']

    filteredEvents.forEach(event => {
      const dayIndex = new Date(event.created_at).getDay()
      const dayName = dayNames[dayIndex]
      dayCounts[dayName] = (dayCounts[dayName] || 0) + 1
    })

    const topDay = Object.entries(dayCounts)
      .sort(([,a], [,b]) => b - a)[0]

    return topDay ? topDay[0] : 'N/A'
  } catch (error) {
    console.error('Errore getTopDayOfWeek:', error)
    return 'N/A'
  }
}

/**
 * Calcola il tasso di conversione a preferito
 */
export const getFavoriteConversionRate = async (restaurantId, productId, startDate, endDate) => {
  try {
    const viewEvents = await getAnalyticsEvents(restaurantId, EVENT_TYPES.PRODUCT_VIEWED, startDate, endDate)
    const favoriteEvents = await getAnalyticsEvents(restaurantId, EVENT_TYPES.FAVORITE_ADDED, startDate, endDate)

    const views = viewEvents.filter(e => e.product_id === productId).length
    const favorites = favoriteEvents.filter(e => e.product_id === productId).length

    if (views === 0) return 0
    return ((favorites / views) * 100).toFixed(1)
  } catch (error) {
    console.error('Errore getFavoriteConversionRate:', error)
    return 0
  }
}

/**
 * Calcola il trend rispetto al periodo precedente
 */
export const getTrend = async (restaurantId, eventType, entityId, startDate, endDate) => {
  try {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const duration = end - start

    const previousStart = new Date(start - duration)
    const previousEnd = start

    const currentEvents = await getAnalyticsEvents(restaurantId, eventType, startDate, endDate)
    const previousEvents = await getAnalyticsEvents(restaurantId, eventType, previousStart.toISOString(), previousEnd.toISOString())

    const currentCount = entityId
      ? currentEvents.filter(e => e.product_id === entityId || e.category_id === entityId).length
      : currentEvents.length

    const previousCount = entityId
      ? previousEvents.filter(e => e.product_id === entityId || e.category_id === entityId).length
      : previousEvents.length

    if (previousCount === 0) return { trend: 'stable', percentage: 0 }

    const percentageChange = ((currentCount - previousCount) / previousCount) * 100

    let trend = 'stable'
    if (percentageChange > 5) trend = 'up'
    else if (percentageChange < -5) trend = 'down'

    return { trend, percentage: percentageChange.toFixed(1) }
  } catch (error) {
    console.error('Errore getTrend:', error)
    return { trend: 'stable', percentage: 0 }
  }
}

/**
 * Calcola il valore stimato (prezzo × visualizzazioni)
 */
export const getEstimatedValue = (price, views) => {
  return (price * views).toFixed(2)
}

/**
 * Calcola il bounce rate (approssimato)
 */
export const getBounceRate = async (restaurantId, productId, startDate, endDate) => {
  try {
    const events = await getAnalyticsEvents(restaurantId, EVENT_TYPES.PRODUCT_VIEWED, startDate, endDate)
    const productViews = events.filter(e => e.product_id === productId)

    // Stima bounce: visualizzazioni seguite da nessun'altra azione entro 5 secondi
    let bounces = 0

    productViews.forEach((view, index) => {
      if (index < productViews.length - 1) {
        const nextView = productViews[index + 1]
        const timeDiff = (new Date(nextView.created_at) - new Date(view.created_at)) / 1000
        if (timeDiff < 5) bounces++
      }
    })

    if (productViews.length === 0) return 0
    return ((bounces / productViews.length) * 100).toFixed(1)
  } catch (error) {
    console.error('Errore getBounceRate:', error)
    return 0
  }
}

/**
 * Rileva il tipo di device
 */
export const getDeviceType = (userAgent) => {
  if (!userAgent) return 'Unknown'

  if (/mobile|android|iphone/i.test(userAgent)) return 'Mobile'
  if (/tablet|ipad/i.test(userAgent)) return 'Tablet'
  return 'Desktop'
}

/**
 * Analizza il device type da eventi
 */
export const getDeviceDistribution = async (restaurantId, eventType, entityId, startDate, endDate) => {
  try {
    const events = await getAnalyticsEvents(restaurantId, eventType, startDate, endDate)

    const filteredEvents = entityId
      ? events.filter(e => e.product_id === entityId || e.category_id === entityId)
      : events

    const deviceCounts = { Desktop: 0, Mobile: 0, Tablet: 0, Unknown: 0 }

    filteredEvents.forEach(event => {
      const userAgent = event.metadata?.user_agent || ''
      const deviceType = getDeviceType(userAgent)
      deviceCounts[deviceType]++
    })

    const total = filteredEvents.length
    if (total === 0) return 'N/A'

    const topDevice = Object.entries(deviceCounts)
      .sort(([,a], [,b]) => b - a)[0]

    return `${topDevice[0]} (${((topDevice[1] / total) * 100).toFixed(0)}%)`
  } catch (error) {
    console.error('Errore getDeviceDistribution:', error)
    return 'N/A'
  }
}

/**
 * Rileva la fonte del traffico
 */
export const getTrafficSource = async (restaurantId, eventType, entityId, startDate, endDate) => {
  try {
    const events = await getAnalyticsEvents(restaurantId, eventType, startDate, endDate)

    const filteredEvents = entityId
      ? events.filter(e => e.product_id === entityId || e.category_id === entityId)
      : events

    const sourceCounts = {}

    filteredEvents.forEach(event => {
      const source = event.metadata?.source || 'web'
      sourceCounts[source] = (sourceCounts[source] || 0) + 1
    })

    const topSource = Object.entries(sourceCounts)
      .sort(([,a], [,b]) => b - a)[0]

    return topSource ? topSource[0] : 'web'
  } catch (error) {
    console.error('Errore getTrafficSource:', error)
    return 'N/A'
  }
}

/**
 * Calcola lo score di popolarità (0-100)
 */
export const getPopularityScore = async (restaurantId, productId, startDate, endDate) => {
  try {
    const viewEvents = await getAnalyticsEvents(restaurantId, EVENT_TYPES.PRODUCT_VIEWED, startDate, endDate)
    const favoriteEvents = await getAnalyticsEvents(restaurantId, EVENT_TYPES.FAVORITE_ADDED, startDate, endDate)

    const allProductViews = {}
    viewEvents.forEach(e => {
      if (e.product_id) {
        allProductViews[e.product_id] = (allProductViews[e.product_id] || 0) + 1
      }
    })

    const maxViews = Math.max(...Object.values(allProductViews), 1)
    const productViews = allProductViews[productId] || 0
    const productFavorites = favoriteEvents.filter(e => e.product_id === productId).length

    // Score: 70% views, 30% favorites
    const viewScore = (productViews / maxViews) * 70
    const favoriteScore = Math.min((productFavorites / productViews) * 100, 30)

    return Math.round(viewScore + favoriteScore)
  } catch (error) {
    console.error('Errore getPopularityScore:', error)
    return 0
  }
}

/**
 * Calcola metriche per categorie
 */
export const getAverageProductsExplored = async (restaurantId, categoryId, startDate, endDate) => {
  try {
    const productEvents = await getAnalyticsEvents(restaurantId, EVENT_TYPES.PRODUCT_VIEWED, startDate, endDate)
    const categoryEvents = await getAnalyticsEvents(restaurantId, EVENT_TYPES.CATEGORY_VIEWED, startDate, endDate)

    const categoryViews = categoryEvents.filter(e => e.category_id === categoryId).length
    const productsInCategory = productEvents.filter(e => e.category_id === categoryId)

    const uniqueProducts = new Set(productsInCategory.map(e => e.product_id))

    if (categoryViews === 0) return 0
    return (uniqueProducts.size / categoryViews).toFixed(1)
  } catch (error) {
    console.error('Errore getAverageProductsExplored:', error)
    return 0
  }
}

/**
 * Calcola il tasso di esplorazione categoria
 */
export const getCategoryExplorationRate = async (restaurantId, categoryId, startDate, endDate) => {
  try {
    // Ottieni totale prodotti nella categoria
    const { data: products } = await supabase
      .from('products')
      .select('id')
      .eq('category_id', categoryId)

    const totalProducts = products?.length || 1

    const productEvents = await getAnalyticsEvents(restaurantId, EVENT_TYPES.PRODUCT_VIEWED, startDate, endDate)
    const viewedProducts = new Set(
      productEvents
        .filter(e => e.category_id === categoryId)
        .map(e => e.product_id)
    )

    return ((viewedProducts.size / totalProducts) * 100).toFixed(1)
  } catch (error) {
    console.error('Errore getCategoryExplorationRate:', error)
    return 0
  }
}

/**
 * Ottieni il prodotto stella di una categoria
 */
export const getCategoryStarProduct = async (restaurantId, categoryId, startDate, endDate) => {
  try {
    const productEvents = await getAnalyticsEvents(restaurantId, EVENT_TYPES.PRODUCT_VIEWED, startDate, endDate)

    const productCounts = {}
    productEvents
      .filter(e => e.category_id === categoryId && e.product_id)
      .forEach(e => {
        productCounts[e.product_id] = (productCounts[e.product_id] || 0) + 1
      })

    const topProductId = Object.entries(productCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0]

    if (!topProductId) return null

    const { data: product } = await supabase
      .from('products')
      .select('name')
      .eq('id', topProductId)
      .single()

    return product?.name || null
  } catch (error) {
    console.error('Errore getCategoryStarProduct:', error)
    return null
  }
}

/**
 * FUNZIONI PER ANALISI ORARIA DETTAGLIATA (DRILL-DOWN)
 */

/**
 * Ottieni distribuzione oraria dettagliata per prodotto/categoria (mezz'ora)
 */
export const getHourlyDistribution = async (restaurantId, eventType, entityId, startDate, endDate) => {
  try {
    const events = await getAnalyticsEvents(restaurantId, eventType, startDate, endDate)

    const filteredEvents = entityId
      ? events.filter(e => e.product_id === entityId || e.category_id === entityId)
      : events

    // Crea slot da mezz'ora (00:00, 00:30, 01:00, etc.)
    const timeSlots = []
    for (let hour = 0; hour < 24; hour++) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:00`)
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`)
    }

    const slotCounts = {}
    timeSlots.forEach(slot => {
      slotCounts[slot] = 0
    })

    filteredEvents.forEach(event => {
      const date = new Date(event.created_at)
      const hour = date.getHours()
      const minutes = date.getMinutes()
      const slot = minutes < 30
        ? `${hour.toString().padStart(2, '0')}:00`
        : `${hour.toString().padStart(2, '0')}:30`

      slotCounts[slot]++
    })

    return timeSlots.map(slot => ({
      time: slot,
      count: slotCounts[slot]
    }))
  } catch (error) {
    console.error('Errore getHourlyDistribution:', error)
    return []
  }
}

/**
 * Ottieni distribuzione per giorno della settimana
 */
export const getDayOfWeekDistribution = async (restaurantId, eventType, entityId, startDate, endDate) => {
  try {
    const events = await getAnalyticsEvents(restaurantId, eventType, startDate, endDate)

    const filteredEvents = entityId
      ? events.filter(e => e.product_id === entityId || e.category_id === entityId)
      : events

    const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
    const dayCounts = {}

    dayNames.forEach(day => {
      dayCounts[day] = 0
    })

    filteredEvents.forEach(event => {
      const dayIndex = new Date(event.created_at).getDay()
      const dayName = dayNames[dayIndex]
      dayCounts[dayName]++
    })

    return dayNames.map(day => ({
      day,
      count: dayCounts[day]
    }))
  } catch (error) {
    console.error('Errore getDayOfWeekDistribution:', error)
    return []
  }
}

/**
 * Ottieni matrice giorno × ora (heatmap data)
 */
export const getTimeHeatmapData = async (restaurantId, eventType, entityId, startDate, endDate) => {
  try {
    const events = await getAnalyticsEvents(restaurantId, eventType, startDate, endDate)

    const filteredEvents = entityId
      ? events.filter(e => e.product_id === entityId || e.category_id === entityId)
      : events

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
    const heatmapData = []

    // Crea matrice giorno × ora
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        heatmapData.push({
          day: dayNames[day],
          hour: `${hour.toString().padStart(2, '0')}:00`,
          count: 0
        })
      }
    }

    filteredEvents.forEach(event => {
      const date = new Date(event.created_at)
      const dayIndex = date.getDay()
      const hour = date.getHours()

      const dataPoint = heatmapData.find(
        d => d.day === dayNames[dayIndex] && d.hour === `${hour.toString().padStart(2, '0')}:00`
      )

      if (dataPoint) {
        dataPoint.count++
      }
    })

    return heatmapData
  } catch (error) {
    console.error('Errore getTimeHeatmapData:', error)
    return []
  }
}

/**
 * Ottieni statistiche tempo sessione per fasce orarie
 */
export const getSessionTimeByHour = async (restaurantId, startDate, endDate) => {
  try {
    const events = await getAnalyticsEvents(restaurantId, EVENT_TYPES.SESSION_TIME, startDate, endDate)

    const hourlyStats = {}

    // Inizializza tutte le ore
    for (let hour = 0; hour < 24; hour++) {
      const hourKey = `${hour.toString().padStart(2, '0')}:00`
      hourlyStats[hourKey] = {
        totalTime: 0,
        count: 0,
        avgTime: 0
      }
    }

    events.forEach(event => {
      const hour = new Date(event.created_at).getHours()
      const hourKey = `${hour.toString().padStart(2, '0')}:00`

      if (hourlyStats[hourKey]) {
        hourlyStats[hourKey].totalTime += event.session_duration || 0
        hourlyStats[hourKey].count++
      }
    })

    // Calcola medie
    Object.keys(hourlyStats).forEach(hour => {
      const stats = hourlyStats[hour]
      stats.avgTime = stats.count > 0 ? Math.round(stats.totalTime / stats.count) : 0
    })

    return Object.entries(hourlyStats).map(([hour, stats]) => ({
      hour,
      avgTime: stats.avgTime,
      count: stats.count
    }))
  } catch (error) {
    console.error('Errore getSessionTimeByHour:', error)
    return []
  }
}

/**
 * Ottieni statistiche tempo sessione per giorno della settimana
 */
export const getSessionTimeByDay = async (restaurantId, startDate, endDate) => {
  try {
    const events = await getAnalyticsEvents(restaurantId, EVENT_TYPES.SESSION_TIME, startDate, endDate)

    const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
    const dayStats = {}

    dayNames.forEach(day => {
      dayStats[day] = {
        totalTime: 0,
        count: 0,
        avgTime: 0
      }
    })

    events.forEach(event => {
      const dayIndex = new Date(event.created_at).getDay()
      const dayName = dayNames[dayIndex]

      dayStats[dayName].totalTime += event.session_duration || 0
      dayStats[dayName].count++
    })

    // Calcola medie
    dayNames.forEach(day => {
      const stats = dayStats[day]
      stats.avgTime = stats.count > 0 ? Math.round(stats.totalTime / stats.count) : 0
    })

    return dayNames.map(day => ({
      day,
      avgTime: dayStats[day].avgTime,
      count: dayStats[day].count
    }))
  } catch (error) {
    console.error('Errore getSessionTimeByDay:', error)
    return []
  }
}

/**
 * FUNZIONI PER ANALISI COMPARATIVA
 */

/**
 * Tipi di comparazione disponibili (stile Shopify)
 */
export const COMPARISON_TYPES = {
  PREVIOUS_PERIOD: 'previous_period',
  PREVIOUS_YEAR: 'previous_year',
  CUSTOM: 'custom',
  NONE: 'none'
}

/**
 * Opzioni standard per i filtri temporali
 */
export const TIME_RANGE_OPTIONS = [
  { value: 'today', label: 'Oggi' },
  { value: 'yesterday', label: 'Ieri' },
  { value: 'last7days', label: 'Ultimi 7 giorni' },
  { value: 'last15days', label: 'Ultimi 15 giorni' },
  { value: 'last30days', label: 'Ultimi 30 giorni' },
  { value: 'thisMonth', label: 'Questo mese' },
  { value: 'last3months', label: 'Ultimi 3 mesi' },
  { value: 'last6months', label: 'Ultimi 6 mesi' },
  { value: 'lastYear', label: 'Ultimo anno' },
  { value: 'custom', label: 'Personalizzato' }
]

/**
 * Calcola il range di date in base al periodo selezionato
 * @param {string} timeRange - Il periodo selezionato
 * @param {string} customStartDate - Data inizio personalizzata (opzionale)
 * @param {string} customEndDate - Data fine personalizzata (opzionale)
 * @returns {object|null} - Oggetto con startDate e endDate in formato ISO, o null se mancano dati per custom
 */
export const getDateRangeFromTimeRange = (timeRange, customStartDate = '', customEndDate = '') => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let startDate, endDate

  switch (timeRange) {
    case 'today':
      startDate = new Date(today)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date()
      break

    case 'yesterday':
      startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(startDate)
      endDate.setHours(23, 59, 59, 999)
      break

    case 'last7days':
      startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 7)
      endDate = new Date()
      break

    case 'last15days':
      startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 15)
      endDate = new Date()
      break

    case 'last30days':
      startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 30)
      endDate = new Date()
      break

    case 'last90days':
      startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 90)
      endDate = new Date()
      break

    case 'thisMonth':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date()
      break

    case 'last3months':
      startDate = new Date(today)
      startDate.setMonth(startDate.getMonth() - 3)
      endDate = new Date()
      break

    case 'last6months':
      startDate = new Date(today)
      startDate.setMonth(startDate.getMonth() - 6)
      endDate = new Date()
      break

    case 'lastYear':
      startDate = new Date(today)
      startDate.setFullYear(startDate.getFullYear() - 1)
      endDate = new Date()
      break

    case 'custom':
      if (customStartDate && customEndDate) {
        startDate = new Date(customStartDate)
        endDate = new Date(customEndDate)
        endDate.setHours(23, 59, 59, 999)
      } else {
        return null
      }
      break

    default:
      startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 7)
      endDate = new Date()
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  }
}

/**
 * Calcola il periodo di confronto in base al tipo selezionato
 * @param {string} startDate - Data inizio periodo corrente
 * @param {string} endDate - Data fine periodo corrente
 * @param {string} comparisonType - Tipo di comparazione (COMPARISON_TYPES)
 * @param {object} customPeriod - Periodo personalizzato {startDate, endDate} (opzionale)
 * @returns {object} - {startDate, endDate} del periodo di confronto
 */
export const getComparisonPeriod = (startDate, endDate, comparisonType = COMPARISON_TYPES.PREVIOUS_PERIOD, customPeriod = null) => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const duration = end - start

  switch (comparisonType) {
    case COMPARISON_TYPES.PREVIOUS_PERIOD:
      // Stesso numero di giorni prima
      const previousStart = new Date(start - duration)
      const previousEnd = start
      return {
        startDate: previousStart.toISOString(),
        endDate: previousEnd.toISOString()
      }

    case COMPARISON_TYPES.PREVIOUS_YEAR:
      // Stesso periodo dell'anno scorso
      const lastYearStart = new Date(start)
      lastYearStart.setFullYear(lastYearStart.getFullYear() - 1)
      const lastYearEnd = new Date(end)
      lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1)
      return {
        startDate: lastYearStart.toISOString(),
        endDate: lastYearEnd.toISOString()
      }

    case COMPARISON_TYPES.CUSTOM:
      // Periodo personalizzato fornito dall'utente
      if (customPeriod && customPeriod.startDate && customPeriod.endDate) {
        return {
          startDate: customPeriod.startDate,
          endDate: customPeriod.endDate
        }
      }
      // Fallback a periodo precedente se custom non fornito
      return getComparisonPeriod(startDate, endDate, COMPARISON_TYPES.PREVIOUS_PERIOD)

    case COMPARISON_TYPES.NONE:
    default:
      return null
  }
}

/**
 * Calcola il periodo precedente basato sul periodo corrente (legacy - usa PREVIOUS_PERIOD)
 */
export const getPreviousPeriod = (startDate, endDate) => {
  return getComparisonPeriod(startDate, endDate, COMPARISON_TYPES.PREVIOUS_PERIOD)
}

/**
 * Calcola la comparazione completa per qualsiasi metrica
 * @param {string} comparisonType - Tipo di comparazione (default: PREVIOUS_PERIOD)
 * @param {object} customPeriod - Periodo custom opzionale {startDate, endDate}
 */
export const getComparison = async (restaurantId, eventType, entityId, startDate, endDate, comparisonType = COMPARISON_TYPES.PREVIOUS_PERIOD, customPeriod = null) => {
  try {
    // Se comparazione disabilitata, ritorna null
    if (comparisonType === COMPARISON_TYPES.NONE) {
      return null
    }

    const compPeriod = getComparisonPeriod(startDate, endDate, comparisonType, customPeriod)
    if (!compPeriod) return null

    const { startDate: prevStart, endDate: prevEnd } = compPeriod

    const currentEvents = await getAnalyticsEvents(restaurantId, eventType, startDate, endDate)
    const previousEvents = await getAnalyticsEvents(restaurantId, eventType, prevStart, prevEnd)

    const currentCount = entityId
      ? currentEvents.filter(e => e.product_id === entityId || e.category_id === entityId).length
      : currentEvents.length

    const previousCount = entityId
      ? previousEvents.filter(e => e.product_id === entityId || e.category_id === entityId).length
      : previousEvents.length

    const change = currentCount - previousCount
    const percentageChange = previousCount > 0
      ? ((change / previousCount) * 100).toFixed(1)
      : currentCount > 0 ? 100 : 0

    let status = 'neutral' // neutral, positive, negative
    if (Math.abs(percentageChange) < 1) {
      status = 'neutral'
    } else if (percentageChange > 0) {
      status = 'positive'
    } else {
      status = 'negative'
    }

    return {
      current: currentCount,
      previous: previousCount,
      change,
      percentage: percentageChange,
      status,
      comparisonType
    }
  } catch (error) {
    console.error('Errore getComparison:', error)
    return {
      current: 0,
      previous: 0,
      change: 0,
      percentage: 0,
      status: 'neutral',
      comparisonType
    }
  }
}

/**
 * Comparazione per tempo medio sessione
 */
export const getSessionTimeComparison = async (restaurantId, startDate, endDate, comparisonType = COMPARISON_TYPES.PREVIOUS_PERIOD, customPeriod = null) => {
  try {
    if (comparisonType === COMPARISON_TYPES.NONE) {
      return null
    }

    const compPeriod = getComparisonPeriod(startDate, endDate, comparisonType, customPeriod)
    if (!compPeriod) return null

    const { startDate: prevStart, endDate: prevEnd } = compPeriod

    const currentAvg = await getAverageSessionTime(restaurantId, startDate, endDate)
    const previousAvg = await getAverageSessionTime(restaurantId, prevStart, prevEnd)

    const change = currentAvg - previousAvg
    const percentageChange = previousAvg > 0
      ? ((change / previousAvg) * 100).toFixed(1)
      : currentAvg > 0 ? 100 : 0

    let status = 'neutral'
    if (Math.abs(percentageChange) < 1) {
      status = 'neutral'
    } else if (percentageChange > 0) {
      status = 'positive'
    } else {
      status = 'negative'
    }

    return {
      current: currentAvg,
      previous: previousAvg,
      change,
      percentage: percentageChange,
      status,
      comparisonType
    }
  } catch (error) {
    console.error('Errore getSessionTimeComparison:', error)
    return {
      current: 0,
      previous: 0,
      change: 0,
      percentage: 0,
      status: 'neutral',
      comparisonType
    }
  }
}

/**
 * Comparazione per distribuzione oraria
 */
export const getHourlyDistributionComparison = async (restaurantId, eventType, entityId, startDate, endDate, comparisonType = COMPARISON_TYPES.PREVIOUS_PERIOD, customPeriod = null) => {
  try {
    if (comparisonType === COMPARISON_TYPES.NONE) {
      // Ritorna dati senza comparazione
      const currentData = await getHourlyDistribution(restaurantId, eventType, entityId, startDate, endDate)
      return currentData
    }

    const compPeriod = getComparisonPeriod(startDate, endDate, comparisonType, customPeriod)
    if (!compPeriod) return await getHourlyDistribution(restaurantId, eventType, entityId, startDate, endDate)

    const { startDate: prevStart, endDate: prevEnd } = compPeriod

    const currentData = await getHourlyDistribution(restaurantId, eventType, entityId, startDate, endDate)
    const previousData = await getHourlyDistribution(restaurantId, eventType, entityId, prevStart, prevEnd)

    // Crea mappa per confronto
    const prevMap = {}
    previousData.forEach(item => {
      prevMap[item.time] = item.count
    })

    // Aggiungi comparazione a ogni slot
    const comparisonData = currentData.map(item => {
      const prevCount = prevMap[item.time] || 0
      const change = item.count - prevCount
      const percentage = prevCount > 0
        ? ((change / prevCount) * 100).toFixed(1)
        : item.count > 0 ? 100 : 0

      return {
        ...item,
        previousCount: prevCount,
        change,
        percentage
      }
    })

    return comparisonData
  } catch (error) {
    console.error('Errore getHourlyDistributionComparison:', error)
    return []
  }
}

/**
 * Comparazione per distribuzione giornaliera
 */
export const getDayDistributionComparison = async (restaurantId, eventType, entityId, startDate, endDate, comparisonType = COMPARISON_TYPES.PREVIOUS_PERIOD, customPeriod = null) => {
  try {
    if (comparisonType === COMPARISON_TYPES.NONE) {
      const currentData = await getDayOfWeekDistribution(restaurantId, eventType, entityId, startDate, endDate)
      return currentData
    }

    const compPeriod = getComparisonPeriod(startDate, endDate, comparisonType, customPeriod)
    if (!compPeriod) return await getDayOfWeekDistribution(restaurantId, eventType, entityId, startDate, endDate)

    const { startDate: prevStart, endDate: prevEnd } = compPeriod

    const currentData = await getDayOfWeekDistribution(restaurantId, eventType, entityId, startDate, endDate)
    const previousData = await getDayOfWeekDistribution(restaurantId, eventType, entityId, prevStart, prevEnd)

    const prevMap = {}
    previousData.forEach(item => {
      prevMap[item.day] = item.count
    })

    const comparisonData = currentData.map(item => {
      const prevCount = prevMap[item.day] || 0
      const change = item.count - prevCount
      const percentage = prevCount > 0
        ? ((change / prevCount) * 100).toFixed(1)
        : item.count > 0 ? 100 : 0

      return {
        ...item,
        previousCount: prevCount,
        change,
        percentage
      }
    })

    return comparisonData
  } catch (error) {
    console.error('Errore getDayDistributionComparison:', error)
    return []
  }
}
