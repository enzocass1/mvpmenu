# Riferimento Completo degli Stili del Menu Pubblico

**Data creazione:** 2025-10-25
**Scopo:** Questo documento cataloga tutti gli elementi di stile utilizzati nel sistema del menu pubblico (PublicMenu, Cart, AddToCartModal) per guidare l'espansione del sistema di personalizzazione temi.

---

## 1. PANORAMICA SISTEMA DI THEMING ATTUALE

### 1.1 Cosa è già personalizzabile (theme_config)

Nel database, la colonna `theme_config` nella tabella `restaurants` memorizza:

```javascript
{
  primaryColor: '#000000',      // Colore principale (sfondi, pulsanti)
  secondaryColor: '#ffffff',    // Colore secondario (background pagina)
  accentColor: '#4CAF50',       // Colore accento (attualmente poco usato)
  textPrimaryColor: '#ffffff',  // Testo su sfondi scuri
  textSecondaryColor: '#111827', // Testo su sfondi chiari
  fontFamily: 'system',          // Tipo font (system/serif/sans-serif/cursive)
  cardStyle: 'modern',           // Stile card (non implementato)
  borderRadius: '16',            // Arrotondamento angoli (px)
  layoutStyle: 'carousel'        // Stile layout (non implementato)
}
```

### 1.2 Componenti analizzati

1. **PublicMenu.jsx** (1720 righe) - Menu principale con categorie, prodotti, preferiti
2. **Cart.jsx** (980 righe) - Carrello con checkout a 2 step
3. **AddToCartModal.jsx** (673 righe) - Modale aggiunta prodotto con varianti

---

## 2. ANALISI COLORI COMPLETA

### 2.1 Colori Primari (Attualmente Themabili)

| Colore | Valore Default | Dove Usato | Themabile |
|--------|---------------|-----------|----------|
| Primary | `#000000` (nero) | Pulsanti, footer, overlay categorie, badges | ✅ Sì |
| Secondary | `#ffffff` (bianco) | Background pagina, card | ✅ Sì |
| Text Primary | `#ffffff` | Testo su sfondi scuri | ✅ Sì |
| Text Secondary | `#111827` | Testo su sfondi chiari | ✅ Sì |

### 2.2 Grigi (Hardcoded - NON Themabili)

| Valore | Uso Principale | Occorrenze |
|--------|---------------|-----------|
| `#000000` | Testo principale, pulsanti primari | 50+ |
| `#666666` | Testo secondario, subtitles | 30+ |
| `#999999` | Testo disabilitato, placeholder | 20+ |
| `#e0e0e0` | Bordi card, separatori | 40+ |
| `#ddd` | Bordi input, separatori leggeri | 15+ |
| `#f9f9f9` | Background sezioni espanse | 10+ |
| `#f5f5f5` | Background placeholder categorie | 5+ |
| `#ccc` | Indicatori inattivi carousel | 5+ |

### 2.3 Colori Funzionali (Hardcoded)

| Colore | Valore | Uso | Themabile? |
|--------|--------|-----|-----------|
| Preferiti (attivo) | `#e74c3c` (rosso) | Cuore preferiti pieno | ❌ No |
| Preferiti (badge) | `#e74c3c` | Badge contatore preferiti | ❌ No |
| Eliminazione | `#f44336` (rosso) | Pulsanti elimina | ❌ No |
| Errore | `#ffebee` (bg), `#c62828` (text) | Messaggi errore | ❌ No |
| Priority Order | `#fff9e6` (bg), `#ffcc00` (border), `#ff9800` (text) | Ordine prioritario | ❌ No |
| Verde accento | `#4CAF50` | Poco usato (solo in theme_config) | ✅ Sì (ma inutilizzato) |

### 2.4 Overlay e Trasparenze

| Elemento | Valore | Dove |
|----------|--------|------|
| Cart overlay | `rgba(0,0,0,0.5)` | Sfondo blur carrello |
| Modal overlay | `rgba(0,0,0,0.75)` | Sfondo modale aggiungi |
| Category gradient (themabile) | `linear-gradient(to top, ${primaryColor}dd, ${primaryColor}66 60%, transparent)` | Overlay categorie carousel |
| Category gradient (default) | `linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.4) 60%, transparent)` | Se theme non presente |

---

## 3. TIPOGRAFIA

