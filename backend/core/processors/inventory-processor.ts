import * as XLSX from 'xlsx';

export function processInventory(buffer: ArrayBuffer, fileName: string) {
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
    throw new Error("Could not detect structural header for inventory.");
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

  const itemCol = getCol([/item/i, /صنف/i, /منتج/i]);
  const qtyCol = getCol([/qty/i, /quantity/i, /كمية/i, /كميه/i]);
  const unitCol = getCol([/unit/i, /وحدة/i]);
  const valueCol = getCol([/value/i, /amount/i, /قيمة/i, /تكلفة/i, /اجمال/i, /إجمال/i, /total/i]);
  console.log({
    itemColumn: itemCol,
    qtyColumn: qtyCol,
    unitColumn: unitCol,
    valueColumn: valueCol
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

    const rawItem = row[itemCol] ? String(row[itemCol]) : 'صنف غير محدد';
    const rawQty = row[qtyCol] || 0;
    const rawValue = row[valueCol] || 0;

    let qty = typeof rawQty === 'number' ? rawQty : Number(String(rawQty).replace(/[^\d.-]/g, ''));
    let value = typeof rawValue === 'number' ? rawValue : Number(String(rawValue).replace(/[^\d.-]/g, ''));

    if (isNaN(qty)) qty = 0;
    if (isNaN(value)) value = 0;

    const record = {
      _sourceFile: fileName,
      _originalRowIndex: i,
      Invoice_Date: null,
      Period_Year: null,
      Entity_Name: rawItem.trim(),
      Raw_Entity: rawItem.trim(),
      Quantity: qty,
      Total_Amount: value,
      VAT_Amount: 0,
      Taxable_Amount: value,
      NonTaxable_Amount: 0,
      Net_Amount: value,
      Category: 'مخزون بضاعة',
      Confidence_Score: 100
    };
    if (i < headerRowIndex + 11) console.log(record);
    records.push(record);
  }

  return { records, skipped };
}
