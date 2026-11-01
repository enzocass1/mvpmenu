import { describe, it, expect, vi, beforeEach } from 'vitest'

// Finto client Supabase: registra ogni query e risponde tramite `respond(call)`
const db = vi.hoisted(() => ({ calls: [], respond: () => ({ data: null, error: null }) }))

vi.mock('../supabaseClient', () => {
  const from = (table) => {
    const call = { table, op: 'select', payload: null, filters: [], mode: null }
    db.calls.push(call)
    const builder = {
      select(columns) { if (call.op === 'select') call.columns = columns; return builder },
      insert(payload) { call.op = 'insert'; call.payload = payload; return builder },
      update(payload) { call.op = 'update'; call.payload = payload; return builder },
      single() { call.mode = 'single'; return builder },
      maybeSingle() { call.mode = 'maybeSingle'; return builder },
      then(resolve, reject) { return Promise.resolve(db.respond(call)).then(resolve, reject) }
    }
    for (const f of ['eq', 'neq', 'in', 'is', 'not', 'gte', 'lte', 'order', 'limit']) {
      builder[f] = (...args) => { call.filters.push([f, ...args]); return builder }
    }
    return builder
  }
  return { supabase: { from } }
})
vi.mock('../utils/analytics', () => ({ trackEvent: vi.fn(async () => true) }))
vi.mock('./timelineService', () => ({
  addTimelineEntry: vi.fn(async () => ({ success: true })),
  buildOperatorInfo: vi.fn(() => ({})),
  EVENT_SOURCE: {},
  TIMELINE_ACTION: {}
}))

const ordersService = await import('./ordersService')

const hasFilter = (call, ...expected) =>
  call.filters.some(f => JSON.stringify(f) === JSON.stringify(expected))

const RESTAURANT = 'rest-1'
const ORDER = { id: 'ord-1', restaurant_id: RESTAURANT, status: 'preparing', metadata: { preconto_generated: true } }

beforeEach(() => {
  db.calls = []
  db.respond = () => ({ data: null, error: null })
})

describe('numerazione scontrini', () => {
  it('prossimo numero = massimo della giornata + 1 (non l\'ultimo ordine creato)', () => {
    const today = [{ metadata: { receipt_number: 3 } }, { metadata: { receipt_number: 7 } }, { metadata: { receipt_number: 5 } }]
    expect(ordersService.nextReceiptNumber(today)).toBe(8)
    expect(ordersService.nextReceiptNumber([])).toBe(1)
  })

  it('cerca solo gli scontrini del ristorante emessi oggi', async () => {
    db.respond = () => ({ data: [{ metadata: { receipt_number: 4 } }], error: null })
    const n = await ordersService.getNextReceiptNumber(RESTAURANT)
    expect(n).toBe(5)
    const q = db.calls[0]
    expect(hasFilter(q, 'eq', 'restaurant_id', RESTAURANT)).toBe(true)
    expect(hasFilter(q, 'not', 'metadata->receipt_number', 'is', null)).toBe(true)
  })

  it('senza ristorante genera un errore invece di ripartire da 1 in silenzio', async () => {
    await expect(ordersService.getNextReceiptNumber(undefined)).rejects.toThrow()
  })
})

