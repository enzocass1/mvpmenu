BEGIN;

-- Correzioni dei problemi segnalati dal Security Advisor di Supabase (mail del 31/10/2026).
--   1) auth_users_exposed: la vista restaurants_with_user_emails mostrava a chiunque le email dei titolari
--   2) rls_disabled_in_public: 15 tabelle leggibili e modificabili da chiunque
--   3) security_definer_view: viste che scavalcavano le protezioni delle tabelle
--   4) funzioni sensibili eseguibili senza login (upgrade piano, scadenze, magazzino, config fiscale)

-- ============ 1) email dei titolari: solo il super admin, tramite funzione ============
DROP VIEW IF EXISTS restaurants_with_user_emails;

CREATE OR REPLACE FUNCTION super_admin_list_restaurants()
RETURNS TABLE (
  id uuid, name text, subdomain text, created_at timestamptz, updated_at timestamptz,
  subscription_status text, subscription_started_at timestamptz, subscription_expires_at timestamptz,
  subscription_trial_ends_at timestamptz, subscription_cancelled_at timestamptz, subscription_metadata jsonb,
  user_id uuid, subscription_plan_id uuid, is_trial_used boolean,
  plan_name text, plan_slug text, plan_price_monthly numeric, plan_price_yearly numeric, plan_currency text, plan_is_legacy boolean,
  owner_email text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Solo il super admin';
  END IF;
  RETURN QUERY
  SELECT r.id, r.name::text, r.subdomain::text, r.created_at, r.updated_at,
    r.subscription_status::text, r.subscription_started_at, r.subscription_expires_at,
    r.subscription_trial_ends_at, r.subscription_cancelled_at, r.subscription_metadata::jsonb,
    r.user_id, r.subscription_plan_id, r.is_trial_used,
    sp.name::text, sp.slug::text, sp.price_monthly::numeric, sp.price_yearly::numeric, sp.currency::text, sp.is_legacy,
    coalesce(au.email, 'N/A')::text
  FROM restaurants r
  LEFT JOIN subscription_plans sp ON r.subscription_plan_id = sp.id
  LEFT JOIN auth.users au ON r.user_id = au.id
  ORDER BY r.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION super_admin_list_restaurants() FROM public, anon;
GRANT EXECUTE ON FUNCTION super_admin_list_restaurants() TO authenticated;

-- ============ 2) protezione a livello di riga sulle 15 tabelle ============
-- (titolare = proprietario del ristorante della riga; super admin = tutto)

-- Ruoli dello staff: leggibili (l'app staff li legge con il proprio login, senza sessione Supabase),
-- modificabili solo dal titolare o dal super admin
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_roles_read ON staff_roles;
CREATE POLICY staff_roles_read ON staff_roles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS staff_roles_owner ON staff_roles;
CREATE POLICY staff_roles_owner ON staff_roles FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()))
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS staff_roles_admin ON staff_roles;
CREATE POLICY staff_roles_admin ON staff_roles FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

ALTER TABLE staff_role_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sra_read ON staff_role_assignments;
CREATE POLICY sra_read ON staff_role_assignments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS sra_owner ON staff_role_assignments;
CREATE POLICY sra_owner ON staff_role_assignments FOR ALL TO authenticated
  USING (staff_id IN (SELECT s.id FROM restaurant_staff s JOIN restaurants r ON r.id = s.restaurant_id WHERE r.user_id = auth.uid()))
  WITH CHECK (staff_id IN (SELECT s.id FROM restaurant_staff s JOIN restaurants r ON r.id = s.restaurant_id WHERE r.user_id = auth.uid()));
DROP POLICY IF EXISTS sra_admin ON staff_role_assignments;
CREATE POLICY sra_admin ON staff_role_assignments FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Tabelle del ristorante: solo il titolare e il super admin
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['subscriptions', 'rt_configurations', 'tax_rates', 'payment_methods', 'fiscal_receipts',
                           'fiscal_closures', 'rt_communication_logs', 'loyalty_tiers'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_owner', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO authenticated
      USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()))
      WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()))', t || '_owner', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_admin', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin())', t || '_admin', t);
  END LOOP;
END $$;

-- Aliquote e metodi di pagamento "di sistema" (senza ristorante): leggibili dai titolari
DROP POLICY IF EXISTS tax_rates_global_read ON tax_rates;
CREATE POLICY tax_rates_global_read ON tax_rates FOR SELECT TO authenticated USING (restaurant_id IS NULL);
DROP POLICY IF EXISTS payment_methods_global_read ON payment_methods;
CREATE POLICY payment_methods_global_read ON payment_methods FOR SELECT TO authenticated USING (restaurant_id IS NULL);

