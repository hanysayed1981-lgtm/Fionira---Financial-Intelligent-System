
import { z } from 'zod';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Base API Response Schema
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => 
  z.object({
    success: z.boolean(),
    data: dataSchema.nullable(),
    error: z.string().nullable(),
    timestamp: z.string()
  });

// Financial Item Schema (for lists like inflows/outflows)
export const FinancialItemSchema = z.object({
  name: z.string(),
  value: z.number()
});

// Breakdown Entry Schema (Tuple [string, number])
export const BreakdownEntrySchema = z.tuple([z.string(), z.number()]);

// Income Statement Schema
export const IncomeStatementSchema = z.object({
  totalRevenue: z.number().default(0),
  totalCOGS: z.number().default(0),
  totalOPEX: z.number().default(0),
  grossProfit: z.number().default(0),
  netOperatingIncome: z.number().default(0),
  grossMargin: z.number().default(0),
  netMargin: z.number().default(0),
  revenues: z.array(FinancialItemSchema).default([]),
  expenses: z.array(FinancialItemSchema).default([]),
  revBreakdown: z.array(BreakdownEntrySchema).default([]),
  cogsBreakdown: z.array(BreakdownEntrySchema).default([]),
  opexBreakdown: z.array(BreakdownEntrySchema).default([]),
  totalPayroll: z.number().default(0),
  totalCAPEX: z.number().default(0),
  totalTaxable: z.number().default(0),
  totalNonTaxable: z.number().default(0),
  totalVAT: z.number().default(0),
  totalGross: z.number().default(0),
  largestValue: z.number().default(0),
  entityCount: z.number().default(0),
  // Older fields for compatibility
  fullRevBreakdown: z.array(BreakdownEntrySchema).optional(),
  fullCogsBreakdown: z.array(BreakdownEntrySchema).optional(),
  fullOpexBreakdown: z.array(BreakdownEntrySchema).optional()
});

// Cash Flow Schema
export const CashFlowSchema = z.object({
  totalInflow: z.number().default(0),
  totalOutflow: z.number().default(0),
  netCash: z.number().default(0),
  inflows: z.array(FinancialItemSchema).default([]),
  outflows: z.array(FinancialItemSchema).default([])
});

// KPI Dashboard Schema
export const DashboardSchema = z.object({
  kpis: z.object({
    revenue: z.number().default(0),
    netIncome: z.number().default(0),
    cashPosition: z.number().default(0),
    grossMargin: z.number().default(0)
  }).default({ revenue: 0, netIncome: 0, cashPosition: 0, grossMargin: 0 }),
  counts: z.object({
    invoices: z.number().default(0),
    customers: z.number().default(0)
  }).default({ invoices: 0, customers: 0 }),
  recentActivity: z.array(z.any()).default([])
});

// Export inferred types
export type IncomeStatement = z.infer<typeof IncomeStatementSchema>;
export type CashFlow = z.infer<typeof CashFlowSchema>;
export type DashboardData = z.infer<typeof DashboardSchema>;
