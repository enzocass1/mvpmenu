# ⚡ Quick Start - Test Sistema Ruoli (2 minuti)

Guida rapidissima per testare il sistema ruoli in 2 minuti.

---

## 🚀 Opzione 1: Test Automatico SQL (1 minuto)

### 1. Apri Supabase SQL Editor
Dashboard → SQL Editor

### 2. Copia/Incolla questo script:
```
database/testing/test_roles_system.sql
```

### 3. Clicca Run
Guarda l'output per:
- ✅ PASS → Sistema OK
- ❌ FAIL → Guarda troubleshooting

**Fatto!** ✅

---

## 🖥️ Opzione 2: Test UI Applicazione (1 minuto)

### 1. Apri l'applicazione
```
npm run dev
```

### 2. Crea un ordine
- Login come owner o staff
- Crea un ordine al tavolo
- Conferma ordine

### 3. Vai a dettaglio ordine
- Scorri fino a "Timeline Ordine"
- Verifica display:

**✅ CORRETTO:**
```
✓ Ordine confermato
  da Manager - Marco Rossi
  26 ott 2025, 17:35
```

**❌ SBAGLIATO:**
```
✓ Ordine confermato
  Marco Rossi  (manca ruolo)
  26 ott 2025, 17:35
```

**Fatto!** ✅

---

## 🔍 Opzione 3: Verifica Veloce (30 secondi)

### Query super-veloce in Supabase:

```sql
-- Controlla ruoli creati
SELECT
  r.name,
  COUNT(ro.id) as ruoli
FROM restaurants r
LEFT JOIN roles ro ON r.id = ro.restaurant_id
GROUP BY r.name;
```

**Output atteso:**
```
name           | ruoli
---------------|------
La Dolce Vita  | 6
Pizzeria Mario | 6
```

✅ **PASS** se ogni ristorante ha 6 ruoli

---

## 📊 Cosa Testo Esattamente?

### Test SQL Automatico verifica:
- ✅ 6 ruoli per ristorante (Admin, Manager, Cameriere, Cuoco, Barista, Cassiere)
- ✅ Permessi ruoli corretti (Admin tutto, Manager quasi tutto, Cameriere limitato)
- ✅ Staff migrati con `role_id`
- ✅ Funzioni `staff_has_permission()` e `get_staff_permissions()` funzionano
- ✅ Colonne timeline (`user_id`, `created_by_type`, `staff_role_display`) esistono
- ✅ Trigger auto-population funziona
- ✅ Analytics views funzionano

### Test UI verifica:
- ✅ Display timeline: **"da [RUOLO] - [NOME COGNOME]"**
- ✅ Ordini creati mostrano chi li ha creati con ruolo

---

## 🎯 Risultato Atteso

Dopo test:

**✅ SISTEMA OK** se:
- Tutti i test SQL passano (✅ PASS)
- UI mostra timeline con ruolo + nome

**❌ PROBLEMA** se:
- Qualche test SQL fallisce (❌ FAIL)
- UI mostra solo nome senza ruolo

---

## 🐛 Fix Rapidi

### Problema: Ruoli mancanti
```sql
-- Crea ruoli per ristorante
SELECT create_default_roles_for_restaurant('RESTAURANT_ID');
```

### Problema: Staff senza role_id
Ri-esegui:
```
database/migrations/migrate_existing_staff_to_roles.sql
```

### Problema: UI non mostra ruoli
Hard refresh: `Ctrl+Shift+R`

---

## 📚 Documentazione Completa

Se vuoi test dettagliati → [README_TEST_RUOLI.md](./README_TEST_RUOLI.md)

---

**Testing completato in 2 minuti! 🚀**
