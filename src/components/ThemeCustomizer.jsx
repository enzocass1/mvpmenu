import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function ThemeCustomizer({ restaurantId }) {
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [theme, setTheme] = useState({
    // Colori principali
    primaryColor: '#000000',      // Sfondo principale
    secondaryColor: '#ffffff',     // Sfondo sezioni
    accentColor: '#4CAF50',       // Colore pulsanti/accent
    textPrimaryColor: '#ffffff',  // Testo su sfondo scuro
    textSecondaryColor: '#111827', // Testo su sfondo chiaro
    
    // Font
    fontFamily: 'system',          // system, serif, sans-serif, cursive
    
    // Stili card
    cardStyle: 'modern',           // modern, classic, minimal
    borderRadius: '16',            // 0, 8, 16, 24
    
    // Layout
    layoutStyle: 'carousel'        // carousel, grid, list
  })

  // Preset di temi
  const themePresets = [
    {
      name: 'Dark Elegance (Default)',
      config: {
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
        accentColor: '#4CAF50',
        textPrimaryColor: '#ffffff',
        textSecondaryColor: '#111827',
        fontFamily: 'system',
        cardStyle: 'modern',
        borderRadius: '16',
        layoutStyle: 'carousel'
      }
    },
    {
      name: 'Ocean Blue',
      config: {
        primaryColor: '#0f172a',
        secondaryColor: '#f0f9ff',
        accentColor: '#0ea5e9',
        textPrimaryColor: '#f0f9ff',
        textSecondaryColor: '#0f172a',
        fontFamily: 'sans-serif',
        cardStyle: 'modern',
        borderRadius: '24',
        layoutStyle: 'carousel'
      }
    },
    {
      name: 'Warm Restaurant',
      config: {
        primaryColor: '#7c2d12',
        secondaryColor: '#fef3c7',
        accentColor: '#f59e0b',
        textPrimaryColor: '#fef3c7',
        textSecondaryColor: '#7c2d12',
        fontFamily: 'serif',
        cardStyle: 'classic',
        borderRadius: '8',
        layoutStyle: 'carousel'
      }
    },
    {
      name: 'Minimal White',
      config: {
        primaryColor: '#ffffff',
        secondaryColor: '#f9fafb',
        accentColor: '#3b82f6',
        textPrimaryColor: '#111827',
        textSecondaryColor: '#374151',
        fontFamily: 'system',
        cardStyle: 'minimal',
        borderRadius: '0',
        layoutStyle: 'grid'
      }
    },
    {
      name: 'Purple Luxury',
      config: {
        primaryColor: '#581c87',
        secondaryColor: '#faf5ff',
        accentColor: '#a855f7',
        textPrimaryColor: '#faf5ff',
        textSecondaryColor: '#581c87',
        fontFamily: 'serif',
        cardStyle: 'modern',
        borderRadius: '24',
        layoutStyle: 'carousel'
      }
    }
  ]

  useEffect(() => {
    loadTheme()
  }, [restaurantId])

  const loadTheme = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('theme_config')
        .eq('id', restaurantId)
        .single()

      if (!error && data && data.theme_config) {
        setTheme(data.theme_config)
      }
    } catch (error) {
      console.error('Errore caricamento tema:', error)
    }
  }

  const saveTheme = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ 
          theme_config: theme,
          updated_at: new Date().toISOString()
        })
        .eq('id', restaurantId)

      if (error) throw error
      alert('✅ Tema salvato con successo!')
    } catch (error) {
      alert('❌ Errore nel salvataggio: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const applyPreset = (preset) => {
    setTheme(preset.config)
  }

  const getFontStyle = (fontFamily) => {
    switch(fontFamily) {
      case 'serif': return "'Georgia', 'Times New Roman', serif"
      case 'sans-serif': return "'Arial', 'Helvetica', sans-serif"
      case 'cursive': return "'Brush Script MT', cursive"
      default: return "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }
  }

  return (
    <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
      <h2 style={{ marginBottom: '20px' }}>🎨 Personalizza Tema Menu</h2>

      {/* Preset Temi */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>Temi Predefiniti</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {themePresets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              style={{
                padding: '10px 15px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                background: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.target.style.borderColor = '#6b7280'}
              onMouseOut={(e) => e.target.style.borderColor = '#e5e7eb'}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Personalizzazione Colori */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>Colori</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
              Sfondo Principale
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="color"
                value={theme.primaryColor}
                onChange={(e) => setTheme({...theme, primaryColor: e.target.value})}
                style={{ width: '50px', height: '40px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}
              />
              <input
                type="text"
                value={theme.primaryColor}
                onChange={(e) => setTheme({...theme, primaryColor: e.target.value})}
                style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
              Sfondo Sezioni
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="color"
                value={theme.secondaryColor}
                onChange={(e) => setTheme({...theme, secondaryColor: e.target.value})}
                style={{ width: '50px', height: '40px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}
              />
              <input
                type="text"
                value={theme.secondaryColor}
                onChange={(e) => setTheme({...theme, secondaryColor: e.target.value})}
                style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
              Colore Accent (Pulsanti)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="color"
                value={theme.accentColor}
                onChange={(e) => setTheme({...theme, accentColor: e.target.value})}
                style={{ width: '50px', height: '40px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}
              />
              <input
                type="text"
                value={theme.accentColor}
                onChange={(e) => setTheme({...theme, accentColor: e.target.value})}
                style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
              Testo su Sfondo Scuro
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="color"
                value={theme.textPrimaryColor}
                onChange={(e) => setTheme({...theme, textPrimaryColor: e.target.value})}
                style={{ width: '50px', height: '40px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}
              />
              <input
                type="text"
                value={theme.textPrimaryColor}
                onChange={(e) => setTheme({...theme, textPrimaryColor: e.target.value})}
                style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
              Testo su Sfondo Chiaro
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="color"
                value={theme.textSecondaryColor}
                onChange={(e) => setTheme({...theme, textSecondaryColor: e.target.value})}
                style={{ width: '50px', height: '40px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}
              />
              <input
                type="text"
                value={theme.textSecondaryColor}
                onChange={(e) => setTheme({...theme, textSecondaryColor: e.target.value})}
                style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stili e Layout */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>Stile e Layout</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Font</label>
            <select
              value={theme.fontFamily}
              onChange={(e) => setTheme({...theme, fontFamily: e.target.value})}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
            >
              <option value="system">Sistema (Default)</option>
              <option value="serif">Serif (Elegante)</option>
              <option value="sans-serif">Sans-Serif (Moderno)</option>
              <option value="cursive">Cursive (Decorativo)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Stile Card</label>
            <select
              value={theme.cardStyle}
              onChange={(e) => setTheme({...theme, cardStyle: e.target.value})}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
            >
              <option value="modern">Moderno</option>
              <option value="classic">Classico</option>
              <option value="minimal">Minimale</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Bordi Arrotondati</label>
            <select
              value={theme.borderRadius}
              onChange={(e) => setTheme({...theme, borderRadius: e.target.value})}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
            >
              <option value="0">Nessuno (Squadrato)</option>
              <option value="8">Leggero</option>
              <option value="16">Medio</option>
              <option value="24">Molto Arrotondato</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Layout Categorie</label>
            <select
              value={theme.layoutStyle}
              onChange={(e) => setTheme({...theme, layoutStyle: e.target.value})}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
            >
              <option value="carousel">Carousel (Scorrimento)</option>
              <option value="grid">Griglia</option>
              <option value="list">Lista</option>
            </select>
          </div>
        </div>
      </div>

      {/* Anteprima */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '20px', 
        backgroundColor: theme.primaryColor,
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <h4 style={{ 
          color: theme.textPrimaryColor, 
          fontFamily: getFontStyle(theme.fontFamily),
          marginBottom: '15px'
        }}>
          Anteprima Tema
        </h4>
        <div style={{
          backgroundColor: theme.secondaryColor,
          padding: '15px',
          borderRadius: `${theme.borderRadius}px`,
          marginBottom: '10px'
        }}>
          <p style={{ 
            color: theme.textSecondaryColor,
            fontFamily: getFontStyle(theme.fontFamily),
            margin: 0
          }}>
            Questo è come apparirà il tuo menu con questi colori
          </p>
        </div>
        <button style={{
          backgroundColor: theme.accentColor,
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: `${parseInt(theme.borderRadius) / 2}px`,
          fontFamily: getFontStyle(theme.fontFamily),
          cursor: 'pointer'
        }}>
          Pulsante Esempio
        </button>
      </div>

      {/* Pulsanti Azione */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={saveTheme}
          disabled={loading}
          style={{
            padding: '12px 24px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1
          }}
        >
          {loading ? 'Salvando...' : '💾 Salva Tema'}
        </button>

        <button
          onClick={() => window.open(`/#/menu/${restaurantId}`, '_blank')}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          👁️ Visualizza Menu
        </button>
      </div>
    </div>
  )
}

export default ThemeCustomizer