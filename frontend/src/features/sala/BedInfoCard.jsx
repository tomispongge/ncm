// NCM · Módulo Sala — tarjeta flotante de datos del paciente
const BED_SIZE = 104;
const CARD_W = 252;

const hasText = (v) => (v ?? '').toString().trim() !== '';

const medLine = (m) => {
  const name = m.medication?.generic_name ?? '—';
  const rate = m.infusion_rate_value != null
    ? ` — ${m.infusion_rate_value} ${m.infusion_rate_unit ?? ''}`.trimEnd()
    : '';
  return name + rate;
};

// "+250 mL" / "-300 mL" / "—"
const fmtBalance = (v) => {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `${n > 0 ? '+' : ''}${n} mL`;
};

// Bloque etiqueta + valor de texto libre (no renderiza si está vacío).
function Field({ label, value, labelClass = 'text-zinc-500 dark:text-zinc-400' }) {
  if (!hasText(value)) return null;
  return (
    <div>
      <p className={`font-medium ${labelClass}`}>{label}</p>
      <p className="whitespace-pre-wrap break-words text-zinc-800 dark:text-zinc-200">{value}</p>
    </div>
  );
}

export default function BedInfoCard({
  bed, sheet, meds, extras, canvasW, onEdit, onRemove, onClose, onMouseEnter, onMouseLeave,
}) {
  const occupied = !!bed.episode_id;
  const loading = occupied && (sheet === undefined || extras === undefined);
  const labs = extras?.labs ?? [];
  const pending = extras?.pending ?? [];
  const medList = meds ?? [];

  // Coloca a la derecha de la cama; si no cabe, a la izquierda.
  const placeLeft = (bed.pos_x ?? 0) + BED_SIZE + 12 + CARD_W > canvasW;
  const left = placeLeft
    ? Math.max(8, (bed.pos_x ?? 0) - CARD_W - 12)
    : (bed.pos_x ?? 0) + BED_SIZE + 12;
  const top = bed.pos_y ?? 0;

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

        {!occupied ? (
          <p className="text-xs text-zinc-400">Cama libre — sin paciente.</p>
        ) : loading ? (
          <p className="text-xs text-zinc-400">Cargando…</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-auto pr-1 text-xs">
            {/* Diagnóstico actual */}
            <Field label="Dx actual" value={sheet?.current_diagnosis} />

            {/* Exámenes destacados (los alterados van en rojo) */}
            {labs.length > 0 && (
              <div>
                <p className="font-medium text-zinc-500 dark:text-zinc-400">Exámenes</p>
                <ul className="mt-0.5 space-y-0.5">
                  {labs.map((l) => (
                    <li
                      key={l.analyteKey ?? l.analyte}
                      className={l.is_abnormal
                        ? 'text-red-600 dark:text-red-400 font-medium break-words'
                        : 'text-zinc-800 dark:text-zinc-200 break-words'}
                    >
                      {l.analyte}: {l.value_text}{l.unit ? ` ${l.unit}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Aislamiento / Alergias — solo si tiene */}
            <Field label="Aislamiento" value={sheet?.isolation} labelClass="text-red-600" />
            <Field label="Alergias" value={sheet?.allergies} labelClass="text-orange-600" />

            {/* Estado general · Observaciones */}
            <Field label="Estado general" value={sheet?.general_status} />
            <Field label="Observaciones" value={sheet?.observations} />

            {/* Pendientes (siempre; "Sin pendientes" si vacío) */}
            <div>
              <p className="font-medium text-zinc-500 dark:text-zinc-400">Pendientes</p>
              {pending.length > 0 ? (
                <ul className="mt-0.5 space-y-0.5 text-zinc-800 dark:text-zinc-200">
                  {pending.map((t) => <li key={t.id} className="break-words">{t.title}</li>)}
                </ul>
              ) : (
                <p className="text-zinc-400">Sin pendientes</p>
              )}
            </div>

            {/* Balance hídrico */}
            <div>
              <p className="font-medium text-zinc-500 dark:text-zinc-400">Balance hídrico</p>
              <p className="text-zinc-800 dark:text-zinc-200">
                12h: {fmtBalance(extras?.balance12h)} · Acum: {fmtBalance(extras?.balanceCumulative)}
              </p>
            </div>

            {/* Medicamentos */}
            {medList.length > 0 && (
              <div>
                <p className="font-medium text-zinc-500 dark:text-zinc-400">Medicamentos</p>
                <ul className="mt-0.5 space-y-0.5 text-zinc-800 dark:text-zinc-200">
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
