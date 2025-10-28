/**
 * orderOperations.js
 * Servizio centralizzato per tutte le operazioni sugli ordini
 *
 * FONTE UNICA DI VERITÀ per:
 * - Soft delete ordini
 * - Occupazione tavoli
 * - Timeline events
 *
 * Usato da:
 * - OrdersPage.jsx (lista ordini)
 * - OrderDetailPage.jsx (dettaglio ordine)
 * - TableDetailModal.jsx (gestione tavolo)
 * - CassaPage.jsx (dashboard)
 */

import { supabase } from '../supabaseClient'
import {
  addTimelineEntry,
  buildOperatorInfo,
  EVENT_SOURCE,
  TIMELINE_ACTION
} from './timelineService'

/**
 * Determina se l'utente è il proprietario o uno staff member
 * Il proprietario NON è in restaurant_staff, quindi modified_by_staff_id deve essere NULL
 */
const getStaffIdForModification = (session, restaurant) => {
  if (!session || !restaurant) return null

  // Se l'utente è il proprietario del ristorante, return NULL
  // (il proprietario non è in restaurant_staff)
  if (session.user?.id === restaurant.user_id) {
    return null
  }

  // Altrimenti è uno staff member, return il suo ID
  // NOTA: Qui dovremmo avere lo staff_id dalla sessione, non user_id
  // Per ora ritorno null per sicurezza
  return null
}

/**
 * Determina il nome di chi ha fatto l'operazione per la timeline
 */
const getOperatorName = (session, restaurant) => {
  if (!session) return 'Sistema'
  if (!restaurant) return 'Utente'

  // Se è il proprietario
  if (session.user?.id === restaurant.user_id) {
    const ownerName = `${restaurant.owner_first_name || ''} ${restaurant.owner_last_name || ''}`.trim()
    return ownerName || 'Proprietario'
  }

  // Se è staff (dovremmo avere il nome nella sessione)
  return 'Staff'
}

/**
 * SOFT DELETE - Singolo Ordine
 *
 * Elimina (soft delete) un ordine singolo e aggiunge evento timeline
 *
 * @param {string} orderId - UUID dell'ordine
 * @param {object} session - Sessione utente (auth)
 * @param {object} restaurant - Dati ristorante
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const softDeleteOrder = async (orderId, session, restaurant) => {
  try {
    // 1. Soft delete dell'ordine
    const { data, error } = await supabase
      .from('orders')
      .update({
        deleted_at: new Date().toISOString(),
        modified_by_staff_id: getStaffIdForModification(session, restaurant)
      })
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      console.error('❌ Errore soft delete ordine:', error)
      throw error
    }

    console.log('✅ Soft delete ordine completato:', data)

    // 2. Aggiungi evento timeline
    const timelineResult = await addOrderTimelineEvent({
      orderId,
      action: 'cancelled',
      session,
      restaurant,
      changes: {
        soft_delete: true,
        deleted_by_owner: session?.user?.id === restaurant?.user_id,
        owner_id: session?.user?.id || null
      }
    })

    if (!timelineResult.success) {
      console.warn('⚠️ Timeline event non aggiunto, ma ordine eliminato:', timelineResult.error)
    }

    return { success: true, data }
  } catch (error) {
    console.error('❌ Errore in softDeleteOrder:', error)
    return {
      success: false,
      error: error.message || 'Errore durante l\'eliminazione dell\'ordine'
    }
  }
}

/**
 * SOFT DELETE - Multipli Ordini (Bulk)
 *
 * Elimina (soft delete) più ordini contemporaneamente
 *
 * @param {string[]} orderIds - Array di UUID ordini
 * @param {object} session - Sessione utente (auth)
 * @param {object} restaurant - Dati ristorante
 * @returns {Promise<{success: boolean, data?: object[], error?: string}>}
 */
export const softDeleteOrders = async (orderIds, session, restaurant) => {
  try {
    if (!orderIds || orderIds.length === 0) {
      return { success: false, error: 'Nessun ordine selezionato' }
    }

    // 1. Soft delete bulk
    const { data, error } = await supabase
      .from('orders')
      .update({
        deleted_at: new Date().toISOString(),
        modified_by_staff_id: getStaffIdForModification(session, restaurant)
      })
      .in('id', orderIds)
      .select()

    if (error) {
      console.error('❌ Errore bulk soft delete:', error)
      throw error
    }

    console.log(`✅ Bulk soft delete completato: ${data.length} ordini`)

    // 2. Aggiungi timeline events per ogni ordine
    for (const orderId of orderIds) {
      const timelineResult = await addOrderTimelineEvent({
        orderId,
        action: 'cancelled',
        session,
        restaurant,
        changes: {
          soft_delete: true,
          bulk_delete: orderIds.length > 1,
          deleted_by_owner: session?.user?.id === restaurant?.user_id,
          owner_id: session?.user?.id || null
        }
      })

      if (!timelineResult.success) {
        console.warn(`⚠️ Timeline event non aggiunto per ordine ${orderId}:`, timelineResult.error)
      }
    }

    return { success: true, data }
  } catch (error) {
    console.error('❌ Errore in softDeleteOrders:', error)
    return {
      success: false,
      error: error.message || 'Errore durante l\'eliminazione degli ordini'
    }
  }
}

