# Timeline Enhancement - Migration Guide

**Data**: 27 Ottobre 2025
**Versione**: 2.0.0
**Status**: 🟡 Ready for Execution

---

## 📋 Overview

Questa migration aggiunge event source tracking e UI enhancement alla tabella `order_timeline` per implementare un sistema CRM-style stile Klaviyo/Shopify.

### Modifiche Principali:

1. **Event Source Tracking** - Traccia fonte evento (QR menu, tavoli, banco, ordini, cassa)
2. **UI Enhancement** - Flags per eventi espandibili
3. **Analytics Views** - Nuove views per analytics
4. **Backward Compatibility** - Popola dati esistenti

---

## ⚠️ Pre-Requisiti

Prima di eseguire la migration:

- [ ] **Backup Database Completo** (CRITICO!)
- [ ] **Ambiente Development Pronto** (non production!)
- [ ] **Nessun deployment in corso**
- [ ] **App ferma** (evita deadlock)
- [ ] **Supabase Dashboard Aperto** (per monitoring)

---

## 🚀 Esecuzione Migration

### Opzione 1: Supabase Dashboard (Raccomandato)

1. **Apri Supabase Dashboard**
   - Vai su: https://supabase.com/dashboard
   - Seleziona progetto MVP Menu

2. **SQL Editor**
   - Click su "SQL Editor" nella sidebar
   - Click su "New query"

3. **Copia Migration**
   - Apri file: `database/migrations/09_timeline_event_source.sql`
   - Copia TUTTO il contenuto
   - Incolla nell'editor SQL

4. **Esegui Migration**
   - Click su "Run" (o Ctrl+Enter)
   - Attendi completamento (circa 5-10 secondi)

5. **Verifica Output**
   - Dovresti vedere messaggi:
     ```
     ✅ MIGRATION COMPLETATA CON SUCCESSO!
     Colonne aggiunte: event_source, is_expandable, details_summary
     Indici creati: 3 indici
     Views analytics create: 2 views
     ```

6. **Verifica Queries**
   - La migration esegue automaticamente queries di verifica
   - Controlla risultati nella sezione "Results"

### Opzione 2: CLI (Avanzato)

```bash
# Se usi Supabase CLI
supabase db push

# O con psql
psql $DATABASE_URL -f database/migrations/09_timeline_event_source.sql
```

---

## ✅ Verifica Post-Migration

### Test 1: Verifica Colonne

Esegui in SQL Editor:

```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'order_timeline'
  AND column_name IN ('event_source', 'is_expandable', 'details_summary')
ORDER BY column_name;
```

**Expected Output:**
| column_name | data_type | is_nullable |
|-------------|-----------|-------------|
| details_summary | text | YES |
| event_source | character varying | YES |
| is_expandable | boolean | YES |

---

### Test 2: Verifica Popolazione Dati

```sql
SELECT
  event_source,
  COUNT(*) as count,
  COUNT(CASE WHEN is_expandable THEN 1 END) as expandable_count
FROM order_timeline
GROUP BY event_source
ORDER BY count DESC;
```

**Expected Output:**
Tutti i record esistenti dovrebbero avere `event_source` popolato (nessun NULL).

---

### Test 3: Verifica Views

```sql
-- View 1: Source Analytics
SELECT * FROM v_timeline_source_analytics LIMIT 5;

-- View 2: Source Action Matrix
SELECT * FROM v_timeline_source_action_matrix LIMIT 10;
```

**Expected**: Queries eseguite senza errori, dati aggregati visibili.

---

### Test 4: Verifica Helper Function

```sql
SELECT
  event_source,
  get_event_source_label(event_source) as label
FROM order_timeline
GROUP BY event_source
ORDER BY event_source;
```

**Expected Output:**
| event_source | label |
|--------------|-------|
| cashier | 💰 Cassa |
| public_menu | 📱 Menu Pubblico (QR) |
| table_service | 🍽️ Servizio Tavoli |

---

## 🐛 Troubleshooting

### Errore: "column already exists"

**Causa**: Migration già eseguita in precedenza

**Soluzione**:
```sql
-- Verifica se colonne esistono
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'order_timeline'
  AND column_name IN ('event_source', 'is_expandable', 'details_summary');
```

Se esistono già, skip migration (è idempotente con `IF NOT EXISTS`).

---

### Errore: "deadlock detected"

**Causa**: App in esecuzione sta modificando order_timeline

**Soluzione**:
1. Ferma app: `npm stop` o kill processo
2. Attendi 30 secondi
3. Ri-esegui migration

---

### Errore: "constraint violation"

**Causa**: Dati inconsistenti in tabella

