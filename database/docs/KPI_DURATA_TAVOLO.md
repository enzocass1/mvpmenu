# KPI Durata Tavolo - Analytics

## Obiettivo

Calcolare metriche sulla durata dei tavoli per analytics e ottimizzazione servizio.

## Campi Database

### Tabella `orders`

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  table_id UUID REFERENCES tables(id),
  room_id UUID REFERENCES rooms(id),
  status TEXT CHECK (status IN ('pending', 'preparing', 'completed')),
  opened_at TIMESTAMP WITH TIME ZONE,  -- Quando tavolo viene aperto/confermato
  closed_at TIMESTAMP WITH TIME ZONE,  -- Quando scontrino viene emesso
  created_at TIMESTAMP WITH TIME ZONE  -- Quando ordine viene creato
);
```

### Trigger Automatico

Il trigger `set_closed_at()` imposta automaticamente `closed_at = NOW()` quando:
- `status` passa da qualsiasi stato a `'completed'`
- `closed_at` è ancora `NULL`

## Calcolo Durata Tavolo

### Formula

```sql
durata_tavolo_seconds = EXTRACT(EPOCH FROM (closed_at - opened_at))
```

**Dove:**
- `opened_at`: Timestamp apertura tavolo (quando staff conferma ordine pending o crea ordine preparing)
- `closed_at`: Timestamp chiusura tavolo (quando viene emesso scontrino fiscale)

### Formato Display

```javascript
// In JavaScript
const durationSeconds = Math.floor((closed_at - opened_at) / 1000)
const hours = Math.floor(durationSeconds / 3600).toString().padStart(2, '0')
const minutes = Math.floor((durationSeconds % 3600) / 60).toString().padStart(2, '0')
const seconds = (durationSeconds % 60).toString().padStart(2, '0')
const formatted = `${hours}:${minutes}:${seconds}` // Es: "01:23:45"
```

## KPI Analytics

### 1. Durata Media Tavolo per Ristorante

```sql
SELECT
  restaurant_id,
  AVG(EXTRACT(EPOCH FROM (closed_at - opened_at))) as avg_duration_seconds,
  AVG(EXTRACT(EPOCH FROM (closed_at - opened_at))) / 60 as avg_duration_minutes
FROM orders
WHERE status = 'completed'
  AND closed_at IS NOT NULL
  AND opened_at IS NOT NULL
  AND deleted_at IS NULL
GROUP BY restaurant_id;
```

### 2. Durata Media per Sala

```sql
SELECT
  r.id as room_id,
  r.name as room_name,
  COUNT(*) as total_orders,
  AVG(EXTRACT(EPOCH FROM (o.closed_at - o.opened_at))) as avg_duration_seconds,
  AVG(EXTRACT(EPOCH FROM (o.closed_at - o.opened_at))) / 60 as avg_duration_minutes,
  MIN(EXTRACT(EPOCH FROM (o.closed_at - o.opened_at))) as min_duration_seconds,
  MAX(EXTRACT(EPOCH FROM (o.closed_at - o.opened_at))) as max_duration_seconds
FROM orders o
JOIN rooms r ON o.room_id = r.id
WHERE o.status = 'completed'
  AND o.closed_at IS NOT NULL
  AND o.opened_at IS NOT NULL
  AND o.deleted_at IS NULL
  AND o.restaurant_id = ? -- Parametro
GROUP BY r.id, r.name
ORDER BY avg_duration_seconds DESC;
```

### 3. Durata Media per Tavolo Specifico

```sql
SELECT
  t.id as table_id,
  t.number as table_number,
  r.name as room_name,
  COUNT(*) as total_orders,
  AVG(EXTRACT(EPOCH FROM (o.closed_at - o.opened_at))) as avg_duration_seconds,
  AVG(EXTRACT(EPOCH FROM (o.closed_at - o.opened_at))) / 60 as avg_duration_minutes,
  MIN(EXTRACT(EPOCH FROM (o.closed_at - o.opened_at))) as min_duration_seconds,
  MAX(EXTRACT(EPOCH FROM (o.closed_at - o.opened_at))) as max_duration_seconds
FROM orders o
JOIN tables t ON o.table_id = t.id
JOIN rooms r ON t.room_id = r.id
WHERE o.status = 'completed'
  AND o.closed_at IS NOT NULL
  AND o.opened_at IS NOT NULL
  AND o.deleted_at IS NULL
  AND o.restaurant_id = ? -- Parametro
