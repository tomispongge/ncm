// NCM · Módulo Sala — hook de estado
import { useCallback, useEffect, useState } from 'react';
import {
  getOrCreateDefaultWard, listBeds, addBed, updateBedPosition,
  softDeleteBed, emptyWard as emptyWardSvc,
} from '../../lib/salaService';
import { MAX_BEDS } from '../../lib/sala/constants';

export function useSala() {
  const [ward, setWard] = useState(null);
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const w = await getOrCreateDefaultWard();
        setWard(w);
        setBeds(await listBeds(w.id));
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  // El usuario asigna número (1–20) y estado; devuelve la cama creada.
  const handleAddBed = useCallback(async (number, status) => {
    if (!ward) return null;
    const bed = await addBed(ward.id, number, status, beds.length);
    setBeds((prev) => [...prev, bed]);
    return bed;
  }, [ward, beds]);

  const handleEmptyWard = useCallback(async () => {
    if (!ward) return;
    try { await emptyWardSvc(ward.id); setBeds([]); }
    catch (e) { setError(e.message); }
  }, [ward]);

  const persistPosition = useCallback(async (bedId, x, y) => {
    setBeds((prev) => prev.map((b) => (b.id === bedId ? { ...b, pos_x: x, pos_y: y } : b)));
    try { await updateBedPosition(bedId, x, y); }
    catch (e) { setError(e.message); }
  }, []);

  const removeBed = useCallback(async (bedId) => {
    try {
      await softDeleteBed(bedId);          // libera su número
      setBeds((prev) => prev.filter((b) => b.id !== bedId));
    } catch (e) { setError(e.message); }
  }, []);

  const patchBed = useCallback((bedId, patch) => {
    setBeds((prev) => prev.map((b) => (b.id === bedId ? { ...b, ...patch } : b)));
  }, []);

  return {
    ward, beds, loading, error,
    canAdd: beds.length < MAX_BEDS,
    usedNumbers: beds.map((b) => b.bed_number).filter((n) => n != null),
    addBed: handleAddBed, emptyWard: handleEmptyWard,
    persistPosition, removeBed, patchBed,
  };
}
