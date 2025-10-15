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
        alert('✅ Orario aggiornato!')
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
        alert('✅ Orario creato!')
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
      alert('✅ Orario eliminato!')
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
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '25px'
      }}>
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
              transition: 'all 0.2s ease',
              width: '100%'
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
            + Nuovo Orario
          </button>
        )}
      </div>

      {/* Form Orario */}
      {showForm && (
        <div style={{
          background: '#FFFFFF',
          border: '2px solid #000000',
          borderRadius: '8px',
          padding: '30px',
          marginBottom: '25px',
          boxShadow: '4px 4px 0px #000000'
        }}>
          <h3 style={{
            margin: '0 0 25px 0',
            fontSize: '20px',
            fontWeight: '700',
            color: '#000000'
          }}>
            {editingHour ? '✏️ Modifica Orario' : '➕ Nuovo Orario'}
          </h3>

          <form onSubmit={handleSubmit}>
            {/* Giorni */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '15px',
              marginBottom: '20px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#000000',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Giorno Inizio *
                </label>
                <select
                  value={formData.day_start}
                  onChange={(e) => setFormData({ ...formData, day_start: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    fontSize: '16px',
                    border: '2px solid #000000',
                    borderRadius: '4px',
                    background: '#F5F5F5',
                    color: '#000000',
                    boxSizing: 'border-box'
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
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#000000',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Giorno Fine (opzionale)
                </label>
                <select
                  value={formData.day_end}
                  onChange={(e) => setFormData({ ...formData, day_end: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    fontSize: '16px',
                    border: '2px solid #000000',
                    borderRadius: '4px',
                    background: '#F5F5F5',
                    color: '#000000',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">Stesso giorno</option>
                  {days.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
                <small style={{
                  display: 'block',
                  marginTop: '5px',
                  color: '#666',
                  fontSize: '12px'
                }}>
                  💡 Es: Lunedì - Giovedì
                </small>
              </div>
            </div>

            {/* Prima Fascia Oraria */}
            <div style={{
              background: '#F5F5F5',
              padding: '20px',
              borderRadius: '4px',
              border: '2px solid #000000',
              marginBottom: '15px'
            }}>
              <h4 style={{
                margin: '0 0 15px 0',
                fontSize: '16px',
                fontWeight: '700',
                color: '#000000',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Prima Fascia Oraria *
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '15px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#000000',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
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
                      padding: '12px 15px',
                      fontSize: '16px',
                      border: '2px solid #000000',
                      borderRadius: '4px',
                      background: '#FFFFFF',
                      color: '#000000',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#000000',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
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
                      padding: '12px 15px',
                      fontSize: '16px',
                      border: '2px solid #000000',
                      borderRadius: '4px',
                      background: '#FFFFFF',
                      color: '#000000',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Seconda Fascia Oraria */}
            <div style={{
              background: '#F5F5F5',
              padding: '20px',
              borderRadius: '4px',
              border: '2px solid #000000',
              marginBottom: '25px'
            }}>
              <h4 style={{
                margin: '0 0 15px 0',
                fontSize: '16px',
                fontWeight: '700',
                color: '#000000',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Seconda Fascia Oraria (opzionale)
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '15px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#000000',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Apertura
                  </label>
                  <input
                    type="time"
                    value={formData.time_start_2}
                    onChange={(e) => setFormData({ ...formData, time_start_2: e.target.value })}
                    style={{
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
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#000000',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Chiusura
                  </label>
                  <input
                    type="time"
                    value={formData.time_end_2}
                    onChange={(e) => setFormData({ ...formData, time_end_2: e.target.value })}
                    style={{
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
                </div>
              </div>
              <small style={{
                display: 'block',
                marginTop: '10px',
                color: '#666',
                fontSize: '12px'
              }}>
                💡 Es: 11:30-15:00 e 18:30-23:00
              </small>
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
                {loading ? '⏳ Salvando...' : (editingHour ? '✓ Aggiorna' : '+ Crea')}
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

      {/* Lista Orari */}
      {hours.length > 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}>
          {hours.map((hour) => (
            <div 
              key={hour.id} 
              style={{
                background: '#FFFFFF',
                border: '2px solid #000000',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '3px 3px 0px #000000'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start',
                gap: '15px'
              }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{
                    margin: '0 0 12px 0',
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#000000'
                  }}>
                    📅 {hour.day_start}{hour.day_end && ` - ${hour.day_end}`}
                  </h4>
                  <p style={{
                    margin: '8px 0',
                    fontSize: '15px',
                    color: '#000000',
                    fontWeight: '500'
                  }}>
                    🕐 {hour.time_start_1} - {hour.time_end_1}
                  </p>
                  {hour.time_start_2 && hour.time_end_2 && (
                    <p style={{
                      margin: '8px 0',
                      fontSize: '15px',
                      color: '#000000',
                      fontWeight: '500'
                    }}>
                      🕐 {hour.time_start_2} - {hour.time_end_2}
                    </p>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  gap: '8px'
                }}>
                  <button 
                    onClick={() => handleEdit(hour)}
                    style={{
                      padding: '10px 16px',
                      fontSize: '13px',
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
                    onClick={() => handleDelete(hour.id)}
                    style={{
                      padding: '10px 16px',
                      fontSize: '13px',
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
              🕒 Nessun orario configurato.<br />
              <span style={{ fontSize: '14px' }}>Clicca su "+ Nuovo Orario" per iniziare!</span>
            </p>
          </div>
        )
      )}
    </div>
  )
}

export default OpeningHoursManager