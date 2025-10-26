# Analytics e Assegnazione Tavolo Finale

## Problema

Quando un ordine cambia tavolo durante la sua vita, le metriche/KPI devono essere associate al **tavolo finale** (quello al momento della chiusura), non al tavolo iniziale.

## Soluzione Attuale

### Schema Database

La tabella `orders` contiene:
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  table_number INTEGER NOT NULL,  -- Numero tavolo legacy
  table_id UUID REFERENCES tables(id),  -- FK al tavolo attuale
  room_id UUID REFERENCES rooms(id),     -- FK alla sala attuale
  status TEXT CHECK (status IN ('pending', 'confirmed', 'preparing', 'completed', 'cancelled')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

### Log Cambi Tavolo

La tabella `table_change_logs` traccia tutti i cambi:
```sql
CREATE TABLE table_change_logs (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL,
  old_table_id UUID,
  old_room_id UUID,
  new_table_id UUID,
  new_room_id UUID,
  changed_at TIMESTAMP WITH TIME ZONE,
  changed_by_user_id UUID,
  changed_by_name TEXT
);
```

## ✅ Comportamento Corretto

### 1. Cambio Tavolo Durante Ordine

Quando si cambia tavolo con `ChangeTableModal`:

1. **Update order**: `table_id` e `room_id` vengono aggiornati
2. **Insert log**: Viene creato un record in `table_change_logs`
3. **Ordine continua**: L'ordine mantiene il suo stato

```javascript
// In ChangeTableModal.jsx
await supabase
  .from('orders')
  .update({
    table_id: selectedTableId,
    room_id: selectedRoomId,
    updated_at: new Date().toISOString()
  })
  .eq('id', order.id)
```

### 2. Metriche al Completamento

Quando l'ordine viene completato (status → 'completed'):

1. **completed_at** viene settato
2. **table_id** e **room_id** contengono i valori FINALI
3. Le query analytics usano questi valori finali

### 3. Query Analytics

Le query per KPI/metriche devono sempre usare:

```sql
-- ✅ CORRETTO: Usa table_id e room_id dell'ordine completato
SELECT
  r.name as room_name,
  t.number as table_number,
  COUNT(*) as total_orders,
  SUM(o.total_amount) as revenue
FROM orders o
JOIN tables t ON o.table_id = t.id
JOIN rooms r ON o.room_id = r.id
WHERE o.status = 'completed'
  AND o.restaurant_id = 'xxx'
  AND o.completed_at BETWEEN '2024-01-01' AND '2024-01-31'
GROUP BY r.id, r.name, t.id, t.number;

-- ❌ SBAGLIATO: Non usare table_number (legacy)
SELECT
  table_number,
  COUNT(*) as total_orders
FROM orders
WHERE status = 'completed'
GROUP BY table_number;
```

## Implementazione Frontend

### CassaPage.jsx

Al completamento ordine:

```javascript
const handleCompleteOrder = async (orderId) => {
  // L'ordine ha già table_id e room_id aggiornati
  await supabase
    .from('orders')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', orderId)

  // Le metriche useranno automaticamente
  // il table_id e room_id correnti
}
```

### AnalyticsPage.jsx

Visualizzazione metriche:

```javascript
const loadAnalytics = async () => {
  const { data } = await supabase
    .from('orders')
    .select(`
      *,
      table:tables(id, number),
      room:rooms(id, name)
    `)
    .eq('status', 'completed')
    .eq('restaurant_id', restaurantId)

  // data contiene il tavolo FINALE per ogni ordine
}
```

## Storico Cambi Tavolo

Per vedere lo storico completo dei cambi:

```sql
SELECT
  o.id as order_id,
  tcl.old_room_name || ' - Tavolo ' || tcl.old_table_number as from_table,
  tcl.new_room_name || ' - Tavolo ' || tcl.new_table_number as to_table,
  tcl.changed_at,
  tcl.changed_by_name
FROM orders o
JOIN table_change_logs tcl ON o.id = tcl.order_id
WHERE o.id = 'order-uuid-here'
ORDER BY tcl.changed_at;
```

## Riepilogo Garanzie

✅ **Tavolo finale sempre salvato**: `table_id` e `room_id` in `orders` contengono sempre l'ultimo valore
✅ **Storico completo**: `table_change_logs` traccia tutti i cambi con timestamp e operatore
✅ **Metriche corrette**: Le analytics usano `table_id`/`room_id` finali, non `table_number` legacy
✅ **Audit trail**: Ogni cambio è tracciato con chi, quando e perché

## Migration Checklist

Per garantire che tutto funzioni correttamente:

1. ✅ Eseguire `supabase_cassa_tavoli_migration.sql` - Aggiunge `table_id` a orders
2. ✅ Eseguire `supabase_migration_add_room_id_to_orders.sql` - Aggiunge `room_id` a orders
3. ✅ Eseguire `table_change_logs.sql` - Crea tabella audit log
4. ⚠️ **Importante**: Modificare tutte le query analytics per usare `table_id`/`room_id` invece di `table_number`

## Note Implementative

- **Non eliminare `table_number`**: Viene mantenuto per backwards compatibility
- **Non usare `table_number` per analytics**: È un campo legacy che non riflette i cambi
- **Sempre usare relazioni**: `JOIN tables` e `JOIN rooms` per avere dati accurati
