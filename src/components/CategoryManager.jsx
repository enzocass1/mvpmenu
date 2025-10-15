import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import ProductManager from './ProductManager'
import ImageUpload from './ImageUpload'

function CategoryManager({ restaurantId }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    image_url: '',
  })

  useEffect(() => {
    if (restaurantId) {
      loadCategories()
    }
  }, [restaurantId])

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('order', { ascending: true })

    if (!error && data) {
      setCategories(data)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({
            name: formData.name,
            image_url: formData.image_url,
          })
          .eq('id', editingCategory.id)

        if (error) throw error
        alert('Categoria aggiornata!')
      } else {
        const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order)) : -1
        
        const { error } = await supabase
          .from('categories')
          .insert([
            {
              restaurant_id: restaurantId,
              name: formData.name,
              image_url: formData.image_url,
              order: maxOrder + 1,
            }
          ])

        if (error) throw error
        alert('Categoria creata!')
      }

      setFormData({ name: '', image_url: '' })
      setShowForm(false)
      setEditingCategory(null)
      loadCategories()
    } catch (error) {
      alert('Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      image_url: category.image_url || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Sei sicuro di voler eliminare questa categoria? Verranno eliminati anche tutti i prodotti associati.')) {
      return
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Errore: ' + error.message)
    } else {
      alert('Categoria eliminata!')
      loadCategories()
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingCategory(null)
    setFormData({ name: '', image_url: '' })
  }

  // NUOVA FUNZIONE: Sposta categoria su
  const moveUp = async (index) => {
    if (index === 0) return // Già in prima posizione
    
    const newCategories = [...categories]
    const temp = newCategories[index]
    newCategories[index] = newCategories[index - 1]
    newCategories[index - 1] = temp
    
    // Aggiorna l'ordine nel database
    await updateOrder(newCategories)
  }

  // NUOVA FUNZIONE: Sposta categoria giù
  const moveDown = async (index) => {
    if (index === categories.length - 1) return // Già in ultima posizione
    
    const newCategories = [...categories]
    const temp = newCategories[index]
    newCategories[index] = newCategories[index + 1]
    newCategories[index + 1] = temp
    
    // Aggiorna l'ordine nel database
    await updateOrder(newCategories)
  }

  // NUOVA FUNZIONE: Aggiorna ordine nel database
  const updateOrder = async (newCategories) => {
    try {
      // Aggiorna l'ordine di tutte le categorie
      const updates = newCategories.map((cat, idx) => 
        supabase
          .from('categories')
          .update({ order: idx })
          .eq('id', cat.id)
      )
      
      await Promise.all(updates)
      
      // Ricarica per sincronizzare
      loadCategories()
    } catch (error) {
      alert('Errore nel riordinamento: ' + error.message)
    }
  }

  return (
    <div style={{ marginTop: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>📂 Categorie Menu</h2>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            style={{ padding: '10px 20px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            + Nuova Categoria
          </button>
        )}
      </div>

      {showForm && (
        <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3>{editingCategory ? 'Modifica Categoria' : 'Nuova Categoria'}</h3>
          <form onSubmit={handleSubmit}>
            {/* CAMPO NOME */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Nome Categoria *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{ width: '100%', padding: '10px', fontSize: '16px', border: '1px solid #ddd', borderRadius: '4px' }}
                placeholder="Es: Antipasti, Primi, Dolci..."
              />
            </div>

            {/* IMMAGINE CATEGORIA */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Immagine Categoria
              </label>
              <ImageUpload
                currentImageUrl={formData.image_url}
                onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
                folder="categories"
              />
              
              <details style={{ marginTop: '10px' }}>
                <summary style={{ cursor: 'pointer', color: '#666', fontSize: '14px' }}>
                  💡 Oppure inserisci URL manualmente
                </summary>
                <input
                  type="text"
                  placeholder="https://esempio.com/categoria.jpg"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  style={{ marginTop: '10px', width: '100%', padding: '8px' }}
                />
              </details>
            </div>

            {/* BOTTONI */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="submit" 
                disabled={loading}
                style={{ padding: '10px 20px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Salvando...' : (editingCategory ? 'Aggiorna' : 'Crea')}
              </button>
              <button 
                type="button"
                onClick={handleCancel}
                style={{ padding: '10px 20px', background: '#999', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Annulla
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
        {categories.map((category, index) => (
          <div key={category.id} style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
            {category.image_url && (
              <img src={category.image_url} alt={category.name} style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
            )}
            <div style={{ padding: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0 }}>{category.name}</h3>
                
                {/* FRECCE RIORDINAMENTO */}
                <div style={{ display: 'flex', gap: '5px' }}>
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
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                    title="Sposta su"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === categories.length - 1}
                    style={{
                      padding: '4px 8px',
                      background: index === categories.length - 1 ? '#ccc' : '#FF9800',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: index === categories.length - 1 ? 'not-allowed' : 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                    title="Sposta giù"
                  >
                    ▼
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button 
                  onClick={() => handleEdit(category)}
                  style={{ flex: 1, padding: '8px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Modifica
                </button>
                <button 
                  onClick={() => handleDelete(category.id)}
                  style={{ flex: 1, padding: '8px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Elimina
                </button>
              </div>
              
              <ProductManager category={category} />
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <p>Nessuna categoria ancora. Crea la prima!</p>
        </div>
      )}
    </div>
  )
}

export default CategoryManager