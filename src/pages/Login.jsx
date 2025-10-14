import { useState } from 'react'
import { supabase } from '../supabaseClient'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setMessage('Controlla la tua email per confermare la registrazione!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        setMessage('Login effettuato!')
      }
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      })
      if (error) throw error
    } catch (error) {
      setMessage(error.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h1>{isSignUp ? 'Registrati' : 'Login'}</h1>
      
      <button 
        onClick={handleGoogleAuth} 
        disabled={loading}
        style={{ width: '100%', padding: '10px', marginBottom: '20px' }}
      >
        Continua con Google
      </button>

      <p style={{ textAlign: 'center' }}>oppure</p>

      <form onSubmit={handleEmailAuth}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
        />
        <button 
          type="submit" 
          disabled={loading}
          style={{ width: '100%', padding: '10px' }}
        >
          {loading ? 'Caricamento...' : (isSignUp ? 'Registrati' : 'Accedi')}
        </button>
      </form>

      {message && <p style={{ color: message.includes('Controlla') ? 'green' : 'red' }}>{message}</p>}

      <p style={{ textAlign: 'center', marginTop: '20px' }}>
        {isSignUp ? 'Hai già un account?' : 'Non hai un account?'}
        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          style={{ marginLeft: '5px', background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}
        >
          {isSignUp ? 'Accedi' : 'Registrati'}
        </button>
      </p>
    </div>
  )
}

export default Login