-- ============================================================
-- INVENTARIO — Tappa 3: funzioni per la pagina Inventario (rettifiche + settaggi)
-- Usate dal client via supabase.rpc(). SECURITY DEFINER con verifica proprieta'.
-- ============================================================

-- Rettifica manuale della giacenza (carico/scarto/conteggio).
-- Carico: p_type='restock', p_delta=+n ; Scarto: p_type='waste', p_delta=-n ;
-- Conteggio: p_type='adjustment', p_delta = (nuovo_valore - giacenza_attuale)
create or replace function public.inv_manual_adjust(
  p_product_id uuid, p_variant_id uuid, p_type text, p_delta integer, p_note text default null
) returns void language plpgsql security definer set search_path=public as $$
declare v_restaurant uuid; v_is_variant boolean := p_variant_id is not null;
begin
  if v_is_variant then
    select r.id into v_restaurant from product_variants pv join products p on p.id=pv.product_id join categories c on c.id=p.category_id join restaurants r on r.id=c.restaurant_id where pv.id=p_variant_id;
  else
    select r.id into v_restaurant from products p join categories c on c.id=p.category_id join restaurants r on r.id=c.restaurant_id where p.id=p_product_id;
  end if;
  if v_restaurant is null then raise exception 'prodotto non trovato'; end if;
  if not exists (select 1 from restaurants where id=v_restaurant and user_id=auth.uid()) then
    raise exception 'non autorizzato';
  end if;
  insert into stock_movements(restaurant_id, product_id, variant_id, type, delta_on_hand, delta_committed, source, note, created_by)
  values (v_restaurant, p_product_id, p_variant_id, coalesce(p_type,'adjustment'), coalesce(p_delta,0), 0, 'manuale', p_note, auth.uid());
  if v_is_variant then
    update product_variants set quantity = coalesce(quantity,0)+coalesce(p_delta,0), updated_at=now() where id=p_variant_id;
  else
    update products set quantity = coalesce(quantity,0)+coalesce(p_delta,0) where id=p_product_id;
  end if;
end; $$;
grant execute on function public.inv_manual_adjust(uuid,uuid,text,integer,text) to authenticated;

-- Attiva/disattiva tracciamento, imposta soglia minima e permesso negativo.
create or replace function public.inv_set_tracking(
  p_product_id uuid, p_variant_id uuid, p_track boolean, p_threshold integer, p_allow_negative boolean
) returns void language plpgsql security definer set search_path=public as $$
declare v_restaurant uuid; v_is_variant boolean := p_variant_id is not null;
begin
  if v_is_variant then
    select r.id into v_restaurant from product_variants pv join products p on p.id=pv.product_id join categories c on c.id=p.category_id join restaurants r on r.id=c.restaurant_id where pv.id=p_variant_id;
  else
    select r.id into v_restaurant from products p join categories c on c.id=p.category_id join restaurants r on r.id=c.restaurant_id where p.id=p_product_id;
  end if;
  if v_restaurant is null then raise exception 'prodotto non trovato'; end if;
  if not exists (select 1 from restaurants where id=v_restaurant and user_id=auth.uid()) then raise exception 'non autorizzato'; end if;
  if v_is_variant then
    update product_variants set track_quantity=coalesce(p_track,track_quantity), low_stock_threshold=coalesce(p_threshold,low_stock_threshold), allow_negative_inventory=coalesce(p_allow_negative,allow_negative_inventory), updated_at=now() where id=p_variant_id;
  else
    update products set track_quantity=coalesce(p_track,track_quantity), low_stock_threshold=coalesce(p_threshold,low_stock_threshold), allow_negative_inventory=coalesce(p_allow_negative,allow_negative_inventory) where id=p_product_id;
  end if;
end; $$;
grant execute on function public.inv_set_tracking(uuid,uuid,boolean,integer,boolean) to authenticated;
