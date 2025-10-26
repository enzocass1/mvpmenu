import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function OpeningHoursManager({ restaurantId }) {
  const [hours, setHours] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingHour, setEditingHour] = useState(null)
  const [formData, setFormData] = useState({
    day_start: 'Lunedì',
    day_end: '',
    time_start_1: '',
    time_end_1: '',
    time_start_2: '',
    time_end_2: '',
  })

  const days = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']

  useEffect(() => {
    if (restaurantId) {
      loadHours()
    }
  }, [restaurantId])

  const loadHours = async () => {
    const { data, error } = await supabase
      .from('opening_hours')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('order', { ascending: true })

    if (!error && data) {
      setHours(data)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingHour) {
        const { error } = await supabase
          .from('opening_hours')
          .update({
            day_start: formData.day_start,
            day_end: formData.day_end || null,
            time_start_1: formData.time_start_1,
            time_end_1: formData.time_end_1,
            time_start_2: formData.time_start_2 || null,
            time_end_2: formData.time_end_2 || null,
          })
          .eq('id', editingHour.id)

        if (error) throw error
        alert('Orario aggiornato con successo')
      } else {
        const maxOrder = hours.length > 0 ? Math.max(...hours.map(h => h.order)) : -1
        
        const { error } = await supabase
          .from('opening_hours')
          .insert([
            {
              restaurant_id: restaurantId,
              day_start: formData.day_start,
              day_end: formData.day_end || null,
              time_start_1: formData.time_start_1,
              time_end_1: formData.time_end_1,
              time_start_2: formData.time_start_2 || null,
              time_end_2: formData.time_end_2 || null,
              order: maxOrder + 1,
            }
          ])

        if (error) throw error
        alert('Orario creato con successo')
      }

      setFormData({
        day_start: 'Lunedì',
        day_end: '',
        time_start_1: '',
        time_end_1: '',
        time_start_2: '',
        time_end_2: '',
      })
      setShowForm(false)
      setEditingHour(null)
      loadHours()
    } catch (error) {
      alert('Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (hour) => {
    setEditingHour(hour)
    setFormData({
      day_start: hour.day_start,
      day_end: hour.day_end || '',
      time_start_1: hour.time_start_1,
      time_end_1: hour.time_end_1,
      time_start_2: hour.time_start_2 || '',
      time_end_2: hour.time_end_2 || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo orario?')) {
      return
    }

    const { error } = await supabase
      .from('opening_hours')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Errore: ' + error.message)
    } else {
      alert('Orario eliminato con successo')
      loadHours()
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingHour(null)
    setFormData({
      day_start: 'Lunedì',
      day_end: '',
      time_start_1: '',
      time_end_1: '',
      time_start_2: '',
      time_end_2: '',
    })
  }

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 767px) {
          .hours-card {
            padding: 16px !important;
          }
          .hours-empty {
            padding: 40px 16px !important;
          }
        }
      `}</style>
      {/* Bottone Nuovo Orario */}
      {!showForm && (
        <div style={{ marginBottom: '25px' }}>
          <button 
            onClick={() => setShowForm(true)}
            aria-label="Aggiungi nuovo orario"
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#FFFFFF',
              background: '#000000',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onMouseEnter={(e) => e.target.style.background = '#333333'}
            onMouseLeave={(e) => e.target.style.background = '#000000'}
          >
            Nuovo Orario
          </button>
        </div>
      )}

      {/* Form Orario */}
      {showForm && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E0E0E0',
          borderRadius: '8px',
          padding: '25px',
          marginBottom: '25px'
        }} className="hours-card">
          <h3 style={{
            margin: '0 0 20px 0',
            fontSize: '16px',
            fontWeight: '500',
            color: '#000000'
          }}>
            {editingHour ? 'Modifica Orario' : 'Nuovo Orario'}
          </h3>

          <form onSubmit={handleSubmit}>
            {/* Giorni */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
              gap: '15px',
              marginBottom: '20px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#666'
                }}>
                  Giorno Inizio *
                </label>
                <select
                  value={formData.day_start}
                  onChange={(e) => setFormData({ ...formData, day_start: e.target.value })}
                  required
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
                    fontWeight: '400'
                  }}
                >
                  {days.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#666'
                }}>
                  Giorno Fine (opzionale)
                </label>
                <select
                  value={formData.day_end}
                  onChange={(e) => setFormData({ ...formData, day_end: e.target.value })}
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
                    fontWeight: '400'
                  }}
                >
                  <option value="">Stesso giorno</option>
                  {days.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
                <small style={{
                  display: 'block',
                  marginTop: '6px',
                  color: '#999',
                  fontSize: '12px',
                  fontWeight: '400'
                }}>
                  Es: Lunedì - Giovedì
                </small>
              </div>
            </div>

            {/* Prima Fascia Oraria */}
            <div style={{
              background: '#F9F9F9',
              padding: '20px',
              borderRadius: '6px',
              border: '1px solid #E0E0E0',
              marginBottom: '15px'
            }} className="hours-card">
              <h4 style={{
                margin: '0 0 15px 0',
                fontSize: '14px',
                fontWeight: '500',
                color: '#000000'
              }}>
                Prima Fascia Oraria *
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
                gap: '15px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#666'
                  }}>
                    Apertura
                  </label>
                  <input
                    type="time"
                    value={formData.time_start_1}
                    onChange={(e) => setFormData({ ...formData, time_start_1: e.target.value })}
                    required
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
                      fontWeight: '400'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#666'
                  }}>
                    Chiusura
                  </label>
                  <input
                    type="time"
                    value={formData.time_end_1}
                    onChange={(e) => setFormData({ ...formData, time_end_1: e.target.value })}
                    required
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
                      fontWeight: '400'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Seconda Fascia Oraria */}
            <div style={{
              background: '#F9F9F9',
              padding: '20px',
              borderRadius: '6px',
              border: '1px solid #E0E0E0',
              marginBottom: '25px'
            }} className="hours-card">
              <h4 style={{
                margin: '0 0 15px 0',
                fontSize: '14px',
                fontWeight: '500',
                color: '#000000'
              }}>
                Seconda Fascia Oraria (opzionale)
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
                gap: '15px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#666'
                  }}>
                    Apertura
                  </label>
                  <input
                    type="time"
                    value={formData.time_start_2}
                    onChange={(e) => setFormData({ ...formData, time_start_2: e.target.value })}
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
                      fontWeight: '400'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#666'
                  }}>
                    Chiusura
                  </label>
                  <input
                    type="time"
                    value={formData.time_end_2}
                    onChange={(e) => setFormData({ ...formData, time_end_2: e.target.value })}
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
                      fontWeight: '400'
                    }}
                  />
                </div>
              </div>
              <small style={{
                display: 'block',
                marginTop: '10px',
                color: '#999',
                fontSize: '12px',
                fontWeight: '400'
              }}>
                Es: 11:30-15:00 e 18:30-23:00
              </small>
            </div>

            {/* Bottoni */}
            <div style={{ 
              display: 'flex', 
              gap: '10px',
              flexWrap: 'wrap'
            }}>
              <button 
                type="button"
                onClick={handleCancel}
                style={{
                  flex: 1,
                  minWidth: '120px',
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

              <button 
                type="submit" 
                disabled={loading}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#FFFFFF',
                  background: loading ? '#999' : '#000000',
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
                {loading ? 'Salvando...' : (editingHour ? 'Aggiorna' : 'Salva')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista Orari */}
      {hours.length > 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {hours.map((hour) => (
            <div
              key={hour.id}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                padding: '20px',
                transition: 'all 0.2s ease'
              }}
              className="hours-card"
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '15px',
                flexWrap: 'wrap'
              }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <h4 style={{
                    margin: '0 0 10px 0',
                    fontSize: '15px',
                    fontWeight: '500',
                    color: '#000000'
                  }}>
                    {hour.day_start}{hour.day_end && ` - ${hour.day_end}`}
                  </h4>
                  <p style={{
                    margin: '6px 0',
                    fontSize: '14px',
                    color: '#666',
                    fontWeight: '400'
                  }}>
                    {hour.time_start_1} - {hour.time_end_1}
                  </p>
                  {hour.time_start_2 && hour.time_end_2 && (
                    <p style={{
                      margin: '6px 0',
                      fontSize: '14px',
                      color: '#666',
                      fontWeight: '400'
                    }}>
                      {hour.time_start_2} - {hour.time_end_2}
                    </p>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  <button 
                    onClick={() => handleEdit(hour)}
                    aria-label="Modifica orario"
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
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
                    Modifica
                  </button>
                  <button 
                    onClick={() => handleDelete(hour.id)}
                    aria-label="Elimina orario"
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#FFFFFF',
                      background: '#f44336',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#d32f2f'}
                    onMouseLeave={(e) => e.target.style.background = '#f44336'}
                  >
                    Elimina
                  </button>
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
            background: '#F9F9F9',
            border: '1px dashed #E0E0E0',
            borderRadius: '8px'
          }} className="hours-empty">
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#999',
              fontWeight: '400'
            }}>
              Nessun orario configurato
            </p>
          </div>
        )
      )}
    </div>
  )
}

export default OpeningHoursManager