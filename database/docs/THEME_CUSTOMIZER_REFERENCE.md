# Riferimento Completo ThemeCustomizer

**Data creazione:** 2025-10-25
**Ultima modifica:** 2025-10-25
**Componente:** `src/components/ThemeCustomizer.jsx`
**Status:** ✅ Completamente implementato e ottimizzato

---

## 1. PANORAMICA

### 1.1 Scopo del Componente

ThemeCustomizer è l'interfaccia amministrativa che permette ai ristoratori di personalizzare completamente l'aspetto del loro menu pubblico senza scrivere codice.

**File:** `src/components/ThemeCustomizer.jsx` (1083 linee)

**Funzionalità principali:**
- Personalizzazione colori (13 colori totali)
- Selezione font family
- Configurazione border radius
- 8 template pre-configurati
- Anteprima real-time del menu
- Salvataggio su database Supabase
- Link diretto al menu pubblico

---

## 2. ARCHITETTURA DATI

### 2.1 Schema Theme Config

Il theme viene salvato nella colonna JSONB `theme_config` della tabella `restaurants`:

```javascript
{
  // COLORI BASE (5)
  primaryColor: '#000000',           // Colore principale (pulsanti, header, footer)
  secondaryColor: '#ffffff',         // Background principale
  accentColor: '#4CAF50',           // Colore accento (bottoni aggiungi, etc.)
  textPrimaryColor: '#ffffff',       // Testo su sfondi scuri
  textSecondaryColor: '#111827',     // Testo su sfondi chiari

  // COLORI FUNZIONALI (8)
  borderColor: '#e0e0e0',           // Bordi card, input, separatori
  textTertiaryColor: '#999999',     // Testo disabilitato, placeholder
  errorColor: '#f44336',            // Messaggi errore
  successColor: '#4CAF50',          // Messaggi successo
  warningColor: '#ff9800',          // Warning, priority orders
  backgroundTertiary: '#f9f9f9',    // Background sezioni espanse
  favoriteActiveColor: '#e74c3c',   // Cuore preferiti attivo
  deleteColor: '#f44336',           // Pulsanti elimina

  // TIPOGRAFIA & LAYOUT
  fontFamily: 'system',              // system/serif/sans-serif/cursive
  cardStyle: 'modern',               // (non implementato ancora)
  borderRadius: '16',                // Arrotondamento angoli (px)
  layoutStyle: 'carousel'            // (non implementato ancora)
}
```

### 2.2 Font Families Disponibili

```javascript
const getFontStyle = (fontFamily) => {
  const fontMap = {
    'system': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'serif': 'Georgia, "Times New Roman", serif',
    'sans-serif': '"Helvetica Neue", Arial, sans-serif',
    'cursive': '"Comic Sans MS", cursive'
  }
  return fontMap[fontFamily] || fontMap['system']
}
```

---

## 3. TEMPLATE PRE-CONFIGURATI

### 3.1 Lista Template

Il componente include 8 template pronti all'uso:

| Nome | Colori Principali | Font | Stile |
|------|------------------|------|-------|
| **Default Elegante** | Nero, Bianco, Verde | System | Elegante moderno |
| **Ocean Blue** | Blu oceano, Bianco | Sans-serif | Fresco marino |
| **Sunset Orange** | Arancione, Crema | Serif | Caldo accogliente |
| **Forest Green** | Verde foresta, Beige | Serif | Naturale rustico |
| **Italian Trattoria** | Rosso, Verde, Bianco (tricolore) | Serif | Tradizionale italiano |
| **Japanese Zen** | Nero, Bianco, Rosso accento | Sans-serif | Minimalista zen |
| **French Bistro** | Bordeaux, Oro, Crema | Serif | Elegante francese |
| **Modern Green** | Verde moderno, Grigio | Sans-serif | Sostenibile contemporaneo |

### 3.2 Esempio Template - Italian Trattoria

