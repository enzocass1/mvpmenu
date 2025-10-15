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

  // TEMPORANEO - Solo per debug (DENTRO la funzione component)
  useEffect(() => {
    console.log('🔑 API Key presente:', !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
    console.log('🔑 Prime 10 caratteri:', import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.substring(0, 10))
  }, [])

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

  // Carica lo script di Google Maps - VERSIONE SENZA ICONE
  useEffect(() => {
    if (window.google && window.google.maps) {
      setScriptLoaded(true)
      return
    }

    // Inietta CSS per bloccare le icone PRIMA del caricamento dello script
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
      // Cleanup
      if (style.parentNode) {
        style.parentNode.removeChild(style)
      }
    }
  }, [])

  // Inizializza l'autocomplete quando lo script è caricato - VERSIONE SENZA ICONE
  useEffect(() => {
    if (scriptLoaded && addressInputRef.current && !autocompleteRef.current) {
      try {
        // Crea autocomplete senza icone predefinite
        const options = {
          componentRestrictions: { country: 'it' },
          fields: ['formatted_address', 'address_components', 'geometry'],
          types: ['address']
        }
        
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          addressInputRef.current,
          options
        )

        // Listener per quando viene selezionato un indirizzo
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace()
          if (place.formatted_address) {
            // Formatta l'indirizzo aggiungendo spazio tra via e città se mancante
            let formattedAddress = place.formatted_address
            
            // Controlla se manca lo spazio prima della città (pattern: numero+lettera maiuscola)
            formattedAddress = formattedAddress.replace(/(\d)([A-Z][a-z])/g, '$1, $2')
            
            setFormData(prev => ({ ...prev, address: formattedAddress }))
          }
        })

        // CRUCIALE: Rimuovi le icone dopo che il container è stato creato
        // Aspetta che l'autocomplete sia inizializzato
        setTimeout(() => {
          const pacContainers = document.querySelectorAll('.pac-container')
          pacContainers.forEach(container => {
            // Rimuovi tutti gli elementi con classe pac-icon
            const icons = container.querySelectorAll('.pac-icon')
            icons.forEach(icon => {
              icon.style.display = 'none'
              icon.style.width = '0'
              icon.style.height = '0'
            })
          })
        }, 100)

        // Observer per rimuovere icone quando compaiono
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

        // Cleanup observer
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

        {/* Indirizzo con Google Autocomplete */}
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
            autoComplete="new-password"
            name="address-field"
            id="address-autocomplete-input"
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
            placeholder="Inizia a digitare l'indirizzo..."
            onFocus={(e) => e.target.style.background = '#FFFFFF'}
            onBlur={(e) => e.target.style.background = '#F5F5F5'}
          />
          <small style={{
            display: 'block',
            marginTop: '5px',
            color: '#666',
            fontSize: '12px'
          }}>
            💡 Inizia a digitare e seleziona dalla lista
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

      {/* CSS DEFINITIVO - Blocca completamente le icone di Google Places */}
      <style>{`
        /* Disabilita autocomplete del browser */
        input[name="address-field"]:-webkit-autofill,
        input[name="address-field"]:-webkit-autofill:hover,
        input[name="address-field"]:-webkit-autofill:focus,
        input[name="address-field"]:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #F5F5F5 inset !important;
          transition: background-color 5000s ease-in-out 0s;
        }
        
        /* Nasconde i suggerimenti del browser Chrome */
        input[name="address-field"]::-webkit-contacts-auto-fill-button,
        input[name="address-field"]::-webkit-credentials-auto-fill-button {
          visibility: hidden;
          display: none !important;
          pointer-events: none;
          height: 0;
          width: 0;
          margin: 0;
        }
        
        /* BLOCCO TOTALE ICONE - Nessuna icona verrà mai mostrata */
        .pac-icon,
        .pac-icon-marker,
        span[class*="pac-icon"],
        .pac-item-icon {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
          min-width: 0 !important;
          min-height: 0 !important;
          max-width: 0 !important;
          max-height: 0 !important;
          opacity: 0 !important;
          visibility: hidden !important;
          background: none !important;
          background-image: none !important;
          background-size: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
          overflow: hidden !important;
          position: absolute !important;
          left: -9999px !important;
        }
        
        /* Container principale */
        .pac-container {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          border: 2px solid #000000 !important;
          border-radius: 4px !important;
          box-shadow: 4px 4px 0px #000000 !important;
          margin-top: 5px !important;
          z-index: 10000 !important;
          background: white !important;
        }
        
        /* Ogni elemento della lista */
        .pac-item {
          padding: 12px 15px !important;
          font-size: 14px !important;
          border-top: 1px solid #E0E0E0 !important;
          cursor: pointer !important;
          line-height: 1.4 !important;
          display: block !important;
          grid-template-columns: 0 1fr !important;
          grid-gap: 0 !important;
        }
        
        .pac-item:first-child {
          border-top: none !important;
        }
        
        .pac-item:hover,
        .pac-item:focus,
        .pac-item-selected {
          background: #F5F5F5 !important;
        }
        
        /* Testo principale */
        .pac-item-query {
          font-weight: 600 !important;
          color: #000000 !important;
          font-size: 14px !important;
          margin: 0 !important;
          padding: 0 !important;
          display: inline !important;
          grid-column: 2 !important;
        }
        
        .pac-matched {
          font-weight: 700 !important;
        }
        
        /* Rimuovi TUTTO ciò che potrebbe essere un'icona */
        .pac-container *::before,
        .pac-container *::after,
        .pac-item::before,
        .pac-item::after {
          display: none !important;
          content: "" !important;
          background: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        
        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .pac-container {
            border: 2px solid #000 !important;
            box-shadow: 2px 2px 8px rgba(0,0,0,0.2) !important;
            margin-top: 2px !important;
            max-width: calc(100vw - 40px) !important;
          }
          
          .pac-item {
            padding: 15px 10px !important;
            font-size: 16px !important;
          }
          
          .pac-item-query {
            font-size: 16px !important;
          }
        }
      `}</style>
    </div>
  )
}

export default RestaurantForm