/**
 * TIMELINE EVENT - Aggiungi Evento
 *
 * ⚠️ DEPRECATED: Usa timelineService.addTimelineEntry() invece
 * Mantenuto per backward compatibility
 *
 * @deprecated Usa addTimelineEntry() da timelineService
 */
export const addOrderTimelineEvent = async ({
  orderId,
  action,
  session,
  restaurant,
  changes = {},
  previousStatus = null,
  newStatus = null
}) => {
  try {
    const staffName = getOperatorName(session, restaurant)
    const isOwner = session?.user?.id === restaurant?.user_id

    // ✅ Usa timelineService centralizzato
    await addTimelineEntry({
      orderId,
      action: action,
      eventSource: EVENT_SOURCE.ORDERS_PAGE, // Eliminazioni da pagina ordini
      operator: buildOperatorInfo({
        staffId: null, // Sempre NULL per proprietario
        userId: isOwner ? session?.user?.id : null,
        createdByType: isOwner ? 'owner' : 'staff',
        staffName: staffName
      }),
      data: {
        previousStatus: previousStatus || 'pending',
        newStatus: newStatus || 'deleted',
        changes: changes,
        notes: 'Ordine eliminato',
        isExpandable: false
      }
    })

    return { success: true }
  } catch (error) {
    console.error('❌ Errore in addOrderTimelineEvent:', error)
    return { success: false, error: error.message }
  }
}

/**
 * TABLE OCCUPANCY - Ottieni Tavoli Occupati
 *
 * Ritorna lista di tavoli occupati per un ristorante
 * Un tavolo è OCCUPATO se ha almeno un ordine con:
 * - status IN ('pending', 'confirmed', 'preparing')
 * - deleted_at IS NULL
 *
 * @param {string} restaurantId - UUID ristorante
 * @returns {Promise<Array<{table_id, table_number, room_id}>>}
 */
export const getOccupiedTables = async (restaurantId) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('table_id, table_number, room_id')
      .eq('restaurant_id', restaurantId)
      .in('status', ['pending', 'confirmed', 'preparing'])
      .is('deleted_at', null)  // CRITICAL: Filtra soft-deleted

    if (error) throw error

    // Rimuovi duplicati (più ordini sullo stesso tavolo)
    const uniqueTables = data.reduce((acc, order) => {
      const key = order.table_id || `${order.table_number}_${order.room_id}`
      if (!acc.find(t => {
        const tKey = t.table_id || `${t.table_number}_${t.room_id}`
        return tKey === key
      })) {
        acc.push(order)
      }
      return acc
    }, [])

    console.log(`[Table Occupancy] ${uniqueTables.length} tavoli occupati per ristorante ${restaurantId}`)
    return uniqueTables
  } catch (error) {
    console.error('Errore caricamento tavoli occupati:', error)
    return []
  }
}

/**
 * TABLE OCCUPANCY - Controlla se Tavolo è Occupato
 *
 * Verifica se un tavolo specifico è occupato
 *
 * @param {string} restaurantId - UUID ristorante
 * @param {number} tableNumber - Numero tavolo
 * @param {string} roomId - UUID sala
 * @returns {Promise<boolean>}
 */
export const isTableOccupied = async (restaurantId, tableNumber, roomId) => {
  try {
    const { count, error } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('table_number', tableNumber)
      .eq('room_id', roomId)
      .in('status', ['pending', 'confirmed', 'preparing'])
      .is('deleted_at', null)

    if (error) throw error

    return count > 0
  } catch (error) {
    console.error('Errore controllo occupazione tavolo:', error)
    return false
  }
}

/**
 * ORDER STATES - Costanti per Stati Ordine
 */
export const ORDER_STATUS = {
  PENDING: 'pending',         // Nuovo ordine, non ancora confermato
  CONFIRMED: 'confirmed',     // Confermato dallo staff (deprecato, usa preparing)
  PREPARING: 'preparing',     // In preparazione in cucina
  READY: 'ready',             // Pronto per essere servito
  COMPLETED: 'completed',     // Completato e pagato
  CANCELLED: 'cancelled',     // Annullato
}

/**
 * ORDER STATES - Stati che indicano tavolo occupato
 */
export const OCCUPIED_STATUSES = ['pending', 'confirmed', 'preparing']

/**
 * ORDER STATES - Stati finali (tavolo libero)
 */
export const FINAL_STATUSES = ['completed', 'cancelled']
