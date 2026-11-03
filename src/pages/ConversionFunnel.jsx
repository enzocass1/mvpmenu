import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { fetchAllRows } from '../lib/fetchAllRows'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import useAnalyticsRestaurant from '../hooks/useAnalyticsRestaurant'
import { TIME_RANGE_OPTIONS, getDateRangeFromTimeRange } from '../utils/analytics'

/**
 * Conversion Funnel: il percorso di ogni prodotto nel menu pubblico.
 * Visualizzato (scheda vista nella lista) -> Aperto -> Aggiunto al carrello -> Ordinato.
 * Dati: tabella product_stats_daily (contatori giornalieri, vedi src/lib/productStats.js).
 */

const DAY_MS = 24 * 60 * 60 * 1000
const toDay = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }
const fromDay = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const pct = (a, b) => (b > 0 ? (a / b) * 100 : null)
const fmtPct = (v) => (v == null ? '—' : `${v.toFixed(1).replace('.', ',')}%`)
const fmtNum = (n) => Number(n || 0).toLocaleString('it-IT')
const EMPTY = { impressions: 0, opens: 0, cart_adds: 0, cart_qty: 0, ordered_qty: 0 }

const sumRows = (rows) => rows.reduce((t, r) => ({
  impressions: t.impressions + r.impressions,
  opens: t.opens + r.opens,
  cart_adds: t.cart_adds + r.cart_adds,
  cart_qty: t.cart_qty + r.cart_qty,
  ordered_qty: t.ordered_qty + r.ordered_qty,
}), { ...EMPTY })

const loadStats = (restaurantId, startDay, endDay) => fetchAllRows(() => supabase
  .from('product_stats_daily')
  .select('product_id, day, impressions, opens, cart_adds, cart_qty, ordered_qty')
  .eq('restaurant_id', restaurantId)
  .gte('day', startDay)
  .lte('day', endDay), { orderBy: ['day', 'product_id'] })

