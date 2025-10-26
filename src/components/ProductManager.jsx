import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import ImageUpload from './ImageUpload'
import VariantManager from './VariantManager'
import {
  checkPremiumAccess,
  canAddItem,
  FREE_LIMITS
} from '../utils/subscription'

function ProductManager({ restaurantId, restaurant }) {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [showVariantManager, setShowVariantManager] = useState(null)
  const [variantCounts, setVariantCounts] = useState({})
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
    category_id: '',
  })

  useEffect(() => {
    if (restaurantId) {
      loadData()
    }
  }, [restaurantId])

  const loadData = async () => {
    // Load categories
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('order', { ascending: true })

    if (categoriesData) {
      setCategories(categoriesData)
    }

    // Load all products for this restaurant through categories
    if (categoriesData && categoriesData.length > 0) {
      const categoryIds = categoriesData.map(cat => cat.id)
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .in('category_id', categoryIds)
        .order('name', { ascending: true })

      if (productsData) {
        setProducts(productsData)

        // Load variant counts for each product
        const counts = {}
        for (const product of productsData) {
          const { count } = await supabase
            .from('v_product_variants')
            .select('*', { count: 'exact', head: true })
            .eq('product_id', product.id)
          counts[product.id] = count || 0
        }
        setVariantCounts(counts)
      }
    }
  }

  const loadProducts = loadData // Alias for backward compatibility

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.category_id) {
      alert('Seleziona una categoria')
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
            category_id: formData.category_id,
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
              category_id: formData.category_id,
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

      await loadData()
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
      category_id: product.category_id || '',
    })
    setShowModal(true)
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
      await loadData()
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


      await loadData()
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
      await loadData()
    } catch (error) {
      console.error('Error reordering products:', error)
      alert('Errore durante il riordinamento')
    }
  }

  const resetForm = () => {
    setShowModal(false)
    setEditingProduct(null)
    setFormData({
      name: '',
      description: '',
      price: '',
      image_url: '',
      category_id: '',
    })
  }

  const handleCreateClick = () => {
    setShowModal(true)
  }

  const { hasValidAccess } = restaurant ? checkPremiumAccess(restaurant) : { hasValidAccess: false }

  // Get category name for a product
  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId)
    return category ? category.name : 'Senza categoria'
  }

  return (
    <>
      {/* Modal for Create/Edit Product */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <form onSubmit={handleSubmit} style={{ padding: '30px' }}>
              <h3 style={{
                margin: '0 0 24px 0',
                fontSize: '20px',
                fontWeight: '600',
                color: '#000000'
              }}>
                {editingProduct ? 'Modifica Prodotto' : 'Nuovo Prodotto'}
              </h3>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  Categoria *
                </label>
                <select
                  required
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #E0E0E0',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    color: '#000000',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                >
                  <option value="">Seleziona categoria</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
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
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #E0E0E0',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    color: '#000000',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  Descrizione
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrizione opzionale"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #E0E0E0',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    color: '#000000',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
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
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #E0E0E0',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    color: '#000000',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  Immagine Prodotto
                </label>
                <ImageUpload
                  currentImageUrl={formData.image_url}
                  onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
                  folder="products"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    fontSize: '15px',
                    fontWeight: '500',
                    color: '#FFFFFF',
                    background: loading ? '#999999' : '#000000',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                >
                  {loading ? 'Salvando...' : (editingProduct ? 'Aggiorna' : 'Crea')}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    padding: '12px 24px',
                    fontSize: '15px',
                    fontWeight: '500',
                    color: '#666',
                    background: '#F5F5F5',
                    border: '1px solid #E0E0E0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div>
        {restaurant && (
          <div style={{
            padding: '16px',
            background: hasValidAccess ? '#E8F5E9' : '#FFF3E0',
            border: `1px solid ${hasValidAccess ? '#C8E6C9' : '#FFE0B2'}`,
            borderRadius: '8px',
            marginBottom: '24px'
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
                  Prodotti: <strong>{products.length}</strong>
                  {hasValidAccess && ' (Illimitati)'}
                </div>
              </div>

              <button
                onClick={handleCreateClick}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#FFFFFF',
                  background: '#000000',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
              >
                + Nuovo Prodotto
              </button>
            </div>
          </div>
        )}

        {/* Category Filter Button */}
        {products.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => setShowCategoryFilter(true)}
              style={{
                width: '100%',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#000000',
                background: '#FFFFFF',
                border: '1px solid #000000',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#000000'
                e.target.style.color = '#FFFFFF'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#FFFFFF'
                e.target.style.color = '#000000'
              }}
            >
              Filtra per categorie
            </button>
          </div>
        )}

        {products.length === 0 ? (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            border: '2px dashed #E0E0E0',
            borderRadius: '12px',
            background: '#FAFAFA'
          }}>
            <p style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: '500',
              color: '#666666'
            }}>
              Nessun prodotto creato
            </p>
            <p style={{
              margin: '8px 0 0 0',
              fontSize: '14px',
              color: '#999999'
            }}>
              {categories.length === 0 ? 'Crea prima una categoria dalla tab Categorie' : 'Clicca su "+ Nuovo Prodotto" per iniziare'}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {products
              .filter(p => selectedCategory === 'all' || p.category_id === selectedCategory)
              .map((product) => {
              const variantCount = variantCounts[product.id] || 0
              const categoryName = getCategoryName(product.category_id)

              return (
                <div
                  key={product.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E0E0E0',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    opacity: product.is_visible === false ? 0.6 : 1,
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {/* Product Image */}
                  <div style={{
                    width: '100%',
                    height: '180px',
                    background: product.image_url ? `url(${product.image_url})` : '#F5F5F5',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {!product.image_url && (
                      <span style={{
                        fontSize: '14px',
                        color: '#999999',
                        fontWeight: '500'
                      }}>
                        Nessuna immagine
                      </span>
                    )}
                  </div>

                  {/* Product Info */}
                  <div style={{ padding: '16px' }}>
                    <h4 style={{
                      margin: '0 0 4px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#000000'
                    }}>
                      {product.name}
                    </h4>

                    <p style={{
                      margin: '0 0 8px 0',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#000000'
                    }}>
                      €{product.price.toFixed(2)}
                    </p>

                    <div style={{
                      margin: '0 0 16px 0',
                      fontSize: '13px',
                      color: '#666666'
                    }}>
                      <div>{categoryName}</div>
                      {variantCount > 0 && (
                        <div>{variantCount} {variantCount === 1 ? 'variante' : 'varianti'}</div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px'
                    }}>
                      <button
                        onClick={() => handleEdit(product)}
                        title="Modifica"
                        style={{
                          padding: '10px',
                          fontSize: '13px',
                          fontWeight: '500',
                          color: '#FFFFFF',
                          background: '#000000',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                          <path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
                        </svg>
                        Modifica
                      </button>

                      <button
                        onClick={() => toggleVisibility(product)}
                        title={product.is_visible === false ? 'Mostra' : 'Nascondi'}
                        style={{
                          padding: '10px',
                          color: '#000000',
                          background: '#FFFFFF',
                          border: '1px solid #E0E0E0',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {product.is_visible === false ? (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                            <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                            <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
                            <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
                          </svg>
                        )}
                      </button>

                      <button
                        onClick={() => setShowVariantManager(product)}
                        title="Gestisci Varianti"
                        style={{
                          padding: '10px',
                          color: '#FFFFFF',
                          background: '#2196F3',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>
                          <path d="M8 4a.5.5 0 0 1 .5.5V6H10a.5.5 0 0 1 0 1H8.5v1.5a.5.5 0 0 1-1 0V7H6a.5.5 0 0 1 0-1h1.5V4.5A.5.5 0 0 1 8 4z"/>
                        </svg>
                        Varianti
                      </button>

                      <button
                        onClick={() => handleDelete(product.id)}
                        title="Elimina"
                        style={{
                          padding: '10px',
                          color: '#FFFFFF',
                          background: '#f44336',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                          <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Hidden Badge */}
                  {product.is_visible === false && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      padding: '6px 12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: '#FFFFFF',
                      background: '#FF9800',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Nascosto
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Variant Manager Modal */}
        {showVariantManager && (
          <VariantManager
            product={showVariantManager}
            onClose={() => setShowVariantManager(null)}
            onSave={() => {
              loadData() // Ricarica prodotti dopo modifiche varianti
            }}
          />
        )}

        {/* Category Filter Modal */}
        {showCategoryFilter && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px'
            }}
            onClick={() => setShowCategoryFilter(false)}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                maxWidth: '400px',
                width: '100%',
                maxHeight: '80vh',
                overflow: 'auto',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
                  Filtra per categoria
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setSelectedCategory('all')
                      setShowCategoryFilter(false)
                    }}
                    style={{
                      padding: '12px 16px',
                      fontSize: '14px',
                      fontWeight: selectedCategory === 'all' ? '600' : '500',
                      color: selectedCategory === 'all' ? '#FFFFFF' : '#000000',
                      background: selectedCategory === 'all' ? '#000000' : '#F5F5F5',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Tutte le categorie
                  </button>

                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id)
                        setShowCategoryFilter(false)
                      }}
                      style={{
                        padding: '12px 16px',
                        fontSize: '14px',
                        fontWeight: selectedCategory === cat.id ? '600' : '500',
                        color: selectedCategory === cat.id ? '#FFFFFF' : '#000000',
                        background: selectedCategory === cat.id ? '#000000' : '#F5F5F5',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedCategory !== cat.id) {
                          e.target.style.background = '#E0E0E0'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedCategory !== cat.id) {
                          e.target.style.background = '#F5F5F5'
                        }
                      }}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowCategoryFilter(false)}
                  style={{
                    marginTop: '20px',
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#666666',
                    background: 'transparent',
                    border: '1px solid #E0E0E0',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default ProductManager
