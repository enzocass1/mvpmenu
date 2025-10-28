/**
 * Migration 15: Trial Period e Upgrade Temporanei
 *
 * Aggiunge funzionalità per:
 * - Trial period configurabile per nuovi utenti
 * - Upgrade temporanei massivi (promozioni)
 * - Distinzione FREE trial vs FREE standard
 *
 * @version 15.0.0
 * @date 2025-10-27
 */

-- ============================================
-- 1. AGGIUNGI CAMPI TRIAL A SUBSCRIPTION_PLANS
-- ============================================

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS trial_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 14,
  ADD COLUMN IF NOT EXISTS trial_plan_id UUID REFERENCES subscription_plans(id);

-- Comments
COMMENT ON COLUMN subscription_plans.trial_enabled IS 'Se true, nuovi utenti ottengono trial automatico';
COMMENT ON COLUMN subscription_plans.trial_days IS 'Giorni di durata del trial period';
COMMENT ON COLUMN subscription_plans.trial_plan_id IS 'Piano da usare durante trial (es. Premium per provare funzionalità)';


-- ============================================
-- 2. AGGIUNGI TRACKING TRIAL A RESTAURANTS
-- ============================================

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS is_trial_used BOOLEAN DEFAULT false;

-- Comment
COMMENT ON COLUMN restaurants.is_trial_used IS 'True se utente ha già usato il trial period (evita abusi)';


-- ============================================
-- 3. CREA TABELLA TEMPORARY_UPGRADES
-- ============================================

