import React, { useState, useMemo } from 'react';
import { FinancialRecord } from '../types';
import { formatCurrency, formatMonthName } from '../lib/financial-utils';
import { Tag, Search, Filter, Box } from 'lucide-react';

interface ItemsDirectoryProps {
  records: FinancialRecord[];
  appMode: 'expenses' | 'revenues' | 'payroll' | 'banks' | 'reports';
  onInvoiceClick?: (invoice: FinancialRecord) => void;
}

export const ItemsDirectory: React.FC<ItemsDirectoryProps> = ({ records, appMode, onInvoiceClick }) => {
  const [search, setSearch] = useState('');

  const itemsMap = useMemo(() => {
    const map = new Map<string, {
      name: string;
      count: number;
      totalSpend: number;
      totalTaxable: number;
      entities: Set<string>;
      invoices: FinancialRecord[];
    }>();

    records.forEach(r => {
      const name = r.Item_Description?.trim() || 'بدون وصف';
      if (!map.has(name)) {
        map.set(name, {
          name,
          count: 0,
          totalSpend: 0,
          totalTaxable: 0,
          entities: new Set(),
          invoices: []
        });
      }
      const item = map.get(name)!;
      item.count++;
      item.totalSpend += (r.Total_Amount || 0);
      item.totalTaxable += (r.Taxable_Amount || 0);
      if (r.Entity_Normalized_Name) {
        item.entities.add(r.Entity_Normalized_Name);
      }
      item.invoices.push(r);
    });

    return Array.from(map.values()).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [records]);

  const filteredItems = useMemo(() => {
    if (!search) return itemsMap;
    const lower = search.toLowerCase();
    return itemsMap.filter(item => 
      item.name.toLowerCase().includes(lower) || 
      Array.from(item.entities).some(e => e.toLowerCase().includes(lower))
    );
  }, [itemsMap, search]);

  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const toggleItem = (name: string) => {
    setExpandedItem(prev => prev === name ? null : name);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <Box className="w-6 h-6 text-indigo-600" />
          سجل وتعريف {appMode === 'expenses' ? 'المشتريات والأصناف' : appMode === 'revenues' ? 'الخدمات والأصناف المباعة' : 'العناصر'}
        </h3>
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="بحث في الأصناف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-9 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-100 text-slate-500 font-bold">
            <tr>
              <th className="py-4 px-6 w-1/3">اسم الصنف / الخدمة</th>
              <th className="py-4 px-6 text-center">عدد العمليات</th>
              <th className="py-4 px-6 text-center">الجهات المرتبطة</th>
              <th className="py-4 px-6 text-center">الإجمالي الخاضع</th>
              <th className="py-4 px-6 text-center">الإجمالي الكلي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.map((item, idx) => (
              <React.Fragment key={idx}>
                <tr 
                  className={`hover:bg-indigo-50/30 transition-colors cursor-pointer ${expandedItem === item.name ? 'bg-indigo-50' : ''}`}
                  onClick={() => toggleItem(item.name)}
                >
                  <td className="py-4 px-6">
                    <div className="font-bold text-slate-800">{item.name}</div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center justify-center bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                      {item.count} عملية
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-slate-500 text-xs">
                      {item.entities.size} جهات
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center font-bold text-slate-700" dir="ltr">
                    {formatCurrency(item.totalTaxable)}
                  </td>
                  <td className="py-4 px-6 text-center font-black text-indigo-600" dir="ltr">
                    {formatCurrency(item.totalSpend)}
                  </td>
                </tr>
                {expandedItem === item.name && (
                  <tr>
                    <td colSpan={5} className="bg-slate-50 p-4 border-b border-slate-200">
                      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-inner max-h-[300px] overflow-y-auto">
                        <table className="w-full text-right text-xs">
                          <thead className="text-slate-400 border-b border-slate-100">
                            <tr>
                              <th className="py-2 px-4">التاريخ</th>
                              <th className="py-2 px-4">رقم المستند</th>
                              <th className="py-2 px-4">الجهة</th>
                              <th className="py-2 px-4 text-center">الإجمالي</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.invoices.sort((a,b) => new Date(b.Invoice_Date).getTime() - new Date(a.Invoice_Date).getTime()).map((inv, i) => (
                              <tr 
                                key={i} 
                                className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onInvoiceClick?.(inv);
                                }}
                              >
                                <td className="py-2 px-4 text-slate-500">{inv.Invoice_Date}</td>
                                <td className="py-2 px-4 font-medium">{inv.Invoice_Number}</td>
                                <td className="py-2 px-4 font-bold text-slate-700">{inv.Entity_Normalized_Name}</td>
                                <td className="py-2 px-4 text-center font-bold" dir="ltr">{formatCurrency(inv.Total_Amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  لا توجد أصناف مطابقة للبحث
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
