# Table Change Logs - Sistema di Audit per Cambi Tavolo

## Panoramica

Il sistema di **table_change_logs** permette di tracciare tutti i cambiamenti di tavolo per gli ordini, registrando:
- Quale operatore ha effettuato il cambio
- Quando è avvenuto il cambio
- Da quale sala/tavolo a quale sala/tavolo

## Schema Database

### Tabella: `table_change_logs`

```sql
CREATE TABLE table_change_logs (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),

  -- Informazioni tavolo precedente
  old_room_id UUID REFERENCES rooms(id),
  old_table_id UUID REFERENCES tables(id),
  old_room_name TEXT,
  old_table_number INTEGER,

  -- Informazioni nuovo tavolo
  new_room_id UUID REFERENCES rooms(id),
  new_table_id UUID REFERENCES tables(id),
  new_room_name TEXT,
  new_table_number INTEGER,

  -- Operatore e timestamp
  changed_by_user_id UUID REFERENCES users(id),
  changed_by_name TEXT,
  changed_at TIMESTAMP WITH TIME ZONE,

  -- Note opzionali
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Caratteristiche

### 1. Snapshot dei Dati
I nomi delle sale e i numeri dei tavoli vengono **salvati come testo** al momento del cambio. Questo permette di:
- Mantenere lo storico accurato anche se sale/tavoli vengono rinominati
- Preservare la cronologia anche se sale/tavoli vengono eliminati
- Avere un audit trail completo e immutabile

### 2. Informazioni Operatore
L'operatore che ha effettuato il cambio viene tracciato con:
- `changed_by_user_id`: ID dell'utente (può diventare NULL se utente eliminato)
- `changed_by_name`: Nome dell'utente salvato come testo (preservato sempre)
- `changed_at`: Timestamp esatto del cambio

### 3. Row Level Security (RLS)
Le policy RLS garantiscono che:
- Gli utenti possano vedere solo i log del proprio ristorante
- Solo gli utenti autenticati possano inserire nuovi log
- I log non possono essere modificati o eliminati (solo INSERT e SELECT)

## Implementazione nel Codice

### ChangeTableModal.jsx

Quando viene cambiato un tavolo, il componente:

1. **Raccoglie informazioni utente**:
```javascript
const { data: { user } } = await supabase.auth.getUser()
const { data: userProfile } = await supabase
  .from('users')
  .select('name, email')
  .eq('id', user.id)
  .single()

const userName = userProfile?.name || userProfile?.email || 'Operatore'
```

2. **Aggiorna l'ordine**:
```javascript
await supabase
  .from('orders')
  .update({
    table_id: selectedTableId,
    room_id: selectedRoomId,
    updated_at: new Date().toISOString()
  })
  .eq('id', order.id)
```

3. **Registra il log**:
```javascript
await supabase
  .from('table_change_logs')
  .insert({
    order_id: order.id,
    restaurant_id: restaurantId,
    old_room_id: order.room_id,
    old_table_id: order.table_id,
    old_room_name: oldRoomName,
    old_table_number: oldTable,
    new_room_id: selectedRoomId,
    new_table_id: selectedTableId,
    new_room_name: newRoomName,
    new_table_number: newTable?.number,
    changed_by_user_id: user.id,
    changed_by_name: userName,
    changed_at: new Date().toISOString()
  })
```

## Query Utili

### Vedere tutti i cambi tavolo di un ordine
```sql
SELECT
  changed_at,
  changed_by_name,
  old_room_name || ' - Tavolo ' || old_table_number as "Da",
  new_room_name || ' - Tavolo ' || new_table_number as "A"
FROM table_change_logs
WHERE order_id = 'order-uuid-here'
ORDER BY changed_at DESC;
```

### Vedere chi cambia più tavoli
```sql
SELECT
  changed_by_name,
  COUNT(*) as total_changes
FROM table_change_logs
WHERE restaurant_id = 'restaurant-uuid-here'
  AND changed_at >= NOW() - INTERVAL '30 days'
GROUP BY changed_by_name
ORDER BY total_changes DESC;
```

### Vedere ordini con più cambi tavolo
```sql
SELECT
  o.id,
  o.table_number,
  COUNT(tcl.id) as num_changes
FROM orders o
LEFT JOIN table_change_logs tcl ON o.id = tcl.order_id
WHERE o.restaurant_id = 'restaurant-uuid-here'
GROUP BY o.id, o.table_number
HAVING COUNT(tcl.id) > 1
ORDER BY num_changes DESC;
```

## Migrazioni

Per applicare lo schema al database Supabase:

1. Accedi alla dashboard Supabase
2. Vai su **SQL Editor**
3. Esegui il contenuto di `database/migrations/table_change_logs.sql`
4. Verifica che la tabella sia stata creata correttamente
5. Testa le policy RLS provando a inserire/leggere dati

## Note Implementative

### Gestione Errori
Il logging dei cambi tavolo è implementato con un approccio "fail-safe":
```javascript
if (logError) {
  console.error('Error logging table change:', logError)
  // Don't fail the operation if logging fails
}
```

Questo significa che se il logging fallisce, l'operazione di cambio tavolo viene comunque completata. Il log viene scritto nel console per debugging.

### Performance
Gli indici sulla tabella garantiscono query veloci:
- `idx_table_change_logs_order_id`: per query per ordine
- `idx_table_change_logs_restaurant_id`: per query per ristorante
- `idx_table_change_logs_changed_at`: per query temporali

## Sviluppi Futuri

Possibili miglioramenti:
1. **UI per visualizzare lo storico**: Mostrare i cambi tavolo nella pagina dettaglio ordine
2. **Report analytics**: Dashboard con statistiche sui cambi tavolo
3. **Notifiche**: Avvisare il personale quando un tavolo viene cambiato
4. **Note**: Permettere di aggiungere note opzionali al cambio tavolo
5. **Undo**: Permettere di annullare un cambio tavolo recente

## Best Practices

1. **Non eliminare mai i log**: Mantieni lo storico completo per audit
2. **Backup regolari**: I log sono importanti per tracciabilità fiscale
3. **Privacy**: I log contengono nomi operatori - rispetta GDPR
4. **Retention**: Considera una policy di retention (es. 2 anni)
