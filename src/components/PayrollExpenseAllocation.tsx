import React, { useMemo } from 'react';
import { FinancialRecord } from '../types';
import { formatCurrency, formatMonthName } from '../lib/financial-utils';

interface PayrollExpenseAllocationProps {
  filteredRecords: FinancialRecord[];
}

export const PayrollExpenseAllocation: React.FC<PayrollExpenseAllocationProps> = ({ filteredRecords }) => {
  const { allocations, totals } = useMemo(() => {
    const allocs: any[] = [];
    let totalBasic = 0;
    let totalHousing = 0;
    let totalVacation = 0;
    let totalTickets = 0;
    let totalEOS = 0;
    let totalGOSI = 0;
    let totalHealth = 0;
    let totalAllocations = 0;

    const empMap: Record<string, any> = {};

    filteredRecords.forEach(r => {
      const empId = r.Entity_ID;
      if (!empMap[empId]) {
        empMap[empId] = {
          id: empId,
          name: r.Entity_Normalized_Name,
          basic: 0,
          housing: 0,
          vacation: 0,
          tickets: 0,
          eos: 0,
          gosi: 0,
          health: 0,
          total: 0
        };
      }

      // We need to extract basic salary and housing allowance.
      // Since they are stored in _allowancesObj, we can try to find them.
      let basic = 0;
      let housing = 0;
      
      if ((r as any)._allowancesObj) {
        for (const [key, val] of Object.entries((r as any)._allowancesObj)) {
          if (/(أساسي|اساسي|basic)/i.test(key)) basic += val as number;
          if (/(سكن|housing)/i.test(key)) housing += val as number;
        }
      }
      
      // Fallback if not found in allowancesObj, maybe it's in Taxable_Amount
      if (basic === 0 && r.Taxable_Amount > 0) {
          basic = r.Taxable_Amount;
      }

      // Calculate allocations per record (monthly)
      const vacation = basic * (8.33 / 100); // 1 month per year
      const tickets = basic * (4.16 / 100); // Half month per year (example)
      const eos = basic * (4.16 / 100); // Half month per year for first 5 years
      const gosi = (basic + housing) * (11.75 / 100); // Employer share
      const health = 200; // Fixed example amount per month

      empMap[empId].basic += basic;
      empMap[empId].housing += housing;
      empMap[empId].vacation += vacation;
      empMap[empId].tickets += tickets;
      empMap[empId].eos += eos;
      empMap[empId].gosi += gosi;
      empMap[empId].health += health;
      empMap[empId].total += (vacation + tickets + eos + gosi + health);

      totalBasic += basic;
      totalHousing += housing;
      totalVacation += vacation;
      totalTickets += tickets;
      totalEOS += eos;
      totalGOSI += gosi;
      totalHealth += health;
      totalAllocations += (vacation + tickets + eos + gosi + health);
    });

    return { 
      allocations: Object.values(empMap).sort((a: any, b: any) => b.total - a.total),
      totals: { totalBasic, totalHousing, totalVacation, totalTickets, totalEOS, totalGOSI, totalHealth, totalAllocations }
    };
  }, [filteredRecords]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">مخصصات ومصاريف الرواتب (Payroll Expense Allocation)</h3>
          <p className="text-sm text-slate-500 mt-1">حساب المخصصات الشهرية (إجازات، تذاكر، نهاية خدمة) والمصاريف (تأمينات، تأمين طبي) بناءً على الراتب الأساسي.</p>
        </div>
      </div>
      <div className="overflow-x-auto custom-scrollbar pb-2" style={{ maxHeight: 'calc(100vh - 250px)' }}>
        <table className="w-full text-right text-sm relative">
          <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="p-4 whitespace-nowrap text-center w-16 sticky right-0 bg-slate-100 z-30 border-l border-slate-200">#</th>
              <th className="p-4 whitespace-nowrap sticky right-16 bg-slate-100 z-30 border-l border-slate-200">اسم الموظف</th>
              <th className="p-4 whitespace-nowrap text-center">الراتب الأساسي</th>
              <th className="p-4 whitespace-nowrap text-center">بدل السكن</th>
              <th className="p-4 whitespace-nowrap text-center text-amber-600">مخصص الإجازات (8.33%)</th>
              <th className="p-4 whitespace-nowrap text-center text-amber-600">مخصص التذاكر (4.16%)</th>
              <th className="p-4 whitespace-nowrap text-center text-amber-600">نهاية الخدمة (4.16%)</th>
              <th className="p-4 whitespace-nowrap text-center text-blue-600">التأمينات الاجتماعية (11.75%)</th>
              <th className="p-4 whitespace-nowrap text-center text-blue-600">التأمين الطبي (تقديري)</th>
              <th className="p-4 whitespace-nowrap text-center text-indigo-700 font-black">إجمالي المخصصات والمصاريف</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {allocations.map((emp: any, idx: number) => (
              <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 text-center text-slate-400 font-medium sticky right-0 bg-white z-10 border-l border-slate-100">{idx + 1}</td>
                <td className="p-4 font-bold text-slate-800 whitespace-nowrap sticky right-16 bg-white z-10 border-l border-slate-100">{emp.name}</td>
                <td className="p-4 text-center font-medium text-slate-600" dir="ltr">{formatCurrency(emp.basic)}</td>
                <td className="p-4 text-center font-medium text-slate-600" dir="ltr">{formatCurrency(emp.housing)}</td>
                <td className="p-4 text-center font-medium text-amber-700 bg-amber-50/30" dir="ltr">{formatCurrency(emp.vacation)}</td>
                <td className="p-4 text-center font-medium text-amber-700 bg-amber-50/30" dir="ltr">{formatCurrency(emp.tickets)}</td>
                <td className="p-4 text-center font-medium text-amber-700 bg-amber-50/30" dir="ltr">{formatCurrency(emp.eos)}</td>
                <td className="p-4 text-center font-medium text-blue-700 bg-blue-50/30" dir="ltr">{formatCurrency(emp.gosi)}</td>
                <td className="p-4 text-center font-medium text-blue-700 bg-blue-50/30" dir="ltr">{formatCurrency(emp.health)}</td>
                <td className="p-4 text-center font-black text-indigo-600 bg-indigo-50/30" dir="ltr">{formatCurrency(emp.total)}</td>
              </tr>
            ))}
            {allocations.length === 0 && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-500">
                  لا توجد بيانات رواتب لعرضها.
                </td>
              </tr>
            )}
          </tbody>
          {allocations.length > 0 && (
            <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <tr>
                <td colSpan={2} className="p-4 text-slate-800 sticky right-0 bg-slate-50 z-30 border-l border-slate-200">الإجمالي العام</td>
                <td className="p-4 text-center text-slate-800" dir="ltr">{formatCurrency(totals.totalBasic)}</td>
                <td className="p-4 text-center text-slate-800" dir="ltr">{formatCurrency(totals.totalHousing)}</td>
                <td className="p-4 text-center text-amber-700" dir="ltr">{formatCurrency(totals.totalVacation)}</td>
                <td className="p-4 text-center text-amber-700" dir="ltr">{formatCurrency(totals.totalTickets)}</td>
                <td className="p-4 text-center text-amber-700" dir="ltr">{formatCurrency(totals.totalEOS)}</td>
                <td className="p-4 text-center text-blue-700" dir="ltr">{formatCurrency(totals.totalGOSI)}</td>
                <td className="p-4 text-center text-blue-700" dir="ltr">{formatCurrency(totals.totalHealth)}</td>
                <td className="p-4 text-center text-indigo-700 font-black" dir="ltr">{formatCurrency(totals.totalAllocations)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
