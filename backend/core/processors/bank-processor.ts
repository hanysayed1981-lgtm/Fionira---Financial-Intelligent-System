import * as XLSX from 'xlsx';

export function processBanks(buffer: ArrayBuffer, fileName: string) {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  
  const records = [];
  const skipped = [];
  let headerRowIndex = -1;
  const colMap = new Map();

  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i] as any[];
    if (!row || row.length === 0) continue;
    
    let stringCount = 0;
    let numberCount = 0;
    row.forEach(cell => {
      if (typeof cell === 'string' && cell.trim() !== '') stringCount++;
      if (typeof cell === 'number') numberCount++;
    });

    if (stringCount > 3 && numberCount === 0) {
      headerRowIndex = i;
      row.forEach((col, idx) => {
        if (typeof col === 'string') {
          colMap.set(col.trim().toLowerCase(), idx);
        }
      });
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error("Could not detect structural header for banks.");
  }

  const getCol = (patterns: RegExp[], excludePatterns: RegExp[] = []) => {
    let foundCol = -1;
    for (const [key, val] of colMap.entries()) {
      for (const p of patterns) {
        if (p.test(key)) {
          let excluded = false;
          for (const ex of excludePatterns) {
            if (ex.test(key)) {
               excluded = true;
               break;
            }
          }
          if (!excluded) {
             foundCol = val;
             break;
          }
        }
      }
      if (foundCol !== -1) break;
    }
    return foundCol;
  };

  const dateCol = getCol([/date/i, /تاريخ/i]);
  const descCol = getCol([/desc/i, /تفاصيل/i, /بيان/i, /details/i, /particulars/i]);
  const debitCol = getCol([/debit/i, /مدين/i, /سحب/i, /withdrawal/i, /out/i, /مخرج/i]);
  const creditCol = getCol([/credit/i, /دائن/i, /إيداع/i, /deposit/i, /in/i, /مدخل/i]);
  const balanceCol = getCol([/balance/i, /رصيد/i]);
  console.log({
    dateColumn: dateCol,
    descColumn: descCol,
    debitColumn: debitCol,
    creditColumn: creditCol,
    balanceColumn: balanceCol
  });

  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i] as any[];
    if (!row || row.length === 0 || row.every(c => c === undefined || c === null || c === '')) continue;

    let hasNumbers = false;
    row.forEach(c => { if (typeof c === 'number' || (typeof c === 'string' && !isNaN(Number(c.replace(/,/g, ''))))) hasNumbers = true; });

    if (!hasNumbers) {
      skipped.push({ index: i, reason: 'Structural: No numeric values', _sourceFile: fileName, rawData: row });
      continue;
    }

    let isTotalRow = false;
    for (let cIdx = 0; cIdx < Math.min(row.length, 5); cIdx++) {
      const c = row[cIdx];
      if (typeof c === 'string') {
         const lower = c.toLowerCase().trim();
         if (/^(total|totals|اجمال[يى]|إجمال[يى]|الاجمال[يى]|الإجمال[يى]|اجماليات|الاجماليات|الإجماليات|مجموع|المجموع)(?:\s.*)?$/i.test(lower)) {
            isTotalRow = true;
            break;
         }
      }
    }
    
    if (isTotalRow) {
      skipped.push({ index: i, reason: 'Structural: Total row detected', _sourceFile: fileName, rawData: row });
      continue;
    }

    const tDesc = typeof row[descCol] === 'string' ? row[descCol].toLowerCase() : '';
    let isOpening = false;
    if (tDesc.includes('opening balance') || tDesc.includes('رصيد افتتاحي')) {
       isOpening = true;
    }

    const rawDate = row[dateCol] ? String(row[dateCol]) : '';
    const rawDesc = row[descCol] ? String(row[descCol]) : 'حركة غير محددة';
    
    let rawDebit = row[debitCol] || 0;
    let rawCredit = row[creditCol] || 0;

    let debit = typeof rawDebit === 'number' ? rawDebit : Number(String(rawDebit).replace(/[^\d.-]/g, ''));
    let credit = typeof rawCredit === 'number' ? rawCredit : Number(String(rawCredit).replace(/[^\d.-]/g, ''));

    if (isNaN(debit)) debit = 0;
    if (isNaN(credit)) credit = 0;
    
    if (debit === 0 && credit === 0) {
       skipped.push({ index: i, reason: 'Structural: Empty movement', _sourceFile: fileName, rawData: row });
       continue;
    }

    
    let periodYear = null;
    if (rawDate) {
      const yearMatch = String(rawDate).match(/\b(20\d{2})\b/);
      if (yearMatch) periodYear = parseInt(yearMatch[1], 10);
    }

    const record = {
      _sourceFile: fileName,
      _originalRowIndex: i,
      Invoice_Number: '',
      Invoice_Date: rawDate,
      Period_Year: periodYear,
      Entity_Name: rawDesc.trim(),
      Raw_Entity: rawDesc.trim(),
      Total_Amount: debit > 0 ? debit : credit,
      VAT_Amount: 0,
      Taxable_Amount: debit > 0 ? debit : credit,
      NonTaxable_Amount: 0,
      Net_Amount: debit > 0 ? debit : credit,
      Category: isOpening ? 'رصيد افتتاحي' : (debit > 0 ? 'سحب بنكي' : 'إيداع بنكي'),
      isOpeningBalance: isOpening,
      Confidence_Score: 100
    };
    if (i < headerRowIndex + 11) console.log(record);
    records.push(record);
  }

  return { records, skipped };
}
