# 🔴 ERRORE 530 + CORS - Progetto Supabase Non Attivo

## Cosa Significa

L'errore è cambiato da **406** a **530 + CORS**:

```
GET .../tax_rates ... net::ERR_FAILED 530
Access to fetch ... has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header
```

Questo significa che il **progetto Supabase NON è attivo** o è in uno stato problematico.

## Cause Possibili

### 1. Progetto in Pausa ⏸️
Il progetto potrebbe essere stato messo in pausa automaticamente da Supabase per:
- Inattività prolungata (piano free)
- Superamento limiti del piano gratuito
- Manutenzione programmata

### 2. Crediti Esauriti / Billing 💳
Anche i progetti free hanno limiti:
- Database size
- Bandwidth mensile
- Numero di richieste API

### 3. Errore di Configurazione 🔧
Dopo modifiche recenti al database, il progetto potrebbe essere in stato inconsistente.

## SOLUZIONE IMMEDIATA

### STEP 1: Vai su Supabase Dashboard
https://supabase.com/dashboard/project/nfpgqvnfmypeyrlplqem

### STEP 2: Controlla lo Stato del Progetto

Guarda in alto a destra, vicino al nome del progetto. Dovresti vedere uno di questi stati:

#### ✅ Se vedi: "Active" (verde)
Il progetto è attivo. Vai allo STEP 3.

#### ⏸️ Se vedi: "Paused" (giallo)
Il progetto è in pausa. Fai:
1. Clicca sul pulsante **"Resume project"**
2. Attendi 2-3 minuti
3. Ricarica l'app (Ctrl+F5)

#### ⚠️ Se vedi: "Inactive" o altro
C'è un problema. Vai alla sezione Billing per verificare.

### STEP 3: Verifica Limiti Piano Free

Vai su **Settings → Billing → Usage**:

Controlla che NON hai superato:
- ✅ **Database size**: < 500 MB
- ✅ **Bandwidth**: < 5 GB/mese
- ✅ **Storage**: < 1 GB
- ✅ **Realtime connections**: < 200 concurrent

Se hai superato un limite, devi:
- Fare pulizia del database, oppure
- Fare upgrade al piano Pro

### STEP 4: Controlla Health del Progetto

Vai su **Settings → General → Project Health**:

Se ci sono problemi, vedrai avvisi in rosso. Segui le istruzioni di Supabase per risolverli.

### STEP 5: Verifica API Settings

Vai su **Settings → API**:

1. Controlla che **"Enable API"** sia attivo
2. Verifica che il campo **"API URL"** corrisponda a:
   ```
   https://nfpgqvnfmypeyrlplqem.supabase.co
   ```
3. Verifica che nelle **"Allowed origins"** ci sia:
   ```
   https://mvpmenu20.vercel.app
   ```
   oppure `*` (asterisco = tutte le origini)

Se manca il tuo dominio Vercel, aggiungilo e salva.

## Test Manuale API

Apri una nuova tab del browser e vai su:

```
https://nfpgqvnfmypeyrlplqem.supabase.co/rest/v1/
```

### ✅ Se vedi JSON con versione API
Il progetto è attivo e l'API risponde.

### ❌ Se vedi errore 530 o timeout
Il progetto NON è attivo. Devi riattivarlo dalla dashboard.

## Dopo la Riattivazione

Una volta che il progetto è di nuovo "Active":

1. **Attendi 1-2 minuti** che tutti i servizi si riavviino completamente
2. **Ricarica l'app** con Ctrl+F5 (hard reload)
3. **Testa le Impostazioni Fiscali** - dovrebbe funzionare

## Se il Problema Persiste

### Verifica Supabase Client

Il tuo [supabaseClient.js](../src/supabaseClient.js) deve avere:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nfpgqvnfmypeyrlplqem.supabase.co'
const supabaseAnonKey = 'eyJh...' // La tua anon key

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

Se l'URL o la key sono sbagliati, correggi e rebuilda.

### Rebuilda e Rideploya Vercel

Se hai modificato configurazioni:

```bash
npm run build
vercel --prod
```

## Contatti Supporto

Se nulla funziona:
- Supporto Supabase: https://supabase.com/dashboard/support/new
- Status page: https://status.supabase.com
- Discord: https://discord.supabase.com

## TL;DR (Riassunto Veloce)

1. ✅ Vai su Supabase Dashboard
2. ✅ Controlla se progetto è "Active" (se no, riattivalo)
3. ✅ Verifica limiti piano free non superati
4. ✅ Verifica API settings ha il dominio Vercel
5. ✅ Attendi 2 minuti dopo riattivazione
6. ✅ Testa l'app con Ctrl+F5
