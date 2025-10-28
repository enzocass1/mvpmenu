# Guida Setup Sistema di Scadenza Automatica

Questa guida spiega come configurare l'esecuzione automatica delle funzioni di scadenza per trial periods e temporary upgrades.

## 📋 Panoramica

Il sistema di scadenza automatica è composto da 3 funzioni PostgreSQL (create nella Migration 18):

1. **`expire_trial_periods()`** - Scade i trial periods scaduti
2. **`expire_temporary_upgrades()`** - Scade gli upgrade temporanei e ripristina i piani originali
3. **`expire_all_subscriptions()`** - Funzione master che chiama entrambe

## 🎯 Opzioni di Setup

### **Opzione 1: pg_cron (Consigliata per Supabase Pro)**

pg_cron è un'estensione PostgreSQL che permette di schedulare job direttamente nel database.

#### Requisiti:
- Piano Supabase **Pro** o superiore
- Accesso al SQL Editor di Supabase

#### Setup:

1. **Verifica se pg_cron è disponibile:**
   ```sql
   SELECT * FROM pg_available_extensions WHERE name = 'pg_cron';
   ```

2. **Abilita l'estensione:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

3. **Schedula il job (Opzione A - Ogni ora):**
   ```sql
   SELECT cron.schedule(
     'expire-subscriptions-hourly',
     '0 * * * *',  -- Ogni ora al minuto 0
     $$SELECT expire_all_subscriptions();$$
   );
   ```

4. **Oppure schedula giornalmente (Opzione B - Mezzanotte):**
   ```sql
   SELECT cron.schedule(
     'expire-subscriptions-daily',
     '0 0 * * *',  -- Ogni giorno a mezzanotte (UTC)
     $$SELECT expire_all_subscriptions();$$
   );
   ```

5. **Verifica i job schedulati:**
   ```sql
   SELECT * FROM cron.job;
   ```

6. **Controlla la storia delle esecuzioni:**
   ```sql
   SELECT * FROM cron.job_run_details
   ORDER BY start_time DESC
   LIMIT 10;
   ```

7. **Rimuovere un job (se necessario):**
   ```sql
   SELECT cron.unschedule('expire-subscriptions-hourly');
   ```

---

### **Opzione 2: Supabase Edge Function (Consigliata per piano Free)**

Le Edge Functions sono funzioni serverless che possono essere schedulate esternamente.

#### Setup:

1. **Crea una Edge Function:**

   ```bash
   # Installa Supabase CLI
   npm install -g supabase

   # Crea la funzione
   supabase functions new expire-subscriptions
   ```

2. **Modifica `supabase/functions/expire-subscriptions/index.ts`:**

   ```typescript
   import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

   serve(async (req) => {
     try {
       // Verifica autorizzazione (optional - usa un secret)
       const authHeader = req.headers.get('Authorization')
       if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
         return new Response('Unauthorized', { status: 401 })
       }

       // Crea client Supabase
       const supabase = createClient(
         Deno.env.get('SUPABASE_URL') ?? '',
         Deno.env.get('SUPABASE_ANON_KEY') ?? ''
       )

       // Esegui la funzione di expiration
       const { data, error } = await supabase
         .rpc('expire_all_subscriptions')

       if (error) throw error

       return new Response(
         JSON.stringify({
           success: true,
           ...data
         }),
         {
           headers: { 'Content-Type': 'application/json' },
           status: 200
         }
       )
     } catch (error) {
       return new Response(
         JSON.stringify({ error: error.message }),
         {
           headers: { 'Content-Type': 'application/json' },
           status: 500
         }
       )
     }
   })
   ```

3. **Deploy la funzione:**
   ```bash
   supabase functions deploy expire-subscriptions
   ```

4. **Configura un cron esterno per chiamare la funzione:**

   Usa un servizio gratuito come:
   - **cron-job.org** (gratuito, affidabile)
   - **GitHub Actions** (se il progetto è su GitHub)
   - **Vercel Cron Jobs** (se usi Vercel)

   Esempio con **cron-job.org**:
   - URL: `https://YOUR_PROJECT.supabase.co/functions/v1/expire-subscriptions`
   - Header: `Authorization: Bearer YOUR_CRON_SECRET`
   - Schedule: `0 * * * *` (ogni ora)

---

### **Opzione 3: GitHub Actions (Se il progetto è su GitHub)**

Crea `.github/workflows/expire-subscriptions.yml`:

