// NCM · Módulo Sala — Vista de SOLO LECTURA de la ficha (compacta).
// Muestra los mismos datos que la ficha de edición, como texto, sin permitir
// editar. Panel lateral angosto; cierra con la X o tocando el fondo.
import { useEffect, useState } from 'react';
import {
  getSheet, listPressureInjuries, listBalances, cumulativeBalance,
  getAlteredLabs, getPendingTasks, listEpisodeMedications,
} from '../../lib/salaService';

const hasText = (v) => (v ?? '').toString().trim() !== '';

const fmtMl = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? `${n > 0 ? '+' : ''}${n} mL` : '—';
};

const medLine = (m) => {
  const name = m.medication?.generic_name ?? '—';
  const rate = m.infusion_rate_value != null
    ? ` — ${m.infusion_rate_value} ${m.infusion_rate_unit ?? ''}`.trimEnd()
    : '';
  return name + rate;
};

// Etiqueta + valor de texto libre (no renderiza si está vacío).
function Row({ label, value }) {
  if (!hasText(value)) return null;
  return (
    <div className="py-0.5">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-sm whitespace-pre-wrap break-words text-zinc-800 dark:text-zinc-100">{value}</p>
    </div>
  );
}

function Group({ title, children }) {
  return (
    <section className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</h3>
      <div>{children}</div>
    </section>
  );
}

export default function BedDetailsView({ bed, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!bed.episode_id) { setLoading(false); return; }
      const ep = bed.episode_id;
      try {
        const [sheet, injuries, balances, labs, tasks, meds] = await Promise.all([
          getSheet(ep), listPressureInjuries(ep), listBalances(ep),
          getAlteredLabs(ep), getPendingTasks(ep), listEpisodeMedications(ep),
        ]);
        if (alive) setData({ sheet: sheet ?? {}, injuries, balances, labs, tasks, meds });
      } catch {
        if (alive) setData({ sheet: {}, injuries: [], balances: [], labs: [], tasks: [], meds: [] });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [bed.id, bed.episode_id]);

  const s = data?.sheet ?? {};
  const labs = data?.labs ?? [];
  const tasks = data?.tasks ?? [];
  const meds = data?.meds ?? [];
  const injuries = data?.injuries ?? [];
  const balances = data?.balances ?? [];
  const balance12h = balances[0]?.balance_12h ?? null;
  const balanceAcum = balances.length ? cumulativeBalance(balances) : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        className="absolute inset-y-0 right-0 w-full max-w-md bg-white dark:bg-zinc-900 overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 px-4 py-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{bed.label} · Datos</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            className="w-8 h-8 grid place-items-center rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-500 hover:text-zinc-700">
            ✕
          </button>
        </header>

        {(hasText(s.allergies) || hasText(s.isolation)) && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {hasText(s.allergies) && (
              <span className="px-3 py-1 rounded-lg bg-orange-500 text-white font-bold text-xs">ALERGIAS: {s.allergies}</span>
            )}
            {hasText(s.isolation) && (
              <span className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold text-xs">AISLAMIENTO: {s.isolation}</span>
            )}
          </div>
        )}

        <div className="px-4 py-4 space-y-4">
          {!bed.episode_id ? (
            <p className="text-sm text-zinc-400">Cama libre — sin paciente.</p>
          ) : loading ? (
            <p className="text-sm text-zinc-400">Cargando…</p>
          ) : (
            <>
              <Group title="Diagnósticos">
                <Row label="Dx actual" value={s.current_diagnosis} />
                <Row label="Dx ingreso" value={s.admission_diagnosis} />
              </Group>

              <Group title="Antecedentes">
                <Row label="Mórbidos" value={s.morbid_history} />
                <Row label="Quirúrgicos" value={s.surgical_history} />
              </Group>

              <Row label="Estado general" value={s.general_status} />

              <Group title="Evolución y manejo">
                <Row label="Observaciones" value={s.observations} />
                <Row label="Cuidados de enfermería" value={s.nursing_care} />
                <Row label="Manejo médico" value={s.medical_management} />
              </Group>

              <Group title="Medicamentos">
                {meds.length ? (
                  <ul className="text-sm space-y-0.5 text-zinc-800 dark:text-zinc-100">
                    {meds.map((m) => <li key={m.id} className="break-words">{medLine(m)}</li>)}
                  </ul>
                ) : <p className="text-sm text-zinc-400">Sin medicamentos.</p>}
              </Group>

              <Group title="Exámenes destacados">
                {labs.length ? (
                  <ul className="text-sm space-y-0.5">
                    {labs.map((l) => (
                      <li key={l.analyteKey ?? l.analyte}
                        className={l.is_abnormal
                          ? 'text-red-600 dark:text-red-400 font-medium break-words'
                          : 'text-zinc-800 dark:text-zinc-100 break-words'}>
                        {l.analyte}: {l.value_text}{l.unit ? ` ${l.unit}` : ''}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-zinc-400">Sin exámenes destacados.</p>}
              </Group>

              <Group title="Pendientes">
                {tasks.length ? (
                  <ul className="text-sm space-y-0.5 text-zinc-800 dark:text-zinc-100">
                    {tasks.map((t) => <li key={t.id} className="break-words">{t.title}</li>)}
                  </ul>
                ) : <p className="text-sm text-zinc-400">Sin pendientes.</p>}
              </Group>

              <Group title="Lesiones por presión">
                {injuries.length ? (
                  <ul className="text-sm space-y-0.5 text-zinc-800 dark:text-zinc-100">
                    {injuries.map((pi) => (
                      <li key={pi.id} className="break-words">
                        {[pi.location, pi.depth, pi.detail].filter(hasText).join(' · ') || 'Lesión'}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-zinc-400">Sin lesiones registradas.</p>}
              </Group>

              <Group title="Eliminación">
                <Row label="Diuresis (mL)" value={s.diuresis} />
                <Row label="Deposiciones (n°)" value={s.bowel_movements} />
              </Group>

              <Group title="Balance hídrico">
                <p className="text-sm text-zinc-800 dark:text-zinc-100">
                  12h: {fmtMl(balance12h)} · Acumulado: {fmtMl(balanceAcum)}
                </p>
              </Group>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
