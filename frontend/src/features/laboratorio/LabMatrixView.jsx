// frontend/src/features/laboratorio/LabMatrixView.jsx
// Ventana de exámenes de una cama: matriz (filas = analitos, columnas = fechas),
// modo "destacar" y botones de agregar/actualizar/exportar.
// Estilo NCM: Tailwind v3, dark mode, zinc + sky-600. Cierra solo con la X.

import { useMemo, useState } from 'react';
import { useLaboratorio } from './useLaboratorio';
import { LabAddForm } from './LabAddForm';

// dd/mm/aaaa hh:mm en formato chileno
function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

// Texto del intervalo de referencia (para tooltip de la celda)
function refRange(cell) {
  if (cell.ref_text) return `Ref: ${cell.ref_text}`;
  const lo = cell.ref_low;
  const hi = cell.ref_high;
  if (lo !== null && lo !== undefined && hi !== null && hi !== undefined) return `Ref: ${lo}–${hi}`;
  if (lo !== null && lo !== undefined) return `Ref: ≥ ${lo}`;
  if (hi !== null && hi !== undefined) return `Ref: ≤ ${hi}`;
  return '';
}

export function LabMatrixView({ episodeId, bedLabel, onClose, onExport }) {
  const {
    loading,
    saving,
    error,
    hasData,
    columns,
    rows,
    addPanel,
    selecting,
    startSelecting,
    toggleAnalyte,
    cancelSelecting,
    commitHighlights,
  } = useLaboratorio(episodeId);

  // formulario de ingreso manual (base de la futura verificación del OCR)
  const [adding, setAdding] = useState(false);

  // fila donde termina el bloque de destacados (para dibujar un separador)
  const pinnedCount = useMemo(() => rows.filter((r) => r.pinned).length, [rows]);

  const btnPrimary =
    'rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50';
  const btnSecondary =
    'rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50';

  return (
    <>
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Exámenes</h2>
            {bedLabel ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{bedLabel}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-zinc-200 dark:border-zinc-800">
          {selecting ? (
            <>
              <button type="button" className={btnPrimary} onClick={commitHighlights} disabled={saving}>
                {saving ? 'Actualizando…' : 'Actualizar resultado'}
              </button>
              <button type="button" className={btnSecondary} onClick={cancelSelecting} disabled={saving}>
                Cancelar
              </button>
              <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">
                Marca los exámenes que quieres mostrar en Sala. Suben al inicio.
              </span>
            </>
          ) : (
            <>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => setAdding(true)}
                disabled={saving}
              >
                Agregar resultados
              </button>
              <button
                type="button"
                className={btnSecondary}
                onClick={startSelecting}
                disabled={!hasData || saving}
              >
                Destacar resultados
              </button>
              <button
                type="button"
                className={btnSecondary}
                onClick={onExport}
                disabled={!onExport || !hasData || saving}
              >
                Exportar
              </button>
            </>
          )}
        </div>

        {/* Disclaimer no suprimible */}
        <div className="px-5 py-2 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
          Herramienta de apoyo. La validación final corresponde al profesional sanitario responsable.
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-auto px-5 py-4">
          {loading ? (
            <p className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">Cargando exámenes…</p>
          ) : error ? (
            <p className="py-10 text-center text-sm text-red-600 dark:text-red-400">
              No se pudieron cargar los exámenes. Intenta de nuevo.
            </p>
          ) : !hasData ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Aún no hay exámenes para esta cama.
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Agrega resultados desde un archivo o una foto.
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {selecting ? (
                    <th scope="col" className="sticky left-0 top-0 z-20 bg-white dark:bg-zinc-900 px-2 py-2" />
                  ) : null}
                  <th
                    scope="col"
                    className="sticky left-0 top-0 z-20 bg-white dark:bg-zinc-900 px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800"
                  >
                    Analito
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.id}
                      scope="col"
                      className="sticky top-0 z-10 bg-white dark:bg-zinc-900 px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap border-b border-zinc-200 dark:border-zinc-800"
                    >
                      <div>{formatDateTime(col.taken_at)}</div>
                      {col.lab_source ? (
                        <div className="text-[11px] font-normal text-zinc-400">{col.lab_source}</div>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const showDivider =
                    !selecting && pinnedCount > 0 && i === pinnedCount && pinnedCount < rows.length;
                  return (
                    <tr
                      key={row.analyteKey}
                      className={showDivider ? 'border-t-2 border-zinc-200 dark:border-zinc-700' : ''}
                    >
                      {selecting ? (
                        <td className="sticky left-0 z-10 bg-white dark:bg-zinc-900 px-2 py-2 align-top">
                          <input
                            type="checkbox"
                            checked={row.pinned}
                            onChange={() => toggleAnalyte(row.analyteKey)}
                            aria-label={`Destacar ${row.analyte}`}
                            className="h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
                          />
                        </td>
                      ) : null}
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-white dark:bg-zinc-900 px-3 py-2 text-left font-normal text-zinc-800 dark:text-zinc-100 whitespace-nowrap border-b border-zinc-100 dark:border-zinc-800"
                      >
                        {!selecting && row.pinned ? (
                          <span className="mr-1 text-sky-600" aria-hidden="true">★</span>
                        ) : null}
                        {row.analyte}
                      </th>
                      {columns.map((col) => {
                        const cell = row.cells[col.id];
                        return (
                          <td
                            key={col.id}
                            title={cell ? refRange(cell) : ''}
                            className={
                              'px-3 py-2 whitespace-nowrap border-b border-zinc-100 dark:border-zinc-800 ' +
                              (cell && cell.is_abnormal
                                ? 'text-red-600 dark:text-red-400 font-medium'
                                : 'text-zinc-700 dark:text-zinc-300')
                            }
                          >
                            {cell ? (
                              <>
                                {cell.value_text}
                                {cell.unit ? (
                                  <span className="ml-1 text-xs text-zinc-400">{cell.unit}</span>
                                ) : null}
                              </>
                            ) : (
                              <span className="text-zinc-300 dark:text-zinc-600">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>

    {adding && (
      <LabAddForm
        saving={saving}
        onCancel={() => setAdding(false)}
        onSubmit={async (payload) => {
          await addPanel(payload);
          setAdding(false);
        }}
      />
    )}
    </>
  );
}
