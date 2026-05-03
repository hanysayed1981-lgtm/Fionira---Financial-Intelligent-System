// @DO_NOT_MODIFY - Core extraction engine locked by user request.
export function parseExcelDateDetailed(val: any): { parsed: string | null, method: string, raw: any } {
  if (val === null || val === undefined || val === '') return { parsed: null, method: 'failed', raw: val };
  
  // Clean string
  const cleanVal = String(val).trim();

  // Excel serial
  if (typeof val === 'number' || (cleanVal.match(/^\\d+$/) && parseInt(cleanVal) > 30000)) {
    const num = typeof val === 'number' ? val : parseInt(cleanVal);
    const d = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return { parsed: d.toISOString().split('T')[0], method: 'excel_serial', raw: val };
  }

  // DD/MM/YYYY or YYYY/MM/DD
  const parts = cleanVal.split(/[-/\\\\]/);
  if (parts.length === 3) {
      if (parts[2].length === 4) { // DD/MM/YYYY
          const d2 = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          if (!isNaN(d2.getTime())) return { parsed: d2.toISOString().split('T')[0], method: 'string', raw: val };
      } else if (parts[0].length === 4) { // YYYY/MM/DD
          const d3 = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
          if (!isNaN(d3.getTime())) return { parsed: d3.toISOString().split('T')[0], method: 'string', raw: val };
      }
  }

  // Fallback to strict JS date ONLY if it has a year
  const containsYear = /\\b(19|20)\\d{2}\\b/.test(cleanVal);
  if (containsYear) {
     const d = new Date(cleanVal);
     if (!isNaN(d.getTime())) return { parsed: d.toISOString().split('T')[0], method: 'string', raw: val };
  }

  return { parsed: null, method: 'failed', raw: val };
}

export function parseExcelDate(val: any): string | null {
   return parseExcelDateDetailed(val).parsed;
}

export function parseNum(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  
  let strVal = String(val).trim();
  if (strVal === '-' || strVal === '−') return 0; // Accounting zero
  
  let isNegative = false;
  if (strVal.startsWith('(') && strVal.endsWith(')')) {
    isNegative = true;
  } else if (strVal.includes('-') || strVal.includes('−')) {
    isNegative = true;
  }
  
  const parsed = Number(strVal.replace(/[^\d.]/g, ''));
  if (isNaN(parsed) || strVal.replace(/[^\d.]/g, '') === '') return null;
  
  return isNegative ? -Math.abs(parsed) : parsed;
}
