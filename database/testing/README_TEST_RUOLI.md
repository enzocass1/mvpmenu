# 🧪 Guida Testing Sistema Ruoli

Guida completa per testare il sistema ruoli e timeline appena implementato.

---

## 📋 Prerequisiti

- Sistema ruoli deployato su Supabase ✅
- Accesso a Supabase SQL Editor
- Almeno 1 ristorante nel database
- Almeno 1 staff member

---

## 🚀 Esecuzione Rapida

### **Opzione 1: Test Completo Automatico**

1. Apri **Supabase SQL Editor**
2. Copia e incolla tutto il file:
   ```
   database/testing/test_roles_system.sql
   ```
3. Clicca **Run** (o `Ctrl+Enter`)
4. Controlla output per ✅ PASS / ❌ FAIL

**Tempo:** 2-3 minuti

---

### **Opzione 2: Test Manuali Step-by-Step**

Segui i test sotto uno per uno.

---

## 🧪 Test Suite

### **TEST 1: Verifica Setup Ruoli**

#### Test 1.1: Ruoli Creati per Ristorante

```sql
SELECT
  r.name as restaurant_name,
  COUNT(ro.id) as num_ruoli,
  STRING_AGG(ro.display_name, ', ' ORDER BY ro.sort_order) as ruoli
FROM restaurants r
LEFT JOIN roles ro ON r.id = ro.restaurant_id
GROUP BY r.id, r.name;
```

**Output Atteso:**
```
restaurant_name | num_ruoli | ruoli
----------------|-----------|-------------------------------------------------------
La Dolce Vita   | 6         | Admin, Manager, Cameriere, Cuoco, Barista, Cassiere
Pizzeria Mario  | 6         | Admin, Manager, Cameriere, Cuoco, Barista, Cassiere
```

- ✅ **PASS**: `num_ruoli = 6` per ogni ristorante
- ❌ **FAIL**: `num_ruoli != 6`

---

#### Test 1.2: Permessi Ruoli

```sql
SELECT
  ro.display_name as ruolo,
  ro.permissions -> 'orders' ->> 'create' as can_create_orders,
  ro.permissions -> 'cassa' ->> 'access' as can_access_cassa,
  ro.permissions -> 'settings' ->> 'update' as can_update_settings
FROM roles ro
WHERE ro.restaurant_id = 'TUO_RESTAURANT_ID_QUI'
ORDER BY ro.sort_order;
```

**Output Atteso:**
```
ruolo      | can_create_orders | can_access_cassa | can_update_settings
-----------|-------------------|------------------|--------------------
Admin      | true              | true             | true
Manager    | true              | true             | false
Cameriere  | true              | false            | false
Cuoco      | false             | false            | false
Barista    | false             | false            | false
Cassiere   | true              | true             | false
```

- ✅ **PASS**: Permessi corrispondono alla tabella sopra
- ❌ **FAIL**: Permessi diversi

---

#### Test 1.3: Staff Migrati

```sql
SELECT
  s.name as staff_name,
  s.role_legacy as vecchio,
  r.display_name as nuovo
FROM restaurant_staff s
LEFT JOIN roles r ON s.role_id = r.id;
```

**Output Atteso:**
```
staff_name    | vecchio  | nuovo
--------------|----------|----------
Marco Rossi   | manager  | Manager
Giulia Bianch | waiter   | Cameriere
```

- ✅ **PASS**: Ogni staff ha `nuovo` (NOT NULL)
- ❌ **FAIL**: Qualche staff ha `nuovo = NULL`

---

### **TEST 2: Permission Checking Functions**

#### Test 2.1: staff_has_permission()

```sql
-- Sostituisci con ID di uno staff Manager
SELECT staff_has_permission(
  'STAFF_ID_QUI'::UUID,
  'orders.create'
) as can_create_orders;
```

**Output Atteso:**
```
can_create_orders
------------------
true
```

**Testa più permessi:**
```sql
SELECT
  'orders.create' as permission,
  staff_has_permission('STAFF_ID', 'orders.create') as has_permission
UNION ALL
SELECT
  'cassa.access',
  staff_has_permission('STAFF_ID', 'cassa.access')
UNION ALL
SELECT
  'settings.update',
  staff_has_permission('STAFF_ID', 'settings.update');
```

- ✅ **PASS**: Ritorna `true`/`false` correttamente
- ❌ **FAIL**: Errore o sempre `false`

