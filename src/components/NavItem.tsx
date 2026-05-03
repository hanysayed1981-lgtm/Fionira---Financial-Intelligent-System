/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface NavItemProps {
  mode: string;
  tab: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
  currentMode: string;
  currentTab: string;
  onClick: (mode: string, tab: string) => void;
}

export const NavItem: React.FC<NavItemProps> = ({ mode, tab, icon: IconC, label, badge, currentMode, currentTab, onClick }) => {
   const isActive = currentMode === mode && currentTab === tab;
   const activeClass = mode === 'expenses' ? 'bg-indigo-600 text-white shadow-md' : (mode === 'revenues' ? 'bg-emerald-600 text-white shadow-md' : (mode === 'payroll' ? 'bg-amber-600 text-white shadow-md' : 'bg-rose-600 text-white shadow-md'));
   const hoverClass = 'text-slate-400 hover:bg-slate-800 hover:text-white';
   return (
       <button onClick={() => onClick(mode, tab)} className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-xl transition-all duration-200 text-base font-bold mb-2 ${isActive ? activeClass : hoverClass}`}>
           <IconC className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
           <span className="flex-1 text-right truncate">{label}</span>
           {badge && badge > 0 ? <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${isActive ? 'bg-white text-indigo-600' : 'bg-rose-500 text-white'}`}>{badge}</span> : null}
       </button>
   )
};
