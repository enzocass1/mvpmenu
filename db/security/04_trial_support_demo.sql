-- 1) Prova gratuita di 30 giorni per i nuovi ristoranti
-- 2) Ticket di assistenza (problemi e miglioramenti) dal ristoratore al super admin
-- 3) Richieste di demo dalla home page pubblica

-- ============================================================
-- 1) Nuovo ristorante: accesso completo per 30 giorni, poi vale la scadenza
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

  -- Webhook (service_role) e super admin: nessun vincolo
  IF coalesce(auth.role(), '') = 'service_role' OR is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Nuovo ristorante creato dal client: prova gratuita di 30 giorni con tutte le funzioni
    NEW.subscription_tier := 'premium';
    NEW.subscription_status := 'trialing';
    NEW.subscription_started_at := now();
    NEW.subscription_trial_ends_at := now() + interval '30 days';
    NEW.subscription_expires_at := now() + interval '30 days';
    NEW.subscription_plan_id := NULL;
    NEW.subscription_cancelled_at := NULL;
    NEW.subscription_ends_at := NULL;
    NEW.subscription_metadata := NULL;
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

-- ============================================================
-- 2) Ticket di assistenza
-- ============================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  type text NOT NULL CHECK (type IN ('problema', 'miglioramento')),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 3 AND 150),
  message text NOT NULL CHECK (char_length(message) BETWEEN 5 AND 5000),
  status text NOT NULL DEFAULT 'aperto' CHECK (status IN ('aperto', 'in_lavorazione', 'risolto')),
  admin_reply text,
  replied_at timestamptz,
  owner_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_restaurant ON support_tickets (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets (status, created_at DESC);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON support_tickets FROM anon;

DROP POLICY IF EXISTS st_owner_insert ON support_tickets;
CREATE POLICY st_owner_insert ON support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
    AND status = 'aperto' AND admin_reply IS NULL AND replied_at IS NULL
  );
DROP POLICY IF EXISTS st_owner_read ON support_tickets;
CREATE POLICY st_owner_read ON support_tickets
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS st_admin_all ON support_tickets;
CREATE POLICY st_admin_all ON support_tickets
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Il ristoratore segna come lette le risposte dei propri ticket
CREATE OR REPLACE FUNCTION support_tickets_mark_seen()
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE support_tickets SET owner_seen_at = now()
  WHERE restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
    AND admin_reply IS NOT NULL
    AND (owner_seen_at IS NULL OR owner_seen_at < replied_at);
$$;
GRANT EXECUTE ON FUNCTION support_tickets_mark_seen() TO authenticated;

CREATE OR REPLACE FUNCTION support_tickets_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.admin_reply IS DISTINCT FROM OLD.admin_reply AND NEW.admin_reply IS NOT NULL THEN
    NEW.replied_at := now();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_support_tickets_touch ON support_tickets;
CREATE TRIGGER trg_support_tickets_touch BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION support_tickets_touch();

-- ============================================================
-- 3) Richieste di demo (form pubblico della home)
-- ============================================================
CREATE TABLE IF NOT EXISTS demo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  business_name text CHECK (char_length(business_name) <= 150),
  email text NOT NULL CHECK (char_length(email) BETWEEN 5 AND 200 AND email LIKE '%@%.%'),
  phone text CHECK (char_length(phone) <= 40),
  city text CHECK (char_length(city) <= 120),
  message text CHECK (char_length(message) <= 3000),
  privacy_accepted boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'nuova' CHECK (status IN ('nuova', 'contattato', 'chiusa')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_demo_requests_created ON demo_requests (created_at DESC);

ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;

-- Chiunque puo' inviare una richiesta (solo inserimento, con consenso privacy)
DROP POLICY IF EXISTS dr_public_insert ON demo_requests;
CREATE POLICY dr_public_insert ON demo_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (privacy_accepted = true AND status = 'nuova' AND admin_notes IS NULL);
-- Solo il super admin legge e gestisce
DROP POLICY IF EXISTS dr_admin_all ON demo_requests;
CREATE POLICY dr_admin_all ON demo_requests
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());
