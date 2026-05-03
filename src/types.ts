/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FinancialRecord {
  id?: string;
  fileId?: string;
  _originalIndex: number;
  Raw_Entity: string;
  Entity_ID: string;
  Entity_Normalized_Name: string;
  Entity_TaxID: string;
  Invoice_Number: string;
  Invoice_Date: string | null;
  Item_Description: string;
  Category: string;
  Net_Amount: number;
  Taxable_Amount: number;
  NonTaxable_Amount: number;
  VAT_Amount: number;
  Total_Amount: number;
  AllowancesBreakdown?: Record<string, number>;
  DeductionsBreakdown?: Record<string, number>;
  Anomalies: string[];
  Confidence_Score: number;
  Category_Confidence?: number;
  AI_Explanation?: string;
  Source?: string;
  SmartInvoice_Items?: string;
}

export interface EntityProfile {
  id: string;
  name: string;
  taxId: string;
  invoiceCount: number;
  totalNet: number;
  totalTaxableNet: number;
  totalNonTaxableNet: number;
  totalVAT: number;
  totalSpend: number;
  anomalies: number;
  categoryString: string;
  categoriesArray: string[];
}

export interface SkippedRow {
  index: number;
  invoiceNum: string;
  date: string;
  entity: string;
  total: number;
  reason: string;
  sheetName?: string;
}

export interface FinancialData {
  records: FinancialRecord[];
  entities: EntityProfile[];
  schema: Record<string, string | null> | null;
  skippedRows?: SkippedRow[];
}

export interface DateFilter {
  start: string;
  end: string;
  month: string;
  year?: string;
}
