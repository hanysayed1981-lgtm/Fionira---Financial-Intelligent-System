/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Fragment, useState } from 'react';
import { Activity, ChevronUp, ChevronDown, Edit2, Layers, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, buildHierarchy, HierarchyNode } from '../lib/financial-utils';
import { FinancialRecord } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface CategoriesSummaryProps {
  appMode: 'expenses' | 'revenues' | 'payroll' | 'reports' | 'banks';
  actLabel: string;
  entLabel: string;
  categoriesArray: any[];
  expandedCategories: Record<string, boolean>;
  toggleCategoryView: (catName: string) => void;
  editSubCat: { entId: string | null, oldCat: string, value: string };
  setEditSubCat: React.Dispatch<React.SetStateAction<{ entId: string | null, oldCat: string, value: string }>>;
  handleSaveGlobalCategory: (oldCatName: string, newCatName: string) => void;
  expandedSubCats: Record<string, boolean>;
  toggleSubCat: (key: string) => void;
  onDeleteRecord?: (record: FinancialRecord) => void;
  onInvoiceClick?: (invoice: FinancialRecord) => void;
}

export const CategoriesSummary: React.FC<CategoriesSummaryProps> = ({
  appMode,
  actLabel,
  entLabel,
  categoriesArray,
  expandedCategories,
  toggleCategoryView,
  editSubCat,
  setEditSubCat,
  handleSaveGlobalCategory,
  expandedSubCats,
  toggleSubCat,
  onDeleteRecord,
  onInvoiceClick
}) => {
  const getThemeColors = () => {
    if (appMode === 'revenues') {
      return {
        bg: 'bg-[#0f3d2e]',
        hoverBg: 'hover:bg-[#0a2e22]',
        border: 'border-emerald-800',
        text: 'text-emerald-400',
        boxBg: 'bg-white/10',
        boxBorder: 'border-white/20',
        accent: 'emerald'
      };
    }
    if (appMode === 'expenses') {
      return {
        bg: 'bg-[#1e1b4b]',
        hoverBg: 'hover:bg-[#17153b]',
        border: 'border-indigo-800',
        text: 'text-indigo-400',
        boxBg: 'bg-white/10',
        boxBorder: 'border-white/20',
        accent: 'indigo'
      };
    }
    if (appMode === 'payroll') {
      return {
        bg: 'bg-[#451a03]',
        hoverBg: 'hover:bg-[#381402]',
        border: 'border-amber-800',
        text: 'text-amber-400',
        boxBg: 'bg-white/10',
        boxBorder: 'border-white/20',
        accent: 'amber'
      };
    }
    if (appMode === 'banks') {
      return {
        bg: 'bg-[#0f172a]',
        hoverBg: 'hover:bg-[#020617]',
        border: 'border-blue-800',
        text: 'text-blue-400',
        boxBg: 'bg-white/10',
        boxBorder: 'border-white/20',
        accent: 'blue'
      };
    }
    return {
      bg: 'bg-[#1e293b]',
      hoverBg: 'hover:bg-[#0f172a]',
      border: 'border-slate-700',
      text: 'text-white',
      boxBg: 'bg-white/10',
      boxBorder: 'border-white/5',
      accent: 'slate'
    };
  };

  const theme = getThemeColors();

  const renderEntities = (cat: any) => {
    const groupedByEntity = cat.invoices.reduce((acc: any, inv: FinancialRecord) => {
        if (!acc[inv.Entity_ID]) {
            acc[inv.Entity_ID] = {
                id: inv.Entity_ID,
                name: inv.Entity_Normalized_Name,
                taxId: inv.Entity_TaxID,
                invoices: [],
                totalTaxable: 0,
                totalNonTaxable: 0,
                totalVAT: 0,
                totalSpend: 0,
                totalNet: 0
            };
        }
        acc[inv.Entity_ID].invoices.push(inv);
        acc[inv.Entity_ID].totalTaxable += (inv.Taxable_Amount || 0);
        acc[inv.Entity_ID].totalNonTaxable += (inv.NonTaxable_Amount || 0);
        acc[inv.Entity_ID].totalVAT += (inv.VAT_Amount || 0);
        acc[inv.Entity_ID].totalSpend += (inv.Total_Amount || 0);
        acc[inv.Entity_ID].totalNet += (inv.Net_Amount || 0);
        return acc;
    }, {});

    const entitiesList = Object.values(groupedByEntity).sort((a: any, b: any) => b.totalSpend - a.totalSpend);

    return (
        <div className="bg-slate-50 p-4 border-t border-slate-200">
            {entitiesList.map((ent: any, eIdx: number) => {
                const subKey = `cat-${cat.name}-ent-${ent.id}`;
                const isSubExpanded = !!expandedSubCats[subKey]; 

                return (
                    <div key={eIdx} className="mb-4 last:mb-0 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div 
                            className="bg-slate-50 px-5 py-3 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors border-b border-slate-200"
                            onClick={() => toggleSubCat(subKey)}
                        >
                            <div className="flex items-center gap-3 order-2 lg:order-1">
                                <div className="bg-white text-slate-500 p-1.5 rounded-lg transition-transform border border-slate-200 shadow-sm">
                                    {isSubExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                                <h4 className="font-bold text-slate-800 text-sm">{ent.name} <span className="text-slate-500 font-medium text-xs ml-1">(حساب فرعي / {entLabel})</span></h4>
                            </div>
                            <div className="hidden xl:flex items-center bg-[#1e293b] rounded-xl overflow-hidden mr-auto order-1 lg:order-2 divide-x divide-x-reverse divide-slate-700 shadow-sm">
                                <div className="px-4 py-2 text-center min-w-[80px]">
                                    <span className="block text-slate-400 text-[10px] mb-0.5">إجمالي العمليات</span>
                                    <span className="font-bold text-white text-xs">{ent.invoices.length}</span>
                                </div>
                                {appMode !== 'payroll' && (
                                  <>
                                    <div className="px-4 py-2 text-center min-w-[100px]">
                                        <span className="block text-slate-400 text-[10px] mb-0.5">إجمالي خاضع</span>
                                        <span className="font-bold text-indigo-400 text-xs" dir="ltr">{formatCurrency(ent.totalTaxable || 0)}</span>
                                    </div>
                                    <div className="px-4 py-2 text-center min-w-[100px]">
                                        <span className="block text-slate-400 text-[10px] mb-0.5">غير خاضع</span>
                                        <span className="font-bold text-amber-400 text-xs" dir="ltr">{formatCurrency(ent.totalNonTaxable || 0)}</span>
                                    </div>
                                  </>
                                )}
                                <div className="px-4 py-2 text-center min-w-[100px]">
                                    <span className="block text-slate-400 text-[10px] mb-0.5">{appMode === 'payroll' ? 'إجمالي الأساسي' : 'الإجمالي قبل الضريبة'}</span>
                                    <span className="font-bold text-blue-400 text-xs" dir="ltr">{formatCurrency(ent.totalNet > 0 ? ent.totalNet : ((ent.totalTaxable || 0) + (ent.totalNonTaxable || 0)))}</span>
                                </div>
                                <div className="px-4 py-2 text-center min-w-[100px]">
                                    <span className="block text-slate-400 text-[10px] mb-0.5">{appMode === 'payroll' ? 'إجمالي الاستقطاعات' : 'إجمالي الضريبة'}</span>
                                    <span className="font-bold text-slate-300 text-xs" dir="ltr">{formatCurrency(ent.totalVAT || 0)}</span>
                                </div>
                                <div className="px-4 py-2 text-center min-w-[120px] bg-slate-800">
                                    <span className="block text-slate-400 text-[10px] mb-0.5">الإجمالي الكلي</span>
                                    <span className="font-bold text-white text-xs" dir="ltr">{formatCurrency(ent.totalSpend || 0)}</span>
                                </div>
                            </div>
                            <div className="xl:hidden flex items-center gap-2 text-xs font-bold mr-auto order-1 lg:order-2">
                                <span className="text-slate-300 bg-slate-700 px-2 py-1 rounded border border-slate-600">{ent.invoices.length} فواتير</span>
                                <span className="text-white bg-indigo-600 px-2 py-1 rounded shadow-sm">{formatCurrency(ent.totalSpend)}</span>
                            </div>
                        </div>

                        {isSubExpanded && (
                            <div className="overflow-x-auto custom-scrollbar pb-2 bg-white" style={{ maxHeight: '400px' }}>
                                <table className="w-full text-right text-sm relative">
                                    <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-5 py-3 w-12 text-center">#</th>
                                            <th className="px-5 py-3">رقم المستند</th>
                                            <th className="px-5 py-3">البيان / الوصف</th>
                                            <th className="px-5 py-3">التاريخ</th>
                                            {appMode === 'payroll' ? (
                                              <>
                                                <th className="px-5 py-3 text-left">الراتب الأساسي</th>
                                                <th className="px-5 py-3 text-left">البدلات</th>
                                                <th className="px-5 py-3 text-left">إجمالي الاستحقاق</th>
                                                <th className="px-5 py-3 text-left">الاستقطاعات</th>
                                                <th className="px-5 py-3 text-left">صافي الراتب</th>
                                              </>
                                            ) : appMode === 'banks' ? (
                                              <>
                                                <th className="px-5 py-3 text-left">إيداعات</th>
                                                <th className="px-5 py-3 text-left">سحوبات</th>
                                                <th className="px-5 py-3 text-left">العمولات</th>
                                                <th className="px-5 py-3 text-left">الرصيد النهائي</th>
                                              </>
                                            ) : (
                                              <>
                                                <th className="px-5 py-3 text-left">الخاضع</th>
                                                <th className="px-5 py-3 text-left">بدون ضريبة</th>
                                                <th className="px-5 py-3 text-left">الضريبة</th>
                                                <th className="px-5 py-3 text-left">الإجمالي</th>
                                              </>
                                            )}
                                            {onDeleteRecord && <th className="px-5 py-3 w-12 text-center"></th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {[...ent.invoices].sort((a, b) => {
                                            const dateA = new Date(a.Invoice_Date).getTime();
                                            const dateB = new Date(b.Invoice_Date).getTime();
                                            const isDateAValid = !isNaN(dateA);
                                            const isDateBValid = !isNaN(dateB);
                                            if (isDateAValid && isDateBValid && dateA !== dateB) return dateA - dateB;
                                            if (isDateAValid && !isDateBValid) return -1;
                                            if (!isDateAValid && isDateBValid) return 1;
                                            const numA = String(a.Invoice_Number).replace(/\D/g, '');
                                            const numB = String(b.Invoice_Number).replace(/\D/g, '');
                                            return Number(numA) - Number(numB);
                                        }).map((inv: FinancialRecord, idx: number) => (
                                            <tr key={idx} 
                                                className={`transition-colors ${(inv.Anomalies && inv.Anomalies.length > 0) ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-slate-100 cursor-pointer'}`}
                                                onClick={() => onInvoiceClick?.(inv)}
                                            >
                                                <td className="px-5 py-3 text-center text-slate-400 text-xs font-bold">{idx + 1}</td>
                                                <td className="px-5 py-3 font-bold text-slate-800">{inv.Invoice_Number}</td>
                                                <td className="px-5 py-3 text-slate-600 max-w-[250px] truncate" title={inv.Item_Description}>{inv.Item_Description || '-'}</td>
                                                <td className="px-5 py-3 text-slate-500 text-xs font-medium">{inv.Invoice_Date}</td>
                                                {appMode === 'payroll' ? (
                                                  <>
                                                    <td className="px-5 py-3 text-left text-blue-600 font-bold" dir="ltr">{inv.Taxable_Amount > 0 ? formatCurrency(inv.Taxable_Amount) : '-'}</td>
                                                    <td className="px-5 py-3 text-left text-emerald-600 font-medium" dir="ltr">
                                                      {inv.NonTaxable_Amount > 0 ? formatCurrency(inv.NonTaxable_Amount) : '-'}
                                                      {inv.AllowancesBreakdown && Object.keys(inv.AllowancesBreakdown).length > 0 && (
                                                        <div className="text-[10px] text-emerald-500 mt-1 leading-tight text-right" dir="rtl">
                                                          {Object.entries(inv.AllowancesBreakdown).map(([k, v]) => (
                                                            <div key={k}>{k}: {formatCurrency(v as number)}</div>
                                                          ))}
                                                        </div>
                                                      )}
                                                    </td>
                                                    <td className="px-5 py-3 text-left text-indigo-600 font-bold" dir="ltr">{(inv.Taxable_Amount + inv.NonTaxable_Amount) > 0 ? formatCurrency(inv.Taxable_Amount + inv.NonTaxable_Amount) : '-'}</td>
                                                    <td className="px-5 py-3 text-left text-slate-600" dir="ltr">
                                                      {inv.VAT_Amount > 0 ? formatCurrency(inv.VAT_Amount) : '-'}
                                                      {inv.DeductionsBreakdown && Object.keys(inv.DeductionsBreakdown).length > 0 && (
                                                        <div className="text-[10px] text-rose-500 mt-1 leading-tight text-right" dir="rtl">
                                                          {Object.entries(inv.DeductionsBreakdown).map(([k, v]) => (
                                                            <div key={k}>{k}: {formatCurrency(v as number)}</div>
                                                          ))}
                                                        </div>
                                                      )}
                                                    </td>
                                                    <td className="px-5 py-3 text-left font-bold text-slate-900" dir="ltr">{formatCurrency(inv.Total_Amount)}</td>
                                                  </>
                                                ) : appMode === 'banks' ? (
                                                  <>
                                                    <td className="px-5 py-3 text-left text-blue-600 font-bold" dir="ltr">{inv.Taxable_Amount > 0 ? formatCurrency(inv.Taxable_Amount) : '-'}</td>
                                                    <td className="px-5 py-3 text-left text-emerald-600 font-medium" dir="ltr">{inv.NonTaxable_Amount > 0 ? formatCurrency(inv.NonTaxable_Amount) : '-'}</td>
                                                    <td className="px-5 py-3 text-left text-slate-600" dir="ltr">{inv.VAT_Amount > 0 ? formatCurrency(inv.VAT_Amount) : '-'}</td>
                                                    <td className="px-5 py-3 text-left font-bold text-slate-900" dir="ltr">{formatCurrency(inv.Total_Amount)}</td>
                                                  </>
                                                ) : (
                                                  <>
                                                    <td className="px-5 py-3 text-left text-blue-600 font-bold" dir="ltr">{inv.Taxable_Amount > 0 ? formatCurrency(inv.Taxable_Amount) : '-'}</td>
                                                    <td className="px-5 py-3 text-left text-emerald-600 font-medium" dir="ltr">{inv.NonTaxable_Amount > 0 ? formatCurrency(inv.NonTaxable_Amount) : '-'}</td>
                                                    <td className="px-5 py-3 text-left text-slate-600" dir="ltr">{inv.VAT_Amount > 0 ? formatCurrency(inv.VAT_Amount) : '-'}</td>
                                                    <td className="px-5 py-3 text-left font-bold text-slate-900" dir="ltr">{formatCurrency(inv.Total_Amount)}</td>
                                                  </>
                                                )}
                                                <td className="px-5 py-3 text-center">
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
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
  };

  const renderHierarchy = (nodes: Record<string, HierarchyNode>, level: number = 0) => {
    return Object.values(nodes).map((node, idx) => {
      const isExpanded = expandedCategories[node.fullName];
      const isEditingGlobalCat = editSubCat.oldCat === node.fullName && editSubCat.entId === 'GLOBAL';
      const hasChildren = node.children && Object.keys(node.children).length > 0;
      
      return (
        <div key={idx} id={`category-${node.fullName.replace(/\s+/g, '-')}`} className={`mb-3 last:mb-0 border ${level === 0 ? 'border-slate-300 shadow-sm' : `border-slate-200 border-r-4 border-r-${theme.accent}-400 ml-4`} rounded-xl overflow-hidden`}>
          <div 
            className={`${level === 0 ? 'bg-slate-100/80' : 'bg-slate-50/50'} px-5 py-3 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors border-b border-slate-200`}
            onClick={() => toggleCategoryView(node.fullName)}
            style={{ paddingRight: `${level === 0 ? 20 : 20}px` }}
          >
            <div className="flex items-center gap-3 order-2 lg:order-1">
              <div className={`bg-white ${level === 0 ? `text-${theme.accent}-600 border-${theme.accent}-200` : 'text-slate-500 border-slate-200'} p-1.5 rounded-lg transition-transform border shadow-sm`}>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
              <div className="flex items-center gap-2">
                {isEditingGlobalCat ? (
                  <div className="flex items-center space-x-2 space-x-reverse" onClick={e => e.stopPropagation()}>
                      <input 
                        list="acc-categories"
                        className={`text-sm text-slate-800 px-3 py-1.5 rounded-lg border border-${theme.accent}-300 focus:outline-none focus:ring-2 focus:ring-${theme.accent}-500 w-64 shadow-inner`}
                        value={editSubCat.value}
                        onChange={e => setEditSubCat({...editSubCat, value: e.target.value})}
                        autoFocus
                      />
                      <button onClick={(e) => {
                          e.stopPropagation();
                          if(editSubCat.value && editSubCat.value !== node.fullName) {
                              handleSaveGlobalCategory(node.fullName, editSubCat.value);
                          }
                          setEditSubCat({entId: null, oldCat: '', value: ''});
                      }} className={`bg-${theme.accent}-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-${theme.accent}-700`}>حفظ</button>
                      <button onClick={(e) => { e.stopPropagation(); setEditSubCat({entId: null, oldCat: '', value: ''}); }} className="bg-slate-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-600 shadow-sm">إلغاء</button>
                  </div>
                ) : (
                  <Fragment>
                    <h3 className={`font-bold text-sm ${level === 0 ? `text-${theme.accent}-900` : 'text-slate-700'}`}>
                      {node.name}
                      {appMode !== 'payroll' && <span className={`${level === 0 ? 'text-slate-500' : 'text-slate-400'} font-medium text-xs ml-2`}>({level === 0 ? 'حساب رئيسي' : 'حساب فرعي'})</span>}
                    </h3>
                    {node.isLeaf && appMode !== 'payroll' && (
                      <button 
                         onClick={(e) => { e.stopPropagation(); setEditSubCat({ entId: 'GLOBAL', oldCat: node.fullName, value: node.fullName }); }}
                         className={`text-slate-400 hover:text-${theme.accent}-600 bg-white hover:bg-slate-50 p-1.5 rounded-md transition-colors border border-slate-200 mr-2 shadow-sm`}
                         title="تعديل التوجيه"
                      >
                         <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </Fragment>
                )}
              </div>
            </div>
            <div className={`hidden md:flex flex-wrap items-center ${level === 0 ? 'bg-[#1e293b]' : 'bg-slate-100 border border-slate-200'} rounded-xl overflow-hidden mr-auto order-1 lg:order-2 divide-x divide-x-reverse ${level === 0 ? 'divide-slate-700' : 'divide-slate-200'} shadow-sm`}>
              <div className="px-4 py-2 text-center min-w-[80px]">
                <div className={`text-[10px] ${level === 0 ? 'text-slate-400' : 'text-slate-500'} mb-1`}>إجمالي العمليات</div>
                <div className={`font-bold text-xs ${level === 0 ? 'text-white' : 'text-slate-800'}`}>{node.invoiceCount}</div>
              </div>
              {appMode !== 'payroll' && (
                <>
                  <div className="px-4 py-2 text-center min-w-[100px]">
                    <div className={`text-[10px] ${level === 0 ? 'text-slate-400' : 'text-slate-500'} mb-1`}>إجمالي خاضع</div>
                    <div className={`font-bold text-xs ${level === 0 ? 'text-indigo-400' : 'text-indigo-600'}`} dir="ltr">{formatCurrency((node as any).data?.totalTaxable || node.totalTaxable || 0)}</div>
                  </div>
                  <div className="px-4 py-2 text-center min-w-[100px]">
                    <div className={`text-[10px] ${level === 0 ? 'text-slate-400' : 'text-slate-500'} mb-1`}>غير خاضع</div>
                    <div className={`font-bold text-xs ${level === 0 ? 'text-amber-400' : 'text-amber-600'}`} dir="ltr">{formatCurrency((node as any).data?.totalNonTaxable || node.totalNonTaxable || 0)}</div>
                  </div>
                </>
              )}
              <div className="px-4 py-2 text-center min-w-[100px]">
                <div className={`text-[10px] ${level === 0 ? 'text-slate-400' : 'text-slate-500'} mb-1`}>{appMode === 'payroll' ? 'إجمالي الأساسي' : 'الإجمالي قبل الضريبة'}</div>
                <div className={`font-bold text-xs ${level === 0 ? 'text-blue-400' : 'text-blue-600'}`} dir="ltr">{formatCurrency((node as any).data?.totalNet ?? ((node.totalTaxable || 0) + (node.totalNonTaxable || 0)))}</div>
              </div>
              <div className="px-4 py-2 text-center min-w-[100px]">
                <div className={`text-[10px] ${level === 0 ? 'text-slate-400' : 'text-slate-500'} mb-1`}>{appMode === 'payroll' ? 'إجمالي الاستقطاعات' : 'إجمالي الضريبة'}</div>
                <div className={`font-bold text-xs ${level === 0 ? 'text-slate-300' : 'text-slate-500'}`} dir="ltr">{formatCurrency(node.totalVAT)}</div>
              </div>
              <div className={`px-4 py-2 text-center min-w-[120px] ${level === 0 ? 'bg-slate-800' : 'bg-slate-200'}`}>
                <div className={`text-[10px] ${level === 0 ? 'text-slate-400' : 'text-slate-600'} mb-1`}>الإجمالي الكلي</div>
                <div className={`font-bold text-sm ${level === 0 ? 'text-white' : 'text-slate-900'}`} dir="ltr">{formatCurrency(node.totalSpend)}</div>
              </div>
            </div>
            <div className={`md:hidden flex items-center ${level === 0 ? 'bg-[#1e293b] text-white' : 'bg-slate-100 text-slate-800'} px-3 py-1.5 rounded-lg text-sm font-bold mr-auto border ${level === 0 ? 'border-slate-700' : 'border-slate-200'} shadow-sm`}>
               {formatCurrency(node.totalSpend)}
            </div>
          </div>
          
          {isExpanded && (
            <div className="p-4 bg-white">
              {hasChildren && renderHierarchy(node.children, level + 1)}
              {node.isLeaf && renderEntities(node.data)}
            </div>
          )}
        </div>
      );
    });
  };

  const hierarchy = buildHierarchy(categoriesArray);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className={`bg-${theme.accent}-50 text-${theme.accent}-900 px-5 py-4 rounded-xl border border-${theme.accent}-200 text-sm font-bold flex items-center mb-6 shadow-sm`}>
        <Activity className="w-5 h-5 ml-3 shrink-0"/>
        <span>التحليل المالي الهرمي: يتم تجميع البيانات في مستويات متعددة حسب التصنيفات المحاسبية. انقر على أي تصنيف لتوسيع الحسابات الفرعية والجهات التابعة له.</span>
      </div>

      {categoriesArray.length > 0 && (
        <div className="bg-[#0f172a] rounded-xl p-5 mb-6 shadow-md border border-slate-700 flex flex-wrap gap-4 justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/20 p-2 rounded-lg">
              <Activity className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">الإجمالي العام للتصنيفات</h2>
              <p className="text-xs text-slate-400">ملخص جميع التصنيفات</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-sm justify-end shrink-0">
            <div className="bg-white/5 rounded-lg px-4 py-2 border border-white/10 text-center min-w-[110px]">
              <span className="block text-white/50 text-[10px] mb-1">إجمالي العمليات</span>
              <strong className="font-bold text-white text-lg">{categoriesArray.reduce((sum, cat) => sum + (Number(cat.invoiceCount) || 0), 0)}</strong>
            </div>
            {appMode !== 'payroll' && (
              <>
                <div className="bg-white/5 rounded-lg px-4 py-2 border border-white/10 text-center min-w-[110px]">
                  <span className="block text-white/50 text-[10px] mb-1">إجمالي خاضع</span>
                  <strong className="font-bold text-indigo-400 text-lg" dir="ltr">{formatCurrency(categoriesArray.reduce((sum, cat) => sum + (Number(cat.totalTaxable) || 0), 0))}</strong>
                </div>
                <div className="bg-white/5 rounded-lg px-4 py-2 border border-white/10 text-center min-w-[110px]">
                  <span className="block text-white/50 text-[10px] mb-1">المبلغ غير الخاضع</span>
                  <strong className="font-bold text-amber-400 text-lg" dir="ltr">{formatCurrency(categoriesArray.reduce((sum, cat) => sum + (Number(cat.totalNonTaxable) || 0), 0))}</strong>
                </div>
              </>
            )}
            <div className="bg-white/5 rounded-lg px-4 py-2 border border-white/10 text-center min-w-[110px]">
              <span className="block text-white/50 text-[10px] mb-1">{appMode === 'payroll' ? 'إجمالي الأساسي' : 'الإجمالي قبل الضريبة'}</span>
              <strong className="font-bold text-blue-400 text-lg" dir="ltr">{formatCurrency(categoriesArray.reduce((sum, cat) => sum + (Number(cat.totalNet) || 0), 0))}</strong>
            </div>
            <div className="bg-white/5 rounded-lg px-4 py-2 border border-white/10 text-center min-w-[110px]">
              <span className="block text-white/50 text-[10px] mb-1">{appMode === 'payroll' ? 'إجمالي الاستقطاعات' : 'إجمالي الضريبة'}</span>
              <strong className="font-bold text-slate-300 text-lg" dir="ltr">{formatCurrency(categoriesArray.reduce((sum, cat) => sum + (Number(cat.totalVAT) || 0), 0))}</strong>
            </div>
            <div className="bg-white/5 rounded-lg px-4 py-2 border border-white/10 text-center min-w-[110px]">
              <span className="block text-white/50 text-[10px] mb-1">{appMode === 'payroll' ? 'إجمالي صافي الرواتب' : 'الإجمالي الكلي'}</span>
              <strong className="font-black text-emerald-400 text-lg" dir="ltr">{formatCurrency(categoriesArray.reduce((sum, cat) => sum + (Number(cat.totalSpend) || 0), 0))}</strong>
            </div>
          </div>
        </div>
      )}

      {categoriesArray.length === 0 ? (
        <div className="bg-white rounded-xl p-16 text-center text-slate-400 border border-slate-200">لا توجد بيانات متاحة للتصنيفات بهذه الفلاتر.</div>
      ) : (
        <div className="space-y-4">
          {renderHierarchy(hierarchy)}
        </div>
      )}
    </div>
  );
};
