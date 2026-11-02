-- ============================================================
-- INVENTARIO — Tappa 1: schema + sicurezza (additivo, non distruttivo)
-- Modello "impegnato" stile Shopify: giacenza fisica + impegnato -> disponibile
-- ============================================================

-- 1) Scorta sui PRODOTTI SEMPLICI (senza varianti)
alter table public.products
  add column if not exists track_quantity boolean not null default false,
  add column if not exists quantity integer not null default 0,            -- giacenza fisica (on hand)
  add column if not exists committed integer not null default 0,           -- impegnato
  add column if not exists allow_negative_inventory boolean not null default true,
  add column if not exists low_stock_threshold integer not null default 0;

-- 2) Aggiunte alle VARIANTI (track_quantity/quantity/allow_negative_inventory esistono gia')
alter table public.product_variants
  add column if not exists committed integer not null default 0,
  add column if not exists low_stock_threshold integer not null default 0;

-- comportamento predefinito: "avvisa ma lascia vendere" (negativo consentito)
alter table public.product_variants alter column allow_negative_inventory set default true;

-- 3) Registro MOVIMENTI di magazzino (ledger: ogni variazione = una riga)
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  order_item_id uuid references public.order_items(id) on delete set null,
  type text not null,                         -- reserve | release | sale | restock | adjustment | waste | return
  delta_on_hand integer not null default 0,   -- variazione giacenza fisica
  delta_committed integer not null default 0, -- variazione impegnato
  source text,                                -- cassa | banco | tavolo | staff | manuale | sistema
  note text,
  created_by uuid,                            -- utente (titolare) per rettifiche manuali
  created_by_staff_id uuid,                   -- staff, se applicabile
  created_at timestamptz not null default now()
);

create index if not exists idx_stock_mov_restaurant on public.stock_movements(restaurant_id, created_at desc);
create index if not exists idx_stock_mov_product on public.stock_movements(product_id);
create index if not exists idx_stock_mov_variant on public.stock_movements(variant_id);
create index if not exists idx_stock_mov_order on public.stock_movements(order_id);
create index if not exists idx_stock_mov_order_item on public.stock_movements(order_item_id);

-- 4) SICUREZZA (RLS): solo il titolare del ristorante vede/gestisce i propri movimenti.
--    L'automatismo di Tappa 2 girera' come SECURITY DEFINER, quindi potra' scrivere
--    anche per gli ordini dei tavoli (utenti anonimi) scavalcando la RLS.
alter table public.stock_movements enable row level security;

drop policy if exists "owner select stock_movements" on public.stock_movements;
create policy "owner select stock_movements" on public.stock_movements
  for select using (restaurant_id in (select id from public.restaurants where user_id = auth.uid()));

drop policy if exists "owner insert stock_movements" on public.stock_movements;
create policy "owner insert stock_movements" on public.stock_movements
  for insert with check (restaurant_id in (select id from public.restaurants where user_id = auth.uid()));

drop policy if exists "owner update stock_movements" on public.stock_movements;
create policy "owner update stock_movements" on public.stock_movements
  for update using (restaurant_id in (select id from public.restaurants where user_id = auth.uid()));

drop policy if exists "owner delete stock_movements" on public.stock_movements;
create policy "owner delete stock_movements" on public.stock_movements
  for delete using (restaurant_id in (select id from public.restaurants where user_id = auth.uid()));
