import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import { Card, Button, Badge, EmptyState, Spinner, Tabs } from '../components/ui'
import DashboardLayout from '../components/ui/DashboardLayout'
import CreateOrderModal from '../components/CreateOrderModal'

/**
 * Orders Page - Shopify-like Design System
 * Lista ordini con filtri, selezione multipla ed eliminazione
 */
function OrdersPage({ session }) {
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedOrders, setSelectedOrders] = useState([]) // Array di order IDs selezionati
  const [selectionMode, setSelectionMode] = useState(false) // Modalità selezione attiva
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768) // Mobile detection
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024) // Desktop detection
  const [showCreateOrder, setShowCreateOrder] = useState(false) // Modal per creare ordine

  useEffect(() => {
    if (session) {
      loadData()
      // Auto-reload disabilitato per non interferire con l'interazione utente
      // L'utente può ricaricare manualmente se necessario
      // const interval = setInterval(() => loadData(), 10000)
      // return () => clearInterval(interval)
    }
  }, [session])

  // Desktop/mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
      setIsDesktop(window.innerWidth >= 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
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

      // Load orders with explicit relationship aliases as per documentation
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product:products (name, price)
          ),
          table:tables (id, number),
          room:rooms (id, name),
          table_change_logs (
            id,
            changed_at,
            changed_by_name,
            old_room_name,
            old_table_number,
            new_room_name,
            new_table_number
          )
        `)
        .eq('restaurant_id', restaurantData.id)
        .order('created_at', { ascending: false })

      if (ordersError) {
        console.error('Errore caricamento ordini:', ordersError)
        throw ordersError
      }

      const active = ordersData?.filter(o => o.status !== 'completed' && o.status !== 'cancelled') || []
      const archived = ordersData?.filter(o => o.status === 'completed' || o.status === 'cancelled') || []

      // Ordina gli ordini attivi: Priority prima, poi dal più vecchio al più recente
      const sortedActive = active.sort((a, b) => {
        // Prima ordina per priority (true prima di false)
        if (a.is_priority_order !== b.is_priority_order) {
          return b.is_priority_order ? 1 : -1
        }
        // Poi ordina per data (più vecchi prima)
        return new Date(a.created_at) - new Date(b.created_at)
      })

      setOrders([...sortedActive, ...archived])
    } catch (error) {
      console.error('Errore caricamento ordini:', error)
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

  // Gestione selezione multipla
  const toggleOrderSelection = (orderId) => {
    if (selectedOrders.includes(orderId)) {
      const newSelection = selectedOrders.filter(id => id !== orderId)
      setSelectedOrders(newSelection)
      if (newSelection.length === 0) {
        // Era l'ultimo selezionato, esci dalla modalità selezione
        setSelectionMode(false)
      }
    } else {
      setSelectedOrders([...selectedOrders, orderId])
      if (!selectionMode) {
        setSelectionMode(true)
      }
    }
  }

  const handleOrderClick = (orderId) => {
    if (selectionMode) {
      toggleOrderSelection(orderId)
    } else {
      navigate(`/ordini/${orderId}`)
    }
  }

  const cancelSelection = () => {
    setSelectedOrders([])
    setSelectionMode(false)
  }

  const deleteSelectedOrders = async () => {
    if (selectedOrders.length === 0) return

    const confirmMsg = selectedOrders.length === 1
      ? 'Sei sicuro di voler eliminare questo ordine?'
      : `Sei sicuro di voler eliminare ${selectedOrders.length} ordini?`

    if (!confirm(confirmMsg)) return

    try {
      for (const orderId of selectedOrders) {
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
        await supabase
          .from('orders')
          .delete()
          .eq('id', orderId)
      }

      // Reset selezione
      setSelectedOrders([])
      setSelectionMode(false)

      // Ricarica ordini
      loadData()

      alert(selectedOrders.length === 1 ? 'Ordine eliminato' : 'Ordini eliminati')
    } catch (error) {
      console.error('Errore eliminazione ordini:', error)
      alert('Errore durante l\'eliminazione degli ordini')
    }
  }

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'In Attesa',
      confirmed: 'Confermato',
      preparing: 'In Preparazione',
      completed: 'Completato',
      cancelled: 'Annullato',
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

  const getFilteredOrders = () => {
    if (activeFilter === 'all') return orders
    if (activeFilter === 'active') {
      return orders.filter(
        (o) => o.status !== 'completed' && o.status !== 'cancelled'
      )
    }
    return orders.filter((o) => o.status === activeFilter)
  }

  const filteredOrders = getFilteredOrders()
  const isPremium = restaurant?.subscription_tier === 'premium'

  const pageHeaderStyles = {
    marginBottom: tokens.spacing.xl,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.spacing.md,
  }

  const titleStyles = {
    margin: 0,
    fontSize: isMobile ? tokens.typography.fontSize['2xl'] : tokens.typography.fontSize['3xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.black,
  }

  const tabsData = [
    { label: 'Tutti', value: 'all' },
    { label: 'Attivi', value: 'active' },
    { label: 'In Attesa', value: 'pending' },
    { label: 'Confermati', value: 'confirmed' },
    { label: 'In Preparazione', value: 'preparing' },
    { label: 'Completati', value: 'completed' },
  ]

  const dropdownStyles = {
    width: '100%',
    padding: tokens.spacing.md,
    fontSize: tokens.typography.fontSize.base,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.black,
    backgroundColor: tokens.colors.white,
    border: `${tokens.borders.width.thin} solid ${tokens.colors.gray[300]}`,
    borderRadius: tokens.borderRadius.md,
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23000' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: '40px',
  }

  const orderCardStyles = {
    marginBottom: tokens.spacing.md,
    cursor: 'pointer',
    transition: tokens.transitions.base,
  }

  const orderHeaderStyles = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
  }

  const orderIdStyles = {
    fontSize: tokens.typography.fontSize.base,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.black,
    fontFamily: tokens.typography.fontFamily.mono,
  }

  const orderDetailsStyles = {
    display: 'grid',
    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: isMobile ? tokens.spacing.sm : tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  }

  const detailLabelStyles = {
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.gray[600],
    marginBottom: tokens.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  }

  const detailValueStyles = {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.black,
    fontWeight: tokens.typography.fontWeight.medium,
  }

  const productsSectionStyles = {
    marginTop: tokens.spacing.md,
    marginBottom: tokens.spacing.md
  }

  const productsSectionTitleStyles = {
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.gray[600],
    marginBottom: tokens.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  }

  const productsListStyles = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.sm
  }

  const productItemStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.sm,
    backgroundColor: tokens.colors.gray[50],
    border: `1px solid ${tokens.colors.gray[200]}`,
    borderRadius: tokens.borderRadius.md,
    fontSize: tokens.typography.fontSize.xs
  }

  const productQuantityStyles = {
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.gray[600],
    minWidth: '30px'
  }

  const productNameStyles = {
    flex: 1,
    color: tokens.colors.black,
    fontWeight: tokens.typography.fontWeight.medium
  }

  const productVariantStyles = {
    color: tokens.colors.gray[600],
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: tokens.typography.fontWeight.normal
  }

  const productPriceStyles = {
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.black,
    whiteSpace: 'nowrap'
  }

  const stickyFooterStyles = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: tokens.colors.white,
    borderTop: `2px solid ${tokens.colors.info.base}`,
    padding: tokens.spacing.lg,
    boxShadow: tokens.shadows.lg,
    zIndex: 1000
  }

  const footerContentStyles = {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: '1200px',
    margin: '0 auto',
    gap: tokens.spacing.md
  }

  const selectedCountStyles = {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.black,
    flex: 1,
    textAlign: 'center'
  }

  if (loading) {
    return (
      <DashboardLayout
        restaurantName={restaurant?.name}
        userName={session?.user?.email}
        isPremium={isPremium}
        onLogout={handleLogout}
      >
        <Spinner size="lg" text="Caricamento ordini..." centered />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      restaurantName={restaurant?.name}
      userName={session?.user?.email}
      isPremium={isPremium}
      onLogout={handleLogout}
    >
      {/* Page Header */}
      <div style={pageHeaderStyles}>
        <h1 style={titleStyles}>Ordini</h1>
        <Button variant="primary" onClick={() => setShowCreateOrder(true)}>
          Nuovo Ordine
        </Button>
      </div>

      {/* Filters Tabs / Dropdown */}
      <div style={{ marginBottom: isMobile ? tokens.spacing.lg : tokens.spacing.xl }}>
        {isMobile ? (
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            style={dropdownStyles}
          >
            {tabsData.map(tab => (
              <option key={tab.value} value={tab.value}>
                {tab.label}
              </option>
            ))}
          </select>
        ) : (
          <Tabs tabs={tabsData} activeTab={activeFilter} onChange={setActiveFilter} />
        )}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <EmptyState
            title="Nessun ordine trovato"
            description={
              activeFilter === 'all'
                ? 'Non hai ancora ricevuto ordini. Quando i clienti ordineranno, appariranno qui.'
                : `Non ci sono ordini con stato "${getStatusLabel(activeFilter)}".`
            }
            action={() => navigate('/canali')}
            actionText="Condividi Menu"
            centered={false}
          />
        </Card>
      ) : (
        <div>
          {filteredOrders.map((order) => {
            const isSelected = selectedOrders.includes(order.id)

            let touchStartX = 0
            let touchStartY = 0
            let currentX = 0

            const handleTouchStart = (e) => {
              touchStartX = e.touches[0].clientX
              touchStartY = e.touches[0].clientY
            }

            const handleTouchMove = (e) => {
              if (!touchStartX) return
              currentX = e.touches[0].clientX
              const deltaX = currentX - touchStartX
              const deltaY = Math.abs(e.touches[0].clientY - touchStartY)

              // Solo se lo swipe è più orizzontale che verticale
              if (Math.abs(deltaX) > deltaY && deltaX > 20) {
                e.currentTarget.style.transform = `translateX(${Math.min(deltaX, 100)}px)`
              }
            }

            const handleTouchEnd = (e) => {
              const deltaX = currentX - touchStartX
              const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY)

              e.currentTarget.style.transform = 'translateX(0)'

              // Swipe verso destra di almeno 80px e più orizzontale che verticale
              if (deltaX > 80 && Math.abs(deltaX) > deltaY) {
                if (!selectionMode) {
                  setSelectionMode(true)
                  setSelectedOrders([order.id])
                } else {
                  toggleOrderSelection(order.id)
                }
              }

              touchStartX = 0
              touchStartY = 0
              currentX = 0
            }

            return (
              <div
                key={order.id}
                style={{
                  ...orderCardStyles,
                  borderLeft: order.is_priority_order ? `4px solid ${tokens.colors.warning.base}` : `4px solid ${tokens.colors.black}`,
                  backgroundColor: isSelected ? tokens.colors.info.light : tokens.colors.white,
                  transform: isSelected ? 'scale(0.98)' : 'scale(1)',
                  boxShadow: isSelected
                    ? `0 0 0 3px ${tokens.colors.info.base}, ${tokens.shadows.lg}`
                    : tokens.shadows.sm,
                  border: `1px solid ${isSelected ? tokens.colors.info.light : tokens.colors.gray[200]}`,
                  borderRadius: tokens.borderRadius.lg,
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <Card
                  variant="default"
                  padding="md"
                  hoverable={!selectionMode}
                  onClick={() => handleOrderClick(order.id)}
                  style={{ margin: 0, border: 'none', boxShadow: 'none' }}
                >
                  {/* Order Header */}
                  <div style={orderHeaderStyles}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.md }}>
                      {/* Checkbox visibile su desktop */}
                      {isDesktop && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          borderRadius: tokens.borderRadius.sm,
                          backgroundColor: isSelected ? tokens.colors.info.base : 'transparent',
                          border: isSelected ? 'none' : `2px solid ${tokens.colors.gray[300]}`,
                          transition: tokens.transitions.base
                        }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation()
                              toggleOrderSelection(order.id)
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: '20px',
                              height: '20px',
                              cursor: 'pointer',
                              accentColor: tokens.colors.info.base
                            }}
                          />
                        </div>
                      )}
                      {/* Indicatore selezione su mobile */}
                      {!isDesktop && selectionMode && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: isSelected ? tokens.colors.info.base : tokens.colors.gray[200],
                          transition: tokens.transitions.base
                        }}>
                          {isSelected && (
                            <span style={{ color: tokens.colors.white, fontSize: tokens.typography.fontSize.sm, fontWeight: tokens.typography.fontWeight.bold }}>✓</span>
                          )}
                        </div>
                      )}
                      <div style={orderIdStyles}>
                        #{order.order_number || order.id.substring(0, 8).toUpperCase()}
                      </div>
                    </div>
                    <Badge variant={getStatusVariant(order.status)}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  </div>

                  {/* Order Details */}
                  <div style={orderDetailsStyles}>
                    <div>
                      <div style={detailLabelStyles}>Sala / Tavolo</div>
                      <div style={detailValueStyles}>
                        {order.room?.name || 'N/A'} - Tavolo {order.table?.number || order.table_number || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div style={detailLabelStyles}>Data</div>
                      <div style={detailValueStyles}>
                        {formatDateTime(order.created_at)}
                      </div>
                    </div>
                    <div>
                      <div style={detailLabelStyles}>Totale</div>
                      <div style={detailValueStyles}>
                        €{order.total_amount.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div style={detailLabelStyles}>Prodotti</div>
                      <div style={detailValueStyles}>
                        {order.order_items?.length || 0} articoli
                      </div>
                    </div>
                  </div>

                  {/* Priority Badge */}
                  {order.is_priority_order && (
                    <div style={{ marginTop: tokens.spacing.sm }}>
                      <Badge variant="warning" size="sm">
                        Ordine Prioritario
                      </Badge>
                    </div>
                  )}
                </Card>
              </div>
            )
          })}
        </div>
      )}

      {/* Sticky Footer per eliminazione multipla */}
      {selectionMode && selectedOrders.length > 0 && (
        <div style={stickyFooterStyles}>
          <div style={footerContentStyles}>
            <Button variant="outline" onClick={cancelSelection}>
              Annulla
            </Button>
            <span style={selectedCountStyles}>
              {selectedOrders.length} {selectedOrders.length === 1 ? 'ordine selezionato' : 'ordini selezionati'}
            </span>
            <Button variant="danger" onClick={deleteSelectedOrders}>
              Elimina
            </Button>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateOrder && (
        <CreateOrderModal
          restaurantId={restaurant?.id}
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
          onClose={() => setShowCreateOrder(false)}
          onOrderCreated={() => {
            setShowCreateOrder(false)
            loadData() // Ricarica gli ordini
          }}
        />
      )}
    </DashboardLayout>
  )
}

export default OrdersPage
