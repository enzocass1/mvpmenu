# Sistema di Scadenza Automatica - Implementazione Completa

## 📋 Panoramica

Sistema completo per gestire automaticamente la scadenza di:
- **Trial Periods** - Periodi di prova che scadono automaticamente
- **Temporary Upgrades** - Upgrade temporanei che ripristinano il piano originale alla scadenza

## ✅ Stato Implementazione

**Completato il:** 2024-11-04
**Status:** ✅ Pronto per l'uso

### Componenti Implementati:

1. ✅ **Migration 18** - Funzioni PostgreSQL per scadenze automatiche
2. ✅ **Servizio Frontend** - Metodo `manuallyExpireSubscriptions()`
3. ✅ **UI Button** - Pulsante nella Super Admin Dashboard
4. ✅ **Documentazione** - Guida setup completa
5. ⏳ **Cron Job** - Da configurare (opzionale)

---

## 🗄️ Database (Migration 18)

### File
`database/migrations/18_auto_expire_subscriptions.sql`

### Funzioni Create:

#### 1. `expire_trial_periods()`
Trova e scade tutti i trial periods scaduti:
- Imposta `subscription_status = 'expired'`
- Aggiorna `updated_at`
- Ritorna JSON con conteggio e lista ristoranti scaduti

```sql
SELECT expire_trial_periods();
```

**Output:**
```json
{
  "success": true,
  "expired_count": 2,
  "expired_restaurants": [
    {
      "id": "uuid...",
      "name": "Ristorante A",
      "trial_ended_at": "2024-11-01T00:00:00Z"
    }
  ],
  "executed_at": "2024-11-04T10:00:00Z"
}
```

#### 2. `expire_temporary_upgrades()`
Trova e scade gli upgrade temporanei scaduti:
- Ripristina `subscription_plan_id` al piano originale
- Imposta `subscription_status = 'active'`
- Rimuove `subscription_expires_at`
- Marca l'upgrade come `is_active = false`

```sql
SELECT expire_temporary_upgrades();
```

**Output:**
```json
{
  "success": true,
  "expired_count": 1,
  "expired_upgrades": [
    {
      "id": "uuid...",
      "restaurant_name": "Ristorante B",
      "original_plan": "Free",
      "temporary_plan": "Premium",
      "expired_at": "2024-11-03T22:00:00Z"
    }
  ],
  "executed_at": "2024-11-04T10:00:00Z"
}
```

#### 3. `expire_all_subscriptions()` (MASTER)
Funzione master che chiama entrambe le funzioni sopra:

```sql
SELECT expire_all_subscriptions();
```

**Output:**
```json
{
  "success": true,
  "trial_periods": { /* risultato expire_trial_periods() */ },
  "temporary_upgrades": { /* risultato expire_temporary_upgrades() */ },
  "executed_at": "2024-11-04T10:00:00Z"
}
```

### Caratteristiche Importanti:
- ✅ **SECURITY DEFINER** - Bypassa RLS per permettere aggiornamenti
- ✅ **Transazionale** - Tutte le operazioni in una transazione
- ✅ **Idempotente** - Può essere eseguita più volte senza problemi
- ✅ **Logging** - RAISE NOTICE per ogni operazione

---

## 🔧 Frontend Service

### File
`src/services/subscriptionManagementService.js`

### Metodo Aggiunto:

```javascript
/**
 * Manually trigger expiration of all subscriptions
 */
async manuallyExpireSubscriptions() {
  const { data, error } = await supabase
    .rpc('expire_all_subscriptions')

  if (error) throw error

  return {
    success: true,
    data
  }
}
```

### Utilizzo:
```javascript
import subscriptionManagementService from './services/subscriptionManagementService'

const result = await subscriptionManagementService.manuallyExpireSubscriptions()

console.log(`Trial scaduti: ${result.data.trial_periods.expired_count}`)
console.log(`Upgrade scaduti: ${result.data.temporary_upgrades.expired_count}`)
```

---

## 🖥️ Super Admin Dashboard

### File
`src/pages/superadmin/SuperAdminDashboard.jsx`

### Pulsante Aggiunto:

**Posizione:** Sezione "Azioni Rapide"
**Stile:** Outline arancione
**Icona:** ⏰

**Funzionalità:**
1. Click → Mostra conferma con dettagli operazione
2. Esegue `manuallyExpireSubscriptions()`
3. Mostra alert con risultati:
   - Trial scaduti
   - Upgrade scaduti
   - Piani ripristinati
4. Ricarica automaticamente la dashboard

