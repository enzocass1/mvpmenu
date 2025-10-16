import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { supabase } from '../supabaseClient'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

function Checkout() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Verifica che l'utente sia loggato
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        // Se non loggato, reindirizza al login
        window.location.href = '/#/login'
      } else {
        setUser(user)
      }
    }
    checkUser()
  }, [])

  const handleCheckout = async () => {
    try {
      setLoading(true)
      setError(null)

      const stripe = await stripePromise

      // Crea la sessione di checkout
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: import.meta.env.VITE_STRIPE_PRICE_ID,
          userId: user.id,
          userEmail: user.email
        })
      })

      const session = await response.json()

      if (session.error) {
        setError(session.error)
        setLoading(false)
        return
      }

      // Reindirizza a Stripe Checkout
      const result = await stripe.redirectToCheckout({
        sessionId: session.sessionId
      })

      if (result.error) {
        setError(result.error.message)
        setLoading(false)
      }
    } catch (err) {
      setError('Si è verificato un errore. Riprova più tardi.')
      setLoading(false)
      console.error('Errore checkout:', err)
    }
  }

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F5F5',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif'
      }}>
        <p style={{ fontSize: '14px', color: '#666' }}>Caricamento...</p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F5F5',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '400',
            color: '#000000',
            margin: '0 0 10px 0'
          }}>
            Passa a Premium
          </h1>
          <p style={{
            fontSize: '16px',
            fontWeight: '400',
            color: '#666',
            margin: 0
          }}>
            Completa l'acquisto per sbloccare tutte le funzionalità
          </p>
        </div>

        {/* Piano Premium Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          padding: '40px',
          border: '2px solid #000000',
          marginBottom: '30px'
        }}>
          <div style={{
            textAlign: 'center',
            paddingBottom: '30px',
            borderBottom: '1px solid #E0E0E0',
            marginBottom: '30px'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '400',
              color: '#000000',
              margin: '0 0 10px 0'
            }}>
              MVPMenu Premium
            </h2>
            <div style={{
              fontSize: '48px',
              fontWeight: '400',
              color: '#000000',
              margin: '20px 0 10px 0'
            }}>
              €30
              <span style={{
                fontSize: '16px',
                color: '#666'
              }}>
                /mese
              </span>
            </div>
            <p style={{
              fontSize: '13px',
              fontWeight: '400',
              color: '#999',
              margin: 0,
              fontStyle: 'italic'
            }}>
              Circa 1€ al giorno
            </p>
          </div>

          {/* Features List */}
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: '0 0 30px 0'
          }}>
            <li style={{
              fontSize: '14px',
              color: '#666',
              marginBottom: '12px',
              paddingLeft: '24px',
              position: 'relative',
              fontWeight: '600'
            }}>
              <span style={{
                position: 'absolute',
                left: 0
              }}>✓</span>
              Categorie illimitate
            </li>
            <li style={{
              fontSize: '14px',
              color: '#666',
              marginBottom: '12px',
              paddingLeft: '24px',
              position: 'relative',
              fontWeight: '600'
            }}>
              <span style={{
                position: 'absolute',
                left: 0
              }}>✓</span>
              Prodotti illimitati
            </li>
            <li style={{
              fontSize: '14px',
              color: '#666',
              marginBottom: '12px',
              paddingLeft: '24px',
              position: 'relative'
            }}>
              <span style={{
                position: 'absolute',
                left: 0
              }}>✓</span>
              Caricamento immagini
            </li>
            <li style={{
              fontSize: '14px',
              color: '#666',
              marginBottom: '12px',
              paddingLeft: '24px',
              position: 'relative'
            }}>
              <span style={{
                position: 'absolute',
                left: 0
              }}>✓</span>
              Link condivisibile
            </li>
            <li style={{
              fontSize: '14px',
              color: '#666',
              marginBottom: '12px',
              paddingLeft: '24px',
              position: 'relative',
              fontWeight: '600'
            }}>
              <span style={{
                position: 'absolute',
                left: 0
              }}>✓</span>
              Scaricamento QR Code
            </li>
            <li style={{
              fontSize: '14px',
              color: '#666',
              marginBottom: '12px',
              paddingLeft: '24px',
              position: 'relative',
              fontWeight: '600'
            }}>
              <span style={{
                position: 'absolute',
                left: 0
              }}>✓</span>
              Scaricamento backup
            </li>
            <li style={{
              fontSize: '14px',
              color: '#666',
              marginBottom: '12px',
              paddingLeft: '24px',
              position: 'relative',
              fontWeight: '600'
            }}>
              <span style={{
                position: 'absolute',
                left: 0
              }}>✓</span>
              Assistenza prioritaria
            </li>
          </ul>

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '500',
              color: '#FFFFFF',
              background: loading ? '#999' : '#000000',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!loading) e.target.style.background = '#333333'
            }}
            onMouseLeave={(e) => {
              if (!loading) e.target.style.background = '#000000'
            }}
          >
            {loading ? 'Reindirizzamento a Stripe...' : 'Procedi al pagamento'}
          </button>

          {error && (
            <div style={{
              marginTop: '20px',
              padding: '12px',
              backgroundColor: '#FEE',
              border: '1px solid #F00',
              borderRadius: '6px',
              color: '#C00',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          padding: '20px',
          border: '1px solid #E0E0E0'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '500',
            color: '#000000',
            margin: '0 0 12px 0'
          }}>
            💳 Pagamento sicuro con Stripe
          </h3>
          <p style={{
            fontSize: '14px',
            fontWeight: '400',
            color: '#666',
            margin: '0 0 8px 0',
            lineHeight: '1.6'
          }}>
            • Il pagamento è gestito in modo sicuro da Stripe<br />
            • Puoi cancellare l'abbonamento in qualsiasi momento<br />
            • Riceverai una ricevuta via email dopo ogni pagamento
          </p>
        </div>

        {/* Back Link */}
        <div style={{
          textAlign: 'center',
          marginTop: '30px'
        }}>
          
            href="/#/dashboard"
            style={{
              fontSize: '14px',
              fontWeight: '400',
              color: '#666',
              textDecoration: 'none'
            }}
          >
            ← Torna alla dashboard
          </a>
        </div>
      </div>
    </div>
  )
}

export default Checkout