GROUP BY t.id, t.number, r.name
ORDER BY avg_duration_seconds DESC;
```

### 4. Distribuzione Durata Tavoli (Bucket)

```sql
SELECT
  CASE
    WHEN EXTRACT(EPOCH FROM (closed_at - opened_at)) / 60 < 30 THEN '0-30 min'
    WHEN EXTRACT(EPOCH FROM (closed_at - opened_at)) / 60 < 60 THEN '30-60 min'
    WHEN EXTRACT(EPOCH FROM (closed_at - opened_at)) / 60 < 90 THEN '60-90 min'
    WHEN EXTRACT(EPOCH FROM (closed_at - opened_at)) / 60 < 120 THEN '90-120 min'
    ELSE '120+ min'
  END as duration_bucket,
  COUNT(*) as order_count,
  ROUND(AVG(total_amount), 2) as avg_revenue
FROM orders
WHERE status = 'completed'
  AND closed_at IS NOT NULL
  AND opened_at IS NOT NULL
  AND deleted_at IS NULL
  AND restaurant_id = ? -- Parametro
GROUP BY duration_bucket
ORDER BY MIN(EXTRACT(EPOCH FROM (closed_at - opened_at)));
```

### 5. Correlazione Durata - Revenue

```sql
SELECT
  ROUND(EXTRACT(EPOCH FROM (closed_at - opened_at)) / 60, 0) as duration_minutes,
  COUNT(*) as order_count,
  AVG(total_amount) as avg_revenue,
  SUM(total_amount) as total_revenue
FROM orders
WHERE status = 'completed'
  AND closed_at IS NOT NULL
  AND opened_at IS NOT NULL
  AND deleted_at IS NULL
  AND restaurant_id = ? -- Parametro
GROUP BY duration_minutes
ORDER BY duration_minutes;
```

### 6. Performance per Fascia Oraria

```sql
SELECT
  EXTRACT(HOUR FROM opened_at) as hour_of_day,
  COUNT(*) as total_orders,
  AVG(EXTRACT(EPOCH FROM (closed_at - opened_at))) / 60 as avg_duration_minutes,
  AVG(total_amount) as avg_revenue
FROM orders
WHERE status = 'completed'
  AND closed_at IS NOT NULL
  AND opened_at IS NOT NULL
  AND deleted_at IS NULL
  AND restaurant_id = ? -- Parametro
GROUP BY hour_of_day
ORDER BY hour_of_day;
```

## View Analytics Pre-Calcolate

### v_table_duration_analytics

```sql
CREATE OR REPLACE VIEW v_table_duration_analytics AS
SELECT
  o.restaurant_id,
  t.id as table_id,
  t.number as table_number,
  r.id as room_id,
  r.name as room_name,
  COUNT(*) as total_orders,
  AVG(EXTRACT(EPOCH FROM (o.closed_at - o.opened_at))) as avg_duration_seconds,
  MIN(EXTRACT(EPOCH FROM (o.closed_at - o.opened_at))) as min_duration_seconds,
  MAX(EXTRACT(EPOCH FROM (o.closed_at - o.opened_at))) as max_duration_seconds,
  AVG(o.total_amount) as avg_revenue,
  SUM(o.total_amount) as total_revenue
FROM orders o
JOIN tables t ON o.table_id = t.id
JOIN rooms r ON t.room_id = r.id
WHERE o.status = 'completed'
  AND o.closed_at IS NOT NULL
  AND o.opened_at IS NOT NULL
  AND o.deleted_at IS NULL
GROUP BY o.restaurant_id, t.id, t.number, r.id, r.name;

COMMENT ON VIEW v_table_duration_analytics IS
'Analytics durata tavoli: avg/min/max duration + revenue per ogni tavolo';
```

### v_room_duration_analytics

```sql
CREATE OR REPLACE VIEW v_room_duration_analytics AS
SELECT
  o.restaurant_id,
  r.id as room_id,
  r.name as room_name,
  COUNT(*) as total_orders,
  AVG(EXTRACT(EPOCH FROM (o.closed_at - o.opened_at))) as avg_duration_seconds,
  MIN(EXTRACT(EPOCH FROM (o.closed_at - o.opened_at))) as min_duration_seconds,
  MAX(EXTRACT(EPOCH FROM (o.closed_at - o.opened_at))) as max_duration_seconds,
  AVG(o.total_amount) as avg_revenue,
  SUM(o.total_amount) as total_revenue
