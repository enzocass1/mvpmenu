import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import PublicMenu from './pages/PublicMenu.jsx'
import ResetPassword from './pages/ResetPassword.jsx'

function Root() {
  const hash = window.location.hash

  // Route pubbliche che non richiedono autenticazione
  const isPublicMenuRoute = hash.startsWith('#/menu/')
  const isResetPasswordRoute = hash.startsWith('#/reset-password')

  if (isPublicMenuRoute) {
    // Menu pubblico
    return (
      <HashRouter>
        <Routes>
          <Route path="/menu/:subdomain" element={<PublicMenu />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    )
  }

  if (isResetPasswordRoute) {
    // Reset password
    return (
      <HashRouter>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    )
  }

  // App normale (login + dashboard)
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)