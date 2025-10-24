# Priority Order - Setup Instructions

## Overview
La funzionalità Priority Order permette ai clienti di pagare un supplemento per avere il proprio ordine preparato con priorità.

## 1. Eseguire la Migration SQL

**IMPORTANTE:** Prima di utilizzare la funzionalità, devi eseguire la migration SQL su Supabase.

### Passaggi:
1. Vai su [Supabase Dashboard](https://supabase.com)
2. Accedi al tuo progetto
3. Vai in **SQL Editor** (menu laterale)
4. Clicca su **"+ New Query"**
5. Apri il file `supabase_priority_order_migration.sql` dalla root del progetto
6. Copia TUTTO il contenuto del file
7. Incollalo nell'editor SQL di Supabase
8. Clicca su **"Run"** (o premi `Ctrl+Enter`)

### Verifica Migration
Dopo l'esecuzione, verifica che le colonne siano state aggiunte:

```sql
-- Verifica colonne in restaurant_order_settings
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'restaurant_order_settings'
  AND column_name IN ('priority_order_enabled', 'priority_order_price');

-- Verifica colonne in orders
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('is_priority_order', 'priority_order_amount');
```

Dovresti vedere 4 colonne totali (2 per tabella).

---

## 2. Configurazione nel Dashboard Ristoratore

### Abilitare Priority Order:
1. Vai in **Dashboard** → **Impostazioni**
2. Assicurati che **"Ordine al Tavolo"** sia attivo
3. Troverai una nuova sezione **"Priority Order"**
4. Attiva il toggle **"Priority Order"**
5. Imposta il prezzo (es. €2.00)
6. Clicca su **"Salva"**

### Campi:
- **Toggle Priority Order**: Abilita/disabilita la funzionalità
- **Prezzo Priority Order**: Importo che il cliente pagherà (es. 2.00 euro)

---

## 3. Esperienza Cliente

Quando Priority Order è abilitato, i clienti vedranno:

### Nel Carrello (Step 2 - Dettagli):
- Checkbox **"Priority Order"** dopo il campo note
- Prezzo: **"+€X.XX"** accanto al titolo
- Descrizione: **"Il tuo ordine verrà preparato con priorità"**
- **Sfondo giallo** con bordo arancione per evidenziare l'opzione

### Quando Selezionato:
- Il totale dell'ordine si aggiorna automaticamente
- L'importo Priority Order viene aggiunto al totale
- I dati vengono salvati nell'ordine:
  - `is_priority_order`: true/false
  - `priority_order_amount`: importo pagato

---

## 4. Struttura Database

### Tabella `restaurant_order_settings`
Nuovi campi:
- `priority_order_enabled` (BOOLEAN): Se true, i clienti possono scegliere Priority Order
- `priority_order_price` (DECIMAL): Prezzo del servizio (es. 2.00)

### Tabella `orders`
Nuovi campi:
- `is_priority_order` (BOOLEAN): Se il cliente ha scelto Priority Order
- `priority_order_amount` (DECIMAL): Importo pagato per Priority Order

### Funzione `calculate_order_total`
Aggiornata per includere:
- Totale prodotti
- **+ Priority Order Amount** (se applicabile)
- = **Totale finale**

---

## 5. File Modificati

### 1. `supabase_priority_order_migration.sql` (NUOVO)
Migration SQL con:
- Aggiunte colonne a `restaurant_order_settings`
- Aggiunte colonne a `orders`
- Funzione `calculate_order_total` aggiornata
- Indici per performance

### 2. `src/components/OrderSettings.jsx`
Modifiche:
- Aggiunto state per `priority_order_enabled` e `priority_order_price`
- Aggiunto handler `handleTogglePriorityOrder`
- Aggiunto handler `handleSavePriorityPrice`
- Nuova sezione UI "Priority Order" con toggle e input prezzo
- Nuovi stili: `subsectionTitle`, `currencySymbol`

### 3. `src/components/Cart.jsx`
Modifiche:
- Aggiunto state `isPriorityOrder`
- Funzione `calculateTotal()` aggiornata per includere priority order
- Handler `handleSubmitOrder()` salva `is_priority_order` e `priority_order_amount`
- Nuova sezione UI checkbox Priority Order in Step 2
- Nuovi stili: `priorityOrderSection`, `priorityOrderLabel`, `checkbox`, etc.

---

## 6. Testing

### Test 1: Configurazione Ristoratore
1. Vai in Dashboard → Impostazioni
2. Attiva "Priority Order"
3. Imposta prezzo (es. 2.00)
4. Salva
5. Verifica messaggio di successo

### Test 2: Ordine Cliente
1. Apri menu pubblico
2. Aggiungi prodotti al carrello
3. Clicca "Procedi all'Ordine"
4. Dovresti vedere checkbox "Priority Order +€2.00"
5. Seleziona checkbox
6. Verifica che totale si aggiorni (totale prodotti + 2.00)
7. Compila numero tavolo
8. Conferma ordine

### Test 3: Verifica Database
```sql
-- Ordini con Priority Order
SELECT
  id,
  table_number,
  is_priority_order,
  priority_order_amount,
  total_amount,
  created_at
FROM orders
WHERE is_priority_order = true
ORDER BY created_at DESC
LIMIT 10;
```

---

## 7. Troubleshooting

### Errore: "column does not exist"
**Causa:** Migration non eseguita
**Soluzione:** Esegui `supabase_priority_order_migration.sql` su Supabase

### Priority Order non appare nel menu
**Causa:**
1. Ordini al tavolo disabilitati
2. Priority Order non abilitato
3. Migration non eseguita

**Soluzione:**
1. Verifica che "Ordine al Tavolo" sia attivo
2. Verifica che "Priority Order" sia attivo
3. Esegui migration SQL

### Totale non si aggiorna
**Causa:** Problema con calcolo
**Soluzione:** Controlla console browser per errori JavaScript

---

## 8. Design UI

### OrderSettings (Dashboard)
- **Toggle**: Verde quando attivo (#34C759)
- **Input Prezzo**: Con simbolo € posizionato a sinistra
- **Descrizione**: "Permetti ai clienti di pagare per avere il proprio ordine preparato prioritariamente"

### Cart (Menu Cliente)
- **Sfondo**: Giallo chiaro (#fff9e6)
- **Bordo**: Arancione (#ffcc00)
- **Prezzo**: Arancione bold (#ff9800)
- **Checkbox**: 18x18px
- **Font**: 13px per titolo, 11px per descrizione

---

## 9. Funzionalità Future (Opzionali)

Possibili miglioramenti:
1. **Badge Priority** negli ordini in cucina
2. **Notifica sonora** per ordini priority
3. **Filtro ordini priority** nel pannello ordini
4. **Analytics**: Revenue da Priority Orders
5. **Sconto automatico** se ordine priority non preparato in X minuti
6. **Prezzi dinamici**: Più costoso nelle ore di punta

---

## Supporto

In caso di problemi:
1. Verifica migration SQL eseguita correttamente
2. Controlla console browser per errori JavaScript
3. Verifica RLS policies su Supabase
4. Controlla che `priority_order_price >= 0`

---

**Implementato per MVP Menu System**
Data: 24 Ottobre 2025
