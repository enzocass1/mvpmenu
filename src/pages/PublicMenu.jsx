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
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Caricamento menu...</p>
        <style>{styles}</style>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="loading-container">
        <p>Ristorante non trovato</p>
        <style>{styles}</style>
      </div>
    )
  }

  // Vista Prodotti
  if (selectedCategory) {
    const categoryData = categories.find(c => c.id === selectedCategory)
    const categoryProducts = products[selectedCategory] || []

    return (
      <>
        <style>{styles}</style>
        <div className="page-wrapper">
          <div className="menu-container">
            {/* Header Sticky */}
            <div className="products-header">
              <button 
                onClick={() => setSelectedCategory(null)}
                className="back-button"
              >
                <span style={{ fontSize: '20px' }}>←</span>
                <span style={{ marginLeft: '8px' }}>Categorie</span>
              </button>
              <h1 className="category-title">
                {categoryData?.name}
              </h1>
              <p className="product-count">
                {categoryProducts.length} {categoryProducts.length === 1 ? 'prodotto' : 'prodotti'}
              </p>
            </div>

            {/* Lista Prodotti */}
            <div className="products-list">
              {categoryProducts.length === 0 ? (
                <div className="empty-state">
                  <span style={{ fontSize: '48px', marginBottom: '16px' }}>🍽️</span>
                  <p>Nessun prodotto in questa categoria</p>
                </div>
              ) : (
                categoryProducts.map((product) => (
                  <div key={product.id} className="product-card">
                    <button
                      onClick={() => toggleProduct(product.id)}
                      className="product-button"
                    >
                      <div className="product-header">
                        <span className="product-name">{product.name}</span>
                        <span className="product-price">
                          €{product.price.toFixed(2)}
                        </span>
                      </div>
                      <span className="expand-icon">
                        {expandedProducts[product.id] ? '▲' : '▼'}
                      </span>
                    </button>
                    
                    {expandedProducts[product.id] && (
                      <div className="product-details">
                        {product.image_url && (
                          <img 
                            src={product.image_url} 
                            alt={product.name} 
                            className="product-image"
                            loading="lazy"
                          />
                        )}
                        {product.description && (
                          <p className="product-description">
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
        </div>
      </>
    )
  }

  // Vista Home
  return (
    <>
      <style>{styles}</style>
      <div className="page-wrapper">
        <div className="menu-container">
          {/* Header */}
          <header className="header">
            {restaurant.logo_url && (
              <img 
                src={restaurant.logo_url} 
                alt={restaurant.name} 
                className="logo"
              />
            )}
            <h1 className="restaurant-name">
              {restaurant.name}
            </h1>
            <p className="subtitle">
              Scorri per esplorare le categorie
            </p>
          </header>

          {/* Carousel Categorie */}
          <section className="carousel-section">
            <div className="carousel-container">
              {/* Card Categoria */}
              <div className="carousel-wrapper">
                {categories.map((category, index) => {
                  if (index !== currentIndex) return null
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className="category-card"
                    >
                      <img 
                        src={category.image_url || 'https://via.placeholder.com/400x500/333/fff?text=Nessuna+Immagine'} 
                        alt={category.name}
                        className="category-image"
                      />
                      <div className="category-overlay">
                        <h2 className="category-name">{category.name}</h2>
                        <p className="category-product-count">
                          {products[category.id]?.length || 0} {(products[category.id]?.length || 0) === 1 ? 'prodotto' : 'prodotti'}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Frecce Navigazione */}
              {categories.length > 1 && (
                <div className="nav-buttons">
                  <button 
                    onClick={prevSlide} 
                    className="nav-button nav-left"
                    aria-label="Categoria precedente"
                  >
                    ←
                  </button>
                  <button 
                    onClick={nextSlide} 
                    className="nav-button nav-right"
                    aria-label="Categoria successiva"
                  >
                    →
                  </button>
                </div>
              )}

              {/* Indicatori */}
              {categories.length > 1 && (
                <div className="indicators">
                  {categories.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={`indicator ${index === currentIndex ? 'active' : ''}`}
                      aria-label={`Vai alla categoria ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Informazioni */}
          <section className="info-section">
            <div className="info-container">
              <h2 className="info-title">📍 Dove Siamo</h2>
              
              <div className="info-card">
                <div className="info-item">
                  <span className="info-icon">📍</span>
                  <div className="info-content">
                    <strong className="info-label">Indirizzo</strong>
                    <p className="info-text">{restaurant.address}</p>
                  </div>
                </div>

                <div className="info-item">
                  <span className="info-icon">📞</span>
                  <div className="info-content">
                    <strong className="info-label">Telefono</strong>
                    <a 
                      href={`tel:${restaurant.phone}`}
                      className="phone-link"
                    >
                      {restaurant.phone}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="footer">
            <p className="footer-text">
              © 2025 {restaurant.name}
            </p>
            <p className="footer-powered">
              Powered by <strong>MVPMenu</strong>
            </p>
          </footer>
        </div>
      </div>
    </>
  )
}

// CSS Ottimizzato con Fix Overflow
const styles = `
  /* Reset e Base */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body {
    width: 100%;
    height: 100%;
    overflow-x: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Page Wrapper - Previene overflow */
  .page-wrapper {
    width: 100%;
    min-height: 100vh;
    overflow-x: hidden;
    position: relative;
  }

  .menu-container {
    width: 100%;
    min-height: 100vh;
    background-color: #000;
    overflow-x: hidden;
  }

  /* Loading */
  .loading-container {
    width: 100%;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: #000;
    color: white;
    overflow-x: hidden;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #333;
    border-top: 4px solid #4CAF50;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Header Home */
  .header {
    width: 100%;
    padding: 40px 20px;
    text-align: center;
    border-bottom: 1px solid #222;
  }

  .logo {
    height: 60px;
    max-width: 90%;
    object-fit: contain;
    margin: 0 auto 20px;
    display: block;
  }

  .restaurant-name {
    color: white;
    font-size: clamp(24px, 7vw, 40px);
    font-weight: 300;
    letter-spacing: 2px;
    margin: 0 0 12px 0;
    text-transform: uppercase;
    word-wrap: break-word;
    padding: 0 10px;
  }

  .subtitle {
    color: #999;
    font-size: clamp(12px, 3.5vw, 14px);
    margin: 0;
    padding: 0 10px;
  }

  /* Carousel Section */
  .carousel-section {
    width: 100%;
    padding: 60px 0;
  }

  .carousel-container {
    width: 100%;
    max-width: 100%;
    position: relative;
  }

  .carousel-wrapper {
    width: 100%;
    height: clamp(350px, 75vw, 500px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 20px;
  }

  .category-card {
    width: 100%;
    max-width: min(350px, 90vw);
    height: 100%;
    max-height: 450px;
    border-radius: 20px;
    overflow: hidden;
    border: none;
    cursor: pointer;
    position: relative;
    padding: 0;
    transition: transform 0.2s ease;
    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    display: block;
    margin: 0 auto;
  }

  .category-card:active {
    transform: scale(0.98);
  }

  .category-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .category-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 50%, transparent 100%);
    padding: 30px 20px;
    color: white;
  }

  .category-name {
    margin: 0;
    font-size: clamp(20px, 6vw, 28px);
    font-weight: bold;
    letter-spacing: 1px;
    word-wrap: break-word;
  }

  .category-product-count {
    margin: 8px 0 0 0;
    font-size: clamp(12px, 3.5vw, 14px);
    opacity: 0.9;
  }

  /* Navigation Buttons - Fix Overflow */
  .nav-buttons {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    transform: translateY(-50%);
    pointer-events: none;
    z-index: 10;
    padding: 0 20px;
  }

  .nav-button {
    position: absolute;
    top: 0;
    background: rgba(76, 175, 80, 0.9);
    color: white;
    border: none;
    border-radius: 50%;
    width: clamp(40px, 10vw, 50px);
    height: clamp(40px, 10vw, 50px);
    font-size: clamp(18px, 5vw, 24px);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    pointer-events: auto;
  }

  .nav-button:hover {
    background: rgba(76, 175, 80, 1);
    transform: scale(1.1);
  }

  .nav-button:active {
    transform: scale(0.95);
  }

  .nav-left {
    left: 0;
  }

  .nav-right {
    right: 0;
  }

  /* Indicatori */
  .indicators {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    margin-top: 30px;
    padding: 0 20px;
  }

  .indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: none;
    background: #333;
    cursor: pointer;
    padding: 0;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .indicator.active {
    background: #4CAF50;
    width: 24px;
    border-radius: 5px;
  }

  /* Products Header */
  .products-header {
    width: 100%;
    padding: 20px;
    border-bottom: 1px solid #222;
    position: sticky;
    top: 0;
    background-color: #000;
    z-index: 100;
  }

  .back-button {
    display: flex;
    align-items: center;
    color: #4CAF50;
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px 0;
    font-size: clamp(14px, 4vw, 16px);
    font-weight: 500;
    margin-bottom: 12px;
  }

  .back-button:active {
    opacity: 0.7;
  }

  .category-title {
    color: white;
    font-size: clamp(24px, 7vw, 32px);
    margin: 0 0 8px 0;
    font-weight: bold;
    word-wrap: break-word;
  }

  .product-count {
    color: #999;
    font-size: clamp(12px, 3.5vw, 14px);
    margin: 0;
  }

  /* Products List */
  .products-list {
    width: 100%;
    padding: 20px;
  }

  .product-card {
    width: 100%;
    margin: 0 auto 12px;
    border: 1px solid #222;
    border-radius: 12px;
    overflow: hidden;
    background-color: #111;
    transition: border-color 0.2s ease;
  }

  .product-button {
    width: 100%;
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: none;
    border: none;
    cursor: pointer;
    color: white;
    gap: 12px;
    text-align: left;
  }

  .product-header {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .product-name {
    font-size: clamp(14px, 4vw, 16px);
    font-weight: 500;
    flex: 1;
    min-width: 0;
    word-wrap: break-word;
  }

  .product-price {
    color: #4CAF50;
    font-weight: bold;
    font-size: clamp(14px, 4vw, 16px);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .expand-icon {
    font-size: 12px;
    color: #666;
    flex-shrink: 0;
  }

  .product-details {
    width: 100%;
    padding: 0 16px 16px 16px;
    background-color: #0a0a0a;
  }

  .product-image {
    width: 100%;
    max-height: 250px;
    object-fit: cover;
    border-radius: 8px;
    margin-bottom: 12px;
    display: block;
  }

  .product-description {
    color: #ccc;
    font-size: clamp(13px, 3.5vw, 15px);
    margin: 0;
    line-height: 1.6;
    word-wrap: break-word;
  }

  /* Empty State */
  .empty-state {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
    color: #999;
  }

  /* Info Section */
  .info-section {
    width: 100%;
    background-color: white;
    padding: 40px 20px;
  }

  .info-container {
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
  }

  .info-title {
    font-size: clamp(20px, 5vw, 24px);
    margin-bottom: 24px;
    font-weight: bold;
  }

  .info-card {
    width: 100%;
    background-color: #f5f5f5;
    border-radius: 12px;
    padding: 20px;
  }

  .info-item {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
  }

  .info-item:last-child {
    margin-bottom: 0;
  }

  .info-icon {
    font-size: 24px;
    flex-shrink: 0;
  }

  .info-content {
    flex: 1;
    min-width: 0;
  }

  .info-label {
    display: block;
    font-size: clamp(12px, 3vw, 14px);
    color: #666;
    margin-bottom: 4px;
  }

  .info-text {
    margin: 0;
    font-size: clamp(14px, 3.5vw, 16px);
    line-height: 1.5;
    color: #000;
    word-wrap: break-word;
  }

  .phone-link {
    color: #4CAF50;
    text-decoration: none;
    font-size: clamp(14px, 3.5vw, 16px);
    font-weight: 500;
    word-wrap: break-word;
  }

  /* Footer */
  .footer {
    width: 100%;
    background-color: #0a0a0a;
    padding: 32px 20px;
    text-align: center;
    border-top: 1px solid #222;
  }

  .footer-text {
    color: #666;
    margin: 0 0 8px 0;
    font-size: clamp(12px, 3vw, 14px);
  }

  .footer-powered {
    color: #444;
    margin: 0;
    font-size: clamp(11px, 2.5vw, 12px);
  }

  /* Media Queries Specifiche */
  
  @media (max-width: 375px) {
    .header {
      padding: 30px 15px;
    }
    
    .carousel-section {
      padding: 40px 0;
    }
    
    .carousel-wrapper {
      padding: 0 15px;
    }
    
    .nav-buttons {
      padding: 0 15px;
    }
    
    .products-list {
      padding: 15px;
    }
  }

  @media (min-width: 768px) {
    .products-list {
      max-width: 700px;
      margin: 0 auto;
    }
    
    .product-card:hover {
      border-color: #4CAF50;
      transform: translateY(-2px);
    }
  }

  @media (min-width: 1024px) {
    .carousel-container {
      max-width: 600px;
      margin: 0 auto;
    }
    
    .category-card:hover {
      transform: scale(1.02);
    }
  }
`

export default PublicMenu