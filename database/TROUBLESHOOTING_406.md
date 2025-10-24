# RISOLUZIONE ERRORE 406 - Tabelle Fiscali

## Problema
Quando si accede alle Impostazioni Fiscali, l'API Supabase restituisce errore 406 (Not Acceptable) per le tabelle fiscali.

```
GET .../rt_configurations?select=*&restaurant_id=eq.... 406 (Not Acceptable)
```

## Causa Probabile
L'errore 406 indica che PostgREST (l'API auto-generata di Supabase) non riesce a servire le tabelle nel formato richiesto. Le cause più comuni sono:

1. **Schema cache non aggiornata** - PostgREST non ha ricaricato la cache dopo la creazione delle tabelle
2. **Tabelle non esposte nell'API** - Le tabelle non sono incluse negli "Exposed schemas" di Supabase
3. **Permessi mancanti** - I ruoli `authenticated` e `anon` non hanno i grant necessari
4. **RLS Policy conflittuali** - Anche se disabilitato, potrebbero esserci policy residue

## Soluzione Step-by-Step

### STEP 1: Esegui lo script di fix
Vai su **Supabase Dashboard → SQL Editor** e incolla tutto il contenuto di `fix_406_error.sql`:

```sql
-- Questo script:
-- 1. Verifica che le tabelle esistano
-- 2. Controlla lo stato RLS
-- 3. Garantisce i permessi ai ruoli
-- 4. Forza il reload della schema cache
-- 5. Testa le query
```

Esegui lo script e controlla l'output. Dovresti vedere:
- 9 tabelle nella lista "Tables Check"
- "rowsecurity" = false per tutte le tabelle
- Count di almeno 11 modelli RT in rt_models_catalog

### STEP 2: Verifica Exposed Schemas
1. Vai su **Supabase Dashboard → Settings → API**
2. Scorri fino a **"Exposed schemas"**
3. Verifica che ci sia `public` nella lista
4. Se non c'è, aggiungi `public` e salva

### STEP 3: Riavvia il progetto Supabase
Questo è il metodo più efficace per forzare PostgREST a ricaricare tutto:

1. Vai su **Settings → General**
2. Clicca **"Pause project"**
3. Attendi che lo stato diventi "Paused"
4. Clicca **"Resume project"**
5. Attendi qualche minuto che il progetto si riavvii completamente

### STEP 4: Test manuale API
Dopo il riavvio, testa l'API direttamente dal browser o Postman:

```
GET https://[tuo-progetto].supabase.co/rest/v1/rt_models_catalog?select=*
Headers:
  apikey: [tua-anon-key]
  Authorization: Bearer [tua-anon-key]
```

Se questo funziona, il problema è risolto.

### STEP 5: Verifica sulla pagina
1. Torna sull'app
2. Vai alla Dashboard
3. Clicca "Apri Impostazioni Fiscali"
4. Apri la Console del browser (F12)
5. Controlla se ci sono ancora errori 406

## Se l'errore persiste

### Opzione A: Ricrea le tabelle con un nome diverso
Potrebbe esserci un conflitto nascosto. Prova a ricreare con prefisso:

```sql
-- Rinomina tutte le tabelle
ALTER TABLE rt_configurations RENAME TO fiscal_rt_configurations;
ALTER TABLE tax_rates RENAME TO fiscal_tax_rates;
-- ... etc
```

Poi aggiorna FiscalSettings.jsx con i nuovi nomi.

### Opzione B: Verifica il progetto Supabase
1. Controlla se hai raggiunto limiti del piano gratuito
2. Verifica che non ci siano problemi di billing
3. Controlla lo status su status.supabase.com

### Opzione C: Usa la modalità direct (bypass PostgREST)
Modificare le query per usare `.rpc()` invece di `.from()`:

```sql
-- Crea una function
CREATE OR REPLACE FUNCTION get_rt_config(p_restaurant_id UUID)
RETURNS SETOF rt_configurations AS $$
  SELECT * FROM rt_configurations WHERE restaurant_id = p_restaurant_id;
$$ LANGUAGE SQL STABLE;
```

```javascript
// In FiscalSettings.jsx
const { data, error } = await supabase
  .rpc('get_rt_config', { p_restaurant_id: restaurant.id })
```

## Modifiche già applicate

Ho già modificato `FiscalSettings.jsx` per:
- ✅ Non crashare se l'API fallisce (graceful degradation)
- ✅ Loggare errori dettagliati in console
- ✅ Usare `.maybeSingle()` invece di `.single()` per evitare errori su record mancanti
- ✅ Continuare a funzionare anche con errori 406

Quindi la pagina ora si aprirà comunque, anche se non può caricare i dati. Vedrai i campi vuoti ma potrai comunque compilarli e provare a salvare.

## Test di verifica finale

Quando tutto funziona, dovresti poter:
1. ✅ Aprire Impostazioni Fiscali senza errori 406
2. ✅ Vedere la lista di modelli RT nella dropdown
3. ✅ Salvare la configurazione
4. ✅ Vedere i dati salvati ricaricando la pagina

## Contatti supporto
Se dopo tutti questi step l'errore persiste, potrebbe essere un bug di Supabase. Considera di:
- Aprire un ticket su support.supabase.com
- Chiedere nella Supabase Discord community
- Controllare se ci sono issue simili su github.com/supabase/supabase
