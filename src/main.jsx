import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import PublicMenu from './pages/PublicMenu.jsx'

function Root() {
  // Controlla se siamo su una route di menu pubblico
  const isPublicMenuRoute = window.location.hash.startsWith('#/menu/')

  if (isPublicMenuRoute) {
    // Se siamo su /menu/..., mostra SOLO PublicMenu
    return (
      <HashRouter>
        <Routes>
          <Route path="/menu/:subdomain" element={<PublicMenu />} />
        </Routes>
      </HashRouter>
    )
  }

  // Altrimenti mostra l'app normale (login + dashboard)
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