```javascript
{
  name: 'Italian Trattoria',
  config: {
    primaryColor: '#c8102e',          // Rosso bandiera italiana
    secondaryColor: '#fff5f5',        // Bianco caldo
    accentColor: '#008c45',           // Verde bandiera italiana
    textPrimaryColor: '#ffffff',
    textSecondaryColor: '#1a1a1a',
    borderColor: '#fcd5d5',           // Rosso chiaro
    textTertiaryColor: '#e57373',
    errorColor: '#d32f2f',
    successColor: '#388e3c',
    warningColor: '#f57c00',
    backgroundTertiary: '#ffebee',
    favoriteActiveColor: '#d32f2f',
    deleteColor: '#c62828',
    fontFamily: 'serif',              // Font classico
    cardStyle: 'classic',
    borderRadius: '8',                // Angoli meno arrotondati
    layoutStyle: 'carousel'
  }
}
```

### 3.3 Esempio Template - Japanese Zen

```javascript
{
  name: 'Japanese Zen',
  config: {
    primaryColor: '#1a1a1a',          // Nero profondo
    secondaryColor: '#fafafa',        // Bianco quasi puro
    accentColor: '#d32f2f',           // Rosso giapponese
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
    fontFamily: 'sans-serif',         // Font minimalista
    cardStyle: 'minimal',
    borderRadius: '0',                // Nessun arrotondamento
    layoutStyle: 'list'
  }
}
```

---

## 4. INTERFACCIA UTENTE

### 4.1 Struttura Sezioni

Il ThemeCustomizer è organizzato in 5 sezioni Card principali:

#### 1. Colori Base (5 colori)
- Primary Color (Colore Principale)
- Secondary Color (Colore Secondario)
- Accent Color (Colore Accento)
- Text Primary Color (Testo Primario)
- Text Secondary Color (Testo Secondario)

#### 2. Colori Funzionali (8 colori)
- Border Color (Bordi)
- Text Tertiary Color (Testo Terziario)
- Error Color (Errore)
- Success Color (Successo)
- Warning Color (Avviso)
- Background Tertiary (Sfondo Terziario)
- Favorite Active Color (Preferito Attivo)
- Delete Color (Elimina)

#### 3. Tipografia e Layout
- Font Family (dropdown: System, Serif, Sans-serif, Cursive)
- Border Radius (slider: 0-40px)

#### 4. Template Veloci
- Grid di 8 template con preview colori
- Applicazione con un click
- Indicatore template attivo

#### 5. Anteprima Menu
- Card prodotto realistica
- Mostra tutti i colori applicati
- Product name, prezzo, descrizione
- Badge categoria
- Bottone "Aggiungi al Carrello"
- Icona preferiti

#### 6. Azioni
- Bottone "Salva Tema" (primary con icona SVG)
- Bottone "Visualizza Menu" (outline con icona SVG)
- Display URL menu pubblico

### 4.2 Design System Utilizzato

Il componente usa il design system dell'app con tokens standardizzati:

```javascript
import tokens from '../styles/tokens'

// SPACING
tokens.spacing.xs    // 4px
tokens.spacing.sm    // 8px
tokens.spacing.md    // 16px
tokens.spacing.lg    // 24px
tokens.spacing.xl    // 32px
tokens.spacing['2xl'] // 48px

// TYPOGRAPHY
tokens.typography.fontSize.xs   // 12px
tokens.typography.fontSize.sm   // 14px
tokens.typography.fontSize.md   // 16px
tokens.typography.fontSize.lg   // 18px
tokens.typography.fontSize.xl   // 20px

tokens.typography.fontWeight.normal    // 400
tokens.typography.fontWeight.medium    // 500
tokens.typography.fontWeight.semibold  // 600
tokens.typography.fontWeight.bold      // 700

// COLORS
tokens.colors.primary         // #4F46E5
tokens.colors.primaryDark     // Variante scura
tokens.colors.gray[50-900]    // Scala grigi
```

---

## 5. ANTEPRIMA MENU

### 5.1 Struttura Anteprima (Linee 762-943)

L'anteprima mostra una card prodotto realistica che applica tutti i colori del tema:

**Componenti visualizzati:**