### 3.1 Font Families (Themabili)

```javascript
const fontMap = {
  'system': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  'serif': 'Georgia, "Times New Roman", serif',
  'sans-serif': '"Helvetica Neue", Arial, sans-serif',
  'cursive': '"Comic Sans MS", cursive'
}
```

### 3.2 Font Sizes (Hardcoded)

| Elemento | Size | Responsive | Componente |
|----------|------|-----------|-----------|
| Restaurant Name | `clamp(28px, 8vw, 48px)` | Sì | PublicMenu header |
| Category Name | `clamp(22px, 6vw, 28px)` | Sì | Carousel overlay |
| Category Title (lista) | `clamp(24px, 7vw, 32px)` | Sì | Products view header |
| Product Name | `clamp(15px, 4vw, 17px)` | Sì | Product card |
| Product Description | `clamp(14px, 4vw, 16px)` | Sì | Product details |
| Variant Name | `clamp(13px, 3.5vw, 14px)` | Sì | Variant list |
| Subtitle | `clamp(13px, 4vw, 16px)` | Sì | Header subtitle |
| Modal Title | `18px` | No | AddToCartModal |
| Cart Title | `16px` | No | Cart header |
| Cart Item Name | `13px` | No | Cart item |
| Footer Text | `13px` | No | Footer |

### 3.3 Font Weights

| Weight | Uso |
|--------|-----|
| `400` | Testo normale |
| `500` | Testo enfatizzato, labels |
| `600` | Titoli, product names |
| `700` (bold) | Prezzi, totali |

### 3.4 Altre Proprietà Tipografiche

- **Letter Spacing:** `0.5px` (labels uppercase), `1px` (restaurant name)
- **Line Height:** `1.3` - `1.6` (descrizioni)
- **Text Transform:** `uppercase` (labels, badges)

---

## 4. SPACING & LAYOUT

### 4.1 Padding Values (Ricorrenti)

| Valore | Uso Frequente |
|--------|--------------|
| `4px` - `6px` | Badge, small buttons, internal spacing |
| `8px` - `12px` | Card internal padding, form elements |
| `16px` - `20px` | Container padding, section spacing |
| `30px` - `60px` | Large sections, empty states |

### 4.2 Gap Values (Flex/Grid)

| Valore | Contesto |
|--------|----------|
| `4px` - `8px` | Tight spacing (controls, badges) |
| `10px` - `12px` | Default spacing (buttons, form groups) |
| `16px` - `20px` | Section spacing |

### 4.3 Container Widths

| Elemento | Width | Context |
|----------|-------|---------|
| Viewport | `100vw` | Full width |
| Products List | `max-width: 800px` | Centered content |
| Category Card | `320px` | Carousel item |
| Cart Slidecart | `100%` max `480px` | Right sidebar |
| Modal | `100%` max `480px` | Centered popup |
| Sidebar Preferiti | `90%` max `400px` | Right sidebar |

### 4.4 Heights

| Elemento | Height |
|----------|--------|
| Category Card | `420px` |
| Carousel Container | `500px` |
| Product Image (expanded) | `max-height: 250px` |
| Modal | `max-height: 90vh` |
| Cart | `100%` (full height) |

---

## 5. BORDERS & RADIUS

### 5.1 Border Radius (Mix Themabile/Hardcoded)

| Elemento | Valore | Themabile? |
|----------|--------|-----------|
| Category Card | `theme.borderRadius \|\| '20px'` | ✅ Sì |
| Product Card | `theme.borderRadius \|\| '12px'` | ✅ Sì |
| Pulsanti primari | `theme.borderRadius \|\| '12px'` | ✅ Sì |
| Modal container | `20px` | ❌ No |
| Cart items | `6px` | ❌ No |
| Input/textarea | `5px` - `8px` | ❌ No |
| Badges | `4px` - `6px` | ❌ No |
| Circular badges | `50%` | ❌ No |

### 5.2 Border Widths

| Width | Uso |
|-------|-----|
| `1px` | Default borders (card, separatori) |
| `2px` | Emphasized borders (buttons, variant selection) |

### 5.3 Border Colors

| Color | Uso |
|-------|-----|
| `#e0e0e0` | Default card borders |
| `#ddd` | Input borders |
| `#000` | Button borders (primary actions) |

---

## 6. INTERACTIVE ELEMENTS

