import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import RestaurantForm from '../components/RestaurantForm'
import CategoryManager from '../components/CategoryManager'
import OpeningHoursManager from '../components/OpeningHoursManager'
import QRCode from 'qrcode'

function Dashboard({ session }) {
  const [restaurant, setRestaurant] = useState(null)
  const [openSections, setOpenSections] = useState({
    publicMenu: false,
    restaurant: false,
    categories: false,
    hours: false
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
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{ 
          background: '#FFFFFF',
          border: '2px solid #000000',
          borderRadius: '8px',
          padding: '20px 30px',
          marginBottom: '25px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '4px 4px 0px #000000'
        }}>
          <div>
            <h1 style={{ 
              margin: '0 0 5px 0', 
              fontSize: '28px',
              fontWeight: '700',
              color: '#000000'
            }}>
              Dashboard MVPMenu
            </h1>
            <p style={{ 
              margin: 0, 
              color: '#666666',
              fontSize: '14px'
            }}>
              {session?.user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '700',
              color: '#FFFFFF',
              background: '#f44336',
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
            Logout
          </button>
        </div>

        {/* Sezione 1: Menu Pubblico */}
        {restaurant && (
          <div style={{
            background: '#FFFFFF',
            border: '2px solid #000000',
            borderRadius: '8px',
            marginBottom: '20px',
            boxShadow: '4px 4px 0px #000000',
            overflow: 'hidden'
          }}>
            <button
              onClick={() => toggleSection('publicMenu')}
              style={{
                width: '100%',
                padding: '20px 30px',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                background: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F5'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
            >
              <span style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#000000',
                transition: 'transform 0.3s ease',
                transform: openSections.publicMenu ? 'rotate(90deg)' : 'rotate(0deg)'
              }}>
                ▶
              </span>
              <h2 style={{
                margin: 0,
                fontSize: '22px',
                fontWeight: '700',
                color: '#000000',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                🌐 Menu Pubblico
              </h2>
            </button>

            {openSections.publicMenu && (
              <div style={{
                padding: '30px',
                borderTop: '2px solid #000000',
                background: '#FAFAFA'
              }}>
                <div style={{
                  background: '#FFFFFF',
                  border: '2px solid #000000',
                  borderRadius: '8px',
                  padding: '25px',
                  boxShadow: '3px 3px 0px #000000'
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
              </div>
            )}
          </div>
        )}

        {/* Sezione 2: Attività */}
        <div style={{
          background: '#FFFFFF',
          border: '2px solid #000000',
          borderRadius: '8px',
          marginBottom: '20px',
          boxShadow: '4px 4px 0px #000000',
          overflow: 'hidden'
        }}>
          <button
            onClick={() => toggleSection('restaurant')}
            style={{
              width: '100%',
              padding: '20px 30px',
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              background: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F5'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
          >
            <span style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#000000',
              transition: 'transform 0.3s ease',
              transform: openSections.restaurant ? 'rotate(90deg)' : 'rotate(0deg)'
            }}>
              ▶
            </span>
            <h2 style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: '700',
              color: '#000000',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              🏪 Attività
            </h2>
          </button>

          {openSections.restaurant && (
            <div style={{
              padding: '30px',
              borderTop: '2px solid #000000',
              background: '#FAFAFA'
            }}>
              <RestaurantForm 
                userId={session?.user?.id} 
                onSave={handleRestaurantSave}
              />
            </div>
          )}
        </div>

        {/* Sezione 3: Menu */}
        {restaurant && (
          <div style={{
            background: '#FFFFFF',
            border: '2px solid #000000',
            borderRadius: '8px',
            marginBottom: '20px',
            boxShadow: '4px 4px 0px #000000',
            overflow: 'hidden'
          }}>
            <button
              onClick={() => toggleSection('categories')}
              style={{
                width: '100%',
                padding: '20px 30px',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                background: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F5'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
            >
              <span style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#000000',
                transition: 'transform 0.3s ease',
                transform: openSections.categories ? 'rotate(90deg)' : 'rotate(0deg)'
              }}>
                ▶
              </span>
              <h2 style={{
                margin: 0,
                fontSize: '22px',
                fontWeight: '700',
                color: '#000000',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                📂 Menu
              </h2>
            </button>

            {openSections.categories && (
              <div style={{
                padding: '30px',
                borderTop: '2px solid #000000',
                background: '#FAFAFA'
              }}>
                <CategoryManager restaurantId={restaurant.id} />
              </div>
            )}
          </div>
        )}

        {/* Sezione 4: Orari di Apertura */}
        {restaurant && (
          <div style={{
            background: '#FFFFFF',
            border: '2px solid #000000',
            borderRadius: '8px',
            marginBottom: '20px',
            boxShadow: '4px 4px 0px #000000',
            overflow: 'hidden'
          }}>
            <button
              onClick={() => toggleSection('hours')}
              style={{
                width: '100%',
                padding: '20px 30px',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                background: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F5'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
            >
              <span style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#000000',
                transition: 'transform 0.3s ease',
                transform: openSections.hours ? 'rotate(90deg)' : 'rotate(0deg)'
              }}>
                ▶
              </span>
              <h2 style={{
                margin: 0,
                fontSize: '22px',
                fontWeight: '700',
                color: '#000000',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                🕒 Orari di Apertura
              </h2>
            </button>

            {openSections.hours && (
              <div style={{
                padding: '30px',
                borderTop: '2px solid #000000',
                background: '#FAFAFA'
              }}>
                <OpeningHoursManager restaurantId={restaurant.id} />
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          padding: '30px 0',
          color: '#666666',
          fontSize: '14px'
        }}>
          <p style={{ margin: 0 }}>
            MVPMenu © 2025 - Dashboard gestione menu digitali
          </p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard