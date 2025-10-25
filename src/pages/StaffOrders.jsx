import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import CreateOrderModal from '../components/CreateOrderModal'

function StaffOrders() {
  const { subdomain } = useParams()
  const navigate = useNavigate()
  const [staffSession, setStaffSession] = useState(null)
  const [restaurant, setRestaurant] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('today')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [lastOrderCount, setLastOrderCount] = useState(0)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [showCreateOrder, setShowCreateOrder] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState([]) // Array di order IDs selezionati
  const [selectionMode, setSelectionMode] = useState(false) // Modalità selezione attiva
  const [enableTableOrders, setEnableTableOrders] = useState(false) // Ordini al tavolo attivi
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768) // Desktop detection
  const longPressActiveRef = useRef(false) // Flag per tracciare se è attivo un long press

  useEffect(() => {
    checkAccess()
  }, [subdomain])

  useEffect(() => {
    if (staffSession?.restaurant_id) {
      loadOrders(staffSession.restaurant_id)
      loadRestaurantSettings(staffSession.restaurant_id)
      const interval = setInterval(() => {
        loadOrders(staffSession.restaurant_id)
      }, 10000)
      return () => clearInterval(interval)
    }
  }, [staffSession])

  useEffect(() => {
    if (orders.length > lastOrderCount && lastOrderCount > 0 && audioEnabled) {
      playNotificationSound()
    }
    setLastOrderCount(orders.length)
  }, [orders.length])

  // Timer per aggiornare il tempo di attesa in tempo reale
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000) // Aggiorna ogni secondo

    return () => clearInterval(interval)
  }, [])

  // Detect desktop/mobile
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()

      // Crea un suono di "ding" simile a Shopify con armoniche multiple
      const playTone = (frequency, startTime, duration, volume) => {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.value = frequency
        oscillator.type = 'sine'

        gainNode.gain.setValueAtTime(volume, startTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration)

        oscillator.start(startTime)
        oscillator.stop(startTime + duration)
      }

      const now = audioContext.currentTime

      // Nota principale (C6 - 1046.5 Hz) + armoniche per effetto campana
      playTone(1046.5, now, 0.3, 0.4)      // Fondamentale
      playTone(1046.5 * 2, now, 0.2, 0.15)  // Ottava superiore
      playTone(1046.5 * 3, now, 0.15, 0.08) // Quinta armonica

      // Seconda nota più bassa per effetto "ding-dong" (E6 - 1318.5 Hz)
      playTone(1318.5, now + 0.08, 0.25, 0.3)
      playTone(1318.5 * 2, now + 0.08, 0.18, 0.12)

    } catch (error) {
      console.error('Errore riproduzione suono:', error)
    }
  }

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled)
  }

  const checkAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('subdomain', subdomain)
        .single()

      if (restaurantError) throw restaurantError
      setRestaurant(restaurantData)

      if (session && session.user.id === restaurantData.user_id) {
        setIsOwner(true)
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

        const staff = JSON.parse(staffData)

        if (staff.subdomain !== subdomain) {
          navigate(`/staff/${subdomain}`)
          return
        }

        setStaffSession(staff)
      }
    } catch (error) {
      console.error('Errore verifica accesso:', error)
      navigate(`/staff/${subdomain}`)
    } finally {
      setLoading(false)
    }
  }

  const loadOrders = async (restaurantId) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product:products (name, price)
          )
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const active = data?.filter(o => o.status !== 'completed' && o.status !== 'cancelled') || []
      const archived = data?.filter(o => o.status === 'completed' || o.status === 'cancelled') || []

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
    }
  }

  const loadRestaurantSettings = async (restaurantId) => {
    try {
      const { data, error } = await supabase
        .from('restaurant_order_settings')
        .select('orders_enabled')
        .eq('restaurant_id', restaurantId)
        .single()

      if (error) throw error

      setEnableTableOrders(data?.orders_enabled || false)
    } catch (error) {
      console.error('❌ Errore caricamento impostazioni:', error)
      setEnableTableOrders(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('staff_session')
    navigate(`/staff/${subdomain}`)
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      // Get current order status before update
      const currentOrder = orders.find(o => o.id === orderId)

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
              previous_status: currentOrder?.status,
              table_number: currentOrder?.table_number
            }
          })
          .select()
      }

      // La timeline viene gestita automaticamente dal trigger del database

      loadOrders(staffSession.restaurant_id)
    } catch (error) {
      console.error('Errore aggiornamento stato:', error)
      alert('Errore durante l\'aggiornamento dello stato')
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'In Attesa'
      case 'confirmed': return 'Confermato'
      case 'preparing': return 'In Preparazione'
      case 'completed': return 'Completato'
      case 'cancelled': return 'Annullato'
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

  const calculateWaitTime = (order) => {
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

  const getNextAction = (status) => {
    switch (status) {
      case 'pending': return { label: 'Conferma', nextStatus: 'confirmed', color: '#000' }
      case 'confirmed': return { label: 'Prepara', nextStatus: 'preparing', color: '#000' }
      case 'preparing': return { label: 'Completa', nextStatus: 'completed', color: '#000' }
      default: return null
    }
  }

  // Gestione selezione multipla
  const toggleOrderSelection = (orderId) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId))
      if (selectedOrders.length === 1) {
        // Era l'ultimo selezionato, esci dalla modalità selezione
        setSelectionMode(false)
      }
    } else {
      setSelectedOrders([...selectedOrders, orderId])
    }
  }

  const handleOrderLongPress = (orderId) => {
    // Se non è in modalità selezione, entra in modalità e seleziona questo ordine
    if (!selectionMode) {
      setSelectionMode(true)
      setSelectedOrders([orderId])
    } else {
      // Se già in modalità selezione, fa toggle di questo ordine
      toggleOrderSelection(orderId)
    }
  }

  const handleOrderClick = (orderId) => {
    if (selectionMode) {
      toggleOrderSelection(orderId)
    } else {
      navigate(`/staff/${subdomain}/orders/${orderId}`)
    }
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

        // 3. Elimina la timeline (viene eliminata automaticamente con CASCADE, ma lo facciamo esplicitamente)
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
      loadOrders(staffSession.restaurant_id)

      alert(selectedOrders.length === 1 ? 'Ordine eliminato' : 'Ordini eliminati')
    } catch (error) {
      console.error('Errore eliminazione ordini:', error)
      alert('Errore durante l\'eliminazione degli ordini')
    }
  }

  const cancelSelection = () => {
    setSelectedOrders([])
    setSelectionMode(false)
  }

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'today': return 'Oggi'
      case 'yesterday': return 'Ieri'
      case 'last7days': return 'Ultimi 7 giorni'
      case 'last30days': return 'Ultimi 30 giorni'
      case 'custom': return 'Personalizzato'
      case 'all': return 'Tutti'
      default: return 'Seleziona periodo'
    }
  }

  const handleDateFilterChange = (filter) => {
    setDateFilter(filter)
    setShowDatePicker(false)
  }

  const applyCustomDateFilter = () => {
    if (customStartDate && customEndDate) {
      setDateFilter('custom')
      setShowDatePicker(false)
    } else {
      alert('Seleziona entrambe le date')
    }
  }

  const getFilteredOrders = () => {
    let filtered = orders

    // Filtro per stato
    if (activeFilter !== 'all') {
      filtered = filtered.filter(order => {
        if (activeFilter === 'completed') {
          return order.status === 'completed' || order.status === 'cancelled'
        }
        return order.status === activeFilter
      })
    }

    // Filtro per data
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const last7Days = new Date(today)
    last7Days.setDate(last7Days.getDate() - 7)
    const last30Days = new Date(today)
    last30Days.setDate(last30Days.getDate() - 30)

    filtered = filtered.filter(order => {
      const orderDate = new Date(order.created_at)

      switch (dateFilter) {
        case 'today':
          return orderDate >= today
        case 'yesterday':
          return orderDate >= yesterday && orderDate < today
        case 'last7days':
          return orderDate >= last7Days
        case 'last30days':
          return orderDate >= last30Days
        case 'custom':
          if (customStartDate && customEndDate) {
            const start = new Date(customStartDate)
            const end = new Date(customEndDate)
            end.setHours(23, 59, 59, 999)
            return orderDate >= start && orderDate <= end
          }
          return true
        case 'all':
          return true
        default:
          return true
      }
    })

    return filtered
  }

  const getOrderCountByStatus = (status) => {
    if (status === 'all') return getFilteredOrders().length
    if (status === 'completed') {
      return getFilteredOrders().filter(o => o.status === 'completed' || o.status === 'cancelled').length
    }
    return getFilteredOrders().filter(o => o.status === status).length
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={{ fontSize: '16px' }}>Caricamento...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <h1 style={styles.title}>{restaurant?.name}</h1>
            <div style={styles.staffInfo}>
              <span style={styles.staffName}>{staffSession?.name}</span>
              <span style={{
                ...styles.roleBadge,
                backgroundColor: staffSession?.role === 'manager' ? '#000' : '#666'
              }}>
                {staffSession?.role === 'manager' ? 'Manager' : 'Cameriere'}
              </span>
            </div>
          </div>
          <div style={styles.headerActions}>
            <button
              onClick={toggleAudio}
              style={{
                ...styles.iconButton,
                backgroundColor: audioEnabled ? '#000' : '#999'
              }}
              title={audioEnabled ? 'Disattiva audio' : 'Attiva audio'}
            >
              {audioEnabled ? '🔔' : '🔕'}
            </button>
            <button onClick={handleLogout} style={styles.logoutButton}>
              Esci
            </button>
          </div>
        </div>

        {/* Date Filter Dropdown */}
        <div style={styles.dateFilterContainer}>
          <div style={{ position: 'relative', width: '100%' }}>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              style={styles.dateDropdownButton}
            >
              {getDateFilterLabel()}
              <span style={{ marginLeft: 'auto' }}>▼</span>
            </button>

            {showDatePicker && (
              <div style={styles.dateDropdown}>
                <button onClick={() => handleDateFilterChange('today')} style={styles.dateOption}>
                  Oggi
                </button>
                <button onClick={() => handleDateFilterChange('yesterday')} style={styles.dateOption}>
                  Ieri
                </button>
                <button onClick={() => handleDateFilterChange('last7days')} style={styles.dateOption}>
                  Ultimi 7 giorni
                </button>
                <button onClick={() => handleDateFilterChange('last30days')} style={styles.dateOption}>
                  Ultimi 30 giorni
                </button>
                <button onClick={() => handleDateFilterChange('all')} style={styles.dateOption}>
                  Tutti
                </button>
                <div style={styles.customDateSection}>
                  <div style={styles.customDateLabel}>Data Personalizzata</div>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    style={styles.dateInput}
                    placeholder="Data inizio"
                  />
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    style={styles.dateInput}
                    placeholder="Data fine"
                  />
                  <button onClick={applyCustomDateFilter} style={styles.applyButton}>
                    Applica
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Filters - Grid Layout */}
        <div style={styles.statusFilters}>
          <button
            onClick={() => setActiveFilter('all')}
            style={{
              ...styles.filterButton,
              ...(activeFilter === 'all' ? styles.filterButtonActive : {})
            }}
          >
            Tutti ({getOrderCountByStatus('all')})
          </button>
          <button
            onClick={() => setActiveFilter('pending')}
            style={{
              ...styles.filterButton,
              ...(activeFilter === 'pending' ? styles.filterButtonActive : {})
            }}
          >
            In Attesa ({getOrderCountByStatus('pending')})
          </button>
          <button
            onClick={() => setActiveFilter('confirmed')}
            style={{
              ...styles.filterButton,
              ...(activeFilter === 'confirmed' ? styles.filterButtonActive : {})
            }}
          >
            Confermati ({getOrderCountByStatus('confirmed')})
          </button>
          <button
            onClick={() => setActiveFilter('preparing')}
            style={{
              ...styles.filterButton,
              ...(activeFilter === 'preparing' ? styles.filterButtonActive : {})
            }}
          >
            In Preparazione ({getOrderCountByStatus('preparing')})
          </button>
          <button
            onClick={() => setActiveFilter('completed')}
            style={{
              ...styles.filterButton,
              ...(activeFilter === 'completed' ? styles.filterButtonActive : {})
            }}
          >
            Completati ({getOrderCountByStatus('completed')})
          </button>
        </div>

        {/* Create Order Button - mostra solo se enable_table_orders è attivo */}
        {enableTableOrders && (
          <div style={styles.createOrderContainer}>
            <button
              onClick={() => setShowCreateOrder(true)}
              style={styles.createOrderButton}
            >
              Crea Ordine
            </button>
          </div>
        )}
      </div>

      {/* Orders List */}
      <div style={styles.content}>
        {getFilteredOrders().length === 0 ? (
          <div style={styles.emptyState}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '500', color: '#000' }}>
              Nessun ordine
            </h3>
            <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>
              Gli ordini appariranno qui quando i clienti inizieranno a ordinare
            </p>
          </div>
        ) : (
          <div style={styles.ordersList}>
            {getFilteredOrders().map((order) => {
              const nextAction = getNextAction(order.status)
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
                  console.log('🔄 Swipe detected!', { deltaX, selectionMode, orderId: order.id })
                  if (!selectionMode) {
                    console.log('✅ Activating selection mode')
                    setSelectionMode(true)
                    setSelectedOrders([order.id])
                  } else {
                    console.log('🔄 Toggling order selection')
                    toggleOrderSelection(order.id)
                  }
                }

                touchStartX = 0
                touchStartY = 0
                currentX = 0
              }

              const handleCardClick = () => {
                if (selectionMode) {
                  toggleOrderSelection(order.id)
                } else {
                  navigate(`/staff/${subdomain}/orders/${order.id}`)
                }
              }

              return (
                <div
                  key={order.id}
                  style={{
                    ...styles.orderCard,
                    borderLeft: order.is_priority_order ? '4px solid #FF9800' : '4px solid #000',
                    backgroundColor: isSelected ? '#E3F2FD' : '#fff',
                    transform: isSelected ? 'scale(0.98)' : 'scale(1)',
                    boxShadow: isSelected
                      ? '0 0 0 3px #2196F3, 0 6px 16px rgba(33, 150, 243, 0.4)'
                      : '0 4px 8px rgba(0,0,0,0.12)',
                    transition: 'all 0.2s ease',
                    border: '2px solid #e0e0e0'
                  }}
                  onClick={handleCardClick}
                  onContextMenu={(e) => {
                    e.preventDefault()
                  }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <div style={styles.cardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      {/* Checkbox visibile su desktop */}
                      {isDesktop && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          borderRadius: '4px',
                          backgroundColor: isSelected ? '#2196F3' : 'transparent',
                          border: isSelected ? 'none' : '2px solid #ddd',
                          transition: 'all 0.2s'
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
                              accentColor: '#2196F3'
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
                          backgroundColor: isSelected ? '#2196F3' : '#e0e0e0',
                          transition: 'all 0.2s'
                        }}>
                          {isSelected && (
                            <span style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>✓</span>
                          )}
                        </div>
                      )}
                      <div style={styles.orderId}>
                        #{order.id.substring(0, 8).toUpperCase()}
                        {order.is_priority_order && (
                          <span style={styles.priorityBadge}>Priority</span>
                        )}
                      </div>
                    </div>
                    <div style={styles.cardTime}>{formatDateTime(order.created_at)}</div>
                  </div>

                  <div style={styles.cardBody}>
                    <div style={styles.cardRow}>
                      <span style={styles.cardLabel}>Tavolo</span>
                      <span style={styles.cardValue}>Tavolo {order.table_number}</span>
                    </div>
                    <div style={styles.cardRow}>
                      <span style={styles.cardLabel}>Stato</span>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: getStatusColor(order.status) + '15',
                        color: getStatusColor(order.status)
                      }}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <div style={styles.cardRow}>
                      <span style={styles.cardLabel}>Tempo</span>
                      <span style={styles.cardValue}>{calculateWaitTime(order)}</span>
                    </div>

                    {/* Lista Prodotti con cornici */}
                    {order.order_items && order.order_items.length > 0 && (
                      <div style={styles.productsSection}>
                        <div style={styles.productsSectionTitle}>Prodotti:</div>
                        <div style={styles.productsList}>
                          {order.order_items.map((item, idx) => (
                            <div key={idx} style={styles.productItem}>
                              <span style={styles.productQuantity}>{item.quantity}x</span>
                              <span style={styles.productName}>
                                {item.product_name}
                                {item.variant_title && (
                                  <span style={styles.productVariant}> ({item.variant_title})</span>
                                )}
                              </span>
                              <span style={styles.productPrice}>€{item.subtotal.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={styles.cardRow}>
                      <span style={styles.cardLabel}>Totale</span>
                      <span style={styles.cardValueBold}>€{order.total_amount.toFixed(2)}</span>
                    </div>
                  </div>

                  {nextAction && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        updateOrderStatus(order.id, nextAction.nextStatus)
                      }}
                      style={styles.quickActionButton}
                    >
                      {nextAction.label}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Sticky Footer per eliminazione multipla */}
      {selectionMode && selectedOrders.length > 0 && (
        <div style={styles.stickyFooter}>
          <div style={styles.footerContent}>
            <button onClick={cancelSelection} style={styles.cancelButton}>
              Annulla
            </button>
            <span style={styles.selectedCount}>
              {selectedOrders.length} {selectedOrders.length === 1 ? 'ordine selezionato' : 'ordini selezionati'}
            </span>
            <button onClick={deleteSelectedOrders} style={styles.deleteButton}>
              Elimina
            </button>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateOrder && (
        <CreateOrderModal
          restaurantId={staffSession?.restaurant_id}
          onClose={() => setShowCreateOrder(false)}
          onOrderCreated={() => {
            loadOrders(staffSession.restaurant_id)
            setShowCreateOrder(false)
          }}
          staffSession={staffSession}
        />
      )}
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F5F5F5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    color: '#000'
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #ddd',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    gap: '12px'
  },
  title: {
    margin: '0 0 4px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#000'
  },
  staffInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap'
  },
  staffName: {
    fontSize: '12px',
    color: '#666'
  },
  roleBadge: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase'
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0
  },
  iconButton: {
    padding: '6px',
    fontSize: '16px',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    minWidth: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoutButton: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#000',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  dateFilterContainer: {
    padding: '0 16px 12px 16px'
  },
  dateDropdownButton: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#000',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    textAlign: 'left'
  },
  dateDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 100,
    maxHeight: '400px',
    overflowY: 'auto'
  },
  dateOption: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13px',
    color: '#000',
    backgroundColor: '#fff',
    border: 'none',
    borderBottom: '1px solid #f0f0f0',
    textAlign: 'left',
    cursor: 'pointer'
  },
  customDateSection: {
    padding: '12px',
    borderTop: '1px solid #ddd',
    backgroundColor: '#fafafa'
  },
  customDateLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#000',
    marginBottom: '8px'
  },
  dateInput: {
    width: '100%',
    padding: '8px',
    fontSize: '13px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    marginBottom: '8px',
    backgroundColor: '#fff',
    color: '#000'
  },
  applyButton: {
    width: '100%',
    padding: '8px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#000',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  statusFilters: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
    padding: '0 16px 12px 16px'
  },
  filterButton: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#666',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    textAlign: 'center'
  },
  filterButtonActive: {
    color: '#fff',
    backgroundColor: '#000',
    borderColor: '#000'
  },
  createOrderContainer: {
    padding: '12px 16px'
  },
  createOrderButton: {
    width: '100%',
    padding: '12px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#000',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  content: {
    padding: '16px'
  },
  emptyState: {
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '60px 20px',
    textAlign: 'center'
  },
  ordersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #ddd',
    overflow: 'hidden',
    cursor: 'pointer'
  },
  cardHeader: {
    padding: '10px 12px',
    borderBottom: '1px solid #f0f0f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  orderId: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#000',
    fontFamily: 'monospace',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  priorityBadge: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#FF9800',
    backgroundColor: '#FFF3E0',
    padding: '2px 6px',
    borderRadius: '10px'
  },
  cardTime: {
    fontSize: '11px',
    color: '#666'
  },
  cardBody: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  cardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardLabel: {
    fontSize: '11px',
    color: '#666',
    fontWeight: '500'
  },
  cardValue: {
    fontSize: '12px',
    color: '#000',
    fontWeight: '500'
  },
  cardValueBold: {
    fontSize: '13px',
    color: '#000',
    fontWeight: '600'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600'
  },
  productsSection: {
    marginTop: '8px',
    marginBottom: '8px'
  },
  productsSectionTitle: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#666',
    marginBottom: '6px'
  },
  productsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  productItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    backgroundColor: '#f9f9f9',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    fontSize: '11px'
  },
  productQuantity: {
    fontWeight: '600',
    color: '#666',
    minWidth: '30px'
  },
  productName: {
    flex: 1,
    color: '#000',
    fontWeight: '500'
  },
  productVariant: {
    color: '#666',
    fontSize: '10px',
    fontWeight: '400'
  },
  productPrice: {
    fontWeight: '600',
    color: '#000',
    whiteSpace: 'nowrap'
  },
  quickActionButton: {
    width: '100%',
    padding: '10px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#000',
    border: 'none',
    cursor: 'pointer',
    borderTop: '1px solid #ddd'
  },
  stickyFooter: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTop: '2px solid #2196F3',
    padding: '16px',
    boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
    zIndex: 1000
  },
  footerContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: '600px',
    margin: '0 auto',
    gap: '12px'
  },
  cancelButton: {
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#666',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  selectedCount: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center'
  },
  deleteButton: {
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#EF4444',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }
}

export default StaffOrders
