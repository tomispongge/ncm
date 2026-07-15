-- ============================================================
-- NCM · Pendientes · Tabla de tareas del episodio (01)
--
-- Pendientes estructurados por cama/episodio. Se escriben en el módulo
-- Pendientes y se muestran (los no completados) en la tarjeta de Sala.
-- Sigue los invariantes: soft delete, autoría sin FK, una sola policy RLS.
--
-- Pegar en el SQL editor de Supabase (proyecto de PRODUCCIÓN) y ejecutar.
-- Re-ejecutable.
--
-- OJO (gotcha): si ya existía una tabla `tasks` de un scaffold viejo (con
-- columnas title/status/due_at), `create table if not exists` NO agrega las
-- columnas nuevas. Si la tabla vieja está vacía, córrela así primero:
--   drop table if exists public.tasks cascade;
-- y luego este create.
-- ============================================================

create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  episode_id  uuid not null,
  kind        text not null check (kind in
                ('interconsulta','evaluacion','examen','procedimiento','cultivo')),
  subtype     text,                       -- opción del desplegable (examen/procedimiento/cultivo)
  detail      text,                       -- texto libre ("a qué", "de qué", "detallar")
  processed   boolean not null default false,  -- interconsulta: "tramitada"
  done        boolean not null default false,  -- completado -> oculto de la tarjeta
  created_by  uuid,
  updated_by  uuid,
  deleted     boolean not null default false,
  deleted_by  uuid,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.tasks enable row level security;

-- Una sola policy FOR ALL (el filtrado de borrados va en la query).
drop policy if exists tasks_all on public.tasks;
create policy tasks_all on public.tasks
  for all to authenticated using (true) with check (true);

create index if not exists tasks_episode_idx
  on public.tasks (episode_id) where deleted = false;