---

#### Test 2.2: get_staff_permissions()

```sql
SELECT get_staff_permissions('STAFF_ID_QUI'::UUID);
```

**Output Atteso:**
```json
{
  "orders": {"create": true, "read": true, ...},
  "cassa": {"access": true, ...},
  ...
}
```

- ✅ **PASS**: Ritorna JSONB completo
- ❌ **FAIL**: Ritorna NULL o errore

---

### **TEST 3: Timeline Tracking**

#### Test 3.1: Nuove Colonne

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'order_timeline'
  AND column_name IN ('user_id', 'created_by_type', 'staff_role_display');
```

**Output Atteso:**
```
column_name
--------------------
created_by_type
staff_role_display
user_id
```

- ✅ **PASS**: 3 righe ritornate
- ❌ **FAIL**: Meno di 3 righe

---

#### Test 3.2: Timeline Popolate

```sql
SELECT
  o.order_number,
  ot.action,
  ot.created_by_type,
  ot.staff_role_display
FROM order_timeline ot
JOIN orders o ON ot.order_id = o.id
ORDER BY ot.created_at DESC
LIMIT 5;
```

**Output Atteso:**
```
order_number | action  | created_by_type | staff_role_display
-------------|---------|-----------------|-------------------
ORD-001      | created | staff           | Cameriere
ORD-001      | updated | staff           | Manager
ORD-002      | created | owner           | Admin
```

- ✅ **PASS**: `staff_role_display` popolato per ordini nuovi
- ⚠️  **OK**: NULL per ordini vecchi (creati prima migrazione)

---

#### Test 3.3: Trigger Auto-Population

**Crea ordine test dall'applicazione** (UI) oppure:

```sql
-- Inserisci timeline test
INSERT INTO order_timeline (
  order_id,
  action,
  staff_id
) VALUES (
  (SELECT id FROM orders LIMIT 1),
  'updated',
  (SELECT id FROM restaurant_staff LIMIT 1)
);

-- Verifica popolamento automatico
SELECT
  staff_name,
  staff_role_display,
  created_by_type
FROM order_timeline
WHERE action = 'updated'
ORDER BY created_at DESC
LIMIT 1;
```

**Output Atteso:**
```
staff_name   | staff_role_display | created_by_type
-------------|--------------------|-----------------
Marco Rossi  | Manager            | staff
```

- ✅ **PASS**: Campi popolati automaticamente dal trigger
- ❌ **FAIL**: Campi NULL

---

### **TEST 4: Analytics Views**

#### Test 4.1: Performance per Ruolo

```sql
SELECT
  role_name,
  orders_created,
  total_revenue,
  members_count
FROM v_role_performance_analytics
ORDER BY total_revenue DESC;
```

**Output Atteso:**
```
role_name  | orders_created | total_revenue | members_count
-----------|----------------|---------------|---------------
Manager    | 45             | 1250.50       | 2
Cameriere  | 38             | 890.00        | 5
```

- ✅ **PASS**: Dati aggregati per ruolo
- ❌ **FAIL**: Errore SQL

---

#### Test 4.2: KPI per Staff

```sql
SELECT
  staff_name,
  staff_role_display,
  orders_created,
  total_revenue,
  unique_tables_served
FROM v_staff_member_analytics
ORDER BY total_revenue DESC
LIMIT 10;
```

**Output Atteso:**
```
staff_name   | staff_role_display | orders_created | total_revenue | unique_tables_served
-------------|-----------------------|----------------|---------------|---------------------
Marco Rossi  | Manager               | 25             | 750.00        | 12
Giulia B.    | Cameriere             | 20             | 500.00        | 8
```

- ✅ **PASS**: KPI per singolo staff member
- ❌ **FAIL**: Errore SQL

---

### **TEST 5: Display Format UI**

#### Test 5.1: Verifica da Applicazione

1. **Apri l'applicazione** → Vai a dettaglio ordine
2. **Controlla sezione Timeline**

**Display Atteso:**

```
Timeline Ordine
---------------
✓ Ordine completato
  da Manager - Marco Rossi
  26 ott 2025, 17:35

✓ Ordine confermato
  da Cameriere - Giulia Bianchi
  26 ott 2025, 17:30

✓ Ordine creato
  da Admin - Vincenzo Cassese
  26 ott 2025, 17:25