1. **Header Restaurant Name**
   - Font: `fontFamily` dal theme
   - Color: `textSecondaryColor`

2. **Product Card Container**
   - Background: `secondaryColor`
   - Border: `borderColor`
   - Border Radius: `borderRadius`
   - Box Shadow: Fisso per profondità

3. **Image Placeholder**
   - Background: `backgroundTertiary`
   - SVG Icon: `textTertiaryColor`
   - Dimensioni: 100% × 180px

4. **Favorite Badge** (circular, top-right)
   - Background: `favoriteActiveColor`
   - Icon: Cuore bianco
   - Posizione: absolute top 8px, right 8px

5. **Product Details**
   - Name: `textSecondaryColor` con `fontFamily`
   - Prezzo: `accentColor` bold
   - Descrizione: `textTertiaryColor` con line-height 1.5

6. **Category Badge**
   - Background: `backgroundTertiary`
   - Text: `textTertiaryColor`
   - Border Radius: small (tokens.borderRadius.sm)

7. **Add to Cart Button**
   - Background: `accentColor`
   - Text: `textPrimaryColor`
   - Border Radius: `borderRadius / 2`
   - Hover effect: opacity + lift

8. **Info Footer**
   - Background: `backgroundTertiary`
   - Text: `textTertiaryColor`
   - Descrizione elementi visualizzati

### 5.2 Codice Anteprima Semplificato

```javascript
{/* Anteprima Menu */}
<Card>
  <h3>Anteprima Menu</h3>
  <p>Visualizza come apparirà il tuo menu con il tema corrente</p>

  <div style={{
    backgroundColor: theme.secondaryColor,
    padding: tokens.spacing.xl,
    borderRadius: tokens.borderRadius.lg
  }}>
    {/* Restaurant Header */}
    <h2 style={{
      fontFamily: getFontStyle(theme.fontFamily),
      color: theme.textSecondaryColor
    }}>
      {restaurant.name}
    </h2>

    {/* Product Card */}
    <div style={{
      backgroundColor: theme.secondaryColor,
      borderRadius: `${theme.borderRadius}px`,
      border: `1px solid ${theme.borderColor}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      {/* Image with favorite badge */}
      <div style={{
        backgroundColor: theme.backgroundTertiary,
        position: 'relative'
      }}>
        <svg>...</svg> {/* Image icon */}

        {/* Favorite Badge */}
        <div style={{
          position: 'absolute',
          backgroundColor: theme.favoriteActiveColor,
          borderRadius: '50%'
        }}>
          <svg>...</svg> {/* Heart icon */}
        </div>
      </div>

      {/* Details */}
      <div style={{ padding: tokens.spacing.lg }}>
        <div>
          <h4 style={{ color: theme.textSecondaryColor }}>
            Prodotto Esempio
          </h4>
          <span style={{ color: theme.accentColor }}>
            €12.50
          </span>
        </div>

        <p style={{ color: theme.textTertiaryColor }}>
          Una deliziosa descrizione del prodotto...
        </p>

        {/* Category Badge */}
        <div style={{
          backgroundColor: theme.backgroundTertiary,
          color: theme.textTertiaryColor
        }}>
          Categoria
        </div>

        {/* Add Button */}
        <button style={{
          backgroundColor: theme.accentColor,
          color: theme.textPrimaryColor,
          borderRadius: `${theme.borderRadius / 2}px`
        }}>
          Aggiungi al Carrello
        </button>
      </div>
    </div>

    {/* Info Footer */}
    <div style={{
      backgroundColor: theme.backgroundTertiary,
      color: theme.textTertiaryColor,
      padding: tokens.spacing.md
    }}>
      <p>Questa anteprima mostra come i colori del tema...</p>
    </div>
  </div>
