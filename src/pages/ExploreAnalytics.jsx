import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import useAnalyticsRestaurant from '../hooks/useAnalyticsRestaurant'
import {
  loadCatalog, runQuery, parseQuery, serializeQuery, formatValue, formatBucket, formatRange, naturalSort,
  pctChange, toCSV, TEMPLATES, RANGES, COMPARES, GRAINS,
} from '../lib/analyticsQuery'

/**
 * Esplora dati: analisi personalizzate in stile ShopifyQL su vendite, prodotti, menu, visite e servizio.
 * Si costruiscono con i menu (costruttore) oppure scrivendo la query; il server accetta solo i campi del catalogo.
 */

const GRAIN_LABELS = { hour: 'Ora', day: 'Giorno', week: 'Settimana', month: 'Mese', quarter: 'Trimestre', year: 'Anno' }
const CHART_LABELS = { line: 'Linee', bar: 'Barre', table: 'Tabella' }
// metriche per cui "meno" è meglio (colore della variazione)
const LOWER_IS_BETTER = new Set(['unpaid_sales', 'unpaid_orders', 'cancelled_orders', 'rejected_orders', 'cost_of_goods', 'product_cost'])
const DEFAULT_QUERY = TEMPLATES[1].query

function ExploreAnalytics() {
  const navigate = useNavigate()
  const location = useLocation()
  const restaurant = useAnalyticsRestaurant()
  const initial = useMemo(() => new URLSearchParams(location.search).get('q'), [location.search])

  const [catalog, setCatalog] = useState(null)
  const [text, setText] = useState(initial || DEFAULT_QUERY)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const [saved, setSaved] = useState([])
  const [showHelp, setShowHelp] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => { loadCatalog().then(setCatalog).catch(e => setError(e.message)) }, [])

  const loadSaved = useCallback(async () => {
    if (!restaurant) return
    const { data } = await supabase.from('analytics_saved_queries').select('id, name, query').eq('restaurant_id', restaurant.id).order('created_at', { ascending: false })
    setSaved(data || [])
  }, [restaurant])
  useEffect(() => { loadSaved() }, [loadSaved])

  const run = useCallback(async (queryText) => {
    if (!restaurant || !catalog) return
    setRunning(true)
    setError('')
    try {
      setResult(await runQuery(restaurant.id, queryText, catalog))
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }, [restaurant, catalog])

  // prima esecuzione automatica
  useEffect(() => { if (restaurant && catalog) run(text) }, [restaurant, catalog]) // eslint-disable-line react-hooks/exhaustive-deps

  // la query scritta, se valida, alimenta il costruttore
  const parsed = useMemo(() => { try { return parseQuery(text) } catch { return null } }, [text])
  const ds = catalog?.find(d => d.name === parsed?.from) || null
  const metrics = ds ? ds.fields.filter(f => f.kind === 'metric') : []
  const dims = ds ? ds.fields.filter(f => f.kind === 'dimension') : []

  // modifica dal costruttore: riscrive il testo ed esegue
  const edit = (change) => {
    if (!parsed) return
    const q = { ...parsed, ...change }
    if (!q.show.length) return
    if (q.visualize?.length) q.visualize = q.visualize.filter(v => q.show.includes(v))
    q.order_by = (q.order_by || []).filter(o => [...q.show, ...q.group_by, ...(q.timeseries ? ['bucket'] : [])].includes(o.field))
    const t = serializeQuery(q)
    setText(t)
    run(t)
  }
  const changeDataset = (name) => {
    const d = catalog.find(x => x.name === name)
    const first = d.fields.filter(f => f.kind === 'metric').slice(0, 3).map(f => f.name)
    const t = serializeQuery({ ...parsed, from: name, show: first, where: [], group_by: [], having: [], order_by: [], visualize: [], limit: null })
    setText(t)
    run(t)
  }
  const loadQuery = (q) => { setText(q); run(q); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const saveQuery = async () => {
    const name = window.prompt('Nome dell\'analisi da salvare:', '')
    if (!name?.trim()) return
    const { error: e } = await supabase.from('analytics_saved_queries').insert({ restaurant_id: restaurant.id, name: name.trim(), query: text })
    if (e) { alert('Impossibile salvare: ' + e.message); return }
    loadSaved()
  }
  const deleteSaved = async (s) => {
    if (!window.confirm(`Eliminare "${s.name}"?`)) return
    await supabase.from('analytics_saved_queries').delete().eq('id', s.id)
    loadSaved()
  }

  // ---------- righe e colonne del risultato ----------
  const view = useMemo(() => {
    if (!result) return null
    const { q, fields, range } = result
    const singleDay = range[0] === range[1]
    const dimCols = [
      ...(q.timeseries ? [{ key: 'bucket', label: GRAIN_LABELS[q.timeseries], fmt: (v) => formatBucket(v, q.timeseries, singleDay) }] : []),
      ...q.group_by.map(d => ({ key: d, label: fields[d].label, fmt: (v) => (v == null ? '(nessuno)' : formatValue(fields[d].type, v)) })),
    ]
    const metCols = q.show.map(m => ({ key: m, label: fields[m].label, type: fields[m].type }))
    let rows = result.rows
    if (!q.order_by.length && q.group_by.length === 1 && !q.timeseries) rows = naturalSort(rows, q.group_by[0], fields[q.group_by[0]].type)
    return { dimCols, metCols, rows, singleDay }
  }, [result])

  const downloadCSV = () => {
    const { dimCols, metCols, rows } = view
    const cols = [
      ...dimCols.map(c => ({ label: c.label, get: (r) => c.fmt(r[c.key]) })),
      ...metCols.flatMap(m => [
        { label: m.label, get: (r) => r[m.key] == null ? '' : String(Number(r[m.key]).toFixed(2)).replace('.', ',') },
        ...(result.compare ? [{ label: `${m.label} (confronto)`, get: (r) => r.__prev?.[m.key] == null ? '' : String(Number(r.__prev[m.key]).toFixed(2)).replace('.', ',') }] : []),
      ]),
    ]
    const blob = new Blob(['﻿' + toCSV(cols, rows)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `analisi-${result.q.from}-${result.range[0]}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (!restaurant) return null

  const Change = ({ metric, cur, prev, type }) => {
    const g = pctChange(cur, prev)
    if (g == null) return <span style={styles.changeNeutral}>—</span>
    if (Math.abs(g) < 0.05) return <span style={styles.changeNeutral}>→ 0%</span>
    const lower = type === 'duration' || LOWER_IS_BETTER.has(metric)
    const good = lower ? g < 0 : g > 0
    return <span style={{ ...styles.changeNeutral, color: good ? '#059669' : '#DC2626' }}>{g > 0 ? '↑' : '↓'} {Math.abs(g).toFixed(1).replace('.', ',')}%</span>
  }

  const Chart = ({ metric }) => {
    const { dimCols, rows } = view
    const m = view.metCols.find(c => c.key === metric)
    const x = dimCols[0]
    const data = rows.map(r => ({
      x: x ? x.fmt(r[x.key]) : 'Totale',
      Periodo: r[metric] == null ? 0 : Number(r[metric]),
      ...(result.compare ? { Confronto: r.__prev?.[metric] == null ? 0 : Number(r.__prev[metric]) } : {}),
    }))
    const fmt = (v) => formatValue(m.type, v)
    const axisFmt = (v) => (m.type === 'money' ? `€${Number(v).toLocaleString('it-IT', { maximumFractionDigits: 0 })}` : m.type === 'duration' ? `${Math.round(v / 60)}m` : m.type === 'percent' ? `${Math.round(v)}%` : Number(v).toLocaleString('it-IT'))
    const many = data.length > 12
    const common = (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis dataKey="x" style={{ fontSize: 11 }} interval={many ? 'preserveStartEnd' : 0} angle={many ? -35 : 0} textAnchor={many ? 'end' : 'middle'} height={many ? 56 : 30} tickLine={false} />
        <YAxis style={{ fontSize: 11 }} tickFormatter={axisFmt} width={64} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 13 }} />
        {result.compare && <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => (v === 'Periodo' ? `Periodo (${formatRange(result.range)})` : `Confronto (${formatRange(result.compare)})`)} />}
      </>
    )
    return (
      <div style={styles.chartBox}>
        <div style={styles.chartTitle}>{m.label}</div>
        <ResponsiveContainer width="100%" height={280}>
          {result.chart === 'line' ? (
            <LineChart data={data}>
              {common}
              {result.compare && <Line type="monotone" dataKey="Confronto" stroke="#9CA3AF" strokeWidth={2} strokeDasharray="5 4" dot={false} />}
              <Line type="monotone" dataKey="Periodo" stroke="#000" strokeWidth={2} dot={data.length <= 31 ? { r: 3 } : false} />
            </LineChart>
          ) : (
            <BarChart data={data} barGap={2}>
              {common}
              {result.compare && <Bar dataKey="Confronto" fill="#C4C9D2" radius={[4, 4, 0, 0]} />}
              <Bar dataKey="Periodo" fill="#000" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    )
  }

  const periodOptions = Object.entries(RANGES)
  const currentPeriod = parsed?.since || parsed?.until ? 'custom' : (parsed?.during || 'last_30_days')

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate('/analytics')} style={styles.backButton}>← Analytics</button>
        <h1 style={styles.title}>Esplora dati</h1>
        <p style={styles.subtitle}>
          Crea le tue analisi su vendite, prodotti, menu, visite e servizio: scegli con i menu qui sotto oppure scrivi la query
          (stesso stile di Shopify: <code style={styles.inlineCode}>FROM … SHOW … GROUP BY … DURING …</code>). Parti da un'analisi pronta e modificala.
        </p>
      </div>

      <div style={{ ...styles.layout, gridTemplateColumns: isMobile ? '1fr' : '260px 1fr' }}>
        {/* ---------- analisi pronte e salvate ---------- */}
        <aside style={{ ...styles.side, order: isMobile ? 2 : 0 }}>
          {saved.length > 0 && (
            <div style={styles.sideBlock}>
              <div style={styles.sideTitle}>Le tue analisi</div>
              {saved.map(s => (
                <div key={s.id} style={styles.sideRow}>
                  <button style={styles.sideItem} onClick={() => loadQuery(s.query)}>{s.name}</button>
                  <button style={styles.sideDel} onClick={() => deleteSaved(s)} aria-label={`Elimina ${s.name}`}>×</button>
                </div>
              ))}
            </div>
          )}
          {[...new Set(TEMPLATES.map(t => t.group))].map(g => (
            <div key={g} style={styles.sideBlock}>
              <div style={styles.sideTitle}>{g}</div>
              {TEMPLATES.filter(t => t.group === g).map(t => (
                <button key={t.name} style={{ ...styles.sideItem, ...(text === t.query ? styles.sideItemActive : {}) }} onClick={() => loadQuery(t.query)}>{t.name}</button>
              ))}
            </div>
          ))}
        </aside>

        <main style={{ minWidth: 0 }}>
          {/* ---------- costruttore ---------- */}
          <div style={styles.card}>
            {!parsed || !ds ? (
              <p style={styles.muted}>Correggi la query qui sotto per usare di nuovo i menu.</p>
            ) : (
              <>
                <div style={styles.builderRow}>
                  <label style={styles.field}><span style={styles.fieldLabel}>Dati</span>
                    <select style={styles.select} value={ds.name} onChange={e => changeDataset(e.target.value)}>
                      {catalog.map(d => <option key={d.name} value={d.name}>{d.label}</option>)}
                    </select>
                  </label>
                  <label style={styles.field}><span style={styles.fieldLabel}>Raggruppa per</span>
                    <select style={styles.select} value={parsed.group_by[0] || ''} onChange={e => edit({ group_by: e.target.value ? [e.target.value] : [] })}>
                      <option value="">Nessuno</option>
                      {dims.map(d => <option key={d.name} value={d.name}>{d.label}</option>)}
                    </select>
                  </label>
                  <label style={styles.field}><span style={styles.fieldLabel}>Andamento nel tempo</span>
                    <select style={styles.select} value={parsed.timeseries || ''} onChange={e => edit({ timeseries: e.target.value || null })}>
                      <option value="">Nessuno</option>
                      {GRAINS.map(g => <option key={g} value={g}>{GRAIN_LABELS[g]}</option>)}
                    </select>
                  </label>
                  <label style={styles.field}><span style={styles.fieldLabel}>Periodo</span>
                    <select style={styles.select} value={currentPeriod} onChange={e => e.target.value !== 'custom' && edit({ during: e.target.value, since: null, until: null })}>
                      {periodOptions.map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
                      {currentPeriod === 'custom' && <option value="custom">Personalizzato</option>}
                    </select>
                  </label>
                  <label style={styles.field}><span style={styles.fieldLabel}>Confronta con</span>
                    <select style={styles.select} value={parsed.compare?.name && COMPARES[parsed.compare.name] ? parsed.compare.name : parsed.compare ? 'other' : ''} onChange={e => edit({ compare: e.target.value ? { name: e.target.value } : null })}>
                      <option value="">Nessun confronto</option>
                      {Object.entries(COMPARES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                      {parsed.compare && !COMPARES[parsed.compare.name] && <option value="other">{parsed.compare.name ? RANGES[parsed.compare.name]?.label || parsed.compare.name : 'Date scelte'}</option>}
                    </select>
                  </label>
                  <label style={styles.field}><span style={styles.fieldLabel}>Grafico</span>
                    <select style={styles.select} value={parsed.chart || ''} onChange={e => edit({ chart: e.target.value || null })}>
                      <option value="">Automatico</option>
                      {Object.entries(CHART_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </label>
                </div>
                <div style={styles.fieldLabel}>Cosa mostrare</div>
                <div style={styles.chips}>
                  {metrics.map(m => {
                    const on = parsed.show.includes(m.name)
                    return (
                      <button key={m.name} title={m.description || m.label}
                        style={{ ...styles.chip, ...(on ? styles.chipOn : {}) }}
                        onClick={() => edit({ show: on ? parsed.show.filter(x => x !== m.name) : [...parsed.show, m.name] })}>
                        {on ? '✓ ' : '+ '}{m.label}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* ---------- editor ---------- */}
          <div style={styles.card}>
            <div style={styles.editorHead}>
              <span style={styles.fieldLabel}>Query</span>
              <span style={styles.muted}>Ctrl + Invio per eseguire</span>
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(text) } }}
              spellCheck={false}
              style={styles.editor}
              rows={Math.min(14, Math.max(6, text.split('\n').length + 1))}
              aria-label="Query"
            />
            {error && <div style={styles.error}>{error}</div>}
            <div style={styles.actions}>
              <button style={styles.primary} onClick={() => run(text)} disabled={running}>{running ? 'Esecuzione…' : 'Esegui'}</button>
              <button style={styles.secondary} onClick={saveQuery}>Salva analisi</button>
              <button style={styles.secondary} onClick={() => navigator.clipboard?.writeText(text)}>Copia</button>
              <button style={styles.ghost} onClick={() => setShowHelp(v => !v)}>{showHelp ? 'Nascondi guida' : 'Guida e campi'}</button>
            </div>
            {showHelp && (
              <div style={styles.help}>
                <div style={styles.helpGrid}>
                  <div>
                    <div style={styles.helpTitle}>Come si scrive</div>
                    <pre style={styles.pre}>{`FROM <dati>            vendite: sales, products, menu,
                       visits, service, kitchen
  SHOW <metriche>      separate da virgola
  WHERE <campo> = 'x'  anche !=, IN ('a','b'), CONTAINS 'x'
  GROUP BY <dimensione>
  TIMESERIES hour | day | week | month
  HAVING <metrica> > 10
  DURING today | yesterday | last_7_days
         | last_30_days | this_month | ...
  SINCE -30d UNTIL today
  DURING '2026-10-01' TO '2026-10-31'
  COMPARE TO previous_period | previous_year
             | yesterday | last_week | ...
  ORDER BY <campo> DESC
  LIMIT 50
VISUALIZE <metrica> TYPE line | bar | table`}</pre>
                  </div>
                  {ds && (
                    <div>
                      <div style={styles.helpTitle}>Campi di {ds.label} <span style={styles.muted}>({ds.name})</span></div>
                      <p style={{ ...styles.muted, margin: '0 0 8px' }}>{ds.description}</p>
                      <div style={styles.fieldsList}>
                        {ds.fields.map(f => (
                          <div key={f.name} style={styles.fieldItem}>
                            <code style={styles.code}>{f.name}</code>
                            <span>{f.label}{f.kind === 'dimension' ? ' · dimensione' : ''}{f.description ? <span style={styles.muted}> — {f.description}</span> : null}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ---------- risultati ---------- */}
          {result && view && (
            <div style={{ opacity: running ? 0.5 : 1, transition: 'opacity 0.2s' }}>
              <div style={styles.resultHead}>
                <div>
                  <div style={styles.resultTitle}>{result.ds.label}</div>
                  <div style={styles.muted}>{formatRange(result.range)}{result.compare ? ` · confronto con ${formatRange(result.compare)}` : ''}</div>
                </div>
                <button style={styles.secondary} onClick={downloadCSV}>Scarica CSV</button>
              </div>

              <div style={styles.totals}>
                {view.metCols.map(m => (
                  <div key={m.key} style={styles.total}>
                    <div style={styles.totalLabel}>{m.label}</div>
                    <div style={styles.totalValue}>{formatValue(m.type, result.totals[m.key])}</div>
                    {result.prevTotals && (
                      <div style={styles.totalSub}>
                        <Change metric={m.key} cur={result.totals[m.key]} prev={result.prevTotals[m.key]} type={m.type} />
                        <span style={styles.muted}> vs {formatValue(m.type, result.prevTotals[m.key])}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* grafico con una sola dimensione (tempo o gruppo); con due dimensioni resta la tabella */}
              {result.chart !== 'table' && view.rows.length > 0 && view.dimCols.length === 1 && result.visualize.map(m => <Chart key={m} metric={m} />)}

              {view.dimCols.length > 0 && (
                <div style={styles.card}>
                  {view.rows.length === 0 ? (
                    <p style={styles.muted}>Nessun dato in questo periodo.</p>
                  ) : (
                    <div style={styles.tableWrap}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            {view.dimCols.map(c => <th key={c.key} style={{ ...styles.th, textAlign: 'left' }}>{c.label}</th>)}
                            {view.metCols.map(m => (
                              <th key={m.key} style={styles.th} colSpan={result.compare ? 2 : 1}>{m.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {view.rows.map((r, i) => (
                            <tr key={i} style={styles.tr}>
                              {view.dimCols.map(c => <td key={c.key} style={{ ...styles.td, fontWeight: 600 }}>{c.fmt(r[c.key])}</td>)}
                              {view.metCols.map(m => [
                                <td key={m.key} style={styles.tdNum}>{formatValue(m.type, r[m.key])}</td>,
                                result.compare && <td key={m.key + '_c'} style={styles.tdChange}><Change metric={m.key} cur={r[m.key]} prev={r.__prev?.[m.key]} type={m.type} /></td>,
                              ])}
                            </tr>
                          ))}
                          <tr style={styles.totalRow}>
                            {view.dimCols.map((c, idx) => <td key={c.key} style={{ ...styles.td, fontWeight: 700 }}>{idx === 0 ? 'Totale' : ''}</td>)}
                            {view.metCols.map(m => [
                              <td key={m.key} style={{ ...styles.tdNum, fontWeight: 700 }}>{formatValue(m.type, result.totals[m.key])}</td>,
                              result.compare && <td key={m.key + '_c'} style={styles.tdChange}><Change metric={m.key} cur={result.totals[m.key]} prev={result.prevTotals?.[m.key]} type={m.type} /></td>,
                            ])}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              <p style={styles.footnote}>Orari e giorni in ora italiana. Incasso = ordini chiusi e pagati, come in Revenue Analytics. Le visite al menu non contano le tue visite da titolare (dal 3 novembre 2026).</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#FFFFFF', padding: '40px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif', boxSizing: 'border-box' },
  header: { maxWidth: 1240, margin: '0 auto 28px auto' },
  backButton: { background: 'none', border: 'none', fontSize: 16, color: '#666', cursor: 'pointer', padding: '8px 0', marginBottom: 20, fontWeight: 500 },
  title: { fontSize: 24, fontWeight: 400, color: '#000', margin: '0 0 12px 0' },
  subtitle: { fontSize: 14, color: '#666', margin: 0, lineHeight: 1.6, maxWidth: 820 },
  inlineCode: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 12.5, background: '#F3F4F6', padding: '1px 5px', borderRadius: 4, color: '#111' },
  layout: { maxWidth: 1240, margin: '0 auto', display: 'grid', gap: 24, alignItems: 'start' },
  side: { display: 'flex', flexDirection: 'column', gap: 18 },
  sideBlock: { display: 'flex', flexDirection: 'column', gap: 2 },
  sideTitle: { fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: '#6B7280', margin: '0 0 6px 8px' },
  sideRow: { display: 'flex', alignItems: 'center' },
  sideItem: { flex: 1, textAlign: 'left', background: 'none', border: 'none', borderRadius: 6, padding: '7px 8px', fontSize: 13.5, color: '#111', cursor: 'pointer', lineHeight: 1.35 },
  sideItemActive: { background: '#F3F4F6', fontWeight: 600 },
  sideDel: { background: 'none', border: 'none', color: '#9CA3AF', fontSize: 18, cursor: 'pointer', padding: '0 8px' },
  card: { border: '1px solid #E5E7EB', borderRadius: 8, padding: 18, marginBottom: 16, background: '#FFF', boxSizing: 'border-box' },
  builderRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  fieldLabel: { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' },
  select: { padding: '9px 10px', fontSize: 14, border: '1px solid #E5E7EB', borderRadius: 6, background: '#FFF', color: '#000', minWidth: 0, width: '100%' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip: { border: '1px solid #E5E7EB', background: '#FFF', color: '#374151', borderRadius: 99, padding: '6px 11px', fontSize: 12.5, cursor: 'pointer' },
  chipOn: { background: '#000', borderColor: '#000', color: '#FFF', fontWeight: 600 },
  editorHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  editor: { width: '100%', boxSizing: 'border-box', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 13.5, lineHeight: 1.6, padding: '12px 14px', border: '1px solid #E5E7EB', borderRadius: 6, background: '#FAFAFA', color: '#111', resize: 'vertical', outline: 'none' },
  error: { marginTop: 10, padding: '10px 12px', borderRadius: 6, background: '#FEF2F2', color: '#B91C1C', fontSize: 13.5, lineHeight: 1.5 },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 },
  primary: { background: '#000', color: '#FFF', border: 'none', borderRadius: 6, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  secondary: { background: '#FFF', color: '#111', border: '1px solid #E5E7EB', borderRadius: 6, padding: '9px 14px', fontSize: 14, fontWeight: 500, cursor: 'pointer' },
  ghost: { background: 'none', color: '#374151', border: 'none', padding: '9px 6px', fontSize: 14, cursor: 'pointer', textDecoration: 'underline' },
  help: { marginTop: 14, borderTop: '1px solid #F3F4F6', paddingTop: 14 },
  helpGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 },
  helpTitle: { fontSize: 14, fontWeight: 700, marginBottom: 8 },
  pre: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 12, lineHeight: 1.6, background: '#FAFAFA', border: '1px solid #F3F4F6', borderRadius: 6, padding: 12, margin: 0, whiteSpace: 'pre-wrap', color: '#111' },
  fieldsList: { display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 300, overflowY: 'auto', fontSize: 13 },
  fieldItem: { display: 'flex', gap: 8, alignItems: 'baseline' },
  code: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 12, background: '#F3F4F6', padding: '1px 6px', borderRadius: 4, color: '#111', flexShrink: 0 },
  muted: { fontSize: 13, color: '#6B7280' },
  resultHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, margin: '8px 0 14px', flexWrap: 'wrap' },
  resultTitle: { fontSize: 18, fontWeight: 600, marginBottom: 2 },
  totals: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 },
  total: { background: '#F5F5F5', borderRadius: 8, padding: '14px 16px' },
  totalLabel: { fontSize: 12.5, color: '#666', fontWeight: 500, marginBottom: 6 },
  totalValue: { fontSize: 22, fontWeight: 700, color: '#000' },
  totalSub: { fontSize: 12.5, marginTop: 4 },
  changeNeutral: { fontSize: 12.5, fontWeight: 700, color: '#9CA3AF', whiteSpace: 'nowrap' },
  chartBox: { border: '1px solid #E5E7EB', borderRadius: 8, padding: '16px 16px 8px', marginBottom: 16 },
  chartTitle: { fontSize: 14, fontWeight: 600, marginBottom: 10 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 12px', fontSize: 12.5, fontWeight: 600, color: '#6B7280', borderBottom: '2px solid #E5E7EB', textAlign: 'right', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #F3F4F6' },
  td: { padding: '10px 12px', fontSize: 13.5, color: '#111', whiteSpace: 'nowrap' },
  tdNum: { padding: '10px 12px', fontSize: 13.5, color: '#111', textAlign: 'right', whiteSpace: 'nowrap' },
  tdChange: { padding: '10px 12px 10px 0', textAlign: 'right', width: 1 },
  totalRow: { background: '#FAFAFA', borderTop: '2px solid #E5E7EB' },
  footnote: { fontSize: 12, color: '#9CA3AF', lineHeight: 1.6, margin: '4px 0 0 0' },
}

export default ExploreAnalytics
