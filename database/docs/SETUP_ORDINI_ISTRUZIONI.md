# 🚀 Istruzioni Setup Sistema Ordini

## ❗ IMPORTANTE: Eseguire lo Schema SQL su Supabase

Il sistema ordini richiede nuove tabelle nel database. Segui questi passaggi:

### 1. Accedi a Supabase
1. Vai su [https://supabase.com](https://supabase.com)
2. Accedi al tuo progetto
3. Vai nella sezione **SQL Editor** (icona nel menu laterale)

### 2. Esegui lo Schema
1. Clicca su **"+ New Query"**
2. Apri il file `supabase_orders_schema.sql` dalla root del progetto
3. Copia TUTTO il contenuto del file
4. Incollalo nell'editor SQL di Supabase
5. Clicca su **"Run"** (o premi `Ctrl+Enter`)

### 3. Verifica Creazione Tabelle
Dopo l'esecuzione, verifica che siano state create le seguenti tabelle:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'restaurant_order_settings',
    'restaurant_staff',
    'customers',
    'orders',
    'order_items',
    'order_timeline'
  );
```

Dovresti vedere 6 tabelle.

---

## 📊 Struttura Database Creata

### **1. restaurant_order_settings**
Impostazioni ordini per ogni ristorante
- `orders_enabled`: Boolean (attiva/disattiva ordini)
- `number_of_tables`: Integer (numero tavoli)

### **2. restaurant_staff**
Camerieri e staff del ristorante
- `name`, `email`, `password_hash`
- `role`: 'waiter' | 'manager'
- `is_active`: Boolean

### **3. customers**
Clienti registrati (opzionale)
- `name`, `email`, `phone`
- Permette storico ordini per clienti

### **4. orders**
Ordini al tavolo
- `table_number`: Numero tavolo
- `status`: pending | confirmed | preparing | completed | cancelled
- `total_amount`: Totale ordine (calcolato automaticamente)
- `confirmed_by`: Riferimento a staff che ha confermato

### **5. order_items**
Prodotti nell'ordine
- `product_id`, `quantity`, `notes`
- `subtotal`: Calcolato automaticamente

### **6. order_timeline** ⭐ NUOVO
Timeline modifiche ordini con operatore
- `staff_id`, `staff_name`: Chi ha fatto la modifica
- `action`: created | confirmed | preparing | completed | cancelled | updated | item_added | item_removed | item_updated
- `previous_status`, `new_status`: Stati prima/dopo
- `changes`: JSON con dettagli modifiche
- `created_at`: Timestamp della modifica

**Trigger Automatico**: Ogni volta che un ordine cambia stato, viene creata automaticamente una entry nella timeline con l'operatore che ha effettuato la modifica.

---

## 🔧 Funzionalità Automatiche

### Trigger Implementati
1. **Calcolo Totale Ordine**: Si aggiorna automaticamente quando aggiungi/rimuovi prodotti
2. **Timeline Automatica**: Traccia automaticamente chi modifica gli ordini e quando
3. **Timestamp Updated**: `updated_at` si aggiorna automaticamente

### View Statistiche
- **order_statistics**: Vista aggregata per analytics
  - Total orders, revenue, AOV per giorno/ristorante
  - Average item value
  - Breakdown per stato ordine

---

## 🔐 Sicurezza (RLS)

### Policy Implementate
- ✅ Ristoratori vedono solo propri ordini/staff/clienti
- ✅ Staff vede solo ordini del proprio ristorante
- ✅ Clienti vedono solo propri ordini
- ✅ Inserimento pubblico ordini (dal menu)
- ✅ Timeline accessibile solo a chi può vedere l'ordine

---

## ✅ Verifica Funzionamento

### Test 1: Impostazioni Ordini
1. Vai nella Dashboard → Impostazioni
2. Attiva "Ordine al Tavolo"
3. Imposta numero tavoli (es. 20)
4. Salva

### Test 2: Aggiungi Cameriere
1. Clicca "+ Aggiungi Cameriere"
2. Compila: Nome, Email, Password, Ruolo
3. Salva
4. Dovresti vedere il cameriere nella lista

### Test 3: Verifica Timeline (da SQL)
```sql
-- Dopo aver creato un ordine di test
SELECT
  ot.*,
  rs.name as staff_name
FROM order_timeline ot
LEFT JOIN restaurant_staff rs ON ot.staff_id = rs.id
ORDER BY ot.created_at DESC
LIMIT 10;
```

---

## ❌ Troubleshooting

### Errore 404 "table not found"
**Causa**: Le tabelle non esistono ancora nel database
**Soluzione**: Esegui `supabase_orders_schema.sql` come descritto sopra

### Errore "relation already exists"
**Causa**: Hai già eseguito lo schema in precedenza
**Soluzione**: Tutto ok! Le tabelle esistono già

### Errore "permission denied"
**Causa**: Problemi con le RLS policies
**Soluzione**: Verifica di essere autenticato correttamente

### Password Hashing Semplice
⚠️ **NOTA**: Il sistema usa un encoding base64 semplice per le password dei camerieri (solo per demo). In produzione usa bcrypt o simile.

---

## 📝 Prossimi Step

Dopo aver eseguito lo schema:
1. ✅ Impostazioni e camerieri funzioneranno
2. 🔄 Implementare slidecart nel menu pubblico
3. 🔄 Pagina login camerieri `/manager`
4. 🔄 Pagina gestione ordini `/ordini`
5. 🔄 Dashboard analytics ordini

---

## 🆘 Supporto

Se riscontri problemi:
1. Verifica che tutte le tabelle base (restaurants, products, categories) esistano
2. Controlla i log SQL in Supabase per errori specifici
3. Verifica le policy RLS nella sezione Authentication → Policies

---

**Creato per MVP Menu System**
Versione: 1.0
Data: 24 Ottobre 2025
