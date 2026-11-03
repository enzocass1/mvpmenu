// Linguaggio di query delle Analytics, ispirato a ShopifyQL:
//
//   FROM sales
//     SHOW orders, total_sales, average_order_value
//     WHERE channel = 'menu'
//     GROUP BY day_part
//     TIMESERIES hour WITH TOTALS, PERCENT_CHANGE
//     HAVING orders > 5
//     DURING today            (oppure SINCE -30d UNTIL today, oppure DURING '2026-10-01' TO '2026-10-31')
//     COMPARE TO yesterday    (previous_period, previous_year o un periodo)
//     ORDER BY total_sales DESC
//     LIMIT 100
//   VISUALIZE total_sales TYPE line
//
// parseQuery trasforma il testo in una richiesta; il server (analytics_query) accetta solo
// i campi del catalogo, quindi qui non si costruisce mai SQL.

import { supabase } from '../supabaseClient'

export const GRAINS = ['hour', 'day', 'week', 'month', 'quarter', 'year']
export const CHART_TYPES = ['line', 'bar', 'table']

// ---------- date (ora italiana: il browser del titolare è in Italia) ----------
const pad = (n) => String(n).padStart(2, '0')
export const toDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const fromDay = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const addDays = (s, n) => { const x = fromDay(s); x.setDate(x.getDate() + n); return toDay(x) }
const addMonths = (s, n) => { const x = fromDay(s); x.setMonth(x.getMonth() + n); return toDay(x) }
const daysBetween = (a, b) => Math.round((fromDay(b) - fromDay(a)) / 86400000)
const startOfWeek = (s) => { const x = fromDay(s); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); return toDay(x) }

export const RANGES = {
  today: { label: 'Oggi', get: (t) => [t, t] },
  yesterday: { label: 'Ieri', get: (t) => [addDays(t, -1), addDays(t, -1)] },
  this_week: { label: 'Questa settimana', get: (t) => [startOfWeek(t), t] },
  last_week: { label: 'Settimana scorsa', get: (t) => [addDays(startOfWeek(t), -7), addDays(startOfWeek(t), -1)] },
  last_7_days: { label: 'Ultimi 7 giorni', get: (t) => [addDays(t, -6), t] },
  last_14_days: { label: 'Ultimi 14 giorni', get: (t) => [addDays(t, -13), t] },
  last_30_days: { label: 'Ultimi 30 giorni', get: (t) => [addDays(t, -29), t] },
  last_90_days: { label: 'Ultimi 90 giorni', get: (t) => [addDays(t, -89), t] },
  last_365_days: { label: 'Ultimi 365 giorni', get: (t) => [addDays(t, -364), t] },
  this_month: { label: 'Questo mese', get: (t) => [t.slice(0, 8) + '01', t] },
  last_month: { label: 'Mese scorso', get: (t) => { const first = t.slice(0, 8) + '01'; return [addMonths(first, -1), addDays(first, -1)] } },
  this_year: { label: "Quest'anno", get: (t) => [t.slice(0, 4) + '-01-01', t] },
  last_year: { label: 'Anno scorso', get: (t) => { const y = Number(t.slice(0, 4)) - 1; return [`${y}-01-01`, `${y}-12-31`] } },
}
export const COMPARES = {
  previous_period: 'Periodo precedente',
  previous_year: 'Stesso periodo anno scorso',
}

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(fromDay(s).getTime())

// "-7d", "-2w", "-3m", "-1y", "today", "yesterday" o una data
const relativeDay = (v, today) => {
  if (v === 'today') return today
  if (v === 'yesterday') return addDays(today, -1)
  if (isDate(v)) return v
  const m = /^-(\d+)([dwmy])$/.exec(v)
  if (!m) return null
  const n = Number(m[1])
  return m[2] === 'd' ? addDays(today, -n) : m[2] === 'w' ? addDays(today, -7 * n)
    : m[2] === 'm' ? addMonths(today, -n) : addMonths(today, -12 * n)
}

