-- Migration: Add rooms management with table ranges
-- Creazione tabella per gestione sale con range tavoli sequenziali

-- Tabella ROOMS (Sale)
-- Ogni sala ha un range di numeri tavolo (es: sala 1 = tavoli 1-10, sala 2 = tavoli 11-20)
CREATE TABLE IF NOT EXISTS public.rooms (
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
CREATE INDEX IF NOT EXISTS idx_rooms_restaurant_id ON public.rooms(restaurant_id);

-- Enable Row Level Security
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies per ROOMS

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

-- Trigger per aggiornare updated_at automaticamente

-- Function per update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger per rooms
DROP TRIGGER IF EXISTS update_rooms_updated_at ON public.rooms;
CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON public.rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Note:
-- 1. Eseguire questa migration nel SQL Editor di Supabase
-- 2. Questo creerà la tabella rooms con RLS policies
-- 3. Ogni sala ha un range di tavoli (table_start - table_end)
-- 4. I numeri tavolo sono globali e sequenziali
-- 5. Esempio: Sala 1 (tavoli 1-4), Sala 2 (tavoli 5-8), Sala 3 (tavoli 9-12)
-- 6. I clienti useranno questi numeri per ordinare dal menu online
-- 7. Lo staff userà questi numeri nella sezione Cassa e Ordini
