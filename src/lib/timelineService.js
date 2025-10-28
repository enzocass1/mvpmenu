/**
 * timelineService.js
 * Servizio centralizzato per gestione timeline ordini
 *
 * SINGOLA FONTE DI VERITÀ per:
 * - Inserimento eventi timeline con tracking completo
 * - Formatting consistente operator display
 * - Event source tracking (QR menu, tavoli, banco, ordini, cassa)
 * - UI enhancement (expandable events)
 *
 * Riferimento: docs/TIMELINE_ENHANCEMENT_PROJECT.md
 * Migration DB: database/migrations/09_timeline_event_source.sql
 *
 * @version 2.0.0 - CRM-Style Enhancement
 * @date 2025-10-27
 */

import { supabase } from '../supabaseClient'

// ============================================
// EVENT SOURCES - Costanti
// ============================================

/**
 * Fonti eventi timeline
 * Corrispondono ai valori CHECK constraint in order_timeline.event_source
 */
export const EVENT_SOURCE = {
  PUBLIC_MENU: 'public_menu',     // Cliente ordina da QR code
  TABLE_SERVICE: 'table_service', // Staff gestisce tavolo
  COUNTER: 'counter',             // Banco/asporto
  ORDERS_PAGE: 'orders_page',     // Sezione Gestione Ordini
  CASHIER: 'cashier',             // Cassa
  SYSTEM: 'system'                // Eventi automatici
}

/**
 * Labels UI per event sources
 */
export const EVENT_SOURCE_LABELS = {
  [EVENT_SOURCE.PUBLIC_MENU]: 'Menu Pubblico (QR)',
  [EVENT_SOURCE.TABLE_SERVICE]: 'Servizio Tavoli',
  [EVENT_SOURCE.COUNTER]: 'Banco',
  [EVENT_SOURCE.ORDERS_PAGE]: 'Gestione Ordini',
  [EVENT_SOURCE.CASHIER]: 'Cassa',
  [EVENT_SOURCE.SYSTEM]: 'Sistema'
}

// ============================================
// ACTION TYPES - Costanti
// ============================================

/**
 * Tipi di azione timeline
 * Corrispondono ai valori CHECK constraint in order_timeline.action
 */
export const TIMELINE_ACTION = {
  CREATED: 'created',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  UPDATED: 'updated',
  ITEM_ADDED: 'item_added',
  ITEM_REMOVED: 'item_removed',
  ITEM_UPDATED: 'item_updated',
  TABLE_CHANGED: 'table_changed',
  PRECONTO_GENERATED: 'preconto_generated'
}

/**
 * Labels UI per actions
 */
export const ACTION_LABELS = {
  [TIMELINE_ACTION.CREATED]: 'Ordine creato',
  [TIMELINE_ACTION.CONFIRMED]: 'Ordine confermato',
  [TIMELINE_ACTION.PREPARING]: 'In preparazione',
  [TIMELINE_ACTION.COMPLETED]: 'Completato',
  [TIMELINE_ACTION.CANCELLED]: 'Annullato',
  [TIMELINE_ACTION.UPDATED]: 'Ordine modificato',
  [TIMELINE_ACTION.ITEM_ADDED]: 'Prodotto aggiunto',
  [TIMELINE_ACTION.ITEM_REMOVED]: 'Prodotto rimosso',
  [TIMELINE_ACTION.ITEM_UPDATED]: 'Prodotto modificato',
  [TIMELINE_ACTION.TABLE_CHANGED]: 'Tavolo modificato',
  [TIMELINE_ACTION.PRECONTO_GENERATED]: 'Preconto generato'
}

// ============================================
// OPERATOR INFO - Helper
// ============================================

/**
 * Costruisce userInfo object consistente per tracking operatore
 *
 * @param {object} params
 * @param {string} [params.staffId] - UUID staff member
 * @param {string} [params.userId] - UUID proprietario (auth.users)
 * @param {string} [params.staffName] - Nome operatore (opzionale, trigger lo popola)
 * @param {string} [params.createdByType] - 'staff', 'owner', 'customer', 'system'
 * @returns {object} userInfo object per addTimelineEntry
 *
 * @example
 * // Staff member
 * buildOperatorInfo({ staffId: 'uuid-123', createdByType: 'staff' })
 *
 * // Proprietario
 * buildOperatorInfo({ userId: 'uuid-456', createdByType: 'owner' })
 *
 * // Cliente
 * buildOperatorInfo({ createdByType: 'customer', staffName: 'Mario Rossi' })
 *
 * // Sistema
 * buildOperatorInfo({ createdByType: 'system' })
 */
