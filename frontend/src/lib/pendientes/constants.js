// frontend/src/lib/pendientes/constants.js
// Tipos de pendiente, opciones de los desplegables y el resumen de una línea
// que se muestra en la tarjeta de Sala. Helpers puros (sin red).

export const TASK_KINDS = [
  { value: 'interconsulta', label: 'Interconsulta' },
  { value: 'evaluacion', label: 'Evaluación' },
  { value: 'examen', label: 'Examen' },
  { value: 'procedimiento', label: 'Procedimiento' },
  { value: 'cultivo', label: 'Cultivo' },
];

export const EXAMEN_SUBTYPES = ['imagenológico', 'sangre', 'otros'];
export const PROCEDIMIENTO_SUBTYPES = [
  'endoscopia', 'cirugía', 'diálisis', 'punción',
  'hemocultivo', 'urocultivo', 'muestra de deposiciones', 'otros',
];
export const CULTIVO_SUBTYPES = ['resultado', 'toma'];

// Opciones del desplegable para un tipo, o null si el tipo no tiene subtype.
export function subtypesFor(kind) {
  if (kind === 'examen') return EXAMEN_SUBTYPES;
  if (kind === 'procedimiento') return PROCEDIMIENTO_SUBTYPES;
  if (kind === 'cultivo') return CULTIVO_SUBTYPES;
  return null; // interconsulta, evaluacion
}

const KIND_SHORT = {
  interconsulta: 'IC',
  evaluacion: 'Eval',
  examen: 'Examen',
  procedimiento: 'Proc.',
  cultivo: 'Cultivo',
};

// Resumen de una línea: "IC: cardiología ✓" · "Examen (imagenológico): TAC".
export function summarizeTask(t) {
  if (!t) return '';
  const head = KIND_SHORT[t.kind] || t.kind || '';
  const sub = t.subtype ? ` (${t.subtype})` : '';
  const detail = (t.detail || '').trim();
  const body = detail ? `: ${detail}` : '';
  const flag = t.kind === 'interconsulta' && t.processed ? ' ✓' : '';
  return `${head}${sub}${body}${flag}`;
}
