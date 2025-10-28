# Sistema Trial Period e Upgrade Temporanei - Specifica Tecnica

**Data**: 2025-10-27
**Versione**: 1.0.0
**Stato**: In progettazione

---

## 🎯 OBIETTIVO

Implementare un sistema flessibile che permetta di:

1. **Trial Period Configurabile**: Dare ai nuovi utenti X giorni di prova con funzionalità premium
2. **Upgrade Temporanei**: Dare upgrade temporanei a utenti specifici o tutti gli utenti
3. **Distinzione FREE Trial vs FREE Standard**: Diversificare tra utente nuovo (trial) e utente downgraded

---

## 📋 REQUISITI FUNZIONALI

### 1. Trial Period alla Registrazione

**User Story**:
> Come Super Admin, voglio configurare quanti giorni di trial offrire ai nuovi utenti, permettendogli di usare funzionalità di piani superiori per un periodo limitato.

**Comportamento**:
1. Nuovo utente si registra
2. Sistema assegna automaticamente:
   - `subscription_plan_id` → Piano FREE (o configurato)
   - `subscription_status` → `'trial'`
   - `subscription_trial_ends_at` → NOW() + X giorni (configurabile)
3. Durante trial: utente ha accesso a funzionalità del "trial plan" configurato
4. Alla scadenza trial:
   - Se NON ha pagato → downgrade a FREE standard
   - Se ha pagato → passa a piano a pagamento

**Configurazione Super Admin**:
- Campo: `trial_days` (INTEGER) - Giorni di trial
- Campo: `trial_plan_id` (UUID) - Piano da usare durante trial (es. Premium)
- Campo: `trial_enabled` (BOOLEAN) - Abilita/disabilita trial

---

### 2. Distinzione FREE Trial vs FREE Standard

**Scenari**:

#### Scenario A: Nuovo Utente (FREE Trial)
```
Registrazione → FREE Trial (es. 14 giorni con funzionalità Premium)
              ↓
Scadenza → FREE Standard (funzionalità base)
```

#### Scenario B: Utente Downgraded (FREE Standard)
```
Premium (pagato) → Non paga → FREE Standard (funzionalità base)
```

**Differenze**:
- **FREE Trial**:
  - `subscription_status = 'trial'`
  - Accesso a funzionalità premium per X giorni
  - Banner: "Prova gratuita - restano X giorni"

- **FREE Standard**:
  - `subscription_status = 'active'` o `'expired'`
  - `subscription_plan_id` → Piano FREE base
  - Solo funzionalità base
  - Banner: "Passa a Premium per sbloccare funzionalità"

---

### 3. Upgrade Temporanei Massivi

**User Story**:
> Come Super Admin, voglio dare un upgrade temporaneo a tutti gli utenti (o a specifici utenti) per X giorni, ad esempio durante una promozione.

**Esempi d'uso**:
- Promozione Natale: tutti i ristoranti hanno Premium per 7 giorni
- Beta testing: dare Premium a 10 ristoranti selezionati per 30 giorni
- Riattivazione: dare upgrade a utenti inattivi per 14 giorni

**Comportamento**:
1. Super Admin seleziona:
   - Target: "Tutti" o "Specifici ristoranti"
   - Piano temporaneo: es. Premium
   - Durata: X giorni
2. Sistema crea record in `temporary_upgrades` table
3. Durante upgrade temporaneo:
   - Utente vede il piano temporaneo
   - Ha accesso alle funzionalità del piano
   - Banner: "Promozione attiva - restano X giorni"
4. Alla scadenza:
   - Sistema ripristina piano originale
   - Rimuove record da `temporary_upgrades`

---

## 🗄️ SCHEMA DATABASE

### Nuova Tabella: temporary_upgrades

```sql
CREATE TABLE IF NOT EXISTS temporary_upgrades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Target
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,

  -- Piano originale (per ripristino)
  original_plan_id UUID REFERENCES subscription_plans(id),
  original_status VARCHAR(50),

  -- Piano temporaneo
  temporary_plan_id UUID REFERENCES subscription_plans(id) NOT NULL,

  -- Durata
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Metadati
  reason TEXT, -- es: "Promozione Natale", "Beta Testing"
  created_by_admin_id UUID, -- Super Admin che ha creato

  -- Stato
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_temporary_upgrades_restaurant ON temporary_upgrades(restaurant_id);
CREATE INDEX idx_temporary_upgrades_expires ON temporary_upgrades(expires_at);
CREATE INDEX idx_temporary_upgrades_active ON temporary_upgrades(is_active);
```

