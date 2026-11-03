-- Gli ordini al banco non hanno un tavolo: table_number deve poter essere vuoto.
-- Prima era NOT NULL e lo "Scontrino Fiscale" al banco falliva
-- ("null value in column table_number violates not-null constraint").
-- Il controllo esistente (table_number > 0) resta valido per gli ordini al tavolo.
ALTER TABLE orders ALTER COLUMN table_number DROP NOT NULL;
