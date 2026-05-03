import React, { useMemo } from 'react';
import { FinancialRecord } from '../types';
import { formatCurrency, formatMonthName } from '../lib/financial-utils';

interface MonthlyPayrollProps {
  filteredRecords: FinancialRecord[];
}

export const MonthlyPayroll: React.FC<MonthlyPayrollProps> = ({ filteredRecords }) => {
  const { months, formattedMonths, employeeData } = useMemo(() => {
    const records = Array.isArray(filteredRecords) ? filteredRecords : [];
    const monthCounts: Record<string, number> = {};
    let mostCommonMonth = '';
    let maxCount = 0;

    records.forEach(r => {
      let m = '';
      if (r.Invoice_Date && r.Invoice_Date !== 'غير محدد') {
        m = r.Invoice_Date.substring(0, 7);
      } else if ((r as any)._finalMonth && (r as any)._finalMonth !== 'غير محدد') {
        m = (r as any)._finalMonth;
      }
      
      if (m && m.length === 7 && m.includes('-')) {
        monthCounts[m] = (monthCounts[m] || 0) + 1;
        if (monthCounts[m] > maxCount) {
          maxCount = monthCounts[m];
          mostCommonMonth = m;
        }
      }
    });

    if (!mostCommonMonth) {
      const today = new Date();
      mostCommonMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    }

    const monthSet = new Set<string>();
    const empMap: Record<string, any> = {};

    records.forEach(r => {
      // Extract month in YYYY-MM format
      let monthKey = mostCommonMonth;
      if (r.Invoice_Date && r.Invoice_Date !== 'غير محدد') {
          monthKey = r.Invoice_Date.substring(0, 7);
      } else if ((r as any)._finalMonth && (r as any)._finalMonth !== 'غير محدد') {
          monthKey = (r as any)._finalMonth;
      }

      monthSet.add(monthKey);

      const empId = r.Entity_ID;
      if (!empMap[empId]) {
        empMap[empId] = {
          id: empId,
          name: r.Entity_Normalized_Name,
          monthlyTotals: {}
        };
      }

      if (!empMap[empId].monthlyTotals[monthKey]) {
        empMap[empId].monthlyTotals[monthKey] = 0;
      }
      
      // Use Total_Amount as the received salary (Net Salary in payroll)
      empMap[empId].monthlyTotals[monthKey] += r.Total_Amount;
    });

    const sortedMonths = Array.from(monthSet).sort((a, b) => a.localeCompare(b));
    const formattedMonthsMap: Record<string, string> = {};
    sortedMonths.forEach(m => {
      formattedMonthsMap[m] = formatMonthName(m);
    });
    
    const sortedEmployees = Object.values(empMap).sort((a: any, b: any) => {
      const totalA = Object.values(a.monthlyTotals).reduce((sum: any, val: any) => sum + (val as number), 0) as number;
      const totalB = Object.values(b.monthlyTotals).reduce((sum: any, val: any) => sum + (val as number), 0) as number;
      if (totalB !== totalA) {
        return totalB - totalA; // Sort by highest salary first
      }
      return a.name.localeCompare(b.name);
    });

    return { months: sortedMonths, formattedMonths: formattedMonthsMap, employeeData: sortedEmployees };
  }, [filteredRecords]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">سجل رواتب الموظفين الشهري</h3>
          <p className="text-sm text-slate-500 mt-1">عرض تفصيلي لصافي الرواتب المستلمة لكل موظف موزعاً على الأشهر مرتبة من الأعلى للأقل</p>
        </div>
      </div>
      <div className="overflow-x-auto custom-scrollbar pb-2" style={{ maxHeight: 'calc(100vh - 250px)' }}>
        <table className="w-full text-right text-sm relative">
          <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="p-4 whitespace-nowrap text-center w-16 sticky right-0 bg-slate-100 z-30 border-l border-slate-200">#</th>
              <th className="p-4 whitespace-nowrap sticky right-16 bg-slate-100 z-30 border-l border-slate-200">اسم الموظف</th>
              {months.map(m => (
                <th key={m} className="p-4 whitespace-nowrap text-center" dir="ltr">{formattedMonths[m]}</th>
              ))}
              <th className="p-4 whitespace-nowrap text-center text-indigo-700">الإجمالي العام</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employeeData.map((emp: any, idx: number) => {
              let rowTotal = 0;
              return (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-center text-slate-400 font-medium sticky right-0 bg-white z-10 border-l border-slate-100">{idx + 1}</td>
                  <td className="p-4 font-bold text-slate-800 whitespace-nowrap sticky right-16 bg-white z-10 border-l border-slate-100">{emp.name}</td>
                  {months.map(m => {
                    const val = emp.monthlyTotals[m] || 0;
                    rowTotal += val;
                    return (
                      <td key={m} className="p-4 text-center font-medium text-slate-600 whitespace-nowrap" dir="ltr">
                        {val > 0 ? formatCurrency(val) : '-'}
                      </td>
                    );
                  })}
                  <td className="p-4 text-center font-black text-indigo-600 whitespace-nowrap" dir="ltr">
                    {formatCurrency(rowTotal)}
                  </td>
                </tr>
              );
            })}
            {employeeData.length === 0 && (
              <tr>
                <td colSpan={months.length + 3} className="p-8 text-center text-slate-500">
                  لا توجد بيانات رواتب لعرضها في هذه الفترة.
                </td>
              </tr>
            )}
          </tbody>
          {employeeData.length > 0 && (
            <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <tr>
                <td colSpan={2} className="p-4 text-slate-800 sticky right-0 bg-slate-50 z-30 border-l border-slate-200">الإجمالي الشهري</td>
                {months.map(m => {
                  const monthTotal = employeeData.reduce((sum: number, emp: any) => sum + (emp.monthlyTotals[m] || 0), 0);
                  return (
                    <td key={m} className="p-4 text-center text-slate-800 whitespace-nowrap" dir="ltr">
                      {formatCurrency(monthTotal)}
                    </td>
                  );
                })}
                <td className="p-4 text-center text-indigo-700 whitespace-nowrap" dir="ltr">
                  {formatCurrency(employeeData.reduce((sum: number, emp: any) => {
                    return sum + months.reduce((mSum: number, m: string) => mSum + (emp.monthlyTotals[m] || 0), 0);
                  }, 0))}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