-- Righe e pagamenti degli scontrini: seguono lo scontrino
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fiscal_receipt_items', 'fiscal_receipt_payments'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_owner', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO authenticated
      USING (receipt_id IN (SELECT fr.id FROM fiscal_receipts fr JOIN restaurants r ON r.id = fr.restaurant_id WHERE r.user_id = auth.uid()))
      WITH CHECK (receipt_id IN (SELECT fr.id FROM fiscal_receipts fr JOIN restaurants r ON r.id = fr.restaurant_id WHERE r.user_id = auth.uid()))', t || '_owner', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_admin', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin())', t || '_admin', t);
  END LOOP;
END $$;

-- Cataloghi comuni: leggibili, modificabili solo dal super admin
ALTER TABLE rt_models_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rt_models_read ON rt_models_catalog;
CREATE POLICY rt_models_read ON rt_models_catalog FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS rt_models_admin ON rt_models_catalog;
CREATE POLICY rt_models_admin ON rt_models_catalog FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS feature_flags_read ON feature_flags;
CREATE POLICY feature_flags_read ON feature_flags FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS feature_flags_admin ON feature_flags;
CREATE POLICY feature_flags_admin ON feature_flags FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Statistiche degli abbonamenti (di tutta la piattaforma): solo super admin
ALTER TABLE revenue_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS revenue_analytics_admin ON revenue_analytics;
CREATE POLICY revenue_analytics_admin ON revenue_analytics FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- ============ 3) viste: rispettano le protezioni di chi le interroga ============
DO $$
DECLARE v text;
BEGIN
  FOR v IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relkind = 'v'
             AND NOT coalesce('security_invoker=true' = ANY (c.reloptions) OR 'security_invoker=on' = ANY (c.reloptions), false) LOOP
    EXECUTE format('ALTER VIEW %I SET (security_invoker = true)', v);
  END LOOP;
END $$;

-- ============ 4) funzioni sensibili ============
-- Usate dal pannello super admin: controllo interno "solo il super admin" (le attività del database, come
-- pg_cron, girano come postgres e restano permesse)
DO $$
DECLARE f text; d text;
BEGIN
  FOREACH f IN ARRAY ARRAY['super_admin_apply_temp_upgrade', 'expire_all_subscriptions'] LOOP
    SELECT pg_get_functiondef(p.oid) INTO d FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = f;
    IF d IS NOT NULL AND d !~ 'Solo il super admin' THEN
      d := regexp_replace(d, E'\\nBEGIN[ \\t\\r]*\\n',
        E'\nBEGIN\n  IF NOT is_super_admin() AND session_user NOT IN (''postgres'', ''supabase_admin'') THEN\n    RAISE EXCEPTION ''Solo il super admin'';\n  END IF;\n');
      IF d !~ 'Solo il super admin' THEN RAISE EXCEPTION 'Impossibile aggiungere il controllo a %', f; END IF;
      EXECUTE d;
    END IF;
  END LOOP;
END $$;
ALTER FUNCTION super_admin_apply_temp_upgrade(uuid, uuid, timestamptz) SET search_path = public;
ALTER FUNCTION expire_all_subscriptions() SET search_path = public;
REVOKE ALL ON FUNCTION super_admin_apply_temp_upgrade(uuid, uuid, timestamptz) FROM public, anon;
REVOKE ALL ON FUNCTION expire_all_subscriptions() FROM public, anon;
GRANT EXECUTE ON FUNCTION super_admin_apply_temp_upgrade(uuid, uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION expire_all_subscriptions() TO authenticated;

-- Solo uso interno (trigger, pg_cron, altre funzioni del database): nessun accesso dall'esterno
REVOKE ALL ON FUNCTION expire_temporary_upgrades() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION expire_trial_periods() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION release_due_batches() FROM public, anon, authenticated;
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname IN ('inv_apply', 'upsert_rt_config') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM public, anon, authenticated', r.sig);
  END LOOP;
  -- Usate dal titolare (hanno già il controllo sul proprietario): niente accesso senza login
  FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname IN ('inv_manual_adjust', 'inv_set_tracking', 'support_tickets_mark_seen',
                                                        'check_expired_subscriptions', 'downgrade_to_free', 'restore_original_plan_after_temp_upgrade') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM public, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;

COMMIT;
