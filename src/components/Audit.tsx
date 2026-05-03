/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { formatCurrency } from '../lib/financial-utils';
import { FinancialRecord, SkippedRow } from '../types';

interface AuditProps {
  entLabel: string;
  filteredRecords: FinancialRecord[];
  appMode: 'expenses' | 'revenues' | 'payroll' | 'banks';
  skippedRows?: SkippedRow[];
  onDeleteRecord?: (record: FinancialRecord) => void;
}

export const Audit: React.FC<AuditProps> = ({ entLabel, filteredRecords, appMode, skippedRows = [], onDeleteRecord }) => {
  const anomalies = (Array.isArray(filteredRecords) ? filteredRecords : []).filter(r => r.Anomalies && (Array.isArray(r.Anomalies) ? r.Anomalies.length > 0 : false));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-red-50 p-6 border-b border-red-100 flex items-start space-x-4 space-x-reverse">
          <ShieldAlert className="w-8 h-8 text-red-600 shrink-0" />
          <div>
            <h4 className="text-red-800 font-black text-xl mb-1">سجل التناقضات والأخطاء المحاسبية</h4>
            <p className="text-red-700/80 text-sm font-bold">يتم عرض السجلات التي تحتوي على أخطاء في الجمع ({appMode === 'payroll' ? 'الأساسي + البدلات - الاستقطاعات لا يساوي الصافي' : 'الخاضع + غير الخاضع + الضريبة لا يساوي الإجمالي'}) أو {appMode === 'payroll' ? 'السجلات المكررة' : 'الفواتير المكررة'} لنفس الـ{entLabel}.</p>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar" style={{ maxHeight: '60vh' }}>
          <table className="w-full text-right text-sm relative">
            <thead className="bg-slate-50 text-slate-600 text-xs font-black uppercase border-b border-slate-200 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4">{appMode === 'payroll' ? 'رقم السجل/المستند' : 'رقم الفاتورة'}</th>
                <th className="px-6 py-4">تاريخ الفاتورة</th>
                <th className="px-6 py-4">{entLabel} / الجهة</th>
                <th className="px-6 py-4 text-left">{appMode === 'payroll' ? 'إجمالي الاستحقاق' : 'الأساس الضريبي'}</th>
                <th className="px-6 py-4 text-left">{appMode === 'payroll' ? 'الاستقطاعات' : 'الضريبة'}</th>
                <th className="px-6 py-4 text-left text-slate-800">{appMode === 'payroll' ? 'صافي الراتب (بالملف)' : 'الإجمالي (بالملف)'}</th>
                <th className="px-6 py-4">نوع الخطأ / الملاحظة</th>
                {onDeleteRecord && <th className="px-6 py-4 w-12"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {anomalies.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{row.Invoice_Number}</td>
                  <td className="px-6 py-4 font-bold text-slate-600">{row.Invoice_Date}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{row.Entity_Normalized_Name}</div>
                    {row.Entity_TaxID && <div className="text-[11px] font-bold text-slate-500 mt-1">ضريبي: {row.Entity_TaxID}</div>}
                  </td>
                  <td className="px-6 py-4 text-left font-medium">{formatCurrency(row.Net_Amount)}</td>
                  <td className="px-6 py-4 text-left text-red-600 font-bold">{formatCurrency(row.VAT_Amount)}</td>
                  <td className="px-6 py-4 text-left font-black text-slate-900">{formatCurrency(row.Total_Amount)}</td>
                  <td className="px-6 py-4">
                      <div className="flex flex-col space-y-2">
                        {(Array.isArray(row.Anomalies) ? row.Anomalies : []).map((anom, i) => (
                          <span key={i} className="inline-flex items-center text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg shadow-sm">
                            <AlertTriangle className="w-4 h-4 ml-2" /> {anom}
                          </span>
                        ))}
                      </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {onDeleteRecord && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteRecord(row); }}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                        title="حذف السجل"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {anomalies.length === 0 && (
                <tr>
                  <td colSpan={onDeleteRecord ? 8 : 7} className="px-6 py-20 text-center text-slate-400">
                    <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4 opacity-50"/>
                    <p className="text-xl font-bold">ممتاز! لا يوجد أي أخطاء أو تناقضات في العمليات المالية المفلترة.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {skippedRows.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-amber-50 p-6 border-b border-amber-100 flex items-start space-x-4 space-x-reverse">
            <Info className="w-8 h-8 text-amber-600 shrink-0" />
            <div>
              <h4 className="text-amber-800 font-black text-xl mb-1">الصفوف المستبعدة (صفوف الإجماليات والملخصات)</h4>
              <p className="text-amber-700/80 text-sm font-bold">هذه الصفوف تم التعرف عليها ذكياً كصفوف إجماليات أو ملخصات داخل الملفات المرفوعة وتم استبعادها لتجنب تكرار الحسابات.</p>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar" style={{ maxHeight: '60vh' }}>
            <table className="w-full text-right text-sm relative">
              <thead className="bg-slate-50 text-slate-600 text-xs font-black uppercase border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-4">رقم الصف بالملف</th>
                  <th className="px-6 py-4">اسم الورقة (Sheet)</th>
                  <th className="px-6 py-4">البيان / الجهة</th>
                  <th className="px-6 py-4">رقم الفاتورة / المرجع</th>
                  <th className="px-6 py-4 text-left">المبلغ الإجمالي</th>
                  <th className="px-6 py-4">سبب الاستبعاد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(Array.isArray(skippedRows) ? skippedRows : []).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-500">{(row as any).rowIndex || row.index}</td>
                    <td className="px-6 py-4 font-bold text-indigo-600">{row.sheetName || 'غير محدد'}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{row.entity || '---'}</td>
                    <td className="px-6 py-4 font-bold text-slate-600">{row.invoiceNum || '---'}</td>
                    <td className="px-6 py-4 text-left font-black text-slate-900">{formatCurrency(row.total)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                        {row.reason}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
