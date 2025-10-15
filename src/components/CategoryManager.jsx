import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import ProductManager from './ProductManager'
import ImageUpload from './ImageUpload'

function CategoryManager({ restaurantId }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [openCategoryId, setOpenCategoryId] = useState(null) // Per gestire quale categoria è aperta
  const [formData, setFormData] = useState({
    name: '',
    image_url: ''
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
            image_url: formData.image_url
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
              order: maxOrder + 1
            }
          ])

        if (error) throw error
        alert('Categoria creata!')
      }

      await loadCategories()
      handleCancel()
    } catch (error) {
      console.error('Error saving category:', error)
      alert('Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      image_url: category.image_url || ''
    })
    setShowForm(true)
    setOpenCategoryId(null)
  }

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Eliminare questa categoria? Verranno eliminati anche tutti i prodotti al suo interno.')) return

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)

      if (error) throw error
      
      alert('Categoria eliminata!')
      await loadCategories()
      setOpenCategoryId(null)
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Errore durante l\'eliminazione')
    }
  }

  const moveCategory = async (categoryId, direction) => {
    const currentIndex = categories.findIndex(c => c.id === categoryId)
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === categories.length - 1)
    ) {
      return
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    const newCategories = [...categories]
    const [movedCategory] = newCategories.splice(currentIndex, 1)
    newCategories.splice(newIndex, 0, movedCategory)

    const updates = newCategories.map((category, index) => ({
      id: category.id,
      order: index
    }))

    try {
      for (const update of updates) {
        await supabase
          .from('categories')
          .update({ order: update.order })
          .eq('id', update.id)
      }
      await loadCategories()
    } catch (error) {
      console.error('Error reordering categories:', error)
      alert('Errore durante il riordinamento')
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingCategory(null)
    setFormData({ name: '', image_url: '' })
  }

  const toggleCategory = (categoryId) => {
    setOpenCategoryId(openCategoryId === categoryId ? null : categoryId)
  }

  return (
    <div style={{
      background: '#FFFFFF',
      border: '2px solid #000000',
      borderRadius: '8px',
      padding: '30px',
      boxShadow: '4px 4px 0px #000000'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '25px'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: '700',
          color: '#000000',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          📂 Categorie Menu
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '700',
            color: '#FFFFFF',
            background: '#000000',
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
          {showForm ? '✕ Chiudi' : '+ Nuova Categoria'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{
          marginBottom: '30px',
          padding: '25px',
          background: '#F5F5F5',
          border: '2px solid #000000',
          borderRadius: '8px',
          boxShadow: '3px 3px 0px #000000'
        }}>
          <h3 style={{
            margin: '0 0 20px 0',
            fontSize: '18px',
            fontWeight: '700',
            color: '#000000',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {editingCategory ? '✏️ Modifica Categoria' : '➕ Nuova Categoria'}
          </h3>

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
              Nome Categoria *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Es: Antipasti, Primi, Secondi..."
              style={{
                width: '100%',
                padding: '12px 15px',
                fontSize: '16px',
                border: '2px solid #000000',
                borderRadius: '4px',
                background: '#FFFFFF',
                color: '#000000',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => e.target.style.background = '#FFFFFF'}
              onBlur={(e) => e.target.style.background = '#FFFFFF'}
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
              Immagine Categoria
            </label>
            <ImageUpload
              currentImageUrl={formData.image_url}
              onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
              folder="categories"
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
                placeholder="https://esempio.com/categoria.jpg"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                style={{
                  marginTop: '10px',
                  width: '100%',
                  padding: '12px 15px',
                  fontSize: '16px',
                  border: '2px solid #000000',
                  borderRadius: '4px',
                  background: '#FFFFFF',
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
              {loading ? 'Salvando...' : (editingCategory ? '💾 Aggiorna' : '✅ Crea')}
            </button>

            <button
              type="button"
              onClick={handleCancel}
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
          </div>
        </form>
      )}

      {categories.length === 0 ? (
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
            📂 Nessuna categoria ancora.
          </p>
          <p style={{ 
            margin: '10px 0 0 0', 
            fontSize: '14px'
          }}>
            Clicca su "+ Nuova Categoria" per iniziare!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {categories.map((category, index) => (
            <div
              key={category.id}
              style={{
                background: '#FFFFFF',
                border: '2px solid #000000',
                borderRadius: '8px',
                boxShadow: '3px 3px 0px #000000',
                overflow: 'hidden'
              }}
            >
              {/* Header toggle (sempre visibile) */}
              <button
                onClick={() => toggleCategory(category.id)}
                style={{
                  width: '100%',
                  padding: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  background: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F5'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
              >
                <span style={{ 
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#000000',
                  transition: 'transform 0.3s ease',
                  transform: openCategoryId === category.id ? 'rotate(90deg)' : 'rotate(0deg)'
                }}>
                  ▶
                </span>

                {/* Immagine piccola */}
                <div style={{
                  width: '50px',
                  height: '50px',
                  border: '2px solid #000000',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: category.image_url ? 'transparent' : '#F5F5F5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={category.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '24px' }}>📂</span>
                  )}
                </div>

                {/* Nome categoria */}
                <span style={{ 
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#000000',
                  flex: 1
                }}>
                  {category.name}
                </span>
              </button>

              {/* Contenuto dettagliato (visibile solo quando aperto) */}
              {openCategoryId === category.id && (
                <div style={{
                  padding: '20px',
                  borderTop: '2px solid #000000',
                  background: '#FAFAFA',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  alignItems: 'center'
                }}>
                  {/* Titolo categoria */}
                  <h3 style={{
                    margin: 0,
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#000000',
                    textAlign: 'center'
                  }}>
                    {category.name}
                  </h3>

                  {/* Immagine centrata */}
                  <div style={{ 
                    width: '150px', 
                    height: '150px',
                    border: '2px solid #000000',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    background: category.image_url ? 'transparent' : '#F5F5F5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {category.image_url ? (
                      <img
                        src={category.image_url}
                        alt={category.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '60px' }}>📂</span>
                    )}
                  </div>

                  {/* Bottoni azioni - Grid 2x2 */}
                  <div style={{
                    width: '100%',
                    maxWidth: '400px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px'
                  }}>
                    {/* Riga 1: Modifica + Elimina */}
                    <button
                      onClick={() => handleEdit(category)}
                      style={{
                        padding: '12px',
                        fontSize: '14px',
                        fontWeight: '700',
                        color: '#FFFFFF',
                        background: '#2196F3',
                        border: '2px solid #000000',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
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
                      ✏️ Modifica
                    </button>

                    <button
                      onClick={() => handleDelete(category.id)}
                      style={{
                        padding: '12px',
                        fontSize: '14px',
                        fontWeight: '700',
                        color: '#FFFFFF',
                        background: '#f44336',
                        border: '2px solid #000000',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
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
                      🗑️ Elimina
                    </button>

                    {/* Riga 2: Sposta su + Sposta giù */}
                    <button
                      onClick={() => moveCategory(category.id, 'up')}
                      disabled={index === 0}
                      style={{
                        padding: '12px',
                        fontSize: '14px',
                        fontWeight: '700',
                        color: '#FFFFFF',
                        background: index === 0 ? '#999999' : '#000000',
                        border: '2px solid #000000',
                        borderRadius: '4px',
                        cursor: index === 0 ? 'not-allowed' : 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        boxShadow: '2px 2px 0px #000000',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseDown={(e) => {
                        if (index !== 0) {
                          e.target.style.transform = 'translate(1px, 1px)'
                          e.target.style.boxShadow = '1px 1px 0px #000000'
                        }
                      }}
                      onMouseUp={(e) => {
                        if (index !== 0) {
                          e.target.style.transform = 'translate(0, 0)'
                          e.target.style.boxShadow = '2px 2px 0px #000000'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (index !== 0) {
                          e.target.style.transform = 'translate(0, 0)'
                          e.target.style.boxShadow = '2px 2px 0px #000000'
                        }
                      }}
                    >
                      Sposta su
                    </button>

                    <button
                      onClick={() => moveCategory(category.id, 'down')}
                      disabled={index === categories.length - 1}
                      style={{
                        padding: '12px',
                        fontSize: '14px',
                        fontWeight: '700',
                        color: '#FFFFFF',
                        background: index === categories.length - 1 ? '#999999' : '#000000',
                        border: '2px solid #000000',
                        borderRadius: '4px',
                        cursor: index === categories.length - 1 ? 'not-allowed' : 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        boxShadow: '2px 2px 0px #000000',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseDown={(e) => {
                        if (index !== categories.length - 1) {
                          e.target.style.transform = 'translate(1px, 1px)'
                          e.target.style.boxShadow = '1px 1px 0px #000000'
                        }
                      }}
                      onMouseUp={(e) => {
                        if (index !== categories.length - 1) {
                          e.target.style.transform = 'translate(0, 0)'
                          e.target.style.boxShadow = '2px 2px 0px #000000'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (index !== categories.length - 1) {
                          e.target.style.transform = 'translate(0, 0)'
                          e.target.style.boxShadow = '2px 2px 0px #000000'
                        }
                      }}
                    >
                      Sposta giù
                    </button>
                  </div>

                  {/* ProductManager già esistente */}
                  <div style={{ width: '100%' }}>
                    <ProductManager category={category} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CategoryManager