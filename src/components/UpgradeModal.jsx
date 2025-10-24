function UpgradeModal({ isOpen, onClose }) {
  if (!isOpen) return null

  const features = {
    free: [
      'Fino a 3 categorie visibili',
      'Fino a 3 prodotti visibili per categoria',
      'Caricamento immagini',
      'Link condivisibile',
      'Supporto base'
    ],
    premium: [
      { text: 'Ordini al tavolo con gestione in tempo reale', bold: true },
      { text: 'Priority Order per ordini prioritari a pagamento', bold: true },
      { text: 'Gestione staff e camerieri', bold: true },
      { text: 'Categorie illimitate visibili ai tuoi clienti', bold: true },
      { text: 'Prodotti illimitati visibili ai tuoi clienti', bold: true },
      { text: 'Caricamento immagini', bold: false },
      { text: 'Link condivisibile', bold: false },
      { text: 'Scaricamento QR Code', bold: true },
      { text: 'Scaricamento backup', bold: true },
      { text: 'Assistenza prioritaria', bold: true }
    ]
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      style={{
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
        padding: '20px',
        animation: 'fadeIn 0.3s ease'
      }}
    >
      <div style={{
        background: '#FFFFFF',
        borderRadius: '8px',
        padding: '0',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        animation: 'slideUp 0.3s ease'
      }}>
        {/* Header */}
        <div style={{
          padding: '30px',
          borderBottom: '1px solid #E0E0E0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 id="upgrade-modal-title" style={{
              margin: '0 0 8px 0',
              fontSize: '24px',
              fontWeight: '400',
              color: '#000000'
            }}>
              Passa a Premium
            </h2>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#666',
              fontWeight: '400'
            }}>
              Sblocca tutte le funzionalità per il tuo ristorante
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi finestra upgrade"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              padding: '0',
              color: '#999',
              fontWeight: '300',
              lineHeight: '1'
            }}
          >
            ✕
          </button>
        </div>

        {/* Plans Comparison */}
        <div style={{
          padding: '40px 30px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px'
        }}>
          {/* Free Plan */}
          <div style={{
            padding: '30px',
            border: '1px solid #E0E0E0',
            borderRadius: '6px',
            background: '#FFFFFF'
          }}>
            <h3 style={{
              margin: '0 0 10px 0',
              fontSize: '24px',
              fontWeight: '400',
              color: '#000000'
            }}>
              Gratuito
            </h3>
            <p style={{
              margin: '0 0 20px 0',
              fontSize: '14px',
              color: '#666',
              fontWeight: '400'
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
              margin: 0
            }}>
              {features.free.map((feature, index) => (
                <li key={index} style={{
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
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Premium Plan */}
          <div style={{
            padding: '30px',
            border: '2px solid #000000',
            borderRadius: '6px',
            background: '#FFFFFF',
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
            
            <h3 style={{
              margin: '0 0 10px 0',
              fontSize: '24px',
              fontWeight: '400',
              color: '#000000'
            }}>
              Premium
            </h3>
            <p style={{
              margin: '0 0 20px 0',
              fontSize: '14px',
              color: '#666',
              fontWeight: '400'
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
              margin: 0
            }}>
              {features.premium.map((feature, index) => (
                <li key={index} style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'relative',
                  fontWeight: feature.bold ? '600' : '400'
                }}>
                  <span style={{
                    position: 'absolute',
                    left: 0
                  }}>✓</span>
                  {feature.text}
                </li>
              ))}
            </ul>

            <a
              href="/checkout"
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
                transition: 'all 0.2s ease',
                marginTop: '20px'
              }}
              onMouseEnter={(e) => e.target.style.background = '#333333'}
              onMouseLeave={(e) => e.target.style.background = '#000000'}
            >
              Fai l'upgrade del tuo menu
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export default UpgradeModal