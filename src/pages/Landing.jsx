import { useState } from 'react'

function Landing() {
  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FFFFFF',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif'
    }}>
      
      {/* Header/Nav */}
      <header style={{
        padding: '20px',
        position: 'sticky',
        top: 0,
        backgroundColor: '#FFFFFF',
        zIndex: 100,
        borderBottom: '1px solid #000000'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '400',
            color: '#000000'
          }}>
            MVPMenu
          </h1>
          
          <nav style={{
            display: 'flex',
            gap: '30px',
            alignItems: 'center'
          }}>
            <button
              onClick={() => scrollToSection('features')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#000000',
                fontSize: '14px',
                fontWeight: '400',
                cursor: 'pointer',
                padding: '8px 0'
              }}
            >
              Funzionalità
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#000000',
                fontSize: '14px',
                fontWeight: '400',
                cursor: 'pointer',
                padding: '8px 0'
              }}
            >
              Prezzi
            </button>
            <a
              href="/#/login"
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#FFFFFF',
                background: '#000000',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                textDecoration: 'none',
                display: 'inline-block',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = '#333333'}
              onMouseLeave={(e) => e.target.style.background = '#000000'}
            >
              Accedi
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        padding: '100px 20px',
        textAlign: 'center',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <h2 style={{
          fontSize: '56px',
          fontWeight: '400',
          color: '#000000',
          margin: '0 0 20px 0',
          lineHeight: '1.2'
        }}>
          Il tuo menu digitale
          <br />
          in 5 minuti
        </h2>
        
        <p style={{
          fontSize: '20px',
          fontWeight: '400',
          color: '#666',
          margin: '0 0 40px 0',
          maxWidth: '600px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          Crea un menu professionale per il tuo ristorante con QR code, 
          senza competenze tecniche. Semplice, veloce, elegante.
        </p>

        <div style={{
          display: 'flex',
          gap: '15px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <a
            href="/#/login"
            style={{
              padding: '16px 40px',
              fontSize: '16px',
              fontWeight: '500',
              color: '#FFFFFF',
              background: '#000000',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'inline-block',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.background = '#333333'}
            onMouseLeave={(e) => e.target.style.background = '#000000'}
          >
            Registrati gratis
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{
        padding: '80px 20px',
        backgroundColor: '#F5F5F5'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <h3 style={{
            fontSize: '36px',
            fontWeight: '400',
            color: '#000000',
            textAlign: 'center',
            margin: '0 0 60px 0'
          }}>
            Tutto quello che ti serve
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '40px'
          }}>
            {/* Feature 1 */}
            <div style={{
              padding: '30px',
              backgroundColor: '#FFFFFF',
              borderRadius: '8px'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                backgroundColor: '#000000',
                borderRadius: '6px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h4 style={{
                fontSize: '20px',
                fontWeight: '400',
                color: '#000000',
                margin: '0 0 10px 0'
              }}>
                Menu digitale
              </h4>
              <p style={{
                fontSize: '14px',
                fontWeight: '400',
                color: '#666',
                margin: 0,
                lineHeight: '1.6'
              }}>
                Crea e gestisci il tuo menu online in modo semplice. 
                Aggiorna piatti, prezzi e categorie in tempo reale.
              </p>
            </div>

            {/* Feature 2 */}
            <div style={{
              padding: '30px',
              backgroundColor: '#FFFFFF',
              borderRadius: '8px'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                backgroundColor: '#000000',
                borderRadius: '6px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="7" y="7" width="2" height="2" fill="#FFFFFF"/>
                  <rect x="7" y="11" width="2" height="2" fill="#FFFFFF"/>
                  <rect x="7" y="15" width="2" height="2" fill="#FFFFFF"/>
                  <rect x="11" y="7" width="2" height="2" fill="#FFFFFF"/>
                  <rect x="11" y="15" width="2" height="2" fill="#FFFFFF"/>
                  <rect x="15" y="7" width="2" height="2" fill="#FFFFFF"/>
                  <rect x="15" y="11" width="2" height="2" fill="#FFFFFF"/>
                </svg>
              </div>
              <h4 style={{
                fontSize: '20px',
                fontWeight: '400',
                color: '#000000',
                margin: '0 0 10px 0'
              }}>
                QR Code incluso
              </h4>
              <p style={{
                fontSize: '14px',
                fontWeight: '400',
                color: '#666',
                margin: 0,
                lineHeight: '1.6'
              }}>
                Genera automaticamente il QR code del tuo menu. 
                I clienti possono visualizzarlo dal proprio smartphone.
              </p>
            </div>

            {/* Feature 3 */}
            <div style={{
              padding: '30px',
              backgroundColor: '#FFFFFF',
              borderRadius: '8px'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                backgroundColor: '#000000',
                borderRadius: '6px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 6V12L16 14" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h4 style={{
                fontSize: '20px',
                fontWeight: '400',
                color: '#000000',
                margin: '0 0 10px 0'
              }}>
                Aggiornamenti istantanei
              </h4>
              <p style={{
                fontSize: '14px',
                fontWeight: '400',
                color: '#666',
                margin: 0,
                lineHeight: '1.6'
              }}>
                Modifica il menu quando vuoi. Le modifiche sono 
                immediatamente visibili ai tuoi clienti.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{
        padding: '80px 20px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <h3 style={{
            fontSize: '36px',
            fontWeight: '400',
            color: '#000000',
            textAlign: 'center',
            margin: '0 0 20px 0'
          }}>
            Prezzi semplici e trasparenti
          </h3>
          
          <p style={{
            fontSize: '16px',
            fontWeight: '400',
            color: '#666',
            textAlign: 'center',
            margin: '0 0 60px 0'
          }}>
            Inizia gratis, passa al premium quando sei pronto
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '30px',
            maxWidth: '900px',
            margin: '0 auto'
          }}>
            {/* Free Plan */}
            <div style={{
              padding: '40px',
              border: '1px solid #E0E0E0',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF'
            }}>
              <h4 style={{
                fontSize: '24px',
                fontWeight: '400',
                color: '#000000',
                margin: '0 0 10px 0'
              }}>
                Gratuito
              </h4>
              <p style={{
                fontSize: '14px',
                fontWeight: '400',
                color: '#666',
                margin: '0 0 20px 0'
              }}>
                Perfetto per iniziare
              </p>
              <div style={{
                fontSize: '48px',
                fontWeight: '400',
                color: '#000000',
                margin: '0 0 30px 0'
              }}>
                €0
                <span style={{
                  fontSize: '16px',
                  color: '#666'
                }}>
                  /mese
                </span>
              </div>
              
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 30px 0'
              }}>
                <li style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'relative'
                }}>
                  <span style={{
                    position: 'absolute',
                    left: 0
                  }}>✓</span>
                  Max 3 categorie
                </li>
                <li style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'relative'
                }}>
                  <span style={{
                    position: 'absolute',
                    left: 0
                  }}>✓</span>
                  Max 3 prodotti per categoria
                </li>
                <li style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'relative'
                }}>
                  <span style={{
                    position: 'absolute',
                    left: 0
                  }}>✓</span>
                  Caricamento immagini
                </li>
                <li style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'relative'
                }}>
                  <span style={{
                    position: 'absolute',
                    left: 0
                  }}>✓</span>
                  Link condivisibile
                </li>
                <li style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'relative'
                }}>
                  <span style={{
                    position: 'absolute',
                    left: 0
                  }}>✓</span>
                  Supporto base
                </li>
              </ul>

              <a
                href="/#/login"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#000000',
                  background: '#FFFFFF',
                  border: '1px solid #000000',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  display: 'block',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#F5F5F5'}
                onMouseLeave={(e) => e.target.style.background = '#FFFFFF'}
              >
                Inizia gratis
              </a>
            </div>

            {/* Premium Plan */}
            <div style={{
              padding: '40px',
              border: '2px solid #000000',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '4px 12px',
                backgroundColor: '#000000',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: '500',
                borderRadius: '4px'
              }}>
                Più popolare
              </div>
              
              <h4 style={{
                fontSize: '24px',
                fontWeight: '400',
                color: '#000000',
                margin: '0 0 10px 0'
              }}>
                Premium
              </h4>
              <p style={{
                fontSize: '14px',
                fontWeight: '400',
                color: '#666',
                margin: '0 0 20px 0'
              }}>
                Per ristoranti professionali
              </p>
              <div style={{
                fontSize: '48px',
                fontWeight: '400',
                color: '#000000',
                margin: '0 0 10px 0'
              }}>
                €30
                <span style={{
                  fontSize: '16px',
                  color: '#666'
                }}>
                  /mese
                </span>
              </div>
              <p style={{
                fontSize: '13px',
                fontWeight: '400',
                color: '#999',
                margin: '0 0 30px 0',
                fontStyle: 'italic'
              }}>
                Circa 1€ al giorno
              </p>
              
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 30px 0'
              }}>
                <li style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'relative'
                }}>
                  <span style={{
                    position: 'absolute',
                    left: 0
                  }}>✓</span>
                  <strong>Categorie illimitate</strong>
                </li>
                <li style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'relative'
                }}>
                  <span style={{
                    position: 'absolute',
                    left: 0
                  }}>✓</span>
                  <strong>Prodotti illimitati</strong>
                </li>
                <li style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'relative'
                }}>
                  <span style={{
                    position: 'absolute',
                    left: 0
                  }}>✓</span>
                  Caricamento immagini
                </li>
                <li style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'relative'
                }}>
                  <span style={{
                    position: 'absolute',
                    left: 0
                  }}>✓</span>
                  Link condivisibile
                </li>
                <li style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'relative'
                }}>
                  <span style={{
                    position: 'absolute',
                    left: 0
                  }}>✓</span>
                  <strong>Scaricamento QR Code</strong>
                </li>
                <li style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'relative'
                }}>
                  <span style={{
                    position: 'absolute',
                    left: 0
                  }}>✓</span>
                  <strong>Scaricamento backup</strong>
                </li>
                <li style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'relative'
                }}>
                  <span style={{
                    position: 'absolute',
                    left: 0
                  }}>✓</span>
                  <strong>Assistenza prioritaria</strong>
                </li>
              </ul>

              <a
                href="/#/login"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#FFFFFF',
                  background: '#000000',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  display: 'block',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#333333'}
                onMouseLeave={(e) => e.target.style.background = '#000000'}
              >
                Inizia ora
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '40px 20px',
        backgroundColor: '#000000',
        borderTop: '1px solid #333333'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <p style={{
            margin: 0,
            color: '#999',
            fontSize: '13px',
            fontWeight: '400'
          }}>
            Made with <span role="img" aria-label="cuore">❤️</span> by MVPMenu | © 2025
          </p>
          
          <div style={{
            display: 'flex',
            gap: '20px'
          }}>
            <a
              href="mailto:enzocassese91@gmail.com"
              style={{
                color: '#999',
                fontSize: '13px',
                fontWeight: '400',
                textDecoration: 'none'
              }}
            >
              Contatti
            </a>
            <a
              href="/#/login"
              style={{
                color: '#999',
                fontSize: '13px',
                fontWeight: '400',
                textDecoration: 'none'
              }}
            >
              Accedi
            </a>
          </div>
        </div>
      </footer>

      {/* Styles */}
      <style>{`
        * {
          box-sizing: border-box;
        }
        
        html {
          scroll-behavior: smooth;
        }

        @media (max-width: 768px) {
          h2 {
            font-size: 36px !important;
          }
          
          h3 {
            font-size: 28px !important;
          }
          
          nav {
            flex-direction: column;
            gap: 15px !important;
          }
        }
      `}</style>
    </div>
  )
}

export default Landing