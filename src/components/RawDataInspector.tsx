import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { Loader2, Database, AlertCircle, FileSpreadsheet, Eye, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthProvider';

interface RawDataInspectorProps {
  appMode: 'expenses' | 'revenues' | 'payroll' | 'banks';
}

export function RawDataInspector({ appMode }: RawDataInspectorProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileRecords, setFileRecords] = useState<any[]>([]);
  const [skippedRows, setSkippedRows] = useState<any[]>([]);
  const [fileSchema, setFileSchema] = useState<any>(null);
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, [appMode]);

  const fetchFiles = async (retries = 3) => {
    let fetchError: any = null;
    try {
      setLoading(true);
      if (!profile?.tenantId) return;
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      
      const res = await fetch('/api/erp/files', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const text = await res.text();
      let data;
      try {
         data = JSON.parse(text);
      } catch (err: any) {
         console.error("RAWDATAINSPECTOR ERROR FETCHING: Received non-JSON response:", text.slice(0, 150));
         throw new Error(err.message);
      }
      
      if (res.ok && data.success) {
         let loadedFiles = Array.isArray(data.data) ? data.data : [];
         loadedFiles = loadedFiles.filter((f: any) => (f.fileType === appMode || f.moduleType === appMode) && f.tenantId === profile?.tenantId);
         // sort by uploadDate desc
         loadedFiles.sort((a: any, b: any) => new Date(b.uploadDate || 0).getTime() - new Date(a.uploadDate || 0).getTime());
         setFiles(loadedFiles);
         if (loadedFiles.length > 0) {
           handleSelectFile(loadedFiles[0]);
         }
      }
    } catch (error: any) {
      fetchError = error;
      if (error?.message === 'Failed to fetch' && retries > 0) {
         console.warn(`Server busy, retrying fetchFiles (${retries} retries left)...`);
         await new Promise(r => setTimeout(r, 1500));
         return fetchFiles(retries - 1);
      }
      console.error('Error fetching files:', error);
    } finally {
      if (retries === 3 || !fetchError || fetchError.message !== 'Failed to fetch') {
         setLoading(false);
      }
    }
  };

  const handleSelectFile = async (file: any) => {
    setSelectedFile(file.id);
    setFileSchema(file.schema || null);
    
    try {
      setLoadingRecords(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      
      const res = await fetch(`/api/erp/files/${file.id}/data`, {
         headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok && data.records) {
         let records = data.records;
         // Sort by Invoice_Date
         records.sort((a: any, b: any) => {
             const dateA = new Date(a.Invoice_Date || 0).getTime();
             const dateB = new Date(b.Invoice_Date || 0).getTime();
             const isValidA = !isNaN(dateA);
             const isValidB = !isNaN(dateB);
             
             if (isValidA && isValidB && dateA !== dateB) return dateA - dateB;
             if (isValidA && !isValidB) return -1;
             if (!isValidA && isValidB) return 1;
             
             return (a._originalIndex || 0) - (b._originalIndex || 0);
         });
         setFileRecords(records);
         setSkippedRows(data.skippedRows || []);
      } else {
         setFileRecords([]);
         setSkippedRows([]);
      }
    } catch (error) {
      console.error('Error fetching records:', error);
      setFileRecords([]);
      setSkippedRows([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Database className="w-6 h-6 text-indigo-600" />
              مستكشف البيانات الخام (Raw Data)
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              تتبع وتحليل البيانات المستخرجة من ملفات الإكسيل بدقة للتحقق من القيم الفعلية قبل وبعد التعيين (Mapping).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-2 border-l border-slate-100 pl-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />الملفات المرفوعة مؤخراً
            </h3>
            {files.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-8">لا يوجد ملفات</div>
            ) : (
              files.map((file, idx) => (
                <button
                  key={`${file.id}-${idx}`}
                  onClick={() => handleSelectFile(file)}
                  className={`w-full text-right p-3 rounded-xl border transition-all ${
                    selectedFile === file.id
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                      : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-sm truncate">{file.fileName}</div>
                  <div className="text-xs mt-1 opacity-70 flex justify-between">
                    <span>{new Date(file.uploadDate).toLocaleDateString('en-GB')}</span>
                    <span>{file.recordsCount || '?'} سجل</span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="lg:col-span-3">
            {selectedFile ? (
              loadingRecords ? (
                <div className="flex justify-center items-center h-64 border border-slate-100 rounded-2xl bg-slate-50">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
              ) : (
                <div className="space-y-4">
                  {fileSchema && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">مخطط الأعمدة (Schema Map)</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-sm">
                        {Object.entries(fileSchema).map(([key, val]) => (
                          <div key={key} className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                            <div className="text-[10px] text-slate-400 mb-1">{key}</div>
                            <div className="font-mono font-medium text-slate-700 truncate" title={String(val)}>{val ? String(val) : '-'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                    {/* Diagnostic Summary Section required for proof */}
                    <div className="p-4 bg-slate-800 text-white font-mono text-xs rounded-t-xl overflow-x-auto shadow-inner">
                      <h4 className="font-bold text-amber-400 mb-2">SYSTEM AUDIT LOGIC TRACE</h4>
                      <div className="flex gap-8 mb-4 border-b border-slate-700 pb-2">
                        <div><span className="text-slate-400">TOTAL NET: </span> {Number(fileRecords.reduce((sum, r) => sum + (r.Net_Amount || 0), 0).toFixed(2)).toLocaleString()}</div>
                        <div><span className="text-slate-400">TOTAL TAXABLE: </span> {Number(fileRecords.reduce((sum, r) => sum + (r.Taxable_Amount || 0), 0).toFixed(2)).toLocaleString()}</div>
                        <div><span className="text-slate-400">TOTAL NON-TAXABLE: </span> {Number(fileRecords.reduce((sum, r) => sum + (r.NonTaxable_Amount || 0), 0).toFixed(2)).toLocaleString()}</div>
                        <div className={Math.abs(fileRecords.reduce((sum, r) => sum + (r.Net_Amount || 0), 0) - (fileRecords.reduce((sum, r) => sum + (r.Taxable_Amount || 0), 0) + fileRecords.reduce((sum, r) => sum + (r.NonTaxable_Amount || 0), 0))) > 0.1 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                          <span className="text-slate-400">IDENTITY MATCH: </span> 
                          {Math.abs(fileRecords.reduce((sum, r) => sum + (r.Net_Amount || 0), 0) - (fileRecords.reduce((sum, r) => sum + (r.Taxable_Amount || 0), 0) + fileRecords.reduce((sum, r) => sum + (r.NonTaxable_Amount || 0), 0))) > 0.1 ? 'FAIL (Net != Taxable + NonTaxable)' : 'OK'}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-6 gap-2 mb-1 text-slate-400 pb-1 border-b border-slate-700/50">
                        <div>SORTING DATE</div>
                        <div>NET</div>
                        <div>TAXABLE</div>
                        <div>NON-TAXABLE</div>
                        <div>TOTAL</div>
                        <div>CATEGORY</div>
                      </div>
                      {fileRecords.slice(0, 5).map((r, idx) => (
                        <div key={idx} className="grid grid-cols-6 gap-2 font-mono py-1 border-b border-slate-800 hover:bg-slate-700">
                          <div>{r.Invoice_Date || 'NULL'}</div>
                          <div>{Number(r.Net_Amount || 0).toLocaleString()}</div>
                          <div>{Number(r.Taxable_Amount || 0).toLocaleString()}</div>
                          <div>{Number(r.NonTaxable_Amount || 0).toLocaleString()}</div>
                          <div>{Number(r.Total_Amount || 0).toLocaleString()}</div>
                          <div className="truncate text-[10px] text-slate-300" title={r.Category}>{r.Category}</div>
                        </div>
                      ))}
                    </div>
                    {/* End Diagnostic Summary Section */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-right">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 whitespace-nowrap">#</th>
                            <th className="px-4 py-3 whitespace-nowrap">الجهة (Raw)</th>
                            <th className="px-4 py-3 whitespace-nowrap">الرقم الضريبي</th>
                            <th className="px-4 py-3 whitespace-nowrap">رقم الفاتورة</th>
                            <th className="px-4 py-3 whitespace-nowrap">سنة الفترة</th>
                            <th className="px-4 py-3 whitespace-nowrap">الصافي (Net)</th>
                            <th className="px-4 py-3 whitespace-nowrap">الخاضع (Taxable)</th>
                            <th className="px-4 py-3 whitespace-nowrap">غير خاضع</th>
                            <th className="px-4 py-3 whitespace-nowrap">الضريبة (VAT)</th>
                            <th className="px-4 py-3 whitespace-nowrap bg-indigo-50/50">الإجمالي (Total)</th>
                            <th className="px-4 py-3 whitespace-nowrap">الوصف</th>
                            <th className="px-4 py-3 whitespace-nowrap">التصنيف النهائي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {fileRecords.slice(0, 10).map((rec, i) => {
                            // Highlighting invalid calculations
                            const netMismatch = Math.abs(rec.Net_Amount - (rec.Taxable_Amount + rec.NonTaxable_Amount)) > 0.1;
                            const totalMismatch = Math.abs(rec.Total_Amount - (rec.Net_Amount + rec.VAT_Amount)) > 0.1;
                            return (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-slate-400 font-mono text-xs">{rec._originalIndex || i + 1}</td>
                              <td className="px-4 py-3 font-medium text-slate-800 max-w-[150px] truncate" title={rec.Raw_Entity}>{rec.Raw_Entity}</td>
                              <td className="px-4 py-3 text-slate-600 font-mono text-xs">{rec.Entity_TaxID || '-'}</td>
                              <td className="px-4 py-3 text-slate-600 truncate max-w-[120px]">{rec.Invoice_Number}</td>
                              <td className={`px-4 py-3 font-mono font-bold text-slate-600 ${!rec.Period_Year ? 'text-amber-500' : ''}`}>{rec.Period_Year || 'NULL'}</td>
                              <td className={`px-4 py-3 font-mono ${netMismatch ? 'text-rose-500 bg-rose-50 font-black' : 'text-slate-600'}`}>{Number(rec.Net_Amount || 0).toLocaleString()}</td>
                              <td className="px-4 py-3 font-mono text-slate-600">{Number(rec.Taxable_Amount || 0).toLocaleString()}</td>
                              <td className="px-4 py-3 font-mono text-slate-600">{Number(rec.NonTaxable_Amount || 0).toLocaleString()}</td>
                              <td className="px-4 py-3 font-mono text-rose-600">{Number(rec.VAT_Amount || 0).toLocaleString()}</td>
                              <td className={`px-4 py-3 font-mono font-bold bg-indigo-50/30 ${totalMismatch ? 'text-rose-600 bg-rose-100' : 'text-indigo-700'}`}>{Number(rec.Total_Amount || 0).toLocaleString()}</td>
                              <td className="px-4 py-3 text-slate-600 text-xs truncate max-w-[150px]" title={rec.Item_Description}>{rec.Item_Description || '-'}</td>
                              <td className={`px-4 py-3 text-xs truncate max-w-[150px] ${rec.Category === 'غير مصنف' || rec.Category === 'مصروفات عمومية وإدارية - أخرى' ? 'text-amber-600 font-bold' : 'text-slate-600'}`} title={rec.Category}>{rec.Category}</td>
                            </tr>
                            );
                          })}
                          {fileRecords.length === 0 && (
                            <tr>
                              <td colSpan={12} className="px-4 py-8 text-center text-slate-500">لا يوجد سجلات قابلة للعرض</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {skippedRows.length > 0 && (
                    <div className="border border-rose-200 rounded-xl overflow-hidden shadow-sm bg-white mt-8">
                      <div className="bg-rose-50 border-b border-rose-100 p-4">
                         <h3 className="font-bold text-rose-700 flex items-center gap-2">
                           <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                           الصفوف المستبعدة (الأخطاء)
                         </h3>
                         <p className="text-sm text-rose-600 mt-1">
                           هذه الصفوف لم يتم احتسابها لوجود مشاكل فيها أو نقص في البيانات الأساسية.
                         </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                          <thead className="bg-rose-50/50 text-slate-600 font-bold border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-3 whitespace-nowrap">رقم الصف</th>
                              <th className="px-4 py-3 whitespace-nowrap">سبب الاستبعاد</th>
                              <th className="px-4 py-3 whitespace-nowrap">البيانات الخام</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {skippedRows.map((row, i) => (
                              <tr key={i} className="hover:bg-rose-50/30 transition-colors">
                                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{row.rowIndex || row.index}</td>
                                <td className="px-4 py-3 font-bold text-rose-600 max-w-[200px]">{row.reason}</td>
                                <td className="px-4 py-3 text-xs font-mono text-slate-600 max-w-xl truncate overflow-hidden" title={JSON.stringify(row.rawData)}>
                                   {JSON.stringify(row.rawData)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 p-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <Eye className="w-12 h-12 mb-4 text-slate-300" />
                <p>الرجاء اختيار ملف من القائمة الجانبية لاستعراض البيانات الخام</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
