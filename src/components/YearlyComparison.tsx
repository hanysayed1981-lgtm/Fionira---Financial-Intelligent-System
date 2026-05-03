import React, { useMemo, useState } from 'react';
import { FinancialRecord, DateFilter } from '../types';
import { formatCurrency } from '../lib/financial-utils';
import { TrendingUp, TrendingDown, Calendar, Minus, Filter, Check } from 'lucide-react';

interface YearlyComparisonProps {
  records: FinancialRecord[];
  appMode: 'expenses' | 'revenues' | 'payroll' | 'banks';
  dateFilter: DateFilter;
}

export const YearlyComparison: React.FC<YearlyComparisonProps> = ({ records, appMode, dateFilter }) => {
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    records.forEach(r => {
      if (r.Invoice_Date && r.Invoice_Date !== 'غير محدد') {
        const y = r.Invoice_Date.split('-')[0];
        if (y && y.length === 4) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [records]);

  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

  const activeYears = selectedYears.length > 0 ? selectedYears : availableYears;

  const toggleYear = (year: string) => {
    setSelectedYears(prev => 
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  const yearlyData = useMemo(() => {
    const grouped: Record<string, {
      year: string;
      totalTaxable: number;
      totalNonTaxable: number;
      totalVAT: number;
      totalSpend: number;
      count: number;
    }> = {};

    records.forEach(r => {
      if (!r.Invoice_Date || r.Invoice_Date === 'غير محدد') return;
      const dateParts = r.Invoice_Date.split('-');
      if (dateParts.length !== 3) return;
      
      const year = dateParts[0];
      if (!activeYears.includes(year)) return;

      const recordMM = dateParts[1];
      const recordMMDD = `${dateParts[1]}-${dateParts[2]}`;

      // Apply month/period filter across all years
      if (dateFilter.month) {
        const filterMM = dateFilter.month.split('-')[1];
        if (recordMM !== filterMM) return;
      }

      if (dateFilter.start || dateFilter.end) {
        const startMMDD = dateFilter.start ? dateFilter.start.substring(5) : '01-01';
        const endMMDD = dateFilter.end ? dateFilter.end.substring(5) : '12-31';
        
        if (startMMDD <= endMMDD) {
          if (recordMMDD < startMMDD || recordMMDD > endMMDD) return;
        } else {
          // Handles ranges that wrap around the year (e.g., Nov to Feb)
          if (recordMMDD < startMMDD && recordMMDD > endMMDD) return;
        }
      }

      if (!grouped[year]) {
        grouped[year] = { year, totalTaxable: 0, totalNonTaxable: 0, totalVAT: 0, totalSpend: 0, count: 0 };
      }
      grouped[year].totalTaxable += r.Taxable_Amount;
      grouped[year].totalNonTaxable += r.NonTaxable_Amount;
      grouped[year].totalVAT += r.VAT_Amount;
      grouped[year].totalSpend += r.Total_Amount;
      grouped[year].count += 1;
    });

    return Object.values(grouped).sort((a, b) => parseInt(b.year) - parseInt(a.year));
  }, [records, dateFilter, activeYears]);

  const filterDescription = useMemo(() => {
    if (dateFilter.month) {
      const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      const monthIdx = parseInt(dateFilter.month.split('-')[1]) - 1;
      return `مقارنة شهر ${monthNames[monthIdx]} عبر السنوات`;
    }
    if (dateFilter.start || dateFilter.end) {
      const start = dateFilter.start ? dateFilter.start.substring(5) : 'بداية العام';
      const end = dateFilter.end ? dateFilter.end.substring(5) : 'نهاية العام';
      return `مقارنة الفترة من ${start} إلى ${end} عبر السنوات`;
    }
    return 'مقارنة سنوية شاملة';
  }, [dateFilter]);

  if (availableYears.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
        <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-700 mb-2">لا توجد بيانات كافية للمقارنة</h3>
        <p className="text-slate-500">يرجى التأكد من وجود تواريخ صحيحة في السجلات لإجراء المقارنة السنوية.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-600" />
            مقارنة الأداء السنوي
          </h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button 
                onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors"
              >
                <span>تحديد السنوات ({selectedYears.length === 0 ? 'الكل' : selectedYears.length})</span>
                <Calendar className="w-4 h-4" />
              </button>
              
              {isYearDropdownOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="p-2 border-b border-slate-100">
                    <button 
                      onClick={() => setSelectedYears([])}
                      className="w-full text-right px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-md"
                    >
                      اختيار الكل
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                    {availableYears.map(year => (
                      <label key={year} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-md cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="hidden" 
                          checked={activeYears.includes(year)} 
                          onChange={() => toggleYear(year)} 
                        />
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${activeYears.includes(year) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                          {activeYears.includes(year) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{year}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-medium text-sm border border-indigo-100">
              <Filter className="w-4 h-4" />
              {filterDescription}
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar pb-4" style={{ maxHeight: 'calc(100vh - 250px)' }}>
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="px-6 py-4 sticky right-0 bg-slate-50 z-30 border-l border-slate-200">السنة المالية</th>
                <th className="px-6 py-4 text-center">عدد العمليات</th>
                <th className="px-6 py-4 text-left">{appMode === 'payroll' ? 'الأساسي' : (appMode === 'banks' ? 'إيداعات' : 'الخاضع')}</th>
                <th className="px-6 py-4 text-left">{appMode === 'payroll' ? 'البدلات' : (appMode === 'banks' ? 'سحوبات' : 'غير خاضع')}</th>
                <th className="px-6 py-4 text-left">{appMode === 'payroll' ? 'إجمالي الاستحقاق' : (appMode === 'banks' ? 'الرصيد' : 'الإجمالي قبل الضريبة')}</th>
                <th className="px-6 py-4 text-left">{appMode === 'payroll' ? 'الاستقطاعات' : (appMode === 'banks' ? 'العمولات' : 'الضريبة')}</th>
                <th className="px-6 py-4 text-left">{appMode === 'payroll' ? 'صافي الرواتب' : (appMode === 'banks' ? 'الرصيد النهائي' : 'الإجمالي الكلي')}</th>
                <th className="px-6 py-4 text-center">التغير (مبلغ)</th>
                <th className="px-6 py-4 text-center">التغير (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {yearlyData.map((data, idx) => {
                const prevYearData = yearlyData.find(d => parseInt(d.year) === parseInt(data.year) - 1);
                let growthRate = 0;
                let varianceAmount = 0;
                if (prevYearData && prevYearData.totalSpend > 0) {
                  varianceAmount = data.totalSpend - prevYearData.totalSpend;
                  growthRate = (varianceAmount / prevYearData.totalSpend) * 100;
                }

                return (
                  <tr key={data.year} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-black text-slate-800 sticky right-0 bg-white z-10 border-l border-slate-100">{data.year}</td>
                    <td className="px-6 py-4 text-center font-medium text-slate-600">
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs">{data.count}</span>
                    </td>
                    <td className="px-6 py-4 text-left text-blue-600 font-medium" dir="ltr">{formatCurrency(data.totalTaxable)}</td>
                    <td className="px-6 py-4 text-left text-emerald-600 font-medium" dir="ltr">{formatCurrency(data.totalNonTaxable)}</td>
                    <td className="px-6 py-4 text-left text-indigo-600 font-bold" dir="ltr">{formatCurrency(appMode === 'banks' ? (data.totalTaxable - data.totalNonTaxable) : (data.totalTaxable + data.totalNonTaxable))}</td>
                    <td className="px-6 py-4 text-left text-slate-500 font-medium" dir="ltr">{formatCurrency(data.totalVAT)}</td>
                    <td className="px-6 py-4 text-left font-black text-slate-900" dir="ltr">{formatCurrency(data.totalSpend)}</td>
                    <td className="px-6 py-4 text-center">
                      {prevYearData ? (
                        <span className={`font-bold ${varianceAmount > 0 ? 'text-emerald-600' : varianceAmount < 0 ? 'text-rose-600' : 'text-slate-400'}`} dir="ltr">
                          {varianceAmount > 0 ? '+' : ''}{formatCurrency(varianceAmount)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {prevYearData ? (
                        <div className={`flex items-center justify-center gap-1 font-bold ${growthRate > 0 ? 'text-emerald-600' : growthRate < 0 ? 'text-rose-600' : 'text-slate-400'}`} dir="ltr">
                          {growthRate > 0 ? <TrendingUp className="w-4 h-4" /> : growthRate < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                          {Math.abs(growthRate).toFixed(1)}%
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 font-black text-slate-800 border-t-2 border-slate-200 sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <tr>
                <td className="px-6 py-4 sticky right-0 bg-slate-50 z-30 border-l border-slate-200">الإجمالي العام</td>
                <td className="px-6 py-4 text-center">{yearlyData.reduce((sum, d) => sum + d.count, 0)}</td>
                <td className="px-6 py-4 text-left text-blue-700" dir="ltr">{formatCurrency(yearlyData.reduce((sum, d) => sum + d.totalTaxable, 0))}</td>
                <td className="px-6 py-4 text-left text-emerald-700" dir="ltr">{formatCurrency(yearlyData.reduce((sum, d) => sum + d.totalNonTaxable, 0))}</td>
                <td className="px-6 py-4 text-left text-indigo-700" dir="ltr">{formatCurrency(yearlyData.reduce((sum, d) => sum + (appMode === 'banks' ? (d.totalTaxable - d.totalNonTaxable) : (d.totalTaxable + d.totalNonTaxable)), 0))}</td>
                <td className="px-6 py-4 text-left text-slate-600" dir="ltr">{formatCurrency(yearlyData.reduce((sum, d) => sum + d.totalVAT, 0))}</td>
                <td className="px-6 py-4 text-left text-slate-900" dir="ltr">{formatCurrency(yearlyData.reduce((sum, d) => sum + d.totalSpend, 0))}</td>
                <td className="px-6 py-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
