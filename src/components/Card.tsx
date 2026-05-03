/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface CardProps {
  title?: string;
  value?: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  color?: "blue" | "emerald" | "indigo" | "red" | "amber";
  children?: React.ReactNode;
  className?: string;
  id?: string;
}

export const Card: React.FC<CardProps> = ({ title, value, subtitle, icon: IconComp, color = "blue", children, className = "", id }) => {
  if (children) {
    return (
      <div id={id} className={`bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden ${className}`}>
        {children}
      </div>
    );
  }

  const colorMap = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    red: "bg-red-50 text-red-600 border-red-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100"
  };

  return (
    <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4 space-x-reverse transition-all hover:shadow-md ${className}`}>
      {IconComp && (
        <div className={`p-3 rounded-lg ${colorMap[color]}`}>
          <IconComp className="w-6 h-6" />
        </div>
      )}
      <div>
        {title && <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>}
        {value !== undefined && <h3 className="text-2xl font-bold text-slate-800">{value}</h3>}
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};