export function compareRange(compare, range, today) {
  if (!compare) return null
  if (compare.dates) return compare.dates
  const len = daysBetween(range[0], range[1])
  if (compare.name === 'previous_period') return [addDays(range[0], -len - 1), addDays(range[0], -1)]
  if (compare.name === 'previous_year') return [addMonths(range[0], -12), addMonths(range[1], -12)]
  if (RANGES[compare.name]) return RANGES[compare.name].get(today)
  return null
}

// ---------- tokenizzazione ----------
function tokenize(text) {
  const tokens = []
  const re = /\s+|--[^\n]*|'((?:[^']|'')*)'|"([^"]*)"|(<>|!=|>=|<=|=|>|<)|([(),])|(-?\d+(?:\.\d+)?[dwmy]?)|([A-Za-z_][A-Za-z0-9_]*)|(\S)/g
  let m
  while ((m = re.exec(text))) {
    if (m[1] !== undefined) tokens.push({ t: 'str', v: m[1].replace(/''/g, "'") })
    else if (m[2] !== undefined) tokens.push({ t: 'str', v: m[2] })
    else if (m[3]) tokens.push({ t: 'op', v: m[3] })
    else if (m[4]) tokens.push({ t: 'punct', v: m[4] })
    else if (m[5]) tokens.push({ t: 'num', v: m[5] })
    else if (m[6]) tokens.push({ t: 'word', v: m[6], u: m[6].toUpperCase() })
    else if (m[7]) throw new Error(`Carattere non valido: ${m[7]}`)
  }
  return tokens
}

const CLAUSES = ['FROM', 'SHOW', 'WHERE', 'GROUP', 'TIMESERIES', 'WITH', 'HAVING', 'DURING', 'SINCE', 'UNTIL', 'COMPARE', 'ORDER', 'LIMIT', 'VISUALIZE']

/**
 * Testo → richiesta. Lancia un Error con un messaggio in italiano se la query non è valida.
 * Il periodo resta simbolico (during/since/until): lo risolve resolveQuery.
 */
