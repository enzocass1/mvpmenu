-- Query per verificare quali colonne esistono in analytics_events

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'analytics_events'
ORDER BY ordinal_position;

-- Questa query ti mostrerà TUTTE le colonne attualmente presenti
-- Copia il risultato e mandamelo
