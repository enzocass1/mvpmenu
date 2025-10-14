import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { QRCodeSVG } from 'qrcode.react'

function PublicMenu() {
  const { subdomain } = useParams()
  const [loading, setLoading] = useState(true)
  const [restaurant, setRestaurant] = useState(null)
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState({})
  const [openingHours, setOpeningHours] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showQR, setShowQR] = useState(false)
  const [expandedProducts, setExpandedProducts] = useState({})

  useEffect(() => {
    loadMenu()
  }, [subdomain])

  const loadMenu = async () => {
    try {
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('subdomain', subdomain)
        .single()

      if (restaurantError) throw restaurantError
      setRestaurant(restaurantData)

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .order('order', { ascending: true })

      if (categoriesError) throw categoriesError
      setCategories(categoriesData)

      const productsMap = {}
      for (const category of categoriesData) {
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .eq('category_id', category.id)
          .order('order', { ascending: true })

        productsMap[category.id] = productsData || []
      }
      setProducts(productsMap)

      const { data: hoursData } = await supabase
        .from('opening_hours')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .order('order', { ascending: true })

      setOpeningHours(hoursData || [])
      
    } catch (error) {
      console.error('Errore caricamento menu:', error)
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' }}>
        <style>
          {`@keyframes spin { to { transform: rotate(360deg); } }`}
        </style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', border: '4px solid transparent', borderTop: '4px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
          <p style={{ color: 'white' }}>Caricamento menu...</p>
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: '#000000' }}>
        <div style={{ textAlign: 'center', backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '32px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', maxWidth: '28rem', border: '1px solid #333333' }}>
          <p style={{ color: '#ef4444', fontWeight: '600', marginBottom: '8px' }}>Ristorante non trovato</p>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>Il menu che stai cercando non esiste.</p>
        </div>
      </div>
    )
  }

  const menuUrl = `${window.location.origin}/menu/${restaurant.subdomain}`

  if (selectedCategory) {
    const categoryData = categories.find(c => c.id === selectedCategory)
    const categoryProducts = products[selectedCategory] || []

    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000000' }}>
        <div style={{ color: 'white', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.3)', backgroundColor: '#000000', borderBottom: '1px solid #333333' }}>
          <button 
            onClick={() => setSelectedCategory(null)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginBottom: '12px', color: 'white', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
            Torna alle categorie
          </button>
          <h1 style={{ fontSize: '28px', fontWeight: '300', letterSpacing: '0.05em' }}>{categoryData?.name}</h1>
        </div>

        <div style={{ maxWidth: '42rem', margin: '24px auto 24px auto', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'hidden', marginLeft: '8px', marginRight: '8px', backgroundColor: '#000000', border: '1px solid #333333' }}>
          {categoryProducts.map((product, index) => (
            <div key={product.id} style={{ borderBottom: index < categoryProducts.length - 1 ? '1px solid #333333' : 'none' }}>
              <button
                onClick={() => toggleProduct(product.id)}
                style={{ width: '100%', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#000000', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ fontWeight: '500', color: 'white', fontSize: '16px', flex: 1 }}>{product.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ color: 'white', fontWeight: '600', fontSize: '16px' }}>€ {product.price.toFixed(2)}</span>
                  <div style={{ width: '20px', height: '20px', color: '#9ca3af', transform: expandedProducts[product.id] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
              </button>
              <div style={{ maxHeight: expandedProducts[product.id] ? '1000px' : '0', overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
                <div style={{ padding: '24px', paddingTop: '8px', backgroundColor: '#1a1a1a' }}>
                  {product.image_url && (
                    <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '192px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' }} />
                  )}
                  {product.description && (
                    <p style={{ color: '#d1d5db', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>{product.description}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000000' }}>
      {showQR && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} 
          onClick={() => setShowQR(false)}
        >
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '20px' }}>Scansiona per vedere il menu</h3>
            <QRCodeSVG value={menuUrl} size={256} style={{ margin: '20px 0' }} />
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>{menuUrl}</p>
            <button
              onClick={() => setShowQR(false)}
              style={{ padding: '10px 20px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      <div style={{ color: 'white', padding: '48px 24px', textAlign: 'center', backgroundColor: '#000000', borderBottom: '1px solid #333333' }}>
        {restaurant.logo_url && (
          <img src={restaurant.logo_url} alt={restaurant.name} style={{ height: '80px', marginBottom: '16px' }} />
        )}
        <h1 style={{ fontSize: '40px', fontWeight: '300', letterSpacing: '0.1em', marginBottom: '8px', margin: 0 }}>{restaurant.name}</h1>
        <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '16px' }}>Scorri per esplorare le categorie</p>
        <button
          onClick={() => setShowQR(true)}
          style={{ padding: '10px 20px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
        >
          Mostra QR Code
        </button>
      </div>

      <div style={{ padding: '48px 16px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '72rem', margin: '0 auto' }}>
          {categories.length > 1 && (
            <>
              <button
                onClick={prevSlide}
                style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', zIndex: 50, background: 'rgba(255,255,255,0.9)', borderRadius: '50%', padding: '10px', width: '44px', height: '44px', border: 'none', cursor: 'pointer' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
              </button>

              <button
                onClick={nextSlide}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', zIndex: 50, background: 'rgba(255,255,255,0.9)', borderRadius: '50%', padding: '10px', width: '44px', height: '44px', border: 'none', cursor: 'pointer' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: 'rotate(180deg)' }}><path d="m15 18-6-6 6-6"/></svg>
              </button>
            </>
          )}

<div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '480px' }}>           
  {categories.map((category, index) => {
  const isActive = index === currentIndex

  return (
    <div
      key={category.id}
      style={{
        position: 'absolute',
        display: isActive ? 'block' : 'none',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)'
      }}
    >
      <button
        onClick={() => setSelectedCategory(category.id)}
        style={{ 
          width: '320px', 
          height: '384px', 
          borderRadius: '16px', 
          overflow: 'hidden', 
          border: 'none', 
          cursor: 'pointer', 
          padding: 0, 
          position: 'relative',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
        }}
      >
        <img 
          src={category.image_url || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400'} 
          alt={category.name} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.4), transparent)' }}></div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px', color: 'white' }}>
          <h2 style={{ fontSize: '32px', fontWeight: '300', margin: 0 }}>{category.name}</h2>
          <p style={{ fontSize: '14px', color: '#d1d5db', margin: 0 }}>{products[category.id]?.length || 0} prodotti</p>
        </div>
      </button>
    </div>
  )
})}
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '64px 24px' }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
          <h3 style={{ fontSize: '24px', fontWeight: '300', color: '#111827', marginBottom: '24px' }}>Informazioni</h3>
          
          <div style={{ display: 'flex', alignItems: 'start', gap: '16px', marginBottom: '24px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <div>
              <p style={{ fontWeight: '500', color: '#111827', margin: 0 }}>Indirizzo</p>
              <p style={{ color: '#6b7280', margin: 0 }}>{restaurant.address}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'start', gap: '16px', marginBottom: '24px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <div>
              <p style={{ fontWeight: '500', color: '#111827', margin: 0 }}>Telefono</p>
              <p style={{ color: '#6b7280', margin: 0 }}>{restaurant.phone}</p>
            </div>
          </div>

          {openingHours.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '18px', fontWeight: '500', color: '#111827', marginBottom: '12px' }}>Orari di Apertura</h4>
              {openingHours.map((hour) => (
                <p key={hour.id} style={{ color: '#6b7280', margin: '4px 0' }}>
                  <strong>{hour.day_start}{hour.day_end && ` - ${hour.day_end}`}:</strong> {hour.time_start_1} - {hour.time_end_1}
                  {hour.time_start_2 && hour.time_end_2 && ` | ${hour.time_start_2} - ${hour.time_end_2}`}
                </p>
              ))}
            </div>
          )}

          <div style={{ borderRadius: '12px', overflow: 'hidden', marginTop: '24px' }}>
            <iframe
              src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(restaurant.address)}`}
              width="100%"
              height="450"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
            ></iframe>
          </div>
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 100 }}>
        <a
          href={`mailto:enzocassese91@gmail.com?subject=Feedback per ${restaurant.name}&body=Ciao`}
          style={{ display: 'block', padding: '15px 25px', background: '#FF9800', color: 'white', textDecoration: 'none', borderRadius: '50px', fontWeight: 'bold' }}
        >
          💬 Feedback
        </a>
      </div>

      <div style={{ backgroundColor: '#111827', color: 'white', padding: '32px 16px', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>© 2025 {restaurant.name}. Tutti i diritti riservati.</p>
      </div>
    </div>
  )
}

export default PublicMenu