```yaml
name: Expire Subscriptions

on:
  schedule:
    # Ogni ora al minuto 0 (UTC)
    - cron: '0 * * * *'
  workflow_dispatch: # Permette esecuzione manuale

jobs:
  expire:
    runs-on: ubuntu-latest
    steps:
      - name: Call expiration function
        run: |
          curl -X POST \
            'https://YOUR_PROJECT.supabase.co/functions/v1/expire-subscriptions' \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

**Setup:**
1. Vai su GitHub repo → Settings → Secrets
2. Aggiungi `CRON_SECRET` con un valore segreto
3. Commit il workflow file

---

### **Opzione 4: Esecuzione Manuale dalla Dashboard Super Admin**

Se non puoi configurare cron automatico, aggiungi un pulsante nella dashboard Super Admin.

**1. Crea funzione nel servizio:**

`src/services/subscriptionManagementService.js`:

```javascript
/**
 * Manually trigger expiration of all subscriptions
 */
export async function manuallyExpireSubscriptions() {
  try {
    const { data, error } = await supabase
      .rpc('expire_all_subscriptions')

    if (error) throw error

    return {
      success: true,
      data
    }
  } catch (error) {
    console.error('❌ Error expiring subscriptions:', error)
    throw error
  }
}
```

**2. Aggiungi bottone in Super Admin Dashboard:**

```jsx
import { manuallyExpireSubscriptions } from '../../services/subscriptionManagementService'

// ...

const [isExpiring, setIsExpiring] = useState(false)

const handleExpireNow = async () => {
  if (!confirm('Eseguire scadenza manuale di trial e upgrade temporanei?')) {
    return
  }

  setIsExpiring(true)
  try {
    const result = await manuallyExpireSubscriptions()

    alert(`✅ Scadenza completata!\n\nTrial scaduti: ${result.data.trial_periods.expired_count}\nUpgrade scaduti: ${result.data.temporary_upgrades.expired_count}`)

    // Ricarica la lista dei ristoranti
    loadRestaurants()
  } catch (error) {
    alert('❌ Errore durante la scadenza: ' + error.message)
  } finally {
    setIsExpiring(false)
  }
}

// Nel render:
<Button
  variant="outline"
  onClick={handleExpireNow}
  disabled={isExpiring}
>
  {isExpiring ? 'Esecuzione...' : '⏰ Esegui Scadenze Manualmente'}
</Button>
```

---

## 🧪 Test Manuale

Puoi sempre testare manualmente le funzioni da Supabase SQL Editor:

```sql
-- Test singole funzioni
SELECT expire_trial_periods();
SELECT expire_temporary_upgrades();

-- Test funzione master
SELECT expire_all_subscriptions();
```

Il risultato sarà un JSON con:
```json
{
  "success": true,
  "trial_periods": {
    "expired_count": 0,
    "expired_restaurants": []
  },
  "temporary_upgrades": {
    "expired_count": 1,
    "expired_upgrades": [
      {
        "id": "...",
        "restaurant_name": "...",
        "original_plan": "Free",
        "temporary_plan": "Premium",
        "expired_at": "2024-11-03T22:40:16.123Z"
      }
    ]
  },
  "executed_at": "2024-11-04T10:00:00.123Z"
}
```

---

## 📊 Monitoring

### Controlla l'ultima esecuzione:

```sql
-- Controlla ristoranti con trial scaduti
SELECT id, name, subscription_status, subscription_trial_ends_at, updated_at
FROM restaurants
WHERE subscription_status = 'expired'
  AND subscription_trial_ends_at < NOW()
ORDER BY updated_at DESC
LIMIT 10;

-- Controlla upgrade temporanei scaduti
SELECT
  tu.id,
  r.name as restaurant_name,
  tu.is_active,
  tu.expires_at,
  tu.updated_at
FROM temporary_upgrades tu
JOIN restaurants r ON r.id = tu.restaurant_id
WHERE tu.is_active = false
  AND tu.expires_at < NOW()
ORDER BY tu.updated_at DESC
LIMIT 10;
```

---

## 🎯 Raccomandazioni

1. **Per Produzione:** Usa **pg_cron** (Opzione 1) se hai piano Pro
2. **Per Sviluppo/Free:** Usa **GitHub Actions** (Opzione 3) o **cron-job.org** (Opzione 2)
3. **Come Backup:** Aggiungi il bottone manuale (Opzione 4) in Super Admin Dashboard
4. **Frequenza:** Esegui **ogni ora** o almeno **una volta al giorno** a mezzanotte

---

## ⚠️ Note Importanti

- Le funzioni usano `SECURITY DEFINER` per bypassare RLS
- Tutte le operazioni sono transazionali
- Le funzioni ritornano sempre un JSON con i risultati
- Gli errori vengono loggati ma non bloccano l'intera esecuzione
- Il fuso orario usato è **UTC** (considera questo quando scheduli i job)

---

## 🔗 File Correlati

- **Migration:** `database/migrations/18_auto_expire_subscriptions.sql`
- **Test Script:** `scripts/testExpirationSimple.js`
- **Service:** `src/services/subscriptionManagementService.js`
