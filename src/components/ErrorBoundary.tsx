import React, { ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "حدث خطأ غير متوقع في التطبيق.";
      let isPermissionError = false;

      try {
        if (this.state.error?.message) {
          const parsedError = JSON.parse(this.state.error.message);
          const rawError = String(parsedError.error || '').toLowerCase();
          
          if (rawError.includes('missing or insufficient permissions')) {
            errorMessage = "عذراً، ليس لديك الصلاحيات الكافية لإجراء هذه العملية.";
            isPermissionError = true;
          } else if (rawError.includes('quota exceeded') || rawError.includes('resource-exhausted')) {
            errorMessage = "تم تجاوز الحد اليومي المسموح به لعمليات الكتابة في قاعدة البيانات (Quota Exceeded). يرجى المحاولة مرة أخرى غداً.";
          }
        }
      } catch (e) {
        // Not a JSON error message, use default
        const rawError = this.state.error?.message.toLowerCase() || '';
        if (rawError.includes('missing or insufficient permissions')) {
          errorMessage = "عذراً، ليس لديك الصلاحيات الكافية لإجراء هذه العملية.";
          isPermissionError = true;
        } else if (rawError.includes('quota exceeded') || rawError.includes('resource-exhausted')) {
          errorMessage = "تم تجاوز الحد اليومي المسموح به لعمليات الكتابة في قاعدة البيانات (Quota Exceeded). يرجى المحاولة مرة أخرى غداً.";
        }
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-6 ${isPermissionError ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>
              <ShieldAlert className="w-8 h-8" />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {isPermissionError ? 'صلاحيات غير كافية' : 'حدث خطأ'}
            </h2>
            
            <p className="text-slate-600 mb-8">
              {errorMessage}
            </p>
            
            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 px-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              تحديث الصفحة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
