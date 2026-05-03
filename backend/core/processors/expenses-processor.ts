// @DO_NOT_MODIFY - Core extraction engine locked by user request.
import * as XLSX from 'xlsx';
import { getExpenseCategory } from '../categorization-engine';
import { parseExcelDateDetailed, parseNum } from './shared-processor';

export function processExpenses(buffer: ArrayBuffer, fileName: string) {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  
  const records: any[] = [];
  const skipped: any[] = [];
  let headerRowIndex = -1;
  const colMap = new Map();

  const targetKeywords = [/خاضع/i, /taxable/i, /صافي/i, /net/i, /غيرخاضع/i, /nontaxable/i, /vat/i, /ضريب/i, /total/i, /اجمال/i, /فاتور/i, /inv/i, /date/i, /تاريخ/i, /مورد/i, /اسم/i, /desc/i, /بيان/i, /تفاصيل/i, /قيم/i, /مبلغ/i];
  
  let bestHeaderCount = -1;
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i] as any[];
    if (!row || row.length === 0) continue;
    
    let matchCount = 0;
    const tempColMap = new Map();

    row.forEach((col, idx) => {
      if (typeof col === 'string') {
        const cleanCol = col.toLowerCase().replace(/[\sـ]/g, '');
        tempColMap.set(cleanCol, idx);
        for (const kw of targetKeywords) {
           if (kw.test(cleanCol)) {
               matchCount++;
               break;
           }
        }
      }
    });

    if (matchCount > bestHeaderCount && matchCount >= 2) {
       bestHeaderCount = matchCount;
       headerRowIndex = i;
       colMap.clear();
       for (const [k, v] of tempColMap.entries()) {
           colMap.set(k, v);
       }
    }
  }

  if (headerRowIndex === -1 && data.length > 0) {
      // Fallback
      headerRowIndex = 0;
      const row = data[0] as any[];
      if (row) {
         row.forEach((col, idx) => {
             if (typeof col === 'string') colMap.set(col.toLowerCase().replace(/[\sـ]/g, ''), idx);
         });
      }
  }

  const getCol = (patterns: RegExp[], excludePatterns: RegExp[] = []): number => {
    let bestMatch = -1;
    let highestScore = 0;
    for (const [key, val] of colMap.entries()) {
      let isExcluded = false;
      for (const ex of excludePatterns) {
        if (ex.test(key)) {
           isExcluded = true;
           break;
        }
      }
      if (isExcluded) continue;

      for (let pIdx = 0; pIdx < patterns.length; pIdx++) {
        const p = patterns[pIdx];
        if (p.test(key)) {
          const score = (patterns.length - pIdx) * 10;
          if (score > highestScore) {
             highestScore = score;
             bestMatch = val;
          }
        }
      }
    }
    return bestMatch;
  };

  // PHASE A: Lock column mapping exactly once per file schema
  const columnMapLock = {
      taxable: getCol([/خاضع/i, /taxable/i, /صافي/i, /net/i, /subtotal/i, /base/i, /قبلالضريب/i, /اساسي/i, /قيم/i, /مبلغ/i], [/قيمة/i, /مبلغالضريب/i, /^ضريب/i, /^الضريب/i, /^الضرا/i, /^ضرا/i, /\bvat\b/i, /\btax\b/i, /total/i, /اجمال/i, /إجمال/i, /مستحق/i, /تسجيل/i, /بطاق/i]),
      nonTaxable: getCol([/غيرخاضع/i, /nontaxable/i, /معفى/i, /معفاة/i, /exempt/i, /zerorated/i, /صفرية/i, /بدونضريب/i, /0%/i]),
      vat: getCol([/vat/i, /tax/i, /ضريب/i, /ضرا/i], [/رقم/i, /بطاق/i, /id/i, /no/i, /number/i, /سجل/i, /خاضع/i, /غير/i, /قبل/i, /بدون/i]),
      total: getCol([/total/i, /اجمال/i, /إجمال/i, /مستحق/i, /gross/i], [/ضريب/i, /\btax\b/i, /\bvat\b/i, /قبل/i, /خاضع/i, /صافي/i, /net/i, /sub/i, /ضرا/i]),
      invoice: getCol([/inv/i, /فاتور/i]),
      date: getCol([/date/i, /تاريخ/i]),
      entity: getCol([/entity/i, /vendor/i, /supplier/i, /مورد/i, /اسم/i, /name/i]),
      desc: getCol([/desc/i, /item/i, /بيان/i, /تفاصيل/i, /صنف/i, /وصف/i, /شرح/i])
  };

  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i] as any[];
    if (!row || row.length === 0 || row.every(c => c === undefined || c === null || c === '')) continue;

    let hasNumbers = false;
    row.forEach(c => { if (typeof c === 'number' || (typeof c === 'string' && !isNaN(Number(c.replace(/,/g, ''))))) hasNumbers = true; });

    if (!hasNumbers) {
      skipped.push({ rowIndex: i, reason: 'Structural: No numeric values', _sourceFile: fileName, rawData: row, detectedColumns: columnMapLock });
      continue;
    }

    let isTotalRow = false;
    let descCellsEmpty = true;
    for (let cIdx = 0; cIdx < row.length; cIdx++) {
      const c = row[cIdx];
      if (typeof c === 'string') {
         const cleanStr = c.toLowerCase().replace(/[\sـ]/g, '');
         if (/^(total|totals|sum|summary|اجمالي|إجمالي|الاجمالي|الإجمالي|اجماليات|الاجماليات|الإجماليات|مجموع|المجموع)/i.test(cleanStr)) {
            isTotalRow = true;
            break;
         }
      }
    }

    // PHASE B DETERMINISTIC EXTRACTION
    const rawInvoice = columnMapLock.invoice !== -1 && row[columnMapLock.invoice] != null ? String(row[columnMapLock.invoice]).trim() : null;
    const rawEntity = columnMapLock.entity !== -1 && row[columnMapLock.entity] != null ? String(row[columnMapLock.entity]).trim() : '';
    const rawDesc = columnMapLock.desc !== -1 && row[columnMapLock.desc] != null ? String(row[columnMapLock.desc]).trim() : '';
    
    if (rawEntity || rawDesc) descCellsEmpty = false;

    // Use deterministic locked map
    let earlyTotal = columnMapLock.total !== -1 ? parseNum(row[columnMapLock.total]) : null;

    if (!rawInvoice && earlyTotal !== null && earlyTotal > 5000) {
       if (descCellsEmpty) {
          isTotalRow = true;
       }
    }

    if (isTotalRow) {
      skipped.push({ rowIndex: i, reason: 'Structural: Total row detected', _sourceFile: fileName, rawData: row, detectedColumns: columnMapLock });
      continue;
    }

    const dateTrace = columnMapLock.date !== -1 && row[columnMapLock.date] != null ? parseExcelDateDetailed(row[columnMapLock.date]) : { parsed: null, method: 'failed', raw: null };
    const rawDate = dateTrace.parsed;

    const taxable = columnMapLock.taxable !== -1 ? parseNum(row[columnMapLock.taxable]) : null;
    let nonTaxable = columnMapLock.nonTaxable !== -1 ? parseNum(row[columnMapLock.nonTaxable]) : null;
    const vat = columnMapLock.vat !== -1 ? parseNum(row[columnMapLock.vat]) : null;
    const total = columnMapLock.total !== -1 ? parseNum(row[columnMapLock.total]) : null;

    let periodYear = null;
    if (rawDate) {
       const parsedDate = new Date(rawDate);
       if (!isNaN(parsedDate.getTime())) {
          periodYear = parsedDate.getFullYear();
       }
    }

    // Allowed Derivation: NonTaxable = Total - (Taxable + VAT) IF NonTaxable column missing AND (Total, Taxable, VAT) exist
    if (columnMapLock.nonTaxable === -1 && total !== null && taxable !== null && vat !== null) {
        nonTaxable = total - (taxable + vat);
    }

    const calcNet = (taxable !== null ? taxable : 0) + (nonTaxable !== null ? nonTaxable : 0);
    const expectedTotal = calcNet + (vat !== null ? vat : 0);
    let isMismatch = false;

    if (total !== null && Math.abs(total - expectedTotal) > 0.02) {
         isMismatch = true;
    }

    const finalEntity = rawEntity || 'غير محدد';
    const category = getExpenseCategory(finalEntity, rawDesc, total || 0);

    const confidenceScore = isMismatch ? 50 : 100;
    const financialIdCheck = isMismatch ? 'FAIL' : 'PASS';

    const record = {
      _sourceFile: fileName,
      _originalRowIndex: i,
      Invoice_Number: rawInvoice,
      Invoice_Date: rawDate,
      Period_Year: periodYear,
      Entity_Name: finalEntity,
      Raw_Entity: finalEntity,
      Item_Description: rawDesc,
      Total_Amount: total,
      VAT_Amount: vat,
      Taxable_Amount: taxable,
      NonTaxable_Amount: nonTaxable,
      Net_Amount: calcNet,
      Category: category,
      Confidence_Score: confidenceScore,
      Financial_Mismatch: isMismatch,
      Financial_Integrity_Status: financialIdCheck
    };

    records.push(record);
  }

  return { records, skipped, debugTrace: [], columnMap: columnMapLock };
}
