/**
 * Orders Service - Sistema Cassa
 * Gestione completa ordini tavolo e banco
 */

import { supabase } from '../supabaseClient'
import { trackEvent } from '../utils/analytics'
import {
  addTimelineEntry as addTimelineEntryNew,
  buildOperatorInfo,
  EVENT_SOURCE,
  TIMELINE_ACTION
} from './timelineService'

// Stati di un ordine ancora aperto (non chiuso, non annullato)
export const OPEN_ORDER_STATUSES = ['pending', 'confirmed', 'preparing']

// ============================================
// ORDINI - CRUD BASE
// ============================================

/**
 * Crea nuovo ordine al tavolo (da cliente)
 */
export const createTableOrder = async ({
  restaurantId,
  tableId,
  roomId,
  customerName = null,
  customerNotes = null,
  items = [],
  isPriority = false
}) => {
  try {
    // Crea ordine con status pending (attesa conferma)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        table_id: tableId,
        room_id: roomId,
        order_type: 'table',
        status: 'pending',
        customer_name: customerName,
        customer_notes: customerNotes,
        opened_at: new Date().toISOString()
      })
      .select()
      .single()

    if (orderError) throw orderError

    // Aggiungi items (batch_number = 1)
    if (items.length > 0) {
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_price: item.product_price,
        quantity: item.quantity,
        notes: item.notes || null,
        subtotal: item.subtotal,
        batch_number: 1,
        prepared: false,
        variant_id: item.variant_id || null,
        variant_title: item.variant_title || null
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError
    }

    // Priority order
    if (isPriority) {
      await addPriorityToOrder(order.id)
    }

    // Timeline: Ordine creato da cliente
    // 🆕 MIGRATO a nuovo timelineService.js
    await addTimelineEntryNew({
      orderId: order.id,
      action: TIMELINE_ACTION.CREATED,
      eventSource: EVENT_SOURCE.PUBLIC_MENU,
      operator: buildOperatorInfo({
        createdByType: 'customer',
        staffName: customerName || 'Cliente Incognito'
      }),
      data: {
        newStatus: 'pending',
        notes: `Ordine creato dal cliente${customerName ? ` - ${customerName}` : ''}`,
        changes: {
          items_count: items.length,
          is_priority: isPriority
        },
        isExpandable: true,
        detailsSummary: `${items.length} prodotto${items.length !== 1 ? 'i' : ''}${isPriority ? ' - PRIORITARIO' : ''}`
      }
    })

    // Analytics
    await trackEvent('table_order_pending', {
      restaurant_id: restaurantId,
      order_id: order.id,
      table_id: tableId,
      room_id: roomId,
      items_count: items.length,
      is_priority: isPriority
    })

    return { success: true, order }
  } catch (error) {
    console.error('Errore creazione ordine tavolo:', error)
    return { success: false, error }
  }
}

/**
 * Crea ordine al tavolo da staff (già attivo)
 */
export const createTableOrderByStaff = async ({
  restaurantId,
  tableId,
  roomId,
  staffId,
  customerName = null,
  customerNotes = null,
  items = [],
  isPriority = false
}) => {
  try {
    // Crea ordine con status preparing (già attivo)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        table_id: tableId,
        room_id: roomId,
        order_type: 'table',
        status: 'preparing',
        customer_name: customerName,
        customer_notes: customerNotes,
        opened_at: new Date().toISOString(),
        created_by_staff_id: staffId,
        confirmed_by_staff_id: staffId
      })
      .select()
      .single()

    if (orderError) throw orderError

    // Aggiungi items (batch_number = 1, già preparati)
    if (items.length > 0) {
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_price: item.product_price,
        quantity: item.quantity,
        notes: item.notes || null,
        subtotal: item.subtotal,
        batch_number: 1,
        prepared: true,
        prepared_at: new Date().toISOString(),
        added_by_staff_id: staffId,
        variant_id: item.variant_id || null,
        variant_title: item.variant_title || null
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError
    }

    // Priority order
    if (isPriority) {
      await addPriorityToOrder(order.id)
    }

    // Timeline: Ordine creato e confermato da staff (direttamente in preparazione)
    // 🆕 MIGRATO a nuovo timelineService.js
    await addTimelineEntryNew({
      orderId: order.id,
      action: TIMELINE_ACTION.CREATED,
      eventSource: EVENT_SOURCE.TABLE_SERVICE,
      operator: buildOperatorInfo({
        staffId: staffId,
        createdByType: 'staff'
      }),
      data: {
        newStatus: 'preparing',
        notes: `Tavolo aperto dallo staff${customerName ? ` per ${customerName}` : ''}`,
        changes: {
          items_count: items.length,
          is_priority: isPriority
        },
        isExpandable: true,
        detailsSummary: `${items.length} prodotto${items.length !== 1 ? 'i' : ''}${isPriority ? ' - PRIORITARIO' : ''}`
      }
    })

    // Analytics
    await trackEvent('table_opened', {
      restaurant_id: restaurantId,
      order_id: order.id,
      table_id: tableId,
      room_id: roomId,
      staff_id: staffId,
      items_count: items.length,
      is_priority: isPriority
    })

    return { success: true, order }
  } catch (error) {
    console.error('Errore creazione ordine staff:', error)
    return { success: false, error }
  }
}

