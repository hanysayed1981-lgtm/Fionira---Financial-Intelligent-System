import React, { useMemo } from 'react';
import { FinancialRecord } from '../types';
import { formatCurrency, formatMonthName } from '../lib/financial-utils';
import { Calendar, TrendingUp } from 'lucide-react';

interface MonthlySummaryProps {
  records: FinancialRecord[];
  appMode: 'expenses' | 'revenues' | 'payroll' | 'banks';
}

export const MonthlySummary: React.FC<MonthlySummaryProps> = ({ records, appMode }) => {
  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string, formattedMonth: string, count: number, totalTaxable: number, totalNonTaxable: number, totalVAT: number, totalSpend: number }> = {};
    
    records.forEach(r => {
      const m = (r.Invoice_Date && r.Invoice_Date !== 'غير محدد') ? r.Invoice_Date.substring(0, 7) : 'غير محدد';
      if (!map[m]) {
        map[m] = { month: m, formattedMonth: m === 'غير محدد' ? 'غير محدد' : formatMonthName(m), count: 0, totalTaxable: 0, totalNonTaxable: 0, totalVAT: 0, totalSpend: 0 };
      }
      map[m].count++;
      map[m].totalTaxable += r.Taxable_Amount || 0;
      map[m].totalNonTaxable += r.NonTaxable_Amount || 0;
      map[m].totalVAT += r.VAT_Amount || 0;
      map[m].totalSpend += r.Total_Amount || 0;
    });
    
    return Object.values(map).sort((a, b) => {
      if (a.month === 'غير محدد') return 1;
      if (b.month === 'غير محدد') return -1;
      return a.month.localeCompare(b.month);
    });
  }, [records]);

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white/50 rounded-2xl border border-slate-200 border-dashed">
        <Calendar className="w-12 h-12 text-slate-300 mb-4" />
        <p className="text-slate-500 font-medium">لا توجد بيانات لعرضها</p>
      </div>
    );
  }

  const getTitle = () => {
    if (appMode === 'expenses') return 'الملخص الشهري للمصروفات والمشتريات';
    if (appMode === 'revenues') return 'الملخص الشهري للإيرادات والمبيعات';
    if (appMode === 'banks') return 'الملخص الشهري لحركة البنوك';
    return 'الملخص الشهري للرواتب والأجور';
  };

  const getTotalLabel = () => {
    if (appMode === 'expenses') return 'إجمالي المصروفات';
    if (appMode === 'revenues') return 'إجمالي الإيرادات';
    if (appMode === 'banks') return 'الرصيد النهائي';
    return 'صافي الرواتب';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${appMode === 'expenses' ? 'bg-indigo-100 text-indigo-600' : appMode === 'revenues' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
          <Calendar className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">{getTitle()}</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-xs font-bold mb-1">إجمالي الشهور</p>
          <h3 className="text-xl font-black text-slate-800">{monthlyData.length}</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-xs font-bold mb-1">إجمالي العمليات</p>
          <h3 className="text-xl font-black text-slate-800">{records.length}</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-xs font-bold mb-1">{appMode === 'payroll' ? 'الراتب الأساسي' : (appMode === 'banks' ? 'الإيداعات' : 'مجمل الخاضع للضريبة')}</p>
          <h3 className="text-xl font-black text-blue-600" dir="ltr">{formatCurrency(records.reduce((sum, r) => sum + (r.Taxable_Amount || 0), 0))}</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-xs font-bold mb-1">{appMode === 'payroll' ? 'إجمالي البدلات' : (appMode === 'banks' ? 'السحوبات' : 'مجمل غير الخاضع')}</p>
          <h3 className="text-xl font-black text-amber-600" dir="ltr">{formatCurrency(records.reduce((sum, r) => sum + (r.NonTaxable_Amount || 0), 0))}</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-xs font-bold mb-1">{appMode === 'payroll' ? 'إجمالي الاستحقاق' : (appMode === 'banks' ? 'إجمالي الرصيد' : 'الإجمالي قبل الضريبة')}</p>
          <h3 className="text-xl font-black text-indigo-600" dir="ltr">{formatCurrency(records.reduce((sum, r) => sum + ((r.Taxable_Amount || 0) + (r.NonTaxable_Amount || 0)), 0))}</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-xs font-bold mb-1">{appMode === 'payroll' ? 'الاستقطاعات' : (appMode === 'banks' ? 'العمولات' : 'قيمة الضريبة')}</p>
          <h3 className="text-xl font-black text-slate-600" dir="ltr">{formatCurrency(records.reduce((sum, r) => sum + (r.VAT_Amount || 0), 0))}</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-xs font-bold mb-1">{getTotalLabel()}</p>
          <h3 className="text-xl font-black text-emerald-600" dir="ltr">{formatCurrency(records.reduce((sum, r) => sum + r.Total_Amount, 0))}</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar pb-2" style={{ maxHeight: 'calc(100vh - 250px)' }}>
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="px-6 py-4 sticky right-0 bg-slate-50 z-30 border-l border-slate-200">الشهر</th>
                <th className="px-6 py-4 text-center">عدد العمليات</th>
                <th className="px-6 py-4 text-left">{appMode === 'payroll' ? 'الأساسي' : (appMode === 'banks' ? 'إيداعات' : 'الخاضع')}</th>
                <th className="px-6 py-4 text-left">{appMode === 'payroll' ? 'البدلات' : (appMode === 'banks' ? 'سحوبات' : 'غير خاضع')}</th>
                <th className="px-6 py-4 text-left">{appMode === 'payroll' ? 'إجمالي الاستحقاق' : (appMode === 'banks' ? 'إجمالي الرصيد' : 'الإجمالي قبل الضريبة')}</th>
                <th className="px-6 py-4 text-left">{appMode === 'payroll' ? 'الاستقطاعات' : (appMode === 'banks' ? 'العمولات' : 'الضريبة')}</th>
                <th className="px-6 py-4 text-left">{appMode === 'payroll' ? 'صافي الرواتب' : (appMode === 'banks' ? 'الرصيد النهائي' : 'الإجمالي الكلي')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlyData.map((data, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800 sticky right-0 bg-white z-10 border-l border-slate-100">{data.formattedMonth}</td>
                  <td className="px-6 py-4 text-center font-medium text-slate-600">
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs">{data.count}</span>
                  </td>
                  <td className="px-6 py-4 text-left text-blue-600 font-medium" dir="ltr">{formatCurrency(data.totalTaxable)}</td>
                  <td className="px-6 py-4 text-left text-emerald-600 font-medium" dir="ltr">{formatCurrency(data.totalNonTaxable)}</td>
                  <td className="px-6 py-4 text-left text-indigo-600 font-bold" dir="ltr">{formatCurrency(appMode === 'banks' ? (data.totalTaxable - data.totalNonTaxable) : (data.totalTaxable + data.totalNonTaxable))}</td>
                  <td className="px-6 py-4 text-left text-slate-500 font-medium" dir="ltr">{formatCurrency(data.totalVAT)}</td>
                  <td className="px-6 py-4 text-left font-black text-slate-900" dir="ltr">{formatCurrency(data.totalSpend)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-black text-slate-800 border-t-2 border-slate-200 sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <tr>
                  <td className="px-6 py-4 sticky right-0 bg-slate-50 z-30 border-l border-slate-200">الإجمالي العام</td>
                  <td className="px-6 py-4 text-center">{monthlyData.reduce((sum, d) => sum + d.count, 0)}</td>
                  <td className="px-6 py-4 text-left text-blue-700" dir="ltr">{formatCurrency(monthlyData.reduce((sum, d) => sum + d.totalTaxable, 0))}</td>
                  <td className="px-6 py-4 text-left text-emerald-700" dir="ltr">{formatCurrency(monthlyData.reduce((sum, d) => sum + d.totalNonTaxable, 0))}</td>
                  <td className="px-6 py-4 text-left text-indigo-700" dir="ltr">{formatCurrency(monthlyData.reduce((sum, d) => sum + (appMode === 'banks' ? (d.totalTaxable - d.totalNonTaxable) : (d.totalTaxable + d.totalNonTaxable)), 0))}</td>
                  <td className="px-6 py-4 text-left text-slate-600" dir="ltr">{formatCurrency(monthlyData.reduce((sum, d) => sum + d.totalVAT, 0))}</td>
                  <td className="px-6 py-4 text-left text-slate-900" dir="ltr">{formatCurrency(monthlyData.reduce((sum, d) => sum + d.totalSpend, 0))}</td>
                </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