### Modifiche Tabella: subscription_plans

Aggiungere campi per configurazione trial:

```sql
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS trial_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 14,
  ADD COLUMN IF NOT EXISTS trial_plan_id UUID REFERENCES subscription_plans(id);

COMMENT ON COLUMN subscription_plans.trial_enabled IS 'Se true, nuovi utenti ottengono trial';
COMMENT ON COLUMN subscription_plans.trial_days IS 'Giorni di trial period';
COMMENT ON COLUMN subscription_plans.trial_plan_id IS 'Piano da usare durante trial (es. Premium)';
```

### Modifiche Tabella: restaurants

Aggiungere campo per tracking trial:

```sql
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS is_trial_used BOOLEAN DEFAULT false;

COMMENT ON COLUMN restaurants.is_trial_used IS 'True se utente ha già usato trial period';
```

---

## 🔧 LOGICA IMPLEMENTAZIONE

### 1. Registrazione Nuovo Utente

```javascript
async function registerRestaurant(data) {
  // 1. Crea ristorante
  const restaurant = await createRestaurant(data)

  // 2. Controlla se trial è abilitato
  const freePlan = await getFreePlan()

  if (freePlan.trial_enabled && freePlan.trial_plan_id) {
    // 3. Assegna trial
    await assignTrialToRestaurant(restaurant.id, {
      plan_id: freePlan.trial_plan_id,
      trial_days: freePlan.trial_days,
      trial_ends_at: new Date(Date.now() + freePlan.trial_days * 24 * 60 * 60 * 1000)
    })

    // 4. Aggiorna ristorante
    await updateRestaurant(restaurant.id, {
      subscription_plan_id: freePlan.trial_plan_id,
      subscription_status: 'trial',
      subscription_trial_ends_at: trial_ends_at,
      is_trial_used: true
    })
  } else {
    // Nessun trial: assegna FREE standard
    await updateRestaurant(restaurant.id, {
      subscription_plan_id: freePlan.id,
      subscription_status: 'active'
    })
  }
}
```

### 2. Controllo Accesso Funzionalità

```javascript
async function hasFeatureAccess(restaurantId, featureKey) {
  const restaurant = await getRestaurant(restaurantId)

  // 1. Controlla upgrade temporaneo attivo
  const tempUpgrade = await getActiveTemporaryUpgrade(restaurantId)
  if (tempUpgrade && tempUpgrade.expires_at > new Date()) {
    // Usa piano temporaneo
    const plan = await getPlan(tempUpgrade.temporary_plan_id)
    return plan.features.includes(featureKey)
  }

  // 2. Controlla trial attivo
  if (restaurant.subscription_status === 'trial') {
    if (restaurant.subscription_trial_ends_at > new Date()) {
      // Trial attivo: usa piano trial
      const plan = await getPlan(restaurant.subscription_plan_id)
      return plan.features.includes(featureKey)
    } else {
      // Trial scaduto: downgrade a FREE
      await downgradeToFree(restaurantId)
      return false
    }
  }

  // 3. Usa piano normale
  const plan = await getPlan(restaurant.subscription_plan_id)
  return plan.features.includes(featureKey)
}
```

### 3. Downgrade Automatico (Cron Job)

```javascript
async function checkExpiredSubscriptions() {
  const now = new Date()

  // 1. Controlla trial scaduti
  const expiredTrials = await supabase
    .from('restaurants')
    .select('*')
    .eq('subscription_status', 'trial')
    .lt('subscription_trial_ends_at', now.toISOString())

  for (const restaurant of expiredTrials.data) {
    await downgradeToFree(restaurant.id, 'trial_expired')
  }

  // 2. Controlla upgrade temporanei scaduti
  const expiredUpgrades = await supabase
    .from('temporary_upgrades')
    .select('*')
    .eq('is_active', true)
    .lt('expires_at', now.toISOString())

  for (const upgrade of expiredUpgrades.data) {
    await restoreOriginalPlan(upgrade.restaurant_id, upgrade)
  }

  // 3. Controlla abbonamenti scaduti
  const expiredSubscriptions = await supabase
    .from('restaurants')
    .select('*')
    .in('subscription_status', ['active', 'trial'])
    .not('subscription_expires_at', 'is', null)
    .lt('subscription_expires_at', now.toISOString())

  for (const restaurant of expiredSubscriptions.data) {
    await downgradeToFree(restaurant.id, 'subscription_expired')
  }
}
```

