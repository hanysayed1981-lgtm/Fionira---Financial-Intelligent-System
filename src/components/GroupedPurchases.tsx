/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Fragment, useState } from 'react';
import { Activity, ChevronUp, ChevronDown, Tag, Edit2, FileText } from 'lucide-react';
import { formatCurrency, formatMonthName, buildHierarchy, HierarchyNode } from '../lib/financial-utils';
import { FinancialRecord, EntityProfile } from '../types';

interface GroupedPurchasesProps {
  appMode: 'expenses' | 'revenues' | 'payroll' | 'reports' | 'banks';
  actLabel: string;
  entLabel: string;
  filteredEntities: EntityProfile[];
  filteredRecords: FinancialRecord[];
  expandedEntities: Record<string, boolean>;
  toggleEntity: (entId: string) => void;
  expandedSubCats: Record<string, boolean>;
  toggleSubCat: (key: string) => void;
  editSubCat: { entId: string | null, oldCat: string, value: string };
  setEditSubCat: React.Dispatch<React.SetStateAction<{ entId: string | null, oldCat: string, value: string }>>;
  handleSaveSubCategory: (e: React.MouseEvent, entId: string, oldCat: string) => void;
  onNavigateToTab?: (tab: string, anchor?: string, search?: string, targetMode?: string) => void;
  onDeleteRecord?: (record: FinancialRecord) => void;
  onInvoiceClick?: (invoice: FinancialRecord) => void;
}

