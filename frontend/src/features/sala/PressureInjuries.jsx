// NCM · Módulo Sala — Lesiones por presión (repetible, con resumen colapsable)
import { useState } from 'react';
import {
  PI_GRADES, PI_TISSUE_TYPES, PI_EXUDATE_AMOUNT, PI_EXUDATE_TYPE,
} from '../../lib/sala/constants';

const empty = {
  grade: null, location: '', detail: '', tissue_types: [], tissue_percentage: '',
  exudate_amount: null, exudate_type: null, exudate_type_other: '',
  depth: '', max_extension: '',
};

const hasText = (v) => (v ?? '').toString().trim() !== '';

const chip = (active) =>
  `px-3 py-1.5 rounded-lg text-sm border transition-colors ${
    active
      ? 'bg-sky-600 text-white border-sky-600'
      : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 hover:border-sky-400'
  }`;

const field =
  'w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm';

// ---- Editor (formulario expandido) ---------------------------------
function InjuryEditor({ value, onChange, onSave, onRemove, index }) {
  const v = value;
  const advanced = v.grade && v.grade >= 2;
  const set = (patch) => onChange({ ...v, ...patch });
  const toggleTissue = (t) =>
    set({
      tissue_types: v.tissue_types.includes(t)
        ? v.tissue_types.filter((x) => x !== t)
        : [...v.tissue_types, t],
    });
  const pickGrade = (g) =>
    set(
      g === 1
        ? { grade: 1, tissue_types: [], tissue_percentage: '', exudate_amount: null,
            exudate_type: null, exudate_type_other: '', depth: '', max_extension: '' }
        : { grade: g, detail: '' }
    );

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-zinc-800 dark:text-zinc-100">Lesión {index + 1}</h4>
        <button type="button" onClick={onRemove}
          className="text-sm text-red-600 hover:underline">Quitar</button>
      </div>

      <label className="block">
        <span className="text-sm font-medium">Ubicación</span>
        <input className={field} value={v.location ?? ''}
          placeholder="Ej. sacro, talón derecho…"
          onChange={(e) => set({ location: e.target.value })} />
      </label>

      <div>
        <p className="text-sm font-medium mb-1.5">Grado</p>
        <div className="flex flex-wrap gap-2">
          {PI_GRADES.map((g) => (
            <button key={g} type="button" className={chip(v.grade === g)}
              onClick={() => pickGrade(g)}>{g}</button>
          ))}
        </div>
      </div>

      {v.grade === 1 && (
        <label className="block">
          <span className="text-sm font-medium">Detalle</span>
          <textarea rows={2} className={field} value={v.detail ?? ''}
            onChange={(e) => set({ detail: e.target.value })} />
        </label>
      )}

      {advanced && (
        <>
          <div>
            <p className="text-sm font-medium mb-1.5">Tipo de tejido <span className="text-zinc-400">(múltiple)</span></p>
            <div className="flex flex-wrap gap-2">
              {PI_TISSUE_TYPES.map((t) => (
                <button key={t} type="button" className={chip(v.tissue_types.includes(t))}
                  onClick={() => toggleTissue(t)}>{t}</button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium">Porcentaje de tejido (%)</span>
              <input type="number" min="0" max="100" className={field}
                value={v.tissue_percentage}
                onChange={(e) => set({ tissue_percentage: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Profundidad</span>
              <input className={field} value={v.depth}
                onChange={(e) => set({ depth: e.target.value })} />
            </label>
          </div>

          <div>
            <p className="text-sm font-medium mb-1.5">Exudado</p>
            <div className="flex flex-wrap gap-2">
              {PI_EXUDATE_AMOUNT.map((a) => (
                <button key={a} type="button" className={chip(v.exudate_amount === a)}
                  onClick={() => set({ exudate_amount: a })}>{a}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-1.5">Tipo de exudado</p>
            <div className="flex flex-wrap gap-2">
              {PI_EXUDATE_TYPE.map((t) => (
                <button key={t} type="button" className={chip(v.exudate_type === t)}
                  onClick={() => set({ exudate_type: t })}>{t}</button>
              ))}
            </div>
            {v.exudate_type === 'otro' && (
              <input className={`${field} mt-2`} placeholder="Describa"
                value={v.exudate_type_other}
                onChange={(e) => set({ exudate_type_other: e.target.value })} />
            )}
          </div>

          <label className="block">
            <span className="text-sm font-medium">Mayor extensión</span>
            <input className={field} value={v.max_extension}
              onChange={(e) => set({ max_extension: e.target.value })} />
          </label>
        </>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={onSave}
          className="rounded-lg bg-sky-600 text-white px-4 py-2 text-sm font-medium hover:bg-sky-700">
          Guardar lesión
        </button>
      </div>
    </div>
  );
}

// ---- Resumen (colapsado tras guardar) ------------------------------
function InjurySummary({ value, index, onEdit, onRemove }) {
  const v = value;
  const parts = [];
  if (v.grade) parts.push(`Grado ${v.grade}`);
  if (v.grade === 1 && hasText(v.detail)) parts.push(v.detail);
  if (v.grade >= 2) {
    if (v.tissue_types?.length) parts.push(`Tejido: ${v.tissue_types.join(', ')}`);
    if (hasText(v.tissue_percentage)) parts.push(`${v.tissue_percentage}% tejido`);
    if (v.exudate_amount) parts.push(`Exudado ${v.exudate_amount}`);
    if (v.exudate_type) parts.push(`Tipo ${v.exudate_type === 'otro' ? (v.exudate_type_other || 'otro') : v.exudate_type}`);
    if (hasText(v.depth)) parts.push(`Prof. ${v.depth}`);
    if (hasText(v.max_extension)) parts.push(`Ext. ${v.max_extension}`);
  }

  return (
    <div className="relative rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 p-4 pr-10">
      <button type="button" onClick={onRemove} aria-label="Eliminar lesión"
        className="absolute top-3 right-3 w-6 h-6 grid place-items-center rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">
        ✕
      </button>
      <h4 className="font-medium text-zinc-800 dark:text-zinc-100">
        Lesión {index + 1}{hasText(v.location) ? ` · ${v.location}` : ''}
      </h4>
      <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">
        {parts.join(' · ') || 'Sin detalle'}
      </p>
      <button type="button" onClick={onEdit}
        className="text-sm text-sky-600 hover:underline mt-2">Editar</button>
    </div>
  );
}

export default function PressureInjuries({ items, onSaveItem, onRemoveItem }) {
  const [drafts, setDrafts] = useState(items.map((i) => ({ ...i, _editing: false })));

  const sync = JSON.stringify(items.map((i) => i.id));
  const [lastSync, setLastSync] = useState(sync);
  if (sync !== lastSync) { setDrafts(items.map((i) => ({ ...i, _editing: false }))); setLastSync(sync); }

  const addDraft = () =>
    setDrafts((d) => [...d, { ...empty, _tmp: crypto.randomUUID(), _editing: true }]);
  const updateDraft = (idx, val) =>
    setDrafts((d) => d.map((x, i) => (i === idx ? { ...val, _editing: true } : x)));
  const editDraft = (idx) =>
    setDrafts((d) => d.map((x, i) => (i === idx ? { ...x, _editing: true } : x)));
  const removeDraft = async (idx) => {
    const item = drafts[idx];
    if (item.id) await onRemoveItem(item.id);
    setDrafts((d) => d.filter((_, i) => i !== idx));
  };
  const saveDraft = async (idx) => {
    try {
      const saved = await onSaveItem(stripDraft(drafts[idx]));
      setDrafts((d) => d.map((x, i) => (i === idx ? { ...saved, _editing: false } : x)));
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-4">
      {drafts.map((d, i) => (
        d._editing
          ? (
            <InjuryEditor key={d.id ?? d._tmp} index={i} value={d}
              onChange={(val) => updateDraft(i, val)}
              onSave={() => saveDraft(i)}
              onRemove={() => removeDraft(i)} />
          ) : (
            <InjurySummary key={d.id ?? d._tmp} index={i} value={d}
              onEdit={() => editDraft(i)}
              onRemove={() => removeDraft(i)} />
          )
      ))}
      <button type="button" onClick={addDraft}
        className="w-full rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 py-3 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:border-sky-400">
        + Agregar lesión por presión
      </button>
    </div>
  );
}

function stripDraft(d) {
  const { _tmp, _editing, created_at, updated_at, row_version, deleted, ...rest } = d;
  return {
    ...rest,
    tissue_percentage: rest.tissue_percentage === '' ? null : Number(rest.tissue_percentage),
  };
}