/**
 * Crea ordine al banco
 */
export const createCounterOrder = async ({
  restaurantId,
  staffId,
  customerName = null,
  items = [],
  isPriority = false
}) => {
  let order = null
  try {
    const now = new Date().toISOString()
    const receiptNumber = await getNextReceiptNumber(restaurantId)
    const itemsTotal = items.reduce(
      (sum, item) => sum + (item.subtotal ?? item.product_price * item.quantity), 0
    )

    // Crea ordine già completato
    const { data: createdOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        order_type: 'counter',
        status: 'completed',
        customer_name: customerName,
        opened_at: now,
        closed_at: now,
        total_amount: itemsTotal,
        metadata: { receipt_number: receiptNumber, receipt_date: now },
        created_by_staff_id: staffId,
        confirmed_by_staff_id: staffId
      })
      .select()
      .single()

    if (orderError) throw orderError
    order = createdOrder

    // Aggiungi items
    if (items.length > 0) {
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_price: item.product_price,
        quantity: item.quantity,
        notes: item.notes || null,
        subtotal: item.subtotal ?? item.product_price * item.quantity,
        batch_number: 1,
        prepared: true,
        prepared_at: new Date().toISOString(),
        added_by_staff_id: staffId,
        variant_id: item.variant_id || null,
        variant_title: item.variant_title || null
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError
    }

    // Priority order
    if (isPriority) {
      await addPriorityToOrder(order.id)
    }

    // Analytics
    await trackEvent('counter_order_completed', {
      restaurant_id: restaurantId,
      order_id: order.id,
      staff_id: staffId,
      items_count: items.length,
      is_priority: isPriority
    })

    return { success: true, order, receiptNumber }
  } catch (error) {
    console.error('Errore creazione ordine banco:', error)
    // Se l'ordine è stato creato ma i prodotti no, non lasciare un ordine vuoto "completato"
    if (order?.id) {
      await discardOrphanOrder(order.id)
    }
    return { success: false, error }
  }
}

/**
 * Annulla un ordine rimasto senza prodotti dopo un inserimento fallito
 */
export const discardOrphanOrder = async (orderId) => {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'cancelled', deleted_at: new Date().toISOString() })
    .eq('id', orderId)

  if (error) console.error('Errore annullamento ordine incompleto:', error)
}

// ============================================
// GESTIONE STATO ORDINE
// ============================================

/**
 * Approva ordine (pending → preparing): la comanda "parte".
 * NON segna i prodotti come preparati: il "preparato" è per singolo batch
 * (vedi markBatchPrepared). La chiusura del tavolo spetta solo alla Cassa.
 */
export const confirmOrder = async (orderId, staffId, operator = null) => {
  try {
    const now = new Date().toISOString()
    // Approva solo se ancora da approvare: evita doppie approvazioni da due operatori
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'preparing',
        confirmed_by_staff_id: staffId,
        confirmed_at: now,
        preparing_at: now,
        opened_at: now
      })
      .eq('id', orderId)
      .in('status', ['pending', 'confirmed'])
      .is('deleted_at', null)
      .select()
      .maybeSingle()

    if (orderError) throw orderError
    if (!order) throw new Error('Ordine già approvato o non più modificabile')

    // Timeline: Evento "confermato" → "preparazione"
    // 🆕 MIGRATO a nuovo timelineService.js
    await addTimelineEntryNew({
      orderId,
      action: TIMELINE_ACTION.CONFIRMED,
      eventSource: EVENT_SOURCE.TABLE_SERVICE,
      operator: operator || buildOperatorInfo({
        staffId: staffId,
        createdByType: 'staff'
      }),
      data: {
        previousStatus: 'pending',
        newStatus: 'preparing',
        notes: 'Comanda approvata'
      }
    })

    // Analytics
    await trackEvent('table_order_confirmed', {
      restaurant_id: order.restaurant_id,
      order_id: orderId,
      table_id: order.table_id,
      room_id: order.room_id,
      staff_id: staffId
    })

    return { success: true, order }
  } catch (error) {
    console.error('Errore conferma ordine:', error)
    return { success: false, error }
  }
}