```

**Formato corretto:**
- Staff/Owner: **"da [RUOLO] - [NOME COGNOME]"**
- Customer: **"Cliente Incognito"**
- System: **"Sistema"**

- ✅ **PASS**: Display formato corretto
- ❌ **FAIL**: Mostra solo nome o ruolo mancante

---

#### Test 5.2: Query Display Format

```sql
SELECT
  ot.action,
  COALESCE(
    ot.staff_role_display,
    ot.staff_name,
    CASE WHEN ot.created_by_type = 'customer' THEN 'Cliente Incognito' ELSE 'Sistema' END
  ) as display_text
FROM order_timeline ot
ORDER BY ot.created_at DESC
LIMIT 10;
```

**Output Atteso:**
```
action    | display_text
----------|-------------------------
completed | Manager - Marco Rossi
updated   | Cameriere - Giulia B.
created   | Admin - Vincenzo Cassese
```

- ✅ **PASS**: Display text formattato correttamente
- ❌ **FAIL**: Solo nome o NULL

---

## 📊 Checklist Finale

Dopo aver eseguito tutti i test, verifica:

- [ ] ✅ **Test 1.1**: Ogni ristorante ha 6 ruoli
- [ ] ✅ **Test 1.2**: Permessi ruoli corretti
- [ ] ✅ **Test 1.3**: Staff migrati con role_id
- [ ] ✅ **Test 2.1**: staff_has_permission() funziona
- [ ] ✅ **Test 2.2**: get_staff_permissions() ritorna JSONB
- [ ] ✅ **Test 3.1**: Nuove colonne timeline esistono
- [ ] ✅ **Test 3.2**: Timeline ordini popolate
- [ ] ✅ **Test 3.3**: Trigger auto-population funziona
- [ ] ✅ **Test 4.1-4.2**: Analytics views funzionano
- [ ] ✅ **Test 5.1-5.2**: Display format corretto in UI e query

---

## 🐛 Troubleshooting

### ❌ Test 1.1 FAIL: Meno di 6 ruoli

**Causa:** Script `populate_default_roles_all_restaurants.sql` non eseguito

**Soluzione:**
```sql
SELECT create_default_roles_for_restaurant('RESTAURANT_ID');
```

---

### ❌ Test 1.3 FAIL: Staff senza role_id

**Causa:** Script `migrate_existing_staff_to_roles.sql` non eseguito

**Soluzione:** Esegui il migration script

---

### ❌ Test 3.3 FAIL: Trigger non popola campi

**Causa:** Trigger non creato o staff senza role_id

**Soluzione:**
1. Verifica trigger esiste:
   ```sql
   SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_populate_timeline_staff_info';
   ```
2. Verifica staff ha role_id:
   ```sql
   SELECT id, name, role_id FROM restaurant_staff WHERE id = 'STAFF_ID';
   ```

---

### ❌ Test 5.1 FAIL: UI mostra solo nome

**Causa:** Cache browser o componenti non aggiornati

**Soluzione:**
1. Hard refresh: `Ctrl+Shift+R`
2. Verifica file JavaScript aggiornati:
   - `src/utils/orderTimeline.js`
   - `src/pages/OrderDetailPage.jsx`

---

## ✅ Risultato Atteso

**Sistema PASS se:**
- ✅ Tutti i test 1.x passano (setup corretto)
- ✅ Almeno test 2.1 passa (permission checking funziona)
- ✅ Test 3.3 passa (trigger funziona)
- ✅ Test 4.x passano (analytics views funzionano)
- ✅ Test 5.1 passa (UI mostra formato corretto)

**Sistema completamente operativo!** 🎉

---

## 📞 Prossimi Step

Dopo testing completato:

1. **Se tutti PASS:**
   - ✅ Sistema pronto per produzione
   - Continua con UI gestione ruoli custom (opzionale)

2. **Se qualche FAIL:**
   - ❌ Controlla troubleshooting
   - ❌ Verifica log Supabase per errori
   - ❌ Ri-esegui migration se necessario

---

## 📚 File Correlati

- [test_roles_system.sql](./test_roles_system.sql) - Script test completo
- [create_roles_system.sql](../migrations/create_roles_system.sql) - Migration principale
- [README_MIGRAZIONE_RUOLI.md](../migrations/README_MIGRAZIONE_RUOLI.md) - Guida migrazione

---

**Happy Testing!** 🧪
