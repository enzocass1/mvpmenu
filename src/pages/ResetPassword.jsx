import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [accessToken, setAccessToken] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    console.log('Full URL:', window.location.href)
    console.log('Hash:', window.location.hash)
    
    // Estrai i parametri dall'URL
    const extractTokenFromUrl = () => {
      const fullHash = window.location.hash
      
      // Cerca i parametri dopo ? o dopo il secondo #
      let params = null
      
      // Caso 1: #/reset-password?access_token=... (CORRETTO)
      if (fullHash.includes('?')) {
        const queryString = fullHash.split('?')[1]
        params = new URLSearchParams(queryString)
      } 
      // Caso 2: #/reset-password#access_token=... (fallback per vecchi link)
      else if (fullHash.split('#').length > 2) {
        const tokenString = fullHash.split('#')[2]
        params = new URLSearchParams(tokenString)
      }
      
      if (params) {
        const token = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const type = params.get('type')
        
        console.log('Token type:', type)
        console.log('Access token found:', token ? 'YES' : 'NO')
        
        if (type === 'recovery' && token && refreshToken) {
          console.log('✅ Valid recovery token found!')
          
          // Imposta la sessione manualmente
          supabase.auth.setSession({
            access_token: token,
            refresh_token: refreshToken
          }).then(({ data, error }) => {
            if (error) {
              console.error('Error setting session:', error)
              setMessage({ text: '❌ Token non valido o scaduto', type: 'error' })
            } else {
              console.log('✅ Session set successfully!')
              setAccessToken(token)
              setMessage({ text: '✅ Token valido! Inserisci la nuova password.', type: 'success' })
            }
          })
        } else {
          console.error('❌ Invalid or missing recovery parameters')
          setMessage({ text: '❌ Token mancante o non valido. Usa il link dall\'email.', type: 'error' })
        }
      } else {
        console.error('❌ No parameters found in URL')
        setMessage({ text: '❌ Token mancante. Usa il link dall\'email.', type: 'error' })
      }
    }
    
    // Listener per l'evento di auth (backup)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event)
      if (event === 'PASSWORD_RECOVERY' && session) {
        console.log('✅ PASSWORD_RECOVERY event detected')
        setAccessToken(session.access_token)
        setMessage({ text: '✅ Token valido! Inserisci la nuova password.', type: 'success' })
      }
    })
    
    // Esegui l'estrazione
    extractTokenFromUrl()
    
    // Cleanup
    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleResetPassword = async (e) => {
    e.preventDefault()
    
    if (!accessToken) {
      setMessage({ text: '❌ Token mancante. Usa il link dall\'email.', type: 'error' })
      return
    }
    
    if (password !== confirmPassword) {
      setMessage({ text: '❌ Le password non corrispondono!', type: 'error' })
      return
    }

    if (password.length < 6) {
      setMessage({ text: '❌ La password deve essere di almeno 6 caratteri!', type: 'error' })
      return
    }

    setLoading(true)
    setMessage({ text: '', type: '' })

    try {
      // Aggiorna la password (la sessione è già impostata)
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setMessage({ text: '✅ Password aggiornata con successo!', type: 'success' })
      
      // Reindirizza al login dopo 2 secondi
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (error) {
      console.error('Reset password error:', error)
      setMessage({ text: `❌ ${error.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F5F5',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{
        background: '#FFFFFF',
        border: '2px solid #000000',
        borderRadius: '8px',
        padding: '40px',
        maxWidth: '450px',
        width: '100%',
        boxShadow: '8px 8px 0px #000000'
      }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: '700',
            color: '#000000',
            margin: '0 0 10px 0',
            letterSpacing: '-1px'
          }}>
            🔒 Reimposta Password
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#666',
            margin: 0
          }}>
            Inserisci la tua nuova password
          </p>
        </div>

        <form onSubmit={handleResetPassword}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#000000',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              🔑 Nuova Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
              style={{
                width: '100%',
                padding: '12px 15px',
                fontSize: '16px',
                border: '2px solid #000000',
                borderRadius: '4px',
                background: '#F5F5F5',
                color: '#000000',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => e.target.style.background = '#FFFFFF'}
              onBlur={(e) => e.target.style.background = '#F5F5F5'}
            />
            <p style={{
              fontSize: '12px',
              color: '#666',
              margin: '5px 0 0 0'
            }}>
              Minimo 6 caratteri
            </p>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#000000',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              🔑 Conferma Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength="6"
              style={{
                width: '100%',
                padding: '12px 15px',
                fontSize: '16px',
                border: '2px solid #000000',
                borderRadius: '4px',
                background: '#F5F5F5',
                color: '#000000',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => e.target.style.background = '#FFFFFF'}
              onBlur={(e) => e.target.style.background = '#F5F5F5'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 24px',
              fontSize: '16px',
              fontWeight: '700',
              color: '#FFFFFF',
              background: loading ? '#999' : '#4CAF50',
              border: '2px solid #000000',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: '3px 3px 0px #000000',
              transition: 'all 0.2s ease',
              marginBottom: '20px'
            }}
          >
            {loading ? '⏳ Aggiornamento...' : '✅ Aggiorna Password'}
          </button>

          <div style={{
            textAlign: 'center',
            padding: '15px 0',
            borderTop: '2px solid #F5F5F5'
          }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                background: 'none',
                border: 'none',
                color: '#2196F3',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'underline'
              }}
            >
              ← Torna al Login
            </button>
          </div>
        </form>

        {/* Message */}
        {message.text && (
          <div style={{
            padding: '12px 15px',
            borderRadius: '4px',
            border: '2px solid #000000',
            background: message.type === 'success' ? '#E8F5E9' : '#FFEBEE',
            color: message.type === 'success' ? '#2E7D32' : '#C62828',
            fontSize: '14px',
            fontWeight: '600',
            marginTop: '20px',
            textAlign: 'center'
          }}>
            {message.text}
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: '30px',
          paddingTop: '20px',
          borderTop: '2px solid #F5F5F5',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: '12px',
            color: '#999',
            margin: 0
          }}>
            Made with ❤️ by MVPMenu | © 2025
          </p>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword