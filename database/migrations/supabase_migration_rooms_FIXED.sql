-- Migration: Clean rooms management with explicit policy removal
-- This script properly cleans up existing policies before recreating the table

-- ============================================
-- STEP 1: EXPLICIT CLEANUP - Drop policies first
-- ============================================

-- Drop all policies explicitly (if they exist)
DROP POLICY IF EXISTS "Users can view own restaurant rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can insert own restaurant rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can update own restaurant rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can delete own restaurant rooms" ON public.rooms;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_rooms_updated_at ON public.rooms;

-- Drop tables (CASCADE will remove any remaining dependencies)
DROP TABLE IF EXISTS public.tables CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;

-- ============================================
-- STEP 2: CREATE - New structure
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
-- 1. Questa migration ha eliminato esplicitamente le policy prima di ricreare la tabella
-- 2. Ora esiste solo la tabella "rooms" con range di tavoli (table_start - table_end)
-- 3. I numeri tavolo sono globali e sequenziali
-- 4. Esempio: Sala 1 (tavoli 1-4), Sala 2 (tavoli 5-8), totale 8 tavoli
-- 5. I clienti useranno questi numeri per ordinare dal menu online
-- 6. Lo staff userà questi numeri nella sezione Cassa e Ordini
