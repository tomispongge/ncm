// frontend/src/lib/laboratorio/constants.js
// Helpers PUROS del modulo Laboratorio (sin acceso a red ni a Supabase).
// Los usa el service para derivar campos y los usara la pantalla de
// verificacion para previsualizar el rojo antes de guardar.

/**
 * Normaliza el nombre de un analito para poder agrupar el MISMO analito
 * entre columnas (informes) en la misma fila de la matriz.
 * "Hemoglobina " -> "hemoglobina" ; "Creatinina" y "creatinina" -> igual.
 */
export function normalizeAnalyte(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')                 // separa tildes
    .replace(/[\u0300-\u036f]/g, '')  // las elimina
    .replace(/\s+/g, ' ')             // colapsa espacios
    .trim();
}

/**
 * Extrae el primer numero de un texto de valor, tolerando el decimal
 * chileno con coma. Devuelve null si no hay numero (ej. "Negativo").
 *   "13,5"    -> 13.5
 *   "< 0.1"   -> 0.1   (extrae el numero; el "<" se maneja aparte si hace falta)
 *   "Negativo"-> null
 */
export function parseValueNum(text) {
  if (text === null || text === undefined) return null;
  const s = String(text).trim();
  if (!s) return null;
  const cleaned = s.replace(',', '.');        // decimal chileno -> punto
  const m = cleaned.match(/-?\d+(\.\d+)?/);   // primer numero
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Coerciona un valor (string de OCR o numero) a numero o null.
 * Se usa para los limites del intervalo (ref_low / ref_high).
 */
export function toNumOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  return parseValueNum(String(v));
}

/**
 * Decide si un resultado esta ALTERADO (rojo), comparando el valor
 * numerico contra el intervalo escaneado de ESE informe.
 * Solo aplica a valores numericos con al menos un limite numerico.
 * Los valores de texto ("Negativo"/"Positivo") no se marcan automatico.
 */
export function computeAbnormal(valueNum, refLow, refHigh) {
  if (valueNum === null || valueNum === undefined) return false;
  if (refLow !== null && refLow !== undefined && valueNum < refLow) return true;
  if (refHigh !== null && refHigh !== undefined && valueNum > refHigh) return true;
  return false;
}

/**
 * Arma la matriz para la vista de una cama:
 *  - columns: los informes recibidos. Se respeta el orden que venga; el
 *    service los entrega del mas reciente al mas antiguo.
 *  - rows: una fila por analito, agrupado por analyte_key. Cada fila trae
 *    su etiqueta, si esta destacada (pinned) y sus celdas por panel.
 * Orden de filas: destacadas primero (A->Z), luego el resto (A->Z).
 * pinnedKeys: Set (o array) de analyte_key destacados que aplican ahora.
 */
export function buildMatrix(panels, results, pinnedKeys) {
  const pins = pinnedKeys instanceof Set ? pinnedKeys : new Set(pinnedKeys || []);
  const columns = panels || [];

  // indice de recencia por panel (0 = primero de la lista = mas reciente)
  const panelOrder = new Map();
  columns.forEach((p, i) => panelOrder.set(p.id, i));

  // agrupa resultados por analyte_key
  const byKey = new Map();
  for (const r of results || []) {
    const key = r.analyte_key;
    if (!key) continue;
    let row = byKey.get(key);
    if (!row) {
      row = { analyteKey: key, analyte: r.analyte || key, labelOrder: Infinity, cells: {} };
      byKey.set(key, row);
    }
    row.cells[r.panel_id] = r;
    // etiqueta: la del panel mas reciente que tenga este analito
    const ord = panelOrder.has(r.panel_id) ? panelOrder.get(r.panel_id) : Infinity;
    if (ord < row.labelOrder) {
      row.labelOrder = ord;
      row.analyte = r.analyte || key;
    }
  }

  const rows = Array.from(byKey.values()).map((row) => ({
    analyteKey: row.analyteKey,
    analyte: row.analyte,
    pinned: pins.has(row.analyteKey),
    cells: row.cells,
  }));

  const collator = new Intl.Collator('es', { sensitivity: 'base' });
  rows.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1; // destacadas arriba
    return collator.compare(a.analyte, b.analyte);        // A->Z
  });

  return { columns, rows };
}
