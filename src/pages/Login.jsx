import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { PRICING } from '../lib/marketing'

const MIN_PASSWORD = 8
const TERMS_VERSION = '2026-11-02'

// Traduce in italiano gli errori di autenticazione di Supabase
function authErrorMessage(error) {
  const m = (error?.message || '').toLowerCase()
  if (m.includes('invalid login credentials')) return 'Email o password non corretti.'
  if (m.includes('email not confirmed')) return 'Devi prima confermare l\'email: controlla la tua casella di posta (anche nello spam).'
  if (m.includes('already registered')) return 'Questa email è già registrata: accedi oppure recupera la password.'
  if (m.includes('password should be at least') || m.includes('password is too short')) return `La password deve avere almeno ${MIN_PASSWORD} caratteri.`
  if (m.includes('rate limit') || m.includes('for security purposes') || m.includes('too many')) return 'Troppi tentativi ravvicinati: riprova tra qualche minuto.'
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'Indirizzo email non valido.'
  if (m.includes('signups not allowed')) return 'Le nuove registrazioni sono momentaneamente chiuse.'
  return 'Si è verificato un errore. Riprova tra qualche istante.'
}

const CheckIcon = ({ color = '#fff' }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
)

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [message, setMessage] = useState({ text: '', type: '' })

  // ?mode=signup apre direttamente la registrazione
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1])
    if (params.get('mode') === 'signup') setIsSignUp(true)
  }, [])

  const switchMode = (signup) => {
    setIsSignUp(signup)
    setShowResetPassword(false)
    setMessage({ text: '', type: '' })
  }

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setMessage({ text: '', type: '' })

    if (isSignUp) {
      if (password.length < MIN_PASSWORD) {
        setMessage({ text: `La password deve avere almeno ${MIN_PASSWORD} caratteri.`, type: 'error' })
        return
      }
      if (!acceptTerms) {
        setMessage({ text: 'Per registrarti devi accettare le Condizioni generali e l\'Informativa privacy.', type: 'error' })
        return
      }
    }

    setLoading(true)
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            // Traccia dell'accettazione delle condizioni (data e versione)
            data: { terms_accepted_at: new Date().toISOString(), terms_version: TERMS_VERSION },
          },
        })
        if (error) throw error
        // Con la conferma email attiva, un'email già registrata torna senza "identities"
        if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setMessage({ text: 'Questa email è già registrata: accedi oppure recupera la password.', type: 'error' })
          return
        }
        setMessage({ text: 'Registrazione completata! Ti abbiamo inviato un\'email: clicca il link per confermare l\'account e iniziare la prova gratuita.', type: 'success' })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        setMessage({ text: 'Accesso effettuato!', type: 'success' })
      }
    } catch (error) {
      console.error('Errore autenticazione:', error?.message)
      setMessage({ text: authErrorMessage(error), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ text: '', type: '' })
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/#/reset-password?`,
      })
      if (error) throw error
      setMessage({ text: 'Se l\'email è registrata, riceverai a breve il link per scegliere una nuova password (controlla anche lo spam).', type: 'success' })
    } catch (error) {
      console.error('Errore reset password:', error?.message)
      setMessage({ text: authErrorMessage(error), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const title = showResetPassword ? 'Recupera la password' : (isSignUp ? 'Crea il tuo account' : 'Accedi al tuo account')
  const subtitle = showResetPassword
    ? 'Ti mandiamo un link per sceglierne una nuova.'
    : (isSignUp ? `${PRICING.trialDays} giorni di prova gratuita, senza impegno.` : 'Bentornato: gestisci il tuo locale da qui.')

  return (
    <div className="mvp-auth">
      <style>{`
        .mvp-auth { min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; background: #fff; color: #000;
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif; }
        .mvp-auth-side { background: #000; color: #fff; padding: 48px 56px; display: flex; flex-direction: column; overflow: hidden; }
        .mvp-auth-main { display: flex; align-items: center; justify-content: center; padding: 40px 24px; }
        .mvp-auth-card { width: 100%; max-width: 400px; }
        .mvp-auth input[type=email], .mvp-auth input[type=password], .mvp-auth input[type=text] {
          width: 100%; padding: 12px 13px; font-size: 15px; border: 1px solid #d1d5db; border-radius: 10px;
          box-sizing: border-box; outline: none; font-family: inherit; background: #fff; color: #000; }
        .mvp-auth input:focus { border-color: #000; box-shadow: 0 0 0 1px #000; }
        .mvp-auth-label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
        .mvp-auth-btn { width: 100%; padding: 13px 20px; font-size: 15px; font-weight: 700; color: #fff; background: #000;
          border: none; border-radius: 10px; cursor: pointer; }
        .mvp-auth-btn:disabled { opacity: .55; cursor: not-allowed; }
        .mvp-auth-link { background: none; border: none; padding: 0; color: #000; font-weight: 700; cursor: pointer; font-size: 14px; }
        .mvp-auth-phone { width: 210px; background: #111; border-radius: 26px; padding: 7px; box-shadow: 0 20px 50px rgba(0,0,0,.45); }
        .mvp-auth-phone img { width: 100%; display: block; border-radius: 20px; }
        @media (max-width: 900px) {
          .mvp-auth { grid-template-columns: 1fr; }
          .mvp-auth-side { padding: 28px 20px 24px; }
          .mvp-auth-side .hide-mobile { display: none; }
          .mvp-auth-main { padding: 28px 16px 40px; align-items: flex-start; }
        }
      `}</style>

      {/* Lato brochure */}
      <aside className="mvp-auth-side">
        <Link to="/landing" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff', textDecoration: 'none', marginBottom: 32 }}>
          <img src="/icon-192.png" alt="" width="36" height="36" style={{ borderRadius: 9, border: '1px solid #333' }} />
          <strong style={{ fontSize: 19 }}>MVP Menu</strong>
        </Link>
        <h2 style={{ margin: '0 0 12px', fontSize: 'clamp(26px, 3.2vw, 38px)', fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.5px' }}>
          Il menu che prende<br />gli ordini da solo
        </h2>
        <p style={{ margin: '0 0 22px', color: '#d1d5db', fontSize: 15, lineHeight: 1.55, maxWidth: 440 }}>
          Menu digitale con QR code, ordini, cassa, staff, inventario e statistiche — in tempo reale, ovunque tu sia.
        </p>
        <div className="hide-mobile" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
          {['Online in meno di 24 ore: il menu lo creiamo noi dalle tue foto', 'Tutte le funzioni incluse, senza hardware da comprare', 'Assistenza direttamente dall\'app'].map(t => (
            <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: '#e5e7eb' }}>
              <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}><CheckIcon color="#000" /></span>
              {t}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
          <div style={{ border: '1px solid #444', borderRadius: 12, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700 }}>Prova</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{PRICING.trialDays} giorni gratis</div>
          </div>
          <div style={{ border: '1px solid #444', borderRadius: 12, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700 }}>Annuale</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{PRICING.yearly} € <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>/ anno</span></div>
          </div>
          <div style={{ border: '1px solid #444', borderRadius: 12, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700 }}>Flessibile</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{PRICING.monthly} € <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>/ mese</span></div>
          </div>
        </div>
        <div className="hide-mobile" style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center' }}>
          <div className="mvp-auth-phone" style={{ marginBottom: -120 }}>
            <img src="/landing/hero-menu.jpg" alt="Esempio di menu digitale" />
          </div>
        </div>
      </aside>

      {/* Modulo */}
      <main className="mvp-auth-main">
        <div className="mvp-auth-card">
          <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800, letterSpacing: '-0.3px' }}>{title}</h1>
          <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: 14 }}>{subtitle}</p>

          {showResetPassword ? (
            <form onSubmit={handleResetPassword}>
              <label className="mvp-auth-label" htmlFor="reset-email">Email</label>
              <input id="reset-email" type="email" placeholder="tua@email.com" value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)} required autoComplete="email" style={{ marginBottom: 18 }} />
              <button type="submit" className="mvp-auth-btn" disabled={loading}>{loading ? 'Invio in corso...' : 'Invia il link'}</button>
              <div style={{ textAlign: 'center', marginTop: 18 }}>
                <button type="button" className="mvp-auth-link" onClick={() => { setShowResetPassword(false); setMessage({ text: '', type: '' }) }}>← Torna all'accesso</button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleEmailAuth}>
              <label className="mvp-auth-label" htmlFor="email">Email</label>
              <input id="email" type="email" placeholder="tua@email.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required autoComplete="email" style={{ marginBottom: 16 }} />

              <label className="mvp-auth-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative', marginBottom: isSignUp ? 6 : 10 }}>
                <input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)} required minLength={isSignUp ? MIN_PASSWORD : undefined}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'} style={{ paddingRight: 84 }} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: '#4b5563', cursor: 'pointer', padding: '6px 8px' }}>
                  {showPassword ? 'Nascondi' : 'Mostra'}
                </button>
              </div>
              {isSignUp && <p style={{ margin: '0 0 16px', fontSize: 12, color: '#6b7280' }}>Almeno {MIN_PASSWORD} caratteri.</p>}

              {!isSignUp && (
                <div style={{ textAlign: 'right', marginBottom: 18 }}>
                  <button type="button" onClick={() => { setShowResetPassword(true); setResetEmail(email); setMessage({ text: '', type: '' }) }}
                    style={{ background: 'none', border: 'none', padding: 0, color: '#4b5563', cursor: 'pointer', fontSize: 13 }}>
                    Password dimenticata?
                  </button>
                </div>
              )}

              {isSignUp && (
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: '#374151', lineHeight: 1.5, marginBottom: 18, cursor: 'pointer' }}>
                  <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)}
                    style={{ width: 18, height: 18, marginTop: 1, accentColor: '#000', flexShrink: 0 }} />
                  <span>
                    Accetto le <Link to="/termini" target="_blank" style={{ color: '#000', fontWeight: 700 }}>Condizioni generali di vendita e di servizio</Link> e
                    {' '}ho letto l'<Link to="/privacy" target="_blank" style={{ color: '#000', fontWeight: 700 }}>Informativa privacy</Link>.
                  </span>
                </label>
              )}

              <button type="submit" className="mvp-auth-btn" disabled={loading}>
                {loading ? 'Attendi...' : (isSignUp ? `Inizia la prova gratuita` : 'Accedi')}
              </button>

              <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 18, borderTop: '1px solid #f3f4f6', fontSize: 14, color: '#4b5563' }}>
                {isSignUp ? 'Hai già un account? ' : 'Non hai un account? '}
                <button type="button" className="mvp-auth-link" onClick={() => switchMode(!isSignUp)}>{isSignUp ? 'Accedi' : 'Registrati'}</button>
              </div>
            </form>
          )}

          {message.text && (
            <div role="alert" style={{ marginTop: 18, padding: '12px 14px', borderRadius: 10, fontSize: 14, lineHeight: 1.5,
              background: message.type === 'success' ? '#e8f5e9' : '#fdecec', border: `1px solid ${message.type === 'success' ? '#c8e6c9' : '#f5c2c2'}`,
              color: message.type === 'success' ? '#1b5e20' : '#8a1c1c' }}>
              {message.text}
            </div>
          )}

          <p style={{ marginTop: 28, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
            <Link to="/privacy" style={{ color: '#9ca3af' }}>Privacy</Link> · <Link to="/termini" style={{ color: '#9ca3af' }}>Condizioni</Link> · <Link to="/landing" style={{ color: '#9ca3af' }}>Scopri MVP Menu</Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default Login
