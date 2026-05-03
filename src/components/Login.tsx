import React from 'react';
import { loginWithGoogle } from '../firebase';
import { Sparkles, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { AppConfig } from '../config/appConfig';

export const Login: React.FC = () => {
  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col justify-center items-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-amber-100/50">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 text-center relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_50%_0%,_#fcd34d_0%,_transparent_70%)]"></div>
          
          <div className="bg-white/5 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-white/10 shadow-inner">
            {AppConfig.logo ? (
              <img src={AppConfig.logo} alt="Logo" className="w-10 h-10 object-contain" />
            ) : (
              <Sparkles className="w-10 h-10 text-amber-300" strokeWidth={1.5} />
            )}
          </div>
          <h1 className="text-3xl font-serif text-white tracking-tight font-bold">{AppConfig.appName}</h1>
          <p className="text-indigo-200 text-sm font-medium whitespace-nowrap mb-2">{AppConfig.appSubtitle}</p>
          {AppConfig.companyName && (
            <p className="text-amber-200/80 text-sm font-medium tracking-widest uppercase mb-1">{AppConfig.companyName}</p>
          )}
        </div>
        
        <div className="p-8">
          <div className="space-y-5 mb-10">
            <div className="flex items-center gap-4 text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="bg-white p-2.5 rounded-xl text-amber-600 shadow-sm border border-slate-100">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-slate-700">نظام آمن ومحمي بصلاحيات وصول</span>
            </div>
            <div className="flex items-center gap-4 text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="bg-white p-2.5 rounded-xl text-amber-600 shadow-sm border border-slate-100">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-slate-700">إدارة ومزامنة ملفات الإكسيل السحابية</span>
            </div>
          </div>

          <button
            onClick={handleLogin}
            className="w-full bg-slate-900 text-white font-medium py-4 px-4 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-lg shadow-slate-900/20 hover:shadow-slate-900/30 active:scale-[0.98]"
          >
            <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>تسجيل الدخول بحساب Google</span>
          </button>
        </div>
      </div>
    </div>
  );
};
