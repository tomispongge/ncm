// NCM · Laboratorio — función serverless (Vercel) para parsear texto OCR con IA.
//
// Recibe SOLO texto ya de-identificado (RUT tapado en el cliente); NUNCA la imagen.
// Pide a Claude extraer los analitos como JSON estructurado usando "strict tool use"
// (la salida queda garantizada contra el esquema, sin parsear texto libre a mano).
//
// La API key vive en el servidor (ANTHROPIC_API_KEY), nunca en el frontend.
// Requiere la dependencia @anthropic-ai/sdk (en el package.json de la raíz).

import Anthropic from '@anthropic-ai/sdk';

// Modelo: Haiku 4.5 — rápido y económico, ideal para extracción de datos.
// Para más precisión en OCR ruidoso, cambiar a 'claude-sonnet-5'.
const MODEL = 'claude-haiku-4-5';

const SYSTEM = `Eres un asistente que extrae resultados de un informe de laboratorio clínico chileno.
El texto viene de un OCR (puede tener errores) y YA fue de-identificado: no debe contener RUT ni nombres; si ves algún identificador personal, ignóralo.
Extrae cada analito como una fila. Reglas:
- Los decimales chilenos usan coma (13,5). Consérvalos tal cual en valueText.
- No inventes valores: si un campo no aparece, déjalo como cadena vacía "".
- analyte = nombre del examen (ej. "Hemoglobina"). valueText = el valor medido (ej. "13,5").
- unit = unidad (ej. "g/dL"). refLow / refHigh = límites numéricos del rango de referencia si aparecen. refText = rango en texto si no es numérico (ej. "Negativo").
- takenAt = fecha y hora del informe en formato "YYYY-MM-DDTHH:mm" si se puede determinar; si solo hay fecha usa "T00:00"; si no hay, "".
- labSource = nombre del laboratorio si aparece; si no, "".
Registra todo con la herramienta extract_labs.`;

const TOOL = {
  name: 'extract_labs',
  description: 'Registra los analitos y metadatos extraídos del informe de laboratorio.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      takenAt: { type: 'string', description: 'YYYY-MM-DDTHH:mm o cadena vacía' },
      labSource: { type: 'string', description: 'Nombre del laboratorio o cadena vacía' },
      results: {
        type: 'array',
        description: 'Una fila por analito.',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            analyte: { type: 'string' },
            valueText: { type: 'string' },
            unit: { type: 'string' },
            refLow: { type: 'string' },
            refHigh: { type: 'string' },
            refText: { type: 'string' },
          },
          required: ['analyte', 'valueText', 'unit', 'refLow', 'refHigh', 'refText'],
        },
      },
    },
    required: ['takenAt', 'labSource', 'results'],
  },
} as const;

export default async (req: any, res: any) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Falta ANTHROPIC_API_KEY en el servidor.' });
  }

  const text = (req.body && req.body.text) || '';
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Falta el texto a analizar.' });
  }
  // Tope defensivo: no mandar un texto enorme por error.
  const clipped = text.slice(0, 20000);

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM,
      tools: [TOOL as any],
      tool_choice: { type: 'tool', name: 'extract_labs' },
      messages: [{ role: 'user', content: clipped }],
    });

    const block: any = (message.content || []).find((b: any) => b.type === 'tool_use');
    if (!block) {
      return res.status(502).json({ error: 'La IA no devolvió resultados.' });
    }
    const out = block.input || {};
    return res.status(200).json({
      takenAt: typeof out.takenAt === 'string' ? out.takenAt : '',
      labSource: typeof out.labSource === 'string' ? out.labSource : '',
      results: Array.isArray(out.results) ? out.results : [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Error al analizar el informe.' });
  }
};
