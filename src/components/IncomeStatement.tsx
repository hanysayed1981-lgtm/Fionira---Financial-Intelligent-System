/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Layers, ChevronUp, ChevronDown, Search, X, AlertCircle, CheckCircle2, ArrowRightLeft, Sparkles } from 'lucide-react';
import { formatCurrency, buildHierarchy, HierarchyNode } from '../lib/financial-utils';
import { TraceModal } from './TraceModal';

interface IncomeStatementProps {
  incomeStatement: any;
  onNavigateToTab?: (tab: string, anchor?: string, search?: string, targetMode?: string) => void;
  tenantId?: string;
  allRecords?: any[];
}

export const IncomeStatement: React.FC<IncomeStatementProps> = ({ incomeStatement, onNavigateToTab, tenantId, allRecords = [] }) => {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [traceData, setTraceData] = useState<any[] | null>(null);
  const [showTraceModal, setShowTraceModal] = useState(false);
  const [isTracing, setIsTracing] = useState(false);
  const [traceTitle, setTraceTitle] = useState('');

  const handleFetchTrace = async (accountName: string, displayTitle: string) => {
    setIsTracing(true);
    setTraceTitle(displayTitle);
    
    // Simulate slight loading delay for UX
    await new Promise(res => setTimeout(res, 300));
    
    try {
      let filtered: any[] = [];
      
      if (accountName === 'Sales Revenue') {
        filtered = allRecords.filter(r => r.__Type === 'Revenue');
      } else if (accountName === 'Cost of Goods Sold') {
        filtered = allRecords.filter(r => r.__Type === 'Expense' && (r.Category?.includes('تكلفة') || r.Category?.includes('مشتريات') || r.Category?.includes('بضاعة')));
      } else if (accountName === 'Operating Expenses') {
        filtered = allRecords.filter(r => (r.__Type === 'Expense' || r.__Type === 'Payroll') && !(r.Category?.includes('تكلفة') || r.Category?.includes('مشتريات') || r.Category?.includes('بضاعة')));
      } else {
        // Fallback filter by exact category name
        filtered = allRecords.filter(r => r.Category === accountName);
      }
      
      // Transform records to the trace payload format expected by TraceModal
      const tracePayload = filtered.map((r, i) => ({
        id: r.id || `T-${i}`,
        date: r.Invoice_Date || new Date().toISOString(),
        description: r.Description || r.Category || 'حركة مسجلة',
        amount: Math.abs(r.Total_Amount || 0),
        type: accountName === 'Sales Revenue' || r.Type === 'Revenue' ? 'CREDIT' : 'DEBIT',
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
      // Fallback
      setTraceData([]);
      setShowTraceModal(true);
    } finally {
      setIsTracing(false);
    }
  };

  const toggleNode = (fullName: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [fullName]: !prev[fullName]
    }));
  };

  const handleNavigate = (nodeName: string) => {
    if (!onNavigateToTab) return;
    
    // Logic to determine which tab to go to based on node name
    if (nodeName.includes('إيرادات') || nodeName.includes('مبيعات')) {
      onNavigateToTab('grouped_purchases', undefined, nodeName, 'revenues');
    } else if (nodeName.includes('رواتب') || nodeName.includes('أجور')) {
      onNavigateToTab('monthly_payroll', undefined, nodeName, 'payroll');
    } else {
      onNavigateToTab('grouped_purchases', undefined, nodeName, 'expenses');
    }
  };

  const renderHierarchy = (nodes: Record<string, HierarchyNode>, level: number = 0, colorClass: string = 'slate') => {
    return Object.values(nodes).map((node, idx) => {
      const isExpanded = expandedNodes[node.fullName];
      const hasChildren = node.children && Object.keys(node.children).length > 0;

      return (
        <div key={idx} className="w-full">
          <div 
            className={`flex justify-between items-center px-6 py-3 hover:bg-slate-50 transition-colors text-sm cursor-pointer border-b border-slate-100 last:border-b-0 group`}
            onClick={() => hasChildren ? toggleNode(node.fullName) : handleNavigate(node.name)}
            style={{ paddingRight: `${level * 24 + 24}px` }}
          >
            <div className="flex items-center gap-2">
              {hasChildren && (
                <div className="text-slate-400">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              )}
              <span className={`${level === 0 ? 'font-bold text-slate-800' : 'text-slate-700 font-medium'} ${!hasChildren ? 'group-hover:text-indigo-600 group-hover:underline' : ''}`}>
                {node.name}
              </span>
            </div>
            <span className={`${level === 0 ? 'font-black text-slate-900' : 'font-bold text-slate-800'}`} dir="ltr">
              {formatCurrency(node.totalSpend)}
            </span>
          </div>
          {isExpanded && hasChildren && (
            <div className="bg-slate-50/30">
              {renderHierarchy(node.children, level + 1, colorClass)}
            </div>
          )}
        </div>
      );
    });
  };

  const revHierarchy = buildHierarchy((incomeStatement.fullRevBreakdown || incomeStatement.revBreakdown).map(([name, totalSpend]: [string, number]) => ({ name, totalSpend, invoiceCount: 0, totalTaxable: 0, totalNonTaxable: 0, totalVAT: 0, invoices: [] })));
  const cogsHierarchy = buildHierarchy((incomeStatement.fullCogsBreakdown || incomeStatement.cogsBreakdown).map(([name, totalSpend]: [string, number]) => ({ name, totalSpend, invoiceCount: 0, totalTaxable: 0, totalNonTaxable: 0, totalVAT: 0, invoices: [] })));
  const opexHierarchy = buildHierarchy((incomeStatement.fullOpexBreakdown || incomeStatement.opexBreakdown).map(([name, totalSpend]: [string, number]) => ({ name, totalSpend, invoiceCount: 0, totalTaxable: 0, totalNonTaxable: 0, totalVAT: 0, invoices: [] })));

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300 pb-10">
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div 
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-300 transition-all group"
              onClick={() => handleFetchTrace('Sales Revenue', 'إجمالي الإيرادات')}
            >
                <div className="flex justify-between items-start">
                  <p className="text-slate-500 text-xs font-bold mb-1">إجمالي الإيرادات التشغيلية</p>
                  <Search className="w-3 h-3 text-slate-300 group-hover:text-emerald-500" />
                </div>
                <h3 className="text-xl font-black text-emerald-600" dir="ltr">{formatCurrency(incomeStatement.totalRevenue)}</h3>
            </div>
            <div 
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-rose-300 transition-all group"
              onClick={() => handleFetchTrace('Cost of Goods Sold', 'تكلفة المبيعات')}
            >
                <div className="flex justify-between items-start">
                  <p className="text-slate-500 text-xs font-bold mb-1">تكلفة المبيعات (COGS)</p>
                  <Search className="w-3 h-3 text-slate-300 group-hover:text-rose-500" />
                </div>
                <h3 className="text-xl font-black text-rose-600" dir="ltr">{formatCurrency(incomeStatement.totalCOGS)}</h3>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-slate-500 text-xs font-bold mb-1">مجمل الربح (Gross Profit)</p>
                <h3 className="text-xl font-black text-blue-600" dir="ltr">{formatCurrency(incomeStatement.grossProfit)}</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-1 border-t border-slate-100 pt-1">هامش الربح: <span className={incomeStatement.grossMargin >= 0 ? 'text-emerald-500' : 'text-red-500'}>%{incomeStatement.grossMargin.toFixed(1)}</span></p>
            </div>
            <div 
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-red-300 transition-all group"
              onClick={() => handleFetchTrace('Operating Expenses', 'إجمالي المصروفات')}
            >
                <div className="flex justify-between items-start">
                  <p className="text-slate-500 text-xs font-bold mb-1">إجمالي المصروفات (OPEX)</p>
                  <Search className="w-3 h-3 text-slate-300 group-hover:text-red-500" />
                </div>
                <h3 className="text-xl font-black text-red-500" dir="ltr">{formatCurrency(incomeStatement.totalOPEX)}</h3>
            </div>
            <div className={`p-5 rounded-xl border shadow-md ${incomeStatement.netOperatingIncome >= 0 ? 'bg-indigo-600 border-indigo-700' : 'bg-red-600 border-red-700'}`}>
                <p className="text-white/80 text-xs font-bold mb-1">صافي الدخل التشغيلي</p>
                <h3 className="text-xl font-black text-white" dir="ltr">{formatCurrency(incomeStatement.netOperatingIncome)}</h3>
                <p className="text-[10px] font-bold text-white/70 mt-1 border-t border-white/20 pt-1">هامش الصافي: <span className="text-white">%{incomeStatement.netMargin.toFixed(1)}</span></p>
            </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
            
            <div className="bg-emerald-50/50 px-6 py-3 border-b border-emerald-100">
                <h3 className="text-lg font-black text-emerald-800">الإيرادات التشغيلية (Revenues)</h3>
            </div>
            <div className="divide-y divide-slate-100">
                {renderHierarchy(revHierarchy, 0, 'emerald')}
                {incomeStatement.revBreakdown.length === 0 && <div className="px-6 py-4 text-slate-400 text-sm text-center">لا توجد إيرادات مسجلة لهذه الفترة</div>}
                <div className="flex justify-between items-center px-6 py-4 bg-emerald-50 border-t border-emerald-200">
                    <span className="text-emerald-900 font-black">إجمالي الإيرادات</span>
                    <span className="text-emerald-700 font-black text-lg" dir="ltr">{formatCurrency(incomeStatement.totalRevenue)}</span>
                </div>
            </div>

            <div className="bg-red-50/50 px-6 py-3 border-b border-t border-red-100">
                <h3 className="text-lg font-black text-red-800">تكلفة المبيعات (Cost of Goods Sold)</h3>
            </div>
            <div className="divide-y divide-slate-100">
                {renderHierarchy(cogsHierarchy, 0, 'red')}
                {incomeStatement.cogsBreakdown.length === 0 && <div className="px-6 py-4 text-slate-400 text-sm text-center">لا توجد تكلفة مبيعات مسجلة لهذه الفترة</div>}
                <div className="flex justify-between items-center px-6 py-4 bg-red-50 border-t border-red-200">
                    <span className="text-red-900 font-black">إجمالي تكلفة المبيعات</span>
                    <span className="text-red-700 font-black text-lg" dir="ltr">{formatCurrency(incomeStatement.totalCOGS)}</span>
                </div>
            </div>

            <div className="flex justify-between items-center px-6 py-5 bg-slate-800 border-t-4 border-slate-900">
                <span className="text-white font-black text-lg">مجمل الربح (Gross Profit)</span>
                <span className="text-blue-400 font-black text-xl" dir="ltr">{formatCurrency(incomeStatement.grossProfit)}</span>
            </div>

            <div className="bg-amber-50/50 px-6 py-3 border-b border-amber-100">
                <h3 className="text-lg font-black text-amber-800">المصروفات التشغيلية (Operating Expenses)</h3>
            </div>
            <div className="divide-y divide-slate-100">
                {renderHierarchy(opexHierarchy, 0, 'amber')}
                {incomeStatement.opexBreakdown.length === 0 && <div className="px-6 py-4 text-slate-400 text-sm text-center">لا توجد مصروفات تشغيلية مسجلة لهذه الفترة</div>}
                <div className="flex justify-between items-center px-6 py-4 bg-amber-50 border-t border-amber-200">
                    <span className="text-amber-900 font-black">إجمالي المصروفات التشغيلية</span>
                    <span className="text-amber-700 font-black text-lg" dir="ltr">{formatCurrency(incomeStatement.totalOPEX)}</span>
                </div>
            </div>

            <div className="flex justify-between items-center px-6 py-6 bg-indigo-900 border-t-4 border-indigo-950">
                <div>
                    <span className="text-white font-black text-xl block">صافي الدخل التشغيلي (EBITDA / Net Operating Income)</span>
                    <span className="text-indigo-300 text-sm font-medium mt-1 block">الأرباح التشغيلية قبل الفوائد والضرائب والإهلاك</span>
                </div>
                <div className="text-left">
                    <span className={incomeStatement.netOperatingIncome >= 0 ? "text-emerald-400 font-black text-3xl block" : "text-red-400 font-black text-3xl block"} dir="ltr">{formatCurrency(incomeStatement.netOperatingIncome)}</span>
                    <span className="text-indigo-300 text-sm font-bold mt-1 block">هامش: %{incomeStatement.netMargin.toFixed(1)}</span>
                </div>
            </div>
        </div>
        
        {incomeStatement.totalCAPEX > 0 && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                <div className="flex items-center">
                    <Layers className="w-5 h-5 text-slate-400 ml-3"/>
                    <div>
                        <h4 className="text-sm font-bold text-slate-700">المصروفات الرأسمالية (CAPEX)</h4>
                        <p className="text-xs text-slate-500">تم استبعاد الأصول الثابتة من قائمة الدخل المباشرة وفقاً للمعايير المحاسبية.</p>
                    </div>
                </div>
                <span className="font-bold text-slate-800 bg-slate-100 px-4 py-2 rounded-lg" dir="ltr">{formatCurrency(incomeStatement.totalCAPEX)}</span>
            </div>
        )}

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
    </div>
  );
};
