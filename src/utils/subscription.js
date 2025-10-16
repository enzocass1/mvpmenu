import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import RestaurantForm from '../components/RestaurantForm'
import CategoryManager from '../components/CategoryManager'
import OpeningHoursManager from '../components/OpeningHoursManager'
import MenuImportExport from '../components/MenuImportExport'
import UpgradeModal from '../components/UpgradeModal'
import QRCode from 'qrcode'
import { 
  checkPremiumAccess, 
  canDownloadQRCode, 
  canExportBackup, 
  getPlanInfo,
  getSubscriptionHealth 
} from '../utils/subscription'

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'enzocassese91@gmail.com'

function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  const colors = {
    success: '#4CAF50',
    error: '#f44336',
    warning: '#FF9800',
    info: '#2196F3'
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: colors[type],
      color: '#FFFFFF',
      padding: '16px 24px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 2000,
      maxWidth: '400px',
      animation: 'slideIn 0.3s ease'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: '500' }}>{message}</span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#FFFFFF',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '0',
            lineHeight: '1'
          }}
          aria-label="Chiudi notifica"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '40px',
      minHeight: '200px'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid #e0e0e0',
        borderTop: '4px solid #000',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '16px'
      }} />
      <p style={{
        color: '#000',
        fontSize: '16px',
        margin: 0
      }}>
        Caricamento...
      </p>
    </div>
  )
}