function ConversionFunnel() {
  const navigate = useNavigate()
  const restaurant = useAnalyticsRestaurant()

  const [timeRange, setTimeRange] = useState('last30days')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [prevRows, setPrevRows] = useState([])
  const [products, setProducts] = useState({})
  const [period, setPeriod] = useState(null)
  const [sort, setSort] = useState({ key: 'impressions', dir: 'desc' })
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (!restaurant) return
    const range = getDateRangeFromTimeRange(timeRange, customStartDate, customEndDate)
    if (!range) return
    const startDay = toDay(range.startDate)
    const endDay = toDay(range.endDate)
    const days = Math.round((fromDay(endDay) - fromDay(startDay)) / DAY_MS) + 1
    const prevEnd = toDay(fromDay(startDay).getTime() - DAY_MS)
    const prevStart = toDay(fromDay(startDay).getTime() - days * DAY_MS)
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [cur, prev, prods] = await Promise.all([
        loadStats(restaurant.id, startDay, endDay),
        loadStats(restaurant.id, prevStart, prevEnd),
        fetchAllRows(() => supabase
          .from('products')
          .select('id, name, categories!inner(name, restaurant_id)')
          .eq('categories.restaurant_id', restaurant.id)),
      ])
      if (cancelled) return
      if (cur.error) console.error('Errore statistiche prodotto:', cur.error)
      setRows(cur.data || [])
      setPrevRows(prev.data || [])
      setProducts(Object.fromEntries((prods.data || []).map(p => [p.id, { name: p.name, category: p.categories?.name || '' }])))
      setPeriod({ startDay, endDay, days })
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [restaurant, timeRange, customStartDate, customEndDate])

  // Totali, per prodotto e per giorno
  const totals = useMemo(() => sumRows(rows), [rows])
  const prevTotals = useMemo(() => sumRows(prevRows), [prevRows])

  const byProduct = useMemo(() => {
    const m = new Map()
    for (const r of rows) {
      const t = m.get(r.product_id) || { product_id: r.product_id, ...EMPTY }
      t.impressions += r.impressions; t.opens += r.opens; t.cart_adds += r.cart_adds; t.cart_qty += r.cart_qty; t.ordered_qty += r.ordered_qty
      m.set(r.product_id, t)
    }
    return [...m.values()].map(t => ({
      ...t,
      name: products[t.product_id]?.name || 'Prodotto eliminato',
      category: products[t.product_id]?.category || '',
      openRate: pct(t.opens, t.impressions),
      addRate: pct(t.cart_adds, t.opens),
    }))
  }, [rows, products])

  const daily = useMemo(() => {
    if (!period) return []
    const m = new Map()
    for (const r of rows) {
      const t = m.get(r.day) || { ...EMPTY }
      t.impressions += r.impressions; t.opens += r.opens; t.cart_adds += r.cart_adds
      m.set(r.day, t)
    }
    const out = []
    for (let i = 0; i < period.days; i++) {
      const day = toDay(fromDay(period.startDay).getTime() + i * DAY_MS)
      const t = m.get(day) || EMPTY
      out.push({ day: `${day.slice(8, 10)}/${day.slice(5, 7)}`, Visualizzazioni: t.impressions, Aperture: t.opens, 'Aggiunte al carrello': t.cart_adds })
    }
    return out
  }, [rows, period])

  // Prodotti da migliorare: confronto con la media del locale
  const avgOpenRate = pct(totals.opens, totals.impressions)
  const avgAddRate = pct(totals.cart_adds, totals.opens)
  const lowOpen = byProduct
    .filter(p => p.impressions >= 10 && avgOpenRate != null && p.openRate < avgOpenRate * 0.7)
    .sort((a, b) => a.openRate - b.openRate).slice(0, 5)
  const lowAdd = byProduct
    .filter(p => p.opens >= 5 && avgAddRate != null && p.addRate < avgAddRate * 0.7)
    .sort((a, b) => a.addRate - b.addRate).slice(0, 5)

  const sorted = [...byProduct].sort((a, b) => {
    const va = a[sort.key] ?? -1, vb = b[sort.key] ?? -1
    if (typeof va === 'string') return sort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    return sort.dir === 'asc' ? va - vb : vb - va
  })
  const visibleRows = showAll ? sorted : sorted.slice(0, 30)

  if (!restaurant) return null

  const Badge = ({ current, previous }) => {
    if (!previous) return <span style={styles.badgeNeutral}>nessun dato nel periodo precedente</span>
    const g = ((current - previous) / previous) * 100
    if (Math.abs(g) < 0.05) return <span style={styles.badgeNeutral}>→ 0% vs periodo precedente</span>
    return <span style={{ ...styles.badgeNeutral, color: g > 0 ? '#10B981' : '#EF4444' }}>{g > 0 ? '↑' : '↓'} {Math.abs(g).toFixed(1)}% vs periodo precedente</span>
  }

  const steps = [
    { label: 'Visualizzazioni', help: 'schede viste nella lista', value: totals.impressions, prev: prevTotals.impressions, rate: null },
    { label: 'Aperture', help: 'prodotti aperti', value: totals.opens, prev: prevTotals.opens, rate: pct(totals.opens, totals.impressions), rateOf: 'di chi l\'ha visto' },
    { label: 'Aggiunte al carrello', help: 'volte in cui è stato aggiunto', value: totals.cart_adds, prev: prevTotals.cart_adds, rate: pct(totals.cart_adds, totals.opens), rateOf: 'di chi l\'ha aperto' },
    { label: 'Pezzi ordinati', help: 'dal menu, a ordine inviato', value: totals.ordered_qty, prev: prevTotals.ordered_qty, rate: pct(totals.ordered_qty, totals.cart_qty), rateOf: 'dei pezzi messi nel carrello' },
  ]

  const SortTh = ({ k, children, align = 'right' }) => (
    <th
      style={{ ...styles.th, textAlign: align, cursor: 'pointer', color: sort.key === k ? '#000' : '#666' }}
      onClick={() => setSort(s => ({ key: k, dir: s.key === k && s.dir === 'desc' ? 'asc' : 'desc' }))}
    >
      {children}{sort.key === k ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
    </th>
  )

  const InsightList = ({ title, hint, items, rateKey, rateLabel, avg }) => (
    <div style={styles.insightCard}>
      <h3 style={styles.insightTitle}>{title}</h3>
      <p style={styles.insightHint}>{hint}</p>
      {items.length === 0 ? (
        <p style={styles.insightEmpty}>Nessun prodotto sotto la media: ottimo!</p>
      ) : items.map(p => (
        <div key={p.product_id} style={styles.insightRow}>
          <div style={{ minWidth: 0 }}>
            <div style={styles.insightName}>{p.name}</div>
            <div style={styles.insightSub}>{p.category}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={styles.insightRate}>{fmtPct(p[rateKey])}</div>
            <div style={styles.insightSub}>{rateLabel} · media {fmtPct(avg)}</div>
          </div>
        </div>
      ))}
    </div>
  )

  const hasData = totals.impressions + totals.opens + totals.cart_adds + totals.ordered_qty > 0

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate('/analytics-selection', { state: { restaurant } })} style={styles.backButton}>← Analytics</button>
        <h1 style={styles.title}>Conversion Funnel</h1>
        <p style={styles.subtitle}>
          Il percorso di ogni prodotto nel tuo menu: quanti clienti lo <strong>vedono</strong> nella lista, lo <strong>aprono</strong>, lo <strong>aggiungono al carrello</strong> e lo <strong>ordinano</strong>.
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
      ) : !hasData ? (
        <div style={styles.emptyCard}>
          <h2 style={styles.chartTitle}>Ancora nessun dato in questo periodo</h2>
          <p style={styles.emptyText}>
            I dati si raccolgono da soli quando i clienti usano il menu online: ogni prodotto che vedono nella lista, aprono, aggiungono al carrello o ordinano.
            Le visite che fai tu da titolare e le anteprime dell'editor non vengono contate.
          </p>
        </div>
      ) : (
        <>
          {/* I 4 passaggi */}
          <div style={styles.statsGrid}>
            {steps.map(s => (
              <div key={s.label} style={styles.statCard}>
                <div style={styles.statLabel}>{s.label}</div>
                <div style={styles.statValue}>{fmtNum(s.value)}</div>
                <div style={styles.statHelper}>{s.rate != null ? `${fmtPct(s.rate)} ${s.rateOf}` : s.help}</div>
                <Badge current={s.value} previous={s.prev} />
              </div>
            ))}
          </div>

          {/* Percorso a barre */}
          <div style={styles.chartCard}>
            <h2 style={styles.chartTitle}>Il percorso dei clienti</h2>
            {steps.map((s, i) => {
              const w = totals.impressions > 0 ? Math.max(2, (s.value / totals.impressions) * 100) : 0
              return (
                <div key={s.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6, gap: 12 }}>
                    <span style={{ fontWeight: 600 }}>{i + 1}. {s.label}</span>
                    <span style={{ color: '#666' }}>{fmtNum(s.value)}{s.rate != null ? ` · ${fmtPct(s.rate)} ${s.rateOf}` : ''}</span>
                  </div>
                  <div style={{ height: 14, background: '#F5F5F5', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, w)}%`, height: '100%', background: i === 0 ? '#000' : i === 1 ? '#374151' : i === 2 ? '#6B7280' : '#16A34A', borderRadius: 99 }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Andamento */}
          <div style={styles.chartCard}>
            <h2 style={styles.chartTitle}>Andamento giorno per giorno</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis dataKey="day" style={{ fontSize: '12px' }} angle={-45} textAnchor="end" height={60} interval="preserveStartEnd" />
                <YAxis style={{ fontSize: '12px' }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#FFF', border: '1px solid #E0E0E0', borderRadius: '4px' }} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Line type="monotone" dataKey="Visualizzazioni" stroke="#000000" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Aperture" stroke="#6B7280" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Aggiunte al carrello" stroke="#16A34A" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Prodotti da migliorare */}
          <div style={styles.insightsGrid}>
            <InsightList
              title="Visti ma poco aperti"
              hint="I clienti li vedono nella lista ma raramente li aprono: prova a cambiare foto, nome o posizione nel menu."
              items={lowOpen} rateKey="openRate" rateLabel="aperture" avg={avgOpenRate}
            />
            <InsightList
              title="Aperti ma poco aggiunti"
              hint="I clienti li aprono ma raramente li aggiungono al carrello: rivedi prezzo, descrizione o varianti."
              items={lowAdd} rateKey="addRate" rateLabel="aggiunte" avg={avgAddRate}
            />
          </div>

          {/* Tabella prodotti */}
          <div style={styles.tableContainer}>
            <h2 style={styles.sectionTitle}>Tutti i prodotti</h2>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <SortTh k="name" align="left">Prodotto</SortTh>
                    <SortTh k="impressions">Visualizzazioni</SortTh>
                    <SortTh k="opens">Aperture</SortTh>
                    <SortTh k="openRate">% apertura</SortTh>
                    <SortTh k="cart_adds">Aggiunte</SortTh>
                    <SortTh k="addRate">% aggiunta</SortTh>
                    <SortTh k="ordered_qty">Pezzi ordinati</SortTh>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map(p => (
                    <tr key={p.product_id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: '#999' }}>{p.category}</div>
                      </td>
                      <td style={styles.tdNum}>{fmtNum(p.impressions)}</td>
                      <td style={styles.tdNum}>{fmtNum(p.opens)}</td>
                      <td style={styles.tdNum}>{fmtPct(p.openRate)}</td>
                      <td style={styles.tdNum}>{fmtNum(p.cart_adds)}</td>
                      <td style={styles.tdNum}>{fmtPct(p.addRate)}</td>
                      <td style={styles.tdNum}>{fmtNum(p.ordered_qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sorted.length > 30 && (
              <button onClick={() => setShowAll(v => !v)} style={styles.showAll}>
                {showAll ? 'Mostra meno' : `Mostra tutti (${sorted.length})`}
              </button>
            )}
            <p style={styles.footnote}>
              Visualizzazione: la scheda resta a schermo per almeno 1 secondo. Visualizzazioni e aperture contano una volta per visita del cliente;
              aggiunte e ordini contano ogni volta. Le visite del titolare e le anteprime dell'editor non vengono contate.
            </p>
          </div>
        </>
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
  statsGrid: { maxWidth: '1200px', margin: '0 auto 32px auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' },
  statCard: { background: '#F5F5F5', borderRadius: '8px', padding: '24px' },
  statLabel: { fontSize: '13px', color: '#666', marginBottom: '8px', fontWeight: '500' },
  statValue: { fontSize: '28px', fontWeight: '600', color: '#000', marginBottom: '6px' },
  statHelper: { fontSize: '13px', color: '#374151', marginBottom: '8px' },
  badgeNeutral: { fontSize: '12px', color: '#999', fontWeight: '600' },
  chartCard: { maxWidth: '1200px', margin: '0 auto 32px auto', background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '8px', padding: '24px', boxSizing: 'border-box' },
  chartTitle: { fontSize: '16px', fontWeight: '500', color: '#000', margin: '0 0 20px 0' },
  insightsGrid: { maxWidth: '1200px', margin: '0 auto 32px auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '16px' },
  insightCard: { border: '1px solid #E0E0E0', borderRadius: '8px', padding: '20px 24px' },
  insightTitle: { fontSize: '16px', fontWeight: '600', margin: '0 0 6px 0' },
  insightHint: { fontSize: '13px', color: '#666', margin: '0 0 14px 0', lineHeight: 1.5 },
  insightEmpty: { fontSize: '14px', color: '#10B981', margin: 0 },
  insightRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid #F5F5F5' },
  insightName: { fontSize: '14px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  insightSub: { fontSize: '12px', color: '#999' },
  insightRate: { fontSize: '16px', fontWeight: '700', color: '#EF4444' },
  tableContainer: { maxWidth: '1200px', margin: '0 auto', background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '8px', padding: '24px', boxSizing: 'border-box' },
  sectionTitle: { fontSize: '18px', fontWeight: '500', color: '#000', margin: '0 0 20px 0' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px 14px', fontSize: '13px', fontWeight: '500', borderBottom: '2px solid #E0E0E0', whiteSpace: 'nowrap', userSelect: 'none' },
  tr: { borderBottom: '1px solid #F5F5F5' },
  td: { padding: '12px 14px', fontSize: '14px', color: '#000' },
  tdNum: { padding: '12px 14px', fontSize: '14px', color: '#000', textAlign: 'right', whiteSpace: 'nowrap' },
  showAll: { marginTop: 16, padding: '10px 16px', borderRadius: 6, border: '1px solid #E0E0E0', background: '#FFF', cursor: 'pointer', fontSize: 14, fontWeight: 500 },
  footnote: { fontSize: '12px', color: '#999', lineHeight: 1.6, margin: '16px 0 0 0' },
}

export default ConversionFunnel
