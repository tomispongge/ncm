// NCM · Módulo Medicamentos — constantes

// 3. Presentación
export const PRESENTATION_FORMS = [
  'ampolla', 'frasco', 'jeringa', 'comprimido', 'capsula', 'otro',
];
export const PRESENTATION_UNITS = ['mg', 'gr', 'ml'];

// 4. Solvente
export const SOLVENTS = ['SG 5%', 'SG 30%', 'SF 0.9%', 'SF 3%', 'SF 0.45%'];

// 5. Dilución (mL)
export const DILUTION_ML = [10, 20, 100, 250, 500, 1000];

// 7. Tiempo de administración
export const ADMIN_RATE_UNITS = [
  'ml/hr', 'UI/hr', 'ug/kg/hr', 'ug/kg/min', 'mg/hr', 'ug/min', 'ug/hr',
];
export const RATE_MIN = 0.01;
export const RATE_MAX = 1200;

// Etiquetas legibles para los <select> (valor almacenado → texto mostrado)
export const LABELS = {
  ampolla: 'Ampolla', frasco: 'Frasco', jeringa: 'Jeringa',
  comprimido: 'Comprimido', capsula: 'Cápsula', otro: 'Otro',
};

// Arma "ampolla 2 mg" desde las sub-columnas de presentación.
export function formatPresentation(med) {
  if (!med) return '';
  const form = med.presentation_form === 'otro'
    ? (med.presentation_other || 'otro')
    : (LABELS[med.presentation_form] || med.presentation_form || '');
  const amount = med.presentation_amount != null ? `${med.presentation_amount}` : '';
  const unit = med.presentation_unit || '';
  return [form, [amount, unit].filter(Boolean).join(' ')].filter(Boolean).join(' ').trim();
}

// Arma "10 mL en SF 0.9%" para la tarjeta de la cama / resumen.
export function formatDilution(med) {
  if (!med) return '';
  const vol = med.dilution_ml != null ? `${med.dilution_ml} mL` : '';
  const sol = med.solvent || '';
  return [vol, sol].filter(Boolean).join(' en ');
}

// "20 ug/kg/min" para el tiempo de administración.
export function formatRate(med) {
  if (!med || med.admin_rate_value == null) return '';
  return `${med.admin_rate_value} ${med.admin_rate_unit || ''}`.trim();
}
