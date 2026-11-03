import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import { Card, Spinner, PageHeader, ResponsiveTabs } from '../components/ui'
import DashboardLayout from '../components/ui/DashboardLayout'
import { loadCatalog, runQuery, formatValue, pctChange, TEMPLATES } from '../lib/analyticsQuery'

/**
 * Analytics: scheda "Tutte" con i numeri più interessanti degli ultimi 30 giorni e tutte le analisi,
 * poi una scheda per categoria. Tutte le analisi sono disponibili a ogni locale.
 */

const CATEGORIES = [
  { value: 'all', label: 'Tutte' },
  { value: 'sales', label: 'Vendite' },
  { value: 'products', label: 'Prodotti' },
  { value: 'menu', label: 'Menu e clienti' },
  { value: 'staff', label: 'Staff e servizio' },
  { value: 'explore', label: 'Esplora dati' },
]

const REPORTS = [
  { category: 'sales', title: 'Fatturato e margine', description: 'Incasso, ordini, costo dei prodotti e margine netto, con il confronto col periodo precedente', path: '/analytics/revenue-analytics' },
  { category: 'sales', title: 'Scontrino medio', description: 'Quanto spende in media ogni cliente e come cambia nel tempo', path: '/analytics/aov-analysis' },
  { category: 'sales', title: 'Vendite nel tempo', description: 'Vendite per ora, giorno e mese, con il dettaglio dei prodotti', path: '/analytics/time-based-analysis' },
  { category: 'products', title: 'Prodotti più venduti', description: 'Classifica dei prodotti per pezzi e incasso, i più e i meno venduti', path: '/analytics/top-products-ordered' },
  { category: 'menu', title: 'Conversion Funnel', description: 'Quanti clienti vedono, aprono, aggiungono al carrello e ordinano ogni prodotto, ora per ora', path: '/analytics/conversion-funnel' },
  { category: 'menu', title: 'Tempo sul menu', description: 'Quante visite riceve il menu online e quanto tempo ci restano i clienti', path: '/analytics/session', withRestaurant: true },
  { category: 'menu', title: 'Prodotti aperti', description: 'I prodotti che i clienti aprono di più nel menu online', path: '/analytics/products', withRestaurant: true },
  { category: 'menu', title: 'Categorie aperte', description: 'Le categorie del menu più guardate', path: '/analytics/categories', withRestaurant: true },
  { category: 'menu', title: 'Preferiti', description: 'I prodotti che i clienti salvano con il cuore', path: '/analytics/favorites', withRestaurant: true },
  { category: 'staff', title: 'Staff e Servizio', description: 'Chi prende, approva, prepara e chiude gli ordini, da dove arrivano e quanto tempo servono', path: '/analytics/staff-performance' },
  { category: 'explore', title: 'Esplora dati', description: 'Crea le tue analisi personalizzate in stile Shopify: scegli dati, metriche, periodo e confronto', path: '/analytics/esplora' },
]
const TEMPLATE_GROUP = { sales: 'Vendite', products: 'Prodotti', menu: 'Menu e clienti', staff: 'Staff e servizio' }

const exploreLink = (query) => `/analytics/esplora?q=${encodeURIComponent(query)}`