describe('scontrino tavolo (generateScontrino)', () => {
  it('usa il ristorante dell\'ordine, numera correttamente e conserva i metadata del preconto', async () => {
    db.respond = (call) => {
      if (call.table === 'orders' && call.op === 'select' && call.columns === '*') return { data: ORDER, error: null }
      if (call.table === 'order_items') return { data: [], error: null }
      if (call.table === 'orders' && call.columns === 'metadata' && hasFilter(call, 'not', 'metadata->receipt_number', 'is', null)) {
        return { data: [{ metadata: { receipt_number: 2 } }], error: null }
      }
      if (call.table === 'orders' && call.columns === 'metadata') return { data: { metadata: ORDER.metadata }, error: null }
      if (call.table === 'orders' && call.op === 'update') return { data: { ...ORDER, status: 'completed' }, error: null }
      return { data: null, error: null }
    }

    const result = await ordersService.generateScontrino(ORDER.id, null)

    expect(result.success).toBe(true)
    expect(result.receiptNumber).toBe(3)
    expect(result.order.restaurant_id).toBe(RESTAURANT)

    const close = db.calls.find(c => c.table === 'orders' && c.op === 'update')
    expect(close.payload.metadata).toMatchObject({ preconto_generated: true, receipt_number: 3 })
    // Chiude solo ordini ancora aperti: niente doppia chiusura
    expect(hasFilter(close, 'in', 'status', ['pending', 'confirmed', 'preparing'])).toBe(true)
  })

  it('se l\'ordine è già stato chiuso da un altro operatore restituisce un errore chiaro', async () => {
    db.respond = (call) => {
      if (call.op === 'update') return { data: null, error: null } // nessuna riga aggiornata
      return { data: null, error: null }
    }
    const result = await ordersService.closeTableOrder(ORDER.id, null)
    expect(result.success).toBe(false)
    expect(result.error.message).toMatch(/già chiuso/)
  })
})

describe('conferma ordine', () => {
  it('conferma solo ordini ancora da confermare', async () => {
    db.respond = (call) => (call.op === 'update' && call.table === 'orders' ? { data: { ...ORDER, status: 'preparing' }, error: null } : { data: null, error: null })
    const result = await ordersService.confirmOrder(ORDER.id, null)
    expect(result.success).toBe(true)
    const update = db.calls.find(c => c.table === 'orders' && c.op === 'update')
    expect(hasFilter(update, 'in', 'status', ['pending', 'confirmed'])).toBe(true)
  })

  it('doppia conferma: errore "già approvato" invece di una seconda conferma', async () => {
    const result = await ordersService.confirmOrder(ORDER.id, null)
    expect(result.success).toBe(false)
    expect(result.error.message).toMatch(/già approvat/)
  })

  it('approvare NON segna i prodotti come preparati (il preparato è per batch)', async () => {
    db.respond = (call) => (call.op === 'update' && call.table === 'orders' ? { data: { ...ORDER, status: 'preparing' }, error: null } : { data: null, error: null })
    await ordersService.confirmOrder(ORDER.id, null)
    // nessuna scrittura su order_items durante l'approvazione
    expect(db.calls.some(c => c.table === 'order_items' && c.op === 'update')).toBe(false)
  })
})

describe('preparato per batch e rifiuto comanda', () => {
  it('markBatchPrepared aggiorna solo gli item del batch, senza toccare lo stato ordine', async () => {
    await ordersService.markBatchPrepared(ORDER.id, 2, null, true)
    const upd = db.calls.find(c => c.table === 'order_items' && c.op === 'update')
    expect(upd.payload.prepared).toBe(true)
    expect(hasFilter(upd, 'eq', 'order_id', ORDER.id)).toBe(true)
    expect(hasFilter(upd, 'eq', 'batch_number', 2)).toBe(true)
    // non deve chiudere/cambiare l'ordine
    expect(db.calls.some(c => c.table === 'orders' && c.op === 'update')).toBe(false)
  })

  it('closeTableUnpaid chiude come non pagato senza eliminare l\'ordine', async () => {
    db.respond = (call) => {
      if (call.table === 'orders' && call.op === 'select' && call.columns === '*') return { data: { ...ORDER, total_amount: 18.5, metadata: {} }, error: null }
      if (call.table === 'order_items') return { data: [], error: null }
      if (call.table === 'orders' && call.op === 'update') return { data: { ...ORDER, status: 'completed', payment_status: 'unpaid' }, error: null }
      return { data: null, error: null }
    }
    const result = await ordersService.closeTableUnpaid(ORDER.id, null, 'scappati')
    expect(result.success).toBe(true)
    expect(result.lostAmount).toBeCloseTo(18.5)
    const upd = db.calls.find(c => c.table === 'orders' && c.op === 'update')
    expect(upd.payload.status).toBe('completed')          // tavolo chiuso
    expect(upd.payload.payment_status).toBe('unpaid')      // incasso perso
    expect(upd.payload.deleted_at).toBeUndefined()         // NON eliminato
    expect(hasFilter(upd, 'in', 'status', ['pending', 'confirmed', 'preparing'])).toBe(true)
  })

  it('rejectOrder annulla solo un ordine ancora pending', async () => {
    db.respond = (call) => (call.op === 'update' ? { data: { id: ORDER.id, status: 'cancelled' }, error: null } : { data: null, error: null })
    const result = await ordersService.rejectOrder(ORDER.id, null)
    expect(result.success).toBe(true)
    const upd = db.calls.find(c => c.table === 'orders' && c.op === 'update')
    expect(upd.payload.status).toBe('cancelled')
    expect(upd.payload.deleted_at).toBeTruthy()
    expect(hasFilter(upd, 'eq', 'status', 'pending')).toBe(true)
  })
})

