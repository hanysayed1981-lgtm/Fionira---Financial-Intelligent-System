const fs = require('fs');

// 1. Update shared-processor.ts
const sharedCode = `
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
          const d2 = new Date(\`\${parts[2]}-\${parts[1]}-\${parts[0]}\`);
          if (!isNaN(d2.getTime())) return { parsed: d2.toISOString().split('T')[0], method: 'string', raw: val };
      } else if (parts[0].length === 4) { // YYYY/MM/DD
          const d3 = new Date(\`\${parts[0]}-\${parts[1]}-\${parts[2]}\`);
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
  const parsed = typeof val === 'number' ? val : Number(String(val).replace(/[^\\d.-]/g, ''));
  return isNaN(parsed) ? null : parsed;
}
`;
fs.writeFileSync('src/backend/core/processors/shared-processor.ts', sharedCode);

// 2. Build Processors with traces
const generateProcessor = (type, entityColumnPatterns, expenseCategoryLogic) => `import * as XLSX from 'xlsx';
import { getExpenseCategory } from '../categorization-engine';
import { parseExcelDateDetailed, parseNum } from './shared-processor';

export function ${type === 'expenses' ? 'processExpenses' : 'processRevenues'}(buffer: ArrayBuffer, fileName: string) {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  
  const records: any[] = [];
  const skipped: any[] = [];
  let headerRowIndex = -1;
  const colMap = new Map();

  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i] as any[];
    if (!row || row.length === 0) continue;
    
    let stringCount = 0;
    row.forEach(cell => {
      if (typeof cell === 'string' && cell.trim() !== '') stringCount++;
    });

    if (stringCount >= 2) {
      headerRowIndex = i;
      row.forEach((col, idx) => {
        if (typeof col === 'string') {
          const cleanCol = col.toLowerCase().replace(/[\\sـ]/g, '');
          colMap.set(cleanCol, idx);
        }
      });
      break;
    }
  }

  if (headerRowIndex === -1) {
    headerRowIndex = 0;
  }

  const columnScores: Record<string, string[]> = {};
  
  const getColDetailed = (name: string, patterns: RegExp[], excludePatterns: RegExp[] = []): number => {
    let bestMatch = -1;
    let highestScore = 0;
    const scores: string[] = [];
    
    for (const [key, val] of colMap.entries()) {
      let isExcluded = false;
      for (const ex of excludePatterns) {
        if (ex.test(key)) {
           isExcluded = true;
           scores.push(\`Excluded '\${key}' due to '\${ex}'\`);
           break;
        }
      }
      if (isExcluded) continue;

      for (let pIdx = 0; pIdx < patterns.length; pIdx++) {
        const p = patterns[pIdx];
        if (p.test(key)) {
          const score = (patterns.length - pIdx) * 10;
          scores.push(\`Matched '\${key}' with '\${p}' (score: \${score})\`);
          if (score > highestScore) {
             highestScore = score;
             bestMatch = val;
          }
        }
      }
    }
    columnScores[name] = scores;
    return bestMatch;
  };

  const getCol = (name: string, p: RegExp[], e: RegExp[] = []) => getColDetailed(name, p, e);

  const taxableCol = getCol('Taxable', [/خاضع/i, /taxable/i, /اساسي/i, /بدونضريب/i, /قبلالضريب/i], [/غير/i, /non/i, /ضريب/i, /vat/i, /tax/i, /total/i, /اجمال/i, /إجمال/i]);
  const nonTaxableCol = getCol('NonTaxable', [/غيرخاضع/i, /nontaxable/i, /صفرية/i, /معفاة/i, /0%/i, /zerorated/i, /exempt/i]);
  const vatCol = getCol('VAT', [/vat/i, /tax/i, /ضريب/i], [/رقم/i, /بطاق/i, /id/i, /no\\.?/i, /number/i, /سجل/i, /خاضع/i, /غير/i, /قبل/i]);
  const totalCol = getCol('Total', [/total/i, /اجمال/i, /إجمال/i, /صافي/i, /net/i], [/ضريب/i, /tax/i, /vat/i, /قبل/i, /خاضع/i]);
  const invoiceCol = getCol('Invoice', [/inv/i, /فاتور/i]);
  const dateCol = getCol('Date', [/date/i, /تاريخ/i]);
  const entityCol = getCol('Entity', ${entityColumnPatterns});
  const descCol = getCol('Description', [/desc/i, /item/i, /بيان/i, /تفاصيل/i, /صنف/i, /وصف/i, /شرح/i]);

  // PHASE 2 TRACE
  console.log("=== 🔴 PHASE 2: COLUMN DETECTION VALIDATION ===");
  console.log(JSON.stringify({
    headers_detected: Array.from(colMap.keys()),
    column_mapping_scores: columnScores,
    final_column_binding: {
       taxableColumn: taxableCol,
       nonTaxableColumn: nonTaxableCol,
       vatColumn: vatCol,
       totalColumn: totalCol,
       dateColumn: dateCol,
       invoiceColumn: invoiceCol,
       entityColumn: entityCol,
       descColumn: descCol
    }
  }, null, 2));

  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i] as any[];
    if (!row || row.length === 0 || row.every(c => c === undefined || c === null || c === '')) continue;

    let hasNumbers = false;
    row.forEach(c => { if (typeof c === 'number' || (typeof c === 'string' && !isNaN(Number(c.replace(/,/g, ''))))) hasNumbers = true; });

    if (!hasNumbers) {
      skipped.push({ index: i, reason: 'Structural: No numeric values' });
      continue;
    }

    let isTotalRow = false;
    let descCellsEmpty = true;
    for (let cIdx = 0; cIdx < row.length; cIdx++) {
      const c = row[cIdx];
      if (typeof c === 'string') {
         const cleanStr = c.toLowerCase().replace(/[\\sـ]/g, '');
         if (/^(total|totals|sum|summary|اجمالي|إجمالي|الاجمالي|الإجمالي|اجماليات|الاجماليات|الإجماليات|مجموع|المجموع)/i.test(cleanStr)) {
            isTotalRow = true;
            break;
         }
      }
    }

    const rawInvoice = invoiceCol !== -1 && row[invoiceCol] != null ? String(row[invoiceCol]).trim() : null;
    const rawEntity = entityCol !== -1 && row[entityCol] != null ? String(row[entityCol]).trim() : '';
    const rawDesc = descCol !== -1 && row[descCol] != null ? String(row[descCol]).trim() : '';
    
    if (rawEntity || rawDesc) descCellsEmpty = false;

    let earlyTotal = totalCol !== -1 ? parseNum(row[totalCol]) : null;

    if (!rawInvoice && earlyTotal !== null && earlyTotal > 5000) {
       if (descCellsEmpty) {
          isTotalRow = true;
       }
    }

    if (isTotalRow) {
      skipped.push({ index: i, reason: 'Structural: Total row detected' });
      continue;
    }

    // EXTRACTION
    const dateTrace = dateCol !== -1 && row[dateCol] != null ? parseExcelDateDetailed(row[dateCol]) : { parsed: null, method: 'failed', raw: null };
    const rawDate = dateTrace.parsed;

    const taxable = taxableCol !== -1 ? parseNum(row[taxableCol]) : null;
    let nonTaxable = nonTaxableCol !== -1 ? parseNum(row[nonTaxableCol]) : null;
    const vat = vatCol !== -1 ? parseNum(row[vatCol]) : null;
    const total = totalCol !== -1 ? parseNum(row[totalCol]) : null;

    let periodYear = null;
    if (rawDate) {
       const parsedDate = new Date(rawDate);
       if (!isNaN(parsedDate.getTime())) {
          periodYear = parsedDate.getFullYear();
       }
    }

    const net = (taxable || 0) + (nonTaxable || 0);

    const expectedNet = (taxable || 0) + (nonTaxable || 0);
    const expectedTotal = expectedNet + (vat || 0);
    let isMismatch = false;
    
    if (taxable !== null && nonTaxable !== null && Math.abs(net - (taxable + nonTaxable)) > 0.01) isMismatch = true;
    if (total !== null && vat !== null && Math.abs(total - (net + vat)) > 0.01) isMismatch = true;

    const finalEntity = rawEntity || 'غير محدد';
    ${expenseCategoryLogic}

    if (i < headerRowIndex + 10) {
       console.log(\`=== 🔴 PHASE 1: RAW vs EXTRACTED TRACE (Row \${i}) ===\`);
       console.log(JSON.stringify({
          raw_row: row,
          detected_columns: { taxableColumn: taxableCol, nonTaxableColumn: nonTaxableCol, vatColumn: vatCol, totalColumn: totalCol, dateColumn: dateCol, invoiceColumn: invoiceCol },
          extracted: { Taxable_Amount: taxable, NonTaxable_Amount: nonTaxable, VAT_Amount: vat, Total_Amount: total, Invoice_Date: rawDate, Period_Year: periodYear }
       }, null, 2));

       console.log(\`=== 🔴 PHASE 3: FINANCIAL IDENTITY CHECK (Row \${i}) ===\`);
       console.log(JSON.stringify({
          Expected_Net: expectedNet,
          Actual_Net: net,
          Expected_Total: expectedTotal,
          Actual_Total: total,
          mismatch: isMismatch
       }, null, 2));

       console.log(\`=== 🔴 PHASE 4: DATE PARSING TRACE (Row \${i}) ===\`);
       console.log(JSON.stringify({
          raw_date_value: dateTrace.raw,
          parsed_date: dateTrace.parsed,
          parsing_method: dateTrace.method,
          Period_Year: periodYear
       }, null, 2));
    }

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
      Net_Amount: net,
      Category: category,
      Confidence_Score: confidenceScore,
      Financial_Mismatch: isMismatch,
      Financial_Integrity_Status: financialIdCheck
    };

    if ((globalThis as any)._debugTableRows.length < 10) {
       const dr = {
         raw_taxable: taxableCol !== -1 ? row[taxableCol] : null,
         extracted_taxable: taxable,
         raw_non_taxable: nonTaxableCol !== -1 ? row[nonTaxableCol] : null,
         extracted_non_taxable: nonTaxable,
         raw_total: totalCol !== -1 ? row[totalCol] : null,
         extracted_total: total,
         invoice: rawInvoice,
         date: rawDate,
         period_year: periodYear,
         category: category,
         financial_identity_check: financialIdCheck
       };
       (globalThis as any)._debugTableRows.push(dr);
    }

    records.push(record);
  }

  return { records, skipped, debugTrace: (globalThis as any)._debugTableRows || [] };
}`;

