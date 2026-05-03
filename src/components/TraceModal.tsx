import React from 'react';
import { Search, X, CheckCircle2, ArrowRightLeft, Sparkles, Receipt, Database } from 'lucide-react';
import { motion } from 'motion/react';
import { formatCurrency } from '../lib/financial-utils';

interface TraceModalProps {
  show: boolean;
  data: any[] | null;
  title: string;
  onClose: () => void;
}

export const TraceModal: React.FC<TraceModalProps> = ({ show, data, title, onClose }) => {
  if (!show || !data) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 overflow-y-auto no-print">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">{title} - سجل التتبع والتدقيق</h3>
              <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Financial Traceability & Audit Trail</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          <div className="space-y-4">
            {!Array.isArray(data) ? (
              <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center text-rose-700 font-bold mb-6">
                ⚠️ عذراً، تعذر جلب مسار البيانات: {(data as any)?.error || 'Unknown Error'}
              </div>
            ) : data.length === 0 ? (
              <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-3xl bg-white">
                <Search className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                لا توجد تفاصيل لحركات محاسبية لهذا البند المالي حالياً
              </div>
            ) : (
              data.map((entry: any, idx: number) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-indigo-300 transition-all">
                <div className="p-4 flex justify-between items-center bg-slate-50/50 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black text-slate-400 font-mono">#{idx+1}</span>
                    <div>
                      <p className="font-bold text-slate-800 text-sm max-w-[300px] truncate" title={entry.description}>{entry.description}</p>
                      <p className="text-[10px] text-slate-400">{new Date(entry.date).toLocaleDateString('ar-SA')} | ID: {String(entry.id).substring(0,8)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-black text-slate-800`} dir="ltr">
                      {formatCurrency(entry.amount)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">المبلغ الصافي</p>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Ledger Part */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                       <Database className="w-3 h-3" />
                       القيود المحاسبية
                    </p>
                    <div className="space-y-2">
                       <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                         <span className="text-slate-500">حساب المدين (من):</span>
                         <span className="font-bold text-indigo-700">{entry.debitAccount}</span>
                       </div>
                       <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                         <span className="text-slate-500">حساب الدائن (إلى):</span>
                         <span className="font-bold text-emerald-700">{entry.creditAccount}</span>
                       </div>
                       <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                         <span className="text-slate-500">مبلغ الضريبة:</span>
                         <span className="font-bold text-rose-600">{formatCurrency(entry.taxAmount || 0)}</span>
                       </div>
                    </div>
                  </div>

                  {/* Lineage Part */}
                  <div className="space-y-3">
                     <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                       <Sparkles className="w-3 h-3" />
                       مسار البيانات الأصلي (Audit Trail)
                     </p>
                     <div className="space-y-2">
                        <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                          <span className="text-slate-500">مرجع الفاتورة الأصلية:</span>
                          <span className="font-bold text-slate-800">{entry.originalInvoiceNumber || '-'}</span>
                        </div>
                        <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                          <span className="text-slate-500">الملف المصدري:</span>
                          <span className="font-bold tracking-tight text-slate-800 max-w-[150px] truncate" title={entry.sourceFileId}>{entry.sourceFileId || '-'}</span>
                        </div>
                        <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                          <span className="text-slate-500">تاريخ التوثيق:</span>
                          <span className="font-bold text-slate-800">
                            {entry.timestamp ? new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(entry.timestamp)) : '-'}
                          </span>
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            )))}
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex flex-col">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Audited Transactions</p>
            <p className="text-sm font-black text-slate-800 uppercase">{Array.isArray(data) ? data.length : 0} Records Verified</p>
          </div>
          <button 
            onClick={onClose}
            className="bg-slate-900 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-black transition-colors shadow-lg active:scale-95"
          >
            إغلاق سجل التدقيق
          </button>
        </div>
      </motion.div>
    </div>
  );
};
