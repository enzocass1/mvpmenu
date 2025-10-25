-- Migration: Aggiungi campo room_id alla tabella orders
-- Questo campo associa ogni ordine alla sala (room) specifica

-- Aggiungi la colonna room_id alla tabella orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;

-- Crea un indice per migliorare le prestazioni delle query
CREATE INDEX IF NOT EXISTS idx_orders_room_id ON public.orders(room_id);

-- Commenta la colonna per documentazione
COMMENT ON COLUMN public.orders.room_id IS 'ID della sala (room) a cui appartiene il tavolo dell''ordine';
