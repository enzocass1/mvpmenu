import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import { Card, Button, Badge, EmptyState, Spinner } from '../components/ui'
import DashboardLayout from '../components/ui/DashboardLayout'
import CreateOrderModal from '../components/CreateOrderModal'

/**
 * Order Detail Page - Shopify-like Design System
 * Dettaglio singolo ordine con azioni complete
 */
function OrderDetailPage({ session }) {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [order, setOrder] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [showEditOrderModal, setShowEditOrderModal] = useState(false)

  useEffect(() => {
    if (session) {
      loadData()
    }
  }, [session, orderId])

  // Timer per aggiornare il tempo di attesa in tempo reale
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000) // Aggiorna ogni secondo

    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load restaurant
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (restaurantError) throw restaurantError
      setRestaurant(restaurantData)

      // Load order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (orderError) throw orderError

      // Load order items separately
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)

      if (itemsError) {
        console.error('Errore caricamento items:', itemsError)
      }

      setOrder({
        ...orderData,
        order_items: itemsData || [],
      })

      // Load timeline
      const { data: timelineData, error: timelineError } = await supabase
        .from('order_timeline')
        .select(`
          *,
          staff:restaurant_staff(name)
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })

      if (timelineError) {
        console.error('Errore caricamento timeline:', timelineError)
      } else {
        // Map staff name from join if not already present
        const timelineWithStaff = (timelineData || []).map(event => ({
          ...event,
          staff_name: event.staff_name || event.staff?.name || null
        }))
        setTimeline(timelineWithStaff)
      }
    } catch (error) {
      console.error('Errore caricamento ordine:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/#/'
      window.location.reload()
    } catch (error) {
      console.error('Errore logout:', error)
    }
  }

  const updateOrderStatus = async (newStatus) => {
    try {
      const updates = {
        status: newStatus,
        updated_at: new Date().toISOString(),
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

      // Track analytics event for owner action
      await supabase
        .from('analytics_events')
        .insert({
          restaurant_id: restaurant.id,
          event_type: 'owner_order_action',
          metadata: {
            order_id: orderId,
            user_id: session.user.id,
            action: newStatus,
            previous_status: order?.status,
            table_number: order?.table_number
          }
        })
        .select()

      loadData()
    } catch (error) {
      console.error('Errore aggiornamento stato:', error)
      alert('Errore durante l\'aggiornamento dello stato')
    }
  }

  const deleteOrder = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo ordine? Questa azione è irreversibile.')) {
      return
    }

    try {
      // Elimina tutti i dati correlati all'ordine
      // 1. Elimina gli items dell'ordine
      await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId)

      // 2. Elimina gli eventi analytics correlati
      await supabase
        .from('analytics_events')
        .delete()
        .eq('order_id', orderId)

      // 3. Elimina la timeline
      await supabase
        .from('order_timeline')
        .delete()
        .eq('order_id', orderId)

      // 4. Elimina l'ordine stesso
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)

      if (error) throw error

      navigate('/ordini')
    } catch (error) {
      console.error('Errore eliminazione ordine:', error)
      alert('Errore durante l\'eliminazione dell\'ordine')
    }
  }

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'In Attesa',
      confirmed: 'Confermato',
      preparing: 'In Preparazione',
      completed: 'Completato',
      cancelled: 'Annullato',
      created: 'Creato',
      updated: 'Aggiornato',
      item_added: 'Prodotto Aggiunto',
      item_removed: 'Prodotto Rimosso',
      item_updated: 'Quantità Aggiornata'
    }
    return labels[status] || status
  }

  const getStatusVariant = (status) => {
    const variants = {
      pending: 'warning',
      confirmed: 'info',
      preparing: 'info',
      completed: 'success',
      cancelled: 'error',
    }
    return variants[status] || 'default'
  }

  const getNextAction = (status) => {
    const actions = {
      pending: { label: 'Conferma Ordine', nextStatus: 'confirmed' },
      confirmed: { label: 'Inizia Preparazione', nextStatus: 'preparing' },
      preparing: { label: 'Completa Ordine', nextStatus: 'completed' },
    }
    return actions[status] || null
  }

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  const isPremium = restaurant?.subscription_tier === 'premium'

  const pageHeaderStyles = {
    marginBottom: tokens.spacing.xl,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: tokens.spacing.md,
  }

  const titleStyles = {
    margin: 0,
    fontSize: tokens.typography.fontSize['3xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.black,
  }

  const gridStyles = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.xl,
  }

  const infoLabelStyles = {
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.gray[600],
    marginBottom: tokens.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  }

  const infoValueStyles = {
    fontSize: tokens.typography.fontSize.lg,
    color: tokens.colors.black,
    fontWeight: tokens.typography.fontWeight.semibold,
  }

  const sectionTitleStyles = {
    fontSize: tokens.typography.fontSize.xl,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.black,
    marginBottom: tokens.spacing.lg,
  }

  const productItemStyles = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.gray[50],
    borderRadius: tokens.borderRadius.md,
    marginBottom: tokens.spacing.sm,
    border: `1px solid ${tokens.colors.gray[200]}`
  }

  const productNameStyles = {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.black,
    marginBottom: tokens.spacing.xs,
  }

  const productQuantityStyles = {
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.gray[600],
  }

  const productPriceStyles = {
    fontSize: tokens.typography.fontSize.base,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.black,
  }

  const actionsStyles = {
    display: 'flex',
    gap: tokens.spacing.md,
    marginTop: tokens.spacing.xl,
    flexWrap: 'wrap',
  }

  const timelineStyles = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.md
  }

  const timelineItemStyles = {
    display: 'flex',
    gap: tokens.spacing.md,
    paddingBottom: tokens.spacing.md,
    borderBottom: `1px solid ${tokens.colors.gray[200]}`
  }

  const timelineDotStyles = {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: tokens.colors.black,
    marginTop: '4px',
    flexShrink: 0
  }

  const timelineContentStyles = {
    flex: 1
  }

  const timelineActionStyles = {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.black,
    marginBottom: tokens.spacing.xs
  }

  const timelineStaffStyles = {
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.gray[600],
    marginBottom: tokens.spacing.xs
  }

  const timelineDateStyles = {
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.gray[500]
  }

  if (loading) {
    return (
      <DashboardLayout
        restaurantName={restaurant?.name}
        userName={session?.user?.email}
        isPremium={isPremium}
        onLogout={handleLogout}
      >
        <Spinner size="lg" text="Caricamento ordine..." centered />
      </DashboardLayout>
    )
  }

  if (!order) {
    return (
      <DashboardLayout
        restaurantName={restaurant?.name}
        userName={session?.user?.email}
        isPremium={isPremium}
        onLogout={handleLogout}
      >
        <Card>
          <EmptyState
            title="Ordine non trovato"
            description="L'ordine richiesto non esiste o non hai i permessi per visualizzarlo."
            action={() => navigate('/ordini')}
            actionText="Torna agli Ordini"
          />
        </Card>
      </DashboardLayout>
    )
  }

  const nextAction = getNextAction(order.status)

  return (
    <DashboardLayout
      restaurantName={restaurant?.name}
      userName={session?.user?.email}
      isPremium={isPremium}
      onLogout={handleLogout}
    >
      {/* Page Header */}
      <div style={pageHeaderStyles}>
        <div style={{ flex: 1 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/ordini')}
            style={{ marginBottom: tokens.spacing.sm }}
          >
            ← Torna agli Ordini
          </Button>
          <h1 style={titleStyles}>Ordine #{order.id.substring(0, 8).toUpperCase()}</h1>
        </div>
        <div style={{ display: 'flex', gap: tokens.spacing.sm, flexWrap: 'wrap' }}>
          <Badge variant={getStatusVariant(order.status)} size="md">
            {getStatusLabel(order.status)}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEditOrderModal(true)}
          >
            Modifica Ordine
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={deleteOrder}
          >
            Elimina Ordine
          </Button>
        </div>
      </div>

      {/* Order Info Grid */}
      <div style={gridStyles}>
        <Card padding="md">
          <div style={infoLabelStyles}>Tavolo</div>
          <div style={infoValueStyles}>{order.table_number}</div>
        </Card>
        <Card padding="md">
          <div style={infoLabelStyles}>Data Ordine</div>
          <div style={infoValueStyles}>{formatDateTime(order.created_at)}</div>
        </Card>
        <Card padding="md">
          <div style={infoLabelStyles}>Tempo di Attesa</div>
          <div style={{
            ...infoValueStyles,
            color: order.completed_at ? tokens.colors.green[600] : tokens.colors.orange[600],
            fontFamily: tokens.typography.fontFamily.mono
          }}>
            {calculateWaitTime()}
          </div>
        </Card>
        <Card padding="md">
          <div style={infoLabelStyles}>Totale</div>
          <div style={infoValueStyles}>€{order.total_amount.toFixed(2)}</div>
        </Card>
        {order.customer_name && (
          <Card padding="md">
            <div style={infoLabelStyles}>Cliente</div>
            <div style={infoValueStyles}>{order.customer_name}</div>
          </Card>
        )}
      </div>

      {/* Priority Badge */}
      {order.is_priority_order && (
        <div style={{ marginBottom: tokens.spacing.xl }}>
          <Badge variant="warning" size="md">⚡ Ordine Prioritario</Badge>
        </div>
      )}

      {/* Products Section */}
      <h2 style={sectionTitleStyles}>Prodotti Ordinati</h2>
      <Card padding="lg" style={{ marginBottom: tokens.spacing.xl }}>
        {!order.order_items || order.order_items.length === 0 ? (
          <EmptyState
            title="Nessun prodotto"
            description="Questo ordine non contiene prodotti."
            centered={false}
          />
        ) : (
          <div>
            {order.order_items.map((item) => (
              <div key={item.id} style={productItemStyles}>
                <div style={{ flex: 1 }}>
                  <div style={productNameStyles}>
                    <span style={{ fontWeight: tokens.typography.fontWeight.semibold, marginRight: tokens.spacing.sm }}>
                      {item.quantity}x
                    </span>
                    {item.product_name}
                    {item.variant_title && (
                      <Badge variant="default" size="sm" style={{ marginLeft: tokens.spacing.sm }}>
                        {item.variant_title}
                      </Badge>
                    )}
                  </div>
                  <div style={productQuantityStyles}>€{item.product_price.toFixed(2)} cad.</div>
                  {item.notes && (
                    <div
                      style={{
                        marginTop: tokens.spacing.xs,
                        fontSize: tokens.typography.fontSize.xs,
                        color: tokens.colors.gray[700],
                        fontStyle: 'italic',
                        padding: tokens.spacing.xs,
                        backgroundColor: tokens.colors.yellow[50],
                        borderRadius: tokens.borderRadius.sm,
                        border: `1px solid ${tokens.colors.yellow[200]}`
                      }}
                    >
                      Note: {item.notes}
                    </div>
                  )}
                </div>
                <div style={productPriceStyles}>€{item.subtotal.toFixed(2)}</div>
              </div>
            ))}

            {/* Total */}
            <div
              style={{
                marginTop: tokens.spacing.lg,
                paddingTop: tokens.spacing.lg,
                borderTop: `${tokens.borders.width.medium} solid ${tokens.colors.gray[300]}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: tokens.typography.fontSize.lg, fontWeight: tokens.typography.fontWeight.semibold }}>
                Totale
              </div>
              <div style={{ fontSize: tokens.typography.fontSize['2xl'], fontWeight: tokens.typography.fontWeight.bold }}>
                €{order.total_amount.toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Customer Notes */}
      {order.customer_notes && (
        <>
          <h2 style={sectionTitleStyles}>Note Cliente</h2>
          <Card padding="md" style={{ marginBottom: tokens.spacing.xl, backgroundColor: tokens.colors.blue[50], border: `1px solid ${tokens.colors.blue[200]}` }}>
            <p style={{ margin: 0, color: tokens.colors.blue[900] }}>
              {order.customer_notes}
            </p>
          </Card>
        </>
      )}

      {/* Timeline */}
      <h2 style={sectionTitleStyles}>Timeline Ordine</h2>
      <Card padding="lg" style={{ marginBottom: tokens.spacing.xl }}>
        {timeline.length === 0 ? (
          <EmptyState
            title="Nessuna attività"
            description="Non ci sono ancora eventi registrati per questo ordine."
            centered={false}
          />
        ) : (
          <div style={timelineStyles}>
            {timeline.map((event) => (
              <div key={event.id} style={timelineItemStyles}>
                <div style={timelineDotStyles}></div>
                <div style={timelineContentStyles}>
                  <div style={timelineActionStyles}>{getStatusLabel(event.action)}</div>
                  {event.staff_name && (
                    <div style={timelineStaffStyles}>da {event.staff_name}</div>
                  )}
                  <div style={timelineDateStyles}>{formatDateTime(event.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Actions */}
      <div style={actionsStyles}>
        {nextAction && (
          <Button
            variant="primary"
            onClick={() => updateOrderStatus(nextAction.nextStatus)}
          >
            {nextAction.label}
          </Button>
        )}
        <Button variant="outline" onClick={() => navigate('/ordini')}>
          Torna agli Ordini
        </Button>
      </div>

      {/* Edit Order Modal */}
      {showEditOrderModal && (
        <CreateOrderModal
          restaurantId={restaurant?.id}
          onClose={() => setShowEditOrderModal(false)}
          onOrderCreated={() => {
            loadData()
            setShowEditOrderModal(false)
          }}
          staffSession={{
            name: 'Proprietario',
            role: 'manager',
            restaurant_id: restaurant.id,
            staff_id: null
          }}
          existingOrder={order}
        />
      )}
    </DashboardLayout>
  )
}

export default OrderDetailPage
