export type ModuleType = 'expenses' | 'revenues' | 'payroll' | 'banks' | 'inventory';

export type FileProcessingStatus = 'processing' | 'completed' | 'failed';

export interface FileMetadata {
  readonly id: string;
  readonly fileName: string;
  readonly uploadDate: string; // ISO 8601 Date string
  readonly recordCount: number;
  readonly moduleType: ModuleType;
  readonly tenantId: string;
  readonly status: FileProcessingStatus;
  readonly size: number;
  readonly sessionId?: string;
}

export interface AmountDetails {
  readonly net: number;
  readonly taxable: number;
  readonly nonTaxable: number;
  readonly vat: number;
  readonly total: number;
}

export interface PayrollDetails {
  readonly basicSalary: number;
  readonly allowances: Readonly<Record<string, number>>;
  readonly deductions: Readonly<Record<string, number>>;
}

export interface BaseRecord {
  readonly id: string;
  readonly fileId: string;
  readonly tenantId: string;
  
  readonly originalRowIndex: number;
  
  // Shared Business Logic
  readonly entityName: string; // e.g., Supplier, Customer, Employee, Bank, Item
  readonly normalizedEntityName: string;
  readonly entityId: string;
  
  readonly description: string;
  readonly category: string;
  
  // Financial Data Encapsulation
  readonly amount: AmountDetails;
  
  // Validations & Flags
  readonly isOpeningBalance: boolean;
  readonly confidenceScore: number;
  readonly anomalies: readonly string[];
  readonly isActive: boolean;
}

export interface ExpenseRecord extends BaseRecord {
  readonly type: 'expenses';
  readonly invoiceNumber: string | null;
  readonly invoiceDate: string | null; // ISO 8601
}

export interface RevenueRecord extends BaseRecord {
  readonly type: 'revenues';
  readonly invoiceNumber: string | null;
  readonly invoiceDate: string | null; // ISO 8601
}

export interface PayrollRecord extends BaseRecord {
  readonly type: 'payroll';
  readonly payrollDetails: PayrollDetails;
}

export interface BankRecord extends BaseRecord {
  readonly type: 'banks';
  readonly transactionDate: string | null; // ISO 8601
  readonly bankReference: string | null;
}

export interface InventoryRecord extends BaseRecord {
  readonly type: 'inventory';
  readonly quantity: number;
  readonly unit: string | null;
}

export type NormalizedRecord = 
  | ExpenseRecord 
  | RevenueRecord 
  | PayrollRecord 
  | BankRecord 
  | InventoryRecord;

export interface NormalizedJournalEntry {
  readonly id: string;
  readonly tenantId: string;
  readonly moduleType: ModuleType;
  
  readonly date: string; // ISO 8601 Date string
  readonly description: string;
  
  readonly debitAccount: string;
  readonly creditAccount: string;
  
  readonly amount: number;
  readonly taxAmount: number;
  
  // Relational Integrity
  readonly sourceRecordId: string | null;
  readonly sourceFileId: string | null;
  readonly entityId: string | null;
  readonly entityName: string | null;
  
  // Audit & Versioning
  readonly version: number;
  readonly isActive: boolean;
  readonly originalEntryId: string | null;
  readonly timestamp: string; // ISO 8601
}

export interface GlobalFetchState {
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly errorMessage: string | null;
  readonly lastFetchedAt: string | null; // ISO 8601 timestamp
}

export interface ModuleState {
  readonly moduleType: ModuleType;
  
  // Relational Map (O(1) lookups)
  readonly records: Readonly<Record<string, NormalizedRecord>>;
  readonly journalEntries: Readonly<Record<string, NormalizedJournalEntry>>;
  readonly files: Readonly<Record<string, FileMetadata>>;
  
  // Order & Collections Maps (Arrays of Extracted ID Keys)
  readonly fileIds: readonly string[];
  readonly recordIds: readonly string[];
  readonly entryIds: readonly string[];
  
  // Local Module View State
  readonly activeFileFilter: string | null; // null = View All Aggregated Data
  
  // Sync Status
  readonly fetchStatus: GlobalFetchState;
}

export interface GlobalRootState {
  readonly modules: Readonly<Record<ModuleType, ModuleState>>;
  readonly globalFetchStatus: GlobalFetchState;
}
