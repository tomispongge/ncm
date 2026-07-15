// frontend/src/lib/turnoService.js
// Entrega de turno: nota de entrega por cama (una por episodio).
// La nota vive en clinical_sheets.handoff_note; se reusa upsertSheet para
// guardarla y getOrCreateDefaultWard/listBeds para armar la sala completa.

import { supabase } from './supabase';
import { getOrCreateDefaultWard, listBeds, upsertSheet } from './salaService';

// Todas las camas ocupadas con su nota de entrega actual.
// → [{ id, label, episode_id, note }]
export async function listHandoffs() {
  const w = await getOrCreateDefaultWard();
  const beds = (await listBeds(w.id)).filter((b) => b.episode_id);
  const ids = beds.map((b) => b.episode_id);

  const noteByEp = {};
  if (ids.length) {
    try {
      const { data, error } = await supabase
        .from('clinical_sheets')
        .select('episode_id, handoff_note')
        .in('episode_id', ids)
        .eq('deleted', false);
      if (error) throw error;
      for (const r of data || []) noteByEp[r.episode_id] = r.handoff_note ?? '';
    } catch {
      /* la columna handoff_note aún no existe: notas vacías hasta correr el SQL */
    }
  }

  return beds.map((b) => ({
    id: b.id,
    label: b.label,
    episode_id: b.episode_id,
    note: noteByEp[b.episode_id] ?? '',
  }));
}

// Guarda (o limpia) la nota de entrega de un episodio.
export function saveHandoff(episodeId, note) {
  return upsertSheet(episodeId, { handoff_note: note });
}
