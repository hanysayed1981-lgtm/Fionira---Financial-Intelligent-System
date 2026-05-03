import React from 'react';
import { Card } from './Card';
import { Scale, ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react';

interface BalanceSheetProps {
  data: {
    revenues: number;
    expenses: number;
    payroll: number;
  };
  onNavigateToTab?: (tab: string, anchor?: string, search?: string, targetMode?: string) => void;
}

export const BalanceSheet: React.FC<BalanceSheetProps> = ({ data, onNavigateToTab }) => {
  const netIncome = data.revenues - data.expenses - data.payroll;
  
  // Estimated Balance Sheet Values
  const cash = Math.max(netIncome * 0.4, 0); // Estimate 40% of net income as cash on hand
  const accountsReceivable = data.revenues * 0.15; // Estimate 15% of revenues as receivables
  const inventory = data.expenses * 0.1; // Estimate 10% of expenses as inventory
  
  const totalAssets = cash + accountsReceivable + inventory;
  
  const accountsPayable = data.expenses * 0.12; // Estimate 12% of expenses as payables
  const accruedExpenses = data.payroll * 0.05; // Estimate 5% of payroll as accrued
  
  const totalLiabilities = accountsPayable + accruedExpenses;
  const equity = totalAssets - totalLiabilities;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(val);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-indigo-50 border-indigo-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <ArrowUpCircle className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-indigo-600">إجمالي الأصول</p>
              <p className="text-2xl font-black text-slate-900">{formatCurrency(totalAssets)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-rose-50 border-rose-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <ArrowDownCircle className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-rose-600">إجمالي الالتزامات</p>
              <p className="text-2xl font-black text-slate-900">{formatCurrency(totalLiabilities)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-emerald-50 border-emerald-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <Wallet className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-600">حقوق الملكية</p>
              <p className="text-2xl font-black text-slate-900">{formatCurrency(equity)}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-8">
          <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2 border-b pb-4">
            الأصول (Assets)
          </h3>
          <div className="space-y-4">
            <div 
              className="flex justify-between items-center cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded transition-colors group"
              onClick={() => onNavigateToTab?.('grouped_purchases', undefined, 'نقد', 'revenues')}
              title="عرض الإيرادات ذات الصلة"
            >
              <span className="font-bold text-slate-600 group-hover:text-indigo-600">النقد وما في حكمه <span className="text-xs font-normal text-slate-400 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">(عرض الإيرادات)</span></span>
              <span className="font-black text-slate-900">{formatCurrency(cash)}</span>
            </div>
            <div 
              className="flex justify-between items-center cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded transition-colors group"
              onClick={() => onNavigateToTab?.('grouped_purchases', undefined, 'ذمم مدينة', 'revenues')}
              title="عرض الإيرادات ذات الصلة"
            >
              <span className="font-bold text-slate-600 group-hover:text-indigo-600">ذمم مدينة (عملاء) <span className="text-xs font-normal text-slate-400 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">(عرض الإيرادات)</span></span>
              <span className="font-black text-slate-900">{formatCurrency(accountsReceivable)}</span>
            </div>
            <div 
              className="flex justify-between items-center cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded transition-colors group"
              onClick={() => onNavigateToTab?.('grouped_purchases', undefined, 'مخزون', 'expenses')}
              title="عرض المصروفات ذات الصلة"
            >
              <span className="font-bold text-slate-600 group-hover:text-indigo-600">المخزون السلعي <span className="text-xs font-normal text-slate-400 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">(عرض المصروفات)</span></span>
              <span className="font-black text-slate-900">{formatCurrency(inventory)}</span>
            </div>
            <div className="pt-4 border-t flex justify-between items-center p-2 -mx-2">
              <span className="font-black text-indigo-600">إجمالي الأصول المتداولة</span>
              <span className="font-black text-indigo-600">{formatCurrency(totalAssets)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-8">
          <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2 border-b pb-4">
            الالتزامات وحقوق الملكية
          </h3>
          <div className="space-y-4">
            <div 
              className="flex justify-between items-center cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded transition-colors group"
              onClick={() => onNavigateToTab?.('grouped_purchases', undefined, 'مورد', 'expenses')}
              title="عرض المصروفات ذات الصلة"
            >
              <span className="font-bold text-slate-600 group-hover:text-indigo-600">ذمم دائنة (موردون) <span className="text-xs font-normal text-slate-400 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">(عرض المصروفات)</span></span>
              <span className="font-black text-slate-900">{formatCurrency(accountsPayable)}</span>
            </div>
            <div 
              className="flex justify-between items-center cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded transition-colors group"
              onClick={() => onNavigateToTab?.('monthly_payroll', undefined, 'مستحق', 'payroll')}
              title="عرض الرواتب ذات الصلة"
            >
              <span className="font-bold text-slate-600 group-hover:text-indigo-600">مصاريف مستحقة <span className="text-xs font-normal text-slate-400 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">(عرض تفاصيل الرواتب والأجور)</span></span>
              <span className="font-black text-slate-900">{formatCurrency(accruedExpenses)}</span>
            </div>
            <div className="pt-4 border-t flex justify-between items-center p-2 -mx-2">
              <span className="font-black text-rose-600">إجمالي الالتزامات</span>
              <span className="font-black text-rose-600">{formatCurrency(totalLiabilities)}</span>
            </div>
            <div className="pt-6 space-y-4">
              <div className="flex justify-between items-center p-2 -mx-2">
                <span className="font-bold text-slate-600">رأس المال المستثمر</span>
                <span className="font-black text-slate-900">{formatCurrency(equity - netIncome)}</span>
              </div>
              <div 
                className="flex justify-between items-center cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded transition-colors group"
                onClick={() => onNavigateToTab?.('income_statement', undefined, undefined, 'reports')}
                title="عرض قائمة الدخل"
              >
                <span className="font-bold text-slate-600 group-hover:text-indigo-600">الأرباح المبقاة (الفترة الحالية) <span className="text-xs font-normal text-slate-400 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">(عرض قائمة الدخل)</span></span>
                <span className="font-black text-slate-900">{formatCurrency(netIncome)}</span>
              </div>
              <div className="pt-4 border-t flex justify-between items-center p-2 -mx-2">
                <span className="font-black text-emerald-600">إجمالي حقوق الملكية</span>
                <span className="font-black text-emerald-600">{formatCurrency(equity)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-800 text-sm font-bold">
        تنبيه: هذه الميزانية تقديرية بناءً على البيانات المرفوعة للمصروفات والإيرادات والرواتب، ولا تشمل الأصول الثابتة أو القروض طويلة الأجل ما لم يتم إدراجها في البيانات.
      </div>
    </div>
  );
};
