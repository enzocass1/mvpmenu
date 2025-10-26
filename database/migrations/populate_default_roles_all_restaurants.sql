-- =====================================================
-- SCRIPT: Popola ruoli default per tutti i ristoranti
-- Data: 2025-10-26
-- Descrizione: Esegue create_default_roles_for_restaurant()
--              per ogni ristorante esistente nel DB
-- =====================================================

-- IMPORTANTE: Eseguire DOPO create_roles_system.sql

DO $$
DECLARE
  restaurant_record RECORD;
  total_restaurants INTEGER := 0;
  processed_restaurants INTEGER := 0;
BEGIN
  -- Conta ristoranti totali
  SELECT COUNT(*) INTO total_restaurants FROM restaurants;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Inizio popolamento ruoli default';
  RAISE NOTICE 'Ristoranti totali: %', total_restaurants;
  RAISE NOTICE '========================================';

  -- Loop su tutti i ristoranti
  FOR restaurant_record IN
    SELECT id, name, user_id
    FROM restaurants
    ORDER BY created_at DESC
  LOOP
    processed_restaurants := processed_restaurants + 1;

    RAISE NOTICE '[%/%] Ristorante: % (ID: %)',
      processed_restaurants,
      total_restaurants,
      restaurant_record.name,
      restaurant_record.id;

    -- Crea ruoli default per questo ristorante
    BEGIN
      PERFORM create_default_roles_for_restaurant(restaurant_record.id);
      RAISE NOTICE '  ✅ Ruoli creati con successo';
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '  ❌ Errore creazione ruoli: %', SQLERRM;
    END;

  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Completato! Processati %/% ristoranti', processed_restaurants, total_restaurants;
  RAISE NOTICE '========================================';

  -- Verifica risultati
  RAISE NOTICE '';
  RAISE NOTICE 'Verifica: Ruoli creati per ristorante';
  RAISE NOTICE '----------------------------------------';

  FOR restaurant_record IN
    SELECT
      r.name as restaurant_name,
      COUNT(ro.id) as roles_count,
      STRING_AGG(ro.display_name, ', ' ORDER BY ro.sort_order) as roles_list
    FROM restaurants r
    LEFT JOIN roles ro ON r.id = ro.restaurant_id
    GROUP BY r.id, r.name
    ORDER BY r.name
  LOOP
    RAISE NOTICE '% → % ruoli: %',
      restaurant_record.restaurant_name,
      restaurant_record.roles_count,
      restaurant_record.roles_list;
  END LOOP;

END $$;

-- Query di verifica finale (puoi eseguirla separatamente)
-- SELECT
--   r.name as ristorante,
--   COUNT(ro.id) as num_ruoli,
--   STRING_AGG(ro.display_name, ', ' ORDER BY ro.sort_order) as ruoli
-- FROM restaurants r
-- LEFT JOIN roles ro ON r.id = ro.restaurant_id
-- GROUP BY r.id, r.name
-- ORDER BY r.name;
