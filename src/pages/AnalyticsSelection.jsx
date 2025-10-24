import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function AnalyticsSelection() {
  const navigate = useNavigate()
  const location = useLocation()

  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showCustomRequestModal, setShowCustomRequestModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    description: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Prova prima da location.state, poi da localStorage
  let restaurant = location.state?.restaurant
  if (!restaurant) {
    const stored = localStorage.getItem('analytics_restaurant')
    if (stored) {
      try {
        restaurant = JSON.parse(stored)
      } catch (error) {
        console.error('Errore parsing restaurant da localStorage:', error)
        restaurant = null
      }
    }
  }

  // Se non c'è un ristorante, reindirizza alla dashboard
  if (!restaurant) {
    console.log('Nessun ristorante trovato, redirect a dashboard')
    navigate('/dashboard')
    return (
      <div style={{...styles.container, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
        <p style={{color: '#666'}}>Reindirizzamento alla dashboard...</p>
      </div>
    )
  }

  // Categorie di analytics
  const categories = [
    { id: 'all', name: 'Tutte' },
    { id: 'menu', name: 'Menu' },
    { id: 'orders', name: 'Ordini' },
    { id: 'staff', name: 'Staff' },
    { id: 'revenue', name: 'Revenue' },
    { id: 'customers', name: 'Clienti' }
  ]

  const metrics = [
    // METRICHE MENU (ATTIVE)
    {
      id: 'favorites',
      title: 'Prodotti Preferiti',
      description: 'Analizza quali prodotti vengono aggiunti ai preferiti',
      category: 'menu',
      active: true
    },
    {
      id: 'products',
      title: 'Prodotti Visti',
      description: 'Scopri quali prodotti vengono visualizzati di più',
      category: 'menu',
      active: true
    },
    {
      id: 'categories',
      title: 'Categorie Visualizzate',
      description: 'Vedi quali categorie attirano più attenzione',
      category: 'menu',
      active: true
    },
    {
      id: 'session',
      title: 'Tempo sul Menu',
      description: 'Monitora quanto tempo gli utenti passano sul menu',
      category: 'menu',
      active: true
    },
    {
      id: 'qr',
      title: 'QR Code Scansionati',
      description: 'Traccia quante persone scansionano il tuo QR code',
      category: 'menu',
      active: true
    },

    // METRICHE MENU (IN ARRIVO)
    {
      id: 'conversion-funnel',
      title: 'Funnel Conversione',
      description: 'Vista → Preferito → Carrello → Ordine',
      category: 'menu',
      active: true
    },
    {
      id: 'cart-abandonment',
      title: 'Abbandono Carrello',
      description: 'Prodotti aggiunti ma non ordinati',
      category: 'menu',
      active: false
    },
    {
      id: 'cross-selling',
      title: 'Cross-selling',
      description: 'Prodotti ordinati insieme frequentemente',
      category: 'menu',
      active: false
    },

    // METRICHE ORDINI (IN ARRIVO)
    {
      id: 'orders-performance',
      title: 'Performance Ordini',
      description: 'Tempo medio gestione, SLA compliance, picchi orari',
      category: 'orders',
      active: false
    },
    {
      id: 'top-products-ordered',
      title: 'Prodotti Più Ordinati',
      description: 'Bestsellers vs slow movers, revenue per prodotto',
      category: 'orders',
      active: true
    },
    {
      id: 'priority-orders',
      title: 'Ordini Priority',
      description: 'Analisi ordini prioritari: count, revenue, fasce orarie',
      category: 'orders',
      active: false
    },
    {
      id: 'table-heatmap',
      title: 'Heatmap Tavoli',
      description: 'Tavoli più attivi per fascia oraria e giorno',
      category: 'orders',
      active: false
    },
    {
      id: 'time-based-analysis',
      title: 'Analisi Temporale',
      description: 'Vendite per ora/giorno/mese con drill-down prodotti e colonne sortabili',
      category: 'orders',
      active: true
    },

    // METRICHE STAFF (IN ARRIVO)
    {
      id: 'staff-performance',
      title: 'Performance Staff',
      description: 'Ordini gestiti, tempo medio, operatore più veloce',
      category: 'staff',
      active: false
    },
    {
      id: 'staff-leaderboard',
      title: 'Classifica Operatori',
      description: 'Gamification: ranking operatori per efficienza',
      category: 'staff',
      active: false
    },

    // METRICHE REVENUE (ATTIVE)
    {
      id: 'revenue-analytics',
      title: 'Revenue Analytics',
      description: 'Revenue per ora, giorno, tavolo, prodotto',
      category: 'revenue',
      active: true
    },
    {
      id: 'aov-analysis',
      title: 'Valore Medio Ordine',
      description: 'AOV complessivo, giornaliero e per singolo ordine con drill-down',
      category: 'revenue',
      active: true
    },
    {
      id: 'revenue-forecast',
      title: 'Previsioni Revenue',
      description: 'Stima revenue prossimo periodo (ML)',
      category: 'revenue',
      active: false
    },

    // METRICHE CLIENTI (IN ARRIVO)
    {
      id: 'customer-segmentation',
      title: 'Segmentazione Clienti',
      description: 'Nuovi vs ritorno, mobile vs desktop, QR vs link',
      category: 'customers',
      active: false
    },
    {
      id: 'customer-behavior',
      title: 'Comportamento Clienti',
      description: 'Path analysis, tempo medio per ordinare',
      category: 'customers',
      active: false
    },
    {
      id: 'return-rate',
      title: 'Tasso di Ritorno',
      description: 'Clienti che riordinano stesso prodotto/tavolo',
      category: 'customers',
      active: false
    }
  ]

  const filteredMetrics = selectedCategory === 'all'
    ? metrics
    : metrics.filter(m => m.category === selectedCategory)

  const handleMetricClick = (metric) => {
    if (!metric.active) {
      // Se la metrica non è attiva, mostra il modal per richiesta
      setShowCustomRequestModal(true)
      setFormData(prev => ({
        ...prev,
        description: `Vorrei attivare la metrica "${metric.title}": ${metric.description}`
      }))
      return
    }
    navigate(`/analytics/${metric.id}`, { state: { restaurant } })
  }

  const handleSubmitRequest = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: 'support@mvpmenu.com', // Email di supporto
          subject: 'Metrica Personalizzata',
          html: `
            <h2>Richiesta Metrica Personalizzata</h2>
            <p><strong>Ristorante:</strong> ${restaurant.name}</p>
            <p><strong>Nome:</strong> ${formData.name}</p>
            <p><strong>Telefono:</strong> ${formData.phone}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p><strong>Descrizione:</strong></p>
            <p>${formData.description}</p>
          `
        }
      })

      if (error) throw error

      setSubmitSuccess(true)
      setTimeout(() => {
        setShowCustomRequestModal(false)
        setSubmitSuccess(false)
        setFormData({ name: '', phone: '', email: '', description: '' })
      }, 2000)
    } catch (error) {
      console.error('Errore invio richiesta:', error)
      alert('Errore durante l\'invio. Riprova.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button
          onClick={() => navigate('/dashboard')}
          style={styles.backButton}
        >
          ← Dashboard
        </button>
        <h1 style={styles.title}>Analytics</h1>
        <p style={styles.subtitle}>
          Scegli una metrica da analizzare per {restaurant?.name || 'il tuo ristorante'}
        </p>
      </div>

      {/* Filtro Categorie */}
      <div style={styles.categoriesContainer}>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            style={{
              ...styles.categoryButton,
              ...(selectedCategory === category.id ? styles.categoryButtonActive : {})
            }}
          >
            <span style={styles.categoryName}>{category.name}</span>
          </button>
        ))}
      </div>

      {/* Lista Metriche */}
      <div style={styles.list}>
        {filteredMetrics.map((metric, index) => (
          <div key={metric.id}>
            <button
              onClick={() => handleMetricClick(metric)}
              aria-label={`Apri analytics per ${metric.title}`}
              style={styles.listItem}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F5F5F5'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={styles.itemHeader}>
                  <h3 style={styles.itemTitle}>{metric.title}</h3>
                  {!metric.active && (
                    <span style={styles.comingSoonBadge}>In arrivo</span>
                  )}
                </div>
                <p style={styles.itemDescription}>{metric.description}</p>
              </div>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                style={{ flexShrink: 0 }}
              >
                <path
                  d="M4 12h16m0 0l-6-6m6 6l-6 6"
                  stroke={metric.active ? "#000000" : "#999"}
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {index < filteredMetrics.length - 1 && (
              <div style={styles.separator} />
            )}
          </div>
        ))}
      </div>

      {/* Pulsante Sticky per Richiesta Metrica Personalizzata */}
      <div style={styles.stickyFooter}>
        <button
          onClick={() => setShowCustomRequestModal(true)}
          style={styles.customRequestButton}
        >
          Richiedi Metrica Personalizzata
        </button>
      </div>

      {/* Modal Richiesta Metrica Personalizzata */}
      {showCustomRequestModal && (
        <>
          <div
            style={styles.modalOverlay}
            onClick={() => setShowCustomRequestModal(false)}
          />
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Richiedi Metrica Personalizzata</h2>
              <button
                onClick={() => setShowCustomRequestModal(false)}
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>

            {submitSuccess ? (
              <div style={styles.successMessage}>
                <div style={styles.successIcon}>✓</div>
                <p style={styles.successText}>Richiesta inviata con successo!</p>
                <p style={styles.successSubtext}>Ti contatteremo presto.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitRequest} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nome *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    style={styles.input}
                    placeholder="Il tuo nome"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Numero di Telefono *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    style={styles.input}
                    placeholder="+39 123 456 7890"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    style={styles.input}
                    placeholder="nome@esempio.com"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Descrizione della Metrica *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    style={{...styles.input, ...styles.textarea}}
                    placeholder="Descrivi la metrica che vorresti analizzare, con un esempio se possibile..."
                    rows={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    ...styles.submitButton,
                    ...(submitting ? styles.submitButtonDisabled : {})
                  }}
                >
                  {submitting ? 'Invio in corso...' : 'Invia Richiesta'}
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#FFFFFF',
    padding: '40px 20px 100px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif'
  },

  header: {
    maxWidth: '1200px',
    margin: '0 auto 40px auto',
  },

  backButton: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    color: '#666',
    cursor: 'pointer',
    padding: '8px 0',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '500',
    transition: 'color 0.2s ease',
    outline: 'none'
  },

  title: {
    fontSize: '24px',
    fontWeight: '400',
    color: '#000000',
    margin: '0 0 12px 0',
  },

  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
    lineHeight: '1.6',
  },

  categoriesContainer: {
    maxWidth: '1200px',
    margin: '0 auto 32px auto',
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },

  categoryButton: {
    background: '#FFFFFF',
    border: '1px solid #E0E0E0',
    borderRadius: '20px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    outline: 'none'
  },

  categoryButtonActive: {
    background: '#000000',
    color: '#FFFFFF',
    borderColor: '#000000'
  },

  categoryName: {
    fontSize: '14px'
  },

  list: {
    maxWidth: '1200px',
    margin: '0 auto',
    background: '#FFFFFF',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    overflow: 'hidden'
  },

  listItem: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    padding: '20px 24px',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    outline: 'none'
  },

  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '4px'
  },

  itemTitle: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#000000',
    margin: '0',
  },

  comingSoonBadge: {
    background: '#FFF3CD',
    color: '#856404',
    fontSize: '11px',
    fontWeight: '600',
    padding: '4px 8px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  itemDescription: {
    fontSize: '13px',
    color: '#666',
    margin: 0,
    lineHeight: '1.5',
  },

  separator: {
    height: '1px',
    background: '#E0E0E0',
    margin: '0'
  },

  stickyFooter: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#FFFFFF',
    borderTop: '1px solid #E0E0E0',
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'center',
    zIndex: 1000
  },

  customRequestButton: {
    background: '#000000',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '14px 24px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    maxWidth: '400px',
    width: '100%'
  },

  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 2000,
    backdropFilter: 'blur(4px)'
  },

  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#FFFFFF',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    zIndex: 2001,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
  },

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 24px 16px 24px',
    borderBottom: '1px solid #E0E0E0'
  },

  modalTitle: {
    fontSize: '20px',
    fontWeight: '500',
    color: '#000000',
    margin: 0
  },

  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#666',
    cursor: 'pointer',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    transition: 'background 0.2s ease'
  },

  form: {
    padding: '24px'
  },

  formGroup: {
    marginBottom: '20px'
  },

  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#000000',
    marginBottom: '8px'
  },

  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    color: '#000000',
    background: '#FFFFFF',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
    boxSizing: 'border-box'
  },

  textarea: {
    resize: 'vertical',
    minHeight: '120px'
  },

  submitButton: {
    width: '100%',
    background: '#000000',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '14px 24px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none'
  },

  submitButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },

  successMessage: {
    padding: '60px 24px',
    textAlign: 'center'
  },

  successIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: '#28A745',
    color: '#FFFFFF',
    fontSize: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px auto',
    fontWeight: 'bold'
  },

  successText: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#000000',
    margin: '0 0 8px 0'
  },

  successSubtext: {
    fontSize: '14px',
    color: '#666',
    margin: 0
  }
}

export default AnalyticsSelection
