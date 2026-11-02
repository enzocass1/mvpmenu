import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { checkPremiumAccess } from '../utils/subscription'
import {
  getFavoritesArray,
  isFavorite,
  toggleFavorite,
  getFavoritesCount,
  onFavoritesChange
} from '../utils/favorites'
import {
  trackFavoriteAdded,
  trackFavoriteRemoved,
  trackProductViewed,
  trackCategoryViewed,
  trackQRScanned,
  startSessionTracking
} from '../utils/analytics'
import { addCartItem, updateCartItemQuantity, removeCartItem, countCartPieces } from '../utils/cart'
import useTrafficSource from '../hooks/useTrafficSource'
import Cart from '../components/Cart'
import AddToCartModal from '../components/AddToCartModal'
import MenuStoreLayout from '../components/MenuStoreLayout'
import MenuBuilderLayout from '../components/MenuBuilderLayout'
import MenuTopBar from '../components/MenuTopBar'
import { getPriceInfo } from '../lib/priceFormat'
import { isProductEsaurito } from '../lib/stock'

// Prezzo in formato italiano: "1,20 €" oppure "Da 7,00 €" se varianti a prezzi diversi
const formatPriceIt = (p) => {
  const { value, from } = getPriceInfo(p)
  return (from ? 'Da ' : '') + value.toFixed(2).replace('.', ',') + ' €'
}

// Helper functions for theme styling (must be defined before component)
const getThemeStyles = (themeConfig) => {
  if (!themeConfig) return {} // Usa stili default se non c'è theme_config

  return {
    // Colori principali
    primaryColor: themeConfig.primaryColor || '#000000',
    secondaryColor: themeConfig.secondaryColor || '#ffffff',
    accentColor: themeConfig.accentColor || '#4CAF50',
    // Colore dei pulsanti CTA, separato dallo sfondo pagina (fallback = primaryColor
    // per non cambiare i temi esistenti)
    buttonColor: themeConfig.buttonColor || themeConfig.primaryColor || '#000000',
    buttonTextColor: themeConfig.buttonTextColor || themeConfig.textPrimaryColor || '#ffffff',
    textPrimaryColor: themeConfig.textPrimaryColor || '#ffffff',
    textSecondaryColor: themeConfig.textSecondaryColor || '#111827',

    // Colori funzionali
    borderColor: themeConfig.borderColor || '#e0e0e0',
    textTertiaryColor: themeConfig.textTertiaryColor || '#999999',
    errorColor: themeConfig.errorColor || '#f44336',
    successColor: themeConfig.successColor || '#4CAF50',
    warningColor: themeConfig.warningColor || '#ff9800',
    backgroundTertiary: themeConfig.backgroundTertiary || '#f9f9f9',
    favoriteActiveColor: themeConfig.favoriteActiveColor || '#e74c3c',
    deleteColor: themeConfig.deleteColor || '#f44336',

    // Nuovi colori aggiunti in Fase 1
    inputBackground: themeConfig.inputBackground || '#ffffff',
    inputBorder: themeConfig.inputBorder || '#e0e0e0',
    inputBorderFocus: themeConfig.inputBorderFocus || '#000000',
    inputText: themeConfig.inputText || '#111827',
    overlayBackground: themeConfig.overlayBackground || 'rgba(0,0,0,0.5)',
    cardBackground: themeConfig.cardBackground || '#ffffff',
    cardBorder: themeConfig.cardBorder || '#e0e0e0',
    emptyStateText: themeConfig.emptyStateText || '#999999',
    linkColor: themeConfig.linkColor || '#4CAF50',
    linkHoverColor: themeConfig.linkHoverColor || '#000000',

    // Font e stili
    fontFamily: getFontFamily(themeConfig.fontFamily || 'system'),
    // Font dei titoli (nome locale, categorie, prodotti): se non specificato usa quello del corpo
    headingFontFamily: getFontFamily(themeConfig.headingFontFamily || themeConfig.fontFamily || 'system'),
    // Bagliore neon sui titoli (opzionale): colore per il text-shadow
    headingGlow: themeConfig.headingGlow || null,
    // Maiuscolo e spaziatura lettere sui titoli (per look audaci)
    headingUppercase: themeConfig.headingUppercase || false,
    borderRadius: getBorderRadius(themeConfig.borderRadius || '16'),
    // Settaggi MACRO (layout Builder): dimensione testi/card, spazio caroselli,
    // badge categorie. Passati "grezzi" perché MenuBuilderLayout li legge direttamente.
    textScale: themeConfig.textScale,
    cardSize: themeConfig.cardSize,
    sectionGap: themeConfig.sectionGap,
    showCategoryChips: themeConfig.showCategoryChips,
  }
}

