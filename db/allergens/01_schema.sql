-- Allergeni prodotto (Reg. UE 1169/2011 - 14 allergeni obbligatori)
-- La colonna contiene un array JSON di chiavi allergene, es: ["glutine","latte"]
-- Le chiavi valide sono definite in src/lib/allergens.js

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS allergens jsonb NOT NULL DEFAULT '[]'::jsonb;
