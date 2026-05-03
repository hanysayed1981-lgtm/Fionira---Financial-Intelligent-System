import React, { useState, useMemo } from 'react';
import { Card } from './Card';
import { Coins, ArrowUpCircle, ArrowDownCircle, TrendingUp, Search, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { TraceModal } from './TraceModal';
import { formatCurrency } from '../lib/financial-utils';

interface CashFlowProps {
  data: {
    revenues: number;
    expenses: number;
    payroll: number;
  };
  tenantId?: string;
  allRecords?: any[];
  onNavigateToTab?: (tab: string, anchor?: string, search?: string, targetMode?: string) => void;
}

export const CashFlow: React.FC<CashFlowProps> = ({ data, tenantId, allRecords = [], onNavigateToTab }) => {
  const [traceData, setTraceData] = useState<any[] | null>(null);
  const [showTraceModal, setShowTraceModal] = useState(false);
  const [isTracing, setIsTracing] = useState(false);
  const [traceTitle, setTraceTitle] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const revenuesByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    allRecords.forEach(r => {
      if (r.__Type === 'Revenue') {
        const cat = r.Category || 'مقبوضات غير مصنفة';
        cats[cat] = (cats[cat] || 0) + Math.abs(r.Total_Amount || 0);
      }
    });
    return Object.entries(cats).sort((a,b) => b[1] - a[1]);
  }, [allRecords]);

  const expensesByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    allRecords.forEach(r => {
      if (r.__Type === 'Expense' || r.__Type === 'Payroll') {
        const cat = r.__Type === 'Payroll' ? 'الرواتب والأجور' : (r.Category || 'مدفوعات غير مصنفة');
        cats[cat] = (cats[cat] || 0) + Math.abs(r.Total_Amount || 0);
      }
    });
    return Object.entries(cats).sort((a,b) => b[1] - a[1]);
  }, [allRecords]);

  const toggleNode = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleFetchTrace = async (accountName: string, displayTitle: string) => {
    setIsTracing(true);
    setTraceTitle(displayTitle);
    
    // Simulate slight loading delay for UX
    await new Promise(res => setTimeout(res, 300));
    
    try {
      let filtered: any[] = [];
      
      if (displayTitle === 'إجمالي المقبوضات النقدية') {
        filtered = allRecords.filter(r => r.__Type === 'Revenue');
      } else if (displayTitle === 'إجمالي المدفوعات النقدية') {
        filtered = allRecords.filter(r => r.__Type === 'Expense' || r.__Type === 'Payroll');
      }
      
      // Transform records to the trace payload format expected by TraceModal
      const tracePayload = filtered.map((r, i) => ({
        id: r.id || `T-${i}`,
        date: r.Invoice_Date || new Date().toISOString(),
        description: r.Description || r.Category || 'حركة مسجلة',
        amount: Math.abs(r.Total_Amount || 0),
        type: displayTitle === 'إجمالي المقبوضات النقدية' ? 'CREDIT' : 'DEBIT',
        sourceFile: r.Lineage?.sourceFile || 'مدخل يدوي',
        systemMetadata: {
            Entity: r.Entity_Normalized_Name,
            Category: r.Category
        }
      }));

      setTraceData(tracePayload.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setShowTraceModal(true);
    } catch (err) {
      console.error("Trace fetch error:", err);
      setTraceData([]);
      setShowTraceModal(true);
    } finally {
      setIsTracing(false);
    }
  };

  const cashIn = data.revenues;
  const cashOut = (data.expenses + data.payroll);
  const netCashFlow = cashIn - cashOut;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-emerald-50 border-emerald-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <ArrowUpCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-600">التدفقات النقدية الداخلة</p>
              <p className="text-2xl font-black text-slate-900">{formatCurrency(cashIn)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-rose-50 border-rose-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <ArrowDownCircle className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-rose-600">التدفقات النقدية الخارجة</p>
              <p className="text-2xl font-black text-slate-900">{formatCurrency(cashOut)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-indigo-50 border-indigo-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-indigo-600">صافي التدفق النقدي</p>
              <p className="text-2xl font-black text-slate-900">{formatCurrency(netCashFlow)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-8">
        <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2 border-b pb-4">
          <Coins className="w-6 h-6 text-emerald-500" /> تفاصيل التدفقات النقدية التشغيلية
        </h3>
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-black text-slate-800 text-lg">التدفقات النقدية من الأنشطة التشغيلية</h4>
            {/* المقبوضات */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div 
                className="flex justify-between items-center p-4 bg-slate-50 cursor-pointer hover:bg-emerald-50 transition-colors group"
                onClick={(e) => toggleNode('cash-in', e)}
              >
                <div className="flex items-center gap-3">
                  {expandedNodes['cash-in'] ? <ChevronUp className="w-5 h-5 text-emerald-600" /> : <ChevronDown className="w-5 h-5 truncate text-slate-400" />}
                  <span className="font-bold text-slate-800 flex items-center gap-2">
                    إجمالي المقبوضات النقدية
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black text-emerald-600">+{formatCurrency(cashIn)}</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleFetchTrace('Cash and Bank', 'إجمالي المقبوضات النقدية'); }}
                    className="p-2 hover:bg-emerald-100 rounded-full transition-colors text-slate-400 hover:text-emerald-600"
                    title="سجل التتبع والتدقيق"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {expandedNodes['cash-in'] && revenuesByCategory.length > 0 && (
                <div className="bg-white px-4 py-2 border-t border-slate-100">
                  {revenuesByCategory.map(([cat, amount], idx) => (
                    <div 
                      key={idx} 
                      className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0 pl-8 cursor-pointer hover:bg-slate-50 transition-colors group"
                      onClick={() => onNavigateToTab?.('grouped_purchases', undefined, cat, 'revenues')}
                    >
                      <div className="flex items-center gap-2 text-sm text-slate-600 group-hover:text-indigo-600 transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        {cat}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-800">{formatCurrency(amount as number)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* المدفوعات */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden mt-4">
              <div 
                className="flex justify-between items-center p-4 bg-slate-50 cursor-pointer hover:bg-rose-50 transition-colors group"
                onClick={(e) => toggleNode('cash-out', e)}
              >
                <div className="flex items-center gap-3">
                  {expandedNodes['cash-out'] ? <ChevronUp className="w-5 h-5 text-rose-600" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  <span className="font-bold text-slate-800 flex items-center gap-2">
                    إجمالي المدفوعات النقدية
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black text-rose-600">-{formatCurrency(cashOut)}</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleFetchTrace('Cash and Bank', 'إجمالي المدفوعات النقدية'); }}
                    className="p-2 hover:bg-rose-100 rounded-full transition-colors text-slate-400 hover:text-rose-600"
                    title="سجل التتبع والتدقيق"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expandedNodes['cash-out'] && expensesByCategory.length > 0 && (
                <div className="bg-white px-4 py-2 border-t border-slate-100">
                  {expensesByCategory.map(([cat, amount], idx) => (
                    <div 
                      key={idx} 
                      className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0 pl-8 cursor-pointer hover:bg-slate-50 transition-colors group"
                      onClick={() => onNavigateToTab?.(cat === 'الرواتب والأجور' ? 'monthly_payroll' : 'grouped_purchases', undefined, cat, cat === 'الرواتب والأجور' ? 'payroll' : 'expenses')}
                    >
                      <div className="flex items-center gap-2 text-sm text-slate-600 group-hover:text-indigo-600 transition-colors">
                         <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                         {cat}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-800">{formatCurrency(amount as number)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="pt-6 border-t flex justify-between items-center">
            <span className="text-xl font-black text-slate-900">صافي التدفق النقدي من الأنشطة التشغيلية</span>
            <span className={`text-2xl font-black ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(netCashFlow)}
            </span>
          </div>
        </div>
      </Card>
      
      <TraceModal 
        show={showTraceModal}
        data={traceData}
        title={traceTitle}
        onClose={() => setShowTraceModal(false)}
      />

      {isTracing && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[250] flex items-center justify-center pointer-events-none">
           <div className="bg-white p-6 rounded-2xl shadow-2xl flex items-center gap-4 animate-in zoom-in-95">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-100 border-t-indigo-600"></div>
              <p className="font-black text-slate-800">جاري تجميع سلالة البيانات...</p>
           </div>
        </div>
      )}
      
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-blue-800 text-sm font-bold">
        ملاحظة: هذا التقرير يعتمد على الأساس النقدي (Cash Basis) للبيانات المرفوعة، ويفترض أن جميع الفواتير المسجلة قد تم دفعها أو تحصيلها خلال الفترة.
      </div>
    </div>
  );
};
