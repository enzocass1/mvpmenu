import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import RestaurantForm from '../components/RestaurantForm'
import CategoryManager from '../components/CategoryManager'
import OpeningHoursManager from '../components/OpeningHoursManager'

function Dashboard({ session }) {
  const [restaurant, setRestaurant] = useState(null)
  const [openSections, setOpenSections] = useState({
    restaurant: true,
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

        {/* SEZIONE 1: Modifica Ristorante (Toggle) */}
        <div style={{ marginBottom: '20px' }}>
          {/* Header Toggle */}
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
              🏪 Modifica Ristorante
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

          {/* Contenuto Sezione */}
          {openSections.restaurant && (
            <div>
              {/* Form Ristorante */}
              <div style={{ marginBottom: '20px' }}>
                <RestaurantForm restaurant={restaurant} onSave={handleRestaurantSave} />
              </div>

              {/* Box Info Ristorante */}
              {restaurant && (
                <div style={{
                  background: '#FFFFFF',
                  border: '2px solid #000000',
                  borderRadius: '8px',
                  padding: '30px',
                  boxShadow: '4px 4px 0px #000000'
                }}>
                  <h3 style={{
                    color: '#000000',
                    margin: '0 0 25px 0',
                    fontSize: '24px',
                    fontWeight: '700',
                    borderBottom: '3px solid #000000',
                    paddingBottom: '15px'
                  }}>
                    ✅ Il tuo ristorante è stato creato!
                  </h3>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '20px'
                  }}>
                    {/* Info Card */}
                    <div style={{
                      padding: '15px',
                      background: '#F5F5F5',
                      border: '2px solid #000000',
                      borderRadius: '4px'
                    }}>
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#666',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Nome
                      </p>
                      <p style={{
                        margin: 0,
                        color: '#000000',
                        fontSize: '16px',
                        fontWeight: '600'
                      }}>
                        {restaurant.name}
                      </p>
                    </div>

                    <div style={{
                      padding: '15px',
                      background: '#F5F5F5',
                      border: '2px solid #000000',
                      borderRadius: '4px'
                    }}>
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#666',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Indirizzo
                      </p>
                      <p style={{
                        margin: 0,
                        color: '#000000',
                        fontSize: '16px',
                        fontWeight: '600'
                      }}>
                        {restaurant.address}
                      </p>
                    </div>

                    <div style={{
                      padding: '15px',
                      background: '#F5F5F5',
                      border: '2px solid #000000',
                      borderRadius: '4px'
                    }}>
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#666',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Telefono
                      </p>
                      <p style={{
                        margin: 0,
                        color: '#000000',
                        fontSize: '16px',
                        fontWeight: '600'
                      }}>
                        {restaurant.phone}
                      </p>
                    </div>
                  </div>

                  {/* Link Menu Pubblico */}
                  <div style={{
                    marginTop: '25px',
                    padding: '20px',
                    background: '#F5F5F5',
                    border: '2px solid #4CAF50',
                    borderRadius: '4px'
                  }}>
                    <p style={{
                      margin: '0 0 12px 0',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#000000',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      🌐 Menu Pubblico
                    </p>
                    
                    <a 
                      href={`${window.location.origin}/#/menu/${restaurant.subdomain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        padding: '12px 20px',
                        fontSize: '14px',
                        fontWeight: '700',
                        color: '#FFFFFF',
                        background: '#4CAF50',
                        border: '2px solid #000000',
                        borderRadius: '4px',
                        textDecoration: 'none',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        boxShadow: '3px 3px 0px #000000',
                        transition: 'all 0.2s ease',
                        marginBottom: '15px'
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = 'translateY(2px)'
                        e.currentTarget.style.boxShadow = '1px 1px 0px #000000'
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '3px 3px 0px #000000'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '3px 3px 0px #000000'
                      }}
                    >
                      📱 Apri Menu Pubblico
                    </a>

                    <p style={{
                      margin: '15px 0 0 0',
                      fontSize: '13px',
                      color: '#666',
                      wordBreak: 'break-all',
                      padding: '12px',
                      background: '#FFFFFF',
                      border: '1px solid #E0E0E0',
                      borderRadius: '4px',
                      fontFamily: 'monospace'
                    }}>
                      <strong style={{ color: '#000000' }}>Link condivisibile:</strong><br/>
                      {window.location.origin}/#/menu/{restaurant.subdomain}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SEZIONE 2: Categorie Menu (Toggle) */}
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
                📂 Categorie Menu
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

        {/* SEZIONE 3: Orari di Apertura (Toggle) */}
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