import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

// Helper functions for theme styling (must be defined before component)
const getThemeStyles = (themeConfig) => {
  if (!themeConfig) return {} // Usa stili default se non c'è theme_config

  return {
    // Colori principali
    primaryColor: themeConfig.primaryColor || '#000000',
    secondaryColor: themeConfig.secondaryColor || '#ffffff',
    textPrimaryColor: themeConfig.textPrimaryColor || '#ffffff',
    textSecondaryColor: themeConfig.textSecondaryColor || '#111827',
    textTertiaryColor: themeConfig.textTertiaryColor || '#999999',

    // Colori funzionali
    borderColor: themeConfig.borderColor || '#e0e0e0',
    errorColor: themeConfig.errorColor || '#f44336',
    successColor: themeConfig.successColor || '#10B981',
    warningColor: themeConfig.warningColor || '#ff9800',
    backgroundTertiary: themeConfig.backgroundTertiary || '#f9f9f9',

    // Nuovi colori aggiunti in Fase 1
    inputBackground: themeConfig.inputBackground || '#ffffff',
    inputBorder: themeConfig.inputBorder || '#e0e0e0',
    inputBorderFocus: themeConfig.inputBorderFocus || '#000000',
    inputText: themeConfig.inputText || '#111827',
    overlayBackground: themeConfig.overlayBackground || 'rgba(0,0,0,0.5)',
    cardBackground: themeConfig.cardBackground || '#ffffff',
    cardBorder: themeConfig.cardBorder || '#e0e0e0',
    emptyStateText: themeConfig.emptyStateText || '#999999',
    linkColor: themeConfig.linkColor || '#4CAF50',
    linkHoverColor: themeConfig.linkHoverColor || '#000000',
  }
}

