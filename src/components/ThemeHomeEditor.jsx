import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import MenuBuilderLayout from './MenuBuilderLayout'
import ProductPickerModal from './ProductPickerModal'
import ProductsOrderModal from './ProductsOrderModal'
import { getThemeStyles, ensureThemeFonts, FONT_OPTIONS } from '../lib/themeStyles'
import { formatPrice } from '../lib/priceFormat'

const SORTS = [
  { value: 'manual', label: 'Manuale' },
  { value: 'name_az', label: 'Nome A → Z' },
  { value: 'name_za', label: 'Nome Z → A' },
  { value: 'price_lo', label: 'Prezzo ↑' },
  { value: 'price_hi', label: 'Prezzo ↓' },
  { value: 'best', label: 'Più venduti' }
]

const uuid = () => (crypto?.randomUUID ? crypto.randomUUID() : 'sec-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8))

const newSection = (cats) => ({
  id: uuid(),
  type: 'carousel_category',
  title: '',
  description: '',
  categoryId: cats[0]?.id || null,
  productIds: [],
  limit: 4,
  sort: 'manual',
  showViewAll: true
})

/**
 * Editor Home LIVE (stile Shopify) — mobile-first.
 * Anteprima INLINE (niente iframe): mostra il vero menu con il tema in bozza e
 * si aggiorna all'istante mentre modifichi. Da qui si compone la home a caroselli
 * (theme_config.homeSections), si regolano colori/font/dimensioni macro e si salva.
 */
export default function ThemeHomeEditor({ restaurantId, onClose }) {
  const [restaurant, setRestaurant] = useState(null)
  const [config, setConfig] = useState(null)
  const [sections, setSections] = useState([])
  const [cats, setCats] = useState([])
  const [products, setProducts] = useState({})     // { [categoryId]: [prodotto...] }
  const [openingHours, setOpeningHours] = useState([])
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('content')         // content | appearance
  const [previewFull, setPreviewFull] = useState(false)
  const [dragIndex, setDragIndex] = useState(null)
  const rowRefs = useRef([])

  const allProducts = useMemo(() => Object.values(products).flat(), [products])

  const setMacro = (patch) => setConfig(prev => ({ ...(prev || {}), ...patch }))

  // Tema in bozza: tutto ciò che vedi in anteprima si basa su questo
  const draftConfig = useMemo(
    () => ({ ...(config || {}), layoutStyle: 'builder', homeSections: sections }),
    [config, sections]
  )
  const resolvedTheme = useMemo(() => getThemeStyles(draftConfig), [draftConfig])

  // Carica i Google Font quando cambiano i font scelti
  useEffect(() => { ensureThemeFonts(draftConfig) }, [config?.fontFamily, config?.headingFontFamily])

  // Caricamento dati (ristorante, categorie, prodotti con varianti, orari)
  useEffect(() => {
    if (!restaurantId) { setLoading(false); return }
    let active = true
    ;(async () => {
      setLoading(true)
      const { data: r } = await supabase
        .from('restaurants')
        .select('id, name, logo_url, address, phone, subdomain, theme_config')
        .eq('id', restaurantId).single()
      if (!active) return
      setRestaurant(r || null)
      const cfg = r?.theme_config || {}
      setConfig(cfg)
      setSections(Array.isArray(cfg.homeSections) ? cfg.homeSections : [])

      const { data: c } = await supabase
        .from('categories').select('*')
        .eq('restaurant_id', restaurantId).eq('is_visible', true)
        .order('order', { ascending: true })
      if (!active) return
      const categories = c || []
      setCats(categories)

      const catIds = categories.map(x => x.id)
      const map = {}
      if (catIds.length) {
        const { data: ps } = await supabase
          .from('products').select('*')
          .in('category_id', catIds).eq('is_visible', true)
          .order('category_id').order('order', { ascending: true })
        const prodIds = (ps || []).map(p => p.id)
        let variantsByProduct = {}
        if (prodIds.length) {
          const { data: vs } = await supabase
            .from('v_product_variants').select('*')
            .in('product_id', prodIds).eq('is_available', true).order('position')
          for (const v of vs || []) (variantsByProduct[v.product_id] ||= []).push(v)
        }
        for (const cat of categories) {
          map[cat.id] = (ps || []).filter(p => p.category_id === cat.id).map(p => ({
            ...p,
            variants: variantsByProduct[p.id] || [],
            hasVariants: (variantsByProduct[p.id] || []).length > 0
          }))
        }
      }
      if (!active) return
      setProducts(map)

      const { data: h } = await supabase
        .from('opening_hours').select('*')
        .eq('restaurant_id', restaurantId).order('order', { ascending: true })
      if (!active) return
      setOpeningHours(h || [])
      setLoading(false)
    })()
    return () => { active = false }
  }, [restaurantId])

  // Riordino sezioni (trascinamento con pointer events)
  useEffect(() => {
    if (dragIndex === null) return
    const move = (e) => {
      const y = e.touches ? e.touches[0].clientY : e.clientY
      const mids = rowRefs.current.map(el => el ? el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2 : Infinity)
      let target = mids.findIndex(m => y < m); if (target === -1) target = sections.length - 1
      if (target !== dragIndex && target >= 0) {
        setSections(prev => { const n = [...prev]; const [m] = n.splice(dragIndex, 1); n.splice(target, 0, m); return n })
        setDragIndex(target)
      }
    }
    const end = () => setDragIndex(null)
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', end)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end) }
  }, [dragIndex, sections])

  const saveSection = (sec) => {
    setSections(prev => prev.some(s => s.id === sec.id) ? prev.map(s => s.id === sec.id ? sec : s) : [...prev, sec])
    setEditing(null)
  }

  const saveAll = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('restaurants')
        .update({ theme_config: draftConfig, updated_at: new Date().toISOString() })
        .eq('id', restaurantId)
      if (error) throw error
      alert('✅ Home salvata! Il menu è stato aggiornato.')
      onClose?.()
    } catch (e) {
      alert('Errore salvataggio: ' + e.message)
      setSaving(false)
    }
  }

  const typeLabel = (s) => s.type === 'carousel_manual' ? 'Prodotti scelti' : 'Da categoria'

  // Anteprima live: il vero menu, contenuto in un "telefono"
  const preview = (
    <div style={S.deviceOuter}>
      <div style={S.device}>
        {restaurant ? (
          <MenuBuilderLayout
            restaurant={restaurant}
            categories={cats}
            products={products}
            openingHours={openingHours}
            theme={resolvedTheme}
            subdomain={restaurant.subdomain}
            orderSettingsEnabled={true}
            favoritesCount={0}
            cartCount={0}
            onOpenCart={() => {}}
            onOpenFavorites={() => {}}
            onAddProduct={() => {}}
            onToggleFavorite={() => {}}
            isFav={() => false}
            trackProductViewed={() => {}}
            sections={sections}
          />
        ) : (
          <div style={{ padding: 30, textAlign: 'center', color: '#888' }}>Anteprima non disponibile</div>
        )}
      </div>
      <button style={S.expand} onClick={() => setPreviewFull(v => !v)} title={previewFull ? 'Riduci' : 'Ingrandisci'}>
        {previewFull ? '🗕 Modifica' : '🗖 Anteprima'}
      </button>
    </div>
  )

  if (loading) {
    return <div style={S.overlay}><div style={S.panel}><div style={{ padding: 40, textAlign: 'center' }}>Caricamento…</div></div></div>
  }

  return (
    <div style={S.overlay}>
      <div style={S.panel}>
        <div style={S.head}>
          <button style={S.back} onClick={() => onClose?.()}>✕</button>
          <div style={S.title}>Editor Home <span style={S.live}>● LIVE</span></div>
          <button style={S.save} onClick={saveAll} disabled={saving}>{saving ? '…' : 'Salva'}</button>
        </div>

        {/* ANTEPRIMA LIVE (sempre visibile, in alto) */}
        <div style={{ ...S.previewPane, flex: previewFull ? '1 1 auto' : '0 0 46vh' }}>
          {preview}
        </div>

        {/* CONTROLLI (nascosti quando l'anteprima è a tutto schermo) */}
        {!previewFull && (
          <div style={S.controls}>
            <div style={S.tabs}>
              {[{ k: 'content', l: 'Contenuto' }, { k: 'appearance', l: 'Aspetto' }].map(o => (
                <button key={o.k} onClick={() => setTab(o.k)} style={{ ...S.tab, ...(tab === o.k ? S.tabOn : {}) }}>{o.l}</button>
              ))}
            </div>

            <div style={S.body}>
              {tab === 'content' && (
                <>
                  <div style={S.hint}>Componi la home: aggiungi caroselli, trascinali per ordinarli. Le modifiche si vedono subito nell'anteprima.</div>
                  {sections.length === 0 && <div style={S.empty}>Nessuna sezione. Aggiungi il primo carosello.</div>}
                  {sections.map((sec, i) => (
                    <div key={sec.id} ref={el => (rowRefs.current[i] = el)} style={{ ...S.row, ...(dragIndex === i ? S.rowDrag : {}) }}>
                      <div style={S.handle} onPointerDown={() => setDragIndex(i)} title="Trascina">
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="#9ca3af"><circle cx="5" cy="3" r="1.3"/><circle cx="11" cy="3" r="1.3"/><circle cx="5" cy="8" r="1.3"/><circle cx="11" cy="8" r="1.3"/><circle cx="5" cy="13" r="1.3"/><circle cx="11" cy="13" r="1.3"/></svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={S.rowTitle}>{sec.title || '(senza titolo)'}</div>
                        <div style={S.rowSub}>{typeLabel(sec)}{sec.type === 'carousel_category' ? ` · ${cats.find(c => c.id === sec.categoryId)?.name || '—'}` : ` · ${(sec.productIds || []).length} prodotti`}</div>
                      </div>
                      <button style={S.rowBtn} onClick={() => setEditing({ ...sec })}>Modifica</button>
                      <button style={S.rowDel} onClick={() => setSections(prev => prev.filter(s => s.id !== sec.id))} aria-label="Elimina">×</button>
                    </div>
                  ))}
                  <button style={S.add} onClick={() => setEditing(newSection(cats))}>+ Aggiungi carosello</button>
                </>
              )}

              {tab === 'appearance' && (
                <>
                  <div style={S.groupTitle}>Colori</div>
                  <ColorRow label="Sfondo pagina" value={config?.primaryColor || '#ffffff'} onChange={v => setMacro({ primaryColor: v })} />
                  <ColorRow label="Sfondo card" value={config?.cardBackground || '#ffffff'} onChange={v => setMacro({ cardBackground: v })} />
                  <ColorRow label="Testo" value={config?.textSecondaryColor || '#111827'} onChange={v => setMacro({ textSecondaryColor: v })} />
                  <ColorRow label="Accento / link" value={config?.accentColor || '#2563EB'} onChange={v => setMacro({ accentColor: v })} />
                  <ColorRow label="Pulsanti" value={config?.buttonColor || '#111827'} onChange={v => setMacro({ buttonColor: v })} />
                  <ColorRow label="Testo pulsanti" value={config?.buttonTextColor || '#ffffff'} onChange={v => setMacro({ buttonTextColor: v })} />
                  <ColorRow label="Bordi" value={config?.borderColor || '#e5e7eb'} onChange={v => setMacro({ borderColor: v })} />

                  <div style={{ ...S.groupTitle, marginTop: 18 }}>Font</div>
                  <label style={S.label}>Font del testo</label>
                  <select style={S.input} value={config?.fontFamily || 'system'} onChange={e => setMacro({ fontFamily: e.target.value })}>
                    {FONT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <label style={S.label}>Font dei titoli</label>
                  <select style={S.input} value={config?.headingFontFamily || config?.fontFamily || 'system'} onChange={e => setMacro({ headingFontFamily: e.target.value })}>
                    {FONT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>

                  <div style={{ ...S.groupTitle, marginTop: 18 }}>Dimensioni e spazi</div>
                  <Seg label="Dimensione testi" value={Number(config?.textScale) || 1} onChange={v => setMacro({ textScale: v })}
                    options={[{ v: 0.9, l: 'Piccoli' }, { v: 1, l: 'Medi' }, { v: 1.15, l: 'Grandi' }]} />
                  <Seg label="Dimensione card" value={config?.cardSize || 'md'} onChange={v => setMacro({ cardSize: v })}
                    options={[{ v: 'sm', l: 'Piccole' }, { v: 'md', l: 'Medie' }, { v: 'lg', l: 'Grandi' }]} />
                  <Seg label="Spazio tra caroselli" value={config?.sectionGap != null ? Number(config.sectionGap) : 18} onChange={v => setMacro({ sectionGap: v })}
                    options={[{ v: 10, l: 'Compatto' }, { v: 18, l: 'Medio' }, { v: 28, l: 'Ampio' }]} />
                  <Seg label="Forma angoli" value={config?.borderRadius === '0' ? '0' : '14'} onChange={v => setMacro({ borderRadius: v })}
                    options={[{ v: '14', l: 'Arrotondato' }, { v: '0', l: 'Squadrato' }]} />
                  <Seg label="Badge categorie sotto l'header" value={config?.showCategoryChips === false ? 'no' : 'si'} onChange={v => setMacro({ showCategoryChips: v === 'si' })}
                    options={[{ v: 'si', l: 'Mostra' }, { v: 'no', l: 'Nascondi' }]} />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {editing && (
        <SectionForm
          draft={editing}
          cats={cats}
          products={allProducts}
          onCancel={() => setEditing(null)}
          onSave={saveSection}
        />
      )}
    </div>
  )
}

function ColorRow({ label, value, onChange }) {
  return (
    <div style={S.colorRow}>
      <span style={S.colorLabel}>{label}</span>
      <input type="color" value={toHex(value)} onChange={e => onChange(e.target.value)} style={S.colorSwatch} />
      <input type="text" value={value} onChange={e => onChange(e.target.value)} style={S.colorText} />
    </div>
  )
}
// Gli input type=color accettano solo #rrggbb: normalizzo per il controllo nativo
function toHex(v) {
  if (typeof v !== 'string') return '#000000'
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v
  if (/^#[0-9a-fA-F]{3}$/.test(v)) return '#' + v.slice(1).split('').map(c => c + c).join('')
  return '#000000'
}

function SectionForm({ draft, cats, products, onCancel, onSave }) {
  const [s, setS] = useState(draft)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)
  const set = (patch) => setS(prev => ({ ...prev, ...patch }))
  // Prodotti scelti, nell'ordine salvato in productIds
  const chosen = (s.productIds || []).map(id => products.find(p => p.id === id)).filter(Boolean)
  const removeProduct = (id) => set({ productIds: (s.productIds || []).filter(x => x !== id) })

  // Prodotti della categoria (per i caroselli "Da categoria")
  const catProducts = s.type === 'carousel_category'
    ? products.filter(p => p.category_id === s.categoryId)
    : []
  // Applica un ordine manuale (lista di id) a una lista di prodotti
  const orderByManual = (list, order) => {
    if (!order?.length) return list
    const idx = new Map(order.map((id, i) => [id, i]))
    return [...list].sort((a, b) => (idx.has(a.id) ? idx.get(a.id) : 1e9) - (idx.has(b.id) ? idx.get(b.id) : 1e9))
  }
  // Lista da riordinare quando l'ordinamento è "Manuale" (vale per entrambi i tipi)
  const reorderList = s.type === 'carousel_manual' ? chosen : orderByManual(catProducts, s.manualOrder)

  return (
    <div style={S.overlay2}>
      <div style={S.panel}>
        <div style={S.head}>
          <button style={S.back} onClick={onCancel}>←</button>
          <div style={S.title}>Carosello</div>
          <button style={S.save} onClick={() => onSave(s)}>Fatto</button>
        </div>
        <div style={S.body}>
          <label style={S.label}>Tipo</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[{ k: 'carousel_category', l: 'Da categoria' }, { k: 'carousel_manual', l: 'Prodotti scelti' }].map(o => (
              <button key={o.k} onClick={() => set({ type: o.k })} style={{ ...S.pill, ...(s.type === o.k ? S.pillOn : {}) }}>{o.l}</button>
            ))}
          </div>

          <label style={S.label}>Titolo</label>
          <input style={S.input} value={s.title} onChange={e => set({ title: e.target.value })} placeholder="Es. I nostri consigli" />
          <label style={S.label}>Descrizione (opzionale)</label>
          <input style={S.input} value={s.description} onChange={e => set({ description: e.target.value })} placeholder="Es. Selezionati per te" />

          {s.type === 'carousel_category' ? (
            <>
              <label style={S.label}>Categoria</label>
              <select style={S.input} value={s.categoryId || ''} onChange={e => set({ categoryId: e.target.value })}>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <label style={S.label}>Quantità da mostrare</label>
              <input type="number" min="1" style={S.input} value={s.limit} onChange={e => set({ limit: Math.max(1, Number(e.target.value) || 1) })} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0' }}>
                <input type="checkbox" checked={s.showViewAll !== false} onChange={e => set({ showViewAll: e.target.checked })} />
                <span>Mostra "Guarda tutti →"</span>
              </label>
            </>
          ) : (
            <>
              <label style={S.label}>Prodotti scelti ({chosen.length})</label>
              <button style={S.add} onClick={() => setPickerOpen(true)}>+ Scegli prodotti</button>
              {chosen.length > 0 && (
                <>
                  <div style={{ marginTop: 10 }}>
                    {chosen.map((p, i) => (
                      <div key={p.id} style={S.chosenRow}>
                        <span style={S.chosenPos}>{i + 1}</span>
                        {p.image_url
                          ? <img src={p.image_url} alt="" style={S.chosenThumb} />
                          : <div style={{ ...S.chosenThumb, background: '#f1f1f1' }} />}
                        <span style={S.chosenName}>{p.name}</span>
                        <span style={{ color: '#888', fontSize: 13 }}>{formatPrice(p)}</span>
                        <button style={S.rowDel} onClick={() => removeProduct(p.id)} aria-label="Rimuovi">×</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          <label style={S.label}>Ordinamento</label>
          <select style={S.input} value={s.sort} onChange={e => set({ sort: e.target.value })}>
            {SORTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {/* Riordino manuale (trascina): disponibile per entrambi i tipi quando l'ordinamento è Manuale */}
          {s.sort === 'manual' && (
            reorderList.length >= 2 ? (
              <button style={S.reorderBtn} onClick={() => setOrderOpen(true)}>↕ Ordina manualmente (trascina)</button>
            ) : (
              <div style={{ ...S.hint, marginTop: 6 }}>
                {s.type === 'carousel_manual' ? 'Scegli almeno 2 prodotti per poterli ordinare.' : 'Servono almeno 2 prodotti nella categoria per ordinarli.'}
              </div>
            )
          )}
        </div>
      </div>

      {pickerOpen && (
        <ProductPickerModal
          products={products}
          selectedIds={s.productIds || []}
          onSave={(ids) => { set({ productIds: ids }); setPickerOpen(false) }}
          onClose={() => setPickerOpen(false)}
        />
      )}
      {orderOpen && (
        <ProductsOrderModal
          title="Ordina i prodotti del carosello"
          subtitle={s.type === 'carousel_category' ? `Trascina per ordinare — verranno mostrati i primi ${s.limit || 4}` : 'Trascina per cambiare l\'ordine nel menu'}
          zIndex={3200}
          items={reorderList.map(p => ({ id: p.id, name: p.name, imageUrl: p.image_url, subLabel: formatPrice(p) }))}
          onSave={(items) => {
            if (s.type === 'carousel_manual') set({ productIds: items.map(i => i.id), sort: 'manual' })
            else set({ manualOrder: items.map(i => i.id), sort: 'manual' })
          }}
          onClose={() => setOrderOpen(false)}
        />
      )}
    </div>
  )
}

function Seg({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={S.label}>{label}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        {options.map(o => (
          <button key={String(o.v)} onClick={() => onChange(o.v)} style={{ ...S.pill, ...(value === o.v ? S.pillOn : {}) }}>{o.l}</button>
        ))}
      </div>
    </div>
  )
}

const S = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'stretch' },
  overlay2: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 3100, display: 'flex', justifyContent: 'center', alignItems: 'stretch' },
  panel: { background: '#fff', width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', height: '100%' },
  head: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #eee', background: '#fff', flexShrink: 0 },
  back: { border: 'none', background: 'transparent', fontSize: 22, cursor: 'pointer', color: '#333', width: 36 },
  title: { flex: 1, fontSize: 17, fontWeight: 700, color: '#111', display: 'flex', alignItems: 'center', gap: 8 },
  live: { fontSize: 11, fontWeight: 700, color: '#16a34a' },
  save: { border: 'none', background: '#000', color: '#fff', padding: '9px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },

  previewPane: { minHeight: 0, background: '#eef1f4', padding: 10, position: 'relative', borderBottom: '1px solid #e5e7eb' },
  deviceOuter: { position: 'relative', height: '100%', width: '100%' },
  device: { position: 'relative', height: '100%', width: '100%', maxWidth: 420, margin: '0 auto', overflow: 'auto', transform: 'translateZ(0)', background: '#fff', borderRadius: 14, boxShadow: '0 4px 18px rgba(0,0,0,0.12)', WebkitOverflowScrolling: 'touch' },
  expand: { position: 'absolute', top: 16, right: 16, zIndex: 5, border: 'none', background: 'rgba(17,17,17,0.82)', color: '#fff', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },

  controls: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
  tabs: { display: 'flex', gap: 6, padding: '8px 16px 0', borderBottom: '1px solid #eee', flexShrink: 0 },
  tab: { flex: 1, padding: '10px', border: 'none', background: 'transparent', borderBottom: '2px solid transparent', fontWeight: 600, fontSize: 14, color: '#64748B', cursor: 'pointer' },
  tabOn: { color: '#111', borderBottom: '2px solid #111' },
  body: { padding: 16, overflowY: 'auto', flex: 1 },
  hint: { fontSize: 13, color: '#64748B', marginBottom: 12 },
  empty: { padding: '24px', textAlign: 'center', color: '#999', border: '1px dashed #ddd', borderRadius: 12, marginBottom: 12 },
  groupTitle: { fontSize: 13, fontWeight: 800, color: '#111', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 },

  row: { display: 'flex', alignItems: 'center', gap: 8, padding: 10, border: '1px solid #ECECEC', borderRadius: 12, marginBottom: 10, background: '#fff', userSelect: 'none' },
  rowDrag: { background: '#EEF2FF', boxShadow: '0 6px 16px rgba(0,0,0,0.12)' },
  handle: { cursor: 'grab', padding: 4, touchAction: 'none', display: 'flex' },
  rowTitle: { fontWeight: 600, fontSize: 14, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rowSub: { fontSize: 12, color: '#777' },
  rowBtn: { border: '1px solid #E0E0E0', background: '#fff', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  rowDel: { border: 'none', background: 'transparent', color: '#EF4444', fontSize: 22, cursor: 'pointer', width: 30 },
  add: { width: '100%', border: '1px dashed #CBD5E1', background: '#F8FAFC', borderRadius: 12, padding: 14, fontWeight: 700, color: '#111', cursor: 'pointer', marginTop: 4 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#333', margin: '12px 0 6px' },
  input: { width: '100%', padding: 11, borderRadius: 8, border: '1px solid #E0E0E0', fontSize: 14, boxSizing: 'border-box', background: '#fff', color: '#111' },
  pill: { flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: '#334155' },
  pillOn: { background: '#000', color: '#fff', borderColor: '#000' },
  picker: { maxHeight: '32vh', overflowY: 'auto', border: '1px solid #EEE', borderRadius: 10, marginTop: 6 },
  pick: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderBottom: '1px solid #F3F3F3', fontSize: 14 },
  chosenRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', border: '1px solid #ECECEC', borderRadius: 10, marginBottom: 6, background: '#fff' },
  chosenPos: { width: 20, textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#94a3b8', flexShrink: 0 },
  chosenThumb: { width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 },
  chosenName: { flex: 1, fontSize: 14, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  reorderBtn: { width: '100%', marginTop: 8, padding: '11px', borderRadius: 10, border: '1px solid #CBD5E1', background: '#fff', fontWeight: 700, fontSize: 14, color: '#111', cursor: 'pointer' },

  colorRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  colorLabel: { flex: 1, fontSize: 14, color: '#333', fontWeight: 600 },
  colorSwatch: { width: 40, height: 32, padding: 0, border: '1px solid #E0E0E0', borderRadius: 8, background: '#fff', cursor: 'pointer' },
  colorText: { width: 96, padding: '8px 10px', borderRadius: 8, border: '1px solid #E0E0E0', fontSize: 13, color: '#111', background: '#fff' }
}