**Soluzione**:
```sql
-- Controlla record con event_source invalido
SELECT id, action, event_source
FROM order_timeline
WHERE event_source IS NOT NULL
  AND event_source NOT IN (
    'public_menu', 'table_service', 'counter',
    'orders_page', 'cashier', 'system'
  );
```

Se ci sono record invalidi, correggi manualmente o contatta team.

---

## 📊 Rollback (Emergency)

Se migration causa problemi, esegui rollback:

```sql
BEGIN;

-- Drop views
DROP VIEW IF EXISTS v_timeline_source_analytics CASCADE;
DROP VIEW IF EXISTS v_timeline_source_action_matrix CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS get_event_source_label(VARCHAR);

-- Drop indici
DROP INDEX IF EXISTS idx_order_timeline_event_source;
DROP INDEX IF EXISTS idx_order_timeline_source_action;
DROP INDEX IF EXISTS idx_order_timeline_expandable;

-- Drop colonne
ALTER TABLE order_timeline
DROP COLUMN IF EXISTS event_source,
DROP COLUMN IF EXISTS is_expandable,
DROP COLUMN IF EXISTS details_summary;

COMMIT;
```

⚠️ **ATTENZIONE**: Rollback elimina dati nelle nuove colonne! Usa solo in emergenza.

---

## 🔄 Post-Migration Steps

Dopo migration completata con successo:

### 1. Update Application Code

- [ ] Deploy nuovo `timelineService.js`
- [ ] Migrare primo callsite come test
- [ ] Verificare log console per warnings

### 2. Monitor Performance

- [ ] Controlla query performance in Supabase Dashboard
- [ ] Verifica indici usati correttamente
- [ ] Monitor dimensione tabella

### 3. Test End-to-End

- [ ] Crea nuovo ordine da QR menu → verifica `event_source = 'public_menu'`
- [ ] Conferma ordine da staff → verifica `event_source = 'table_service'`
- [ ] Completa ordine da cassa → verifica `event_source = 'cashier'`

---

## 📈 Analytics Queries

Dopo migration, puoi usare nuove analytics:

### Query 1: Performance per Fonte

```sql
SELECT
  event_source,
  get_event_source_label(event_source) as fonte,
  total_events,
  unique_orders,
  orders_completed,
  ROUND(total_revenue::numeric, 2) as revenue
FROM v_timeline_source_analytics
WHERE restaurant_id = 'TUO_RESTAURANT_ID'
ORDER BY total_events DESC;
```

### Query 2: Workflow Matrix

```sql
SELECT
  get_event_source_label(event_source) as fonte,
  action,
  event_count,
  ROUND(avg_minutes_to_next_event::numeric, 1) as avg_minutes
FROM v_timeline_source_action_matrix
WHERE restaurant_id = 'TUO_RESTAURANT_ID'
ORDER BY event_count DESC
LIMIT 20;
```

### Query 3: Eventi Espandibili

```sql
SELECT
  action,
  COUNT(*) as total,
  COUNT(CASE WHEN is_expandable THEN 1 END) as expandable,
  ROUND(
    COUNT(CASE WHEN is_expandable THEN 1 END)::numeric /
    COUNT(*)::numeric * 100,
    1
  ) as percent_expandable
FROM order_timeline
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY action
ORDER BY expandable DESC;
```

---

## 📚 Related Documentation

- [TIMELINE_ENHANCEMENT_PROJECT.md](../../docs/TIMELINE_ENHANCEMENT_PROJECT.md) - Progetto completo
- [TIMELINE_EVENTS_REFERENCE.md](../docs/TIMELINE_EVENTS_REFERENCE.md) - Reference eventi
- [ORDER_OPERATIONS_GUIDE.md](../../docs/ORDER_OPERATIONS_GUIDE.md) - Operations guide

---

## ✅ Checklist Finale

Dopo migration, verifica:

- [ ] ✅ Tutte le queries di verifica passano
- [ ] ✅ Nessun errore in Supabase logs
- [ ] ✅ Record esistenti hanno `event_source` popolato
- [ ] ✅ Views analytics funzionano
- [ ] ✅ Helper function ritorna labels corrette
- [ ] ✅ App può leggere nuove colonne
- [ ] ✅ Backup database verificato

---

## 🆘 Support

Se hai problemi con la migration:

1. **Check Logs**: Supabase Dashboard → Logs → Postgres logs
2. **Rollback**: Usa script rollback sopra
3. **Report**: Crea issue con output errore completo

---

**Status**: ⏳ Waiting for Execution
**Next Step**: Esegui migration, poi testa con nuovo timelineService.js