/**
 * Rifiuta un ordine in attesa (es. ordine finto non verificato dallo staff).
 * Soft delete: lo stato resta tracciato ma il tavolo si libera.
 */
export const rejectOrder = async (orderId, staffId) => {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', deleted_at: new Date().toISOString(), modified_by_staff_id: staffId })
      .eq('id', orderId)
      .eq('status', 'pending')
      .is('deleted_at', null)
      .select()
      .maybeSingle()

    if (error) throw error
    if (!order) throw new Error('Ordine non più rifiutabile (già approvato o rimosso)')
    return { success: true, order }
  } catch (error) {
    console.error('Errore rifiuto ordine:', error)
    return { success: false, error }
  }
}

/**
 * Segna preparato un singolo batch (comanda) di un ordine.
 * NON cambia lo stato dell'ordine e NON chiude il tavolo: il tavolo resta
 * aperto finché la Cassa non lo chiude.
 */
export const markBatchPrepared = async (orderId, batchNumber, staffId, prepared = true) => {
  try {
    const { error } = await supabase
      .from('order_items')
      .update({ prepared, prepared_at: prepared ? new Date().toISOString() : null })
      .eq('order_id', orderId)
      .eq('batch_number', batchNumber)

    if (error) throw error

    await addTimelineEntryNew({
      orderId,
      action: TIMELINE_ACTION.UPDATED,
      eventSource: EVENT_SOURCE.TABLE_SERVICE,
      operator: buildOperatorInfo({ staffId, createdByType: 'staff' }),
      data: { notes: `Batch ${batchNumber} ${prepared ? 'preparato' : 'riaperto'}`, changes: { batch_number: batchNumber, prepared } }
    }).catch(e => console.error('timeline batch prepared:', e))

    return { success: true }
  } catch (error) {
    console.error('Errore segna batch preparato:', error)
    return { success: false, error }
  }
}

/**
 * Chiudi tavolo (scontrino)
 */
export const closeTableOrder = async (orderId, staffId, receiptNumber = null) => {
  try {
    const updateData = {
      status: 'completed',
      closed_at: new Date().toISOString(),
      modified_by_staff_id: staffId
    }

    if (receiptNumber) {
      // Unisci ai metadata esistenti (es. dati del preconto) invece di sovrascriverli
      const { data: current, error: currentError } = await supabase
        .from('orders')
        .select('metadata')
        .eq('id', orderId)
        .single()

      if (currentError) throw currentError

      updateData.metadata = {
        ...(current?.metadata || {}),
        receipt_number: receiptNumber,
        receipt_date: new Date().toISOString()
      }
    }

    // Chiudi solo se ancora aperto: evita doppie chiusure da due operatori
    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .in('status', OPEN_ORDER_STATUSES)
      .is('deleted_at', null)
      .select()
      .maybeSingle()

    if (error) throw error
    if (!order) throw new Error('Ordine già chiuso o eliminato')

    // Timeline: Ordine completato
    // 🆕 MIGRATO a nuovo timelineService.js
    await addTimelineEntryNew({
      orderId,
      action: TIMELINE_ACTION.COMPLETED,
      eventSource: EVENT_SOURCE.CASHIER,
      operator: buildOperatorInfo({
        staffId: staffId,
        createdByType: 'staff'
      }),
      data: {
        previousStatus: 'preparing',
        newStatus: 'completed',
        notes: receiptNumber ? `Scontrino fiscale N. ${receiptNumber}` : 'Tavolo chiuso',
        changes: {
          receipt_number: receiptNumber
        },
        isExpandable: !!receiptNumber,
        detailsSummary: receiptNumber ? `Scontrino N. ${receiptNumber}` : 'Tavolo chiuso'
      }
    })

    // Analytics
    await trackEvent('table_closed', {
      restaurant_id: order.restaurant_id,
      order_id: orderId,
      table_id: order.table_id,
      room_id: order.room_id,
      staff_id: staffId,
      receipt_number: receiptNumber
    })

    return { success: true, order }
  } catch (error) {
    console.error('Errore chiusura tavolo:', error)
    return { success: false, error }
  }
}

/**
 * Soft delete ordine
 */