export function parseQuery(text) {
  const tk = tokenize(text || '')
  let i = 0
  const peek = () => tk[i]
  const next = () => tk[i++]
  const isWord = (u) => peek()?.t === 'word' && peek().u === u
  const atClause = () => peek()?.t === 'word' && CLAUSES.includes(peek().u)
  const expectWord = (u) => { if (!isWord(u)) throw new Error(`Manca "${u}" dopo ${tk[i - 1]?.v || 'l\'inizio'}`); next() }
  const ident = (what) => {
    const x = next()
    if (!x || x.t !== 'word') throw new Error(`Manca ${what}`)
    return x.v.toLowerCase()
  }
  const identList = (what) => {
    const out = [ident(what)]
    while (peek()?.v === ',') { next(); out.push(ident(what)) }
    return out
  }
  const value = () => {
    const x = next()
    if (!x) throw new Error('Manca un valore')
    if (x.t === 'str') return x.v
    if (x.t === 'num') return Number(x.v)
    if (x.t === 'word') return x.v
    throw new Error(`Valore non valido: ${x.v}`)
  }
  const condition = (numeric) => {
    const field = ident('un campo')
    let op
    if (isWord('NOT')) { next(); expectWord('IN'); op = 'NOT IN' }
    else if (isWord('IN')) { next(); op = 'IN' }
    else if (isWord('CONTAINS')) { next(); op = 'CONTAINS' }
    else if (isWord('IS')) { next(); if (isWord('NOT')) { next(); op = 'IS NOT NULL' } else op = 'IS NULL'; expectWord('NULL'); return { field, op } }
    else if (peek()?.t === 'op') op = next().v
    else throw new Error(`Manca l'operatore dopo ${field} (=, !=, >, <, IN, CONTAINS)`)
    if (op === 'IN' || op === 'NOT IN') {
      if (next()?.v !== '(') throw new Error(`Dopo ${op} servono i valori tra parentesi: ('a', 'b')`)
      const vals = [value()]
      while (peek()?.v === ',') { next(); vals.push(value()) }
      if (next()?.v !== ')') throw new Error('Manca la parentesi di chiusura')
      return { field, op, value: vals }
    }
    const v = value()
    if (numeric && typeof v !== 'number') throw new Error(`In HAVING ${field} va confrontato con un numero`)
    return { field, op, value: v }
  }
  const conditions = (numeric) => {
    const out = [condition(numeric)]
    while (isWord('AND')) { next(); out.push(condition(numeric)) }
    if (isWord('OR')) throw new Error('OR non è supportato: usa IN (...) per più valori')
    return out
  }
  const rangeValue = () => {
    const x = next()
    if (!x) throw new Error('Manca il periodo')
    return x.t === 'str' || x.t === 'num' ? x.v : x.v.toLowerCase()
  }

  const q = { from: null, show: [], where: [], group_by: [], timeseries: null, with: [], having: [], during: null, since: null, until: null, compare: null, order_by: [], limit: null, visualize: [], chart: null }
  while (i < tk.length) {
    const kw = next()
    if (kw.t !== 'word' || !CLAUSES.includes(kw.u)) throw new Error(`Non capisco "${kw.v}": ogni parte deve iniziare con FROM, SHOW, GROUP BY, DURING...`)
    switch (kw.u) {
      case 'FROM': q.from = ident('il set di dati dopo FROM'); break
      case 'SHOW': q.show.push(...identList('una metrica dopo SHOW')); break
      case 'WHERE': q.where.push(...conditions(false)); break
      case 'HAVING': q.having.push(...conditions(true)); break
      case 'GROUP': expectWord('BY'); q.group_by.push(...identList('una dimensione dopo GROUP BY')); break
      case 'TIMESERIES': {
        q.timeseries = ident('la grana dopo TIMESERIES (hour, day, week, month)')
        if (!GRAINS.includes(q.timeseries)) throw new Error(`TIMESERIES accetta: ${GRAINS.join(', ')}`)
        break
      }
      case 'WITH': {
        do {
          if (peek()?.v === ',') next()
          const opt = ident('un\'opzione dopo WITH (TOTALS, PERCENT_CHANGE)')
          if (opt === 'currency') value()
          else q.with.push(opt)
        } while (peek()?.v === ',')
        break
      }
      case 'DURING': {
        const a = rangeValue()
        if (isWord('TO') || peek()?.v === '..') { next(); q.since = a; q.until = rangeValue() }
        else q.during = a
        break
      }
      case 'SINCE': q.since = rangeValue(); break
      case 'UNTIL': q.until = rangeValue(); break
      case 'COMPARE': {
        expectWord('TO')
        const a = rangeValue()
        if (isWord('TO')) { next(); q.compare = { dates: [a, rangeValue()] } } else q.compare = { name: a }
        break
      }
      case 'ORDER': {
        expectWord('BY')
        do {
          if (peek()?.v === ',') next()
          const field = ident('un campo dopo ORDER BY')
          let dir = 'ASC'
          if (isWord('ASC') || isWord('DESC')) dir = next().u
          q.order_by.push({ field, dir })
        } while (peek()?.v === ',')
        break
      }
      case 'LIMIT': {
        const n = next()
        if (n?.t !== 'num') throw new Error('LIMIT vuole un numero')
        q.limit = Math.max(1, Math.min(5000, Math.floor(Number(n.v))))
        break
      }
      case 'VISUALIZE': {
        if (!atClause() && !isWord('TYPE')) q.visualize.push(...identList('una metrica dopo VISUALIZE'))
        if (isWord('TYPE')) { next(); q.chart = ident('il tipo di grafico (line, bar, table)'); if (!CHART_TYPES.includes(q.chart)) throw new Error('TYPE accetta: line, bar, table') }
        break
      }
      default: throw new Error(`"${kw.v}" non è valido qui`)
    }
  }
  if (!q.from) throw new Error('Manca FROM: indica da quali dati partire (es. FROM sales)')
  if (!q.show.length) throw new Error('Manca SHOW: indica cosa mostrare (es. SHOW total_sales)')
  return q
}

