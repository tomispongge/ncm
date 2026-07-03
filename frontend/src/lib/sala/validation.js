// NCM · Sala — protección de datos (Ley 21.719)
// Detecta identificadores tipo RUT/cédula para impedir que se guarden
// en campos de texto libre y queden expuestos / extraíbles desde la app.

const RUT_PATTERNS = [
  /\b\d{1,2}(?:\.\d{3}){2}\s*-?\s*[\dkK]\b/, // 12.345.678-9
  /\b\d{7,8}\s*-\s*[\dkK]\b/,                // 12345678-9
  /\b\d{8,9}\b/,                             // 123456789 (secuencia larga)
];

export function containsRut(text) {
  if (text == null) return false;
  const s = String(text);
  return RUT_PATTERNS.some((re) => re.test(s));
}

// Devuelve la primera clave cuyo valor contiene un RUT, o null.
export function firstRutField(obj, fields) {
  return fields.find((f) => containsRut(obj[f])) ?? null;
}

// Reemplaza cualquier RUT/cédula por "[RUT]". Se usa para de-identificar el
// texto OCR ANTES de enviarlo a la IA (la imagen nunca sale del dispositivo).
export function redactRut(text) {
  if (text == null) return '';
  let s = String(text);
  const globalPatterns = [
    /\b\d{1,2}(?:\.\d{3}){2}\s*-?\s*[\dkK]\b/g, // 12.345.678-9
    /\b\d{7,8}\s*-\s*[\dkK]\b/g,                // 12345678-9
    /\b\d{8,9}\b/g,                             // 123456789 (secuencia larga)
  ];
  for (const re of globalPatterns) s = s.replace(re, '[RUT]');
  return s;
}
