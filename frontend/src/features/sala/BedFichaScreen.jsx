// NCM · Módulo Sala — Pantalla "Editar" (ficha clínica del episodio de la cama)
import { useEffect, useRef, useState } from 'react';
import {
  ensureEpisodeForBed, getSheet, upsertSheet,
  listPressureInjuries, savePressureInjury, deletePressureInjury,
  listBalances, addBalance, cumulativeBalance,
  getAlteredLabs, getPendingTasks, listEpisodeMedications, addEpisodeMedication,
  updateEpisodeMedicationRate, removeEpisodeMedication,
} from '../../lib/salaService';
import { GENERAL_STATUS } from '../../lib/sala/constants';
import EpisodeMedications from './EpisodeMedications';
import { containsRut, firstRutField } from '../../lib/sala/validation';
import PressureInjuries from './PressureInjuries';

const field =
  'w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm';

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</h3>
      {children}
    </section>
  );
}

function Textarea({ label, value, onChange, rows = 2 }) {
  const bad = containsRut(value);
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <textarea rows={rows}
        className={`${field} ${bad ? 'border-red-500 ring-1 ring-red-400' : ''}`}
        value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      {bad && <span className="text-xs text-red-600">No ingreses RUT ni identificadores personales.</span>}
    </label>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input type="text" inputMode="numeric"
        className={field}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} />
    </label>
  );
}

const SHEET_FIELDS = [
  'current_diagnosis', 'admission_diagnosis', 'morbid_history', 'surgical_history',
  'allergies', 'isolation', 'general_status', 'observations',
  'nursing_care', 'medical_management', 'diuresis', 'bowel_movements',
];