// I numeri più interessanti degli ultimi 30 giorni (ogni query è anche apribile in Esplora dati)
const HIGHLIGHT_QUERIES = {
  sales: 'FROM sales\n  SHOW orders, total_sales, average_order_value, margin_percent\n  TIMESERIES day WITH TOTALS, PERCENT_CHANGE\n  DURING last_30_days\n  COMPARE TO previous_period\nVISUALIZE total_sales TYPE line',
  topProduct: 'FROM products\n  SHOW quantity_sold, product_sales\n  GROUP BY product\n  DURING last_30_days\n  ORDER BY quantity_sold DESC\n  LIMIT 10\nVISUALIZE quantity_sold TYPE bar',
  salesHour: 'FROM sales\n  SHOW orders, total_sales\n  GROUP BY hour_of_day\n  DURING last_30_days\nVISUALIZE orders TYPE bar',
  channel: 'FROM sales\n  SHOW orders, total_sales\n  GROUP BY channel\n  DURING last_30_days\n  ORDER BY total_sales DESC\nVISUALIZE total_sales TYPE bar',
  visits: 'FROM visits\n  SHOW visits, product_opens, median_time_on_menu\n  TIMESERIES day WITH TOTALS, PERCENT_CHANGE\n  DURING last_30_days\n  COMPARE TO previous_period\nVISUALIZE visits TYPE line',
  visitsHour: 'FROM visits\n  SHOW visits\n  GROUP BY hour_of_day\n  DURING last_30_days\nVISUALIZE visits TYPE bar',
  topOpened: 'FROM visits\n  SHOW product_opens\n  GROUP BY product\n  DURING last_30_days\n  ORDER BY product_opens DESC\n  LIMIT 10\nVISUALIZE product_opens TYPE bar',
  service: 'FROM kitchen\n  SHOW batches, median_prep_time\n  GROUP BY prepared_by\n  DURING last_30_days\n  ORDER BY batches DESC\nVISUALIZE median_prep_time TYPE bar',
  approval: 'FROM service\n  SHOW approved_orders, median_approval_time\n  GROUP BY hour_of_day\n  DURING last_30_days\nVISUALIZE median_approval_time TYPE bar',
}

async function loadHighlights(restaurantId) {
  const catalog = await loadCatalog()
  const q = (k) => runQuery(restaurantId, HIGHLIGHT_QUERIES[k], catalog).catch(() => null)
  const [sales, topProduct, salesHour, channel, visits, visitsHour, topOpened, service, approval] =
    await Promise.all(['sales', 'topProduct', 'salesHour', 'channel', 'visits', 'visitsHour', 'topOpened', 'service', 'approval'].map(q))
  const top = (r, metric) => (r?.rows || []).filter(x => Number(x[metric]) > 0).sort((a, b) => b[metric] - a[metric])[0]
  const cards = []
  const st = sales?.totals || {}, sp = sales?.prevTotals || {}
  if (Number(st.orders) > 0) {
    cards.push({ label: 'Incasso', value: formatValue('money', st.total_sales), change: pctChange(st.total_sales, sp.total_sales), link: exploreLink(HIGHLIGHT_QUERIES.sales), dark: true })
    cards.push({ label: 'Ordini', value: formatValue('number', st.orders), change: pctChange(st.orders, sp.orders), link: exploreLink(HIGHLIGHT_QUERIES.sales) })
    cards.push({ label: 'Scontrino medio', value: formatValue('money', st.average_order_value), change: pctChange(st.average_order_value, sp.average_order_value), link: '/analytics/aov-analysis' })
    if (st.margin_percent != null) cards.push({ label: 'Margine', value: formatValue('percent', st.margin_percent), sub: 'sull\'incasso, dopo il costo dei prodotti', link: '/analytics/revenue-analytics' })
    const p = top(topProduct, 'quantity_sold')
    if (p) cards.push({ label: 'Prodotto più venduto', value: p.product, sub: `${formatValue('number', p.quantity_sold)} pezzi · ${formatValue('money', p.product_sales)}`, link: exploreLink(HIGHLIGHT_QUERIES.topProduct), text: true })
    const h = top(salesHour, 'orders')
    if (h) cards.push({ label: 'Ora con più ordini', value: formatValue('hour', h.hour_of_day), sub: `${formatValue('number', h.orders)} ordini nel periodo`, link: exploreLink(HIGHLIGHT_QUERIES.salesHour) })
    const c = top(channel, 'total_sales')
    if (c && Number(st.total_sales) > 0) cards.push({ label: 'Canale principale', value: formatValue('channel', c.channel), sub: `${Math.round((c.total_sales / st.total_sales) * 100)}% dell'incasso`, link: exploreLink(HIGHLIGHT_QUERIES.channel), text: true })
  }
  const vt = visits?.totals || {}, vp = visits?.prevTotals || {}
  if (Number(vt.visits) > 0) {
    cards.push({ label: 'Visite al menu', value: formatValue('number', vt.visits), change: pctChange(vt.visits, vp.visits), sub: `${formatValue('number', vt.product_opens)} prodotti aperti`, link: exploreLink(HIGHLIGHT_QUERIES.visits), dark: !cards.length })
    if (vt.median_time_on_menu != null) cards.push({ label: 'Tempo sul menu', value: formatValue('duration', vt.median_time_on_menu), sub: 'durata tipica di una visita', link: '/analytics/session', withRestaurant: true })
    const vh = top(visitsHour, 'visits')
    if (vh) cards.push({ label: 'Ora con più visite', value: formatValue('hour', vh.hour_of_day), sub: `${formatValue('number', vh.visits)} visite nel periodo`, link: exploreLink(HIGHLIGHT_QUERIES.visitsHour) })
    const o = top(topOpened, 'product_opens')
    if (o) cards.push({ label: 'Prodotto più aperto', value: o.product, sub: `${formatValue('number', o.product_opens)} aperture`, link: exploreLink(HIGHLIGHT_QUERIES.topOpened), text: true })
  }
  const kt = service?.totals || {}
  if (Number(kt.batches) > 0 && kt.median_prep_time != null) cards.push({ label: 'Preparazione tipica', value: formatValue('duration', kt.median_prep_time), sub: `${formatValue('number', kt.batches)} comande`, link: exploreLink(HIGHLIGHT_QUERIES.service) })
  const at = approval?.totals || {}
  if (Number(at.approved_orders) > 0) cards.push({ label: 'Attesa approvazione', value: formatValue('duration', at.median_approval_time), sub: `ordini dal QR · ${formatValue('number', at.approved_orders)} approvati`, link: exploreLink(HIGHLIGHT_QUERIES.approval) })
  return { cards, hasSales: Number(st.orders) > 0 }
}

