// frontend/src/lib/laboratorio/ocr.js
// Lectura on-device de informes (imagen o PDF) + de-identificación + IA.
//
// Flujo híbrido, respetando la Ley 21.719:
//  1) readDocument(file): extrae el TEXTO en el navegador. La imagen/PDF nunca
//     se sube ni se guarda.
//       - PDF digital  → texto directo con PDF.js (instantáneo y preciso).
//       - PDF escaneado → renderiza cada página y le pasa Tesseract.
//       - Imagen        → Tesseract directo.
//  2) deidentify(text): tapa el RUT antes de que nada salga del dispositivo.
//  3) parseLabText(text): envía SOLO el texto de-identificado a /api/parse-lab,
//     que del lado servidor pide a Claude el JSON estructurado.

import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { redactRut } from '../sala/validation';

// El worker de PDF.js se sirve como asset de Vite (queda on-device).
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function isPdf(file) {
  return file?.type === 'application/pdf' || /\.pdf$/i.test(file?.name || '');
}

// ¿El texto extraído tiene contenido real (PDF digital) o está vacío (escaneado)?
function hasRealText(text) {
  return (text || '').replace(/\s+/g, '').length >= 20;
}

// OCR de una imagen (File/Blob o canvas) con Tesseract en español.
async function ocrImage(source) {
  const { data } = await Tesseract.recognize(source, 'spa');
  return data?.text || '';
}

// Extrae la capa de texto de un PDF (sin OCR). Devuelve { text, pdf }.
async function extractPdfText(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => it.str).join(' ') + '\n';
  }
  return { text, pdf };
}

// PDF escaneado: renderiza cada página a canvas y le pasa Tesseract.
async function ocrPdfPages(pdf) {
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    text += (await ocrImage(canvas)) + '\n';
  }
  return text;
}

// Punto de entrada: imagen o PDF → texto crudo (sin de-identificar aún).
export async function readDocument(file) {
  if (isPdf(file)) {
    const { text, pdf } = await extractPdfText(file);
    return hasRealText(text) ? text : await ocrPdfPages(pdf); // fallback OCR
  }
  return ocrImage(file);
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
