import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import DashboardLayout from '../components/ui/DashboardLayout'
import { Card, Button, Input, Badge, Modal, Spinner, EmptyState, PageHeader } from '../components/ui'

/**
 * Pagina Inventario.
 * Mostra per ogni prodotto/variante: Giacenza, Impegnato, Disponibile.
 * Permette di attivare il tracciamento, impostare la soglia minima e fare
 * rettifiche manuali (Carico +, Scarto -, Conteggio =). Lo scarico dalle
 * vendite (cassa/banco/tavolo/staff) avviene in automatico lato database.
 */
function InventoryPage({ session }) {
  const [restaurant, setRestaurant] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [onlyTracked, setOnlyTracked] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [adjust, setAdjust] = useState(null) // riga in rettifica
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => { if (session) load() }, [session])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      localStorage.clear(); sessionStorage.clear()
      window.location.href = '/#/'; window.location.reload()
    } catch (error) { console.error('Errore logout:', error) }
  }

  const load = async () => {
    try {
      setLoading(true)
      const { data: rest } = await supabase.from('restaurants').select('*').eq('user_id', session.user.id).single()
      setRestaurant(rest || null)
      if (!rest) { setRows([]); return }

      const { data: cats } = await supabase.from('categories').select('id, name').eq('restaurant_id', rest.id)
      const catIds = (cats || []).map(c => c.id)
      const catName = Object.fromEntries((cats || []).map(c => [c.id, c.name]))
      if (catIds.length === 0) { setRows([]); return }

      const { data: prods } = await supabase.from('products')
        .select('id, name, category_id, track_quantity, quantity, committed, low_stock_threshold')
        .in('category_id', catIds).order('name', { ascending: true })
      const prodIds = (prods || []).map(p => p.id)

      let variants = []
      if (prodIds.length) {
        const { data: vars } = await supabase.from('product_variants')
          .select('id, product_id, title, track_quantity, quantity, committed, low_stock_threshold, position')
          .in('product_id', prodIds).order('position', { ascending: true })
        variants = vars || []
      }
      const variantsByProduct = {}
      variants.forEach(v => { (variantsByProduct[v.product_id] = variantsByProduct[v.product_id] || []).push(v) })

      // Costruisce le righe: una per variante (se il prodotto ha varianti), altrimenti una per il prodotto
      const out = []
      ;(prods || []).forEach(p => {
        const vs = variantsByProduct[p.id] || []
        if (vs.length > 0) {
          vs.forEach(v => out.push({
            key: `v_${v.id}`, kind: 'variant', product_id: p.id, variant_id: v.id,
            name: p.name, sub: v.title, category: catName[p.category_id] || '',
            track: !!v.track_quantity, quantity: v.quantity || 0, committed: v.committed || 0,
            threshold: v.low_stock_threshold || 0,
          }))
        } else {
          out.push({
            key: `p_${p.id}`, kind: 'product', product_id: p.id, variant_id: null,
            name: p.name, sub: '', category: catName[p.category_id] || '',
            track: !!p.track_quantity, quantity: p.quantity || 0, committed: p.committed || 0,
            threshold: p.low_stock_threshold || 0,
          })
        }
      })
      setRows(out)
    } catch (error) {
      console.error('Errore caricamento inventario:', error)
    } finally {
      setLoading(false)
    }
  }

  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(r => {
      if (onlyTracked && !r.track) return false
      if (!q) return true
      return (r.name + ' ' + r.sub + ' ' + r.category).toLowerCase().includes(q)
    })
  }, [rows, query, onlyTracked])

  const lowCount = useMemo(() => rows.filter(r => r.track && (r.quantity - r.committed) <= r.threshold).length, [rows])
  const trackedCount = useMemo(() => rows.filter(r => r.track).length, [rows])

  const toggleTrack = async (row) => {
    try {
      await supabase.rpc('inv_set_tracking', {
        p_product_id: row.variant_id ? null : row.product_id,
        p_variant_id: row.variant_id, p_track: !row.track, p_threshold: null, p_allow_negative: null,
      })
      setRows(rs => rs.map(r => r.key === row.key ? { ...r, track: !r.track } : r))
    } catch (e) { console.error(e); alert('Errore nel salvataggio') }
  }

  const saveThreshold = async (row, value) => {
    const n = Math.max(0, parseInt(value, 10) || 0)
    if (n === row.threshold) return
    try {
      await supabase.rpc('inv_set_tracking', {
        p_product_id: row.variant_id ? null : row.product_id,
        p_variant_id: row.variant_id, p_track: null, p_threshold: n, p_allow_negative: null,
      })
      setRows(rs => rs.map(r => r.key === row.key ? { ...r, threshold: n } : r))
    } catch (e) { console.error(e); alert('Errore nel salvataggio') }
  }

  const submitAdjust = async () => {
    if (!adjust) return
    const amount = Math.abs(parseInt(adjust.amount, 10) || 0)
    let delta = 0, type = 'adjustment'
    if (adjust.mode === 'load') { delta = amount; type = 'restock' }
    else if (adjust.mode === 'waste') { delta = -amount; type = 'waste' }
    else { delta = (parseInt(adjust.amount, 10) || 0) - adjust.row.quantity; type = 'adjustment' } // conteggio = valore assoluto
    if (delta === 0) { setAdjust(null); return }
    try {
      setSaving(true)
      await supabase.rpc('inv_manual_adjust', {
        p_product_id: adjust.row.variant_id ? null : adjust.row.product_id,
        p_variant_id: adjust.row.variant_id, p_type: type, p_delta: delta, p_note: adjust.note || null,
      })
      setRows(rs => rs.map(r => r.key === adjust.row.key ? { ...r, quantity: r.quantity + delta } : r))
      setAdjust(null)
    } catch (e) { console.error(e); alert('Errore nella rettifica') }
    finally { setSaving(false) }
  }

  const th = { textAlign: 'left', padding: `${tokens.spacing.sm} ${tokens.spacing.md}`, fontSize: tokens.typography.fontSize.xs, fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.gray[500], textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${tokens.colors.gray[200]}`, whiteSpace: 'nowrap' }
  const td = { padding: `${tokens.spacing.sm} ${tokens.spacing.md}`, fontSize: tokens.typography.fontSize.sm, color: tokens.colors.gray[800], borderBottom: `1px solid ${tokens.colors.gray[100]}`, verticalAlign: 'middle' }
  const numStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' }

  const layoutProps = {
    restaurantName: restaurant?.name,
    userName: session?.user?.email,
    isPremium: restaurant?.subscription_tier === 'premium',
    permissions: ['*'],
    onLogout: handleLogout,
  }

  if (loading) {
    return (
      <DashboardLayout {...layoutProps}><Spinner size="lg" text="Caricamento inventario..." centered /></DashboardLayout>
    )
  }

  return (
    <DashboardLayout {...layoutProps}>
      <PageHeader title="Inventario" subtitle="Scorte dei prodotti. Le vendite (cassa, banco, tavolo, staff) scalano in automatico." />

      {/* Riepilogo + ricerca */}
      <div style={{ display: 'flex', gap: tokens.spacing.sm, flexWrap: 'wrap', alignItems: 'center', marginBottom: tokens.spacing.lg }}>
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <Input placeholder="Cerca un prodotto…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Button variant={onlyTracked ? 'primary' : 'outline'} size="md" onClick={() => setOnlyTracked(v => !v)}>
          {onlyTracked ? 'Mostra tutti' : 'Solo tracciati'}
        </Button>
        <Badge variant="info">{trackedCount} tracciati</Badge>
        {lowCount > 0 && <Badge variant="warning">{lowCount} scorta bassa</Badge>}
      </div>

      {displayed.length === 0 ? (
        <EmptyState title="Nessun prodotto" description={query ? 'Nessun risultato per la ricerca.' : 'Aggiungi prodotti dal menu per gestirne le scorte.'} />
      ) : (
        <Card padding="none">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
              <thead>
                <tr>
                  <th style={th}>Prodotto</th>
                  <th style={{ ...th, ...numStyle }}>Giacenza</th>
                  <th style={{ ...th, ...numStyle }}>Impegnato</th>
                  <th style={{ ...th, ...numStyle }}>Disponibile</th>
                  <th style={{ ...th, ...numStyle }}>Soglia</th>
                  <th style={{ ...th, ...numStyle }}>Traccia</th>
                  <th style={{ ...th, textAlign: 'right' }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(row => {
                  const disponibile = row.quantity - row.committed
                  const low = row.track && disponibile <= row.threshold
                  const out = row.track && disponibile <= 0
                  return (
                    <tr key={row.key} style={{ background: low ? '#fff7ed' : 'transparent' }}>
                      <td style={td}>
                        <div style={{ fontWeight: tokens.typography.fontWeight.medium, color: tokens.colors.black }}>{row.name}</div>
                        <div style={{ fontSize: tokens.typography.fontSize.xs, color: tokens.colors.gray[500] }}>
                          {row.sub ? row.sub + ' · ' : ''}{row.category}
                          {out ? ' · ' : ''}{out && <span style={{ color: '#b91c1c', fontWeight: 600 }}>esaurito</span>}
                          {!out && low ? <span style={{ color: '#b45309', fontWeight: 600 }}> · scorta bassa</span> : null}
                        </div>
                      </td>
                      <td style={{ ...td, ...numStyle, fontWeight: 600 }}>{row.track ? row.quantity : '—'}</td>
                      <td style={{ ...td, ...numStyle, color: tokens.colors.gray[500] }}>{row.track ? row.committed : '—'}</td>
                      <td style={{ ...td, ...numStyle, fontWeight: 700, color: out ? '#b91c1c' : (low ? '#b45309' : tokens.colors.black) }}>{row.track ? disponibile : '—'}</td>
                      <td style={{ ...td, ...numStyle }}>
                        {row.track ? (
                          <input type="number" min="0" defaultValue={row.threshold}
                            onBlur={(e) => saveThreshold(row, e.target.value)}
                            style={{ width: '56px', textAlign: 'center', padding: '4px', border: `1px solid ${tokens.colors.gray[300]}`, borderRadius: tokens.borderRadius.md, fontSize: tokens.typography.fontSize.sm }} />
                        ) : '—'}
                      </td>
                      <td style={{ ...td, ...numStyle }}>
                        <label style={{ display: 'inline-flex', cursor: 'pointer' }}>
                          <input type="checkbox" checked={row.track} onChange={() => toggleTrack(row)} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: tokens.colors.black }} />
                        </label>
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <Button variant="outline" size="sm" disabled={!row.track}
                          onClick={() => setAdjust({ row, mode: 'load', amount: '', note: '' })}>
                          Rettifica
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal rettifica */}
      {adjust && (
        <Modal isOpen={true} onClose={() => setAdjust(null)}>
          <Modal.Header><Modal.Title>Rettifica scorta</Modal.Title></Modal.Header>
          <Modal.Body>
            <p style={{ margin: `0 0 ${tokens.spacing.md}`, fontSize: tokens.typography.fontSize.sm, color: tokens.colors.gray[600] }}>
              {adjust.row.name}{adjust.row.sub ? ` · ${adjust.row.sub}` : ''} — giacenza attuale: <strong>{adjust.row.quantity}</strong>
            </p>
            <div style={{ display: 'flex', gap: tokens.spacing.sm, marginBottom: tokens.spacing.md, flexWrap: 'wrap' }}>
              {[['load', 'Carico +'], ['waste', 'Scarto −'], ['count', 'Conteggio =']].map(([m, lbl]) => (
                <Button key={m} variant={adjust.mode === m ? 'primary' : 'outline'} size="sm"
                  onClick={() => setAdjust(a => ({ ...a, mode: m }))}>{lbl}</Button>
              ))}
            </div>
            <label style={{ display: 'block', fontSize: tokens.typography.fontSize.sm, fontWeight: 500, marginBottom: tokens.spacing.xs }}>
              {adjust.mode === 'count' ? 'Nuova giacenza (valore esatto)' : 'Quantità'}
            </label>
            <Input type="number" min="0" value={adjust.amount} autoFocus
              onChange={(e) => setAdjust(a => ({ ...a, amount: e.target.value }))}
              placeholder={adjust.mode === 'count' ? 'Es. 24' : 'Es. 10'} />
            <label style={{ display: 'block', fontSize: tokens.typography.fontSize.sm, fontWeight: 500, margin: `${tokens.spacing.md} 0 ${tokens.spacing.xs}` }}>Nota (facoltativa)</label>
            <Input value={adjust.note} onChange={(e) => setAdjust(a => ({ ...a, note: e.target.value }))} placeholder="Es. carico fornitore, rottura…" />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline" onClick={() => setAdjust(null)} disabled={saving}>Annulla</Button>
            <Button variant="primary" onClick={submitAdjust} disabled={saving}>{saving ? 'Salvo…' : 'Conferma'}</Button>
          </Modal.Footer>
        </Modal>
      )}
    </DashboardLayout>
  )
}

export default InventoryPage
