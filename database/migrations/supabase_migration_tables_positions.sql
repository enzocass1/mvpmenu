-- Migration: Tables with drag & drop positions
-- Questa migration crea la tabella tables per salvare le posizioni dei tavoli

-- ============================================
-- STEP 1: CLEANUP
-- ============================================

DROP TRIGGER IF EXISTS sync_tables_on_room_change ON public.rooms;
DROP FUNCTION IF EXISTS sync_room_tables();
DROP TABLE IF EXISTS public.tables CASCADE;

-- ============================================
-- STEP 2: CREATE TABLES TABLE
-- ============================================

CREATE TABLE public.tables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_number INTEGER NOT NULL,
    position_x INTEGER DEFAULT NULL,
    position_y INTEGER DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(restaurant_id, table_number),
    UNIQUE(room_id, table_number)
);

-- Indici per performance
CREATE INDEX idx_tables_room_id ON public.tables(room_id);
CREATE INDEX idx_tables_restaurant_id ON public.tables(restaurant_id);
CREATE INDEX idx_tables_table_number ON public.tables(restaurant_id, table_number);

-- Enable Row Level Security
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: RLS POLICIES FOR TABLES
-- ============================================

-- Policy: Users can view tables from their restaurant
CREATE POLICY "Users can view own restaurant tables"
ON public.tables FOR SELECT
USING (
    restaurant_id IN (
        SELECT id FROM public.restaurants WHERE user_id = auth.uid()
    )
);

-- Policy: Users can insert tables for their restaurant
CREATE POLICY "Users can insert own restaurant tables"
ON public.tables FOR INSERT
WITH CHECK (
    restaurant_id IN (
        SELECT id FROM public.restaurants WHERE user_id = auth.uid()
    )
);

-- Policy: Users can update tables from their restaurant
CREATE POLICY "Users can update own restaurant tables"
ON public.tables FOR UPDATE
USING (
    restaurant_id IN (
        SELECT id FROM public.restaurants WHERE user_id = auth.uid()
    )
);

-- Policy: Users can delete tables from their restaurant
CREATE POLICY "Users can delete own restaurant tables"
ON public.tables FOR DELETE
USING (
    restaurant_id IN (
        SELECT id FROM public.restaurants WHERE user_id = auth.uid()
    )
);

-- ============================================
-- STEP 4: TRIGGER FOR AUTO-SYNC TABLES
-- ============================================

-- Funzione che sincronizza i tavoli quando una sala viene creata/modificata
CREATE OR REPLACE FUNCTION sync_room_tables()
RETURNS TRIGGER AS $$
DECLARE
    i INTEGER;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- Nuova sala: crea tutti i tavoli nel range
        FOR i IN NEW.table_start..NEW.table_end LOOP
            INSERT INTO public.tables (room_id, restaurant_id, table_number)
            VALUES (NEW.id, NEW.restaurant_id, i);
        END LOOP;

    ELSIF (TG_OP = 'UPDATE') THEN
        -- Sala modificata: rimuovi tavoli vecchi e crea nuovi
        DELETE FROM public.tables WHERE room_id = NEW.id;

        FOR i IN NEW.table_start..NEW.table_end LOOP
            INSERT INTO public.tables (room_id, restaurant_id, table_number)
            VALUES (NEW.id, NEW.restaurant_id, i);
        END LOOP;

    ELSIF (TG_OP = 'DELETE') THEN
        -- Sala eliminata: CASCADE si occuperà di eliminare i tavoli
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger che chiama la funzione
CREATE TRIGGER sync_tables_on_room_change
    AFTER INSERT OR UPDATE OR DELETE ON public.rooms
    FOR EACH ROW
    EXECUTE FUNCTION sync_room_tables();

-- ============================================
-- STEP 5: TRIGGER FOR UPDATED_AT
-- ============================================

CREATE TRIGGER update_tables_updated_at
    BEFORE UPDATE ON public.tables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 6: POPULATE EXISTING ROOMS
-- ============================================

-- Se ci sono già sale nel database, genera i tavoli
DO $$
DECLARE
    room_record RECORD;
    i INTEGER;
BEGIN
    FOR room_record IN SELECT * FROM public.rooms LOOP
        FOR i IN room_record.table_start..room_record.table_end LOOP
            INSERT INTO public.tables (room_id, restaurant_id, table_number)
            VALUES (room_record.id, room_record.restaurant_id, i)
            ON CONFLICT (restaurant_id, table_number) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- ============================================
-- COMPLETATO!
-- ============================================

-- Note:
-- 1. Ora esiste la tabella "tables" che salva posizione_x e posizione_y per ogni tavolo
-- 2. Quando si crea/modifica una sala, i tavoli vengono automaticamente generati
-- 3. Le posizioni sono NULL di default, saranno settate via drag & drop
-- 4. I tavoli con position_x/position_y NULL appariranno in griglia
-- 5. I tavoli con posizioni settate appariranno alle coordinate salvate
