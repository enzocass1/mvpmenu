import { useMemo, useRef, useState } from 'react'
import { formatPrice } from '../lib/priceFormat'

/**
 * Barra superiore compatta e SEMPRE visibile (sticky) per il menu pubblico:
 * logo/nome + icona ricerca (apre un pannello sotto) + preferiti + carrello.
 * La ricerca filtra i prodotti su tutte le categorie e li fa aggiungere.
 */
export default function MenuTopBar({
  restaurant, categories = [], products = {}, theme = {},
  orderSettingsEnabled, favoritesCount = 0, cartCount = 0,
  onOpenFavorites, onOpenCart, onAddProduct
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  const t = theme
  const barBg = t.cardBackground || t.secondaryColor || '#fff'
  const textMain = t.textSecondaryColor || '#111'
  const textSoft = t.textTertiaryColor || '#777'
  const border = t.borderColor || '#e5e7eb'
  const accent = t.accentColor || '#111'
  const btnBg = t.buttonColor || t.primaryColor || '#000'
  const btnText = t.buttonTextColor || '#fff'

  const toggleSearch = () => {
    setSearchOpen(v => {
      const next = !v
      if (!next) setQuery('')
      else setTimeout(() => inputRef.current?.focus(), 50)
      return next
    })
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const out = []
    for (const cat of categories) {
      for (const p of (products[cat.id] || [])) {
        if (p.name?.toLowerCase().includes(q)) out.push({ ...p, _cat: cat })
      }
    }
    return out
  }, [query, categories, products])

  return (
    <>
    {/* Spaziatore: riserva l'altezza della barra fissa */}
    <div style={{ height: '54px' }} />
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', background: barBg, borderBottom: `1px solid ${border}`, backdropFilter: 'blur(8px)' }}>
        {restaurant.logo_url && <img src={restaurant.logo_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />}
        <div style={{ flex: 1, fontFamily: t.headingFontFamily, fontWeight: 700, fontSize: '17px', color: textMain, textTransform: t.headingUppercase ? 'uppercase' : 'none', letterSpacing: t.headingUppercase ? '1px' : 0, textShadow: t.headingGlow ? `0 0 8px ${t.headingGlow}` : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {restaurant.name}
        </div>
        <button onClick={toggleSearch} aria-label="Cerca" style={iconBtn(searchOpen ? accent : textMain)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={searchOpen ? accent : textMain} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        </button>
        <button onClick={onOpenFavorites} aria-label="Preferiti" style={iconBtn(textMain)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={textMain} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          {favoritesCount > 0 && <span style={badge(t.favoriteActiveColor || '#e74c3c', '#fff')}>{favoritesCount}</span>}
        </button>
        {orderSettingsEnabled && (
          <button onClick={onOpenCart} aria-label="Carrello" style={iconBtn(textMain)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={textMain} strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            {cartCount > 0 && <span style={badge(accent, btnText)}>{cartCount}</span>}
          </button>
        )}
      </div>

      {searchOpen && (
        <div style={{ background: barBg, borderBottom: `1px solid ${border}`, padding: '10px 16px 14px', maxHeight: '70vh', overflowY: 'auto' }}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca un prodotto…"
            style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', border: `1px solid ${border}`, background: t.inputBackground || '#fff', color: t.inputText || '#111', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
          />
          {query && (
            results.length === 0 ? (
              <div style={{ padding: '18px 4px', color: textSoft, fontSize: '14px' }}>Nessun prodotto trovato.</div>
            ) : (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {results.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', border: `1px solid ${border}`, borderRadius: '10px' }}>
                    {p.image_url
                      ? <img src={p.image_url} alt="" style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }} />
                      : <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: t.backgroundTertiary || '#f1f1f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🍽️</div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: '12px', color: textSoft }}>{p._cat?.name} · {formatPrice(p)}</div>
                    </div>
                    {orderSettingsEnabled && (
                      <button onClick={() => onAddProduct(p)} style={{ width: '34px', height: '34px', borderRadius: '10px', border: 'none', background: btnBg, color: btnText, fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>+</button>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
    </>
  )
}

const iconBtn = (color) => ({ position: 'relative', background: 'transparent', border: 'none', padding: '6px', cursor: 'pointer', color, display: 'flex', alignItems: 'center' })
const badge = (bg, color) => ({ position: 'absolute', top: '-2px', right: '-2px', minWidth: '16px', height: '16px', padding: '0 4px', borderRadius: '8px', background: bg, color, fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' })
