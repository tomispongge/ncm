// frontend/src/lib/laboratorio/exportExcel.js
// Exporta la matriz de exámenes de una cama a un archivo Excel (.xlsx).
// Usa las mismas columnas/filas que ya arma la vista (analitos × fechas).
// El dato ya está de-identificado (sin nombre ni RUT); solo valores + fechas.

import * as XLSX from 'xlsx';

const DISCLAIMER =
  'Herramienta de apoyo. La validación final corresponde al profesional sanitario responsable.';

function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d);
}

// Texto de una celda: "13,5 g/dL" (+ " *" si está fuera de rango).
function cellText(cell) {
  if (!cell) return '';
  const val = cell.value_text ?? '';
  const unit = cell.unit ? ` ${cell.unit}` : '';
  const flag = cell.is_abnormal ? ' *' : '';
  return `${val}${unit}${flag}`.trim();
}

export function exportMatrixToExcel({ columns, rows, bedLabel }) {
  const cols = columns || [];
  const rws = rows || [];

  // Encabezado: Analito + una columna por fecha (con laboratorio si hay).
  const header = ['Analito', ...cols.map((c) => {
    const d = fmtDateTime(c.taken_at);
    return c.lab_source ? `${d} — ${c.lab_source}` : d;
  })];

  const body = rws.map((r) => [
    r.analyte,
    ...cols.map((c) => cellText(r.cells[c.id])),
  ]);

  const aoa = [
    [`Exámenes de laboratorio${bedLabel ? ` — ${bedLabel}` : ''}`],
    [DISCLAIMER],
    [],
    header,
    ...body,
    [],
    ['* = valor fuera del rango de referencia de ese informe'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 28 }, ...cols.map(() => ({ wch: 22 }))];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Exámenes');

  const safeBed = (bedLabel || 'cama').replace(/[^\w-]+/g, '_');
  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Laboratorio_${safeBed}_${today}.xlsx`);
}
