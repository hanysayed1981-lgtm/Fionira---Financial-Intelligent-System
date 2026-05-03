import React, { useMemo } from 'react';
import { ShieldAlert, AlertTriangle, Info, CheckCircle2, Search, Filter, ArrowLeftRight, FileText, User } from 'lucide-react';
import { Card } from './Card';
import { formatCurrency } from '../lib/financial-utils';

interface AnomaliesReportProps {
  expensesAnomalies: any[];
  revenuesAnomalies: any[];
  payrollAnomalies: any[];
  banksAnomalies?: any[];
  onNavigateToTab?: (tab: string, anchor?: string, search?: string, targetMode?: string) => void;
}

export const AnomaliesReport: React.FC<AnomaliesReportProps> = ({ 
  expensesAnomalies, 
  revenuesAnomalies, 
  payrollAnomalies,
  banksAnomalies = [],
  onNavigateToTab 
}) => {
  const allAnomalies = useMemo(() => {
    return [
      ...(Array.isArray(expensesAnomalies) ? expensesAnomalies : []).map(a => ({ ...a, module: 'expenses', moduleLabel: 'المصروفات' })),
      ...(Array.isArray(revenuesAnomalies) ? revenuesAnomalies : []).map(a => ({ ...a, module: 'revenues', moduleLabel: 'الإيرادات' })),
      ...(Array.isArray(payrollAnomalies) ? payrollAnomalies : []).map(a => ({ ...a, module: 'payroll', moduleLabel: 'الرواتب' })),
      ...(Array.isArray(banksAnomalies) ? banksAnomalies : []).map(a => ({ ...a, module: 'banks', moduleLabel: 'البنوك' }))
    ].sort((a, b) => {
        // Sort by date if possible, otherwise by original index
        const dateA = a.Invoice_Date && a.Invoice_Date !== 'غير محدد' ? new Date(a.Invoice_Date).getTime() : 0;
        const dateB = b.Invoice_Date && b.Invoice_Date !== 'غير محدد' ? new Date(b.Invoice_Date).getTime() : 0;
        return dateB - dateA || b._originalIndex - a._originalIndex;
    });
  }, [expensesAnomalies, revenuesAnomalies, payrollAnomalies]);

  const stats = useMemo(() => ({
    total: allAnomalies.length,
    expenses: expensesAnomalies.length,
    revenues: revenuesAnomalies.length,
    payroll: payrollAnomalies.length
  }), [allAnomalies]);

  return (
    <div className="max-w-6xl mx-auto p-8 animate-in fade-in duration-500">
      <header className="mb-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-rose-600" /> مركز التنبيهات والملاحظات الرقابية
            </h1>
            <p className="text-slate-500 font-medium mt-2">تحليل شامل للتناقضات، الأخطاء الحسابية، والعمليات المشبوهة عبر جميع الأقسام.</p>
          </div>
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 px-4 py-2 rounded-2xl">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <span className="text-rose-700 font-black text-lg">{stats.total} تنبيه معلق</span>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <Card className="p-6 border-r-4 border-r-indigo-500">
          <p className="text-slate-500 text-sm font-bold mb-1">تنبيهات المصروفات</p>
          <p className="text-3xl font-black text-slate-900">{stats.expenses}</p>
        </Card>
        <Card className="p-6 border-r-4 border-r-emerald-500">
          <p className="text-slate-500 text-sm font-bold mb-1">تنبيهات الإيرادات</p>
          <p className="text-3xl font-black text-slate-900">{stats.revenues}</p>
        </Card>
        <Card className="p-6 border-r-4 border-r-amber-500">
          <p className="text-slate-500 text-sm font-bold mb-1">تنبيهات الرواتب</p>
          <p className="text-3xl font-black text-slate-900">{stats.payroll}</p>
        </Card>
        <Card className="p-6 border-r-4 border-r-blue-500">
          <p className="text-slate-500 text-sm font-bold mb-1">تنبيهات البنوك</p>
          <p className="text-3xl font-black text-slate-900">{banksAnomalies.length}</p>
        </Card>
      </div>

      {/* Anomalies List */}
      <div className="space-y-4">
        {(Array.isArray(allAnomalies) ? allAnomalies : []).length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-100 p-12 rounded-[2.5rem] text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-emerald-900">النظام سليم بالكامل</h3>
            <p className="text-emerald-700 font-medium mt-2">لم يتم العثور على أي تناقضات أو أخطاء في البيانات المرفوعة حالياً.</p>
          </div>
        ) : (
          (Array.isArray(allAnomalies) ? allAnomalies : []).map((anomaly, idx) => (
            <Card key={idx} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row">
                <div className={`w-full md:w-2 shrink-0 ${anomaly.module === 'expenses' ? 'bg-indigo-500' : (anomaly.module === 'revenues' ? 'bg-emerald-500' : (anomaly.module === 'banks' ? 'bg-blue-500' : 'bg-amber-500'))}`} />
                <div className="p-6 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${anomaly.module === 'expenses' ? 'bg-indigo-100 text-indigo-700' : (anomaly.module === 'revenues' ? 'bg-emerald-100 text-emerald-700' : (anomaly.module === 'banks' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'))}`}>
                        {anomaly.moduleLabel}
                      </span>
                      <span className="text-slate-400 text-sm font-bold">سجل #{anomaly._originalIndex}</span>
                      <span className="text-slate-400 text-sm font-bold flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> {anomaly.Invoice_Number}
                      </span>
                    </div>
                    <div className="text-slate-500 text-sm font-bold">
                      {anomaly.Invoice_Date !== 'غير محدد' ? new Date(anomaly.Invoice_Date).toLocaleDateString('ar-SA') : 'تاريخ غير محدد'}
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    <div className="flex-1">
                      <h4 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
                        <User className="w-5 h-5 text-slate-400" /> {anomaly.Entity_Normalized_Name}
                      </h4>
                      <p className="text-slate-600 font-medium line-clamp-1">{anomaly.Item_Description}</p>
                    </div>
                    
                    <div className="flex items-center gap-8 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                      {anomaly.module === 'banks' ? (
                        <>
                          <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">إيداع</p>
                            <p className="text-sm font-bold text-slate-700">{formatCurrency(anomaly.Deposit)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">سحب</p>
                            <p className="text-sm font-bold text-slate-700">{formatCurrency(anomaly.Withdrawal)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">الرصيد</p>
                            <p className="text-sm font-black text-indigo-600">{formatCurrency(anomaly.Balance)}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">الصافي</p>
                            <p className="text-sm font-bold text-slate-700">{formatCurrency(anomaly.Net_Amount)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">الضريبة</p>
                            <p className="text-sm font-bold text-slate-700">{formatCurrency(anomaly.VAT_Amount)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">الإجمالي</p>
                            <p className="text-sm font-black text-indigo-600">{formatCurrency(anomaly.Total_Amount)}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 space-y-2">
                    {(Array.isArray(anomaly.Anomalies) ? anomaly.Anomalies : []).map((msg: string, mIdx: number) => (
                      <div key={mIdx} className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800">
                        <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
                        <p className="font-bold text-sm leading-relaxed">{msg}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
