# 🚀 Guida Migrazione Sistema Ruoli

Istruzioni complete per eseguire la migrazione del sistema ruoli personalizzati.

---

## 📋 Prerequisiti

- Accesso a Supabase SQL Editor
- Backup del database (consigliato)
- Tempo stimato: 5-10 minuti

---

## 🔢 Procedura Step-by-Step

### **STEP 1: Esegui Migrazione Base**

1. Apri **Supabase Dashboard** → **SQL Editor**
2. Copia e incolla **tutto** il contenuto del file:
   ```
   database/migrations/create_roles_system.sql
   ```
3. Clicca **Run** (o premi `Ctrl+Enter`)

**Cosa fa:**
- Crea tabella `roles` per ruoli personalizzati
- Aggiunge colonne `user_id`, `created_by_type`, `staff_role_display` a `order_timeline`
- Crea trigger per auto-population
- Crea funzioni helper per permessi
- Crea views analytics

**Output atteso:**
```
NOTICE: Migration create_roles_system.sql completata con successo!
NOTICE: Prossimi step:
NOTICE: 1. Eseguire create_default_roles_for_restaurant() per ogni ristorante
NOTICE: 2. Eseguire migrate_staff_roles_to_new_system() per migrare staff esistenti
```

---

### **STEP 2: Popola Ruoli Default (AUTOMATICO)**

1. Sempre in **SQL Editor**, copia e incolla il file:
   ```
   database/migrations/populate_default_roles_all_restaurants.sql
   ```
2. Clicca **Run**

**Cosa fa:**
- Trova tutti i ristoranti nel database
- Per ognuno, crea i 6 ruoli di sistema:
  - ✅ **Admin** - Accesso completo
  - ✅ **Manager** - Gestione operativa
  - ✅ **Cameriere** - Ordini e tavoli
  - ✅ **Cuoco** - Visualizzazione cucina
  - ✅ **Barista** - Visualizzazione bar
  - ✅ **Cassiere** - Cassa e chiusura

**Output atteso:**
```
NOTICE: ========================================
NOTICE: Inizio popolamento ruoli default
NOTICE: Ristoranti totali: 3
NOTICE: ========================================
NOTICE: [1/3] Ristorante: La Dolce Vita (ID: abc-123...)
NOTICE:   ✅ Ruoli creati con successo
NOTICE: [2/3] Ristorante: Pizzeria Da Mario (ID: def-456...)
NOTICE:   ✅ Ruoli creati con successo
NOTICE: [3/3] Ristorante: Trattoria Rosa (ID: ghi-789...)
NOTICE:   ✅ Ruoli creati con successo
NOTICE: ========================================
NOTICE: Completato! Processati 3/3 ristoranti
NOTICE: ========================================
NOTICE: Verifica: Ruoli creati per ristorante
NOTICE: ----------------------------------------
NOTICE: La Dolce Vita → 6 ruoli: Admin, Manager, Cameriere, Cuoco, Barista, Cassiere
NOTICE: Pizzeria Da Mario → 6 ruoli: Admin, Manager, Cameriere, Cuoco, Barista, Cassiere
NOTICE: Trattoria Rosa → 6 ruoli: Admin, Manager, Cameriere, Cuoco, Barista, Cassiere
```

---

### **STEP 3: Migra Staff Esistenti (AUTOMATICO)**

1. Sempre in **SQL Editor**, copia e incolla il file:
   ```
   database/migrations/migrate_existing_staff_to_roles.sql
   ```
2. Clicca **Run**

**Cosa fa:**
- Trova tutti gli staff membri esistenti
- Assegna loro il ruolo corretto in base al vecchio campo `role_legacy`
- Mapping automatico:
  - `role_legacy = 'manager'` → Ruolo **Manager**
  - `role_legacy = 'waiter'` → Ruolo **Cameriere**
  - `role_legacy = 'cameriere'` → Ruolo **Cameriere**
  - Altro → Ruolo **Cameriere** (default)