export const deleteOrder = async (orderId, staffId) => {
  try {
    console.log('🗑️ deleteOrder chiamato:', { orderId, staffId })

    // Get previous status before deleting
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single()

    console.log('📋 Status attuale ordine:', currentOrder?.status)

    const { data: order, error } = await supabase
      .from('orders')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'completed',
        closed_at: new Date().toISOString(),
        modified_by_staff_id: staffId
      })
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      console.error('❌ ERRORE 409 in ordersService.deleteOrder():')
      console.error('❌ Error code:', error.code)
      console.error('❌ Error message:', error.message)
      console.error('❌ Error details:', error.details)
      console.error('❌ Error hint:', error.hint)
      console.error('❌ Full error object:', JSON.stringify(error, null, 2))
      throw error
    }

    console.log('✅ Soft delete completato in ordersService:', order)

    // Timeline: Ordine annullato
    // 🆕 MIGRATO a nuovo timelineService.js
    await addTimelineEntryNew({
      orderId,
      action: TIMELINE_ACTION.CANCELLED,
      eventSource: EVENT_SOURCE.ORDERS_PAGE,
      operator: buildOperatorInfo({
        staffId: staffId,
        createdByType: 'staff'
      }),
      data: {
        previousStatus: currentOrder?.status,
        newStatus: 'cancelled',
        notes: 'Ordine annullato e rimosso'
      }
    })

    // Analytics
    await trackEvent('order_cancelled', {
      restaurant_id: order.restaurant_id,
      order_id: orderId,
      table_id: order.table_id,
      room_id: order.room_id,
      staff_id: staffId
    })

    return { success: true, order }
  } catch (error) {
    console.error('Errore eliminazione ordine:', error)
    return { success: false, error }
  }
}

// ============================================
// GESTIONE PRODOTTI (BATCH)
// ============================================

/**
 * Ottieni prossimo batch number per ordine
 */
export const getNextBatchNumber = async (orderId) => {
  try {
    const { data, error } = await supabase
      .rpc('get_next_batch_number', { p_order_id: orderId })

    if (error) throw error
    return data || 1
  } catch (error) {
    console.error('Errore get next batch:', error)
    // Fallback: calcola manualmente
    try {
      const { data: items } = await supabase
        .from('order_items')
        .select('batch_number')
        .eq('order_id', orderId)
        .order('batch_number', { ascending: false })
        .limit(1)

      return items && items.length > 0 ? items[0].batch_number + 1 : 1
    } catch {
      return 1
    }
  }
}

/**
 * Aggiungi prodotti a ordine esistente (nuova ondata)
 */
