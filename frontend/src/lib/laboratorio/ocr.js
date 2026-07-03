// frontend/src/lib/laboratorio/ocr.js
// OCR on-device (Tesseract.js) + de-identificación + llamada a la IA.
//
// Flujo híbrido, respetando la Ley 21.719:
//  1) runOcr(file): la IMAGEN se procesa 100% en el navegador → texto crudo.
//     La imagen nunca se sube ni se guarda.
//  2) deidentify(text): tapa el RUT antes de que nada salga del dispositivo.
//  3) parseLabText(text): envía SOLO el texto de-identificado a /api/parse-lab,
//     que del lado servidor pide a Claude el JSON estructurado.

import Tesseract from 'tesseract.js';
import { redactRut } from '../sala/validation';

// OCR en el navegador. `file` es un File/Blob de un <input type="file">.
export async function runOcr(file) {
  const { data } = await Tesseract.recognize(file, 'spa');
  return data?.text || '';
}

// Tapa RUT/cédula. Los nombres son menos detectables: el humano los borra en
// la pantalla de verificación antes de enviar.
export function deidentify(text) {
  return redactRut(text || '');
}

// Envía el texto de-identificado a la función serverless y devuelve
// { takenAt, labSource, results: [{analyte, valueText, unit, refLow, refHigh, refText}] }.
export async function parseLabText(text) {
  const res = await fetch('/api/parse-lab', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* respuesta no-JSON (ej. 404 en vite dev) */
    }
    throw new Error(msg);
  }
  return res.json();
}
