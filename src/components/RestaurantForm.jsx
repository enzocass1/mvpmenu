import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import ImageUpload from './ImageUpload'
import QRCode from 'qrcode'

function RestaurantForm({ restaurant, onSave }) {
  const [loading, setLoading] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [downloadingQR, setDownloadingQR] = useState(false)
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

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places&language=it`
    script.async = true
    script.defer = true
    script.onload = () => setScriptLoaded(true)
    document.head.appendChild(script)

    return () => {
      // Cleanup se necessario
    }
  }, [])

  // Inizializza l'autocomplete quando lo script è caricato
  useEffect(() => {
    // Disabilita autocomplete su mobile per evitare problemi
    const isMobile = window.innerWidth <= 768
    
    if (scriptLoaded && addressInputRef.current && !autocompleteRef.current && !isMobile) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        addressInputRef.current,
        {
          componentRestrictions: { country: 'it' },
          fields: ['formatted_address', 'geometry', 'name'],
          types: ['address']
        }
      )

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace()
        if (place.formatted_address) {
          setFormData(prev => ({ ...prev, address: place.formatted_address }))
        }
      })
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
            subdomain: formData.subdomain,
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

  // Funzione per scaricare il QR Code
  const handleDownloadQRCode = async () => {
    if (!formData.subdomain) {
      alert('Inserisci prima un sottodominio!')
      return
    }

    setDownloadingQR(true)

    try {
      const menuUrl = `https://mvpmenu.vercel.app/#/menu/${formData.subdomain}`
      
      // Genera QR Code in alta risoluzione (1024x1024)
      const qrCodeDataUrl = await QRCode.toDataURL(menuUrl, {
        width: 1024,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H'
      })

      // Crea un link per il download
      const link = document.createElement('a')
      link.href = qrCodeDataUrl
      link.download = `${formData.subdomain}-menu-qrcode.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      alert('✅ QR Code scaricato con successo!')
    } catch (error) {
      console.error('Errore durante la generazione del QR Code:', error)
      alert('Errore durante il download del QR Code')
    } finally {
      setDownloadingQR(false)
    }
  }

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#FFFFFF',
        border: '2px solid #000000',
        borderRadius: '8px',
        padding: '30px',
        boxShadow: '4px 4px 0px #000000'
      }}>
        <h2 style={{
          margin: '0 0 30px 0',
          fontSize: '28px',
          fontWeight: '700',
          color: '#000000',
          borderBottom: '3px solid #000000',
          paddingBottom: '15px'
        }}>
          {restaurant ? 'Modifica Ristorante' : 'Crea il tuo Ristorante'}
        </h2>

        {/* Nome Attività */}
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
            Nome Attività *
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
            placeholder="Es: Ristorante Da Mario"
            onFocus={(e) => e.target.style.background = '#FFFFFF'}
            onBlur={(e) => e.target.style.background = '#F5F5F5'}
          />
        </div>

        {/* Logo Ristorante */}
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
            Logo Ristorante
          </label>
          <ImageUpload
            currentImageUrl={formData.logo_url}
            onImageUploaded={(url) => setFormData({ ...formData, logo_url: url })}
            folder="logos"
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
              placeholder="https://esempio.com/logo.jpg"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
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

        {/* Indirizzo con Google Autocomplete - FIX MOBILE */}
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
            Indirizzo * 🗺️
          </label>
          <input
            ref={addressInputRef}
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            required
            autoComplete="off"
            style={{
              width: '100%',
              padding: '12px 15px',
              fontSize: '16px',
              border: '2px solid #000000',
              borderRadius: '4px',
              background: '#F5F5F5',
              color: '#000000',
              boxSizing: 'border-box',
              WebkitAppearance: 'none',
              appearance: 'none'
            }}
            placeholder="Inizia a digitare l'indirizzo..."
            onFocus={(e) => {
              e.target.style.background = '#FFFFFF'
              e.target.style.fontSize = '16px'
            }}
            onBlur={(e) => e.target.style.background = '#F5F5F5'}
          />
          <small style={{
            display: 'block',
            marginTop: '5px',
            color: '#666',
            fontSize: '12px'
          }}>
            💡 {window.innerWidth <= 768 ? 'Digita l\'indirizzo completo' : 'Inizia a digitare e seleziona dalla lista'}
          </small>
        </div>

        {/* Telefono */}
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
            Telefono *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
            placeholder="Es: +39 02 1234567"
            onFocus={(e) => e.target.style.background = '#FFFFFF'}
            onBlur={(e) => e.target.style.background = '#F5F5F5'}
          />
        </div>

        {/* Sottodominio */}
        <div style={{ marginBottom: '30px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#000000',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
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
            placeholder="es: damario"
            onFocus={(e) => e.target.style.background = '#FFFFFF'}
            onBlur={(e) => e.target.style.background = '#F5F5F5'}
          />
          <small style={{
            display: 'block',
            marginTop: '8px',
            color: '#666',
            fontSize: '13px',
            padding: '8px',
            background: '#F5F5F5',
            border: '1px solid #E0E0E0',
            borderRadius: '4px'
          }}>
            🌐 Il tuo menu sarà disponibile su: <strong>{formData.subdomain || 'tuoristorante'}.mvpmenu.com</strong>
          </small>
        </div>

        {/* Bottone Submit */}
        <button 
          type="submit" 
          disabled={loading}
          style={{
            width: '100%',
            padding: '15px',
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
            transition: 'all 0.2s ease',
            marginBottom: restaurant ? '15px' : '0'
          }}
          onMouseDown={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(2px)'
              e.currentTarget.style.boxShadow = '1px 1px 0px #000000'
            }
          }}
          onMouseUp={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '3px 3px 0px #000000'
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '3px 3px 0px #000000'
            }
          }}
        >
          {loading ? '⏳ Salvando...' : (restaurant ? '✓ Aggiorna Ristorante' : '+ Crea Ristorante')}
        </button>

        {/* Bottone Scarica QR Code (solo se il ristorante esiste) */}
        {restaurant && (
          <button 
            type="button"
            onClick={handleDownloadQRCode}
            disabled={downloadingQR || !formData.subdomain}
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '16px',
              fontWeight: '700',
              color: '#000000',
              background: downloadingQR || !formData.subdomain ? '#F5F5F5' : '#FFFFFF',
              border: '2px solid #000000',
              borderRadius: '4px',
              cursor: downloadingQR || !formData.subdomain ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              boxShadow: downloadingQR || !formData.subdomain ? 'none' : '3px 3px 0px #000000',
              transition: 'all 0.2s ease'
            }}
            onMouseDown={(e) => {
              if (!downloadingQR && formData.subdomain) {
                e.currentTarget.style.transform = 'translateY(2px)'
                e.currentTarget.style.boxShadow = '1px 1px 0px #000000'
              }
            }}
            onMouseUp={(e) => {
              if (!downloadingQR && formData.subdomain) {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '3px 3px 0px #000000'
              }
            }}
            onMouseLeave={(e) => {
              if (!downloadingQR && formData.subdomain) {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '3px 3px 0px #000000'
              }
            }}
          >
            {downloadingQR ? '⏳ Generando...' : '📱 Scarica QR Code'}
          </button>
        )}
      </form>

      {/* CSS per personalizzare dropdown Google */}
      <style>{`
        .pac-container {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          border: 2px solid #000000 !important;
          border-radius: 4px;
          box-shadow: 4px 4px 0px #000000 !important;
          margin-top: 5px;
          z-index: 10000;
        }
        .pac-item {
          padding: 10px 15px;
          font-size: 14px;
          border-top: 1px solid #E0E0E0;
          cursor: pointer;
        }
        .pac-item:hover {
          background: #F5F5F5;
        }
        .pac-item-query {
          font-weight: 600;
          color: #000000;
        }
        .pac-icon {
          margin-top: 5px;
        }
        
        /* FIX MOBILE: Rimuovi icone problematiche */
        .pac-icon-marker {
          display: none !important;
        }
        
        /* FIX MOBILE: Migliora touch target */
        @media (max-width: 768px) {
          .pac-container {
            box-shadow: 0 2px 6px rgba(0,0,0,0.3) !important;
            border: 1px solid #ccc !important;
            margin-top: 2px !important;
          }
          .pac-item {
            padding: 15px 10px;
            font-size: 16px;
            line-height: 1.4;
          }
          .pac-item-query {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  )
}

export default RestaurantForm