-- Migration: Clean and recreate rooms management with table ranges
-- IMPORTANTE: Questo script elimina le tabelle esistenti e le ricrea

-- ============================================
-- STEP 1: CLEANUP - Rimuovi tutto ciò che esiste
-- ============================================

-- Drop tabella tables se esiste (dalla vecchia migration)
DROP TABLE IF EXISTS public.tables CASCADE;

-- Drop tabella rooms se esiste
DROP TABLE IF EXISTS public.rooms CASCADE;

-- ============================================
-- STEP 2: CREATE - Crea nuova struttura
-- ============================================

-- Tabella ROOMS (Sale) con range tavoli
CREATE TABLE public.rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    table_start INTEGER NOT NULL,
    table_end INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(restaurant_id, name),
    CHECK (table_end >= table_start),
    CHECK (table_start > 0)
);

-- Indici per performance
CREATE INDEX idx_rooms_restaurant_id ON public.rooms(restaurant_id);

-- Enable Row Level Security
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: RLS POLICIES
-- ============================================

-- Policy: Users can view rooms from their restaurant
CREATE POLICY "Users can view own restaurant rooms"
ON public.rooms FOR SELECT
USING (
    restaurant_id IN (
        SELECT id FROM public.restaurants WHERE user_id = auth.uid()
    )
);

-- Policy: Users can insert rooms for their restaurant
CREATE POLICY "Users can insert own restaurant rooms"
ON public.rooms FOR INSERT
WITH CHECK (
    restaurant_id IN (
        SELECT id FROM public.restaurants WHERE user_id = auth.uid()
    )
);

-- Policy: Users can update rooms from their restaurant
CREATE POLICY "Users can update own restaurant rooms"
ON public.rooms FOR UPDATE
USING (
    restaurant_id IN (
        SELECT id FROM public.restaurants WHERE user_id = auth.uid()
    )
);

-- Policy: Users can delete rooms from their restaurant
CREATE POLICY "Users can delete own restaurant rooms"
ON public.rooms FOR DELETE
USING (
    restaurant_id IN (
        SELECT id FROM public.restaurants WHERE user_id = auth.uid()
    )
);

-- ============================================
-- STEP 4: TRIGGERS
-- ============================================

-- Function per update timestamp (riutilizza se esiste già)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger per rooms
CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON public.rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMPLETATO!
-- ============================================

-- Note:
-- 1. Questa migration ha eliminato la vecchia struttura con tabella "tables"
-- 2. Ora esiste solo la tabella "rooms" con range di tavoli (table_start - table_end)
-- 3. I numeri tavolo sono globali e sequenziali
-- 4. Esempio: Sala 1 (tavoli 1-4), Sala 2 (tavoli 5-8), totale 8 tavoli
-- 5. I clienti useranno questi numeri per ordinare dal menu online
-- 6. Lo staff userà questi numeri nella sezione Cassa e Ordini
