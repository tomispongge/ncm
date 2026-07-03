// frontend/src/features/laboratorio/LabAddForm.jsx
// Formulario de ingreso MANUAL de un informe de laboratorio (una columna nueva).
// Es también la base de la futura pantalla de verificación del OCR: el OCR
// prellenará estos mismos campos y el humano confirmará antes de guardar.
// Nunca guarda sin acción explícita ("Guardar informe").
//
// El preview del "rojo" (alterado) usa los MISMOS helpers puros que el service
// aplica al guardar, así lo que ves es lo que queda persistido.
// Bloqueo de RUT (Ley 21.719) en todos los campos de texto libre.

import { useState } from 'react';
import { parseValueNum, toNumOrNull, computeAbnormal } from '../../lib/laboratorio/constants';
import { containsRut } from '../../lib/sala/validation';
import { runOcr, deidentify, parseLabText } from '../../lib/laboratorio/ocr';

const field =
  'w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm';

// "YYYY-MM-DDTHH:mm" en hora local para el input datetime-local.
function nowLocalInput() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyRow() {
  return { analyte: '', valueText: '', unit: '', refLow: '', refHigh: '', refText: '' };
}

// Marca en rojo el borde de un campo que contiene un RUT.
function rutRing(value) {
  return containsRut(value) ? 'border-red-500 ring-1 ring-red-400' : '';
}

