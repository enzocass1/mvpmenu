import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import './lib/installPrompt.js' // cattura l'evento "installa app" (PWA) appena possibile
import App from './App.jsx'
import PublicMenu from './pages/PublicMenu.jsx'
import ResetPassword from './pages/ResetPassword.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        {/* Route App - IMPORTANTE: usa /* non / */}
        <Route path="/*" element={<App />} />
        
        {/* Route pubblica - Menu */}
        <Route path="/menu/:subdomain" element={<PublicMenu />} />
        
        {/* Route pubblica - Reset Password */}
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
)

// Registra il service worker (serve per rendere l'app installabile; nessuna cache)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* non bloccante */ })
  })
}