export const buildOperatorInfo = ({
  staffId = null,
  userId = null,
  staffName = null,
  createdByType = null
} = {}) => {
  return {
    staff_id: staffId,
    user_id: userId,
    staff_name: staffName,
    created_by_type: createdByType
  }
}

// ============================================
// ADD TIMELINE ENTRY - Funzione Principale
// ============================================

/**
 * Aggiunge evento a timeline ordine
 *
 * NUOVA API CONSISTENTE - No più STRING staffId!
 *
 * @param {object} params
 * @param {string} params.orderId - UUID ordine (REQUIRED)
 * @param {string} params.action - Azione (usa TIMELINE_ACTION constants) (REQUIRED)
 * @param {string} params.eventSource - Fonte evento (usa EVENT_SOURCE constants) (REQUIRED)
 * @param {object} [params.operator] - Info operatore (usa buildOperatorInfo)
 * @param {object} [params.data] - Dati aggiuntivi
 * @param {string} [params.data.previousStatus] - Status precedente
 * @param {string} [params.data.newStatus] - Nuovo status
 * @param {object} [params.data.changes] - Dettagli modifiche JSONB
 * @param {string} [params.data.notes] - Note testuali
 * @param {boolean} [params.data.isExpandable] - Se ha dettagli espandibili
 * @param {string} [params.data.detailsSummary] - Sommario per preview
 *
 * @returns {Promise<{success: boolean, error?: string}>}
 *
 * @example
 * // Ordine creato da cliente (QR menu)
 * await addTimelineEntry({
 *   orderId: 'order-uuid',
 *   action: TIMELINE_ACTION.CREATED,
 *   eventSource: EVENT_SOURCE.PUBLIC_MENU,
 *   operator: buildOperatorInfo({
 *     createdByType: 'customer',
 *     staffName: 'Mario Rossi'
 *   }),
 *   data: {
 *     newStatus: 'pending',
 *     notes: 'Ordine creato dal cliente - Mario Rossi',
 *     changes: { items_count: 3, is_priority: false }
 *   }
 * })
 *
 * @example
 * // Ordine confermato da staff
 * await addTimelineEntry({
 *   orderId: 'order-uuid',
 *   action: TIMELINE_ACTION.CONFIRMED,
 *   eventSource: EVENT_SOURCE.TABLE_SERVICE,
 *   operator: buildOperatorInfo({
 *     staffId: 'staff-uuid',
 *     createdByType: 'staff'
 *   }),
 *   data: {
 *     previousStatus: 'pending',
 *     newStatus: 'preparing',
 *     notes: 'Ordine confermato e messo in preparazione'
 *   }
 * })
 *
 * @example
 * // Prodotti aggiunti (con dettagli espandibili)
 * await addTimelineEntry({
 *   orderId: 'order-uuid',
 *   action: TIMELINE_ACTION.ITEM_ADDED,
 *   eventSource: EVENT_SOURCE.ORDERS_PAGE,
 *   operator: buildOperatorInfo({
 *     staffId: 'staff-uuid',
 *     createdByType: 'staff'
 *   }),
 *   data: {
 *     notes: 'Aggiunti 2 prodotti (Batch #2)',
 *     changes: {
 *       batch_number: 2,
 *       items_count: 2,
 *       products: [
 *         { name: 'Pizza Margherita', qty: 1, price: 8.00 },
 *         { name: 'Coca Cola', qty: 2, price: 3.00 }
 *       ]
 *     },
 *     isExpandable: true,
 *     detailsSummary: 'Pizza Margherita (x1), Coca Cola (x2)'
 *   }
 * })
 */
