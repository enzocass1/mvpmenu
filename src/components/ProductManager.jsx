import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import ImageUpload from './ImageUpload'

function ProductManager({ category }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const menuRefs = useRef({})
  
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

  // Chiudi menu quando clicchi fuori
  useEffect(() => {
    function handleClickOutside(event) {
      if (openMenuId && menuRefs.current[openMenuId]) {
        if (!menuRefs.current[openMenuId].contains(event.target)) {
          setOpenMenuId(null)
        }
      }
    }

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuId])

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
    setOpenMenuId(null)
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
      setOpenMenuId(null)
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Errore durante l\'eliminazione')
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

  const toggleMenu = (productId) => {
    setOpenMenuId(openMenuId === productId ? null : productId)
  }

  return (
    <div style={{ 
      marginTop: '20px',
      padding: '20px',
      background: '#FFF3E0',
      border: '2px solid #000000',
      borderRadius: '8px',
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{ 
          margin: 0,
          fontSize: '18px',
          fontWeight: '700',
          color: '#000000',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          📦 PRODOTTI
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '700',
            color: '#FFFFFF',
            background: '#FF9800',
            border: '2px solid #000000',
            borderRadius: '4px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            boxShadow: '3px 3px 0px #000000',
            transition: 'all 0.2s ease'
          }}
          onMouseDown={(e) => {
            e.target.style.transform = 'translate(2px, 2px)'
            e.target.style.boxShadow = '1px 1px 0px #000000'
          }}
          onMouseUp={(e) => {
            e.target.style.transform = 'translate(0, 0)'
            e.target.style.boxShadow = '3px 3px 0px #000000'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translate(0, 0)'
            e.target.style.boxShadow = '3px 3px 0px #000000'
          }}
        >
          {showForm ? '✕ Chiudi' : '+ Prodotto'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{
          background: '#FFFFFF',
          border: '2px solid #000000',
          borderRadius: '8px',
          padding: '25px',
          marginBottom: '25px',
          boxShadow: '4px 4px 0px #000000'
        }}>
          <h4 style={{
            margin: '0 0 20px 0',
            fontSize: '16px',
            fontWeight: '700',
            color: '#000000',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {editingProduct ? '✏️ Modifica Prodotto' : '➕ Nuovo Prodotto'}
          </h4>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#000000',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
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
                padding: '12px 15px',
                fontSize: '16px',
                border: '2px solid #000000',
                borderRadius: '4px',
                background: '#F5F5F5',
                color: '#000000',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => e.target.style.background = '#FFFFFF'}
              onBlur={(e) => e.target.style.background = '#F5F5F5'}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#000000',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
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
                padding: '12px 15px',
                fontSize: '16px',
                border: '2px solid #000000',
                borderRadius: '4px',
                background: '#F5F5F5',
                color: '#000000',
                boxSizing: 'border-box',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
                resize: 'vertical',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => e.target.style.background = '#FFFFFF'}
              onBlur={(e) => e.target.style.background = '#F5F5F5'}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#000000',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
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
                padding: '12px 15px',
                fontSize: '16px',
                border: '2px solid #000000',
                borderRadius: '4px',
                background: '#F5F5F5',
                color: '#000000',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => e.target.style.background = '#FFFFFF'}
              onBlur={(e) => e.target.style.background = '#F5F5F5'}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <ImageUpload
              currentImageUrl={formData.image_url}
              onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
              folder="products"
            />
            
            <details style={{ marginTop: '10px' }}>
              <summary style={{ 
                cursor: 'pointer', 
                color: '#666', 
                fontSize: '14px',
                fontWeight: '600'
              }}>
                💡 Oppure inserisci URL manualmente
              </summary>
              <input
                type="text"
                placeholder="https://esempio.com/prodotto.jpg"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                style={{
                  marginTop: '10px',
                  width: '100%',
                  padding: '12px 15px',
                  fontSize: '16px',
                  border: '2px solid #000000',
                  borderRadius: '4px',
                  background: '#F5F5F5',
                  color: '#000000',
                  boxSizing: 'border-box'
                }}
              />
            </details>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px',
                fontSize: '16px',
                fontWeight: '700',
                color: '#FFFFFF',
                background: loading ? '#999999' : '#4CAF50',
                border: '2px solid #000000',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                boxShadow: '3px 3px 0px #000000',
                transition: 'all 0.2s ease'
              }}
              onMouseDown={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translate(2px, 2px)'
                  e.target.style.boxShadow = '1px 1px 0px #000000'
                }
              }}
              onMouseUp={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translate(0, 0)'
                  e.target.style.boxShadow = '3px 3px 0px #000000'
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translate(0, 0)'
                  e.target.style.boxShadow = '3px 3px 0px #000000'
                }
              }}
            >
              {loading ? 'Salvataggio...' : (editingProduct ? '💾 Aggiorna' : '✅ Crea')}
            </button>

            {editingProduct && (
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: '14px 24px',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#000000',
                  background: '#FFFFFF',
                  border: '2px solid #000000',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  boxShadow: '3px 3px 0px #000000',
                  transition: 'all 0.2s ease'
                }}
                onMouseDown={(e) => {
                  e.target.style.transform = 'translate(2px, 2px)'
                  e.target.style.boxShadow = '1px 1px 0px #000000'
                }}
                onMouseUp={(e) => {
                  e.target.style.transform = 'translate(0, 0)'
                  e.target.style.boxShadow = '3px 3px 0px #000000'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translate(0, 0)'
                  e.target.style.boxShadow = '3px 3px 0px #000000'
                }}
              >
                Annulla
              </button>
            )}
          </div>
        </form>
      )}

      {products.length === 0 ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          border: '2px dashed #000000',
          borderRadius: '8px',
          background: '#FFFFFF',
          color: '#666666'
        }}>
          <p style={{ 
            margin: 0, 
            fontSize: '16px',
            fontWeight: '600'
          }}>
            📦 Nessun prodotto ancora.
          </p>
          <p style={{ 
            margin: '10px 0 0 0', 
            fontSize: '14px'
          }}>
            Clicca su "+ Prodotto" per iniziare!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {products.map((product, index) => (
            <div
              key={product.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '50px 70px 1fr 50px',
                gap: '12px',
                alignItems: 'center',
                padding: '12px',
                background: '#FFFFFF',
                border: '2px solid #000000',
                borderRadius: '8px',
                boxShadow: '3px 3px 0px #000000',
                position: 'relative',
                minHeight: '90px'
              }}
            >
              {/* Colonna 1: Frecce riordinamento */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '4px',
                justifySelf: 'center'
              }}>
                <button
                  onClick={() => moveProduct(product.id, 'up')}
                  disabled={index === 0}
                  style={{
                    width: '36px',
                    height: '36px',
                    fontSize: '18px',
                    fontWeight: '700',
                    background: index === 0 ? '#F5F5F5' : '#FFFFFF',
                    border: '2px solid #000000',
                    borderRadius: '4px',
                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: index === 0 ? 0.4 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  ▲
                </button>
                <button
                  onClick={() => moveProduct(product.id, 'down')}
                  disabled={index === products.length - 1}
                  style={{
                    width: '36px',
                    height: '36px',
                    fontSize: '18px',
                    fontWeight: '700',
                    background: index === products.length - 1 ? '#F5F5F5' : '#FFFFFF',
                    border: '2px solid #000000',
                    borderRadius: '4px',
                    cursor: index === products.length - 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: index === products.length - 1 ? 0.4 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  ▼
                </button>
              </div>

              {/* Colonna 2: Immagine prodotto */}
              <div style={{ 
                width: '70px', 
                height: '70px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #000000',
                borderRadius: '4px',
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
                  <span style={{ fontSize: '24px' }}>🍽️</span>
                )}
              </div>

              {/* Colonna 3: Info prodotto */}
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                minWidth: 0,
                overflow: 'hidden'
              }}>
                <h4 style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#000000',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {product.name}
                </h4>
                {product.description && (
                  <p style={{
                    margin: 0,
                    fontSize: '13px',
                    color: '#666666',
                    lineHeight: '1.3',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {product.description}
                  </p>
                )}
                <p style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#4CAF50'
                }}>
                  € {product.price.toFixed(2)}
                </p>
              </div>

              {/* Colonna 4: Menu a tre puntini */}
              <div 
                style={{ 
                  position: 'relative',
                  justifySelf: 'center' 
                }} 
                ref={el => menuRefs.current[product.id] = el}
              >
                <button
                  onClick={() => toggleMenu(product.id)}
                  style={{
                    width: '44px',
                    height: '44px',
                    fontSize: '24px',
                    fontWeight: '700',
                    background: '#FFFFFF',
                    border: '2px solid #000000',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '2px 2px 0px #000000',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseDown={(e) => {
                    e.target.style.transform = 'translate(1px, 1px)'
                    e.target.style.boxShadow = '1px 1px 0px #000000'
                  }}
                  onMouseUp={(e) => {
                    e.target.style.transform = 'translate(0, 0)'
                    e.target.style.boxShadow = '2px 2px 0px #000000'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translate(0, 0)'
                    e.target.style.boxShadow = '2px 2px 0px #000000'
                  }}
                >
                  ⋮
                </button>

                {/* Dropdown menu */}
                {openMenuId === product.id && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '50px',
                    background: '#FFFFFF',
                    border: '2px solid #000000',
                    borderRadius: '4px',
                    boxShadow: '4px 4px 0px #000000',
                    minWidth: '170px',
                    zIndex: 1000,
                    overflow: 'hidden'
                  }}>
                    <button
                      onClick={() => handleEdit(product)}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        fontSize: '15px',
                        fontWeight: '600',
                        color: '#000000',
                        background: '#FFFFFF',
                        border: 'none',
                        borderBottom: '2px solid #000000',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#E3F2FD'}
                      onMouseLeave={(e) => e.target.style.background = '#FFFFFF'}
                    >
                      <span style={{ fontSize: '18px' }}>✏️</span>
                      <span>Modifica</span>
                    </button>
                    
                    <button
                      onClick={() => handleDelete(product.id)}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        fontSize: '15px',
                        fontWeight: '600',
                        color: '#f44336',
                        background: '#FFFFFF',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#FFEBEE'}
                      onMouseLeave={(e) => e.target.style.background = '#FFFFFF'}
                    >
                      <span style={{ fontSize: '18px' }}>🗑️</span>
                      <span>Elimina</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProductManager