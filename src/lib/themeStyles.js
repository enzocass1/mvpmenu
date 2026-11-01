// Logica di stile del tema CONDIVISA tra il menu pubblico (PublicMenu) e
// l'editor live (ThemeHomeEditor), così l'anteprima è identica al menu reale.
// Converte il theme_config "grezzo" (colori hex, chiavi font, raggi) negli
// stili risolti usati dai componenti del menu.

// Mappa dei font. Le voci con "google" richiedono il caricamento Google Fonts.
export const FONT_MAP = {
  system: { stack: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  serif: { stack: 'Georgia, "Times New Roman", serif' },
  'sans-serif': { stack: '"Helvetica Neue", Arial, sans-serif' },
  cursive: { stack: '"Comic Sans MS", cursive' },
  // Web fonts (eleganti/moderni)
  playfair: { stack: '"Playfair Display", Georgia, serif', google: 'Playfair+Display:wght@500;600;700' },
  cormorant: { stack: '"Cormorant Garamond", Georgia, serif', google: 'Cormorant+Garamond:wght@500;600;700' },
  inter: { stack: '"Inter", -apple-system, sans-serif', google: 'Inter:wght@400;500;600' },
  poppins: { stack: '"Poppins", -apple-system, sans-serif', google: 'Poppins:wght@400;500;600' },
  montserrat: { stack: '"Montserrat", -apple-system, sans-serif', google: 'Montserrat:wght@400;500;600' },
  // Display audaci (temi "stravolgenti")
  orbitron: { stack: '"Orbitron", sans-serif', google: 'Orbitron:wght@600;700;800' },
  bebas: { stack: '"Bebas Neue", sans-serif', google: 'Bebas+Neue' },
  spacegrotesk: { stack: '"Space Grotesk", sans-serif', google: 'Space+Grotesk:wght@400;500;600;700' }
}

// Elenco font per i menu a tendina dell'editor
export const FONT_OPTIONS = [
  { value: 'system', label: 'Sistema (default)' },
  { value: 'inter', label: 'Inter (moderno)' },
  { value: 'poppins', label: 'Poppins (moderno)' },
  { value: 'montserrat', label: 'Montserrat (moderno)' },
  { value: 'playfair', label: 'Playfair Display (elegante)' },
  { value: 'cormorant', label: 'Cormorant (elegante)' },
  { value: 'serif', label: 'Serif classico' },
  { value: 'orbitron', label: 'Orbitron (futuristico)' },
  { value: 'bebas', label: 'Bebas Neue (impatto)' },
  { value: 'spacegrotesk', label: 'Space Grotesk (tech)' }
]

export const getFontFamily = (fontType) => (FONT_MAP[fontType] || FONT_MAP.system).stack

export const getBorderRadius = (radius) => `${radius}px`

// Carica una volta sola i Google Fonts richiesti dal tema (corpo + titoli)
export const ensureThemeFonts = (themeConfig) => {
  if (!themeConfig || typeof document === 'undefined') return
  const keys = [themeConfig.fontFamily, themeConfig.headingFontFamily].filter(Boolean)
  const families = keys.map(k => FONT_MAP[k]?.google).filter(Boolean)
  for (const fam of families) {
    const id = 'gfont-' + fam.replace(/[^a-z0-9]/gi, '')
    if (document.getElementById(id)) continue
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${fam}&display=swap`
    document.head.appendChild(link)
  }
}

export const getThemeStyles = (themeConfig) => {
  if (!themeConfig) return {}
  return {
    primaryColor: themeConfig.primaryColor || '#000000',
    secondaryColor: themeConfig.secondaryColor || '#ffffff',
    accentColor: themeConfig.accentColor || '#4CAF50',
    buttonColor: themeConfig.buttonColor || themeConfig.primaryColor || '#000000',
    buttonTextColor: themeConfig.buttonTextColor || themeConfig.textPrimaryColor || '#ffffff',
    textPrimaryColor: themeConfig.textPrimaryColor || '#ffffff',
    textSecondaryColor: themeConfig.textSecondaryColor || '#111827',
    borderColor: themeConfig.borderColor || '#e0e0e0',
    textTertiaryColor: themeConfig.textTertiaryColor || '#999999',
    errorColor: themeConfig.errorColor || '#f44336',
    successColor: themeConfig.successColor || '#4CAF50',
    warningColor: themeConfig.warningColor || '#ff9800',
    backgroundTertiary: themeConfig.backgroundTertiary || '#f9f9f9',
    favoriteActiveColor: themeConfig.favoriteActiveColor || '#e74c3c',
    deleteColor: themeConfig.deleteColor || '#f44336',
    inputBackground: themeConfig.inputBackground || '#ffffff',
    inputBorder: themeConfig.inputBorder || '#e0e0e0',
    inputBorderFocus: themeConfig.inputBorderFocus || '#000000',
    inputText: themeConfig.inputText || '#111827',
    overlayBackground: themeConfig.overlayBackground || 'rgba(0,0,0,0.5)',
    cardBackground: themeConfig.cardBackground || '#ffffff',
    cardBorder: themeConfig.cardBorder || '#e0e0e0',
    emptyStateText: themeConfig.emptyStateText || '#999999',
    linkColor: themeConfig.linkColor || '#4CAF50',
    linkHoverColor: themeConfig.linkHoverColor || '#000000',
    fontFamily: getFontFamily(themeConfig.fontFamily || 'system'),
    headingFontFamily: getFontFamily(themeConfig.headingFontFamily || themeConfig.fontFamily || 'system'),
    headingGlow: themeConfig.headingGlow || null,
    headingUppercase: themeConfig.headingUppercase || false,
    borderRadius: getBorderRadius(themeConfig.borderRadius || '16'),
    // Passo anche i settaggi MACRO grezzi: MenuBuilderLayout li legge direttamente
    textScale: themeConfig.textScale,
    cardSize: themeConfig.cardSize,
    sectionGap: themeConfig.sectionGap,
    showCategoryChips: themeConfig.showCategoryChips
  }
}
