const fs = require('fs');

let code = fs.readFileSync('src/components/VisualDashboard.tsx', 'utf8');

const tableCode = `
  const valTraceRaw = typeof window !== 'undefined' ? localStorage.getItem('__validationTrace') : null;
  let valTraceItems: any[] = [];
  if (valTraceRaw) {
    try {
      const parsedTraces = JSON.parse(valTraceRaw);
      if (Array.isArray(parsedTraces)) {
        parsedTraces.forEach((group: any) => {
           if (Array.isArray(group)) valTraceItems.push(...group);
        });
      }
    } catch(e) {}
  }
`;

const injectUI = `
      {valTraceItems.length > 0 && (
        <div className=\"bg-slate-900 text-white p-6 rounded-2xl shadow-xl overflow-auto col-span-full border border-slate-700 mb-8\">
          <h2 className=\"text-xl font-mono text-emerald-400 mb-4 flex items-center\"><span className=\"mr-2\">🔴</span> ROOT CAUSE VALIDATION TRACE (MANDATORY PROOF)</h2>
          <table className=\"w-full text-left text-xs text-slate-300 font-mono\">
            <thead>
              <tr className=\"border-b border-slate-700\">
                <th className=\"py-2 px-2\">Raw Taxable</th>
                <th className=\"py-2 px-2\">Extr. Taxable</th>
                <th className=\"py-2 px-2\">Raw NonTaxable</th>
                <th className=\"py-2 px-2\">Extr. NonTaxable</th>
                <th className=\"py-2 px-2\">Raw Total</th>
                <th className=\"py-2 px-2\">Extr. Total</th>
                <th className=\"py-2 px-2\">Invoice</th>
                <th className=\"py-2 px-2\">Date</th>
                <th className=\"py-2 px-2\">Year</th>
                <th className=\"py-2 px-2\">Category</th>
                <th className=\"py-2 px-2\">Identity Check</th>
              </tr>
            </thead>
            <tbody>
              {valTraceItems.slice(0, 10).map((t: any, i: number) => (
                <tr key={i} className=\"border-b border-slate-800 hover:bg-slate-800 transition\">
                  <td className=\"py-2 px-2\">{String(t.raw_taxable)}</td>
                  <td className=\"py-2 px-2\">{String(t.extracted_taxable)}</td>
                  <td className=\"py-2 px-2\">{String(t.raw_non_taxable)}</td>
                  <td className=\"py-2 px-2\">{String(t.extracted_non_taxable)}</td>
                  <td className=\"py-2 px-2\">{String(t.raw_total)}</td>
                  <td className=\"py-2 px-2\">{String(t.extracted_total)}</td>
                  <td className=\"py-2 px-2\">{String(t.invoice)}</td>
                  <td className=\"py-2 px-2\">{String(t.date)}</td>
                  <td className=\"py-2 px-2\">{String(t.period_year)}</td>
                  <td className=\"py-2 px-2 max-w-[150px] truncate\" title={t.category}>{String(t.category)}</td>
                  <td className={t.financial_identity_check === 'PASS' ? 'py-2 px-2 font-bold text-emerald-500' : 'py-2 px-2 font-bold text-rose-500'}>{String(t.financial_identity_check)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
`;

if (!code.includes('valTraceItems')) {
   code = code.replace(/return \(\s*<div className=\"max-w-7xl mx-auto space-y-8/g, tableCode + '\n  return (\n    <div className=\"max-w-7xl mx-auto space-y-8');
}

if (!code.includes('ROOT CAUSE VALIDATION TRACE')) {
   code = code.replace(/(<div className=\"max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12 px-4\">)/, "$1\n" + injectUI);
}

fs.writeFileSync('src/components/VisualDashboard.tsx', code);
