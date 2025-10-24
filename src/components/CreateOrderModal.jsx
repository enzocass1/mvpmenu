import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function CreateOrderModal({ restaurantId, onClose, onOrderCreated, staffSession, existingOrder = null }) {
  const [tableNumber, setTableNumber] = useState(existingOrder?.table_number || '')
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

  const isEditMode = !!existingOrder

  useEffect(() => {
    loadCategories()
    loadRestaurantSettings()
    if (existingOrder) {
      loadExistingOrderItems()
    }
  }, [restaurantId, existingOrder])

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

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name')

      if (error) throw error
      setCategories(data || [])

      // Load products for each category
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
            productsData[category.id] = categoryProducts
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
          subtotal: item.subtotal
        }))

      setSelectedProducts(items)
    } catch (error) {
      console.error('Errore caricamento prodotti ordine:', error)
    }
  }

  const addProduct = (product) => {
    // Ogni prodotto aggiunto è una nuova istanza separata (può avere note diverse)
    setSelectedProducts([...selectedProducts, {
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      quantity: 1,
      notes: '',
      subtotal: product.price
    }])

    // Reset UI state
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
    if (!tableNumber) return false
    const num = parseInt(tableNumber)
    if (isNaN(num) || num < 1) return false
    if (maxTables && num > maxTables) return false
    return true
  }

  const handleSubmit = async () => {
    if (!isTableNumberValid()) {
      if (maxTables) {
        alert(`Inserisci un numero tavolo valido (da 1 a ${maxTables})`)
      } else {
        alert('Inserisci un numero tavolo valido')
      }
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

    // Crea ordine
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        table_number: parseInt(tableNumber),
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

    // Aggiungi prodotti
    const orderItems = selectedProducts.map(p => ({
      order_id: order.id,
      product_id: p.product_id,
      product_name: p.product_name,
      product_price: p.price,
      quantity: p.quantity,
      notes: p.notes || null,
      subtotal: p.subtotal
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

    // Riaggiungi i prodotti aggiornati
    const orderItems = selectedProducts.map(p => ({
      order_id: existingOrder.id,
      product_id: p.product_id,
      product_name: p.product_name,
      product_price: p.price,
      quantity: p.quantity,
      notes: p.notes || null,
      subtotal: p.subtotal
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
          {/* Table Number */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Numero Tavolo *</label>
            <input
              type="number"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              style={{
                ...styles.input,
                borderColor: tableNumber && !isTableNumberValid() ? '#EF4444' : '#ddd'
              }}
              placeholder={maxTables ? `Da 1 a ${maxTables}` : "Es: 5"}
              min="1"
              max={maxTables || undefined}
            />
            {tableNumber && !isTableNumberValid() && (
              <div style={styles.errorText}>
                {maxTables
                  ? `Il numero tavolo deve essere compreso tra 1 e ${maxTables}`
                  : 'Inserisci un numero tavolo valido'}
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
                        <div style={styles.productName}>{product.product_name}</div>
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
                        style={styles.productOption}
                        onClick={() => addProduct(product)}
                      >
                        <div style={styles.productOptionName}>{product.name}</div>
                        <div style={styles.productOptionPrice}>€{product.price.toFixed(2)}</div>
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
                                  style={styles.productOption}
                                  onClick={() => addProduct(product)}
                                >
                                  <div style={styles.productOptionName}>{product.name}</div>
                                  <div style={styles.productOptionPrice}>€{product.price.toFixed(2)}</div>
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
    zIndex: 1000
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
  }
}

export default CreateOrderModal
