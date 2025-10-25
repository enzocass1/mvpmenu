import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function OrderConfirmation() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

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
          restaurant:restaurants (name, subdomain)
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

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F9FAFB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif'
  },
  loadingBox: {
    textAlign: 'center',
    fontSize: '18px',
    color: '#666'
  },
  errorBox: {
    textAlign: 'center',
    maxWidth: '400px'
  },
  confirmationBox: {
    backgroundColor: '#fff',
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
    backgroundColor: '#10B981',
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
    color: '#111827',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#6B7280',
    margin: '0 0 32px 0'
  },
  detailsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    textAlign: 'left'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #E5E7EB'
  },
  detailLabel: {
    fontSize: '14px',
    color: '#6B7280',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: '14px',
    color: '#111827',
    fontWeight: '600'
  },
  priorityBadge: {
    marginTop: '12px',
    padding: '8px 16px',
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center'
  },
  itemsSection: {
    marginBottom: '24px',
    textAlign: 'left'
  },
  itemsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
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
    backgroundColor: '#F9FAFB',
    borderRadius: '8px'
  },
  itemQuantity: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6B7280',
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
    color: '#111827'
  },
  variantBadge: {
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: '500',
    backgroundColor: '#E5E7EB',
    color: '#6B7280',
    borderRadius: '4px',
    alignSelf: 'flex-start'
  },
  itemPrice: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827'
  },
  notesSection: {
    backgroundColor: '#EFF6FF',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    textAlign: 'left'
  },
  notesTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1E40AF',
    margin: '0 0 8px 0'
  },
  notesText: {
    fontSize: '14px',
    color: '#1E40AF',
    margin: 0
  },
  infoBox: {
    backgroundColor: '#F0FDF4',
    border: '1px solid #BBF7D0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px'
  },
  infoText: {
    fontSize: '14px',
    color: '#166534',
    margin: 0,
    lineHeight: '1.5'
  },
  backButton: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#000',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  }
}

export default OrderConfirmation
