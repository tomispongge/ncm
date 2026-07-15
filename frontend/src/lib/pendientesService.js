// frontend/src/lib/pendientesService.js
// Capa de datos del módulo Pendientes (tabla `tasks`, episode-centric).
// Soft delete e RLS como el resto de tablas clínicas.

import { supabase } from './supabase';

async function actorId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

const COLS = 'id, episode_id, kind, subtype, detail, processed, done, created_at';

// Todos los pendientes NO borrados del episodio (para el panel de gestión).
export async function listTasks(episodeId) {
  const { data, error } = await supabase
    .from('tasks')
    .select(COLS)
    .eq('episode_id', episodeId)
    .eq('deleted', false)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addTask(episodeId, { kind, subtype = null, detail = null, processed = false }) {
  const uid = await actorId();
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      episode_id: episodeId,
      kind,
      subtype,
      detail,
      processed,
      created_by: uid,
      updated_by: uid,
    })
    .select(COLS)
    .single();
  if (error) throw error;
  return data;
}

// Actualiza campos (p. ej. { done: true } o { processed: true }).
export async function updateTask(id, fields) {
  const uid = await actorId();
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...fields, updated_by: uid, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function removeTask(id) {
  const uid = await actorId();
  const { error } = await supabase
    .from('tasks')
    .update({ deleted: true, deleted_at: new Date().toISOString(), deleted_by: uid })
    .eq('id', id);
  if (error) throw error;
}
