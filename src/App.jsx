import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PublicMenu from './pages/PublicMenu'
import ResetPassword from './pages/ResetPassword'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '18px',
        color: '#666'
      }}>
        ⏳ Caricamento...
      </div>
    )
  }

  return (
    <HashRouter>
      <Routes>
        {/* Route pubblica - Login */}
        <Route 
          path="/" 
          element={!session ? <Login /> : <Navigate to="/dashboard" replace />} 
        />

        {/* Route pubblica - Reset Password */}
        <Route 
          path="/reset-password" 
          element={<ResetPassword />} 
        />

        {/* Route pubblica - Menu Pubblico */}
        <Route 
          path="/menu/:subdomain" 
          element={<PublicMenu />} 
        />

        {/* Route protetta - Dashboard */}
        <Route 
          path="/dashboard" 
          element={session ? <Dashboard session={session} /> : <Navigate to="/" replace />} 
        />

        {/* Redirect per route non trovate */}
        <Route 
          path="*" 
          element={<Navigate to="/" replace />} 
        />
      </Routes>
    </HashRouter>
  )
}

export default App