fs.writeFileSync('src/backend/core/processors/expenses-processor.ts', generateProcessor('expenses', '[/entity/i, /vendor/i, /supplier/i, /مورد/i, /اسم/i, /name/i]', 'const category = getExpenseCategory(finalEntity, rawDesc, total || 0);'));
fs.writeFileSync('src/backend/core/processors/revenues-processor.ts', generateProcessor('revenues', '[/entity/i, /customer/i, /client/i, /عميل/i, /اسم/i, /name/i]', 'const category = "إيرادات المبيعات";'));

// Patch categorization engine to log PHASE 5
let catCode = fs.readFileSync('src/backend/core/categorization-engine.ts', 'utf8');

const logCode = `
  // PHASE 5 TRACE
  console.log("=== 🔴 PHASE 5: CATEGORIZATION INPUT TRACE ===");
  console.log(JSON.stringify({
     description: desc || '',
     entity: name || '',
     normalized_input: allText,
     matched_rule: detectedRule,
     final_category: finalCategory
  }, null, 2));
`;

// Replace specifically where finalCategory is printed inside getExpenseCategory
catCode = catCode.replace(/console\.log\(\{ description: desc, supplier: name, detectedRule, finalCategory \}\);/g, logCode);

fs.writeFileSync('src/backend/core/categorization-engine.ts', catCode);

console.log("Traces successfully injected.");
