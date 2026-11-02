-- Pagamenti abbonamento via bonifico, registrati a mano dal super admin.
-- Ogni riga estende la scadenza (restaurants.subscription_expires_at).
-- Il ristoratore vede solo i propri pagamenti (sola lettura).

CREATE TABLE IF NOT EXISTS subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  months integer NOT NULL DEFAULT 1,
  paid_at date NOT NULL DEFAULT CURRENT_DATE,
  previous_expires_at timestamptz,
  new_expires_at timestamptz NOT NULL,
  method text NOT NULL DEFAULT 'bonifico',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_restaurant
  ON subscription_payments (restaurant_id, paid_at DESC);

ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON subscription_payments FROM anon;

DROP POLICY IF EXISTS sp_admin_all ON subscription_payments;
CREATE POLICY sp_admin_all ON subscription_payments
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS sp_owner_read ON subscription_payments;
CREATE POLICY sp_owner_read ON subscription_payments
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));
