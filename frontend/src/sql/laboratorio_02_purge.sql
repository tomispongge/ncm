-- ============================================================
-- NCM · Laboratorio · Funcion de purga con registro forense (02)
--
-- Conserva los p_keep informes mas recientes de un episodio y BORRA
-- fisicamente los mas antiguos (cascade elimina sus lab_results).
-- ANTES de borrar, registra el HECHO en audit_log con SOLO metadata
-- (episodio, fecha, laboratorio) -> NUNCA los valores de los analitos.
--
-- SECURITY DEFINER: corre como el dueño (postgres), asi puede escribir
-- audit_log sin depender de su RLS. Todo ocurre en UNA transaccion:
-- o registra y borra, o no hace nada.
--
-- Requiere que ya existan lab_panels / lab_results (migracion 01) y la
-- tabla audit_log(user_id, action, entity, entity_id, before, after, created_at).
-- Pegar en el SQL editor de Supabase y ejecutar. Es re-ejecutable.
-- ============================================================

create or replace function public.lab_purge_old_panels(
  p_episode_id uuid,
  p_actor      uuid default null,
  p_keep       int  default 7
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids   uuid[];
  v_count integer;
begin
  -- ids de los informes que SOBRAN (mas alla de los p_keep mas recientes)
  select array_agg(id)
    into v_ids
  from (
    select id
    from public.lab_panels
    where episode_id = p_episode_id
    order by taken_at desc
    offset greatest(p_keep, 0)
  ) old_panels;

  -- nada que purgar
  if v_ids is null or array_length(v_ids, 1) is null then
    return 0;
  end if;

  -- registra el HECHO de la purga (metadata, SIN valores de salud)
  insert into public.audit_log (user_id, action, entity, entity_id, before, after, created_at)
  select
    p_actor,
    'lab_panel_purge',
    'lab_panel',
    p.id,
    jsonb_build_object(
      'episode_id', p.episode_id,
      'taken_at',   p.taken_at,
      'lab_source', p.lab_source
    ),
    null,
    now()
  from public.lab_panels p
  where p.id = any(v_ids);

  -- borrado fisico (cascade elimina lab_results)
  delete from public.lab_panels where id = any(v_ids);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Permitir que el rol de la app (authenticated) invoque la funcion.
grant execute on function public.lab_purge_old_panels(uuid, uuid, int) to authenticated;
