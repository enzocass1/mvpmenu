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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        <p style={{ color: 'white' }}>Caricamento menu...</p>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        <p style={{ color: 'white' }}>Ristorante non trovato</p>
      </div>
    )
  }

  // Vista Prodotti
  if (selectedCategory) {
    const categoryData = categories.find(c => c.id === selectedCategory)
    const categoryProducts = products[selectedCategory] || []

    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #333' }}>
          <button 
            onClick={() => setSelectedCategory(null)}
            style={{ 
              color: 'white', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              padding: '8px',
              fontSize: '14px'
            }}
          >
            ← Torna alle categorie
          </button>
          <h1 style={{ color: 'white', fontSize: '24px', margin: '12px 0' }}>
            {categoryData?.name}
          </h1>
        </div>

        <div style={{ padding: '16px' }}>
          {categoryProducts.map((product) => (
            <div key={product.id} style={{ 
              marginBottom: '12px', 
              border: '1px solid #333', 
              borderRadius: '8px' 
            }}>
              <button
                onClick={() => toggleProduct(product.id)}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  background: '#111',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'white'
                }}
              >
                <span>{product.name}</span>
                <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                  € {product.price.toFixed(2)}
                </span>
              </button>
              
              {expandedProducts[product.id] && (
                <div style={{ padding: '12px', backgroundColor: '#1a1a1a' }}>
                  {product.image_url && (
                    <img 
                      src={product.image_url} 
                      alt={product.name} 
                      style={{ 
                        width: '100%', 
                        maxHeight: '200px', 
                        objectFit: 'cover', 
                        borderRadius: '4px',
                        marginBottom: '12px'
                      }} 
                    />
                  )}
                  {product.description && (
                    <p style={{ color: '#ccc', fontSize: '14px', margin: 0 }}>
                      {product.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Vista Home
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000' }}>
      {/* Header */}
      <div style={{ 
        padding: '32px 16px', 
        textAlign: 'center', 
        borderBottom: '1px solid #333'
      }}>
        {restaurant.logo_url && (
          <img 
            src={restaurant.logo_url} 
            alt={restaurant.name} 
            style={{ height: '60px', marginBottom: '16px' }} 
          />
        )}
        <h1 style={{ 
          color: 'white', 
          fontSize: '32px', 
          margin: '0 0 16px 0'
        }}>
          {restaurant.name}
        </h1>
      </div>

      {/* Categorie */}
      <div style={{ padding: '40px 20px' }}>
        <div style={{ position: 'relative', maxWidth: '400px', margin: '0 auto' }}>
          {categories.length > 1 && (
            <>
              <button onClick={prevSlide} style={{ 
                position: 'absolute', 
                left: '10px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                zIndex: 10,
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer'
              }}>
                ←
              </button>
              <button onClick={nextSlide} style={{ 
                position: 'absolute', 
                right: '10px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                zIndex: 10,
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer'
              }}>
                →
              </button>
            </>
          )}

          <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {categories.map((category, index) => {
              if (index !== currentIndex) return null
              
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  style={{ 
                    width: '90%',
                    maxWidth: '320px',
                    height: '350px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    padding: 0
                  }}
                >
                  <img 
                    src={category.image_url || 'https://via.placeholder.com/400'} 
                    alt={category.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ 
                    position: 'absolute', 
                    bottom: 0, 
                    left: 0, 
                    right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                    padding: '20px',
                    color: 'white'
                  }}>
                    <h2 style={{ margin: 0, fontSize: '24px' }}>{category.name}</h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                      {products[category.id]?.length || 0} prodotti
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{ backgroundColor: 'white', padding: '40px 20px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h3 style={{ marginBottom: '24px' }}>Informazioni</h3>
          
          <div style={{ marginBottom: '16px' }}>
            <strong>📍 Indirizzo:</strong>
            <p style={{ margin: '4px 0' }}>{restaurant.address}</p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <strong>📞 Telefono:</strong>
            <p style={{ margin: '4px 0' }}>{restaurant.phone}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        backgroundColor: '#111', 
        padding: '24px', 
        textAlign: 'center'
      }}>
        <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>
          © 2025 {restaurant.name}
        </p>
      </div>
    </div>
  )
}

export default PublicMenu