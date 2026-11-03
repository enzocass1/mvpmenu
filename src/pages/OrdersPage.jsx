import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { softDeleteOrders } from '../lib/orderOperations'
import { tokens } from '../styles/tokens'
import { Card, Button, Badge, EmptyState, Spinner, PageHeader, ResponsiveTabs } from '../components/ui'
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
  }, [session, activeFilter])  // Ricarica quando cambia il filtro

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
      // Se tab "Eliminati" carica solo deleted, altrimenti escludi deleted
      let query = supabase
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

      // Filtra in base al tab selezionato
      if (activeFilter === 'deleted') {
        console.log('🗑️ Caricamento tab ELIMINATI')
        query = query.not('deleted_at', 'is', null)  // Solo ordini eliminati
      } else {
        query = query.is('deleted_at', null)  // Escludi ordini eliminati
      }

      const { data: ordersData, error: ordersError } = await query.order('created_at', { ascending: false })

      if (ordersError) {
        console.error('Errore caricamento ordini:', ordersError)
        throw ordersError
      }

      console.log(`📊 Ordini caricati (activeFilter: ${activeFilter}):`, ordersData?.length || 0)
      console.log('📋 Ordini dettaglio:', ordersData)

      const active = ordersData?.filter(o => o.status !== 'completed' && o.status !== 'cancelled') || []
      const archived = ordersData?.filter(o => o.status === 'completed' || o.status === 'cancelled') || []

      console.log(`✅ Active: ${active.length}, Archived: ${archived.length}`)

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
    // Trova l'ordine per verificare lo status
    const order = orders.find(o => o.id === orderId)

    // Non permettere selezione di ordini completed
    if (order && order.status === 'completed') {
      alert('Gli ordini completati non possono essere selezionati o eliminati.')
      return
    }

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

    // Filtra ordini completed - non possono essere eliminati
    const selectedOrdersData = orders.filter(o => selectedOrders.includes(o.id))
    const completedOrders = selectedOrdersData.filter(o => o.status === 'completed')

    if (completedOrders.length > 0) {
      alert('Non puoi eliminare ordini completati. Gli ordini completati sono archiviati e non possono essere modificati.')
      return
    }

    const confirmMsg = selectedOrders.length === 1
      ? 'Sei sicuro di voler eliminare questo ordine?'
      : `Sei sicuro di voler eliminare ${selectedOrders.length} ordini?`

    if (!confirm(confirmMsg)) return

    try {
      // Usa il servizio centralizzato per soft delete bulk
      const result = await softDeleteOrders(selectedOrders, session, restaurant)

      if (!result.success) {
        throw new Error(result.error)
      }

      console.log('✅ Bulk soft delete completato:', result.data)

      // Reset selezione
      setSelectedOrders([])
      setSelectionMode(false)

      // Ricarica ordini
      loadData()

      alert(selectedOrders.length === 1 ? 'Ordine spostato in Eliminati' : 'Ordini spostati in Eliminati')
    } catch (error) {
      console.error('❌ Errore eliminazione ordini:', error)
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
    // Tab "Eliminati": mostra tutti gli ordini caricati (già filtrati dalla query con deleted_at)
    if (activeFilter === 'deleted') {
      return orders
    }
    return orders.filter((o) => o.status === activeFilter)
  }

  const filteredOrders = getFilteredOrders()
  const isPremium = restaurant?.subscription_tier === 'premium'

  const tabsData = [
    { label: 'Tutti', value: 'all' },
    { label: 'Attivi', value: 'active' },
    { label: 'In Attesa', value: 'pending' },
    { label: 'In Preparazione', value: 'preparing' },
    { label: 'Completati', value: 'completed' },
    { label: 'Eliminati', value: 'deleted' },
  ]

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

  // Stili tabella ordini (stile Shopify)
  const thStyle = {
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    textAlign: 'left',
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.gray[600],
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  }
  const tdStyle = {
    padding: `${tokens.spacing.md} ${tokens.spacing.md}`,
    color: tokens.colors.black,
    verticalAlign: 'middle',
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
        permissions={['*']}
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
      permissions={['*']}
      onLogout={handleLogout}
    >
      <PageHeader
        title="Ordini"
        subtitle="Gestisci gli ordini del tuo locale"
        actions={<Button variant="primary" onClick={() => setShowCreateOrder(true)}>Nuovo Ordine</Button>}
      />

      <ResponsiveTabs tabs={tabsData} activeTab={activeFilter} onChange={setActiveFilter} />

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
        <Card padding="none" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: tokens.typography.fontSize.sm, whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ background: tokens.colors.gray[50], borderBottom: `1px solid ${tokens.colors.gray[200]}` }}>
                  {isDesktop && <th style={{ ...thStyle, width: 40 }}></th>}
                  <th style={thStyle}>Ordine</th>
                  <th style={thStyle}>Data</th>
                  <th style={thStyle}>Origine</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Totale</th>
                  <th style={thStyle}>Pagamento</th>
                  <th style={thStyle}>Evasione</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Articoli</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Portate</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const isSelected = selectedOrders.includes(order.id)
                  const items = order.order_items || []
                  const itemsCount = items.reduce((s, i) => s + (i.quantity || 1), 0)
                  const batchCount = new Set(items.map(i => i.batch_number || 1)).size
                  const hasTable = order.table?.number || order.table_number
                  const origin = hasTable ? `${order.room?.name || 'Sala'} · Tavolo ${order.table?.number || order.table_number}` : 'Banco'
                  const paid = order.payment_status === 'paid'
                  const unpaid = order.payment_status === 'unpaid'
                  const payLabel = paid ? 'Pagato' : unpaid ? 'Non pagato' : 'In attesa'
                  const payVariant = paid ? 'success' : unpaid ? 'error' : 'warning'
                  return (
                    <tr
                      key={order.id}
                      onClick={() => handleOrderClick(order.id)}
                      style={{
                        borderBottom: `1px solid ${tokens.colors.gray[100]}`,
                        cursor: 'pointer',
                        background: isSelected ? tokens.colors.info.light : tokens.colors.white,
                        borderLeft: `3px solid ${order.is_priority_order ? tokens.colors.warning.base : 'transparent'}`,
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = tokens.colors.gray[50] }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = tokens.colors.white }}
                    >
                      {isDesktop && (
                        <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={order.status === 'completed'}
                            onChange={() => toggleOrderSelection(order.id)}
                            style={{ width: 18, height: 18, cursor: order.status === 'completed' ? 'not-allowed' : 'pointer', accentColor: tokens.colors.info.base }}
                          />
                        </td>
                      )}
                      <td style={{ ...tdStyle, fontWeight: tokens.typography.fontWeight.semibold, fontFamily: tokens.typography.fontFamily.mono }}>
                        #{order.order_number || order.id.substring(0, 8).toUpperCase()}
                        {order.is_priority_order && <Badge variant="warning" size="sm" style={{ marginLeft: tokens.spacing.sm }}>Priorità</Badge>}
                      </td>
                      <td style={{ ...tdStyle, color: tokens.colors.gray[600] }}>{formatDateTime(order.created_at)}</td>
                      <td style={tdStyle}>{origin}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: tokens.typography.fontWeight.semibold }}>€{(order.total_amount || 0).toFixed(2)}</td>
                      <td style={tdStyle}><Badge variant={order.deleted_at ? 'default' : payVariant} size="sm">{payLabel}</Badge></td>
                      <td style={tdStyle}><Badge variant={order.deleted_at ? 'error' : getStatusVariant(order.status)} size="sm">{order.deleted_at ? 'Eliminato' : getStatusLabel(order.status)}</Badge></td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{itemsCount}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{batchCount}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
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
          source="ordini"
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
