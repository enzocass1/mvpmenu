import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function PublicMenu() {
  const { subdomain } = useParams()
  const [loading, setLoading] = useState(true)
  const [restaurant, setRestaurant] = useState(null)
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState({})
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [expandedProducts, setExpandedProducts] = useState({})
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [currentTranslate, setCurrentTranslate] = useState(0)
  const carouselRef = useRef(null)

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
          .order('order', { ascending: true })

        setCategories(categoriesData || [])

        const productsMap = {}
        for (const category of categoriesData || []) {
          const { data: productsData } = await supabase
            .from('products')
            .select('*')
            .eq('category_id', category.id)
            .order('order', { ascending: true })

          productsMap[category.id] = productsData || []
        }
        setProducts(productsMap)
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

  // Drag handlers
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
    
    // Se drag > 50px, cambia slide
    if (currentTranslate > 50) {
      prevSlide()
    } else if (currentTranslate < -50) {
      nextSlide()
    }
    
    setCurrentTranslate(0)
  }

  const toggleProduct = (productId) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }))
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

  // Vista Prodotti
  if (selectedCategory) {
    const categoryData = categories.find(c => c.id === selectedCategory)
    const categoryProducts = products[selectedCategory] || []

    return (
      <>
        <style>{globalStyles}</style>
        <div style={styles.pageContainer}>
          {/* Header */}
          <div style={styles.productsHeader}>
            <button 
              onClick={() => setSelectedCategory(null)}
              style={styles.backButton}
            >
              ← Categorie
            </button>
            <h1 style={styles.categoryTitle}>{categoryData?.name}</h1>
            <p style={styles.productCount}>
              {categoryProducts.length} {categoryProducts.length === 1 ? 'prodotto' : 'prodotti'}
            </p>
          </div>

          {/* Lista Prodotti */}
          <div style={styles.productsList}>
            {categoryProducts.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍽️</div>
                <p style={{ color: '#666', fontSize: '16px' }}>
                  Nessun prodotto in questa categoria
                </p>
              </div>
            ) : (
              categoryProducts.map((product) => (
                <div key={product.id} style={styles.productCard}>
                  <button
                    onClick={() => toggleProduct(product.id)}
                    style={styles.productButton}
                  >
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={styles.productName}>{product.name}</div>
                    </div>
                    <div style={styles.productPrice}>€{product.price.toFixed(2)}</div>
                    <div style={styles.expandIcon}>
                      {expandedProducts[product.id] ? '▲' : '▼'}
                    </div>
                  </button>
                  
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
        </div>
      </>
    )
  }

  // Vista Home
  return (
    <>
      <style>{globalStyles}</style>
      <div style={styles.pageContainer}>
        {/* Header */}
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

        {/* Carousel 3D */}
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
            {/* Cards con effetto 3D */}
            <div style={styles.carouselTrack}>
              {categories.map((category, index) => {
                // Calcola posizione relativa
                let position = index - currentIndex
                
                // Gestisci wrap-around
                if (position < -1) position = categories.length + position
                if (position > categories.length - 2) position = position - categories.length
                
                // Solo mostra card: precedente (-1), centrale (0), successiva (1)
                if (position < -1 || position > 1) return null
                
                const isCenter = position === 0
                const transform = `
                  translateX(calc(${position * 100}% + ${currentTranslate}px))
                  scale(${isCenter ? 1 : 0.85})
                  rotateY(${position * 15}deg)
                `
                
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
                    onClick={() => isCenter && setSelectedCategory(category.id)}
                  >
                    <img 
                      src={category.image_url || 'https://via.placeholder.com/350x450/cccccc/666666?text=Nessuna+Immagine'} 
                      alt={category.name}
                      style={styles.categoryImage}
                      draggable="false"
                    />
                    <div style={styles.categoryOverlay}>
                      <h2 style={styles.categoryName}>{category.name}</h2>
                      <p style={styles.categoryCount}>
                        {products[category.id]?.length || 0} prodotti
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            

            {/* Indicatori */}
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

        {/* Info */}
        <div style={styles.infoSection}>
          <div style={styles.infoContainer}>
            <h2 style={styles.infoTitle}>📍 Dove Siamo</h2>
            
            <div style={styles.infoCard}>
              <div style={styles.infoItem}>
                <span style={{ fontSize: '24px' }}>📍</span>
                <div style={{ flex: 1 }}>
                  <div style={styles.infoLabel}>Indirizzo</div>
                  <div style={styles.infoText}>{restaurant.address}</div>
                </div>
              </div>

              <div style={styles.infoItem}>
                <span style={{ fontSize: '24px' }}>📞</span>
                <div style={{ flex: 1 }}>
                  <div style={styles.infoLabel}>Telefono</div>
                  <a href={`tel:${restaurant.phone}`} style={styles.phoneLink}>
                    {restaurant.phone}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>© 2025 {restaurant.name}</p>
          <p style={styles.footerPowered}>Powered by MVPMenu</p>
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
`

const styles = {
  pageContainer: {
    width: '100vw',
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    overflowX: 'hidden',
    position: 'relative',
  },
  
  loadingContainer: {
    width: '100vw',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e0e0e0',
    borderTop: '4px solid #000',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
  
  loadingText: {
    color: '#000',
    fontSize: '16px',
  },
  
  // Header
  header: {
    width: '100%',
    padding: '40px 5%',
    textAlign: 'center',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#ffffff',
  },
  
  logo: {
    maxHeight: '80px',
    maxWidth: '200px',
    objectFit: 'contain',
    marginBottom: '20px',
  },
  
  restaurantName: {
    color: '#000',
    fontSize: 'clamp(28px, 8vw, 48px)',
    fontWeight: '600',
    letterSpacing: '1px',
    margin: '0 0 12px 0',
    overflowWrap: 'break-word',
  },
  
  subtitle: {
    color: '#666',
    fontSize: 'clamp(13px, 4vw, 16px)',
    margin: 0,
    fontWeight: '400',
  },
  
  // Carousel 3D
  carouselSection: {
    width: '100%',
    padding: '80px 0',
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  
  carouselContainer: {
    width: '100%',
    height: '500px',
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
  width: '320px',
  height: '420px',
  borderRadius: '20px',
  overflow: 'hidden',
  border: 'none',
  padding: 0,
  boxShadow: '0 30px 80px rgba(0,0,0,0.25), 0 10px 30px rgba(0,0,0,0.15)',  // ← Ombra più profonda e stratificata
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
    background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.4) 60%, transparent)',
    padding: '30px 20px',
    color: 'white',
  },
  
  categoryName: {
    margin: 0,
    fontSize: 'clamp(22px, 6vw, 28px)',
    fontWeight: 'bold',
    overflowWrap: 'break-word',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  
  categoryCount: {
    margin: '8px 0 0 0',
    fontSize: 'clamp(13px, 4vw, 15px)',
    opacity: 0.95,
  },
  
  // Frecce stilizzate
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 20,
    background: 'rgba(0, 0, 0, 0.3)',
    color: 'white',
    border: '2px solid white',
    borderRadius: '50%',
    width: '56px',
    height: '56px',
    fontSize: '32px',
    fontWeight: '300',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(4px)',
  },
  
  indicators: {
  position: 'absolute',
  bottom: '20px',  // ← Era 30px, ora 20px (più spazio sopra)
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
    background: '#000',
    width: '28px',
    borderRadius: '5px',
  },
  
  // Products
  productsHeader: {
    width: '100%',
    padding: '20px 5%',
    borderBottom: '1px solid #e0e0e0',
    position: 'sticky',
    top: 0,
    backgroundColor: '#ffffff',
    zIndex: 100,
  },
  
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#000',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px 0',
    fontSize: '16px',
    fontWeight: '500',
    marginBottom: '12px',
  },
  
  categoryTitle: {
    color: '#000',
    fontSize: 'clamp(24px, 7vw, 32px)',
    margin: '0 0 8px 0',
    fontWeight: 'bold',
    overflowWrap: 'break-word',
  },
  
  productCount: {
    color: '#666',
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
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
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
  
  productPrice: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 'clamp(15px, 4vw, 17px)',
    whiteSpace: 'nowrap',
  },
  
  expandIcon: {
    fontSize: '12px',
    color: '#999',
  },
  
  productDetails: {
    padding: '0 16px 16px',
    backgroundColor: '#f9f9f9',
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
    color: '#444',
    fontSize: 'clamp(14px, 4vw, 16px)',
    margin: 0,
    lineHeight: '1.6',
    overflowWrap: 'break-word',
  },
  
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },
  
  // Info Section
  infoSection: {
    width: '100%',
    backgroundColor: '#ffffff',
    padding: '60px 5%',
    borderTop: '1px solid #e0e0e0',
  },
  
  infoContainer: {
    width: '100%',
    maxWidth: '600px',
    margin: '0 auto',
  },
  
  infoTitle: {
    fontSize: 'clamp(22px, 6vw, 28px)',
    marginBottom: '24px',
    fontWeight: 'bold',
    color: '#000',
  },
  
  infoCard: {
    width: '100%',
    backgroundColor: '#2a2a2a',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
  
  infoItem: {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
    alignItems: 'flex-start',
  },
  
  infoLabel: {
    fontSize: '13px',
    color: '#999',
    marginBottom: '4px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  
  infoText: {
    fontSize: '16px',
    color: '#ffffff',
    overflowWrap: 'break-word',
    lineHeight: '1.5',
  },
  
  phoneLink: {
    color: '#ffffff',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: '500',
    borderBottom: '1px solid rgba(255,255,255,0.3)',
    paddingBottom: '2px',
  },
  
  // Footer
  footer: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    padding: '32px 5%',
    textAlign: 'center',
    borderTop: '1px solid #e0e0e0',
  },
  
  footerText: {
    color: '#666',
    margin: '0 0 8px 0',
    fontSize: '14px',
  },
  
  footerPowered: {
    color: '#999',
    margin: 0,
    fontSize: '12px',
  },
}

export default PublicMenu