### 6.1 Buttons - Primary (Themabili)

```javascript
{
  backgroundColor: theme.primaryColor || '#000',
  color: theme.textPrimaryColor || '#fff',
  borderRadius: theme.borderRadius || '12px',
  padding: '16px',
  fontWeight: '600',
  fontSize: '14px' - '15px',
  transition: 'all 0.2s ease'
}
```

**Dove:** Pulsanti "Procedi all'Ordine", "Conferma Ordine", "ORDINA", sticky buttons

### 6.2 Buttons - Secondary (Hardcoded)

```javascript
{
  backgroundColor: 'transparent',
  color: '#666',
  border: '1px solid #ddd',
  borderRadius: '6px',
  padding: '10px' - '12px',
  fontWeight: '500',
  fontSize: '13px' - '14px'
}
```

**Dove:** "Annulla", "Torna al Carrello", "Svuota Carrello"

### 6.3 Buttons - Delete/Danger (Hardcoded)

```javascript
{
  backgroundColor: '#f44336',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  width: '24px',
  height: '24px'
}
```

### 6.4 Control Buttons (+/- Quantity)

```javascript
{
  width: '24px' - '40px',
  height: '24px' - '40px',
  border: '1px solid #000' (Cart) o '2px solid #000' (Modal),
  borderRadius: '4px' - '10px',
  backgroundColor: '#fff',
  fontSize: '14px' - '20px',
  fontWeight: '600'
}
```

### 6.5 Input & Textarea

```javascript
{
  width: '100%',
  padding: '8px' - '10px',
  fontSize: '13px',
  border: '1px solid #ddd',
  borderRadius: '5px' - '8px',
  backgroundColor: '#fff',
  color: '#000'
}
```

### 6.6 Badges & Counters

**Favoriti Badge:**
```javascript
{
  position: 'absolute',
  top: '2px', right: '2px',
  backgroundColor: '#e74c3c',
  color: '#fff',
  borderRadius: '50%',
  width: '18px', height: '18px',
  fontSize: '11px',
  fontWeight: 'bold'
}
```

**Cart Badge:**
```javascript
{
  backgroundColor: '#000',
  color: '#fff',
  borderRadius: '50%',
  width: '18px', height: '18px',
  fontSize: '11px',
  fontWeight: '600'
}
```

**Hidden Product Badge:**
```javascript
{
  position: 'absolute',
  top: '12px', right: '12px',
  padding: '6px 12px',
  fontSize: '11px',
  fontWeight: '600',
  color: '#fff',
  background: '#FF9800',
  borderRadius: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
}
```

---

## 7. ANIMATIONS

### 7.1 Keyframe Animations

```css
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

### 7.2 Transition Timings

| Elemento | Duration | Easing |
|----------|----------|--------|
| Buttons hover | `0.2s` | `ease` |
| Category cards | `0.5s` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Modal appear | `0.3s` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| Cart appear | `0.3s` | `ease-out` |
| Overlay | `0.3s` | `ease` |

### 7.3 Transform Effects

**Category Carousel:**
```javascript
transform: `
  translateX(calc(${position * 100}% + ${currentTranslate}px))
  scale(${isCenter ? 1 : 0.85})
  rotateY(${position * 15}deg)
`
```

**Card Hover (Dashboard):**
```javascript
onMouseEnter: transform: 'translateY(-4px)', boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
```

---

## 8. COMPONENT-BY-COMPONENT BREAKDOWN

### 8.1 PublicMenu.jsx

**Elementi Themabili:**
- ✅ Background pagina (`secondaryColor`)
- ✅ Font family
- ✅ Category overlay gradient (`primaryColor`)
- ✅ Category overlay text (`textPrimaryColor`)
- ✅ Product card background (`secondaryColor`)
- ✅ Product card border radius
- ✅ Pulsante "ORDINA" (background: `primaryColor`, text: `textPrimaryColor`)
- ✅ Footer background (`primaryColor`)
- ✅ Footer text (`textPrimaryColor`)
- ✅ Sticky buttons (background: `primaryColor`, text: `textPrimaryColor`)
- ✅ Indicatori carousel attivi (`primaryColor`)
- ✅ Spinner loading border (`primaryColor`)

**Elementi NON Themabili (Hardcoded):**
- ❌ Product name, description colors (`#000`, `#666`, `#444`)
- ❌ Variant list styling
- ❌ Favorites button colors (`#e74c3c` when active)
- ❌ Favorites sidebar styling
- ❌ Cart badge colors
- ❌ Empty states colors
- ❌ Info card text colors
- ❌ Phone link style
- ❌ Back button style

