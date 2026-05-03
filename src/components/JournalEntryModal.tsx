import React from 'react';
import { X, FileText, ArrowLeftRight } from 'lucide-react';
import { FinancialRecord } from '../types';
import { generateJournalEntries, JournalEntry } from '../backend/core/erp-engine';
import { formatCurrency } from '../lib/financial-utils';

interface JournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: FinancialRecord | null;
  appMode: 'expenses' | 'revenues' | 'payroll' | 'banks';
}

export const JournalEntryModal: React.FC<JournalEntryModalProps> = ({
  isOpen,
  onClose,
  record,
  appMode
}) => {
  if (!isOpen || !record) return null;

  const entries: JournalEntry[] = generateJournalEntries([record], appMode);
  
  if (!entries || entries.length === 0) return null;
  const entry = entries[0]; // Currently we return 1 consolidated entry per record in erp-engine

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-lg">القيود المحاسبية الآلية</h3>
              <p className="text-xs text-slate-500">تم توليد القيد تلقائياً بناءً على بيانات {record.Invoice_Number ? `الفاتورة رقم ${record.Invoice_Number}` : 'المستند'}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500 ml-2">رقم المستند:</span>
                <span className="font-bold text-slate-800">{record.Invoice_Number || 'غير متوفر'}</span>
              </div>
              <div>
                <span className="text-slate-500 ml-2">التاريخ:</span>
                <span className="font-bold text-slate-800">{record.Invoice_Date || entry.date}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 ml-2">البيان:</span>
                <span className="font-bold text-slate-800">{entry.description}</span>
              </div>
            </div>
          </div>

          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white rounded-t-lg">
                <th className="px-4 py-3 font-bold text-sm rounded-tr-lg">الحساب</th>
                <th className="px-4 py-3 font-bold text-sm text-center w-32">مدين</th>
                <th className="px-4 py-3 font-bold text-sm text-center w-32 rounded-tl-lg">دائن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 border-x border-b border-slate-200">
              {appMode === 'revenues' ? (
                <>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-bold text-indigo-700">{entry.debitAccount}</td>
                    <td className="px-4 py-4 text-center font-bold text-emerald-600 bg-emerald-50/30" dir="ltr">{formatCurrency(entry.amount + entry.taxAmount)}</td>
                    <td className="px-4 py-4 text-center text-slate-400" dir="ltr">-</td>
                  </tr>
                  {entry.taxAmount > 0 && (
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-4 font-bold text-rose-700 mr-8 flex items-center gap-2">
                        <span className="w-4 h-[1px] bg-slate-300 inline-block"></span>
                        ضريبة القيمة المضافة (المحصلة)
                      </td>
                      <td className="px-4 py-4 text-center text-slate-400" dir="ltr">-</td>
                      <td className="px-4 py-4 text-center font-bold text-rose-600 bg-rose-50/30" dir="ltr">{formatCurrency(entry.taxAmount)}</td>
                    </tr>
                  )}
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-bold text-rose-700 mr-8 flex items-center gap-2">
                      <span className="w-4 h-[1px] bg-slate-300 inline-block"></span>
                      {entry.creditAccount}
                    </td>
                    <td className="px-4 py-4 text-center text-slate-400" dir="ltr">-</td>
                    <td className="px-4 py-4 text-center font-bold text-rose-600 bg-rose-50/30" dir="ltr">{formatCurrency(entry.amount)}</td>
                  </tr>
                </>
              ) : (
                <>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-bold text-indigo-700">{entry.debitAccount}</td>
                    <td className="px-4 py-4 text-center font-bold text-emerald-600 bg-emerald-50/30" dir="ltr">{formatCurrency(entry.amount)}</td>
                    <td className="px-4 py-4 text-center text-slate-400" dir="ltr">-</td>
                  </tr>
                  {entry.taxAmount > 0 && (
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-4 font-bold text-indigo-700">ضريبة القيمة المضافة (المدفوعة)</td>
                      <td className="px-4 py-4 text-center font-bold text-emerald-600 bg-emerald-50/30" dir="ltr">{formatCurrency(entry.taxAmount)}</td>
                      <td className="px-4 py-4 text-center text-slate-400" dir="ltr">-</td>
                    </tr>
                  )}
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-bold text-rose-700 mr-8 flex items-center gap-2">
                      <span className="w-4 h-[1px] bg-slate-300 inline-block"></span>
                      {entry.creditAccount}
                    </td>
                    <td className="px-4 py-4 text-center text-slate-400" dir="ltr">-</td>
                    <td className="px-4 py-4 text-center font-bold text-rose-600 bg-rose-50/30" dir="ltr">{formatCurrency(entry.amount + entry.taxAmount)}</td>
                  </tr>
                </>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-x border-b border-slate-200">
                <td className="px-4 py-3 font-black text-slate-800">الإجمالي</td>
                <td className="px-4 py-3 text-center font-black text-slate-800" dir="ltr">{formatCurrency(entry.amount + entry.taxAmount)}</td>
                <td className="px-4 py-3 text-center font-black text-slate-800" dir="ltr">{formatCurrency(entry.amount + entry.taxAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
