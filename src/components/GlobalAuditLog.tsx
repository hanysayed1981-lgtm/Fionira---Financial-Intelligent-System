import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, limit, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Loader2, Search, ShieldCheck, Database, Calendar, Edit2, History } from 'lucide-react';
import { useAuth } from '../contexts/AuthProvider';

interface GlobalAuditLogProps {
  appMode: 'expenses' | 'revenues' | 'payroll' | 'banks';
}

export const GlobalAuditLog: React.FC<GlobalAuditLogProps> = ({ appMode }) => {
  const { profile, isAdmin } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  // Edit State
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [editForm, setEditForm] = useState({ debitAccount: '', creditAccount: '', amount: 0, taxAmount: 0, description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // History State
  const [historyEntryId, setHistoryEntryId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchAllLogs = async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch('/api/debug/journalEntries/raw', {
         headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
         let docs = (Array.isArray(data.data) ? data.data : []).filter((d: any) => d.isActive !== false);
         docs.sort((a: any, b: any) => {
            const dateA = a.timestamp || a.date || '';
            const dateB = b.timestamp || b.date || '';
            return new Date(dateB).getTime() - new Date(dateA).getTime();
         });
         setLogs(docs);
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllLogs();
  }, []);

  const handleEditClick = (log: any) => {
    setEditingEntry(log);
    setEditForm({
       debitAccount: log.debitAccount || '',
       creditAccount: log.creditAccount || '',
       amount: log.amount || 0,
       taxAmount: log.taxAmount || 0,
       description: log.description || ''
    });
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!editForm.debitAccount || !editForm.creditAccount || editForm.amount <= 0) {
      setEditError("الحسابات والمبلغ الإيجابي مطلوبة");
      return;
    }
    try {
      setIsSubmitting(true);
      setEditError('');
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/erp/journal/${editingEntry.id}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
         body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
         throw new Error(data.error || data.details || "Failed to update entry");
      }
      setEditingEntry(null);
      fetchAllLogs(); // refresh
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewHistory = async (originalEntryId: string) => {
    setHistoryEntryId(originalEntryId);
    setLoadingHistory(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      // Use the audit-trace API using the originalEntryId (entityId)
      const res = await fetch(`/api/erp/audit-trace/${originalEntryId}`, {
         headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
         setHistoryData(data);
      } else {
         setHistoryData({ data: [], auditLogs: [] });
      }
    } catch (e) {
      setHistoryData({ data: [], auditLogs: [] });
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterType !== 'all' && log.moduleType !== filterType) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return (
        String(log.description || '').toLowerCase().includes(s) ||
        String(log.debitAccount || '').toLowerCase().includes(s) ||
        String(log.creditAccount || '').toLowerCase().includes(s) ||
        String(log.originalInvoiceNumber || '').toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center border border-indigo-200">
              <ShieldCheck className="w-6 h-6 text-indigo-700" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">سجل التتبع والتدقيق الشامل</h2>
              <p className="text-sm font-medium text-slate-500 mt-1">تتبع دقيق ومتقدم لكافة القيم والبيانات المرحلة للنظام</p>
            </div>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button onClick={() => setFilterType('all')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${filterType === 'all' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>الكل</button>
            <button onClick={() => setFilterType('expenses')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${filterType === 'expenses' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>المصروفات</button>
            <button onClick={() => setFilterType('revenues')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${filterType === 'revenues' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>الإيرادات</button>
            <button onClick={() => setFilterType('payroll')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${filterType === 'payroll' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>الرواتب</button>
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث متقدم في السجلات (اسم، وصف، رقم فاتورة)..."
            className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium"
          />
          <Search className="w-5 h-5 text-slate-400 absolute right-4 top-3.5" />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="mr-3 font-medium text-slate-500">جاري تجميع سجلات التدقيق...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Database className="w-12 h-12 mb-3 text-slate-300" />
            <p className="font-medium text-lg">لا توجد سجلات تطابق بحثك</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">الرقم المرجعي</th>
                  <th className="px-4 py-3">المصدر / القسم</th>
                  <th className="px-4 py-3">المستفيد / الجهة</th>
                  <th className="px-4 py-3">البيان الأساسي</th>
                  <th className="px-4 py-3">قبل الضريبة</th>
                  <th className="px-4 py-3">الضريبة</th>
                  <th className="px-4 py-3">الإجمالي</th>
                  <th className="px-4 py-3">تاريخ الإدخال</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{log.originalInvoiceNumber || log.id.substring(0,8)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        log.moduleType === 'expenses' ? 'bg-rose-100 text-rose-700' :
                        log.moduleType === 'revenues' ? 'bg-emerald-100 text-emerald-700' :
                        log.moduleType === 'payroll' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {log.moduleType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700 max-w-[150px] truncate" title={`${log.debitAccount} / ${log.creditAccount}`}>
                      {log.debitAccount} / {log.creditAccount}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={log.description}>
                      {log.description || '-'}
                    </td>
                    <td className="px-4 py-3 font-mono">
                       {(log.amount)?.toLocaleString() || '0'}
                    </td>
                    <td className="px-4 py-3 font-mono text-rose-600">
                       {log.taxAmount?.toLocaleString() || '0'}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">
                       {((log.amount || 0) + (log.taxAmount || 0)).toLocaleString() || '0'}
                    </td>
                     <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                       <div className="flex flex-col items-start gap-1">
                         <div className="flex items-center gap-1.5">
                           <Calendar className="w-3.5 h-3.5" />
                           {log.timestamp ? new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(log.timestamp)) : '-'}
                         </div>
                         {log.version > 1 && (
                           <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 rounded-full inline-block mt-0.5">نسخة v{log.version}</span>
                         )}
                       </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-left">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleViewHistory(log.originalEntryId || log.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors" title="سجل التعديلات">
                          <History className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button onClick={() => handleEditClick(log)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded transition-colors" title="تعديل القيد">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editingEntry && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6" dir="rtl">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-indigo-600" />
              تعديل تفاصيل القيد
            </h3>
            
            {editError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm mb-4">{editError}</div>}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">حساب المدين</label>
                <input type="text" value={editForm.debitAccount} onChange={(e) => setEditForm({...editForm, debitAccount: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring focus:ring-indigo-200 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">حساب الدائن</label>
                <input type="text" value={editForm.creditAccount} onChange={(e) => setEditForm({...editForm, creditAccount: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring focus:ring-indigo-200 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">المبلغ الأساسي</label>
                  <input type="number" step="any" value={editForm.amount} onChange={(e) => setEditForm({...editForm, amount: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg focus:ring focus:ring-indigo-200 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">الضريبة</label>
                  <input type="number" step="any" value={editForm.taxAmount} onChange={(e) => setEditForm({...editForm, taxAmount: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg focus:ring focus:ring-indigo-200 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">البيان الأساسي</label>
                <input type="text" value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring focus:ring-indigo-200 outline-none" />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                 disabled={isSubmitting} 
                 onClick={handleSaveEdit} 
                 className={`flex-1 ${isSubmitting ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold py-2 rounded-xl transition-all shadow-md flex items-center justify-center`}
              >
                 {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'اعتماد التحديثات'}
              </button>
              <button onClick={() => setEditingEntry(null)} disabled={isSubmitting} className="px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl transition-all">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {historyEntryId && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl p-6 max-h-[90vh] flex flex-col" dir="rtl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
               <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                 <History className="w-6 h-6 text-indigo-600" />
                 سجل تدقيق القيد (Audit Trail)
               </h3>
               <button onClick={() => setHistoryEntryId(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-slate-600 text-sm">إغلاق</button>
            </div>
            
            <div className="flex-1 overflow-auto">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-10">
                   <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                   {historyData?.auditLogs?.length > 0 ? (
                      historyData.auditLogs.map((log: any, idx: number) => (
                         <div key={log.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl relative">
                            {idx === 0 && <div className="absolute top-0 right-4 transform -translate-y-1/2 bg-rose-100 text-rose-700 text-xs font-bold px-2 py-0.5 rounded-full">أحدث تعديل</div>}
                            <div className="flex items-center justify-between mb-3 text-sm border-b pb-2">
                               <div className="flex items-center gap-2 font-bold">
                                 <span className={log.action === 'CREATE' ? 'text-emerald-600' : 'text-amber-600'}>{log.action}</span>
                                 <span className="text-slate-400">|</span>
                                 <span className="text-slate-600 font-mono text-xs">{new Date(log.performedAt).toLocaleString('en-GB')}</span>
                               </div>
                               <div className="text-slate-500 text-xs">بواسطة: {log.performedBy}</div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                               {log.action === 'EDIT' && (
                                  <div className="bg-white p-3 rounded border border-rose-100">
                                     <div className="text-rose-600 font-bold mb-2 text-xs">البيانات السابقة (Before)</div>
                                     <pre className="text-xs text-slate-600 overflow-x-auto" dir="ltr">{JSON.stringify(log.before, null, 2)}</pre>
                                  </div>
                               )}
                               <div className={`bg-white p-3 rounded border ${log.action === 'CREATE' ? 'border-emerald-100 col-span-2' : 'border-indigo-100'}`}>
                                  <div className={`${log.action === 'CREATE' ? 'text-emerald-600' : 'text-indigo-600'} font-bold mb-2 text-xs`}>البيانات الحالية (After)</div>
                                  <pre className="text-xs text-slate-600 overflow-x-auto" dir="ltr">{JSON.stringify(log.after, null, 2)}</pre>
                               </div>
                            </div>
                         </div>
                      ))
                   ) : (
                      <div className="text-center py-10 text-slate-500">لا توجد سجلات تعديل متاحة</div>
                   )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
