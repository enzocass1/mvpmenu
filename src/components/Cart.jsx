import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'

// Helper functions for theme styling (must be defined before component)
const getThemeStyles = (themeConfig) => {
  if (!themeConfig) return {} // Usa stili default se non c'è theme_config

  return {
    primaryColor: themeConfig.primaryColor || '#000000',
    secondaryColor: themeConfig.secondaryColor || '#ffffff',
    textPrimaryColor: themeConfig.textPrimaryColor || '#ffffff',
    textSecondaryColor: themeConfig.textSecondaryColor || '#111827',
    textTertiaryColor: themeConfig.textTertiaryColor || '#999999',
    borderColor: themeConfig.borderColor || '#e0e0e0',
    errorColor: themeConfig.errorColor || '#f44336',
    warningColor: themeConfig.warningColor || '#ff9800',
    deleteColor: themeConfig.deleteColor || '#f44336',
    backgroundTertiary: themeConfig.backgroundTertiary || '#f9f9f9',
  }
}

/**
 * Componente Slidecart per ordini al tavolo
 * Include: lista prodotti, quantità, note, selezione tavolo, conferma ordine
 */
function Cart({ isOpen, onClose, restaurant, cartItems, onUpdateQuantity, onRemoveItem, onClearCart }) {
  const [currentStep, setCurrentStep] = useState(1) // Step 1: Carrello, Step 2: Dettagli ordine
  const [rooms, setRooms] = useState([])
  const [tables, setTables] = useState([])
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [tableNumber, setTableNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerNotes, setCustomNotes] = useState('')
  const [isPriorityOrder, setIsPriorityOrder] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [orderSettings, setOrderSettings] = useState(null)
  const [loadingSettings, setLoadingSettings] = useState(true)

  // Calcola stili dinamici basati sul theme_config del ristorante
  const themeStyles = useMemo(() => {
    return getThemeStyles(restaurant?.theme_config)
  }, [restaurant])

  // Genera stili completi con il tema applicato
  const styles = useMemo(() => {
    return getStyles(themeStyles)
  }, [themeStyles])

  useEffect(() => {
    if (restaurant?.id && isOpen) {
      loadOrderSettings()
      loadRoomsAndTables()
    }
    // Reset to step 1 when opening cart
    if (isOpen) {
      setCurrentStep(1)
    }
  }, [restaurant?.id, isOpen])

  const loadOrderSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_order_settings')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setOrderSettings(data)
    } catch (err) {
      console.error('Errore caricamento impostazioni:', err)
    } finally {
      setLoadingSettings(false)
    }
  }

  const loadRoomsAndTables = async () => {
    try {
      // Carica le sale
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('table_start')

      if (roomsError) throw roomsError

      setRooms(roomsData || [])

      // Se c'è una sola sala, selezionala automaticamente
      if (roomsData && roomsData.length === 1) {
        setSelectedRoomId(roomsData[0].id)
      }

      // Carica tutti i tavoli
      const { data: tablesData, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('table_number')

      if (tablesError) throw tablesError

      setTables(tablesData || [])
    } catch (err) {
      console.error('Errore caricamento sale e tavoli:', err)
    }
  }

  // Filtra i tavoli disponibili in base alla sala selezionata
  const getAvailableTables = () => {
    if (!selectedRoomId) return []
    return tables.filter(table => table.room_id === selectedRoomId)
  }

  const calculateTotal = () => {
    const itemsTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const priorityAmount = (isPriorityOrder && orderSettings?.priority_order_enabled)
      ? (orderSettings.priority_order_price || 0)
      : 0
    return itemsTotal + priorityAmount
  }

  const getTotalItems = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0)
  }

  const handleSubmitOrder = async () => {
    // Validazione
    if (rooms.length > 1 && !selectedRoomId) {
      setError('Seleziona una sala')
      return
    }

    if (!tableNumber) {
      setError('Seleziona un tavolo')
      return
    }

    if (cartItems.length === 0) {
      setError('Il carrello è vuoto')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // 1. Crea ordine
      const priorityAmount = (isPriorityOrder && orderSettings?.priority_order_enabled)
        ? (orderSettings.priority_order_price || 0)
        : 0

      // Trova il tavolo selezionato per ottenere il room_id
      const selectedTable = tables.find(t => t.table_number === parseInt(tableNumber) && t.room_id === selectedRoomId)

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurant.id,
          table_number: parseInt(tableNumber),
          room_id: selectedRoomId || null,
          customer_name: customerName || null,
          customer_notes: customerNotes || null,
          status: 'pending',
          total_amount: calculateTotal(),
          is_priority_order: isPriorityOrder && orderSettings?.priority_order_enabled,
          priority_order_amount: priorityAmount
        })
        .select()
        .single()

      if (orderError) throw orderError

      // 2. Aggiungi prodotti all'ordine (con varianti se presenti)
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        variant_id: item.variant_id || null,
        variant_title: item.variant_title || null,
        product_price: item.price,
        quantity: item.quantity,
        notes: item.notes || null,
        subtotal: item.price * item.quantity
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      // Se è un ordine priority, aggiungi il supplemento come item separato
      if (isPriorityOrder && orderSettings?.priority_order_enabled && priorityAmount > 0) {
        try {
          // Cerca o crea il prodotto virtuale "Priority Order"
          let { data: priorityProduct } = await supabase
            .from('products')
            .select('id')
            .eq('restaurant_id', restaurant.id)
            .eq('name', '⚡ Ordine Prioritario')
            .maybeSingle()

          if (!priorityProduct) {
            const { data: newPriorityProduct } = await supabase
              .from('products')
              .insert({
                restaurant_id: restaurant.id,
                category_id: null,
                name: '⚡ Ordine Prioritario',
                description: 'Supplemento per ordine prioritario',
                price: priorityAmount,
                is_visible: false,
                image_url: null
              })
              .select('id')
              .single()

            priorityProduct = newPriorityProduct
          }

          if (priorityProduct?.id) {
            await supabase
              .from('order_items')
              .insert({
                order_id: order.id,
                product_id: priorityProduct.id,
                product_name: '⚡ Ordine Prioritario',
                product_price: priorityAmount,
                quantity: 1,
                notes: 'Supplemento per ordine prioritario',
                subtotal: priorityAmount
              })
          }
        } catch (priorityError) {
          console.error('Errore gestione priority order in Cart:', priorityError)
        }
      }

      // 3. Traccia evento analytics
      await supabase
        .from('analytics_events')
        .insert({
          restaurant_id: restaurant.id,
          event_type: 'order_completed',
          order_id: order.id,
          metadata: {
            table_number: parseInt(tableNumber),
            total_amount: calculateTotal(),
            items_count: cartItems.length
          }
        })

      // Successo - redirect alla thank you page
      onClearCart()
      window.location.hash = `#/order-confirmation/${order.id}`
    } catch (err) {
      console.error('Errore invio ordine:', err)
      setError('Errore durante l\'invio dell\'ordine. Riprova.')
    } finally {
      setSubmitting(false)
    }
  }

  // Non mostrare se ordini disabilitati
  if (!loadingSettings && (!orderSettings || !orderSettings.orders_enabled)) {
    return null
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={styles.overlay}
        aria-label="Chiudi carrello"
      />

      {/* Slidecart */}
      <div style={styles.cart}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Il tuo ordine</h2>
          <button
            onClick={onClose}
            style={styles.closeButton}
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {cartItems.length === 0 ? (
            <div style={styles.emptyCart}>
              <p style={styles.emptyText}>Il carrello è vuoto</p>
              <p style={styles.emptySubtext}>Aggiungi prodotti per iniziare</p>
            </div>
          ) : (
            <>
              {/* Step 1: Lista prodotti */}
              {currentStep === 1 && (
                <div style={styles.itemsList}>
                {cartItems.map((item, index) => {
                  // Crea una chiave unica che combina id, notes e index per gestire prodotti identici con note diverse
                  const uniqueKey = `${item.id}-${item.notes || 'no-notes'}-${index}`

                  return (
                    <div key={uniqueKey} style={styles.cartItem}>
                      {/* Foto prodotto */}
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          style={styles.itemImage}
                        />
                      )}

                      <div style={styles.itemContent}>
                        <div style={styles.itemInfo}>
                          <p style={styles.itemName}>{item.name}</p>
                          {item.variant_title && (
                            <p style={styles.itemVariant}>{item.variant_title}</p>
                          )}
                          {item.notes && (
                            <p style={styles.itemNotes}>Note: {item.notes}</p>
                          )}
                          <p style={styles.itemPrice}>€{item.price.toFixed(2)} cad.</p>
                        </div>
                      </div>

                      {/* Controlli in alto a destra */}
                      <div style={styles.itemControlsWrapper}>
                        <div style={styles.itemControls}>
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.notes, item.quantity - 1)}
                            style={{
                              ...styles.controlButton,
                              opacity: item.quantity <= 1 ? 0.5 : 1,
                              cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer'
                            }}
                            disabled={item.quantity <= 1}
                            aria-label="Diminuisci quantità"
                          >
                            −
                          </button>
                          <span style={styles.quantityDisplay}>{item.quantity}</span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.notes, item.quantity + 1)}
                            style={styles.controlButton}
                            aria-label="Aumenta quantità"
                          >
                            +
                          </button>
                          <button
                            onClick={() => onRemoveItem(item.id, item.notes)}
                            style={styles.deleteButton}
                            aria-label="Rimuovi prodotto"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </div>
                        <div style={styles.itemSubtotal}>
                          €{(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )
                })}
                </div>
              )}

              {/* Step 2: Form ordine */}
              {currentStep === 2 && (
              <div style={styles.orderForm}>
                <h3 style={styles.formTitle}>Dettagli ordine</h3>

                {/* Selezione Sala (solo se più di una) */}
                {rooms.length > 1 && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Sala *
                    </label>
                    <select
                      value={selectedRoomId}
                      onChange={(e) => {
                        setSelectedRoomId(e.target.value)
                        setTableNumber('') // Reset tavolo quando cambia sala
                      }}
                      style={styles.input}
                      required
                    >
                      <option value="">Seleziona una sala</option>
                      {rooms.map(room => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Numero tavolo */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Numero Tavolo *
                  </label>
                  <select
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    style={styles.input}
                    disabled={rooms.length > 1 && !selectedRoomId}
                    required
                  >
                    <option value="">
                      {rooms.length > 1 && !selectedRoomId ? 'Prima seleziona una sala' : 'Seleziona un tavolo'}
                    </option>
                    {getAvailableTables().map(table => (
                      <option key={table.id} value={table.table_number}>
                        Tavolo {table.table_number}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nome cliente (opzionale) */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Nome (opzionale)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={styles.input}
                    placeholder="Il tuo nome"
                  />
                </div>

                {/* Note ordine */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Note per il ristorante (opzionale)
                  </label>
                  <textarea
                    value={customerNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    style={styles.textarea}
                    placeholder="Allergie, preferenze, ecc."
                    rows={3}
                  />
                </div>

                {/* Priority Order (se abilitato dal ristorante) */}
                {orderSettings?.priority_order_enabled && (
                  <div style={styles.priorityOrderSection}>
                    <label style={styles.priorityOrderLabel}>
                      <input
                        type="checkbox"
                        checked={isPriorityOrder}
                        onChange={(e) => setIsPriorityOrder(e.target.checked)}
                        style={styles.checkbox}
                      />
                      <div style={styles.priorityOrderContent}>
                        <div style={styles.priorityOrderHeader}>
                          <span style={styles.priorityOrderTitle}>Priority Order</span>
                          <span style={styles.priorityOrderPrice}>
                            +€{orderSettings.priority_order_price.toFixed(2)}
                          </span>
                        </div>
                        <p style={styles.priorityOrderDescription}>
                          Il tuo ordine verrà preparato con priorità
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                {error && (
                  <div style={styles.error}>
                    {error}
                  </div>
                )}
              </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div style={styles.footer}>
            {/* Progress Bar */}
            <div style={styles.progressBar}>
              <div style={styles.progressStep}>
                <div style={{
                  ...styles.stepCircle,
                  backgroundColor: currentStep === 1 ? '#000' : '#e0e0e0',
                  color: currentStep === 1 ? '#fff' : '#999'
                }}>1</div>
                <span style={{
                  ...styles.stepLabel,
                  color: currentStep === 1 ? '#000' : '#999'
                }}>Carrello</span>
              </div>
              <div style={styles.stepLine}></div>
              <div style={styles.progressStep}>
                <div style={{
                  ...styles.stepCircle,
                  backgroundColor: currentStep === 2 ? '#000' : '#e0e0e0',
                  color: currentStep === 2 ? '#fff' : '#999'
                }}>2</div>
                <span style={{
                  ...styles.stepLabel,
                  color: currentStep === 2 ? '#000' : '#999'
                }}>Dettagli</span>
              </div>
            </div>

            <div style={styles.totalSection}>
              <div style={styles.totalLeft}>
                <span style={styles.totalLabel}>Articoli ordinati</span>
                <span style={styles.totalLabelBold}>Totale</span>
              </div>
              <div style={styles.totalRight}>
                <span style={styles.itemCount}>{getTotalItems()}</span>
                <span style={styles.totalAmount}>
                  €{calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>

            {currentStep === 1 ? (
              <>
                <button
                  onClick={() => setCurrentStep(2)}
                  style={styles.confirmButton}
                >
                  Procedi all'Ordine
                </button>
                <button
                  onClick={onClearCart}
                  style={styles.clearButton}
                >
                  Svuota Carrello
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSubmitOrder}
                  disabled={submitting || !tableNumber}
                  style={{
                    ...styles.confirmButton,
                    opacity: submitting || !tableNumber ? 0.5 : 1,
                    cursor: submitting || !tableNumber ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Invio in corso...' : 'Conferma Ordine'}
                </button>
                <button
                  onClick={() => setCurrentStep(1)}
                  style={styles.clearButton}
                >
                  Torna al Carrello
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}

const getStyles = (theme = {}) => ({
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 999,
    animation: 'fadeIn 0.3s ease'
  },
  cart: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '100%',
    maxWidth: '480px',
    height: '100%',
    backgroundColor: theme.secondaryColor || '#fff',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
    animation: 'slideInRight 0.3s ease'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: `1px solid ${theme.borderColor || '#e0e0e0'}`
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: theme.textSecondaryColor || '#000'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '22px',
    cursor: 'pointer',
    color: theme.textTertiaryColor || '#666',
    padding: '0',
    width: '26px',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'background-color 0.2s'
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px'
  },
  emptyCart: {
    textAlign: 'center',
    padding: '60px 20px',
    color: theme.textTertiaryColor || '#999'
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: '500',
    margin: '0 0 8px 0'
  },
  emptySubtext: {
    fontSize: '14px',
    margin: 0
  },
  itemsList: {
    marginBottom: '0'
  },
  cartItem: {
    display: 'flex',
    gap: '8px',
    padding: '8px 8px 16px 8px',
    backgroundColor: theme.secondaryColor || '#fff',
    borderRadius: '6px',
    marginBottom: '8px',
    border: `1px solid ${theme.borderColor || '#e0e0e0'}`,
    position: 'relative'
  },
  itemImage: {
    width: '50px',
    height: '50px',
    objectFit: 'cover',
    borderRadius: '4px',
    flexShrink: 0
  },
  itemContent: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
    paddingRight: '130px'
  },
  itemInfo: {
    flex: 1
  },
  itemName: {
    margin: '0 0 4px 0',
    fontSize: '13px',
    fontWeight: '600',
    color: theme.textSecondaryColor || '#000'
  },
  itemPrice: {
    margin: '0',
    fontSize: '11px',
    color: theme.textTertiaryColor || '#999'
  },
  itemVariant: {
    margin: '2px 0 6px 0',
    fontSize: '11px',
    color: theme.textSecondaryColor || '#666',
    fontWeight: '500',
    backgroundColor: theme.backgroundTertiary || '#f0f0f0',
    padding: '2px 6px',
    borderRadius: '4px',
    display: 'inline-block'
  },
  itemNotes: {
    margin: '0 0 6px 0',
    fontSize: '10px',
    color: theme.textTertiaryColor || '#999',
    fontStyle: 'italic',
    backgroundColor: theme.backgroundTertiary || '#f9f9f9',
    padding: '3px 5px',
    borderRadius: '3px'
  },
  itemSubtotal: {
    fontSize: '13px',
    fontWeight: '600',
    color: theme.textSecondaryColor || '#000',
    whiteSpace: 'nowrap',
    textAlign: 'right',
    marginTop: '4px',
    paddingBottom: '12px'
  },
  itemControlsWrapper: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px'
  },
  itemControls: {
    display: 'flex',
    flexDirection: 'row',
    gap: '4px',
    alignItems: 'center'
  },
  quantityDisplay: {
    fontSize: '13px',
    fontWeight: '600',
    color: theme.textSecondaryColor || '#000',
    minWidth: '20px',
    textAlign: 'center'
  },
  controlButton: {
    width: '24px',
    height: '24px',
    border: `1px solid ${theme.textSecondaryColor || '#000'}`,
    borderRadius: '4px',
    backgroundColor: theme.secondaryColor || '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    color: theme.textSecondaryColor || '#000',
    lineHeight: 1,
    padding: 0
  },
  deleteButton: {
    width: '24px',
    height: '24px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: theme.deleteColor || '#f44336',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    padding: 0
  },
  orderForm: {
    padding: '12px',
    backgroundColor: theme.secondaryColor || '#fff',
    borderRadius: '6px',
    border: `1px solid ${theme.borderColor || '#e0e0e0'}`
  },
  formTitle: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: theme.textSecondaryColor || '#000'
  },
  formGroup: {
    marginBottom: '10px'
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontSize: '12px',
    fontWeight: '500',
    color: theme.textSecondaryColor || '#333'
  },
  input: {
    width: '100%',
    padding: '8px',
    fontSize: '13px',
    border: `1px solid ${theme.borderColor || '#ddd'}`,
    borderRadius: '5px',
    boxSizing: 'border-box',
    outline: 'none',
    backgroundColor: theme.secondaryColor || '#fff',
    color: theme.textSecondaryColor || '#000'
  },
  textarea: {
    width: '100%',
    padding: '8px',
    fontSize: '13px',
    border: `1px solid ${theme.borderColor || '#ddd'}`,
    borderRadius: '5px',
    boxSizing: 'border-box',
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
    minHeight: '50px',
    backgroundColor: theme.secondaryColor || '#fff',
    color: theme.textSecondaryColor || '#000'
  },
  error: {
    padding: '8px',
    backgroundColor: `${theme.errorColor || '#f44336'}20`,
    color: theme.errorColor || '#c62828',
    borderRadius: '5px',
    fontSize: '12px',
    marginTop: '8px'
  },
  priorityOrderSection: {
    marginTop: '12px',
    marginBottom: '10px'
  },
  priorityOrderLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px',
    backgroundColor: `${theme.warningColor || '#ff9800'}20`,
    border: `1px solid ${theme.warningColor || '#ffcc00'}`,
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    marginTop: '2px',
    flexShrink: 0
  },
  priorityOrderContent: {
    flex: 1
  },
  priorityOrderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px'
  },
  priorityOrderTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: theme.textSecondaryColor || '#000'
  },
  priorityOrderPrice: {
    fontSize: '13px',
    fontWeight: '700',
    color: theme.warningColor || '#ff9800'
  },
  priorityOrderDescription: {
    margin: 0,
    fontSize: '11px',
    color: theme.textTertiaryColor || '#666',
    lineHeight: '1.4'
  },
  footer: {
    padding: '12px',
    borderTop: `1px solid ${theme.borderColor || '#e0e0e0'}`,
    backgroundColor: theme.secondaryColor || '#fff'
  },
  progressBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px',
    padding: '8px 0'
  },
  progressStep: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },
  stepCircle: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.3s'
  },
  stepLabel: {
    fontSize: '11px',
    fontWeight: '500',
    transition: 'all 0.3s'
  },
  stepLine: {
    width: '60px',
    height: '2px',
    backgroundColor: theme.borderColor || '#e0e0e0',
    margin: '0 8px',
    marginBottom: '18px'
  },
  totalSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px',
    padding: '8px 0'
  },
  totalLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  totalRight: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'flex-end'
  },
  totalLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: theme.textTertiaryColor || '#999'
  },
  totalLabelBold: {
    fontSize: '20px',
    fontWeight: '700',
    color: theme.textSecondaryColor || '#000'
  },
  itemCount: {
    fontSize: '12px',
    fontWeight: '500',
    color: theme.textTertiaryColor || '#999'
  },
  totalAmount: {
    fontSize: '20px',
    fontWeight: '700',
    color: theme.textSecondaryColor || '#000'
  },
  confirmButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: theme.primaryColor || '#000',
    color: theme.textPrimaryColor || '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '8px',
    transition: 'opacity 0.2s'
  },
  clearButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: 'transparent',
    color: theme.textTertiaryColor || '#666',
    border: `1px solid ${theme.borderColor || '#ddd'}`,
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  }
})

// Aggiungi animazioni al documento
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideInRight {
      from {
        transform: translateX(100%);
      }
      to {
        transform: translateX(0);
      }
    }
  `
  document.head.appendChild(style)
}

export default Cart