function AnalyticsPage({ session }) {
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(() => { try { return sessionStorage.getItem('analytics_tab') || 'all' } catch { return 'all' } })
  const [highlights, setHighlights] = useState(null)

  useEffect(() => {
    if (!session) return
    ;(async () => {
      try {
        const { data, error } = await supabase.from('restaurants').select('*').eq('user_id', session.user.id).single()
        if (error) throw error
        setRestaurant(data)
        // le pagine delle metriche del menu leggono il ristorante da qui se aperte direttamente
        try { localStorage.setItem('analytics_restaurant', JSON.stringify(data)) } catch { /* storage non disponibile */ }
        loadHighlights(data.id).then(setHighlights).catch(() => setHighlights({ cards: [], hasSales: false }))
      } catch (error) {
        console.error('Errore caricamento ristorante:', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [session])

  const changeTab = (t) => { setActiveTab(t); try { sessionStorage.setItem('analytics_tab', t) } catch { /* storage non disponibile */ } }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/#/'
      window.location.reload()
    } catch (error) {
      console.error('Errore logout:', error)
    }
  }

  const open = (item) => navigate(item.link || item.path, item.withRestaurant ? { state: { restaurant } } : undefined)

  const layoutProps = { restaurantName: restaurant?.name, userName: session?.user?.email, isPremium: restaurant?.subscription_tier === 'premium', permissions: ['*'], onLogout: handleLogout }

  if (loading) {
    return <DashboardLayout {...layoutProps}><Spinner size="lg" text="Caricamento..." centered /></DashboardLayout>
  }

  const ReportCard = ({ r }) => (
    <Card variant="default" padding="lg" hoverable onClick={() => open(r)} style={{ cursor: 'pointer', height: '100%', boxSizing: 'border-box' }}>
      <div style={S.cardTitle}>{r.title}<span style={S.arrow}>→</span></div>
      <p style={S.cardDesc}>{r.description}</p>
    </Card>
  )
  const Grid = ({ items }) => <div style={S.grid}>{items.map(r => <ReportCard key={r.path} r={r} />)}</div>

  const Templates = ({ group }) => {
    const list = TEMPLATES.filter(t => !group || t.group === group)
    return (
      <div style={S.templates}>
        {list.map(t => (
          <button key={t.name} style={S.template} onClick={() => navigate(exploreLink(t.query))}>
            <span>{t.name}</span><span style={S.arrow}>→</span>
          </button>
        ))}
      </div>
    )
  }

  const Highlights = () => {
    if (!highlights) return <div style={S.hlLoading}>Calcolo dei numeri degli ultimi 30 giorni…</div>
    if (!highlights.cards.length) {
      return (
        <div style={S.empty}>
          Ancora pochi dati negli ultimi 30 giorni. I numeri compaiono da soli quando i clienti usano il menu online e quando registri gli ordini in cassa o dall'app staff.
        </div>
      )
    }
    return (
      <div style={S.hlGrid}>
        {highlights.cards.map((c, i) => (
          <button key={i} style={{ ...S.hl, ...(c.dark ? S.hlDark : {}) }} onClick={() => open(c)}>
            <div style={{ ...S.hlLabel, ...(c.dark ? { color: '#D1D5DB' } : {}) }}>{c.label}</div>
            <div style={{ ...S.hlValue, ...(c.text ? S.hlValueText : {}) }}>{c.value}</div>
            {c.change != null ? (
              <div style={{ ...S.hlSub, color: Math.abs(c.change) < 0.05 ? (c.dark ? '#D1D5DB' : '#6B7280') : c.change > 0 ? (c.dark ? '#6EE7B7' : '#059669') : (c.dark ? '#FCA5A5' : '#DC2626'), fontWeight: 700 }}>
                {Math.abs(c.change) < 0.05 ? '→ 0%' : `${c.change > 0 ? '↑' : '↓'} ${Math.abs(c.change).toFixed(1).replace('.', ',')}%`} <span style={{ fontWeight: 400, color: c.dark ? '#D1D5DB' : '#6B7280' }}>vs 30 giorni prima</span>
              </div>
            ) : c.sub ? <div style={{ ...S.hlSub, ...(c.dark ? { color: '#D1D5DB' } : {}) }}>{c.sub}</div> : null}
          </button>
        ))}
      </div>
    )
  }

  const reports = (cat) => REPORTS.filter(r => r.category === cat)

  return (
    <DashboardLayout {...layoutProps}>
      <PageHeader title="Analytics" subtitle="Vendite, prodotti, menu online, staff e servizio: tutti i dati del tuo locale" />
      <ResponsiveTabs tabs={CATEGORIES} activeTab={activeTab} onChange={changeTab} />

      {activeTab === 'all' && (
        <>
          <h2 style={S.section}>In evidenza <span style={S.sectionHint}>ultimi 30 giorni · tocca un numero per approfondire</span></h2>
          <Highlights />
          <button style={S.explore} onClick={() => navigate('/analytics/esplora')}>
            <div>
              <div style={S.exploreTitle}>Esplora dati</div>
              <div style={S.exploreDesc}>Crea le tue analisi: scegli dati, metriche, periodo e confronto, oppure scrivi una query in stile Shopify.</div>
            </div>
            <span style={S.explorePill}>Apri</span>
          </button>
          {(highlights?.hasSales === false ? ['menu', 'sales', 'products', 'staff'] : ['sales', 'products', 'menu', 'staff']).map(cat => (
            <div key={cat}>
              <h2 style={S.section}>{CATEGORIES.find(c => c.value === cat).label}</h2>
              <Grid items={reports(cat)} />
            </div>
          ))}
        </>
      )}

      {['sales', 'products', 'menu', 'staff'].includes(activeTab) && (
        <>
          <Grid items={reports(activeTab)} />
          <h2 style={S.section}>Analisi pronte <span style={S.sectionHint}>si aprono in Esplora dati, dove puoi modificarle</span></h2>
          <Templates group={TEMPLATE_GROUP[activeTab]} />
        </>
      )}

      {activeTab === 'explore' && (
        <>
          <button style={S.explore} onClick={() => navigate('/analytics/esplora')}>
            <div>
              <div style={S.exploreTitle}>Crea un'analisi personalizzata</div>
              <div style={S.exploreDesc}>Vendite, prodotti, menu, visite, servizio e comande: tutte le metriche, raggruppate come vuoi, per ora, giorno, settimana o mese, con il confronto e l'esportazione in CSV.</div>
            </div>
            <span style={S.explorePill}>Apri</span>
          </button>
          <h2 style={S.section}>Analisi pronte</h2>
          <Templates />
        </>
      )}
    </DashboardLayout>
  )
}

const S = {
  section: { fontSize: tokens.typography.fontSize.lg, fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.black, margin: `${tokens.spacing.xl} 0 ${tokens.spacing.md}` },
  sectionHint: { fontSize: tokens.typography.fontSize.sm, fontWeight: 400, color: tokens.colors.gray[500], marginLeft: 6 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: tokens.spacing.md },
  cardTitle: { fontSize: tokens.typography.fontSize.lg, fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.black, marginBottom: tokens.spacing.xs, display: 'flex', justifyContent: 'space-between', gap: 8 },
  cardDesc: { fontSize: tokens.typography.fontSize.sm, color: tokens.colors.gray[600], lineHeight: tokens.typography.lineHeight.relaxed, margin: 0 },
  arrow: { color: tokens.colors.gray[400], fontWeight: 400 },
  hlLoading: { padding: '28px 0', color: tokens.colors.gray[500], fontSize: tokens.typography.fontSize.sm },
  empty: { border: `1px dashed ${tokens.colors.gray[300]}`, borderRadius: 8, padding: 20, color: tokens.colors.gray[600], fontSize: tokens.typography.fontSize.sm, lineHeight: 1.6 },
  hlGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 155px), 1fr))', gap: tokens.spacing.md },
  hl: { textAlign: 'left', background: tokens.colors.gray[100], border: 'none', borderRadius: 10, padding: '16px 18px', cursor: 'pointer', minWidth: 0, fontFamily: 'inherit', color: tokens.colors.black },
  hlDark: { background: '#000', color: '#FFF' },
  hlLabel: { fontSize: 12.5, fontWeight: 600, color: tokens.colors.gray[600], marginBottom: 8 },
  hlValue: { fontSize: 'clamp(19px, 5.2vw, 26px)', fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.1, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  hlValueText: { fontSize: 'clamp(16px, 4.4vw, 19px)', whiteSpace: 'normal', lineHeight: 1.2, overflowWrap: 'anywhere' },
  hlSub: { fontSize: 12.5, color: tokens.colors.gray[600], lineHeight: 1.4 },
  explore: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, textAlign: 'left', background: '#FFF', border: '1.5px solid #000', borderRadius: 10, padding: '18px 20px', cursor: 'pointer', marginTop: tokens.spacing.lg, fontFamily: 'inherit', color: '#000' },
  exploreTitle: { fontSize: tokens.typography.fontSize.lg, fontWeight: 700, marginBottom: 4 },
  exploreDesc: { fontSize: tokens.typography.fontSize.sm, color: tokens.colors.gray[600], lineHeight: 1.5 },
  explorePill: { flexShrink: 0, background: '#000', color: '#FFF', borderRadius: 99, padding: '8px 16px', fontWeight: 700, fontSize: 14 },
  templates: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 8 },
  template: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, textAlign: 'left', background: '#FFF', border: `1px solid ${tokens.colors.gray[200]}`, borderRadius: 8, padding: '12px 14px', fontSize: 14, color: tokens.colors.black, cursor: 'pointer', fontFamily: 'inherit' },
}

export default AnalyticsPage
