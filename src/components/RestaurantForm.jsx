import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function RestaurantForm({ restaurant, onSave }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    subdomain: '',
  })

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || '',
        address: restaurant.address || '',
        phone: restaurant.phone || '',
        subdomain: restaurant.subdomain || '',
      })
    }
  }, [restaurant])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (restaurant) {
        const { error } = await supabase
          .from('restaurants')
          .update({
            name: formData.name,
            address: formData.address,
            phone: formData.phone,
            subdomain: formData.subdomain,
            updated_at: new Date().toISOString(),
          })
          .eq('id', restaurant.id)

        if (error) throw error
        alert('Ristorante aggiornato!')
      } else {
        const { error } = await supabase
          .from('restaurants')
          .insert([
            {
              user_id: user.id,
              name: formData.name,
              address: formData.address,
              phone: formData.phone,
              subdomain: formData.subdomain,
            }
          ])

        if (error) throw error
        alert('Ristorante creato!')
      }

      if (onSave) onSave()
    } catch (error) {
      alert('Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2>{restaurant ? 'Modifica Ristorante' : 'Crea il tuo Ristorante'}</h2>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Nome Attività *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          style={{ width: '100%', padding: '8px' }}
          placeholder="Es: Ristorante Da Mario"
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Indirizzo *</label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          required
          style={{ width: '100%', padding: '8px' }}
          placeholder="Es: Via Roma 123, Milano"
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Telefono *</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
          style={{ width: '100%', padding: '8px' }}
          placeholder="Es: +39 02 1234567"
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Sottodominio *</label>
        <input
          type="text"
          value={formData.subdomain}
          onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
          required
          style={{ width: '100%', padding: '8px' }}
          placeholder="es: damario"
        />
        <small style={{ color: '#666' }}>
          Il tuo menu sarà disponibile su: {formData.subdomain || 'tuoristorante'}.mvpmenu.com
        </small>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        style={{ 
          width: '100%', 
          padding: '12px', 
          background: '#4CAF50', 
          color: 'white', 
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          borderRadius: '4px'
        }}
      >
        {loading ? 'Salvando...' : (restaurant ? 'Aggiorna' : 'Crea Ristorante')}
      </button>
    </form>
  )
}

export default RestaurantForm