import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { softDeleteOrder } from '../lib/orderOperations'
import * as ordersService from '../lib/ordersService'
import { loadOrderTimeline } from '../lib/timelineService'
import { tokens } from '../styles/tokens'
import { Card, Button, Badge, EmptyState, Spinner } from '../components/ui'
import DashboardLayout from '../components/ui/DashboardLayout'
import CreateOrderModal from '../components/CreateOrderModal'
import ChangeTableModal from '../components/ChangeTableModal'

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
  const [showChangeTableModal, setShowChangeTableModal] = useState(false)

  useEffect(() => {
    if (session) {
      loadData()
    }
  }, [session, orderId])

  // Timer per aggiornare il tempo di attesa in tempo reale
  // SOLO per ordini NON completed e NON eliminati
  useEffect(() => {
    if (!order || order.status === 'completed' || order.deleted_at) {
      // Se completed o eliminato, non aggiornare il timer
      return
    }

    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000) // Aggiorna ogni secondo

    return () => clearInterval(interval)
  }, [order?.status, order?.deleted_at])

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

      // Load order with relationships
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          table:tables (id, number),
          room:rooms (id, name)
        `)
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

      // Load timeline usando nuovo timelineService
      const timelineResult = await loadOrderTimeline(orderId)
      if (timelineResult.success) {
        // Inverti ordine per mostrare più recenti prima
        setTimeline(timelineResult.data.reverse())
      } else {
        console.error('Errore caricamento timeline:', timelineResult.error)
        setTimeline([])
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
      // Usa il servizio centralizzato per garantire consistenza
      // IMPORTANTE: Stessa logica usata in TableDetailModal (Cassa)
      let result

      if (newStatus === 'preparing' || newStatus === 'confirmed') {
        // Conferma ordine (pending → preparing)
        result = await ordersService.confirmOrder(orderId, null) // null = proprietario
      } else if (newStatus === 'completed') {
        // Chiudi ordine (preparing → completed)
        result = await ordersService.closeTableOrder(orderId, null) // null = proprietario
      } else {
        // Per altri stati, usa aggiornamento generico
        // TODO: Quando implementeremo sistema ruoli, passare staff_id qui
        const { data, error } = await supabase
          .from('orders')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
            modified_by_staff_id: null // Proprietario
          })
          .eq('id', orderId)
          .select()
          .single()

        if (error) throw error
        result = { success: true, order: data }
      }

      if (!result.success) {
        throw new Error(result.error || 'Errore aggiornamento stato')
      }

      console.log('✅ Status aggiornato tramite servizio centralizzato:', newStatus)
      loadData()
    } catch (error) {
      console.error('❌ Errore aggiornamento stato:', error)
      alert('Errore durante l\'aggiornamento dello stato')
    }
  }

  const deleteOrder = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo ordine? Verrà spostato nella sezione Eliminati.')) {
      return
    }

    try {
      // Usa il servizio centralizzato per soft delete
      const result = await softDeleteOrder(orderId, session, restaurant)

      if (!result.success) {
        throw new Error(result.error)
      }

      console.log('✅ Soft delete completato:', result.data)
      alert('Ordine eliminato')
      navigate('/ordini')
    } catch (error) {
      console.error('❌ Errore eliminazione ordine:', error)
      alert(`Errore durante l'eliminazione: ${error.message || error}`)
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
      item_updated: 'Quantità Aggiornata',
      table_changed: 'Cambio Tavolo',
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
      // preparing: NON mostrare "Completa Ordine" - solo la Cassa può completare
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

    // Usa opened_at (quando tavolo aperto/confermato) invece di created_at
    const startTime = new Date(order.opened_at || order.created_at).getTime()

    // Per ordini completed: usa closed_at (fisso)
    // Per ordini pending/preparing: usa currentTime (real-time)
    const endTime = order.status === 'completed' && order.closed_at
      ? new Date(order.closed_at).getTime()
      : currentTime

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
        permissions={['*']}
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
        permissions={['*']}
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
      permissions={['*']}
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
          <h1 style={titleStyles}>Ordine #{order.order_number || order.id.substring(0, 8).toUpperCase()}</h1>
        </div>
        <div style={{ display: 'flex', gap: tokens.spacing.sm, flexWrap: 'wrap' }}>
          <Badge variant={order.deleted_at ? 'error' : getStatusVariant(order.status)} size="md">
            {order.deleted_at ? 'Eliminato' : getStatusLabel(order.status)}
          </Badge>

          {/* Cambia Tavolo - nascosto se preparing, completed o deleted */}
          {order.status !== 'preparing' && order.status !== 'completed' && !order.deleted_at && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowChangeTableModal(true)}
            >
              Cambia Tavolo
            </Button>
          )}

          {/* Modifica Ordine (pending) / Aggiungi Prodotti (preparing) - nascosto solo se completed o deleted */}
          {order.status !== 'completed' && !order.deleted_at && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditOrderModal(true)}
            >
              {order.status === 'preparing' ? 'Aggiungi Prodotti' : 'Modifica Ordine'}
            </Button>
          )}

          {/* Elimina Ordine - nascosto se preparing, completed o già deleted */}
          {order.status !== 'preparing' && order.status !== 'completed' && !order.deleted_at && (
            <Button
              variant="danger"
              size="sm"
              onClick={deleteOrder}
            >
              Elimina Ordine
            </Button>
          )}
        </div>
      </div>

      {/* Order Info Grid */}
      <div style={gridStyles}>
        <Card padding="md">
          <div style={infoLabelStyles}>Sala / Tavolo</div>
          <div style={infoValueStyles}>
            {order.room?.name || 'N/A'} - Tavolo {order.table?.number || order.table_number || 'N/A'}
          </div>
        </Card>
        <Card padding="md">
          <div style={infoLabelStyles}>Data Ordine</div>
          <div style={infoValueStyles}>{formatDateTime(order.created_at)}</div>
        </Card>
        <Card padding="md">
          <div style={infoLabelStyles}>Durata Tavolo</div>
          <div style={{
            ...infoValueStyles,
            color: order.status === 'completed' ? tokens.colors.success.base : tokens.colors.warning.base,
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
                        backgroundColor: tokens.colors.warning.light,
                        borderRadius: tokens.borderRadius.sm,
                        border: `1px solid ${tokens.colors.warning.base}`
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
          <Card padding="md" style={{ marginBottom: tokens.spacing.xl, backgroundColor: tokens.colors.info.light, border: `1px solid ${tokens.colors.info.base}` }}>
            <p style={{ margin: 0, color: tokens.colors.info.dark }}>
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
                  {/* Action Label (NO event source badge - è dettaglio tecnico) */}
                  <div style={timelineActionStyles}>{event.actionLabel}</div>

                  {/* Details Summary OR Notes (mostra solo uno per evitare duplicati) */}
                  {(event.details_summary || event.notes) && (
                    <div style={{
                      ...timelineStaffStyles,
                      color: tokens.colors.gray[700],
                      marginBottom: tokens.spacing.xs,
                      fontWeight: event.details_summary ? tokens.typography.fontWeight.medium : tokens.typography.fontWeight.normal,
                      fontStyle: event.details_summary ? 'normal' : 'italic'
                    }}>
                      {/* Priorità a details_summary, fallback a notes */}
                      {event.details_summary || event.notes}
                    </div>
                  )}

                  {/* Operator Display - semplificato (senza "da") */}
                  {event.operatorDisplay && event.operatorDisplay !== 'Sistema' && (
                    <div style={timelineStaffStyles}>
                      {/* Rimuovi "da" iniziale se presente */}
                      {event.operatorDisplay.replace(/^da\s+/i, '')}
                    </div>
                  )}

                  {/* Date */}
                  <div style={timelineDateStyles}>{event.formattedDate}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Actions - nascosto per ordini eliminati */}
      {nextAction && !order.deleted_at && (
        <div style={actionsStyles}>
          <Button
            variant="primary"
            onClick={() => updateOrderStatus(nextAction.nextStatus)}
          >
            {nextAction.label}
          </Button>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditOrderModal && (
        <CreateOrderModal
          restaurantId={restaurant?.id}
          onClose={() => setShowEditOrderModal(false)}
          onOrderCreated={() => {
            loadData()
            setShowEditOrderModal(false)
          }}
          staffSession={session?.user?.id === restaurant?.user_id ? {
            name: `${restaurant.owner_first_name || ''} ${restaurant.owner_last_name || ''}`.trim() || 'Proprietario',
            fullName: `${restaurant.owner_first_name || ''} ${restaurant.owner_last_name || ''}`.trim() || 'Proprietario',
            role: 'Admin',
            displayRole: 'Admin',
            restaurant_id: restaurant.id,
            staff_id: null,
            isOwner: true,
            user_id: session.user.id
          } : null}
          existingOrder={order}
          preselectedRoomId={order?.room_id}
          preselectedTableNumber={order?.table_number}
        />
      )}

      {/* Change Table Modal */}
      {showChangeTableModal && order && (
        <ChangeTableModal
          isOpen={showChangeTableModal}
          onClose={() => setShowChangeTableModal(false)}
          order={order}
          onTableChanged={() => {
            console.log('🔄 Tavolo cambiato, ricarico dati...')
            setShowChangeTableModal(false)
            // Piccolo delay per assicurarsi che Supabase abbia committato le modifiche
            setTimeout(() => {
              loadData()
            }, 300)
          }}
          restaurantId={restaurant?.id}
        />
      )}
    </DashboardLayout>
  )
}

export default OrderDetailPage
