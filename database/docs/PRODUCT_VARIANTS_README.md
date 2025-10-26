## 🎯 Cosa Devi Fare ADESSO

### STEP 1: Esegui gli Script SQL su Supabase

1. **Apri Supabase SQL Editor**
2. **Esegui in ordine:**

**A. Schema principale:**
```sql
-- Incolla e esegui tutto product_variants_schema.sql
```

**B. Views (per evitare errori 406):**
```sql
-- Incolla e esegui tutto product_variants_views.sql
```

### STEP 2: Verifica Creazione Tabelle

Vai su **Supabase → Table Editor** e verifica che esistano:
- ✅ `product_variant_options`
- ✅ `product_variant_option_values`
- ✅ `product_variants`
- ✅ `v_product_variant_options` (view)
- ✅ `v_product_variant_option_values` (view)
- ✅ `v_product_variants` (view)

Inoltre, verifica che `order_items` abbia le nuove colonne:
- ✅ `variant_id`
- ✅ `variant_title`

---

# SYSTEM VARIANTI PRODOTTO - Stile Shopify

## Panoramica

Sistema completo per gestire varianti prodotto con opzioni multiple, esattamente come Shopify.

### Esempio Pratico

**Prodotto: "Caffè"**
- **Opzioni**:
  - Size: Small, Medium, Large
  - Temperature: Hot, Cold
- **Varianti Generate** (6 combinazioni):
  1. Small / Hot → €2.00
  2. Small / Cold → €2.50
  3. Medium / Hot → €2.50
  4. Medium / Cold → €3.00
  5. Large / Hot → €3.00
  6. Large / Cold → €3.50

## Struttura Database

### 1. `product_variant_options` - Opzioni (Size, Color, etc)

```sql
{
  id: UUID,
  product_id: UUID,       // Riferimento al prodotto
  name: "Size",           // Nome opzione
  position: 0             // Ordine visualizzazione
}
```

**Esempi:**
- Size, Color, Temperature, Material, Style, Flavor

### 2. `product_variant_option_values` - Valori Opzioni (S/M/L, Red/Blue)

```sql
{
  id: UUID,
  option_id: UUID,        // Riferimento all'opzione
  value: "Small",         // Valore (S, M, L, Red, Blue, Hot, Cold)
  position: 0             // Ordine visualizzazione
}
```

### 3. `product_variants` - Varianti (Combinazioni)

```sql
{
  id: UUID,
  product_id: UUID,
  sku: "CAFE-SM-HOT",            // Codice SKU opzionale
  title: "Small / Hot",          // Titolo leggibile

  // Pricing
  price: 2.00,                   // Prezzo specifico (se NULL, usa base)
  compare_at_price: 2.50,        // Prezzo confronto (barrato)
  cost_per_item: 0.50,           // Costo per margini

  // Inventory
  track_quantity: true,          // Traccia inventario?
  quantity: 50,                  // Quantità disponibile
  allow_negative_inventory: false,

  // Status
  is_available: true,            // Disponibile?

  // Option values (JSON)
  option_values: {               // Valori opzioni per questa variante
    "Size": "Small",
    "Temperature": "Hot"
  },

  position: 0,                   // Ordine visualizzazione
  image_url: "..."               // Immagine specifica (opzionale)
}
```

### 4. `order_items` - Modifiche per Varianti

Aggiunte 2 colonne:

```sql
ALTER TABLE order_items ADD COLUMN:
  - variant_id UUID           // Se ordinata una variante specifica
  - variant_title TEXT        // Cache titolo (es. "Medium / Hot")
```

**Logica:**
- Se `variant_id` è NULL → prodotto base (senza varianti)
- Se `variant_id` è presente → variante specifica ordinata

## View: `products_with_variants`

View completa che restituisce prodotti con tutte le loro varianti e opzioni in JSON:

```sql
SELECT * FROM products_with_variants WHERE product_id = 'xxx';
```

**Output esempio:**
```json
{
  "product_id": "uuid",
  "product_name": "Caffè",
  "base_price": 2.50,
  "has_variants": true,

  "options": [
    {
      "id": "uuid",
      "name": "Size",
      "position": 0,
      "values": [
        {"id": "uuid", "value": "Small", "position": 0},
        {"id": "uuid", "value": "Medium", "position": 1},
        {"id": "uuid", "value": "Large", "position": 2}
      ]
    },
    {
      "id": "uuid",
      "name": "Temperature",
      "position": 1,
      "values": [
        {"id": "uuid", "value": "Hot", "position": 0},
        {"id": "uuid", "value": "Cold", "position": 1}
      ]
    }
  ],

  "variants": [
    {
      "id": "uuid",
      "title": "Small / Hot",
      "sku": "CAFE-SM-HOT",
      "price": 2.00,
      "is_available": true,
      "track_quantity": true,
      "quantity": 50,
      "option_values": {"Size": "Small", "Temperature": "Hot"}
    },
    // ... altre varianti
  ]
}
```