describe('preconto', () => {
  it('non scrive la colonna inesistente preconto_generated_at e conserva i metadata', async () => {
    db.respond = (call) => {
      if (call.table === 'orders' && call.op === 'select') return { data: { ...ORDER, metadata: { receipt_number: 1 } }, error: null }
      if (call.table === 'order_items') return { data: [], error: null }
      return { data: null, error: null }
    }
    const result = await ordersService.generatePreconto(ORDER.id, null)
    expect(result.success).toBe(true)
    const update = db.calls.find(c => c.op === 'update')
    expect(update.payload).not.toHaveProperty('preconto_generated_at')
    expect(update.payload.metadata).toMatchObject({ receipt_number: 1, preconto_generated: true })
  })
})

describe('vendita al banco (createCounterOrder)', () => {
  const items = [
    { product_id: 'p1', product_name: 'Caffè', product_price: 1.2, quantity: 2 },
    { product_id: 'p2', product_name: 'Cornetto', product_price: 1.5, quantity: 1, subtotal: 1.5 }
  ]

  it('salva totale e numero scontrino, senza la colonna inesistente option_values', async () => {
    db.respond = (call) => {
      if (call.op === 'select' && call.columns === 'metadata') return { data: [{ metadata: { receipt_number: 9 } }], error: null }
      if (call.table === 'orders' && call.op === 'insert') return { data: { id: 'new-1', ...call.payload }, error: null }
      return { data: null, error: null }
    }
    const result = await ordersService.createCounterOrder({ restaurantId: RESTAURANT, staffId: null, items })

    expect(result.success).toBe(true)
    expect(result.receiptNumber).toBe(10)
    const orderInsert = db.calls.find(c => c.table === 'orders' && c.op === 'insert')
    expect(orderInsert.payload.total_amount).toBeCloseTo(3.9)
    expect(orderInsert.payload.metadata.receipt_number).toBe(10)
    const itemsInsert = db.calls.find(c => c.table === 'order_items' && c.op === 'insert')
    expect(itemsInsert.payload[0]).not.toHaveProperty('option_values')
    expect(itemsInsert.payload[0].subtotal).toBeCloseTo(2.4)
  })

  it('se i prodotti non si salvano, annulla l\'ordine invece di lasciarlo vuoto', async () => {
    db.respond = (call) => {
      if (call.op === 'select' && call.columns === 'metadata') return { data: [], error: null }
      if (call.table === 'orders' && call.op === 'insert') return { data: { id: 'new-2' }, error: null }
      if (call.table === 'order_items') return { data: null, error: { message: 'insert fallito' } }
      return { data: null, error: null }
    }
    const result = await ordersService.createCounterOrder({ restaurantId: RESTAURANT, staffId: null, items })

    expect(result.success).toBe(false)
    const discard = db.calls.find(c => c.table === 'orders' && c.op === 'update')
    expect(discard.payload.status).toBe('cancelled')
    expect(discard.payload.deleted_at).toBeTruthy()
    expect(hasFilter(discard, 'eq', 'id', 'new-2')).toBe(true)
  })
})
