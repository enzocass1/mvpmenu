-- Migration: Complete rooms and tables management
-- This creates the proper structure expected by CreateOrderModal.jsx

-- ============================================
-- STEP 1: CLEANUP
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own restaurant rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can insert own restaurant rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can update own restaurant rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can delete own restaurant rooms" ON public.rooms;

DROP POLICY IF EXISTS "Users can view own restaurant tables" ON public.tables;
DROP POLICY IF EXISTS "Users can insert own restaurant tables" ON public.tables;
DROP POLICY IF EXISTS "Users can update own restaurant tables" ON public.tables;
DROP POLICY IF EXISTS "Users can delete own restaurant tables" ON public.tables;

-- Drop existing triggers
DROP TRIGGER IF EXISTS update_rooms_updated_at ON public.rooms;
DROP TRIGGER IF EXISTS update_tables_updated_at ON public.tables;
DROP TRIGGER IF EXISTS sync_tables_on_room_change ON public.rooms;

-- Drop existing functions
DROP FUNCTION IF EXISTS sync_room_tables();

-- Drop existing tables
DROP TABLE IF EXISTS public.tables CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;

-- ============================================
-- STEP 2: CREATE ROOMS TABLE
-- ============================================

CREATE TABLE public.rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(restaurant_id, name)
);

-- Indices for performance
CREATE INDEX idx_rooms_restaurant_id ON public.rooms(restaurant_id);
CREATE INDEX idx_rooms_is_active ON public.rooms(is_active);

-- Enable Row Level Security
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: CREATE TABLES TABLE
-- ============================================

CREATE TABLE public.tables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    seats INTEGER DEFAULT 4 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(room_id, number),
    CHECK (number > 0),
    CHECK (seats > 0)
);

-- Indices for performance
CREATE INDEX idx_tables_room_id ON public.tables(room_id);
CREATE INDEX idx_tables_is_active ON public.tables(is_active);

-- Enable Row Level Security
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: RLS POLICIES FOR ROOMS
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
-- STEP 5: RLS POLICIES FOR TABLES
-- ============================================

-- Policy: Users can view tables from their restaurant
CREATE POLICY "Users can view own restaurant tables"
ON public.tables FOR SELECT
USING (
    room_id IN (
        SELECT id FROM public.rooms WHERE restaurant_id IN (
            SELECT id FROM public.restaurants WHERE user_id = auth.uid()
        )
    )
);

-- Policy: Users can insert tables for their restaurant
CREATE POLICY "Users can insert own restaurant tables"
ON public.tables FOR INSERT
WITH CHECK (
    room_id IN (
        SELECT id FROM public.rooms WHERE restaurant_id IN (
            SELECT id FROM public.restaurants WHERE user_id = auth.uid()
        )
    )
);

-- Policy: Users can update tables from their restaurant
CREATE POLICY "Users can update own restaurant tables"
ON public.tables FOR UPDATE
USING (
    room_id IN (
        SELECT id FROM public.rooms WHERE restaurant_id IN (
            SELECT id FROM public.restaurants WHERE user_id = auth.uid()
        )
    )
);

-- Policy: Users can delete tables from their restaurant
CREATE POLICY "Users can delete own restaurant tables"
ON public.tables FOR DELETE
USING (
    room_id IN (
        SELECT id FROM public.rooms WHERE restaurant_id IN (
            SELECT id FROM public.restaurants WHERE user_id = auth.uid()
        )
    )
);

-- ============================================
-- STEP 6: TRIGGERS
-- ============================================

-- Function for update timestamp (reuse if already exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for rooms
CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON public.rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for tables
CREATE TRIGGER update_tables_updated_at
    BEFORE UPDATE ON public.tables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 7: ADD room_id TO ORDERS TABLE
-- ============================================

-- Add room_id column to orders table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'orders'
        AND column_name = 'room_id'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;
        CREATE INDEX idx_orders_room_id ON public.orders(room_id);
    END IF;
END $$;

-- ============================================
-- COMPLETATO!
-- ============================================

-- Note:
-- 1. Created rooms table with: id, restaurant_id, name, is_active
-- 2. Created tables table with: id, room_id, number, seats, is_active
-- 3. Added room_id to orders table to track which room an order belongs to
-- 4. All RLS policies are configured for restaurant isolation
-- 5. Both tables have updated_at triggers
--
-- Next steps:
-- 1. Go to your Supabase project: https://supabase.com/dashboard
-- 2. Click on "SQL Editor" in the left sidebar
-- 3. Click "New Query"
-- 4. Copy and paste this entire migration
-- 5. Click "Run" to execute
--
-- After running the migration, you can add rooms and tables via the dashboard
-- or create a management UI for them.
