-- ============================================================================
-- NCM · Medicamentos — migración (correr completo en el SQL editor de Supabase)
-- ----------------------------------------------------------------------------
-- Biblioteca de fármacos delicados (vasoactivos, sedación, analgesia, NPT,
-- antibióticos...). Casi estática: sin historial de "datos anteriores".
-- Mantiene autoría + soft-delete. Escritura SOLO admin; lectura para todos.
-- Si ya tienes un mecanismo de rol distinto a profiles.role, NO corras la
-- sección 2 y avísame para ajustar is_admin().
-- ============================================================================

-- 1) BIBLIOTECA DE FÁRMACOS --------------------------------------------------
-- Valores de los desplegables (referencia para el front):
--   presentation_form : ampolla | frasco | jeringa | comprimido | capsula | otro
--   presentation_unit : mg | gr | ml
--   solvent           : SG 5% | SG 30% | SF 0.9% | SF 3% | SF 0.45%
--   dilution_ml       : 10 | 20 | 100 | 250 | 500 | 1000
--   admin_rate_unit   : ml/hr | UI/hr | ug/kg/hr | ug/kg/min | mg/hr | ug/min | ug/hr
create table if not exists public.medication_library (
  id                  uuid primary key default gen_random_uuid(),

  generic_name        text not null,            -- 1. Nombre genérico
  brand_names         text,                     -- 2. Nombres comerciales

  presentation_form   text,                     -- 3. tipo (LD)
  presentation_other  text,                     -- 3. si form = 'otro'
  presentation_amount numeric,                  -- 3. cantidad (ej. 2)
  presentation_unit   text,                     -- 3. mg | gr | ml

  solvent             text,                     -- 4. Solvente (LD)
  dilution_ml         numeric,                  -- 5. Dilución en mL (LD)

  nursing_care        text,                     -- 6. Cuidados de enfermería (-> tarjeta)

  admin_rate_value    numeric,                  -- 7. Tiempo de administración (0.05–1200)
  admin_rate_unit     text,                     -- 7. unidad (LD)
  constraint chk_admin_rate
    check (admin_rate_value is null
           or (admin_rate_value >= 0.05 and admin_rate_value <= 1200)),

  observations        text,                     -- 8. Observaciones (-> tarjeta, opcional)

  is_active           boolean default true,

  -- trazabilidad mínima: autoría + soft-delete (SIN historial de versiones)
  created_at  timestamptz default now(),
  created_by  uuid,
  updated_by  uuid,
  updated_at  timestamptz default now(),
  deleted     boolean default false,
  deleted_by  uuid,
  deleted_at  timestamptz
);

create index if not exists idx_medlib_active
  on public.medication_library (generic_name)
  where deleted = false;

-- 2) MECANISMO DE ROL (app-wide) — correr UNA vez --------------------------
--    *** Esto toca a TODOS los usuarios. Confírmame antes de aplicarlo. ***
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'enfermero'
             check (role in ('admin','medico','enfermero')),
  full_name  text,
  created_at timestamptz default now()
);

insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

create or replace function public.fn_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.fn_handle_new_user();

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

alter table public.profiles enable row level security;

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ⚠️ HAZTE ADMIN: reemplaza el UUID por el tuyo (Authentication → Users)
-- update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-000000000000';

-- 3) RLS de la biblioteca: lectura para todos, escritura solo admin ----------
alter table public.medication_library enable row level security;

drop policy if exists medlib_select on public.medication_library;
create policy medlib_select on public.medication_library
  for select to authenticated
  using (deleted = false or public.is_admin());

drop policy if exists medlib_insert on public.medication_library;
create policy medlib_insert on public.medication_library
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists medlib_update on public.medication_library;
create policy medlib_update on public.medication_library
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- (sin DELETE físico: el borrado es lógico vía UPDATE deleted = true)
