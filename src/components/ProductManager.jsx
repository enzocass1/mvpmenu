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
    if (!confirm('Sei sicuro di voler eliminare questo prodotto?')) {
      return
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Errore: ' + error.message)
    } else {
      alert('Prodotto eliminato!')
      loadProducts()
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingProduct(null)
    setFormData({ name: '', description: '', price: '', image_url: '' })
  }

  // NUOVA FUNZIONE: Sposta prodotto su
  const moveUp = async (index) => {
    if (index === 0) return
    
    const newProducts = [...products]
    const temp = newProducts[index]
    newProducts[index] = newProducts[index - 1]
    newProducts[index - 1] = temp
    
    await updateOrder(newProducts)
  }

  // NUOVA FUNZIONE: Sposta prodotto giù
  const moveDown = async (index) => {
    if (index === products.length - 1) return
    
    const newProducts = [...products]
    const temp = newProducts[index]
    newProducts[index] = newProducts[index + 1]
    newProducts[index + 1] = temp
    
    await updateOrder(newProducts)
  }

  // NUOVA FUNZIONE: Aggiorna ordine nel database
  const updateOrder = async (newProducts) => {
    try {
      const updates = newProducts.map((prod, idx) => 
        supabase
          .from('products')
          .update({ order: idx })
          .eq('id', prod.id)
      )
      
      await Promise.all(updates)
      loadProducts()
    } catch (error) {
      alert('Errore nel riordinamento: ' + error.message)
    }
  }

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h4>🍽️ Prodotti</h4>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            style={{ padding: '8px 16px', background: '#FF9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
          >
            + Aggiungi Prodotto
          </button>
        )}
      </div>

      {showForm && (
        <div style={{ background: '#fff3e0', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
          <h4>{editingProduct ? 'Modifica Prodotto' : 'Nuovo Prodotto'}</h4>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Nome Prodotto *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{ width: '100%', padding: '8px' }}
                placeholder="Es: Cappuccino"
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Descrizione</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ width: '100%', padding: '8px', minHeight: '60px' }}
                placeholder="Descrizione del prodotto..."
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Prezzo (€) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
                style={{ width: '100%', padding: '8px' }}
                placeholder="Es: 2.50"
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <ImageUpload
                currentImageUrl={formData.image_url}
                onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
                folder="products"
              />
              
              <details style={{ marginTop: '10px' }}>
                <summary style={{ cursor: 'pointer', color: '#666', fontSize: '14px' }}>
                  💡 Oppure inserisci URL manualmente
                </summary>
                <input
                  type="text"
                  placeholder="https://esempio.com/prodotto.jpg"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  style={{ marginTop: '10px', width: '100%', padding: '8px' }}
                />
              </details>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="submit" 
                disabled={loading}
                style={{ padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Salvando...' : (editingProduct ? 'Aggiorna' : 'Crea')}
              </button>
              <button 
                type="button"
                onClick={handleCancel}
                style={{ padding: '8px 16px', background: '#999', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Annulla
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {products.map((product, index) => (
          <div key={product.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', background: 'white', display: 'flex', gap: '15px', alignItems: 'center' }}>
            {/* FRECCE RIORDINAMENTO */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <button
                onClick={() => moveUp(index)}
                disabled={index === 0}
                style={{
                  padding: '4px 8px',
                  background: index === 0 ? '#ccc' : '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: index === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
                title="Sposta su"
              >
                ▲
              </button>
              <button
                onClick={() => moveDown(index)}
                disabled={index === products.length - 1}
                style={{
                  padding: '4px 8px',
                  background: index === products.length - 1 ? '#ccc' : '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: index === products.length - 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
                title="Sposta giù"
              >
                ▼
              </button>
            </div>

            {/* IMMAGINE */}
            {product.image_url && (
              <img src={product.image_url} alt={product.name} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' }} />
            )}
            
            {/* INFO PRODOTTO */}
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 5px 0' }}>{product.name}</h4>
              {product.description && <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#666' }}>{product.description}</p>}
              <p style={{ margin: '0', fontWeight: 'bold', color: '#4CAF50' }}>€ {product.price.toFixed(2)}</p>
            </div>
            
            {/* BOTTONI AZIONE */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <button 
                onClick={() => handleEdit(product)}
                style={{ padding: '6px 12px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
              >
                Modifica
              </button>
              <button 
                onClick={() => handleDelete(product.id)}
                style={{ padding: '6px 12px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
              >
                Elimina
              </button>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '14px' }}>
          <p>Nessun prodotto in questa categoria. Aggiungine uno!</p>
        </div>
      )}
    </div>
  )
}

export default ProductManager