### 8.2 Cart.jsx (Slidecart)

**Totalmente NON Themabile:**
- ❌ Tutti i colori sono hardcoded
- ❌ Background bianco (`#fff`)
- ❌ Testo nero (`#000`, `#666`, `#999`)
- ❌ Bordi grigi (`#e0e0e0`, `#ddd`)
- ❌ Pulsanti neri (`#000`)
- ❌ Pulsante elimina rosso (`#f44336`)
- ❌ Priority order yellow (`#fff9e6`, `#ffcc00`, `#ff9800`)
- ❌ Progress bar circles (`#000` active, `#e0e0e0` inactive)
- ❌ Errori rossi (`#ffebee`, `#c62828`)

**Osservazione Critica:** Il carrello è completamente isolato dal sistema di theming!

### 8.3 AddToCartModal.jsx

**Totalmente NON Themabile:**
- ❌ Tutti i colori sono hardcoded
- ❌ Background bianco (`#fff`)
- ❌ Overlay scuro (`rgba(0,0,0,0.75)`)
- ❌ Pulsanti neri (`#000`)
- ❌ Bordi grigi (`#e0e0e0`, `#ddd`)
- ❌ Variant selection backgrounds
- ❌ Button selected state (`#000` background)

**Osservazione Critica:** Anche la modale è completamente isolata dal theming!

---

## 9. ANALISI GAP: COSA MANCA

### 9.1 Colori Mancanti da Theme Config

| Color | Dove Serve | Priorità |
|-------|-----------|----------|
| Error Color | Messaggi errore, validazione | 🔴 Alta |
| Success Color | Conferme, stati positivi | 🔴 Alta |
| Warning Color | Priority order, alert | 🟡 Media |
| Border Color | Bordi card, input, separatori | 🔴 Alta |
| Text Tertiary Color | Placeholder, disabled text | 🟡 Media |
| Background Tertiary | Empty states, sezioni espanse | 🟡 Media |
| Favorite Active Color | Cuore preferiti | 🟢 Bassa |
| Delete Color | Pulsanti elimina | 🟢 Bassa |

### 9.2 Typography Mancante

| Property | Implementazione Attuale | Dovrebbe Essere |
|----------|------------------------|-----------------|
| Base Font Size | Hardcoded (px fissi) | Scalabile da theme |
| Heading Scales | Hardcoded clamp() | Configurabile |
| Line Heights | Sparsi 1.3-1.6 | Standardizzati in theme |
| Letter Spacing | Sporadico | Configurato per categories |

### 9.3 Spacing Mancante

| Property | Status |
|----------|--------|
| Base spacing unit | ❌ Non esiste (valori sparsi) |
| Spacing scale | ❌ Non standardizzato |
| Container padding | ❌ Hardcoded |

### 9.4 Border Radius Gaps

| Elemento | Attuale | Problema |
|----------|---------|----------|
| Modal | `20px` hardcoded | Non segue theme.borderRadius |
| Cart | `6px` hardcoded | Non segue theme |
| Input/Textarea | `5px-8px` hardcoded | Non segue theme |
| Badges | `4px-6px` hardcoded | Non segue theme |

---

## 10. RACCOMANDAZIONI PRIORITARIE

### 10.1 Fase 1: Estensione Theme Config (Immediata)

Aggiungere al `theme_config`:

```javascript
{
  // ESISTENTI
  primaryColor: '#000000',
  secondaryColor: '#ffffff',
  accentColor: '#4CAF50',
  textPrimaryColor: '#ffffff',
  textSecondaryColor: '#111827',
  fontFamily: 'system',
  borderRadius: '16',

  // NUOVI - PRIORITÀ ALTA
  borderColor: '#e0e0e0',          // Bordi generali
  textTertiaryColor: '#999999',    // Testo disabilitato/placeholder
  errorColor: '#f44336',           // Errori
  successColor: '#4CAF50',         // Successo
  warningColor: '#ff9800',         // Warning/priority

  // NUOVI - PRIORITÀ MEDIA
  backgroundTertiary: '#f9f9f9',   // Background sezioni espanse
  favoriteActiveColor: '#e74c3c',  // Cuore preferiti attivo
  deleteColor: '#f44336',          // Pulsanti elimina

  // SPACING (da considerare)
  spacingUnit: '8',                // Base spacing in px
  containerPadding: '20',          // Padding container default
}
```