## Workflow Utente

### Ristoratore - Creazione Varianti

1. **Crea Prodotto Base** (es. "Caffè")
2. **Aggiungi Opzioni** (es. Size, Temperature)
3. **Aggiungi Valori per Ogni Opzione**:
   - Size → Small, Medium, Large
   - Temperature → Hot, Cold
4. **Genera/Crea Varianti**:
   - Manualmente una per una, oppure
   - Auto-generate tutte le combinazioni
5. **Imposta Prezzi e Inventario** per ogni variante

### Cliente - Ordinazione

1. Vede prodotto "Caffè - da €2.00"
2. Clicca su prodotto
3. **Seleziona opzioni**:
   - Size: Medium
   - Temperature: Cold
4. Vede prezzo aggiornato: €3.00
5. Aggiunge al carrello
6. **Order item salvato con**:
   - `product_id`: UUID del caffè
   - `variant_id`: UUID della variante "Medium / Cold"
   - `variant_title`: "Medium / Cold"
   - `product_price`: 3.00

### Analytics - Tracking Vendite

Le analytics ora vedranno:
- **Prodotto "Caffè"**: 100 vendite totali
  - Variante "Small / Hot": 30 vendite
  - Variante "Medium / Hot": 40 vendite
  - Variante "Large / Cold": 30 vendite

## Features Supportate

### ✅ Prezzi Diversi per Variante
Ogni variante può avere prezzo diverso:
- Small → €2.00
- Medium → €2.50
- Large → €3.00

### ✅ Inventario per Variante
Traccia stock separato per ogni variante:
- Small / Hot: 50 pezzi
- Medium / Cold: 30 pezzi

### ✅ Disponibilità per Variante
Disabilita varianti specifiche:
- Large / Cold → `is_available: false` (esaurito)

### ✅ SKU per Variante
Codici SKU univoci:
- CAFE-SM-HOT
- CAFE-MD-COLD

### ✅ Immagini per Variante (opzionale)
Ogni variante può avere immagine propria

### ✅ Multiple Opzioni
Fino a N opzioni per prodotto:
- Size + Temperature
- Color + Size + Material
- Flavor + Intensity + Size

## Integration Points

### Menu Pubblico
- Mostra opzioni selezionabili
- Aggiorna prezzo in real-time alla selezione
- Mostra disponibilità per combinazione

### Draft Orders (Staff)
- Staff può scegliere varianti durante creazione ordine
- Vede prezzi e disponibilità per ogni variante

### Analytics
- **Product Performance**: Vendite per prodotto (somma tutte varianti)
- **Variant Performance**: Top varianti più vendute
- **Revenue**: Calcolo corretto con prezzi varianti
- **Inventory**: Alert stock varianti specifiche

### Fiscal System (futuro)
- Ogni variante = riga separata su scontrino
- Descrizione completa: "Caffè - Medium / Hot"

## Best Practices

### Naming Opzioni
- **Breve e chiaro**: Size, Color, Type
- **Capitalizzato**: "Size" non "size"
- **Singolare**: "Size" non "Sizes"

### Naming Valori
- **Consistente**: "Small/Medium/Large" o "S/M/L" (scegli uno)
- **Capitalizzato**: "Hot" non "hot"
- **Descrittivo**: "Extra Large" meglio di "XL" per clienti

### Prezzi
- Se variante non ha prezzo → usa prezzo base prodotto
- Usa `compare_at_price` per mostrare sconti
- Imposta `cost_per_item` per calcolare margini

### Inventory
- Attiva `track_quantity` solo se gestisci stock
- `allow_negative_inventory: false` per evitare overselling
- Monitor quantity basse con alerts

### Position
- Ordina opzioni per importanza (Size prima di Color)
- Ordina valori logicamente (S→M→L, non L→S→M)
- Ordina varianti per popolarità o prezzo

## Limitazioni Attuali

- ❌ Non c'è UI per gestione varianti (da implementare)
- ❌ Auto-generation varianti da implementare frontend
- ❌ Bulk edit varianti da implementare
- ❌ Import/export varianti via CSV da implementare

## Next Steps

1. ✅ **Esegui SQL scripts** su Supabase
2. 🔄 **Implementa UI** in MenuItems.jsx per gestione varianti
3. 🔄 **Aggiorna DraftOrder** per selezionare varianti
4. 🔄 **Aggiorna Analytics** per includere dati varianti
5. ⏳ **Testa** end-to-end con ordini reali