**Stati:**
- Normale: "⏰ Esegui Scadenze"
- Loading: "⏳ Esecuzione..."
- Disabilitato durante l'esecuzione

### Screenshot Funzionalità:
```
+------------------------------------------+
| Azioni Rapide                            |
+------------------------------------------+
| [Gestisci Piani] [CRM Ristoranti]       |
| [Analytics] [⏰ Esegui Scadenze]         |
+------------------------------------------+
```

**Conferma:**
```
⏰ Eseguire scadenza manuale di trial periods e upgrade temporanei?

Questa operazione:
- Scade i trial periods scaduti
- Scade gli upgrade temporanei scaduti
- Ripristina i piani originali

[Annulla] [OK]
```

**Risultato:**
```
✅ Scadenza completata con successo!

🔍 Trial Periods:
   - Scaduti: 2

🚀 Upgrade Temporanei:
   - Scaduti: 1
   - Piani ripristinati: 1

[OK]
```

---

## 🤖 Automazione (Da Configurare)

### Opzione 1: pg_cron (Supabase Pro)

**Setup:** Vedi `database/docs/EXPIRATION_SETUP_GUIDE.md`

```sql
-- Abilita pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedula job ogni ora
SELECT cron.schedule(
  'expire-subscriptions-hourly',
  '0 * * * *',
  $$SELECT expire_all_subscriptions();$$
);
```

**Verifica job:**
```sql
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

### Opzione 2: External Cron (Piano Free)

**Servizi Gratuiti:**
- **cron-job.org** - 3 job gratuiti, affidabile
- **GitHub Actions** - Se il progetto è su GitHub
- **Vercel Cron** - Se usi Vercel

**Setup con Edge Function:**
1. Crea Edge Function in Supabase
2. Configura external cron per chiamare l'URL
3. Usa Authorization header per sicurezza

**Dettagli:** Vedi `database/docs/EXPIRATION_SETUP_GUIDE.md`

### Opzione 3: Manual (Current)

**Status:** ✅ Già implementato
**Metodo:** Pulsante in Super Admin Dashboard
**Consigliato come:** Backup + testing

---

## 🧪 Testing

### Test Manuale da Supabase SQL Editor:

```sql
-- Test funzione trial
SELECT expire_trial_periods();

-- Test funzione upgrade
SELECT expire_temporary_upgrades();

-- Test funzione master
SELECT expire_all_subscriptions();
```

### Test da Super Admin Dashboard:

1. Apri Super Admin Dashboard
2. Vai alla sezione "Azioni Rapide"
3. Clicca "⏰ Esegui Scadenze"
4. Conferma l'operazione
5. Verifica risultati nell'alert

### Test Script (Opzionale):

```bash
node scripts/testExpirationSimple.js
```

**Nota:** Richiede connessione di rete funzionante

---

## 📊 Monitoring

### Query Utili:

**Trial Periods Scaduti di Recente:**
```sql
SELECT id, name, subscription_status, subscription_trial_ends_at, updated_at
FROM restaurants
WHERE subscription_status = 'expired'
  AND subscription_trial_ends_at < NOW()
ORDER BY updated_at DESC
LIMIT 10;
```

**Temporary Upgrades Scaduti di Recente:**
```sql
SELECT
  tu.id,
  r.name as restaurant_name,
  tu.is_active,
  tu.expires_at,
  tu.updated_at,
  op.name as original_plan,
  tp.name as temporary_plan
FROM temporary_upgrades tu
JOIN restaurants r ON r.id = tu.restaurant_id
LEFT JOIN subscription_plans op ON op.id = tu.original_plan_id
LEFT JOIN subscription_plans tp ON tp.id = tu.temporary_plan_id
WHERE tu.is_active = false
  AND tu.expires_at < NOW()
ORDER BY tu.updated_at DESC
LIMIT 10;
```

**Trial Attivi in Scadenza:**
```sql
SELECT
  id,
  name,
  subscription_trial_ends_at,
  EXTRACT(DAY FROM subscription_trial_ends_at - NOW()) as days_remaining
FROM restaurants
WHERE subscription_status = 'trial'
  AND subscription_trial_ends_at > NOW()
ORDER BY subscription_trial_ends_at ASC;
```

**Temporary Upgrades Attivi in Scadenza:**
```sql
SELECT
  r.name as restaurant_name,
  tu.expires_at,
  EXTRACT(DAY FROM tu.expires_at - NOW()) as days_remaining,
  op.name as original_plan,
  tp.name as temporary_plan