### 4. Creazione Upgrade Temporaneo

```javascript
async function createTemporaryUpgrade(data) {
  const {
    target, // 'all' | 'specific' | ['restaurant_id1', 'restaurant_id2']
    temporary_plan_id,
    duration_days,
    reason
  } = data

  // 1. Determina ristoranti target
  let restaurantIds = []
  if (target === 'all') {
    const { data } = await supabase.from('restaurants').select('id')
    restaurantIds = data.map(r => r.id)
  } else if (Array.isArray(target)) {
    restaurantIds = target
  }

  // 2. Per ogni ristorante, crea upgrade temporaneo
  const expires_at = new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000)

  for (const restaurantId of restaurantIds) {
    const restaurant = await getRestaurant(restaurantId)

    // Salva stato originale
    await supabase.from('temporary_upgrades').insert({
      restaurant_id: restaurantId,
      original_plan_id: restaurant.subscription_plan_id,
      original_status: restaurant.subscription_status,
      temporary_plan_id,
      expires_at,
      reason,
      is_active: true
    })

    // Applica upgrade
    await supabase.from('restaurants').update({
      subscription_plan_id: temporary_plan_id,
      subscription_status: 'active',
      subscription_expires_at: expires_at
    }).eq('id', restaurantId)

    // Log evento
    await logSubscriptionEvent(restaurantId, temporary_plan_id, 'subscription.temporary_upgrade', {
      reason,
      duration_days,
      expires_at
    })
  }
}
```

---

## 🎨 UI/UX SUPER ADMIN

### 1. Gestisci Piani - Sezione Trial

Aggiungere in PlansManagement.jsx una sezione per configurare trial:

```jsx
<Card>
  <h3>Configurazione Trial Period</h3>

  <Toggle
    label="Abilita Trial per nuovi utenti"
    checked={trialEnabled}
    onChange={setTrialEnabled}
  />

  {trialEnabled && (
    <>
      <Input
        type="number"
        label="Durati trial (giorni)"
        value={trialDays}
        onChange={setTrialDays}
      />

      <Select
        label="Piano da usare durante trial"
        value={trialPlanId}
        onChange={setTrialPlanId}
      >
        {plans.map(plan => (
          <option value={plan.id}>{plan.name}</option>
        ))}
      </Select>
    </>
  )}

  <Button onClick={saveTrialConfig}>Salva Configurazione</Button>
</Card>
```

### 2. CRM - Pulsante Upgrade Temporaneo

Aggiungere in RestaurantsManagement.jsx:

```jsx
<Button
  variant="primary"
  onClick={openTemporaryUpgradeModal}
>
  Crea Upgrade Temporaneo
</Button>

{/* Modal */}
<Modal open={showUpgradeModal}>
  <h2>Crea Upgrade Temporaneo</h2>

  <Select label="Target">
    <option value="all">Tutti i ristoranti</option>
    <option value="filtered">Ristoranti filtrati ({filteredCount})</option>
    <option value="selected">Ristoranti selezionati ({selectedCount})</option>
  </Select>

  <Select label="Piano temporaneo" value={tempPlanId}>
    {plans.map(plan => (
      <option value={plan.id}>{plan.name}</option>
    ))}
  </Select>

  <Input
    type="number"
    label="Durata (giorni)"
    value={durationDays}
  />

  <TextArea
    label="Motivo (opzionale)"
    value={reason}
    placeholder="es: Promozione Natale 2025"
  />

  <Button onClick={createTemporaryUpgrade}>
    Crea Upgrade
  </Button>
</Modal>
```

### 3. Dashboard Ristorante - Banner Trial/Upgrade

Aggiungere in DashboardLayout.jsx:

```jsx
{/* Trial Banner */}
{subscription.status === 'trial' && (
  <Alert variant="info">
    🎉 Prova gratuita attiva! Ti restano {daysLeft} giorni per provare {planName}.
    <Button onClick={goToUpgrade}>Passa a Premium</Button>
  </Alert>
)}

{/* Temporary Upgrade Banner */}
{hasTemporaryUpgrade && (
  <Alert variant="success">
    🎁 Promozione attiva! Hai accesso a {planName} fino al {expiresAt}.
    Approfitta delle funzionalità premium!
  </Alert>
)}
```

