import * as xlsx from 'xlsx';
import { processExpenses } from './backend/core/processors/expenses-processor';

const wb = xlsx.utils.book_new();
const wsData = [
  ['تاريخ', 'فاتورة', 'مورد', 'وصف', 'اساسي', 'غير خاضع', 'ضريبة', 'اجمالي'],
  ['2024-05-01', 'INV-001', 'مكتبة جرير', 'قرطاسية', '100', '0', '15', '115'],
  ['bad-date', 'INV-003', 'محطة الدريس', 'وقود', '0', '50', '0', '50'], ['2023-01-01', 'INV-004', 'Unknown', '', '100', null, null, '200']
];
const ws = xlsx.utils.aoa_to_sheet(wsData);
xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

const res = processExpenses(buffer, 'test.xlsx');
console.log(JSON.stringify(res.records, null, 2));