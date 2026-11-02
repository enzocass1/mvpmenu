-- ============================================================
-- INVENTARIO — Tappa 2: automatismo scarico/impegno/ripristino
-- Riconciliazione idempotente per riga d'ordine. Gated su track_quantity.
-- Sicurezza: ogni errore inventario viene IGNORATO (non blocca mai l'ordine).
-- ============================================================

-- Fase inventario in base allo stato ordine
create or replace function public.inv_phase(p_status text)
returns text language sql immutable as $$
  select case
    when p_status = 'cancelled' then 'released'    -- annullato: merce non venduta -> ripristina
    when p_status = 'completed' then 'finalized'   -- completato/pagato O chiuso non pagato: merce consumata
    when p_status in ('confirmed','preparing') then 'reserved'  -- confermato: impegnato
    else 'none'                                     -- pending/altro: niente
  end;
$$;

-- Riconcilia una riga d'ordine verso lo stato target (impegnato/venduto/zero)
create or replace function public.inv_apply(
  p_order_item_id uuid,
  p_order_id uuid,
  p_product_id uuid,
  p_variant_id uuid,
  p_quantity integer,
  p_phase text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_track boolean := false;
  v_is_variant boolean := false;
  v_restaurant_id uuid;
  v_order_type text;
  v_staff uuid;
  v_source text;
  v_committed_applied integer := 0;
  v_sold_applied integer := 0;
  v_target_committed integer := 0;
  v_target_sold integer := 0;
  v_d_committed integer := 0;
  v_d_onhand integer := 0;
  v_type text;
begin
  -- Cosa tracciare: variante prioritaria, poi prodotto semplice
  if p_variant_id is not null then
    select coalesce(track_quantity,false) into v_track from public.product_variants where id = p_variant_id;
    if coalesce(v_track,false) then v_is_variant := true; end if;
  end if;
  if not v_is_variant and p_product_id is not null then
    select coalesce(track_quantity,false) into v_track from public.products where id = p_product_id;
  end if;
  if not coalesce(v_track,false) then
    return; -- non tracciato: no-op
  end if;

  select restaurant_id, order_type, coalesce(created_by_staff_id, modified_by_staff_id)
    into v_restaurant_id, v_order_type, v_staff
    from public.orders where id = p_order_id;
  if v_restaurant_id is null then return; end if;
  v_source := case when v_order_type = 'counter' then 'banco'
                   when v_order_type = 'table' then 'tavolo'
                   else coalesce(v_order_type,'sistema') end;

  -- Quanto gia' applicato a questa riga (dal registro)
  select coalesce(sum(delta_committed),0), coalesce(-sum(delta_on_hand),0)
    into v_committed_applied, v_sold_applied
    from public.stock_movements where order_item_id = p_order_item_id;

  if p_phase = 'reserved' then
    v_target_committed := greatest(coalesce(p_quantity,0),0); v_target_sold := 0;
  elsif p_phase = 'finalized' then
    v_target_committed := 0; v_target_sold := greatest(coalesce(p_quantity,0),0);
  else
    v_target_committed := 0; v_target_sold := 0;
  end if;

  v_d_committed := v_target_committed - v_committed_applied;
  v_d_onhand := -(v_target_sold - v_sold_applied);

  if v_d_committed = 0 and v_d_onhand = 0 then
    return; -- gia' allineato: niente da fare (idempotente)
  end if;

  v_type := case p_phase when 'reserved' then 'reserve'
                         when 'finalized' then 'sale'
                         else 'release' end;

  insert into public.stock_movements(
    restaurant_id, product_id, variant_id, order_id, order_item_id,
    type, delta_on_hand, delta_committed, source, created_by_staff_id)
  values (v_restaurant_id, p_product_id, p_variant_id, p_order_id, p_order_item_id,
    v_type, v_d_onhand, v_d_committed, v_source, v_staff);

  if v_is_variant then
    update public.product_variants
      set committed = coalesce(committed,0) + v_d_committed,
          quantity  = coalesce(quantity,0) + v_d_onhand,
          updated_at = now()
      where id = p_variant_id;
  else
    update public.products
      set committed = coalesce(committed,0) + v_d_committed,
          quantity  = coalesce(quantity,0) + v_d_onhand
      where id = p_product_id;
  end if;
end;
$$;

-- Trigger su order_items (insert/update/delete)
create or replace function public.inv_trg_order_item()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  begin
    if TG_OP = 'DELETE' then
      perform public.inv_apply(OLD.id, OLD.order_id, OLD.product_id, OLD.variant_id, OLD.quantity, 'released');
    else
      select status into v_status from public.orders where id = NEW.order_id;
      perform public.inv_apply(NEW.id, NEW.order_id, NEW.product_id, NEW.variant_id, NEW.quantity,
                               public.inv_phase(coalesce(v_status,'pending')));
    end if;
  exception when others then
    raise warning 'inventario (order_item) errore ignorato: %', sqlerrm;
  end;
  if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
end;
$$;

drop trigger if exists trg_inv_order_item_ins_upd on public.order_items;
create trigger trg_inv_order_item_ins_upd
  after insert or update of quantity, variant_id, product_id on public.order_items
  for each row execute function public.inv_trg_order_item();

drop trigger if exists trg_inv_order_item_del on public.order_items;
create trigger trg_inv_order_item_del
  before delete on public.order_items
  for each row execute function public.inv_trg_order_item();

-- Trigger su orders (cambio stato -> riconcilia tutte le righe)
create or replace function public.inv_trg_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record; v_phase text;
begin
  begin
    if NEW.status is distinct from OLD.status then
      v_phase := public.inv_phase(NEW.status);
      for r in select id, order_id, product_id, variant_id, quantity
               from public.order_items where order_id = NEW.id loop
        perform public.inv_apply(r.id, r.order_id, r.product_id, r.variant_id, r.quantity, v_phase);
      end loop;
    end if;
  exception when others then
    raise warning 'inventario (order) errore ignorato: %', sqlerrm;
  end;
  return NEW;
end;
$$;

drop trigger if exists trg_inv_order_status on public.orders;
create trigger trg_inv_order_status
  after update of status on public.orders
  for each row execute function public.inv_trg_order();
