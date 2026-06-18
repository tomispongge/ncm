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
