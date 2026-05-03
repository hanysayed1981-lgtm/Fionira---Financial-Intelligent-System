import { FinancialRecord } from '../../types';

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  taxAmount: number;
  sourceRecordId?: string | null; // Legacy
  moduleType: 'expenses' | 'revenues' | 'payroll' | 'banks' | 'inventory';
  tenantId?: string | null;
  fileId?: string | null; // Legacy
  sourceFileId?: string | null;
  sourceRowId?: string | null;
  originalInvoiceNumber?: string | null;
  timestamp?: string | null;
  entityId?: string | null;
  entityName?: string | null;
  version?: number;
  originalEntryId?: string | null;
  isActive?: boolean;
}

export interface AuditLog {
  id: string;
  entityType: 'journalEntry';
  entityId: string;
  action: 'CREATE' | 'EDIT' | 'DELETE';
  performedBy: string;
  performedAt: string;
  before: any;
  after: any;
  changeSet: any;
  source: 'system' | 'user';
  tenantId?: string | null;
}

export function generateJournalEntries(records: FinancialRecord[], moduleType: 'expenses' | 'revenues' | 'payroll' | 'banks' | 'inventory'): JournalEntry[] {
  const entries: JournalEntry[] = [];

  records.forEach((record: any) => {
    const entryId = `je_${record.id || crypto.randomUUID()}`;
    const amount = record.Taxable_Amount + (record.NonTaxable_Amount || 0);
    const taxAmount = record.VAT_Amount || 0;
    
    // Entity routing
    const entityName = record.Entity_Normalized_Name || record.Entity_Name || record.Raw_Entity || 'جهة غير محددة';
    const category = record.Category || '';
    
    const baseEntry = {
        id: entryId,
        date: record.Invoice_Date || null,
        description: record.isOpeningBalance ? `رصيد افتتاحي - ${entityName}` : `فاتورة ${record.Invoice_Number || ''} - ${entityName} - ${record.Item_Description || ''}`,
        debitAccount: '',
        creditAccount: '',
        amount: 0,
        taxAmount: 0,
        sourceRecordId: record.id || null,
        moduleType,
        sourceRowId: record.id || null,
        sourceFileId: record.fileId || null,
        originalInvoiceNumber: record.Invoice_Number ? String(record.Invoice_Number) : null,
        timestamp: record.Invoice_Date || null,
        entityId: record.Entity_ID || 'UNKNOWN_ENTITY',
        entityName: entityName,
        isActive: true,
        version: 1
    };

    if (moduleType === 'payroll') {
        baseEntry.description = `مسير رواتب - ${entityName} - ${record.Item_Description || ''}`;
        
        let subIndex = 1;
        // Basic Salary & Net mapped from standard processor fallback
        if (record.Basic_Salary > 0) {
            entries.push({ ...baseEntry, id: `${entryId}_${subIndex++}`, debitAccount: 'مصروف راتب أساسي', creditAccount: 'رواتب وأجور مستحقة الدفع', amount: record.Basic_Salary });
        }
        
        // Loop over Allowances
        if (record.AllowancesBreakdown) {
            for (const [allowanceName, all_amount] of Object.entries(record.AllowancesBreakdown)) {
                if (Number(all_amount) > 0) {
                    entries.push({ ...baseEntry, id: `${entryId}_${subIndex++}`, debitAccount: `مصروف - ${allowanceName}`, creditAccount: 'رواتب وأجور مستحقة الدفع', amount: Number(all_amount) });
                }
            }
        }
        
        // Loop over Deductions
        if (record.DeductionsBreakdown) {
            for (const [deductionName, ded_amount] of Object.entries(record.DeductionsBreakdown)) {
                if (Number(ded_amount) > 0) {
                     entries.push({ ...baseEntry, id: `${entryId}_${subIndex++}`, debitAccount: 'رواتب وأجور مستحقة الدفع', creditAccount: `ذمم دائنة - ${deductionName}`, amount: Number(ded_amount) });
                }
            }
        }

        // Fallback if no breakdown
        if (subIndex === 1 && amount > 0) {
            entries.push({ ...baseEntry, debitAccount: category || 'مصروفات الرواتب والأجور', creditAccount: 'رواتب وأجور مستحقة الدفع', amount: amount });
        }

    } else {
        let debitAccount = '';
        let creditAccount = '';

        if (moduleType === 'expenses') {
          debitAccount = category || 'مصروفات غير مصنفة';
          creditAccount = record.isOpeningBalance ? 'رأس المال (أرباح مبقاة)' : `الموردين - ${entityName}`;
        } else if (moduleType === 'revenues') {
          debitAccount = record.isOpeningBalance ? 'رأس المال (أرباح مبقاة)' : `العملاء - ${entityName}`;
          creditAccount = category || 'إيرادات مبيعات';
        } else if (moduleType === 'banks') {
          baseEntry.description = record.isOpeningBalance ? `رصيد بنكي متبقي - ${entityName}` : `تسوية بنكية - ${entityName}`;
          if (record.isOpeningBalance) {
             debitAccount = `البنوك - ${entityName}`;
             creditAccount = 'رأس المال (أرباح مبقاة)';
          } else if (category === 'سحب بنكي') {
             debitAccount = 'حساب تسوية البنك (مدينة)';
             creditAccount = `البنوك - ${entityName}`;
          } else { // Deposit
             debitAccount = `البنوك - ${entityName}`;
             creditAccount = 'حساب تسوية البنك (دائنة)';
          }
        } else if (moduleType === 'inventory') {
          baseEntry.description = `الحركة المخزنية - ${entityName}`;
          debitAccount = 'مخزون بضاعة';
          creditAccount = 'الذمم الدائنة الموردين';
        } else {
          debitAccount = 'حساب مدين عام';
          creditAccount = 'حساب دائن عام';
        }

        if (amount > 0 || taxAmount > 0) {
            entries.push({ ...baseEntry, debitAccount, creditAccount, amount, taxAmount });
        }
    }
  });

  return entries;
}