**Output atteso:**
```
NOTICE: ========================================
NOTICE: Inizio migrazione staff esistenti
NOTICE: Staff da migrare: 8
NOTICE: ========================================

NOTICE: Staff: Marco Rossi (legacy role: manager)
NOTICE:   ✅ Migrato a role_id: abc-123...

NOTICE: Staff: Giulia Bianchi (legacy role: waiter)
NOTICE:   ✅ Migrato a role_id: def-456...

NOTICE: Staff: Luca Verdi (legacy role: cameriere)
NOTICE:   ✅ Migrato a role_id: def-456...

NOTICE: ========================================
NOTICE: Migrazione completata!
NOTICE: Staff migrati: 8
NOTICE: Staff saltati: 0
NOTICE: ========================================
NOTICE: Verifica: Staff per ruolo
NOTICE: ----------------------------------------
NOTICE: Manager → 2 persone: Marco Rossi, Anna Ferrari
NOTICE: Cameriere → 6 persone: Giulia Bianchi, Luca Verdi, ...
```

---

## ✅ Verifica Finale

Esegui questa query per verificare che tutto sia ok:

```sql
-- Verifica ruoli creati
SELECT
  r.name as ristorante,
  COUNT(ro.id) as num_ruoli,
  STRING_AGG(ro.display_name, ', ' ORDER BY ro.sort_order) as ruoli
FROM restaurants r
LEFT JOIN roles ro ON r.id = ro.restaurant_id
GROUP BY r.id, r.name
ORDER BY r.name;

-- Verifica staff migrati
SELECT
  s.name as staff_name,
  r.display_name as ruolo,
  s.role_legacy as vecchio_ruolo,
  res.name as ristorante
FROM restaurant_staff s
LEFT JOIN roles r ON s.role_id = r.id
LEFT JOIN restaurants res ON s.restaurant_id = res.id
ORDER BY res.name, r.sort_order;
```

**Risultato atteso:**
- Ogni ristorante deve avere **6 ruoli**
- Ogni staff deve avere un `ruolo` (non NULL)

---

## 🎯 Cosa Succede Dopo

Dopo la migrazione:

1. **Ordini Nuovi:**
   - Quando uno staff crea/modifica un ordine, la timeline mostrerà:
     - **"da Manager - Marco Rossi"** (invece di solo "Marco Rossi")
     - **"da Cameriere - Giulia Bianchi"**
   - Il trigger `populate_timeline_staff_info()` lo fa automaticamente

2. **Ordini Vecchi:**
   - Le timeline esistenti mostreranno solo il nome (es: "Marco Rossi")
   - NON vengono modificate (snapshot immutabile)

3. **Owner:**
   - Quando il proprietario fa azioni, verrà mostrato:
     - **"da Admin - Vincenzo Cassese"**

4. **Clienti:**
   - Ordini da clienti non registrati mostreranno:
     - **"Cliente Incognito"**

---

## 🔧 Troubleshooting

### Errore: "function create_default_roles_for_restaurant does not exist"

**Causa:** Non hai eseguito lo STEP 1
**Soluzione:** Esegui prima `create_roles_system.sql`

---

### Warning: "Nessun ruolo trovato per restaurant_id"

**Causa:** Un ristorante non ha i ruoli default
**Soluzione:** Esegui manualmente:

```sql
SELECT create_default_roles_for_restaurant('RESTAURANT_ID_QUI');
```

---

### Nessuno staff migrato (migrated_staff: 0)

**Causa:** Gli staff hanno già `role_id` impostato
**Soluzione:** Tutto ok, migrazione già completata in precedenza

---

## 📞 Supporto

In caso di problemi:
1. Controlla i log in Supabase SQL Editor (sezione "Messages")
2. Verifica che tutti e 3 gli step siano stati completati
3. Esegui le query di verifica finale

---

## 📚 File Correlati

- [create_roles_system.sql](./create_roles_system.sql) - Migrazione base (STEP 1)
- [populate_default_roles_all_restaurants.sql](./populate_default_roles_all_restaurants.sql) - Popola ruoli (STEP 2)
- [migrate_existing_staff_to_roles.sql](./migrate_existing_staff_to_roles.sql) - Migra staff (STEP 3)

---

**✅ Migrazione completata! Sistema ruoli operativo.**