export const addProductsToOrder = async (orderId, items, staffId, delivery = { mode: 'now' }) => {
  try {
    // Ottieni prossimo batch
    const batchNumber = await getNextBatchNumber(orderId)

    // Ottieni ordine per restaurant_id
    const { data: order } = await supabase
      .from('orders')
      .select('restaurant_id, table_id, room_id')
      .eq('id', orderId)
      .single()

    // Modalità di invio della comanda alla cucina:
    // 'now' = inviata subito, 'staged' = da inviare a mano, 'scheduled' = invio programmato
    const mode = delivery?.mode || 'now'
    const now = new Date().toISOString()
    const sent = mode === 'now'
    const sendAt = mode === 'scheduled' ? delivery.sendAt : null

    // Aggiungi items con nuovo batch
    const orderItems = items.map(item => ({
      order_id: orderId,
      product_id: item.product_id,
      product_name: item.product_name,
      product_price: item.product_price,
      quantity: item.quantity,
      notes: item.notes || null,
      subtotal: item.subtotal,
      batch_number: batchNumber,
      prepared: false,
      sent,
      sent_at: sent ? now : null,
      send_at: sendAt,
      added_by_staff_id: staffId,
      variant_id: item.variant_id || null,
      variant_title: item.variant_title || null
      // option_values column doesn't exist in order_items table
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) throw itemsError

    // Aggiorna modified_by
    await supabase
      .from('orders')
      .update({ modified_by_staff_id: staffId })
      .eq('id', orderId)

    // Timeline: Prodotti aggiunti
    // 🆕 MIGRATO a nuovo timelineService.js
    await addTimelineEntryNew({
      orderId,
      action: TIMELINE_ACTION.ITEM_ADDED,
      eventSource: EVENT_SOURCE.TABLE_SERVICE,
      operator: buildOperatorInfo({
        staffId: staffId,
        createdByType: 'staff'
      }),
      data: {
        notes: mode === 'now'
          ? `Comanda ${batchNumber} inviata (${items.length} prodotti)`
          : mode === 'scheduled'
            ? `Comanda ${batchNumber} programmata (${items.length} prodotti)`
            : `Comanda ${batchNumber} salvata come portata (${items.length} prodotti)`,
        changes: {
          batch_number: batchNumber,
          items_count: items.length,
          sent,
          send_at: sendAt,
          products: items.map(i => ({ name: i.product_name, qty: i.quantity }))
        },
        isExpandable: true,
        detailsSummary: `${items.length} prodotto${items.length !== 1 ? 'i' : ''} - Comanda ${batchNumber}`
      }
    })

    // Analytics - using correct event name from database constraint
    await trackEvent('products_added_to_order', {
      restaurant_id: order.restaurant_id,
      order_id: orderId,
      table_id: order.table_id,
      room_id: order.room_id,
      staff_id: staffId,
      batch_number: batchNumber,
      items_count: items.length
    })

    return { success: true, batchNumber }
  } catch (error) {
    console.error('Errore aggiungiunta prodotti:', error)
    return { success: false, error }
  }
}

/**
 * Invia alla cucina una comanda finora "da inviare" o programmata.
 */
export const sendBatch = async (orderId, batchNumber, staffId) => {
  try {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('order_items')
      .update({ sent: true, sent_at: now, send_at: null })
      .eq('order_id', orderId)
      .eq('batch_number', batchNumber)
      .eq('sent', false)
      .select('id')

    if (error) throw error
    if (!data || data.length === 0) throw new Error('Comanda già inviata o inesistente')

    await addTimelineEntryNew({
      orderId,
      action: TIMELINE_ACTION.ITEM_ADDED,
      eventSource: EVENT_SOURCE.TABLE_SERVICE,
      operator: buildOperatorInfo({ staffId, createdByType: 'staff' }),
      data: { notes: `Comanda ${batchNumber} inviata alla cucina`, changes: { batch_number: batchNumber, sent: true } }
    }).catch(e => console.error('timeline sendBatch:', e))

    return { success: true }
  } catch (error) {
    console.error('Errore invio comanda:', error)
    return { success: false, error }
  }
}

/**
 * Invia le comande programmate scadute (send_at <= adesso) per un ristorante.
 * Fallback client-side: usata quando non c'è il job server (pg_cron).
 */
export const releaseDueScheduledBatches = async (restaurantId) => {
  try {
    const { data: due, error } = await supabase
      .from('order_items')
      .select('order_id, batch_number, orders!inner(restaurant_id)')
      .eq('orders.restaurant_id', restaurantId)
      .eq('sent', false)
      .not('send_at', 'is', null)
      .lte('send_at', new Date().toISOString())

    if (error) throw error
    const seen = new Set()
    for (const row of due || []) {
      const key = `${row.order_id}:${row.batch_number}`
      if (seen.has(key)) continue
      seen.add(key)
      await sendBatch(row.order_id, row.batch_number, null)
    }
    return { success: true, released: seen.size }
  } catch (error) {
    console.error('Errore invio comande programmate:', error)
    return { success: false, error }
  }
}

/**
 * Conferma nuovi prodotti (marca batch come prepared)
 */
export const confirmNewProducts = async (orderId, batchNumber, staffId) => {
  try {
    const { error } = await supabase
      .from('order_items')
      .update({
        prepared: true,
        prepared_at: new Date().toISOString()
      })
      .eq('order_id', orderId)
      .eq('batch_number', batchNumber)
      .eq('prepared', false)

    if (error) throw error

    // Aggiorna modified_by
    await supabase
      .from('orders')
      .update({ modified_by_staff_id: staffId })
      .eq('id', orderId)

    return { success: true }
  } catch (error) {
    console.error('Errore conferma prodotti:', error)
    return { success: false, error }
  }
}

/**
 * Rimuovi prodotto da ordine
 */
export const removeProductFromOrder = async (orderItemId, staffId) => {
  try {
    // Ottieni info item completa PRIMA di eliminarlo
    const { data: item } = await supabase
      .from('order_items')
      .select('order_id, batch_number, product_name, quantity')
      .eq('id', orderItemId)
      .single()

    if (!item) throw new Error('Prodotto non trovato')

    // Elimina item
    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('id', orderItemId)

    if (error) throw error

    // Aggiorna modified_by
    await supabase
      .from('orders')
      .update({ modified_by_staff_id: staffId })
      .eq('id', item.order_id)

    // Timeline: Prodotto rimosso
    // 🆕 MIGRATO a nuovo timelineService.js
    await addTimelineEntryNew({
      orderId: item.order_id,
      action: TIMELINE_ACTION.ITEM_REMOVED,
      eventSource: EVENT_SOURCE.ORDERS_PAGE,
      operator: buildOperatorInfo({
        staffId: staffId,
        createdByType: 'staff'
      }),
      data: {
        notes: `Rimosso: ${item.product_name} (x${item.quantity})`,
        changes: {
          batch_number: item.batch_number,
          product_name: item.product_name,
          quantity: item.quantity
        },
        isExpandable: true,
        detailsSummary: `${item.product_name} x${item.quantity} rimosso`
      }
    })

    return { success: true }
  } catch (error) {
    console.error('Errore rimozione prodotto:', error)
    return { success: false, error }
  }
}

// ============================================
// PRIORITY ORDER
// ============================================

/**
 * Aggiungi priority a ordine
 */
export const addPriorityToOrder = async (orderId, amount = 2.00) => {
  try {
    const { data: order } = await supabase
      .from('orders')
      .select('priority_order_amount')
      .eq('id', orderId)
      .single()

    const newAmount = (order?.priority_order_amount || 0) + amount

    const { error } = await supabase
      .from('orders')
      .update({ priority_order_amount: newAmount })
      .eq('id', orderId)

    if (error) throw error

    // Analytics
    await trackEvent('priority_order_requested', {
      order_id: orderId,
      amount: amount,
      total_priority: newAmount
    })

    return { success: true, newAmount }
  } catch (error) {
    console.error('Errore aggiunta priority:', error)
    return { success: false, error }
  }
}

// ============================================
// QUERY ORDINI
// ============================================

/**
 * Ottieni ordini attivi per ristorante
 * ATTIVI = pending, confirmed, preparing (NON completed, NON cancelled, NON deleted)
 */
export const getActiveOrders = async (restaurantId) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        table:tables(id, number),
        room:rooms(id, name),
        order_items(
          id,
          product_id,
          product_name,
          product_price,
          quantity,
          subtotal,
          notes,
          batch_number,
          prepared,
          variant_id,
          variant_title
        )
      `)
      .eq('restaurant_id', restaurantId)
      .in('status', ['pending', 'confirmed', 'preparing'])  // Include CONFIRMED
      .is('deleted_at', null)  // Escludi eliminati
      .order('created_at', { ascending: true })

    if (error) throw error
    return { success: true, orders: data || [] }
  } catch (error) {
    console.error('Errore caricamento ordini attivi:', error)
    return { success: false, error, orders: [] }
  }
}

/**
 * Ottieni ordine con items
 */
export const getOrderWithItems = async (orderId) => {
  try {
    // Carica ordine base
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError) throw orderError

    // Carica items
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('batch_number', { ascending: true })
      .order('created_at', { ascending: true })

    if (itemsError) throw itemsError

    // Carica table info se presente
    let tableInfo = null
    if (order.table_id) {
      const { data: table } = await supabase
        .from('tables')
        .select('number, room_id, rooms(name)')
        .eq('id', order.table_id)
        .single()

      tableInfo = table
    }

    // Costruisci ordine completo
    const fullOrder = {
      ...order,
      items: items || [],
      table: tableInfo,
      room_name: tableInfo?.rooms?.name || null
    }

    return { success: true, order: fullOrder }
  } catch (error) {
    console.error('Errore caricamento ordine:', error)
    return { success: false, error, order: null }
  }
}

/**
 * Ottieni tavoli occupati
 */
export const getOccupiedTables = async (restaurantId) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('table_id, room_id')
      .eq('restaurant_id', restaurantId)
      .in('status', ['pending', 'preparing'])
      .is('deleted_at', null)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Errore caricamento tavoli occupati:', error)
    return []
  }
}

/**
 * Check se tavolo è occupato
 */
export const isTableOccupied = async (restaurantId, tableId, roomId = null) => {
  try {
    let query = supabase
      .from('orders')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('table_id', tableId)
      .in('status', ['pending', 'preparing'])
      .is('deleted_at', null)

    if (roomId) {
      query = query.eq('room_id', roomId)
    }

    const { data, error } = await query.limit(1)

    if (error) throw error
    return data && data.length > 0
  } catch (error) {
    console.error('Errore check tavolo occupato:', error)
    return false
  }
}

/**
 * Conta ordini pending (per badge)
 */
export const getPendingOrdersCount = async (restaurantId) => {
  try {
    const { count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('status', 'pending')
      .is('deleted_at', null)

    if (error) throw error
    return { success: true, count: count || 0 }
  } catch (error) {
    console.error('Errore conteggio pending:', error)
    return { success: false, error, count: 0 }
  }
}

/**
 * Ottieni ordini per sezione ORDINI (con filtri)
 */
export const getOrders = async ({
  restaurantId,
  orderType = null, // 'table', 'counter', null = tutti
  status = null, // 'pending', 'preparing', 'completed', null = tutti
  includeDeleted = false,
  dateFrom = null,
  dateTo = null,
  searchQuery = null,
  limit = 50,
  offset = 0
}) => {
  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        table:tables(number),
        room:rooms(name),
        order_items(count)
      `, { count: 'exact' })
      .eq('restaurant_id', restaurantId)

    if (orderType) {
      query = query.eq('order_type', orderType)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (!includeDeleted) {
      query = query.is('deleted_at', null)
    } else {
      query = query.not('deleted_at', 'is', null)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    if (searchQuery) {
      query = query.or(`order_number.eq.${parseInt(searchQuery) || 0},customer_name.ilike.%${searchQuery}%`)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    return {
      orders: data || [],
      total: count || 0
    }
  } catch (error) {
    console.error('Errore caricamento ordini:', error)
    return { orders: [], total: 0 }
  }
}

// ============================================
// PRECONTO/SCONTRINO
// ============================================

/**
 * Genera preconto (non chiude tavolo)
 */
export const generatePreconto = async (orderId, staffId) => {
  try {
    const { success, order, error: loadError } = await getOrderWithItems(orderId)
    if (!success || !order) throw loadError || new Error('Ordine non trovato')

    const precontoTimestamp = new Date().toISOString()

    // Marca nei metadata che è stato generato il preconto (la stampa procede comunque)
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        metadata: { ...(order.metadata || {}), preconto_generated: true, preconto_at: precontoTimestamp },
        modified_by_staff_id: staffId
      })
      .eq('id', orderId)

    if (updateError) console.error('Errore salvataggio preconto:', updateError)

    // Timeline: Preconto generato
    // 🆕 MIGRATO a nuovo timelineService.js
    await addTimelineEntryNew({
      orderId,
      action: TIMELINE_ACTION.PRECONTO_GENERATED,
      eventSource: EVENT_SOURCE.CASHIER,
      operator: buildOperatorInfo({
        staffId: staffId,
        createdByType: 'staff'
      }),
      data: {
        notes: 'Preconto generato',
        changes: {
          timestamp: precontoTimestamp
        },
        isExpandable: false,
        detailsSummary: 'Preconto generato'
      }
    })

    // Analytics - using correct event name from database constraint
    await trackEvent('preconto_generated', {
      restaurant_id: order.restaurant_id,
      order_id: orderId,
      table_id: order.table_id,
      room_id: order.room_id,
      staff_id: staffId,
      total: order.total_amount
    })

    return { success: true, order }
  } catch (error) {
    console.error('Errore generazione preconto:', error)
    return { success: false, error }
  }
}

