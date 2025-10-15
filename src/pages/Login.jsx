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
        console.log('🔵 Inizio registrazione...')
        console.log('📧 Email:', email)
        console.log('🔑 Password length:', password.length)
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        
        console.log('📊 Signup response:', { data, error })
        
        if (error) {
          console.error('❌ Errore signup:', error)
          throw error
        }
        
        console.log('✅ Registrazione completata!')
        console.log('👤 User:', data.user)
        console.log('🔐 Session:', data.session)
        
        setMessage({ 
          text: 'Registrazione completata! Controlla la tua email per confermare.', 
          type: 'success' 
        })
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        setMessage({ text: 'Login effettuato con successo!', type: 'success' })
      }
    } catch (error) {
      console.error('🔴 Catch error:', error)
      setMessage({ text: error.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ text: '', type: '' })

    try {
      const resetUrl = window.location.origin.includes('localhost') 
        ? 'http://localhost:5173/#/reset-password?'
        : 'https://mvpmenu20.vercel.app/#/reset-password?'
      
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: resetUrl
      })
      if (error) throw error
      setMessage({ 
        text: 'Email di reset inviata! Controlla la tua casella di posta.', 
        type: 'success' 
      })
      setTimeout(() => {
        setShowResetPassword(false)
        setResetEmail('')
      }, 3000)
    } catch (error) {
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
            MVPMenu
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#666',
            margin: 0,
            fontWeight: '400'
          }}>
            {showResetPassword ? 'Recupera Password' : (isSignUp ? 'Crea il tuo account' : 'Accedi al tuo account')}
          </p>
        </div>

        {/* Reset Password Form */}
        {showResetPassword ? (
          <form onSubmit={handleResetPassword}>
            <div style={{ marginBottom: '20px' }}>
              <label 
                htmlFor="reset-email"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '13px',
                  fontWeight: '400',
                  color: '#666'
                }}
              >
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                placeholder="tua@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
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
                marginBottom: '15px',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                if (!loading) e.target.style.background = '#333333'
              }}
              onMouseLeave={(e) => {
                if (!loading) e.target.style.background = '#000000'
              }}
            >
              {loading ? 'Invio in corso...' : 'Invia Email di Reset'}
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
                padding: '10px',
                fontSize: '14px',
                fontWeight: '400',
                color: '#666',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'none',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#000000'}
              onMouseLeave={(e) => e.target.style.color = '#666'}
            >
              ← Torna al Login
            </button>
          </form>
        ) : (
          /* Login/Signup Form */
          <form onSubmit={handleEmailAuth}>
            <div style={{ marginBottom: '20px' }}>
              <label 
                htmlFor="email"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '13px',
                  fontWeight: '400',
                  color: '#666'
                }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="tua@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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

            <div style={{ marginBottom: '20px' }}>
              <label 
                htmlFor="password"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '13px',
                  fontWeight: '400',
                  color: '#666'
                }}
              >
                Password
              </label>
              <input
                id="password"
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
              {isSignUp && (
                <p style={{
                  fontSize: '12px',
                  color: '#999',
                  margin: '6px 0 0 0',
                  fontWeight: '400'
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
                  Password dimenticata?
                </button>
              </div>
            )}

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
              {loading ? 'Caricamento...' : (isSignUp ? 'Registrati' : 'Accedi')}
            </button>

            <div style={{
              textAlign: 'center',
              padding: '15px 0',
              borderTop: '1px solid #F5F5F5'
            }}>
              <p style={{
                fontSize: '13px',
                color: '#666',
                margin: 0,
                fontWeight: '400'
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
                    color: '#000000',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    textDecoration: 'none',
                    padding: 0,
                    transition: 'opacity 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = '0.7'}
                  onMouseLeave={(e) => e.target.style.opacity = '1'}
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

export default Login