// Campi di Shopify che in un bar/ristorante non esistono o hanno un altro nome
const SHOPIFY_HINTS = {
  net_sales: 'usa total_sales (incasso)',
  sales_reversals: 'usa unpaid_sales (tavoli chiusi senza pagare)',
  returns: 'usa unpaid_sales (tavoli chiusi senza pagare)',
  additional_fees: 'usa priority_fees (supplementi priorità)',
  discounts: 'nel locale non ci sono sconti: toglilo dalla query',
  shipping_charges: 'nel locale non ci sono spedizioni: toglilo dalla query',
  duties: 'nel locale non ci sono dazi: toglilo dalla query',
  taxes: "l'IVA è già inclusa nei prezzi: toglilo dalla query",
}

/** Periodo e confronto in date reali; controllo dei campi sul catalogo. */
export function resolveQuery(q, catalog, today = toDay(new Date())) {
  const ds = catalog.find(d => d.name === q.from)
  if (!ds) throw new Error(`Set di dati "${q.from}" inesistente. Disponibili: ${catalog.map(d => d.name).join(', ')}`)
  const fields = Object.fromEntries(ds.fields.map(f => [f.name, f]))
  const need = (name, kind, where) => {
    const f = fields[name]
    if (!f || f.kind !== kind) {
      if (SHOPIFY_HINTS[name]) throw new Error(`${where}: "${name}" — ${SHOPIFY_HINTS[name]}`)
      const options = ds.fields.filter(x => x.kind === kind).map(x => x.name).join(', ')
      throw new Error(`${where}: "${name}" non esiste in ${ds.name}. ${kind === 'metric' ? 'Metriche' : 'Dimensioni'}: ${options}`)
    }
  }
  q.show.forEach(n => need(n, 'metric', 'SHOW'))
  q.group_by.forEach(n => need(n, 'dimension', 'GROUP BY'))
  q.where.forEach(c => need(c.field, 'dimension', 'WHERE'))
  q.having.forEach(c => need(c.field, 'metric', 'HAVING'))
  q.visualize.forEach(n => { if (!q.show.includes(n)) throw new Error(`VISUALIZE: ${n} deve essere anche in SHOW`) })
  const shown = new Set([...q.show, ...q.group_by, ...(q.timeseries ? ['bucket'] : [])])
  q.order_by.forEach(o => { if (!shown.has(o.field)) throw new Error(`ORDER BY: ${o.field} deve essere in SHOW o GROUP BY`) })

  let range
  if (q.since || q.until) {
    const a = q.since ? relativeDay(q.since, today) : today
    const b = q.until ? relativeDay(q.until, today) : today
    if (!a || !b) throw new Error('SINCE / UNTIL accettano: -7d, -4w, -3m, -1y, today, yesterday o una data AAAA-MM-GG')
    range = [a, b]
  } else {
    const name = q.during || 'last_30_days'
    if (RANGES[name]) range = RANGES[name].get(today)
    else if (isDate(name)) range = [name, name]
    else throw new Error(`DURING: periodo "${name}" sconosciuto. Usa ${Object.keys(RANGES).join(', ')} o una data`)
  }
  if (range[1] < range[0]) throw new Error('Il periodo finisce prima di iniziare')
  if (q.compare && !q.compare.dates && !COMPARES[q.compare.name] && !RANGES[q.compare.name] && !isDate(q.compare.name)) {
    throw new Error(`COMPARE TO: usa previous_period, previous_year, ${Object.keys(RANGES).join(', ')} o una data`)
  }
  if (q.compare?.name && isDate(q.compare.name)) q.compare = { dates: [q.compare.name, q.compare.name] }
  const cmp = compareRange(q.compare, range, today)

  const chart = q.chart || (q.timeseries ? 'line' : q.group_by.length ? 'bar' : 'table')
  return { q, ds, fields, range, compare: cmp, chart, visualize: q.visualize.length ? q.visualize : [q.show[0]] }
}

