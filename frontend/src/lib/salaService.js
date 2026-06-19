// NCM · Módulo Sala — capa de datos (Supabase)
// Ajusta la ruta del cliente a la de tu repo (p. ej. ../supabaseClient).
import { supabase } from './supabase';
import { MAX_BEDS } from './sala/constants';

async function actorId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

// ---- Sala / Ward ----------------------------------------------------
export async function getOrCreateDefaultWard() {
  const { data: found } = await supabase
    .from('wards').select('id, name').eq('deleted', false).limit(1).maybeSingle();
  if (found) return found;
  const { data, error } = await supabase
    .from('wards').insert({ name: 'Sala' }).select('id, name').single();
  if (error) throw error;
  return data;
}

// ---- Camas ----------------------------------------------------------
export async function listBeds(wardId) {
  const { data, error } = await supabase
    .from('beds')
    .select('id, ward_id, label, bed_number, status, pos_x, pos_y, episode_id')
    .eq('ward_id', wardId).eq('deleted', false)
    .order('bed_number', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addBed(wardId, beds) {
  if (beds.length >= MAX_BEDS) throw new Error(`Máximo ${MAX_BEDS} camas por sala.`);
  const next = beds.reduce((m, b) => Math.max(m, b.bed_number ?? 0), 0) + 1;
  // staggered spawn para que no se apilen exactamente encima
  const offset = (beds.length % 5) * 16;
  const { data, error } = await supabase.from('beds').insert({
    ward_id: wardId, label: `Cama ${next}`, bed_number: next,
    status: 'libre', pos_x: 24 + offset, pos_y: 24 + offset,
    created_by: await actorId(),
  }).select('id, ward_id, label, bed_number, status, pos_x, pos_y, episode_id').single();
  if (error) throw error;
  return data;
}

export async function updateBedPosition(bedId, x, y) {
  const { error } = await supabase.from('beds')
    .update({ pos_x: Math.round(x), pos_y: Math.round(y), updated_by: await actorId() })
    .eq('id', bedId);
  if (error) throw error;
}

export async function softDeleteBed(bedId) {
  const { error } = await supabase.from('beds')
    .update({ deleted: true, deleted_at: new Date().toISOString(), deleted_by: await actorId() })
    .eq('id', bedId);
  if (error) throw error;
}

// ---- Ocupación: garantizar episodio para la cama --------------------
// MVP de admisión: si la cama está libre crea paciente+episodio mínimos.
export async function ensureEpisodeForBed(bed) {
  if (bed.episode_id) return bed.episode_id;
  const uid = await actorId();
  const { data: patient, error: pErr } = await supabase
    .from('patients').insert({ full_name: `Paciente ${bed.label}` })
    .select('id').single();
  if (pErr) throw pErr;
  const { data: episode, error: eErr } = await supabase
    .from('episodes').insert({
      patient_id: patient.id,
      admission_date: new Date().toISOString(),
      created_by: uid,
    }).select('id').single();
  if (eErr) throw eErr;
  const { error: bErr } = await supabase.from('beds')
    .update({ episode_id: episode.id, status: 'ocupada', updated_by: uid })
    .eq('id', bed.id);
  if (bErr) throw bErr;
  return episode.id;
}

// ---- Ficha clínica --------------------------------------------------
export async function getSheet(episodeId) {
  const { data, error } = await supabase
    .from('clinical_sheets').select('*')
    .eq('episode_id', episodeId).eq('deleted', false).maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertSheet(episodeId, fields) {
  const uid = await actorId();
  const payload = { episode_id: episodeId, ...fields, updated_by: uid };
  const { data, error } = await supabase
    .from('clinical_sheets')
    .upsert(payload, { onConflict: 'episode_id' })
    .select('*').single();
  if (error) throw error;
  return data;
}

// ---- Lesiones por presión ------------------------------------------
export async function listPressureInjuries(episodeId) {
  const { data, error } = await supabase
    .from('pressure_injuries').select('*')
    .eq('episode_id', episodeId).eq('deleted', false)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function savePressureInjury(episodeId, pi) {
  const uid = await actorId();
  const row = { ...pi, episode_id: episodeId, updated_by: uid };
  if (pi.id) {
    const { data, error } = await supabase.from('pressure_injuries')
      .update(row).eq('id', pi.id).select('*').single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('pressure_injuries')
    .insert({ ...row, created_by: uid }).select('*').single();
  if (error) throw error;
  return data;
}

export async function deletePressureInjury(id) {
  const { error } = await supabase.from('pressure_injuries')
    .update({ deleted: true, deleted_at: new Date().toISOString(), deleted_by: await actorId() })
    .eq('id', id);
  if (error) throw error;
}

// ---- Balance hídrico (acumulado = suma de los 12h) ------------------
export async function listBalances(episodeId) {
  const { data, error } = await supabase
    .from('fluid_balances').select('*')
    .eq('episode_id', episodeId).eq('deleted', false)
    .order('recorded_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addBalance(episodeId, balance12h) {
  const uid = await actorId();
  const { data, error } = await supabase.from('fluid_balances')
    .insert({ episode_id: episodeId, balance_12h: balance12h, created_by: uid })
    .select('*').single();
  if (error) throw error;
  return data;
}

export function cumulativeBalance(balances) {
  return balances.reduce((s, b) => s + Number(b.balance_12h || 0), 0);
}

// ---- Lecturas cruzadas (read-only) ---------------------------------
// Exámenes alterados y Pendientes vienen de sus módulos. Aún no construidos:
// consultas defensivas que devuelven [] si la tabla/columna no existe.
export async function getAlteredLabs(episodeId) {
  try {
    const { data, error } = await supabase
      .from('lab_results')
      .select('id, analyte, value, unit, flag, lab_panels!inner(episode_id)')
      .eq('lab_panels.episode_id', episodeId)
      .not('flag', 'is', null);
    if (error) throw error;
    return data ?? [];
  } catch { return []; }
}

export async function getPendingTasks(episodeId) {
  try {
    const { data, error } = await supabase
      .from('tasks').select('id, title, status, due_at')
      .eq('episode_id', episodeId).neq('status', 'completado');
    if (error) throw error;
    return data ?? [];
  } catch { return []; }
}

// Vacía la sala: soft-delete de todas las camas activas y libera sus números.
export async function emptyWard(wardId) {
  const { data: active, error: qErr } = await supabase
    .from('beds').select('id').eq('ward_id', wardId).eq('deleted', false);
  if (qErr) throw qErr;
  const uid = await actorId();
  for (const b of active || []) {
    const { error } = await supabase.from('beds').update({
      deleted: true, deleted_at: new Date().toISOString(), deleted_by: uid,
      bed_number: null, label: `borrada-${b.id}`,
    }).eq('id', b.id);
    if (error) throw error;
  }
}

// ---- Medicamentos asignados a la cama (episodio) --------------------
const EPMED_COLS =
  'id, episode_id, infusion_rate_value, infusion_rate_unit, ' +
  'medication:medication_library(id, generic_name, admin_rate_unit)';

export async function listEpisodeMedications(episodeId) {
  const { data, error } = await supabase
    .from('episode_medications')
    .select(EPMED_COLS)
    .eq('episode_id', episodeId).eq('deleted', false)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addEpisodeMedication(episodeId, medicationId, rateValue, rateUnit) {
  const uid = await actorId();
  const { data, error } = await supabase
    .from('episode_medications')
    .insert({
      episode_id: episodeId, medication_id: medicationId,
      infusion_rate_value: rateValue, infusion_rate_unit: rateUnit,
      created_by: uid, updated_by: uid,
    })
    .select(EPMED_COLS).single();
  if (error) throw error;
  return data;
}

export async function updateEpisodeMedicationRate(id, rateValue, rateUnit) {
  const uid = await actorId();
  const { data, error } = await supabase
    .from('episode_medications')
    .update({
      infusion_rate_value: rateValue, infusion_rate_unit: rateUnit,
      updated_by: uid, updated_at: new Date().toISOString(),
    })
    .eq('id', id).select(EPMED_COLS).single();
  if (error) throw error;
  return data;
}

export async function removeEpisodeMedication(id) {
  const uid = await actorId();
  const { error } = await supabase
    .from('episode_medications')
    .update({ deleted: true, deleted_at: new Date().toISOString(), deleted_by: uid })
    .eq('id', id);
  if (error) throw error;
}