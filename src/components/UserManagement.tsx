import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where } from 'firebase/firestore';
import { Shield, ShieldAlert, User, Trash2, Loader2, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'accountant' | 'viewer';
  tenantId: string;
  createdAt: string;
  permissions?: string[];
}

const AVAILABLE_MODULES = [
  { id: 'expenses', label: 'المصروفات' },
  { id: 'revenues', label: 'الإيرادات' },
  { id: 'payroll', label: 'الرواتب' },
  { id: 'banks', label: 'البنوك' },
  { id: 'reports', label: 'التقارير' },
  { id: 'smart_invoice', label: 'مولد الفاتورة الذكي' }
];

export const UserManagement: React.FC = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role === 'admin' && profile?.tenantId) {
      fetchUsers().catch((err) => console.warn("Expected API rejection caught:", err));
    }
  }, [profile]);

  const fetchUsers = async () => {
    if (!profile) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch('/api/erp/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setUsers(Array.isArray(data.data) ? data.data : []);
      } else {
        setError(data.error || "فشل جلب المستخدمين");
      }
    } catch (e: any) {
      setError(e.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (uid: string, newRole: 'admin' | 'accountant' | 'viewer') => {
    if (!profile) return;
    try {
      setLoading(true);
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/erp/users/promote', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetUid: uid, role: newRole })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("تم تحديث الصلاحية بنجاح");
        await fetchUsers();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(data.error || "فشل تحديث الصلاحية");
      }
    } catch (e: any) {
      setError(e.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (uid: string, moduleId: string, currentPermissions: string[]) => {
    const userToEdit = users.find(u => u.uid === uid);
    if (!userToEdit) return;
    
    let newPermissions = [...currentPermissions];
    if (newPermissions.includes(moduleId)) {
      newPermissions = newPermissions.filter(p => p !== moduleId);
    } else {
      newPermissions.push(moduleId);
    }
    
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/erp/users/promote', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetUid: uid, role: userToEdit.role, permissions: newPermissions })
      });
      const data = await res.json();
      if (data.success) {
        await fetchUsers();
      }
    } catch (e: any) {
      setError(e.message || "فشل تحديث الأقسام");
    }
  };

  const deleteUser = async (uid: string) => {
    if (!profile) return;
    try {
      setLoading(true);
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/erp/users/${uid}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("تم حذف المستخدم بنجاح");
        await fetchUsers();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(data.error || "فشل حذف المستخدم");
      }
    } catch (e: any) {
      setError(e.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 bg-rose-50 rounded-2xl border border-rose-100 max-w-md">
          <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">غير مصرح</h2>
          <p className="text-slate-600">هذه الصفحة مخصصة لمديري النظام فقط.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl w-full mx-auto p-8 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-8 bg-slate-800 text-center">
          <h1 className="text-3xl font-extrabold text-white mb-2 flex items-center justify-center gap-3">
            <Shield className="w-8 h-8 text-indigo-400" />
            إدارة المستخدمين والصلاحيات
          </h1>
          <p className="text-slate-300 font-medium">تحكم في من يمكنه الوصول للتطبيق وتحديد الأقسام لكل مستخدم</p>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          
          {successMsg && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <p>{successMsg}</p>
            </div>
          )}

          {loading && users.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((u) => (
                <div key={u.uid} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0 text-lg ${u.role === 'admin' ? 'bg-indigo-500' : 'bg-slate-400'}`}>
                        {u.email?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-lg" dir="ltr">{u.email}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-500">انضم: {new Date(u.createdAt).toLocaleDateString('ar-EG')}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                            {u.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                            {u.role === 'admin' ? 'مدير نظام' : 'مشاهد'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 sm:ml-auto">
                      <select
                        value={u.role}
                        onChange={(e) => updateUserRole(u.uid, e.target.value as 'admin' | 'accountant' | 'viewer')}
                        disabled={u.uid === profile?.uid || loading}
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        <option value="viewer">مشاهد</option>
                        <option value="accountant">محاسب</option>
                        <option value="admin">مدير نظام</option>
                      </select>
                      
                      <button
                        onClick={() => setExpandedUser(expandedUser === u.uid ? null : u.uid)}
                        className={`p-2.5 rounded-xl transition-colors flex items-center gap-2 font-medium text-sm ${expandedUser === u.uid ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                      >
                        الأقسام المسموحة
                        {expandedUser === u.uid ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => setUserToDelete(u.uid)}
                        disabled={u.uid === profile?.uid || loading}
                        className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="حذف المستخدم"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Permissions Panel */}
                  {expandedUser === u.uid && (
                    <div className="p-6 bg-slate-50 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                      <h4 className="text-sm font-bold text-slate-700 mb-4">تحديد الأقسام التي يمكن للمستخدم رؤيتها:</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {AVAILABLE_MODULES.map(module => {
                          const isAllowed = u.permissions?.includes(module.id) ?? true;
                          const isAdmin = u.role === 'admin';
                          return (
                            <label 
                              key={module.id} 
                              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                isAdmin ? 'opacity-60 cursor-not-allowed bg-slate-100 border-slate-200' :
                                isAllowed ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-300'
                              }`}
                            >
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                checked={isAdmin ? true : isAllowed}
                                disabled={isAdmin || u.uid === profile?.uid || loading}
                                onChange={() => togglePermission(u.uid, module.id, u.permissions || AVAILABLE_MODULES.map(m => m.id))}
                              />
                              <span className={`text-sm font-bold ${isAllowed || isAdmin ? 'text-indigo-900' : 'text-slate-600'}`}>
                                {module.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      {u.role === 'admin' && (
                        <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          مدير النظام لديه صلاحية الوصول لجميع الأقسام افتراضياً.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-2">تأكيد الحذف</h3>
            <p className="text-slate-600 mb-6">هل أنت متأكد من حذف هذا المستخدم؟ لن يتمكن من الدخول للتطبيق مرة أخرى.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  deleteUser(userToDelete);
                  setUserToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-lg font-bold transition-colors"
              >
                حذف نهائي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
