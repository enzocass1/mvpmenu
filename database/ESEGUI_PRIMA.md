# ⚠️ IMPORTANTE: Esegui Questi Script SQL PRIMA

Prima di usare le varianti prodotto, devi eseguire questi 2 script su Supabase.

## Step 1: Apri Supabase SQL Editor

Vai su: https://supabase.com/dashboard/project/nfpgqvnfmypeyrlplqem/sql/new

## Step 2: Esegui in Ordine

### A. Schema Principale (OBBLIGATORIO)

1. Apri il file `product_variants_schema.sql`
2. Copia TUTTO il contenuto
3. Incolla nel SQL Editor di Supabase
4. Clicca "Run"
5. Verifica messaggio: "✅ Product Variants Schema creato con successo"

### B. Views (OBBLIGATORIO - per evitare errore 406)

1. Apri il file `product_variants_views.sql`
2. Copia TUTTO il contenuto
3. Incolla nel SQL Editor di Supabase
4. Clicca "Run"
5. Verifica messaggio: "✅ Views per varianti create con successo"

## Step 3: Verifica Tabelle Create

Vai su **Supabase → Table Editor** e controlla che esistano:

- ✅ `product_variant_options`
- ✅ `product_variant_option_values`
- ✅ `product_variants`
- ✅ `v_product_variant_options` (view)
- ✅ `v_product_variant_option_values` (view)
- ✅ `v_product_variants` (view)

E verifica che `order_items` abbia le nuove colonne:
- ✅ `variant_id`
- ✅ `variant_title`

## ✅ Fatto!

Ora puoi usare le varianti nell'interfaccia.

---

## In Caso di Errori

### Errore: "relation already exists"
Hai già eseguito lo script. Vai avanti.

### Errore: "column already exists" su order_items
Hai già eseguito lo script. Vai avanti.

### Errore 406 dopo l'esecuzione
Hai dimenticato di eseguire `product_variants_views.sql`. Eseguilo ora.

### Altro errore
Manda screenshot dell'errore.
