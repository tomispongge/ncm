// NCM · Medicamentos — tarjeta-resumen de un fármaco
import { formatPresentation, formatDilution, formatRate } from '../../lib/medicamentos/constants';

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-zinc-500 dark:text-zinc-400 w-28 shrink-0">{label}</span>
      <span className="text-zinc-700 dark:text-zinc-200">{value}</span>
    </div>
  );
}

export default function MedCard({ med, isAdmin, onEdit, onDelete }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-100">{med.generic_name}</h3>
          {med.brand_names && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{med.brand_names}</p>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => onEdit(med)}
              className="text-sm text-sky-600 hover:underline">Editar</button>
            <button type="button" onClick={() => onDelete(med)} aria-label="Eliminar"
              className="w-6 h-6 grid place-items-center rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">✕</button>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Row label="Presentación" value={formatPresentation(med)} />
        <Row label="Dilución" value={formatDilution(med)} />
        <Row label="Tiempo adm." value={formatRate(med)} />
      </div>

      {med.nursing_care && (
        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-3">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Cuidados de enfermería</p>
          <p className="text-sm text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap mt-0.5">{med.nursing_care}</p>
        </div>
      )}

      {med.observations && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Observaciones</p>
          <p className="text-sm text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap mt-0.5">{med.observations}</p>
        </div>
      )}
    </div>
  );
}