FROM temporary_upgrades tu
JOIN restaurants r ON r.id = tu.restaurant_id
LEFT JOIN subscription_plans op ON op.id = tu.original_plan_id
LEFT JOIN subscription_plans tp ON tp.id = tu.temporary_plan_id
WHERE tu.is_active = true
  AND tu.expires_at > NOW()
ORDER BY tu.expires_at ASC;
```

---

## 🎯 Raccomandazioni

### Per Produzione:
1. ✅ **Configura pg_cron** (se hai piano Pro)
   - Frequenza consigliata: Ogni ora
   - Alternative: Ogni 6 ore o giornalmente a mezzanotte
2. ✅ **Mantieni il pulsante manuale** come backup
3. ✅ **Monitora i log** per verificare esecuzioni corrette
4. ✅ **Configura notifiche** per i ristoranti prima della scadenza (TODO futuro)

### Per Sviluppo/Free Plan:
1. ✅ **Usa il pulsante manuale** nella dashboard
2. ✅ **Configura GitHub Actions** per automazione base
3. ✅ **Testa regolarmente** con il pulsante manuale

### Sicurezza:
- ✅ Funzioni usano SECURITY DEFINER (già sicuro)
- ✅ Solo Super Admin può accedere al pulsante (già protetto da route)
- ⚠️ Se usi external cron: USA Authorization header con secret

---

## 📁 File Correlati

### Database:
- `database/migrations/18_auto_expire_subscriptions.sql` - Migration principale
- `database/migrations/15_trial_and_temporary_upgrades.sql` - Tabelle trial e upgrades
- `database/migrations/17_super_admin_temp_upgrade_function.sql` - Funzione applicazione upgrade

### Frontend:
- `src/services/subscriptionManagementService.js` - Servizio gestione subscription
- `src/pages/superadmin/SuperAdminDashboard.jsx` - Dashboard con pulsante

### Scripts:
- `scripts/testExpirationSimple.js` - Test script (opzionale)
- `scripts/applyExpirationMigration.js` - Script apply migration (alternativo)

### Documentazione:
- `database/docs/EXPIRATION_SETUP_GUIDE.md` - Guida setup dettagliata
- `TRIAL_AND_TEMPORARY_UPGRADES_SPEC.md` - Spec originale del sistema
- `AUTO_EXPIRATION_SYSTEM.md` - Questo documento

---

## ⚙️ Configurazione Timezone

**Importante:** Le funzioni usano il fuso orario del database (di default UTC).

**Per vedere il timezone corrente:**
```sql
SHOW timezone;
```

**Per cambiare timezone (se necessario):**
```sql
ALTER DATABASE postgres SET timezone TO 'Europe/Rome';
```

**Note:**
- Tutti i timestamp sono salvati in UTC
- La conversione avviene solo per la visualizzazione
- I confronti con `NOW()` sono sempre in timezone del database

---

## 🔄 Workflow Completo

### 1. Trial Period Expires:
```
Restaurant Trial Ends
       ↓
[Automatic/Manual Trigger]
       ↓
expire_trial_periods()
       ↓
subscription_status = 'expired'
       ↓
User sees trial expired banner
       ↓
User upgrades to paid plan
```

### 2. Temporary Upgrade Expires:
```
Temporary Upgrade Expires
       ↓
[Automatic/Manual Trigger]
       ↓
expire_temporary_upgrades()
       ↓
Restore original_plan_id
subscription_status = 'active'
is_active = false
       ↓
User sees original plan features
Banner disappears
```

---

## 🚀 Next Steps (Opzionali)

1. **Email Notifications** (TODO futuro)
   - Notifica ristoranti 3 giorni prima scadenza trial
   - Notifica 1 giorno prima scadenza temporary upgrade
   - Email di conferma post-scadenza

2. **Analytics Dashboard** (TODO futuro)
   - Grafico conversioni trial → paid
   - Tasso di rinnovo dopo temporary upgrade
   - Revenue impact di temporary upgrades

3. **Auto-renewal Logic** (TODO futuro)
   - Opzione per auto-rinnovare temporary upgrades
   - Estensione automatica trial in casi speciali

---

## 📞 Support

Per problemi o domande:
1. Verifica i log della console browser (F12)
2. Controlla i risultati delle query SQL in Supabase
3. Usa il pulsante manuale per testare
4. Consulta `database/docs/EXPIRATION_SETUP_GUIDE.md`

---

**Implementato da:** Claude Code
**Data:** 2024-11-04
**Versione:** 1.0
**Status:** ✅ Production Ready
