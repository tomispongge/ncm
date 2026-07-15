// NCM · Módulo Sala — capa de datos (Supabase)
// Ajusta la ruta del cliente a la de tu repo (p. ej. ../supabaseClient).
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

export async function addBed(wardId, number, status, spawnIndex = 0) {
  const n = Number(number);
  if (!Number.isInteger(n) || n < 1 || n > 20) {
    throw new Error('El número de cama debe ser un entero entre 1 y 20.');
  }
  const uid = await actorId();
  const col = spawnIndex % 5, row = Math.floor(spawnIndex / 5);
  const { data: bed, error } = await supabase.from('beds').insert({
    ward_id: wardId, label: `Cama ${n}`, bed_number: n,
    status: 'libre',
    pos_x: 24 + col * 120, pos_y: 24 + row * 130,
    created_by: uid,
  }).select('id, ward_id, label, bed_number, status, pos_x, pos_y, episode_id').single();
  if (error) {
    if (error.code === '23505') throw new Error(`La cama ${n} ya existe en esta sala.`);
    throw error;
  }
  // "Ocupada": crea paciente+episodio y deja la cama ocupada (reusa el helper).
  if (status === 'ocupada') {
    const episodeId = await ensureEpisodeForBed(bed);
    return { ...bed, episode_id: episodeId, status: 'ocupada' };
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
// "Exámenes destacados": los analitos que el usuario destacó en el módulo
// Laboratorio (tabla lab_highlights), cada uno con su ÚLTIMO valor. Los que
// están fuera de rango traen is_abnormal=true (la UI los pinta en rojo).
// Se mantiene el nombre getAlteredLabs para no romper el import de la ficha.
// Consulta defensiva: devuelve [] si algo falla.
export async function getAlteredLabs(episodeId) {
  try {
    // 1) analitos destacados de esta cama/episodio
    const { data: highlights, error: hErr } = await supabase
      .from('lab_highlights')
      .select('analyte_key')
      .eq('episode_id', episodeId);
    if (hErr) throw hErr;

    const keys = (highlights || []).map((h) => h.analyte_key);
    if (!keys.length) return [];

    // 2) resultados de esos analitos en los informes de este episodio
    const { data: rows, error: rErr } = await supabase
      .from('lab_results')
      .select(
        'analyte, analyte_key, value_text, value_num, unit, ref_low, ref_high, ref_text, is_abnormal, ' +
        'lab_panels!inner(episode_id, taken_at)'
      )
      .eq('lab_panels.episode_id', episodeId)
      .in('analyte_key', keys);
    if (rErr) throw rErr;

    // 3) por cada analito destacado, quedarse con el valor del informe más reciente
    const latest = new Map();
    for (const r of rows || []) {
      const takenAt = r.lab_panels?.taken_at ?? null;
      const ts = takenAt ? Date.parse(takenAt) : -Infinity;
      const prev = latest.get(r.analyte_key);
      if (!prev || ts > prev._ts) {
        latest.set(r.analyte_key, {
          analyteKey: r.analyte_key,
          analyte: r.analyte,
          value: r.value_text,      // alias compatibilidad con la UI previa
          value_text: r.value_text,
          value_num: r.value_num,
          unit: r.unit,
          ref_low: r.ref_low,
          ref_high: r.ref_high,
          ref_text: r.ref_text,
          is_abnormal: r.is_abnormal,
          flag: r.is_abnormal ? 'alterado' : null, // alias compatibilidad
          taken_at: takenAt,
          _ts: ts,
        });
      }
    }

    const collator = new Intl.Collator('es', { sensitivity: 'base' });
    return Array.from(latest.values())
      .map(({ _ts, ...rest }) => rest)
      .sort((a, b) => collator.compare(a.analyte || '', b.analyte || ''));
  } catch {
    return [];
  }
}

// Pendientes NO completados del episodio (módulo Pendientes). Estructurados:
// kind/subtype/detail/processed → la UI arma el resumen con summarizeTask().
// Defensiva: devuelve [] si la tabla no existe todavía.
export async function getPendingTasks(episodeId) {
  try {
    const { data, error } = await supabase
      .from('tasks').select('id, kind, subtype, detail, processed')
      .eq('episode_id', episodeId).eq('deleted', false).eq('done', false)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  } catch { return []; }
}

// Datos extra de la tarjeta flotante de la cama: exámenes destacados,
// pendientes y balance hídrico (12h más reciente + acumulado). Defensivo:
// nunca lanza (la tarjeta no debe romperse si falta una tabla).
export async function getBedExtras(episodeId) {
  const [labs, pending, balances] = await Promise.all([
    getAlteredLabs(episodeId),          // ya es defensiva
    getPendingTasks(episodeId),         // ya es defensiva
    listBalances(episodeId).catch(() => []),
  ]);
  return {
    labs,
    pending,
    balance12h: balances[0]?.balance_12h ?? null,   // el más reciente
    balanceCumulative: balances.length ? cumulativeBalance(balances) : null,
  };
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