export default function BedFichaScreen({ bed, onClose, onOccupied }) {
  const [episodeId, setEpisodeId] = useState(bed.episode_id ?? null);
  const [sheet, setSheet] = useState({});
  const [injuries, setInjuries] = useState([]);
  const [balances, setBalances] = useState([]);
  const [epMeds, setEpMeds] = useState([]);
  const [baseMeds, setBaseMeds] = useState([]);   // snapshot persistido (para diff)
  const [saving, setSaving] = useState(false);
  const [newBalance, setNewBalance] = useState('');
  const [labs, setLabs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState('idle'); // idle|saving|saved|error|rut
  const [errMsg, setErrMsg] = useState('');

  const dirty = useRef(false);
  const epPromise = useRef(null);

  const ensureEpisode = () => {
    if (episodeId) return Promise.resolve(episodeId);
    if (epPromise.current) return epPromise.current;
    epPromise.current = (async () => {
      const epId = await ensureEpisodeForBed(bed);
      setEpisodeId(epId);
      onOccupied?.(bed.id, epId);
      return epId;
    })();
    return epPromise.current;
  };

  useEffect(() => {
    (async () => {
      try {
        if (!bed.episode_id) { setLoading(false); return; }
        const epId = bed.episode_id;
        setEpisodeId(epId);
        const [s, pi, fb, al, pt, em] = await Promise.all([
          getSheet(epId), listPressureInjuries(epId), listBalances(epId),
          getAlteredLabs(epId), getPendingTasks(epId), listEpisodeMedications(epId),
        ]);
        setSheet(s ?? {});
        setInjuries(pi); setBalances(fb); setLabs(al); setTasks(pt);
        setEpMeds(em); setBaseMeds(em);
      } finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bed.id]);

  const set = (k, val) => { dirty.current = true; setSheet((s) => ({ ...s, [k]: val })); };

  // Autoguardado con bloqueo si hay un RUT en cualquier campo.
  useEffect(() => {
    if (!dirty.current) return;
    if (firstRutField(sheet, SHEET_FIELDS)) { setSaveState('rut'); return; }
    setSaveState('saving');
    const t = setTimeout(async () => {
      try {
        const epId = await ensureEpisode();
        const payload = Object.fromEntries(SHEET_FIELDS.map((k) => [k, sheet[k] ?? null]));
        await upsertSheet(epId, payload);
        setSaveState('saved');
      } catch (e) {
        console.error('Guardado de ficha falló:', e);
        setErrMsg(e?.message || String(e));
        setSaveState('error');
      }
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet]);

  const onSaveInjury = async (pi) => {
    const textFields = ['location', 'detail', 'depth', 'max_extension', 'exudate_type_other'];
    if (textFields.some((f) => containsRut(pi[f]))) {
      throw new Error('No se permiten RUT ni identificadores personales en la lesión.');
    }
    const epId = await ensureEpisode();
    return savePressureInjury(epId, pi);
  };
  const onRemoveInjury = async (id) => {
    await deletePressureInjury(id);
    setInjuries((prev) => prev.filter((x) => x.id !== id));
  };

  const onAddBalance = async () => {
    if (newBalance === '') return;
    const epId = await ensureEpisode();
    const row = await addBalance(epId, Number(newBalance));
    setBalances((prev) => [row, ...prev]);
    setNewBalance('');
  };

  // Medicamentos en BORRADOR: estas operaciones son locales; nada toca la
  // base hasta apretar "Guardar cambios".
  const onAddMed = (med) => {
    setEpMeds((p) => [...p, {
      _tmp: crypto.randomUUID(),
      medication: { id: med.id, generic_name: med.generic_name, admin_rate_unit: med.admin_rate_unit ?? null },
      infusion_rate_value: null,
      infusion_rate_unit: med.admin_rate_unit ?? null,
    }]);
  };
  const onUpdateMedRate = (localId, value, unit) => {
    setEpMeds((p) => p.map((m) =>
      ((m.id ?? m._tmp) === localId
        ? { ...m, infusion_rate_value: value, infusion_rate_unit: unit }
        : m)));
  };
  const onRemoveMed = (localId) => {
    setEpMeds((p) => p.filter((m) => (m.id ?? m._tmp) !== localId));
  };

  // Confirma TODO (ficha + medicamentos) y cierra la ventana.
  const saveAll = async () => {
    if (saving) return;
    if (firstRutField(sheet, SHEET_FIELDS)) { setSaveState('rut'); return; }
    setSaving(true);
    try {
      const epId = await ensureEpisode();
      // ficha (guardado final)
      const payload = Object.fromEntries(SHEET_FIELDS.map((k) => [k, sheet[k] ?? null]));
      await upsertSheet(epId, payload);
      // medicamentos: diff borrador vs snapshot
      const currentIds = new Set(epMeds.filter((m) => m.id).map((m) => m.id));
      for (const b of baseMeds) {                       // quitados
        if (!currentIds.has(b.id)) await removeEpisodeMedication(b.id);
      }
      for (const m of epMeds) {                          // nuevos
        if (!m.id) await addEpisodeMedication(epId, m.medication.id, m.infusion_rate_value, m.infusion_rate_unit);
      }
      const baseById = new Map(baseMeds.map((b) => [b.id, b]));
      for (const m of epMeds) {                          // velocidad cambiada
        if (!m.id) continue;
        const b = baseById.get(m.id);
        if (b && (b.infusion_rate_value !== m.infusion_rate_value || b.infusion_rate_unit !== m.infusion_rate_unit)) {
          await updateEpisodeMedicationRate(m.id, m.infusion_rate_value, m.infusion_rate_unit);
        }
      }
      setSaveState('saved');
      onClose();
    } catch (e) {
      console.error('Guardar cambios falló:', e);
      setErrMsg(e?.message || String(e));
      setSaveState('error');
      setSaving(false);
    }
  };

  const SaveBadge = () => {
    const map = {
      saving: ['Guardando…', 'text-zinc-400'],
      saved: ['Guardado ✓', 'text-emerald-600'],
      error: [errMsg ? `Error: ${errMsg}` : 'Error al guardar', 'text-red-600'],
      rut: ['Quita el RUT para guardar', 'text-red-600'],
      idle: ['', ''],
    };
    const [text, cls] = map[saveState];
    return <span className={`text-sm max-w-[280px] truncate ${cls}`} title={text}>{text}</span>;
  };

  if (loading) {
    return <Overlay><p className="p-8 text-zinc-500">Cargando ficha…</p></Overlay>;
  }

  return (
    <Overlay>
      <header className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{bed.label} · Ficha</h2>
          <div className="flex items-center gap-3">
            <SaveBadge />
            <button type="button" onClick={saveAll} disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-700 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={onClose} aria-label="Cerrar"
              className="w-9 h-9 grid place-items-center rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-500 hover:text-zinc-700">
              ✕
            </button>
          </div>
        </div>
        {(sheet.allergies || sheet.isolation) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {sheet.allergies && (
              <span className="px-4 py-1.5 rounded-lg bg-orange-500 text-white font-bold text-sm">
                ALERGIAS: {sheet.allergies}
              </span>
            )}
            {sheet.isolation && (
              <span className="px-4 py-1.5 rounded-lg bg-red-600 text-white font-bold text-sm">
                AISLAMIENTO: {sheet.isolation}
              </span>
            )}
          </div>
        )}
      </header>

      <div className="px-6 py-6 space-y-8 max-w-3xl mx-auto">
        <Section title="Diagnósticos">
          <Textarea label="Diagnóstico actual" value={sheet.current_diagnosis} onChange={(v) => set('current_diagnosis', v)} />
          <Textarea label="Diagnóstico de ingreso" value={sheet.admission_diagnosis} onChange={(v) => set('admission_diagnosis', v)} />
        </Section>

        <Section title="Antecedentes">
          <Textarea label="Antecedentes mórbidos" value={sheet.morbid_history} onChange={(v) => set('morbid_history', v)} />
          <Textarea label="Antecedentes quirúrgicos" value={sheet.surgical_history} onChange={(v) => set('surgical_history', v)} />
        </Section>

        <Section title="Alertas">
          <Textarea label="Alergias" value={sheet.allergies} onChange={(v) => set('allergies', v)} rows={1} />
          <Textarea label="Aislamiento" value={sheet.isolation} onChange={(v) => set('isolation', v)} rows={1} />
        </Section>

        <Section title="Estado general">
          <div className="flex gap-2">
            {GENERAL_STATUS.map((g) => (
              <button key={g} type="button"
                onClick={() => set('general_status', g)}
                className={`px-4 py-2 rounded-lg text-sm border ${
                  sheet.general_status === g
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600'
                }`}>
                {g}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Evolución y manejo">
          <Textarea label="Observaciones" value={sheet.observations} onChange={(v) => set('observations', v)} rows={3} />
          <Textarea label="Cuidados de enfermería" value={sheet.nursing_care} onChange={(v) => set('nursing_care', v)} rows={3} />
          <Textarea label="Manejo médico" value={sheet.medical_management} onChange={(v) => set('medical_management', v)} rows={3} />
        </Section>

<Section title="Medicamentos">
  <EpisodeMedications items={epMeds} onAdd={onAddMed}
    onUpdateRate={onUpdateMedRate} onRemove={onRemoveMed} />
</Section>


        <Section title="Exámenes alterados">
          <ReadOnlyList items={labs}
            empty="Sin exámenes alterados (se reflejan al construir el módulo Laboratorio)."
            render={(l) => `${l.analyte}: ${l.value ?? ''} ${l.unit ?? ''} ${l.flag ? `(${l.flag})` : ''}`} />
        </Section>

        <Section title="Pendientes">
          <ReadOnlyList items={tasks}
            empty="Sin pendientes (se reflejan al construir el módulo Pendientes)."
            render={(t) => `${t.title} — ${t.status}`} />
        </Section>

        <Section title="Lesiones por presión">
          <PressureInjuries items={injuries} onSaveItem={onSaveInjury} onRemoveItem={onRemoveInjury} />
        </Section>

        <Section title="Eliminación">
          <div className="grid sm:grid-cols-2 gap-4">
            <NumberField label="Diuresis (mL)" value={sheet.diuresis} onChange={(v) => set('diuresis', v)} />
            <NumberField label="Deposiciones (n°)" value={sheet.bowel_movements} onChange={(v) => set('bowel_movements', v)} />
          </div>
        </Section>

        <Section title="Balance hídrico">
          <div className="flex items-end gap-3">
            <label className="flex-1">
              <span className="text-sm font-medium">Balance hídrico 12 h</span>
              <input type="number" className={field} value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)} placeholder="ej. -350" />
            </label>
            <button type="button" onClick={onAddBalance}
              className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700">
              Registrar
            </button>
          </div>

          {(() => {
            const ordered = [...balances].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
            let run = 0;
            const rows = ordered.map((b) => { run += Number(b.balance_12h || 0); return { ...b, run }; });
            const total = run;
            return (
              <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-3">
                <div className="flex justify-between text-sm font-semibold">
                  <span>Balance acumulado</span>
                  <span className={total < 0 ? 'text-red-600' : 'text-emerald-600'}>{total} mL</span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">Acumulado = registros anteriores + el actual.</p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {rows.map((b) => (
                    <li key={b.id} className="flex justify-between gap-2">
                      <span className="flex-1 truncate">{new Date(b.recorded_at).toLocaleString('es-CL')}</span>
                      <span className="w-20 text-right">{b.balance_12h} mL</span>
                      <span className="w-24 text-right font-medium text-zinc-700 dark:text-zinc-200">∑ {b.run} mL</span>
                    </li>
                  ))}
                  {rows.length === 0 && <li>Sin registros aún.</li>}
                </ul>
              </div>
            );
          })()}
        </Section>
      </div>
    </Overlay>
  );
}

function ReadOnlyList({ items, render, empty }) {
  if (!items.length) return <p className="text-sm text-zinc-400">{empty}</p>;
  return (
    <ul className="space-y-1 text-sm">
      {items.map((it) => (
        <li key={it.id} className="rounded-lg bg-zinc-50 dark:bg-zinc-800 px-3 py-2">{render(it)}</li>
      ))}
    </ul>
  );
}

function Overlay({ children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40">
      <div className="absolute inset-y-0 right-0 w-full max-w-2xl bg-white dark:bg-zinc-900 overflow-y-auto shadow-xl">
        {children}
      </div>
    </div>
  );
}
