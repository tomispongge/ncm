// frontend/src/lib/laboratorioService.js
// Capa de acceso a datos del modulo Laboratorio.
// Regla del proyecto: laboratorio NO usa soft-delete; el borrado es fisico
// con cascade. La retencion de 7 fechas se aplica en purgeOldPanels().

import { supabase } from './supabase';
import {
  normalizeAnalyte,
  parseValueNum,
  toNumOrNull,
  computeAbnormal,
} from './laboratorio/constants';

// UUID del usuario actual, sin FK (patron del proyecto).
async function actorId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

/**
 * Trae todo lo necesario para pintar la matriz de una cama/episodio:
 *  - panels: las columnas (max 7, mas reciente primero)
 *  - results: todas las celdas de esos panels
 *  - highlights: los analitos destacados de ese episodio
 * El armado de la matriz (agrupar por analyte_key, orden de destacados)
 * se hace en el hook/componente, no aqui.
 */
export async function getLabData(episodeId) {
  const { data: panels, error: pErr } = await supabase
    .from('lab_panels')
    .select('*')
    .eq('episode_id', episodeId)
    .order('taken_at', { ascending: false })
    .limit(7);
  if (pErr) throw pErr;

  const panelIds = (panels || []).map((p) => p.id);

  let results = [];
  if (panelIds.length) {
    const { data: r, error: rErr } = await supabase
      .from('lab_results')
      .select('*')
      .in('panel_id', panelIds)
      .order('analyte', { ascending: true });
    if (rErr) throw rErr;
    results = r || [];
  }

  const { data: highlights, error: hErr } = await supabase
    .from('lab_highlights')
    .select('*')
    .eq('episode_id', episodeId);
  if (hErr) throw hErr;

  return { panels: panels || [], results, highlights: highlights || [] };
}

/**
 * Guarda un informe verificado (una columna nueva) + sus resultados.
 * results: array de { analyte, valueText, unit, refLow, refHigh, refText }
 * El service es la fuente de verdad de los campos derivados:
 * calcula analyte_key, value_num e is_abnormal el mismo (ignora lo que
 * venga en esos campos) para garantizar consistencia.
 * Al terminar, aplica la purga de 7 fechas.
 */
export async function savePanel(episodeId, { takenAt, labSource = null, results = [] }) {
  const actor = await actorId();

  const { data: panel, error: pErr } = await supabase
    .from('lab_panels')
    .insert({
      episode_id: episodeId,
      taken_at: takenAt,
      lab_source: labSource,
      created_by: actor,
      updated_by: actor,
    })
    .select()
    .single();
  if (pErr) throw pErr;

  const rows = (results || [])
    .map((r) => {
      const refLow = toNumOrNull(r.refLow);
      const refHigh = toNumOrNull(r.refHigh);
      const valueNum = parseValueNum(r.valueText);
      return {
        panel_id: panel.id,
        analyte: (r.analyte || '').trim(),
        analyte_key: normalizeAnalyte(r.analyte),
        value_text: r.valueText ?? null,
        value_num: valueNum,
        unit: r.unit ?? null,
        ref_low: refLow,
        ref_high: refHigh,
        ref_text: r.refText ?? null,
        is_abnormal: computeAbnormal(valueNum, refLow, refHigh),
      };
    })
    .filter((r) => r.analyte.length > 0 && r.analyte_key.length > 0);

  if (rows.length) {
    const { error: rErr } = await supabase.from('lab_results').insert(rows);
    if (rErr) {
      // limpieza: no dejar una columna vacia si fallaron los resultados
      await supabase.from('lab_panels').delete().eq('id', panel.id);
      throw rErr;
    }
  }

  // La purga es una optimización de retención: si falla, el informe YA quedó
  // guardado. No hacemos fallar el guardado por esto (evita el patrón
  // "parece que falló -> reintento -> columna duplicada").
  try {
    await purgeOldPanels(episodeId);
  } catch (e) {
    console.warn('purgeOldPanels falló (el informe se guardó igual):', e?.message || e);
  }
  return panel;
}

/**
 * Retencion: conserva los 'keep' informes mas recientes por episodio y
 * BORRA fisicamente los mas antiguos. El borrado + el registro forense en
 * audit_log (solo metadata, SIN valores de salud) ocurren de forma atomica
 * dentro de la funcion SQL lab_purge_old_panels (SECURITY DEFINER).
 * Requiere la migracion laboratorio_02_purge.sql.
 */
export async function purgeOldPanels(episodeId, keep = 7) {
  const actor = await actorId();
  const { data, error } = await supabase.rpc('lab_purge_old_panels', {
    p_episode_id: episodeId,
    p_actor: actor,
    p_keep: keep,
  });
  if (error) throw error;
  return { purged: data ?? 0 };
}

/**
 * Reemplaza el set de analitos destacados de un episodio.
 * "Destacar resultados" entrega el conjunto elegido; esto lo persiste.
 * analyteKeys: array de nombres o keys; se normalizan y deduplican.
 */
export async function setHighlights(episodeId, analyteKeys = []) {
  const actor = await actorId();
  const keys = Array.from(
    new Set((analyteKeys || []).map(normalizeAnalyte).filter(Boolean)),
  );

  const { error: dErr } = await supabase
    .from('lab_highlights')
    .delete()
    .eq('episode_id', episodeId);
  if (dErr) throw dErr;

  if (!keys.length) return [];

  const rows = keys.map((k) => ({
    episode_id: episodeId,
    analyte_key: k,
    created_by: actor,
  }));
  const { data, error: iErr } = await supabase
    .from('lab_highlights')
    .insert(rows)
    .select();
  if (iErr) throw iErr;
  return data || [];
}

/**
 * Borra fisicamente un informe (columna) completo. Util si el OCR creo una
 * columna mala. Cascade elimina sus resultados.
 */
export async function deletePanel(panelId) {
  const { error } = await supabase.from('lab_panels').delete().eq('id', panelId);
  if (error) throw error;
  return true;
}
