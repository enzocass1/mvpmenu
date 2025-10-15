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
    
    // Gestisci il token di conferma email dall'URL
    const handleEmailConfirmation = async () => {
      const hash = window.location.hash
      
      // Cerca access_token nell'URL (Supabase lo mette dopo la conferma)
      if (hash.includes('access_token=')) {
        console.log('🔑 Token trovato nell\'URL! Gestisco conferma email...')
        
        // Estrai i parametri dall'hash
        const hashParams = hash.substring(1) // Rimuovi il primo #
        const params = new URLSearchParams(hashParams.split('?')[1] || hashParams)
        
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const type = params.get('type')
        
        console.log('Token type:', type)
        console.log('Access token presente:', !!accessToken)
        console.log('Refresh token presente:', !!refreshToken)
        
        if ((type === 'signup' || type === 'recovery') && accessToken && refreshToken) {
          console.log('✅ Email confermata! Imposto la sessione...')
          
          try {
            // Imposta la sessione manualmente
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })
            
            if (error) {
              console.error('❌ Errore impostazione sessione:', error)
              setError(error.message)
              setLoading(false)
            } else {
              console.log('✅ Sessione impostata correttamente!')
              console.log('Session data:', data.session)
              setSession(data.session)
              setLoading(false)
              
              // Pulisci l'URL dai parametri
              window.history.replaceState({}, document.title, '/#/')
            }
          } catch (err) {
            console.error('❌ Errore catch:', err)
            setError(err.message)
            setLoading(false)
          }
          return
        }
      }
      
      // Altrimenti, carica la sessione normale
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
    }
    
    handleEmailConfirmation()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔄 Auth state changed:', _event, session ? 'User logged in' : 'No session')
      
      if (_event === 'SIGNED_IN') {
        console.log('✅ User signed in!')
        setSession(session)
      } else if (_event === 'SIGNED_OUT') {
        console.log('👋 User signed out')
        setSession(null)
      } else if (_event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed')
        setSession(session)
      }
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