### 10.2 Fase 2: Tematizzazione Cart.jsx (Alta Priorità)

**Problema:** Cart è completamente hardcoded!

**Soluzione:**
1. Passare `restaurant.theme_config` come prop a Cart
2. Creare funzione `getCartStyles(theme)` simile a PublicMenu
3. Applicare theme a:
   - Background slidecart (secondaryColor)
   - Pulsanti primari (primaryColor)
   - Testo (textPrimaryColor, textSecondaryColor)
   - Bordi (borderColor)
   - Border radius

### 10.3 Fase 3: Tematizzazione AddToCartModal.jsx (Alta Priorità)

**Problema:** Modal completamente hardcoded!

**Soluzione:**
1. Passare `theme_config` come prop
2. Applicare theme a pulsanti, backgrounds, bordi

### 10.4 Fase 4: Standardizzazione Border Radius (Media Priorità)

Creare scala unificata:
```javascript
{
  borderRadiusSmall: '6px',    // Badges, small elements
  borderRadiusMedium: '12px',  // Cards, buttons
  borderRadiusLarge: '20px',   // Modals, large containers
  borderRadiusFull: '50%'      // Circular badges
}
```

### 10.5 Fase 5: Typography Scale (Bassa Priorità)

Sistema scalabile completo:
```javascript
{
  fontSizeBase: '16',
  fontSizeScale: {
    xs: '11',
    sm: '13',
    base: '16',
    lg: '18',
    xl: '20',
    '2xl': '24',
    '3xl': '32',
    '4xl': '48'
  }
}
```

---

## 11. PIANO DI IMPLEMENTAZIONE SUGGERITO

### Sprint 1 (1-2 giorni)
- [ ] Espandere `theme_config` con colori mancanti (borderColor, textTertiaryColor, errorColor, etc.)
- [ ] Aggiornare `ThemeCustomizer.jsx` con nuovi campi
- [ ] Testare salvataggio/caricamento

### Sprint 2 (2-3 giorni)
- [ ] Refactoring Cart.jsx per supportare theming
- [ ] Passare theme_config come prop
- [ ] Applicare stili dinamici
- [ ] Testing completo cart con temi diversi

### Sprint 3 (1-2 giorni)
- [ ] Refactoring AddToCartModal.jsx per supportare theming
- [ ] Applicare stili dinamici
- [ ] Testing modale con temi diversi

### Sprint 4 (1 giorno)
- [ ] Standardizzazione border radius in tutti i componenti
- [ ] Creare utility functions per border radius scale

### Sprint 5 (2-3 giorni)
- [ ] Sistema typography scalabile (se richiesto)
- [ ] Spacing system standardizzato (se richiesto)

---

## 12. FILE DI RIFERIMENTO

1. **src/pages/PublicMenu.jsx** - 1720 linee
   - Menu principale con carousel categorie
   - Lista prodotti con varianti
   - Sistema preferiti
   - Integrazione cart e modale

2. **src/components/Cart.jsx** - 980 linee
   - Slidecart con 2-step checkout
   - Gestione quantità e note
   - Priority order
   - Form tavolo e dati cliente

3. **src/components/AddToCartModal.jsx** - 673 linee
   - Modale selezione varianti
   - Quantità e note prodotto
   - Calcolo subtotale

4. **src/components/ThemeCustomizer.jsx**
   - Interfaccia personalizzazione tema
   - Salvataggio theme_config su Supabase

---

## 13. NOTE FINALI

**Data ultimo aggiornamento:** 2025-10-25

**Stato Theming:**
- ✅ PublicMenu: ~40% themabile
- ❌ Cart: 0% themabile
- ❌ AddToCartModal: 0% themabile

**Next Steps:** Priorità assoluta su tematizzazione Cart e Modal per coerenza visiva completa del menu pubblico.

**Contatto:** Questo documento va aggiornato ogni volta che si aggiungono nuove funzionalità al menu pubblico o si espande il sistema di theming.
