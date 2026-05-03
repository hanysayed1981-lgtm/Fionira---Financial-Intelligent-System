import * as XLSX from 'xlsx';
import { getPayrollCategory } from '../categorization-engine';

export function processPayroll(buffer: ArrayBuffer, fileName: string) {
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
    throw new Error("Could not detect structural header for payroll.");
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

  const dateCol = getCol([/date/i, /تاريخ/i, /شهر/i, /month/i]);
  const invoiceCol = getCol([/inv/i, /فاتور/i]);
  console.log({
    dateColumn: dateCol,
    invoiceColumn: invoiceCol,
    entityColumn: getCol([/employee/i, /name/i, /اسم/i, /موظف/i]),
    basicColumn: getCol([/basic/i, /اساسي/i, /أساسي/i]),
    grossColumn: getCol([/gross/i, /اجمال/i, /إجمال/i, /اجمالى/i, /الإجمالى/i]),
    amountColumn: getCol([/net/i, /salary/i, /صافي/i, /راتب/i])
  });
  const entityCol = getCol([/employee/i, /name/i, /اسم/i, /موظف/i]);
  const descCol = getCol([/desc/i, /job/i, /position/i, /وصف/i, /مسمى/i, /وظيفة/i]);
  const amountCol = getCol([/net/i, /salary/i, /صافي/i, /راتب/i]);
  const grossCol = getCol([/gross/i, /اجمال/i, /إجمال/i, /اجمالى/i, /الإجمالى/i]);
  const basicCol = getCol([/basic/i, /اساسي/i, /أساسي/i]);
  const housingCol = getCol([/house/i, /housing/i, /سكن/i]);
  const transportCol = getCol([/transport/i, /انتقال/i, /نقل/i, /مواصل/i]);
  const otherAllowanceCol = getCol([/other/i, /اخر/i, /أخرى/i, /بدلات/i]);
  const gosiCol = getCol([/gosi/i, /تأمين/i, /تامين/i, /اجتماع/i]);
  const absentCol = getCol([/absent/i, /absence/i, /غياب/i]);
  const loanCol = getCol([/loan/i, /advance/i, /سلف/i, /قرض/i]);

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

    const rawDate = dateCol !== -1 && row[dateCol] != null ? String(row[dateCol]) : null;
    const rawInvoice = invoiceCol !== -1 && row[invoiceCol] != null ? String(row[invoiceCol]) : null;
    const rawEntity = row[entityCol] ? String(row[entityCol]) : 'موظف غير محدد';
    const rawDesc = row[descCol] ? String(row[descCol]) : '';
    const rawAmount = row[amountCol] || row[grossCol] || 0;
    
    // Breakdowns
    const parseAmt = (val: any) => { let v = typeof val === 'number' ? val : Number(String(val).replace(/[^d.-]/g, '')); return isNaN(v) ? 0 : v; };
    const basic = basicCol !== -1 ? parseAmt(row[basicCol]) : 0;
    const housing = housingCol !== -1 ? parseAmt(row[housingCol]) : 0;
    const transport = transportCol !== -1 ? parseAmt(row[transportCol]) : 0;
    const otherAllow = otherAllowanceCol !== -1 ? parseAmt(row[otherAllowanceCol]) : 0;
    
    const gosi = gosiCol !== -1 ? parseAmt(row[gosiCol]) : 0;
    const absent = absentCol !== -1 ? parseAmt(row[absentCol]) : 0;
    const loan = loanCol !== -1 ? parseAmt(row[loanCol]) : 0;


    let total = typeof rawAmount === 'number' ? rawAmount : Number(String(rawAmount).replace(/[^\d.-]/g, ''));

    if (isNaN(total)) total = 0;

    const category = getPayrollCategory(rawEntity, rawDesc);

    let periodYear = null;
    if (rawDate) {
      const yearMatch = String(rawDate).match(/\b(20\d{2})\b/);
      if (yearMatch) periodYear = parseInt(yearMatch[1], 10);
    }
    const net = (basic + housing + transport + otherAllow) - (gosi + absent + loan);
    
    // enforce mismatch
    const isMismatch = total !== null && Math.abs(total - net) > 0.01;

    const record = {
      _sourceFile: fileName,
      _originalRowIndex: i,
      Invoice_Number: rawInvoice,
      Invoice_Date: rawDate,
      Period_Year: periodYear,
      Entity_Name: rawEntity.trim(),
      Raw_Entity: rawEntity.trim(),
      Item_Description: rawDesc.trim(),
      Total_Amount: total,
      VAT_Amount: gosi + absent + loan,
      Taxable_Amount: basic,
      NonTaxable_Amount: housing + transport + otherAllow,
      Net_Amount: net,
      Category: category,
      Basic_Salary: basic,
      AllowancesBreakdown: {
         'بدل سكن': housing,
         'بدل انتقال': transport,
         'بدلات أخرى': otherAllow
      },
      DeductionsBreakdown: {
         'التأمينات الاجتماعية': gosi,
         'خصم غياب': absent,
         'سلف مستردة': loan
      },
      Confidence_Score: isMismatch ? 50 : 100,
      Financial_Mismatch: isMismatch
    };
    if (i < headerRowIndex + 11) console.log(record);
    records.push(record);
  }

  return { records, skipped };
}
