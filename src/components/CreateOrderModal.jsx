import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function CreateOrderModal({ restaurantId, onClose, onOrderCreated, staffSession, existingOrder = null, preselectedRoomId = null, preselectedTableNumber = null, isOpen = true }) {

  const [tableNumber, setTableNumber] = useState(existingOrder?.table_number || preselectedTableNumber || '')
  const [customerName, setCustomerName] = useState(existingOrder?.customer_name || '')
  const [customerNotes, setCustomerNotes] = useState(existingOrder?.customer_notes || '')
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState({}) // Organized by category_id
  const [selectedProducts, setSelectedProducts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [isPriorityOrder, setIsPriorityOrder] = useState(existingOrder?.is_priority_order || false)
  const [showProductList, setShowProductList] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [priorityPrice, setPriorityPrice] = useState(2.00)
  const [maxTables, setMaxTables] = useState(null)
  const [enableTableOrders, setEnableTableOrders] = useState(false)
  const [enablePriorityOrders, setEnablePriorityOrders] = useState(false)

  // Room and Table selection states
  const [rooms, setRooms] = useState([])
  const [selectedRoomId, setSelectedRoomId] = useState(existingOrder?.room_id || preselectedRoomId || null)
  const [tables, setTables] = useState([])
  const [selectedTableId, setSelectedTableId] = useState(null)
  const [roomsLoadAttempted, setRoomsLoadAttempted] = useState(false)

  // Variant selection states
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [productForVariants, setProductForVariants] = useState(null)
  const [variantsOptions, setVariantsOptions] = useState([])
  const [variantsData, setVariantsData] = useState([])
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [selectedOptions, setSelectedOptions] = useState({})

  const isEditMode = !!existingOrder

  useEffect(() => {
    loadCategories()
    loadRestaurantSettings()
    loadRooms()
    if (existingOrder) {
      loadExistingOrderItems()
    }
  }, [restaurantId, existingOrder])

  // Load tables when room is selected
  useEffect(() => {
    if (selectedRoomId) {
      loadTables(selectedRoomId)
    } else {
      setTables([])
      setSelectedTableId(null)
    }
  }, [selectedRoomId])

  const loadRestaurantSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_order_settings')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .single()

      if (error) throw error
      if (data) {
        setPriorityPrice(data.priority_order_price || 2.00)
        setMaxTables(data.number_of_tables)
        setEnableTableOrders(data.orders_enabled || false)
        setEnablePriorityOrders(data.priority_order_enabled || false)
      }
    } catch (error) {
      console.error('Errore caricamento impostazioni:', error)
    }
  }

  const loadRooms = async () => {
    // Prevent infinite loop - only attempt once
    if (roomsLoadAttempted) return
    setRoomsLoadAttempted(true)

    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('name')

      if (error) {
        // If table doesn't exist (400 error), silently fall back to old system
        console.log('⚠️ Sistema sale/tavoli non configurato')
        console.log('Errore:', error.message)
        console.log('Codice:', error.code)
        console.log('💡 Esegui la migration SQL per attivare il sistema sale/tavoli!')
        setRooms([])
        return
      }

      setRooms(data || [])

      // Se si sta modificando un ordine esistente, ripristina la sala
      if (existingOrder?.room_id) {
        setSelectedRoomId(existingOrder.room_id)
      }
    } catch (error) {
      // On any error, fall back to old table number system
      console.log('⚠️ Sistema sale/tavoli non configurato (catch)')
      console.log('Errore:', error.message)
      setRooms([])
    }
  }

  const loadTables = async (roomId) => {
    try {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_active', true)
        .order('number')

      if (error) {
        console.error('❌ Errore caricamento tavoli:')
        console.error('Messaggio:', error.message)
        console.error('Codice:', error.code)
        throw error
      }
      console.log('✅ Tavoli caricati per sala:', data?.length || 0)
      setTables(data || [])

      // Auto-select table if preselectedTableNumber is provided
      if (preselectedTableNumber && data && data.length > 0) {
        const table = data.find(t => t.number === preselectedTableNumber)
        if (table) {
          setSelectedTableId(table.id)
        }
      }
    } catch (error) {
      console.error('❌ Errore caricamento tavoli (catch):', error.message)
      setTables([])
    }
  }

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name')

      if (error) throw error
      setCategories(data || [])

      // Load products for each category with variants
      if (data && data.length > 0) {
        const productsData = {}
        for (const category of data) {
          const { data: categoryProducts, error: productsError } = await supabase
            .from('products')
            .select('*')
            .eq('category_id', category.id)
            .eq('is_visible', true)
            .order('name')

          if (!productsError && categoryProducts) {
            // Load variants for each product
            const productsWithVariants = await Promise.all(
              categoryProducts.map(async (product) => {
                const { data: variantsData, error: variantsError } = await supabase
                  .from('v_product_variants')
                  .select('*')
                  .eq('product_id', product.id)
                  .eq('is_available', true)
                  .order('position')

                return {
                  ...product,
                  variants: variantsData || [],
                  hasVariants: (variantsData || []).length > 0
                }
              })
            )
            productsData[category.id] = productsWithVariants
          }
        }
        setProducts(productsData)
      }
    } catch (error) {
      console.error('Errore caricamento categorie:', error)
    }
  }

  const loadExistingOrderItems = async () => {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', existingOrder.id)

      if (error) throw error

      const items = data
        .filter(item => item.product_name !== '⚡ Ordine Prioritario') // Escludi l'item priority order
        .map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          price: item.product_price,
          quantity: item.quantity,
          notes: item.notes || '',
          subtotal: item.subtotal,
          variant_id: item.variant_id || null,
          variant_title: item.variant_title || null
        }))

      setSelectedProducts(items)
    } catch (error) {
      console.error('Errore caricamento prodotti ordine:', error)
    }
  }

  const addProduct = async (product) => {
    // Se il prodotto ha varianti, mostra modal di selezione
    if (product.hasVariants && product.variants.length > 0) {
      await loadVariantsForProduct(product)
      return
    }

    // Prodotto senza varianti - aggiunta diretta
    setSelectedProducts([...selectedProducts, {
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      quantity: 1,
      notes: '',
      subtotal: product.price,
      variant_id: null,
      variant_title: null
    }])

    // Reset UI state
    setShowProductList(false)
    setSearchQuery('')
    setSelectedCategory(null)
  }

  const loadVariantsForProduct = async (product) => {
    try {
      // Carica opzioni
      const { data: optionsData } = await supabase
        .from('v_product_variant_options')
        .select('*')
        .eq('product_id', product.id)
        .order('position')

      // Per ogni opzione, carica i valori
      const optionsWithValues = await Promise.all(
        (optionsData || []).map(async (option) => {
          const { data: valuesData } = await supabase
            .from('v_product_variant_option_values')
            .select('*')
            .eq('option_id', option.id)
            .order('position')

          return {
            ...option,
            values: valuesData || []
          }
        })
      )

      setVariantsOptions(optionsWithValues)
      setVariantsData(product.variants)
      setProductForVariants(product)
      setShowVariantModal(true)
      setSelectedVariant(null)
      setSelectedOptions({})
    } catch (error) {
      console.error('Errore caricamento varianti:', error)
    }
  }

  const handleOptionChange = (optionName, value) => {
    const newSelectedOptions = { ...selectedOptions, [optionName]: value }
    setSelectedOptions(newSelectedOptions)

    // Trova la variante che corrisponde alle opzioni selezionate
    const matchingVariant = variantsData.find(variant => {
      const variantOptions = variant.option_values || {}
      return Object.keys(newSelectedOptions).every(
        key => variantOptions[key] === newSelectedOptions[key]
      )
    })

    setSelectedVariant(matchingVariant || null)
  }

  const addProductWithVariant = () => {
    if (!selectedVariant) {
      alert('Seleziona tutte le opzioni prima di aggiungere al carrello')
      return
    }

    setSelectedProducts([...selectedProducts, {
      product_id: productForVariants.id,
      product_name: productForVariants.name,
      price: selectedVariant.price || productForVariants.price,
      quantity: 1,
      notes: '',
      subtotal: selectedVariant.price || productForVariants.price,
      variant_id: selectedVariant.id,
      variant_title: selectedVariant.title
    }])

    // Reset and close
    setShowVariantModal(false)
    setProductForVariants(null)
    setVariantsOptions([])
    setVariantsData([])
    setSelectedVariant(null)
    setSelectedOptions({})
    setShowProductList(false)
    setSearchQuery('')
    setSelectedCategory(null)
  }

  const updateProductQuantity = (index, delta) => {
    const updated = [...selectedProducts]
    updated[index].quantity += delta

    if (updated[index].quantity <= 0) {
      updated.splice(index, 1)
    } else {
      updated[index].subtotal = updated[index].price * updated[index].quantity
    }

    setSelectedProducts(updated)
  }

  const updateProductNotes = (index, notes) => {
    const updated = [...selectedProducts]
    updated[index].notes = notes
    setSelectedProducts(updated)
  }

  const removeProduct = (index) => {
    const updated = [...selectedProducts]
    updated.splice(index, 1)
    setSelectedProducts(updated)
  }

  const calculateTotal = () => {
    const itemsTotal = selectedProducts.reduce((sum, p) => sum + p.subtotal, 0)
    const priorityAmount = isPriorityOrder ? priorityPrice : 0
    return itemsTotal + priorityAmount
  }

  const isTableNumberValid = () => {
    // Valida che sia stato selezionato un tavolo
    return selectedTableId !== null
  }

  const handleSubmit = async () => {
    if (!selectedRoomId) {
      alert('Seleziona una sala')
      return
    }

    if (!isTableNumberValid()) {
      alert('Seleziona un tavolo')
      return
    }

    if (selectedProducts.length === 0) {
      alert('Aggiungi almeno un prodotto all\'ordine')
      return
    }

    setLoading(true)

    try {
      if (isEditMode) {
        // Modifica ordine esistente
        await updateExistingOrder()
      } else {
        // Crea nuovo ordine
        await createNewOrder()
      }
    } catch (error) {
      console.error('Errore salvataggio ordine:', error)
      alert('Errore durante il salvataggio dell\'ordine')
    } finally {
      setLoading(false)
    }
  }

  const createNewOrder = async () => {
    const total = calculateTotal()
    const priorityAmount = isPriorityOrder ? priorityPrice : 0

    // Trova il tavolo selezionato per recuperare il table_number
    const selectedTable = tables.find(t => t.id === selectedTableId)

    // Crea ordine
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        room_id: selectedRoomId,
        table_number: selectedTable.number,
        customer_name: customerName || null,
        customer_notes: customerNotes || null,
        total_amount: total,
        is_priority_order: isPriorityOrder,
        priority_order_amount: priorityAmount,
        status: 'pending',
        confirmed_by: staffSession?.staff_id || null
      })
      .select()
      .single()

    if (orderError) throw orderError

    // Aggiungi prodotti con supporto varianti
    const orderItems = selectedProducts.map(p => ({
      order_id: order.id,
      product_id: p.product_id,
      product_name: p.product_name,
      product_price: p.price,
      quantity: p.quantity,
      notes: p.notes || null,
      subtotal: p.subtotal,
      variant_id: p.variant_id || null,
      variant_title: p.variant_title || null
    }))

    console.log('📦 Inserting order items:', orderItems)

    const { data: insertedItems, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select()

    if (itemsError) {
      console.error('❌ Errore inserimento order_items:', itemsError)
      console.error('📦 Items che hanno causato errore:', orderItems)
      throw itemsError
    }

    console.log('✅ Order items inseriti con successo:', insertedItems)

    // Se è un ordine priority, aggiungi il supplemento come item separato
    // SOLO se riesce a trovare/creare un prodotto virtuale per il priority order
    if (isPriorityOrder && priorityAmount > 0) {
      try {
        // Cerca se esiste già un prodotto "Priority Order" per questo ristorante
        let { data: priorityProduct, error: prioritySearchError } = await supabase
          .from('products')
          .select('id')
          .eq('restaurant_id', restaurantId)
          .eq('name', '⚡ Ordine Prioritario')
          .maybeSingle()

        if (prioritySearchError) {
          console.error('Errore ricerca prodotto priority:', prioritySearchError)
        }

        // Se non esiste, crealo
        if (!priorityProduct) {
          const { data: newPriorityProduct, error: createError } = await supabase
            .from('products')
            .insert({
              restaurant_id: restaurantId,
              category_id: null,
              name: '⚡ Ordine Prioritario',
              description: 'Supplemento per ordine prioritario',
              price: priorityAmount,
              is_visible: false, // Non visibile nel menu pubblico
              image_url: null
            })
            .select('id')
            .single()

          if (createError) {
            console.error('Errore creazione prodotto priority:', createError)
            // Se fallisce la creazione, continua senza inserire l'item
          } else {
            priorityProduct = newPriorityProduct
          }
        }

        // Inserisci l'item priority order se abbiamo un product_id valido
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

          console.log('✅ Priority order item inserito con successo')
        }
      } catch (priorityError) {
        console.error('Errore gestione priority order item:', priorityError)
        // Non bloccare l'ordine se fallisce solo il priority item
      }
    }

    // Traccia nella timeline che è stato creato manualmente
    await supabase.from('order_timeline').insert({
      order_id: order.id,
      action: 'created',
      staff_id: staffSession?.staff_id || null,
      staff_name: staffSession?.name || 'Staff',
      created_at: new Date().toISOString()
    })

    // Analytics: traccia evento order_completed
    await supabase.from('analytics_events').insert({
      restaurant_id: restaurantId,
      event_type: 'order_completed',
      order_id: order.id,
      metadata: {
        table_number: parseInt(tableNumber),
        total_amount: total,
        items_count: selectedProducts.length,
        is_priority: isPriorityOrder,
        created_by_staff: true,
        staff_name: staffSession?.name
      }
    })

    // Track analytics event for operator action
    if (staffSession?.staff_id) {
      await supabase.from('analytics_events').insert({
        restaurant_id: restaurantId,
        event_type: 'operator_order_action',
        metadata: {
          order_id: order.id,
          staff_id: staffSession.staff_id,
          staff_name: staffSession.name,
          action: 'created',
          previous_status: null,
          table_number: parseInt(tableNumber)
        }
      })
    }

    onOrderCreated()
    onClose()
  }

  const updateExistingOrder = async () => {
    // Elimina tutti i prodotti esistenti
    await supabase
      .from('order_items')
      .delete()
      .eq('order_id', existingOrder.id)

    // Riaggiungi i prodotti aggiornati con supporto varianti
    const orderItems = selectedProducts.map(p => ({
      order_id: existingOrder.id,
      product_id: p.product_id,
      product_name: p.product_name,
      product_price: p.price,
      quantity: p.quantity,
      notes: p.notes || null,
      subtotal: p.subtotal,
      variant_id: p.variant_id || null,
      variant_title: p.variant_title || null
    }))

    // Aggiorna l'ordine
    const total = calculateTotal()
    const priorityAmount = isPriorityOrder ? priorityPrice : 0

    await supabase
      .from('order_items')
      .insert(orderItems)

    // Se è un ordine priority, aggiungi il supplemento come item separato
    if (isPriorityOrder && priorityAmount > 0) {
      try {
        // Cerca se esiste già un prodotto "Priority Order" per questo ristorante
        let { data: priorityProduct } = await supabase
          .from('products')
          .select('id')
          .eq('restaurant_id', restaurantId)
          .eq('name', '⚡ Ordine Prioritario')
          .maybeSingle()

        // Se non esiste, crealo
        if (!priorityProduct) {
          const { data: newPriorityProduct } = await supabase
            .from('products')
            .insert({
              restaurant_id: restaurantId,
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

        // Inserisci l'item priority order
        if (priorityProduct?.id) {
          await supabase
            .from('order_items')
            .insert({
              order_id: existingOrder.id,
              product_id: priorityProduct.id,
              product_name: '⚡ Ordine Prioritario',
              product_price: priorityAmount,
              quantity: 1,
              notes: 'Supplemento per ordine prioritario',
              subtotal: priorityAmount
            })
        }
      } catch (priorityError) {
        console.error('Errore gestione priority order item in update:', priorityError)
      }
    }

    await supabase
      .from('orders')
      .update({
        table_number: parseInt(tableNumber),
        customer_name: customerName || null,
        customer_notes: customerNotes || null,
        total_amount: total,
        is_priority_order: isPriorityOrder,
        priority_order_amount: priorityAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingOrder.id)

    // Traccia modifica nella timeline
    await supabase.from('order_timeline').insert({
      order_id: existingOrder.id,
      action: 'updated',
      staff_id: staffSession?.staff_id || null,
      staff_name: staffSession?.name || 'Staff',
      created_at: new Date().toISOString()
    })

    // Track analytics event for operator action
    if (staffSession?.staff_id) {
      await supabase.from('analytics_events').insert({
        restaurant_id: restaurantId,
        event_type: 'operator_order_action',
        metadata: {
          order_id: existingOrder.id,
          staff_id: staffSession.staff_id,
          staff_name: staffSession.name,
          action: 'updated',
          previous_status: existingOrder.status,
          table_number: parseInt(tableNumber)
        }
      })
    }

    onOrderCreated()
    onClose()
  }

  // Get all products for search
  const getAllProducts = () => {
    const allProducts = []
    Object.entries(products).forEach(([categoryId, categoryProducts]) => {
      categoryProducts.forEach(product => {
        allProducts.push({ ...product, categoryId })
      })
    })
    return allProducts
  }

  // Filter products by search query
  const filteredProducts = searchQuery
    ? getAllProducts().filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  // Get products for selected category
  const categoryProducts = selectedCategory ? (products[selectedCategory] || []) : []

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>{isEditMode ? 'Modifica Ordine' : 'Crea Nuovo Ordine'}</h2>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        <div style={styles.content}>
          {/* Sala - Dropdown delle sale disponibili */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Sala *</label>
            <select
              value={selectedRoomId || ''}
              onChange={(e) => setSelectedRoomId(e.target.value || null)}
              style={styles.input}
            >
              <option value="">Seleziona una sala</option>
              {rooms.map(room => (
                <option key={room.id} value={room.id}>{room.name}</option>
              ))}
            </select>
            {rooms.length === 0 && (
              <div style={styles.infoText}>
                Nessuna sala configurata. Configura le sale nella sezione Cassa.
              </div>
            )}
          </div>

          {/* Tavolo - Dropdown dei tavoli in base alla sala scelta */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Tavolo *</label>
            <select
              value={selectedTableId || ''}
              onChange={(e) => setSelectedTableId(e.target.value || null)}
              style={{
                ...styles.input,
                borderColor: !isTableNumberValid() ? '#EF4444' : '#ddd'
              }}
              disabled={!selectedRoomId}
            >
              <option value="">Seleziona un tavolo</option>
              {tables.map(table => (
                <option key={table.id} value={table.id}>
                  Tavolo {table.number}
                </option>
              ))}
            </select>
            {!selectedRoomId && (
              <div style={styles.infoText}>
                Seleziona prima una sala
              </div>
            )}
            {selectedRoomId && tables.length === 0 && (
              <div style={styles.infoText}>
                Nessun tavolo disponibile per questa sala
              </div>
            )}
            {!isTableNumberValid() && selectedRoomId && tables.length > 0 && (
              <div style={styles.errorText}>
                Seleziona un tavolo
              </div>
            )}
          </div>

          {/* Customer Name */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Nome Cliente (opzionale)</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={styles.input}
              placeholder="Nome del cliente"
            />
          </div>

          {/* Priority Order - mostra sempre, disabilita se non attivo */}
          <div style={styles.checkboxGroup}>
            <label style={{
              ...styles.checkboxLabel,
              opacity: enablePriorityOrders ? 1 : 0.5,
              cursor: enablePriorityOrders ? 'pointer' : 'not-allowed'
            }}>
              <input
                type="checkbox"
                checked={isPriorityOrder}
                onChange={(e) => setIsPriorityOrder(e.target.checked)}
                disabled={!enablePriorityOrders}
                style={styles.checkbox}
              />
              <span>Ordine Prioritario (+€{priorityPrice.toFixed(2)})</span>
            </label>
            {!enablePriorityOrders && (
              <div style={styles.checkboxHint}>
                Funzionalità non attiva. Abilitala dalle impostazioni ordini al tavolo.
              </div>
            )}
          </div>

          {/* Selected Products */}
          <div style={styles.formGroup}>
            <div style={styles.sectionHeader}>
              <label style={styles.label}>Prodotti Ordinati *</label>
              <button
                onClick={() => setShowProductList(!showProductList)}
                style={styles.addProductButton}
              >
                + Aggiungi
              </button>
            </div>

            {selectedProducts.length === 0 ? (
              <div style={styles.emptyProducts}>
                Nessun prodotto selezionato
              </div>
            ) : (
              <div style={styles.productsList}>
                {selectedProducts.map((product, index) => (
                  <div key={index} style={styles.productCard}>
                    <div style={styles.productHeader}>
                      <div style={styles.productInfo}>
                        <div style={styles.productName}>
                          {product.product_name}
                          {product.variant_title && (
                            <span style={styles.variantBadge}>{product.variant_title}</span>
                          )}
                        </div>
                        <div style={styles.productPrice}>€{product.price.toFixed(2)}</div>
                      </div>
                      <div style={styles.quantityControls}>
                        <button
                          onClick={() => updateProductQuantity(index, -1)}
                          style={styles.quantityButton}
                        >
                          −
                        </button>
                        <span style={styles.quantity}>{product.quantity}</span>
                        <button
                          onClick={() => updateProductQuantity(index, 1)}
                          style={styles.quantityButton}
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeProduct(index)}
                        style={styles.removeButton}
                      >
                        ×
                      </button>
                    </div>

                    <input
                      type="text"
                      value={product.notes}
                      onChange={(e) => updateProductNotes(index, e.target.value)}
                      style={styles.notesInput}
                      placeholder="Note per questo prodotto (es. senza lattosio)"
                    />

                    <div style={styles.productSubtotal}>
                      Subtotale: €{product.subtotal.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Search/List */}
          {showProductList && (
            <div style={styles.productListSection}>
              {/* Search Bar */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
                placeholder="Cerca prodotto..."
              />

              {/* Show search results if searching */}
              {searchQuery && (
                <div style={styles.searchResults}>
                  {filteredProducts.length === 0 ? (
                    <div style={styles.noProducts}>Nessun prodotto trovato</div>
                  ) : (
                    filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        style={styles.productOptionCard}
                        onClick={() => addProduct(product)}
                      >
                        <div style={styles.productOptionHeader}>
                          <div style={styles.productOptionName}>{product.name}</div>
                          {!product.hasVariants && (
                            <div style={styles.productOptionPrice}>€{product.price.toFixed(2)}</div>
                          )}
                        </div>

                        {/* Mostra varianti se presenti */}
                        {product.hasVariants && product.variants.length > 0 && (
                          <div style={styles.variantsPreviewList}>
                            {product.variants.map((variant) => (
                              <div key={variant.id} style={styles.variantPreviewItem}>
                                <span style={styles.variantPreviewName}>{variant.title}</span>
                                <span style={styles.variantPreviewPrice}>
                                  €{(variant.price || product.price).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Show categories/products when not searching */}
              {!searchQuery && (
                <div style={styles.categoriesContainer}>
                  <div style={{
                    ...styles.slideContainer,
                    transform: selectedCategory ? 'translateX(-50%)' : 'translateX(0)'
                  }}>
                    {/* Categories View */}
                    <div style={styles.slidePanel}>
                      <div style={styles.categoriesLabel}>Categorie</div>
                      <div style={styles.categoriesGrid}>
                        {categories.length === 0 ? (
                          <div style={styles.noProducts}>Nessuna categoria disponibile</div>
                        ) : (
                          categories.map((category) => (
                            <div
                              key={category.id}
                              style={styles.categoryCard}
                              onClick={() => setSelectedCategory(category.id)}
                            >
                              <div style={styles.categoryName}>{category.name}</div>
                              <div style={styles.categoryArrow}>→</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Products View */}
                    <div style={styles.slidePanel}>
                      {selectedCategory && (
                        <>
                          <div style={styles.productsHeader}>
                            <button
                              onClick={() => setSelectedCategory(null)}
                              style={styles.backButton}
                            >
                              ← Indietro
                            </button>
                            <div style={styles.categoryTitle}>
                              {categories.find(c => c.id === selectedCategory)?.name}
                            </div>
                          </div>
                          <div style={styles.productsGrid}>
                            {categoryProducts.length === 0 ? (
                              <div style={styles.noProducts}>Nessun prodotto in questa categoria</div>
                            ) : (
                              categoryProducts.map((product) => (
                                <div
                                  key={product.id}
                                  style={styles.productOptionCard}
                                  onClick={() => addProduct(product)}
                                >
                                  <div style={styles.productOptionHeader}>
                                    <div style={styles.productOptionName}>{product.name}</div>
                                    {!product.hasVariants && (
                                      <div style={styles.productOptionPrice}>€{product.price.toFixed(2)}</div>
                                    )}
                                  </div>

                                  {/* Mostra varianti se presenti */}
                                  {product.hasVariants && product.variants.length > 0 && (
                                    <div style={styles.variantsPreviewList}>
                                      {product.variants.map((variant) => (
                                        <div key={variant.id} style={styles.variantPreviewItem}>
                                          <span style={styles.variantPreviewName}>{variant.title}</span>
                                          <span style={styles.variantPreviewPrice}>
                                            €{(variant.price || product.price).toFixed(2)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Customer Notes */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Note Ordine (opzionale)</label>
            <textarea
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              style={styles.textarea}
              placeholder="Note generali per l'ordine"
              rows="3"
            />
          </div>

          {/* Total */}
          <div style={styles.totalSection}>
            <div style={styles.totalRow}>
              <span>Subtotale Prodotti:</span>
              <span>€{selectedProducts.reduce((sum, p) => sum + p.subtotal, 0).toFixed(2)}</span>
            </div>
            {isPriorityOrder && (
              <div style={styles.totalRow}>
                <span style={{ color: '#FF9800' }}>Priority Order:</span>
                <span style={{ color: '#FF9800' }}>€{priorityPrice.toFixed(2)}</span>
              </div>
            )}
            <div style={{ ...styles.totalRow, ...styles.totalFinal }}>
              <span>Totale:</span>
              <span>€{calculateTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelButton}>
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            style={{
              ...styles.submitButton,
              opacity: (loading || !isTableNumberValid() || selectedProducts.length === 0) ? 0.5 : 1,
              cursor: (loading || !isTableNumberValid() || selectedProducts.length === 0) ? 'not-allowed' : 'pointer'
            }}
            disabled={loading || !isTableNumberValid() || selectedProducts.length === 0}
          >
            {loading ? 'Salvataggio...' : (isEditMode ? 'Salva Modifiche' : 'Crea Ordine')}
          </button>
        </div>
      </div>

      {/* Variant Selection Modal */}
      {showVariantModal && productForVariants && (
        <div style={styles.variantModalOverlay} onClick={() => setShowVariantModal(false)}>
          <div style={styles.variantModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.variantModalHeader}>
              <h3 style={styles.variantModalTitle}>Seleziona Variante</h3>
              <button onClick={() => setShowVariantModal(false)} style={styles.closeButton}>×</button>
            </div>

            <div style={styles.variantModalBody}>
              <h4 style={styles.variantProductName}>{productForVariants.name}</h4>

              {variantsOptions.map((option) => (
                <div key={option.id} style={styles.variantOptionGroup}>
                  <label style={styles.variantOptionLabel}>{option.name}</label>
                  <div style={styles.variantOptionButtons}>
                    {option.values.map((value) => {
                      const isSelected = selectedOptions[option.name] === value.value
                      return (
                        <button
                          key={value.id}
                          type="button"
                          onClick={() => handleOptionChange(option.name, value.value)}
                          style={{
                            ...styles.variantOptionButton,
                            ...(isSelected ? styles.variantOptionButtonSelected : {})
                          }}
                        >
                          {value.value}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {selectedVariant && (
                <div style={styles.variantSelectedInfo}>
                  <span style={styles.variantSelectedLabel}>Variante:</span>
                  <span style={styles.variantSelectedValue}>{selectedVariant.title}</span>
                  <span style={styles.variantSelectedPrice}>€{(selectedVariant.price || productForVariants.price).toFixed(2)}</span>
                </div>
              )}

              {variantsOptions.length > 0 && !selectedVariant && Object.keys(selectedOptions).length > 0 && (
                <div style={styles.variantError}>
                  ⚠️ Combinazione non disponibile
                </div>
              )}
            </div>

            <div style={styles.variantModalFooter}>
              <button onClick={() => setShowVariantModal(false)} style={styles.cancelButton}>
                Annulla
              </button>
              <button
                onClick={addProductWithVariant}
                style={{
                  ...styles.submitButton,
                  opacity: selectedVariant ? 1 : 0.5,
                  cursor: selectedVariant ? 'pointer' : 'not-allowed'
                }}
                disabled={!selectedVariant}
              >
                Aggiungi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'flex-end',
    zIndex: 9999
  },
  modal: {
    width: '100%',
    maxHeight: '90vh',
    backgroundColor: '#fff',
    borderRadius: '16px 16px 0 0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #ddd',
    backgroundColor: '#fff',
    position: 'sticky',
    top: 0,
    zIndex: 1
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#000'
  },
  closeButton: {
    width: '32px',
    height: '32px',
    fontSize: '28px',
    fontWeight: '300',
    color: '#666',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0
  },
  content: {
    padding: '16px',
    overflowY: 'auto',
    flex: 1
  },
  formGroup: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#000',
    marginBottom: '6px'
  },
  errorText: {
    marginTop: '4px',
    fontSize: '11px',
    color: '#EF4444',
    fontWeight: '500'
  },
  infoText: {
    marginTop: '4px',
    fontSize: '11px',
    color: '#6B7280',
    fontStyle: 'italic'
  },
  input: {
    width: '100%',
    padding: '10px',
    fontSize: '13px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
    color: '#000',
    boxSizing: 'border-box'
  },
  textarea: {
    width: '100%',
    padding: '10px',
    fontSize: '13px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
    color: '#000',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  checkboxGroup: {
    marginBottom: '16px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#000',
    cursor: 'pointer'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  checkboxHint: {
    fontSize: '11px',
    color: '#666',
    marginTop: '4px',
    marginLeft: '26px',
    fontStyle: 'italic'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  addProductButton: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#000',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
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
  productsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  productCard: {
    padding: '12px',
    backgroundColor: '#fafafa',
    border: '1px solid #ddd',
    borderRadius: '6px'
  },
  productHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px'
  },
  productInfo: {
    flex: 1
  },
  productName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#000',
    marginBottom: '2px'
  },
  productPrice: {
    fontSize: '12px',
    color: '#666'
  },
  quantityControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  quantityButton: {
    width: '28px',
    height: '28px',
    fontSize: '16px',
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
  quantity: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#000',
    minWidth: '24px',
    textAlign: 'center'
  },
  removeButton: {
    width: '28px',
    height: '28px',
    fontSize: '20px',
    fontWeight: '300',
    color: '#EF4444',
    backgroundColor: 'transparent',
    border: '1px solid #EF4444',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  notesInput: {
    width: '100%',
    padding: '8px',
    fontSize: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
    color: '#000',
    boxSizing: 'border-box',
    marginTop: '8px'
  },
  productSubtotal: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#000',
    textAlign: 'right',
    marginTop: '6px'
  },
  productListSection: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#f9f9f9',
    border: '1px solid #ddd',
    borderRadius: '6px'
  },
  searchInput: {
    width: '100%',
    padding: '10px',
    fontSize: '13px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
    color: '#000',
    marginBottom: '12px',
    boxSizing: 'border-box'
  },
  searchResults: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '300px',
    overflowY: 'auto'
  },
  categoriesContainer: {
    overflow: 'hidden',
    position: 'relative',
    minHeight: '300px'
  },
  slideContainer: {
    display: 'flex',
    width: '200%',
    transition: 'transform 0.3s ease-in-out',
    position: 'relative'
  },
  slidePanel: {
    width: '50%',
    minWidth: '50%',
    flexShrink: 0
  },
  categoriesLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#666',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  categoriesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '300px',
    overflowY: 'auto'
  },
  categoryCard: {
    padding: '14px',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.2s ease'
  },
  categoryName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#000'
  },
  categoryArrow: {
    fontSize: '16px',
    color: '#666'
  },
  productsHeader: {
    marginBottom: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  backButton: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#000',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    textAlign: 'left',
    width: 'fit-content'
  },
  categoryTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#000',
    paddingBottom: '8px',
    borderBottom: '2px solid #000'
  },
  productsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '250px',
    overflowY: 'auto'
  },
  productOption: {
    padding: '12px',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.2s ease'
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
  },
  noProducts: {
    padding: '24px',
    textAlign: 'center',
    color: '#999',
    fontSize: '13px'
  },
  totalSection: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#fafafa',
    border: '1px solid #ddd',
    borderRadius: '6px'
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    fontSize: '13px',
    color: '#666'
  },
  totalFinal: {
    borderTop: '2px solid #ddd',
    marginTop: '6px',
    paddingTop: '10px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#000'
  },
  footer: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    borderTop: '1px solid #ddd',
    backgroundColor: '#fff',
    position: 'sticky',
    bottom: 0
  },
  cancelButton: {
    flex: 1,
    padding: '12px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#000',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  submitButton: {
    flex: 2,
    padding: '12px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#000',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    opacity: 1
  },
  variantBadge: {
    marginLeft: '8px',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: '500',
    backgroundColor: '#f0f0f0',
    color: '#666',
    borderRadius: '4px'
  },
  variantModalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000
  },
  variantModal: {
    width: '90%',
    maxWidth: '500px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column'
  },
  variantModalHeader: {
    padding: '20px',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  variantModalTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600'
  },
  variantModalBody: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1
  },
  variantProductName: {
    margin: '0 0 20px 0',
    fontSize: '16px',
    fontWeight: '500'
  },
  variantOptionGroup: {
    marginBottom: '20px'
  },
  variantOptionLabel: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#333'
  },
  variantOptionButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  variantOptionButton: {
    padding: '8px 16px',
    fontSize: '14px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  variantOptionButtonSelected: {
    borderColor: '#000',
    backgroundColor: '#000',
    color: '#fff'
  },
  variantSelectedInfo: {
    marginTop: '20px',
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  variantSelectedLabel: {
    fontSize: '14px',
    fontWeight: '500'
  },
  variantSelectedValue: {
    fontSize: '14px',
    flex: 1
  },
  variantSelectedPrice: {
    fontSize: '16px',
    fontWeight: 'bold'
  },
  variantError: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: '8px',
    fontSize: '14px'
  },
  variantModalFooter: {
    padding: '20px',
    borderTop: '1px solid #e0e0e0',
    display: 'flex',
    gap: '12px'
  },
  productOptionCard: {
    padding: '12px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginBottom: '8px'
  },
  productOptionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px'
  },
  variantsPreviewList: {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #e0e0e0'
  },
  variantPreviewItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
    fontSize: '13px'
  },
  variantPreviewName: {
    color: '#666',
    flex: 1
  },
  variantPreviewPrice: {
    fontWeight: '600',
    color: '#000'
  }
}

export default CreateOrderModal
