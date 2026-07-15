// frontend/src/features/pendientes/usePendientes.js
// Estado de los pendientes de una cama/episodio para el panel de gestión.
import { useState, useEffect, useCallback } from 'react';
import { listTasks, addTask, updateTask, removeTask } from '../../lib/pendientesService';

export function usePendientes(episodeId) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!episodeId) { setTasks([]); return; }
    setLoading(true);
    setError(null);
    try {
      setTasks(await listTasks(episodeId));
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [episodeId]);

  useEffect(() => { load(); }, [load]);

  const add = useCallback(async (payload) => {
    setSaving(true);
    try {
      const row = await addTask(episodeId, payload);
      setTasks((p) => [...p, row]);
    } finally {
      setSaving(false);
    }
  }, [episodeId]);

  // Actualiza en la DB y refleja en memoria (done, processed, etc.).
  const patch = useCallback(async (id, fields) => {
    const row = await updateTask(id, fields);
    setTasks((p) => p.map((t) => (t.id === id ? row : t)));
  }, []);

  const remove = useCallback(async (id) => {
    await removeTask(id);
    setTasks((p) => p.filter((t) => t.id !== id));
  }, []);

  return { tasks, loading, error, saving, add, patch, remove, reload: load };
}
