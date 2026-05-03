/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TrendingUp, Activity } from 'lucide-react';
import { formatCurrency } from '../lib/financial-utils';

interface OwnersSummaryProps {
  incomeStatement: any;
}

export const OwnersSummary: React.FC<OwnersSummaryProps> = ({ incomeStatement }) => {
  const { totalRevenue, totalOPEX, totalCOGS, grossProfit, netOperatingIncome, netMargin, grossMargin, totalPayroll } = incomeStatement;

  return (
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300 pb-10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>
                  <div>
                      <p className="text-slate-500 text-sm font-bold mb-1">إجمالي المبيعات</p>
                      <p className="text-xs text-slate-400 mb-3">المبيعات الصافية (بدون ضريبة)</p>
                  </div>
                  <h3 className="text-3xl font-black text-slate-800" dir="ltr">{formatCurrency(totalRevenue)}</h3>
              </div>
              
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-2 h-full bg-blue-500"></div>
                  <div>
                      <p className="text-slate-500 text-sm font-bold mb-1">تكلفة المبيعات</p>
                      <p className="text-xs text-slate-400 mb-3">تكلفة الطعام والمواد الغذائية (COGS)</p>
                  </div>
                  <h3 className="text-3xl font-black text-slate-800" dir="ltr">{formatCurrency(totalCOGS)}</h3>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-2 h-full bg-amber-500"></div>
                  <div>
                      <p className="text-slate-500 text-sm font-bold mb-1">إجمالي المصاريف التشغيلية</p>
                      <p className="text-xs text-slate-400 mb-3">الرواتب، الإيجارات، والتشغيل (OPEX)</p>
                  </div>
                  <h3 className="text-3xl font-black text-slate-800" dir="ltr">{formatCurrency(totalOPEX)}</h3>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-2 h-full bg-purple-500"></div>
                  <div>
                      <p className="text-slate-500 text-sm font-bold mb-1">صافي الرواتب</p>
                      <p className="text-xs text-slate-400 mb-3">صافي الرواتب والأجور (ضمن التشغيلية)</p>
                  </div>
                  <h3 className="text-3xl font-black text-slate-800" dir="ltr">{formatCurrency(totalPayroll)}</h3>
              </div>

              <div className={`p-6 rounded-2xl border shadow-sm relative overflow-hidden flex flex-col justify-between ${netOperatingIncome >= 0 ? 'bg-indigo-600 border-indigo-700' : 'bg-red-600 border-red-700'}`}>
                  <div>
                      <p className="text-white/80 text-sm font-bold mb-1">صافي الأرباح</p>
                      <p className="text-xs text-white/60 mb-3">الربح الصافي النهائي (Net Income)</p>
                  </div>
                  <h3 className="text-3xl font-black text-white" dir="ltr">{formatCurrency(netOperatingIncome)}</h3>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                      <div className="bg-emerald-100 p-3 rounded-full"><TrendingUp className="w-6 h-6 text-emerald-600" /></div>
                      <div>
                          <p className="text-slate-500 text-sm font-bold">نسبة مجمل الربح</p>
                          <p className="text-xs text-slate-400">الربحية بعد خصم تكلفة المواد</p>
                      </div>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800" dir="ltr">%{grossMargin.toFixed(1)}</h3>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                      <div className="bg-indigo-100 p-3 rounded-full"><TrendingUp className="w-6 h-6 text-indigo-600" /></div>
                      <div>
                          <p className="text-slate-500 text-sm font-bold">نسبة صافي الربح</p>
                          <p className="text-xs text-slate-400">الربحية النهائية للمطعم</p>
                      </div>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800" dir="ltr">%{netMargin.toFixed(1)}</h3>
              </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center">
                  <Activity className="w-5 h-5 ml-2 text-indigo-500" /> مسار تدفق الأرباح (Profitability Waterfall)
              </h3>
              <div className="space-y-5">
                  <div>
                      <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-bold text-slate-700 ml-4">1. إجمالي المبيعات المحصلة</span>
                          <div className="flex gap-4">
                              <span className="font-black text-slate-900 shrink-0" dir="ltr">{formatCurrency(totalRevenue)}</span>
                              <span className="text-slate-400 font-bold w-12 text-left">%100.0</span>
                          </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3">
                          <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '100%' }}></div>
                      </div>
                  </div>

                  <div>
                      <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-bold text-slate-700 ml-4">2. مجمل الربح (بعد خصم تكلفة المواد)</span>
                          <div className="flex gap-4">
                              <span className="font-black text-slate-900 shrink-0" dir="ltr">{formatCurrency(grossProfit)}</span>
                              <span className="text-slate-400 font-bold w-12 text-left">%{totalRevenue > 0 ? ((grossProfit/totalRevenue)*100).toFixed(1) : '0.0'}</span>
                          </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3">
                          <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${totalRevenue > 0 ? (grossProfit/totalRevenue)*100 : 0}%` }}></div>
                      </div>
                  </div>

                  <div>
                      <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-bold text-slate-700 ml-4">3. صافي الأرباح (بعد خصم كافة المصاريف التشغيلية)</span>
                          <div className="flex gap-4">
                              <span className="font-black text-slate-900 shrink-0" dir="ltr">{formatCurrency(netOperatingIncome)}</span>
                              <span className="text-slate-400 font-bold w-12 text-left">%{netMargin.toFixed(1)}</span>
                          </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3">
                          <div className={`h-3 rounded-full ${netMargin >= 0 ? 'bg-indigo-600' : 'bg-red-500'}`} style={{ width: `${Math.max(0, netMargin)}%` }}></div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );
};