CREATE TABLE IF NOT EXISTS temporary_upgrades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Target Restaurant
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,

  -- Piano Originale (per ripristino)
  original_plan_id UUID REFERENCES subscription_plans(id),
  original_status VARCHAR(50),

  -- Piano Temporaneo
  temporary_plan_id UUID NOT NULL REFERENCES subscription_plans(id),

  -- Durata
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Metadati
  reason TEXT, -- es: "Promozione Natale 2025", "Beta Testing Premium"
  created_by_admin_id UUID, -- Super Admin che ha creato l'upgrade

  -- Stato
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_temporary_upgrades_restaurant ON temporary_upgrades(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_temporary_upgrades_expires ON temporary_upgrades(expires_at);
CREATE INDEX IF NOT EXISTS idx_temporary_upgrades_active ON temporary_upgrades(is_active);
CREATE INDEX IF NOT EXISTS idx_temporary_upgrades_restaurant_active ON temporary_upgrades(restaurant_id, is_active);

-- Comments
COMMENT ON TABLE temporary_upgrades IS 'Upgrade temporanei per promozioni, beta testing o campagne marketing';
COMMENT ON COLUMN temporary_upgrades.restaurant_id IS 'Ristorante che riceve upgrade temporaneo';
COMMENT ON COLUMN temporary_upgrades.original_plan_id IS 'Piano originale da ripristinare alla scadenza';
COMMENT ON COLUMN temporary_upgrades.temporary_plan_id IS 'Piano temporaneo da applicare';
COMMENT ON COLUMN temporary_upgrades.reason IS 'Motivo upgrade (per tracking campagne)';
COMMENT ON COLUMN temporary_upgrades.is_active IS 'False quando upgrade è scaduto o annullato';


-- ============================================
-- 4. FUNZIONE: GET ACTIVE PLAN
-- ============================================

-- Funzione helper per ottenere il piano attivo considerando upgrade temporanei
CREATE OR REPLACE FUNCTION get_active_plan_for_restaurant(p_restaurant_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_temp_upgrade_plan_id UUID;
  v_current_plan_id UUID;
BEGIN
  -- 1. Controlla se c'è un upgrade temporaneo attivo
  SELECT temporary_plan_id INTO v_temp_upgrade_plan_id
  FROM temporary_upgrades
  WHERE restaurant_id = p_restaurant_id
    AND is_active = true
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  -- 2. Se c'è upgrade temporaneo, ritorna quello
  IF v_temp_upgrade_plan_id IS NOT NULL THEN
    RETURN v_temp_upgrade_plan_id;
  END IF;

  -- 3. Altrimenti ritorna piano corrente
  SELECT subscription_plan_id INTO v_current_plan_id
  FROM restaurants
  WHERE id = p_restaurant_id;

  RETURN v_current_plan_id;
END;
$$;

COMMENT ON FUNCTION get_active_plan_for_restaurant(UUID) IS 'Ritorna il piano attivo per un ristorante, considerando upgrade temporanei';


-- ============================================
-- 5. FUNZIONE: DOWNGRADE TO FREE
-- ============================================

-- Funzione per downgrade automatico a FREE quando scade trial/abbonamento
CREATE OR REPLACE FUNCTION downgrade_to_free(p_restaurant_id UUID, p_reason VARCHAR(100))
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_free_plan_id UUID;
BEGIN
  -- 1. Trova piano FREE
  SELECT id INTO v_free_plan_id
  FROM subscription_plans
  WHERE slug = 'free' AND is_active = true
  LIMIT 1;

  IF v_free_plan_id IS NULL THEN
    RAISE EXCEPTION 'Piano FREE non trovato';
  END IF;

  -- 2. Aggiorna ristorante
  UPDATE restaurants
  SET
    subscription_plan_id = v_free_plan_id,
    subscription_status = 'active', -- FREE è sempre "active"
    subscription_trial_ends_at = NULL,
    subscription_expires_at = NULL,
    updated_at = NOW()
  WHERE id = p_restaurant_id;

  -- 3. Log evento
  INSERT INTO subscription_events (
    restaurant_id,
    plan_id,
    event_type,
    event_data,
    created_at
  ) VALUES (
    p_restaurant_id,
    v_free_plan_id,
    'subscription.downgraded',
    jsonb_build_object('reason', p_reason, 'downgraded_at', NOW()),
    NOW()
  );
END;
$$;

COMMENT ON FUNCTION downgrade_to_free(UUID, VARCHAR) IS 'Downgrade automatico a piano FREE per trial/abbonamento scaduto';


-- ============================================
-- 6. FUNZIONE: RESTORE ORIGINAL PLAN
-- ============================================

-- Funzione per ripristinare piano originale dopo upgrade temporaneo
CREATE OR REPLACE FUNCTION restore_original_plan_after_temp_upgrade(p_upgrade_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_upgrade RECORD;
BEGIN
  -- 1. Recupera dati upgrade
  SELECT * INTO v_upgrade
  FROM temporary_upgrades
  WHERE id = p_upgrade_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Temporary upgrade % non trovato', p_upgrade_id;
  END IF;

  -- 2. Ripristina piano originale
  UPDATE restaurants
  SET
    subscription_plan_id = v_upgrade.original_plan_id,
    subscription_status = v_upgrade.original_status,
    updated_at = NOW()
  WHERE id = v_upgrade.restaurant_id;

  -- 3. Disattiva upgrade temporaneo
  UPDATE temporary_upgrades
  SET
    is_active = false,
    updated_at = NOW()
  WHERE id = p_upgrade_id;

  -- 4. Log evento
  INSERT INTO subscription_events (
    restaurant_id,
    plan_id,
    event_type,
    event_data,
    created_at
  ) VALUES (
    v_upgrade.restaurant_id,
    v_upgrade.original_plan_id,
    'subscription.temp_upgrade_expired',
    jsonb_build_object(
      'temporary_plan_id', v_upgrade.temporary_plan_id,
      'reason', v_upgrade.reason,
      'restored_at', NOW()
    ),
    NOW()
  );
END;
$$;

COMMENT ON FUNCTION restore_original_plan_after_temp_upgrade(UUID) IS 'Ripristina piano originale dopo scadenza upgrade temporaneo';


-- ============================================
-- 7. FUNZIONE: CHECK EXPIRED SUBSCRIPTIONS (CRON JOB)
-- ============================================

-- Funzione per controllare scadenze (da eseguire periodicamente)
CREATE OR REPLACE FUNCTION check_expired_subscriptions()
RETURNS TABLE(restaurant_id UUID, action VARCHAR, reason VARCHAR)
LANGUAGE plpgsql
AS $$
DECLARE
  v_expired_trial RECORD;
  v_expired_subscription RECORD;
  v_expired_temp_upgrade RECORD;
BEGIN
  -- 1. Controlla TRIAL scaduti
  FOR v_expired_trial IN
    SELECT id, subscription_trial_ends_at
    FROM restaurants
    WHERE subscription_status = 'trial'
      AND subscription_trial_ends_at < NOW()
  LOOP
    PERFORM downgrade_to_free(v_expired_trial.id, 'trial_expired');
    RETURN QUERY SELECT v_expired_trial.id, 'downgrade_from_trial'::VARCHAR, 'Trial period expired'::VARCHAR;
  END LOOP;

  -- 2. Controlla ABBONAMENTI scaduti
  FOR v_expired_subscription IN
    SELECT id, subscription_expires_at
    FROM restaurants
    WHERE subscription_status IN ('active', 'trial')
      AND subscription_expires_at IS NOT NULL
      AND subscription_expires_at < NOW()
  LOOP
    PERFORM downgrade_to_free(v_expired_subscription.id, 'subscription_expired');
    RETURN QUERY SELECT v_expired_subscription.id, 'downgrade_from_paid'::VARCHAR, 'Subscription expired'::VARCHAR;
  END LOOP;

  -- 3. Controlla UPGRADE TEMPORANEI scaduti
  FOR v_expired_temp_upgrade IN
    SELECT id
    FROM temporary_upgrades
    WHERE is_active = true
      AND expires_at < NOW()
  LOOP
    PERFORM restore_original_plan_after_temp_upgrade(v_expired_temp_upgrade.id);
    RETURN QUERY SELECT
      (SELECT restaurant_id FROM temporary_upgrades WHERE id = v_expired_temp_upgrade.id),
      'restore_from_temp_upgrade'::VARCHAR,
      'Temporary upgrade expired'::VARCHAR;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION check_expired_subscriptions() IS 'Controlla e gestisce scadenze trial, abbonamenti e upgrade temporanei';


-- ============================================
-- 8. DATI ESEMPIO (OPZIONALE)
-- ============================================

-- Esempio: Configurare trial sul piano FREE
-- UPDATE subscription_plans
-- SET
--   trial_enabled = true,
--   trial_days = 14,
--   trial_plan_id = (SELECT id FROM subscription_plans WHERE slug = 'premium' LIMIT 1)
-- WHERE slug = 'free';


-- ============================================
-- FINE MIGRATION
-- ============================================

-- Log migration (opzionale - commenta se la tabella migrations_log non esiste)
-- INSERT INTO migrations_log (version, description, executed_at)
-- VALUES ('15.0.0', 'Added trial period and temporary upgrades system', NOW());
