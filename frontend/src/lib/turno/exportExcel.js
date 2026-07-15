// frontend/src/lib/turno/exportExcel.js
// Exporta la entrega de turno completa (todas las camas) a Excel (.xlsx).
import * as XLSX from 'xlsx';

const DISCLAIMER =
  'Herramienta de apoyo. La validación final corresponde al profesional sanitario responsable.';

// rows: [{ label, note }]
export function exportHandoffExcel(rows) {
  const aoa = [
    ['Entrega de turno'],
    [DISCLAIMER],
    [],
    ['Cama', 'Nota de entrega'],
    ...(rows || []).map((r) => [r.label, r.note || '']),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 12 }, { wch: 70 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Entrega');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Entrega_turno_${today}.xlsx`);
}
