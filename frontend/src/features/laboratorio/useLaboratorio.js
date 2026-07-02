// frontend/src/features/laboratorio/useLaboratorio.js
// Hook del modulo Laboratorio para una cama/episodio.
// Conecta el service con los componentes y maneja el modo "destacar"
// como borrador local que se confirma con "Actualizar resultado".

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getLabData,
  savePanel,
  deletePanel,
  setHighlights,
} from '../../lib/laboratorioService';
import { buildMatrix } from '../../lib/laboratorio/constants';

export function useLaboratorio(episodeId) {
  const [panels, setPanels] = useState([]);
  const [results, setResults] = useState([]);
  const [committedKeys, setCommittedKeys] = useState([]); // destacados guardados en DB
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // modo "destacar": seleccion local (borrador) hasta "Actualizar resultado"
  const [selecting, setSelecting] = useState(false);
  const [draftKeys, setDraftKeys] = useState(() => new Set());

  const load = useCallback(async () => {
    if (!episodeId) {
      setPanels([]);
      setResults([]);
      setCommittedKeys([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getLabData(episodeId);
      setPanels(data.panels);
      setResults(data.results);
      setCommittedKeys(data.highlights.map((h) => h.analyte_key));
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [episodeId]);

  useEffect(() => {
    load();
  }, [load]);

  // conjunto de destacados que aplica AHORA: borrador si estamos seleccionando,
  // si no, el confirmado. Con esto la matriz reordena en vivo al marcar.
  const effectiveKeys = useMemo(
    () => (selecting ? draftKeys : new Set(committedKeys)),
    [selecting, draftKeys, committedKeys],
  );

  const matrix = useMemo(
    () => buildMatrix(panels, results, effectiveKeys),
    [panels, results, effectiveKeys],
  );

  // ---------------- acciones de datos ----------------

  // La llama la pantalla de verificacion (despues del OCR + correccion humana).
  const addPanel = useCallback(
    async ({ takenAt, labSource = null, results: rows = [] }) => {
      setSaving(true);
      setError(null);
      try {
        await savePanel(episodeId, { takenAt, labSource, results: rows });
        await load();
      } catch (e) {
        setError(e?.message || String(e));
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [episodeId, load],
  );

  // Borra una columna completa (util si el OCR creo una mala).
  const removePanel = useCallback(
    async (panelId) => {
      setSaving(true);
      setError(null);
      try {
        await deletePanel(panelId);
        await load();
      } catch (e) {
        setError(e?.message || String(e));
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  // ---------------- modo destacar ----------------

  // Boton "Destacar resultados": entra en modo seleccion partiendo de lo confirmado.
  const startSelecting = useCallback(() => {
    setDraftKeys(new Set(committedKeys));
    setSelecting(true);
  }, [committedKeys]);

  const toggleAnalyte = useCallback((analyteKey) => {
    setDraftKeys((prev) => {
      const next = new Set(prev);
      if (next.has(analyteKey)) next.delete(analyteKey);
      else next.add(analyteKey);
      return next;
    });
  }, []);

  const cancelSelecting = useCallback(() => {
    setSelecting(false);
    setDraftKeys(new Set(committedKeys));
  }, [committedKeys]);

  // Boton "Actualizar resultado": confirma el borrador -> persiste en lab_highlights.
  // Sala (que lee en vivo) mostrara estos analitos con su ultimo valor.
  const commitHighlights = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await setHighlights(episodeId, Array.from(draftKeys));
      await load();
      setSelecting(false);
    } catch (e) {
      setError(e?.message || String(e));
      throw e;
    } finally {
      setSaving(false);
    }
  }, [episodeId, draftKeys, load]);

  return {
    // estado
    loading,
    saving,
    error,
    hasData: panels.length > 0,

    // matriz
    columns: matrix.columns, // informes (columnas), mas reciente primero
    rows: matrix.rows,       // filas (destacadas arriba, A->Z); cada fila: {analyteKey, analyte, pinned, cells}

    // datos
    addPanel,   // <- pantalla de verificacion post-OCR
    removePanel,
    reload: load,

    // destacar / actualizar
    selecting,
    startSelecting,   // <- boton "Destacar resultados"
    toggleAnalyte,    // <- checkbox por fila (usar row.pinned como estado)
    cancelSelecting,
    commitHighlights, // <- boton "Actualizar resultado"
    committedKeys,
  };
}