function OrderConfirmation() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  // Calcola stili dinamici basati sul theme_config del ristorante
  const themeStyles = useMemo(() => {
    return getThemeStyles(order?.restaurant?.theme_config)
  }, [order])

  // Genera stili completi con il tema applicato
  const styles = useMemo(() => {
    return getStyles(themeStyles)
  }, [themeStyles])

  useEffect(() => {
    loadOrder()
  }, [orderId])

  const loadOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product:products (name, price)
          ),
          restaurant:restaurants (name, subdomain, theme_config)
        `)
        .eq('id', orderId)
        .single()

      if (error) throw error
      setOrder(data)
    } catch (error) {
      console.error('Errore caricamento ordine:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToMenu = () => {
    if (order?.restaurant?.subdomain) {
      navigate(`/menu/${order.restaurant.subdomain}`)
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingBox}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <div>Caricamento...</div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>❌</div>
          <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>Ordine non trovato</h1>
          <p style={{ color: '#666', marginBottom: '30px' }}>L'ordine richiesto non esiste</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.confirmationBox}>
        {/* Success Icon */}
        <div style={styles.successIcon}>✓</div>

        {/* Title */}
        <h1 style={styles.title}>Ordine Confermato!</h1>
        <p style={styles.subtitle}>Il tuo ordine è stato inviato alla cucina</p>

        {/* Order Details */}
        <div style={styles.detailsCard}>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Numero Ordine</span>
            <span style={styles.detailValue}>#{order.id.substring(0, 8).toUpperCase()}</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Tavolo</span>
            <span style={styles.detailValue}>{order.table_number}</span>
          </div>
          {order.customer_name && (
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Nome</span>
              <span style={styles.detailValue}>{order.customer_name}</span>
            </div>
          )}
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Totale</span>
            <span style={styles.detailValue}>€{order.total_amount.toFixed(2)}</span>
          </div>
          {order.is_priority_order && (
            <div style={styles.priorityBadge}>
              ⚡ Ordine Prioritario
            </div>
          )}
        </div>

        {/* Order Items */}
        <div style={styles.itemsSection}>
          <h3 style={styles.itemsTitle}>Prodotti Ordinati</h3>
          <div style={styles.itemsList}>
            {order.order_items?.map((item) => (
              <div key={item.id} style={styles.item}>
                <div style={styles.itemQuantity}>{item.quantity}x</div>
                <div style={styles.itemNameContainer}>
                  <div style={styles.itemName}>{item.product_name}</div>
                  {item.variant_title && (
                    <div style={styles.variantBadge}>{item.variant_title}</div>
                  )}
                </div>
                <div style={styles.itemPrice}>€{item.subtotal.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Notes */}
        {order.customer_notes && (
          <div style={styles.notesSection}>
            <h4 style={styles.notesTitle}>Note</h4>
            <p style={styles.notesText}>{order.customer_notes}</p>
          </div>
        )}

        {/* Info Message */}
        <div style={styles.infoBox}>
          <p style={styles.infoText}>
            Il personale è stato notificato del tuo ordine. Riceverai i tuoi prodotti a breve!
          </p>
        </div>

        {/* Action Button */}
        <button onClick={handleBackToMenu} style={styles.backButton}>
          Torna al Menu
        </button>
      </div>
    </div>
  )
}

const getStyles = (theme = {}) => ({
  container: {
    minHeight: '100vh',
    backgroundColor: theme.backgroundTertiary || '#F9FAFB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif'
  },
  loadingBox: {
    textAlign: 'center',
    fontSize: '18px',
    color: theme.textTertiaryColor || '#666'
  },
  errorBox: {
    textAlign: 'center',
    maxWidth: '400px'
  },
  confirmationBox: {
    backgroundColor: theme.cardBackground || '#fff',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center'
  },
  successIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: theme.successColor || '#10B981',
    color: '#fff',
    fontSize: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
    fontWeight: 'bold'
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    color: theme.textSecondaryColor || '#111827',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: theme.textTertiaryColor || '#6B7280',
    margin: '0 0 32px 0'
  },
  detailsCard: {
    backgroundColor: theme.backgroundTertiary || '#F9FAFB',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    textAlign: 'left',
    border: `1px solid ${theme.cardBorder || theme.borderColor || '#E5E7EB'}`
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: `1px solid ${theme.borderColor || '#E5E7EB'}`
  },
  detailLabel: {
    fontSize: '14px',
    color: theme.textTertiaryColor || '#6B7280',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: '14px',
    color: theme.textSecondaryColor || '#111827',
    fontWeight: '600'
  },
  priorityBadge: {
    marginTop: '12px',
    padding: '8px 16px',
    backgroundColor: `${theme.warningColor || '#ff9800'}20`,
    color: theme.warningColor || '#92400E',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center',
    border: `1px solid ${theme.warningColor || '#FEF3C7'}`
  },
  itemsSection: {
    marginBottom: '24px',
    textAlign: 'left'
  },
  itemsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: theme.textSecondaryColor || '#111827',
    margin: '0 0 16px 0'
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: theme.backgroundTertiary || '#F9FAFB',
    borderRadius: '8px',
    border: `1px solid ${theme.cardBorder || theme.borderColor || '#E5E7EB'}`
  },
  itemQuantity: {
    fontSize: '14px',
    fontWeight: '600',
    color: theme.textTertiaryColor || '#6B7280',
    minWidth: '30px'
  },
  itemNameContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  itemName: {
    fontSize: '14px',
    color: theme.textSecondaryColor || '#111827'
  },
  variantBadge: {
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: '500',
    backgroundColor: theme.backgroundTertiary || '#E5E7EB',
    color: theme.textTertiaryColor || '#6B7280',
    borderRadius: '4px',
    alignSelf: 'flex-start'
  },
  itemPrice: {
    fontSize: '14px',
    fontWeight: '600',
    color: theme.textSecondaryColor || '#111827'
  },
  notesSection: {
    backgroundColor: theme.backgroundTertiary || '#EFF6FF',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    textAlign: 'left',
    border: `1px solid ${theme.cardBorder || theme.borderColor || '#BFDBFE'}`
  },
  notesTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: theme.textSecondaryColor || '#1E40AF',
    margin: '0 0 8px 0'
  },
  notesText: {
    fontSize: '14px',
    color: theme.textSecondaryColor || '#1E40AF',
    margin: 0
  },
  infoBox: {
    backgroundColor: `${theme.successColor || '#10B981'}15`,
    border: `1px solid ${theme.successColor || '#BBF7D0'}`,
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px'
  },
  infoText: {
    fontSize: '14px',
    color: theme.textSecondaryColor || '#166534',
    margin: 0,
    lineHeight: '1.5'
  },
  backButton: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    color: theme.textPrimaryColor || '#fff',
    backgroundColor: theme.primaryColor || '#000',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  }
})

export default OrderConfirmation
