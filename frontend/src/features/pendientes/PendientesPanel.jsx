// frontend/src/features/pendientes/PendientesPanel.jsx
// Panel modal para gestionar los pendientes de una cama: formulario para
// agregar (por tipo) + lista con "Listo" y eliminar. Bloqueo de RUT.
import { useState } from 'react';
import { usePendientes } from './usePendientes';
import { TASK_KINDS, subtypesFor, summarizeTask } from '../../lib/pendientes/constants';
import { containsRut } from '../../lib/sala/validation';

const field =
  'w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm';

function emptyDraft(kind) {
  const subs = subtypesFor(kind);
  return { kind, subtype: subs ? subs[0] : null, detail: '', processed: false };
}

export default function PendientesPanel({ episodeId, bedLabel, onClose }) {
  const { tasks, loading, error, saving, add, patch, remove } = usePendientes(episodeId);
  const [draft, setDraft] = useState(() => emptyDraft('interconsulta'));
  const [formErr, setFormErr] = useState('');

  const subs = subtypesFor(draft.kind);
  const detailHint =
    draft.kind === 'interconsulta' ? '¿A qué? ej. cardiología'
      : draft.kind === 'evaluacion' ? '¿De qué?'
        : 'Detallar';

  const active = tasks.filter((t) => !t.done);
  const doneCount = tasks.length - active.length;

  const pickKind = (kind) => { setFormErr(''); setDraft(emptyDraft(kind)); };

  const submit = async () => {
    setFormErr('');
    if (!draft.detail.trim()) return setFormErr('Escribe el detalle.');
    if (containsRut(draft.detail)) return setFormErr('Quita el RUT o identificadores del detalle.');
    try {
      await add({
        kind: draft.kind,
        subtype: draft.subtype,
        detail: draft.detail.trim(),
        processed: draft.processed,
      });
      setDraft(emptyDraft(draft.kind)); // conserva el tipo para agregar varios
    } catch (e) {
      setFormErr(e?.message || 'No se pudo agregar.');
    }
  };

  const btnPrimary =
    'rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50';
  const btnListo =
    'rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Pendientes</h2>
            {bedLabel ? <p className="text-sm text-zinc-500 dark:text-zinc-400">{bedLabel}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
          {/* Agregar */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              {TASK_KINDS.map((k) => (
                <button key={k.value} type="button" onClick={() => pickKind(k.value)}
                  className={`rounded-lg px-3 py-1.5 text-sm border ${
                    draft.kind === k.value
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200'
                  }`}>
                  {k.label}
                </button>
              ))}
            </div>

            {subs ? (
              <label className="block">
                <span className="text-sm font-medium">Tipo</span>
                <select className={field} value={draft.subtype ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, subtype: e.target.value }))}>
                  {subs.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            ) : null}

            <label className="block">
              <span className="text-sm font-medium">Detalle</span>
              <input
                className={`${field} ${containsRut(draft.detail) ? 'border-red-500 ring-1 ring-red-400' : ''}`}
                value={draft.detail}
                onChange={(e) => setDraft((d) => ({ ...d, detail: e.target.value }))}
                placeholder={detailHint}
              />
            </label>

            {draft.kind === 'interconsulta' ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.processed}
                  onChange={(e) => setDraft((d) => ({ ...d, processed: e.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500" />
                Tramitada
              </label>
            ) : null}

            <div className="flex items-center gap-3">
              <button type="button" className={btnPrimary} onClick={submit} disabled={saving}>Agregar</button>
              {formErr && <span className="text-sm text-red-600 truncate">{formErr}</span>}
            </div>
          </div>

          {/* Lista */}
          {loading ? (
            <p className="py-6 text-center text-sm text-zinc-500">Cargando…</p>
          ) : error ? (
            <p className="py-6 text-center text-sm text-red-600">No se pudieron cargar los pendientes.</p>
          ) : active.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">Sin pendientes.</p>
          ) : (
            <ul className="space-y-2">
              {active.map((t) => (
                <li key={t.id}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2">
                  <span className="flex-1 text-sm text-zinc-800 dark:text-zinc-100 break-words">
                    {summarizeTask(t)}
                  </span>
                  {t.kind === 'interconsulta' ? (
                    <label className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <input type="checkbox" checked={t.processed}
                        onChange={(e) => patch(t.id, { processed: e.target.checked })}
                        className="h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500" />
                      tramitada
                    </label>
                  ) : null}
                  <button type="button" className={btnListo} onClick={() => patch(t.id, { done: true })}>
                    Listo
                  </button>
                  <button type="button" onClick={() => remove(t.id)} aria-label="Eliminar"
                    className="w-7 h-7 grid place-items-center rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {doneCount > 0 && (
            <p className="text-xs text-zinc-400">Completados: {doneCount}</p>
          )}
        </div>
      </div>
    </div>
  );
}
