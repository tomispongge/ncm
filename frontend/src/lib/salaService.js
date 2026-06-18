// NCM · Módulo Sala — capa de datos (Supabase)
import { supabase } from './supabase';

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

// Crea paciente + episodio mínimos y devuelve el id del episodio.
async function createPatientEpisode(label, uid) {
  const { data: patient, error: pErr } = await supabase
    .from('patients').insert({ full_name: `Paciente ${label}` })
    .select('id').single();
  if (pErr) throw pErr;
  const { data: episode, error: eErr } = await supabase
    .from('episodes').insert({
      patient_id: patient.id,
      admission_date: new Date().toISOString(),
      created_by: uid,
    }).select('id').single();
  if (eErr) throw eErr;
  return episode.id;
}

// Alta de UNA cama con número asignado por el usuario (1–20) y estado.
// Para 'ocupada' creamos el episodio ANTES de insertar la cama, así nunca
// queda una cama "colgada" si la creación del paciente fallara.
export async function addBed(wardId, number, status, spawnIndex = 0) {
  const n = Number(number);
  if (!Number.isInteger(n) || n < 1 || n > 20) {
    throw new Error('El número de cama debe ser un entero entre 1 y 20.');
  }
  const uid = await actorId();
  const col = spawnIndex % 5, row = Math.floor(spawnIndex / 5);
  const episodeId = status === 'ocupada' ? await createPatientEpisode(`Cama ${n}`, uid) : null;
  const { data: bed, error } = await supabase.from('beds').insert({
    ward_id: wardId, label: `Cama ${n}`, bed_number: n,
    status: status === 'ocupada' ? 'ocupada' : 'libre',
    episode_id: episodeId,
    pos_x: 24 + col * 120, pos_y: 24 + row * 130,
    created_by: uid,
  }).select('id, ward_id, label, bed_number, status, pos_x, pos_y, episode_id').single();
  if (error) {
    if (error.code === '23505') throw new Error(`La cama ${n} ya existe en esta sala.`);
    throw error;
  }
  return bed;
}

export async function updateBedPosition(bedId, x, y) {
  const { error } = await supabase.from('beds')
    .update({ pos_x: Math.round(x), pos_y: Math.round(y), updated_by: await actorId() })
    .eq('id', bedId);
  if (error) throw error;
}

export async function softDeleteBed(bedId) {
  // Liberamos número y etiqueta para que puedan reusarse de inmediato.
  const { error } = await supabase.from('beds')
    .update({
      deleted: true, deleted_at: new Date().toISOString(), deleted_by: await actorId(),
      bed_number: null, label: `borrada-${bedId}`,
    })
    .eq('id', bedId);
  if (error) throw error;
}

// Vaciar sala: soft-delete de todas las camas activas (libera todos los números).
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

// ---- Ocupación: garantizar episodio para la cama --------------------
export async function ensureEpisodeForBed(bed) {
  if (bed.episode_id) return bed.episode_id;
  const uid = await actorId();
  const episodeId = await createPatientEpisode(bed.label, uid);
  const { error } = await supabase.from('beds')
    .update({ episode_id: episodeId, status: 'ocupada', updated_by: uid })
    .eq('id', bed.id);
  if (error) throw error;
  return episodeId;
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
