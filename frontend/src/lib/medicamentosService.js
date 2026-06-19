// NCM · Módulo Medicamentos — capa de datos (Supabase)
import { supabase } from './supabase';

async function actorId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

// ---- Rol / gate admin ----------------------------------------------
// Lee el rol del usuario actual desde profiles (RLS permite ver el propio).
export async function getMyRole() {
  const uid = await actorId();
  if (!uid) return null;
  const { data, error } = await supabase
    .from('profiles').select('role').eq('id', uid).maybeSingle();
  if (error) return null;            // sin perfil → tratar como no-admin
  return data?.role ?? null;
}

export async function isCurrentUserAdmin() {
  return (await getMyRole()) === 'admin';
}

// ---- Biblioteca de fármacos ----------------------------------------
const COLS =
  'id, generic_name, brand_names, presentation_form, presentation_other, ' +
  'presentation_amount, presentation_unit, solvent, dilution_ml, nursing_care, ' +
  'admin_rate_value, admin_rate_unit, observations, is_active, updated_at';

// Lista la biblioteca (cualquier autenticado; solo no borrados, alfabético).
export async function listMedications() {
  const { data, error } = await supabase
    .from('medication_library')
    .select(COLS)
    .eq('deleted', false)
    .order('generic_name', { ascending: true });
  if (error) throw error;
  return data;
}

// Alta de un fármaco (RLS exige admin). `fields` usa los nombres de columna.
export async function createMedication(fields) {
  const uid = await actorId();
  const { data, error } = await supabase
    .from('medication_library')
    .insert({ ...fields, created_by: uid, updated_by: uid })
    .select(COLS).single();
  if (error) throw error;
  return data;
}

// Edición (RLS exige admin). Setea updated_by/at a mano (no hay trigger).
export async function updateMedication(id, fields) {
  const uid = await actorId();
  const { data, error } = await supabase
    .from('medication_library')
    .update({ ...fields, updated_by: uid, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(COLS).single();
  if (error) throw error;
  return data;
}

// Borrado lógico (RLS exige admin). Nunca borra físico.
export async function softDeleteMedication(id) {
  const uid = await actorId();
  const { error } = await supabase
    .from('medication_library')
    .update({
      deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: uid,
    })
    .eq('id', id);
  if (error) throw error;
}
