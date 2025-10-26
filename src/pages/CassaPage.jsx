import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import { Card, Button, Badge, Modal, Select, Input, Spinner, EmptyState } from '../components/ui'
import DashboardLayout from '../components/ui/DashboardLayout'
import CreateOrderModal from '../components/CreateOrderModal'

/**
 * Cassa (POS) Page - Shopify-like Design System
 * Modalità: Al Banco | Al Tavolo
 * Gestione ordini completa con scontrino fiscale e preconto
 */
function CassaPage({ session }) {
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('banco') // 'banco' | 'tavolo'
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [cart, setCart] = useState([])
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [variantOptions, setVariantOptions] = useState([])
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [productNotes, setProductNotes] = useState('')

  // Tavolo mode states
  const [rooms, setRooms] = useState([]) // Sale dal database con range tavoli
  const [tables, setTables] = useState([]) // Tavoli dal database con posizioni
  const [tableStats, setTableStats] = useState({}) // Stats per ogni tavolo {tableId: {status, revenue, productsCount}}
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [selectedTable, setSelectedTable] = useState(null)
  const [showTableModal, setShowTableModal] = useState(false)
  const [tableOrders, setTableOrders] = useState([])
  const [showRoomManagementModal, setShowRoomManagementModal] = useState(false)
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false)

  // Management modal states
  const [newRoomName, setNewRoomName] = useState('')
  const [newTableStart, setNewTableStart] = useState('')
  const [newTableEnd, setNewTableEnd] = useState('')
  const [editingRoom, setEditingRoom] = useState(null)

  // Drag and drop states (desktop only)
  const [draggingTable, setDraggingTable] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isLayoutEditMode, setIsLayoutEditMode] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)

  useEffect(() => {
    if (session) {
      loadData()
    }
  }, [session])

  // Detect mobile/desktop on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024)
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

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .order('name')

      if (categoriesError) {
        console.error('Errore caricamento categorie:', categoriesError)
      }

      setCategories(categoriesData || [])
      if (categoriesData?.length > 0) {
        setSelectedCategory(categoriesData[0].id)
      }

      // Load products through categories (products are linked to categories, not directly to restaurant)
      let productsData = []
      let productsError = null

      if (categoriesData && categoriesData.length > 0) {
        const categoryIds = categoriesData.map(cat => cat.id)
        const result = await supabase
          .from('products')
          .select(`
            *,
            variants:v_product_variants(*)
          `)
          .in('category_id', categoryIds)
          .eq('is_visible', true)
          .order('name')

        productsData = result.data
        productsError = result.error
      }

      if (productsError) {
        console.error('❌ Errore caricamento prodotti:')
        console.error('Codice:', productsError.code)
        console.error('Messaggio:', productsError.message)
        console.error('Dettagli:', productsError.details)
        console.error('Hint:', productsError.hint)
        console.error('Oggetto completo:', productsError)
      } else {
        console.log('✅ Prodotti caricati:', productsData?.length || 0)
      }

      setProducts(productsData || [])

      // Load rooms from database
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .order('name')

      if (roomsError) {
        console.error('❌ Errore caricamento sale:')
        console.error('Codice:', roomsError.code)
        console.error('Messaggio:', roomsError.message)
        console.error('Dettagli:', roomsError.details)
        console.error('⚠️ La tabella rooms non esiste ancora. Esegui la migration SQL!')
      } else {
        console.log('✅ Sale caricate:', roomsData?.length || 0)
      }

      setRooms(roomsData || [])
      if (roomsData && roomsData.length > 0) {
        setSelectedRoom(roomsData[0])
      }

      // Load tables from database (filtered by rooms)
      let tablesData = []
      let tablesError = null

      if (roomsData && roomsData.length > 0) {
        const roomIds = roomsData.map(room => room.id)
        const result = await supabase
          .from('tables')
          .select('*')
          .in('room_id', roomIds)
          .eq('is_active', true)
          .order('number')

        tablesData = result.data
        tablesError = result.error
      }

      if (tablesError) {
        console.error('❌ Errore caricamento tavoli:')
        console.error('Codice:', tablesError.code)
        console.error('Messaggio:', tablesError.message)
        console.error('Dettagli:', tablesError.details)
        console.error('⚠️ La tabella tables non esiste ancora. Esegui la migration SQL!')
      } else {
        console.log('✅ Tavoli caricati:', tablesData?.length || 0)
      }

      setTables(tablesData || [])

      // Load stats for all tables
      if (tablesData && tablesData.length > 0) {
        await loadTableStats(restaurantData.id, tablesData)
      }
    } catch (error) {
      console.error('Errore caricamento dati:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTableStats = async (restaurantId, tablesData) => {
    try {
      const stats = {}

      // Load all active orders for the restaurant
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('restaurant_id', restaurantId)
        .neq('status', 'completed')
        .neq('status', 'cancelled')

      // Calculate stats for each table
      for (const table of tablesData) {
        const tableOrders = ordersData?.filter(
          (order) => order.table_number === table.number
        ) || []

        if (tableOrders.length === 0) {
          stats[table.id] = { status: 'closed', revenue: 0, productsCount: 0, openedAt: null, products: [] }
        } else {
          const revenue = tableOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
          const productsCount = tableOrders.reduce(
            (sum, order) =>
              sum +
              (order.order_items?.reduce((count, item) => count + item.quantity, 0) || 0),
            0
          )

          // Get the oldest order's created_at as openedAt
          const sortedOrders = [...tableOrders].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
          const openedAt = sortedOrders[0]?.created_at || null

          // Get aggregated products list
          const productsMap = {}
          tableOrders.forEach(order => {
            order.order_items?.forEach(item => {
              const key = `${item.product_name}_${item.variant_title || ''}`
              if (productsMap[key]) {
                productsMap[key].quantity += item.quantity
              } else {
                productsMap[key] = {
                  name: item.variant_title ? `${item.product_name} (${item.variant_title})` : item.product_name,
                  quantity: item.quantity
                }
              }
            })
          })
          const products = Object.values(productsMap)

          const hasPending = tableOrders.some((o) => o.status === 'pending')
          const hasConfirmed = tableOrders.some(
            (o) => o.status === 'confirmed' || o.status === 'preparing'
          )

          let status = 'closed'
          if (hasPending) status = 'pending'
          else if (hasConfirmed) status = 'open'

          stats[table.id] = { status, revenue, productsCount, openedAt, products }
        }
      }

      setTableStats(stats)
    } catch (error) {
      console.error('Errore caricamento statistiche tavoli:', error)
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

  const handleProductClick = async (product) => {
    // Check if product has variants
    if (product.variants && product.variants.length > 0) {
      // Load variant options
      const { data: optionsData } = await supabase
        .from('v_product_variant_options')
        .select('*')
        .eq('product_id', product.id)
        .order('position')

      const optionsWithValues = await Promise.all(
        (optionsData || []).map(async (option) => {
          const { data: valuesData } = await supabase
            .from('v_product_variant_option_values')
            .select('*')
            .eq('option_id', option.id)
            .order('position')

          return {
            ...option,
            values: valuesData || [],
          }
        })
      )

      setSelectedProduct(product)
      setVariantOptions(optionsWithValues)
      setSelectedVariant(null)
      setProductNotes('')
      setShowVariantModal(true)
    } else {
      // Add directly to cart
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
      })
    }
  }

  const addToCart = (item) => {
    const existing = cart.find(
      (c) =>
        c.id === item.id &&
        c.variant_id === item.variant_id &&
        c.notes === item.notes
    )

    if (existing) {
      setCart(
        cart.map((c) =>
          c.id === item.id &&
          c.variant_id === item.variant_id &&
          c.notes === item.notes
            ? { ...c, quantity: c.quantity + 1 }
            : c
        )
      )
    } else {
      setCart([...cart, item])
    }
  }

  const handleAddVariantToCart = () => {
    if (!selectedVariant) {
      alert('Seleziona una variante')
      return
    }

    addToCart({
      id: selectedProduct.id,
      name: selectedProduct.name,
      price: selectedVariant.price,
      quantity: 1,
      variant_id: selectedVariant.id,
      variant_title: selectedVariant.title,
      notes: productNotes,
    })

    setShowVariantModal(false)
    setSelectedProduct(null)
    setProductNotes('')
  }

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  const updateQuantity = (index, delta) => {
    setCart(
      cart.map((item, i) => {
        if (i === index) {
          const newQty = item.quantity + delta
          return newQty > 0 ? { ...item, quantity: newQty } : item
        }
        return item
      })
    )
  }

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  const handleScontrinoFiscale = async () => {
    if (cart.length === 0) {
      alert('Carrello vuoto')
      return
    }
    alert('Funzione Scontrino Fiscale - Coming soon')
    // TODO: Integrate fiscal printer API
  }

  const handlePreconto = async () => {
    if (cart.length === 0) {
      alert('Carrello vuoto')
      return
    }
    alert('Funzione Preconto - Coming soon')
    // TODO: Generate preconto receipt
  }

  const handleTableClick = async (table) => {
    // Set the selected table and room, then open the create order modal
    setSelectedTable(table)
    setShowCreateOrderModal(true)
  }

  // Get table stats (revenue, products count, status)
  const getTableStats = async (table) => {
    // Get active orders for this table
    const { data: orders } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('restaurant_id', restaurant.id)
      .eq('table_number', table.number)
      .neq('status', 'completed')
      .neq('status', 'cancelled')

    if (!orders || orders.length === 0) {
      return { status: 'closed', revenue: 0, productsCount: 0 }
    }

    // Calculate stats
    const revenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
    const productsCount = orders.reduce((sum, order) =>
      sum + (order.order_items?.reduce((count, item) => count + item.quantity, 0) || 0), 0)

    // Determine status based on orders
    const hasPending = orders.some(o => o.status === 'pending')
    const hasConfirmed = orders.some(o => o.status === 'confirmed' || o.status === 'preparing')

    let status = 'closed'
    if (hasPending) status = 'pending'
    else if (hasConfirmed) status = 'open'

    return { status, revenue, productsCount }
  }

  // Update order status (same logic as StaffOrders)
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const currentOrder = tableOrders.find(o => o.id === orderId)

      const updates = {
        status: newStatus,
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

      // Reload table orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('restaurant_id', restaurant.id)
        .eq('table_number', selectedTable.table_number)
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })

      setTableOrders(ordersData || [])

      // Reload table stats to update colors and counts
      await loadTableStats(restaurant.id, tables)
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
      case 'pending': return tokens.colors.warning.DEFAULT
      case 'confirmed': return tokens.colors.info.DEFAULT
      case 'preparing': return tokens.colors.purple[500]
      case 'completed': return tokens.colors.success.DEFAULT
      case 'cancelled': return tokens.colors.error.DEFAULT
      default: return tokens.colors.gray[500]
    }
  }

  const getNextAction = (status) => {
    switch (status) {
      case 'pending': return { label: 'Conferma', nextStatus: 'confirmed' }
      case 'confirmed': return { label: 'Prepara', nextStatus: 'preparing' }
      case 'preparing': return { label: 'Completa', nextStatus: 'completed' }
      default: return null
    }
  }

  const handleInviaOrdine = async () => {
    if (!selectedTable || cart.length === 0) {
      alert('Seleziona tavolo e aggiungi prodotti')
      return
    }

    try {
      // Create or update order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurant.id,
          table_number: selectedTable.number,
          status: 'pending',
          total_amount: getCartTotal(),
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Insert order items
      const orderItems = cart.map((item) => ({
        order_id: orderData.id,
        product_id: item.id,
        product_name: item.name,
        product_price: item.price,
        quantity: item.quantity,
        variant_id: item.variant_id,
        variant_title: item.variant_title,
        notes: item.notes,
        subtotal: item.price * item.quantity,
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      alert('Ordine inviato con successo!')
      setCart([])
      setShowTableModal(false)
      setSelectedTable(null)
    } catch (error) {
      console.error('Errore invio ordine:', error)
      alert('Errore durante l\'invio dell\'ordine')
    }
  }

  // Helper function: Get tables for room from database
  const getTablesForRoom = (room) => {
    if (!room) return []
    return tables
      .filter((table) => table.room_id === room.id)
      .sort((a, b) => a.number - b.number)
  }

  // Drag and Drop Functions (Desktop only)
  const handleMouseDown = (e, table) => {
    if (isMobile || !isLayoutEditMode) return
    e.preventDefault()
    setDraggingTable(table)

    // Calculate offset between mouse and table position
    const rect = e.currentTarget.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  const handleMouseMove = (e) => {
    if (!draggingTable) return

    const container = document.getElementById('tables-container')
    if (!container) return

    const containerRect = container.getBoundingClientRect()

    // Calculate new position relative to container
    const newX = e.clientX - containerRect.left - dragOffset.x
    const newY = e.clientY - containerRect.top - dragOffset.y

    // Update table position in state (optimistic update)
    setTables((prevTables) =>
      prevTables.map((t) =>
        t.id === draggingTable.id
          ? { ...t, position_x: Math.max(0, newX), position_y: Math.max(0, newY) }
          : t
      )
    )
  }

  const handleMouseUp = async () => {
    if (!draggingTable) return

    // Save position to database
    try {
      const { error } = await supabase
        .from('tables')
        .update({
          position_x: draggingTable.position_x,
          position_y: draggingTable.position_y,
        })
        .eq('id', draggingTable.id)

      if (error) throw error
    } catch (error) {
      console.error('Errore salvataggio posizione tavolo:', error)
      // Reload tables to revert optimistic update
      loadData()
    }

    setDraggingTable(null)
    setDragOffset({ x: 0, y: 0 })
  }

  // Add global mouse move and up listeners for drag
  useEffect(() => {
    if (draggingTable) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)

      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [draggingTable, dragOffset])

  // Room Management Functions
  const createRoom = async () => {
    if (!newRoomName.trim()) {
      alert('Inserisci il nome della sala')
      return
    }

    const tableStart = parseInt(newTableStart)
    const tableEnd = parseInt(newTableEnd)

    if (!tableStart || !tableEnd || tableStart <= 0 || tableEnd < tableStart) {
      alert('Inserisci un range di tavoli valido (es: da 1 a 10)')
      return
    }

    try {
      // Step 1: Create the room
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .insert({
          restaurant_id: restaurant.id,
          name: newRoomName.trim(),
          is_active: true
        })
        .select()
        .single()

      if (roomError) throw roomError

      // Step 2: Create tables for this room
      const tablesToCreate = []
      const defaultSeats = 4 // Default number of seats per table

      for (let tableNumber = tableStart; tableNumber <= tableEnd; tableNumber++) {
        tablesToCreate.push({
          room_id: roomData.id,
          number: tableNumber,
          seats: defaultSeats,
          is_active: true
        })
      }

      const { error: tablesError } = await supabase
        .from('tables')
        .insert(tablesToCreate)

      if (tablesError) throw tablesError

      // Refresh rooms and tables lists
      const { data: updatedRooms } = await supabase
        .from('rooms')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('name')

      const { data: updatedTables } = await supabase
        .from('tables')
        .select('*')
        .in('room_id', updatedRooms.map(r => r.id))
        .eq('is_active', true)
        .order('number')

      setRooms(updatedRooms || [])
      setTables(updatedTables || [])

      // Auto-select the newly created room
      if (updatedRooms && updatedRooms.length > 0) {
        setSelectedRoom(updatedRooms.find(r => r.id === roomData.id))
      }

      setNewRoomName('')
      setNewTableStart('')
      setNewTableEnd('')

      alert(`Sala creata con successo! ${tablesToCreate.length} tavoli aggiunti.`)
    } catch (error) {
      console.error('Errore creazione sala:', error)
      console.error('Codice:', error.code)
      console.error('Messaggio:', error.message)
      alert('Errore durante la creazione della sala: ' + error.message)
    }
  }

  const updateRoom = async (roomId, updatedData) => {
    if (!updatedData.name.trim()) {
      alert('Inserisci il nome della sala')
      return
    }

    try {
      // Update only the room name
      const { error } = await supabase
        .from('rooms')
        .update({
          name: updatedData.name.trim()
        })
        .eq('id', roomId)

      if (error) throw error

      // Refresh rooms list
      const { data: updatedRooms } = await supabase
        .from('rooms')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('name')

      setRooms(updatedRooms || [])
      setEditingRoom(null)
      alert('Sala aggiornata con successo!')
    } catch (error) {
      console.error('Errore aggiornamento sala:', error)
      console.error('Codice:', error.code)
      console.error('Messaggio:', error.message)
      alert('Errore durante l\'aggiornamento della sala: ' + error.message)
    }
  }

  const deleteRoom = async (roomId) => {
    if (!confirm('Sei sicuro di voler eliminare questa sala e tutti i suoi tavoli?')) {
      return
    }

    try {
      // First delete all tables in this room
      const { error: tablesError } = await supabase
        .from('tables')
        .delete()
        .eq('room_id', roomId)

      if (tablesError) throw tablesError

      // Then delete the room
      const { error: roomError } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId)

      if (roomError) throw roomError

      // Refresh rooms list
      const { data: updatedRooms } = await supabase
        .from('rooms')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('name')

      setRooms(updatedRooms || [])

      if (selectedRoom?.id === roomId) {
        setSelectedRoom(updatedRooms[0] || null)
      }

      // Refresh tables list
      if (updatedRooms && updatedRooms.length > 0) {
        const roomIds = updatedRooms.map(r => r.id)
        const { data: updatedTables } = await supabase
          .from('tables')
          .select('*')
          .in('room_id', roomIds)
          .eq('is_active', true)
          .order('number')

        setTables(updatedTables || [])
      } else {
        setTables([])
      }

      alert('Sala eliminata con successo!')
    } catch (error) {
      console.error('Errore eliminazione sala:', error)
      console.error('Codice:', error.code)
      console.error('Messaggio:', error.message)
      alert('Errore durante l\'eliminazione della sala: ' + error.message)
    }
  }

  const isPremium = restaurant?.subscription_tier === 'premium'

  const filteredProducts = products.filter(
    (p) => !selectedCategory || p.category_id === selectedCategory
  )

  // Generate tables from selected room's range
  const filteredTables = getTablesForRoom(selectedRoom)

  // Styles
  const pageHeaderStyles = {
    marginBottom: tokens.spacing.lg,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.spacing.md,
  }

  const titleStyles = {
    margin: 0,
    fontSize: tokens.typography.fontSize['2xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.black,
  }

  const modeToggleStyles = {
    display: 'flex',
    gap: tokens.spacing.sm,
    backgroundColor: tokens.colors.gray[100],
    padding: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.md,
  }

  const modeButtonStyles = (isActive) => ({
    padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    backgroundColor: isActive ? tokens.colors.white : 'transparent',
    color: isActive ? tokens.colors.black : tokens.colors.gray[600],
    border: 'none',
    borderRadius: tokens.borderRadius.sm,
    cursor: 'pointer',
    transition: tokens.transitions.base,
    fontFamily: tokens.typography.fontFamily.base,
  })

  const layoutStyles = {
    display: 'grid',
    gridTemplateColumns: !isMobile ? '1fr 400px' : '1fr',
    gap: tokens.spacing.lg,
    height: 'calc(100vh - 200px)',
  }

  const productsAreaStyles = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.md,
    overflow: 'hidden',
  }

  const categoriesBarStyles = {
    display: 'flex',
    gap: tokens.spacing.sm,
    overflowX: 'auto',
    paddingBottom: tokens.spacing.sm,
  }

  const categoryButtonStyles = (isActive) => ({
    padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    backgroundColor: isActive ? tokens.colors.black : tokens.colors.white,
    color: isActive ? tokens.colors.white : tokens.colors.black,
    border: `${tokens.borders.width.thin} solid ${
      isActive ? tokens.colors.black : tokens.colors.gray[300]
    }`,
    borderRadius: tokens.borderRadius.md,
    cursor: 'pointer',
    transition: tokens.transitions.base,
    fontFamily: tokens.typography.fontFamily.base,
    whiteSpace: 'nowrap',
  })

  const productsGridStyles = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 120px), 1fr))',
    gap: tokens.spacing.md,
    overflowY: 'auto',
    padding: tokens.spacing.sm,
  }

  const productCardStyles = {
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.white,
    borderWidth: tokens.borders.width.thin,
    borderStyle: 'solid',
    borderColor: tokens.colors.gray[300],
    borderRadius: tokens.borderRadius.md,
    cursor: 'pointer',
    transition: tokens.transitions.base,
    textAlign: 'center',
    minHeight: '100px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  }

  const cartAreaStyles = {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colors.white,
    border: `${tokens.borders.width.thin} solid ${tokens.colors.gray[200]}`,
    borderRadius: tokens.borderRadius.lg,
    overflow: 'hidden',
  }

  const cartHeaderStyles = {
    padding: tokens.spacing.lg,
    borderBottom: `${tokens.borders.width.thin} solid ${tokens.colors.gray[200]}`,
  }

  const cartItemsStyles = {
    flex: 1,
    overflowY: 'auto',
    padding: tokens.spacing.md,
  }

  const cartFooterStyles = {
    padding: tokens.spacing.lg,
    borderTop: `${tokens.borders.width.thin} solid ${tokens.colors.gray[200]}`,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.md,
  }

  if (loading) {
    return (
      <DashboardLayout
        restaurantName={restaurant?.name}
        userName={session?.user?.email}
        isPremium={isPremium}
        onLogout={handleLogout}
      >
        <Spinner size="lg" text="Caricamento cassa..." centered />
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
        <h1 style={titleStyles}>Cassa</h1>

        {/* Mode Toggle */}
        <div style={modeToggleStyles}>
          <button
            style={modeButtonStyles(mode === 'banco')}
            onClick={() => setMode('banco')}
          >
            Al Banco
          </button>
          <button
            style={modeButtonStyles(mode === 'tavolo')}
            onClick={() => setMode('tavolo')}
          >
            Al Tavolo
          </button>
        </div>
      </div>

      {/* MODALITÀ AL BANCO */}
      {mode === 'banco' && (
        <div style={layoutStyles}>
          {/* Products Area */}
          <div style={productsAreaStyles}>
            {/* Categories Bar */}
            <div style={categoriesBarStyles}>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  style={categoryButtonStyles(selectedCategory === cat.id)}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            <div style={productsGridStyles}>
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  style={productCardStyles}
                  onClick={() => handleProductClick(product)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = tokens.colors.gray[50]
                    e.currentTarget.style.borderColor = tokens.colors.black
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = tokens.colors.white
                    e.currentTarget.style.borderColor = tokens.colors.gray[300]
                  }}
                >
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.sm,
                      fontWeight: tokens.typography.fontWeight.medium,
                      color: tokens.colors.black,
                      marginBottom: tokens.spacing.xs,
                    }}
                  >
                    {product.name}
                  </div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.base,
                      fontWeight: tokens.typography.fontWeight.semibold,
                      color: tokens.colors.black,
                    }}
                  >
                    €{product.price.toFixed(2)}
                  </div>
                  {product.variants && product.variants.length > 0 && (
                    <Badge variant="info" size="sm" style={{ marginTop: tokens.spacing.xs }}>
                      Varianti
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Cart Area */}
          <div style={cartAreaStyles}>
            <div style={cartHeaderStyles}>
              <h3 style={{ margin: 0, fontSize: tokens.typography.fontSize.lg }}>
                Carrello
              </h3>
            </div>

            <div style={cartItemsStyles}>
              {cart.length === 0 ? (
                <EmptyState
                  title="Carrello vuoto"
                  description="Aggiungi prodotti per iniziare"
                  centered={false}
                />
              ) : (
                cart.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      padding: tokens.spacing.md,
                      backgroundColor: tokens.colors.gray[50],
                      borderRadius: tokens.borderRadius.md,
                      marginBottom: tokens.spacing.sm,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: tokens.spacing.xs,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: tokens.typography.fontSize.sm,
                            fontWeight: tokens.typography.fontWeight.medium,
                          }}
                        >
                          {item.name}
                          {item.variant_title && (
                            <Badge
                              variant="default"
                              size="sm"
                              style={{ marginLeft: tokens.spacing.sm }}
                            >
                              {item.variant_title}
                            </Badge>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: tokens.typography.fontSize.xs,
                            color: tokens.colors.gray[600],
                          }}
                        >
                          €{item.price.toFixed(2)} x {item.quantity}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: tokens.typography.fontSize.base,
                          fontWeight: tokens.typography.fontWeight.semibold,
                        }}
                      >
                        €{(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: tokens.spacing.sm,
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', gap: tokens.spacing.sm }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(index, -1)}
                        >
                          -
                        </Button>
                        <span
                          style={{
                            padding: `0 ${tokens.spacing.md}`,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(index, 1)}
                        >
                          +
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(index)}
                      >
                        Rimuovi
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={cartFooterStyles}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: tokens.typography.fontSize.xl,
                  fontWeight: tokens.typography.fontWeight.bold,
                }}
              >
                <span>Totale</span>
                <span>€{getCartTotal().toFixed(2)}</span>
              </div>

              <Button
                variant="primary"
                fullWidth
                onClick={handleScontrinoFiscale}
                disabled={cart.length === 0}
              >
                Scontrino Fiscale
              </Button>
              <Button
                variant="outline"
                fullWidth
                onClick={handlePreconto}
                disabled={cart.length === 0}
              >
                Preconto
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODALITÀ AL TAVOLO */}
      {mode === 'tavolo' && (
        <div>
          {/* Controls Bar */}
          <div style={{
            marginBottom: tokens.spacing.lg,
            display: 'flex',
            gap: tokens.spacing.md,
            alignItems: 'flex-end',
            flexWrap: 'wrap'
          }}>
            {/* Sala Selector */}
            <div style={{ flex: 1, minWidth: '250px', maxWidth: '300px' }}>
              {rooms.length > 0 ? (
                <Select
                  label="Seleziona Sala"
                  value={selectedRoom?.id || ''}
                  onChange={(e) => {
                    const room = rooms.find((r) => r.id === e.target.value)
                    setSelectedRoom(room)
                  }}
                  options={rooms.map((room) => ({
                    value: room.id,
                    label: room.name,
                  }))}
                />
              ) : (
                <EmptyState
                  title="Nessuna sala"
                  description="Crea una sala per iniziare"
                  centered={false}
                />
              )}
            </div>

            {/* Room Management Button */}
            <Button
              variant="outline"
              onClick={() => setShowRoomManagementModal(true)}
            >
              Gestione Sale
            </Button>
          </div>


          {/* Tables Display */}
          {filteredTables.length === 0 ? (
            <EmptyState
              title="Nessun tavolo"
              description="Vai in Gestione Sale per creare una sala con tavoli"
              centered
            />
          ) : isMobile ? (
            // MOBILE: Grid 2x2 ordinata per numero tavolo
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: tokens.spacing.md,
              }}
            >
              {filteredTables.map((table) => {
                const stats = tableStats[table.id] || { status: 'closed', revenue: 0, productsCount: 0 }
                const bgColor =
                  stats.status === 'pending'
                    ? tokens.colors.warning[50]
                    : stats.status === 'open'
                    ? tokens.colors.info[50]
                    : tokens.colors.white
                const borderColor =
                  stats.status === 'pending'
                    ? tokens.colors.warning.DEFAULT
                    : stats.status === 'open'
                    ? tokens.colors.info.DEFAULT
                    : tokens.colors.gray[300]

                return (
                  <div
                    key={table.id}
                    style={{
                      padding: tokens.spacing.lg,
                      backgroundColor: bgColor,
                      borderWidth: tokens.borders.width.medium,
                      borderStyle: 'solid',
                      borderColor: borderColor,
                      borderRadius: tokens.borderRadius.md,
                      textAlign: 'center',
                      minHeight: '120px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: tokens.transitions.base,
                    }}
                    onClick={() => handleTableClick(table)}
                  >
                    <div
                      style={{
                        fontSize: tokens.typography.fontSize['2xl'],
                        fontWeight: tokens.typography.fontWeight.bold,
                        color: tokens.colors.black,
                        marginBottom: tokens.spacing.xs,
                      }}
                    >
                      {table.number}
                    </div>
                    <div
                      style={{
                        fontSize: tokens.typography.fontSize.xs,
                        color: tokens.colors.gray[600],
                        marginBottom: tokens.spacing.sm,
                      }}
                    >
                      Tavolo
                    </div>
                    {stats.status !== 'closed' && (
                      <div style={{ fontSize: tokens.typography.fontSize.xs, color: tokens.colors.gray[700] }}>
                        <div>€{stats.revenue.toFixed(2)}</div>
                        <div>{stats.productsCount} prodotti</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            // DESKTOP: Griglia ordinata con dettagli ordini
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
                gap: tokens.spacing.md,
              }}
            >
              {filteredTables.map((table) => {
                const stats = tableStats[table.id] || { status: 'closed', revenue: 0, productsCount: 0, openedAt: null, products: [] }
                const bgColor =
                  stats.status === 'pending'
                    ? tokens.colors.warning[50]
                    : stats.status === 'open'
                    ? tokens.colors.info[50]
                    : tokens.colors.white
                const borderColor =
                  stats.status === 'pending'
                    ? tokens.colors.warning.DEFAULT
                    : stats.status === 'open'
                    ? tokens.colors.info.DEFAULT
                    : tokens.colors.gray[300]

                // Calculate time since opened
                let timeOpened = ''
                if (stats.openedAt) {
                  const minutes = Math.floor((Date.now() - new Date(stats.openedAt).getTime()) / 60000)
                  if (minutes < 60) {
                    timeOpened = `${minutes} min`
                  } else {
                    const hours = Math.floor(minutes / 60)
                    const mins = minutes % 60
                    timeOpened = `${hours}h ${mins}m`
                  }
                }

                return (
                  <Card
                    key={table.id}
                    onClick={() => handleTableClick(table)}
                    style={{
                      backgroundColor: bgColor,
                      borderColor: borderColor,
                      cursor: 'pointer',
                      transition: tokens.transitions.base,
                      minHeight: '180px',
                    }}
                    hoverable
                  >
                    <div style={{ padding: tokens.spacing.lg }}>
                      {/* Header: Numero tavolo */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: tokens.spacing.md,
                      }}>
                        <div style={{
                          fontSize: tokens.typography.fontSize.xl,
                          fontWeight: tokens.typography.fontWeight.bold,
                          color: tokens.colors.black,
                        }}>
                          Tavolo {table.number}
                        </div>
                        {stats.status !== 'closed' && (
                          <Badge variant={stats.status === 'pending' ? 'warning' : 'info'}>
                            {stats.status === 'pending' ? 'In attesa' : 'Aperto'}
                          </Badge>
                        )}
                      </div>

                      {/* Body: Dettagli ordine */}
                      {stats.status !== 'closed' ? (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: tokens.spacing.sm,
                        }}>
                          {/* Tempo apertura */}
                          {timeOpened && (
                            <div style={{
                              fontSize: tokens.typography.fontSize.sm,
                              color: tokens.colors.gray[600],
                            }}>
                              🕐 Aperto da {timeOpened}
                            </div>
                          )}

                          {/* Revenue */}
                          <div style={{
                            fontSize: tokens.typography.fontSize.lg,
                            fontWeight: tokens.typography.fontWeight.semibold,
                            color: tokens.colors.black,
                          }}>
                            €{stats.revenue.toFixed(2)}
                          </div>

                          {/* Prodotti ordinati */}
                          {stats.products && stats.products.length > 0 && (
                            <div style={{
                              fontSize: tokens.typography.fontSize.sm,
                              color: tokens.colors.gray[700],
                              marginTop: tokens.spacing.xs,
                            }}>
                              {stats.products.slice(0, 3).map((p, i) => (
                                <div key={i} style={{ marginBottom: '2px' }}>
                                  {p.quantity}x {p.name}
                                </div>
                              ))}
                              {stats.products.length > 3 && (
                                <div style={{
                                  fontSize: tokens.typography.fontSize.xs,
                                  color: tokens.colors.gray[500],
                                  marginTop: '4px',
                                }}>
                                  +{stats.products.length - 3} altri prodotti
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{
                          textAlign: 'center',
                          padding: tokens.spacing.lg,
                          color: tokens.colors.gray[500],
                          fontSize: tokens.typography.fontSize.sm,
                        }}>
                          Tavolo disponibile
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Variant Selection Modal */}
      <Modal
        isOpen={showVariantModal}
        onClose={() => setShowVariantModal(false)}
        size="md"
      >
        <Modal.Header>
          <Modal.Title>{selectedProduct?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
            {variantOptions.map((option) => (
              <div key={option.id}>
                <div
                  style={{
                    fontSize: tokens.typography.fontSize.sm,
                    fontWeight: tokens.typography.fontWeight.medium,
                    marginBottom: tokens.spacing.sm,
                  }}
                >
                  {option.name}
                </div>
                <div style={{ display: 'flex', gap: tokens.spacing.sm, flexWrap: 'wrap' }}>
                  {option.values.map((value) => {
                    const variant = selectedProduct?.variants?.find(
                      (v) => v.title.includes(value.value)
                    )
                    return (
                      <button
                        key={value.id}
                        onClick={() => setSelectedVariant(variant)}
                        style={{
                          padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
                          backgroundColor:
                            selectedVariant?.id === variant?.id
                              ? tokens.colors.black
                              : tokens.colors.white,
                          color:
                            selectedVariant?.id === variant?.id
                              ? tokens.colors.white
                              : tokens.colors.black,
                          border: `${tokens.borders.width.thin} solid ${tokens.colors.gray[300]}`,
                          borderRadius: tokens.borderRadius.md,
                          cursor: 'pointer',
                          fontSize: tokens.typography.fontSize.sm,
                          fontFamily: tokens.typography.fontFamily.base,
                        }}
                      >
                        {value.value}
                        {variant && (
                          <div style={{ fontSize: tokens.typography.fontSize.xs, marginTop: '2px' }}>
                            €{variant.price.toFixed(2)}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            <Input
              label="Note (opzionale)"
              placeholder="Aggiungi note per il prodotto..."
              value={productNotes}
              onChange={(e) => setProductNotes(e.target.value)}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline" onClick={() => setShowVariantModal(false)}>
            Annulla
          </Button>
          <Button variant="primary" onClick={handleAddVariantToCart}>
            Aggiungi al Carrello
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Table Management Modal */}
      <Modal
        isOpen={showTableModal}
        onClose={() => {
          setShowTableModal(false)
          setSelectedTable(null)
          setTableOrders([])
        }}
        size="lg"
      >
        <Modal.Header>
          <Modal.Title>Tavolo {selectedTable?.table_number}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
            {/* Ordini Esistenti */}
            <div>
              <h4
                style={{
                  margin: 0,
                  marginBottom: tokens.spacing.md,
                  fontSize: tokens.typography.fontSize.base,
                  fontWeight: tokens.typography.fontWeight.semibold,
                }}
              >
                Ordini al Tavolo
              </h4>
              {tableOrders.length === 0 ? (
                <EmptyState
                  title="Nessun ordine"
                  description="Non ci sono ordini aperti per questo tavolo"
                  centered={false}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
                  {tableOrders.map((order) => {
                    const nextAction = getNextAction(order.status)

                    return (
                      <div
                        key={order.id}
                        style={{
                          padding: tokens.spacing.lg,
                          backgroundColor: tokens.colors.white,
                          border: `${tokens.borders.width.thin} solid ${tokens.colors.gray[300]}`,
                          borderRadius: tokens.borderRadius.lg,
                        }}
                      >
                        {/* Order Header */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: tokens.spacing.md,
                            paddingBottom: tokens.spacing.md,
                            borderBottom: `${tokens.borders.width.thin} solid ${tokens.colors.gray[200]}`,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: tokens.typography.fontSize.sm,
                                color: tokens.colors.gray[600],
                                marginBottom: tokens.spacing.xs,
                              }}
                            >
                              Ordine #{order.id.slice(0, 8)}
                            </div>
                            <div
                              style={{
                                fontSize: tokens.typography.fontSize.xs,
                                color: tokens.colors.gray[500],
                              }}
                            >
                              {new Date(order.created_at).toLocaleString('it-IT', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit',
                              })}
                            </div>
                          </div>
                          <Badge
                            variant="default"
                            style={{
                              backgroundColor: getStatusColor(order.status),
                              color: tokens.colors.white,
                            }}
                          >
                            {getStatusLabel(order.status)}
                          </Badge>
                        </div>

                        {/* Order Items */}
                        <div style={{ marginBottom: tokens.spacing.md }}>
                          {order.order_items?.map((item, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: `${tokens.spacing.sm} 0`,
                                fontSize: tokens.typography.fontSize.sm,
                              }}
                            >
                              <div>
                                <span style={{ fontWeight: tokens.typography.fontWeight.medium }}>
                                  {item.quantity}x
                                </span>{' '}
                                {item.product_name}
                                {item.variant_title && (
                                  <span style={{ color: tokens.colors.gray[600] }}>
                                    {' '}
                                    - {item.variant_title}
                                  </span>
                                )}
                                {item.notes && (
                                  <div
                                    style={{
                                      fontSize: tokens.typography.fontSize.xs,
                                      color: tokens.colors.gray[500],
                                      fontStyle: 'italic',
                                      marginTop: tokens.spacing.xs,
                                    }}
                                  >
                                    Note: {item.notes}
                                  </div>
                                )}
                              </div>
                              <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                                €{(item.price * item.quantity).toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Order Footer */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingTop: tokens.spacing.md,
                            borderTop: `${tokens.borders.width.thin} solid ${tokens.colors.gray[200]}`,
                          }}
                        >
                          <div
                            style={{
                              fontSize: tokens.typography.fontSize.base,
                              fontWeight: tokens.typography.fontWeight.bold,
                            }}
                          >
                            Totale: €{order.total_amount?.toFixed(2) || '0.00'}
                          </div>
                          {nextAction && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, nextAction.nextStatus)}
                            >
                              {nextAction.label}
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <div style={{ display: 'flex', gap: tokens.spacing.md, width: '100%', flexWrap: 'wrap' }}>
            <Button
              variant="outline"
              onClick={handleScontrinoFiscale}
              disabled={tableOrders.length === 0}
            >
              Scontrino Fiscale
            </Button>
            <Button
              variant="outline"
              onClick={handlePreconto}
              disabled={tableOrders.length === 0}
            >
              Preconto
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                // TODO: Implement modify order functionality
                alert('Funzionalità Modifica Ordine in arrivo')
              }}
              disabled={tableOrders.length === 0}
              style={{ flex: 1 }}
            >
              Modifica Ordine
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Room Management Modal - Gestione Sale */}
      <Modal
        isOpen={showRoomManagementModal}
        onClose={() => {
          setShowRoomManagementModal(false)
          setEditingRoom(null)
          setNewRoomName('')
          setNewTableStart('')
          setNewTableEnd('')
        }}
        size="lg"
      >
        <Modal.Header>
          <Modal.Title>Gestione Sale</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div>
              {/* Create Room Form */}
              <Card>
                <div style={{ padding: tokens.spacing.lg }}>
                  <h3 style={{
                    margin: 0,
                    marginBottom: tokens.spacing.md,
                    fontSize: tokens.typography.fontSize.lg,
                    fontWeight: tokens.typography.fontWeight.semibold,
                  }}>
                    Crea Nuova Sala
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
                    <Input
                      label="Nome Sala"
                      placeholder="Es: Sala Principale"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: tokens.spacing.md }}>
                      <div style={{ flex: 1 }}>
                        <Input
                          label="Tavolo Inizio"
                          type="number"
                          placeholder="Es: 1"
                          value={newTableStart}
                          onChange={(e) => setNewTableStart(e.target.value)}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <Input
                          label="Tavolo Fine"
                          type="number"
                          placeholder="Es: 10"
                          value={newTableEnd}
                          onChange={(e) => setNewTableEnd(e.target.value)}
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        padding: tokens.spacing.sm,
                        backgroundColor: tokens.colors.info.light,
                        borderRadius: tokens.borderRadius.md,
                        fontSize: tokens.typography.fontSize.sm,
                        color: tokens.colors.gray[700],
                      }}
                    >
                      I numeri tavolo sono globali. Esempio: Sala 1 (1-4), Sala 2 (5-8), totale 8 tavoli.
                    </div>
                    <Button variant="primary" onClick={createRoom} fullWidth>
                      Crea Sala
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Rooms List */}
              <div style={{ marginTop: tokens.spacing.xl }}>
                <h3 style={{
                  margin: 0,
                  marginBottom: tokens.spacing.lg,
                  fontSize: tokens.typography.fontSize.lg,
                  fontWeight: tokens.typography.fontWeight.semibold,
                }}>
                  Sale Esistenti ({rooms.length})
                </h3>

                {rooms.length === 0 ? (
                  <EmptyState
                    title="Nessuna sala"
                    description="Crea la prima sala per il tuo ristorante"
                    centered
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
                    {rooms.map((room) => (
                      <Card key={room.id}>
                        <div style={{
                          padding: tokens.spacing.lg,
                        }}>
                          {editingRoom?.id === room.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
                              <Input
                                label="Nome Sala"
                                value={editingRoom.name}
                                onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                              />
                              <div style={{
                                fontSize: tokens.typography.fontSize.sm,
                                color: tokens.colors.gray[600],
                                fontStyle: 'italic'
                              }}>
                                Per modificare i tavoli, elimina e ricrea la sala
                              </div>
                              <div style={{ display: 'flex', gap: tokens.spacing.sm, justifyContent: 'flex-end' }}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingRoom(null)}
                                >
                                  Annulla
                                </Button>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => updateRoom(room.id, editingRoom)}
                                >
                                  Salva
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: tokens.spacing.md,
                            }}>
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontSize: tokens.typography.fontSize.lg,
                                  fontWeight: tokens.typography.fontWeight.semibold,
                                  color: tokens.colors.black,
                                }}>
                                  {room.name}
                                </div>
                                <div style={{
                                  fontSize: tokens.typography.fontSize.sm,
                                  color: tokens.colors.gray[600],
                                  marginTop: tokens.spacing.xs,
                                }}>
                                  {tables.filter(t => t.room_id === room.id).length} tavoli
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: tokens.spacing.sm }}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setEditingRoom({
                                      id: room.id,
                                      name: room.name
                                    })
                                  }
                                >
                                  Modifica
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => deleteRoom(room.id)}
                                >
                                  Elimina
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => {
            setShowRoomManagementModal(false)
            setEditingRoom(null)
          }}>
            Chiudi
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Create Order Modal */}
      {showCreateOrderModal && selectedTable && (
        <CreateOrderModal
          isOpen={showCreateOrderModal}
          onClose={() => {
            setShowCreateOrderModal(false)
            setSelectedTable(null)
            // Reload table stats after creating order
            if (restaurant) {
              loadTableStats(restaurant.id, tables)
            }
          }}
          onOrderCreated={() => {
            // Reload table stats after creating order
            if (restaurant) {
              loadTableStats(restaurant.id, tables)
            }
          }}
          session={session}
          restaurantId={restaurant?.id}
          preselectedRoomId={selectedRoom?.id}
          preselectedTableNumber={selectedTable.number}
        />
      )}
    </DashboardLayout>
  )
}

export default CassaPage
