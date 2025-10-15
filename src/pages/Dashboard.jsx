import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import RestaurantForm from '../components/RestaurantForm'
import CategoryManager from '../components/CategoryManager'
import OpeningHoursManager from '../components/OpeningHoursManager'
import ThemeCustomizer from '../components/ThemeCustomizer'

function Dashboard({ session }) {
  const [restaurant, setRestaurant] = useState(null)

  useEffect(() => {
    if (session) {
      loadRestaurant(session.user.id)
    }
  }, [session])

  const loadRestaurant = async (userId) => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!error && data) {
      setRestaurant(data)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleRestaurantSave = () => {
    loadRestaurant(session.user.id)
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#FFFFFF',
      padding: '20px' 
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '30px', 
          borderBottom: '2px solid #000000', 
          paddingBottom: '15px' 
        }}>
          <h1 style={{ color: '#000000', margin: 0 }}>
            🍕 MVPMenu Dashboard
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ color: '#000000', fontWeight: '500' }}>
              👤 {session.user.email}
            </span>
            <button 
              onClick={handleLogout}
              style={{ 
                padding: '8px 16px', 
                background: '#f44336', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Logout
            </button>
          </div>
        </header>

        {/* Form Ristorante */}
        <div style={{ marginBottom: '30px' }}>
          <RestaurantForm restaurant={restaurant} onSave={handleRestaurantSave} />
        </div>

        {/* Box Info Ristorante */}
        {restaurant && (
          <div style={{ 
            background: '#FFFFFF', 
            padding: '24px', 
            borderRadius: '8px', 
            marginTop: '30px',
            border: '2px solid #000000'
          }}>
            <h3 style={{ 
              color: '#000000', 
              margin: '0 0 20px 0',
              fontSize: '20px',
              fontWeight: 'bold'
            }}>
              ✅ Il tuo ristorante è stato creato!
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: 0, color: '#000000' }}>
                <strong style={{ fontWeight: '600' }}>Nome:</strong> {restaurant.name}
              </p>
              <p style={{ margin: 0, color: '#000000' }}>
                <strong style={{ fontWeight: '600' }}>Indirizzo:</strong> {restaurant.address}
              </p>
              <p style={{ margin: 0, color: '#000000' }}>
                <strong style={{ fontWeight: '600' }}>Telefono:</strong> {restaurant.phone}
              </p>
              <p style={{ margin: 0, color: '#000000' }}>
                <strong style={{ fontWeight: '600' }}>URL Menu:</strong>{' '}
                <a 
                  href={`${window.location.origin}/#/menu/${restaurant.subdomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    color: '#2196F3', 
                    textDecoration: 'underline',
                    fontWeight: '500'
                  }}
                >
                  Apri menu pubblico
                </a>
              </p>
              <p style={{ 
                fontSize: '14px', 
                color: '#666', 
                margin: '8px 0 0 0',
                padding: '12px',
                backgroundColor: '#F5F5F5',
                borderRadius: '4px',
                fontFamily: 'monospace'
              }}>
                Link condivisibile: {window.location.origin}/#/menu/{restaurant.subdomain}
              </p>
            </div>
          </div>
        )}

        {/* Gestione Categorie */}
        {restaurant && <CategoryManager restaurantId={restaurant.id} />}
        
        {/* Gestione Orari */}
        {restaurant && <OpeningHoursManager restaurantId={restaurant.id} />}
        
        {/* Theme Customizer */}
        {restaurant && <ThemeCustomizer restaurantId={restaurant.id} />}
      </div>
    </div>
  )
}

export default Dashboard