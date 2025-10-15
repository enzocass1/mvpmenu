import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import RestaurantForm from '../components/RestaurantForm'
import CategoryManager from '../components/CategoryManager'
import OpeningHoursManager from '../components/OpeningHoursManager'
import MenuImportExport from '../components/MenuImportExport'
import QRCode from 'qrcode'

// Configurazione
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'enzocassese91@gmail.com'

// Toast Notification Component
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

// Loading Spinner Component
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

// Collapsible Section Component
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
  const [supportForm, setSupportForm] = useState({
    email: session?.user?.email || '',
    phone: '',
    message: ''
  })
  const [sendingSupport, setSendingSupport] = useState(false)
  const [formErrors, setFormErrors] = useState({})
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
      await supabase.auth.signOut()
      showToast('Logout effettuato con successo', 'success')
    } catch (error) {
      console.error('Errore logout:', error)
      showToast('Errore durante il logout', 'error')
    }
  }

  const handleRestaurantSave = () => {
    loadRestaurant(session.user.id)
    showToast('Informazioni salvate con successo', 'success')
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

  const downloadQRCode = async () => {
    if (!restaurant) {
      showToast('Nessun ristorante trovato', 'warning')
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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Link copiato negli appunti', 'success'))
      .catch(() => showToast('Impossibile copiare il link', 'error'))
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

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#FFFFFF',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        
        {/* Header */}
        <header style={{
          padding: '30px 0',
          marginBottom: '40px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '15px'
          }}>
            <h1 style={{
              color: '#000000',
              margin: 0,
              fontSize: '24px',
              fontWeight: '400'
            }}>
              MVPMenu Dashboard
            </h1>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <span style={{
                color: '#666',
                fontSize: '14px'
              }}>
                {session.user.email}
              </span>

              <div style={{
                display: 'flex',
                gap: '12px'
              }}>
                <button 
                  onClick={() => setShowSupportModal(true)}
                  aria-label="Apri form assistenza"
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#FFFFFF',
                    background: '#000000',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#333333'}
                  onMouseLeave={(e) => e.target.style.background = '#000000'}
                >
                  Assistenza
                </button>
                
                <button 
                  onClick={handleLogout}
                  aria-label="Esci dall'account"
                  style={{
                    padding: '10px 20px',
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
                  onMouseEnter={(e) => {
                    e.target.style.background = '#F5F5F5'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#FFFFFF'
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* SEZIONE 1: Menu Pubblico */}
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
                onClick={downloadQRCode}
                aria-label="Scarica QR Code del menu"
                style={{
                  flex: 1,
                  minWidth: '180px',
                  padding: '10px 20px',
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
                Scarica QR Code
              </button>
            </div>
          </CollapsibleSection>
        )}

        {/* SEZIONE 2: Attività */}
        <CollapsibleSection
          title="Attività"
          isOpen={openSections.restaurant}
          onToggle={() => toggleSection('restaurant')}
        >
          <RestaurantForm restaurant={restaurant} onSave={handleRestaurantSave} />
        </CollapsibleSection>

        {/* SEZIONE 3: Menu */}
        {restaurant && (
          <CollapsibleSection
            title="Menu"
            isOpen={openSections.categories}
            onToggle={() => toggleSection('categories')}
          >
            <CategoryManager restaurantId={restaurant.id} />
          </CollapsibleSection>
        )}

        {/* SEZIONE 4: Orari di Apertura */}
        {restaurant && (
          <CollapsibleSection
            title="Orari di Apertura"
            isOpen={openSections.hours}
            onToggle={() => toggleSection('hours')}
          >
            <OpeningHoursManager restaurantId={restaurant.id} />
          </CollapsibleSection>
        )}

        {/* SEZIONE 5: Backup Menu */}
        {restaurant && (
          <CollapsibleSection
            title="Backup Menu"
            isOpen={openSections.importExport}
            onToggle={() => toggleSection('importExport')}
          >
            <MenuImportExport restaurantId={restaurant.id} />
          </CollapsibleSection>
        )}

        {/* Footer */}
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
              Made with <span role="img" aria-label="cuore">❤️</span> by{' '}
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

      {/* Modal Supporto */}
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
            padding: '20px'
          }}
        >
          <div style={{
            background: '#FFFFFF',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif'
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
                Richiedi Assistenza
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

            <div>
              <div style={{ marginBottom: '20px' }}>
                <label 
                  htmlFor="support-email"
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '13px',
                    fontWeight: '400',
                    color: '#666'
                  }}
                >
                  Email
                </label>
                <input
                  id="support-email"
                  type="email"
                  value={supportForm.email}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #E0E0E0',
                    borderRadius: '4px',
                    background: '#F5F5F5',
                    color: '#666',
                    boxSizing: 'border-box',
                    fontWeight: '400'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label 
                  htmlFor="support-phone"
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '13px',
                    fontWeight: '400',
                    color: '#666'
                  }}
                >
                  Numero di Telefono *
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
                  aria-invalid={!!formErrors.phone}
                  aria-describedby={formErrors.phone ? "phone-error" : undefined}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: `1px solid ${formErrors.phone ? '#f44336' : '#E0E0E0'}`,
                    borderRadius: '4px',
                    background: '#FFFFFF',
                    color: '#000000',
                    boxSizing: 'border-box',
                    fontWeight: '400'
                  }}
                />
                {formErrors.phone && (
                  <span 
                    id="phone-error"
                    role="alert"
                    style={{
                      display: 'block',
                      marginTop: '6px',
                      fontSize: '12px',
                      color: '#f44336',
                      fontWeight: '400'
                    }}
                  >
                    {formErrors.phone}
                  </span>
                )}
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label 
                  htmlFor="support-message"
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '13px',
                    fontWeight: '400',
                    color: '#666'
                  }}
                >
                  Problema Riscontrato *
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
                  placeholder="Descrivi il problema nel dettaglio..."
                  rows="6"
                  aria-invalid={!!formErrors.message}
                  aria-describedby={formErrors.message ? "message-error" : undefined}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: `1px solid ${formErrors.message ? '#f44336' : '#E0E0E0'}`,
                    borderRadius: '4px',
                    background: '#FFFFFF',
                    color: '#000000',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    fontWeight: '400'
                  }}
                />
                {formErrors.message && (
                  <span 
                    id="message-error"
                    role="alert"
                    style={{
                      display: 'block',
                      marginTop: '6px',
                      fontSize: '12px',
                      color: '#f44336',
                      fontWeight: '400'
                    }}
                  >
                    {formErrors.message}
                  </span>
                )}
              </div>

              <div style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowSupportModal(false)
                    setFormErrors({})
                  }}
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    padding: '10px 20px',
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
                  Annulla
                </button>

                <button
                  type="button"
                  onClick={handleSendSupport}
                  disabled={sendingSupport}
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    padding: '10px 20px',
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
                  {sendingSupport ? 'Invio...' : 'Invia Richiesta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Styles */}
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
          
          header > div {
            flex-direction: column;
            align-items: flex-start !important;
          }
          
          header > div > div {
            width: 100%;
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