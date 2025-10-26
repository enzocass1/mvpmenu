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
  useSessionTracking
} from '../utils/analytics'
import Cart from '../components/Cart'
import AddToCartModal from '../components/AddToCartModal'

// Helper functions for theme styling (must be defined before component)
const getThemeStyles = (themeConfig) => {
  if (!themeConfig) return {} // Usa stili default se non c'è theme_config

  return {
    // Colori principali
    primaryColor: themeConfig.primaryColor || '#000000',
    secondaryColor: themeConfig.secondaryColor || '#ffffff',
    accentColor: themeConfig.accentColor || '#4CAF50',
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

    // Font e stili
    fontFamily: getFontFamily(themeConfig.fontFamily || 'system'),
    borderRadius: getBorderRadius(themeConfig.borderRadius || '16'),
  }
}

const getFontFamily = (fontType) => {
  const fontMap = {
    'system': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'serif': 'Georgia, "Times New Roman", serif',
    'sans-serif': '"Helvetica Neue", Arial, sans-serif',
    'cursive': '"Comic Sans MS", cursive'
  }
  return fontMap[fontType] || fontMap['system']
}

const getBorderRadius = (radius) => {
  return radius + 'px'
}

function PublicMenu() {
  const { subdomain } = useParams()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [restaurant, setRestaurant] = useState(null)
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState({})
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [expandedProducts, setExpandedProducts] = useState({})
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

  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [currentTranslate, setCurrentTranslate] = useState(0)
  const carouselRef = useRef(null)

  // Calcola stili dinamici basati sul theme_config del ristorante
  const themeStyles = useMemo(() => {
    return getThemeStyles(restaurant?.theme_config)
  }, [restaurant])

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
    const cleanup = useSessionTracking(restaurant.id)

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
      } catch (err) {
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

  // Cart functions
  const handleAddToCart = (productWithDetails) => {
    const existing = cartItems.find(item => item.id === productWithDetails.id && item.notes === productWithDetails.notes)

    if (existing) {
      // Aggiorna quantità se stesso prodotto con stesse note
      setCartItems(cartItems.map(item =>
        item.id === productWithDetails.id && item.notes === productWithDetails.notes
          ? { ...item, quantity: item.quantity + productWithDetails.quantity }
          : item
      ))
    } else {
      // Aggiungi nuovo item
      setCartItems([...cartItems, productWithDetails])
    }

    // Traccia analytics
    if (restaurant?.id) {
      supabase.from('analytics_events').insert({
        restaurant_id: restaurant.id,
        event_type: 'order_item_added',
        product_id: productWithDetails.id,
        metadata: {
          quantity: productWithDetails.quantity,
          has_notes: !!productWithDetails.notes
        }
      })
    }
  }

  const handleUpdateQuantity = (productId, notes, newQuantity) => {
    if (newQuantity < 1) {
      handleRemoveFromCart(productId, notes)
      return
    }
    setCartItems(cartItems.map(item =>
      item.id === productId && item.notes === notes ? { ...item, quantity: newQuantity } : item
    ))
  }

  const handleRemoveFromCart = (productId, notes) => {
    setCartItems(cartItems.filter(item => !(item.id === productId && item.notes === notes)))
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
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('*')
        .eq('subdomain', subdomain)
        .single()

      if (restaurantData) {
        setRestaurant(restaurantData)

        const { data: categoriesData } = await supabase
          .from('categories')
          .select('*')
          .eq('restaurant_id', restaurantData.id)
          .eq('is_visible', true)
          .order('order', { ascending: true })

        // Applica limiti Free/Premium sulle categorie
        const { hasValidAccess } = checkPremiumAccess(restaurantData)
const visibleCategories = hasValidAccess ? categoriesData : (categoriesData || []).slice(0, 3)
        setCategories(visibleCategories || [])

        const productsMap = {}
        for (const category of visibleCategories || []) {
          const { data: productsData } = await supabase
            .from('products')
            .select('*')
            .eq('category_id', category.id)
            .eq('is_visible', true)
            .order('order', { ascending: true })

          // Applica limiti Free/Premium sui prodotti
          const visibleProducts = hasValidAccess ? productsData : (productsData || []).slice(0, 3)

          // Carica varianti per ogni prodotto
          const productsWithVariants = await Promise.all(
            (visibleProducts || []).map(async (product) => {
              const { data: variantsData } = await supabase
                .from('v_product_variants')
                .select('*')
                .eq('product_id', product.id)
                .eq('is_available', true)
                .order('position')

              const { data: optionsData } = await supabase
                .from('v_product_variant_options')
                .select('*')
                .eq('product_id', product.id)
                .order('position')

              return {
                ...product,
                variants: variantsData || [],
                hasVariants: (variantsData || []).length > 0,
                optionsCount: (optionsData || []).length
              }
            })
          )

          productsMap[category.id] = productsWithVariants
        }
        setProducts(productsMap)
        
        const { data: hoursData } = await supabase
          .from('opening_hours')
          .select('*')
          .eq('restaurant_id', restaurantData.id)
          .order('order', { ascending: true })

        setOpeningHours(hoursData || [])
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
          <span style={{ fontWeight: '600', color: themeStyles.textSecondaryColor }}>{dayString}:</span>{' '}
          <span style={{ ...styles.infoText, color: themeStyles.textSecondaryColor }}>{timeString}</span>
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
                      <span style={styles.cartBadge}>{cartItems.length}</span>
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
              categoryProducts.map((product) => (
                <div key={product.id} style={styles.productCard}>
                  {/* Header prodotto: Cuore - ORDINA - Nome - Prezzo - Toggle */}
                  <div style={styles.productHeader}>
                    <div
                      onClick={(e) => handleToggleFavorite(e, product, categoryData?.name, selectedCategory)}
                      style={styles.favoriteButton}
                      role="button"
                      tabIndex={0}
                      aria-label={isFavorite(subdomain, product.id) ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                    >
                      {isFavorite(subdomain, product.id) ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill={themeStyles.favoriteActiveColor || '#e74c3c'} stroke={themeStyles.favoriteActiveColor || '#e74c3c'} strokeWidth="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={themeStyles.textSecondaryColor || '#000'} strokeWidth="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                      )}
                    </div>

                    {orderSettingsEnabled && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          setAddToCartModalProduct(product)
                        }}
                        style={styles.addToCartButtonCompact}
                        role="button"
                        tabIndex={0}
                        aria-label="Aggiungi al carrello"
                      >
                        ORDINA
                      </div>
                    )}

                    <div
                      style={{ flex: 1, cursor: 'pointer' }}
                      onClick={() => toggleProduct(product.id, selectedCategory)}
                    >
                      <div style={styles.productName}>{product.name}</div>
                    </div>

                    {!product.hasVariants && (
                      <div style={styles.singleProductPrice}>
                        €{product.price.toFixed(2)}
                      </div>
                    )}

                    <div
                      style={styles.expandIcon}
                      onClick={() => toggleProduct(product.id, selectedCategory)}
                    >
                      {expandedProducts[product.id] ? '▲' : '▼'}
                    </div>
                  </div>

                  {/* Lista varianti SEMPRE visibile (sotto il nome) */}
                  {product.hasVariants && product.variants.length > 0 && (
                    <div style={styles.variantsListContainer}>
                      {product.variants.map((variant) => (
                        <div key={variant.id} style={styles.variantItem}>
                          <span style={styles.variantName}>{variant.title}</span>
                          <span style={styles.variantPrice}>
                            €{(variant.price || product.price).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dettagli espandibili (immagine + descrizione) */}
                  {expandedProducts[product.id] && (
                    <div style={styles.productDetails}>
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          style={styles.productImage}
                          loading="lazy"
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
              ))
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
          />

          {/* Add to Cart Modal */}
          <AddToCartModal
            isOpen={!!addToCartModalProduct}
            onClose={() => setAddToCartModalProduct(null)}
            product={addToCartModalProduct}
            onAddToCart={handleAddToCart}
            restaurant={restaurant}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <style>{globalStyles}</style>
      <div style={styles.pageContainer}>
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
    backgroundColor: theme.secondaryColor || '#ffffff',
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
    backgroundColor: theme.secondaryColor || '#ffffff',
  },
  
  spinner: {
    width: '40px',
    height: '40px',
    border: `4px solid ${theme.borderColor || '#e0e0e0'}`,
    borderTop: `4px solid ${theme.primaryColor || '#000'}`,
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
    backgroundColor: theme.secondaryColor || '#ffffff',
  },
  
  logo: {
    maxHeight: '80px',
    maxWidth: '200px',
    objectFit: 'contain',
    marginBottom: '20px',
  },
  
  restaurantName: {
    color: theme.textSecondaryColor || '#000',
    fontSize: 'clamp(28px, 8vw, 48px)',
    fontWeight: '600',
    letterSpacing: '1px',
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
    backgroundColor: theme.secondaryColor || '#ffffff',
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
    backgroundColor: '#f5f5f5',
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
    fontSize: 'clamp(22px, 6vw, 28px)',
    fontWeight: 'bold',
    overflowWrap: 'break-word',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
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
    background: '#ccc',
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
    borderBottom: `1px solid ${theme.borderColor || '#e0e0e0'}`,
    position: 'sticky',
    top: 0,
    backgroundColor: '#ffffff',
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
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
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
    fontSize: 'clamp(15px, 4vw, 17px)',
    fontWeight: '500',
    overflowWrap: 'break-word',
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
    padding: '0 16px 16px',
    backgroundColor: theme.backgroundTertiary || '#f9f9f9',
  },
  
  productImage: {
    width: '100%',
    maxHeight: '250px',
    objectFit: 'cover',
    borderRadius: '8px',
    marginBottom: '12px',
    display: 'block',
  },
  
  productDescription: {
    color: theme.textTertiaryColor || '#666',
    fontSize: 'clamp(14px, 4vw, 16px)',
    margin: 0,
    lineHeight: '1.6',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-wrap',
  },

  variantsListContainer: {
    padding: '8px 16px 12px clamp(24px, 5vw, 56px)',
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
    color: '#000',
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
    color: '#666',
    marginBottom: '4px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  infoText: {
    fontSize: '16px',
    color: theme.textSecondaryColor || '#000',
    overflowWrap: 'break-word',
    lineHeight: '1.5',
  },
  
  phoneLink: {
    color: '#000',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: '500',
    borderBottom: '1px solid rgba(0,0,0,0.3)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderTop: `1px solid ${theme.borderColor || '#e0e0e0'}`,
    boxShadow: 'none',
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
    backgroundColor: theme.primaryColor || '#000',
    color: theme.textPrimaryColor || '#fff',
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
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s ease',
    marginRight: '8px',
  },

  addToCartButtonCompact: {
    backgroundColor: theme.primaryColor || '#000',
    color: theme.textPrimaryColor || '#fff',
    border: 'none',
    padding: '8px 16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    marginRight: '12px',
    borderRadius: theme.borderRadius || '8px',
    fontSize: '13px',
    fontWeight: '600',
    letterSpacing: '0.5px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    whiteSpace: 'nowrap',
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
    backgroundColor: '#000',
    color: '#fff',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    backgroundColor: '#ffffff',
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
    borderBottom: `1px solid ${theme.borderColor || '#e0e0e0'}`,
    backgroundColor: '#ffffff',
  },

  sidebarTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: '#000',
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
    color: '#000',
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
    color: '#000',
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