import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Building2, 
  User, 
  Bell, 
  Shield, 
  Globe, 
  Save, 
  Loader2, 
  Image as ImageIcon,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { UserManagement } from './UserManagement';
import { Card } from './Card';
import { useUI } from '../contexts/UIContext';
import { AppSettings, getSettings, saveSettings } from '../lib/settings-service';

interface SettingsProps {
  profile: any;
}

export const Settings: React.FC<SettingsProps> = ({ profile }) => {
  const { showAlert, notify } = useUI();
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<AppSettings>({
    companyName: '',
    activity: '',
    taxId: '',
    address: '',
    website: '',
    email: '',
    phone: '',
    preparerName: '',
    currency: 'SAR',
    timezone: 'Asia/Riyadh',
    dateFormat: 'YYYY-MM-DD',
    enableEmailAlerts: true,
    enableSystemAlerts: true,
    sessionTimeout: 30
  });

  useEffect(() => {
    const loadSettings = async () => {
      if (profile?.tenantId) {
        const settings = await getSettings(profile.tenantId);
        setCompanyInfo(settings);
      }
    };
    loadSettings().catch(console.error);
  }, [profile?.tenantId]);

  const isAdmin = profile?.role === 'admin';

  const handleSave = async () => {
    if (!isAdmin) {
      showAlert('تنبيه', 'لا تملك صلاحية تعديل إعدادات النظام. يرجى التواصل مع المسؤول.', 'error');
      return;
    }
    if (!profile?.tenantId) return;
    setLoading(true);
    try {
      await saveSettings(profile.tenantId, companyInfo);
      notify('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      console.error("Failed to save settings", error);
      showAlert('خطأ في الحفظ', 'حدث خطأ أثناء حفظ الإعدادات. يرجى المحاولة مرة أخرى.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'company', label: 'إعدادات المنشأة', icon: Building2 },
    { id: 'notifications', label: 'التنبيهات والإشعارات', icon: Bell },
    { id: 'security', label: 'الأمان والصلاحيات', icon: Shield },
    { id: 'regional', label: 'الإعدادات الإقليمية', icon: Globe },
  ];

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setTimeout(() => {
      const content = document.getElementById('settings-content');
      if (content) content.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'company':
        return (
          <Card className="p-8" id="settings-content">
            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-indigo-500" /> معلومات الشركة
            </h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">اسم المنشأة</label>
                  <input 
                    type="text" 
                    value={companyInfo.companyName}
                    onChange={e => setCompanyInfo({...companyInfo, companyName: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">نشاط الشركة</label>
                  <input 
                    type="text" 
                    value={companyInfo.activity}
                    onChange={e => setCompanyInfo({...companyInfo, activity: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">الرقم الضريبي</label>
                  <input 
                    type="text" 
                    value={companyInfo.taxId}
                    onChange={e => setCompanyInfo({...companyInfo, taxId: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">اسم معد النظام / المهندس</label>
                  <input 
                    type="text" 
                    value={companyInfo.preparerName}
                    onChange={e => setCompanyInfo({...companyInfo, preparerName: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">العنوان</label>
                <input 
                  type="text" 
                  value={companyInfo.address}
                  onChange={e => setCompanyInfo({...companyInfo, address: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">الموقع الإلكتروني</label>
                  <div className="relative">
                    <Globe className="w-5 h-5 text-slate-400 absolute right-3 top-3" />
                    <input 
                      type="text" 
                      value={companyInfo.website}
                      onChange={e => setCompanyInfo({...companyInfo, website: e.target.value})}
                      className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium ltr-text"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">البريد الإلكتروني</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 text-slate-400 absolute right-3 top-3" />
                    <input 
                      type="email" 
                      value={companyInfo.email}
                      onChange={e => setCompanyInfo({...companyInfo, email: e.target.value})}
                      className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium ltr-text"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">رقم الهاتف</label>
                  <div className="relative">
                    <Phone className="w-5 h-5 text-slate-400 absolute right-3 top-3" />
                    <input 
                      type="text" 
                      value={companyInfo.phone}
                      onChange={e => setCompanyInfo({...companyInfo, phone: e.target.value})}
                      className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium ltr-text"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  حفظ إعدادات المنشأة
                </button>
              </div>
            </div>
          </Card>
        );
      case 'account':
        return (
          <Card className="p-8" id="settings-content">
            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <User className="w-6 h-6 text-indigo-500" /> إعدادات الحساب الشخصي
            </h3>
            <div className="space-y-6">
              <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-black">
                  {profile?.email?.[0].toUpperCase()}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{profile?.email}</h4>
                  <p className="text-slate-500 text-sm">{profile?.role === 'admin' ? 'مدير النظام الكامل' : 'مشاهد / مستخدم'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">الاسم المستعار</label>
                  <input type="text" placeholder="اسمك الذي يظهر في التقارير" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">تغيير كلمة المرور</label>
                  <button className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4" /> طلب رابط إعادة التعيين
                  </button>
                </div>
              </div>
            </div>
          </Card>
        );
      case 'notifications':
        return (
          <Card className="p-8" id="settings-content">
            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <Bell className="w-6 h-6 text-indigo-500" /> التنبيهات والإشعارات الذكية
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="font-bold text-slate-800">تنبيهات البريد الإلكتروني</p>
                  <p className="text-xs text-slate-500">استلام تقارير دورية وتنبيهات الأخطاء عبر البريد</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={companyInfo.enableEmailAlerts}
                    onChange={e => setCompanyInfo({...companyInfo, enableEmailAlerts: e.target.checked})}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="font-bold text-slate-800">تنبيهات النظام الداخلية</p>
                  <p className="text-xs text-slate-500">إظهار الإشعارات داخل لوحة التحكم عند اكتشاف تناقضات</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={companyInfo.enableSystemAlerts}
                    onChange={e => setCompanyInfo({...companyInfo, enableSystemAlerts: e.target.checked})}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  حفظ إعدادات التنبيهات
                </button>
              </div>
            </div>
          </Card>
        );
      case 'security':
        return (
          <Card className="p-8" id="settings-content">
            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <Shield className="w-6 h-6 text-indigo-500" /> الأمان والصلاحيات المتقدمة
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">مدة انتهاء الجلسة (بالدقائق)</label>
                <input 
                  type="number" 
                  value={companyInfo.sessionTimeout}
                  onChange={e => setCompanyInfo({...companyInfo, sessionTimeout: parseInt(e.target.value)})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" 
                />
                <p className="text-[10px] text-slate-400">سيتم تسجيل خروج المستخدم تلقائياً بعد هذه المدة من الخمول</p>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800">حماية البيانات</p>
                  <p className="text-xs text-amber-700">يتم تشفير كافة البيانات المالية المرفوعة وتخزينها في خوادم سحابية مؤمنة وفقاً لمعايير ISO 27001.</p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  حفظ إعدادات الأمان
                </button>
              </div>
            </div>
          </Card>
        );
      case 'regional':
        return (
          <Card className="p-8" id="settings-content">
            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <Globe className="w-6 h-6 text-indigo-500" /> الإعدادات الإقليمية واللغة
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">العملة الافتراضية</label>
                  <select 
                    value={companyInfo.currency}
                    onChange={e => setCompanyInfo({...companyInfo, currency: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                  >
                    <option value="SAR">ريال سعودي (SAR)</option>
                    <option value="USD">دولار أمريكي (USD)</option>
                    <option value="AED">درهم إماراتي (AED)</option>
                    <option value="EGP">جنيه مصري (EGP)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">تنسيق التاريخ</label>
                  <select 
                    value={companyInfo.dateFormat}
                    onChange={e => setCompanyInfo({...companyInfo, dateFormat: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                  >
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2025-01-30)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (30/01/2025)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (01/30/2025)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">المنطقة الزمنية</label>
                <select 
                  value={companyInfo.timezone}
                  onChange={e => setCompanyInfo({...companyInfo, timezone: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                >
                  <option value="Asia/Riyadh">(GMT+03:00) الرياض</option>
                  <option value="Asia/Dubai">(GMT+04:00) دبي</option>
                  <option value="Africa/Cairo">(GMT+02:00) القاهرة</option>
                </select>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  حفظ الإعدادات الإقليمية
                </button>
              </div>
            </div>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0">
          <Card className="p-4 sticky top-24">
            <nav className="space-y-1">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                      isActive 
                        ? 'bg-indigo-50 text-indigo-700' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
