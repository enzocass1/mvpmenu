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
    <div style={{ padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '15px' }}>
          <h1>🍕 MVPMenu Dashboard</h1>
          <div>
            <span style={{ marginRight: '15px' }}>👤 {session.user.email}</span>
            <button 
              onClick={handleLogout}
              style={{ padding: '8px 16px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Logout
            </button>
          </div>
        </header>

        <div style={{ marginBottom: '30px' }}>
          <RestaurantForm restaurant={restaurant} onSave={handleRestaurantSave} />
        </div>

        {restaurant && (
          <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '8px', marginTop: '30px' }}>
            <h3>✅ Il tuo ristorante è stato creato!</h3>
            <p><strong>Nome:</strong> {restaurant.name}</p>
            <p><strong>Indirizzo:</strong> {restaurant.address}</p>
            <p><strong>Telefono:</strong> {restaurant.phone}</p>
            <p>
              <strong>URL Menu:</strong>{' '}
              <a 
                href={`${window.location.origin}/#/menu/${restaurant.subdomain}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#2196F3', textDecoration: 'underline' }}
              >
                Apri menu pubblico
              </a>
            </p>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
              Link condivisibile: <code>{window.location.origin}/#/menu/{restaurant.subdomain}</code>
            </p>
          </div>
        )}

        {restaurant && <CategoryManager restaurantId={restaurant.id} />}
        {restaurant && <OpeningHoursManager restaurantId={restaurant.id} />}
        {restaurant && <ThemeCustomizer restaurantId={restaurant.id} />}
      </div>
    </div>
  )
}

export default Dashboard