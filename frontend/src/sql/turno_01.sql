-- ============================================================
-- NCM · Entrega de turno · nota de entrega por episodio (01)
--
-- Agrega la columna `handoff_note` a `clinical_sheets`. La tabla ya existe
-- con datos, así que se usa ALTER ADD COLUMN IF NOT EXISTS (NO create), para
-- no perder nada (gotcha: create-if-not-exists no agrega columnas).
--
-- Pegar en el SQL editor de Supabase (proyecto de PRODUCCIÓN) y ejecutar.
-- Re-ejecutable.
-- ============================================================

alter table public.clinical_sheets
  add column if not exists handoff_note text;