export function LabAddForm({ saving = false, onCancel, onSubmit }) {
  const [takenAt, setTakenAt] = useState(nowLocalInput);
  const [labSource, setLabSource] = useState('');
  const [rows, setRows] = useState(() => [emptyRow(), emptyRow(), emptyRow()]);
  const [err, setErr] = useState('');

  // escaneo OCR (on-device) + análisis con IA
  const [scanning, setScanning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [ocrText, setOcrText] = useState(null); // null = sin panel; string = texto de-identificado editable
  const [scanErr, setScanErr] = useState('');

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-elegir el mismo archivo
    if (!file) return;
    setScanErr('');
    setScanning(true);
    setOcrText('');
    try {
      const raw = await runOcr(file);
      setOcrText(deidentify(raw));
    } catch {
      setScanErr('No se pudo leer la imagen. Prueba con una foto más nítida.');
      setOcrText(null);
    } finally {
      setScanning(false);
    }
  };

  const analyze = async () => {
    setScanErr('');
    setAnalyzing(true);
    try {
      const data = await parseLabText(ocrText);
      const aiRows = (Array.isArray(data?.results) ? data.results : [])
        .filter((r) => (r.analyte || '').trim());
      if (aiRows.length) {
        setRows(
          aiRows.map((r) => ({
            analyte: r.analyte || '',
            valueText: r.valueText || '',
            unit: r.unit || '',
            refLow: r.refLow || '',
            refHigh: r.refHigh || '',
            refText: r.refText || '',
          })),
        );
      }
      if (data?.labSource) setLabSource(data.labSource);
      if (data?.takenAt && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(data.takenAt)) {
        setTakenAt(data.takenAt);
      }
      setOcrText(null); // cierra el panel; el humano revisa la tabla y guarda
    } catch (e) {
      setScanErr(
        e?.message ||
          'No se pudo analizar. En desarrollo local la IA requiere el deploy o "vercel dev".',
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const setRow = (i, patch) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (i) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : prev));

  const rowHasRut = (r) =>
    containsRut(r.analyte) || containsRut(r.valueText) || containsRut(r.unit) || containsRut(r.refText);
  const hasRut = containsRut(labSource) || rows.some(rowHasRut);

  // filas válidas = analito + valor no vacíos
  const filled = rows.filter((r) => r.analyte.trim() && r.valueText.trim());
  const canSave = !!takenAt && filled.length > 0 && !hasRut && !saving;

  const submit = async () => {
    setErr('');
    if (!takenAt) return setErr('Indica la fecha del informe.');
    if (filled.length === 0) return setErr('Agrega al menos un examen con analito y valor.');
    if (hasRut) return setErr('Quita el RUT o identificadores personales antes de guardar.');
    try {
      await onSubmit({
        takenAt: new Date(takenAt).toISOString(),
        labSource: labSource.trim() || null,
        results: filled.map((r) => ({
          analyte: r.analyte,
          valueText: r.valueText,
          unit: r.unit || null,
          refLow: r.refLow,
          refHigh: r.refHigh,
          refText: r.refText || null,
        })),
      });
    } catch (e) {
      setErr(e?.message || 'No se pudo guardar el informe.');
    }
  };

  const btnPrimary =
    'rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50';
  const btnSecondary =
    'rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50';
  const cell = 'border-b border-zinc-100 dark:border-zinc-800 px-1.5 py-1.5 align-top';
  const head = 'px-1.5 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 px-5 py-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Agregar resultados</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cerrar"
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Disclaimer no suprimible */}
        <div className="px-5 py-2 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
          Herramienta de apoyo. La validación final corresponde al profesional sanitario responsable.
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
          {/* Escanear informe (OCR on-device + IA) */}
          <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className={`${btnSecondary} cursor-pointer`}>
                {scanning ? 'Leyendo imagen…' : 'Escanear informe (foto/archivo)'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickFile}
                  disabled={scanning || analyzing}
                />
              </label>
              <span className="text-xs text-zinc-400">
                La imagen se procesa en tu dispositivo y no se guarda.
              </span>
            </div>

            {ocrText !== null && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Texto leído (RUT tapado automáticamente). Revisa y borra nombres u otros datos
                  personales antes de enviar a la IA.
                </p>
                <textarea
                  rows={6}
                  className={field}
                  value={ocrText}
                  onChange={(e) => setOcrText(e.target.value)}
                  placeholder={scanning ? 'Leyendo…' : ''}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={btnPrimary}
                    onClick={analyze}
                    disabled={analyzing || !ocrText.trim()}
                  >
                    {analyzing ? 'Analizando…' : 'Analizar con IA'}
                  </button>
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() => setOcrText(null)}
                    disabled={analyzing}
                  >
                    Descartar
                  </button>
                </div>
              </div>
            )}

            {scanErr && <p className="mt-2 text-xs text-red-600">{scanErr}</p>}
          </div>

          {/* Metadatos del informe */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">Fecha y hora del informe</span>
              <input
                type="datetime-local"
                className={field}
                value={takenAt}
                onChange={(e) => setTakenAt(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Laboratorio <span className="text-zinc-400 font-normal">(opcional)</span></span>
              <input
                type="text"
                className={`${field} ${rutRing(labSource)}`}
                value={labSource}
                onChange={(e) => setLabSource(e.target.value)}
                placeholder="ej. Lab Central"
              />
            </label>
          </div>

          {/* Filas de analitos */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className={head}>Analito</th>
                  <th className={head}>Valor</th>
                  <th className={head}>Unidad</th>
                  <th className={head}>Ref. mín</th>
                  <th className={head}>Ref. máx</th>
                  <th className={head}>Ref. texto</th>
                  <th className="px-1.5 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const abnormal = computeAbnormal(
                    parseValueNum(r.valueText),
                    toNumOrNull(r.refLow),
                    toNumOrNull(r.refHigh),
                  );
                  return (
                    <tr key={i}>
                      <td className={cell}>
                        <input
                          className={`${field} ${rutRing(r.analyte)}`}
                          value={r.analyte}
                          onChange={(e) => setRow(i, { analyte: e.target.value })}
                          placeholder="Hemoglobina"
                        />
                      </td>
                      <td className={cell}>
                        <input
                          className={`${field} ${abnormal ? 'text-red-600 font-medium' : ''} ${rutRing(r.valueText)}`}
                          value={r.valueText}
                          onChange={(e) => setRow(i, { valueText: e.target.value })}
                          placeholder="13,5"
                        />
                      </td>
                      <td className={cell}>
                        <input
                          className={`${field} ${rutRing(r.unit)}`}
                          value={r.unit}
                          onChange={(e) => setRow(i, { unit: e.target.value })}
                          placeholder="g/dL"
                        />
                      </td>
                      <td className={cell}>
                        <input
                          className={field}
                          inputMode="decimal"
                          value={r.refLow}
                          onChange={(e) => setRow(i, { refLow: e.target.value })}
                          placeholder="12"
                        />
                      </td>
                      <td className={cell}>
                        <input
                          className={field}
                          inputMode="decimal"
                          value={r.refHigh}
                          onChange={(e) => setRow(i, { refHigh: e.target.value })}
                          placeholder="16"
                        />
                      </td>
                      <td className={cell}>
                        <input
                          className={`${field} ${rutRing(r.refText)}`}
                          value={r.refText}
                          onChange={(e) => setRow(i, { refText: e.target.value })}
                          placeholder="Negativo"
                        />
                      </td>
                      <td className={`${cell} text-center`}>
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          disabled={rows.length <= 1}
                          aria-label="Quitar fila"
                          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button type="button" onClick={addRow} className={btnSecondary}>
            + Agregar fila
          </button>

          <p className="text-xs text-zinc-400">
            El rojo marca valores fuera del intervalo de referencia de este informe. Solo aplica a
            valores numéricos con al menos un límite.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 dark:border-zinc-800 px-5 py-4">
          <span className="text-sm text-red-600 truncate" title={err}>{err}</span>
          <div className="flex gap-2 shrink-0">
            <button type="button" className={btnSecondary} onClick={onCancel} disabled={saving}>
              Cancelar
            </button>
            <button type="button" className={btnPrimary} onClick={submit} disabled={!canSave}>
              {saving ? 'Guardando…' : 'Guardar informe'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