const toSpec = (r, range) => ({
  from: r.q.from, show: r.q.show, group_by: r.q.group_by, timeseries: r.q.timeseries,
  where: r.q.where, having: r.q.having, order_by: r.q.order_by, limit: r.q.limit,
  start: range[0], end: range[1],
})

const rpc = async (restaurantId, spec) => {
  const { data, error } = await supabase.rpc('analytics_query', { p_restaurant_id: restaurantId, p_spec: spec })
  if (error) throw new Error(error.message?.replace(/^.*?ERROR:\s*/, '') || 'Errore del server')
  return data
}

let catalogCache = null
export async function loadCatalog() {
  if (catalogCache) return catalogCache
  const { data, error } = await supabase.rpc('analytics_catalog')
  if (error) throw new Error('Impossibile caricare i dati disponibili')
  catalogCache = data || []
  return catalogCache
}

const keyOf = (row, dims) => dims.map(d => String(row[d] ?? '')).join('¦')

export const pctChange = (cur, prev) => (prev == null || Number(prev) === 0 || cur == null ? null : ((Number(cur) - Number(prev)) / Math.abs(Number(prev))) * 100)

/** Esegue la query: righe, totali e (se richiesto) il confronto allineato riga per riga. */
export async function runQuery(restaurantId, text, catalog, today) {
  const r = resolveQuery(parseQuery(text), catalog, today)
  const [main, prev] = await Promise.all([
    rpc(restaurantId, toSpec(r, r.range)),
    r.compare ? rpc(restaurantId, toSpec(r, r.compare)) : null,
  ])
  const dims = r.q.group_by
  let rows = main.rows || []
  if (prev) {
    const prevRows = prev.rows || []
    const byKey = new Map(prevRows.map(p => [keyOf(p, dims), p]))
    rows = rows.map((row, idx) => {
      // serie temporale: si confronta l'intervallo nella stessa posizione (es. le 10 di oggi con le 10 di ieri)
      const p = r.q.timeseries && !dims.length ? prevRows[idx] : byKey.get(keyOf(row, dims))
      return { ...row, __prev: p || null }
    })
  }
  return { ...r, rows, totals: main.totals || {}, prevTotals: prev?.totals || null }
}

const lit = (v) => (typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
const periodLit = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? `'${v}'` : v)

/** Query (stessa forma di parseQuery) → testo. Usato dal costruttore visuale: non perde nessuna parte. */
export function serializeQuery(q) {
  const cond = (c) => (c.op === 'IN' || c.op === 'NOT IN') ? `${c.field} ${c.op} (${c.value.map(lit).join(', ')})`
    : c.op.startsWith('IS') ? `${c.field} ${c.op}` : `${c.field} ${c.op} ${lit(c.value)}`
  const lines = [`FROM ${q.from}`, `  SHOW ${q.show.join(', ')}`]
  if (q.where?.length) lines.push(`  WHERE ${q.where.map(cond).join(' AND ')}`)
  if (q.group_by?.length) lines.push(`  GROUP BY ${q.group_by.join(', ')}`)
  if (q.timeseries) {
    const w = [...new Set(['totals', ...(q.with || []), ...(q.compare ? ['percent_change'] : [])])]
    lines.push(`  TIMESERIES ${q.timeseries} WITH ${w.map(x => x.toUpperCase()).join(', ')}`)
  }
  if (q.having?.length) lines.push(`  HAVING ${q.having.map(cond).join(' AND ')}`)
  if (q.since || q.until) lines.push(`  SINCE ${periodLit(q.since || 'today')} UNTIL ${periodLit(q.until || 'today')}`)
  else lines.push(`  DURING ${periodLit(q.during || 'last_30_days')}`)
  if (q.compare) lines.push(`  COMPARE TO ${q.compare.dates ? `'${q.compare.dates[0]}' TO '${q.compare.dates[1]}'` : q.compare.name}`)
  if (q.order_by?.length) lines.push(`  ORDER BY ${q.order_by.map(o => `${o.field} ${o.dir}`).join(', ')}`)
  if (q.limit) lines.push(`  LIMIT ${q.limit}`)
  const vis = q.visualize?.length ? q.visualize : [q.show[0]]
  lines.push(`VISUALIZE ${vis.join(', ')}${q.chart ? ` TYPE ${q.chart}` : ''}`)
  return lines.join('\n')
}

