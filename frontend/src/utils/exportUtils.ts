// ─── Export Utilities ───────────────────────────────────────────────────────

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function xmlEscape(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Export any array of objects as a CSV download (Excel-compatible). */
export function exportCSV(filename: string, rows: Record<string, unknown>[]): void {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
  // BOM so Excel opens UTF-8 correctly
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(`${filename}.csv`, blob);
}

/**
 * Export rows as Excel SpreadsheetML (.xls) — opens in Excel/Google Sheets
 * without adding an xlsx dependency.
 */
export function exportExcel(filename: string, rows: Record<string, unknown>[]): void {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const headerCells = headers.map((h) => `<Cell><Data ss:Type="String">${xmlEscape(h)}</Data></Cell>`).join('');
  const body = rows
    .map((r) => {
      const cells = headers
        .map((h) => {
          const raw = r[h];
          const num = typeof raw === 'number' ? raw : Number(String(raw ?? '').replace(/,/g, ''));
          if (raw !== '' && raw != null && Number.isFinite(num) && String(raw).trim() !== '' && !Number.isNaN(num) && /^-?\d+(\.\d+)?$/.test(String(raw).trim())) {
            return `<Cell><Data ss:Type="Number">${num}</Data></Cell>`;
          }
          return `<Cell><Data ss:Type="String">${xmlEscape(raw)}</Data></Cell>`;
        })
        .join('');
      return `<Row>${cells}</Row>`;
    })
    .join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Sheet1">
  <Table>
   <Row>${headerCells}</Row>
   ${body}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  downloadBlob(`${filename}.xls`, blob);
}

/** Convenience: export both CSV and Excel for the same rows. */
export function exportCsvAndExcel(filename: string, rows: Record<string, unknown>[]): void {
  exportCSV(filename, rows);
  exportExcel(filename, rows);
}

/** Print a formatted table as PDF via browser print dialog */
export function exportPDF(title: string, headers: string[], rows: (string | number)[][]): void {
  const tableRows = rows
    .map(r => `<tr>${r.map(c => `<td>${c ?? ''}</td>`).join('')}</tr>`)
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; color: #111; }
    h2 { font-size: 16px; margin-bottom: 4px; }
    .meta { font-size: 10px; color: #666; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1e293b; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; }
    td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h2>${title}</h2>
  <p class="meta">Generated: ${new Date().toLocaleString('en-PK')}</p>
  <table>
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 400);
}
