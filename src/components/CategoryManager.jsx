import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import ImageUpload from './ImageUpload'
import ProductManager from './ProductManager'

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
      fetchCategories()
    }
  }, [restaurantId])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('order', { ascending: true })

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Errore nel caricamento categorie:', error)
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
        alert('✅ Categoria aggiornata!')
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([
            {
              restaurant_id: restaurantId,
              name: formData.name,
              image_url: formData.image_url,
              order: categories.length,
            }
          ])

        if (error) throw error
        alert('✅ Categoria creata!')
      }

      setFormData({ name: '', image_url: '' })
      setEditingCategory(null)
      setShowForm(false)
      fetchCategories()
    } catch (error) {
      alert('Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name || '',
      image_url: category.image_url || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa categoria?')) return

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) throw error
      alert('✅ Categoria eliminata!')
      fetchCategories()
    } catch (error) {
      alert('Errore: ' + error.message)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingCategory(null)
    setFormData({ name: '', image_url: '' })
  }

  const moveCategory = async (index, direction) => {
    const newCategories = [...categories]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= newCategories.length) return

    // Swap
    [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]]

    // Update order
    const updates = newCategories.map((cat, idx) => 
      supabase.from('categories').update({ order: idx }).eq('id', cat.id)
    )

    try {
      await Promise.all(updates)
      setCategories(newCategories)
    } catch (error) {
      alert('Errore nel riordinamento: ' + error.message)
    }
  }

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '30px auto',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        paddingBottom: '15px',
        borderBottom: '3px solid #000000'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '28px',
          fontWeight: '700',
          color: '#000000'
        }}>
          📂 Categorie Menu
        </h2>
        
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              color: '#FFFFFF',
              background: '#000000',
              border: '2px solid #000000',
              borderRadius: '4px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: '3px 3px 0px rgba(0,0,0,0.2)',
              transition: 'all 0.2s ease'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(2px)'
              e.currentTarget.style.boxShadow = '1px 1px 0px rgba(0,0,0,0.2)'
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '3px 3px 0px rgba(0,0,0,0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '3px 3px 0px rgba(0,0,0,0.2)'
            }}
          >
            + Nuova Categoria
          </button>
        )}
      </div>

      {/* Form Creazione/Modifica Categoria */}
      {showForm && (
        <div style={{
          background: '#FFFFFF',
          border: '2px solid #000000',
          borderRadius: '8px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '4px 4px 0px #000000'
        }}>
          <h3 style={{
            margin: '0 0 25px 0',
            fontSize: '20px',
            fontWeight: '700',
            color: '#000000'
          }}>
            {editingCategory ? '✏️ Modifica Categoria' : '➕ Nuova Categoria'}
          </h3>

          <form onSubmit={handleSubmit}>
            {/* Nome Categoria */}
            <div style={{ marginBottom: '25px' }}>
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
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
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
                placeholder="Es: Antipasti, Primi, Secondi..."
                onFocus={(e) => e.target.style.background = '#FFFFFF'}
                onBlur={(e) => e.target.style.background = '#F5F5F5'}
              />
            </div>

            {/* Immagine Categoria */}
            <div style={{ marginBottom: '25px' }}>
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
              
              <details style={{ marginTop: '15px' }}>
                <summary style={{
                  cursor: 'pointer',
                  color: '#666',
                  fontSize: '14px',
                  padding: '10px',
                  background: '#F5F5F5',
                  border: '1px solid #000000',
                  borderRadius: '4px',
                  userSelect: 'none'
                }}>
                  💡 Oppure inserisci URL manualmente
                </summary>
                <input
                  type="text"
                  placeholder="https://esempio.com/immagine.jpg"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  style={{
                    marginTop: '10px',
                    width: '100%',
                    padding: '12px 15px',
                    fontSize: '14px',
                    border: '2px solid #000000',
                    borderRadius: '4px',
                    background: '#F5F5F5',
                    color: '#000000',
                    boxSizing: 'border-box'
                  }}
                />
              </details>
            </div>

            {/* Bottoni */}
            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#FFFFFF',
                  background: loading ? '#CCCCCC' : '#4CAF50',
                  border: '2px solid #000000',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  boxShadow: loading ? 'none' : '3px 3px 0px #000000',
                  transition: 'all 0.2s ease'
                }}
              >
                {loading ? '⏳ Salvando...' : (editingCategory ? '✓ Aggiorna' : '+ Crea')}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#000000',
                  background: '#FFFFFF',
                  border: '2px solid #000000',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  boxShadow: '3px 3px 0px #000000',
                  transition: 'all 0.2s ease'
                }}
              >
                ✕ Annulla
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista Categorie */}
      {categories.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {categories.map((category, index) => (
            <div
              key={category.id}
              style={{
                background: '#FFFFFF',
                border: '2px solid #000000',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '4px 4px 0px #000000',
                transition: 'transform 0.2s ease'
              }}
            >
              {/* Immagine Categoria */}
              {category.image_url && (
                <img
                  src={category.image_url}
                  alt={category.name}
                  style={{
                    width: '100%',
                    height: '180px',
                    objectFit: 'cover',
                    borderBottom: '2px solid #000000'
                  }}
                />
              )}

              <div style={{ padding: '20px' }}>
                {/* Header con Nome e Frecce */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '15px'
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#000000'
                  }}>
                    {category.name}
                  </h3>

                  {/* Frecce Riordinamento */}
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                      onClick={() => moveCategory(index, 'up')}
                      disabled={index === 0}
                      style={{
                        width: '32px',
                        height: '32px',
                        padding: '0',
                        fontSize: '16px',
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
                      onClick={() => moveCategory(index, 'down')}
                      disabled={index === categories.length - 1}
                      style={{
                        width: '32px',
                        height: '32px',
                        padding: '0',
                        fontSize: '16px',
                        background: index === categories.length - 1 ? '#E0E0E0' : '#000000',
                        color: index === categories.length - 1 ? '#999' : '#FFFFFF',
                        border: '2px solid #000000',
                        borderRadius: '4px',
                        cursor: index === categories.length - 1 ? 'not-allowed' : 'pointer',
                        fontWeight: '700'
                      }}
                      title="Sposta giù"
                    >
                      ▼
                    </button>
                  </div>
                </div>

                {/* Bottoni Azioni */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <button
                    onClick={() => handleEdit(category)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#FFFFFF',
                      background: '#2196F3',
                      border: '2px solid #000000',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      boxShadow: '2px 2px 0px #000000'
                    }}
                  >
                    ✏️ Modifica
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#FFFFFF',
                      background: '#f44336',
                      border: '2px solid #000000',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      boxShadow: '2px 2px 0px #000000'
                    }}
                  >
                    🗑️ Elimina
                  </button>
                </div>

                {/* ProductManager integrato */}
                <div style={{
                  borderTop: '2px solid #E0E0E0',
                  paddingTop: '15px'
                }}>
                  <ProductManager category={category} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !showForm && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: '#F5F5F5',
            border: '2px dashed #CCCCCC',
            borderRadius: '8px'
          }}>
            <p style={{
              margin: 0,
              fontSize: '18px',
              color: '#666',
              fontWeight: '500'
            }}>
              📂 Nessuna categoria ancora.<br />
              <span style={{ fontSize: '14px' }}>Clicca su "+ Nuova Categoria" per iniziare!</span>
            </p>
          </div>
        )
      )}
    </div>
  )
}

export default CategoryManager