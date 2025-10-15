import { useState, useEffect } from 'react'
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
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    loadMenu()
  }, [subdomain])

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

  const toggleProduct = (productId) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }))
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Caricamento menu...</p>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div style={styles.loadingContainer}>
        <p style={styles.loadingText}>Ristorante non trovato</p>
      </div>
    )
  }

  // Vista Prodotti
  if (selectedCategory) {
    const categoryData = categories.find(c => c.id === selectedCategory)
    const categoryProducts = products[selectedCategory] || []

    return (
      <div style={styles.container}>
        {/* Header Sticky */}
        <div style={styles.productsHeader}>
          <button 
            onClick={() => setSelectedCategory(null)}
            style={styles.backButton}
          >
            <span style={{ fontSize: '20px' }}>←</span>
            <span style={{ marginLeft: '8px' }}>Categorie</span>
          </button>
          <h1 style={styles.categoryTitle}>
            {categoryData?.name}
          </h1>
          <p style={styles.productCount}>
            {categoryProducts.length} {categoryProducts.length === 1 ? 'prodotto' : 'prodotti'}
          </p>
        </div>

        {/* Lista Prodotti */}
        <div style={styles.productsContainer}>
          {categoryProducts.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={{ fontSize: '48px', marginBottom: '16px' }}>🍽️</span>
              <p style={{ color: '#999', fontSize: '16px' }}>
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
                  <div style={styles.productHeader}>
                    <span style={styles.productName}>{product.name}</span>
                    <span style={styles.productPrice}>
                      €{product.price.toFixed(2)}
                    </span>
                  </div>
                  <span style={styles.expandIcon}>
                    {expandedProducts[product.id] ? '▲' : '▼'}
                  </span>
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
    )
  }

  // Vista Home
  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        {restaurant.logo_url && (
          <img 
            src={restaurant.logo_url} 
            alt={restaurant.name} 
            style={styles.logo}
            loading="eager"
          />
        )}
        <h1 style={styles.restaurantName}>
          {restaurant.name}
        </h1>
        <p style={styles.subtitle}>
          Scorri per esplorare le categorie
        </p>
      </header>

      {/* Carousel Categorie */}
      <section style={styles.carouselSection}>
        <div style={styles.carouselContainer}>
          {/* Frecce Navigazione */}
          {categories.length > 1 && (
            <>
              <button 
                onClick={prevSlide} 
                style={{...styles.navButton, ...styles.navButtonLeft}}
                aria-label="Categoria precedente"
              >
                <span style={{ fontSize: '24px' }}>←</span>
              </button>
              <button 
                onClick={nextSlide} 
                style={{...styles.navButton, ...styles.navButtonRight}}
                aria-label="Categoria successiva"
              >
                <span style={{ fontSize: '24px' }}>→</span>
              </button>
            </>
          )}

          {/* Card Categoria */}
          <div style={styles.carouselWrapper}>
            {categories.map((category, index) => {
              if (index !== currentIndex) return null
              
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  style={styles.categoryCard}
                  aria-label={`Visualizza ${category.name}`}
                >
                  <img 
                    src={category.image_url || 'https://via.placeholder.com/400x500/333/fff?text=Nessuna+Immagine'} 
                    alt={category.name}
                    style={styles.categoryImage}
                    loading="lazy"
                  />
                  <div style={styles.categoryOverlay}>
                    <h2 style={styles.categoryName}>{category.name}</h2>
                    <p style={styles.categoryProductCount}>
                      {products[category.id]?.length || 0} {(products[category.id]?.length || 0) === 1 ? 'prodotto' : 'prodotti'}
                    </p>
                  </div>
                </button>
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
      </section>

      {/* Informazioni */}
      <section style={styles.infoSection}>
        <div style={styles.infoContainer}>
          <h2 style={styles.infoTitle}>📍 Dove Siamo</h2>
          
          <div style={styles.infoCard}>
            <div style={styles.infoItem}>
              <span style={styles.infoIcon}>📍</span>
              <div>
                <strong style={styles.infoLabel}>Indirizzo</strong>
                <p style={styles.infoText}>{restaurant.address}</p>
              </div>
            </div>

            <div style={styles.infoItem}>
              <span style={styles.infoIcon}>📞</span>
              <div>
                <strong style={styles.infoLabel}>Telefono</strong>
                <a 
                  href={`tel:${restaurant.phone}`}
                  style={styles.phoneLink}
                >
                  {restaurant.phone}
                </a>
              </div>
            </div>
          </div>

          {/* Pulsante Condividi */}
          <button
            onClick={() => setShowQR(!showQR)}
            style={styles.shareButton}
          >
            {showQR ? '✕ Chiudi QR Code' : '📱 Condividi Menu'}
          </button>

          {showQR && (
            <div style={styles.qrContainer}>
              <p style={styles.qrText}>Scansiona per condividere</p>
              <div style={styles.qrPlaceholder}>
                [QR CODE]
              </div>
              <p style={styles.urlText}>
                {window.location.href}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>
          © 2025 {restaurant.name}
        </p>
        <p style={styles.footerPowered}>
          Powered by <strong>MVPMenu</strong>
        </p>
      </footer>
    </div>
  )
}

// Stili Responsive
const styles = {
  // Layout Base
  container: {
    minHeight: '100vh',
    backgroundColor: '#000',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  // Loading
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #333',
    borderTop: '4px solid #4CAF50',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
  loadingText: {
    color: 'white',
    fontSize: '16px',
  },

  // Header Home
  header: {
    padding: '40px 20px',
    textAlign: 'center',
    borderBottom: '1px solid #222',
  },
  logo: {
    height: '60px',
    maxWidth: '100%',
    objectFit: 'contain',
    marginBottom: '20px',
  },
  restaurantName: {
    color: 'white',
    fontSize: 'clamp(24px, 6vw, 40px)',
    fontWeight: '300',
    letterSpacing: '2px',
    margin: '0 0 12px 0',
    textTransform: 'uppercase',
  },
  subtitle: {
    color: '#999',
    fontSize: 'clamp(12px, 3vw, 14px)',
    margin: 0,
  },

  // Carousel
  carouselSection: {
    padding: '40px 20px',
  },
  carouselContainer: {
    position: 'relative',
    maxWidth: '500px',
    margin: '0 auto',
  },
  carouselWrapper: {
    height: 'clamp(350px, 70vw, 450px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCard: {
    width: '90%',
    maxWidth: '350px',
    height: '100%',
    borderRadius: '20px',
    overflow: 'hidden',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    padding: 0,
    transition: 'transform 0.2s ease',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  categoryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 50%, transparent 100%)',
    padding: '30px 20px',
    color: 'white',
  },
  categoryName: {
    margin: 0,
    fontSize: 'clamp(20px, 5vw, 28px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
  },
  categoryProductCount: {
    margin: '8px 0 0 0',
    fontSize: 'clamp(12px, 3vw, 14px)',
    opacity: 0.9,
  },

  // Bottoni Navigazione
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 10,
    background: 'rgba(76, 175, 80, 0.9)',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: 'clamp(40px, 10vw, 50px)',
    height: 'clamp(40px, 10vw, 50px)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  navButtonLeft: {
    left: 'clamp(5px, 2vw, 10px)',
  },
  navButtonRight: {
    right: 'clamp(5px, 2vw, 10px)',
  },

  // Indicatori
  indicators: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '20px',
  },
  indicator: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    border: 'none',
    background: '#333',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.2s ease',
  },
  indicatorActive: {
    background: '#4CAF50',
    width: '24px',
    borderRadius: '5px',
  },

  // Vista Prodotti
  productsHeader: {
    padding: '20px',
    borderBottom: '1px solid #222',
    position: 'sticky',
    top: 0,
    backgroundColor: '#000',
    zIndex: 100,
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    color: '#4CAF50',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px 0',
    fontSize: 'clamp(14px, 3.5vw, 16px)',
    fontWeight: '500',
    marginBottom: '12px',
  },
  categoryTitle: {
    color: 'white',
    fontSize: 'clamp(24px, 6vw, 32px)',
    margin: '0 0 8px 0',
    fontWeight: 'bold',
  },
  productCount: {
    color: '#999',
    fontSize: 'clamp(12px, 3vw, 14px)',
    margin: 0,
  },

  // Lista Prodotti
  productsContainer: {
    padding: '16px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  productCard: {
    marginBottom: '12px',
    border: '1px solid #222',
    borderRadius: '12px',
    overflow: 'hidden',
    backgroundColor: '#111',
    transition: 'border-color 0.2s ease',
  },
  productButton: {
    width: '100%',
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'white',
    gap: '12px',
  },
  productHeader: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  productName: {
    fontSize: 'clamp(14px, 4vw, 16px)',
    fontWeight: '500',
    textAlign: 'left',
  },
  productPrice: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 'clamp(14px, 4vw, 16px)',
    whiteSpace: 'nowrap',
  },
  expandIcon: {
    fontSize: '12px',
    color: '#666',
  },
  productDetails: {
    padding: '0 16px 16px 16px',
    backgroundColor: '#0a0a0a',
    animation: 'slideDown 0.3s ease',
  },
  productImage: {
    width: '100%',
    maxHeight: '250px',
    objectFit: 'cover',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  productDescription: {
    color: '#ccc',
    fontSize: 'clamp(13px, 3.5vw, 15px)',
    margin: 0,
    lineHeight: '1.6',
  },

  // Empty State
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },

  // Info Section
  infoSection: {
    backgroundColor: 'white',
    padding: '40px 20px',
  },
  infoContainer: {
    maxWidth: '600px',
    margin: '0 auto',
  },
  infoTitle: {
    fontSize: 'clamp(20px, 5vw, 24px)',
    marginBottom: '24px',
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
  },
  infoItem: {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
  },
  infoIcon: {
    fontSize: '24px',
    flexShrink: 0,
  },
  infoLabel: {
    display: 'block',
    fontSize: 'clamp(12px, 3vw, 14px)',
    color: '#666',
    marginBottom: '4px',
  },
  infoText: {
    margin: 0,
    fontSize: 'clamp(14px, 3.5vw, 16px)',
    lineHeight: '1.5',
  },
  phoneLink: {
    color: '#4CAF50',
    textDecoration: 'none',
    fontSize: 'clamp(14px, 3.5vw, 16px)',
    fontWeight: '500',
  },

  // Share Button
  shareButton: {
    width: '100%',
    padding: '16px',
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: 'clamp(14px, 3.5vw, 16px)',
    fontWeight: 'bold',
    transition: 'background 0.2s ease',
  },

  // QR Code
  qrContainer: {
    marginTop: '24px',
    padding: '24px',
    backgroundColor: '#f5f5f5',
    borderRadius: '12px',
    textAlign: 'center',
  },
  qrText: {
    fontSize: 'clamp(13px, 3vw, 14px)',
    color: '#666',
    marginBottom: '16px',
  },
  qrPlaceholder: {
    width: '200px',
    height: '200px',
    margin: '0 auto 16px',
    backgroundColor: '#ddd',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    color: '#999',
  },
  urlText: {
    fontSize: 'clamp(11px, 2.5vw, 12px)',
    color: '#999',
    wordBreak: 'break-all',
  },

  // Footer
  footer: {
    backgroundColor: '#0a0a0a',
    padding: '32px 20px',
    textAlign: 'center',
    borderTop: '1px solid #222',
  },
  footerText: {
    color: '#666',
    margin: '0 0 8px 0',
    fontSize: 'clamp(12px, 3vw, 14px)',
  },
  footerPowered: {
    color: '#444',
    margin: 0,
    fontSize: 'clamp(11px, 2.5vw, 12px)',
  },
}

export default PublicMenu