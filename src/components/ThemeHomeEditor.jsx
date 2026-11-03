import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import MenuBuilderLayout from './MenuBuilderLayout'
import ProductPickerModal from './ProductPickerModal'
import ProductsOrderModal from './ProductsOrderModal'
import ImageUpload from './ImageUpload'
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

// Campi di servizio della bozza: non fanno parte del tema
const META_KEYS = ['draft', 'categoryOrder', 'createdAt', 'updatedAt']
const withoutMeta = (cfg) => Object.fromEntries(Object.entries(cfg || {}).filter(([k]) => !META_KEYS.includes(k)))

// Link dell'anteprima della bozza: chi lo apre vede il nuovo menu, quello dei clienti non cambia
const draftPreviewUrl = (subdomain) => `${window.location.origin}${window.location.pathname}#/menu/${subdomain}?bozza=1`

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
  const [published, setPublished] = useState({})        // tema pubblicato (quello che vedono i clienti)
  const [hasDraft, setHasDraft] = useState(false)       // esiste una bozza salvata
  const [categoryOrder, setCategoryOrder] = useState(null) // nuovo ordine delle categorie (id), se scelto
  const [sortingCats, setSortingCats] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)       // scelta: pubblica o salva come bozza
  const [draftLink, setDraftLink] = useState(null)      // link dell'anteprima da mandare
  const [copied, setCopied] = useState(false)

  const allProducts = useMemo(() => Object.values(products).flat(), [products])

  const setMacro = (patch) => setConfig(prev => ({ ...(prev || {}), ...patch }))

  // Tema in bozza: tutto ciò che vedi in anteprima si basa su questo
  const draftConfig = useMemo(
    () => ({ ...withoutMeta(config), layoutStyle: 'builder', homeSections: sections }),
    [config, sections]
  )
  const resolvedTheme = useMemo(() => getThemeStyles(draftConfig), [draftConfig])

  // Categorie nell'ordine scelto (anche i badge in alto dell'anteprima lo seguono)
  const orderedCats = useMemo(() => {
    if (!categoryOrder?.length) return cats
    const idx = new Map(categoryOrder.map((id, i) => [id, i]))
    return [...cats].sort((a, b) => (idx.get(a.id) ?? 1e9) - (idx.get(b.id) ?? 1e9))
  }, [cats, categoryOrder])

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
      // Se c'è una bozza salvata si riparte da quella, altrimenti dal menu pubblicato
      const cfg = r?.theme_config || {}
      const draft = cfg.draft || null
      const base = withoutMeta(cfg)
      const start = draft ? { ...base, ...withoutMeta(draft) } : base
      setPublished(base)
      setHasDraft(!!draft)
      setCategoryOrder(draft?.categoryOrder?.length ? draft.categoryOrder : null)
      setConfig(start)
      setSections(Array.isArray(start.homeSections) ? start.homeSections : [])

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

  // Applica alle categorie il nuovo ordine (quelle nascoste restano in fondo, nel loro ordine)
  const applyCategoryOrder = async () => {
    if (!categoryOrder?.length) return
    const { data: all, error } = await supabase.from('categories').select('id, order')
      .eq('restaurant_id', restaurantId).order('order', { ascending: true })
    if (error) throw error
    const idx = new Map(categoryOrder.map((id, i) => [id, i]))
    const sorted = [...(all || [])].sort((a, b) => (idx.get(a.id) ?? 1e6 + (a.order || 0)) - (idx.get(b.id) ?? 1e6 + (b.order || 0)))
    const changed = sorted.map((c, i) => ({ id: c.id, i, prev: c.order })).filter(x => x.prev !== x.i)
    const results = await Promise.all(changed.map(x => supabase.from('categories').update({ order: x.i }).eq('id', x.id)))
    const failed = results.find(res => res.error)
    if (failed) throw failed.error
  }

  // Pubblica: i clienti vedono subito il nuovo menu (l'eventuale bozza si chiude)
  const publish = async () => {
    setSaving(true)
    try {
      await applyCategoryOrder()
      const { error } = await supabase.from('restaurants')
        .update({ theme_config: withoutMeta(draftConfig), updated_at: new Date().toISOString() })
        .eq('id', restaurantId)
      if (error) throw error
      alert('Menu pubblicato: i clienti vedono subito le modifiche.')
      onClose?.()
    } catch (e) {
      alert('Errore salvataggio: ' + e.message)
      setSaving(false)
    }
  }

  // Salva come bozza: il menu pubblicato non cambia, si ottiene il link dell'anteprima
  const saveDraft = async () => {
    setSaving(true)
    try {
      const draft = {
        ...withoutMeta(draftConfig),
        ...(categoryOrder?.length ? { categoryOrder } : {}),
        updatedAt: new Date().toISOString()
      }
      const { error } = await supabase.from('restaurants')
        .update({ theme_config: { ...published, draft }, updated_at: new Date().toISOString() })
        .eq('id', restaurantId)
      if (error) throw error
      setHasDraft(true)
      setSaveOpen(false)
      setDraftLink(draftPreviewUrl(restaurant.subdomain))
    } catch (e) {
      alert('Errore salvataggio: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // Elimina la bozza e torna al menu pubblicato
  const discardDraft = async () => {
    if (!window.confirm('Eliminare la bozza? Torni al menu pubblicato e il link di anteprima smette di funzionare.')) return
    const { error } = await supabase.from('restaurants')
      .update({ theme_config: published, updated_at: new Date().toISOString() })
      .eq('id', restaurantId)
    if (error) { alert('Errore: ' + error.message); return }
    setConfig(published)
    setSections(Array.isArray(published.homeSections) ? published.homeSections : [])
    setCategoryOrder(null)
    setHasDraft(false)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(draftLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('Copia il link:', draftLink)
    }
  }

  // Ordina le categorie dalla più aperta dai clienti (ultimi 6 mesi); a pari visite resta l'ordine attuale
  const sortCategoriesByPopularity = async () => {
    setSortingCats(true)
    const { data, error } = await supabase.rpc('menu_view_counts', { p_restaurant_id: restaurantId, p_days: 180 })
    setSortingCats(false)
    if (error) { alert('Impossibile leggere le statistiche: ' + error.message); return }
    const views = {}
    for (const row of data || []) if (row.kind === 'category') views[row.item_id] = Number(row.views)
    if (!Object.keys(views).length) { alert('Non ci sono ancora abbastanza visite per ordinare le categorie.'); return }
    setCategoryOrder([...cats].sort((a, b) => (views[b.id] || 0) - (views[a.id] || 0)).map(c => c.id))
  }

  const typeLabel = (s) => s.type === 'carousel_manual' ? 'Prodotti scelti' : s.type === 'carousel_popular' ? 'I più visti (automatico)' : 'Da categoria'

  // Anteprima live: il vero menu, contenuto in un "telefono"
  const preview = (
    <div style={S.deviceOuter}>
      <div style={S.device}>
        {restaurant ? (
          <MenuBuilderLayout
            restaurant={restaurant}
            categories={orderedCats}
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
        {previewFull ? 'Riduci' : 'Ingrandisci'}
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
          <div style={S.title}>Editor Home {hasDraft ? <span style={S.draftTag}>BOZZA</span> : <span style={S.live}>● LIVE</span>}</div>
          <button style={S.save} onClick={() => setSaveOpen(true)} disabled={saving}>{saving ? '…' : 'Salva'}</button>
        </div>

        {/* ANTEPRIMA LIVE (sempre visibile, in alto) */}
        <div style={{ ...S.previewPane, flex: previewFull ? '1 1 auto' : '0 0 46vh' }}>
          {preview}
        </div>

        {/* CONTROLLI (nascosti quando l'anteprima è a tutto schermo) */}
        {!previewFull && (
          <div style={S.controls}>
            {hasDraft && (
              <div style={S.draftBar}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>Stai modificando una bozza</div>
                  <div style={{ fontSize: 12, color: '#6b5a1e' }}>I clienti vedono ancora il menu pubblicato.</div>
                </div>
                <button style={S.draftBtn} onClick={() => setDraftLink(draftPreviewUrl(restaurant.subdomain))}>Link anteprima</button>
                <button style={S.draftDel} onClick={discardDraft}>Elimina</button>
              </div>
            )}
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
                        <div style={S.rowSub}>{typeLabel(sec)}{sec.type === 'carousel_category' ? ` · ${cats.find(c => c.id === sec.categoryId)?.name || '—'}` : sec.type === 'carousel_popular' ? ` · ${sec.limit || 10} prodotti` : ` · ${(sec.productIds || []).length} prodotti`}</div>
                      </div>
                      <button style={S.rowBtn} onClick={() => setEditing({ ...sec })}>Modifica</button>
                      <button style={S.rowDel} onClick={() => setSections(prev => prev.filter(s => s.id !== sec.id))} aria-label="Elimina">×</button>
                    </div>
                  ))}
                  <button style={S.add} onClick={() => setEditing(newSection(cats))}>+ Aggiungi carosello</button>

                  <div style={{ ...S.groupTitle, marginTop: 24 }}>Ordine delle categorie</div>
                  <div style={S.hint}>
                    {categoryOrder ? 'Nuovo ordine: ' : 'Ordine attuale: '}
                    {orderedCats.slice(0, 5).map(c => c.name).join(' · ')}{orderedCats.length > 5 ? ' …' : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{ ...S.reorderBtn, marginTop: 0, flex: 1 }} onClick={sortCategoriesByPopularity} disabled={sortingCats}>
                      {sortingCats ? 'Calcolo…' : 'Ordina per popolarità'}
                    </button>
                    {categoryOrder && (
                      <button style={{ ...S.reorderBtn, marginTop: 0, width: 'auto', padding: '11px 14px' }} onClick={() => setCategoryOrder(null)}>Annulla</button>
                    )}
                  </div>
                  <div style={{ ...S.hint, marginTop: 6 }}>
                    Le categorie più aperte dai clienti negli ultimi 6 mesi vanno per prime, anche nei badge in alto. Si applica quando pubblichi.
                  </div>
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

      {saveOpen && (
        <div style={S.sheetOverlay} onClick={(e) => { if (e.target === e.currentTarget && !saving) setSaveOpen(false) }}>
          <div style={S.sheet}>
            <div style={S.sheetTitle}>Salva le modifiche</div>
            <button style={S.choice} onClick={publish} disabled={saving}>
              <span style={S.choiceTitle}>Pubblica sul menu</span>
              <span style={S.choiceSub}>I clienti vedono subito le modifiche.{hasDraft ? ' La bozza viene chiusa.' : ''}</span>
            </button>
            <button style={S.choice} onClick={saveDraft} disabled={saving}>
              <span style={S.choiceTitle}>Salva come bozza</span>
              <span style={S.choiceSub}>Il menu dei clienti non cambia: ricevi un link di anteprima da far vedere e approvare.</span>
            </button>
            <button style={S.sheetCancel} onClick={() => setSaveOpen(false)} disabled={saving}>{saving ? 'Salvataggio…' : 'Annulla'}</button>
          </div>
        </div>
      )}

      {draftLink && (
        <div style={S.sheetOverlay} onClick={(e) => { if (e.target === e.currentTarget) setDraftLink(null) }}>
          <div style={S.sheet}>
            <div style={S.sheetTitle}>Anteprima della bozza</div>
            <div style={S.hint}>
              Manda questo link: chi lo apre vede il nuovo menu, mentre quello dei clienti resta com'è.
              Le visite all'anteprima non entrano nelle statistiche. Il link mostra sempre l'ultima bozza salvata.
            </div>
            <div style={S.linkBox}>{draftLink}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...S.save, flex: 1, padding: 12 }} onClick={copyLink}>{copied ? 'Copiato' : 'Copia link'}</button>
              <button style={{ ...S.reorderBtn, marginTop: 0, flex: 1 }} onClick={() => window.open(draftLink, '_blank')}>Apri anteprima</button>
            </div>
            <button style={S.sheetCancel} onClick={() => setDraftLink(null)}>Chiudi</button>
          </div>
        </div>
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
  // Foto in testa: quella scelta, altrimenti (per le sezioni da categoria) la foto della categoria
  const catPhotos = cats.filter(c => c.image_url)
  const coverUrl = s.coverImage || (s.type === 'carousel_category' ? cats.find(c => c.id === s.categoryId)?.image_url : null)
  const chooseType = (type) => set(type === 'carousel_popular'
    ? { type, limit: s.type === 'carousel_popular' ? s.limit : 10, perCategory: s.perCategory ?? 3, days: s.days || 180, showRank: s.showRank ?? true, title: s.title || 'I più amati' }
    : { type })

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
            {[{ k: 'carousel_category', l: 'Da categoria' }, { k: 'carousel_manual', l: 'Prodotti scelti' }, { k: 'carousel_popular', l: 'I più visti' }].map(o => (
              <button key={o.k} onClick={() => chooseType(o.k)} style={{ ...S.pill, ...(s.type === o.k ? S.pillOn : {}) }}>{o.l}</button>
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
          ) : s.type === 'carousel_popular' ? (
            <>
              <div style={S.note}>Si aggiorna da sola: mostra i prodotti che i clienti aprono di più nel menu. Se non ci sono ancora visite, la sezione resta nascosta.</div>
              <label style={S.label}>Quantità da mostrare</label>
              <input type="number" min="1" max="30" style={S.input} value={s.limit || 10} onChange={e => set({ limit: Math.min(30, Math.max(1, Number(e.target.value) || 1)) })} />
              <label style={S.label}>Massimo per categoria</label>
              <select style={S.input} value={s.perCategory ?? 3} onChange={e => set({ perCategory: Number(e.target.value) })}>
                {[1, 2, 3, 5].map(n => <option key={n} value={n}>{n}</option>)}
                <option value={0}>Nessun limite</option>
              </select>
              <label style={S.label}>Periodo considerato</label>
              <select style={S.input} value={s.days || 180} onChange={e => set({ days: Number(e.target.value) })}>
                <option value={30}>Ultimi 30 giorni</option>
                <option value={90}>Ultimi 3 mesi</option>
                <option value={180}>Ultimi 6 mesi</option>
                <option value={365}>Ultimo anno</option>
              </select>
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

          {s.type !== 'carousel_popular' && (<>
          <label style={S.label}>Ordinamento</label>
          <select style={S.input} value={s.sort} onChange={e => set({ sort: e.target.value })}>
            {SORTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          </>)}
          {/* Riordino manuale (trascina): disponibile per entrambi i tipi quando l'ordinamento è Manuale */}
          {s.type !== 'carousel_popular' && s.sort === 'manual' && (
            reorderList.length >= 2 ? (
              <button style={S.reorderBtn} onClick={() => setOrderOpen(true)}>↕ Ordina manualmente (trascina)</button>
            ) : (
              <div style={{ ...S.hint, marginTop: 6 }}>
                {s.type === 'carousel_manual' ? 'Scegli almeno 2 prodotti per poterli ordinare.' : 'Servono almeno 2 prodotti nella categoria per ordinarli.'}
              </div>
            )
          )}

          <div style={{ ...S.groupTitle, marginTop: 22 }}>Stile della sezione</div>
          <label style={S.check}>
            <input type="checkbox" checked={!!s.showRank} onChange={e => set({ showRank: e.target.checked })} />
            <span>Numera i prodotti (1, 2, 3…)</span>
          </label>
          <label style={S.check}>
            <input type="checkbox" checked={!!s.showCover} onChange={e => set({ showCover: e.target.checked })} />
            <span>Foto in testa alla sezione, con il titolo sopra</span>
          </label>
          {s.showCover && (
            <>
              {coverUrl
                ? <div style={{ ...S.coverThumb, backgroundImage: `url("${coverUrl}")` }} />
                : <div style={{ ...S.hint, marginTop: 6 }}>Scegli una foto: senza, la sezione mostra solo il titolo.</div>}
              <label style={S.label}>Foto</label>
              <select style={S.input} value={s.coverImage || ''} onChange={e => set({ coverImage: e.target.value || null })}>
                <option value="">{s.type === 'carousel_category' ? 'Foto della categoria' : 'Nessuna foto'}</option>
                {s.coverImage && !catPhotos.some(c => c.image_url === s.coverImage) && <option value={s.coverImage}>Foto caricata</option>}
                {catPhotos.map(c => <option key={c.id} value={c.image_url}>Foto di {c.name}</option>)}
              </select>
              <label style={S.label}>Oppure carica una foto</label>
              <ImageUpload key={s.coverImage || 'none'} currentImageUrl={null} folder="sections" onImageUploaded={(url) => set({ coverImage: url })} />
            </>
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
  draftTag: { fontSize: 11, fontWeight: 800, color: '#8a6d1a', background: '#FDF3D7', border: '1px solid #F1DFA6', borderRadius: 6, padding: '2px 6px', letterSpacing: '0.4px' },
  draftBar: { display: 'flex', alignItems: 'center', gap: 8, margin: '10px 16px 0', padding: '10px 12px', background: '#FFF9E8', border: '1px solid #F1DFA6', borderRadius: 12, fontSize: 13, color: '#3d3212', flexShrink: 0 },
  draftBtn: { border: '1px solid #E5D49A', background: '#fff', borderRadius: 8, padding: '7px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#3d3212', whiteSpace: 'nowrap' },
  draftDel: { border: 'none', background: 'transparent', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#B42318', whiteSpace: 'nowrap' },
  sheetOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 3300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheet: { background: '#fff', width: '100%', maxWidth: 520, borderRadius: '16px 16px 0 0', padding: '18px 16px 20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 10 },
  sheetTitle: { fontSize: 17, fontWeight: 800, color: '#111', marginBottom: 2 },
  choice: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3, textAlign: 'left', width: '100%', padding: '13px 14px', border: '1px solid #E2E8F0', borderRadius: 12, background: '#fff', cursor: 'pointer' },
  choiceTitle: { fontSize: 15, fontWeight: 700, color: '#111' },
  choiceSub: { fontSize: 13, color: '#64748B', lineHeight: 1.4 },
  sheetCancel: { border: 'none', background: 'transparent', padding: 10, fontSize: 14, fontWeight: 600, color: '#64748B', cursor: 'pointer' },
  linkBox: { padding: '10px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, color: '#111', wordBreak: 'break-all', fontFamily: 'ui-monospace, Menlo, monospace' },
  note: { fontSize: 13, color: '#3d3212', background: '#FFF9E8', border: '1px solid #F1DFA6', borderRadius: 10, padding: '10px 12px', lineHeight: 1.45, marginBottom: 4 },
  check: { display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0', fontSize: 14, color: '#111' },
  coverThumb: { width: '100%', aspectRatio: '16 / 7', borderRadius: 10, backgroundSize: 'cover', backgroundPosition: 'center', marginTop: 8, border: '1px solid #ECECEC' },
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
