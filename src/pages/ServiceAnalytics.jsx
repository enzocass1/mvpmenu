import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { BarChart, Bar, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import useAnalyticsRestaurant from '../hooks/useAnalyticsRestaurant'
import { TIME_RANGE_OPTIONS, getDateRangeFromTimeRange } from '../utils/analytics'

/**
 * Staff e Servizio: chi prende, approva, prepara e chiude gli ordini, da dove arrivano
 * (menu QR, app staff, cassa, banco) e quanto tempo servono, anche per fascia oraria.
 * Dati: ordini e comande, aggregati dal database con service_report().
 */

const DAY_MS = 24 * 60 * 60 * 1000
const toDay = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }
const fromDay = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
// Somma giorni di calendario (non 24 ore fisse: col cambio dell'ora legale slitterebbe di un giorno)
const addDays = (s, n) => { const x = fromDay(s); x.setDate(x.getDate() + n); return toDay(x) }
const fmtNum = (n) => Number(n || 0).toLocaleString('it-IT')
const fmtDec = (n) => (n == null ? '—' : Number(n).toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }))
const fmtEur = (n) => `€${Number(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtPct = (v) => (v == null ? '—' : `${v.toFixed(1).replace('.', ',')}%`)
const toMin = (sec) => (sec == null ? null : Math.round((sec / 60) * 10) / 10)
// Durata leggibile: 45 s, 3,4 min, 1 h 05 min
const fmtDur = (sec) => {
  if (sec == null) return '—'
  if (sec < 60) return `${Math.round(sec)} s`
  if (sec < 3600) return `${fmtDec(sec / 60)} min`
  const h = Math.floor(sec / 3600)
  return `${h} h ${String(Math.round((sec - h * 3600) / 60)).padStart(2, '0')} min`
}
const hh = (h) => `${String(h).padStart(2, '0')}:00`
const WEEKDAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
// Fasce orarie di un bar/ristorante (ora di fine esclusa), come nel Conversion Funnel
const BANDS = [
  { label: 'Mattina', from: 6, to: 11 },
  { label: 'Pranzo', from: 11, to: 15 },
  { label: 'Pomeriggio', from: 15, to: 18 },
  { label: 'Aperitivo', from: 18, to: 21 },
  { label: 'Sera', from: 21, to: 24 },
  { label: 'Notte', from: 0, to: 6 },
]
const DAY_ORDER = [...Array(18).keys()].map(i => i + 6).concat([0, 1, 2, 3, 4, 5])
const CHANNELS = {
  menu: { label: 'Tavolo · menu QR', hint: 'ordinato dal cliente con il QR' },
  staff: { label: 'Tavolo · app staff', hint: 'preso dal cameriere' },
  cassa: { label: 'Tavolo · cassa', hint: 'aperto dalla cassa' },
  ordini: { label: 'Tavolo · pannello Ordini', hint: 'creato dal titolare' },
  banco: { label: 'Banco', hint: 'battuto in cassa al banco' },
}
const PREP_BUCKETS = ['meno di 5 min', '5–10 min', '10–15 min', '15–20 min', '20–30 min', 'oltre 30 min']
const APPROVAL_BUCKETS = ['meno di 1 min', '1–3 min', '3–5 min', '5–10 min', 'oltre 10 min']
const EMPTY_TIMING = { n: 0, avg: null, median: null, p90: null }
const EMPTY = {
  totals: { orders: 0, revenue: 0, paid_orders: 0, pezzi: 0, pezzi_medi: null, comande_medie: null, tavoli: 0, banco: 0, non_pagati: 0, importo_perso: 0, rifiutati: 0 },
  timings: { approval: EMPTY_TIMING, prep: EMPTY_TIMING, first_ready: EMPTY_TIMING, stay: EMPTY_TIMING },
  by_channel: [], by_staff: [], by_hour: [], by_weekday: [], by_staff_hour: [], prep_buckets: [], approval_buckets: [], slowest: [],
}

// null = errore di caricamento (diverso da "nessun ordine")
const loadReport = async (restaurantId, startDay, endDay) => {
  const { data, error } = await supabase.rpc('service_report', { p_restaurant_id: restaurantId, p_start: startDay, p_end: endDay })
  if (error) { console.error('Errore report servizio:', error); return null }
  return data || EMPTY
}

// Ore in ordine di giornata del locale, senza le ore vuote all'inizio e alla fine
const hourSeries = (rows, value) => {
  const m = new Map((rows || []).map(r => [r.hour, r]))
  const has = (h) => (m.get(h)?.orders || 0) > 0
  const first = DAY_ORDER.findIndex(has)
  if (first < 0) return []
  const last = DAY_ORDER.length - 1 - [...DAY_ORDER].reverse().findIndex(has)
  return DAY_ORDER.slice(first, last + 1).map(h => value(h, m.get(h)))
}

const bandRows = (byHour) => BANDS.map(b => {
  const rows = (byHour || []).filter(h => h.hour >= b.from && h.hour < b.to)
  const sum = (k) => rows.reduce((s, r) => s + Number(r[k] || 0), 0)
  // medie pesate sul numero di ordini / comande di ogni ora
  const wavg = (k, w) => {
    const tot = rows.reduce((s, r) => s + (r[k] != null ? Number(r[w] || 0) : 0), 0)
    return tot > 0 ? rows.reduce((s, r) => s + (r[k] != null ? Number(r[k]) * Number(r[w] || 0) : 0), 0) / tot : null
  }
  const orders = sum('orders')
  return {
    ...b, orders, pezzi: sum('pezzi'), revenue: sum('revenue'),
    pezziMedi: orders > 0 ? sum('pezzi') / orders : null,
    approval: wavg('approvazione_media', 'approvazioni'), prep: wavg('preparazione_media', 'comande'),
  }
}).filter(b => b.orders > 0)

function ServiceAnalytics() {
  const navigate = useNavigate()
  const restaurant = useAnalyticsRestaurant()

  const [timeRange, setTimeRange] = useState('last30days')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState(EMPTY)
  const [prev, setPrev] = useState(EMPTY)
  const [loadError, setLoadError] = useState(false)
  const [sort, setSort] = useState({ key: 'gestiti', dir: 'desc' })
  const [person, setPerson] = useState(null)

  useEffect(() => {
    if (!restaurant) return
    const range = getDateRangeFromTimeRange(timeRange, customStartDate, customEndDate)
    if (!range) return
    const startDay = toDay(range.startDate)
    const endDay = toDay(range.endDate)
    const days = Math.round((fromDay(endDay) - fromDay(startDay)) / DAY_MS) + 1
    const prevEnd = addDays(startDay, -1)
    const prevStart = addDays(startDay, -days)
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [cur, before] = await Promise.all([
        loadReport(restaurant.id, startDay, endDay),
        loadReport(restaurant.id, prevStart, prevEnd),
      ])
      if (cancelled) return
      setLoadError(!cur)
      setReport(cur || EMPTY)
      setPrev(before || EMPTY)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [restaurant, timeRange, customStartDate, customEndDate])

  useEffect(() => {
    if (!person) return
    const onKey = (e) => { if (e.key === 'Escape') setPerson(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [person])

  const t = report.totals
  const tm = report.timings
  const pt = prev.totals
  const ptm = prev.timings

  const hourly = useMemo(() => hourSeries(report.by_hour, (h, r) => ({
    ora: hh(h),
    Ordini: r?.orders || 0,
    'Preparazione (min)': toMin(r?.preparazione_media),
    'Approvazione (min)': toMin(r?.approvazione_media),
  })), [report])
  const bands = useMemo(() => bandRows(report.by_hour), [report])
  const weekdays = useMemo(() => WEEKDAYS.map((name, i) => {
    const r = report.by_weekday.find(w => w.weekday === i + 1)
    return { giorno: name.slice(0, 3), Ordini: r?.orders || 0, 'Approvazione (min)': toMin(r?.approvazione_media) }
  }), [report])
  const prepBuckets = PREP_BUCKETS.map((label, i) => ({ label, Comande: report.prep_buckets.find(b => b.ord === i + 1)?.comande || 0 }))
  const approvalBuckets = APPROVAL_BUCKETS.map((label, i) => ({ label, Ordini: report.approval_buckets.find(b => b.ord === i + 1)?.ordini || 0 }))

  const people = [...report.by_staff].sort((a, b) => {
    const va = a[sort.key] ?? -1, vb = b[sort.key] ?? -1
    if (typeof va === 'string') return sort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    return sort.dir === 'asc' ? va - vb : vb - va
  })

  if (!restaurant) return null

  // Confronto col periodo precedente; per i tempi "meno" è meglio
  const Badge = ({ current, previous, lowerIsBetter = false }) => {
    if (previous == null || previous === 0 || current == null) return <span style={styles.badgeNeutral}>nessun dato nel periodo precedente</span>
    const g = ((current - previous) / previous) * 100
    if (Math.abs(g) < 0.05) return <span style={styles.badgeNeutral}>→ 0% vs periodo precedente</span>
    const good = lowerIsBetter ? g < 0 : g > 0
    return <span style={{ ...styles.badgeNeutral, color: good ? '#10B981' : '#EF4444' }}>{g > 0 ? '↑' : '↓'} {Math.abs(g).toFixed(1)}% vs periodo precedente</span>
  }

  const avgTicket = t.paid_orders > 0 ? t.revenue / t.paid_orders : null
  const cards = [
    { label: 'Ordini', value: fmtNum(t.orders), help: `${fmtNum(t.tavoli)} al tavolo · ${fmtNum(t.banco)} al banco`, cur: t.orders, prev: pt.orders },
    { label: 'Incasso', value: fmtEur(t.revenue), help: `scontrino medio ${avgTicket == null ? '—' : fmtEur(avgTicket)}`, cur: t.revenue, prev: pt.revenue },
    { label: 'Pezzi per ordine', value: fmtDec(t.pezzi_medi), help: `${fmtNum(t.pezzi)} pezzi · ${fmtDec(t.comande_medie)} comande per tavolo`, cur: t.pezzi_medi, prev: pt.pezzi_medi },
    { label: 'Attesa approvazione', value: fmtDur(tm.approval.median), help: tm.approval.n ? `ordini dal QR · 9 su 10 entro ${fmtDur(tm.approval.p90)}` : 'ordini dal QR approvati dallo staff', cur: tm.approval.median, prev: ptm.approval.median, lower: true },
    { label: 'Preparazione comanda', value: fmtDur(tm.prep.median), help: tm.prep.n ? `${fmtNum(tm.prep.n)} comande · 9 su 10 entro ${fmtDur(tm.prep.p90)}` : 'da quando parte a quando è pronta', cur: tm.prep.median, prev: ptm.prep.median, lower: true },
    { label: 'Permanenza al tavolo', value: fmtDur(tm.stay.median), help: tm.stay.n ? `dal primo ordine alla chiusura · media ${fmtDur(tm.stay.avg)}` : 'dal primo ordine alla chiusura', cur: tm.stay.median, prev: ptm.stay.median },
  ]

  const SortTh = ({ k, children, align = 'right' }) => (
    <th
      style={{ ...styles.th, textAlign: align, cursor: 'pointer', color: sort.key === k ? '#000' : '#666' }}
      onClick={() => setSort(s => ({ key: k, dir: s.key === k && s.dir === 'desc' ? 'asc' : 'desc' }))}
    >
      {children}{sort.key === k ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
    </th>
  )
  const Th = ({ children, align = 'right' }) => <th style={{ ...styles.th, textAlign: align, color: '#666' }}>{children}</th>

  const tooltipStyle = { background: '#FFF', border: '1px solid #E0E0E0', borderRadius: '4px' }

  // Ordini (barre) + tempi medi in minuti (linee) per ora o giorno
  const OrdersAndTimes = ({ data, x, height = 300, lines }) => (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
        <XAxis dataKey={x} style={{ fontSize: '12px' }} interval={0} angle={data.length > 10 ? -45 : 0} textAnchor={data.length > 10 ? 'end' : 'middle'} height={data.length > 10 ? 50 : 30} />
        <YAxis yAxisId="n" style={{ fontSize: '12px' }} allowDecimals={false} />
        <YAxis yAxisId="min" orientation="right" style={{ fontSize: '12px' }} unit=" min" width={60} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Bar yAxisId="n" dataKey="Ordini" fill="#000000" radius={[3, 3, 0, 0]} />
        {lines.map(([key, color]) => (
          <Line key={key} yAxisId="min" type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  )

  const SimpleBars = ({ data, dataKey, color }) => (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
        <XAxis dataKey="label" style={{ fontSize: '11px' }} interval={0} />
        <YAxis style={{ fontSize: '12px' }} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )

  const BandTable = ({ rows }) => {
    const top = rows.reduce((m, r) => (r.orders > (m?.orders ?? -1) ? r : m), null)
    return (
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <Th align="left">Fascia</Th>
              <Th>Ordini</Th>
              <Th>Pezzi per ordine</Th>
              <Th>Incasso</Th>
              <Th>Attesa approvazione</Th>
              <Th>Preparazione</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.label} style={{ ...styles.tr, background: r === top ? '#F9FAFB' : 'transparent' }}>
                <td style={styles.td}>
                  <div style={{ fontWeight: 600 }}>{r.label}{r === top ? <span style={styles.topTag}>più ordini</span> : null}</div>
                  <div style={{ fontSize: 12, color: '#999' }}>{hh(r.from)} – {hh(r.to % 24)}</div>
                </td>
                <td style={styles.tdNum}>{fmtNum(r.orders)}</td>
                <td style={styles.tdNum}>{fmtDec(r.pezziMedi)}</td>
                <td style={styles.tdNum}>{fmtEur(r.revenue)}</td>
                <td style={styles.tdNum}>{fmtDur(r.approval)}</td>
                <td style={styles.tdNum}>{fmtDur(r.prep)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const personHours = person ? hourSeries(
    report.by_staff_hour.filter(r => r.key === person.key),
    (h, r) => ({ ora: hh(h), Ordini: r?.orders || 0 })
  ) : []

  const hasData = t.orders > 0

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate('/analytics')} style={styles.backButton}>← Analytics</button>
        <h1 style={styles.title}>Staff e Servizio</h1>
        <p style={styles.subtitle}>
          Chi <strong>prende</strong>, <strong>approva</strong>, <strong>prepara</strong> e <strong>chiude</strong> gli ordini, da dove arrivano
          (menu QR, app staff, cassa, banco) e <strong>quanto tempo</strong> servono — anche per fascia oraria e giorno della settimana.
        </p>
      </div>

      <div style={styles.filtersContainer}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Periodo</label>
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} style={styles.select}>
            {TIME_RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {timeRange === 'custom' && (
          <>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Data inizio</label>
              <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} style={styles.dateInput} />
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Data fine</label>
              <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} style={styles.dateInput} />
            </div>
          </>
        )}
      </div>

      {loading ? (
        <div style={styles.loading}>Caricamento...</div>
      ) : loadError ? (
        <div style={styles.emptyCard}>
          <h2 style={styles.chartTitle}>Impossibile caricare i dati</h2>
          <p style={styles.emptyText}>Controlla la connessione e riprova tra qualche istante. Se il problema continua, scrivici dalla sezione Assistenza.</p>
        </div>
      ) : !hasData ? (
        <div style={styles.emptyCard}>
          <h2 style={styles.chartTitle}>Ancora nessun ordine in questo periodo</h2>
          <p style={styles.emptyText}>
            I dati si raccolgono da soli con gli ordini: chi li prende (menu QR, app staff o cassa), chi li approva, chi segna le comande preparate e chi chiude il tavolo, con i tempi di ogni passaggio.
            In cassa scegli in alto chi la sta usando, così ogni scontrino viene attribuito alla persona giusta.
          </p>
        </div>
      ) : (
        <>
          <div style={styles.statsGrid}>
            {cards.map(c => (
              <div key={c.label} style={styles.statCard}>
                <div style={styles.statLabel}>{c.label}</div>
                <div style={styles.statValue}>{c.value}</div>
                <div style={styles.statHelper}>{c.help}</div>
                <Badge current={c.cur} previous={c.prev} lowerIsBetter={c.lower} />
              </div>
            ))}
          </div>

          {(t.rifiutati > 0 || t.non_pagati > 0) && (
            <div style={styles.alertRow}>
              {t.rifiutati > 0 && <span><strong>{fmtNum(t.rifiutati)}</strong> ordini dal QR rifiutati dallo staff (ordini non verificati)</span>}
              {t.non_pagati > 0 && <span><strong>{fmtNum(t.non_pagati)}</strong> tavoli chiusi non pagati · incasso perso <strong>{fmtEur(t.importo_perso)}</strong></span>}
            </div>
          )}

          {/* Canali */}
          <div style={styles.chartCard}>
            <h2 style={styles.chartTitle}>Da dove arrivano gli ordini</h2>
            <p style={styles.chartHint}>Ogni canale con i suoi numeri: quanti ordini, quanto incassano e quanto velocemente vengono serviti.</p>
            {report.by_channel.map(c => {
              const share = t.orders > 0 ? (c.orders / t.orders) * 100 : 0
              return (
                <div key={c.channel} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6, gap: 12, flexWrap: 'wrap' }}>
                    <span><strong>{CHANNELS[c.channel]?.label || c.channel}</strong> <span style={{ color: '#999', fontSize: 12 }}>{CHANNELS[c.channel]?.hint}</span></span>
                    <span style={{ color: '#666' }}>{fmtNum(c.orders)} ordini · {fmtPct(share)}</span>
                  </div>
                  <div style={{ height: 12, background: '#F5F5F5', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(1, share)}%`, height: '100%', background: c.channel === 'menu' ? '#000' : c.channel === 'banco' ? '#16A34A' : '#6B7280', borderRadius: 99 }} />
                  </div>
                </div>
              )
            })}
            <div style={{ ...styles.tableWrapper, marginTop: 20 }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <Th align="left">Canale</Th>
                    <Th>Ordini</Th>
                    <Th>Incasso</Th>
                    <Th>Scontrino medio</Th>
                    <Th>Pezzi per ordine</Th>
                    <Th>Attesa approvazione</Th>
                    <Th>Primo piatto pronto</Th>
                    <Th>Permanenza</Th>
                  </tr>
                </thead>
                <tbody>
                  {report.by_channel.map(c => (
                    <tr key={c.channel} style={styles.tr}>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{CHANNELS[c.channel]?.label || c.channel}</td>
                      <td style={styles.tdNum}>{fmtNum(c.orders)}</td>
                      <td style={styles.tdNum}>{fmtEur(c.revenue)}</td>
                      <td style={styles.tdNum}>{c.paid_orders > 0 ? fmtEur(c.revenue / c.paid_orders) : '—'}</td>
                      <td style={styles.tdNum}>{fmtDec(c.pezzi_medi)}</td>
                      <td style={styles.tdNum}>{fmtDur(c.approvazione_media)}</td>
                      <td style={styles.tdNum}>{fmtDur(c.primo_pronto_medio)}</td>
                      <td style={styles.tdNum}>{fmtDur(c.permanenza_media)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Staff */}
          <div style={styles.tableContainer}>
            <h2 style={styles.sectionTitle}>Staff</h2>
            <p style={styles.chartHint}>Cosa ha fatto ogni persona nel periodo. Clicca una persona per vedere le sue ore di lavoro.</p>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <SortTh k="name" align="left">Persona</SortTh>
                    <SortTh k="presi">Ordini presi</SortTh>
                    <SortTh k="approvati">Ordini QR approvati</SortTh>
                    <SortTh k="comande">Comande aggiunte</SortTh>
                    <SortTh k="preparate">Comande preparate</SortTh>
                    <SortTh k="chiusi">Tavoli chiusi</SortTh>
                    <SortTh k="rifiutati">Rifiutati</SortTh>
                    <SortTh k="non_pagati">Non pagati</SortTh>
                  </tr>
                </thead>
                <tbody>
                  {people.map(p => (
                    <tr key={p.key} style={{ ...styles.tr, cursor: 'pointer' }} onClick={() => setPerson(p)}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: '#999' }}>{p.role}</div>
                      </td>
                      <td style={styles.tdNum}>{fmtNum(p.presi)}<div style={styles.tdSub}>{fmtEur(p.presi_incasso)}</div></td>
                      <td style={styles.tdNum}>{fmtNum(p.approvati)}<div style={styles.tdSub}>{p.approvati ? `attesa ${fmtDur(p.approvazione_media)}` : ' '}</div></td>
                      <td style={styles.tdNum}>{fmtNum(p.comande)}<div style={styles.tdSub}>{p.comande ? `${fmtNum(p.comande_pezzi)} pezzi` : ' '}</div></td>
                      <td style={styles.tdNum}>{fmtNum(p.preparate)}<div style={styles.tdSub}>{p.preparate ? `in ${fmtDur(p.preparazione_media)}` : ' '}</div></td>
                      <td style={styles.tdNum}>{fmtNum(p.chiusi)}<div style={styles.tdSub}>{fmtEur(p.chiusi_incasso)}</div></td>
                      <td style={styles.tdNum}>{fmtNum(p.rifiutati)}</td>
                      <td style={styles.tdNum}>{fmtNum(p.non_pagati)}<div style={styles.tdSub}>{p.non_pagati ? fmtEur(p.non_pagati_importo) : ' '}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={styles.footnote}>
              Ordini presi: creati dalla persona (app staff, cassa o banco), con il loro incasso. Ordini QR approvati: ordini dei clienti dal menu confermati
              dalla persona, con il tempo medio di attesa del cliente. Comande preparate: con il tempo medio di preparazione. Tavoli chiusi: con l'incassato. Nell'app staff conta il cameriere collegato; in cassa la persona scelta in alto alla voce "In cassa".
            </p>
          </div>

          <div style={{ height: 32 }} />

          {/* Fasce orarie */}
          <div style={styles.chartCard}>
            <h2 style={styles.chartTitle}>Per fascia oraria</h2>
            <p style={styles.chartHint}>Quanti ordini arrivano ogni ora e quanto aspettano i clienti: nelle ore di punta si vede subito se serve una persona in più.</p>
            <OrdersAndTimes data={hourly} x="ora" lines={[['Preparazione (min)', '#16A34A'], ['Approvazione (min)', '#F59E0B']]} />
            <div style={{ marginTop: 20 }}><BandTable rows={bands} /></div>
          </div>

          {/* Distribuzione dei tempi */}
          <div style={styles.insightsGrid}>
            <div style={styles.insightCard}>
              <h3 style={styles.insightTitle}>Tempi di preparazione</h3>
              <p style={styles.insightHint}>Quante comande sono state pronte in ogni intervallo di tempo.</p>
              <SimpleBars data={prepBuckets} dataKey="Comande" color="#16A34A" />
            </div>
            <div style={styles.insightCard}>
              <h3 style={styles.insightTitle}>Attesa approvazione</h3>
              <p style={styles.insightHint}>Quanto hanno aspettato i clienti prima che lo staff approvasse l'ordine dal QR.</p>
              <SimpleBars data={approvalBuckets} dataKey="Ordini" color="#F59E0B" />
            </div>
          </div>

          {/* Giorni della settimana */}
          <div style={styles.chartCard}>
            <h2 style={styles.chartTitle}>Per giorno della settimana</h2>
            <OrdersAndTimes data={weekdays} x="giorno" height={260} lines={[['Approvazione (min)', '#F59E0B']]} />
          </div>

          {/* Comande più lente */}
          <div style={styles.tableContainer}>
            <h2 style={styles.sectionTitle}>Comande più lente</h2>
            <p style={styles.chartHint}>Le comande che hanno impiegato più tempo a essere pronte: utili per capire cosa rallenta la cucina o il bar.</p>
            {report.slowest.length === 0 ? (
              <p style={styles.insightEmpty}>Nessuna comanda segnata come preparata nel periodo.</p>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <Th align="left">Ordine</Th>
                      <Th align="left">Quando</Th>
                      <Th>Pezzi</Th>
                      <Th>Tempo</Th>
                      <Th align="left">Segnata pronta da</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.slowest.map(s => (
                      <tr key={`${s.order_number}-${s.batch_number}`} style={styles.tr}>
                        <td style={styles.td}>
                          <div style={{ fontWeight: 600 }}>#{s.order_number}{s.table_number ? ` · Tavolo ${s.table_number}` : ''}</div>
                          <div style={{ fontSize: 12, color: '#999' }}>Comanda {s.batch_number} · {CHANNELS[s.channel]?.label || s.channel}</div>
                        </td>
                        <td style={styles.td}>{s.quando}</td>
                        <td style={styles.tdNum}>{fmtNum(s.pezzi)}</td>
                        <td style={{ ...styles.tdNum, fontWeight: 700, color: '#EF4444' }}>{fmtDur(s.prep_sec)}</td>
                        <td style={styles.td}>{s.preparato_da}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p style={styles.footnote}>
              Attesa approvazione: da quando il cliente invia l'ordine dal QR a quando lo staff lo approva. Preparazione: da quando la comanda parte
              (approvazione o invio in cucina) a quando viene segnata "preparata". Primo piatto pronto: dall'ordine alla prima comanda pronta.
              Permanenza: dal primo ordine alla chiusura del tavolo in cassa. Gli ordini annullati non sono conteggiati. Orari in ora italiana.
            </p>
          </div>
        </>
      )}

      {/* Dettaglio persona */}
      {person && (
        <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) setPerson(null) }}>
          <div style={styles.modal} role="dialog" aria-modal="true">
            <div style={styles.modalHeader}>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ ...styles.chartTitle, margin: 0 }}>{person.name}</h2>
                <div style={{ fontSize: 13, color: '#999' }}>{person.role}</div>
              </div>
              <button onClick={() => setPerson(null)} style={styles.modalClose} aria-label="Chiudi">×</button>
            </div>
            <div style={styles.miniStats}>
              {[
                ['Ordini presi', fmtNum(person.presi), fmtEur(person.presi_incasso)],
                ['Ordini QR approvati', fmtNum(person.approvati), person.approvati ? `attesa media ${fmtDur(person.approvazione_media)}` : null],
                ['Comande preparate', fmtNum(person.preparate), person.preparate ? `in media ${fmtDur(person.preparazione_media)}` : null],
                ['Tavoli chiusi', fmtNum(person.chiusi), fmtEur(person.chiusi_incasso)],
              ].map(([l, v, sub]) => (
                <div key={l} style={styles.miniStat}>
                  <div style={styles.statLabel}>{l}</div>
                  <div style={{ fontSize: 22, fontWeight: 600 }}>{v}</div>
                  {sub && <div style={{ fontSize: 12, color: '#666' }}>{sub}</div>}
                </div>
              ))}
            </div>
            <h3 style={styles.modalSection}>Ordini seguiti per ora</h3>
            <p style={{ ...styles.chartHint, margin: '0 0 12px 0' }}>Ordini presi, approvati, con comande aggiunte o chiusi dalla persona, ora per ora.</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={personHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis dataKey="ora" style={{ fontSize: '12px' }} interval={0} angle={personHours.length > 10 ? -45 : 0} textAnchor={personHours.length > 10 ? 'end' : 'middle'} height={personHours.length > 10 ? 50 : 30} />
                <YAxis style={{ fontSize: '12px' }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="Ordini" fill="#000000" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {(person.comande > 0 || person.rifiutati > 0 || person.non_pagati > 0) && (
              <p style={{ fontSize: 13, color: '#666', margin: '12px 0 0 0', lineHeight: 1.6 }}>
                {person.comande > 0 && <>Comande aggiunte ai tavoli: <strong>{fmtNum(person.comande)}</strong> ({fmtNum(person.comande_pezzi)} pezzi). </>}
                {person.rifiutati > 0 && <>Ordini rifiutati: <strong>{fmtNum(person.rifiutati)}</strong>. </>}
                {person.non_pagati > 0 && <>Tavoli chiusi non pagati: <strong>{fmtNum(person.non_pagati)}</strong> ({fmtEur(person.non_pagati_importo)}).</>}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#FFFFFF', padding: '40px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' },
  header: { maxWidth: '1200px', margin: '0 auto 40px auto' },
  backButton: { background: 'none', border: 'none', fontSize: '16px', color: '#666', cursor: 'pointer', padding: '8px 0', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500', outline: 'none' },
  title: { fontSize: '24px', fontWeight: '400', color: '#000000', margin: '0 0 12px 0' },
  subtitle: { fontSize: '14px', color: '#666', margin: 0, lineHeight: '1.6', maxWidth: 760 },
  filtersContainer: { maxWidth: '1200px', margin: '0 auto 32px auto', display: 'flex', gap: '16px', flexWrap: 'wrap' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  filterLabel: { fontSize: '13px', fontWeight: '500', color: '#000' },
  select: { padding: '10px 14px', fontSize: '14px', border: '1px solid #E0E0E0', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#000', cursor: 'pointer', outline: 'none', minWidth: '180px' },
  dateInput: { padding: '10px 14px', fontSize: '14px', border: '1px solid #E0E0E0', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#000', outline: 'none' },
  loading: { maxWidth: '1200px', margin: '60px auto', textAlign: 'center', fontSize: '16px', color: '#666' },
  emptyCard: { maxWidth: '1200px', margin: '0 auto', border: '1px solid #E0E0E0', borderRadius: '8px', padding: '32px' },
  emptyText: { fontSize: 14, color: '#666', lineHeight: 1.6, margin: 0, maxWidth: 700 },
  statsGrid: { maxWidth: '1200px', margin: '0 auto 24px auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' },
  statCard: { background: '#F5F5F5', borderRadius: '8px', padding: '24px' },
  statLabel: { fontSize: '13px', color: '#666', marginBottom: '8px', fontWeight: '500' },
  statValue: { fontSize: '28px', fontWeight: '600', color: '#000', marginBottom: '6px' },
  statHelper: { fontSize: '13px', color: '#374151', marginBottom: '8px' },
  badgeNeutral: { fontSize: '12px', color: '#999', fontWeight: '600' },
  alertRow: { maxWidth: '1200px', margin: '0 auto 32px auto', display: 'flex', flexWrap: 'wrap', gap: '8px 24px', fontSize: 14, color: '#374151', background: '#FEF3C7', borderRadius: 8, padding: '14px 18px', boxSizing: 'border-box' },
  chartCard: { maxWidth: '1200px', margin: '0 auto 32px auto', background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '8px', padding: '24px', boxSizing: 'border-box' },
  chartTitle: { fontSize: '16px', fontWeight: '500', color: '#000', margin: '0 0 20px 0' },
  chartHint: { fontSize: '13px', color: '#666', margin: '-12px 0 16px 0', lineHeight: 1.5 },
  topTag: { marginLeft: 8, fontSize: 11, fontWeight: 700, color: '#fff', background: '#000', borderRadius: 99, padding: '2px 8px', verticalAlign: 'middle' },
  insightsGrid: { maxWidth: '1200px', margin: '0 auto 32px auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '16px' },
  insightCard: { border: '1px solid #E0E0E0', borderRadius: '8px', padding: '20px 24px', minWidth: 0 },
  insightTitle: { fontSize: '16px', fontWeight: '600', margin: '0 0 6px 0' },
  insightHint: { fontSize: '13px', color: '#666', margin: '0 0 14px 0', lineHeight: 1.5 },
  insightEmpty: { fontSize: '14px', color: '#10B981', margin: 0 },
  tableContainer: { maxWidth: '1200px', margin: '0 auto 32px auto', background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '8px', padding: '24px', boxSizing: 'border-box' },
  sectionTitle: { fontSize: '18px', fontWeight: '500', color: '#000', margin: '0 0 20px 0' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px 14px', fontSize: '13px', fontWeight: '500', borderBottom: '2px solid #E0E0E0', whiteSpace: 'nowrap', userSelect: 'none' },
  tr: { borderBottom: '1px solid #F5F5F5' },
  td: { padding: '12px 14px', fontSize: '14px', color: '#000' },
  tdNum: { padding: '12px 14px', fontSize: '14px', color: '#000', textAlign: 'right', whiteSpace: 'nowrap' },
  tdSub: { fontSize: 12, color: '#999', marginTop: 2 },
  footnote: { fontSize: '12px', color: '#999', lineHeight: 1.6, margin: '16px 0 0 0' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' },
  modal: { background: '#FFF', borderRadius: 12, width: '100%', maxWidth: 880, padding: 24, boxSizing: 'border-box', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 18 },
  modalClose: { background: 'none', border: '1px solid #E0E0E0', borderRadius: '50%', width: 36, height: 36, minWidth: 36, padding: 0, boxSizing: 'border-box', aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, lineHeight: 1, cursor: 'pointer', color: '#666', flexShrink: 0 },
  modalSection: { fontSize: 15, fontWeight: 600, margin: '24px 0 12px 0' },
  miniStats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 },
  miniStat: { background: '#F5F5F5', borderRadius: 8, padding: '14px 16px' },
}

export default ServiceAnalytics
