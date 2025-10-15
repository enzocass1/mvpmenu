import { useState } from 'react'
import { supabase } from '../supabaseClient'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [message, setMessage] = useState({ text: '', type: '' })

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ text: '', type: '' })

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setMessage({ 
          text: '✅ Registrazione completata! Controlla la tua email per confermare.', 
          type: 'success' 
        })
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        setMessage({ text: '✅ Login effettuato con successo!', type: 'success' })
      }
    } catch (error) {
      setMessage({ text: `❌ ${error.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ text: '', type: '' })

    try {
      // Usa l'URL corrente (funziona sia in locale che in produzione)
      const resetUrl = window.location.origin.includes('localhost') 
        ? 'http://localhost:5173/#/reset-password'
        : 'https://mvpmenu.vercel.app/#/reset-password'
      
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: resetUrl
      })
      if (error) throw error
      setMessage({ 
        text: '✅ Email di reset inviata! Controlla la tua casella di posta.', 
        type: 'success' 
      })
      setTimeout(() => {
        setShowResetPassword(false)
        setResetEmail('')
      }, 3000)
    } catch (error) {
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
            🍕 MVPMenu
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#666',
            margin: 0
          }}>
            {showResetPassword ? 'Recupera Password' : (isSignUp ? 'Crea il tuo account' : 'Accedi al tuo account')}
          </p>
        </div>

        {/* Reset Password Form */}
        {showResetPassword ? (
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
                📧 Email
              </label>
              <input
                type="email"
                placeholder="tua@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
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
                background: loading ? '#999' : '#FF9800',
                border: '2px solid #000000',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                boxShadow: '3px 3px 0px #000000',
                transition: 'all 0.2s ease',
                marginBottom: '15px'
              }}
              onMouseDown={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translate(2px, 2px)'
                  e.target.style.boxShadow = '1px 1px 0px #000000'
                }
              }}
              onMouseUp={(e) => {
                e.target.style.transform = 'translate(0, 0)'
                e.target.style.boxShadow = '3px 3px 0px #000000'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translate(0, 0)'
                e.target.style.boxShadow = '3px 3px 0px #000000'
              }}
            >
              {loading ? '⏳ Invio...' : '📧 Invia Email di Reset'}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowResetPassword(false)
                setResetEmail('')
                setMessage({ text: '', type: '' })
              }}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#000000',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              ← Torna al Login
            </button>
          </form>
        ) : (
          /* Login/Signup Form */
          <form onSubmit={handleEmailAuth}>
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
                📧 Email
              </label>
              <input
                type="email"
                placeholder="tua@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
                🔒 Password
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
              {isSignUp && (
                <p style={{
                  fontSize: '12px',
                  color: '#666',
                  margin: '5px 0 0 0'
                }}>
                  Minimo 6 caratteri
                </p>
              )}
            </div>

            {!isSignUp && (
              <div style={{ 
                textAlign: 'right', 
                marginBottom: '20px' 
              }}>
                <button
                  type="button"
                  onClick={() => setShowResetPassword(true)}
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
                  Password dimenticata?
                </button>
              </div>
            )}

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
              onMouseDown={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translate(2px, 2px)'
                  e.target.style.boxShadow = '1px 1px 0px #000000'
                }
              }}
              onMouseUp={(e) => {
                e.target.style.transform = 'translate(0, 0)'
                e.target.style.boxShadow = '3px 3px 0px #000000'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translate(0, 0)'
                e.target.style.boxShadow = '3px 3px 0px #000000'
              }}
            >
              {loading ? '⏳ Caricamento...' : (isSignUp ? '✨ Registrati' : '🚀 Accedi')}
            </button>

            <div style={{
              textAlign: 'center',
              padding: '15px 0',
              borderTop: '2px solid #F5F5F5'
            }}>
              <p style={{
                fontSize: '14px',
                color: '#666',
                margin: 0
              }}>
                {isSignUp ? 'Hai già un account?' : 'Non hai un account?'}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    setMessage({ text: '', type: '' })
                  }}
                  style={{
                    marginLeft: '5px',
                    background: 'none',
                    border: 'none',
                    color: '#2196F3',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '700',
                    textDecoration: 'underline'
                  }}
                >
                  {isSignUp ? 'Accedi' : 'Registrati'}
                </button>
              </p>
            </div>
          </form>
        )}

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

export default Login