---

## 📊 METRICHE DA TRACCIARE

### KPI Trial
- Tasso conversione trial → pagamento
- Durata media utilizzo trial
- Feature più usate durante trial
- Abbandono durante trial

### KPI Upgrade Temporanei
- Numero upgrade temporanei attivi
- Tasso conversione post-upgrade
- ROI campagne promozionali

---

## ✅ CHECKLIST IMPLEMENTAZIONE

### Database
- [ ] Creare tabella `temporary_upgrades`
- [ ] Aggiungere campi trial a `subscription_plans`
- [ ] Aggiungere `is_trial_used` a `restaurants`
- [ ] Creare indici per performance

### Backend (Services)
- [ ] `assignTrialToRestaurant()` - Assegna trial a nuovo utente
- [ ] `downgradeToFree()` - Downgrade a FREE standard
- [ ] `createTemporaryUpgrade()` - Crea upgrade temporaneo
- [ ] `restoreOriginalPlan()` - Ripristina piano originale
- [ ] `getActiveTemporaryUpgrade()` - Recupera upgrade attivo
- [ ] `checkExpiredSubscriptions()` - Cron job scadenze

### Frontend (UI)
- [ ] Sezione Trial in PlansManagement
- [ ] Modal Upgrade Temporaneo in CRM
- [ ] Banner Trial in Dashboard ristorante
- [ ] Banner Upgrade Temporaneo in Dashboard
- [ ] Badge "Trial" e "Promo" dove necessario

### Testing
- [ ] Test registrazione con trial
- [ ] Test scadenza trial
- [ ] Test upgrade temporaneo singolo
- [ ] Test upgrade temporaneo massivo
- [ ] Test downgrade automatico
- [ ] Test ripristino piano originale

---

## 🚧 EDGE CASES

### 1. Utente in Trial riceve Upgrade Temporaneo
**Scenario**: Utente in trial riceve upgrade temporaneo a piano superiore.

**Comportamento**:
- Upgrade temporaneo ha priorità su trial
- Alla scadenza upgrade → ritorna a trial (se ancora valido) o FREE

### 2. Utente Premium riceve Downgrade
**Scenario**: Utente premium non paga e riceve downgrade mentre ha upgrade temporaneo attivo.

**Comportamento**:
- Upgrade temporaneo rimane attivo fino alla scadenza
- Alla scadenza → vai a FREE (non a Premium)

### 3. Trial già utilizzato
**Scenario**: Utente aveva già usato trial in passato e crea nuovo account.

**Comportamento**:
- Flag `is_trial_used = true` impedisce nuovo trial
- Assegna direttamente FREE standard

---

## 📝 MIGRATION SCRIPT

```sql
-- Migration: Add Trial and Temporary Upgrades
-- Version: 1.1.0
-- Date: 2025-10-27

-- 1. Add trial configuration to subscription_plans
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS trial_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 14,
  ADD COLUMN IF NOT EXISTS trial_plan_id UUID REFERENCES subscription_plans(id);

-- 2. Add trial tracking to restaurants
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS is_trial_used BOOLEAN DEFAULT false;

-- 3. Create temporary_upgrades table
CREATE TABLE IF NOT EXISTS temporary_upgrades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  original_plan_id UUID REFERENCES subscription_plans(id),
  original_status VARCHAR(50),
  temporary_plan_id UUID REFERENCES subscription_plans(id) NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_by_admin_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes
CREATE INDEX idx_temporary_upgrades_restaurant ON temporary_upgrades(restaurant_id);
CREATE INDEX idx_temporary_upgrades_expires ON temporary_upgrades(expires_at);
CREATE INDEX idx_temporary_upgrades_active ON temporary_upgrades(is_active);

-- 5. Comments
COMMENT ON TABLE temporary_upgrades IS 'Upgrade temporanei per promozioni/beta testing';
COMMENT ON COLUMN subscription_plans.trial_enabled IS 'Se true, nuovi utenti ottengono trial';
COMMENT ON COLUMN subscription_plans.trial_days IS 'Giorni di trial period';
COMMENT ON COLUMN subscription_plans.trial_plan_id IS 'Piano da usare durante trial';
COMMENT ON COLUMN restaurants.is_trial_used IS 'True se utente ha già usato trial period';
```

---

**Fine Specifica** - Ultimo aggiornamento: 2025-10-27
