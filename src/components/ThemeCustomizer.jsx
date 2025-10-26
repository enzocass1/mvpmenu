import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import { Card, Button, Spinner } from './ui'

function ThemeCustomizer({ restaurantId }) {
  const [loading, setLoading] = useState(false)
  const [loadingRestaurant, setLoadingRestaurant] = useState(true)
  const [restaurant, setRestaurant] = useState(null)
  const [theme, setTheme] = useState({
    // Colori principali
    primaryColor: '#000000',      // Sfondo principale
    secondaryColor: '#ffffff',     // Sfondo sezioni
    accentColor: '#4CAF50',       // Colore pulsanti/accent
    textPrimaryColor: '#ffffff',  // Testo su sfondo scuro
    textSecondaryColor: '#111827', // Testo su sfondo chiaro

    // Colori funzionali
    borderColor: '#e0e0e0',        // Bordi card, input, separatori
    textTertiaryColor: '#999999',  // Testo disabilitato/placeholder
    errorColor: '#f44336',         // Messaggi errore
    successColor: '#4CAF50',       // Messaggi successo
    warningColor: '#ff9800',       // Warning/priority order
    backgroundTertiary: '#f9f9f9', // Background sezioni espanse
    favoriteActiveColor: '#e74c3c', // Cuore preferiti attivo
    deleteColor: '#f44336',        // Pulsanti elimina

    // Colori Input (NUOVI - Fase 1)
    inputBackground: '#ffffff',    // Background input/select/textarea
    inputBorder: '#e0e0e0',       // Bordo input normale
    inputBorderFocus: '#000000',  // Bordo input in focus
    inputText: '#111827',         // Testo input

    // Colori UI Aggiuntivi (NUOVI - Fase 1)
    overlayBackground: 'rgba(0,0,0,0.5)', // Overlay modal/sidebar
    cardBackground: '#ffffff',     // Background card generiche
    cardBorder: '#e0e0e0',        // Bordo card
    emptyStateText: '#999999',    // Testo stati vuoti
    linkColor: '#4CAF50',         // Colore link
    linkHoverColor: '#000000',    // Colore link hover

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
        borderColor: '#e0e0e0',
        textTertiaryColor: '#999999',
        errorColor: '#f44336',
        successColor: '#4CAF50',
        warningColor: '#ff9800',
        backgroundTertiary: '#f9f9f9',
        favoriteActiveColor: '#e74c3c',
        deleteColor: '#f44336',
        inputBackground: '#ffffff',
        inputBorder: '#e0e0e0',
        inputBorderFocus: '#000000',
        inputText: '#111827',
        overlayBackground: 'rgba(0,0,0,0.5)',
        cardBackground: '#ffffff',
        cardBorder: '#e0e0e0',
        emptyStateText: '#999999',
        linkColor: '#4CAF50',
        linkHoverColor: '#000000',
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
        borderColor: '#bae6fd',
        textTertiaryColor: '#7dd3fc',
        errorColor: '#dc2626',
        successColor: '#0ea5e9',
        warningColor: '#f59e0b',
        backgroundTertiary: '#e0f2fe',
        favoriteActiveColor: '#f43f5e',
        deleteColor: '#dc2626',
        inputBackground: '#f0f9ff',
        inputBorder: '#bae6fd',
        inputBorderFocus: '#0ea5e9',
        inputText: '#0f172a',
        overlayBackground: 'rgba(15,23,42,0.6)',
        cardBackground: '#f0f9ff',
        cardBorder: '#bae6fd',
        emptyStateText: '#7dd3fc',
        linkColor: '#0ea5e9',
        linkHoverColor: '#0f172a',
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
        borderColor: '#fbbf24',
        textTertiaryColor: '#d97706',
        errorColor: '#dc2626',
        successColor: '#16a34a',
        warningColor: '#ea580c',
        backgroundTertiary: '#fef08a',
        favoriteActiveColor: '#dc2626',
        deleteColor: '#b91c1c',
        inputBackground: '#fef3c7',
        inputBorder: '#fbbf24',
        inputBorderFocus: '#f59e0b',
        inputText: '#7c2d12',
        overlayBackground: 'rgba(124,45,18,0.6)',
        cardBackground: '#fef3c7',
        cardBorder: '#fbbf24',
        emptyStateText: '#d97706',
        linkColor: '#f59e0b',
        linkHoverColor: '#7c2d12',
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
        borderColor: '#d1d5db',
        textTertiaryColor: '#9ca3af',
        errorColor: '#ef4444',
        successColor: '#10b981',
        warningColor: '#f59e0b',
        backgroundTertiary: '#f3f4f6',
        favoriteActiveColor: '#ef4444',
        deleteColor: '#dc2626',
        inputBackground: '#f9fafb',
        inputBorder: '#d1d5db',
        inputBorderFocus: '#3b82f6',
        inputText: '#374151',
        overlayBackground: 'rgba(255,255,255,0.7)',
        cardBackground: '#f9fafb',
        cardBorder: '#d1d5db',
        emptyStateText: '#9ca3af',
        linkColor: '#3b82f6',
        linkHoverColor: '#111827',
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
        borderColor: '#e9d5ff',
        textTertiaryColor: '#c084fc',
        errorColor: '#dc2626',
        successColor: '#22c55e',
        warningColor: '#f59e0b',
        backgroundTertiary: '#f3e8ff',
        favoriteActiveColor: '#f43f5e',
        deleteColor: '#dc2626',
        inputBackground: '#faf5ff',
        inputBorder: '#e9d5ff',
        inputBorderFocus: '#a855f7',
        inputText: '#581c87',
        overlayBackground: 'rgba(88,28,135,0.6)',
        cardBackground: '#faf5ff',
        cardBorder: '#e9d5ff',
        emptyStateText: '#c084fc',
        linkColor: '#a855f7',
        linkHoverColor: '#581c87',
        fontFamily: 'serif',
        cardStyle: 'modern',
        borderRadius: '24',
        layoutStyle: 'carousel'
      }
    },
    {
      name: 'Italian Trattoria',
      config: {
        primaryColor: '#c8102e',
        secondaryColor: '#fff5f5',
        accentColor: '#008c45',
        textPrimaryColor: '#ffffff',
        textSecondaryColor: '#1a1a1a',
        borderColor: '#fcd5d5',
        textTertiaryColor: '#e57373',
        errorColor: '#d32f2f',
        successColor: '#388e3c',
        warningColor: '#f57c00',
        backgroundTertiary: '#ffebee',
        favoriteActiveColor: '#d32f2f',
        deleteColor: '#c62828',
        inputBackground: '#fff5f5',
        inputBorder: '#fcd5d5',
        inputBorderFocus: '#008c45',
        inputText: '#1a1a1a',
        overlayBackground: 'rgba(200,16,46,0.6)',
        cardBackground: '#fff5f5',
        cardBorder: '#fcd5d5',
        emptyStateText: '#e57373',
        linkColor: '#008c45',
        linkHoverColor: '#1a1a1a',
        fontFamily: 'serif',
        cardStyle: 'classic',
        borderRadius: '8',
        layoutStyle: 'carousel'
      }
    },
    {
      name: 'Japanese Zen',
      config: {
        primaryColor: '#1a1a1a',
        secondaryColor: '#fafafa',
        accentColor: '#d32f2f',
        textPrimaryColor: '#ffffff',
        textSecondaryColor: '#212121',
        borderColor: '#e0e0e0',
        textTertiaryColor: '#757575',
        errorColor: '#c62828',
        successColor: '#388e3c',
        warningColor: '#f57c00',
        backgroundTertiary: '#f5f5f5',
        favoriteActiveColor: '#d32f2f',
        deleteColor: '#b71c1c',
        inputBackground: '#fafafa',
        inputBorder: '#e0e0e0',
        inputBorderFocus: '#d32f2f',
        inputText: '#212121',
        overlayBackground: 'rgba(26,26,26,0.7)',
        cardBackground: '#fafafa',
        cardBorder: '#e0e0e0',
        emptyStateText: '#757575',
        linkColor: '#d32f2f',
        linkHoverColor: '#212121',
        fontFamily: 'sans-serif',
        cardStyle: 'minimal',
        borderRadius: '0',
        layoutStyle: 'list'
      }
    },
    {
      name: 'French Bistro',
      config: {
        primaryColor: '#8b1538',
        secondaryColor: '#fef9f3',
        accentColor: '#d4af37',
        textPrimaryColor: '#fef9f3',
        textSecondaryColor: '#2c1810',
        borderColor: '#e8d4a6',
        textTertiaryColor: '#b8956a',
        errorColor: '#c62828',
        successColor: '#558b2f',
        warningColor: '#ef6c00',
        backgroundTertiary: '#faf3e8',
        favoriteActiveColor: '#d32f2f',
        deleteColor: '#b71c1c',
        inputBackground: '#fef9f3',
        inputBorder: '#e8d4a6',
        inputBorderFocus: '#d4af37',
        inputText: '#2c1810',
        overlayBackground: 'rgba(139,21,56,0.6)',
        cardBackground: '#fef9f3',
        cardBorder: '#e8d4a6',
        emptyStateText: '#b8956a',
        linkColor: '#d4af37',
        linkHoverColor: '#2c1810',
        fontFamily: 'serif',
        cardStyle: 'classic',
        borderRadius: '16',
        layoutStyle: 'carousel'
      }
    },
    {
      name: 'Modern Green',
      config: {
        primaryColor: '#1b5e20',
        secondaryColor: '#f1f8f4',
        accentColor: '#4caf50',
        textPrimaryColor: '#e8f5e9',
        textSecondaryColor: '#1b5e20',
        borderColor: '#a5d6a7',
        textTertiaryColor: '#66bb6a',
        errorColor: '#d32f2f',
        successColor: '#2e7d32',
        warningColor: '#f57c00',
        backgroundTertiary: '#e8f5e9',
        favoriteActiveColor: '#d32f2f',
        deleteColor: '#c62828',
        inputBackground: '#f1f8f4',
        inputBorder: '#a5d6a7',
        inputBorderFocus: '#4caf50',
        inputText: '#1b5e20',
        overlayBackground: 'rgba(27,94,32,0.6)',
        cardBackground: '#f1f8f4',
        cardBorder: '#a5d6a7',
        emptyStateText: '#66bb6a',
        linkColor: '#4caf50',
        linkHoverColor: '#1b5e20',
        fontFamily: 'system',
        cardStyle: 'modern',
        borderRadius: '24',
        layoutStyle: 'grid'
      }
    }
  ]

  useEffect(() => {
    if (restaurantId) {
      loadRestaurantAndTheme()
    }
  }, [restaurantId])

  const loadRestaurantAndTheme = async () => {
    try {
      setLoadingRestaurant(true)
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single()

      if (error) throw error

      setRestaurant(data)

      // Carica tema se presente
      if (data && data.theme_config) {
        setTheme(data.theme_config)
      }
    } catch (error) {
      console.error('Errore caricamento ristorante e tema:', error)
    } finally {
      setLoadingRestaurant(false)
    }
  }

  const saveTheme = async () => {
    if (!restaurantId) {
      alert('❌ Errore: ID ristorante mancante')
      return
    }

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
      console.error('Errore salvataggio:', error)
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

  const handleViewMenu = () => {
    if (!restaurant?.subdomain) {
      alert('❌ Errore: Subdomain non configurato per questo ristorante')
      return
    }
    window.open(`/#/menu/${restaurant.subdomain}`, '_blank')
  }

  if (loadingRestaurant) {
    return <Spinner size="lg" text="Caricamento..." centered />
  }

  if (!restaurant) {
    return (
      <Card>
        <div style={{ padding: tokens.spacing.xl, textAlign: 'center' }}>
          <p style={{ color: tokens.colors.gray[600] }}>
            Impossibile caricare il ristorante
          </p>
        </div>
      </Card>
    )
  }

  const sectionTitleStyles = {
    margin: 0,
    marginBottom: tokens.spacing.lg,
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.black,
  }

  const labelStyles = {
    display: 'block',
    marginBottom: tokens.spacing.xs,
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.gray[700],
  }

  const inputStyles = {
    width: '100%',
    padding: tokens.spacing.sm,
    fontSize: tokens.typography.fontSize.sm,
    border: `1px solid ${tokens.colors.gray[300]}`,
    borderRadius: tokens.borderRadius.md,
    outline: 'none',
    transition: 'border-color 0.2s ease',
  }

  const colorInputStyles = {
    width: '50px',
    height: '40px',
    border: `1px solid ${tokens.colors.gray[300]}`,
    borderRadius: tokens.borderRadius.sm,
    cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 767px) {
          .theme-card-padding {
            padding: 16px !important;
          }

          /* Prevent horizontal overflow */
          * {
            max-width: 100%;
            box-sizing: border-box;
          }

          input[type="text"], input[type="color"], select, textarea {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      {/* Header */}
      <div>
        <h2 style={{
          margin: 0,
          marginBottom: tokens.spacing.xs,
          fontSize: tokens.typography.fontSize['2xl'],
          fontWeight: tokens.typography.fontWeight.bold,
          color: tokens.colors.black,
        }}>
          Personalizza Tema Menu
        </h2>
        <p style={{
          margin: 0,
          fontSize: tokens.typography.fontSize.sm,
          color: tokens.colors.gray[600],
        }}>
          Configura l'aspetto del tuo menu pubblico
        </p>
      </div>

      {/* Preset Temi */}
      <Card>
        <div style={{ padding: tokens.spacing.xl }} className="theme-card-padding">
          <h3 style={sectionTitleStyles}>Temi Predefiniti</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))',
            gap: tokens.spacing.md
          }}>
            {themePresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                style={{
                  padding: tokens.spacing.md,
                  border: `2px solid ${tokens.colors.gray[300]}`,
                  borderRadius: tokens.borderRadius.md,
                  background: tokens.colors.white,
                  cursor: 'pointer',
                  fontSize: tokens.typography.fontSize.sm,
                  fontWeight: tokens.typography.fontWeight.medium,
                  color: tokens.colors.gray[900],
                  transition: 'all 0.2s ease',
                  textAlign: 'center',
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = tokens.colors.black
                  e.target.style.backgroundColor = tokens.colors.gray[50]
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = tokens.colors.gray[300]
                  e.target.style.backgroundColor = tokens.colors.white
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Personalizzazione Colori */}
      <Card>
        <div style={{ padding: tokens.spacing.xl }} className="theme-card-padding">
          <h3 style={sectionTitleStyles}>Colori Principali</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
            gap: tokens.spacing.lg
          }}>
            <div>
              <label style={labelStyles}>Sfondo Principale</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                <input
                  type="color"
                  value={theme.primaryColor}
                  onChange={(e) => setTheme({...theme, primaryColor: e.target.value})}
                  style={colorInputStyles}
                />
                <input
                  type="text"
                  value={theme.primaryColor}
                  onChange={(e) => setTheme({...theme, primaryColor: e.target.value})}
                  style={{ ...inputStyles, flex: 1 }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyles}>Sfondo Sezioni</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                <input
                  type="color"
                  value={theme.secondaryColor}
                  onChange={(e) => setTheme({...theme, secondaryColor: e.target.value})}
                  style={colorInputStyles}
                />
                <input
                  type="text"
                  value={theme.secondaryColor}
                  onChange={(e) => setTheme({...theme, secondaryColor: e.target.value})}
                  style={{ ...inputStyles, flex: 1 }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyles}>Colore Accent (Pulsanti)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                <input
                  type="color"
                  value={theme.accentColor}
                  onChange={(e) => setTheme({...theme, accentColor: e.target.value})}
                  style={colorInputStyles}
                />
                <input
                  type="text"
                  value={theme.accentColor}
                  onChange={(e) => setTheme({...theme, accentColor: e.target.value})}
                  style={{ ...inputStyles, flex: 1 }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyles}>Testo su Sfondo Scuro</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                <input
                  type="color"
                  value={theme.textPrimaryColor}
                  onChange={(e) => setTheme({...theme, textPrimaryColor: e.target.value})}
                  style={colorInputStyles}
                />
                <input
                  type="text"
                  value={theme.textPrimaryColor}
                  onChange={(e) => setTheme({...theme, textPrimaryColor: e.target.value})}
                  style={{ ...inputStyles, flex: 1 }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyles}>Testo su Sfondo Chiaro</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                <input
                  type="color"
                  value={theme.textSecondaryColor}
                  onChange={(e) => setTheme({...theme, textSecondaryColor: e.target.value})}
                  style={colorInputStyles}
                />
                <input
                  type="text"
                  value={theme.textSecondaryColor}
                  onChange={(e) => setTheme({...theme, textSecondaryColor: e.target.value})}
                  style={{ ...inputStyles, flex: 1 }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Colori Funzionali (NUOVA SEZIONE) */}
      <Card>
        <div style={{ padding: tokens.spacing.xl }} className="theme-card-padding">
          <h3 style={sectionTitleStyles}>Colori Funzionali</h3>
          <p style={{
            marginBottom: tokens.spacing.lg,
            fontSize: tokens.typography.fontSize.sm,
            color: tokens.colors.gray[600]
          }}>
            Colori per elementi specifici: bordi, stati di errore/successo, azioni
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
            gap: tokens.spacing.lg
          }}>
            <div>
              <label style={labelStyles}>Colore Bordi</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                <input
                  type="color"
                  value={theme.borderColor}
                  onChange={(e) => setTheme({...theme, borderColor: e.target.value})}
                  style={colorInputStyles}
                />
                <input
                  type="text"
                  value={theme.borderColor}
                  onChange={(e) => setTheme({...theme, borderColor: e.target.value})}
                  style={{ ...inputStyles, flex: 1 }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyles}>Testo Disabilitato</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                <input
                  type="color"
                  value={theme.textTertiaryColor}
                  onChange={(e) => setTheme({...theme, textTertiaryColor: e.target.value})}
                  style={colorInputStyles}
                />
                <input
                  type="text"
                  value={theme.textTertiaryColor}
                  onChange={(e) => setTheme({...theme, textTertiaryColor: e.target.value})}
                  style={{ ...inputStyles, flex: 1 }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyles}>Background Terziario</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                <input
                  type="color"
                  value={theme.backgroundTertiary}
                  onChange={(e) => setTheme({...theme, backgroundTertiary: e.target.value})}
                  style={colorInputStyles}
                />
                <input
                  type="text"
                  value={theme.backgroundTertiary}
                  onChange={(e) => setTheme({...theme, backgroundTertiary: e.target.value})}
                  style={{ ...inputStyles, flex: 1 }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyles}>Colore Errore</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                <input
                  type="color"
                  value={theme.errorColor}
                  onChange={(e) => setTheme({...theme, errorColor: e.target.value})}
                  style={colorInputStyles}
                />
                <input
                  type="text"
                  value={theme.errorColor}
                  onChange={(e) => setTheme({...theme, errorColor: e.target.value})}
                  style={{ ...inputStyles, flex: 1 }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyles}>Colore Successo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                <input
                  type="color"
                  value={theme.successColor}
                  onChange={(e) => setTheme({...theme, successColor: e.target.value})}
                  style={colorInputStyles}
                />
                <input
                  type="text"
                  value={theme.successColor}
                  onChange={(e) => setTheme({...theme, successColor: e.target.value})}
                  style={{ ...inputStyles, flex: 1 }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyles}>Colore Warning</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                <input
                  type="color"
                  value={theme.warningColor}
                  onChange={(e) => setTheme({...theme, warningColor: e.target.value})}
                  style={colorInputStyles}
                />
                <input
                  type="text"
                  value={theme.warningColor}
                  onChange={(e) => setTheme({...theme, warningColor: e.target.value})}
                  style={{ ...inputStyles, flex: 1 }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyles}>Colore Preferiti Attivi</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                <input
                  type="color"
                  value={theme.favoriteActiveColor}
                  onChange={(e) => setTheme({...theme, favoriteActiveColor: e.target.value})}
                  style={colorInputStyles}
                />
                <input
                  type="text"
                  value={theme.favoriteActiveColor}
                  onChange={(e) => setTheme({...theme, favoriteActiveColor: e.target.value})}
                  style={{ ...inputStyles, flex: 1 }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyles}>Colore Elimina</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                <input
                  type="color"
                  value={theme.deleteColor}
                  onChange={(e) => setTheme({...theme, deleteColor: e.target.value})}
                  style={colorInputStyles}
                />
                <input
                  type="text"
                  value={theme.deleteColor}
                  onChange={(e) => setTheme({...theme, deleteColor: e.target.value})}
                  style={{ ...inputStyles, flex: 1 }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Stili e Layout */}
      <Card>
        <div style={{ padding: tokens.spacing.xl }} className="theme-card-padding">
          <h3 style={sectionTitleStyles}>Stile e Layout</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
            gap: tokens.spacing.lg
          }}>
            <div>
              <label style={labelStyles}>Font</label>
              <select
                value={theme.fontFamily}
                onChange={(e) => setTheme({...theme, fontFamily: e.target.value})}
                style={inputStyles}
              >
                <option value="system">Sistema (Default)</option>
                <option value="serif">Serif (Elegante)</option>
                <option value="sans-serif">Sans-Serif (Moderno)</option>
                <option value="cursive">Cursive (Decorativo)</option>
              </select>
            </div>

            <div>
              <label style={labelStyles}>Stile Card</label>
              <select
                value={theme.cardStyle}
                onChange={(e) => setTheme({...theme, cardStyle: e.target.value})}
                style={inputStyles}
              >
                <option value="modern">Moderno</option>
                <option value="classic">Classico</option>
                <option value="minimal">Minimale</option>
              </select>
            </div>

            <div>
              <label style={labelStyles}>Bordi Arrotondati</label>
              <select
                value={theme.borderRadius}
                onChange={(e) => setTheme({...theme, borderRadius: e.target.value})}
                style={inputStyles}
              >
                <option value="0">Nessuno (Squadrato)</option>
                <option value="8">Leggero</option>
                <option value="16">Medio</option>
                <option value="24">Molto Arrotondato</option>
              </select>
            </div>

            <div>
              <label style={labelStyles}>Layout Categorie</label>
              <select
                value={theme.layoutStyle}
                onChange={(e) => setTheme({...theme, layoutStyle: e.target.value})}
                style={inputStyles}
              >
                <option value="carousel">Carousel (Scorrimento)</option>
                <option value="grid">Griglia</option>
                <option value="list">Lista</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Anteprima */}
      <Card>
        <div style={{ padding: tokens.spacing.xl }} className="theme-card-padding">
          <h3 style={sectionTitleStyles}>Anteprima Tema</h3>

          {/* Background principale del menu */}
          <div style={{
            padding: tokens.spacing.xl,
            backgroundColor: theme.primaryColor,
            borderRadius: tokens.borderRadius.lg,
            minHeight: '400px',
          }}>
            {/* Header del menu */}
            <div style={{
              marginBottom: tokens.spacing.xl,
              textAlign: 'center',
            }}>
              <h2 style={{
                color: theme.textPrimaryColor,
                fontFamily: getFontStyle(theme.fontFamily),
                fontSize: tokens.typography.fontSize['2xl'],
                fontWeight: tokens.typography.fontWeight.bold,
                margin: 0,
                marginBottom: tokens.spacing.xs,
              }}>
                {restaurant?.name || 'Il Tuo Ristorante'}
              </h2>
              <p style={{
                color: theme.textPrimaryColor,
                fontFamily: getFontStyle(theme.fontFamily),
                fontSize: tokens.typography.fontSize.sm,
                margin: 0,
                opacity: 0.9,
              }}>
                Anteprima del tema
              </p>
            </div>

            {/* Card Prodotto Esempio */}
            <div style={{
              backgroundColor: theme.secondaryColor,
              borderRadius: `${theme.borderRadius}px`,
              overflow: 'hidden',
              border: `1px solid ${theme.borderColor}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}>
              {/* Immagine prodotto placeholder */}
              <div style={{
                width: '100%',
                height: '180px',
                backgroundColor: theme.backgroundTertiary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}>
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke={theme.textTertiaryColor} strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                {/* Badge preferiti */}
                <div style={{
                  position: 'absolute',
                  top: tokens.spacing.sm,
                  right: tokens.spacing.sm,
                  backgroundColor: theme.favoriteActiveColor,
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </div>
              </div>

              {/* Dettagli prodotto */}
              <div style={{ padding: tokens.spacing.lg }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: tokens.spacing.sm,
                }}>
                  <h4 style={{
                    color: theme.textSecondaryColor,
                    fontFamily: getFontStyle(theme.fontFamily),
                    fontSize: tokens.typography.fontSize.lg,
                    fontWeight: tokens.typography.fontWeight.semibold,
                    margin: 0,
                  }}>
                    Prodotto Esempio
                  </h4>
                  <span style={{
                    color: theme.accentColor,
                    fontFamily: getFontStyle(theme.fontFamily),
                    fontSize: tokens.typography.fontSize.lg,
                    fontWeight: tokens.typography.fontWeight.bold,
                  }}>
                    €12.50
                  </span>
                </div>

                <p style={{
                  color: theme.textTertiaryColor,
                  fontFamily: getFontStyle(theme.fontFamily),
                  fontSize: tokens.typography.fontSize.sm,
                  margin: 0,
                  marginBottom: tokens.spacing.md,
                  lineHeight: 1.5,
                }}>
                  Una deliziosa descrizione del prodotto che mostra come apparirà il testo nel tuo menu
                </p>

                {/* Badge categoria */}
                <div style={{
                  display: 'inline-block',
                  backgroundColor: theme.backgroundTertiary,
                  color: theme.textTertiaryColor,
                  padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                  borderRadius: tokens.borderRadius.sm,
                  fontSize: tokens.typography.fontSize.xs,
                  fontWeight: tokens.typography.fontWeight.medium,
                  marginBottom: tokens.spacing.md,
                }}>
                  Categoria
                </div>

                {/* Bottone aggiungi */}
                <button style={{
                  width: '100%',
                  backgroundColor: theme.accentColor,
                  color: theme.textPrimaryColor,
                  padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
                  border: 'none',
                  borderRadius: `${parseInt(theme.borderRadius) / 2}px`,
                  fontFamily: getFontStyle(theme.fontFamily),
                  fontSize: tokens.typography.fontSize.sm,
                  fontWeight: tokens.typography.fontWeight.medium,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.target.style.opacity = '0.9'
                  e.target.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.opacity = '1'
                  e.target.style.transform = 'translateY(0)'
                }}
                >
                  Aggiungi al Carrello
                </button>
              </div>
            </div>

            {/* Info colori funzionali */}
            <div style={{
              marginTop: tokens.spacing.lg,
              padding: tokens.spacing.md,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: tokens.borderRadius.md,
              border: `1px solid ${theme.borderColor}`,
            }}>
              <p style={{
                color: theme.textPrimaryColor,
                fontFamily: getFontStyle(theme.fontFamily),
                fontSize: tokens.typography.fontSize.xs,
                margin: 0,
                opacity: 0.8,
                textAlign: 'center',
              }}>
                💡 Questa anteprima mostra i colori principali, funzionali, bordi e stili del tuo tema
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Azioni */}
      <Card>
        <div style={{ padding: tokens.spacing.xl }} className="theme-card-padding">
          <h3 style={{
            fontSize: tokens.typography.fontSize.lg,
            fontWeight: tokens.typography.fontWeight.semibold,
            color: tokens.colors.gray[900],
            margin: 0,
            marginBottom: tokens.spacing.lg,
          }}>
            Azioni
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
            gap: tokens.spacing.md,
          }}>
            {/* Bottone Salva */}
            <button
              onClick={saveTheme}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: tokens.spacing.sm,
                padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
                backgroundColor: loading ? tokens.colors.gray[400] : tokens.colors.primary,
                color: '#ffffff',
                border: 'none',
                borderRadius: tokens.borderRadius.md,
                fontSize: tokens.typography.fontSize.md,
                fontWeight: tokens.typography.fontWeight.medium,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: loading ? 'none' : '0 2px 4px rgba(0,0,0,0.1)',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = tokens.colors.primaryDark;
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = tokens.colors.primary;
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              <span>{loading ? 'Salvando...' : 'Salva Tema'}</span>
            </button>

            {/* Bottone Visualizza Menu */}
            <button
              onClick={handleViewMenu}
              disabled={!restaurant?.subdomain}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: tokens.spacing.sm,
                padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
                backgroundColor: !restaurant?.subdomain ? tokens.colors.gray[200] : '#ffffff',
                color: !restaurant?.subdomain ? tokens.colors.gray[400] : tokens.colors.gray[700],
                border: `2px solid ${!restaurant?.subdomain ? tokens.colors.gray[300] : tokens.colors.gray[300]}`,
                borderRadius: tokens.borderRadius.md,
                fontSize: tokens.typography.fontSize.md,
                fontWeight: tokens.typography.fontWeight.medium,
                cursor: !restaurant?.subdomain ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (restaurant?.subdomain) {
                  e.target.style.borderColor = tokens.colors.primary;
                  e.target.style.color = tokens.colors.primary;
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (restaurant?.subdomain) {
                  e.target.style.borderColor = tokens.colors.gray[300];
                  e.target.style.color = tokens.colors.gray[700];
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span>Visualizza Menu</span>
            </button>
          </div>

          {/* URL Menu */}
          {restaurant?.subdomain && (
            <div style={{
              marginTop: tokens.spacing.lg,
              padding: tokens.spacing.md,
              backgroundColor: tokens.colors.gray[50],
              border: `1px solid ${tokens.colors.gray[200]}`,
              borderRadius: tokens.borderRadius.md,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing.sm,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={tokens.colors.gray[500]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                <span style={{
                  fontSize: tokens.typography.fontSize.sm,
                  color: tokens.colors.gray[600],
                  fontFamily: 'monospace',
                }}>
                  {window.location.origin}/#/menu/{restaurant.subdomain}
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default ThemeCustomizer
