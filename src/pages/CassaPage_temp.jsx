import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import { Card, Button, Badge, Modal, Select, Input, Spinner, EmptyState } from '../components/ui'
import DashboardLayout from '../components/ui/DashboardLayout'

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
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [selectedTable, setSelectedTable] = useState(null)
  const [showTableModal, setShowTableModal] = useState(false)
  const [tableOrders, setTableOrders] = useState([])
  const [showRoomManagementModal, setShowRoomManagementModal] = useState(false)

  // Management modal states
  const [newRoomName, setNewRoomName] = useState('')
  const [newTableStart, setNewTableStart] = useState('')
  const [newTableEnd, setNewTableEnd] = useState('')
  const [editingRoom, setEditingRoom] = useState(null)

  useEffect(() => {
    if (session) {
      loadData()
    }
  }, [session])

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
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .order('position')

      setCategories(categoriesData || [])
      if (categoriesData?.length > 0) {
        setSelectedCategory(categoriesData[0].id)
      }

      // Load products
      const { data: productsData } = await supabase
        .from('products')
        .select(`
          *,
          variants:v_product_variants(*)
        `)
        .eq('restaurant_id', restaurantData.id)
        .eq('is_visible', true)
        .order('name')

      setProducts(productsData || [])

      // Load rooms from database with table ranges
      const { data: roomsData } = await supabase
        .from('rooms')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .order('table_start')

      setRooms(roomsData || [])
      if (roomsData && roomsData.length > 0) {
        setSelectedRoom(roomsData[0])
      }
    } catch (error) {
      console.error('Errore caricamento dati:', error)
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
    // Load existing orders for this table
    const { data: ordersData } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*)
      `)
      .eq('restaurant_id', restaurant.id)
      .eq('table_number', table.number)
      .neq('status', 'completed')
      .neq('status', 'cancelled')

    setTableOrders(ordersData || [])
    setSelectedTable(table)
    setShowTableModal(true)

    // If there are items, load them into cart
    if (ordersData && ordersData.length > 0) {
      const items = ordersData[0].order_items.map((item) => ({
        id: item.product_id,
        name: item.product_name,
        price: item.product_price,
        quantity: item.quantity,
        variant_id: item.variant_id,
        variant_title: item.variant_title,
        notes: item.notes,
      }))
      setCart(items)
    } else {
      setCart([])
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

  // Helper function: Generate tables from room range
  const getTablesForRoom = (room) => {
    if (!room) return []
    const tables = []
    for (let i = room.table_start; i <= room.table_end; i++) {
      tables.push({ number: i, room_id: room.id })
    }
    return tables
  }

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

    // Check for overlapping table ranges
    const hasOverlap = rooms.some((room) => {
      return (
        (tableStart >= room.table_start && tableStart <= room.table_end) ||
        (tableEnd >= room.table_start && tableEnd <= room.table_end) ||
        (tableStart <= room.table_start && tableEnd >= room.table_end)
      )
    })

    if (hasOverlap) {
      alert('I numeri tavolo si sovrappongono con un\'altra sala. Scegli un range diverso.')
      return
    }

    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          restaurant_id: restaurant.id,
          name: newRoomName.trim(),
          table_start: tableStart,
          table_end: tableEnd,
        })
        .select()
        .single()

      if (error) throw error

      setRooms([...rooms, data].sort((a, b) => a.table_start - b.table_start))
      setNewRoomName('')
      setNewTableStart('')
      setNewTableEnd('')
      alert('Sala creata con successo!')
    } catch (error) {
      console.error('Errore creazione sala:', error)
      alert('Errore durante la creazione della sala')
    }
  }

  const updateRoom = async (roomId, updatedData) => {
    if (!updatedData.name.trim()) {
      alert('Inserisci il nome della sala')
      return
    }

    const tableStart = parseInt(updatedData.table_start)
    const tableEnd = parseInt(updatedData.table_end)

    if (!tableStart || !tableEnd || tableStart <= 0 || tableEnd < tableStart) {
      alert('Inserisci un range di tavoli valido')
      return
    }

    // Check for overlapping table ranges (excluding current room)
    const hasOverlap = rooms.some((room) => {
      if (room.id === roomId) return false
      return (
        (tableStart >= room.table_start && tableStart <= room.table_end) ||
        (tableEnd >= room.table_start && tableEnd <= room.table_end) ||
        (tableStart <= room.table_start && tableEnd >= room.table_end)
      )
    })

    if (hasOverlap) {
      alert('I numeri tavolo si sovrappongono con un\'altra sala. Scegli un range diverso.')
      return
    }

    try {
      const { error } = await supabase
        .from('rooms')
        .update({
          name: updatedData.name.trim(),
          table_start: tableStart,
          table_end: tableEnd,
        })
        .eq('id', roomId)

      if (error) throw error

      setRooms(
        rooms
          .map((r) =>
            r.id === roomId
              ? {
                  ...r,
                  name: updatedData.name.trim(),
                  table_start: tableStart,
                  table_end: tableEnd,
                }
              : r
          )
          .sort((a, b) => a.table_start - b.table_start)
      )
      setEditingRoom(null)
      alert('Sala aggiornata con successo!')
    } catch (error) {
      console.error('Errore aggiornamento sala:', error)
      alert('Errore durante l\'aggiornamento della sala')
    }
  }

  const deleteRoom = async (roomId) => {
    if (!confirm('Sei sicuro di voler eliminare questa sala?')) {
      return
    }

    try {
      const { error } = await supabase.from('rooms').delete().eq('id', roomId)

      if (error) throw error

      setRooms(rooms.filter((r) => r.id !== roomId))
      if (selectedRoom?.id === roomId) {
        setSelectedRoom(rooms[0] || null)
      }
      alert('Sala eliminata con successo!')
    } catch (error) {
      console.error('Errore eliminazione sala:', error)
      alert('Errore durante l\'eliminazione della sala')
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
    gridTemplateColumns: window.innerWidth >= 1024 ? '1fr 400px' : '1fr',
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: tokens.spacing.md,
    overflowY: 'auto',
    padding: tokens.spacing.sm,
  }

  const productCardStyles = {
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.white,
    border: `${tokens.borders.width.thin} solid ${tokens.colors.gray[300]}`,
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
          ) : (
            // Grid Layout (Desktop: auto-fill, Mobile: 2 columns)
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  window.innerWidth >= 1024
                    ? 'repeat(auto-fill, minmax(120px, 1fr))'
                    : 'repeat(2, 1fr)',
                gap: tokens.spacing.md,
              }}
            >
              {filteredTables.map((table) => (
                <div
                  key={table.number}
                  style={{
                    padding: tokens.spacing.lg,
                    backgroundColor: tokens.colors.white,
                    border: `${tokens.borders.width.thin} solid ${tokens.colors.gray[300]}`,
                    borderRadius: tokens.borderRadius.md,
                    textAlign: 'center',
                    minHeight: '100px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: tokens.transitions.base,
                  }}
                  onClick={() => handleTableClick(table)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = tokens.colors.gray[50]
                    e.currentTarget.style.borderColor = tokens.colors.black
                    e.currentTarget.style.boxShadow = tokens.shadows.lg
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = tokens.colors.white
                    e.currentTarget.style.borderColor = tokens.colors.gray[300]
                    e.currentTarget.style.boxShadow = tokens.shadows.none
                  }}
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
                    }}
                  >
                    Tavolo
                  </div>
                </div>
              ))}
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
          setCart([])
        }}
        size="lg"
      >
        <Modal.Header>
          <Modal.Title>Tavolo {selectedTable?.number} - {selectedTable?.sala}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
            {/* Categories */}
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

            {/* Products */}
            <div
              style={{
                ...productsGridStyles,
                maxHeight: '300px',
              }}
            >
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

            {/* Cart Items */}
            <div>
              <h4
                style={{
                  margin: 0,
                  marginBottom: tokens.spacing.md,
                  fontSize: tokens.typography.fontSize.base,
                  fontWeight: tokens.typography.fontWeight.semibold,
                }}
              >
                Prodotti Ordinati
              </h4>
              {cart.length === 0 ? (
                <EmptyState
                  title="Nessun prodotto"
                  description="Aggiungi prodotti per questo tavolo"
                  centered={false}
                />
              ) : (
                <div>
                  {cart.map((item, index) => (
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
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: tokens.typography.fontSize.sm,
                              fontWeight: tokens.typography.fontWeight.medium,
                            }}
                          >
                            {item.quantity}x {item.name}
                            {item.variant_title && ` - ${item.variant_title}`}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                            €{(item.price * item.quantity).toFixed(2)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(index)}
                            style={{ marginLeft: tokens.spacing.sm }}
                          >
                            Rimuovi
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div
                    style={{
                      marginTop: tokens.spacing.lg,
                      padding: tokens.spacing.md,
                      backgroundColor: tokens.colors.gray[100],
                      borderRadius: tokens.borderRadius.md,
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: tokens.typography.fontSize.lg,
                      fontWeight: tokens.typography.fontWeight.bold,
                    }}
                  >
                    <span>Totale</span>
                    <span>€{getCartTotal().toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <div style={{ display: 'flex', gap: tokens.spacing.md, width: '100%', flexWrap: 'wrap' }}>
            <Button variant="outline" onClick={handleScontrinoFiscale} disabled={cart.length === 0}>
              Scontrino Fiscale
            </Button>
            <Button variant="outline" onClick={handlePreconto} disabled={cart.length === 0}>
              Preconto
            </Button>
            <Button
              variant="primary"
              onClick={handleInviaOrdine}
              disabled={cart.length === 0}
              style={{ flex: 1 }}
            >
              Invia Ordine
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
                              <div style={{ display: 'flex', gap: tokens.spacing.md }}>
                                <div style={{ flex: 1 }}>
                                  <Input
                                    label="Tavolo Inizio"
                                    type="number"
                                    value={editingRoom.table_start}
                                    onChange={(e) =>
                                      setEditingRoom({ ...editingRoom, table_start: e.target.value })
                                    }
                                  />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <Input
                                    label="Tavolo Fine"
                                    type="number"
                                    value={editingRoom.table_end}
                                    onChange={(e) =>
                                      setEditingRoom({ ...editingRoom, table_end: e.target.value })
                                    }
                                  />
                                </div>
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
                                  Tavoli: {room.table_start} - {room.table_end} ({room.table_end - room.table_start + 1} tavoli)
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: tokens.spacing.sm }}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setEditingRoom({
                                      id: room.id,
                                      name: room.name,
                                      table_start: room.table_start.toString(),
                                      table_end: room.table_end.toString(),
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
    </DashboardLayout>
  )
}

export default CassaPage