</Card>
```

---

## 6. BOTTONI AZIONI

### 6.1 Design Ottimizzato (Linee 945-1079)

I bottoni azioni sono stati completamente ridisegnati il 2025-10-25 per allinearsi al design system:

**Modifiche applicate:**
- ❌ Rimossi emoji dai pulsanti
- ✅ Aggiunte icone SVG professionali
- ✅ Titolo sezione "Azioni"
- ✅ Layout grid responsive
- ✅ Stati hover interattivi (lift + shadow)
- ✅ Design tokens consistenti

### 6.2 Bottone "Salva Tema"

```javascript
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
    boxShadow: loading ? 'none' : '0 2px 4px rgba(0,0,0,0.1)'
  }}
  onMouseEnter={(e) => {
    if (!loading) {
      e.target.style.backgroundColor = tokens.colors.primaryDark
      e.target.style.transform = 'translateY(-1px)'
      e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
    }
  }}
  onMouseLeave={(e) => {
    if (!loading) {
      e.target.style.backgroundColor = tokens.colors.primary
      e.target.style.transform = 'translateY(0)'
      e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
    }
  }}
>
  <svg width="18" height="18" viewBox="0 0 24 24">
    {/* Save icon */}
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
  <span>{loading ? 'Salvando...' : 'Salva Tema'}</span>
</button>
```

**Stati:**
- **Normal:** Primary color, shadow sottile
- **Hover:** Primary dark, lift effect, shadow più pronunciata
- **Loading:** Grigio, disabled, testo "Salvando..."

### 6.3 Bottone "Visualizza Menu"

```javascript
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
    transition: 'all 0.2s ease'
  }}
  onMouseEnter={(e) => {
    if (restaurant?.subdomain) {
      e.target.style.borderColor = tokens.colors.primary
      e.target.style.color = tokens.colors.primary
      e.target.style.transform = 'translateY(-1px)'
      e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)'
    }
  }}
  onMouseLeave={(e) => {
    if (restaurant?.subdomain) {
      e.target.style.borderColor = tokens.colors.gray[300]
      e.target.style.color = tokens.colors.gray[700]
      e.target.style.transform = 'translateY(0)'
      e.target.style.boxShadow = 'none'
    }
  }}
>
  <svg width="18" height="18" viewBox="0 0 24 24">
    {/* Eye icon */}
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
  <span>Visualizza Menu</span>