/** Comodità per il costruttore: dai pochi campi scelti al testo completo. */
export function buildQueryText(b) {
  return serializeQuery({
    from: b.from, show: b.show, where: b.where || [], group_by: b.group_by || [], timeseries: b.timeseries || null,
    with: [], having: b.having || [], during: b.during || null, since: b.range?.[0] || null, until: b.range?.[1] || null,
    compare: b.compare ? { name: b.compare } : null, order_by: b.order_by || [], limit: b.limit || null,
    visualize: b.visualize ? [b.visualize] : [], chart: b.chart || null,
  })
}

// ---------- formattazione ----------
const nf = (n, d = 0) => Number(n).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' })
export const CHANNEL_LABELS = { menu: 'Menu QR (cliente)', staff: 'App staff', cassa: 'Cassa (tavolo)', ordini: 'Pannello Ordini', banco: 'Banco' }
export const WEEKDAY_LABELS = ['', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
export const BAND_LABELS = ['', 'Mattina (6-11)', 'Pranzo (11-15)', 'Pomeriggio (15-18)', 'Aperitivo (18-21)', 'Sera (21-24)', 'Notte (0-6)']
const MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
const DOW = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']

export function formatDuration(sec) {
  if (sec == null) return '—'
  const s = Number(sec)
  if (s < 60) return `${Math.round(s)} s`
  if (s < 3600) return `${nf(s / 60, 1)} min`
  const h = Math.floor(s / 3600)
  return `${h} h ${pad(Math.round((s - h * 3600) / 60))} min`
}

export function formatValue(type, v) {
  if (v == null || v === '') return type === 'money' || type === 'number' ? '0' : '—'
  switch (type) {
    case 'money': return `€${nf(v, 2)}`
    case 'percent': return `${nf(v, 1)}%`
    case 'duration': return formatDuration(v)
    case 'number': return Number.isInteger(Number(v)) ? nf(v) : nf(v, 1)
    case 'channel': return CHANNEL_LABELS[v] || v
    case 'weekday': return WEEKDAY_LABELS[v] || v
    case 'band': return BAND_LABELS[v] || v
    case 'hour': return `${pad(v)}:00`
    case 'date': { const [y, m, d] = String(v).split('-'); return `${d}/${m}/${y}` }
    case 'month': { const [y, m] = String(v).split('-'); return `${MONTHS[Number(m) - 1]} ${y}` }
    default: return String(v)
  }
}

/** Etichetta di un intervallo della serie temporale ('2026-11-03T10:00'). */
export function formatBucket(bucket, grain, singleDay) {
  if (!bucket) return '—'
  const [d, t] = bucket.split('T')
  const [y, m, dd] = d.split('-').map(Number)
  const dt = new Date(y, m - 1, dd)
  switch (grain) {
    case 'hour': return singleDay ? t : `${pad(dd)}/${pad(m)} ${t}`
    case 'day': return `${DOW[dt.getDay()]} ${pad(dd)}/${pad(m)}`
    case 'week': return `sett. ${pad(dd)}/${pad(m)}`
    case 'month': return `${MONTHS[m - 1]} ${y}`
    case 'quarter': return `T${Math.floor((m - 1) / 3) + 1} ${y}`
    default: return String(y)
  }
}

export const formatRange = ([a, b]) => (a === b ? formatValue('date', a) : `${formatValue('date', a)} – ${formatValue('date', b)}`)

/** Ordine naturale per le dimensioni di tempo (ore, giorni, fasce) quando non c'è ORDER BY. */
export function naturalSort(rows, dim, type) {
  if (!['hour', 'weekday', 'band', 'date', 'month'].includes(type)) return rows
  const order = type === 'hour' ? (v) => (Number(v) + 18) % 24 : (v) => v // le ore partono dalle 6
  return [...rows].sort((a, b) => (order(a[dim]) > order(b[dim]) ? 1 : order(a[dim]) < order(b[dim]) ? -1 : 0))
}

/** CSV (separatore ;, come Excel in italiano). */
export function toCSV(columns, rows) {
  const esc = (v) => { const s = v == null ? '' : String(v); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  return [columns.map(c => esc(c.label)).join(';'), ...rows.map(r => columns.map(c => esc(c.get(r))).join(';'))].join('\n')
}

// ---------- analisi pronte ----------
export const TEMPLATES = [
  { group: 'Vendite', name: 'Oggi ora per ora, confronto con ieri', query: 'FROM sales\n  SHOW orders, total_sales, average_order_value\n  TIMESERIES hour WITH TOTALS, PERCENT_CHANGE\n  DURING today\n  COMPARE TO yesterday\nVISUALIZE total_sales TYPE line' },
  { group: 'Vendite', name: 'Ultimi 30 giorni, giorno per giorno', query: 'FROM sales\n  SHOW orders, total_sales, average_order_value, gross_profit\n  TIMESERIES day WITH TOTALS, PERCENT_CHANGE\n  DURING last_30_days\n  COMPARE TO previous_period\nVISUALIZE total_sales TYPE line' },
  { group: 'Vendite', name: 'Mese per mese, ultimo anno', query: 'FROM sales\n  SHOW orders, total_sales, average_order_value, margin_percent\n  TIMESERIES month WITH TOTALS\n  DURING last_365_days\nVISUALIZE total_sales TYPE bar' },
  { group: 'Vendite', name: 'Incasso per canale (QR, staff, cassa, banco)', query: 'FROM sales\n  SHOW orders, total_sales, average_order_value, items_per_order\n  GROUP BY channel\n  DURING last_30_days\n  COMPARE TO previous_period\n  ORDER BY total_sales DESC\nVISUALIZE total_sales TYPE bar' },
  { group: 'Vendite', name: 'Per fascia oraria', query: 'FROM sales\n  SHOW orders, total_sales, average_order_value\n  GROUP BY day_part\n  DURING last_30_days\nVISUALIZE total_sales TYPE bar' },
  { group: 'Vendite', name: 'Per giorno della settimana', query: 'FROM sales\n  SHOW orders, total_sales, average_order_value\n  GROUP BY day_of_week\n  DURING last_90_days\nVISUALIZE total_sales TYPE bar' },
  { group: 'Vendite', name: 'Tavoli che incassano di più', query: "FROM sales\n  SHOW orders, total_sales, average_order_value\n  WHERE order_type = 'Tavolo'\n  GROUP BY table\n  DURING last_30_days\n  ORDER BY total_sales DESC\n  LIMIT 20\nVISUALIZE total_sales TYPE bar" },
  { group: 'Vendite', name: 'Margine e costi', query: 'FROM sales\n  SHOW total_sales, cost_of_goods, gross_profit, margin_percent\n  TIMESERIES week WITH TOTALS\n  DURING last_90_days\nVISUALIZE gross_profit TYPE bar' },
  { group: 'Prodotti', name: 'Prodotti più venduti', query: 'FROM products\n  SHOW quantity_sold, product_sales, product_profit, margin_percent\n  GROUP BY product\n  DURING last_30_days\n  ORDER BY quantity_sold DESC\n  LIMIT 20\nVISUALIZE quantity_sold TYPE bar' },
  { group: 'Prodotti', name: 'Categorie: vendite e margine', query: 'FROM products\n  SHOW quantity_sold, product_sales, product_cost, product_profit, margin_percent\n  GROUP BY category\n  DURING last_30_days\n  ORDER BY product_sales DESC\nVISUALIZE product_sales TYPE bar' },
  { group: 'Prodotti', name: 'Prodotti meno venduti', query: 'FROM products\n  SHOW quantity_sold, product_sales\n  GROUP BY product\n  DURING last_90_days\n  ORDER BY quantity_sold ASC\n  LIMIT 20\nVISUALIZE quantity_sold TYPE bar' },
  { group: 'Menu e clienti', name: 'Prodotti visti ma poco aperti', query: 'FROM menu\n  SHOW views, opens, open_rate, cart_adds\n  GROUP BY product\n  HAVING views >= 20\n  DURING last_30_days\n  ORDER BY open_rate ASC\n  LIMIT 20\nVISUALIZE open_rate TYPE bar' },
  { group: 'Menu e clienti', name: 'Il percorso nel menu per fascia oraria', query: 'FROM menu\n  SHOW views, opens, cart_adds, ordered_quantity, open_rate\n  GROUP BY day_part\n  DURING last_30_days\nVISUALIZE opens TYPE bar' },
  { group: 'Menu e clienti', name: 'Visite al menu giorno per giorno', query: 'FROM visits\n  SHOW visits, product_opens, median_time_on_menu\n  TIMESERIES day WITH TOTALS, PERCENT_CHANGE\n  DURING last_30_days\n  COMPARE TO previous_period\nVISUALIZE visits TYPE line' },
  { group: 'Menu e clienti', name: 'Visite per ora del giorno', query: 'FROM visits\n  SHOW visits, product_opens\n  GROUP BY hour_of_day\n  DURING last_90_days\nVISUALIZE visits TYPE bar' },
  { group: 'Menu e clienti', name: 'Prodotti più aperti nel menu', query: 'FROM visits\n  SHOW product_opens, favorites_added\n  GROUP BY product\n  DURING last_90_days\n  ORDER BY product_opens DESC\n  LIMIT 20\nVISUALIZE product_opens TYPE bar' },
  { group: 'Menu e clienti', name: 'iPhone o Android', query: 'FROM visits\n  SHOW visits\n  GROUP BY os\n  DURING last_365_days\nVISUALIZE visits TYPE bar' },
  { group: 'Staff e servizio', name: 'Chi prende più ordini', query: 'FROM sales\n  SHOW orders, total_sales, average_order_value, items_per_order\n  GROUP BY taken_by\n  DURING last_30_days\n  ORDER BY orders DESC\nVISUALIZE orders TYPE bar' },
  { group: 'Staff e servizio', name: 'Tempi di preparazione per persona', query: 'FROM kitchen\n  SHOW batches, median_prep_time, p90_prep_time\n  GROUP BY prepared_by\n  DURING last_30_days\n  ORDER BY batches DESC\nVISUALIZE median_prep_time TYPE bar' },
  { group: 'Staff e servizio', name: 'Attesa approvazione per ora', query: 'FROM service\n  SHOW approved_orders, median_approval_time, avg_approval_time\n  GROUP BY hour_of_day\n  DURING last_30_days\nVISUALIZE median_approval_time TYPE bar' },
  { group: 'Staff e servizio', name: 'Permanenza al tavolo per giorno', query: 'FROM service\n  SHOW orders, median_table_time\n  GROUP BY day_of_week\n  DURING last_90_days\nVISUALIZE median_table_time TYPE bar' },
]
