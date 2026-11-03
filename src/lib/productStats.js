// Statistiche prodotto del menu pubblico (contatori anonimi, tabella product_stats_daily):
//   visualizzazione = la scheda del prodotto resta a schermo (almeno metà) per 1 secondo
//   apertura        = il cliente apre il prodotto ("Scopri di più" o la finestra del prodotto)
//   carrello        = il prodotto viene aggiunto al carrello
//   ordinato        = il prodotto è in un ordine inviato dal menu
// Visualizzazioni e aperture contano una volta per visita; aggiunte e ordini ogni volta.
//
// Per contare le visualizzazioni basta mettere data-pid={product.id} sulla scheda del prodotto:
// un unico osservatore di pagina segue tutte le schede, in qualsiasi layout.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const VISIBLE_RATIO = 0.5      // almeno metà scheda a schermo
const VISIBLE_MS = 1000        // per almeno 1 secondo
const FLUSH_MS = 4000          // invio a blocchi ogni 4 secondi
const VISIT_TIMEOUT_MS = 30 * 60 * 1000 // 30 minuti di inattività = nuova visita

let restaurantId = null
let buffer = new Map()         // productId -> { i, o, a, q, d }
let visit = null               // { i: Set, o: Set }
let flushTimer = null

const visitKey = () => `mvp_visit_${restaurantId}`

function loadVisit() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(visitKey()) || 'null')
    if (raw && Date.now() - raw.t < VISIT_TIMEOUT_MS) return { i: new Set(raw.i), o: new Set(raw.o) }
  } catch { /* storage non disponibile: visita solo in memoria */ }
  return { i: new Set(), o: new Set() }
}

function saveVisit() {
  try {
    sessionStorage.setItem(visitKey(), JSON.stringify({ i: [...visit.i], o: [...visit.o], t: Date.now() }))
  } catch { /* storage non disponibile */ }
}

function bump(productId, field, n = 1) {
  if (!restaurantId || !productId) return
  const row = buffer.get(productId) || { p: productId }
  row[field] = (row[field] || 0) + n
  buffer.set(productId, row)
}

// Prima volta in questa visita? (per visualizzazioni e aperture)
function firstInVisit(kind, productId) {
  if (!visit) return false
  if (visit[kind].has(productId)) return false
  visit[kind].add(productId)
  saveVisit()
  return true
}

function flush() {
  if (!restaurantId || buffer.size === 0) return
  const events = [...buffer.values()]
  buffer = new Map()
  try {
    // keepalive: l'invio parte anche se il cliente chiude la pagina
    fetch(`${SUPABASE_URL}/rest/v1/rpc/track_product_stats`, {
      method: 'POST',
      keepalive: true,
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_restaurant_id: restaurantId, p_events: events }),
    }).catch(() => { /* statistiche non critiche */ })
  } catch { /* statistiche non critiche */ }
}

export function trackProductOpen(productId) {
  if (restaurantId && firstInVisit('o', productId)) bump(productId, 'o')
}

export function trackProductCartAdd(productId, quantity = 1) {
  if (!restaurantId) return
  bump(productId, 'a')
  bump(productId, 'q', Math.max(1, Number(quantity) || 1))
}

export function trackProductsOrdered(items) {
  if (!restaurantId) return
  for (const it of items || []) bump(it.product_id, 'd', Math.max(1, Number(it.quantity) || 1))
  flush()
}

/**
 * Avvia le statistiche per il menu di un ristorante. Restituisce la funzione di stop.
 * Va chiamata solo per i clienti (non in anteprima dall'editor né dal titolare).
 */
export function startProductStats(id) {
  if (typeof window === 'undefined' || !id) return () => {}
  restaurantId = id
  visit = loadVisit()

  // --- visualizzazioni: osservatore di tutte le schede con data-pid ---
  const timers = new Map() // elemento -> timeout
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const el = e.target
      if (e.isIntersecting && e.intersectionRatio >= VISIBLE_RATIO) {
        if (!timers.has(el)) {
          timers.set(el, setTimeout(() => {
            timers.delete(el)
            const pid = el.dataset.pid
            if (el.isConnected && document.visibilityState === 'visible' && firstInVisit('i', pid)) bump(pid, 'i')
          }, VISIBLE_MS))
        }
      } else if (timers.has(el)) {
        clearTimeout(timers.get(el)); timers.delete(el)
      }
    }
  }, { threshold: [0, VISIBLE_RATIO, 1] })

  const cardsIn = (node) => {
    if (!(node instanceof Element)) return []
    const list = node.matches('[data-pid]') ? [node] : []
    return list.concat([...node.querySelectorAll('[data-pid]')])
  }
  cardsIn(document.body).forEach(el => io.observe(el))
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach(n => cardsIn(n).forEach(el => io.observe(el)))
      m.removedNodes.forEach(n => cardsIn(n).forEach(el => {
        io.unobserve(el)
        if (timers.has(el)) { clearTimeout(timers.get(el)); timers.delete(el) }
      }))
    }
  })
  mo.observe(document.body, { childList: true, subtree: true })

  // --- invio a blocchi, e subito quando la pagina viene nascosta o chiusa ---
  flushTimer = setInterval(flush, FLUSH_MS)
  const onHide = () => { if (document.visibilityState === 'hidden') flush() }
  document.addEventListener('visibilitychange', onHide)
  window.addEventListener('pagehide', flush)

  return () => {
    flush()
    clearInterval(flushTimer)
    io.disconnect(); mo.disconnect()
    timers.forEach(t => clearTimeout(t))
    document.removeEventListener('visibilitychange', onHide)
    window.removeEventListener('pagehide', flush)
    restaurantId = null
    visit = null
  }
}