</button>
```

**Stati:**
- **Normal:** Outline grigio, background bianco
- **Hover:** Border e testo primary color, lift effect
- **Disabled:** Grigio, cursor not-allowed (se non c'è subdomain)

### 6.4 Display URL Menu

```javascript
{restaurant?.subdomain && (
  <div style={{
    marginTop: tokens.spacing.lg,
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.gray[50],
    border: `1px solid ${tokens.colors.gray[200]}`,
    borderRadius: tokens.borderRadius.md
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: tokens.spacing.sm
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24">
        {/* Link icon */}
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
      <span style={{
        fontSize: tokens.typography.fontSize.sm,
        color: tokens.colors.gray[600],
        fontFamily: 'monospace'
      }}>
        {window.location.origin}/#/menu/{restaurant.subdomain}
      </span>
    </div>
  </div>
)}
```

---

## 7. LOGICA DI STATO

### 7.1 Hook React Utilizzati

```javascript
// Stati locali
const [theme, setTheme] = useState(defaultTheme)
const [loading, setLoading] = useState(false)

// Contesto
const { restaurant, user, setRestaurant } = useRestaurant()

// Navigazione
const navigate = useNavigate()
```

### 7.2 Flusso Caricamento Iniziale

```javascript
useEffect(() => {
  if (restaurant?.theme_config) {
    setTheme({
      ...defaultTheme,
      ...restaurant.theme_config
    })
  }
}, [restaurant])
```

1. Componente monta
2. Controlla se `restaurant.theme_config` esiste
3. Se esiste, mergia con `defaultTheme`
4. Se non esiste, usa solo `defaultTheme`

### 7.3 Flusso Salvataggio Tema

```javascript
const saveTheme = async () => {
  setLoading(true)

  try {
    // 1. Update Supabase
    const { data, error } = await supabase
      .from('restaurants')
      .update({ theme_config: theme })
      .eq('id', restaurant.id)
      .select()
      .single()

    if (error) throw error

    // 2. Update context locale
    setRestaurant(data)

    // 3. Show success message
    alert('Tema salvato con successo!')
  } catch (error) {
    console.error('Error saving theme:', error)
    alert('Errore durante il salvataggio del tema')
  } finally {
    setLoading(false)
  }
}
```

**Steps:**
1. Imposta `loading = true`
2. Esegue UPDATE su Supabase
3. Se successo: aggiorna context + mostra alert
4. Se errore: log console + mostra alert errore
5. Resetta `loading = false`

### 7.4 Flusso Applicazione Template

```javascript
const applyTemplate = (templateConfig) => {
  setTheme({
    ...defaultTheme,
    ...templateConfig
  })
}
```

**Steps:**
1. Click su template
2. Mergia config template con defaultTheme
3. Imposta nuovo state
4. UI si aggiorna automaticamente (re-render)
5. **NON salva automaticamente** - richiede click su "Salva Tema"

---

## 8. INTEGRAZIONE DATABASE

### 8.1 Schema Supabase

**Tabella:** `restaurants`

**Colonna rilevante:**
```sql
theme_config JSONB DEFAULT NULL
```

### 8.2 Query Update

```javascript
const { data, error } = await supabase
  .from('restaurants')
  .update({ theme_config: theme })
  .eq('id', restaurant.id)
  .select()
  .single()
```

### 8.3 Query Select (nel RestaurantContext)

```javascript
const { data, error } = await supabase
  .from('restaurants')
  .select('*')
  .eq('subdomain', subdomain)
  .single()

// data.theme_config contiene il JSON del tema
```

---

## 9. RESPONSIVE DESIGN

### 9.1 Breakpoints

Il componente usa un layout a colonna singola che si adatta automaticamente:

- **Mobile (< 768px):**
  - Stack verticale naturale
  - Color pickers ridimensionati
  - Template grid 2 colonne
  - Bottoni full-width

- **Tablet (768px - 1024px):**
  - Color pickers in griglia 2 colonne
  - Template grid 3-4 colonne
  - Anteprima più ampia

- **Desktop (> 1024px):**
  - Layout ottimale
  - Color pickers in griglia 3 colonne
  - Template grid 4 colonne
  - Anteprima full-width

### 9.2 Grid Responsive Template

```javascript
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
  gap: tokens.spacing.md
}}>
  {themeTemplates.map(template => ...)}
