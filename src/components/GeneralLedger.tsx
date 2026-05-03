import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { FileText, AlertCircle } from 'lucide-react';
import { auth } from '../firebase';

interface LedgerItem {
    account: string;
    totalDebit: number;
    totalCredit: number;
    balance: number;
}

export const GeneralLedger: React.FC = () => {
    const { profile } = useAuth();
    const [entries, setEntries] = useState<LedgerItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [notComputed, setNotComputed] = useState(false);

    useEffect(() => {
        const fetchLedger = async () => {
            if (!profile?.tenantId) return;
            try {
                setLoading(true);
                const token = await auth.currentUser?.getIdToken();
                if (!token) return;
                const res = await fetch('/api/erp/ledger', {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                const json = await res.json();
                
                if (json.error === "QUOTA_BLOCKED" || json.fallback) {
                    setNotComputed(true);
                    setErrorMsg("NO DATA AFTER PROCESSING");
                } else if (json.success && json.data) {
                    const innerData = json.data.data || json.data;
                    if (Array.isArray(innerData)) {
                       if (innerData.length === 0) {
                          setNotComputed(true);
                          setErrorMsg("NO DATA AFTER PROCESSING");
                       } else {
                          setEntries(innerData);
                          setNotComputed(false);
                          setErrorMsg('');
                       }
                    } else if (innerData.reason === 'NOT_COMPUTED') {
                       setNotComputed(true);
                       setErrorMsg("NO DATA AFTER PROCESSING");
                    }
                } else {
                    setErrorMsg(json.message || 'NO DATA AFTER PROCESSING');
                }
            } catch (err) {
                console.error("Error fetching ledger", err);
                setErrorMsg('حدث خطأ أثناء الاتصال بالخادم');
            } finally {
                setLoading(false);
            }
        };
        fetchLedger();
    }, [profile?.tenantId]);

    const handleManualSync = async () => {
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) return;
            await fetch('/api/erp/aggregates/recalculate', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            alert('تم إرسال طلب التحديث بنجاح، يرجى الانتظار وتحديث الصفحة لاحقاً.');
        } catch(e) {
            alert('Failed to trigger recalculation');
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">جاري تحميل دفتر الأستاذ العام...</div>;

    let grandTotalDebit = 0;
    let grandTotalCredit = 0;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[600px]">
            {notComputed && (
                <div className="m-6 bg-yellow-50 text-yellow-800 p-4 rounded-xl border border-yellow-200 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    <div>
                      <p className="font-semibold">تحديث البيانات مطلوب</p>
                      <p className="text-sm opacity-80">{errorMsg || 'Ledger data is out of sync.'}</p>
                    </div>
                  </div>
                  <button onClick={handleManualSync} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition">
                    تحديث البيانات الآن (Sync)
                  </button>
                </div>
            )}
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                        <FileText className="w-6 h-6 text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">الأستاذ العام</h2>
                </div>
            </div>
            
            {errorMsg && (
                <div className="m-6 p-4 bg-rose-50 text-rose-700 rounded-lg flex items-center gap-2 font-medium">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {errorMsg}
                </div>
            )}
            
            <div className="p-0 overflow-x-auto overflow-y-auto max-h-[70vh]">
                <table className="w-full text-right text-sm">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-4 py-3 border-l border-slate-200">الحساب</th>
                            <th className="px-4 py-3 border-l border-slate-200 text-center">إجمالي مدين</th>
                            <th className="px-4 py-3 border-l border-slate-200 text-center">إجمالي دائن</th>
                            <th className="px-4 py-3 text-center">الرصيد</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {(!entries || entries.length === 0) && !errorMsg ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-500">لا توجد حركات</td>
                            </tr>
                        ) : (Array.isArray(entries) ? entries : []).map((row, idx) => {
                            const dD = row.totalDebit || 0;
                            const dC = row.totalCredit || 0;
                            const bal = row.balance || 0;
                            grandTotalDebit += dD;
                            grandTotalCredit += dC;
                            return (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 border-l border-slate-100 font-medium text-slate-700">{row.account || '-'}</td>
                                    <td className="px-4 py-3 border-l border-slate-100 text-center text-rose-600" dir="ltr">{Number(dD.toFixed(2)).toLocaleString()}</td>
                                    <td className="px-4 py-3 border-l border-slate-100 text-center text-emerald-600" dir="ltr">{Number(dC.toFixed(2)).toLocaleString()}</td>
                                    <td className={`px-4 py-3 text-center font-bold ${bal > 0 ? 'text-indigo-600' : bal < 0 ? 'text-rose-600' : 'text-slate-400'}`} dir="ltr">
                                        {Number(bal.toFixed(2)).toLocaleString()}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    {!errorMsg && entries.length > 0 && (
                    <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 sticky bottom-0">
                        <tr>
                            <td className="px-4 py-3 border-l border-slate-200 text-slate-800">الإجمالي</td>
                            <td className="px-4 py-3 border-l border-slate-200 text-center text-rose-600" dir="ltr">{Number(grandTotalDebit.toFixed(2)).toLocaleString()}</td>
                            <td className="px-4 py-3 border-l border-slate-200 text-center text-emerald-600" dir="ltr">{Number(grandTotalCredit.toFixed(2)).toLocaleString()}</td>
                            <td className="px-4 py-3 text-center text-slate-500">-</td>
                        </tr>
                    </tfoot>)}
                </table>
            </div>
        </div>
    );
};
