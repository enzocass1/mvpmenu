import { useMemo, useRef, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import MenuTopBar from './MenuTopBar'
import { formatPrice } from '../lib/priceFormat'
import { isProductEsaurito } from '../lib/stock'
import { getAllergenInfo } from '../lib/allergens'

/**
 * Layout "Builder": home componibile a SEZIONI (caroselli) definite nel tema
 * (theme_config.homeSections). Mobile-first: header fisso, caroselli a
 * scorrimento orizzontale, "Guarda tutti" verso la griglia della categoria.
 */
export default function MenuBuilderLayout({
  restaurant, categories = [], products = {}, openingHours = [], theme = {}, subdomain,
  orderSettingsEnabled, favoritesCount = 0, cartCount = 0,
  onOpenCart, onOpenFavorites, onAddProduct, onToggleFavorite, isFav, trackProductViewed,
  sections = []
}) {
  const [salesMap, setSalesMap] = useState({})
  const [viewAllCat, setViewAllCat] = useState(null) // categoria aperta a griglia
  const [allergensOpen, setAllergensOpen] = useState({}) // {productId: true} note allergeni espansa
  const chipsRef = useRef(null)
  const [chipsH, setChipsH] = useState(0) // altezza barra categorie (per lo spaziatore)

  const t = theme
  const accent = t.accentColor || '#111'
  const cardBg = t.cardBackground || '#fff'
  const border = t.borderColor || '#e5e7eb'
  const textMain = t.textSecondaryColor || '#111'
  const textSoft = t.textTertiaryColor || '#6b7280'
  const radius = t.borderRadius || '14px'
  const btnBg = t.buttonColor || t.primaryColor || '#000'
  const btnText = t.buttonTextColor || '#fff'
  const pageBg = t.primaryColor || '#fff'

  // Settaggi MACRO del tema (regolati dall'editor, globali per tutta la home)
  const ts = Number(t.textScale) || 1                              // moltiplicatore dimensione testi
  const cardW = ({ sm: 132, md: 152, lg: 184 })[t.cardSize] || 152  // larghezza card carosello
  const sectionGap = t.sectionGap != null ? Number(t.sectionGap) : 18 // spazio tra i caroselli (px)
  const showChips = t.showCategoryChips !== false                   // badge categoria sotto l'header
  const px = (n) => `${Math.round(n * ts)}px`

  // Mappa prodotti per id e per categoria
  const productById = useMemo(() => {
    const m = {}
    for (const cat of categories) for (const p of (products[cat.id] || [])) m[p.id] = { ...p, _cat: cat }
    return m
  }, [categories, products])

  // Vendite per prodotto (per l'ordinamento "più venduti")
  useEffect(() => {
    const ids = Object.keys(productById)
    if (ids.length === 0) return
    let active = true
    ;(async () => {
      const { data } = await supabase.from('order_items').select('product_id, quantity').in('product_id', ids)
      if (!active) return
      const m = {}
      for (const it of data || []) m[it.product_id] = (m[it.product_id] || 0) + Number(it.quantity || 0)
      setSalesMap(m)
    })()
    return () => { active = false }
  }, [productById])

  // Misura l'altezza della barra categorie fissa, per riservare lo spazio sotto l'header
  useEffect(() => {
    if (!chipsRef.current) { setChipsH(0); return }
    const update = () => setChipsH(chipsRef.current?.offsetHeight || 0)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(chipsRef.current)
    return () => ro.disconnect()
  }, [categories, viewAllCat])

  // Desktop: scorri i badge categorie in orizzontale con la rotellina del mouse
  useEffect(() => {
    const el = chipsRef.current
    if (!el) return
    const onWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth) return
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { el.scrollLeft += e.deltaY; e.preventDefault() }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [categories, viewAllCat])

  // Desktop: scorri i badge trascinando col mouse (click & drag), senza rompere i tap sui badge
  useEffect(() => {
    const el = chipsRef.current
    if (!el) return
    let down = false, moved = false, startX = 0, startScroll = 0
    const onDown = (e) => {
      if (e.pointerType === 'touch') return // il touch scrolla gia' da solo
      down = true; moved = false; startX = e.clientX; startScroll = el.scrollLeft
      el.style.cursor = 'grabbing'
    }
    const onMove = (e) => {
      if (!down) return
      const dx = e.clientX - startX
      if (Math.abs(dx) > 4) moved = true
      el.scrollLeft = startScroll - dx
    }
    const onUp = () => { down = false; el.style.cursor = 'grab' }
    const onClickCapture = (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false } }
    el.style.cursor = 'grab'
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    el.addEventListener('click', onClickCapture, true)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      el.removeEventListener('click', onClickCapture, true)
    }
  }, [categories, viewAllCat])

  // Prezzo numerico minimo (solo per l'ordinamento dei caroselli)
  const priceOf = (p) => (p.hasVariants && p.variants?.length)
    ? Math.min(...p.variants.map(v => Number(v.price || p.price || 0)))
    : Number(p.price || 0)

  const sortList = (list, sort) => {
    const arr = [...list]
    switch (sort) {
      case 'price_lo': return arr.sort((a, b) => priceOf(a) - priceOf(b))
      case 'price_hi': return arr.sort((a, b) => priceOf(b) - priceOf(a))
      case 'name_az': return arr.sort((a, b) => a.name.localeCompare(b.name))
      case 'name_za': return arr.sort((a, b) => b.name.localeCompare(a.name))
      case 'best': return arr.sort((a, b) => (salesMap[b.id] || 0) - (salesMap[a.id] || 0))
      default: return arr // manuale: rispetta l'ordine dato
    }
  }

  // Applica l'ordine manuale personalizzato (lista di id) a una lista di prodotti
  const applyManualOrder = (list, order) => {
    if (!order?.length) return list
    const idx = new Map(order.map((id, i) => [id, i]))
    return [...list].sort((a, b) => (idx.has(a.id) ? idx.get(a.id) : 1e9) - (idx.has(b.id) ? idx.get(b.id) : 1e9))
  }

  // Risolve i prodotti di una sezione
  const resolveSection = (sec) => {
    if (sec.type === 'carousel_category') {
      const all = products[sec.categoryId] || []
      const sort = sec.sort || 'manual'
      // Con ordinamento manuale rispetta l'ordine personalizzato salvato nell'editor
      const sorted = (sort === 'manual' && sec.manualOrder?.length)
        ? applyManualOrder(all, sec.manualOrder)
        : sortList(all, sort)
      const limit = sec.limit || 8
      return { items: sorted.slice(0, limit), total: all.length, categoryId: sec.categoryId }
    }
    // carousel_manual: prodotti scelti a mano
    const picked = (sec.productIds || []).map(id => productById[id]).filter(Boolean)
    return { items: sortList(picked, sec.sort || 'manual'), total: picked.length, categoryId: null }
  }

  const topBar = (
    <MenuTopBar
      restaurant={restaurant} categories={categories} products={products} theme={theme} subdomain={subdomain}
      orderSettingsEnabled={orderSettingsEnabled} favoritesCount={favoritesCount} cartCount={cartCount}
      onOpenFavorites={onOpenFavorites} onOpenCart={onOpenCart} onAddProduct={onAddProduct}
    />
  )

  const Card = ({ p, wide }) => {
    const esaurito = isProductEsaurito(p)
    const prodAllergens = getAllergenInfo(p)
    const allergensShown = !!allergensOpen[p.id]
    return (
    <div data-pid={p.id} style={{ ...S.card, width: wide ? 'auto' : `${cardW}px`, background: cardBg, border: `1px solid ${border}`, borderRadius: radius }}>
      <div style={{ ...S.imgWrap, borderRadius: `${radius} ${radius} 0 0`, background: t.backgroundTertiary || '#f3f3f3' }}
        onClick={() => { trackProductViewed?.(restaurant.id, p.id, p._cat?.id); orderSettingsEnabled && !esaurito && onAddProduct(p) }}>
        {p.image_url ? <img src={p.image_url} alt={p.name} style={S.img} loading="lazy" /> : <div style={{ ...S.img, ...S.imgPh }}>🍽️</div>}
        <button style={S.heart} onClick={(e) => { e.stopPropagation(); onToggleFavorite(e, p, p._cat?.name, p._cat?.id) }} aria-label="Preferito">
          <svg width="18" height="18" viewBox="0 0 24 24" fill={isFav(p.id) ? (t.favoriteActiveColor || '#e74c3c') : 'none'} stroke={isFav(p.id) ? (t.favoriteActiveColor || '#e74c3c') : '#374151'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      </div>
      <div style={S.body}>
        <div style={{ ...S.name, color: textMain, fontSize: px(13) }}>{p.name}</div>
        {prodAllergens.length > 0 && (
          allergensShown ? (
            <div
              style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', margin: '2px 0 4px', cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); setAllergensOpen(o => ({ ...o, [p.id]: false })) }}
            >
              {prodAllergens.map(a => (
                <span key={a.key} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 6px', borderRadius: '999px', fontSize: px(9.5), fontWeight: 500, color: textMain, border: `1px solid ${border}`, whiteSpace: 'nowrap' }}>
                  {a.emoji} {a.label}
                </span>
              ))}
            </div>
          ) : (
            <div
              style={{ fontSize: px(10), fontStyle: 'italic', color: textSoft, margin: '1px 0 3px', cursor: 'pointer' }}
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); setAllergensOpen(o => ({ ...o, [p.id]: true })) }}
            >
              Contiene allergeni*
            </div>
          )
        )}
        <div style={S.foot}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', minWidth: 0 }}>
            <div style={{ ...S.price, color: textMain, fontSize: px(14) }}>{formatPrice(p)}</div>
            {esaurito && <span style={S.soldOut}>Esaurito</span>}
          </div>
          {orderSettingsEnabled && <button style={{ ...S.add, background: btnBg, color: btnText, borderRadius: radius, ...(esaurito ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }} onClick={() => { if (!esaurito) onAddProduct(p) }} disabled={esaurito}>+</button>}
        </div>
      </div>
    </div>
    )
  }

  // Vista "Guarda tutti": griglia di una categoria (senza form di ricerca)
  if (viewAllCat) {
    const cat = categories.find(c => c.id === viewAllCat)
    const list = products[viewAllCat] || []
    return (
      <div style={{ ...S.page, background: pageBg, fontFamily: t.fontFamily }}>
        {topBar}
        <div style={S.gridHead}>
          <button style={{ ...S.back, color: textMain, borderColor: border }} onClick={() => setViewAllCat(null)}>← Indietro</button>
          <div style={{ ...S.secTitle, fontFamily: t.headingFontFamily, color: textMain }}>{cat?.name}</div>
        </div>
        <div style={S.grid}>{list.map(p => <Card key={p.id} p={{ ...p, _cat: cat }} wide />)}</div>
        <div style={{ height: '90px' }} />
      </div>
    )
  }

  return (
    <div style={{ ...S.page, background: pageBg, fontFamily: t.fontFamily }}>
      {topBar}

      {/* Badge categorie: FISSI sotto l'header, sempre visibili allo scroll */}
      {showChips && categories.length > 0 && (
        <>
          <div ref={chipsRef} style={{ ...S.chipBar, ...S.chipBarFixed, background: pageBg, borderBottom: `1px solid ${border}` }}>
            {categories.map(cat => (
              <button key={cat.id} style={{ ...S.chip, border: `1px solid ${border}`, color: textSoft, borderRadius: radius === '0px' ? '0px' : '999px' }} onClick={() => setViewAllCat(cat.id)}>
                {cat.name}
              </button>
            ))}
          </div>
          {/* Spaziatore: riserva lo spazio della barra categorie fissa */}
          <div style={{ height: chipsH }} />
        </>
      )}

      {sections.length === 0 ? (
        <div style={{ padding: '40px 16px', color: textSoft, textAlign: 'center' }}>
          Nessuna sezione configurata. Aggiungine dall'editor del tema.
        </div>
      ) : sections.map((sec) => {
        const { items, total, categoryId } = resolveSection(sec)
        if (items.length === 0) return null
        const showViewAll = sec.type === 'carousel_category' && sec.showViewAll !== false && total > items.length
        return (
          <section key={sec.id} style={{ ...S.section, marginBottom: `${sectionGap}px` }}>
            <div style={S.secHead}>
              <div>
                <div style={{ ...S.secTitle, fontSize: px(21), fontFamily: t.headingFontFamily, color: textMain, textTransform: t.headingUppercase ? 'uppercase' : 'none', textShadow: t.headingGlow ? `0 0 8px ${t.headingGlow}` : 'none' }}>{sec.title}</div>
                {sec.description && <div style={{ ...S.secDesc, color: textSoft, fontSize: px(13) }}>{sec.description}</div>}
              </div>
            </div>
            <div style={S.carousel}>
              {items.map(p => <Card key={p.id} p={p} />)}
              {showViewAll && (
                <div style={{ ...S.viewAllCard, border: `1px dashed ${border}`, borderRadius: radius, color: accent }} onClick={() => setViewAllCat(categoryId)}>
                  Guarda<br />tutti<br />→
                </div>
              )}
            </div>
          </section>
        )
      })}

      {/* INFO */}
      <section style={{ ...S.info, borderTop: `1px solid ${border}` }}>
        <div>
          <div style={{ ...S.infoLabel, color: textSoft }}>Orari di apertura</div>
          {openingHours.length === 0 ? <div style={{ color: textMain }}>Orari non disponibili</div>
            : openingHours.map((h, i) => <div key={i} style={{ color: textMain, fontSize: '14px' }}>{h.day_label || h.day || ''} {h.is_closed ? 'Chiuso' : `${h.open_time || ''}–${h.close_time || ''}`}</div>)}
        </div>
        {restaurant.address && <div><div style={{ ...S.infoLabel, color: textSoft }}>Indirizzo</div><div style={{ color: textMain, fontSize: '14px' }}>{restaurant.address}</div></div>}
      </section>

      {/* AZIONI */}
      <div style={{ ...S.actions, background: cardBg, borderTop: `1px solid ${border}` }}>
        {restaurant.phone && <a href={`tel:${restaurant.phone}`} style={{ ...S.actBtn, background: btnBg, color: btnText, borderRadius: radius }}>Chiama</a>}
        {restaurant.address && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`} target="_blank" rel="noopener noreferrer" style={{ ...S.actBtn, background: 'transparent', color: textMain, border: `1px solid ${border}`, borderRadius: radius }}>Vieni a trovarci</a>}
      </div>
    </div>
  )
}

const S = {
  page: { minHeight: '100vh', paddingBottom: '88px' },
  chipBar: { display: 'flex', gap: '8px', overflowX: 'auto', padding: '10px 16px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', userSelect: 'none', WebkitUserSelect: 'none' },
  chipBarFixed: { position: 'fixed', top: '54px', left: 0, right: 0, zIndex: 90 },
  chip: { flexShrink: 0, padding: '8px 14px', background: 'transparent', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  section: { padding: '8px 0 6px' },
  secHead: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', padding: '0 16px 10px' },
  secTitle: { fontSize: 'clamp(18px, 5vw, 22px)', fontWeight: 700 },
  secDesc: { fontSize: '13px', marginTop: '2px' },
  viewAll: { background: 'transparent', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, paddingTop: '4px' },
  carousel: { display: 'flex', gap: '12px', overflowX: 'auto', padding: '2px 16px 8px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' },
  card: { flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  imgWrap: { position: 'relative', width: '100%', aspectRatio: '1 / 1', cursor: 'pointer', overflow: 'hidden' },
  img: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  imgPh: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px' },
  heart: { position: 'absolute', top: '6px', right: '6px', width: '30px', height: '30px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.95)', boxShadow: '0 2px 6px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 },
  body: { padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
  name: { fontSize: '13px', fontWeight: 600, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  foot: { marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontWeight: 700, fontSize: '14px' },
  soldOut: { display: 'inline-flex', alignItems: 'center', padding: '1px 6px', borderRadius: '999px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase', color: '#b91c1c', background: '#fee2e2', border: '1px solid #fecaca', whiteSpace: 'nowrap' },
  add: { width: '30px', height: '30px', border: 'none', fontSize: '20px', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 },
  viewAllCard: { flexShrink: 0, width: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontWeight: 700, fontSize: '14px', cursor: 'pointer' },
  gridHead: { padding: '12px 16px 8px', display: 'flex', flexDirection: 'column', gap: '8px' },
  back: { alignSelf: 'flex-start', background: 'transparent', border: '1px solid', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
  search: { width: '100%', padding: '11px 14px', borderRadius: '12px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', padding: '0 16px 16px' },
  info: { display: 'flex', gap: '24px', flexWrap: 'wrap', padding: '18px 16px' },
  infoLabel: { fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '6px' },
  actions: { position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', gap: '10px', padding: '12px 16px', zIndex: 60 },
  actBtn: { flex: 1, textAlign: 'center', padding: '14px', fontWeight: 700, textDecoration: 'none', fontSize: '15px' }
}
