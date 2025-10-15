import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import ImageUpload from './ImageUpload'

function RestaurantForm({ restaurant, onSave }) {
  const [loading, setLoading] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const addressInputRef = useRef(null)
  const autocompleteRef = useRef(null)
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    subdomain: '',
    logo_url: '',
  })

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || '',
        address: restaurant.address || '',
        phone: restaurant.phone || '',
        subdomain: restaurant.subdomain || '',
        logo_url: restaurant.logo_url || '',
      })
    }
  }, [restaurant])

  // Carica lo script di Google Maps
  useEffect(() => {
    if (window.google && window.google.maps) {
      setScriptLoaded(true)
      return
    }

    const style = document.createElement('style')
    style.innerHTML = `
      .pac-icon, .pac-icon-marker {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
    `
    document.head.appendChild(style)

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places&language=it`
    script.async = true
    script.defer = true
    script.onload = () => setScriptLoaded(true)
    script.onerror = () => {
      console.error('Errore nel caricamento di Google Maps')
      setScriptLoaded(false)
    }
    document.head.appendChild(script)

    return () => {
      if (style.parentNode) {
        style.parentNode.removeChild(style)
      }
    }
  }, [])

  // Inizializza l'autocomplete
  useEffect(() => {
    if (scriptLoaded && addressInputRef.current && !autocompleteRef.current) {
      try {
        const options = {
          componentRestrictions: { country: 'it' },
          fields: ['formatted_address', 'address_components', 'geometry'],
          types: ['address']
        }
        
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          addressInputRef.current,
          options
        )

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace()
          if (place.formatted_address) {
            let formattedAddress = place.formatted_address
            formattedAddress = formattedAddress.replace(/(\d)([A-Z][a-z])/g, '$1, $2')
            setFormData(prev => ({ ...prev, address: formattedAddress }))
          }
        })

        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
              mutation.addedNodes.forEach((node) => {
                if (node.classList && node.classList.contains('pac-container')) {
                  const icons = node.querySelectorAll('.pac-icon')
                  icons.forEach(icon => {
                    icon.style.display = 'none'
                    icon.style.width = '0'
                    icon.style.height = '0'
                  })
                }
              })
            }
          })
        })

        observer.observe(document.body, {
          childList: true,
          subtree: true
        })

        return () => observer.disconnect()
      } catch (error) {
        console.error('Errore inizializzazione autocomplete:', error)
      }
    }
  }, [scriptLoaded])

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
            logo_url: formData.logo_url,
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
              logo_url: formData.logo_url,
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
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif'
    }}>
      <div onSubmit={handleSubmit} style={{
        background: '#FFFFFF'
      }}>
        {/* Nome Attività */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '13px',
            fontWeight: '400',
            color: '#666'
          }}>
            Nome Attività *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            autoComplete="off"
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid #E0E0E0',
              borderRadius: '6px',
              background: '#FFFFFF',
              color: '#000000',
              boxSizing: 'border-box',
              fontWeight: '400',
              outline: 'none',
              transition: 'border 0.2s ease'
            }}
            placeholder="Es: Ristorante Da Mario"
            onFocus={(e) => e.target.style.borderColor = '#000000'}
            onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
          />
        </div>

        {/* Logo Ristorante */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '13px',
            fontWeight: '400',
            color: '#666'
          }}>
            Logo Ristorante
          </label>
          <ImageUpload
            currentImageUrl={formData.logo_url}
            onImageUploaded={(url) => setFormData({ ...formData, logo_url: url })}
            folder="logos"
          />
        </div>

        {/* Indirizzo */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '13px',
            fontWeight: '400',
            color: '#666'
          }}>
            Indirizzo *
          </label>
          <input
            ref={addressInputRef}
            type="search"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            required
            autoComplete="off"
            name={`address-${Math.random()}`}
            id={`address-${Date.now()}`}
            role="presentation"
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid #E0E0E0',
              borderRadius: '6px',
              background: '#FFFFFF',
              color: '#000000',
              boxSizing: 'border-box',
              fontWeight: '400',
              outline: 'none',
              transition: 'border 0.2s ease'
            }}
            placeholder="Inizia a digitare l'indirizzo..."
            onFocus={(e) => {
              e.target.style.borderColor = '#000000'
              e.target.setAttribute('readonly', 'readonly')
              setTimeout(() => {
                e.target.removeAttribute('readonly')
              }, 100)
            }}
            onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
          />
          <small style={{
            display: 'block',
            marginTop: '5px',
            color: '#999',
            fontSize: '12px',
            fontWeight: '400'
          }}>
            Inizia a digitare e seleziona dalla lista
          </small>
        </div>

        {/* Telefono */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '13px',
            fontWeight: '400',
            color: '#666'
          }}>
            Telefono *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
            autoComplete="off"
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid #E0E0E0',
              borderRadius: '6px',
              background: '#FFFFFF',
              color: '#000000',
              boxSizing: 'border-box',
              fontWeight: '400',
              outline: 'none',
              transition: 'border 0.2s ease'
            }}
            placeholder="Es: +39 02 1234567"
            onFocus={(e) => e.target.style.borderColor = '#000000'}
            onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
          />
        </div>

        {/* Sottodominio */}
        <div style={{ marginBottom: '30px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '13px',
            fontWeight: '400',
            color: '#666'
          }}>
            Sottodominio *
          </label>
          <input
            type="text"
            value={formData.subdomain}
            onChange={(e) => setFormData({ 
              ...formData, 
              subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') 
            })}
            required
            readOnly={!!restaurant}
            disabled={!!restaurant}
            autoComplete="off"
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid #E0E0E0',
              borderRadius: '6px',
              background: restaurant ? '#F5F5F5' : '#FFFFFF',
              color: restaurant ? '#999' : '#000000',
              boxSizing: 'border-box',
              cursor: restaurant ? 'not-allowed' : 'text',
              fontWeight: '400',
              outline: 'none',
              transition: 'border 0.2s ease'
            }}
            placeholder="es: damario"
            onFocus={(e) => {
              if (!restaurant) e.target.style.borderColor = '#000000'
            }}
            onBlur={(e) => {
              if (!restaurant) e.target.style.borderColor = '#E0E0E0'
            }}
          />
          <small style={{
            display: 'block',
            marginTop: '8px',
            color: restaurant ? '#f44336' : '#999',
            fontSize: '12px',
            fontWeight: '400',
            padding: '8px 12px',
            background: restaurant ? '#FFEBEE' : '#F5F5F5',
            border: `1px solid ${restaurant ? '#f44336' : '#E0E0E0'}`,
            borderRadius: '6px'
          }}>
            {restaurant 
              ? 'Il sottodominio non può essere modificato dopo la creazione'
              : `Il tuo menu sarà: ${formData.subdomain || 'tuoristorante'}.mvpmenu.com`
            }
          </small>
        </div>

        {/* Pulsante Salva/Aggiorna */}
        <button 
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
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
          {loading ? 'Salvando...' : (restaurant ? 'Aggiorna' : 'Crea Ristorante')}
        </button>
      </div>

      {/* CSS per Google Places Autocomplete */}
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #FFFFFF inset !important;
          transition: background-color 5000s ease-in-out 0s;
        }
        
        input::-webkit-contacts-auto-fill-button,
        input::-webkit-credentials-auto-fill-button {
          visibility: hidden;
          display: none !important;
        }
        
        .pac-icon,
        .pac-icon-marker,
        span[class*="pac-icon"],
        .pac-item-icon {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        
        .pac-container {
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif !important;
          border: 1px solid #E0E0E0 !important;
          borderRadius: 6px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
          margin-top: 5px !important;
          background: white !important;
        }
        
        .pac-item {
          padding: 12px 15px !important;
          fontSize: 14px !important;
          border-top: 1px solid #F5F5F5 !important;
          cursor: pointer !important;
          font-weight: 400 !important;
        }
        
        .pac-item:first-child {
          border-top: none !important;
        }
        
        .pac-item:hover,
        .pac-item-selected {
          background: #F5F5F5 !important;
        }
        
        .pac-item-query {
          font-weight: 400 !important;
          color: #000000 !important;
          fontSize: 14px !important;
        }
        
        .pac-matched {
          font-weight: 500 !important;
        }
      `}</style>
    </div>
  )
}

export default RestaurantForm