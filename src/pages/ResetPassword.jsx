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
      
      // Caso 1: #/reset-password?access_token=... (CORRETTO - senza doppio hash)
      if (fullHash.includes('?') && !fullHash.includes('?#')) {
        console.log('📍 Caso 1: Query string normale')
        const queryString = fullHash.split('?')[1]
        params = new URLSearchParams(queryString)
      } 
      // Caso 2: #/reset-password?#access_token=... (DOPPIO HASH - da fixare)
      else if (fullHash.includes('?#')) {
        console.log('📍 Caso 2: Doppio hash rilevato (?#)')
        const tokenString = fullHash.split('?#')[1]
        params = new URLSearchParams(tokenString)
      }
      // Caso 3: #/reset-password#access_token=... (fallback per vecchi link)
      else if (fullHash.split('#').length > 2) {
        console.log('📍 Caso 3: Secondo hash senza ?')
        const tokenString = fullHash.split('#')[2]
        params = new URLSearchParams(tokenString)
      }
      
      if (params) {
        const token = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const type = params.get('type')
        
        console.log('Token type:', type)
        console.log('Access token found:', token ? 'YES' : 'NO')
        console.log('Refresh token found:', refreshToken ? 'YES' : 'NO')
        
        if (type === 'recovery' && token && refreshToken) {
          console.log('✅ Valid recovery token found!')
          
          // Imposta la sessione manualmente
          supabase.auth.setSession({
            access_token: token,
            refresh_token: refreshToken
          }).then(({ data, error }) => {
            if (error) {
              console.error('Error setting session:', error)
              setMessage({ text: 'Token non valido o scaduto', type: 'error' })
            } else {
              console.log('✅ Session set successfully!')
              setAccessToken(token)
              setMessage({ text: 'Token valido! Inserisci la nuova password.', type: 'success' })
            }
          })
        } else {
          console.error('❌ Invalid or missing recovery parameters')
          console.error('  Type:', type)
          console.error('  Token:', token ? 'Present' : 'Missing')
          console.error('  Refresh:', refreshToken ? 'Present' : 'Missing')
          setMessage({ text: 'Token mancante o non valido. Usa il link dall\'email.', type: 'error' })
        }
      } else {
        console.error('❌ No parameters found in URL')
        console.error('Full hash was:', fullHash)
        setMessage({ text: 'Token mancante. Usa il link dall\'email.', type: 'error' })
      }
    }
    
    // Listener per l'evento di auth (backup)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event)
      if (event === 'PASSWORD_RECOVERY' && session) {
        console.log('✅ PASSWORD_RECOVERY event detected')
        setAccessToken(session.access_token)
        setMessage({ text: 'Token valido! Inserisci la nuova password.', type: 'success' })
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
      setMessage({ text: 'Token mancante. Usa il link dall\'email.', type: 'error' })
      return
    }
    
    if (password !== confirmPassword) {
      setMessage({ text: 'Le password non corrispondono!', type: 'error' })
      return
    }

    if (password.length < 6) {
      setMessage({ text: 'La password deve essere di almeno 6 caratteri!', type: 'error' })
      return
    }

    setLoading(true)
    setMessage({ text: '', type: '' })

    try {
      console.log('🔄 Aggiornamento password...')
      
      // Aggiorna la password (la sessione è già impostata)
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      console.log('✅ Password aggiornata!')
      setMessage({ text: 'Password aggiornata con successo!', type: 'success' })
      
      // Reindirizza al login dopo 2 secondi
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (error) {
      console.error('Reset password error:', error)
      setMessage({ text: error.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FFFFFF',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E0E0E0',
        borderRadius: '8px',
        padding: '40px',
        maxWidth: '450px',
        width: '100%',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '400',
            color: '#000000',
            margin: '0 0 8px 0',
            letterSpacing: '-0.5px'
          }}>
            Reimposta Password
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#666',
            margin: 0,
            fontWeight: '400'
          }}>
            Inserisci la tua nuova password
          </p>
        </div>

        <form onSubmit={handleResetPassword}>
          <div style={{ marginBottom: '20px' }}>
            <label 
              htmlFor="new-password"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                fontWeight: '400',
                color: '#666'
              }}
            >
              Nuova Password
            </label>
            <input
              id="new-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid #E0E0E0',
                borderRadius: '4px',
                background: '#FFFFFF',
                color: '#000000',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
                fontWeight: '400',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#000000'
                e.target.style.boxShadow = '0 0 0 1px #000000'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#E0E0E0'
                e.target.style.boxShadow = 'none'
              }}
            />
            <p style={{
              fontSize: '12px',
              color: '#999',
              margin: '6px 0 0 0',
              fontWeight: '400'
            }}>
              Minimo 6 caratteri
            </p>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label 
              htmlFor="confirm-password"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                fontWeight: '400',
                color: '#666'
              }}
            >
              Conferma Password
            </label>
            <input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength="6"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid #E0E0E0',
                borderRadius: '4px',
                background: '#FFFFFF',
                color: '#000000',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
                fontWeight: '400',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#000000'
                e.target.style.boxShadow = '0 0 0 1px #000000'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#E0E0E0'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#FFFFFF',
              background: loading ? '#999' : '#000000',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              marginBottom: '20px',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              if (!loading) e.target.style.background = '#333333'
            }}
            onMouseLeave={(e) => {
              if (!loading) e.target.style.background = '#000000'
            }}
          >
            {loading ? 'Aggiornamento...' : 'Aggiorna Password'}
          </button>

          <div style={{
            textAlign: 'center',
            padding: '15px 0',
            borderTop: '1px solid #F5F5F5'
          }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                background: 'none',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '400',
                textDecoration: 'none',
                padding: 0,
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#000000'}
              onMouseLeave={(e) => e.target.style.color = '#666'}
            >
              ← Torna al Login
            </button>
          </div>
        </form>

        {/* Message */}
        {message.text && (
          <div style={{
            padding: '12px 15px',
            borderRadius: '6px',
            border: 'none',
            background: message.type === 'success' ? '#E8F5E9' : '#FFEBEE',
            color: message.type === 'success' ? '#2E7D32' : '#C62828',
            fontSize: '13px',
            fontWeight: '400',
            marginTop: '20px',
            textAlign: 'center',
            lineHeight: '1.5'
          }}>
            {message.text}
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: '40px',
          paddingTop: '20px',
          borderTop: '1px solid #F5F5F5',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: '12px',
            color: '#999',
            margin: 0,
            fontWeight: '400'
          }}>
            Made with <span role="img" aria-label="cuore">❤️</span> by{' '}
            <a 
              href="/#/landing" 
              style={{
                color: '#999',
                textDecoration: 'none',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#000000'}
              onMouseLeave={(e) => e.target.style.color = '#999'}
            >
              MVPMenu
            </a>
            {' '}| © 2025
          </p>
        </div>
      </div>

      {/* Global Styles */}
      <style>{`
        button:focus-visible {
          outline: 2px solid #2196F3 !important;
          outline-offset: 2px;
        }

        @media (max-width: 480px) {
          body {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  )
}

export default ResetPassword