/**
 * Ottieni prossimo numero scontrino giornaliero
 */
export const getNextReceiptNumber = async (restaurantId) => {
  if (!restaurantId) throw new Error('Ristorante mancante per la numerazione scontrini')

  // Numerazione giornaliera: inizio della giornata nell'ora locale del locale
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  // Tutti gli scontrini emessi oggi (non l'ultimo ordine creato, che potrebbe non averne)
  const { data, error } = await supabase
    .from('orders')
    .select('metadata')
    .eq('restaurant_id', restaurantId)
    .not('metadata->receipt_number', 'is', null)
    .gte('closed_at', startOfDay.toISOString())

  if (error) {
    console.error('Errore get next receipt number:', error)
    throw error
  }

  return nextReceiptNumber(data)
}

/**
 * Calcola il prossimo numero a partire dagli ordini con scontrino della giornata
 */
export const nextReceiptNumber = (ordersWithReceipt = []) => {
  const maxNumber = ordersWithReceipt.reduce(
    (max, o) => Math.max(max, Number(o.metadata?.receipt_number) || 0),
    0
  )
  return maxNumber + 1
}

/**
 * Genera scontrino e chiudi tavolo
 */
export const generateScontrino = async (orderId, staffId) => {
  try {
    const { success, order, error: loadError } = await getOrderWithItems(orderId)
    if (!success || !order) throw loadError || new Error('Ordine non trovato')

    // Ottieni numero scontrino
    const receiptNumber = await getNextReceiptNumber(order.restaurant_id)

    // Chiudi tavolo
    const result = await closeTableOrder(orderId, staffId, receiptNumber)

    if (!result.success) throw result.error

    return { success: true, order, receiptNumber }
  } catch (error) {
    console.error('Errore generazione scontrino:', error)
    return { success: false, error }
  }
}

/**
 * Chiudi tavolo senza generare scontrino
 */
export const closeTableWithoutReceipt = async (orderId, staffId) => {
  try {
    const { success, order, error: loadError } = await getOrderWithItems(orderId)
    if (!success || !order) throw loadError || new Error('Ordine non trovato')

    // Chiudi tavolo senza numero scontrino
    const result = await closeTableOrder(orderId, staffId, null)

    if (!result.success) throw result.error

    return { success: true, order }
  } catch (error) {
    console.error('Errore chiusura tavolo:', error)
    return { success: false, error }
  }
}

/**
 * Chiudi tavolo come NON PAGATO (es. clienti scappati senza pagare).
 * Il tavolo si libera, l'ordine resta come traccia, l'incasso è considerato
 * PERSO: payment_status='unpaid' lo esclude dai ricavi e lo conta come mancato incasso.
 */
export const closeTableUnpaid = async (orderId, staffId, reason = null) => {
  try {
    const { success, order, error: loadError } = await getOrderWithItems(orderId)
    if (!success || !order) throw loadError || new Error('Ordine non trovato')

    const lostAmount = Number(order.total_amount || 0)

    // Chiudi (solo se ancora aperto) marcandolo non pagato
    const { data: closed, error } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        closed_at: new Date().toISOString(),
        payment_status: 'unpaid',
        modified_by_staff_id: staffId,
        metadata: { ...(order.metadata || {}), unpaid: true, lost_amount: lostAmount, unpaid_reason: reason || 'Clienti usciti senza pagare' }
      })
      .eq('id', orderId)
      .in('status', OPEN_ORDER_STATUSES)
      .is('deleted_at', null)
      .select()
      .maybeSingle()

    if (error) throw error
    if (!closed) throw new Error('Ordine già chiuso o eliminato')

    await addTimelineEntryNew({
      orderId,
      action: TIMELINE_ACTION.COMPLETED,
      eventSource: EVENT_SOURCE.CASHIER,
      operator: buildOperatorInfo({ staffId, createdByType: 'staff' }),
      data: {
        previousStatus: order.status,
        newStatus: 'completed',
        notes: `Tavolo chiuso NON pagato · incasso perso €${lostAmount.toFixed(2)}`,
        changes: { payment_status: 'unpaid', lost_amount: lostAmount }
      }
    }).catch(e => console.error('timeline closeUnpaid:', e))

    await trackEvent('order_unpaid', {
      restaurant_id: order.restaurant_id,
      order_id: orderId,
      table_id: order.table_id,
      room_id: order.room_id,
      staff_id: staffId,
      lost_amount: lostAmount
    })

    return { success: true, order: closed, lostAmount }
  } catch (error) {
    console.error('Errore chiusura non pagata:', error)
    return { success: false, error }
  }
}

