-- Password dello staff: da base64 (reversibile) a bcrypt, e login lato server.
-- Prima la tabella restaurant_staff era leggibile da chiunque (policy USING true)
-- e le password si potevano decodificare. Ora:
--   * un trigger cifra sempre la password con bcrypt (il client invia base64 della password);
--   * la colonna "password" in chiaro viene sempre svuotata;
--   * il login avviene con la funzione staff_login(), che non restituisce mai la password;
--   * rimossa la lettura pubblica della tabella.

CREATE OR REPLACE FUNCTION restaurant_staff_hash_password()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  v_plain text;
BEGIN
  -- Mai conservare la password in chiaro
  NEW.password := NULL;

  IF NEW.password_hash IS NOT NULL AND NEW.password_hash NOT LIKE '$2%' THEN
    BEGIN
      v_plain := convert_from(decode(NEW.password_hash, 'base64'), 'UTF8');
    EXCEPTION WHEN others THEN
      v_plain := NEW.password_hash; -- non era base64: la tratto come testo
    END;
    NEW.password_hash := crypt(v_plain, gen_salt('bf', 10));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restaurant_staff_hash_password ON restaurant_staff;
CREATE TRIGGER trg_restaurant_staff_hash_password
  BEFORE INSERT OR UPDATE ON restaurant_staff
  FOR EACH ROW EXECUTE FUNCTION restaurant_staff_hash_password();

-- Converte le password esistenti (il trigger le cifra)
UPDATE restaurant_staff SET password_hash = password_hash, password = NULL;

-- Login staff verificato sul server
CREATE OR REPLACE FUNCTION staff_login(p_restaurant_id uuid, p_email text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_staff restaurant_staff%ROWTYPE;
  v_role json;
BEGIN
  SELECT * INTO v_staff
  FROM restaurant_staff
  WHERE restaurant_id = p_restaurant_id
    AND lower(email) = lower(trim(p_email))
  LIMIT 1;

  IF NOT FOUND OR v_staff.password_hash IS NULL
     OR v_staff.password_hash <> crypt(p_password, v_staff.password_hash) THEN
    RAISE EXCEPTION 'Credenziali non valide';
  END IF;

  IF NOT v_staff.is_active THEN
    RAISE EXCEPTION 'Account disabilitato';
  END IF;

  SELECT json_build_object('id', r.id, 'name', r.name, 'color', r.color, 'permissions', r.permissions)
  INTO v_role
  FROM staff_roles r
  WHERE r.id = v_staff.primary_role_id;

  RETURN json_build_object(
    'id', v_staff.id,
    'name', v_staff.name,
    'email', v_staff.email,
    'role', v_staff.role_legacy,
    'primary_role', v_role
  );
END;
$$;
GRANT EXECUTE ON FUNCTION staff_login(uuid, text, text) TO anon, authenticated;

-- Niente più lettura pubblica della tabella staff
DROP POLICY IF EXISTS "Allow public read for staff login" ON restaurant_staff;
