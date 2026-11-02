import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import DashboardLayout from '../components/ui/DashboardLayout'
import { Card, Button, Input, Badge, Modal, Spinner, EmptyState, PageHeader } from '../components/ui'
import { formatPrice } from '../lib/priceFormat'

/**
 * Prodotti (TEST): vista alternativa dei prodotti in RIGHE (stile Shopify),
 * invece della griglia. Ogni riga: immagine, nome, categoria, prezzo e pulsanti
 * laterali (Modifica / Elimina). Serve solo per valutare il layout.
 */
function ProductsTestPage({ session }) {
  const [restaurant, setRestaurant] = useState(null)
  const [rows, setRows] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showCatFilter, setShowCatFilter] = useState(false)
  const [edit, setEdit] = useState(null) // prodotto in modifica
  const [saving, setSaving] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

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
      const { data: cats } = await supabase.from('categories').select('id, name').eq('restaurant_id', rest.id).order('order', { ascending: true })
      setCategories(cats || [])
      const catIds = (cats || []).map(c => c.id)
      const catName = Object.fromEntries((cats || []).map(c => [c.id, c.name]))
      if (catIds.length === 0) { setRows([]); return }
      const { data: prods } = await supabase.from('products')
        .select('id, name, category_id, price, image_url, variants:v_product_variants(price)')
        .in('category_id', catIds).order('name', { ascending: true })
      setRows((prods || []).map(p => ({ ...p, hasVariants: (p.variants || []).length > 0, categoryName: catName[p.category_id] || '' })))
    } catch (error) {
      console.error('Errore caricamento prodotti:', error)
    } finally {
      setLoading(false)
    }
  }

  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(r => {
      if (selectedCategory !== 'all' && r.category_id !== selectedCategory) return false
      if (!q) return true
      return (r.name + ' ' + r.categoryName).toLowerCase().includes(q)
    })
  }, [rows, query, selectedCategory])

  const selectedCatName = selectedCategory === 'all' ? null : (categories.find(c => c.id === selectedCategory)?.name || null)

  const saveEdit = async () => {
    if (!edit) return
    try {
      setSaving(true)
      const price = parseFloat(String(edit.price).replace(',', '.')) || 0
      await supabase.from('products').update({ name: edit.name, price, category_id: edit.category_id }).eq('id', edit.id)
      setRows(rs => rs.map(r => r.id === edit.id ? { ...r, name: edit.name, price, category_id: edit.category_id, categoryName: (categories.find(c => c.id === edit.category_id)?.name || r.categoryName) } : r))
      setEdit(null)
    } catch (e) { console.error(e); alert('Errore nel salvataggio') }
    finally { setSaving(false) }
  }

  const removeProduct = async (row) => {
    if (!window.confirm(`Eliminare "${row.name}"? L'azione non è reversibile.`)) return
    try {
      await supabase.from('products').delete().eq('id', row.id)
      setRows(rs => rs.filter(r => r.id !== row.id))
    } catch (e) { console.error(e); alert('Errore nell\'eliminazione') }
  }

  const layoutProps = {
    restaurantName: restaurant?.name,
    userName: session?.user?.email,
    isPremium: restaurant?.subscription_tier === 'premium',
    permissions: ['*'],
    onLogout: handleLogout,
  }

  if (loading) {
    return <DashboardLayout {...layoutProps}><Spinner size="lg" text="Caricamento..." centered /></DashboardLayout>
  }

  return (
    <DashboardLayout {...layoutProps}>
      <PageHeader title="Prodotti (test)" subtitle="Vista a righe in stile e-commerce. Pagina di prova per valutare il layout." />

      {/* Ricerca + filtro categoria */}
      <div style={{ display: 'flex', gap: tokens.spacing.sm, flexWrap: 'wrap', alignItems: 'center', marginBottom: tokens.spacing.lg }}>
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <Input placeholder="Cerca un prodotto…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Button variant={selectedCatName ? 'primary' : 'outline'} size="md" onClick={() => setShowCatFilter(true)}>
          {selectedCatName ? `Categoria: ${selectedCatName}` : 'Filtra per categoria'}
        </Button>
        <Badge variant="info">{displayed.length} prodotti</Badge>
      </div>

      {displayed.length === 0 ? (
        <EmptyState title="Nessun prodotto" description={query ? 'Nessun risultato per la ricerca.' : 'Non ci sono prodotti.'} />
      ) : (
        <Card padding="none">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {displayed.map((row, i) => (
              <div
                key={row.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: tokens.spacing.md,
                  padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
                  borderTop: i === 0 ? 'none' : `1px solid ${tokens.colors.gray[100]}`,
                }}
              >
                {/* Immagine */}
                {row.image_url
                  ? <img src={row.image_url} alt={row.name} style={{ width: '52px', height: '52px', borderRadius: tokens.borderRadius.md, objectFit: 'cover', flexShrink: 0, border: `1px solid ${tokens.colors.gray[200]}` }} loading="lazy" />
                  : <div style={{ width: '52px', height: '52px', borderRadius: tokens.borderRadius.md, flexShrink: 0, background: tokens.colors.gray[100], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>🍽️</div>}

                {/* Nome + categoria */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: tokens.typography.fontSize.base, fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.black, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</div>
                  <div style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.gray[500] }}>{row.categoryName}</div>
                </div>

                {/* Prezzo */}
                <div style={{ fontSize: tokens.typography.fontSize.base, fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.black, whiteSpace: 'nowrap', textAlign: 'right', minWidth: '72px' }}>
                  {formatPrice(row)}
                </div>

                {/* Pulsanti laterali */}
                {!isMobile && (
                  <div style={{ display: 'flex', gap: tokens.spacing.xs, flexShrink: 0 }}>
                    <Button variant="outline" size="sm" onClick={() => setEdit({ id: row.id, name: row.name, price: String(row.price ?? ''), category_id: row.category_id })}>Modifica</Button>
                    <Button variant="ghost" size="sm" onClick={() => removeProduct(row)}>Elimina</Button>
                  </div>
                )}
                {isMobile && (
                  <Button variant="outline" size="sm" onClick={() => setEdit({ id: row.id, name: row.name, price: String(row.price ?? ''), category_id: row.category_id })}>⋯</Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filtro categoria */}
      {showCatFilter && (
        <Modal isOpen={true} onClose={() => setShowCatFilter(false)}>
          <Modal.Header><Modal.Title>Filtra per categoria</Modal.Title></Modal.Header>
          <Modal.Body>
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.sm }}>
              {[{ id: 'all', name: 'Tutte le categorie' }, ...categories].map(cat => {
                const active = selectedCategory === cat.id
                return (
                  <button key={cat.id} onClick={() => { setSelectedCategory(cat.id); setShowCatFilter(false) }}
                    style={{ padding: `${tokens.spacing.sm} ${tokens.spacing.md}`, fontSize: tokens.typography.fontSize.sm, fontWeight: active ? tokens.typography.fontWeight.semibold : tokens.typography.fontWeight.medium, color: active ? tokens.colors.white : tokens.colors.black, background: active ? tokens.colors.black : tokens.colors.gray[100], border: 'none', borderRadius: tokens.borderRadius.md, cursor: 'pointer', textAlign: 'left' }}>
                    {cat.name}
                  </button>
                )
              })}
            </div>
          </Modal.Body>
          <Modal.Footer><Button variant="outline" onClick={() => setShowCatFilter(false)}>Chiudi</Button></Modal.Footer>
        </Modal>
      )}

      {/* Modifica prodotto */}
      {edit && (
        <Modal isOpen={true} onClose={() => setEdit(null)}>
          <Modal.Header><Modal.Title>Modifica prodotto</Modal.Title></Modal.Header>
          <Modal.Body>
            <label style={{ display: 'block', fontSize: tokens.typography.fontSize.sm, fontWeight: 500, marginBottom: tokens.spacing.xs }}>Nome</label>
            <Input value={edit.name} onChange={(e) => setEdit(a => ({ ...a, name: e.target.value }))} />
            <label style={{ display: 'block', fontSize: tokens.typography.fontSize.sm, fontWeight: 500, margin: `${tokens.spacing.md} 0 ${tokens.spacing.xs}` }}>Prezzo (€)</label>
            <Input type="number" min="0" step="0.01" value={edit.price} onChange={(e) => setEdit(a => ({ ...a, price: e.target.value }))} />
            <label style={{ display: 'block', fontSize: tokens.typography.fontSize.sm, fontWeight: 500, margin: `${tokens.spacing.md} 0 ${tokens.spacing.xs}` }}>Categoria</label>
            <select value={edit.category_id} onChange={(e) => setEdit(a => ({ ...a, category_id: e.target.value }))}
              style={{ width: '100%', padding: `${tokens.spacing.sm} ${tokens.spacing.md}`, border: `1px solid ${tokens.colors.gray[300]}`, borderRadius: tokens.borderRadius.md, fontSize: tokens.typography.fontSize.base }}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline" onClick={() => setEdit(null)} disabled={saving}>Annulla</Button>
            <Button variant="primary" onClick={saveEdit} disabled={saving}>{saving ? 'Salvo…' : 'Salva'}</Button>
          </Modal.Footer>
        </Modal>
      )}
    </DashboardLayout>
  )
}

export default ProductsTestPage
