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

    // Colori funzionali (NUOVI)
    borderColor: '#e0e0e0',        // Bordi card, input, separatori
    textTertiaryColor: '#999999',  // Testo disabilitato/placeholder
    errorColor: '#f44336',         // Messaggi errore
    successColor: '#4CAF50',       // Messaggi successo
    warningColor: '#ff9800',       // Warning/priority order
    backgroundTertiary: '#f9f9f9', // Background sezioni espanse
    favoriteActiveColor: '#e74c3c', // Cuore preferiti attivo
    deleteColor: '#f44336',        // Pulsanti elimina

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
        fontFamily: 'serif',
        cardStyle: 'modern',
        borderRadius: '24',
        layoutStyle: 'carousel'
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
        <div style={{ padding: tokens.spacing.xl }}>
          <h3 style={sectionTitleStyles}>Temi Predefiniti</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
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
        <div style={{ padding: tokens.spacing.xl }}>
          <h3 style={sectionTitleStyles}>Colori Principali</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
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
        <div style={{ padding: tokens.spacing.xl }}>
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
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
        <div style={{ padding: tokens.spacing.xl }}>
          <h3 style={sectionTitleStyles}>Stile e Layout</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
        <div style={{ padding: tokens.spacing.xl }}>
          <h3 style={sectionTitleStyles}>Anteprima Tema</h3>
          <div style={{
            padding: tokens.spacing.xl,
            backgroundColor: theme.primaryColor,
            borderRadius: tokens.borderRadius.lg,
          }}>
            <h4 style={{
              color: theme.textPrimaryColor,
              fontFamily: getFontStyle(theme.fontFamily),
              marginBottom: tokens.spacing.lg,
              fontSize: tokens.typography.fontSize.xl,
              fontWeight: tokens.typography.fontWeight.semibold,
            }}>
              Il Tuo Ristorante
            </h4>
            <div style={{
              backgroundColor: theme.secondaryColor,
              padding: tokens.spacing.lg,
              borderRadius: `${theme.borderRadius}px`,
              marginBottom: tokens.spacing.md,
            }}>
              <p style={{
                color: theme.textSecondaryColor,
                fontFamily: getFontStyle(theme.fontFamily),
                margin: 0,
                fontSize: tokens.typography.fontSize.base,
              }}>
                Questo è come apparirà il tuo menu con questi colori e stili
              </p>
            </div>
            <button style={{
              backgroundColor: theme.accentColor,
              color: tokens.colors.white,
              padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
              border: 'none',
              borderRadius: `${parseInt(theme.borderRadius) / 2}px`,
              fontFamily: getFontStyle(theme.fontFamily),
              fontSize: tokens.typography.fontSize.sm,
              fontWeight: tokens.typography.fontWeight.medium,
              cursor: 'pointer',
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={(e) => e.target.style.opacity = '0.9'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              Pulsante Esempio
            </button>
          </div>
        </div>
      </Card>

      {/* Pulsanti Azione */}
      <Card>
        <div style={{ padding: tokens.spacing.xl }}>
          <div style={{ display: 'flex', gap: tokens.spacing.md, flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              size="md"
              onClick={saveTheme}
              disabled={loading}
              style={{ minWidth: '160px' }}
            >
              {loading ? 'Salvando...' : '💾 Salva Tema'}
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={handleViewMenu}
              disabled={!restaurant?.subdomain}
              style={{ minWidth: '160px' }}
            >
              👁️ Visualizza Menu
            </Button>

            {restaurant?.subdomain && (
              <div style={{
                flex: 1,
                minWidth: '200px',
                display: 'flex',
                alignItems: 'center',
                padding: tokens.spacing.sm,
                backgroundColor: tokens.colors.gray[100],
                borderRadius: tokens.borderRadius.md,
              }}>
                <span style={{
                  fontSize: tokens.typography.fontSize.sm,
                  color: tokens.colors.gray[600],
                }}>
                  URL: {window.location.origin}/#/menu/{restaurant.subdomain}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

export default ThemeCustomizer
