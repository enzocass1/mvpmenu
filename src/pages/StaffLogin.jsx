import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function StaffLogin() {
  const { subdomain } = useParams()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loggingIn, setLoggingIn] = useState(false)
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    loadRestaurant()
  }, [subdomain])

  const loadRestaurant = async () => {
    try {
      setLoading(true)
      setError('')

      // Carica il ristorante dal subdomain
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('subdomain', subdomain)
        .single()

      if (restaurantError) throw restaurantError
      if (!restaurantData) throw new Error('Ristorante non trovato')

      setRestaurant(restaurantData)

      // Verifica se l'utente loggato è il proprietario
      const { data: { session } } = await supabase.auth.getSession()
      if (session && session.user.id === restaurantData.user_id) {
        // Il proprietario ha accesso automatico come manager
        setIsOwner(true)
        navigate(`/staff/${subdomain}/orders`)
      }

    } catch (error) {
      console.error('Errore caricamento ristorante:', error)
      setError('Ristorante non trovato')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoggingIn(true)

    try {
      // Verifica credenziali staff
      const { data: staff, error: staffError } = await supabase
        .from('restaurant_staff')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('email', credentials.email)
        .single()

      if (staffError || !staff) {
        throw new Error('Credenziali non valide')
      }

      // Verifica password (decodifica da base64)
      const decodedPassword = atob(staff.password_hash)
      if (decodedPassword !== credentials.password) {
        throw new Error('Credenziali non valide')
      }

      if (!staff.is_active) {
        throw new Error('Account disabilitato')
      }

      // Salva staff in localStorage
      localStorage.setItem('staff_session', JSON.stringify({
        staff_id: staff.id,
        restaurant_id: restaurant.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        subdomain: subdomain
      }))

      // Redirect alla pagina ordini
      navigate(`/staff/${subdomain}/orders`)

    } catch (error) {
      console.error('Errore login:', error)
      setError(error.message || 'Errore durante il login')
    } finally {
      setLoggingIn(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingBox}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <div>Caricamento...</div>
        </div>
      </div>
    )
  }

  if (error && !restaurant) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>
          <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>Errore</h1>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <div style={styles.header}>
          <h1 style={styles.restaurantName}>{restaurant?.name}</h1>
          <h2 style={styles.title}>Accesso Staff</h2>
          <p style={styles.subtitle}>Inserisci le tue credenziali per accedere</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
              style={styles.input}
              placeholder="email@esempio.com"
              required
              disabled={loggingIn}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              style={styles.input}
              placeholder="••••••••"
              required
              disabled={loggingIn}
            />
          </div>

          {error && (
            <div style={styles.errorMessage}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loggingIn}
            style={{
              ...styles.submitButton,
              opacity: loggingIn ? 0.6 : 1,
              cursor: loggingIn ? 'not-allowed' : 'pointer'
            }}
          >
            {loggingIn ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif'
  },
  loginBox: {
    background: '#fff',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    padding: '40px',
    width: '100%',
    maxWidth: '440px'
  },
  loadingBox: {
    background: '#fff',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center',
    fontSize: '18px',
    color: '#666'
  },
  errorBox: {
    background: '#fff',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center',
    color: '#C62828'
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px'
  },
  restaurantName: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#000',
    marginBottom: '8px'
  },
  title: {
    fontSize: '20px',
    fontWeight: '500',
    color: '#333',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    fontWeight: '400'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333'
  },
  input: {
    padding: '12px 16px',
    fontSize: '15px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: '#fff',
    color: '#000'
  },
  errorMessage: {
    padding: '12px',
    backgroundColor: '#FFEBEE',
    color: '#C62828',
    borderRadius: '8px',
    fontSize: '14px',
    textAlign: 'center'
  },
  submitButton: {
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    background: '#000',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: '8px'
  }
}

export default StaffLogin
