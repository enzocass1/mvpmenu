import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    console.log('🔍 App mounted - checking session...')
    
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('❌ Error getting session:', error)
          setError(error.message)
        } else {
          console.log('✅ Session loaded:', session ? 'User logged in' : 'No session')
          setSession(session)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('❌ Unexpected error:', err)
        setError(err.message)
        setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔄 Auth state changed:', _event, session ? 'User logged in' : 'No session')
      setSession(session)
    })

    return () => {
      console.log('🧹 Cleaning up subscription')
      subscription.unsubscribe()
    }
  }, [])

  console.log('🎨 Rendering App - Loading:', loading, 'Session:', !!session, 'Error:', error)

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: '#FFEBEE',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div>
          <h1 style={{ color: '#C62828', fontSize: '24px', marginBottom: '10px' }}>❌ Errore</h1>
          <p style={{ color: '#666', fontSize: '16px' }}>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              fontSize: '14px',
              background: '#C62828',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Ricarica Pagina
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: '#F5F5F5',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '18px',
        color: '#666',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ fontSize: '48px' }}>⏳</div>
        <div>Caricamento...</div>
      </div>
    )
  }

  if (!session) {
    console.log('👤 Rendering Login page')
    return <Login />
  }

  console.log('🏠 Rendering Dashboard')
  return <Dashboard session={session} />
}

export default App