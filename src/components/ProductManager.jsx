import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import ImageUpload from './ImageUpload'
import { 
  checkPremiumAccess, 
  canAddItem, 
  isProductVisible,
  FREE_LIMITS 
} from '../utils/subscription'

function ProductManager({ category, restaurant, onUpgradeClick }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [openProductId, setOpenProductId] = useState(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
  })

  useEffect(() => {
    if (category) {
      loadProducts()
    }
  }, [category])

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category_id', category.id)
      .order('order', { ascending: true })

    if (!error && data) {
      setProducts(data)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!editingProduct && !canAddItem(restaurant, products.length)) {
      alert(`Hai raggiunto il limite massimo di prodotti per questa categoria (${FREE_LIMITS.MAX_ITEMS_PER_CATEGORY}).\n\nPassa a Premium per prodotti illimitati!`)
      return
    }

    setLoading(true)

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update({
            name: formData.name,
            description: formData.description,
            price: parseFloat(formData.price),
            image_url: formData.image_url,
          })
          .eq('id', editingProduct.id)

        if (error) throw error
        alert('Prodotto aggiornato!')
      } else {
        const maxOrder = products.length > 0 ? Math.max(...products.map(p => p.order)) : -1
        
        const { error } = await supabase
          .from('products')
          .insert([
            {
              category_id: category.id,
              name: formData.name,
              description: formData.description,
              price: parseFloat(formData.price),
              image_url: formData.image_url,
              order: maxOrder + 1,
              is_visible: true,
            }
          ])

        if (error) throw error
        alert('Prodotto creato!')
      }

      await loadProducts()
      resetForm()
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      image_url: product.image_url || '',
    })
    setShowForm(true)
    setOpenProductId(null)
  }

  const handleDelete = async (productId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo prodotto?')) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) throw error
      
      alert('Prodotto eliminato!')
      await loadProducts()
      setOpenProductId(null)
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Errore durante l\'eliminazione')
    }
  }

  const toggleVisibility = async (product) => {
    try {
      const newVisibility = !product.is_visible
      
      const { error } = await supabase
        .from('products')
        .update({ is_visible: newVisibility })
        .eq('id', product.id)

      if (error) throw error
      
      if (!newVisibility) {
        const productsToUpdate = products
          .filter(p => p.order > product.order)
          .map(p => ({ id: p.id, order: p.order - 1 }))
        
        for (const prod of productsToUpdate) {
          await supabase
            .from('products')
            .update({ order: prod.order })
            .eq('id', prod.id)
        }
        
        await supabase
          .from('products')
          .update({ order: products.length - 1 })
          .eq('id', product.id)
      } else {
        const visibleCount = products.filter(p => p.is_visible).length
        await supabase
          .from('products')
          .update({ order: visibleCount })
          .eq('id', product.id)
      }
      
      await loadProducts()
    } catch (error) {
      console.error('Error toggling visibility:', error)
      alert('Errore durante l\'aggiornamento della visibilità')
    }
  }

  const moveProduct = async (productId, direction) => {
    const currentIndex = products.findIndex(p => p.id === productId)
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === products.length - 1)
    ) {
      return
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    const newProducts = [...products]
    const [movedProduct] = newProducts.splice(currentIndex, 1)
    newProducts.splice(newIndex, 0, movedProduct)

    const updates = newProducts.map((product, index) => ({
      id: product.id,
      order: index,
    }))

    try {
      for (const update of updates) {
        await supabase
          .from('products')
          .update({ order: update.order })
          .eq('id', update.id)
      }
      await loadProducts()
    } catch (error) {
      console.error('Error reordering products:', error)
      alert('Errore durante il riordinamento')
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingProduct(null)
    setFormData({
      name: '',
      description: '',
      price: '',
      image_url: '',
    })
  }

  const toggleProduct = (productId) => {
    setOpenProductId(openProductId === productId ? null : productId)
  }

  const handleButtonClick = () => {
    if (!canAddNewItem && !showForm) {
      // Apri modal upgrade
      if (onUpgradeClick && typeof onUpgradeClick === 'function') {
        onUpgradeClick()
      }
    } else {
      setShowForm(!showForm)
    }
  }

  // Usa hasValidAccess invece di isPremium per controllare l'accesso alle feature premium
  const { hasValidAccess } = restaurant ? checkPremiumAccess(restaurant) : { hasValidAccess: false }
  const canAddNewItem = restaurant ? canAddItem(restaurant, products.length) : false
  
  const hiddenProductsCount = !hasValidAccess && products.length > FREE_LIMITS.MAX_ITEMS_PER_CATEGORY 
    ? products.length - FREE_LIMITS.MAX_ITEMS_PER_CATEGORY 
    : 0

  return (
    <div>
      {restaurant && (
        <div style={{
          padding: '16px',
          background: hasValidAccess ? '#E8F5E9' : '#FFF3E0',
          border: `1px solid ${hasValidAccess ? '#C8E6C9' : '#FFE0B2'}`,
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#000000',
                marginBottom: '4px'
              }}>
                Prodotti: <strong>{products.length}</strong>{!hasValidAccess && ` / ${FREE_LIMITS.MAX_ITEMS_PER_CATEGORY}`}
                {hasValidAccess && ' (Illimitati)'}
              </div>
              {!hasValidAccess && products.length >= FREE_LIMITS.MAX_ITEMS_PER_CATEGORY && (
                <div style={{
                  fontSize: '13px',
                  color: '#f44336',
                  fontWeight: '500'
                }}>
                  Limite raggiunto. Passa a Premium per prodotti illimitati.
                </div>
              )}
              {hiddenProductsCount > 0 && (
                <div style={{
                  fontSize: '13px',
                  color: '#FF9800',
                  fontWeight: '500',
                  marginTop: '4px'
                }}>
                  {hiddenProductsCount} {hiddenProductsCount === 1 ? 'prodotto nascosto' : 'prodotti nascosti'} dal menu pubblico
                </div>
              )}
            </div>
            
            <button
              onClick={handleButtonClick}
              aria-label={showForm ? 'Chiudi form prodotto' : 'Apri form nuovo prodotto'}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '500',
                color: (showForm || !canAddNewItem) ? '#000000' : '#FFFFFF',
                background: showForm ? '#FFFFFF' : (!canAddNewItem ? '#FF9800' : '#000000'),
                border: `1px solid ${showForm ? '#000000' : (!canAddNewItem ? '#FF9800' : '#000000')}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                if (showForm) {
                  e.target.style.background = '#F5F5F5'
                } else if (!canAddNewItem) {
                  e.target.style.background = '#F57C00'
                } else {
                  e.target.style.background = '#333333'
                }
              }}
              onMouseLeave={(e) => {
                if (showForm) {
                  e.target.style.background = '#FFFFFF'
                } else if (!canAddNewItem) {
                  e.target.style.background = '#FF9800'
                } else {
                  e.target.style.background = '#000000'
                }
              }}
            >
              {showForm ? 'Annulla' : (canAddNewItem ? '+ Nuovo Prodotto' : 'Passa a Premium')}
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{
          marginBottom: '30px',
          padding: '25px',
          background: '#F5F5F5',
          border: '1px solid #E0E0E0',
          borderRadius: '8px'
        }}>
          <h4 style={{
            margin: '0 0 20px 0',
            fontSize: '15px',
            fontWeight: '500',
            color: '#000000'
          }}>
            {editingProduct ? 'Modifica Prodotto' : 'Nuovo Prodotto'}
          </h4>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              fontWeight: '400',
              color: '#666'
            }}>
              Nome Prodotto *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Es: Margherita"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid #E0E0E0',
                borderRadius: '4px',
                background: '#FFFFFF',
                color: '#000000',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#000000'}
              onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              fontWeight: '400',
              color: '#666'
            }}>
              Descrizione
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrizione opzionale del prodotto"
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid #E0E0E0',
                borderRadius: '4px',
                background: '#FFFFFF',
                color: '#000000',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#000000'}
              onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              fontWeight: '400',
              color: '#666'
            }}>
              Prezzo (€) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="Es: 8.50"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid #E0E0E0',
                borderRadius: '4px',
                background: '#FFFFFF',
                color: '#000000',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#000000'}
              onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              fontWeight: '400',
              color: '#666'
            }}>
              Immagine Prodotto
            </label>
            <ImageUpload
              currentImageUrl={formData.image_url}
              onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
              folder="products"
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#FFFFFF',
                background: loading ? '#999999' : '#000000',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                if (!loading) e.target.style.background = '#333333'
              }}
              onMouseLeave={(e) => {
                if (!loading) e.target.style.background = '#000000'
              }}
            >
              {loading ? 'Salvando...' : (editingProduct ? 'Aggiorna' : 'Crea Prodotto')}
            </button>

            <button
              type="button"
              onClick={resetForm}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#000000',
                background: '#FFFFFF',
                border: '1px solid #000000',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onMouseEnter={(e) => e.target.style.background = '#F5F5F5'}
              onMouseLeave={(e) => e.target.style.background = '#FFFFFF'}
            >
              Annulla
            </button>
          </div>
        </form>
      )}

      {products.length === 0 ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          border: '1px dashed #E0E0E0',
          borderRadius: '8px',
          background: '#FAFAFA',
          color: '#666666'
        }}>
          <p style={{ 
            margin: 0, 
            fontSize: '14px',
            fontWeight: '400'
          }}>
            Nessun prodotto ancora creato.
          </p>
          <p style={{ 
            margin: '8px 0 0 0', 
            fontSize: '13px',
            color: '#999999'
          }}>
            Clicca su "+ Nuovo Prodotto" per iniziare.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {products.map((product, index) => {
            // Usa la firma corretta: isProductVisible(product, productIndex, restaurant)
            const isVisible = restaurant ? isProductVisible(product, index, restaurant) : true
            
            return (
              <div
                key={product.id}
                style={{
                  background: '#FFFFFF',
                  border: isVisible ? '1px solid #E0E0E0' : '2px dashed #FF9800',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  opacity: product.is_visible === false ? 0.5 : 1,
                  position: 'relative',
                  transition: 'box-shadow 0.2s ease'
                }}
              >
                {!isVisible && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#FFFFFF',
                    background: '#FF9800',
                    borderRadius: '4px',
                    zIndex: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px'
                  }}>
                    NASCOSTO
                  </div>
                )}

                <button
                  onClick={() => toggleProduct(product.id)}
                  aria-expanded={openProductId === product.id}
                  aria-label={`${openProductId === product.id ? 'Chiudi' : 'Apri'} prodotto ${product.name}`}
                  style={{
                    width: '100%',
                    padding: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.2s ease',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F5'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                    <svg 
                      width="20" 
                      height="20" 
                      viewBox="0 0 24 24" 
                      fill="none"
                      style={{
                        transform: openProductId === product.id ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        flexShrink: 0
                      }}
                    >
                      <path 
                        d="M9 6l6 6-6 6" 
                        stroke="#000000" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                    
                    <span style={{ 
                      fontSize: '15px',
                      fontWeight: '500',
                      color: '#000000'
                    }}>
                      {product.name}
                    </span>
                  </div>
                  
                  <span style={{ 
                    fontSize: '15px',
                    fontWeight: '500',
                    color: '#000000'
                  }}>
                    € {product.price.toFixed(2)}
                  </span>
                </button>

                {openProductId === product.id && (
                  <div style={{
                    padding: '20px',
                    borderTop: '1px solid #E0E0E0',
                    background: '#FAFAFA'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'flex-start',
                      gap: '15px',
                      marginBottom: '20px'
                    }}>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div style={{ 
                          width: '150px',
                          height: '150px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #E0E0E0',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          background: product.image_url ? 'transparent' : '#F5F5F5'
                        }}>
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                            />
                          ) : (
                            <span style={{ 
                              fontSize: '12px',
                              color: '#999999',
                              fontWeight: '500'
                            }}>
                              Nessuna immagine
                            </span>
                          )}
                        </div>

                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          justifyContent: 'center'
                        }}>
                          <button
                            onClick={() => handleEdit(product)}
                            aria-label={`Modifica prodotto ${product.name}`}
                            style={{
                              width: '38px',
                              height: '38px',
                              padding: '0',
                              color: '#FFFFFF',
                              background: '#000000',
                              border: '1px solid #000000',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              outline: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#333333'}
                            onMouseLeave={(e) => e.target.style.background = '#000000'}
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                              <path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
                            </svg>
                          </button>

                          <button
                            onClick={() => toggleVisibility(product)}
                            aria-label={product.is_visible === false ? `Mostra prodotto ${product.name}` : `Nascondi prodotto ${product.name}`}
                            style={{
                              width: '38px',
                              height: '38px',
                              padding: '0',
                              color: '#000000',
                              background: '#FFFFFF',
                              border: '1px solid #000000',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              outline: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#F5F5F5'}
                            onMouseLeave={(e) => e.target.style.background = '#FFFFFF'}
                          >
                            {product.is_visible === false ? (
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                                <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                              </svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                                <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
                                <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
                              </svg>
                            )}
                          </button>

                          <button
                            onClick={() => handleDelete(product.id)}
                            aria-label={`Elimina prodotto ${product.name}`}
                            style={{
                              width: '38px',
                              height: '38px',
                              padding: '0',
                              color: '#FFFFFF',
                              background: '#f44336',
                              border: '1px solid #f44336',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              outline: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#d32f2f'}
                            onMouseLeave={(e) => e.target.style.background = '#f44336'}
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                              <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <button
                          onClick={() => moveProduct(product.id, 'up')}
                          disabled={index === 0}
                          aria-label={`Sposta prodotto ${product.name} in alto`}
                          style={{
                            width: '38px',
                            height: '38px',
                            padding: '0',
                            color: index === 0 ? '#999999' : '#000000',
                            background: '#FFFFFF',
                            border: `1px solid ${index === 0 ? '#E0E0E0' : '#000000'}`,
                            borderRadius: '6px',
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            outline: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={(e) => {
                            if (index !== 0) e.target.style.background = '#F5F5F5'
                          }}
                          onMouseLeave={(e) => {
                            if (index !== 0) e.target.style.background = '#FFFFFF'
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path fillRule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z"/>
                          </svg>
                        </button>

                        <button
                          onClick={() => moveProduct(product.id, 'down')}
                          disabled={index === products.length - 1}
                          aria-label={`Sposta prodotto ${product.name} in basso`}
                          style={{
                            width: '38px',
                            height: '38px',
                            padding: '0',
                            color: index === products.length - 1 ? '#999999' : '#000000',
                            background: '#FFFFFF',
                            border: `1px solid ${index === products.length - 1 ? '#E0E0E0' : '#000000'}`,
                            borderRadius: '6px',
                            cursor: index === products.length - 1 ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            outline: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={(e) => {
                            if (index !== products.length - 1) e.target.style.background = '#F5F5F5'
                          }}
                          onMouseLeave={(e) => {
                            if (index !== products.length - 1) e.target.style.background = '#FFFFFF'
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path fillRule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div style={{ 
                      textAlign: 'center',
                      paddingTop: '10px'
                    }}>
                      {product.description && (
                        <p style={{
                          margin: '0 0 10px 0',
                          fontSize: '13px',
                          color: '#666666',
                          lineHeight: '1.5'
                        }}>
                          {product.description}
                        </p>
                      )}

                      <p style={{
                        margin: 0,
                        fontSize: '18px',
                        fontWeight: '500',
                        color: '#000000'
                      }}>
                        € {product.price.toFixed(2)}
                      </p>

                      {product.is_visible === false && (
                        <p style={{
                          margin: '8px 0 0 0',
                          fontSize: '12px',
                          fontWeight: '500',
                          color: '#999999',
                          fontStyle: 'italic'
                        }}>
                          (Nascosto sul sito)
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ProductManager