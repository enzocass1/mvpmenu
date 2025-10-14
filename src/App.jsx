import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import RestaurantForm from './components/RestaurantForm'
import CategoryManager from './components/CategoryManager'
import OpeningHoursManager from './components/OpeningHoursManager'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [restaurant, setRestaurant] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      if (session) {
        loadRestaurant(session.user.id)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        loadRestaurant(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

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
    setRestaurant(null)
  }

  const handleRestaurantSave = () => {
    loadRestaurant(session.user.id)
  }

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>Caricamento...</div>
  }

  if (!session) {
    return <Login />
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
    href={`/#/menu/${restaurant.subdomain}`} 
    style={{ color: '#2196F3', textDecoration: 'underline' }}
    onClick={(e) => {
      e.preventDefault()
      window.location.href = `/menu/${restaurant.subdomain}`
    }}
  >
    Vai al menu pubblico
  </a>
  {' '}({restaurant.subdomain}.mvpmenu.vercel.app)
</p>          <p style={{ marginTop: '20px', color: '#666' }}>
              Prossimi passi: Aggiungi categorie e prodotti al tuo menu!
            </p>
          </div>
        )}

        {restaurant && <CategoryManager restaurantId={restaurant.id} />}
        {restaurant && <OpeningHoursManager restaurantId={restaurant.id} />}

      </div>
    </div>
  )
}

export default App