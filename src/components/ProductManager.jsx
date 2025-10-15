import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import ImageUpload from './ImageUpload'

function ProductManager({ category }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
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
        alert('✅ Prodotto aggiornato!')
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
        alert('✅ Prodotto creato!')
      }

      setFormData({ name: '', description: '', price: '', image_url: '' })
      setShowForm(false)
      setEditingProduct(null)
      loadProducts()
    } catch (error) {
      alert('Errore: ' + error.message)
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
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo prodotto?')) {
      return
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Errore: ' + error.message)
    } else {
      alert('✅ Prodotto eliminato!')
      loadProducts()
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingProduct(null)
    setFormData({ name: '', description: '', price: '', image_url: '' })
  }

  const moveProduct = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= products.length) return
    
    const newProducts = [...products]
    ;[newProducts[index], newProducts[targetIndex]] = [newProducts[targetIndex], newProducts[index]]
    
    try {
      const updates = newProducts.map((prod, idx) => 
        supabase.from('products').update({ order: idx }).eq('id', prod.id)
      )
      
      await Promise.all(updates)
      setProducts(newProducts)
    } catch (error) {
      alert('Errore nel riordinamento: ' + error.message)
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h4 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: '700',
          color: '#000000',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          🍽️ Prodotti
        </h4>
        
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '600',
              color: '#FFFFFF',
              background: '#FF9800',
              border: '2px solid #000000',
              borderRadius: '4px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: '2px 2px 0px #000000',
              transition: 'all 0.2s ease'
            }}
          >
            + Prodotto
          </button>
        )}
      </div>

      {/* Form Prodotto */}
      {showForm && (
        <div style={{
          background: '#FFF3E0',
          border: '2px solid #000000',
          borderRadius: '4px',
          padding: '20px',
          marginBottom: '15px',
          boxShadow: '3px 3px 0px #000000'
        }}>
          <h4 style={{
            margin: '0 0 20px 0',
            fontSize: '16px',
            fontWeight: '700',
            color: '#000000'
          }}>
            {editingProduct ? '✏️ Modifica Prodotto' : '➕ Nuovo Prodotto'}
          </h4>

          <form onSubmit={handleSubmit}>
            {/* Nome */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: '600',
                color: '#000000',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Nome Prodotto *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '15px',
                  border: '2px solid #000000',
                  borderRadius: '4px',
                  background: '#FFFFFF',
                  color: '#000000',
                  boxSizing: 'border-box'
                }}
                placeholder="Es: Cappuccino"
              />
            </div>

            {/* Descrizione */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
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
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '15px',
                  border: '2px solid #000000',
                  borderRadius: '4px',
                  background: '#FFFFFF',
                  color: '#000000',
                  boxSizing: 'border-box',
                  minHeight: '80px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
                placeholder="Descrizione del prodotto..."
              />
            </div>

            {/* Prezzo */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
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
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '15px',
                  border: '2px solid #000000',
                  borderRadius: '4px',
                  background: '#FFFFFF',
                  color: '#000000',
                  boxSizing: 'border-box'
                }}
                placeholder="Es: 2.50"
              />
            </div>

            {/* Immagine */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: '600',
                color: '#000000',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Immagine Prodotto
              </label>
              <ImageUpload
                currentImageUrl={formData.image_url}
                onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
                folder="products"
              />
              
              <details style={{ marginTop: '10px' }}>
                <summary style={{
                  cursor: 'pointer',
                  color: '#666',
                  fontSize: '13px',
                  padding: '8px',
                  background: '#FFFFFF',
                  border: '1px solid #000000',
                  borderRadius: '4px',
                  userSelect: 'none'
                }}>
                  💡 Oppure inserisci URL manualmente
                </summary>
                <input
                  type="text"
                  placeholder="https://esempio.com/prodotto.jpg"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  style={{
                    marginTop: '8px',
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '13px',
                    border: '2px solid #000000',
                    borderRadius: '4px',
                    background: '#FFFFFF',
                    color: '#000000',
                    boxSizing: 'border-box'
                  }}
                />
              </details>
            </div>

            {/* Bottoni */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="submit" 
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#FFFFFF',
                  background: loading ? '#CCCCCC' : '#4CAF50',
                  border: '2px solid #000000',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  boxShadow: loading ? 'none' : '2px 2px 0px #000000'
                }}
              >
                {loading ? '⏳ Salvando...' : (editingProduct ? '✓ Aggiorna' : '+ Crea')}
              </button>

              <button 
                type="button"
                onClick={handleCancel}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#000000',
                  background: '#FFFFFF',
                  border: '2px solid #000000',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  boxShadow: '2px 2px 0px #000000'
                }}
              >
                ✕ Annulla
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista Prodotti */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {products.map((product, index) => (
          <div 
            key={product.id} 
            style={{
              background: '#FFFFFF',
              border: '2px solid #000000',
              borderRadius: '4px',
              padding: '15px',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              boxShadow: '2px 2px 0px #000000'
            }}
          >
            {/* Frecce Riordinamento */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button
                onClick={() => moveProduct(index, 'up')}
                disabled={index === 0}
                style={{
                  width: '28px',
                  height: '28px',
                  padding: '0',
                  fontSize: '14px',
                  background: index === 0 ? '#E0E0E0' : '#000000',
                  color: index === 0 ? '#999' : '#FFFFFF',
                  border: '2px solid #000000',
                  borderRadius: '4px',
                  cursor: index === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: '700'
                }}
                title="Sposta su"
              >
                ▲
              </button>
              <button
                onClick={() => moveProduct(index, 'down')}
                disabled={index === products.length - 1}
                style={{
                  width: '28px',
                  height: '28px',
                  padding: '0',
                  fontSize: '14px',
                  background: index === products.length - 1 ? '#E0E0E0' : '#000000',
                  color: index === products.length - 1 ? '#999' : '#FFFFFF',
                  border: '2px solid #000000',
                  borderRadius: '4px',
                  cursor: index === products.length - 1 ? 'not-allowed' : 'pointer',
                  fontWeight: '700'
                }}
                title="Sposta giù"
              >
                ▼
              </button>
            </div>

            {/* Immagine */}
            {product.image_url && (
              <img 
                src={product.image_url} 
                alt={product.name} 
                style={{
                  width: '70px',
                  height: '70px',
                  objectFit: 'cover',
                  borderRadius: '4px',
                  border: '2px solid #000000'
                }} 
              />
            )}
            
            {/* Info Prodotto */}
            <div style={{ flex: 1 }}>
              <h4 style={{
                margin: '0 0 4px 0',
                fontSize: '15px',
                fontWeight: '700',
                color: '#000000'
              }}>
                {product.name}
              </h4>
              {product.description && (
                <p style={{
                  margin: '0 0 4px 0',
                  fontSize: '13px',
                  color: '#666',
                  lineHeight: '1.4'
                }}>
                  {product.description}
                </p>
              )}
              <p style={{
                margin: '0',
                fontSize: '16px',
                fontWeight: '700',
                color: '#4CAF50'
              }}>
                € {product.price.toFixed(2)}
              </p>
            </div>
            
            {/* Bottoni Azione */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button 
                onClick={() => handleEdit(product)}
                style={{
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#FFFFFF',
                  background: '#2196F3',
                  border: '2px solid #000000',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  boxShadow: '1px 1px 0px #000000'
                }}
              >
                ✏️ Modifica
              </button>
              <button 
                onClick={() => handleDelete(product.id)}
                style={{
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#FFFFFF',
                  background: '#f44336',
                  border: '2px solid #000000',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  boxShadow: '1px 1px 0px #000000'
                }}
              >
                🗑️ Elimina
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {products.length === 0 && !showForm && (
        <div style={{
          textAlign: 'center',
          padding: '30px 20px',
          background: '#F5F5F5',
          border: '2px dashed #CCCCCC',
          borderRadius: '4px'
        }}>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#666'
          }}>
            🍽️ Nessun prodotto in questa categoria.<br />
            <span style={{ fontSize: '13px' }}>Clicca su "+ Prodotto" per aggiungerne uno!</span>
          </p>
        </div>
      )}
    </div>
  )
}

export default ProductManager