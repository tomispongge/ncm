// NCM · Módulo Sala — constantes
export const MAX_BEDS = 20;

export const GENERAL_STATUS = ['BCG', 'RCG', 'MCG'];

export const PI_GRADES = [1, 2, 3, 4, 5];
export const PI_TISSUE_TYPES = ['esfacelado', 'granulatorio', 'necrotico'];
export const PI_EXUDATE_AMOUNT = ['escaso', 'moderado', 'abundante'];
export const PI_EXUDATE_TYPE = ['seroso', 'purulento', 'hematico', 'otro'];

export const BED_STATUS = {
  libre: { label: 'Libre', dot: 'bg-emerald-500' },
  ocupada: { label: 'Ocupada', dot: 'bg-sky-500' },
  bloqueada: { label: 'Bloqueada', dot: 'bg-zinc-400' },
};
