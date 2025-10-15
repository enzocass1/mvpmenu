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

        {/* SEZIONE 5: Importa/Esporta Menu (Toggle) */}
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
                📥 Importa/Esporta Menu
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