// ============================================
// UTILITY
// ============================================

/**
 * Formatta tempo elapsed in HH:MM:SS
 */
export const formatElapsedTime = (openedAt) => {
  if (!openedAt) return '00:00:00'

  const elapsedSeconds = Math.floor((Date.now() - new Date(openedAt)) / 1000)
  const hours = Math.floor(elapsedSeconds / 3600).toString().padStart(2, '0')
  const minutes = Math.floor((elapsedSeconds % 3600) / 60).toString().padStart(2, '0')
  const seconds = (elapsedSeconds % 60).toString().padStart(2, '0')

  return `${hours}:${minutes}:${seconds}`
}

/**
 * Raggruppa items per batch
 */
export const groupItemsByBatch = (items) => {
  const batches = {}

  items.forEach(item => {
    const batch = item.batch_number || 1
    if (!batches[batch]) {
      batches[batch] = []
    }
    batches[batch].push(item)
  })

  return batches
}

export default {
  // CRUD
  createTableOrder,
  createTableOrderByStaff,
  createCounterOrder,
  confirmOrder,
  closeTableOrder,
  deleteOrder,

  // Prodotti
  getNextBatchNumber,
  addProductsToOrder,
  confirmNewProducts,
  removeProductFromOrder,

  // Priority
  addPriorityToOrder,

  // Query
  getActiveOrders,
  getOrderWithItems,
  getOccupiedTables,
  isTableOccupied,
  getPendingOrdersCount,
  getOrders,

  // Preconto/Scontrino
  generatePreconto,
  getNextReceiptNumber,
  generateScontrino,

  // Utility
  formatElapsedTime,
  groupItemsByBatch
}
