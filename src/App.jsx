import { useState, useEffect, useMemo } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { isSubscriptionBlocked } from './lib/subscriptionStatus'

// Guardia sezioni: se il ristorante ha allowed_nav (es. solo /prodotti),
// reindirizza le pagine admin non consentite verso la prima sezione permessa.
// Le pagine pubbliche (menu, login, staff...) non vengono toccate.
function NavGuard({ allowedNav }) {
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    if (!allowedNav || allowedNav.length === 0) return
    const path = location.pathname
    const publicPrefixes = ['/login', '/landing', '/menu/', '/staff/', '/order-confirmation/', '/super-admin/', '/design-system-demo', '/privacy', '/termini']
    if (publicPrefixes.some(pre => path === pre || path.startsWith(pre))) return
    // L'assistenza resta sempre raggiungibile (anche con sezioni limitate o abbonamento sospeso)
    if (path === '/assistenza') return
    const allowed = allowedNav.some(a => path === a || path.startsWith(a + '/'))
    if (!allowed) navigate(allowedNav[0], { replace: true })
  }, [location.pathname, allowedNav, navigate])
  return null
}

// Deep-link con login: se si apre una pagina protetta senza essere loggati,
// salviamo la destinazione e, dopo l'accesso, ci torniamo (utile per i link
// nelle email, es. /#/aggiornamenti).
const REDIRECT_KEY = 'post_login_redirect'
function saveRedirect() {
  try {
    const h = (window.location.hash || '').replace(/^#/, '')
    if (h && h !== '/login' && h !== '/') sessionStorage.setItem(REDIRECT_KEY, h)
  } catch { /* storage non disponibile */ }
}
function popRedirect() {
  try {
    const v = sessionStorage.getItem(REDIRECT_KEY)
    if (v) { sessionStorage.removeItem(REDIRECT_KEY); return v }
  } catch { /* storage non disponibile */ }
  return '/dashboard'
}
// Route protetta: se non loggato, memorizza la destinazione e manda al login
function RequireAuth({ session, children }) {
  if (session) return children
  saveRedirect()
  return <Navigate to="/login" replace />
}
// /login: se gia' loggato, torna alla destinazione salvata (o alla dashboard)
function LoginOrRedirect({ session }) {
  const target = useMemo(() => popRedirect(), [])
  if (session) return <Navigate to={target} replace />
  return <Login />
}
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Landing from './pages/Landing'
import AnalyticsSelection from './pages/AnalyticsSelection'
import AnalyticsDashboard from './pages/AnalyticsDashboard'
import ConversionFunnel from './pages/ConversionFunnel'
import TopProductsOrdered from './pages/TopProductsOrdered'
import RevenueAnalytics from './pages/RevenueAnalytics'
import TimeBasedAnalysis from './pages/TimeBasedAnalysis'
import AOVAnalysis from './pages/AOVAnalysis'
import StaffLogin from './pages/StaffLogin'
import StaffDashboard from './pages/StaffDashboard'
import StaffOrders from './pages/StaffOrders'
import OrderConfirmation from './pages/OrderConfirmation'
import PublicMenu from './pages/PublicMenu'
import OrderDetail from './pages/OrderDetail'
import FiscalSettings from './pages/FiscalSettings'
import DesignSystemDemo from './pages/DesignSystemDemo'
import Home from './pages/Home'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import ProductsPage from './pages/ProductsPage'
import InventoryPage from './pages/InventoryPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ChannelsPage from './pages/ChannelsPage'
import SettingsPage from './pages/SettingsPage'
import UpdatesPage from './pages/UpdatesPage'
import UpdateDetailPage from './pages/UpdateDetailPage'
import CassaPage from './pages/CassaPage'
import UsersPage from './pages/UsersPage'
import SuperAdminLogin from './pages/superadmin/SuperAdminLogin'
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard'
import PlansManagement from './pages/superadmin/PlansManagement'
import RestaurantsManagement from './pages/superadmin/RestaurantsManagement'
import SupportTicketsAdmin from './pages/superadmin/SupportTicketsAdmin'
import DemoRequestsAdmin from './pages/superadmin/DemoRequestsAdmin'
import SupportPage from './pages/SupportPage'
import LegalPage from './pages/LegalPage'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [allowedNav, setAllowedNav] = useState(null)

  // Carica restrizione sezioni (allowed_nav) e scadenza abbonamento.
  // Abbonamento scaduto da oltre 15 giorni => accesso solo a /impostazioni.
  useEffect(() => {
    if (!session) { setAllowedNav(null); return }
    supabase.from('restaurants').select('allowed_nav, subscription_expires_at').eq('user_id', session.user.id).single()
      .then(({ data }) => {
        if (isSubscriptionBlocked(data)) { setAllowedNav(['/impostazioni']); return }
        const a = data?.allowed_nav
        setAllowedNav(Array.isArray(a) && a.length ? a : null)
      })
      .catch(() => setAllowedNav(null))
  }, [session])

  useEffect(() => {
    // Gestisci il token di conferma email dall'URL
    const handleEmailConfirmation = async () => {
      const hash = window.location.hash

      // Cerca access_token nell'URL (Supabase lo mette dopo la conferma)
      if (hash.includes('access_token=')) {
        // Estrai i parametri dall'hash
        const hashParams = hash.substring(1) // Rimuovi il primo #
        const params = new URLSearchParams(hashParams.split('?')[1] || hashParams)

        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const type = params.get('type')

        if ((type === 'signup' || type === 'recovery') && accessToken && refreshToken) {
          try {
            // Imposta la sessione manualmente
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })

            if (error) {
              setError(error.message)
              setLoading(false)
            } else {
              setSession(data.session)
              setLoading(false)

              // Pulisci l'URL dai parametri
              window.history.replaceState({}, document.title, '/#/')
            }
          } catch (err) {
            setError(err.message)
            setLoading(false)
          }
          return
        }
      }

      // Altrimenti, carica la sessione normale
      supabase.auth.getSession()
        .then(({ data: { session }, error }) => {
          if (error) {
            setError(error.message)
          } else {
            setSession(session)
          }
          setLoading(false)
        })
        .catch((err) => {
          setError(err.message)
          setLoading(false)
        })
    }

    handleEmailConfirmation()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'SIGNED_IN') {
        setSession(session)
      } else if (_event === 'SIGNED_OUT') {
        setSession(null)
      } else if (_event === 'TOKEN_REFRESHED') {
        setSession(session)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: '#FFEBEE',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div>
          <h1 style={{ color: '#C62828', fontSize: '24px', marginBottom: '10px' }}>❌ Errore</h1>
          <p style={{ color: '#666', fontSize: '16px' }}>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              fontSize: '14px',
              background: '#C62828',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Ricarica Pagina
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: '#F5F5F5',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
        fontSize: '18px',
        color: '#666',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ fontSize: '48px' }}>⏳</div>
        <div>Caricamento...</div>
      </div>
    )
  }

  return (
    <>
    <NavGuard allowedNav={allowedNav} />
    <Routes>
      {/* Landing Page - accessibile a tutti */}
      <Route path="/landing" element={<Landing />} />

      {/* Documenti legali - pubblici */}
      <Route path="/privacy" element={<LegalPage doc="privacy" />} />
      <Route path="/termini" element={<LegalPage doc="termini" />} />

      {/* Design System Demo - solo in sviluppo locale */}
      {import.meta.env.DEV && (
        <Route path="/design-system-demo" element={<DesignSystemDemo />} />
      )}
      
      {/* Login - solo se NON loggato */}
      <Route
        path="/login"
        element={<LoginOrRedirect session={session} />}
      />
      
      {/* Home/Overview - solo se loggato */}
      <Route
        path="/dashboard"
        element={session ? <Home session={session} /> : <Navigate to="/login" replace />}
      />

      {/* Old Dashboard (temporary, will be removed) */}
      <Route
        path="/dashboard-old"
        element={session ? <Dashboard session={session} /> : <Navigate to="/login" replace />}
      />

      {/* Analytics Selection - solo se loggato */}
      <Route
        path="/analytics-selection"
        element={session ? <AnalyticsSelection /> : <Navigate to="/login" replace />}
      />

      {/* Analytics Dashboard - solo se loggato */}
      <Route
        path="/analytics/:metricId"
        element={session ? <AnalyticsDashboard /> : <Navigate to="/login" replace />}
      />

      {/* Conversion Funnel - solo se loggato */}
      <Route
        path="/analytics/conversion-funnel"
        element={session ? <ConversionFunnel /> : <Navigate to="/login" replace />}
      />

      {/* Top Products Ordered - solo se loggato */}
      <Route
        path="/analytics/top-products-ordered"
        element={session ? <TopProductsOrdered /> : <Navigate to="/login" replace />}
      />

      {/* Revenue Analytics - solo se loggato */}
      <Route
        path="/analytics/revenue-analytics"
        element={session ? <RevenueAnalytics /> : <Navigate to="/login" replace />}
      />

      {/* Time Based Analysis - solo se loggato */}
      <Route
        path="/analytics/time-based-analysis"
        element={session ? <TimeBasedAnalysis /> : <Navigate to="/login" replace />}
      />

      {/* AOV Analysis - solo se loggato */}
      <Route
        path="/analytics/aov-analysis"
        element={session ? <AOVAnalysis /> : <Navigate to="/login" replace />}
      />

      {/* Orders Page - solo se loggato */}
      <Route
        path="/ordini"
        element={session ? <OrdersPage session={session} /> : <Navigate to="/login" replace />}
      />

      {/* Order Detail Page - solo se loggato */}
      <Route
        path="/ordini/:orderId"
        element={session ? <OrderDetailPage session={session} /> : <Navigate to="/login" replace />}
      />

      {/* Products Page - solo se loggato */}
      <Route
        path="/prodotti"
        element={session ? <ProductsPage session={session} /> : <Navigate to="/login" replace />}
      />

      {/* Inventory Page - solo se loggato */}
      <Route
        path="/inventario"
        element={session ? <InventoryPage session={session} /> : <Navigate to="/login" replace />}
      />
      {/* Analytics Page - solo se loggato */}
      <Route
        path="/analytics"
        element={session ? <AnalyticsPage session={session} /> : <Navigate to="/login" replace />}
      />

      {/* Channels Page - solo se loggato */}
      <Route
        path="/canali"
        element={session ? <ChannelsPage session={session} /> : <Navigate to="/login" replace />}
      />

      {/* Settings Page - solo se loggato */}
      <Route
        path="/impostazioni"
        element={session ? <SettingsPage session={session} /> : <Navigate to="/login" replace />}
      />

      {/* Aggiornamenti app (changelog) - solo se loggato */}
      <Route
        path="/aggiornamenti"
        element={<RequireAuth session={session}><UpdatesPage session={session} /></RequireAuth>}
      />
      <Route
        path="/aggiornamenti/:id"
        element={<RequireAuth session={session}><UpdateDetailPage session={session} /></RequireAuth>}
      />

      {/* Users Page (Ruoli + Membri) - solo se loggato */}
      <Route
        path="/utenti"
        element={session ? <UsersPage session={session} /> : <Navigate to="/login" replace />}
      />

      {/* Assistenza (ticket) - solo se loggato */}
      <Route
        path="/assistenza"
        element={session ? <SupportPage session={session} /> : <Navigate to="/login" replace />}
      />

      {/* Cassa (POS) Page - solo se loggato */}
      <Route
        path="/cassa"
        element={session ? <CassaPage session={session} /> : <Navigate to="/login" replace />}
      />

      {/* Fiscal Settings - solo se loggato */}
      <Route
        path="/fiscal-settings"
        element={session ? <FiscalSettings /> : <Navigate to="/login" replace />}
      />

      {/* Staff Login - accessibile a tutti */}
      <Route
        path="/staff/:subdomain"
        element={<StaffLogin />}
      />

      {/* Staff Dashboard - accessibile a staff autenticati */}
      <Route
        path="/staff/:subdomain/dashboard"
        element={<StaffDashboard />}
      />

      {/* Staff Orders - accessibile a staff autenticati */}
      <Route
        path="/staff/:subdomain/orders"
        element={<StaffOrders />}
      />

      {/* Order Detail - accessibile a staff autenticati */}
      <Route
        path="/staff/:subdomain/orders/:orderId"
        element={<OrderDetail />}
      />

      {/* Public Menu - accessibile a tutti */}
      <Route
        path="/menu/:subdomain"
        element={<PublicMenu />}
      />

      {/* Order Confirmation - accessibile a tutti */}
      <Route
        path="/order-confirmation/:orderId"
        element={<OrderConfirmation />}
      />

      {/* Super Admin Routes - accessibile con autenticazione separata */}
      <Route
        path="/super-admin/login"
        element={<SuperAdminLogin />}
      />
      <Route
        path="/super-admin/dashboard"
        element={<SuperAdminDashboard />}
      />
      <Route
        path="/super-admin/plans"
        element={<PlansManagement />}
      />
      <Route
        path="/super-admin/restaurants"
        element={<RestaurantsManagement />}
      />
      <Route
        path="/super-admin/tickets"
        element={<SupportTicketsAdmin />}
      />
      <Route
        path="/super-admin/demo"
        element={<DemoRequestsAdmin />}
      />

      {/* Root redirect */}
      <Route
        path="/"
        element={
          session ? <Navigate to="/dashboard" replace /> : <Navigate to="/landing" replace />
        }
      />
    </Routes>
    </>
  )
}

export default App