</div>
```

---

## 10. STORIA MODIFICHE

### 2025-10-25 - v3.0 (Ottimizzazione UI Azioni)

**Commit:** `4256be8`

**Modifiche:**
- ✅ Rimossi emoji dai bottoni (💾, 👁️)
- ✅ Aggiunte icone SVG professionali
- ✅ Aggiunto titolo sezione "Azioni"
- ✅ Layout grid responsive per bottoni
- ✅ Stati hover con lift + shadow
- ✅ Sezione URL migliorata con icona link
- ✅ Utilizzo consistente di design tokens

**File modificati:**
- `src/components/ThemeCustomizer.jsx` (linee 945-1079)

**Impatto:**
- Design più professionale e coerente
- Migliore UX con feedback visivi
- Allineamento completo al design system

### 2025-10-25 - v2.0 (Anteprima Menu Migliorata)

**Modifiche:**
- ✅ Anteprima trasformata da testo a card prodotto realistica
- ✅ Visualizzazione di tutti i 13 colori del tema
- ✅ Aggiunto header restaurant name
- ✅ Image placeholder con icona SVG
- ✅ Badge preferiti posizionato correttamente
- ✅ Product details con nome, prezzo, descrizione
- ✅ Badge categoria
- ✅ Bottone "Aggiungi al Carrello" interattivo
- ✅ Info footer esplicativo

**File modificati:**
- `src/components/ThemeCustomizer.jsx` (linee 762-943)

### 2025-10-25 - v1.1 (Nuovi Template)

**Modifiche:**
- ✅ Aggiunti 4 nuovi template:
  - Italian Trattoria (colori bandiera italiana)
  - Japanese Zen (minimalista black/white/red)
  - French Bistro (elegante bordeaux/oro)
  - Modern Green (sostenibile verde/grigio)

**File modificati:**
- `src/components/ThemeCustomizer.jsx` (linee 141-238)

### 2025-10-24 - v1.0 (Espansione Theme Config)

**Modifiche:**
- ✅ Espanso theme_config da 5 a 13 colori
- ✅ Aggiunti colori funzionali (border, error, success, warning, etc.)
- ✅ Tematizzazione completa PublicMenu.jsx (40% → 100%)
- ✅ Interfaccia ThemeCustomizer completata

---

## 11. COMPONENTI COLLEGATI

### 11.1 PublicMenu.jsx

**Usa theme_config per:**
- Background pagina (`secondaryColor`)
- Pulsanti primari (`primaryColor`, `textPrimaryColor`)
- Testo prodotti (`textSecondaryColor`, `textTertiaryColor`)
- Bordi card (`borderColor`)
- Badge categoria (`backgroundTertiary`)
- Preferiti badge (`favoriteActiveColor`)
- Footer (`primaryColor`, `textPrimaryColor`)

**Livello tematizzazione:** 100% ✅

### 11.2 Cart.jsx

**Status:** Parzialmente tematizzato

**Aree hardcoded:**
- Background bianco
- Pulsanti neri
- Bordi grigi
- Priority order giallo

**Prossimi step:** Refactoring per utilizzare theme_config

### 11.3 AddToCartModal.jsx

**Status:** ✅ Completamente tematizzato (fix 2025-10-25)

**Usa theme_config per:**
- Tutti i colori dinamici
- Border radius
- Font family

---

## 12. TESTING

### 12.1 Test Manuali Richiesti

Prima di deployare modifiche al ThemeCustomizer:

- [ ] Test salvataggio tema base
- [ ] Test applicazione di tutti gli 8 template
- [ ] Test color picker per ogni colore
- [ ] Test slider border radius (0-40px)
- [ ] Test cambio font family
- [ ] Verifica anteprima aggiornamento real-time
- [ ] Test bottone "Visualizza Menu" (link corretto)
- [ ] Test responsive mobile/tablet/desktop
- [ ] Test stati loading/disabled
- [ ] Verifica persistenza dopo refresh pagina

### 12.2 Checklist Integrazione PublicMenu

Dopo modifiche al theme_config schema:

- [ ] Aggiornare defaultTheme in ThemeCustomizer
- [ ] Aggiornare getStyles() in PublicMenu
- [ ] Aggiornare anteprima menu
- [ ] Testare applicazione nuovo colore su menu pubblico
- [ ] Verificare backward compatibility (temi esistenti)

---

## 13. TROUBLESHOOTING

### 13.1 Tema non si salva

**Sintomo:** Click su "Salva Tema" ma nessun aggiornamento

**Possibili cause:**
1. User non ha permessi su restaurant
2. Restaurant ID non valido
3. Errore Supabase (RLS policy)
4. Theme config malformato

**Debug:**
```javascript
console.log('Restaurant ID:', restaurant.id)
console.log('Theme to save:', theme)
console.log('Supabase error:', error)
```

### 13.2 Template non si applica

**Sintomo:** Click su template ma colori non cambiano

**Possibili cause:**
1. `applyTemplate()` non chiamata correttamente
2. State non si aggiorna
3. Merge con defaultTheme fallito

**Debug:**
```javascript
console.log('Template applied:', templateConfig)
console.log('New theme state:', theme)
```

### 13.3 Anteprima non mostra colori corretti

**Sintomo:** Anteprima menu non riflette i colori selezionati

**Possibili cause:**
1. Theme object non passato correttamente
2. Stili inline non applicati
3. Fallback a valori default

**Debug:**
```javascript
console.log('Theme in preview:', theme)
console.log('Primary color applied:', theme.primaryColor)
```

### 13.4 Menu pubblico non riflette il tema salvato

**Sintomo:** PublicMenu mostra tema diverso da quello salvato

**Possibili cause:**
1. Context non aggiornato dopo save
2. PublicMenu non riceve theme_config
3. Cache browser

**Fix:**
1. Verifica `setRestaurant(data)` dopo save
2. Hard refresh (Ctrl+Shift+R)
3. Controlla DB direttamente: `SELECT theme_config FROM restaurants WHERE id = ?`

---

## 14. BEST PRACTICES

### 14.1 Quando Aggiungere Nuovi Colori

**Prima di aggiungere un nuovo colore:**
1. Verifica che non sia già coperto da un colore esistente
2. Controlla se può essere una variante (es. hover state)
3. Valuta impatto su tutti i template esistenti
4. Aggiorna defaultTheme
5. Aggiorna tutti i template (8 configurazioni)
6. Aggiorna anteprima menu
7. Testa su PublicMenu reale

### 14.2 Quando Creare un Nuovo Template

**Criteri per template valido:**
- Palette coerente e armoniosa
- Contrasto sufficiente per accessibilità
- Tema identificabile (es. "cucina giapponese", "rustico")
- Funziona su mobile e desktop
- Tutti i 13 colori specificati

**Naming convention:**
- Nome descrittivo in italiano
- Riferimento culturale/stilistico chiaro
- Esempio: "Italian Trattoria", "Ocean Blue"

### 14.3 Gestione Backward Compatibility

Quando modifichi theme_config schema:

```javascript
// Sempre fare merge con defaultTheme
const theme = {
  ...defaultTheme,
  ...(restaurant?.theme_config || {})
}

