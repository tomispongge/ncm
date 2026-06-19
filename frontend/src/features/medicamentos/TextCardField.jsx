// NCM · Medicamentos — campo de texto → tarjeta-resumen (patrón lesiones)
import { useState } from 'react';
import { containsRut } from '../../lib/sala/validation';

const field =
  'w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm';

export default function TextCardField({ label, value, onChange, placeholder, rows = 3 }) {
  const hasText = (value ?? '').trim() !== '';
  const [editing, setEditing] = useState(false);
  const bad = containsRut(value);

  // Vacío y colapsado → invitación para agregar (opcional)
  if (!editing && !hasText) {
    return (
      <button type="button" onClick={() => setEditing(true)}
        className="w-full rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:border-sky-400">
        + Agregar {label.toLowerCase()}
      </button>
    );
  }

  // Con texto y colapsado → tarjeta-resumen
  if (!editing && hasText) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
            <p className="text-sm text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap mt-0.5">{value}</p>
          </div>
          <button type="button" onClick={() => setEditing(true)}
            className="text-sm text-sky-600 hover:underline shrink-0">Editar</button>
        </div>
      </div>
    );
  }

  // Editando
  return (
    <div>
      <span className="text-sm font-medium">{label}</span>
      <textarea rows={rows} autoFocus value={value ?? ''} placeholder={placeholder}
        className={`${field} mt-1 ${bad ? 'border-red-500 ring-1 ring-red-400' : ''}`}
        onChange={(e) => onChange(e.target.value)} />
      {bad && <p className="text-xs text-red-600 mt-1">No ingreses RUT ni identificadores personales.</p>}
      <div className="flex justify-end mt-1">
        <button type="button" onClick={() => setEditing(false)}
          className="text-sm text-sky-600 hover:underline">Listo</button>
      </div>
    </div>
  );
}
