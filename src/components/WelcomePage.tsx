import React from 'react';
import { Sparkles, BarChart3, PieChart, ShieldCheck } from 'lucide-react';
import { AppConfig } from '../config/appConfig';

export const WelcomePage: React.FC<{ companyName?: string, logo?: string | null }> = ({ companyName, logo }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 py-10">
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl p-10 text-center relative overflow-hidden shadow-2xl border border-indigo-500/20">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        
        <div className="relative z-10">
          <div className="bg-white/10 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 backdrop-blur-md border border-white/20 shadow-inner">
            {logo || AppConfig.logo ? (
              <img src={logo || AppConfig.logo || ''} alt="Logo" className="w-12 h-12 object-contain" />
            ) : (
              <Sparkles className="w-12 h-12 text-amber-300" strokeWidth={1.5} />
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-white tracking-tight font-bold">{AppConfig.appName}</h1>
          <p className="text-indigo-200 text-xl font-medium whitespace-nowrap mb-4">{AppConfig.appSubtitle}</p>
          {companyName && (
             <p className="text-amber-300/90 text-lg mb-4 font-medium tracking-wide">
                {companyName}
             </p>
          )}
          <p className="text-indigo-200 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-6">
            المنصة المتكاملة للتحليل المالي والمحاسبي المتقدم. يمكنك تصفح التقارير والإحصائيات من خلال القائمة الجانبية.
          </p>
          <div className="inline-block bg-white/5 border border-white/10 rounded-full px-6 py-2 backdrop-blur-sm">
            <p className="text-amber-300 text-sm md:text-base font-medium italic" dir="ltr">
              "Engineered by a financial expert to solve real-world money management challenges."
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow text-center">
          <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
            <BarChart3 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">تحليل مالي دقيق</h3>
          <p className="text-slate-500 text-sm">استعرض الأداء المالي للمشتريات والمبيعات والرواتب بدقة عالية.</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow text-center">
          <div className="bg-emerald-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600">
            <PieChart className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">تقارير تفصيلية</h3>
          <p className="text-slate-500 text-sm">موازين المراجعة وقوائم الدخل ولوحات الأداء المالي في متناول يدك.</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow text-center">
          <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">بيانات آمنة</h3>
          <p className="text-slate-500 text-sm">تمتع بصلاحيات المشاهدة الآمنة لجميع البيانات المالية المعتمدة.</p>
        </div>
      </div>
    </div>
  );
};
