import React, { useMemo } from 'react';
import { FinancialRecord } from '../types';
import { Card } from './Card';
import { FileText, Calculator, AlertCircle } from 'lucide-react';

interface TaxDeclarationProps {
  revenuesRecords: FinancialRecord[];
  expensesRecords: FinancialRecord[];
  onNavigateToTab?: (tab: string, anchor?: string, search?: string, targetMode?: string) => void;
}

export const TaxDeclaration: React.FC<TaxDeclarationProps> = ({ revenuesRecords, expensesRecords, onNavigateToTab }) => {
  const taxData = useMemo(() => {
    let totalSales = 0;
    let totalSalesVat = 0;
    let totalPurchases = 0;
    let totalPurchasesVat = 0;

    revenuesRecords.forEach(r => {
      totalSales += (r.Taxable_Amount || 0) + (r.NonTaxable_Amount || 0);
      totalSalesVat += r.VAT_Amount || 0;
    });

    expensesRecords.forEach(r => {
      totalPurchases += (r.Taxable_Amount || 0) + (r.NonTaxable_Amount || 0);
      totalPurchasesVat += r.VAT_Amount || 0;
    });

    const netVatDue = totalSalesVat - totalPurchasesVat;

    return {
      totalSales,
      totalSalesVat,
      totalPurchases,
      totalPurchasesVat,
      netVatDue
    };
  }, [revenuesRecords, expensesRecords]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">نموذج الإقرار الضريبي (VAT)</h3>
            <p className="text-sm text-slate-500">ملخص ضريبة القيمة المضافة للمبيعات والمشتريات خلال الفترة المحددة</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 border-emerald-100 bg-emerald-50/30">
            <h4 className="text-lg font-bold text-emerald-800 mb-4 border-b border-emerald-200 pb-2">المبيعات (الإيرادات)</h4>
            <div className="space-y-4">
              <div 
                className="flex justify-between items-center cursor-pointer hover:bg-emerald-100/50 p-2 -mx-2 rounded transition-colors group"
                onClick={() => onNavigateToTab?.('grouped_purchases', undefined, 'ضريبة', 'revenues')}
                title="عرض الإيرادات ذات الصلة"
              >
                <span className="text-slate-600 font-medium group-hover:text-emerald-700">إجمالي المبيعات الخاضعة للضريبة</span>
                <span className="font-bold text-slate-800 ltr-text group-hover:text-emerald-900">{taxData.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR</span>
              </div>
              <div 
                className="flex justify-between items-center bg-emerald-100/50 p-3 rounded-lg cursor-pointer hover:bg-emerald-200/50 transition-colors group"
                onClick={() => onNavigateToTab?.('grouped_purchases', undefined, 'ضريبة', 'revenues')}
                title="عرض تفاصيل الإيرادات للتحقق من الضريبة"
              >
                <span className="text-emerald-800 font-bold group-hover:text-emerald-900">ضريبة المبيعات المحصلة (مخرجات)</span>
                <span className="font-black text-emerald-700 ltr-text group-hover:text-emerald-900">{taxData.totalSalesVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-rose-100 bg-rose-50/30">
            <h4 className="text-lg font-bold text-rose-800 mb-4 border-b border-rose-200 pb-2">المشتريات (المصروفات)</h4>
            <div className="space-y-4">
              <div 
                className="flex justify-between items-center cursor-pointer hover:bg-rose-100/50 p-2 -mx-2 rounded transition-colors group"
                onClick={() => onNavigateToTab?.('grouped_purchases', undefined, 'ضريبة', 'expenses')}
                title="عرض المصروفات ذات الصلة"
              >
                <span className="text-slate-600 font-medium group-hover:text-rose-700">إجمالي المشتريات الخاضعة للضريبة</span>
                <span className="font-bold text-slate-800 ltr-text group-hover:text-rose-900">{taxData.totalPurchases.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR</span>
              </div>
              <div 
                className="flex justify-between items-center bg-rose-100/50 p-3 rounded-lg cursor-pointer hover:bg-rose-200/50 transition-colors group"
                onClick={() => onNavigateToTab?.('grouped_purchases', undefined, 'ضريبة', 'expenses')}
                title="عرض تفاصيل المصروفات للتحقق من الضريبة"
              >
                <span className="text-rose-800 font-bold group-hover:text-rose-900">ضريبة المشتريات المدفوعة (مدخلات)</span>
                <span className="font-black text-rose-700 ltr-text group-hover:text-rose-900">{taxData.totalPurchasesVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-8 p-6 bg-slate-800 rounded-2xl text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h4 className="text-lg font-bold text-slate-300 mb-1">صافي الضريبة المستحقة</h4>
              <p className="text-sm text-slate-400">الفرق بين ضريبة المخرجات وضريبة المدخلات</p>
            </div>
            <div className="text-left">
              <div className={`text-3xl font-black ltr-text ${taxData.netVatDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {Math.abs(taxData.netVatDue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR
              </div>
              <div className="text-sm font-medium mt-1 text-slate-300 text-center">
                {taxData.netVatDue > 0 ? 'مبلغ مستحق الدفع للهيئة' : taxData.netVatDue < 0 ? 'مبلغ مسترد من الهيئة' : 'لا يوجد رصيد مستحق'}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="leading-relaxed font-medium">
            هذا الإقرار هو نموذج استرشادي مبني على البيانات المدخلة في النظام. يجب مراجعة جميع الفواتير والتأكد من مطابقتها لمتطلبات هيئة الزكاة والضريبة والجمارك (ZATCA) قبل تقديم الإقرار الرسمي.
          </p>
        </div>
      </div>
    </div>
  );
};