export const GroupedPurchases: React.FC<GroupedPurchasesProps> = ({
  appMode,
  actLabel,
  entLabel,
  filteredEntities,
  filteredRecords,
  expandedEntities,
  toggleEntity,
  expandedSubCats,
  toggleSubCat,
  editSubCat,
  setEditSubCat,
  handleSaveSubCategory,
  onNavigateToTab,
  onDeleteRecord,
  onInvoiceClick
}) => {
  const [expandedHierarchyNodes, setExpandedHierarchyNodes] = useState<Record<string, boolean>>({});

  const toggleHierarchyNode = (key: string) => {
    setExpandedHierarchyNodes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const [filterSmartInvoices, setFilterSmartInvoices] = useState(false);

  const renderInvoices = (invoices: FinancialRecord[]) => {
    let filteredInvoices = invoices;
    if (filterSmartInvoices) {
      filteredInvoices = invoices.filter(inv => inv.Source === 'SmartInvoice');
    }

    if (!filteredInvoices || filteredInvoices.length === 0) return null;
    return (
      <div className="overflow-x-auto custom-scrollbar pb-2 bg-white p-4 pt-2" style={{ maxHeight: '400px' }}>
          <table className="w-full text-right text-sm">
            <thead className="text-slate-400 text-xs border-b border-slate-200 sticky top-0 bg-white z-10 shadow-sm">
              <tr>
                <th className="py-3 font-medium text-center w-12">#</th>
                <th className="py-3 font-medium">رقم المستند</th>
                <th className="py-3 font-medium">البيان / الوصف</th>
                <th className="py-3 font-medium">التاريخ</th>
                {appMode === 'payroll' ? (
                  <>
                    <th className="py-3 font-medium text-left">الراتب الأساسي</th>
                    <th className="py-3 font-medium text-left">البدلات</th>
                    <th className="py-3 font-medium text-left">إجمالي الاستحقاق</th>
                    <th className="py-3 font-medium text-left">الاستقطاعات</th>
                    <th className="py-3 font-medium text-left">صافي الراتب</th>
                  </>
                ) : appMode === 'banks' ? (
                  <>
                    <th className="py-3 font-medium text-left">إيداعات</th>
                    <th className="py-3 font-medium text-left">سحوبات</th>
                    <th className="py-3 font-medium text-left">العمولات</th>
                    <th className="py-3 font-medium text-left">الرصيد النهائي</th>
                  </>
                ) : (
                  <>
                    <th className="py-3 font-medium text-left">المبلغ الخاضع</th>
                    <th className="py-3 font-medium text-left">بدون ضريبة</th>
                    <th className="py-3 font-medium text-left">الإجمالي قبل الضريبة</th>
                    <th className="py-3 font-medium text-left">قيمة الضريبة</th>
                    <th className="py-3 font-medium text-left">الإجمالي الكلي</th>
                  </>
                )}
                {onDeleteRecord && <th className="py-3 font-medium text-center w-12"></th>}
              </tr>
            </thead>
            <tbody>
              {[...invoices].sort((a, b) => {
                  const dateA = new Date(a.Invoice_Date).getTime();
                  const dateB = new Date(b.Invoice_Date).getTime();
                  
                  const isDateAValid = !isNaN(dateA);
                  const isDateBValid = !isNaN(dateB);
                  
                  if (isDateAValid && isDateBValid && dateA !== dateB) {
                      return dateA - dateB;
                  } else if (isDateAValid && !isDateBValid) {
                      return -1; // Valid dates come first
                  } else if (!isDateAValid && isDateBValid) {
                      return 1;
                  }
                  
                  const numA = String(a.Invoice_Number).replace(/\D/g, '');
                  const numB = String(b.Invoice_Number).replace(/\D/g, '');
                  return Number(numA) - Number(numB);
              }).map((inv: FinancialRecord, idx: number) => {
                const isSmartInvoice = inv.Source === 'SmartInvoice';
                return (
                <tr key={idx} 
                    className={`border-b border-slate-50 transition-colors cursor-pointer ${isSmartInvoice ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'hover:bg-slate-100'}`} 
                    title={isSmartInvoice ? 'مضافة عن طريق مولد الفاتورة الذكي' : ''}
                    onClick={() => onInvoiceClick?.(inv)}
                >
                  <td className="py-3 text-center text-slate-400">
                    {idx + 1}
                    {isSmartInvoice && <div className="text-[10px] text-indigo-500 font-bold mt-1">ذكي</div>}
                  </td>
                  <td className="py-3 font-medium text-slate-700">{inv.Invoice_Number}</td>
                  <td className="py-3 text-slate-800">
                    <div className="font-medium max-w-[250px] truncate" title={isSmartInvoice ? inv.SmartInvoice_Items || inv.Item_Description : inv.Item_Description}>{inv.Item_Description || '-'}</div>
                    {inv.AI_Explanation && (
                      <div className="text-[10px] text-slate-500 mt-1 max-w-[250px] whitespace-normal leading-tight bg-slate-100 p-1.5 rounded border border-slate-200" title={`الثقة الذكية: ${inv.Category_Confidence || 0}%`}>
                         <span className="text-indigo-600 font-bold">تفسير الذكاء الاصطناعي: </span>
                         {inv.AI_Explanation}
                      </div>
                    )}
                  </td>
                  <td className="py-3 text-slate-500 text-xs">{inv.Invoice_Date}</td>
                  {appMode === 'payroll' ? (
                    <>
                      <td className="py-3 text-left text-blue-600 font-medium" dir="ltr">{inv.Taxable_Amount > 0 ? formatCurrency(inv.Taxable_Amount) : '-'}</td>
                      <td className="py-3 text-left text-emerald-600 font-medium" dir="ltr">
                        {inv.NonTaxable_Amount > 0 ? formatCurrency(inv.NonTaxable_Amount) : '-'}
                        {inv.AllowancesBreakdown && Object.keys(inv.AllowancesBreakdown).length > 0 && (
                          <div className="text-[10px] text-emerald-500 mt-1 leading-tight text-right" dir="rtl">
                            {Object.entries(inv.AllowancesBreakdown).map(([k, v]) => (
                              <div key={k}>{k}: {formatCurrency(v)}</div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-left text-indigo-600 font-bold" dir="ltr">{(inv.Taxable_Amount + inv.NonTaxable_Amount) > 0 ? formatCurrency(inv.Taxable_Amount + inv.NonTaxable_Amount) : '-'}</td>
                      <td className="py-3 text-left text-slate-500 font-medium" dir="ltr">
                        {inv.VAT_Amount > 0 ? formatCurrency(inv.VAT_Amount) : '-'}
                        {inv.DeductionsBreakdown && Object.keys(inv.DeductionsBreakdown).length > 0 && (
                          <div className="text-[10px] text-rose-500 mt-1 leading-tight text-right" dir="rtl">
                            {Object.entries(inv.DeductionsBreakdown).map(([k, v]) => (
                              <div key={k}>{k}: {formatCurrency(v)}</div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-left font-bold text-slate-900" dir="ltr">{formatCurrency(inv.Total_Amount)}</td>
                    </>
                  ) : appMode === 'banks' ? (
                    <>
                      <td className="py-3 text-left text-blue-600 font-medium" dir="ltr">{inv.Taxable_Amount > 0 ? formatCurrency(inv.Taxable_Amount) : '-'}</td>
                      <td className="py-3 text-left text-emerald-600 font-medium" dir="ltr">{inv.NonTaxable_Amount > 0 ? formatCurrency(inv.NonTaxable_Amount) : '-'}</td>
                      <td className="py-3 text-left text-slate-500 font-medium" dir="ltr">{inv.VAT_Amount > 0 ? formatCurrency(inv.VAT_Amount) : '-'}</td>
                      <td className="py-3 text-left font-bold text-slate-900" dir="ltr">{formatCurrency(inv.Total_Amount)}</td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 text-left text-blue-600 font-medium" dir="ltr">{inv.Taxable_Amount > 0 ? formatCurrency(inv.Taxable_Amount) : '-'}</td>
                      <td className="py-3 text-left text-emerald-600 font-medium" dir="ltr">{inv.NonTaxable_Amount > 0 ? formatCurrency(inv.NonTaxable_Amount) : '-'}</td>
                      <td className="py-3 text-left text-indigo-600 font-bold" dir="ltr">{(inv.Taxable_Amount + inv.NonTaxable_Amount) > 0 ? formatCurrency(inv.Taxable_Amount + inv.NonTaxable_Amount) : '-'}</td>
                      <td className="py-3 text-left text-slate-500 font-medium" dir="ltr">{inv.VAT_Amount > 0 ? formatCurrency(inv.VAT_Amount) : '-'}</td>
                      <td className="py-3 text-left font-bold text-slate-900" dir="ltr">{formatCurrency(inv.Total_Amount)}</td>
                    </>
                  )}
                  <td className="py-3 text-center">
                    {onDeleteRecord && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteRecord(inv); }}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                        title="حذف الفاتورة"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                      </button>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
      </div>
    );
  };

  const renderHierarchy = (nodes: Record<string, HierarchyNode>, entityId: string, level: number = 0) => {
    return Object.values(nodes).map((node, idx) => {
      const hierarchyKey = `${entityId}-${node.fullName}`;
      const isExpanded = expandedHierarchyNodes[hierarchyKey];
      const hasChildren = node.children ? Object.keys(node.children).length > 0 : false;
      const hasInvoices = node.invoices ? node.invoices.length > 0 : false;

      return (
        <div key={idx} className={`mb-3 last:mb-0 border ${level === 0 ? 'border-slate-300 shadow-sm' : 'border-slate-200 border-r-4 border-r-indigo-400 ml-4'} rounded-xl overflow-hidden`}>
          <div 
            className={`${level === 0 ? 'bg-slate-100/80' : 'bg-slate-50/50'} px-5 py-3 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors border-b border-slate-200`}
            onClick={() => (hasChildren || hasInvoices) && toggleHierarchyNode(hierarchyKey)}
            style={{ paddingRight: `${level === 0 ? 20 : 20}px` }}
          >
            <div className="flex items-center gap-3 order-2 lg:order-1">
              {(hasChildren || hasInvoices) && (
                <div className={`bg-white ${level === 0 ? 'text-indigo-600 border-indigo-200' : 'text-slate-500 border-slate-200'} p-1.5 rounded-lg transition-transform border shadow-sm`}>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              )}
              <h4 className={`font-bold text-sm ${level === 0 ? 'text-indigo-900' : 'text-slate-700'}`}>
                {appMode === 'payroll' && level === 0 ? formatMonthName(node.name) : node.name}
                {appMode !== 'payroll' && <span className={`${level === 0 ? 'text-slate-500' : 'text-slate-400'} font-medium text-xs ml-2`}>({level === 0 ? 'حساب رئيسي' : 'حساب فرعي'})</span>}
              </h4>
              
              {appMode !== 'payroll' && hasInvoices && (
                <button 
                   onClick={(e) => { e.stopPropagation(); setEditSubCat({ entId: entityId, oldCat: node.fullName, value: node.fullName }); }}
                   className="text-slate-400 hover:text-indigo-600 bg-white hover:bg-slate-50 p-1.5 rounded-md transition-colors border border-slate-200 mr-2 shadow-sm"
                   title="تعديل التوجيه"
                >
                   <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}

              {editSubCat.entId === entityId && editSubCat.oldCat === node.fullName && (
                  <div className="flex items-center space-x-2 space-x-reverse mr-3" onClick={e => e.stopPropagation()}>
                     <input 
                       list="acc-categories"
                       className="text-sm text-slate-800 px-3 py-1.5 rounded-lg border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 shadow-inner"
                       value={editSubCat.value}
                       onChange={e => setEditSubCat({...editSubCat, value: e.target.value})}
                       autoFocus
                     />
                     <button onClick={(e) => handleSaveSubCategory(e, entityId, node.fullName)} className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm">حفظ</button>
                     <button onClick={(e) => { e.stopPropagation(); setEditSubCat({entId: null, oldCat: '', value: ''}); }} className="bg-slate-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-600 shadow-sm">إلغاء</button>
                  </div>
              )}
            </div>
            <div className={`hidden xl:flex items-center ${level === 0 ? 'bg-[#1e293b]' : 'bg-slate-100 border border-slate-200'} rounded-xl overflow-hidden mr-auto order-1 lg:order-2 divide-x divide-x-reverse ${level === 0 ? 'divide-slate-700' : 'divide-slate-200'} shadow-sm`}>
                <div className="px-4 py-2 text-center min-w-[80px]">
                    <span className={`block text-[10px] mb-0.5 ${level === 0 ? 'text-slate-400' : 'text-slate-500'}`}>العمليات</span>
                    <span className={`font-bold text-xs ${level === 0 ? 'text-white' : 'text-slate-800'}`}>{node.invoiceCount}</span>
                </div>
                {appMode === 'payroll' ? (
                  <>
                    <div className="px-4 py-2 text-center min-w-[100px]">
                        <span className={`block text-[10px] mb-0.5 ${level === 0 ? 'text-slate-400' : 'text-slate-500'}`}>الأساسي</span>
                        <span className={`font-bold text-xs ${level === 0 ? 'text-blue-400' : 'text-blue-600'}`} dir="ltr">{formatCurrency(node.totalTaxable)}</span>
                    </div>
                    <div className="px-4 py-2 text-center min-w-[100px]">
                        <span className={`block text-[10px] mb-0.5 ${level === 0 ? 'text-slate-400' : 'text-slate-500'}`}>البدلات</span>
                        <span className={`font-bold text-xs ${level === 0 ? 'text-emerald-400' : 'text-emerald-600'}`} dir="ltr">{formatCurrency(node.totalNonTaxable)}</span>
                    </div>
                    <div className="px-4 py-2 text-center min-w-[100px]">
                        <span className={`block text-[10px] mb-0.5 ${level === 0 ? 'text-slate-400' : 'text-slate-500'}`}>إجمالي الاستحقاق</span>
                        <span className={`font-bold text-xs ${level === 0 ? 'text-indigo-400' : 'text-indigo-600'}`} dir="ltr">{formatCurrency(node.totalTaxable + node.totalNonTaxable)}</span>
                    </div>
                    <div className="px-4 py-2 text-center min-w-[100px]">
                        <span className={`block text-[10px] mb-0.5 ${level === 0 ? 'text-slate-400' : 'text-slate-500'}`}>الاستقطاعات</span>
                        <span className={`font-bold text-xs ${level === 0 ? 'text-slate-300' : 'text-slate-600'}`} dir="ltr">{formatCurrency(node.totalVAT)}</span>
                    </div>
                    <div className="px-4 py-2 text-center min-w-[110px]">
                        <span className={`block text-[10px] mb-0.5 ${level === 0 ? 'text-slate-400' : 'text-slate-500'}`}>صافي الراتب</span>
                        <span className={`font-black text-xs ${level === 0 ? 'text-emerald-400' : 'text-emerald-600'}`} dir="ltr">{formatCurrency(node.totalSpend)}</span>
                    </div>
                  </>
                ) : appMode === 'banks' ? (
                  <>
                    <div className="px-4 py-2 text-center min-w-[100px]">
                        <span className={`block text-[10px] mb-0.5 ${level === 0 ? 'text-slate-400' : 'text-slate-500'}`}>إيداعات</span>
                        <span className={`font-bold text-xs ${level === 0 ? 'text-blue-400' : 'text-blue-600'}`} dir="ltr">{formatCurrency(node.totalTaxable)}</span>
                    </div>
                    <div className="px-4 py-2 text-center min-w-[100px]">
                        <span className={`block text-[10px] mb-0.5 ${level === 0 ? 'text-slate-400' : 'text-slate-500'}`}>سحوبات</span>
                        <span className={`font-bold text-xs ${level === 0 ? 'text-emerald-400' : 'text-emerald-600'}`} dir="ltr">{formatCurrency(node.totalNonTaxable)}</span>
                    </div>
                    <div className="px-4 py-2 text-center min-w-[100px]">
                        <span className={`block text-[10px] mb-0.5 ${level === 0 ? 'text-slate-400' : 'text-slate-500'}`}>الرصيد</span>
                        <span className={`font-bold text-xs ${level === 0 ? 'text-indigo-400' : 'text-indigo-600'}`} dir="ltr">{formatCurrency(node.totalTaxable - node.totalNonTaxable)}</span>
                    </div>
                    <div className="px-4 py-2 text-center min-w-[100px]">
                        <span className={`block text-[10px] mb-0.5 ${level === 0 ? 'text-slate-400' : 'text-slate-500'}`}>العمولات</span>
                        <span className={`font-bold text-xs ${level === 0 ? 'text-slate-300' : 'text-slate-600'}`} dir="ltr">{formatCurrency(node.totalVAT)}</span>
                    </div>
                    <div className="px-4 py-2 text-center min-w-[110px]">
                        <span className={`block text-[10px] mb-0.5 ${level === 0 ? 'text-slate-400' : 'text-slate-500'}`}>الرصيد النهائي</span>
                        <span className={`font-black text-xs ${level === 0 ? 'text-emerald-400' : 'text-emerald-600'}`} dir="ltr">{formatCurrency(node.totalSpend)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="px-4 py-2 text-center min-w-[100px]">
                        <span className={`block text-[10px] mb-0.5 ${level === 0 ? 'text-slate-400' : 'text-slate-500'}`}>الخاضع</span>
                        <span className={`font-bold text-xs ${level === 0 ? 'text-blue-400' : 'text-blue-600'}`} dir="ltr">{formatCurrency(node.totalTaxable)}</span>
                    </div>
                    <div className="px-4 py-2 text-center min-w-[100px]">
                        <span className={`block text-[10px] mb-0.5 ${level === 0 ? 'text-slate-400' : 'text-slate-500'}`}>غير خاضع</span>
                        <span className={`font-bold text-xs ${level === 0 ? 'text-emerald-400' : 'text-emerald-600'}`} dir="ltr">{formatCurrency(node.totalNonTaxable)}</span>
                    </div>
                    <div className="px-4 py-2 text-center min-w-[100px]">
                        <span className={`block text-[10px] mb-0.5 ${level === 0 ? 'text-slate-400' : 'text-slate-500'}`}>الإجمالي قبل الضريبة</span>
                        <span className={`font-bold text-xs ${level === 0 ? 'text-indigo-400' : 'text-indigo-600'}`} dir="ltr">{formatCurrency(node.totalTaxable + node.totalNonTaxable)}</span>
                    </div>
                    <div className="px-4 py-2 text-center min-w-[100px]">
                        <span className={`block text-[10px] mb-0.5 ${level === 0 ? 'text-slate-400' : 'text-slate-500'}`}>الضريبة</span>
                        <span className={`font-bold text-xs ${level === 0 ? 'text-slate-300' : 'text-slate-600'}`} dir="ltr">{formatCurrency(node.totalVAT)}</span>
                    </div>
                    <div className="px-4 py-2 text-center min-w-[110px]">
                        <span className={`block text-[10px] mb-0.5 ${level === 0 ? 'text-slate-400' : 'text-slate-500'}`}>الإجمالي الكلي</span>
                        <span className={`font-black text-xs ${level === 0 ? 'text-emerald-400' : 'text-emerald-600'}`} dir="ltr">{formatCurrency(node.totalSpend)}</span>
                    </div>
                  </>
                )}
            </div>
          </div>
          {isExpanded && (
            <div className="bg-white">
              {hasChildren && renderHierarchy(node.children, entityId, level + 1)}
              {hasInvoices && renderInvoices(node.invoices)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className={`bg-${appMode==='expenses'?'indigo':(appMode==='revenues'?'emerald':(appMode==='banks'?'blue':'amber'))}-50 text-${appMode==='expenses'?'indigo':(appMode==='revenues'?'emerald':(appMode==='banks'?'blue':'amber'))}-900 px-5 py-4 rounded-xl border border-${appMode==='expenses'?'indigo':(appMode==='revenues'?'emerald':(appMode==='banks'?'blue':'amber'))}-200 text-sm font-bold flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shadow-sm`}>
        <div className="flex items-center">
          <Activity className="w-5 h-5 ml-3 shrink-0"/>
          <span>هيكل الحسابات المزدوج: يعرض "الحساب الرئيسي" (الجهة/المورد/العميل/الحساب البنكي) ويندرج تحته "الحسابات الفرعية" (التوجيه المحاسبي للعمليات). انقر للتعديل.</span>
        </div>
        
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
          <input 
            type="checkbox" 
            id="filterSmartInvoices" 
            checked={filterSmartInvoices} 
            onChange={(e) => setFilterSmartInvoices(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
          />
          <label htmlFor="filterSmartInvoices" className="text-xs font-bold text-slate-700 cursor-pointer">
            عرض الفواتير الذكية فقط
          </label>
        </div>
      </div>
      
      {filteredEntities.length > 0 && (
        <div className="bg-[#0f172a] rounded-xl p-5 mb-6 shadow-md border border-slate-700 flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center text-white">
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-indigo-500/20 p-2 rounded-lg">
              <Activity className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">الإجمالي العام</h2>
              <p className="text-xs text-slate-400">ملخص جميع الحسابات</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 w-full lg:w-auto">
            <div className="bg-white/5 rounded-lg px-4 py-2 border border-white/10 text-center min-w-[110px]">
              <span className="block text-white/50 text-[10px] mb-1">إجمالي العمليات</span>
              <strong className="font-bold text-white text-lg">{filteredEntities.reduce((sum, ent) => sum + ent.invoiceCount, 0)}</strong>
            </div>
            <div className="bg-white/5 rounded-lg px-4 py-2 border border-white/10 text-center min-w-[110px]">
              <span className="block text-white/50 text-[10px] mb-1">{appMode === 'payroll' ? 'إجمالي الأساسي' : (appMode === 'banks' ? 'إجمالي الإيداعات' : 'إجمالي الخاضع')}</span>
              <strong className="font-bold text-blue-400 text-lg" dir="ltr">{formatCurrency(filteredEntities.reduce((sum, ent) => sum + ent.totalTaxableNet, 0))}</strong>
            </div>
            <div className="bg-white/5 rounded-lg px-4 py-2 border border-white/10 text-center min-w-[110px]">
              <span className="block text-white/50 text-[10px] mb-1">{appMode === 'payroll' ? 'إجمالي البدلات' : (appMode === 'banks' ? 'إجمالي السحوبات' : 'إجمالي غير خاضع')}</span>
              <strong className="font-bold text-emerald-400 text-lg" dir="ltr">{formatCurrency(filteredEntities.reduce((sum, ent) => sum + ent.totalNonTaxableNet, 0))}</strong>
            </div>
            <div className="bg-white/5 rounded-lg px-4 py-2 border border-white/10 text-center min-w-[110px]">
              <span className="block text-white/50 text-[10px] mb-1">{appMode === 'payroll' ? 'إجمالي الاستحقاق' : (appMode === 'banks' ? 'إجمالي الرصيد' : 'الإجمالي قبل الضريبة')}</span>
              <strong className="font-bold text-indigo-400 text-lg" dir="ltr">{formatCurrency(filteredEntities.reduce((sum, ent) => sum + (appMode === 'payroll' ? (ent.totalTaxableNet + ent.totalNonTaxableNet) : ent.totalNet), 0))}</strong>
            </div>
            <div className="bg-white/5 rounded-lg px-4 py-2 border border-white/10 text-center min-w-[110px]">
              <span className="block text-white/50 text-[10px] mb-1">{appMode === 'payroll' ? 'إجمالي الاستقطاعات' : (appMode === 'banks' ? 'إجمالي العمولات' : 'إجمالي الضريبة')}</span>
              <strong className="font-bold text-slate-300 text-lg" dir="ltr">{formatCurrency(filteredEntities.reduce((sum, ent) => sum + ent.totalVAT, 0))}</strong>
            </div>
            <div className="bg-white/5 rounded-lg px-4 py-2 border border-white/10 text-center min-w-[110px]">
              <span className="block text-white/50 text-[10px] mb-1">{appMode === 'payroll' ? 'إجمالي صافي الرواتب' : (appMode === 'banks' ? 'الرصيد النهائي' : 'الإجمالي الكلي')}</span>
              <strong className="font-black text-emerald-400 text-lg" dir="ltr">{formatCurrency(filteredEntities.reduce((sum, ent) => sum + ent.totalSpend, 0))}</strong>
            </div>
          </div>
        </div>
      )}

      {filteredEntities.length === 0 ? (
        <div className="bg-white rounded-xl p-16 text-center text-slate-400 border border-slate-200">لا توجد نتائج تطابق بحثك بهذه الفلاتر.</div>
      ) : (
        filteredEntities.map(sup => {
          const supplierInvoices = filteredRecords.filter(r => r.Entity_ID === sup.id);
          const isExpanded = expandedEntities[sup.id];
          
          return (
            <div key={sup.id} id={`entity-${sup.id}`} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 mb-5">
              
              <div 
                className="bg-[#1e293b] text-white p-5 flex flex-col xl:flex-row xl:items-center justify-between cursor-pointer gap-4"
                onClick={() => toggleEntity(sup.id)}
              >
                <div className="flex items-start xl:items-center gap-4 flex-1 min-w-0">
                  <div className="bg-white/10 hover:bg-white/20 transition-colors p-2 rounded-lg shrink-0 mt-1 xl:mt-0">
                    {isExpanded ? <ChevronUp className="w-6 h-6 text-indigo-300" /> : <ChevronDown className="w-6 h-6 text-indigo-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-xl truncate">{sup.name} <span className="text-sm font-normal text-slate-400 ml-2">(حساب رئيسي)</span></h3>
                      {onNavigateToTab && (appMode === 'expenses' || appMode === 'revenues') && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToTab('statement_of_account', undefined, sup.name);
                          }}
                          className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 px-3 py-1 rounded-lg text-xs font-bold transition-colors border border-indigo-500/30 flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" /> كشف حساب
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col xl:flex-row items-start xl:items-center gap-2 xl:gap-4 text-xs text-slate-400 mt-2">
                      <div className="flex items-center gap-3 shrink-0">
                        <span>معرف: {sup.id}</span>
                        {sup.taxId && <span>ضريبي: <span className="font-bold text-slate-300">{sup.taxId}</span></span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 xl:border-r border-slate-600 xl:pr-4">
                        <Tag className="w-3 h-3 text-indigo-400 shrink-0" />
                        <div className="flex flex-wrap gap-1.5">
                          {sup.categoriesArray && sup.categoriesArray.map((cat, idx) => (
                            <span key={idx} className="bg-[#312e81] text-indigo-200 border border-indigo-500/30 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 xl:flex items-center justify-start xl:justify-end gap-4 xl:gap-6 xl:border-r border-slate-700 xl:pr-6 shrink-0 w-full xl:w-auto">
                  <div className="flex flex-col items-center">
                      <span className="text-slate-400 text-[11px] font-bold mb-1">العمليات</span>
                      <strong className="text-white text-lg font-bold">{sup.invoiceCount}</strong>
                  </div>
                  <div className="flex flex-col items-center">
                      <span className="text-slate-400 text-[11px] font-bold mb-1">{appMode === 'payroll' ? 'الراتب الأساسي' : (appMode === 'banks' ? 'إيداعات' : 'الخاضع للضريبة')}</span>
                      <strong className="text-blue-400 text-lg font-bold" dir="ltr">{formatCurrency(sup.totalTaxableNet)}</strong>
                  </div>
                  <div className="flex flex-col items-center">
                      <span className="text-slate-400 text-[11px] font-bold mb-1">{appMode === 'payroll' ? 'البدلات' : (appMode === 'banks' ? 'سحوبات' : 'غير خاضع')}</span>
                      <strong className="text-emerald-400 text-lg font-bold" dir="ltr">{formatCurrency(sup.totalNonTaxableNet)}</strong>
                  </div>
                  <div className="flex flex-col items-center">
                      <span className="text-slate-400 text-[11px] font-bold mb-1">{appMode === 'payroll' ? 'إجمالي الاستحقاق' : (appMode === 'banks' ? 'الرصيد' : 'الإجمالي قبل الضريبة')}</span>
                      <strong className="text-indigo-400 text-lg font-bold" dir="ltr">{formatCurrency(appMode === 'payroll' ? (sup.totalTaxableNet + sup.totalNonTaxableNet) : sup.totalNet)}</strong>
                  </div>
                  <div className="flex flex-col items-center">
                      <span className="text-slate-400 text-[11px] font-bold mb-1">{appMode === 'payroll' ? 'الاستقطاعات' : (appMode === 'banks' ? 'العمولات' : 'الضريبة')}</span>
                      <strong className="text-slate-200 text-lg font-bold" dir="ltr">{formatCurrency(sup.totalVAT)}</strong>
                  </div>
                  <div className="flex flex-col items-center xl:border-r border-slate-600 xl:pr-6 ml-2 col-span-2 md:col-span-1">
                      <span className="text-slate-400 text-[11px] font-bold mb-1">{appMode === 'payroll' ? 'صافي الراتب' : (appMode === 'banks' ? 'الرصيد النهائي' : 'الإجمالي الكلي')}</span>
                      <strong className="text-emerald-400 text-lg font-black tracking-wide" dir="ltr">{formatCurrency(sup.totalSpend)}</strong>
                  </div>
                </div>
              </div>

              {isExpanded && (() => {
                // Find most common month for this entity's payroll records
                let mostCommonMonth = '';
                if (appMode === 'payroll') {
                  const monthCounts: Record<string, number> = {};
                  let maxCount = 0;
                  supplierInvoices.forEach(inv => {
                    let m = '';
                    if (inv.Invoice_Date && inv.Invoice_Date !== 'غير محدد') {
                      m = inv.Invoice_Date.substring(0, 7);
                    } else if ((inv as any)._finalMonth && (inv as any)._finalMonth !== 'غير محدد') {
                      m = (inv as any)._finalMonth;
                    }
                    if (m && m.length === 7 && m.includes('-')) {
                      monthCounts[m] = (monthCounts[m] || 0) + 1;
                      if (monthCounts[m] > maxCount) {
                        maxCount = monthCounts[m];
                        mostCommonMonth = m;
                      }
                    }
                  });
                  if (!mostCommonMonth) {
                    const today = new Date();
                    mostCommonMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                  }
                }

                const groupedByCategory = supplierInvoices.reduce((acc: any, inv) => {
                    let cat = inv.Category || 'غير مصنف';
                    
                    if (appMode === 'payroll') {
                       // Extract month in YYYY-MM format
                       let monthKey = mostCommonMonth;
                       if (inv.Invoice_Date && inv.Invoice_Date !== 'غير محدد') {
                           monthKey = inv.Invoice_Date.substring(0, 7);
                       } else if ((inv as any)._finalMonth && (inv as any)._finalMonth !== 'غير محدد') {
                           monthKey = (inv as any)._finalMonth;
                       }
                       cat = monthKey;
                    }
                    
                    if (!acc[cat]) acc[cat] = { name: cat, totalSpend: 0, invoiceCount: 0, totalTaxable: 0, totalNonTaxable: 0, totalVAT: 0, invoices: [] };
                    acc[cat].totalSpend += (inv.Total_Amount || 0);
                    acc[cat].invoiceCount++;
                    acc[cat].totalTaxable += (inv.Taxable_Amount || 0);
                    acc[cat].totalNonTaxable += (inv.NonTaxable_Amount || 0);
                    acc[cat].totalVAT += (inv.VAT_Amount || 0);
                    acc[cat].invoices.push(inv);
                    return acc;
                }, {});

                const categoriesArray = Object.values(groupedByCategory);
                const hierarchy = buildHierarchy(categoriesArray);

                return (
                  <div className="bg-white p-4">
                      {renderHierarchy(hierarchy, sup.id)}
                  </div>
                );
              })()}
            </div>
          );
        })
      )}
    </div>
  );
};
