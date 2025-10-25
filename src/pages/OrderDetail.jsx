import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import CreateOrderModal from '../components/CreateOrderModal'

function OrderDetail() {
  const { subdomain, orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [staffSession, setStaffSession] = useState(null)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [showEditOrderModal, setShowEditOrderModal] = useState(false)

  useEffect(() => {
    checkAccess()
  }, [subdomain])

  useEffect(() => {
    if (staffSession && orderId) {
      loadOrder()
      loadTimeline()
    }
  }, [staffSession, orderId])

  // Timer per aggiornare il tempo di attesa in tempo reale
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000) // Aggiorna ogni secondo

    return () => clearInterval(interval)
  }, [])

  const checkAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('*')
        .eq('subdomain', subdomain)
        .single()

      if (!restaurantData) {
        navigate(`/staff/${subdomain}`)
        return
      }

      if (session && session.user.id === restaurantData.user_id) {
        setStaffSession({
          name: 'Proprietario',
          role: 'manager',
          restaurant_id: restaurantData.id,
          staff_id: null
        })
      } else {
        const staffData = localStorage.getItem('staff_session')
        if (!staffData) {
          navigate(`/staff/${subdomain}`)
          return
        }
        setStaffSession(JSON.parse(staffData))
      }
    } catch (error) {
      console.error('Errore accesso:', error)
      navigate(`/staff/${subdomain}`)
    }
  }

  const loadOrder = async () => {
    try {
      // Load order first
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (orderError) throw orderError

      console.log('📦 Ordine caricato:', orderData)

      // Load order items separately
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)

      if (itemsError) {
        console.error('❌ Errore caricamento items:', itemsError)
      }

      console.log('📦 Order items caricati separatamente:', itemsData)
      console.log('📦 Order items length:', itemsData?.length)

      // Combine data
      const completeOrder = {
        ...orderData,
        order_items: itemsData || []
      }

      console.log('📦 Ordine completo:', completeOrder)
      setOrder(completeOrder)
    } catch (error) {
      console.error('Errore caricamento ordine:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTimeline = async () => {
    try {
      const { data, error } = await supabase
        .from('order_timeline')
        .select(`
          *,
          staff:restaurant_staff(name)
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Map staff name from join if not already present
      const timelineWithStaff = (data || []).map(event => ({
        ...event,
        staff_name: event.staff_name || event.staff?.name || null
      }))

      setTimeline(timelineWithStaff)
    } catch (error) {
      console.error('Errore caricamento timeline:', error)
    }
  }

  const updateOrderStatus = async (newStatus) => {
    try {
      const updates = {
        status: newStatus,
        confirmed_by: staffSession.staff_id || null,
        updated_at: new Date().toISOString()
      }

      if (newStatus === 'confirmed') {
        updates.confirmed_at = new Date().toISOString()
      } else if (newStatus === 'preparing') {
        updates.preparing_at = new Date().toISOString()
      } else if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)

      if (error) throw error

      // Track analytics event for operator action
      if (staffSession?.staff_id) {
        await supabase
          .from('analytics_events')
          .insert({
            restaurant_id: staffSession.restaurant_id,
            event_type: 'operator_order_action',
            metadata: {
              order_id: orderId,
              staff_id: staffSession.staff_id,
              staff_name: staffSession.name,
              action: newStatus,
              previous_status: order?.status,
              table_number: order?.table_number
            }
          })
          .select()
      }

      // La timeline viene gestita automaticamente dal trigger del database

      loadOrder()
      loadTimeline()
    } catch (error) {
      console.error('Errore aggiornamento stato:', error)
      alert('Errore durante l\'aggiornamento dello stato')
    }
  }

  const deleteOrder = async () => {
    if (!staffSession || staffSession.role !== 'manager') {
      alert('Solo i manager possono eliminare ordini')
      return
    }

    if (!confirm('Sei sicuro di voler eliminare questo ordine?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)

      if (error) throw error

      navigate(`/staff/${subdomain}/orders`)
    } catch (error) {
      console.error('Errore eliminazione ordine:', error)
      alert('Errore durante l\'eliminazione dell\'ordine')
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'In Attesa'
      case 'confirmed': return 'Confermato'
      case 'preparing': return 'In Preparazione'
      case 'completed': return 'Completato'
      case 'cancelled': return 'Annullato'
      case 'created': return 'Creato'
      case 'updated': return 'Aggiornato'
      case 'item_added': return 'Prodotto Aggiunto'
      case 'item_removed': return 'Prodotto Rimosso'
      case 'item_updated': return 'Quantità Aggiornata'
      default: return status
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFA726'
      case 'confirmed': return '#42A5F5'
      case 'preparing': return '#AB47BC'
      case 'completed': return '#66BB6A'
      case 'cancelled': return '#EF5350'
      default: return '#999'
    }
  }

  const getNextAction = (status) => {
    switch (status) {
      case 'pending': return { label: 'Conferma', nextStatus: 'confirmed' }
      case 'confirmed': return { label: 'In Preparazione', nextStatus: 'preparing' }
      case 'preparing': return { label: 'Completa', nextStatus: 'completed' }
      default: return null
    }
  }

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const calculateWaitTime = () => {
    if (!order) return '00:00:00'

    const startTime = new Date(order.created_at).getTime()
    const endTime = order.completed_at ? new Date(order.completed_at).getTime() : currentTime

    const diffMs = endTime - startTime
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)

    // Formato HH:MM:SS
    const hours = String(diffHours).padStart(2, '0')
    const minutes = String(diffMinutes % 60).padStart(2, '0')
    const seconds = String(diffSeconds % 60).padStart(2, '0')

    return `${hours}:${minutes}:${seconds}`
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={{ fontSize: '16px' }}>Caricamento...</div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={{ fontSize: '16px', color: '#000' }}>Ordine non trovato</div>
        </div>
      </div>
    )
  }

  const nextAction = getNextAction(order.status)

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate(`/staff/${subdomain}/orders`)} style={styles.backButton}>
          ← Indietro
        </button>
        <h1 style={styles.title}>Ordine #{order.id.substring(0, 8).toUpperCase()}</h1>
        <button onClick={() => setShowEditOrderModal(true)} style={styles.editButton}>
          Modifica Ordine
        </button>
      </div>

      {/* Order Info Card */}
      <div style={styles.card}>
        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <div style={styles.infoLabel}>Tavolo</div>
            <div style={styles.infoValue}>{order.table_number}</div>
          </div>
          <div style={styles.infoItem}>
            <div style={styles.infoLabel}>Stato</div>
            <div style={{
              ...styles.statusBadge,
              backgroundColor: getStatusColor(order.status) + '15',
              color: getStatusColor(order.status)
            }}>
              {getStatusLabel(order.status)}
            </div>
          </div>
          <div style={styles.infoItem}>
            <div style={styles.infoLabel}>Tempo di Attesa</div>
            <div style={{
              ...styles.infoValue,
              color: order.completed_at ? '#66BB6A' : '#FF9800',
              fontFamily: 'monospace',
              fontSize: '16px'
            }}>
              {calculateWaitTime()}
            </div>
          </div>
          {order.customer_name && (
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Cliente</div>
              <div style={styles.infoValue}>{order.customer_name}</div>
            </div>
          )}
          <div style={styles.infoItem}>
            <div style={styles.infoLabel}>Data e Ora</div>
            <div style={styles.infoValue}>{formatDateTime(order.created_at)}</div>
          </div>
        </div>

        {order.is_priority_order && (
          <div style={styles.priorityBanner}>
            ORDINE PRIORITARIO
          </div>
        )}
      </div>

      {/* Products */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Prodotti Ordinati</h3>

        {!order.order_items || order.order_items.length === 0 ? (
          <div style={styles.emptyProducts}>
            Nessun prodotto trovato per questo ordine
          </div>
        ) : (
          <div style={styles.productsList}>
            {order.order_items.map((item) => (
              <div key={item.id} style={styles.productCard}>
                <div style={styles.productHeader}>
                  <span style={styles.productQuantity}>{item.quantity}x</span>
                  <div style={styles.productInfo}>
                    <span style={styles.productName}>{item.product_name}</span>
                    {item.variant_title && (
                      <span style={styles.variantBadge}>{item.variant_title}</span>
                    )}
                  </div>
                  <span style={styles.productPrice}>€{item.subtotal.toFixed(2)}</span>
                </div>
                {item.notes && (
                  <div style={styles.productNotes}>Note: {item.notes}</div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={styles.totalCard}>
          <div style={styles.totalRow}>
            <span>Subtotale</span>
            <span>€{(order.total_amount - (order.priority_order_amount || 0)).toFixed(2)}</span>
          </div>
          {order.is_priority_order && (
            <div style={styles.totalRow}>
              <span style={{ color: '#FF9800' }}>Priority Order</span>
              <span style={{ color: '#FF9800' }}>€{order.priority_order_amount.toFixed(2)}</span>
            </div>
          )}
          <div style={{ ...styles.totalRow, ...styles.totalFinal }}>
            <span>Totale</span>
            <span>€{order.total_amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Customer Notes */}
      {order.customer_notes && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Note Cliente</h3>
          <div style={styles.notesCard}>
            {order.customer_notes}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Timeline</h3>
        {timeline.length > 0 ? (
          <div style={styles.timelineList}>
            {timeline.map((event) => (
              <div key={event.id} style={styles.timelineItem}>
                <div style={styles.timelineDot}></div>
                <div style={styles.timelineContent}>
                  <div style={styles.timelineAction}>{getStatusLabel(event.action)}</div>
                  {event.staff_name && (
                    <div style={styles.timelineStaff}>da {event.staff_name}</div>
                  )}
                  <div style={styles.timelineDate}>{formatDateTime(event.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.emptyTimeline}>Nessuna attività registrata</div>
        )}
      </div>

      {/* Metrics - Hidden from UI, kept in database for analytics */}
      {/* <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Metriche</h3>
        <div style={styles.metricsCard}>
          <div style={styles.metricRow}>
            <span>Creato:</span>
            <span>{formatDateTime(order.created_at)}</span>
          </div>
          {order.confirmed_at && (
            <div style={styles.metricRow}>
              <span>Confermato:</span>
              <span>{formatDateTime(order.confirmed_at)}</span>
            </div>
          )}
          {order.preparing_at && (
            <div style={styles.metricRow}>
              <span>In Preparazione:</span>
              <span>{formatDateTime(order.preparing_at)}</span>
            </div>
          )}
          {order.completed_at && (
            <div style={styles.metricRow}>
              <span>Completato:</span>
              <span>{formatDateTime(order.completed_at)}</span>
            </div>
          )}
        </div>
      </div> */}

      {/* Actions */}
      <div style={styles.actions}>
        {nextAction && (
          <button
            onClick={() => updateOrderStatus(nextAction.nextStatus)}
            style={styles.actionButton}
          >
            {nextAction.label}
          </button>
        )}
        {staffSession?.role === 'manager' && (
          <button
            onClick={deleteOrder}
            style={{ ...styles.actionButton, backgroundColor: '#EF4444' }}
          >
            Elimina Ordine
          </button>
        )}
      </div>

      {/* Edit Order Modal */}
      {showEditOrderModal && (
        <CreateOrderModal
          restaurantId={staffSession?.restaurant_id}
          onClose={() => setShowEditOrderModal(false)}
          onOrderCreated={() => {
            loadOrder()
            loadTimeline()
            setShowEditOrderModal(false)
          }}
          staffSession={staffSession}
          existingOrder={order}
        />
      )}
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F5F5F5',
    paddingBottom: '80px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    color: '#000'
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #ddd',
    padding: '12px 16px',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  backButton: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#000',
    backgroundColor: 'transparent',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  title: {
    flex: 1,
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#000'
  },
  editButton: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#fff',
    backgroundColor: '#000',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  card: {
    backgroundColor: '#fff',
    margin: '16px',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #ddd'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  infoLabel: {
    fontSize: '10px',
    color: '#666',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  infoValue: {
    fontSize: '13px',
    color: '#000',
    fontWeight: '600'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600',
    textAlign: 'center',
    width: 'fit-content'
  },
  priorityBanner: {
    marginTop: '12px',
    padding: '10px',
    backgroundColor: '#FFF3E0',
    color: '#FF9800',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    textAlign: 'center'
  },
  section: {
    margin: '0 16px 16px 16px',
    padding: '16px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #ddd'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  sectionTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '600',
    color: '#000'
  },
  addButton: {
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#000',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  productsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  productCard: {
    padding: '10px',
    backgroundColor: '#fafafa',
    borderRadius: '6px',
    border: '1px solid #ddd'
  },
  productHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  productInfo: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap'
  },
  quantityControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  quantityButton: {
    width: '24px',
    height: '24px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#000',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  productQuantity: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#666',
    minWidth: '30px'
  },
  productName: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#000'
  },
  variantBadge: {
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: '500',
    backgroundColor: '#f0f0f0',
    color: '#666',
    borderRadius: '4px'
  },
  productPrice: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#000'
  },
  productNotes: {
    marginTop: '8px',
    padding: '8px',
    backgroundColor: '#FFF9E6',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#92400E'
  },
  removeButton: {
    marginTop: '8px',
    width: '100%',
    padding: '6px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#EF4444',
    backgroundColor: '#fff',
    border: '1px solid #EF4444',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  totalCard: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#fafafa',
    borderRadius: '6px',
    border: '1px solid #ddd'
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    fontSize: '12px',
    color: '#666'
  },
  totalFinal: {
    borderTop: '2px solid #ddd',
    marginTop: '6px',
    paddingTop: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#000'
  },
  notesCard: {
    padding: '10px',
    backgroundColor: '#EFF6FF',
    border: '1px solid #BFDBFE',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#1E40AF',
    lineHeight: '1.5'
  },
  timelineList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  timelineItem: {
    display: 'flex',
    gap: '10px'
  },
  timelineDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#000',
    marginTop: '4px',
    flexShrink: 0
  },
  timelineContent: {
    flex: 1
  },
  timelineAction: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#000',
    marginBottom: '2px'
  },
  timelineStaff: {
    fontSize: '11px',
    color: '#666',
    marginBottom: '2px'
  },
  timelineDate: {
    fontSize: '10px',
    color: '#999'
  },
  emptyTimeline: {
    padding: '16px',
    textAlign: 'center',
    color: '#999',
    fontSize: '12px'
  },
  emptyProducts: {
    padding: '24px',
    textAlign: 'center',
    color: '#999',
    fontSize: '13px',
    backgroundColor: '#fafafa',
    border: '1px dashed #ddd',
    borderRadius: '4px'
  },
  metricsCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  metricRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    fontSize: '11px',
    color: '#666',
    borderBottom: '1px solid #f0f0f0'
  },
  actions: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTop: '1px solid #ddd',
    padding: '12px 16px',
    display: 'flex',
    gap: '10px',
    zIndex: 10
  },
  actionButton: {
    flex: 1,
    padding: '12px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#000',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'flex-end',
    zIndex: 100
  },
  modalContent: {
    width: '100%',
    maxHeight: '80vh',
    backgroundColor: '#fff',
    borderRadius: '16px 16px 0 0',
    overflowY: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #ddd',
    position: 'sticky',
    top: 0,
    backgroundColor: '#fff',
    zIndex: 1
  },
  modalTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#000'
  },
  closeButton: {
    width: '32px',
    height: '32px',
    fontSize: '24px',
    fontWeight: '300',
    color: '#666',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  productGrid: {
    padding: '16px',
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '10px'
  },
  productOption: {
    padding: '12px',
    backgroundColor: '#fafafa',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  productOptionName: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#000'
  },
  productOptionPrice: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#000'
  }
}

export default OrderDetail
