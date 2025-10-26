# Analisi Completa Elementi UI - Menu Pubblico MVPMenu

**Data creazione:** 2025-10-26
**Scopo:** Documentare TUTTI gli elementi stilistici del menu pubblico per implementazione completa nel ThemeCustomizer

---

## 📋 INDICE

1. [Home Page (PublicMenu.jsx)](#1-home-page)
2. [Pagina Categoria/Prodotti](#2-pagina-categoria-prodotti)
3. [Slidecart (Cart.jsx)](#3-slidecart-carrello)
4. [Modal Aggiungi al Carrello](#4-modal-aggiungi-al-carrello)
5. [Pagina Conferma Ordine](#5-pagina-conferma-ordine-thankyou)
6. [Sidebar Preferiti](#6-sidebar-preferiti)
7. [Elementi Globali](#7-elementi-globali)

---

## 1. HOME PAGE

### 1.1 Container Principale
**Elemento:** `pageContainer`
- **Colore attuale:** `theme.primaryColor` ✓ TEMATIZZATO
- **Proprietà:** background, minHeight: 100vh
- **Posizione:** Sfondo intera pagina
- **Note:** È lo sfondo principale del menu

### 1.2 Header
**Elemento:** `header`
- **Background:** `transparent` (eredita primaryColor)
- **Padding:** 30px 5% 20px 5%
- **Contenuto:**
  - **Logo:** `logo` - maxHeight 80px, maxWidth 200px
  - **Nome Ristorante:** `restaurantName`
    - Colore: `theme.textSecondaryColor` ✓ TEMATIZZATO
    - Font: clamp(28px, 8vw, 48px)
    - Font weight: 600
  - **Subtitle:** `subtitle`
    - Testo: "Scorri per esplorare le categorie"
    - Colore: `theme.textTertiaryColor` ✓ TEMATIZZATO
    - Font: clamp(13px, 4vw, 16px)

### 1.3 Carousel Categorie
**Sezione:** `carouselSection`
- **Background:** `transparent`
- **Padding:** 0px 0 60px 0

**Card Categoria:** `categoryCard`
- **Background:** Gradient overlay su immagine
- **Border Radius:** `theme.borderRadius` ✓ TEMATIZZATO
- **Shadow:** 0 8px 24px rgba(0,0,0,0.15)
- **Immagine:** `categoryImage` - 100% width/height
- **Overlay:** `categoryOverlay`
  - Background: `linear-gradient(to top, primaryColor 85%, transparent)`
  - **Nome Categoria:** `categoryName`
    - Colore: `theme.textPrimaryColor` ✓ TEMATIZZATO
    - Font: clamp(20px, 5vw, 28px)
    - Font weight: bold
  - **Conteggio Prodotti:** `categoryCount`
    - Colore: `theme.textPrimaryColor` ✓ TEMATIZZATO
    - Font: clamp(11px, 3vw, 13px)

**Indicatori:** `indicators`
- **Background:** transparent
- **Indicator:** `indicator`
  - Background: `theme.borderColor` ✓
  - Width: 8px, Height: 8px, border-radius: 50%
- **Indicator Active:** `indicatorActive`
  - Background: `theme.primaryColor` ✓ TEMATIZZATO
  - Width: 28px, border-radius: 5px

### 1.4 Info Card (Orari, Indirizzo, Telefono)
**Elemento:** `infoCard`
- **Background:** ❌ NON TEMATIZZATO - Hardcoded `#ffffff`
- **Border:** 1px solid #e0e0e0 ❌ NON TEMATIZZATO
- **Border Radius:** 16px ❌ NON TEMATIZZATO (dovrebbe usare theme.borderRadius)
- **Padding:** 24px
- **Margin:** 40px 5% 0

**Info Item:** `infoItem`
- **Border Bottom:** 1px solid #e0e0e0 ❌ NON TEMATIZZATO
- **Padding:** 20px 0

**Info Label:** `infoLabel`
- **Colore:** #666 ❌ NON TEMATIZZATO (dovrebbe usare textTertiaryColor)
- **Font:** 13px, font-weight: 500
- **Text Transform:** uppercase

**Info Text:** `infoText`
- **Colore:** #000 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor)
- **Font:** 15px

**Phone Link:** `phoneLink`
- **Colore:** #000 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor o accentColor)
- **Hover:** underline

**Orari Apertura (giorni settimana):**
- **Giorno:** `fontWeight: 600, color: theme.textSecondaryColor` ✓ TEMATIZZATO
- **Orario:** `color: theme.textSecondaryColor` ✓ TEMATIZZATO

---

## 2. PAGINA CATEGORIA / PRODOTTI

### 2.1 Header Prodotti
**Elemento:** `productsHeader`
- **Background:** ❌ NON TEMATIZZATO - Hardcoded `#ffffff`
- **Padding:** 20px 5%
- **Position:** sticky top 0
- **Border Bottom:** 1px solid #e0e0e0 ❌ NON TEMATIZZATO

**Pulsante Indietro:** `backButton`
- **Colore:** `theme.textSecondaryColor` ✓ TEMATIZZATO
- **Background:** none, border: none
- **Font:** 16px, font-weight: 500
- **Icona:** Freccia ← in SVG con stroke textSecondaryColor

**Icone Header (Cuore e Carrello):**
- **Favoriti Button:** `favoritesHeaderButton`
  - Background: none, border: none, padding: 8px
  - **SVG:** stroke `themeStyles.textSecondaryColor` ✓ TEMATIZZATO
  - **Badge:** `favoritesBadge`
    - Background: `theme.favoriteActiveColor` ✓ TEMATIZZATO
    - Colore testo: #fff
    - Border-radius: 50%
    - Font: 10px, font-weight: bold
    - Size: 16px x 16px

- **Cart Button:** `cartHeaderButton`
  - Stesso stile favoritesBadge
  - **Cart Badge:** `cartBadge`
    - Background: #000 ❌ NON TEMATIZZATO (dovrebbe usare primaryColor o accentColor)
    - Colore: #fff

### 2.2 Titoli Categoria
**Titolo Categoria:** `categoryTitle`
- **Colore:** `theme.textSecondaryColor` ✓ TEMATIZZATO
- **Font:** clamp(24px, 7vw, 32px)
- **Font Weight:** bold

**Descrizione Categoria:** `categoryDescription`
- **Colore:** `theme.textTertiaryColor` ✓ TEMATIZZATO
- **Font:** clamp(14px, 4vw, 16px)

**Conteggio Prodotti:** `productCount`
- **Colore:** #666 ❌ NON TEMATIZZATO (dovrebbe usare textTertiaryColor)
- **Font:** 13px

### 2.3 Lista Prodotti
**Container:** `productsList`
- **Display:** flex, flex-direction: column
- **Gap:** 20px
- **Padding:** 20px 5%

**Card Prodotto:** `productCard`
- **Background:** `theme.secondaryColor` ✓ TEMATIZZATO
- **Border:** 1px solid `theme.borderColor` ✓ TEMATIZZATO
- **Border Radius:** `theme.borderRadius` ✓ TEMATIZZATO
- **Padding:** 0
- **Box Shadow:** none

### 2.4 Header Prodotto (Cuore - ORDINA - Nome - Prezzo - Toggle)
**Header:** `productHeader`
- **Display:** flex, align-items: center
- **Padding:** 16px
- **Gap:** 12px

**Pulsante Preferiti:** `favoriteButton`
- **SVG Vuoto:** stroke `theme.textSecondaryColor` ✓ TEMATIZZATO
- **SVG Pieno:** fill e stroke `theme.favoriteActiveColor` ✓ TEMATIZZATO
- **Size:** 20x20

**Pulsante ORDINA Compatto:** `addToCartButtonCompact`
- **Background:** `theme.primaryColor` ✓ TEMATIZZATO
- **Colore:** `theme.textPrimaryColor` ✓ TEMATIZZATO
- **Border:** none
- **Border Radius:** 6px
- **Padding:** 6px 12px
- **Font:** 11px, font-weight: 600, letter-spacing: 0.5px

**Nome Prodotto:** `productName`
- **Colore:** #000 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor)
- **Font:** clamp(14px, 4vw, 16px)
- **Font Weight:** 600

**Prezzo Singolo:** `singleProductPrice`
- **Colore:** `theme.textSecondaryColor` ✓ TEMATIZZATO
- **Font:** clamp(15px, 4vw, 17px)
- **Font Weight:** bold

**Icona Espandi:** `expandIcon`
- **Colore:** #999 ❌ NON TEMATIZZATO (dovrebbe usare textTertiaryColor)
- **Font:** 12px
- **Cursor:** pointer

### 2.5 Lista Varianti
**Container:** `variantsListContainer`
- **Background:** #f9f9f9 ❌ NON TEMATIZZATO (dovrebbe usare backgroundTertiary)
- **Border Top:** 1px solid #e0e0e0 ❌ NON TEMATIZZATO (dovrebbe usare borderColor)
- **Padding:** 12px 16px
- **Gap:** 8px

**Variante Item:** `variantItem`
- **Display:** flex, justify-content: space-between
- **Padding:** 4px 0

**Nome Variante:** `variantName`
- **Colore:** #666 ❌ NON TEMATIZZATO (dovrebbe usare textTertiaryColor)
- **Font:** clamp(12px, 3.5vw, 14px)

**Prezzo Variante:** `variantPrice`
- **Colore:** `theme.textSecondaryColor` ✓ TEMATIZZATO
- **Font:** clamp(14px, 4vw, 16px)
- **Font Weight:** 600

### 2.6 Dettagli Espandibili Prodotto
**Container:** `productDetails`
- **Background:** `theme.backgroundTertiary` ✓ TEMATIZZATO
- **Padding:** 0 16px 16px

**Immagine Prodotto:** `productImage`
- **Width:** 100%
- **Max Height:** 300px
- **Object Fit:** cover
- **Border Radius:** 8px ❌ NON TEMATIZZATO (dovrebbe usare theme.borderRadius)

**Descrizione Prodotto:** `productDescription`
- **Colore:** `theme.textTertiaryColor` ✓ TEMATIZZATO
- **Font:** clamp(13px, 3.5vw, 15px)
- **Line Height:** 1.6
- **Margin:** 12px 0 0

---

## 3. SLIDECART (CARRELLO)

### 3.1 Overlay e Container
**Overlay:** `overlay`
- **Background:** rgba(0,0,0,0.5) ❌ NON TEMATIZZATO (potrebbe usare primaryColor con opacity)
- **Z-Index:** 999
- **Position:** fixed, full screen

**Cart Container:** `cart`
- **Background:** #ffffff ❌ NON TEMATIZZATO (dovrebbe usare secondaryColor)
- **Width:** 90vw, max-width: 400px
- **Height:** 100vh
- **Position:** fixed, right: 0, top: 0
- **Box Shadow:** -4px 0 12px rgba(0,0,0,0.15)
- **Animation:** slideInRight
- **Z-Index:** 1000

### 3.2 Header Cart
**Header:** `header`
- **Background:** #000 ❌ NON TEMATIZZATO (dovrebbe usare primaryColor)
- **Colore:** #fff ❌ NON TEMATIZZATO (dovrebbe usare textPrimaryColor)
- **Padding:** 20px
- **Display:** flex, justify-content: space-between

**Titolo:** `title`
- **Font:** 20px, font-weight: 600
- **Colore:** #fff ❌ (dovrebbe usare textPrimaryColor)

**Close Button:** `closeButton`
- **Background:** transparent
- **Colore:** #fff ❌ (dovrebbe usare textPrimaryColor)
- **Border:** none
- **Font:** 28px
- **Cursor:** pointer

### 3.3 Body Cart
**Body:** `body`
- **Overflow:** auto
- **Flex:** 1
- **Padding:** 0

**Carrello Vuoto:** `emptyCart`
- **Padding:** 60px 20px
- **Text Align:** center
- **Empty Text:** `emptyText`
  - Colore: #999 ❌ NON TEMATIZZATO (dovrebbe usare textTertiaryColor)
  - Font: 18px, font-weight: 500
- **Empty Subtext:** `emptySubtext`
  - Colore: #ccc ❌ NON TEMATIZZATO (dovrebbe usare textTertiaryColor con opacity)
  - Font: 14px

### 3.4 Lista Prodotti Cart
**Items List:** `itemsList`
- **Padding:** 16px
- **Gap:** 16px

**Item Card:** `cartItem`
- **Background:** #f9f9f9 ❌ NON TEMATIZZATO (dovrebbe usare backgroundTertiary)
- **Border Radius:** 12px ❌ NON TEMATIZZATO (dovrebbe usare theme.borderRadius)
- **Padding:** 12px
- **Display:** flex, gap: 12px

**Immagine Item:** `itemImage`
- **Width:** 60px, height: 60px
- **Border Radius:** 8px
- **Object Fit:** cover

**Item Content:** `itemContent`
- **Flex:** 1

**Nome Item:** `itemName`
- **Colore:** #111 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor)
- **Font:** 15px, font-weight: 600
- **Margin:** 0 0 4px

**Variante Item:** `itemVariant`
- **Colore:** #666 ❌ NON TEMATIZZATO (dovrebbe usare textTertiaryColor)
- **Font:** 12px
- **Margin:** 0 0 4px

**Note Item:** `itemNotes`
- **Colore:** #888 ❌ NON TEMATIZZATO (dovrebbe usare textTertiaryColor)
- **Font:** 11px
- **Font Style:** italic
- **Margin:** 0 0 4px

**Prezzo Item:** `itemPrice`
- **Colore:** #666 ❌ NON TEMATIZZATO (dovrebbe usare textTertiaryColor)
- **Font:** 13px

**Controlli Quantità:** `itemControls`
- **Display:** flex, gap: 8px, align-items: center
- **Control Button:** `controlButton`
  - Background: #000 ❌ NON TEMATIZZATO (dovrebbe usare primaryColor)
  - Colore: #fff ❌ (dovrebbe usare textPrimaryColor)
  - Border: none
  - Border Radius: 6px
  - Width: 28px, height: 28px
  - Font: 16px, font-weight: 600

**Quantity Display:** `quantityDisplay`
- **Colore:** #111 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor)
- **Font:** 14px, font-weight: 600
- **Min Width:** 30px, text-align: center

**Delete Button:** `deleteButton`
- **Background:** #f44336 ❌ NON TEMATIZZATO (dovrebbe usare theme.deleteColor)
- **Colore:** #fff ❌ (dovrebbe usare textPrimaryColor)
- **Border Radius:** 6px
- **Padding:** 6px
- **SVG:** 12x12, stroke #fff

**Item Subtotal:** `itemSubtotal`
- **Colore:** #111 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor)
- **Font:** 16px, font-weight: 700
- **Margin Top:** 8px

### 3.5 Form Dettagli Ordine (Step 2)
**Form Container:** `orderForm`
- **Padding:** 20px

**Form Title:** `formTitle`
- **Colore:** #111 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor)
- **Font:** 18px, font-weight: 600
- **Margin:** 0 0 20px

**Form Group:** `formGroup`
- **Margin Bottom:** 16px

**Label:** `label`
- **Colore:** #333 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor)
- **Font:** 14px, font-weight: 500
- **Display:** block
- **Margin Bottom:** 8px

**Input/Select/Textarea:** `input` e `textarea`
- **Background:** #fff ❌ NON TEMATIZZATO (dovrebbe usare secondaryColor)
- **Border:** 1px solid #ddd ❌ NON TEMATIZZATO (dovrebbe usare borderColor)
- **Border Radius:** 8px ❌ NON TEMATIZZATO (dovrebbe usare theme.borderRadius)
- **Padding:** 12px
- **Font:** 14px
- **Colore:** #111 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor)
- **Width:** 100%
- **Focus:** border-color #000 ❌ (dovrebbe usare primaryColor o accentColor)

**Priority Order Checkbox:** `priorityOrderBox`
- **Background:** #fff7e6 ❌ NON TEMATIZZATO (potrebbe usare warningColor con opacity)
- **Border:** 2px solid #ffd54f ❌ NON TEMATIZZATO (dovrebbe usare warningColor)
- **Border Radius:** 12px ❌ (dovrebbe usare theme.borderRadius)
- **Padding:** 16px
- **Margin Top:** 20px

### 3.6 Progress Bar (Tab Carrello/Dettagli)
**Progress Bar:** `progressBar`
- **Display:** flex, justify-content: center, align-items: center
- **Gap:** 12px
- **Padding:** 16px 0
- **Border Bottom:** 1px solid #e0e0e0 ❌ NON TEMATIZZATO (dovrebbe usare borderColor)

**Progress Step:** `progressStep`
- **Display:** flex, flex-direction: column, align-items: center
- **Gap:** 6px

**Step Circle:** `stepCircle`
- **Width:** 32px, height: 32px
- **Border Radius:** 50%
- **Background (attivo):** `themeStyles.primaryColor` ✓ TEMATIZZATO
- **Background (inattivo):** `themeStyles.borderColor` ✓ TEMATIZZATO
- **Colore testo (attivo):** `themeStyles.textPrimaryColor` ✓ TEMATIZZATO
- **Colore testo (inattivo):** `themeStyles.textTertiaryColor` ✓ TEMATIZZATO
- **Font:** 14px, font-weight: 600
- **Display:** flex, align-items: center, justify-content: center

**Step Label:** `stepLabel`
- **Font:** 12px, font-weight: 500
- **Colore (attivo):** `themeStyles.textSecondaryColor` ✓ TEMATIZZATO
- **Colore (inattivo):** `themeStyles.textTertiaryColor` ✓ TEMATIZZATO

**Step Line:** `stepLine`
- **Width:** 40px
- **Height:** 2px
- **Background:** #e0e0e0 ❌ NON TEMATIZZATO (dovrebbe usare borderColor)

### 3.7 Footer Cart (Totale e Pulsanti)
**Footer:** `footer`
- **Background:** #f5f5f5 ❌ NON TEMATIZZATO (dovrebbe usare backgroundTertiary)
- **Padding:** 20px
- **Border Top:** 1px solid #e0e0e0 ❌ NON TEMATIZZATO (dovrebbe usare borderColor)

**Total Section:** `totalSection`
- **Display:** flex, justify-content: space-between, align-items: center
- **Margin Bottom:** 16px

**Total Label:** `totalLabel`
- **Colore:** #666 ❌ NON TEMATIZZATO (dovrebbe usare textTertiaryColor)
- **Font:** 14px

**Total Label Bold:** `totalLabelBold`
- **Colore:** #111 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor)
- **Font:** 16px, font-weight: 700

**Total Items:** `totalItems`
- **Colore:** #111 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor)
- **Font:** 14px

**Total Amount:** `totalAmount`
- **Colore:** #111 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor)
- **Font:** 20px, font-weight: 700

**Primary Button (Procedi):** `primaryButton`
- **Background:** #000 ❌ NON TEMATIZZATO (dovrebbe usare primaryColor)
- **Colore:** #fff ❌ (dovrebbe usare textPrimaryColor)
- **Border:** none
- **Border Radius:** 8px ❌ (dovrebbe usare theme.borderRadius)
- **Padding:** 14px
- **Font:** 16px, font-weight: 600
- **Width:** 100%
- **Cursor:** pointer
- **Hover:** opacity 0.9

**Clear Button (Svuota/Torna):** `clearButton`
- **Background:** transparent
- **Colore:** #666 ❌ NON TEMATIZZATO (dovrebbe usare textTertiaryColor)
- **Border:** 1px solid #ddd ❌ NON TEMATIZZATO (dovrebbe usare borderColor)
- **Border Radius:** 8px
- **Padding:** 12px
- **Font:** 14px, font-weight: 500
- **Width:** 100%
- **Margin Top:** 12px
- **Cursor:** pointer

**Error Message:** `errorMessage`
- **Background:** #ffebee ❌ NON TEMATIZZATO (dovrebbe usare errorColor con opacity)
- **Colore:** #c62828 ❌ (dovrebbe usare errorColor)
- **Border:** 1px solid #ef5350 ❌ (dovrebbe usare errorColor)
- **Border Radius:** 8px
- **Padding:** 12px
- **Font:** 14px
- **Margin Top:** 12px

---

## 4. MODAL AGGIUNGI AL CARRELLO

### 4.1 Overlay e Container
**Overlay:** `overlay`
- **Background:** rgba(0,0,0,0.6) ❌ NON TEMATIZZATO
- **Position:** fixed, full screen
- **Z-Index:** 1000
- **Display:** flex, align-items: flex-end (mobile) / center (desktop)

**Modal Container:** `modalContainer`
- **Background:** #fff ❌ NON TEMATIZZATO (dovrebbe usare secondaryColor)
- **Border Radius (top):** 24px 24px 0 0 (mobile)
- **Border Radius (desktop):** 16px ❌ (dovrebbe usare theme.borderRadius)
- **Max Width:** 500px (desktop)
- **Width:** 100%
- **Max Height:** 90vh
- **Box Shadow:** 0 -4px 20px rgba(0,0,0,0.15)
- **Animation:** slideUp (mobile)

### 4.2 Header Modal
**Header:** `modalHeader`
- **Padding:** 20px
- **Border Bottom:** 1px solid #e0e0e0 ❌ NON TEMATIZZATO (dovrebbe usare borderColor)
- **Display:** flex, justify-content: space-between, align-items: center
- **Position:** sticky, top: 0
- **Background:** #fff ❌ (dovrebbe usare secondaryColor)
- **Z-Index:** 10

**Modal Title:** `modalTitle`
- **Colore:** #111 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor)
- **Font:** 20px, font-weight: 600
- **Margin:** 0

**Close Button:** `closeButton`
- **Background:** transparent
- **Colore:** #999 ❌ NON TEMATIZZATO (dovrebbe usare textTertiaryColor)
- **Border:** none
- **Font:** 28px
- **Cursor:** pointer
- **Hover:** colore #000 ❌ (dovrebbe usare textSecondaryColor)

### 4.3 Body Modal
**Body:** `modalBody`
- **Padding:** 0
- **Overflow:** auto
- **Max Height:** calc(90vh - 180px)

**Immagine Prodotto:** `productImage`
- **Width:** 100%
- **Max Height:** 300px
- **Object Fit:** cover
- **Display:** block

**Content Section:** `contentSection`
- **Padding:** 20px

**Product Name:** `productName`
- **Colore:** #111 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor)
- **Font:** 22px, font-weight: 600
- **Margin:** 0 0 8px

**Product Price:** `productPrice`
- **Colore:** #000 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor)
- **Font:** 20px, font-weight: 700
- **Margin:** 0 0 16px

**Product Description:** `productDescription`
- **Colore:** #666 ❌ NON TEMATIZZATO (dovrebbe usare textTertiaryColor)
- **Font:** 15px
- **Line Height:** 1.6
- **Margin:** 0 0 24px

### 4.4 Opzioni Varianti
**Options Section:** `optionsSection`
- **Margin Bottom:** 24px

**Option Group:** `optionGroup`
- **Margin Bottom:** 16px

**Option Label:** `optionLabel`
- **Colore:** #333 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor)
- **Font:** 14px, font-weight: 600
- **Display:** block
- **Margin Bottom:** 8px

**Option Select:** `optionSelect`
- **Width:** 100%
- **Padding:** 12px
- **Background:** #fff ❌ (dovrebbe usare secondaryColor)
- **Border:** 1px solid #ddd ❌ (dovrebbe usare borderColor)
- **Border Radius:** 8px ❌ (dovrebbe usare theme.borderRadius)
- **Font:** 14px
- **Colore:** #111 ❌ (dovrebbe usare textSecondaryColor)
- **Cursor:** pointer
- **Focus:** border-color #000 ❌ (dovrebbe usare primaryColor)

### 4.5 Controlli Quantità e Note
**Quantity Section:** `quantitySection`
- **Margin Bottom:** 20px

**Quantity Label:** vedi optionLabel

**Quantity Controls:** `quantityControls`
- **Display:** flex, align-items: center, gap: 12px
- **Margin Top:** 8px

**Quantity Button:** `quantityButton`
- **Width:** 40px, height: 40px
- **Background:** #000 ❌ NON TEMATIZZATO (dovrebbe usare primaryColor)
- **Colore:** #fff ❌ (dovrebbe usare textPrimaryColor)
- **Border:** none
- **Border Radius:** 8px ❌ (dovrebbe usare theme.borderRadius)
- **Font:** 20px, font-weight: 600
- **Cursor:** pointer
- **Display:** flex, align-items: center, justify-content: center
- **Disabled:** opacity 0.5, cursor not-allowed

**Quantity Display:** `quantityDisplay`
- **Colore:** #111 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor)
- **Font:** 18px, font-weight: 600
- **Min Width:** 40px
- **Text Align:** center

**Notes Section:** `notesSection`
- **Margin Bottom:** 20px

**Notes Textarea:** `notesTextarea`
- **Width:** 100%
- **Min Height:** 80px
- **Padding:** 12px
- **Background:** #fff ❌ (dovrebbe usare secondaryColor)
- **Border:** 1px solid #ddd ❌ (dovrebbe usare borderColor)
- **Border Radius:** 8px ❌ (dovrebbe usare theme.borderRadius)
- **Font:** 14px
- **Colore:** #111 ❌ (dovrebbe usare textSecondaryColor)
- **Resize:** vertical
- **Focus:** border-color #000 ❌ (dovrebbe usare primaryColor)

### 4.6 Footer Modal
**Footer:** `modalFooter`
- **Padding:** 20px
- **Border Top:** 1px solid #e0e0e0 ❌ NON TEMATIZZATO (dovrebbe usare borderColor)
- **Background:** #fff ❌ (dovrebbe usare secondaryColor)
- **Position:** sticky, bottom: 0

**Add Button:** `addButton`
- **Width:** 100%
- **Padding:** 16px
- **Background:** #000 ❌ NON TEMATIZZATO (dovrebbe usare primaryColor)
- **Colore:** #fff ❌ (dovrebbe usare textPrimaryColor)
- **Border:** none
- **Border Radius:** 8px ❌ (dovrebbe usare theme.borderRadius)
- **Font:** 16px, font-weight: 600
- **Cursor:** pointer
- **Display:** flex, align-items: center, justify-content: center, gap: 8px
- **Hover:** opacity 0.9
- **Disabled:** opacity 0.5, cursor not-allowed

**Total Price in Button:**
- **Font:** 18px, font-weight: 700
- **Margin Left:** 8px

---

## 5. PAGINA CONFERMA ORDINE (THANKYOU)

### 5.1 Container
**Container:** `container`
- **Background:** #F9FAFB ❌ NON TEMATIZZATO (potrebbe usare backgroundTertiary o primaryColor)
- **Min Height:** 100vh
- **Padding:** 20px
- **Display:** flex, align-items: center, justify-content: center
- **Font Family:** -apple-system, BlinkMacSystemFont, sans-serif

### 5.2 Loading State
**Loading Box:** `loadingBox`
- **Text Align:** center
- **Font:** 18px
- **Colore:** #666 ❌ NON TEMATIZZATO (dovrebbe usare textTertiaryColor)
- **Icona:** ⏳ emoji 48px

### 5.3 Error State
**Error Box:** `errorBox`
- **Text Align:** center
- **Max Width:** 400px
- **Icona:** ❌ emoji 64px
- **Titolo:** #111, 24px, font-weight 600
- **Subtitle:** #666, margin-bottom 30px

### 5.4 Confirmation Box
**Confirmation Box:** `confirmationBox`
- **Background:** #fff ❌ NON TEMATIZZATO (dovrebbe usare secondaryColor)
- **Border Radius:** 16px ❌ (dovrebbe usare theme.borderRadius)
- **Box Shadow:** 0 4px 20px rgba(0,0,0,0.1)
- **Padding:** 40px
- **Max Width:** 500px
- **Width:** 100%
- **Text Align:** center

**Success Icon:** `successIcon`
- **Width:** 80px, height: 80px
- **Border Radius:** 50%
- **Background:** #10B981 ❌ NON TEMATIZZATO (dovrebbe usare successColor)
- **Colore:** #fff ❌ (dovrebbe usare textPrimaryColor)
- **Font:** 48px, font-weight: bold
- **Display:** flex, align-items: center, justify-content: center
- **Margin:** 0 auto 24px
- **Icona:** ✓

### 5.5 Titoli e Testo
**Title:** `title`
- **Colore:** #111827 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor)
- **Font:** 28px, font-weight: 600
- **Margin:** 0 0 8px

**Subtitle:** `subtitle`
- **Colore:** #6B7280 ❌ NON TEMATIZZATO (dovrebbe usare textTertiaryColor)
- **Font:** 16px
- **Margin:** 0 0 32px

### 5.6 Details Card
**Details Card:** `detailsCard`
- **Background:** #F9FAFB ❌ NON TEMATIZZATO (dovrebbe usare backgroundTertiary)
- **Border Radius:** 12px ❌ (dovrebbe usare theme.borderRadius)
- **Padding:** 20px
- **Margin Bottom:** 24px
- **Text Align:** left

**Detail Row:** `detailRow`
- **Display:** flex, justify-content: space-between
- **Padding:** 12px 0
- **Border Bottom:** 1px solid #E5E7EB ❌ NON TEMATIZZATO (dovrebbe usare borderColor)

**Detail Label:** `detailLabel`
- **Colore:** #6B7280 ❌ NON TEMATIZZATO (dovrebbe usare textTertiaryColor)
- **Font:** 14px, font-weight: 500

**Detail Value:** `detailValue`
- **Colore:** #111827 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor)
- **Font:** 14px, font-weight: 600

**Priority Badge:** `priorityBadge`
- **Background:** #FEF3C7 ❌ NON TEMATIZZATO (dovrebbe usare warningColor con opacity)
- **Colore:** #92400E ❌ (dovrebbe derivare da warningColor)
- **Border Radius:** 8px ❌ (dovrebbe usare theme.borderRadius)
- **Padding:** 8px 16px
- **Font:** 14px, font-weight: 600
- **Margin Top:** 12px
- **Icona:** ⚡

### 5.7 Items Section
**Items Section:** `itemsSection`
- **Margin Bottom:** 24px
- **Text Align:** left

**Items Title:** `itemsTitle`
- **Colore:** #111827 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor)
- **Font:** 16px, font-weight: 600
- **Margin:** 0 0 16px

**Items List:** `itemsList`
- **Display:** flex, flex-direction: column
- **Gap:** 12px

**Item:** `item`
- **Display:** flex, align-items: center, gap: 12px
- **Background:** #F9FAFB ❌ NON TEMATIZZATO (dovrebbe usare backgroundTertiary)
- **Border Radius:** 8px ❌ (dovrebbe usare theme.borderRadius)
- **Padding:** 12px

**Item Quantity:** `itemQuantity`
- **Colore:** #6B7280 ❌ NON TEMATIZZATO (dovrebbe usare textTertiaryColor)
- **Font:** 14px, font-weight: 600
- **Min Width:** 30px

**Item Name:** `itemName`
- **Colore:** #111827 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor)
- **Font:** 14px

**Variant Badge:** `variantBadge`
- **Background:** #E5E7EB ❌ NON TEMATIZZATO (dovrebbe usare borderColor con opacity)
- **Colore:** #6B7280 ❌ (dovrebbe usare textTertiaryColor)
- **Border Radius:** 4px
- **Padding:** 2px 8px
- **Font:** 11px, font-weight: 500

**Item Price:** `itemPrice`
- **Colore:** #111827 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor)
- **Font:** 14px, font-weight: 600

### 5.8 Notes Section
**Notes Section:** `notesSection`
- **Background:** #EFF6FF ❌ NON TEMATIZZATO (potrebbe usare accentColor con opacity)
- **Border Radius:** 8px ❌ (dovrebbe usare theme.borderRadius)
- **Padding:** 16px
- **Margin Bottom:** 24px
- **Text Align:** left

**Notes Title:** `notesTitle`
- **Colore:** #1E40AF ❌ NON TEMATIZZATO (potrebbe derivare da accentColor)
- **Font:** 14px, font-weight: 600
- **Margin:** 0 0 8px

**Notes Text:** `notesText`
- **Colore:** #1E40AF ❌ (potrebbe derivare da accentColor)
- **Font:** 14px
- **Margin:** 0

### 5.9 Info Box
**Info Box:** `infoBox`
- **Background:** #F0FDF4 ❌ NON TEMATIZZATO (dovrebbe usare successColor con opacity)
- **Border:** 1px solid #BBF7D0 ❌ (dovrebbe derivare da successColor)
- **Border Radius:** 8px ❌ (dovrebbe usare theme.borderRadius)
- **Padding:** 16px
- **Margin Bottom:** 24px

**Info Text:** `infoText`
- **Colore:** #166534 ❌ NON TEMATIZZATO (dovrebbe derivare da successColor)
- **Font:** 14px
- **Line Height:** 1.5
- **Margin:** 0

### 5.10 Back Button
**Back Button:** `backButton`
- **Width:** 100%
- **Padding:** 14px
- **Background:** #000 ❌ NON TEMATIZZATO (dovrebbe usare primaryColor)
- **Colore:** #fff ❌ (dovrebbe usare textPrimaryColor)
- **Border:** none
- **Border Radius:** 8px ❌ (dovrebbe usare theme.borderRadius)
- **Font:** 16px, font-weight: 600
- **Cursor:** pointer
- **Hover:** opacity 0.8

---

## 6. SIDEBAR PREFERITI

### 6.1 Overlay e Container
**Overlay:** `sidebarOverlay`
- **Background:** rgba(0,0,0,0.5) ❌ NON TEMATIZZATO
- **Position:** fixed, full screen
- **Z-Index:** 999

**Sidebar:** `sidebar`
- **Background:** #fff ❌ NON TEMATIZZATO (dovrebbe usare secondaryColor)
- **Width:** 90vw, max-width: 400px
- **Height:** 100vh
- **Position:** fixed, right: 0, top: 0
- **Box Shadow:** -4px 0 12px rgba(0,0,0,0.15)
- **Z-Index:** 1000
- **Animation:** slideInRight

### 6.2 Header Sidebar
**Sidebar Header:** `sidebarHeader`
- **Padding:** 20px
- **Border Bottom:** 1px solid #e0e0e0 ❌ NON TEMATIZZATO (dovrebbe usare borderColor)
- **Display:** flex, justify-content: space-between, align-items: center
- **Background:** #fff ❌ (dovrebbe usare secondaryColor)

**Sidebar Title:** `sidebarTitle`
- **Colore:** #111 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor)
- **Font:** 20px, font-weight: 600
- **Margin:** 0

**Close Button:** `sidebarCloseButton`
- **Background:** transparent
- **Colore:** #999 ❌ NON TEMATIZZATO (dovrebbe usare textTertiaryColor)
- **Border:** none
- **Font:** 28px
- **Cursor:** pointer
- **Hover:** colore #000 ❌ (dovrebbe usare textSecondaryColor)

### 6.3 Content Sidebar
**Sidebar Content:** `sidebarContent`
- **Padding:** 16px
- **Overflow:** auto
- **Height:** calc(100vh - 80px)

### 6.4 Empty State
**Empty Favorites:** `emptyFavorites`
- **Display:** flex, flex-direction: column, align-items: center, justify-content: center
- **Padding:** 60px 20px
- **Text Align:** center
- **SVG:** 48x48, stroke `theme.textTertiaryColor` ✓ TEMATIZZATO
- **Testo:** colore `theme.textTertiaryColor` ✓ TEMATIZZATO
- **Subtesto:** colore #ccc ❌ (dovrebbe usare textTertiaryColor con opacity)

### 6.5 Lista Preferiti
**Favorite Item:** `favoriteItem`
- **Background:** #f9f9f9 ❌ NON TEMATIZZATO (dovrebbe usare backgroundTertiary)
- **Border Radius:** 12px ❌ (dovrebbe usare theme.borderRadius)
- **Padding:** 16px
- **Margin Bottom:** 12px
- **Display:** flex, gap: 12px, align-items: flex-start
- **Border:** 1px solid #e0e0e0 ❌ (dovrebbe usare borderColor)

**Favorite Item Name:** `favoriteItemName`
- **Colore:** #111 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor)
- **Font:** 16px, font-weight: 600
- **Margin:** 0 0 4px

**Favorite Item Category:** `favoriteItemCategory`
- **Colore:** #666 ❌ NON TEMATIZZATO (dovrebbe usare textTertiaryColor)
- **Font:** 13px
- **Margin:** 0 0 8px

**Favorite Item Price:** `favoriteItemPrice`
- **Colore:** #000 ❌ NON TEMATIZZATO (dovrebbe usare textSecondaryColor)
- **Font:** 15px, font-weight: 700
- **Margin:** 0 0 12px

**Favorite Order Button:** `favoriteOrderButton`
- **Background:** `theme.primaryColor` ✓ TEMATIZZATO
- **Colore:** `theme.textPrimaryColor` ✓ TEMATIZZATO
- **Border:** none
- **Border Radius:** 6px ❌ (dovrebbe usare theme.borderRadius)
- **Padding:** 8px 16px
- **Font:** 12px, font-weight: 600, letter-spacing: 0.5px
- **Cursor:** pointer

**Remove Favorite Button:** `removeFavoriteButton`
- **Background:** transparent
- **Border:** none
- **Padding:** 8px
- **Cursor:** pointer
- **SVG:** 18x18, stroke #999 ❌ (dovrebbe usare textTertiaryColor)
- **Hover:** stroke #000 ❌ (dovrebbe usare textSecondaryColor)

---

## 7. ELEMENTI GLOBALI

### 7.1 Footer
**Footer:** `footer`
- **Background:** `theme.primaryColor` ✓ TEMATIZZATO
- **Padding:** 30px 0
- **Margin Top:** 80px
- **Width:** 100vw
- **Position:** relative

**Footer Content:** `footerContent`
- **Max Width:** 1200px
- **Margin:** 0 auto
- **Padding:** 0 5%

**Footer Text:** `footerText`
- **Colore:** `theme.textPrimaryColor` ✓ TEMATIZZATO
- **Font:** 14px
- **Text Align:** center
- **Margin:** 0

**Footer Link:** `footerLink`
- **Colore:** `theme.textPrimaryColor` ✓ TEMATIZZATO
- **Text Decoration:** none
- **Hover:** text-decoration underline

### 7.2 Sticky Buttons (Bottom)
**Sticky Buttons:** `stickyButtons`
- **Position:** fixed, bottom: 0, left: 0, right: 0
- **Display:** flex, gap: 0
- **Z-Index:** 100
- **Background:** transparent

**Sticky Button Left:** `stickyButtonLeft`
- **Background:** `theme.primaryColor` ✓ TEMATIZZATO
- **Colore:** `theme.textPrimaryColor` ✓ TEMATIZZATO
- **Border:** none
- **Padding:** 16px
- **Flex:** 1
- **Text Decoration:** none
- **Display:** flex, flex-direction: column, align-items: center, gap: 8px

**Sticky Button Right:** `stickyButtonRight`
- **Background:** `theme.primaryColor` ✓ TEMATIZZATO
- **Colore:** `theme.textPrimaryColor` ✓ TEMATIZZATO
- **Border:** none
- **Padding:** 16px
- **Flex:** 1
- **Text Decoration:** none
- **Display:** flex, flex-direction: column, align-items: center, gap: 8px

**Sticky Button Text:** `stickyButtonText`
- **Font:** 12px, font-weight: 600
- **Text Align:** center

### 7.3 Loading States
**Spinner:** `spinner`
- **Width:** 40px, height: 40px
- **Border:** 4px solid `theme.borderColor` ✓ TEMATIZZATO
- **Border Top:** 4px solid `theme.accentColor` ✓ TEMATIZZATO
- **Border Radius:** 50%
- **Animation:** spin 1s linear infinite
- **Margin Bottom:** 16px

**Loading Text:** `loadingText`
- **Colore:** `theme.textSecondaryColor` ✓ TEMATIZZATO
- **Font:** 16px

---

## 📊 RIEPILOGO ANALISI

### ✅ ELEMENTI GIÀ TEMATIZZATI (Usano theme.* correttamente)
1. **PublicMenu:**
   - Sfondo pagina (primaryColor)
   - Testi principali (textSecondaryColor)
   - Testi secondari (textTertiaryColor)
   - Icone header cuore/carrello (textSecondaryColor)
   - Badge preferiti (favoriteActiveColor)
   - Card categoria overlay (gradient con primaryColor)
   - Indicatori carousel (primaryColor, borderColor)
   - Prezzi prodotti (textSecondaryColor)
   - Pulsanti ORDINA (primaryColor, textPrimaryColor)
   - Footer (primaryColor, textPrimaryColor)
   - Sticky buttons (primaryColor, textPrimaryColor)

2. **Cart:**
   - Progress bar tabs (primaryColor, textPrimaryColor, textSecondaryColor, textTertiaryColor, borderColor)

3. **AddToCartModal:**
   - (Limitata tematizzazione)

### ❌ ELEMENTI NON TEMATIZZATI (Hardcoded)
1. **PublicMenu:**
   - Info card (background #fff, borders #e0e0e0)
   - Info labels (colore #666)
   - Phone link (colore #000)
   - Products header (background #fff, border #e0e0e0)
   - Product name (colore #000)
   - Expand icon (colore #999)
   - Variants container (background #f9f9f9, border #e0e0e0)
   - Variant name (colore #666)
   - Product image border-radius (8px fisso)
   - Cart badge (background #000)
   - Product count (colore #666)

2. **Cart (COMPLETO - DA TEMATIZZARE TUTTO):**
   - Overlay (rgba(0,0,0,0.5))
   - Container (background #ffffff)
   - Header (background #000, colore #fff)
   - Close button (colore #fff)
   - Empty cart text (colore #999, #ccc)
   - Cart item card (background #f9f9f9, border-radius 12px)
   - Item name (colore #111)
   - Item variant (colore #666)
   - Item notes (colore #888)
   - Item price (colore #666)
   - Control buttons (background #000, colore #fff)
   - Quantity display (colore #111)
   - Delete button (background #f44336)
   - Item subtotal (colore #111)
   - Form title (colore #111)
   - Labels (colore #333)
   - Input/Select/Textarea (background #fff, border #ddd, colore #111, focus #000)
   - Priority order box (background #fff7e6, border #ffd54f)
   - Progress bar border (border-bottom #e0e0e0)
   - Step line (background #e0e0e0)
   - Footer (background #f5f5f5, border-top #e0e0e0)
   - Total labels (colori #666, #111)
   - Primary button (background #000, colore #fff, border-radius 8px)
   - Clear button (colore #666, border #ddd)
   - Error message (background #ffebee, colore #c62828, border #ef5350)

3. **AddToCartModal (COMPLETO - DA TEMATIZZARE TUTTO):**
   - Overlay (rgba(0,0,0,0.6))
   - Modal container (background #fff, border-radius 24px/16px)
   - Header border (border-bottom #e0e0e0)
   - Modal title (colore #111)
   - Close button (colore #999, hover #000)
   - Product name (colore #111)
   - Product price (colore #000)
   - Product description (colore #666)
   - Option labels (colore #333)
   - Option select (background #fff, border #ddd, colore #111, focus #000)
   - Quantity buttons (background #000, colore #fff, border-radius 8px)
   - Quantity display (colore #111)
   - Notes textarea (background #fff, border #ddd, colore #111, focus #000)
   - Footer border (border-top #e0e0e0)
   - Add button (background #000, colore #fff, border-radius 8px)

4. **OrderConfirmation (COMPLETO - DA TEMATIZZARE TUTTO):**
   - Container (background #F9FAFB)
   - Loading text (colore #666)
   - Confirmation box (background #fff, border-radius 16px)
   - Success icon (background #10B981, colore #fff)
   - Title (colore #111827)
   - Subtitle (colore #6B7280)
   - Details card (background #F9FAFB, border-radius 12px)
   - Detail row border (border-bottom #E5E7EB)
   - Detail label (colore #6B7280)
   - Detail value (colore #111827)
   - Priority badge (background #FEF3C7, colore #92400E, border-radius 8px)
   - Items title (colore #111827)
   - Item (background #F9FAFB, border-radius 8px)
   - Item quantity (colore #6B7280)
   - Item name (colore #111827)
   - Variant badge (background #E5E7EB, colore #6B7280)
   - Item price (colore #111827)
   - Notes section (background #EFF6FF, border-radius 8px)
   - Notes title (colore #1E40AF)
   - Notes text (colore #1E40AF)
   - Info box (background #F0FDF4, border #BBF7D0, border-radius 8px)
   - Info text (colore #166534)
   - Back button (background #000, colore #fff, border-radius 8px)

5. **Sidebar Preferiti:**
   - Overlay (rgba(0,0,0,0.5))
   - Sidebar (background #fff)
   - Sidebar header border (border-bottom #e0e0e0)
   - Sidebar title (colore #111)
   - Close button (colore #999, hover #000)
   - Empty favorites subtesto (colore #ccc)
   - Favorite item (background #f9f9f9, border #e0e0e0, border-radius 12px)
   - Favorite item name (colore #111)
   - Favorite item category (colore #666)
   - Favorite item price (colore #000)
   - Favorite order button border-radius (6px)
   - Remove favorite button SVG (stroke #999, hover #000)

---

## 🎨 NUOVI COLORI DA AGGIUNGERE AL THEME

Basandosi sull'analisi, questi colori mancano e dovrebbero essere aggiunti:

### Colori Funzionali Mancanti:
1. **inputBackground** - Per background input/select/textarea (default: secondaryColor)
2. **inputBorder** - Per bordi input (default: borderColor)
3. **inputBorderFocus** - Per bordi input in focus (default: accentColor o primaryColor)
4. **inputText** - Per testo in input (default: textSecondaryColor)
5. **overlayBackground** - Per overlay modali/sidebars (default: rgba(primaryColor, 0.5))
6. **cardBackground** - Per background card generiche (default: secondaryColor)
7. **cardBorder** - Per bordi card (default: borderColor)
8. **emptyStateText** - Per testi stati vuoti (default: textTertiaryColor)
9. **linkColor** - Per link (default: accentColor)
10. **linkHoverColor** - Per link hover (default: primaryColor)

### Colori già esistenti ma non usati ovunque:
- **successColor** ✓ (esiste ma non sempre usato)
- **errorColor** ✓ (esiste ma non sempre usato)
- **warningColor** ✓ (esiste ma non sempre usato)
- **deleteColor** ✓ (esiste ma non sempre usato)
- **backgroundTertiary** ✓ (esiste ma non sempre usato)
- **favoriteActiveColor** ✓ (esiste e usato bene)
- **borderColor** ✓ (esiste ma non sempre usato)

### Border Radius Fissi da Sostituire:
- Molti elementi usano `8px`, `12px`, `16px`, `24px` hardcoded
- Dovrebbero tutti usare `theme.borderRadius` con varianti (xs, sm, md, lg, xl)

---

## 📝 AZIONI NECESSARIE

### Fase 1: Completare ThemeCustomizer
Aggiungere campi per:
1. Input background color
2. Input border color
3. Input focus color
4. Overlay opacity
5. Link colors
6. Border radius variants (invece di un solo valore)

### Fase 2: Applicare Tema a PublicMenu.jsx
Sostituire tutti i colori hardcoded con `theme.*`:
- Info card
- Products header
- Product details
- Variants list
- Text colors vari

### Fase 3: Applicare Tema a Cart.jsx (PRIORITÀ ALTA)
Completamente da tematizzare - è il componente più critico

### Fase 4: Applicare Tema a AddToCartModal.jsx
Completamente da tematizzare

### Fase 5: Applicare Tema a OrderConfirmation.jsx
Completamente da tematizzare

### Fase 6: Applicare Tema a Sidebar Preferiti
Sistemare i colori rimasti hardcoded

---

**Fine Documento**