// Così i vecchi temi ricevono automaticamente i nuovi colori con valori default
```

---

## 15. ROADMAP FUTURA

### 15.1 Features Pianificate

- [ ] **Typography Scale:** Sistema completo font sizes configurabile
- [ ] **Spacing System:** Base spacing unit + scala
- [ ] **Card Styles:** Implementare cardStyle (modern/classic/minimal)
- [ ] **Layout Styles:** Implementare layoutStyle (carousel/grid/list)
- [ ] **Export/Import:** Esporta tema come JSON, importa da file
- [ ] **Theme Marketplace:** Gallery temi community
- [ ] **Dark Mode:** Toggle automatic dark mode variant
- [ ] **Live Preview:** Preview in iframe del menu reale

### 15.2 Ottimizzazioni Tecniche

- [ ] **Debounce:** Debounce auto-save mentre si modificano colori
- [ ] **Undo/Redo:** Stack history modifiche tema
- [ ] **Comparison View:** Compare tema corrente vs template
- [ ] **Accessibility Checker:** Controlla contrasto colori WCAG AA
- [ ] **Mobile First Preview:** Preview device-specific

---

## 16. RIFERIMENTI

### 16.1 File Collegati

- `src/components/ThemeCustomizer.jsx` - Componente principale
- `src/pages/PublicMenu.jsx` - Applica tema al menu pubblico
- `src/components/Cart.jsx` - Usa tema nel carrello
- `src/components/AddToCartModal.jsx` - Usa tema nella modale
- `src/styles/tokens.js` - Design tokens sistema
- `src/contexts/RestaurantContext.jsx` - Context provider restaurant data

### 16.2 Documentazione Collegata

- `PUBLIC_MENU_STYLES_REFERENCE.md` - Riferimento completo stili PublicMenu
- `SETUP_ORDINI_ISTRUZIONI.md` - Setup sistema ordini
- Schema database Supabase

### 16.3 Risorse Esterne

- [Design Tokens Specification](https://design-tokens.github.io/community-group/format/)
- [WCAG Color Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [Supabase JSONB Guide](https://supabase.com/docs/guides/database/json)

---

## 17. NOTE FINALI

**Stato Attuale:** ✅ Produzione-ready
**Ultima Modifica:** 2025-10-25
**Prossimo Review:** Dopo implementazione Cart.jsx theming

**Contatto:** Aggiornare questo documento ogni volta che si modificano:
- Schema theme_config
- Template presets
- UI ThemeCustomizer
- Integrazione componenti esterni

**Ownership:** Team Design + Team Development
