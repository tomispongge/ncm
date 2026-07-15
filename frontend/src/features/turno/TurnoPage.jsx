// frontend/src/features/turno/TurnoPage.jsx
// Entrega de turno: toda la sala en una vista. Cada cama tiene su nota de
// entrega (texto libre) con autoguardado al salir del campo + botón "Guardar".
// Botones para imprimir (ventana limpia) y exportar a Excel. Bloqueo de RUT.
import { useEffect, useState } from 'react';
import { listHandoffs, saveHandoff } from '../../lib/turnoService';
import { exportHandoffExcel } from '../../lib/turno/exportExcel';
import { containsRut } from '../../lib/sala/validation';

const DISCLAIMER =
  'Herramienta de apoyo. La validación final corresponde al profesional sanitario responsable.';

const field =
  'w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function StatusBadge({ st }) {
  const map = {
    saving: ['Guardando…', 'text-zinc-400'],
    saved: ['Guardado ✓', 'text-emerald-600'],
    error: ['Error al guardar', 'text-red-600'],
    rut: ['Quita el RUT', 'text-red-600'],
    idle: ['', ''],
  };
  const [text, cls] = map[st] || ['', ''];
  return <span className={`text-xs ${cls}`}>{text}</span>;
}

export default function TurnoPage() {
  const [items, setItems] = useState([]);   // [{ id, label, episode_id }]
  const [notes, setNotes] = useState({});   // episode_id -> texto
  const [status, setStatus] = useState({}); // episode_id -> idle|saving|saved|error|rut
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const beds = await listHandoffs();
        setItems(beds.map(({ id, label, episode_id }) => ({ id, label, episode_id })));
        const n = {};
        for (const b of beds) n[b.episode_id] = b.note || '';
        setNotes(n);
      } catch (e) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setNote = (ep, text) => {
    setNotes((p) => ({ ...p, [ep]: text }));
    setStatus((p) => ({ ...p, [ep]: 'idle' }));
  };

  const save = async (ep) => {
    const note = notes[ep] ?? '';
    if (containsRut(note)) { setStatus((p) => ({ ...p, [ep]: 'rut' })); return; }
    setStatus((p) => ({ ...p, [ep]: 'saving' }));
    try {
      await saveHandoff(ep, note.trim() ? note : null);
      setStatus((p) => ({ ...p, [ep]: 'saved' }));
    } catch {
      setStatus((p) => ({ ...p, [ep]: 'error' }));
    }
  };

  const doPrint = () => {
    const rows = items.map((it) =>
      `<section><h2>${escapeHtml(it.label)}</h2><p>${escapeHtml(notes[it.episode_id] || '—').replace(/\n/g, '<br>')}</p></section>`
    ).join('');
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Entrega de turno</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;margin:24px;color:#111}h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:16px 0 4px;border-bottom:1px solid #ddd;padding-bottom:2px}p{white-space:pre-wrap;font-size:13px;margin:0}.disc{color:#666;font-size:12px;margin:0 0 8px}</style>
</head><body><h1>Entrega de turno</h1><p class="disc">${DISCLAIMER}</p>${rows}</body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const doExcel = () =>
    exportHandoffExcel(items.map((it) => ({ label: it.label, note: notes[it.episode_id] || '' })));

  const hasBeds = items.length > 0;

  return (
    <div className="pb-20 md:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">📋 Entrega de turno</h1>
        <div className="flex gap-2">
          <button type="button" onClick={doPrint} disabled={!hasBeds}
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50">
            Imprimir
          </button>
          <button type="button" onClick={doExcel} disabled={!hasBeds}
            className="rounded-lg bg-sky-600 text-white px-3 py-2 text-sm font-medium hover:bg-sky-700 disabled:opacity-50">
            Exportar a Excel
          </button>
        </div>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        Escribe la nota de entrega de cada cama. Se guarda al salir del campo (o con "Guardar").
      </p>

      {loading && <p className="text-zinc-500">Cargando sala…</p>}
      {error && <p className="text-sm text-red-600">No se pudo cargar la entrega. Intenta de nuevo.</p>}
      {!loading && !error && !hasBeds && (
        <p className="text-zinc-500">No hay camas ocupadas.</p>
      )}

      <div className="space-y-3">
        {items.map((it) => {
          const note = notes[it.episode_id] ?? '';
          const rut = containsRut(note);
          const st = status[it.episode_id] || 'idle';
          return (
            <div key={it.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{it.label}</span>
                <StatusBadge st={st} />
              </div>
              <textarea rows={3}
                className={`${field} ${rut ? 'border-red-500 ring-1 ring-red-400' : ''}`}
                value={note}
                onChange={(e) => setNote(it.episode_id, e.target.value)}
                onBlur={() => save(it.episode_id)}
                placeholder="Nota de entrega para el turno siguiente…" />
              <div className="mt-2 flex items-center justify-between">
                {rut
                  ? <span className="text-xs text-red-600">Quita el RUT o identificadores personales.</span>
                  : <span />}
                <button type="button" onClick={() => save(it.episode_id)}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700">
                  Guardar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
