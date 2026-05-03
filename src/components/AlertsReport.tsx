import React from 'react';
import { Card } from './Card';
import { AlertTriangle, Info, CheckCircle, Search } from 'lucide-react';

interface AlertsReportProps {
  anomaliesSummary: { name: string; count: number }[];
  appMode: string;
}

export const AlertsReport: React.FC<AlertsReportProps> = ({ anomaliesSummary, appMode }) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredAlerts = anomaliesSummary.filter(alert => 
    alert.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAnomalies = anomaliesSummary.reduce((sum, a) => sum + a.count, 0);

  const getAlertIcon = (type: string) => {
    if (type.includes('مكررة')) return <AlertTriangle className="w-6 h-6 text-amber-500" />;
    if (type.includes('خطأ')) return <AlertTriangle className="w-6 h-6 text-rose-500" />;
    return <Info className="w-6 h-6 text-blue-500" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="البحث في التنبيهات والملاحظات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-12 pl-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-black">
            إجمالي التنبيهات: {totalAnomalies}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert, idx) => {
            const percentage = totalAnomalies > 0 ? ((alert.count / totalAnomalies) * 100).toFixed(1) : '0';
            return (
              <Card key={idx} className="p-6 hover:shadow-md transition-all border-r-4 border-r-indigo-500 flex flex-col justify-between">
                <div className="flex items-start gap-4 mb-4">
                  <div className="mt-1 p-3 bg-slate-50 rounded-xl">
                    {getAlertIcon(alert.name)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-slate-900 text-lg leading-tight mb-2">{alert.name}</h4>
                    <div className="flex items-center gap-3 text-sm font-bold">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg">
                        العدد: {alert.count}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
            <CheckCircle className="w-16 h-16 text-emerald-200 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-900 mb-2">لا توجد تنبيهات حالياً</h3>
            <p className="text-slate-500 font-bold">تم فحص كافة البيانات ولم يتم العثور على أي ملاحظات أو أخطاء برمجية.</p>
          </div>
        )}
      </div>
    </div>
  );
};
