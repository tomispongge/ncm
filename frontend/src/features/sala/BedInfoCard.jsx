// NCM · Módulo Sala — tarjeta flotante de datos del paciente
const BED_SIZE = 104;
const CARD_W = 252;

const FIELDS = [
  ['current_diagnosis', 'Dx actual'],
  ['admission_diagnosis', 'Dx ingreso'],
  ['morbid_history', 'Ant. mórbidos'],
  ['surgical_history', 'Ant. quirúrgicos'],
  ['allergies', 'Alergias'],
  ['isolation', 'Aislamiento'],
  ['general_status', 'Estado general'],
  ['observations', 'Observaciones'],
  ['nursing_care', 'Cuidados de enfermería'],
  ['medical_management', 'Manejo médico'],
  ['diuresis', 'Diuresis'],
  ['bowel_movements', 'Deposiciones'],
];

const hasText = (v) => (v ?? '').toString().trim() !== '';

const medLine = (m) => {
  const name = m.medication?.generic_name ?? '—';
  const rate = m.infusion_rate_value != null
    ? ` — ${m.infusion_rate_value} ${m.infusion_rate_unit ?? ''}`.trimEnd()
    : '';
  return name + rate;
};

export default function BedInfoCard({
  bed, sheet, meds, canvasW, onEdit, onRemove, onClose, onMouseEnter, onMouseLeave,
}) {
  const loadingData = sheet === undefined;
  const rows = sheet ? FIELDS.filter(([k]) => hasText(sheet[k])) : [];
  const medList = meds ?? [];
  const empty = !loadingData && rows.length === 0 && medList.length === 0;

  // Coloca a la derecha de la cama; si no cabe, a la izquierda.
  const placeLeft = (bed.pos_x ?? 0) + BED_SIZE + 12 + CARD_W > canvasW;
  const left = placeLeft
    ? Math.max(8, (bed.pos_x ?? 0) - CARD_W - 12)
    : (bed.pos_x ?? 0) + BED_SIZE + 12;
  const top = bed.pos_y ?? 0;

  const labelColor = (k) =>
    k === 'allergies' ? 'text-orange-600'
      : k === 'isolation' ? 'text-red-600'
        : 'text-zinc-500 dark:text-zinc-400';

  return (
    <div
      className="absolute z-20"
      style={{ left, top, width: CARD_W }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">{bed.label}</span>
          <button type="button" onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 text-sm leading-none">✕</button>
        </div>

        {loadingData && <p className="text-xs text-zinc-400">Cargando…</p>}
        {empty && <p className="text-xs text-zinc-400">Sin datos cargados.</p>}

        {(rows.length > 0 || medList.length > 0) && (
          <div className="space-y-2 max-h-64 overflow-auto pr-1">
            {rows.length > 0 && (
              <dl className="space-y-1.5">
                {rows.map(([k, label]) => (
                  <div key={k} className="text-xs">
                    <dt className={`font-medium ${labelColor(k)}`}>{label}</dt>
                    <dd className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-words">{sheet[k]}</dd>
                  </div>
                ))}
              </dl>
            )}

            {medList.length > 0 && (
              <div className="text-xs">
                <p className="font-medium text-zinc-500 dark:text-zinc-400">Medicamentos</p>
                <ul className="text-zinc-800 dark:text-zinc-200 space-y-0.5 mt-0.5">
                  {medList.map((m) => (
                    <li key={m.id ?? m._tmp} className="break-words">{medLine(m)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onEdit}
            className="flex-1 rounded-lg bg-sky-600 text-white py-1.5 text-xs font-medium hover:bg-sky-700">
            Editar
          </button>
          <button type="button" onClick={onRemove}
            className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 py-1.5 text-xs hover:border-red-400">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
