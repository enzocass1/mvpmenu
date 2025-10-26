# 🔧 Fix Trigger first_name/last_name

Se ricevi questo errore quando esegui i test:

```
ERROR: 42703: column s.first_name does not exist
CONTEXT: PL/pgSQL function populate_timeline_staff_info()
```

## 🚨 Problema

Hai eseguito `create_roles_system.sql` PRIMA della correzione schema.

I trigger su Supabase contengono ancora:
```sql
COALESCE(
  NULLIF(TRIM(s.first_name || ' ' || s.last_name), ''),
  s.name
)
```

Ma `restaurant_staff` ha solo `name`, non `first_name`/`last_name`.

---

## ✅ Soluzione (1 minuto)

### 1. Apri Supabase SQL Editor

### 2. Copia/Incolla questo file:
```
database/migrations/FIX_TRIGGER_FIRST_NAME.sql
```

### 3. Clicca Run

**Output atteso:**
```
========================================
✅ FIX TRIGGER COMPLETATO
========================================

Trigger aggiornati:
- populate_timeline_staff_info()
- populate_table_change_staff_info()

Ora puoi eseguire i test senza errori!
```

---

## 🧪 Ri-esegui Test

Dopo aver eseguito il fix:

1. **Torna a** `database/testing/test_roles_system.sql`
2. **Ri-esegui** il test completo
3. **Verifica** ✅ PASS

---

## 🔍 Verifica Fix Applicato

Se vuoi verificare che il fix sia stato applicato:

```sql
-- Controlla definizione trigger
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'populate_timeline_staff_info';
```

**✅ CORRETTO** se vedi:
```sql
s.name  -- ✅ Solo name
```

**❌ SBAGLIATO** se vedi:
```sql
s.first_name || ' ' || s.last_name  -- ❌ Ancora vecchio
```

---

## 📝 Cosa Fa il Fix

Aggiorna 2 funzioni trigger:

1. **populate_timeline_staff_info()**
   - Rimuove `COALESCE(NULLIF(TRIM(s.first_name || ' ' || s.last_name), ''), s.name)`
   - Usa direttamente `s.name`

2. **populate_table_change_staff_info()**
   - Stessa correzione per table_change_logs

**Risultato:** Trigger funzionano con schema corretto `restaurant_staff`.

---

## ❓ Perché È Successo?

Timeline:
1. Hai eseguito `create_roles_system.sql` su Supabase
2. Io ho corretto il file locale DOPO
3. Ma Supabase ha ancora la versione vecchia

**Soluzione:** Questo script aggiorna Supabase con codice corretto.

---

**Esegui il fix e ri-prova i test!** 🚀
