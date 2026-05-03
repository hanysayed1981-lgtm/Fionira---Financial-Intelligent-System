import React, { useState, useEffect, useCallback } from 'react';
import { Upload as UploadIcon, FileSpreadsheet, Trash2, Eye, Loader2, AlertCircle, RefreshCw, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthProvider';
import { FinancialData, FinancialRecord } from '../types';
import { logger } from '../lib/logger';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { generateJournalEntries } from '../backend/core/erp-engine';

interface UploadedFile {
  id: string;
  originalId?: string;
  fileName: string;
  uploadDate: string;
  uploadedBy: string;
  fileType: 'expenses' | 'revenues' | 'payroll' | 'banks';
  recordCount: number;
  skippedRowCount?: number;
  status: 'processed' | 'error';
  periodYear?: string;
  tenantId: string; // Scoped to company
}

interface FileManagementProps {
  appMode: 'expenses' | 'revenues' | 'payroll' | 'banks';
  onUploadSuccess: () => void;
  onDeleteSuccess?: (deletedIds?: string | string[]) => void;
}

export const FileManagement: React.FC<FileManagementProps> = ({ appMode, onUploadSuccess, onDeleteSuccess }) => {
  const { user, profile } = useAuth();
  const isViewer = profile?.role === 'viewer';
  
  useEffect(() => {
    logger.info('FileManagement component mounted', { 
        appMode, 
        tenantId: profile?.tenantId,
        user: user?.uid 
    });
  }, [appMode]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [finalReport, setFinalReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [fileToDelete, setFileToDelete] = useState<{id: string, originalId?: string} | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<{files: {id: string, originalId?: string}[], message: string} | null>(null);

  const [abortController, setAbortController] = useState<AbortController | null>(null);

  useEffect(() => {
    if (profile?.tenantId) {
      fetchFiles().catch((err) => console.warn("Expected API rejection caught:", err));
    }
    setSelectedFiles(new Set());
    setStagedFiles([]); // Clear staged files when switching modes
  }, [appMode, profile?.tenantId]);

  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  }, []);

  const toggleYearSelection = useCallback((yearFiles: UploadedFile[]) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      const allSelected = yearFiles.every(f => next.has(f.id));
      
      yearFiles.forEach(f => {
        if (allSelected) {
          next.delete(f.id);
        } else {
          next.add(f.id);
        }
      });
      return next;
    });
  }, []);

  const deleteMultipleFiles = async (filesToDelete: {id: string, originalId?: string}[]) => {
    if (!profile?.tenantId || filesToDelete.length === 0) return;
    try {
      setBulkDeleteConfirm(null);
      setUploading(true);
      setUploadStatus('جاري الحذف...');
      
      const fileIds = filesToDelete.map(f => f.originalId || f.id);
      
      const res = await fetch('/api/erp/files/bulk-delete', {
        method: 'POST',
        headers: { 
           'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`,
           'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileIds })
      });
      if (!res.ok) throw new Error("فشل في حذف الملفات");

      setFiles(prev => prev.filter(file => !filesToDelete.find(d => d.id === file.id)));
      setSelectedFiles(new Set());
      setBulkDeleteConfirm(null);
      
      if (onDeleteSuccess) {
         onDeleteSuccess(fileIds);
      }
    } catch (e: any) {
      setError(e.message || 'Error deleting files');
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileId: string, originalId?: string) => {
    if (!profile?.tenantId) return;
    try {
      setFileToDelete(null);
      const targetId = originalId || fileId;
      const res = await fetch(`/api/erp/files/${targetId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}` }
      });
      if (!res.ok) throw new Error("فشل في حذف الملف");
      
      setFiles(prev => prev.filter(f => f.id !== fileId));
      if (onDeleteSuccess) {
         onDeleteSuccess(targetId);
      }
    } catch (e: any) {
      setError(e.message || 'Error deleting file');
    }
  };

  const fetchFiles = async (retries = 3) => {
    if (!profile?.tenantId) return;
    try {
      setLoading(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      
      const res = await fetch(`/api/erp/files?moduleType=${appMode}`, {
         headers: { 'Authorization': `Bearer ${token}` }
      });
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch (err: any) {
        console.error("FILEMANAGEMENT ERROR FETCHING: Received non-JSON response:", text.slice(0, 150));
        throw new Error(err.message);
      }
      
      if (json.success && json.data) {
         const innerArray = Array.isArray(json.data.data) ? json.data.data : (Array.isArray(json.data) ? json.data : []);
         // TEMPORARY DEBUG: Bypass frontend module filtering to render ALL files
         // const loadedFiles = innerArray
         //   .filter((f: any) => f.fileType === appMode || f.moduleType === appMode);
         const loadedFiles = innerArray;
         console.log(`[FRONTEND DEBUG] fetchFiles loaded ${loadedFiles.length} files`);
         
         loadedFiles.sort((a: any, b: any) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
         setFiles(loadedFiles);
      }
    } catch (e: any) {
      if (e?.message === 'Failed to fetch' && retries > 0) {
         console.warn(`Server busy, retrying fetchFiles (${retries} attempts left)...`);
         await new Promise(r => setTimeout(r, 1500));
         return fetchFiles(retries - 1);
      }
      console.error(e);
      setError('فشل في جلب الملفات');
    } finally {
      setLoading(false); // We don't worry about keeping loading true on retry as it looks fine in UI
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []) as File[];
    console.log(`[FRONTEND DEBUG] handleFileSelect: Selected ${selectedFiles.length} files`);
    selectedFiles.forEach(f => console.log(`[FRONTEND DEBUG] Selected file: ${f.name}, size: ${f.size}, type: ${f.type}`));
    if (!selectedFiles.length) return;
    setStagedFiles(prev => [...prev, ...selectedFiles]);
    e.target.value = ''; 
  };

  const removeStagedFile = (index: number) => {
    setStagedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processStagedFiles = async () => {
    if (!profile?.tenantId || !user?.uid) return;
    setUploading(true);
    setError(null);
    setUploadStatus('جاري تهيئة الملفات...');
    
    // Yield to browser to render the loading state
    await new Promise(resolve => setTimeout(resolve, 50));
    
    try {
      const sessionId = crypto.randomUUID();
      const filesToProcess = [];

      for (const file of stagedFiles) {
        setUploadStatus(`جاري فحص ${file.name}...`);
        console.log(`[FRONTEND DEBUG] Reading buffer for file: ${file.name}`);
        
        let buffer;
        try {
            buffer = await file.arrayBuffer();
        } catch (bufferErr) {
            console.error(`[FRONTEND DEBUG] ERROR reading buffer for ${file.name}:`, bufferErr);
            throw bufferErr;
        }

        console.log(`[FRONTEND DEBUG] Buffer read successful. Size: ${buffer.byteLength} bytes. Generating hash...`);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        console.log(`[FRONTEND DEBUG] Preparing file: ${file.name}, hash/id: ${fileHash} BEFORE duplicate/batch processing.`);
        
        // DO NOT PASS `originalFile: file` TO AVOID KEEPING FILE HANDLE OPEN IN BROWSER
        filesToProcess.push({ buffer, name: file.name, fileHash });
      }

      // CLEAR STAGED FILES IMMEDIATELY BEFORE BATCH PROCESSING SO BROWSER GC RELEASES FILE HANDLES
      setStagedFiles([]);

      if (filesToProcess.length === 0) {
        setUploadStatus('لا توجد ملفات جديدة لمعالجتها.');
        setTimeout(() => setUploading(false), 2000);
        return;
      }

      console.log("INGESTION STARTED");
      console.log(`PROCESSOR STARTED: ${appMode}`);

      setUploadStatus(`جاري معالجة ${filesToProcess.length} ملفات...`);
      const { processUploadBatch } = await import('../backend/core/ingestion-engine');
      
      const session = await processUploadBatch(filesToProcess, appMode, (msg) => setUploadStatus(msg));
      
      console.log("==========================================");
      console.log("🔴 PIPELINE V2 FRONTEND VERIFICATION PROOF 🔴");
      console.log("==========================================\n");
      if (session.skippedRows.length > 0 && session.skippedRows[0].detectedColumns) {
         console.log("1) DETECTED COLUMN MAP:");
         console.log(JSON.stringify(session.skippedRows[0].detectedColumns, null, 2));
      }
      
      console.log("\n2) FIRST 10 EXTRACTED ROWS:");
      console.log(JSON.stringify(session.records.slice(0, 10).map((r: any) => ({
        Entity: r.Raw_Entity,
        Total: r.Total_Amount,
        Net: r.Net_Amount,
        VAT: r.VAT_Amount,
        Date: r.Invoice_Date,
        Period: r.Period_Year
      })), null, 2));
      
      console.log("\n3) FIRST 10 SKIPPED ROWS WITH REASONS:");
      console.log(JSON.stringify(session.skippedRows.slice(0, 10).map((s: any) => ({
        rowIndex: s.rowIndex,
        reason: s.reason,
        rawData: s.rawData
      })), null, 2));
      console.log("==========================================");

      console.log(`RECORDS PARSED: ${session.records.length}`);

      // Save Master Data Collections (Customers, Vendors, Items)
      setUploadStatus('تحديث البيانات الأساسية...');
      let customerCount = session.masterData.customers.length;
      let vendorCount = session.masterData.vendors.length;
      let itemCount = session.masterData.items.length;
      
      console.log(`Master Data Generated: Customers (${customerCount}), Vendors (${vendorCount}), Items (${itemCount})`);

      console.log("PIPELINE TRACE SUMMARY:", JSON.stringify(session.debugTraces, null, 2));
      localStorage.setItem('__validationTrace', JSON.stringify(session.debugTraces));


      const recordsBatch = session.records.map((r: any, idx: number) => ({
          ...r,
          id: r.id || crypto.randomUUID(),
          _originalIndex: idx,
          tenantId: profile.tenantId,
          sessionId: session.sessionId
      }));

      const skippedRowsBatch = session.skippedRows.map((r: any) => ({
          ...r,
          id: crypto.randomUUID(),
          sessionId: session.sessionId
      }));

      // In a real multi-file system, we save the session, but we also save uploadedFiles to keep UI happy
      const fileMetadatas = [];
      for (const file of filesToProcess) {
         const fileRecords = recordsBatch.filter((r: any) => r._sourceFile === file.name);
         const fileSkipped = skippedRowsBatch.filter((r: any) => r._sourceFile === file.name);
         const fileId = file.fileHash;
         
         // Link records to fileId for UI mapping
         fileRecords.forEach((r: any) => r.fileId = fileId);
         fileSkipped.forEach((r: any) => r.fileId = fileId);
         
         fileMetadatas.push({
           id: file.fileHash,
           fileName: file.name,
           uploadDate: new Date().toISOString(),
           uploadedBy: user.uid,
           fileType: appMode,
           recordCount: fileRecords.length,
           skippedRowCount: fileSkipped.length,
           status: 'processed',
           processed: true,
           processingVersion: 2, // Architectural Processing V2
           periodYear: new Date().getFullYear().toString(),
           tenantId: profile.tenantId,
           sessionId: session.sessionId
         });
      }

      // Generate Journal Entries
      const journalEntries = generateJournalEntries(recordsBatch, appMode).map(je => ({
        ...je,
        tenantId: profile.tenantId || null,
        version: 1,
        isActive: true,
        sessionId: session.sessionId,
        originalEntryId: je.id
      }));

      console.log(`JOURNAL ENTRIES CREATED: ${journalEntries.length}`);

      if (journalEntries.length === 0 && skippedRowsBatch.length === 0) {
        throw new Error("فشل هيكلي في معالجة الملفات. يرجى التأكد من تطابق الأعمدة مع القالب.");
      }

      // Validate Integrity
      const validEntries = journalEntries.filter(je => je.sourceFileId && je.entityId && je.moduleType);

      console.log(`WRITE SUCCESS: ${validEntries.length}`);

      setUploadStatus(`مزامنة ${validEntries.length} قيد في الذاكرة المؤقتة (Dev Mode)...`);
      try {
        const token = await auth.currentUser?.getIdToken();
        if (token) {
           await fetch('/api/erp/dev/sync', {
              method: 'POST',
              headers: { 
                 'Authorization': `Bearer ${token}`,
                 'Content-Type': 'application/json' 
              },
              body: JSON.stringify({
                 journalEntries: validEntries,
                 uploadedFiles: fileMetadatas,
                 records: recordsBatch,
                 skippedRows: skippedRowsBatch,
                 customers: session.masterData.customers,
                 vendors: session.masterData.vendors,
                 items: session.masterData.items
              })
           });
        }
      } catch (err) {
         console.warn("DEV SYNC FAILED", err);
      }
      
      onUploadSuccess();
      await fetchFiles();
      setFinalReport(JSON.stringify({
        success: true,
        filesProcessed: filesToProcess.length,
        recordsParsed: session.records.length,
        transactionsClassified: session.records.length,
        journalEntriesCreated: validEntries.length,
        journalEntriesStored: validEntries.length,
        sampleEntries: validEntries.slice(0, 5)
      }, null, 2));
      setUploading(false);
      // Reset input element value if present 
      const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
      fileInputs.forEach(i => i.value = '');
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'حدث خطأ أثناء المعالجة');
      setUploading(false);
      const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
      fileInputs.forEach(i => i.value = '');
    }
  };



  return (
    <div className="max-w-4xl w-full mx-auto p-8 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className={`p-8 text-center ${appMode === 'expenses' ? 'bg-indigo-600' : (appMode === 'revenues' ? 'bg-emerald-600' : (appMode === 'payroll' ? 'bg-amber-600' : 'bg-blue-600'))}`}>
          <h1 className="text-3xl font-extrabold text-white mb-2">
              إدارة ملفات {appMode === 'expenses' ? 'المشتريات' : (appMode === 'revenues' ? 'المبيعات' : (appMode === 'payroll' ? 'الرواتب' : 'البنوك'))}
          </h1>
          <p className="text-white/80 font-medium">قم برفع الملفات الجديدة أو استعراض الملفات السابقة</p>
        </div>
        
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">إدارة الملفات</h3>
            <div className="flex gap-3">
              {uploading && (
                <button
                  onClick={() => {
                    if (abortController) abortController.abort();
                    setUploading(false);
                    setUploadStatus('تم إلغاء المعالجة');
                    setStagedFiles([]);
                  }}
                  className="px-6 py-3 rounded-xl font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 shadow-sm transition-all flex items-center gap-2"
                >
                  إلغاء المعالجة
                </button>
              )}
              <button
                onClick={processStagedFiles}
                disabled={uploading || stagedFiles.length === 0 || isViewer}
                className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${(uploading || stagedFiles.length === 0 || isViewer) ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5'} ${appMode === 'expenses' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : (appMode === 'revenues' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : (appMode === 'payroll' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'))}`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {uploadStatus || 'جاري المعالجة...'}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    {stagedFiles.length > 0 ? `بدء معالجة الملفات (${stagedFiles.length})` : 'اختر ملفات للمعالجة'}
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {finalReport && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl">
              <h3 className="font-bold mb-2">نجاح المعالجة</h3>
              <pre className="text-left text-sm whitespace-pre-wrap font-mono" dir="ltr">{finalReport}</pre>
            </div>
          )}

          {profile?.role === 'admin' && (
            <>
              <div className={`mb-8 border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer relative ${uploading ? 'opacity-50 pointer-events-none' : ''} ${appMode === 'expenses' ? 'border-indigo-300 hover:bg-indigo-50 hover:border-indigo-500' : (appMode === 'revenues' ? 'border-emerald-300 hover:bg-emerald-50 hover:border-emerald-500' : (appMode === 'payroll' ? 'border-amber-300 hover:bg-amber-50 hover:border-amber-500' : 'border-blue-300 hover:bg-blue-50 hover:border-blue-500'))}`}>
                <input type="file" accept=".xlsx, .xls, .csv" multiple onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                {uploading ? (
                  <Loader2 className={`w-12 h-12 mx-auto mb-4 animate-spin ${appMode === 'expenses' ? 'text-indigo-500' : (appMode === 'revenues' ? 'text-emerald-500' : (appMode === 'payroll' ? 'text-amber-500' : 'text-blue-500'))}`} />
                ) : (
                  <UploadIcon className={`w-12 h-12 mx-auto mb-4 opacity-70 ${appMode === 'expenses' ? 'text-indigo-500' : (appMode === 'revenues' ? 'text-emerald-500' : (appMode === 'payroll' ? 'text-amber-500' : 'text-blue-500'))}`} />
                )}
                <h3 className="text-xl font-bold text-slate-800 mb-2">{uploading ? (uploadStatus || 'جاري المعالجة والرفع...') : 'اسحب وأفلت الملفات هنا للرفع'}</h3>
                <p className="text-slate-500">أو انقر لاختيار ملفات من جهازك (.xlsx, .csv)</p>
              </div>

              {stagedFiles.length > 0 && (
                <div className="mb-8 bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">الملفات المحددة للمعالجة</h3>
                  <div className="space-y-3 mb-6">
                    {stagedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3">
                          <FileSpreadsheet className={`w-5 h-5 ${appMode === 'expenses' ? 'text-indigo-500' : (appMode === 'revenues' ? 'text-emerald-500' : (appMode === 'payroll' ? 'text-amber-500' : 'text-blue-500'))}`} />
                          <span className="font-medium text-slate-700">{file.name}</span>
                          <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button 
                          onClick={() => removeStagedFile(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                          disabled={uploading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-slate-500" />
                الملفات المرفوعة مسبقاً
              </h3>
              <div className="flex items-center gap-2">
                {selectedFiles.size > 0 && !isViewer && (
                  <button
                    onClick={() => {
                      const filesToDelete = files.filter(f => selectedFiles.has(f.id)).map(f => ({ id: f.id, originalId: f.originalId }));
                      setBulkDeleteConfirm({ files: filesToDelete, message: `هل أنت متأكد من حذف ${selectedFiles.size} ملفات محددة؟` });
                    }}
                    className="px-4 py-2 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف المحدد ({selectedFiles.size})
                  </button>
                )}
                {files.length > 0 && !isViewer && (
                  <button
                    onClick={() => {
                      const filesToDelete = files.map(f => ({ id: f.id, originalId: f.originalId }));
                      setBulkDeleteConfirm({ files: filesToDelete, message: `هل أنت متأكد من حذف جميع الملفات (${files.length} ملف)؟ سيؤدي هذا إلى إعادة تعيين البيانات بالكامل.` });
                    }}
                    className="px-4 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف جميع الملفات
                  </button>
                )}
              </div>
            </div>
            
            {loading && !uploading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-500">لا توجد ملفات مرفوعة حتى الآن.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(
                  files.reduce((acc, file) => {
                    const year = file.periodYear || new Date(file.uploadDate).getFullYear().toString();
                    if (!acc[year]) acc[year] = [];
                    acc[year].push(file);
                    return acc;
                  }, {} as Record<string, UploadedFile[]>)
                ).sort(([yearA], [yearB]) => Number(yearB) - Number(yearA)).map(([year, yearFiles]) => (
                  <div key={year} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {profile?.role === 'admin' && (
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            checked={yearFiles.length > 0 && yearFiles.every(f => selectedFiles.has(f.id))}
                            onChange={() => toggleYearSelection(yearFiles)}
                            title="تحديد كل ملفات السنة"
                          />
                        )}
                        <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${appMode === 'expenses' ? 'bg-indigo-500' : (appMode === 'revenues' ? 'bg-emerald-500' : 'bg-amber-500')}`}></span>
                          سنة {year}
                        </h4>
                        <span className="text-sm text-slate-500 bg-slate-200 px-2.5 py-0.5 rounded-full font-medium">
                          {yearFiles.length} ملفات
                        </span>
                      </div>
                      {profile?.role === 'admin' && (
                        <button 
                          onClick={() => {
                            const filesToDelete = yearFiles.map(f => ({ id: f.id, originalId: f.originalId }));
                            setBulkDeleteConfirm({ files: filesToDelete, message: `هل أنت متأكد من حذف جميع ملفات سنة ${year}؟` });
                          }}
                          className="text-sm font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <Trash2 className="w-4 h-4" />
                          حذف ملفات السنة
                        </button>
                      )}
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {yearFiles.map((file, idx) => (
                        <div key={`${file.id}-${idx}`} className={`flex flex-col p-4 bg-white border rounded-xl hover:shadow-md transition-shadow ${selectedFiles.has(file.id) ? 'border-indigo-400 ring-1 ring-indigo-400 bg-indigo-50/30' : 'border-slate-200'}`}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3">
                              {profile?.role === 'admin' && (
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  checked={selectedFiles.has(file.id)}
                                  onChange={() => toggleFileSelection(file.id)}
                                />
                              )}
                              <div>
                                <h5 className="font-bold text-slate-700 text-sm line-clamp-2" title={file.fileName}>{file.fileName}</h5>
                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(file.uploadDate).toLocaleDateString('ar-SA')}
                                </p>
                              </div>
                            </div>
                            {!isViewer && (
                              <button 
                                onClick={() => setFileToDelete({ id: file.id, originalId: file.originalId })}
                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors shrink-0"
                                title="حذف الملف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <span className="bg-slate-100 px-2 py-1 rounded-md font-medium">
                              {file.recordCount} سجل
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {fileToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-2">تأكيد الحذف</h3>
            <p className="text-slate-600 mb-6">هل أنت متأكد من رغبتك في حذف هذا الملف؟ سيتم حذف جميع السجلات المرتبطة به نهائياً.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setFileToDelete(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  deleteFile(fileToDelete.id, fileToDelete.originalId);
                  setFileToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-lg font-bold transition-colors"
              >
                حذف نهائي
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-2">تأكيد الحذف المتعدد</h3>
            <p className="text-slate-600 mb-6">{bulkDeleteConfirm.message} سيتم حذف جميع السجلات المرتبطة بها نهائياً.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setBulkDeleteConfirm(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  deleteMultipleFiles(bulkDeleteConfirm.files);
                  setBulkDeleteConfirm(null);
                }}
                className="px-4 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-lg font-bold transition-colors"
              >
                حذف نهائي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
