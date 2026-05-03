import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Activity, X, Server, LayoutTemplate } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '../lib/financial-utils';

interface ShadowValidationProps {
  shadowState: {
    status: 'idle' | 'testing' | 'match' | 'mismatch' | 'error';
    backendResult: any | null;
  };
  frontendData: any;
}

export const ShadowValidationUI: React.FC<ShadowValidationProps> = ({ shadowState, frontendData }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (shadowState.status === 'idle') return null;

  const getStatusConfig = () => {
    switch (shadowState.status) {
      case 'testing':
        return { icon: <Activity className="w-4 h-4 animate-spin text-blue-500" />, text: 'Validating Logic...', bg: 'bg-blue-50 border-blue-200 text-blue-700' };
      case 'match':
        return { icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />, text: 'Shadow Validation Match', bg: 'bg-emerald-50 border-emerald-200 text-emerald-700' };
      case 'mismatch':
        return { icon: <ShieldAlert className="w-4 h-4 text-rose-500" />, text: 'Logic Mismatch Detected', bg: 'bg-rose-50 border-rose-200 text-rose-700' };
      case 'error':
        return { icon: <ShieldAlert className="w-4 h-4 text-amber-500" />, text: 'Validation Error', bg: 'bg-amber-50 border-amber-200 text-amber-700' };
    }
  };

  const config = getStatusConfig();
  const backendData = shadowState.backendResult;

  const compareMetric = (label: string, frontValue: number, backValue: number) => {
    const isMatch = Math.abs(frontValue - backValue) < 0.01;
    return (
      <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm mb-2">
        <span className="font-bold text-slate-700 flex-1">{label}</span>
        <div className="flex gap-4 flex-1 justify-end items-center transition-all">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-black text-slate-400">Frontend</span>
            <span className="font-mono text-sm font-bold text-slate-800">{formatCurrency(frontValue)}</span>
          </div>
          <div className={`w-8 flex justify-center ${isMatch ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isMatch ? '=' : '≠'}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-black text-slate-400">Backend</span>
            <span className={`font-mono text-sm font-bold ${isMatch ? 'text-slate-800' : 'text-rose-600'}`}>{formatCurrency(backValue)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Floating Indicator */}
      <motion.button
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 left-6 z-50 px-4 py-2 rounded-full border shadow-lg flex items-center gap-2 text-sm font-bold transition-transform hover:scale-105 active:scale-95 ${config.bg} cursor-pointer`}
      >
        {config.icon}
        <span>{config.text}</span>
      </motion.button>

      {/* Validation Report Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-50 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
              dir="ltr"
            >
              <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${shadowState.status === 'match' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {shadowState.status === 'match' ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Parallel Validation Report</h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Architecture Integrity Check</p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {shadowState.status === 'testing' ? (
                  <div className="py-20 text-center text-slate-500 flex flex-col items-center">
                    <Activity className="w-12 h-12 animate-spin text-blue-500 mb-4" />
                    <p className="font-bold text-lg text-slate-700">Validating Background Ledger...</p>
                    <p className="text-sm">Running identical payloads through Frontend & Backend engines</p>
                  </div>
                ) : !backendData || shadowState.status === 'error' ? (
                  <div className="py-12 text-center">
                    <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto mb-4" />
                    <p className="font-bold text-rose-600">Failed to communicate with Backend validation engine.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-sm text-indigo-800 font-medium">
                      This report ensures that compiling the exact same dataset via pure React Frontend functions (Source of Truth) matches the output of the Express Backend Ledger Engine.
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-black text-slate-400 uppercase text-xs tracking-widest pl-2 mb-2">Core Metrics</h3>
                      {compareMetric('Total Revenue', frontendData.totalRevenue || 0, backendData.totalRevenue || 0)}
                      {compareMetric('Total COGS', frontendData.totalCOGS || 0, backendData.totalCOGS || 0)}
                      {compareMetric('Gross Profit', frontendData.grossProfit || 0, backendData.grossProfit || 0)}
                      {compareMetric('Total OPEX', frontendData.totalOPEX || 0, backendData.totalOPEX || 0)}
                      {compareMetric('Net Operating Income', frontendData.netOperatingIncome || 0, backendData.netOperatingIncome || 0)}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
