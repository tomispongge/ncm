// NCM · Módulo Sala — diálogo de alta de cama (número escrito 1–20)
import { useState } from 'react';

export default function AddBedDialog({ usedNumbers, onCancel, onCreate }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const used = new Set(usedNumbers);

  const n = Number(value);
  const isInt = value !== '' && Number.isInteger(n);
  const inRange = isInt && n >= 1 && n <= 20;
  const taken = inRange && used.has(n);
  const ok = inRange && !taken;

  let msg = '';
  if (value !== '' && !inRange) msg = 'Debe ser un número entero entre 1 y 20.';
  else if (taken) msg = `La cama ${n} ya está en uso.`;

  const onType = (e) => {
    // solo dígitos, máximo 2
    const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
    setValue(digits);
  };

  const create = async (status) => {
    if (!ok || busy) return;
    setBusy(true);
    try { await onCreate(n, status); }
    finally { setBusy(false); }
  };

  const usedList = [...used].sort((a, b) => a - b).join(', ');

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 shadow-xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold">Agregar cama</h2>

        <div>
          <label className="block">
            <span className="text-sm font-medium">Número de cama <span className="text-zinc-400">(1–20)</span></span>
            <input
              type="text" inputMode="numeric" autoFocus
              value={value} onChange={onType}
              placeholder="Ej. 7"
              className={`w-full rounded-lg border bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm mt-1
                ${msg ? 'border-red-500 ring-1 ring-red-400' : 'border-zinc-300 dark:border-zinc-600'}`} />
          </label>
          {msg && <p className="text-xs text-red-600 mt-1">{msg}</p>}
          {usedList && <p className="text-xs text-zinc-400 mt-1">En uso: {usedList}</p>}
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Estado</p>
          <div className="flex gap-3">
            <button type="button" disabled={!ok || busy} onClick={() => create('libre')}
              className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 py-2.5 text-sm font-medium hover:border-emerald-400 disabled:opacity-40">
              Libre
            </button>
            <button type="button" disabled={!ok || busy} onClick={() => create('ocupada')}
              className="flex-1 rounded-lg bg-sky-600 text-white py-2.5 text-sm font-medium hover:bg-sky-700 disabled:opacity-40">
              Ocupada
            </button>
          </div>
          <p className="text-xs text-zinc-400 mt-1">“Ocupada” abrirá la ficha para cargar los datos del paciente.</p>
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
