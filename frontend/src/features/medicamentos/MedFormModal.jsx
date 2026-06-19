// NCM · Medicamentos — modal de alta/edición (solo admin)
import { useState } from 'react';
import {
  PRESENTATION_FORMS, PRESENTATION_UNITS, SOLVENTS, DILUTION_ML,
  ADMIN_RATE_UNITS, RATE_MIN, RATE_MAX, LABELS,
} from '../../lib/medicamentos/constants';
import { containsRut } from '../../lib/sala/validation';
import TextCardField from './TextCardField';

const field =
  'w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm';

const EMPTY = {
  generic_name: '', brand_names: '',
  presentation_form: '', presentation_other: '', presentation_amount: '', presentation_unit: '',
  solvent: '', dilution_ml: '',
  nursing_care: '',
  admin_rate_value: '', admin_rate_unit: '',
  observations: '',
};

const RUT_FIELDS = ['generic_name', 'brand_names', 'presentation_other', 'nursing_care', 'observations'];

function fromMed(med) {
  if (!med) return { ...EMPTY };
  const v = (x) => (x == null ? '' : x);
  return {
    generic_name: v(med.generic_name), brand_names: v(med.brand_names),
    presentation_form: v(med.presentation_form), presentation_other: v(med.presentation_other),
    presentation_amount: v(med.presentation_amount), presentation_unit: v(med.presentation_unit),
    solvent: v(med.solvent), dilution_ml: v(med.dilution_ml),
    nursing_care: v(med.nursing_care),
    admin_rate_value: v(med.admin_rate_value), admin_rate_unit: v(med.admin_rate_unit),
    observations: v(med.observations),
  };
}

function toPayload(f) {
  const num = (x) => (x === '' || x == null ? null : Number(x));
  const txt = (x) => (x?.trim() ? x.trim() : null);
  return {
    generic_name: f.generic_name.trim(),
    brand_names: txt(f.brand_names),
    presentation_form: f.presentation_form || null,
    presentation_other: f.presentation_form === 'otro' ? txt(f.presentation_other) : null,
    presentation_amount: num(f.presentation_amount),
    presentation_unit: f.presentation_unit || null,
    solvent: f.solvent || null,
    dilution_ml: num(f.dilution_ml),
    nursing_care: txt(f.nursing_care),
    admin_rate_value: num(f.admin_rate_value),
    admin_rate_unit: f.admin_rate_unit || null,
    observations: txt(f.observations),
  };
}

export default function MedFormModal({ med, onCancel, onSubmit }) {
  const [f, setF] = useState(() => fromMed(med));
  const [busy, setBusy] = useState(false);
  const set = (patch) => setF((prev) => ({ ...prev, ...patch }));

  const rutBad = RUT_FIELDS.some((k) => containsRut(f[k]));
  const rate = f.admin_rate_value === '' ? null : Number(f.admin_rate_value);
  const rateBad = f.admin_rate_value !== '' &&
    (!Number.isFinite(rate) || rate < RATE_MIN || rate > RATE_MAX);
  const canSave = f.generic_name.trim() !== '' && !rutBad && !rateBad && !busy;

  const submit = async () => {
    if (!canSave) return;
    setBusy(true);
    try { await onSubmit(toPayload(f)); }
    catch (e) { alert(e.message); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onCancel}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-zinc-900 shadow-xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold">{med ? 'Editar fármaco' : 'Agregar fármaco'}</h2>

        {/* 1. Nombre genérico */}
        <label className="block">
          <span className="text-sm font-medium">Nombre genérico <span className="text-red-500">*</span></span>
          <input className={`${field} mt-1`} value={f.generic_name}
            placeholder="Ej. Noradrenalina"
            onChange={(e) => set({ generic_name: e.target.value })} />
        </label>

        {/* 2. Nombres comerciales */}
        <label className="block">
          <span className="text-sm font-medium">Nombres comerciales</span>
          <input className={`${field} mt-1`} value={f.brand_names}
            placeholder="Ej. Levophed"
            onChange={(e) => set({ brand_names: e.target.value })} />
        </label>

        {/* 3. Presentación */}
        <div>
          <p className="text-sm font-medium mb-1">Presentación</p>
          <div className="grid grid-cols-3 gap-2">
            <select className={field} value={f.presentation_form}
              onChange={(e) => set({ presentation_form: e.target.value })}>
              <option value="">Tipo…</option>
              {PRESENTATION_FORMS.map((x) => <option key={x} value={x}>{LABELS[x] || x}</option>)}
            </select>
            <input type="number" step="any" className={field} value={f.presentation_amount}
              placeholder="Cantidad"
              onChange={(e) => set({ presentation_amount: e.target.value })} />
            <select className={field} value={f.presentation_unit}
              onChange={(e) => set({ presentation_unit: e.target.value })}>
              <option value="">Unidad…</option>
              {PRESENTATION_UNITS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          {f.presentation_form === 'otro' && (
            <input className={`${field} mt-2`} value={f.presentation_other}
              placeholder="¿Cuál?"
              onChange={(e) => set({ presentation_other: e.target.value })} />
          )}
        </div>

        {/* 4 + 5. Solvente y Dilución */}
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium">Solvente</span>
            <select className={`${field} mt-1`} value={f.solvent}
              onChange={(e) => set({ solvent: e.target.value })}>
              <option value="">Seleccionar…</option>
              {SOLVENTS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Dilución</span>
            <select className={`${field} mt-1`} value={f.dilution_ml}
              onChange={(e) => set({ dilution_ml: e.target.value })}>
              <option value="">Seleccionar…</option>
              {DILUTION_ML.map((x) => <option key={x} value={x}>{x} mL</option>)}
            </select>
          </label>
        </div>

        {/* 6. Cuidados de enfermería → tarjeta */}
        <TextCardField label="Cuidados de enfermería" value={f.nursing_care}
          placeholder="Describe los cuidados…"
          onChange={(v) => set({ nursing_care: v })} />

        {/* 7. Tiempo de administración */}
        <div>
          <p className="text-sm font-medium mb-1">Tiempo de administración</p>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" step="any" min={RATE_MIN} max={RATE_MAX}
              className={`${field} ${rateBad ? 'border-red-500 ring-1 ring-red-400' : ''}`}
              value={f.admin_rate_value} placeholder={`${RATE_MIN}–${RATE_MAX}`}
              onChange={(e) => set({ admin_rate_value: e.target.value })} />
            <select className={field} value={f.admin_rate_unit}
              onChange={(e) => set({ admin_rate_unit: e.target.value })}>
              <option value="">Unidad…</option>
              {ADMIN_RATE_UNITS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          {rateBad && <p className="text-xs text-red-600 mt-1">Debe ser un número entre {RATE_MIN} y {RATE_MAX}.</p>}
        </div>

        {/* 8. Observaciones → tarjeta (opcional) */}
        <TextCardField label="Observaciones (si aplica)" value={f.observations}
          placeholder="Solo si corresponde…"
          onChange={(v) => set({ observations: v })} />

        {rutBad && <p className="text-sm text-red-600">Quita el RUT o identificadores personales para guardar.</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600">Cancelar</button>
          <button type="button" onClick={submit} disabled={!canSave}
            className="px-4 py-2 text-sm rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-700 disabled:opacity-40">
            {busy ? 'Guardando…' : (med ? 'Guardar cambios' : 'Agregar')}
          </button>
        </div>
      </div>
    </div>
  );
}
