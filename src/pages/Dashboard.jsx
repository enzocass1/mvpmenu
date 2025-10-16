import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import RestaurantForm from '../components/RestaurantForm'
import CategoryManager from '../components/CategoryManager'
import OpeningHoursManager from '../components/OpeningHoursManager'
import MenuImportExport from '../components/MenuImportExport'
import UpgradeModal from '../components/UpgradeModal'
import QRCode from 'qrcode'
import { checkPremiumAccess, canDownloadQRCode, canExportBackup, getPlanInfo } from '../utils/subscription'

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
      justifyContent: 'center',
      alignItems: 'center',
      padding: '40px',
      minHeight: '200px'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #E0E0E0',
        borderTop: '3px solid #2196F3',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
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
    if (!restaurant?.stripe_customer_id) {
      showToast('Nessun abbonamento attivo da gestire', 'warning')
      return
    }

    setLoadingPortal(true)

    try {
      const response = await fetch('/api/create-customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: restaurant.stripe_customer_id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Errore nella richiesta')
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('URL del portal non ricevuto')
      }
    } catch (error) {
      console.error('Errore apertura portal:', error)
      showToast('Impossibile aprire la gestione abbonamento', 'error')
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
  const { isPremium } = restaurant ? checkPremiumAccess(restaurant) : { isPremium: false }

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
              {isPremium && (
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
            
            {/* Menu Hamburger sempre visibile */}
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
                    {isPremium && (
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
                  color: canDownloadQR ? '#000000' : '#000000',
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
                {canDownloadQR ? 'Scarica QR Code' : '🔒 Passa a Premium per QR Code'}
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

      {/* Modal Gestione Abbonamento */}
      {showSubscriptionModal && restaurant && (() => {
        const nextRenewal = getNextRenewalDate()
        
        return (
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowSubscriptionModal(false)
              }
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="subscription-modal-title"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              padding: '20px'
            }}
          >
            <div style={{
              background: '#FFFFFF',
              borderRadius: '8px',
              padding: '30px',
              maxWidth: '500px',
              width: '100%',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '25px'
              }}>
                <h2 id="subscription-modal-title" style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: '400',
                  color: '#000000'
                }}>
                  Il Tuo Abbonamento
                </h2>
                <button
                  onClick={() => setShowSubscriptionModal(false)}
                  aria-label="Chiudi finestra abbonamento"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '0',
                    color: '#999',
                    fontWeight: '300'
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{
                padding: '20px',
                background: '#E8F5E9',
                border: '1px solid #C8E6C9',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2E7D32',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  ✓ Piano Premium Attivo
                </div>
                
                <div style={{
                  fontSize: '13px',
                  color: '#666',
                  lineHeight: '1.6'
                }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Prossimo rinnovo:</strong> {nextRenewal}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Importo:</strong> €30,00/mese
                  </div>
                  <div>
                    <strong>Rinnovo automatico:</strong> Sì
                  </div>
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: '#FFF3E0',
                border: '1px solid #FFE0B2',
                borderRadius: '8px',
                marginBottom: '25px'
              }}>
                <div style={{
                  fontSize: '13px',
                  color: '#666',
                  lineHeight: '1.6'
                }}>
                  <strong style={{ color: '#000' }}>💡 Nota:</strong> Il tuo abbonamento si rinnova automaticamente ogni mese. Puoi modificare il metodo di pagamento o cancellare l'abbonamento in qualsiasi momento tramite il portale di gestione Stripe.
                </div>
              </div>

              <button
                onClick={handleManageSubscription}
                disabled={loadingPortal}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#FFFFFF',
                  background: loadingPortal ? '#999' : '#000000',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loadingPortal ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!loadingPortal) e.target.style.background = '#333333'
                }}
                onMouseLeave={(e) => {
                  if (!loadingPortal) e.target.style.background = '#000000'
                }}
              >
                {loadingPortal ? 'Apertura...' : 'Gestisci Abbonamento'}
              </button>

              <p style={{
                margin: '12px 0 0 0',
                fontSize: '12px',
                color: '#999',
                textAlign: 'center',
                lineHeight: '1.5'
              }}>
                Sarai reindirizzato a Stripe per gestire il tuo abbonamento, modificare la carta di credito o cancellare.
              </p>
            </div>
          </div>
        )
      })()}

      {/* Modal Assistenza */}
      {showSupportModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSupportModal(false)
              setFormErrors({})
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="support-modal-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px',
            overflowY: 'auto'
          }}
        >
          <div style={{
            background: '#FFFFFF',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '550px',
            width: '100%',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px'
            }}>
              <h2 id="support-modal-title" style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '400',
                color: '#000000'
              }}>
                Assistenza
              </h2>
              <button
                onClick={() => {
                  setShowSupportModal(false)
                  setFormErrors({})
                }}
                aria-label="Chiudi finestra assistenza"
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  color: '#999',
                  fontWeight: '300'
                }}
              >
                ✕
              </button>
            </div>

            <p style={{
              margin: '0 0 25px 0',
              fontSize: '14px',
              color: '#666',
              lineHeight: '1.6'
            }}>
              Hai riscontrato un problema o hai bisogno di aiuto? Compila il form qui sotto e ti risponderemo al più presto.
            </p>

            <form onSubmit={handleSendSupport}>
              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="support-email" style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#000000'
                }}>
                  Email
                </label>
                <input
                  id="support-email"
                  type="email"
                  value={supportForm.email}
                  disabled
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #E0E0E0',
                    borderRadius: '6px',
                    background: '#F5F5F5',
                    color: '#999',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="support-phone" style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#000000'
                }}>
                  Telefono <span style={{ color: '#f44336' }}>*</span>
                </label>
                <input
                  id="support-phone"
                  type="tel"
                  value={supportForm.phone}
                  onChange={(e) => {
                    setSupportForm({ ...supportForm, phone: e.target.value })
                    if (formErrors.phone) {
                      setFormErrors({ ...formErrors, phone: null })
                    }
                  }}
                  placeholder="+39 123 456 7890"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: formErrors.phone ? '1px solid #f44336' : '1px solid #E0E0E0',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    color: '#000000',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                {formErrors.phone && (
                  <span style={{
                    display: 'block',
                    marginTop: '6px',
                    fontSize: '13px',
                    color: '#f44336'
                  }}>
                    {formErrors.phone}
                  </span>
                )}
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label htmlFor="support-message" style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#000000'
                }}>
                  Descrivi il problema <span style={{ color: '#f44336' }}>*</span>
                </label>
                <textarea
                  id="support-message"
                  value={supportForm.message}
                  onChange={(e) => {
                    setSupportForm({ ...supportForm, message: e.target.value })
                    if (formErrors.message) {
                      setFormErrors({ ...formErrors, message: null })
                    }
                  }}
                  placeholder="Spiega nel dettaglio il problema che stai riscontrando..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: formErrors.message ? '1px solid #f44336' : '1px solid #E0E0E0',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    color: '#000000',
                    boxSizing: 'border-box',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
                {formErrors.message && (
                  <span style={{
                    display: 'block',
                    marginTop: '6px',
                    fontSize: '13px',
                    color: '#f44336'
                  }}>
                    {formErrors.message}
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={sendingSupport}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#FFFFFF',
                  background: sendingSupport ? '#999' : '#000000',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: sendingSupport ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!sendingSupport) e.target.style.background = '#333333'
                }}
                onMouseLeave={(e) => {
                  if (!sendingSupport) e.target.style.background = '#000000'
                }}
              >
                {sendingSupport ? 'Invio in corso...' : 'Invia Richiesta'}
              </button>

              <p style={{
                margin: '12px 0 0 0',
                fontSize: '12px',
                color: '#999',
                textAlign: 'center',
                lineHeight: '1.5'
              }}>
                Si aprirà il tuo client email con il messaggio precompilato. Completa e invia.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Modal Migliora il servizio */}
      {showFeedbackModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowFeedbackModal(false)
              setFeedbackErrors({})
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-modal-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px',
            overflowY: 'auto'
          }}
        >
          <div style={{
            background: '#FFFFFF',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '550px',
            width: '100%',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px'
            }}>
              <h2 id="feedback-modal-title" style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '400',
                color: '#000000'
              }}>
                Migliora il servizio
              </h2>
              <button
                onClick={() => {
                  setShowFeedbackModal(false)
                  setFeedbackErrors({})
                }}
                aria-label="Chiudi finestra suggerimenti"
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  color: '#999',
                  fontWeight: '300'
                }}
              >
                ✕
              </button>
            </div>

            <p style={{
              margin: '0 0 25px 0',
              fontSize: '14px',
              color: '#666',
              lineHeight: '1.6'
            }}>
              Hai un'idea per migliorare MVPMenu? Condividi il tuo suggerimento con noi. Il tuo feedback è prezioso!
            </p>

            <form onSubmit={handleSendFeedback}>
              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="feedback-email" style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#000000'
                }}>
                  Email
                </label>
                <input
                  id="feedback-email"
                  type="email"
                  value={feedbackForm.email}
                  disabled
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #E0E0E0',
                    borderRadius: '6px',
                    background: '#F5F5F5',
                    color: '#999',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="feedback-phone" style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#000000'
                }}>
                  Telefono <span style={{ color: '#f44336' }}>*</span>
                </label>
                <input
                  id="feedback-phone"
                  type="tel"
                  value={feedbackForm.phone}
                  onChange={(e) => {
                    setFeedbackForm({ ...feedbackForm, phone: e.target.value })
                    if (feedbackErrors.phone) {
                      setFeedbackErrors({ ...feedbackErrors, phone: null })
                    }
                  }}
                  placeholder="+39 123 456 7890"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: feedbackErrors.phone ? '1px solid #f44336' : '1px solid #E0E0E0',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    color: '#000000',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                {feedbackErrors.phone && (
                  <span style={{
                    display: 'block',
                    marginTop: '6px',
                    fontSize: '13px',
                    color: '#f44336'
                  }}>
                    {feedbackErrors.phone}
                  </span>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="feedback-category" style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#000000'
                }}>
                  Categoria
                </label>
                <select
                  id="feedback-category"
                  value={feedbackForm.category}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #E0E0E0',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    color: '#000000',
                    boxSizing: 'border-box',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Nuova Funzionalità">Nuova Funzionalità</option>
                  <option value="Miglioramento UI/UX">Miglioramento UI/UX</option>
                  <option value="Performance">Performance</option>
                  <option value="Bug Report">Bug Report</option>
                  <option value="Altro">Altro</option>
                </select>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label htmlFor="feedback-message" style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#000000'
                }}>
                  Il tuo suggerimento <span style={{ color: '#f44336' }}>*</span>
                </label>
                <textarea
                  id="feedback-message"
                  value={feedbackForm.message}
                  onChange={(e) => {
                    setFeedbackForm({ ...feedbackForm, message: e.target.value })
                    if (feedbackErrors.message) {
                      setFeedbackErrors({ ...feedbackErrors, message: null })
                    }
                  }}
                  placeholder="Descrivi la tua idea o il miglioramento che vorresti vedere..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: feedbackErrors.message ? '1px solid #f44336' : '1px solid #E0E0E0',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    color: '#000000',
                    boxSizing: 'border-box',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
                {feedbackErrors.message && (
                  <span style={{
                    display: 'block',
                    marginTop: '6px',
                    fontSize: '13px',
                    color: '#f44336'
                  }}>
                    {feedbackErrors.message}
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={sendingFeedback}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#FFFFFF',
                  background: sendingFeedback ? '#999' : '#2E7D32',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: sendingFeedback ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!sendingFeedback) e.target.style.background = '#1B5E20'
                }}
                onMouseLeave={(e) => {
                  if (!sendingFeedback) e.target.style.background = '#2E7D32'
                }}
              >
                {sendingFeedback ? 'Invio in corso...' : 'Invia Suggerimento'}
              </button>

              <p style={{
                margin: '12px 0 0 0',
                fontSize: '12px',
                color: '#999',
                textAlign: 'center',
                lineHeight: '1.5'
              }}>
                Si aprirà il tuo client email con il messaggio precompilato. Completa e invia.
              </p>
            </form>
          </div>
        </div>
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