// Mappa dei font. Le voci "web" richiedono il caricamento Google Fonts (ensureThemeFonts).
const FONT_MAP = {
  system: { stack: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  serif: { stack: 'Georgia, "Times New Roman", serif' },
  'sans-serif': { stack: '"Helvetica Neue", Arial, sans-serif' },
  cursive: { stack: '"Comic Sans MS", cursive' },
  // Web fonts (eleganti/moderni)
  playfair: { stack: '"Playfair Display", Georgia, serif', google: 'Playfair+Display:wght@500;600;700' },
  cormorant: { stack: '"Cormorant Garamond", Georgia, serif', google: 'Cormorant+Garamond:wght@500;600;700' },
  inter: { stack: '"Inter", -apple-system, sans-serif', google: 'Inter:wght@400;500;600' },
  poppins: { stack: '"Poppins", -apple-system, sans-serif', google: 'Poppins:wght@400;500;600' },
  montserrat: { stack: '"Montserrat", -apple-system, sans-serif', google: 'Montserrat:wght@400;500;600' },
  // Display audaci (temi "stravolgenti")
  orbitron: { stack: '"Orbitron", sans-serif', google: 'Orbitron:wght@600;700;800' },
  bebas: { stack: '"Bebas Neue", sans-serif', google: 'Bebas+Neue' },
  spacegrotesk: { stack: '"Space Grotesk", sans-serif', google: 'Space+Grotesk:wght@400;500;600;700' }
}

const getFontFamily = (fontType) => (FONT_MAP[fontType] || FONT_MAP.system).stack

const getBorderRadius = (radius) => {
  return radius + 'px'
}

// Carica una volta sola i Google Fonts richiesti dal tema (corpo + titoli)
const ensureThemeFonts = (themeConfig) => {
  if (!themeConfig || typeof document === 'undefined') return
  const keys = [themeConfig.fontFamily, themeConfig.headingFontFamily].filter(Boolean)
  const families = keys.map(k => FONT_MAP[k]?.google).filter(Boolean)
  for (const fam of families) {
    const id = 'gfont-' + fam.replace(/[^a-z0-9]/gi, '')
    if (document.getElementById(id)) continue
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${fam}&display=swap`
    document.head.appendChild(link)
  }
}

function PublicMenu() {
  const { subdomain } = useParams()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [restaurant, setRestaurant] = useState(null)
  // Anteprima live dall'editor tema (postMessage): sovrascrive il theme_config
  const [previewOverride, setPreviewOverride] = useState(null)
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState({})
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [expandedProducts, setExpandedProducts] = useState({})
  const [lightboxImage, setLightboxImage] = useState(null)
  const [openingHours, setOpeningHours] = useState([])
  const [favoritesCount, setFavoritesCount] = useState(0)
  const [isFavoritesSidebarOpen, setIsFavoritesSidebarOpen] = useState(false)
  const [favorites, setFavorites] = useState([])

  // Cart state - Carica dal localStorage se disponibile
  const [cartItems, setCartItems] = useState(() => {
    if (!subdomain) return []
    try {
      const savedCart = localStorage.getItem(`cart_${subdomain}`)
      return savedCart ? JSON.parse(savedCart) : []
    } catch (error) {
      console.error('Errore caricamento carrello:', error)
      return []
    }
  })
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [addToCartModalProduct, setAddToCartModalProduct] = useState(null)
  const [orderSettingsEnabled, setOrderSettingsEnabled] = useState(false)

  // Traffic source tracking (QR, organic, social)
  const tableId = searchParams.get('table_id')
  const tableNumber = searchParams.get('table_number')
  const trafficSource = useTrafficSource(
    restaurant?.id,
    tableId,
    tableNumber,
    null // customer_id (null for now, will add customer system later)
  )

  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [currentTranslate, setCurrentTranslate] = useState(0)
  const carouselRef = useRef(null)

  // Ascolta la bozza dall'editor tema (anteprima live) quando ?preview=1
  useEffect(() => {
    if (searchParams.get('preview') !== '1') return
    const onMsg = (e) => {
      if (e.data?.source === 'theme-editor' && e.data.config) setPreviewOverride(e.data.config)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [searchParams])

  // Configurazione tema effettiva: bozza live, oppure anteprima di un layout
  // (?previewLayout=carousel|store|builder) senza salvare, oppure quella salvata
  const previewLayoutParam = searchParams.get('previewLayout')
  const effectiveThemeConfig = previewOverride
    || (previewLayoutParam
        ? { ...(restaurant?.theme_config || {}), layoutStyle: previewLayoutParam }
        : restaurant?.theme_config)

  // Calcola stili dinamici basati sul theme_config effettivo
  const themeStyles = useMemo(() => {
    return getThemeStyles(effectiveThemeConfig)
  }, [effectiveThemeConfig])

  // Carica i Google Fonts richiesti dal tema (titoli/corpo)
  useEffect(() => {
    ensureThemeFonts(effectiveThemeConfig)
  }, [effectiveThemeConfig])

  // Genera stili completi con il tema applicato
  const styles = useMemo(() => {
    return getStyles(themeStyles)
  }, [themeStyles])

  useEffect(() => {
    loadMenu()
  }, [subdomain])

  useEffect(() => {
    document.body.style.overflowX = 'hidden'
    document.documentElement.style.overflowX = 'hidden'

    return () => {
      document.body.style.overflowX = ''
      document.documentElement.style.overflowX = ''
    }
  }, [])

  // Aggiorna contatore preferiti e lista
  useEffect(() => {
    if (subdomain) {
      updateFavorites()
    }
  }, [subdomain])

  // Listener per sincronizzazione tra tab
  useEffect(() => {
    if (!subdomain) return

    const unsubscribe = onFavoritesChange(() => {
      updateFavorites()
    })

    return unsubscribe
  }, [subdomain])

  // Salva carrello in localStorage ogni volta che cambia
  useEffect(() => {
    if (!subdomain) return
    try {
      localStorage.setItem(`cart_${subdomain}`, JSON.stringify(cartItems))
    } catch (error) {
      console.error('Errore salvataggio carrello:', error)
    }
  }, [cartItems, subdomain])

  // Tracciamento sessione e QR scan
  useEffect(() => {
    if (!restaurant?.id) return

    // Traccia QR scan se source=qr nei query params
    const source = searchParams.get('source')
    if (source === 'qr') {
      trackQRScanned(restaurant.id)
    }

    // Inizia tracciamento sessione
    const cleanup = startSessionTracking(restaurant.id)

    return cleanup
  }, [restaurant?.id, searchParams])

  // Carica impostazioni ordini
  useEffect(() => {
    if (!restaurant?.id) return

    const loadOrderSettings = async () => {
      try {
        const { data } = await supabase
          .from('restaurant_order_settings')
          .select('orders_enabled')
          .eq('restaurant_id', restaurant.id)
          .single()

        setOrderSettingsEnabled(data?.orders_enabled || false)
      } catch {
        console.log('Ordini non configurati per questo ristorante')
        setOrderSettingsEnabled(false)
      }
    }

    loadOrderSettings()
  }, [restaurant?.id])

  const updateFavorites = () => {
    if (subdomain) {
      setFavoritesCount(getFavoritesCount(subdomain))
      setFavorites(getFavoritesArray(subdomain))
    }
  }

  const handleToggleFavorite = (e, product, categoryName, categoryId) => {
    e.stopPropagation()

    const wasFavorite = isFavorite(subdomain, product.id)
    toggleFavorite(subdomain, product, categoryName, categoryId)
    updateFavorites()

    // Traccia evento analytics
    if (restaurant?.id) {
      if (wasFavorite) {
        trackFavoriteRemoved(restaurant.id, product.id)
      } else {
        trackFavoriteAdded(restaurant.id, product.id, categoryId)
      }
    }
  }

  const handleRemoveFromFavorites = (productId) => {
    toggleFavorite(subdomain, { id: productId }, '', '')
    updateFavorites()
  }

  // Cart functions (le righe sono identificate da prodotto + variante + note)
  const handleAddToCart = (productWithDetails) => {
    setCartItems(items => addCartItem(items, productWithDetails))

    // Traccia analytics (senza await/then la query non partirebbe mai)
    if (restaurant?.id) {
      supabase.from('analytics_events').insert({
        restaurant_id: restaurant.id,
        event_type: 'order_item_added',
        product_id: productWithDetails.id,
        metadata: {
          quantity: productWithDetails.quantity,
          variant_id: productWithDetails.variant_id || null,
          has_notes: !!productWithDetails.notes
        }
      }).then(({ error }) => {
        if (error) console.error('Errore tracking order_item_added:', error)
      })
    }
  }

  const handleUpdateQuantity = (lineKey, newQuantity) => {
    setCartItems(items => updateCartItemQuantity(items, lineKey, newQuantity))
  }

  const handleRemoveFromCart = (lineKey) => {
    setCartItems(items => removeCartItem(items, lineKey))
  }

  const handleClearCart = () => {
    setCartItems([])
    setIsCartOpen(false)
    // Rimuovi carrello dal localStorage
    if (subdomain) {
      try {
        localStorage.removeItem(`cart_${subdomain}`)
      } catch (error) {
        console.error('Errore rimozione carrello:', error)
      }
    }
  }

  const loadMenu = async () => {
    try {
      console.log('🔍 [PERFORMANCE] Inizio caricamento menu...')
      const startTime = performance.now()
      let queryCount = 0

      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('*')
        .eq('subdomain', subdomain)
        .single()
      queryCount++
      console.log(`⏱️ Query 1 (restaurant): ${(performance.now() - startTime).toFixed(0)}ms`)

      if (restaurantData) {
        setRestaurant(restaurantData)

        const { data: categoriesData } = await supabase
          .from('categories')
          .select('*')
          .eq('restaurant_id', restaurantData.id)
          .eq('is_visible', true)
          .order('order', { ascending: true })
        queryCount++
        console.log(`⏱️ Query 2 (categories): ${(performance.now() - startTime).toFixed(0)}ms`)

        // Applica limiti Free/Premium sulle categorie
        const { hasValidAccess } = checkPremiumAccess(restaurantData)
const visibleCategories = hasValidAccess ? categoriesData : (categoriesData || []).slice(0, 3)
        setCategories(visibleCategories || [])
        console.log(`📊 Categorie da caricare: ${visibleCategories?.length || 0}`)

        // OTTIMIZZAZIONE: Carica TUTTI i prodotti in UNA query invece di loop
        const categoryIds = (visibleCategories || []).map(c => c.id)
        console.log(`🚀 OTTIMIZZAZIONE: Carico dati per ${categoryIds.length} categorie in 3 query invece di ${categoryIds.length * 50} query`)

        if (categoryIds.length > 0) {
          const productsStart = performance.now()

          // Query 1: Tutti i prodotti di tutte le categorie
          const { data: allProductsData } = await supabase
            .from('products')
            .select('*')
            .in('category_id', categoryIds)
            .eq('is_visible', true)
            .order('category_id')
            .order('order', { ascending: true })
          queryCount++
          console.log(`⏱️ Query ${queryCount} (TUTTI i products): ${(performance.now() - productsStart).toFixed(0)}ms - Prodotti trovati: ${allProductsData?.length || 0}`)

          if (allProductsData && allProductsData.length > 0) {
            const productIds = allProductsData.map(p => p.id)

            // Query 2: Tutte le varianti in UNA query
            const variantsStart = performance.now()
            const { data: allVariantsData } = await supabase
              .from('v_product_variants')
              .select('*')
              .in('product_id', productIds)
              .eq('is_available', true)
              .order('position')
            queryCount++
            console.log(`⏱️ Query ${queryCount} (TUTTE le variants): ${(performance.now() - variantsStart).toFixed(0)}ms - Variants trovate: ${allVariantsData?.length || 0}`)

            // Query 3: Tutte le opzioni in UNA query
            const optionsStart = performance.now()
            const { data: allOptionsData } = await supabase
              .from('v_product_variant_options')
              .select('*')
              .in('product_id', productIds)
              .order('position')
            queryCount++
            console.log(`⏱️ Query ${queryCount} (TUTTE le options): ${(performance.now() - optionsStart).toFixed(0)}ms - Options trovate: ${allOptionsData?.length || 0}`)

            // Organizza i dati per product_id (lato client)
            const variantsByProduct = {}
            const optionsByProduct = {}

            allVariantsData?.forEach(variant => {
              if (!variantsByProduct[variant.product_id]) {
                variantsByProduct[variant.product_id] = []
              }
              variantsByProduct[variant.product_id].push(variant)
            })

            allOptionsData?.forEach(option => {
              if (!optionsByProduct[option.product_id]) {
                optionsByProduct[option.product_id] = []
              }
              optionsByProduct[option.product_id].push(option)
            })

            // Organizza prodotti per categoria
            const productsMap = {}
            visibleCategories.forEach(category => {
              const categoryProducts = allProductsData.filter(p => p.category_id === category.id)

              // Applica limiti Free/Premium sui prodotti
              const visibleProducts = hasValidAccess ? categoryProducts : categoryProducts.slice(0, 3)

              productsMap[category.id] = visibleProducts.map(product => ({
                ...product,
                variants: variantsByProduct[product.id] || [],
                hasVariants: (variantsByProduct[product.id] || []).length > 0,
                optionsCount: (optionsByProduct[product.id] || []).length
              }))

              console.log(`📦 Prodotti in "${category.name}": ${productsMap[category.id].length}`)
            })

            setProducts(productsMap)
            console.log(`✅ OTTIMIZZAZIONE COMPLETATA: ${categoryIds.length * 50} query ridotte a solo 3!`)
          }
        }

        const { data: hoursData } = await supabase
          .from('opening_hours')
          .select('*')
          .eq('restaurant_id', restaurantData.id)
          .order('order', { ascending: true })
        queryCount++
        console.log(`⏱️ Query ${queryCount} (opening_hours): ${(performance.now() - startTime).toFixed(0)}ms`)

        setOpeningHours(hoursData || [])

        const totalTime = (performance.now() - startTime).toFixed(0)
        console.log(`✅ [PERFORMANCE] Menu caricato in ${totalTime}ms con ${queryCount} query`)

        if (queryCount <= 10) {
          console.log(`🚀 OTTIMIZZAZIONE ATTIVA: Solo ${queryCount} query! Miglioramento del 95%+`)
        } else {
          console.log(`⚠️ Attenzione: ${queryCount} query sono troppe. Ottimizzazione necessaria.`)
        }
      }
    } catch (error) {
      console.error('Errore:', error)
    } finally {
      setLoading(false)
    }
  }

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % categories.length)
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + categories.length) % categories.length)
  }

  const handleDragStart = (e) => {
    setIsDragging(true)
    setStartX(e.type === 'mousedown' ? e.pageX : e.touches[0].clientX)
  }

  const handleDragMove = (e) => {
    if (!isDragging) return
    
    const currentX = e.type === 'mousemove' ? e.pageX : e.touches[0].clientX
    const diff = currentX - startX
    setCurrentTranslate(diff)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    
    if (currentTranslate > 50) {
      prevSlide()
    } else if (currentTranslate < -50) {
      nextSlide()
    }
    
    setCurrentTranslate(0)
  }

  const toggleProduct = (productId, categoryId) => {
    const wasExpanded = expandedProducts[productId]

    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }))

    // Traccia visualizzazione prodotto solo quando viene espanso
    if (!wasExpanded && restaurant?.id) {
      trackProductViewed(restaurant.id, productId, categoryId)
    }
  }

  const formatOpeningHours = () => {
    if (openingHours.length === 0) {
      return <div style={styles.infoText}>Orari non disponibili</div>
    }

    return openingHours.map((hour, index) => {
      let dayString = hour.day_start
      if (hour.day_end && hour.day_end !== hour.day_start) {
        dayString += `-${hour.day_end}`
      }

      let timeString = `${hour.time_start_1}-${hour.time_end_1}`
      if (hour.time_start_2 && hour.time_end_2) {
        timeString += `, ${hour.time_start_2}-${hour.time_end_2}`
      }

      return (
        <div key={index} style={{ marginBottom: '8px' }}>
          <span style={{ fontWeight: '600', color: themeStyles.textPrimaryColor || '#fff' }}>{dayString}:</span>{' '}
          <span style={{ ...styles.infoText }}>{timeString}</span>
        </div>
      )
    })
  }

  if (loading) {
    return (
      <>
        <style>{globalStyles}</style>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Caricamento menu...</p>
        </div>
      </>
    )
  }

  if (!restaurant) {
    return (
      <>
        <style>{globalStyles}</style>
        <div style={styles.loadingContainer}>
          <p style={styles.loadingText}>Ristorante non trovato</p>
        </div>
      </>
    )
  }

  // Overlay condivisi (preferiti, carrello, modale aggiungi) riusati dal layout Store
  const sharedOverlays = (
    <>
      {isFavoritesSidebarOpen && (
        <>
          <div style={styles.sidebarOverlay} onClick={() => setIsFavoritesSidebarOpen(false)} />
          <div style={styles.sidebar}>
            <div style={styles.sidebarHeader}>
              <h2 style={styles.sidebarTitle}>I Tuoi Preferiti</h2>
              <button onClick={() => setIsFavoritesSidebarOpen(false)} style={styles.sidebarCloseButton} aria-label="Chiudi preferiti">✕</button>
            </div>
            <div style={styles.sidebarContent}>
              {favorites.length === 0 ? (
                <div style={styles.emptyFavorites}>
                  <p style={{ color: themeStyles.textTertiaryColor || '#999', fontSize: '16px', margin: 0 }}>Nessun preferito ancora</p>
                  <p style={{ color: themeStyles.textTertiaryColor || '#ccc', fontSize: '14px', marginTop: '8px' }}>Tocca il cuore sui prodotti per salvarli</p>
                </div>
              ) : (
                favorites.map((fav) => (
                  <div key={fav.id} style={styles.favoriteItem}>
                    <div style={{ flex: 1 }}>
                      <div style={styles.favoriteItemName}>{fav.name}</div>
                      <div style={styles.favoriteItemCategory}>{fav.categoryName}</div>
                      <div style={styles.favoriteItemPrice}>€{fav.price.toFixed(2)}</div>
                      {orderSettingsEnabled && (
                        <div onClick={() => setAddToCartModalProduct({ id: fav.id, name: fav.name, price: fav.price, image_url: fav.image_url, description: fav.description })} style={styles.favoriteOrderButton} role="button" tabIndex={0}>ORDINA</div>
                      )}
                    </div>
                    <button onClick={() => handleRemoveFromFavorites(fav.id)} style={styles.removeFavoriteButton} aria-label="Rimuovi dai preferiti">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
      <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} restaurant={restaurant} cartItems={cartItems} onUpdateQuantity={handleUpdateQuantity} onRemoveItem={handleRemoveFromCart} onClearCart={handleClearCart} trafficSource={trafficSource} />
      <AddToCartModal isOpen={!!addToCartModalProduct} onClose={() => setAddToCartModalProduct(null)} product={addToCartModalProduct} onAddToCart={handleAddToCart} restaurant={restaurant} />
    </>
  )

  // Layout "Builder": home a sezioni/caroselli configurate nel tema
  if ((effectiveThemeConfig?.layoutStyle || 'carousel') === 'builder') {
    return (
      <>
        <style>{globalStyles}</style>
        <MenuBuilderLayout
          restaurant={restaurant}
          categories={categories}
          products={products}
          openingHours={openingHours}
          theme={themeStyles}
          subdomain={subdomain}
          orderSettingsEnabled={orderSettingsEnabled}
          favoritesCount={favoritesCount}
          cartCount={countCartPieces(cartItems)}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenFavorites={() => setIsFavoritesSidebarOpen(true)}
          onAddProduct={(p) => setAddToCartModalProduct(p)}
          onToggleFavorite={handleToggleFavorite}
          isFav={(id) => isFavorite(subdomain, id)}
          trackProductViewed={trackProductViewed}
          sections={effectiveThemeConfig?.homeSections || []}
        />
        {sharedOverlays}
      </>
    )
  }

  // Layout "Store" (storefront e-commerce) se selezionato nel tema
  if ((effectiveThemeConfig?.layoutStyle || 'carousel') === 'store') {
    return (
      <>
        <style>{globalStyles}</style>
        <MenuStoreLayout
          restaurant={restaurant}
          categories={categories}
          products={products}
          openingHours={openingHours}
          theme={themeStyles}
          subdomain={subdomain}
          orderSettingsEnabled={orderSettingsEnabled}
          favoritesCount={favoritesCount}
          cartCount={countCartPieces(cartItems)}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenFavorites={() => setIsFavoritesSidebarOpen(true)}
          onAddProduct={(p) => setAddToCartModalProduct(p)}
          onToggleFavorite={handleToggleFavorite}
          isFav={(id) => isFavorite(subdomain, id)}
          trackProductViewed={trackProductViewed}
        />
        {sharedOverlays}
      </>
    )
  }

  if (selectedCategory) {
    const categoryData = categories.find(c => c.id === selectedCategory)
    const categoryProducts = products[selectedCategory] || []

    return (
      <>
        <style>{globalStyles}</style>
        <div style={styles.pageContainer}>
          <div style={styles.productsHeader}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <button
                onClick={() => setSelectedCategory(null)}
                style={styles.backButton}
              >
                ← Categorie
              </button>

              {/* Gruppo icone destra: Preferiti e Carrello */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={() => setIsFavoritesSidebarOpen(true)}
                  style={styles.favoritesHeaderButton}
                  aria-label="Apri preferiti"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={themeStyles.textSecondaryColor} strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                  {favoritesCount > 0 && (
                    <span style={styles.favoritesBadge}>{favoritesCount}</span>
                  )}
                </button>

                {/* Cart Button - Solo se ordini abilitati */}
                {orderSettingsEnabled && (
                  <button
                    onClick={() => setIsCartOpen(true)}
                    style={styles.cartHeaderButton}
                    aria-label="Apri carrello"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={themeStyles.textSecondaryColor} strokeWidth="2">
                      <circle cx="9" cy="21" r="1"></circle>
                      <circle cx="20" cy="21" r="1"></circle>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    {cartItems.length > 0 && (
                      <span style={styles.cartBadge}>{countCartPieces(cartItems)}</span>
                    )}
                  </button>
                )}
              </div>
            </div>
            <h1 style={styles.categoryTitle}>{categoryData?.name}</h1>
            {categoryData?.description && (
              <p style={styles.categoryDescription}>
                {categoryData.description}
              </p>
            )}
            <p style={styles.productCount}>
              {categoryProducts.length} {categoryProducts.length === 1 ? 'prodotto' : 'prodotti'}
            </p>
          </div>

          <div style={styles.productsList}>
            {categoryProducts.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={{ color: themeStyles.textTertiaryColor || '#666', fontSize: '16px' }}>
                  Nessun prodotto disponibile in questa categoria
                </p>
              </div>
            ) : (
              categoryProducts.map((product) => {
                const expanded = !!expandedProducts[product.id]
                const hasDetails = !!(product.image_url || product.description)
                const esaurito = isProductEsaurito(product)
                return (
                  <div key={product.id} style={styles.productCard}>
                    <div style={styles.productHeader}>
                      {/* Colonna sinistra: nome, poi prezzo + "Scopri di più" */}
                      <div style={styles.productMain}>
                        <div style={styles.productName}>{product.name}</div>

                        <div style={styles.productMetaRow}>
                          <span style={styles.productPriceLine}>{formatPriceIt(product)}</span>

                          {esaurito && <span style={styles.soldOutBadge}>Esaurito</span>}

                          {hasDetails && (
                            <span
                              onClick={() => toggleProduct(product.id, selectedCategory)}
                              style={styles.discoverToggle}
                              role="button"
                              tabIndex={0}
                              aria-label={expanded ? 'Chiudi dettagli' : 'Scopri di più'}
                            >
                              {expanded ? 'Chiudi' : 'Scopri di più'}
                              <svg
                                width="13" height="13" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
                              >
                                <path d="M6 9l6 6 6-6"></path>
                              </svg>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Colonna destra: cuore + Aggiungi */}
                      <div style={styles.productRightActions}>
                        <div
                          onClick={(e) => handleToggleFavorite(e, product, categoryData?.name, selectedCategory)}
                          style={styles.favoriteButton}
                          role="button"
                          tabIndex={0}
                          aria-label={isFavorite(subdomain, product.id) ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                        >
                          {isFavorite(subdomain, product.id) ? (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill={themeStyles.favoriteActiveColor || '#e74c3c'} stroke={themeStyles.favoriteActiveColor || '#e74c3c'} strokeWidth="2">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                          ) : (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={themeStyles.textSecondaryColor || '#000'} strokeWidth="2">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                          )}
                        </div>

                        {orderSettingsEnabled && (
                          <div
                            onClick={esaurito ? undefined : (e) => { e.stopPropagation(); setAddToCartModalProduct(product) }}
                            style={{ ...styles.addToCartButtonCompact, ...(esaurito ? styles.addToCartButtonDisabled : {}) }}
                            role="button"
                            tabIndex={esaurito ? -1 : 0}
                            aria-disabled={esaurito}
                            aria-label={esaurito ? 'Esaurito' : 'Aggiungi al carrello'}
                          >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M12 5v14M5 12h14"></path>
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dettagli espandibili: miniatura + descrizione */}
                    {expanded && hasDetails && (
                      <div style={styles.productDetails}>
                        {product.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            style={styles.productThumb}
                            loading="lazy"
                            onClick={() => setLightboxImage(product.image_url)}
                          />
                        )}
                        {product.description && (
                          <p style={styles.productDescription}>
                            {product.description}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          <footer style={styles.footer}>
            <div style={styles.footerContent}>
              <p style={styles.footerText}>
                Made with <span role="img" aria-label="cuore">❤️</span> by{' '}
                <a 
                  href="/#/landing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={styles.footerLink}
                >
                  MVPMenu
                </a>
                {' '}| © 2025
              </p>
            </div>
          </footer>

          <div style={styles.stickyButtons}>
            <a
              href={`tel:${restaurant.phone}`}
              style={styles.stickyButtonLeft}
            >
              <span style={styles.stickyButtonText}>Ordina da Casa</span>
            </a>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.stickyButtonRight}
            >
              <span style={styles.stickyButtonText}>Vieni a Trovarci</span>
            </a>
          </div>

          {/* Sidebar Preferiti */}
          {isFavoritesSidebarOpen && (
            <>
              <div
                style={styles.sidebarOverlay}
                onClick={() => setIsFavoritesSidebarOpen(false)}
              />
              <div style={styles.sidebar}>
                <div style={styles.sidebarHeader}>
                  <h2 style={styles.sidebarTitle}>I Tuoi Preferiti</h2>
                  <button
                    onClick={() => setIsFavoritesSidebarOpen(false)}
                    style={styles.sidebarCloseButton}
                    aria-label="Chiudi preferiti"
                  >
                    ✕
                  </button>
                </div>

                <div style={styles.sidebarContent}>
                  {favorites.length === 0 ? (
                    <div style={styles.emptyFavorites}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={themeStyles.textTertiaryColor || '#ccc'} strokeWidth="2" style={{ marginBottom: '16px' }}>
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                      <p style={{ color: themeStyles.textTertiaryColor || '#999', fontSize: '16px', margin: 0 }}>
                        Nessun preferito ancora
                      </p>
                      <p style={{ color: themeStyles.textTertiaryColor || '#ccc', fontSize: '14px', marginTop: '8px' }}>
                        Tocca il cuore sui prodotti per salvarli
                      </p>
                    </div>
                  ) : (
                    favorites.map((fav) => (
                      <div key={fav.id} style={styles.favoriteItem}>
                        <div style={{ flex: 1 }}>
                          <div style={styles.favoriteItemName}>{fav.name}</div>
                          <div style={styles.favoriteItemCategory}>{fav.categoryName}</div>
                          <div style={styles.favoriteItemPrice}>€{fav.price.toFixed(2)}</div>

                          {/* Pulsante ORDINA se ordini abilitati */}
                          {orderSettingsEnabled && (
                            <div
                              onClick={() => {
                                setAddToCartModalProduct({
                                  id: fav.id,
                                  name: fav.name,
                                  price: fav.price,
                                  image_url: fav.image_url,
                                  description: fav.description
                                })
                              }}
                              style={styles.favoriteOrderButton}
                              role="button"
                              tabIndex={0}
                            >
                              ORDINA
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveFromFavorites(fav.id)}
                          style={styles.removeFavoriteButton}
                          aria-label="Rimuovi dai preferiti"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {/* Cart Slidecart */}
          <Cart
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            restaurant={restaurant}
            cartItems={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveFromCart}
            onClearCart={handleClearCart}
            trafficSource={trafficSource}
          />

          {/* Add to Cart Modal */}
          <AddToCartModal
            isOpen={!!addToCartModalProduct}
            onClose={() => setAddToCartModalProduct(null)}
            product={addToCartModalProduct}
            onAddToCart={handleAddToCart}
            restaurant={restaurant}
          />

          {/* Modal immagine prodotto (lightbox) */}
          {lightboxImage && (
            <div style={styles.lightboxOverlay} onClick={() => setLightboxImage(null)}>
              <button
                style={styles.lightboxClose}
                onClick={() => setLightboxImage(null)}
                aria-label="Chiudi immagine"
              >
                ✕
              </button>
              <img
                src={lightboxImage}
                alt=""
                style={styles.lightboxImage}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <style>{globalStyles}</style>
      <div style={styles.pageContainer}>
        <MenuTopBar
          restaurant={restaurant}
          categories={categories}
          products={products}
          theme={themeStyles}
          subdomain={subdomain}
          orderSettingsEnabled={orderSettingsEnabled}
          favoritesCount={favoritesCount}
          cartCount={countCartPieces(cartItems)}
          onOpenFavorites={() => setIsFavoritesSidebarOpen(true)}
          onOpenCart={() => setIsCartOpen(true)}
          onAddProduct={(p) => setAddToCartModalProduct(p)}
        />
        <div style={styles.header}>
          {restaurant.logo_url && (
            <img
              src={restaurant.logo_url}
              alt={restaurant.name}
              style={styles.logo}
            />
          )}
          <h1 style={styles.restaurantName}>{restaurant.name}</h1>
          <p style={styles.subtitle}>Scorri per esplorare le categorie</p>
        </div>

        <div style={styles.carouselSection}>
          <div 
            ref={carouselRef}
            style={styles.carouselContainer}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
          >
            <div style={styles.carouselTrack}>
              {categories.map((category, index) => {
                let position = index - currentIndex
                
                if (position < -1) position = categories.length + position
                if (position > categories.length - 2) position = position - categories.length
                
                if (position < -1 || position > 1) return null
                
                const isCenter = position === 0
                const transform = `
                  translateX(calc(${position * 100}% + ${currentTranslate}px))
                  scale(${isCenter ? 1 : 0.85})
                  rotateY(${position * 15}deg)
                `
                
                const visibleProductCount = products[category.id]?.length || 0
                
                return (
                  <div
                    key={category.id}
                    style={{
                      ...styles.categoryCard,
                      transform,
                      opacity: isCenter ? 1 : 0.5,
                      zIndex: isCenter ? 10 : 1,
                      cursor: isCenter ? 'pointer' : 'default',
                      pointerEvents: isCenter ? 'auto' : 'none',
                    }}
                    onClick={() => {
                      if (isCenter) {
                        setSelectedCategory(category.id)
                        // Traccia visualizzazione categoria
                        if (restaurant?.id) {
                          trackCategoryViewed(restaurant.id, category.id)
                        }
                      }
                    }}
                  >
                    {category.image_url ? (
                      <img
                        src={category.image_url}
                        alt={category.name}
                        style={styles.categoryImage}
                        draggable="false"
                      />
                    ) : (
                      <div style={{
                        ...styles.categoryImage,
                        backgroundColor: '#f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: themeStyles.textTertiaryColor || '#999',
                        fontSize: '14px',
                        textAlign: 'center',
                        padding: '20px'
                      }}>
                        Nessuna<br/>Immagine
                      </div>
                    )}
                    <div style={styles.categoryOverlay}>
                      <h2 style={styles.categoryName}>{category.name}</h2>
                      <p style={styles.categoryCount}>
                        {visibleProductCount} {visibleProductCount === 1 ? 'prodotto' : 'prodotti'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {categories.length > 1 && (
              <div style={styles.indicators}>
                {categories.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    style={{
                      ...styles.indicator,
                      ...(index === currentIndex ? styles.indicatorActive : {})
                    }}
                    aria-label={`Vai alla categoria ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={styles.infoCard}>
          <div style={styles.infoItem}>
            <div style={{ flex: 1 }}>
              <div style={styles.infoLabel}>Orari di Apertura</div>
              <div style={{ marginTop: '8px' }}>
                {formatOpeningHours()}
              </div>
            </div>
          </div>

          <div style={styles.infoItem}>
            <div style={{ flex: 1 }}>
              <div style={styles.infoLabel}>Indirizzo</div>
              <div style={styles.infoText}>{restaurant.address}</div>
            </div>
          </div>

          <div style={styles.infoItem}>
            <div style={{ flex: 1 }}>
              <div style={styles.infoLabel}>Telefono</div>
              <a href={`tel:${restaurant.phone}`} style={styles.phoneLink}>
                {restaurant.phone}
              </a>
            </div>
          </div>

          <div style={{ marginTop: '24px', width: '100%', height: '300px', borderRadius: '12px', overflow: 'hidden', boxShadow: 'none' }}>
            <iframe
              src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(restaurant.address)}`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        <footer style={styles.footer}>
          <div style={styles.footerContent}>
            <p style={styles.footerText}>
              Made with <span role="img" aria-label="cuore">❤️</span> by{' '}
              <a 
                href="/#/landing" 
                target="_blank" 
                rel="noopener noreferrer"
                style={styles.footerLink}
              >
                MVPMenu
              </a>
              {' '}| © 2025
            </p>
          </div>
        </footer>

        <div style={styles.stickyButtons}>
          <a 
            href={`tel:${restaurant.phone}`}
            style={styles.stickyButtonLeft}
          >
            <span style={styles.stickyButtonText}>Ordina da Casa</span>
          </a>
          
          <a 
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.stickyButtonRight}
          >
            <span style={styles.stickyButtonText}>Vieni a Trovarci</span>
          </a>
        </div>
      </div>
    </>
  )
}

const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box !important;
  }
  
  html {
    width: 100vw;
    overflow-x: hidden !important;
  }
  
  body {
    width: 100vw;
    overflow-x: hidden !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  
  #root {
    width: 100vw;
    overflow-x: hidden !important;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`

const getStyles = (theme = {}) => ({
  pageContainer: {
    width: '100vw',
    minHeight: '100vh',
    backgroundColor: theme.primaryColor || '#000000',
    overflowX: 'hidden',
    position: 'relative',
    paddingBottom: '80px',
    fontFamily: theme.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  loadingContainer: {
    width: '100vw',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primaryColor || '#000000',
  },
  
  spinner: {
    width: '40px',
    height: '40px',
    border: `4px solid ${theme.borderColor || '#e0e0e0'}`,
    borderTop: `4px solid ${theme.accentColor || theme.textSecondaryColor || '#000'}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },

  loadingText: {
    color: theme.textSecondaryColor || '#000',
    fontSize: '16px',
  },

  header: {
    width: '100%',
    padding: '30px 5% 20px 5%',
    textAlign: 'center',
    borderBottom: 'none',
    backgroundColor: 'transparent',
  },
  
  logo: {
    maxHeight: '80px',
    maxWidth: '200px',
    objectFit: 'contain',
    marginBottom: '20px',
  },
  
  restaurantName: {
    color: theme.textPrimaryColor || '#fff',
    fontFamily: theme.headingFontFamily,
    fontSize: 'clamp(28px, 8vw, 48px)',
    fontWeight: '600',
    letterSpacing: theme.headingUppercase ? '3px' : '1px',
    textTransform: theme.headingUppercase ? 'uppercase' : 'none',
    textShadow: theme.headingGlow ? `0 0 10px ${theme.headingGlow}, 0 0 28px ${theme.headingGlow}` : 'none',
    margin: '0 0 12px 0',
    overflowWrap: 'break-word',
  },

  subtitle: {
    color: theme.textTertiaryColor || '#666',
    fontSize: 'clamp(13px, 4vw, 16px)',
    margin: 0,
    fontWeight: '400',
  },

  carouselSection: {
    width: '100%',
    padding: '0px 0 60px 0',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  
  carouselContainer: {
    width: '100%',
    height: 'clamp(300px, 60vh, 500px)',
    position: 'relative',
    perspective: '1000px',
    overflow: 'hidden',
    userSelect: 'none',
  },
  
  carouselTrack: {
    width: '100%',
    height: '100%',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  categoryCard: {
    position: 'absolute',
    width: 'min(320px, 85vw)',
    height: 'clamp(360px, 70vh, 420px)',
    borderRadius: theme.borderRadius || '20px',
    overflow: 'hidden',
    border: 'none',
    padding: 0,
    boxShadow: 'none',
    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    transformStyle: 'preserve-3d',
    backgroundColor: theme.backgroundTertiary || '#f5f5f5',
  },

  categoryImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    userSelect: 'none',
    pointerEvents: 'none',
  },

  categoryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: theme.primaryColor
      ? `linear-gradient(to top, ${theme.primaryColor}dd, ${theme.primaryColor}66 60%, transparent)`
      : 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.4) 60%, transparent)',
    padding: '30px 20px',
    color: theme.textPrimaryColor || 'white',
  },

  categoryName: {
    margin: 0,
    fontFamily: theme.headingFontFamily,
    fontSize: 'clamp(22px, 6vw, 28px)',
    fontWeight: 'bold',
    overflowWrap: 'break-word',
    letterSpacing: theme.headingUppercase ? '2px' : 'normal',
    textTransform: theme.headingUppercase ? 'uppercase' : 'none',
    textShadow: theme.headingGlow ? `0 0 8px ${theme.headingGlow}, 0 0 20px ${theme.headingGlow}` : '0 2px 4px rgba(0,0,0,0.3)',
    color: theme.textPrimaryColor || 'white',
  },
  
  categoryCount: {
    margin: '8px 0 0 0',
    fontSize: 'clamp(13px, 4vw, 15px)',
    opacity: 0.95,
  },
  
  indicators: {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '10px',
    zIndex: 15,
  },
  
  indicator: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    border: 'none',
    background: theme.borderColor || '#ccc',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.3s',
  },

  indicatorActive: {
    background: theme.primaryColor || '#000',
    width: '28px',
    borderRadius: '5px',
  },
  
  productsHeader: {
    width: '100%',
    padding: '20px 5%',
    borderBottom: `1px solid ${theme.cardBorder || theme.borderColor || '#e0e0e0'}`,
    position: 'sticky',
    top: 0,
    backgroundColor: theme.cardBackground || '#ffffff',
    zIndex: 100,
  },
  
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: theme.textSecondaryColor,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px 0',
    fontSize: '16px',
    fontWeight: '500',
    marginBottom: '12px',
  },
  
  categoryTitle: {
    color: theme.textSecondaryColor,
    fontSize: 'clamp(24px, 7vw, 32px)',
    margin: '0 0 8px 0',
    fontWeight: 'bold',
    overflowWrap: 'break-word',
  },

  categoryDescription: {
    color: theme.textTertiaryColor || '#666',
    fontSize: 'clamp(14px, 4vw, 16px)',
    margin: '0 0 12px 0',
    lineHeight: '1.6',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-wrap',
  },

  productCount: {
    color: theme.textTertiaryColor || '#666',
    fontSize: 'clamp(12px, 4vw, 14px)',
    margin: 0,
  },
  
  productsList: {
    width: '100%',
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px 5%',
  },
  
  productCard: {
    width: '100%',
    marginBottom: '12px',
    border: `1px solid ${theme.borderColor || '#e0e0e0'}`,
    borderRadius: theme.borderRadius || '12px',
    overflow: 'hidden',
    backgroundColor: theme.secondaryColor || '#ffffff',
    boxShadow: 'none',
  },

  productHeader: {
    width: '100%',
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  productMain: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },

  productMetaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },

  productPriceLine: {
    fontFamily: theme.headingFontFamily,
    fontSize: 'clamp(15px, 4vw, 17px)',
    fontWeight: 'bold',
    color: theme.textSecondaryColor || '#000',
    whiteSpace: 'nowrap',
  },

  soldOutBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
    color: '#b91c1c',
    background: '#fee2e2',
    border: '1px solid #fecaca',
    whiteSpace: 'nowrap',
  },

  addToCartButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },

  discoverToggle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    fontSize: 'clamp(13px, 3.6vw, 15px)',
    fontWeight: '400',
    color: theme.textSecondaryColor || '#000',
    whiteSpace: 'nowrap',
  },

  productRightActions: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  productButton: {
    width: '100%',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#000',
  },
  
  productName: {
    fontFamily: theme.headingFontFamily,
    fontSize: 'clamp(15px, 4vw, 17px)',
    fontWeight: '500',
    color: theme.textSecondaryColor || '#000',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  variantTitle: {
    fontWeight: '400',
    color: theme.textTertiaryColor || '#666',
    fontSize: 'clamp(13px, 3.5vw, 15px)',
  },

  productPrice: {
    color: theme.textSecondaryColor,
    fontWeight: 'bold',
    fontSize: 'clamp(15px, 4vw, 17px)',
    whiteSpace: 'nowrap',
  },

  variantsPreview: {
    fontSize: '11px',
    color: '#666',
    marginTop: '4px',
    fontWeight: '400',
  },

  variantsCount: {
    fontWeight: '600',
    color: '#555',
  },

  variantsExamples: {
    fontStyle: 'italic',
    color: '#888',
  },

  expandIcon: {
    fontSize: '12px',
    color: theme.textTertiaryColor || '#999',
  },
  
  productDetails: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 0 14px',
    margin: '0 14px',
    borderTop: `1px solid ${theme.borderColor || '#e0e0e0'}`,
  },

  productThumb: {
    flexShrink: 0,
    width: '72px',
    height: '72px',
    objectFit: 'cover',
    borderRadius: theme.borderRadius || '10px',
    display: 'block',
    cursor: 'zoom-in',
  },

  lightboxOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 4000,
    background: theme.overlayBackground || 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },

  lightboxImage: {
    maxWidth: '92vw',
    maxHeight: '86vh',
    width: 'auto',
    height: 'auto',
    objectFit: 'contain',
    borderRadius: '8px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
  },

  lightboxClose: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '42px',
    height: '42px',
    minWidth: '42px',
    flexShrink: 0,
    boxSizing: 'border-box',
    padding: 0,
    aspectRatio: '1 / 1',
    borderRadius: '50%',
    background: 'rgba(20, 20, 20, 0.65)',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    fontSize: '20px',
    lineHeight: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  productDescription: {
    flex: 1,
    minWidth: 0,
    color: theme.textTertiaryColor || '#666',
    fontSize: 'clamp(14px, 4vw, 16px)',
    margin: 0,
    lineHeight: '1.5',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-wrap',
  },

  variantsListContainer: {
    padding: '8px 16px 12px clamp(24px, 5vw, 56px)',
    backgroundColor: theme.backgroundTertiary || '#f9f9f9',
    borderTop: `1px solid ${theme.borderColor || '#e0e0e0'}`,
  },

  variantItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 0',
  },

  variantInfo: {
    flex: 1,
  },

  variantName: {
    fontSize: 'clamp(13px, 3.5vw, 14px)',
    fontWeight: '400',
    color: theme.textTertiaryColor || '#666',
  },

  variantPriceAndButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  variantPrice: {
    fontSize: 'clamp(14px, 4vw, 16px)',
    fontWeight: '600',
    color: theme.textSecondaryColor,
  },

  variantOrderButton: {
    backgroundColor: theme.primaryColor || '#000',
    color: theme.textPrimaryColor || '#fff',
    border: 'none',
    padding: '8px 16px',
    cursor: 'pointer',
    borderRadius: theme.borderRadius || '8px',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '0.5px',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  },

  singleProductRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '12px 16px',
  },

  singleProductPrice: {
    fontSize: 'clamp(15px, 4vw, 17px)',
    fontWeight: 'bold',
    color: theme.textSecondaryColor || '#000',
  },

  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },
  
  infoCard: {
    width: '100%',
    padding: '0 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  
  infoItem: {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
    alignItems: 'flex-start',
  },
  
  infoLabel: {
    fontSize: '13px',
    color: theme.textPrimaryColor || '#fff',
    marginBottom: '4px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    opacity: 0.8,
  },

  infoText: {
    fontSize: '16px',
    color: theme.textPrimaryColor || '#fff',
    overflowWrap: 'break-word',
    lineHeight: '1.5',
  },

  phoneLink: {
    color: theme.textPrimaryColor || '#fff',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: '500',
    borderBottom: `1px solid ${theme.textPrimaryColor || 'rgba(255,255,255,0.5)'}`,
    paddingBottom: '2px',
  },
  
  footer: {
    marginTop: '80px',
    padding: '30px 0',
    backgroundColor: theme.primaryColor || '#000000',
    width: '100vw',
    marginLeft: 'calc(-50vw + 50%)',
  },

  footerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    textAlign: 'left',
  },

  footerText: {
    margin: 0,
    color: theme.textPrimaryColor || '#FFFFFF',
    fontSize: '13px',
  },

  footerLink: {
    color: theme.textPrimaryColor || '#FFFFFF',
    textDecoration: 'underline',
    cursor: 'pointer',
  },

  stickyButtons: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    gap: '12px',
    padding: '12px',
    // Usa lo sfondo card del tema (prima era bianco fisso: incoerente con i temi scuri)
    backgroundColor: theme.cardBackground || '#ffffff',
    borderTop: `1px solid ${theme.borderColor || '#e0e0e0'}`,
    boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
    zIndex: 1000,
    backdropFilter: 'blur(10px)',
  },

  stickyButtonLeft: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '16px',
    backgroundColor: theme.buttonColor,
    color: theme.buttonTextColor,
    textDecoration: 'none',
    borderRadius: theme.borderRadius || '12px',
    fontWeight: '600',
    fontSize: 'clamp(13px, 3.5vw, 15px)',
    transition: 'all 0.3s ease',
    boxShadow: 'none',
  },

  stickyButtonRight: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '16px',
    backgroundColor: theme.primaryColor || '#000',
    color: theme.textPrimaryColor || '#fff',
    textDecoration: 'none',
    borderRadius: theme.borderRadius || '12px',
    fontWeight: '600',
    fontSize: 'clamp(13px, 3.5vw, 15px)',
    transition: 'all 0.3s ease',
    boxShadow: 'none',
  },

  stickyButtonText: {
    whiteSpace: 'nowrap',
  },

  // Stili per i preferiti
  favoriteButton: {
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s ease',
  },

  addToCartButtonCompact: {
    backgroundColor: theme.primaryColor || '#000',
    color: theme.textPrimaryColor || '#fff',
    border: 'none',
    width: '44px',
    height: '44px',
    flexShrink: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    borderRadius: '50%',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },

  favoritesHeaderButton: {
    background: 'none',
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'transform 0.2s ease',
  },

  favoritesBadge: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    backgroundColor: theme.favoriteActiveColor || '#e74c3c',
    color: '#fff',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    fontSize: '11px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cartHeaderButton: {
    background: 'none',
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'transform 0.2s ease',
  },

  cartBadge: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    backgroundColor: theme.accentColor || theme.primaryColor || '#000',
    color: theme.textPrimaryColor || '#fff',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    fontSize: '11px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  orderButton: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: theme.primaryColor || '#000',
    color: theme.textPrimaryColor || '#fff',
    border: 'none',
    borderRadius: theme.borderRadius || '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'background-color 0.2s',
  },

  // Sidebar preferiti
  sidebarOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.overlayBackground || 'rgba(0, 0, 0, 0.5)',
    zIndex: 9998,
    backdropFilter: 'blur(2px)',
  },

  sidebar: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '90%',
    maxWidth: '400px',
    backgroundColor: theme.cardBackground || '#ffffff',
    boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideInRight 0.3s ease-out',
  },

  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: `1px solid ${theme.cardBorder || theme.borderColor || '#e0e0e0'}`,
    backgroundColor: theme.cardBackground || '#ffffff',
  },

  sidebarTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: theme.textSecondaryColor || '#000',
  },

  sidebarCloseButton: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: theme.textTertiaryColor || '#666',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s ease',
  },

  sidebarContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
  },

  emptyFavorites: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
    height: '100%',
  },

  favoriteItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    marginBottom: '12px',
    backgroundColor: theme.backgroundTertiary || '#f9f9f9',
    borderRadius: '12px',
    border: `1px solid ${theme.borderColor || '#e0e0e0'}`,
  },

  favoriteItemName: {
    fontSize: '16px',
    fontWeight: '500',
    color: theme.textSecondaryColor || '#000',
    marginBottom: '4px',
  },

  favoriteItemCategory: {
    fontSize: '13px',
    color: theme.textTertiaryColor || '#666',
    marginBottom: '6px',
  },

  favoriteItemPrice: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: theme.textSecondaryColor || '#000',
    marginBottom: '8px',
  },

  favoriteOrderButton: {
    backgroundColor: theme.primaryColor || '#000',
    color: theme.textPrimaryColor || '#fff',
    padding: '8px 16px',
    borderRadius: theme.borderRadius || '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s ease',
    border: 'none',
    display: 'inline-block',
    marginTop: '4px',
  },

  removeFavoriteButton: {
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s ease',
    flexShrink: 0,
  },
})

export default PublicMenu