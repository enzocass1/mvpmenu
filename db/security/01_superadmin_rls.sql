-- Messa in sicurezza lato super-admin e abbonamenti.
-- 1) Il super admin è riconosciuto dal login Supabase (email presente in super_admins).
-- 2) RLS su tutte le tabelle che prima erano senza protezione.
-- 3) I campi abbonamento e allowed_nav dei ristoranti sono modificabili solo
--    da super admin, dal webhook Stripe (service_role) o da connessioni dirette al DB.

-- ============================================================
-- Funzioni di supporto
-- ============================================================

-- true se l'utente loggato (Supabase Auth) è un super admin attivo
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM super_admins sa
    WHERE lower(sa.email) = lower(coalesce(auth.jwt()->>'email', ''))
      AND sa.is_active
  );
$$;
GRANT EXECUTE ON FUNCTION is_super_admin() TO anon, authenticated;

-- Dati (non sensibili) del super admin loggato; aggiorna anche last_login_at.
CREATE OR REPLACE FUNCTION current_super_admin()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin super_admins%ROWTYPE;
BEGIN
  SELECT * INTO v_admin
  FROM super_admins
  WHERE lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    AND is_active;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE super_admins SET last_login_at = now() WHERE id = v_admin.id;

  RETURN json_build_object(
    'id', v_admin.id,
    'email', v_admin.email,
    'name', v_admin.name,
    'permissions', coalesce(v_admin.permissions, '["*"]'::jsonb)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION current_super_admin() TO authenticated;

-- ============================================================
-- super_admins: nessun accesso diretto dal client
-- ============================================================
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON super_admins FROM anon, authenticated;

-- ============================================================
-- super_admin_logs: solo super admin (lettura e scrittura)
-- ============================================================
ALTER TABLE super_admin_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON super_admin_logs FROM anon;
DROP POLICY IF EXISTS sa_logs_select ON super_admin_logs;
CREATE POLICY sa_logs_select ON super_admin_logs
  FOR SELECT TO authenticated USING (is_super_admin());
DROP POLICY IF EXISTS sa_logs_insert ON super_admin_logs;
CREATE POLICY sa_logs_insert ON super_admin_logs
  FOR INSERT TO authenticated WITH CHECK (is_super_admin());

-- ============================================================
-- subscription_plans: lettura pubblica (listino), scrittura solo super admin
-- ============================================================
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plans_public_read ON subscription_plans;
CREATE POLICY plans_public_read ON subscription_plans
  FOR SELECT USING (true);
DROP POLICY IF EXISTS plans_admin_write ON subscription_plans;
CREATE POLICY plans_admin_write ON subscription_plans
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- ============================================================
-- subscription_events: super admin tutto; il ristoratore legge i propri
-- ============================================================
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON subscription_events FROM anon;
DROP POLICY IF EXISTS se_admin_all ON subscription_events;
CREATE POLICY se_admin_all ON subscription_events
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS se_owner_read ON subscription_events;
CREATE POLICY se_owner_read ON subscription_events
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));

-- ============================================================
-- temporary_upgrades: super admin tutto; il ristoratore legge i propri
-- ============================================================
ALTER TABLE temporary_upgrades ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON temporary_upgrades FROM anon;
DROP POLICY IF EXISTS tu_admin_all ON temporary_upgrades;
CREATE POLICY tu_admin_all ON temporary_upgrades
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS tu_owner_read ON temporary_upgrades;
CREATE POLICY tu_owner_read ON temporary_upgrades
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));

-- ============================================================
-- restaurants: il super admin può tutto (in aggiunta alle policy esistenti)
-- ============================================================
DROP POLICY IF EXISTS rest_super_admin_all ON restaurants;
CREATE POLICY rest_super_admin_all ON restaurants
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- ============================================================
-- Trigger: i campi abbonamento/allowed_nav li cambia solo chi è autorizzato
-- (super admin, service_role del webhook Stripe, o connessione diretta al DB)
-- ============================================================
CREATE OR REPLACE FUNCTION protect_restaurant_admin_fields()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims text := current_setting('request.jwt.claims', true);
BEGIN
  -- Connessione diretta al DB (postgres/migrazioni): nessun vincolo
  IF v_claims IS NULL OR v_claims = '' THEN
    RETURN NEW;
  END IF;

  -- Webhook Stripe (service_role) e super admin: nessun vincolo
  IF coalesce(auth.role(), '') = 'service_role' OR is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Un nuovo ristorante creato dal client parte sempre dal piano free
    NEW.subscription_tier := 'free';
    NEW.allowed_nav := NULL;
    NEW.stripe_customer_id := NULL;
    NEW.stripe_subscription_id := NULL;
    RETURN NEW;
  END IF;

  -- UPDATE da utente normale: i campi riservati non devono cambiare
  IF NEW.subscription_tier        IS DISTINCT FROM OLD.subscription_tier
    OR NEW.subscription_status     IS DISTINCT FROM OLD.subscription_status
    OR NEW.subscription_plan_id    IS DISTINCT FROM OLD.subscription_plan_id
    OR NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at
    OR NEW.subscription_trial_ends_at IS DISTINCT FROM OLD.subscription_trial_ends_at
    OR NEW.subscription_cancelled_at  IS DISTINCT FROM OLD.subscription_cancelled_at
    OR NEW.subscription_ends_at    IS DISTINCT FROM OLD.subscription_ends_at
    OR NEW.subscription_started_at IS DISTINCT FROM OLD.subscription_started_at
    OR NEW.subscription_metadata   IS DISTINCT FROM OLD.subscription_metadata
    OR NEW.stripe_customer_id      IS DISTINCT FROM OLD.stripe_customer_id
    OR NEW.stripe_subscription_id  IS DISTINCT FROM OLD.stripe_subscription_id
    OR NEW.allowed_nav             IS DISTINCT FROM OLD.allowed_nav
  THEN
    RAISE EXCEPTION 'Campo riservato: modificabile solo dall''amministrazione';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_restaurant_admin_fields ON restaurants;
CREATE TRIGGER trg_protect_restaurant_admin_fields
  BEFORE INSERT OR UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION protect_restaurant_admin_fields();
