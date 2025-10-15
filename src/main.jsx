import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import PublicMenu from './pages/PublicMenu.jsx'
import ResetPassword from './pages/ResetPassword.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        {/* Route principale - App gestisce login/dashboard */}
        <Route path="/" element={<App />} />
        
        {/* Route pubblica - Menu */}
        <Route path="/menu/:subdomain" element={<PublicMenu />} />
        
        {/* Route pubblica - Reset Password */}
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Fallback - redirect a home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
)