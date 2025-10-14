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
        alert('Orario aggiornato!')
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
        alert('Orario creato!')
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
    if (!confirm('Sei sicuro di voler eliminare questo orario?')) {
      return
    }

    const { error } = await supabase
      .from('opening_hours')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Errore: ' + error.message)
    } else {
      alert('Orario eliminato!')
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
    <div style={{ marginTop: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>🕒 Orari di Apertura</h2>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            style={{ padding: '10px 20px', background: '#9C27B0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            + Nuovo Orario
          </button>
        )}
      </div>

      {showForm && (
        <div style={{ background: '#f3e5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3>{editingHour ? 'Modifica Orario' : 'Nuovo Orario'}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Giorno Inizio *</label>
                <select
                  value={formData.day_start}
                  onChange={(e) => setFormData({ ...formData, day_start: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px' }}
                >
                  {days.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Giorno Fine (opzionale)</label>
                <select
                  value={formData.day_end}
                  onChange={(e) => setFormData({ ...formData, day_end: e.target.value })}
                  style={{ width: '100%', padding: '8px' }}
                >
                  <option value="">Stesso giorno</option>
                  {days.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
                <small style={{ color: '#666' }}>Es: Lunedì - Giovedì</small>
              </div>
            </div>

            <div style={{ background: 'white', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 10px 0' }}>Prima Fascia Oraria *</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Apertura</label>
                  <input
                    type="time"
                    value={formData.time_start_1}
                    onChange={(e) => setFormData({ ...formData, time_start_1: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Chiusura</label>
                  <input
                    type="time"
                    value={formData.time_end_1}
                    onChange={(e) => setFormData({ ...formData, time_end_1: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ background: 'white', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 10px 0' }}>Seconda Fascia Oraria (opzionale)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Apertura</label>
                  <input
                    type="time"
                    value={formData.time_start_2}
                    onChange={(e) => setFormData({ ...formData, time_start_2: e.target.value })}
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Chiusura</label>
                  <input
                    type="time"
                    value={formData.time_end_2}
                    onChange={(e) => setFormData({ ...formData, time_end_2: e.target.value })}
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
              </div>
              <small style={{ color: '#666' }}>Es: 11:30-15:00 e 18:30-23:00</small>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="submit" 
                disabled={loading}
                style={{ padding: '10px 20px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Salvando...' : (editingHour ? 'Aggiorna' : 'Crea')}
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {hours.map((hour) => (
          <div key={hour.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h4 style={{ margin: '0 0 10px 0' }}>
                  {hour.day_start}{hour.day_end && ` - ${hour.day_end}`}
                </h4>
                <p style={{ margin: '5px 0' }}>
                  🕐 {hour.time_start_1} - {hour.time_end_1}
                </p>
                {hour.time_start_2 && hour.time_end_2 && (
                  <p style={{ margin: '5px 0' }}>
                    🕐 {hour.time_start_2} - {hour.time_end_2}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button 
                  onClick={() => handleEdit(hour)}
                  style={{ padding: '6px 12px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                >
                  Modifica
                </button>
                <button 
                  onClick={() => handleDelete(hour.id)}
                  style={{ padding: '6px 12px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                >
                  Elimina
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hours.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <p>Nessun orario configurato. Aggiungi il primo!</p>
        </div>
      )}
    </div>
  )
}

export default OpeningHoursManager