FROM orders o
JOIN rooms r ON o.room_id = r.id
WHERE o.status = 'completed'
  AND o.closed_at IS NOT NULL
  AND o.opened_at IS NOT NULL
  AND o.deleted_at IS NULL
GROUP BY o.restaurant_id, r.id, r.name;

COMMENT ON VIEW v_room_duration_analytics IS
'Analytics durata tavoli: avg/min/max duration + revenue per ogni sala';
```

## Utilizzo Frontend

### JavaScript Helper

```javascript
// src/utils/analyticsHelpers.js

/**
 * Formatta durata in formato HH:MM:SS
 */
export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600).toString().padStart(2, '0')
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
  const secs = (seconds % 60).toString().padStart(2, '0')
  return `${hours}:${minutes}:${secs}`
}

/**
 * Calcola durata tavolo da order object
 */
export const calculateTableDuration = (order) => {
  if (!order.opened_at || !order.closed_at) return null

  const start = new Date(order.opened_at)
  const end = new Date(order.closed_at)
  const durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000)

  return {
    seconds: durationSeconds,
    minutes: Math.round(durationSeconds / 60),
    formatted: formatDuration(durationSeconds)
  }
}

/**
 * Carica analytics durata tavoli
 */
export const loadTableDurationAnalytics = async (restaurantId, filters = {}) => {
  const { data, error } = await supabase
    .from('v_table_duration_analytics')
    .select('*')
    .eq('restaurant_id', restaurantId)

  if (error) throw error

  return data.map(row => ({
    ...row,
    avg_duration_formatted: formatDuration(row.avg_duration_seconds),
    min_duration_formatted: formatDuration(row.min_duration_seconds),
    max_duration_formatted: formatDuration(row.max_duration_seconds)
  }))
}
```

### React Component Example

```javascript
// src/components/TableDurationAnalytics.jsx

import { useEffect, useState } from 'react'
import { loadTableDurationAnalytics } from '../utils/analyticsHelpers'

function TableDurationAnalytics({ restaurantId }) {
  const [analytics, setAnalytics] = useState([])

  useEffect(() => {
    loadTableDurationAnalytics(restaurantId).then(setAnalytics)
  }, [restaurantId])

  return (
    <div>
      <h2>Durata Media Tavoli</h2>
      <table>
        <thead>
          <tr>
            <th>Sala</th>
            <th>Tavolo</th>
            <th>Ordini</th>
            <th>Durata Media</th>
            <th>Revenue Media</th>
          </tr>
        </thead>
        <tbody>
          {analytics.map(row => (
            <tr key={row.table_id}>
              <td>{row.room_name}</td>
              <td>{row.table_number}</td>
              <td>{row.total_orders}</td>
              <td>{row.avg_duration_formatted}</td>
              <td>€{row.avg_revenue.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

## Note Implementative

### Fallback per closed_at NULL

Se `closed_at` è NULL (ordine ancora aperto), usa `Date.now()` come fallback:

```javascript
const end = new Date(order.closed_at || Date.now())
```

### Filtraggio Ordini Validi

Per analytics, filtra sempre:
- `status = 'completed'`
- `closed_at IS NOT NULL`
- `opened_at IS NOT NULL`
- `deleted_at IS NULL` (escludi ordini eliminati)

### Performance

Le view `v_table_duration_analytics` e `v_room_duration_analytics` sono pre-calcolate e indicizzate per performance ottimali.

## Roadmap

### Fase 1 (Attuale)
- ✅ Calcolo durata in TableDetailModal
- ✅ Display "Durata tavolo" per preparing/completed
- ✅ Salvataggio `durationSeconds` in state per analytics

### Fase 2 (Prossimo)
- [ ] Creare view analytics database
- [ ] Implementare helper functions JavaScript
- [ ] Dashboard analytics durata tavoli

### Fase 3 (Futuro)
- [ ] Correlazione durata - revenue
- [ ] Predizione tempo servizio
- [ ] Alert tavoli troppo lenti

## References

- [SISTEMA_CASSA_TAVOLI_SPEC.md](SISTEMA_CASSA_TAVOLI_SPEC.md) - Specifiche complete
- [supabase_cassa_tavoli_migration_SAFE.sql](../migrations/supabase_cassa_tavoli_migration_SAFE.sql) - Migration database
