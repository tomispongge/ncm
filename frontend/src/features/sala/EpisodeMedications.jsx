// NCM · Sala — Medicamentos asignados (borrador local; se confirma con "Guardar cambios")
import { useEffect, useState } from 'react';
import { listMedications } from '../../lib/medicamentosService';
import { ADMIN_RATE_UNITS, RATE_MIN, RATE_MAX } from '../../lib/medicamentos/constants';

const ctrl =
  'rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm';

const abbreviate = (s, n = 22) =>
  !s ? '' : (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const inRange = (v) => v >= RATE_MIN && v <= RATE_MAX;

// Decimal chileno: acepta coma o punto. "0,6" -> 0.6
const parseRate = (s) => Number(String(s).replace(',', '.'));

// ---- Fila de un fármaco asignado -----------------------------------
function AssignedMed({ item, onUpdateRate, onRemove }) {
  const localId = item.id ?? item._tmp;
  const name = item.medication?.generic_name ?? '—';
  const [val, setVal] = useState(item.infusion_rate_value ?? '');
  const [unit, setUnit] = useState(item.infusion_rate_unit ?? item.medication?.admin_rate_unit ?? '');
  const bad = val !== '' && !inRange(parseRate(val));

  const commit = (nextVal = val, nextUnit = unit) => {
    const v = nextVal === '' ? null : parseRate(nextVal);
    if (v != null && (!Number.isFinite(v) || !inRange(v))) return; // no aceptar fuera de rango
    onUpdateRate(localId, v, nextUnit || null);
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2">
      <span className="flex-1 truncate text-sm font-medium text-zinc-800 dark:text-zinc-100" title={name}>
        {abbreviate(name)}
      </span>
      <input
        type="text" inputMode="decimal" value={val} placeholder="vel."
        onChange={(e) => setVal(e.target.value.replace(/[^\d.,]/g, ''))}
        onBlur={() => commit()}
        className={`w-16 ${ctrl} ${bad ? 'border-red-500 ring-1 ring-red-400' : ''}`} />
      <select value={unit}
        onChange={(e) => { setUnit(e.target.value); commit(val, e.target.value); }}
        className={`w-28 ${ctrl}`}>
        <option value="">unidad</option>
        {ADMIN_RATE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
      </select>
      <button type="button" onClick={() => onRemove(localId)} aria-label="Quitar"
        className="w-6 h-6 grid place-items-center rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">
        ✕
      </button>
    </div>
  );
}

// ---- Selector de la biblioteca -------------------------------------
function Picker({ assignedIds, onPick, onClose }) {
  const [lib, setLib] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => { listMedications().then(setLib).catch(() => setLib([])); }, []);

  const term = q.trim().toLowerCase();
  const list = (lib ?? [])
    .filter((m) => !assignedIds.has(m.id))
    .filter((m) => (m.generic_name || '').toLowerCase().includes(term));

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-3 space-y-2">
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar fármaco…" className={`w-full ${ctrl}`} />
      <div className="max-h-48 overflow-y-auto space-y-1">
        {lib === null && <p className="text-sm text-zinc-500">Cargando biblioteca…</p>}
        {lib && list.length === 0 && (
          <p className="text-sm text-zinc-500">Sin fármacos disponibles.</p>
        )}
        {list.map((m) => (
          <button key={m.id} type="button" onClick={() => onPick(m)}
            className="w-full text-left text-sm px-2 py-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900/30">
            {m.generic_name}
          </button>
        ))}
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={onClose} className="text-sm text-zinc-500 hover:underline">Cerrar</button>
      </div>
    </div>
  );
}

// ---- Sección completa ----------------------------------------------
export default function EpisodeMedications({ items, onAdd, onUpdateRate, onRemove }) {
  const [picking, setPicking] = useState(false);
  const assignedIds = new Set(items.map((it) => it.medication?.id).filter(Boolean));

  const pick = (med) => { setPicking(false); onAdd(med); };

  return (
    <div className="space-y-2">
      {items.map((it) => (
        <AssignedMed key={it.id ?? it._tmp} item={it}
          onUpdateRate={onUpdateRate} onRemove={onRemove} />
      ))}
      {picking ? (
        <Picker assignedIds={assignedIds} onPick={pick} onClose={() => setPicking(false)} />
      ) : (
        <button type="button" onClick={() => setPicking(true)}
          className="w-full rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:border-sky-400">
          + Agregar medicamento
        </button>
      )}
    </div>
  );
}
