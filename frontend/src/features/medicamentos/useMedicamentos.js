// NCM · Módulo Medicamentos — hook de estado
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listMedications, createMedication, updateMedication,
  softDeleteMedication, isCurrentUserAdmin,
} from '../../lib/medicamentosService';

const byName = (a, b) => (a.generic_name || '').localeCompare(b.generic_name || '', 'es');

export function useMedicamentos() {
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [list, admin] = await Promise.all([listMedications(), isCurrentUserAdmin()]);
        setMeds(list);
        setIsAdmin(admin);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const create = useCallback(async (fields) => {
    const row = await createMedication(fields);
    setMeds((prev) => [...prev, row].sort(byName));
    return row;
  }, []);

  const update = useCallback(async (id, fields) => {
    const row = await updateMedication(id, fields);
    setMeds((prev) => prev.map((m) => (m.id === id ? row : m)).sort(byName));
    return row;
  }, []);

  const remove = useCallback(async (id) => {
    await softDeleteMedication(id);
    setMeds((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return meds;
    return meds.filter((m) =>
      (m.generic_name || '').toLowerCase().includes(q) ||
      (m.brand_names || '').toLowerCase().includes(q));
  }, [meds, query]);

  return {
    meds: filtered, total: meds.length,
    loading, error, isAdmin,
    query, setQuery,
    create, update, remove,
  };
}