function CollapsibleSection({ title, isOpen, onToggle, children, ariaLabel }) {
  return (
    <div style={{ marginBottom: '40px' }}>
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={ariaLabel || `${isOpen ? 'Chiudi' : 'Apri'} sezione ${title}`}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          padding: '0 0 2px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          textAlign: 'left',
          outline: 'none'
        }}
      >
        <h2 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: '400',
          color: '#000000'
        }}>
          {title}
        </h2>
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none"
          style={{
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            flexShrink: 0
          }}
        >
          <path 
            d="M4 12h16m0 0l-6-6m6 6l-6 6" 
            stroke="#000000" 
            strokeWidth="1" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div style={{
        height: '1px',
        backgroundColor: '#000000',
        marginBottom: '20px'
      }} />

      <div style={{
        display: 'grid',
        gridTemplateRows: isOpen ? '1fr' : '0fr',
        transition: 'grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <div style={{ 
          overflow: 'hidden',
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}>
          <div style={{ padding: '0 0 30px 0' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

function SubscriptionAlert({ health, onManageSubscription }) {
  if (!health?.actionRequired) return null

  const getBannerStyles = () => {
    switch (health.severity) {
      case 'warning':
        return {
          background: '#FFF9C4',
          border: '1px solid #FFF176',
          iconColor: '#F57C00',
          icon: '⚠️'
        }
      case 'info':
        return {
          background: '#E3F2FD',
          border: '1px solid #BBDEFB',
          iconColor: '#2196F3',
          icon: 'ℹ️'
        }
      default:
        return {
          background: '#F5F5F5',
          border: '1px solid #E0E0E0',
          iconColor: '#666',
          icon: '💡'
        }
    }
  }

  const styles = getBannerStyles()

  return (
    <div style={{
      padding: '16px 20px',
      background: styles.background,
      border: styles.border,
      borderRadius: '8px',
      marginBottom: '30px',
      animation: 'slideDown 0.4s ease'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <span style={{
          fontSize: '20px',
          lineHeight: '1',
          flexShrink: 0
        }}>
          {styles.icon}
        </span>
        
        <div style={{ flex: 1, minWidth: '200px' }}>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#000000',
            lineHeight: '1.6'
          }}>
            {health.message}
          </p>
        </div>

        {(health.action === 'update_payment' || health.action === 'renew') && (
          <button
            onClick={onManageSubscription}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '500',
              color: '#000000',
              background: '#FFFFFF',
              border: '1px solid #000000',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => e.target.style.background = '#F5F5F5'}
            onMouseLeave={(e) => e.target.style.background = '#FFFFFF'}
          >
            {health.action === 'update_payment' ? 'Aggiorna Pagamento' : 'Gestisci Abbonamento'}
          </button>
        )}
      </div>
    </div>
  )
}

function Dashboard({ session }) {
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [openSections, setOpenSections] = useState({
    publicMenu: false,
    restaurant: false,
    categories: false,
    hours: false,
    importExport: false
  })
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [supportForm, setSupportForm] = useState({
    email: session?.user?.email || '',
    phone: '',
    message: ''
  })
  const [feedbackForm, setFeedbackForm] = useState({
    email: session?.user?.email || '',
    phone: '',
    category: 'Nuova Funzionalità',
    message: ''
  })
  const [sendingSupport, setSendingSupport] = useState(false)
  const [sendingFeedback, setSendingFeedback] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [feedbackErrors, setFeedbackErrors] = useState({})
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (session) {
      loadRestaurant(session.user.id)
    }
  }, [session])

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
  }

  const loadRestaurant = async (userId) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) throw error

      if (data) {
        setRestaurant(data)
      }
    } catch (error) {
      console.error('Errore caricamento ristorante:', error)
      showToast('Errore nel caricamento dei dati del ristorante', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      showToast('Logout in corso...', 'info')
      
      await supabase.auth.signOut().catch(() => {
        console.log('Sessione già invalidata')
      })
      
    } catch (error) {
      console.error('Errore logout:', error)
    } finally {
      localStorage.clear()
      sessionStorage.clear()
      
      setTimeout(() => {
        window.location.href = '/#/'
        window.location.reload()
      }, 100)
    }
  }

  const handleRestaurantSave = () => {
    loadRestaurant(session.user.id)
    showToast('Informazioni salvate con successo', 'success')
  }

  const handleUpgradeClick = () => {
    console.log('🚀 Upgrade richiesto dalla Dashboard')
    setShowUpgradeModal(true)
  }

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  }

  const getNextRenewalDate = () => {
    if (!restaurant?.updated_at || restaurant.subscription_tier !== 'premium') return null
    
    const subscriptionDate = new Date(restaurant.updated_at)
    const nextRenewal = new Date(subscriptionDate)
    nextRenewal.setDate(nextRenewal.getDate() + 30)
    
    return nextRenewal.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  const handleManageSubscription = async () => {
    console.log('🔵 handleManageSubscription chiamata')
    console.log('Restaurant data:', {
      id: restaurant?.id,
      user_email: session?.user?.email,
      stripe_customer_id: restaurant?.stripe_customer_id,
      subscription_status: restaurant?.subscription_status,
      subscription_tier: restaurant?.subscription_tier
    })

    setLoadingPortal(true)
    console.log('🟡 Chiamata API in corso...')

    try {
      const apiUrl = `${window.location.origin}/api/create-customer-portal`
      console.log('📍 API URL:', apiUrl)
      
      // Prepara il body con customerId se disponibile, altrimenti usa email
      const requestBody = restaurant?.stripe_customer_id 
        ? { customerId: restaurant.stripe_customer_id }
        : { email: session?.user?.email }
      
      console.log('📦 Request body:', requestBody)

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      console.log('📬 Response status:', response.status)
      const data = await response.json()
      console.log('📬 Response data:', data)

      if (!response.ok) {
        throw new Error(data.error || `Errore HTTP ${response.status}`)
      }

      if (data.url) {
        console.log('✅ Reindirizzamento a:', data.url)
        window.location.href = data.url
      } else {
        throw new Error('URL del portal non ricevuto nella risposta')
      }
    } catch (error) {
      console.error('❌ Errore completo:', error)
      console.error('Stack trace:', error.stack)
      showToast(`Impossibile aprire il portale di gestione: ${error.message}`, 'error')
      setLoadingPortal(false)
    }
  }

  const handleQRCodeClick = async () => {
    if (!restaurant) {
      showToast('Nessun ristorante trovato', 'warning')
      return
    }
    
    if (!canDownloadQRCode(restaurant)) {
      setShowUpgradeModal(true)
      return
    }
    
    const menuUrl = `${window.location.origin}/#/menu/${restaurant.subdomain}`
    
    try {
      const qrCodeDataURL = await QRCode.toDataURL(menuUrl, {
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })

      const link = document.createElement('a')
      link.href = qrCodeDataURL
      link.download = `qr-menu-${restaurant.subdomain}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      showToast('QR Code scaricato con successo', 'success')
    } catch (error) {
      console.error('Errore generazione QR code:', error)
      showToast('Impossibile generare il QR Code. Riprova più tardi.', 'error')
    }
  }

  const handleSendSupport = async (e) => {
    e.preventDefault()
    
    const errors = {}
    
    if (!supportForm.phone.trim()) {
      errors.phone = 'Il numero di telefono è obbligatorio'
    } else if (!validatePhoneNumber(supportForm.phone)) {
      errors.phone = 'Inserisci un numero di telefono valido'
    }
    
    if (!supportForm.message.trim()) {
      errors.message = 'La descrizione del problema è obbligatoria'
    } else if (supportForm.message.trim().length < 10) {
      errors.message = 'Descrivi il problema con almeno 10 caratteri'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setSendingSupport(true)
    setFormErrors({})

    const emailBody = `
RICHIESTA SUPPORTO MVPMENU

Email utente: ${supportForm.email}
Telefono: ${supportForm.phone}
Ristorante: ${restaurant?.name || 'N/A'} (${restaurant?.subdomain || 'N/A'})

Problema riscontrato:
${supportForm.message}

---
Inviato il: ${new Date().toLocaleString('it-IT')}
    `.trim()

    const mailtoLink = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('MVPMenu - Supporto')}&body=${encodeURIComponent(emailBody)}`
    
    try {
      window.location.href = mailtoLink
      
      setTimeout(() => {
        setSendingSupport(false)
        setShowSupportModal(false)
        setSupportForm({
          email: session?.user?.email || '',
          phone: '',
          message: ''
        })
        showToast('Client email aperto. Completa e invia il messaggio.', 'success')
      }, 1000)
    } catch (error) {
      setSendingSupport(false)
      showToast('Errore nell\'apertura del client email', 'error')
    }
  }

  const handleSendFeedback = async (e) => {
    e.preventDefault()
    
    const errors = {}
    
    if (!feedbackForm.phone.trim()) {
      errors.phone = 'Il numero di telefono è obbligatorio'
    } else if (!validatePhoneNumber(feedbackForm.phone)) {
      errors.phone = 'Inserisci un numero di telefono valido'
    }
    
    if (!feedbackForm.message.trim()) {
      errors.message = 'La descrizione del suggerimento è obbligatoria'
    } else if (feedbackForm.message.trim().length < 10) {
      errors.message = 'Descrivi il suggerimento con almeno 10 caratteri'
    }

    if (Object.keys(errors).length > 0) {
      setFeedbackErrors(errors)
      return
    }

    setSendingFeedback(true)
    setFeedbackErrors({})

    const emailBody = `
SUGGERIMENTO MIGLIORAMENTO MVPMENU

Email utente: ${feedbackForm.email}
Telefono: ${feedbackForm.phone}
Ristorante: ${restaurant?.name || 'N/A'} (${restaurant?.subdomain || 'N/A'})
Categoria: ${feedbackForm.category}

Suggerimento:
${feedbackForm.message}

---
Inviato il: ${new Date().toLocaleString('it-IT')}
    `.trim()

    const mailtoLink = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('MVPMenu - Suggerimento Miglioramento')}&body=${encodeURIComponent(emailBody)}`
    
    try {
      window.location.href = mailtoLink
      
      setTimeout(() => {
        setSendingFeedback(false)
        setShowFeedbackModal(false)
        setFeedbackForm({
          email: session?.user?.email || '',
          phone: '',
          category: 'Nuova Funzionalità',
          message: ''
        })
        showToast('Client email aperto. Completa e invia il messaggio.', 'success')
      }, 1000)
    } catch (error) {
      setSendingFeedback(false)
      showToast('Errore nell\'apertura del client email', 'error')
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Link copiato negli appunti', 'success'))
      .catch(() => showToast('Impossibile copiare il link', 'error'))
  }

  const handleMenuItemClick = (action) => {
    setShowMobileMenu(false)
    action()
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif'
      }}>
        <LoadingSpinner />
      </div>
    )
  }

  const canDownloadQR = restaurant ? canDownloadQRCode(restaurant) : false
  const canExport = restaurant ? canExportBackup(restaurant) : false
  const { hasValidAccess } = restaurant ? checkPremiumAccess(restaurant) : { hasValidAccess: false }
  const subscriptionHealth = restaurant ? getSubscriptionHealth(restaurant) : null
  
  // Mostra badge "Premium" solo se ha accesso valido (active o trialing)
  const showPremiumBadge = hasValidAccess

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#FFFFFF',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        
        <header style={{
          padding: '30px 0',
          marginBottom: '40px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '15px'
          }}>
            <div style={{ flex: 1 }}>
              <h1 style={{
                color: '#000000',
                margin: 0,
                fontSize: '24px',
                fontWeight: '400'
              }}>
                MVPMenu Dashboard
              </h1>
              <span style={{
                color: '#666',
                fontSize: '14px',
                display: 'block',
                marginTop: '8px'
              }}>
                {session.user.email}
              </span>
              {showPremiumBadge && (
                <div
                  style={{
                    display: 'inline-block',
                    marginTop: '6px',
                    padding: '3px 8px',
                    fontSize: '10px',
                    fontWeight: '500',
                    color: '#000000',
                    background: '#FF9800',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px'
                  }}
                >
                  Premium
                </div>
              )}
            </div>
            
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                aria-label="Menu"
                style={{
                  padding: '8px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M3 12h18M3 6h18M3 18h18" stroke="#000000" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>

              {showMobileMenu && (
                <>
                  <div 
                    onClick={() => setShowMobileMenu(false)}
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 998
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    background: '#FFFFFF',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    borderRadius: '8px',
                    minWidth: '220px',
                    zIndex: 999,
                    overflow: 'hidden'
                  }}>
                    {showPremiumBadge && (
                      <>
                        <button
                          onClick={() => handleMenuItemClick(() => setShowSubscriptionModal(true))}
                          style={{
                            width: '100%',
                            padding: '14px 20px',
                            background: 'transparent',
                            border: 'none',
                            textAlign: 'left',
                            fontSize: '14px',
                            fontWeight: '400',
                            color: '#000000',
                            cursor: 'pointer',
                            outline: 'none',
                            transition: 'background 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.background = '#F5F5F5'}
                          onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                          Abbonamento
                        </button>
                        <div style={{ height: '1px', background: '#E0E0E0' }} />
                      </>
                    )}

                    <button
                      onClick={() => handleMenuItemClick(() => setShowFeedbackModal(true))}
                      style={{
                        width: '100%',
                        padding: '14px 20px',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: '400',
                        color: '#000000',
                        cursor: 'pointer',
                        outline: 'none',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#F5F5F5'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      Migliora il servizio
                    </button>

                    <div style={{ height: '1px', background: '#E0E0E0' }} />

                    <button
                      onClick={() => handleMenuItemClick(() => setShowSupportModal(true))}
                      style={{
                        width: '100%',
                        padding: '14px 20px',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: '400',
                        color: '#000000',
                        cursor: 'pointer',
                        outline: 'none',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#F5F5F5'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      Assistenza
                    </button>

                    <div style={{ height: '1px', background: '#E0E0E0' }} />

                    <button
                      onClick={() => handleMenuItemClick(handleLogout)}
                      style={{
                        width: '100%',
                        padding: '14px 20px',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: '400',
                        color: '#000000',
                        cursor: 'pointer',
                        outline: 'none',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#F5F5F5'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <SubscriptionAlert 
          health={subscriptionHealth} 
          onManageSubscription={handleManageSubscription}
        />

        {restaurant && (
          <CollapsibleSection
            title="Menu Pubblico"
            isOpen={openSections.publicMenu}
            onToggle={() => toggleSection('publicMenu')}
          >
            <h3 style={{
              margin: '0 0 15px 0',
              fontSize: '14px',
              fontWeight: '500',
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Link Condivisibile
            </h3>

            <div style={{
              padding: '12px',
              background: '#F5F5F5',
              borderRadius: '6px',
              marginBottom: '20px',
              fontFamily: 'monospace',
              fontSize: '13px',
              color: '#000000',
              wordBreak: 'break-all',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap'
            }}>
              <span style={{ flex: 1, minWidth: '200px' }}>
                {window.location.origin}/#/menu/{restaurant.subdomain}
              </span>
              <button
                onClick={() => copyToClipboard(`${window.location.origin}/#/menu/${restaurant.subdomain}`)}
                aria-label="Copia link menu"
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#000000',
                  background: '#FFFFFF',
                  border: '1px solid #000000',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => e.target.style.background = '#F5F5F5'}
                onMouseLeave={(e) => e.target.style.background = '#FFFFFF'}
              >
                Copia
              </button>
            </div>

            <div style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap'
            }}>
              <a 
                href={`${window.location.origin}/#/menu/${restaurant.subdomain}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Apri menu pubblico in nuova scheda"
                style={{
                  flex: 1,
                  minWidth: '180px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#FFFFFF',
                  background: '#000000',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'block',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => e.target.style.background = '#333333'}
                onMouseLeave={(e) => e.target.style.background = '#000000'}
              >
                Apri Menu
              </a>

              <button
                onClick={handleQRCodeClick}
                aria-label={canDownloadQR ? "Scarica QR Code del menu" : "Passa a Premium per scaricare il QR Code"}
                style={{
                  flex: 1,
                  minWidth: '180px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#000000',
                  background: canDownloadQR ? '#FFFFFF' : '#FF9800',
                  border: canDownloadQR ? '1px solid #000000' : '1px solid #FF9800',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  if (canDownloadQR) {
                    e.target.style.background = '#F5F5F5'
                  } else {
                    e.target.style.background = '#F57C00'
                  }
                }}
                onMouseLeave={(e) => {
                  if (canDownloadQR) {
                    e.target.style.background = '#FFFFFF'
                  } else {
                    e.target.style.background = '#FF9800'
                  }
                }}
              >
                {canDownloadQR ? 'Scarica QR Code' : 'Passa a Premium per QR Code'}
              </button>
            </div>
          </CollapsibleSection>
        )}

        <CollapsibleSection
          title="Attività"
          isOpen={openSections.restaurant}
          onToggle={() => toggleSection('restaurant')}
        >
          <RestaurantForm restaurant={restaurant} onSave={handleRestaurantSave} />
        </CollapsibleSection>

        {restaurant && (
          <CollapsibleSection
            title="Menu"
            isOpen={openSections.categories}
            onToggle={() => toggleSection('categories')}
          >
            <CategoryManager 
              restaurantId={restaurant.id} 
              onUpgradeClick={handleUpgradeClick}
            />
          </CollapsibleSection>
        )}

        {restaurant && (
          <CollapsibleSection
            title="Orari di Apertura"
            isOpen={openSections.hours}
            onToggle={() => toggleSection('hours')}
          >
            <OpeningHoursManager restaurantId={restaurant.id} />
          </CollapsibleSection>
        )}

        {restaurant && (
          <CollapsibleSection
            title="Backup Menu"
            isOpen={openSections.importExport}
            onToggle={() => toggleSection('importExport')}
          >
            {canExport ? (
              <MenuImportExport restaurantId={restaurant.id} />
            ) : (
              <div>
                <div style={{
                  padding: '16px',
                  background: '#FFF3E0',
                  border: '1px solid #FFE0B2',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#000', marginBottom: '4px' }}>
                        Funzionalità Premium
                      </div>
                      <div style={{ fontSize: '13px', color: '#FF9800', fontWeight: '500' }}>
                        Il backup del menu è disponibile solo per utenti Premium
                      </div>
                    </div>
                    
                    <button
                      onClick={handleUpgradeClick}
                      style={{
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#000000',
                        background: '#FF9800',
                        border: '1px solid #FF9800',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#F57C00'}
                      onMouseLeave={(e) => e.target.style.background = '#FF9800'}
                    >
                      Passa a Premium
                    </button>
                  </div>
                </div>

                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: '#F5F5F5',
                  borderRadius: '8px',
                  border: '1px dashed #E0E0E0'
                }}>
                  <div style={{
                    fontSize: '48px',
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'center'
                  }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                      <rect x="5" y="11" width="14" height="10" stroke="#000" strokeWidth="2" rx="2"/>
                      <path d="M7 11V7a5 5 0 0110 0v4" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <h3 style={{
                    margin: '0 0 8px 0',
                    fontSize: '18px',
                    fontWeight: '500',
                    color: '#000000'
                  }}>
                    Sblocca il Backup del Menu
                  </h3>
                  <p style={{
                    margin: '0 0 20px 0',
                    fontSize: '14px',
                    color: '#666',
                    lineHeight: '1.6'
                  }}>
                    Con Premium potrai esportare e importare il tuo menu in formato CSV.
                    <br />
                    Perfetto per fare backup o migrare il menu.
                  </p>
                </div>
              </div>
            )}
          </CollapsibleSection>
        )}

        <footer style={{
          marginTop: '80px',
          padding: '30px 0',
          backgroundColor: '#000000',
          marginLeft: '-20px',
          marginRight: '-20px',
          paddingLeft: '20px',
          paddingRight: '20px'
        }}>
          <div style={{ 
            maxWidth: '1200px', 
            margin: '0 auto',
            textAlign: 'left',
            color: '#FFFFFF',
            fontSize: '13px'
          }}>
            <p style={{ margin: 0 }}>
              Made with love by{' '}
              <a 
                href="/#/landing" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  color: '#FFFFFF',
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
              >
                MVPMenu
              </a>
              {' '}| © 2025
            </p>
          </div>
        </footer>
      </div>

      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
      />

      {/* MODAL ABBONAMENTO */}
      {showSubscriptionModal && (
        <>
          <div 
            onClick={() => setShowSubscriptionModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 1999,
              animation: 'fadeIn 0.2s ease'
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            zIndex: 2000,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            animation: 'slideUp 0.3s ease'
          }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '24px', fontWeight: '500', color: '#000' }}>
              Il Tuo Abbonamento
            </h2>
            
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Piano Corrente</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#000' }}>Premium</div>
            </div>

            {getNextRenewalDate() && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Prossimo Rinnovo</div>
                <div style={{ fontSize: '16px', color: '#000' }}>{getNextRenewalDate()}</div>
              </div>
            )}

            <button
              onClick={handleManageSubscription}
              disabled={loadingPortal}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                fontWeight: '500',
                color: '#FFFFFF',
                background: loadingPortal ? '#999' : '#000000',
                border: 'none',
                borderRadius: '8px',
                cursor: loadingPortal ? 'not-allowed' : 'pointer',
                marginBottom: '12px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => !loadingPortal && (e.target.style.background = '#333')}
              onMouseLeave={(e) => !loadingPortal && (e.target.style.background = '#000')}
            >
              {loadingPortal ? 'Apertura in corso...' : 'Gestisci Abbonamento'}
            </button>

            <button
              onClick={() => setShowSubscriptionModal(false)}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                fontWeight: '500',
                color: '#000',
                background: '#F5F5F5',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = '#E0E0E0'}
              onMouseLeave={(e) => e.target.style.background = '#F5F5F5'}
            >
              Chiudi
            </button>
          </div>
        </>
      )}

      {/* MODAL ASSISTENZA */}
      {showSupportModal && (
        <>
          <div 
            onClick={() => setShowSupportModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 1999,
              animation: 'fadeIn 0.2s ease'
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            zIndex: 2000,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            animation: 'slideUp 0.3s ease'
          }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '24px', fontWeight: '500', color: '#000' }}>
              Assistenza
            </h2>
            
            <form onSubmit={handleSendSupport}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#000', marginBottom: '8px' }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={supportForm.email}
                  onChange={(e) => setSupportForm({...supportForm, email: e.target.value})}
                  disabled
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #E0E0E0',
                    borderRadius: '6px',
                    backgroundColor: '#F5F5F5',
                    color: '#666'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#000', marginBottom: '8px' }}>
                  Telefono *
                </label>
                <input
                  type="tel"
                  value={supportForm.phone}
                  onChange={(e) => setSupportForm({...supportForm, phone: e.target.value})}
                  placeholder="+39 123 456 7890"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: `1px solid ${formErrors.phone ? '#f44336' : '#E0E0E0'}`,
                    borderRadius: '6px'
                  }}
                />
                {formErrors.phone && (
                  <p style={{ color: '#f44336', fontSize: '12px', margin: '4px 0 0 0' }}>{formErrors.phone}</p>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#000', marginBottom: '8px' }}>
                  Descrivi il problema *
                </label>
                <textarea
                  value={supportForm.message}
                  onChange={(e) => setSupportForm({...supportForm, message: e.target.value})}
                  placeholder="Spiega dettagliatamente il problema riscontrato..."
                  rows="5"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: `1px solid ${formErrors.message ? '#f44336' : '#E0E0E0'}`,
                    borderRadius: '6px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
                {formErrors.message && (
                  <p style={{ color: '#f44336', fontSize: '12px', margin: '4px 0 0 0' }}>{formErrors.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={sendingSupport}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#FFFFFF',
                  background: sendingSupport ? '#999' : '#000000',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: sendingSupport ? 'not-allowed' : 'pointer',
                  marginBottom: '12px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => !sendingSupport && (e.target.style.background = '#333')}
                onMouseLeave={(e) => !sendingSupport && (e.target.style.background = '#000')}
              >
                {sendingSupport ? 'Invio in corso...' : 'Invia Richiesta'}
              </button>

              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#000',
                  background: '#F5F5F5',
                  border: '1px solid #E0E0E0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#E0E0E0'}
                onMouseLeave={(e) => e.target.style.background = '#F5F5F5'}
              >
                Annulla
              </button>
            </form>
          </div>
        </>
      )}

      {/* MODAL FEEDBACK */}
      {showFeedbackModal && (
        <>
          <div 
            onClick={() => setShowFeedbackModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 1999,
              animation: 'fadeIn 0.2s ease'
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            zIndex: 2000,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            animation: 'slideUp 0.3s ease'
          }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '24px', fontWeight: '500', color: '#000' }}>
              Migliora il Servizio
            </h2>
            
            <form onSubmit={handleSendFeedback}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#000', marginBottom: '8px' }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={feedbackForm.email}
                  onChange={(e) => setFeedbackForm({...feedbackForm, email: e.target.value})}
                  disabled
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #E0E0E0',
                    borderRadius: '6px',
                    backgroundColor: '#F5F5F5',
                    color: '#666'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#000', marginBottom: '8px' }}>
                  Telefono *
                </label>
                <input
                  type="tel"
                  value={feedbackForm.phone}
                  onChange={(e) => setFeedbackForm({...feedbackForm, phone: e.target.value})}
                  placeholder="+39 123 456 7890"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: `1px solid ${feedbackErrors.phone ? '#f44336' : '#E0E0E0'}`,
                    borderRadius: '6px'
                  }}
                />
                {feedbackErrors.phone && (
                  <p style={{ color: '#f44336', fontSize: '12px', margin: '4px 0 0 0' }}>{feedbackErrors.phone}</p>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#000', marginBottom: '8px' }}>
                  Categoria
                </label>
                <select
                  value={feedbackForm.category}
                  onChange={(e) => setFeedbackForm({...feedbackForm, category: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #E0E0E0',
                    borderRadius: '6px'
                  }}
                >
                  <option>Nuova Funzionalità</option>
                  <option>Miglioramento UX</option>
                  <option>Bug/Problema</option>
                  <option>Altro</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#000', marginBottom: '8px' }}>
                  Il tuo suggerimento *
                </label>
                <textarea
                  value={feedbackForm.message}
                  onChange={(e) => setFeedbackForm({...feedbackForm, message: e.target.value})}
                  placeholder="Descrivi il tuo suggerimento o idea..."
                  rows="5"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: `1px solid ${feedbackErrors.message ? '#f44336' : '#E0E0E0'}`,
                    borderRadius: '6px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
                {feedbackErrors.message && (
                  <p style={{ color: '#f44336', fontSize: '12px', margin: '4px 0 0 0' }}>{feedbackErrors.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={sendingFeedback}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#FFFFFF',
                  background: sendingFeedback ? '#999' : '#000000',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: sendingFeedback ? 'not-allowed' : 'pointer',
                  marginBottom: '12px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => !sendingFeedback && (e.target.style.background = '#333')}
                onMouseLeave={(e) => !sendingFeedback && (e.target.style.background = '#000')}
              >
                {sendingFeedback ? 'Invio in corso...' : 'Invia Suggerimento'}
              </button>

              <button
                type="button"
                onClick={() => setFeedbackModal(false)}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#000',
                  background: '#F5F5F5',
                  border: '1px solid #E0E0E0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#E0E0E0'}
                onMouseLeave={(e) => e.target.style.background = '#F5F5F5'}
              >
                Annulla
              </button>
            </form>
          </div>
        </>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideDown {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            transform: translate(-50%, -40%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, -50%);
            opacity: 1;
          }
        }

        button:focus {
          outline: none !important;
        }

        button:focus-visible {
          outline: 2px solid #2196F3 !important;
          outline-offset: 2px;
        }

        @media (max-width: 768px) {
          h1 {
            font-size: 20px !important;
          }
        }

        @media (max-width: 480px) {
          h2 {
            font-size: 16px !important;
          }
        }
      `}</style>
    </div>
  )
}

export default Dashboard