export const addTimelineEntry = async ({
  orderId,
  action,
  eventSource,
  operator = {},
  data = {}
}) => {
  try {
    // Validazione parametri richiesti
    if (!orderId) {
      throw new Error('orderId è richiesto')
    }
    if (!action) {
      throw new Error('action è richiesto')
    }
    if (!eventSource) {
      throw new Error('eventSource è richiesto')
    }

    // Build entry
    const entry = {
      order_id: orderId,
      action: action,
      event_source: eventSource,

      // Operator info (trigger populate_timeline_staff_info popolerà il resto)
      staff_id: operator.staff_id || null,
      user_id: operator.user_id || null,
      staff_name: operator.staff_name || null,
      created_by_type: operator.created_by_type || null,

      // Status transitions
      previous_status: data.previousStatus || null,
      new_status: data.newStatus || null,

      // Metadata
      changes: data.changes || null,
      notes: data.notes || null,

      // UI enhancement
      is_expandable: data.isExpandable || false,
      details_summary: data.detailsSummary || null,

      created_at: new Date().toISOString()
    }

    // Insert
    const { error } = await supabase
      .from('order_timeline')
      .insert(entry)

    if (error) {
      console.error('[Timeline] Errore insert:', error)
      throw error
    }

    // Log success
    console.log(
      `✅ Timeline: ${action} | Source: ${eventSource} | Order: ${orderId.substring(0, 8)}...`
    )

    return { success: true }

  } catch (error) {
    console.error('[Timeline] Errore:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// BACKWARD COMPATIBILITY - Deprecated
// ============================================

/**
 * @deprecated Usa addTimelineEntry() con nuova signature
 * Mantenuto per backward compatibility durante migrazione
 *
 * Vecchia signature:
 * addTimelineEntry(orderId, action, staffId, data)
 *
 * Nuova signature:
 * addTimelineEntry({ orderId, action, eventSource, operator, data })
 */
export const addTimelineEntryLegacy = async (orderId, action, staffIdOrUserInfo, data = {}) => {
  console.warn(
    '[Timeline] DEPRECATED: Usa nuova signature addTimelineEntry({ orderId, action, eventSource, operator, data })'
  )

  // Handle vecchia signature con STRING staffId
  let operator = {}
  if (typeof staffIdOrUserInfo === 'string') {
    operator = buildOperatorInfo({
      staffId: staffIdOrUserInfo,
      createdByType: 'staff'
    })
  } else if (staffIdOrUserInfo && typeof staffIdOrUserInfo === 'object') {
    operator = staffIdOrUserInfo
  }

  // Guess event source basato su action
  let eventSource = EVENT_SOURCE.TABLE_SERVICE // default
  if (action === TIMELINE_ACTION.COMPLETED || action === TIMELINE_ACTION.PRECONTO_GENERATED) {
    eventSource = EVENT_SOURCE.CASHIER
  }

  return addTimelineEntry({
    orderId,
    action,
    eventSource,
    operator,
    data
  })
}

// ============================================
// FORMATTING - Consistente
// ============================================

/**
 * Formatta entry timeline per UI
 * LOGICA CONSISTENTE per operator display
 *
 * @param {object} entry - Entry da order_timeline
 * @returns {object} Entry formattato con campi aggiuntivi per UI
 *
 * Campi aggiunti:
 * - actionLabel: Label tradotta per action
 * - sourceLabel: Label con emoji per event_source
 * - operatorDisplay: Display consistente operatore (es: "da Admin - Vincenzo Cassese")
 * - formattedDate: Data formattata italiano
 */
export const formatTimelineEntry = (entry) => {
  // Operator Display - LOGICA CONSISTENTE (FIX PRINCIPALE!)
  let operatorDisplay = 'Sistema'

  if (entry.created_by_type === 'staff' || entry.created_by_type === 'owner') {
    const role = entry.staff_role_display
    const name = entry.staff_name

    // Formato: "da [Ruolo] - [Nome]"
    if (role && name) {
      operatorDisplay = `da ${role} - ${name}`
    } else if (role) {
      operatorDisplay = `da ${role}`
    } else if (name) {
      operatorDisplay = name
    } else {
      operatorDisplay = 'Staff'
    }
  } else if (entry.created_by_type === 'customer') {
    operatorDisplay = entry.staff_name || 'Cliente Incognito'
  }

  return {
    ...entry,
    actionLabel: ACTION_LABELS[entry.action] || entry.action,
    sourceLabel: EVENT_SOURCE_LABELS[entry.event_source] || entry.event_source,
    operatorDisplay,
    formattedDate: new Date(entry.created_at).toLocaleString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }
}

// ============================================
// LOAD TIMELINE - Helper
// ============================================

/**
 * Carica timeline per ordine
 *
 * @param {string} orderId - UUID ordine
 * @returns {Promise<{success: boolean, data: array, error?: string}>}
 *
 * @example
 * const result = await loadOrderTimeline('order-uuid')
 * if (result.success) {
 *   console.log(result.data) // Array di eventi formattati
 * }
 */
export const loadOrderTimeline = async (orderId) => {
  try {
    const { data, error } = await supabase
      .from('order_timeline')
      .select(`
        *,
        staff_role:staff_roles(name)
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Map staff_role.name to staff_role_display for formatTimelineEntry
    const enrichedData = data.map(entry => ({
      ...entry,
      staff_role_display: entry.staff_role?.name || null
    }))

    return {
      success: true,
      data: enrichedData.map(formatTimelineEntry)
    }
  } catch (error) {
    console.error('[Timeline] Errore caricamento:', error)
    return {
      success: false,
      error: error.message,
      data: []
    }
  }
}

// ============================================
// BULK OPERATIONS - Helpers
// ============================================

/**
 * Carica timeline per multipli ordini (batch)
 *
 * @param {string[]} orderIds - Array di UUID ordini
 * @returns {Promise<{success: boolean, data: object, error?: string}>}
 */
export const loadMultipleTimelines = async (orderIds) => {
  try {
    const { data, error } = await supabase
      .from('order_timeline')
      .select(`
        *,
        staff_role:staff_roles(name)
      `)
      .in('order_id', orderIds)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Map staff_role.name to staff_role_display
    const enrichedData = data.map(entry => ({
      ...entry,
      staff_role_display: entry.staff_role?.name || null
    }))

    // Group by order_id
    const grouped = {}
    enrichedData.forEach(entry => {
      if (!grouped[entry.order_id]) {
        grouped[entry.order_id] = []
      }
      grouped[entry.order_id].push(formatTimelineEntry(entry))
    })

    return {
      success: true,
      data: grouped
    }
  } catch (error) {
    console.error('[Timeline] Errore caricamento multiplo:', error)
    return {
      success: false,
      error: error.message,
      data: {}
    }
  }
}

// ============================================
// ANALYTICS HELPERS
// ============================================

/**
 * Ottiene statistiche timeline per ordine
 *
 * @param {string} orderId - UUID ordine
 * @returns {Promise<{success: boolean, data: object, error?: string}>}
 */
export const getTimelineStats = async (orderId) => {
  try {
    const { data, error } = await supabase
      .from('order_timeline')
      .select('*')
      .eq('order_id', orderId)

    if (error) throw error

    const stats = {
      total_events: data.length,
      events_by_source: {},
      events_by_action: {},
      events_by_operator: {},
      first_event: data[0]?.created_at,
      last_event: data[data.length - 1]?.created_at,
      expandable_events: data.filter(e => e.is_expandable).length
    }

    // Group by source
    data.forEach(event => {
      const source = event.event_source || 'unknown'
      stats.events_by_source[source] = (stats.events_by_source[source] || 0) + 1

      const action = event.action
      stats.events_by_action[action] = (stats.events_by_action[action] || 0) + 1

      const operator = event.staff_name || 'Sistema'
      stats.events_by_operator[operator] = (stats.events_by_operator[operator] || 0) + 1
    })

    return {
      success: true,
      data: stats
    }
  } catch (error) {
    console.error('[Timeline] Errore stats:', error)
    return {
      success: false,
      error: error.message,
      data: null
    }
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  // Constants
  EVENT_SOURCE,
  EVENT_SOURCE_LABELS,
  TIMELINE_ACTION,
  ACTION_LABELS,

  // Helpers
  buildOperatorInfo,

  // Main API
  addTimelineEntry,
  addTimelineEntryLegacy, // deprecated

  // Formatting
  formatTimelineEntry,

  // Loading
  loadOrderTimeline,
  loadMultipleTimelines,

  // Analytics
  getTimelineStats
}
