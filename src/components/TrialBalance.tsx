import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { auth } from '../firebase';
import { JournalEntry } from '../backend/core/erp-engine';
import { Scale, FileText } from 'lucide-react';

interface TrialBalanceProps {
    onNavigateToTab?: (tab: string, anchor?: string, search?: string, targetMode?: string) => void;
}

export const TrialBalance: React.FC<TrialBalanceProps> = ({ onNavigateToTab }) => {
    const { profile } = useAuth();
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEntries = async () => {
            if (!profile?.tenantId) return;
            try {
                setLoading(true);
                const token = await auth.currentUser?.getIdToken();
                if (!token) return;
                const res = await fetch('/api/debug/journalEntries/raw', {
                   headers: { 'Authorization': `Bearer ${token}` }
                });
                const json = await res.json();
                if (res.ok && json.success) {
                   setEntries((Array.isArray(json.data) ? json.data : []).filter((d: any) => d.isActive !== false));
                } else {
                   setEntries([]);
                }
            } catch (err) {
                console.error("Error fetching journal entries", err);
            } finally {
                setLoading(false);
            }
        };
        fetchEntries();
    }, [profile?.tenantId]);

    if (loading) return <div className="p-8 text-center text-slate-500">جاري تحميل ميزان المراجعة...</div>;

    const balances: Record<string, { debit: number; credit: number; balance: number }> = {};

    entries.forEach(e => {
        if (!balances[e.debitAccount]) balances[e.debitAccount] = { debit: 0, credit: 0, balance: 0 };
        if (!balances[e.creditAccount]) balances[e.creditAccount] = { debit: 0, credit: 0, balance: 0 };

        balances[e.debitAccount].debit += e.amount;
        balances[e.creditAccount].credit += e.amount;

        // If tax exists, tax goes to debit for expense, credit for revenue
        if (e.taxAmount > 0) {
           if (e.moduleType === 'expenses') {
               if (!balances['ضريبة المدخلات (VAT Input)']) balances['ضريبة المدخلات (VAT Input)'] = { debit: 0, credit: 0, balance: 0 };
               balances['ضريبة المدخلات (VAT Input)'].debit += e.taxAmount;
               balances[e.creditAccount].credit += e.taxAmount;
           } else if (e.moduleType === 'revenues') {
               if (!balances['ضريبة المخرجات (VAT Output)']) balances['ضريبة المخرجات (VAT Output)'] = { debit: 0, credit: 0, balance: 0 };
               balances['ضريبة المخرجات (VAT Output)'].credit += e.taxAmount;
               balances[e.debitAccount].debit += e.taxAmount;
           } else {
               // Fallback if payroll/banks have tax
               if (!balances['الضرائب']) balances['الضرائب'] = { debit: 0, credit: 0, balance: 0 };
               balances['الضرائب'].debit += e.taxAmount;
               balances[e.creditAccount].credit += e.taxAmount;
           }
        }
    });

    let totalDebit = 0;
    let totalCredit = 0;

    const accountList = Object.keys(balances).map(account => {
        const d = balances[account].debit;
        const c = balances[account].credit;
        totalDebit += d;
        totalCredit += c;
        const bal = d - c;
        return { account, debit: d, credit: c, balance: bal };
    }).sort((a,b) => a.account.localeCompare(b.account));

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                        <Scale className="w-6 h-6 text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">ميزان المراجعة</h2>
                </div>
            </div>
            
            <div className="p-6 overflow-x-auto">
                <table className="w-full text-right text-sm">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 border-l border-slate-200">الحساب</th>
                            <th className="px-4 py-3 border-l border-slate-200 text-center">مدين</th>
                            <th className="px-4 py-3 border-l border-slate-200 text-center">دائن</th>
                            <th className="px-4 py-3 text-center">الرصيد</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {accountList.map((row, idx) => {
                            let targetTab = 'grouped_purchases';
                            let targetMode = 'expenses';
                            if (row.account.includes('إيرادات') || row.account.includes('مبيعات') || row.account.includes('العملاء')) {
                                targetMode = 'revenues';
                            } else if (row.account.includes('رواتب') || row.account.includes('أجور') || row.account.includes('مستحقة')) {
                                targetTab = 'monthly_payroll';
                                targetMode = 'payroll';
                            } else if (row.account.includes('بنك') || row.account.includes('نقد') || row.account.includes('صندوق')) {
                                targetMode = 'banks';
                            }
                            return (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => onNavigateToTab?.(targetTab, undefined, row.account, targetMode)}>
                                <td className="px-4 py-3 border-l border-slate-100 font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">{row.account}</td>
                                <td className="px-4 py-3 border-l border-slate-100 text-center text-rose-600" dir="ltr">{Number(row.debit.toFixed(2)).toLocaleString()}</td>
                                <td className="px-4 py-3 border-l border-slate-100 text-center text-emerald-600" dir="ltr">{Number(row.credit.toFixed(2)).toLocaleString()}</td>
                                <td className={`px-4 py-3 text-center font-bold ${row.balance > 0 ? 'text-rose-600' : row.balance < 0 ? 'text-emerald-600' : 'text-slate-400'}`} dir="ltr">
                                    {Number(Math.abs(row.balance).toFixed(2)).toLocaleString()} {row.balance > 0 ? '(مدين)' : row.balance < 0 ? '(دائن)' : ''}
                                </td>
                            </tr>
                        )})}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                        <tr>
                            <td className="px-4 py-4 border-l border-slate-200 text-slate-800">الإجمالي المطابق</td>
                            <td className="px-4 py-4 border-l border-slate-200 text-center text-rose-700" dir="ltr">{Number(totalDebit.toFixed(2)).toLocaleString()}</td>
                            <td className="px-4 py-4 border-l border-slate-200 text-center text-emerald-700" dir="ltr">{Number(totalCredit.toFixed(2)).toLocaleString()}</td>
                            <td className="px-4 py-4 text-center text-slate-500">-</td>
                        </tr>
                    </tfoot>
                </table>
                {Math.abs(totalDebit - totalCredit) > 0.05 && (
                    <div className="mt-4 p-4 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 flex items-center justify-between">
                        <strong>تنبيه: محصلة الميزان غير متطابقة!</strong>
                        <span dir="ltr">Difference: {Number(Math.abs(totalDebit - totalCredit).toFixed(2))}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
