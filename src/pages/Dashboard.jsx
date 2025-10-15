import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import RestaurantForm from '../components/RestaurantForm'
import CategoryManager from '../components/CategoryManager'
import OpeningHoursManager from '../components/OpeningHoursManager'
import MenuImportExport from '../components/MenuImportExport'
import QRCode from 'qrcode'

function Dashboard({ session }) {
  const [restaurant, setRestaurant] = useState(null)
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

  useEffect(() => {
    if (session) {
      loadRestaurant(session.user.id)
    }
  }, [session])

  const loadRestaurant = async (userId) => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!error && data) {
      setRestaurant(data)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleRestaurantSave = () => {
    loadRestaurant(session.user.id)
  }

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const downloadQRCode = async () => {
    if (!restaurant) return
    
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
      link.click()
    } catch (error) {
      console.error('Error generating QR code:', error)
      alert('Errore durante la generazione del QR Code')
    }
  }

  const handleSendSupport = async (e) => {
    e.preventDefault()
    
    if (!supportForm.phone || !supportForm.message) {
      alert('Per favore compila tutti i campi')
      return
    }

    setSendingSupport(true)

    const emailBody = `
RICHIESTA SUPPORTO MVPMENU

Email utente: ${supportForm.email}
Telefono: ${supportForm.phone}

Problema riscontrato:
${supportForm.message}

---
Inviato il: ${new Date().toLocaleString('it-IT')}
    `.trim()

    const mailtoLink = `mailto:enzocassese91@gmail.com?subject=${encodeURIComponent('MVPMenu - Supporto')}&body=${encodeURIComponent(emailBody)}`
    
    window.location.href = mailtoLink

    setTimeout(() => {
      setSendingSupport(false)
      setShowSupportModal(false)
      setSupportForm({
        email: session?.user?.email || '',
        phone: '',
        message: ''
      })
      alert('Client email aperto! Invia il messaggio dal tuo client di posta.')
    }, 500)
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#F5F5F5',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <header style={{
          background: '#FFFFFF',
          border: '2px solid #000000',
          borderRadius: '8px',
          padding: '20px 30px',
          marginBottom: '30px',
          boxShadow: '4px 4px 0px #000000',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <h1 style={{
            color: '#000000',
            margin: 0,
            fontSize: '28px',
            fontWeight: '700',
            letterSpacing: '-0.5px'
          }}>
            🍕 MVPMenu Dashboard
          </h1>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            flexWrap: 'wrap'
          }}>
            <span style={{
              color: '#000000',
              fontWeight: '500',
              fontSize: '14px',
              padding: '8px 12px',
              background: '#F5F5F5',
              border: '1px solid #000000',
              borderRadius: '4px'
            }}>
              👤 {session.user.email}
            </span>

            <button 
              onClick={() => setShowSupportModal(true)}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '700',
                color: '#FFFFFF',
                background: '#FF9800',
                border: '2px solid #000000',
                borderRadius: '4px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                boxShadow: '2px 2px 0px #000000',
                transition: 'all 0.2s ease'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(2px)'
                e.currentTarget.style.boxShadow = '0px 0px 0px #000000'
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '2px 2px 0px #000000'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '2px 2px 0px #000000'
              }}
            >
              🆘 Ricevi Assistenza
            </button>
            
            <button 
              onClick={handleLogout}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '700',
                color: '#FFFFFF',
                background: '#f44336',
                border: '2px solid #000000',
                borderRadius: '4px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                boxShadow: '2px 2px 0px #000000',
                transition: 'all 0.2s ease'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(2px)'
                e.currentTarget.style.boxShadow = '0px 0px 0px #000000'
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '2px 2px 0px #000000'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '2px 2px 0px #000000'
              }}
            >
              Logout
            </button>
          </div>
        </header>

        {/* SEZIONE 1: Menu Pubblico (Toggle) */}
        {restaurant && (
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => toggleSection('publicMenu')}
              style={{
                width: '100%',
                background: '#FFFFFF',
                border: '2px solid #000000',
                borderRadius: '8px',
                padding: '20px 30px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                boxShadow: '4px 4px 0px #000000',
                transition: 'all 0.2s ease',
                marginBottom: openSections.publicMenu ? '20px' : '0'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(2px)'
                e.currentTarget.style.boxShadow = '2px 2px 0px #000000'
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '4px 4px 0px #000000'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '4px 4px 0px #000000'
              }}
            >
              <h2 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: '700',
                color: '#000000'
              }}>
                🌐 Menu Pubblico
              </h2>
              <span style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#000000',
                transform: openSections.publicMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease'
              }}>
                ▼
              </span>
            </button>

            {openSections.publicMenu && (
              <div style={{
                background: '#FFFFFF',
                border: '2px solid #000000',
                borderRadius: '8px',
                padding: '30px',
                boxShadow: '4px 4px 0px #000000'
              }}>
                <h3 style={{
                  margin: '0 0 20px 0',
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#000000',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  🔗 Link Condivisibile
                </h3>

                <div style={{
                  padding: '15px',
                  background: '#F5F5F5',
                  border: '2px solid #000000',
                  borderRadius: '4px',
                  marginBottom: '20px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  color: '#000000',
                  wordBreak: 'break-all'
                }}>
                  {window.location.origin}/#/menu/{restaurant.subdomain}
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
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      padding: '14px 24px',
                      fontSize: '16px',
                      fontWeight: '700',
                      color: '#FFFFFF',
                      background: '#2196F3',
                      border: '2px solid #000000',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      boxShadow: '3px 3px 0px #000000',
                      transition: 'all 0.2s ease',
                      textAlign: 'center',
                      textDecoration: 'none',
                      display: 'block'
                    }}
                  >
                    👁️ Apri Menu
                  </a>

                  <button
                    onClick={downloadQRCode}
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      padding: '14px 24px',
                      fontSize: '16px',
                      fontWeight: '700',
                      color: '#FFFFFF',
                      background: '#000000',
                      border: '2px solid #000000',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      boxShadow: '3px 3px 0px #000000',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseDown={(e) => {
                      e.target.style.transform = 'translate(2px, 2px)'
                      e.target.style.boxShadow = '1px 1px 0px #000000'
                    }}
                    onMouseUp={(e) => {
                      e.target.style.transform = 'translate(0, 0)'
                      e.target.style.boxShadow = '3px 3px 0px #000000'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translate(0, 0)'
                      e.target.style.boxShadow = '3px 3px 0px #000000'
                    }}
                  >
                    📱 Scarica QR Code
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SEZIONE 2: Attività (Toggle) */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => toggleSection('restaurant')}
            style={{
              width: '100%',
              background: '#FFFFFF',
              border: '2px solid #000000',
              borderRadius: '8px',
              padding: '20px 30px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              boxShadow: '4px 4px 0px #000000',
              transition: 'all 0.2s ease',
              marginBottom: openSections.restaurant ? '20px' : '0'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(2px)'
              e.currentTarget.style.boxShadow = '2px 2px 0px #000000'
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '4px 4px 0px #000000'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '4px 4px 0px #000000'
            }}
          >
            <h2 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: '700',
              color: '#000000'
            }}>
              🏪 Attività
            </h2>
            <span style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#000000',
              transform: openSections.restaurant ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease'
            }}>
              ▼
            </span>
          </button>

          {openSections.restaurant && (
            <div>
              <RestaurantForm restaurant={restaurant} onSave={handleRestaurantSave} />
            </div>
          )}
        </div>

        {/* SEZIONE 3: Menu (Toggle) */}
        {restaurant && (
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => toggleSection('categories')}
              style={{
                width: '100%',
                background: '#FFFFFF',
                border: '2px solid #000000',
                borderRadius: '8px',
                padding: '20px 30px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                boxShadow: '4px 4px 0px #000000',
                transition: 'all 0.2s ease',
                marginBottom: openSections.categories ? '20px' : '0'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(2px)'
                e.currentTarget.style.boxShadow = '2px 2px 0px #000000'
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '4px 4px 0px #000000'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '4px 4px 0px #000000'
              }}
            >
              <h2 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: '700',
                color: '#000000'
              }}>
                📂 Menu
              </h2>
              <span style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#000000',
                transform: openSections.categories ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease'
              }}>
                ▼
              </span>
            </button>

            {openSections.categories && (
              <div>
                <CategoryManager restaurantId={restaurant.id} />
              </div>
            )}
          </div>
        )}

        {/* SEZIONE 4: Orari di Apertura (Toggle) */}
        {restaurant && (
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => toggleSection('hours')}
              style={{
                width: '100%',
                background: '#FFFFFF',
                border: '2px solid #000000',
                borderRadius: '8px',
                padding: '20px 30px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                boxShadow: '4px 4px 0px #000000',
                transition: 'all 0.2s ease',
                marginBottom: openSections.hours ? '20px' : '0'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(2px)'
                e.currentTarget.style.boxShadow = '2px 2px 0px #000000'
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '4px 4px 0px #000000'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '4px 4px 0px #000000'
              }}
            >
              <h2 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: '700',
                color: '#000000'
              }}>
                🕒 Orari di Apertura
              </h2>
              <span style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#000000',
                transform: openSections.hours ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease'
              }}>
                ▼
              </span>
            </button>

            {openSections.hours && (
              <div>
                <OpeningHoursManager restaurantId={restaurant.id} />
              </div>
            )}
          </div>
        )}

        {/* SEZIONE 5: Scarica o Carica Menu (Toggle) */}
        {restaurant && (
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => toggleSection('importExport')}
              style={{
                width: '100%',
                background: '#FFFFFF',
                border: '2px solid #000000',
                borderRadius: '8px',
                padding: '20px 30px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                boxShadow: '4px 4px 0px #000000',
                transition: 'all 0.2s ease',
                marginBottom: openSections.importExport ? '20px' : '0'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(2px)'
                e.currentTarget.style.boxShadow = '2px 2px 0px #000000'
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '4px 4px 0px #000000'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '4px 4px 0px #000000'
              }}
            >
              <h2 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: '700',
                color: '#000000'
              }}>
                📥 Scarica o Carica Menu
              </h2>
              <span style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#000000',
                transform: openSections.importExport ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease'
              }}>
                ▼
              </span>
            </button>

            {openSections.importExport && (
              <div>
                <MenuImportExport restaurantId={restaurant.id} />
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer style={{
          marginTop: '50px',
          paddingTop: '20px',
          borderTop: '2px solid #000000',
          textAlign: 'center',
          color: '#666',
          fontSize: '14px'
        }}>
          <p style={{ margin: 0 }}>
            Made with ❤️ by MVPMenu | © 2025
          </p>
        </footer>
      </div>

      {/* Modal Supporto */}
      {showSupportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            border: '2px solid #000000',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '8px 8px 0px #000000',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: '700',
                color: '#000000'
              }}>
                🆘 Richiedi Assistenza
              </h2>
              <button
                onClick={() => setShowSupportModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  color: '#000000'
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendSupport}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#000000',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  📧 Email
                </label>
                <input
                  type="email"
                  value={supportForm.email}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    fontSize: '16px',
                    border: '2px solid #000000',
                    borderRadius: '4px',
                    background: '#F5F5F5',
                    color: '#666',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#000000',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  📱 Numero di Telefono *
                </label>
                <input
                  type="tel"
                  value={supportForm.phone}
                  onChange={(e) => setSupportForm({ ...supportForm, phone: e.target.value })}
                  placeholder="+39 123 456 7890"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    fontSize: '16px',
                    border: '2px solid #000000',
                    borderRadius: '4px',
                    background: '#F5F5F5',
                    color: '#000000',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.background = '#FFFFFF'}
                  onBlur={(e) => e.target.style.background = '#F5F5F5'}
                />
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#000000',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  📝 Problema Riscontrato *
                </label>
                <textarea
                  value={supportForm.message}
                  onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                  placeholder="Descrivi il problema nel dettaglio..."
                  required
                  rows="6"
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    fontSize: '16px',
                    border: '2px solid #000000',
                    borderRadius: '4px',
                    background: '#F5F5F5',
                    color: '#000000',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.background = '#FFFFFF'}
                  onBlur={(e) => e.target.style.background = '#F5F5F5'}
                />
              </div>

              <div style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap'
              }}>
                <button
                  type="button"
                  onClick={() => setShowSupportModal(false)}
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#000000',
                    background: '#F5F5F5',
                    border: '2px solid #000000',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    boxShadow: '2px 2px 0px #000000',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseDown={(e) => {
                    e.target.style.transform = 'translate(2px, 2px)'
                    e.target.style.boxShadow = '0px 0px 0px #000000'
                  }}
                  onMouseUp={(e) => {
                    e.target.style.transform = 'translate(0, 0)'
                    e.target.style.boxShadow = '2px 2px 0px #000000'
                  }}
                >
                  Annulla
                </button>

                <button
                  type="submit"
                  disabled={sendingSupport}
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#FFFFFF',
                    background: sendingSupport ? '#999' : '#FF9800',
                    border: '2px solid #000000',
                    borderRadius: '4px',
                    cursor: sendingSupport ? 'not-allowed' : 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    boxShadow: '2px 2px 0px #000000',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseDown={(e) => {
                    if (!sendingSupport) {
                      e.target.style.transform = 'translate(2px, 2px)'
                      e.target.style.boxShadow = '0px 0px 0px #000000'
                    }
                  }}
                  onMouseUp={(e) => {
                    e.target.style.transform = 'translate(0, 0)'
                    e.target.style.boxShadow = '2px 2px 0px #000000'
                  }}
                >
                  {sendingSupport ? '⏳ Invio...' : '📧 Invia Richiesta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 768px) {
          header {
            padding: 15px 20px !important;
          }
          h1 {
            font-size: 22px !important;
          }
          header > div {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  )
}

export default Dashboard