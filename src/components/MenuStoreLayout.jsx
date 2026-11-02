import { useMemo, useRef, useState, useEffect } from 'react'
import { formatPrice } from '../lib/priceFormat'
import { isProductEsaurito } from '../lib/stock'

/**
 * Layout alternativo "Store" per il menu pubblico: impaginazione tipo e-commerce.
 * Header con ricerca + icone (preferiti/carrello), barra categorie a chip sticky,
 * prodotti a griglia per sezione. Riusa gli stessi handler del menu classico.
 */
export default function MenuStoreLayout({
  restaurant, categories, products, openingHours = [], theme,
  orderSettingsEnabled, favoritesCount = 0, cartCount = 0,
  onOpenCart, onOpenFavorites, onAddProduct, onToggleFavorite, isFav, trackProductViewed
}) {
  const [query, setQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [activeCat, setActiveCat] = useState(categories[0]?.id || null)
  const searchInputRef = useRef(null)

  const toggleSearch = () => {
    setShowSearch(v => {
      const next = !v
      if (!next) setQuery('')
      else setTimeout(() => searchInputRef.current?.focus(), 50)
      return next
    })
  }
  const sectionRefs = useRef({})
  const chipBarRef = useRef(null)
  const headerRef = useRef(null)
  const [headerH, setHeaderH] = useState(0)

  // Misura l'altezza dell'header fisso per lo spaziatore (varia con ricerca/chip)
  useEffect(() => {
    if (!headerRef.current) return
    const update = () => setHeaderH(headerRef.current?.offsetHeight || 0)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(headerRef.current)
    return () => ro.disconnect()
  }, [showSearch, query, categories])

  // Desktop: scorri i badge categorie in orizzontale con la rotellina del mouse
  useEffect(() => {
    const el = chipBarRef.current
    if (!el) return
    const onWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth) return
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { el.scrollLeft += e.deltaY; e.preventDefault() }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [categories, query])

  const t = theme || {}
  const accent = t.accentColor || '#111'
  const cardBg = t.cardBackground || '#fff'
  const border = t.borderColor || '#e5e5e5'
  const textMain = t.textSecondaryColor || '#111'
  const textSoft = t.textTertiaryColor || '#777'
  const radius = t.borderRadius || '14px'
  const btnBg = t.buttonColor || t.primaryColor || '#000'
  const btnText = t.buttonTextColor || '#fff'

  // Risultati ricerca (piatti dal nome) su tutte le categorie
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    const out = []
    for (const cat of categories) {
      for (const p of (products[cat.id] || [])) {
        if (p.name?.toLowerCase().includes(q)) out.push({ ...p, _cat: cat })
      }
    }
    return out
  }, [query, categories, products])

  // Evidenzia la categoria attiva mentre si scorre
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible[0]) setActiveCat(visible[0].target.dataset.cat)
    }, { rootMargin: '-120px 0px -70% 0px', threshold: 0 })
    Object.values(sectionRefs.current).forEach(el => el && obs.observe(el))
    return () => obs.disconnect()
  }, [categories, products])

  const scrollToCat = (id) => {
    setActiveCat(id)
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const S = styles(t, { accent, cardBg, border, textMain, textSoft, radius, btnBg, btnText })

  const ProductCard = ({ p, categoryName, categoryId }) => {
    const esaurito = isProductEsaurito(p)
    return (
      <div style={S.card}>
        <div style={S.imageWrap} onClick={() => { trackProductViewed?.(restaurant.id, p.id, categoryId); orderSettingsEnabled && !esaurito && onAddProduct(p) }}>
          {p.image_url
            ? <img src={p.image_url} alt={p.name} style={S.image} loading="lazy" />
            : <div style={{ ...S.image, ...S.imagePlaceholder }}>🍽️</div>}
          <button
            style={S.heart}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(e, p, categoryName, categoryId) }}
            aria-label={isFav(p.id) ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
            title={isFav(p.id) ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
          >
            <svg width="19" height="19" viewBox="0 0 24 24"
              fill={isFav(p.id) ? (t.favoriteActiveColor || '#e74c3c') : 'none'}
              stroke={isFav(p.id) ? (t.favoriteActiveColor || '#e74c3c') : '#374151'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>
        <div style={S.cardBody}>
          <div style={S.cardName}>{p.name}</div>
          {p.description && <div style={S.cardDesc}>{p.description}</div>}
          <div style={S.cardFoot}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <div style={S.price}>{formatPrice(p)}</div>
              {esaurito && <span style={S.soldOut}>Esaurito</span>}
            </div>
            {orderSettingsEnabled && (
              <button
                style={{ ...S.addBtn, ...(esaurito ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }}
                onClick={() => { if (!esaurito) onAddProduct(p) }}
                disabled={esaurito}
                aria-label={esaurito ? 'Esaurito' : 'Aggiungi'}
              >+</button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      {/* HEADER (fisso, sempre in alto) */}
      <div style={{ height: headerH }} />
      <header ref={headerRef} style={S.header}>
        <div style={S.headerRow}>
          {restaurant.logo_url && <img src={restaurant.logo_url} alt="" style={S.logo} />}
          <div style={S.brand}>{restaurant.name}</div>
          <div style={S.icons}>
            <button style={{ ...S.iconBtn, ...(showSearch ? { color: accent } : {}) }} onClick={toggleSearch} aria-label="Cerca">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={showSearch ? accent : textMain} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </button>
            <button style={S.iconBtn} onClick={onOpenFavorites} aria-label="Preferiti">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={textMain} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              {favoritesCount > 0 && <span style={S.badge}>{favoritesCount}</span>}
            </button>
            {orderSettingsEnabled && (
              <button style={S.iconBtn} onClick={onOpenCart} aria-label="Carrello">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={textMain} strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                {cartCount > 0 && <span style={{ ...S.badge, background: accent, color: btnText }}>{cartCount}</span>}
              </button>
            )}
          </div>
        </div>
        {/* Ricerca: compare solo cliccando l'icona */}
        {showSearch && (
          <input
            ref={searchInputRef}
            style={S.search}
            placeholder="Cerca un prodotto…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
        {/* CHIP CATEGORIE */}
        {!query && (
          <div style={S.chipBar} ref={chipBarRef}>
            {categories.map(cat => (
              <button
                key={cat.id}
                style={{ ...S.chip, ...(activeCat === cat.id ? S.chipActive : {}) }}
                onClick={() => scrollToCat(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* CONTENUTO */}
      <main style={S.main}>
        {query ? (
          searchResults.length === 0 ? (
            <div style={S.empty}>Nessun prodotto trovato per “{query}”.</div>
          ) : (
            <>
              <div style={S.sectionTitle}>{searchResults.length} risultati</div>
              <div style={S.grid}>
                {searchResults.map(p => <ProductCard key={p.id} p={p} categoryName={p._cat?.name} categoryId={p._cat?.id} />)}
              </div>
            </>
          )
        ) : (
          categories.map(cat => {
            const list = products[cat.id] || []
            if (list.length === 0) return null
            return (
              <section key={cat.id} ref={el => (sectionRefs.current[cat.id] = el)} data-cat={cat.id} style={S.section}>
                <div style={S.sectionTitle}>{cat.name}</div>
                <div style={S.grid}>
                  {list.map(p => <ProductCard key={p.id} p={p} categoryName={cat.name} categoryId={cat.id} />)}
                </div>
              </section>
            )
          })
        )}

        {/* INFO: orari + indirizzo */}
        <section style={S.info}>
          <div style={S.infoCol}>
            <div style={S.infoLabel}>Orari di apertura</div>
            {openingHours.length === 0
              ? <div style={S.infoText}>Orari non disponibili</div>
              : openingHours.map((h, i) => (
                  <div key={i} style={S.infoText}>{h.day_label || h.day || ''} {h.is_closed ? 'Chiuso' : `${h.open_time || ''}–${h.close_time || ''}`}</div>
                ))}
          </div>
          {restaurant.address && (
            <div style={S.infoCol}>
              <div style={S.infoLabel}>Indirizzo</div>
              <div style={S.infoText}>{restaurant.address}</div>
            </div>
          )}
        </section>
      </main>

      {/* FOOTER AZIONI */}
      <div style={S.actions}>
        {restaurant.phone && (
          <a href={`tel:${restaurant.phone}`} style={{ ...S.actionBtn, ...S.actionPrimary }}>Chiama</a>
        )}
        {restaurant.address && (
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`} target="_blank" rel="noopener noreferrer" style={{ ...S.actionBtn, ...S.actionSecondary }}>Vieni a trovarci</a>
        )}
      </div>
    </div>
  )
}

const styles = (t, c) => ({
  page: { minHeight: '100vh', background: t.primaryColor || '#fff', color: c.textMain, fontFamily: t.fontFamily, paddingBottom: '88px' },
  header: { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: c.cardBg, borderBottom: `1px solid ${c.border}`, padding: '12px 16px 10px', backdropFilter: 'blur(8px)' },
  headerRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  logo: { width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' },
  brand: { flex: 1, fontFamily: t.headingFontFamily, fontWeight: 700, fontSize: 'clamp(18px, 5vw, 22px)', color: c.textMain, textTransform: t.headingUppercase ? 'uppercase' : 'none', letterSpacing: t.headingUppercase ? '1px' : 0, textShadow: t.headingGlow ? `0 0 8px ${t.headingGlow}` : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  icons: { display: 'flex', gap: '6px' },
  iconBtn: { position: 'relative', background: 'transparent', border: 'none', padding: '6px', cursor: 'pointer', color: c.textMain },
  badge: { position: 'absolute', top: '-2px', right: '-2px', minWidth: '16px', height: '16px', padding: '0 4px', borderRadius: '8px', background: t.favoriteActiveColor || '#e74c3c', color: '#fff', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  search: { width: '100%', marginTop: '10px', padding: '11px 14px', borderRadius: '12px', border: `1px solid ${c.border}`, background: t.inputBackground || '#fff', color: t.inputText || '#111', fontSize: '15px', outline: 'none', boxSizing: 'border-box' },
  chipBar: { display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '10px', paddingBottom: '2px', scrollbarWidth: 'none' },
  chip: { flexShrink: 0, padding: '8px 14px', borderRadius: '999px', border: `1px solid ${c.border}`, background: 'transparent', color: c.textSoft, fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  chipActive: { background: c.accent, color: c.btnText, borderColor: c.accent },
  main: { padding: '14px 16px' },
  section: { marginBottom: '22px', scrollMarginTop: '150px' },
  sectionTitle: { fontFamily: t.headingFontFamily, fontSize: 'clamp(17px, 5vw, 22px)', fontWeight: 700, margin: '4px 0 12px', color: c.textMain, textTransform: t.headingUppercase ? 'uppercase' : 'none', letterSpacing: t.headingUppercase ? '1px' : 0, textShadow: t.headingGlow ? `0 0 8px ${t.headingGlow}` : 'none' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' },
  card: { background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: c.radius, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  imageWrap: { position: 'relative', width: '100%', aspectRatio: '1 / 1', background: t.backgroundTertiary || '#f3f3f3', cursor: 'pointer' },
  image: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  imagePlaceholder: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '34px' },
  heart: { position: 'absolute', top: '8px', right: '8px', width: '34px', height: '34px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.95)', boxShadow: '0 2px 6px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 },
  cardBody: { padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  cardName: { fontWeight: 600, fontSize: '14px', color: c.textMain, lineHeight: 1.25 },
  cardDesc: { fontSize: '12px', color: c.textSoft, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  cardFoot: { marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px' },
  price: { fontWeight: 700, fontSize: '15px', color: c.textMain },
  soldOut: { display: 'inline-flex', alignItems: 'center', padding: '1px 7px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase', color: '#b91c1c', background: '#fee2e2', border: '1px solid #fecaca', whiteSpace: 'nowrap' },
  addBtn: { width: '34px', height: '34px', borderRadius: '10px', border: 'none', background: c.btnBg, color: c.btnText, fontSize: '22px', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 },
  empty: { padding: '40px 10px', textAlign: 'center', color: c.textSoft },
  info: { display: 'flex', gap: '24px', flexWrap: 'wrap', padding: '18px 2px 4px', borderTop: `1px solid ${c.border}`, marginTop: '8px' },
  infoCol: {},
  infoLabel: { fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: c.textSoft, marginBottom: '6px' },
  infoText: { fontSize: '14px', color: c.textMain },
  actions: { position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', gap: '10px', padding: '12px 16px', background: c.cardBg, borderTop: `1px solid ${c.border}`, zIndex: 60 },
  actionBtn: { flex: 1, textAlign: 'center', padding: '14px', borderRadius: '12px', fontWeight: 700, textDecoration: 'none', fontSize: '15px' },
  actionPrimary: { background: c.btnBg, color: c.btnText },
  actionSecondary: { background: 'transparent', color: c.textMain, border: `1px solid ${c.border}` }
})
