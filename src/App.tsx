import React, { useState, useEffect, useMemo, Fragment } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { 
  Upload as UploadIcon, FileSpreadsheet, CheckCircle, BarChart3, Users, 
  FileText, Search, ShieldAlert, TrendingUp, Download, Activity, Zap, 
  Layers, Settings as SettingsIcon, ChevronDown, ChevronUp, Tag, Edit2, 
  PieChart as PieChartIcon, Calendar as CalendarIcon, ShoppingCart, 
  Wallet, FolderOpen, AlertTriangle, BookOpen, LineChart as LineChartIcon,
  Briefcase, LogOut, Shield, Sparkles, Scale, Coins, X, ArrowRight, Calculator,
  Database, Box
} from 'lucide-react';
import { exportReportPDF } from './lib/pdf-engine';
import { formatCurrency, isDateInRange, formatMonthName, isSimilarName, CATEGORY_ORDER, buildHierarchy, flattenHierarchyForExcel } from './lib/financial-utils';
import { Card } from './components/Card';
import { NavItem } from './components/NavItem';
import { CategoriesSummary } from './components/CategoriesSummary';
import { GroupedPurchases } from './components/GroupedPurchases';
import { ItemsDirectory } from './components/ItemsDirectory';
import { Audit } from './components/Audit';
import { IncomeStatement } from './components/IncomeStatement';
import { TrialBalance } from './components/TrialBalance';
import { GeneralLedger } from './components/GeneralLedger';
import { OwnersSummary } from './components/OwnersSummary';
import { VisualDashboard } from './components/VisualDashboard';
import { StatementOfAccount } from './components/StatementOfAccount';
import { WelcomePage } from './components/WelcomePage';
import { MonthlySummary } from './components/MonthlySummary';
import { QuotationManager } from './components/QuotationManager';
import { Settings } from './components/Settings';
import { useAuth } from './contexts/AuthProvider';
import { useUI } from './contexts/UIContext';
import packageJson from '../package.json';
import { FinancialRecord } from './types';
import { MonthlyPayroll } from './components/MonthlyPayroll';
import { PayrollExpenseAllocation } from './components/PayrollExpenseAllocation';
import { YearlyComparison } from './components/YearlyComparison';
import { AnomaliesReport } from './components/AnomaliesReport';
import { BalanceSheet } from './components/BalanceSheet';
import { AlertsReport } from './components/AlertsReport';
import { SmartInvoice } from './components/SmartInvoice';
import { TaxDeclaration } from './components/TaxDeclaration';
import { Login } from './components/Login';
import { FileManagement } from './components/FileManagement';
import { UserManagement } from './components/UserManagement';

// Firestore imports
import { db } from './firebase';
import { collection, getDoc, query, where, writeBatch, doc, deleteDoc, setDoc, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';
import { subscribeToSettings, AppSettings } from './lib/settings-service';
import { logout } from './firebase';

import { CashFlow } from './components/CashFlow';
import { GlobalAuditLog } from './components/GlobalAuditLog';
import { RawDataInspector } from './components/RawDataInspector';
import { JournalEntryModal } from './components/JournalEntryModal';

console.log("=========================================");
console.log("APP VERSION: RBAC-INIT-V2 LOADED");
console.log("=========================================");

import { AppConfig } from './config/appConfig';

export default function App() {
  const { user, profile, loading, isBootstrapping, authError, isAdmin, isAccountant } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    // HEALTH ENDPOINT TEST FOR HARD RUNTIME PROOF
    fetch('/api/erp/health')
      .then(r => r.json())
      .then(data => console.log("HEALTH ENDPOINT RESULT:", data))
      .catch(e => console.error("HEALTH ENDPOINT FAILED:", e));
  }, []);

  useEffect(() => {
    if (profile?.tenantId) {
      const fetchSettings = async () => {
        try {
          const authIdToken = await user?.getIdToken();
          const res = await fetch('/api/erp/settings', {
            headers: { 'Authorization': `Bearer ${authIdToken}` }
          });
          const json = await res.json();
          if (json.success && json.data) {
             setSettings(json.data);
          }
        } catch (err) {
          console.error("Failed to fetch settings from API:", err);
        }
      };
      fetchSettings();
    }
  }, [profile?.tenantId]);

  const developerName = settings?.preparerName || 'Hany Mohamed';
  
  const [appMode, setAppMode] = useState<'expenses' | 'revenues' | 'payroll' | 'banks' | 'reports' | 'users' | 'quotations'>('expenses'); 
  const [activeTab, setActiveTab] = useState<string>('dashboard'); 
  const [status, setStatus] = useState<'ready' | 'processing' | 'exporting' | 'processing_accounting'>('ready'); 
  
  const [activeFileId, setActiveFileId] = useState<Record<string, string | null>>({ expenses: null, revenues: null, payroll: null, banks: null, reports: null, quotations: null });
  const [availableFiles, setAvailableFiles] = useState<Record<string, {id: string, name: string}[]>>({ expenses: [], revenues: [], payroll: [], banks: [], reports: [], quotations: [] });

  const [auditMode, setAuditMode] = useState(false);

  useEffect(() => {
    if (profile) {
      if (profile.role === 'admin' && activeTab === 'dashboard') {
        setActiveTab('upload');
      } else if (profile.role !== 'admin' && activeTab === 'dashboard') {
        setActiveTab('welcome');
      }
    }
  }, [profile]);
  
  const [expensesData, setExpensesData] = useState<any>({ fileId: null, records: [], entities: [], schema: null, skippedRows: [] });
  const [revenuesData, setRevenuesData] = useState<any>({ fileId: null, records: [], entities: [], schema: null, skippedRows: [] });
  const [payrollData, setPayrollData] = useState<any>({ fileId: null, records: [], entities: [], schema: null, skippedRows: [] });
  const [banksData, setBanksData] = useState<any>({ fileId: null, records: [], entities: [], schema: null, skippedRows: [] });

  useEffect(() => {
    console.log("SETTINGS:", settings);
    console.log("JOURNAL DATA:", {
      expenses: expensesData.records.length,
      revenues: revenuesData.records.length,
      payroll: payrollData.records.length,
      banks: banksData.records.length
    });
  }, [settings, expensesData, revenuesData, payrollData, banksData]);

  const [dateFilter, setDateFilter] = useState<any>({ start: '', end: '', month: '', sourceMode: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJournalRecord, setSelectedJournalRecord] = useState<FinancialRecord | null>(null);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const lastScrollPos = React.useRef<number>(0);
  const isSearching = React.useRef<boolean>(false);
  const tabScrollPositions = React.useRef<Record<string, number>>({});

  // Save scroll position when search STARTS
  useEffect(() => {
    if (searchQuery && !isSearching.current) {
      if (scrollContainerRef.current) {
        lastScrollPos.current = scrollContainerRef.current.scrollTop;
        isSearching.current = true;
      }
    } else if (!searchQuery) {
      isSearching.current = false;
    }
  }, [searchQuery]);

  // Restore scroll position when search is cleared or tab changes
  useEffect(() => {
    const key = `${appMode}-${activeTab}`;
    const target = searchQuery ? 0 : (tabScrollPositions.current[key] || lastScrollPos.current || 0);
    
    if (scrollContainerRef.current) {
      // Use a small timeout to ensure content is rendered
      const timer = setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({ top: target, behavior: searchQuery ? 'auto' : 'smooth' });
          // Reset lastScrollPos after restoring
          if (!searchQuery) lastScrollPos.current = 0;
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, activeTab, appMode]);

  const resetFilter = () => {
    setDateFilter({ month: '', year: '', start: '', end: '', sourceMode: '' });
    setSearchQuery('');
  };


  const [expandedEntities, setExpandedEntities] = useState<Record<string, boolean>>({});
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [editSubCat, setEditSubCat] = useState<{ entId: string | null, oldCat: string, value: string }>({ entId: null, oldCat: '', value: '' });
  const [expandedSubCats, setExpandedSubCats] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({}); 
  const [editInvoice, setEditInvoice] = useState<{ index: number | null, value: string }>({ index: null, value: '' });

  const { showConfirm, showAlert, notify } = useUI();

  const currentData = appMode === 'expenses' ? expensesData : (appMode === 'revenues' ? revenuesData : (appMode === 'payroll' ? payrollData : (appMode === 'banks' ? banksData : { records: [], entities: [], schema: null })));
  const setCurrentData = appMode === 'expenses' ? setExpensesData : (appMode === 'revenues' ? setRevenuesData : (appMode === 'payroll' ? setPayrollData : setBanksData));

  const fetchFileList = async (retries = 3): Promise<any[]> => {
    if (!profile?.tenantId || appMode === 'users') return [];
    
    try {
      const token = await user?.getIdToken();
      if (!token) return [];

      let url = `/api/erp/files`;
      if (appMode !== 'reports') url += `?type=${appMode}`;

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch (err: any) {
        console.error("APP ERROR FETCHING: Received non-JSON response:", text.slice(0, 150));
        throw new Error(err.message);
      }
      
      const files: any[] = json.data?.data || json.data || [];
      
      if (appMode === 'reports') {
        const grouped = { expenses: [], revenues: [], payroll: [], banks: [] };
        files.forEach((f: any) => {
          if (grouped[f.fileType]) grouped[f.fileType].push(f);
        });
        setAvailableFiles(grouped);
        
        setActiveFileId(prev => {
          const next = { ...prev };
          if (!next.expenses && grouped.expenses.length > 0) next.expenses = grouped.expenses[0].id;
          if (!next.revenues && grouped.revenues.length > 0) next.revenues = grouped.revenues[0].id;
          if (!next.payroll && grouped.payroll.length > 0) next.payroll = grouped.payroll[0].id;
          if (!next.banks && grouped.banks.length > 0) next.banks = grouped.banks[0].id;
          return next;
        });
        return files;
      } else {
        setAvailableFiles(prev => ({ ...prev, [appMode]: files }));
        return files;
      }
      
    } catch (e: any) {
      if (e?.message?.toLowerCase().includes('quota') || String(e).toLowerCase().includes('quota')) {
        console.warn("[DEV SAFE] API fetch paused (Quota Limit).");
      } else if (e?.message === 'Failed to fetch' && retries > 0) {
        console.warn(`Server restarting, retrying files fetch (${retries} attempts left)...`);
        await new Promise(r => setTimeout(r, 1500));
        return fetchFileList(retries - 1);
      } else {
        console.error("Error fetching files:", e);
      }
      return [];
    }
  };

  // Auto-fetch file list on mount or when switching modes
  useEffect(() => {
    fetchFileList().then(files => {
      // Auto-select latest file if none selected and not reports mode 
      // (Reports mode handles its own setting in fetchFileList)
      if (appMode !== 'reports' && files && files.length > 0 && !activeFileId[appMode]) {
        setActiveFileId(prev => ({ ...prev, [appMode]: files[0].id }));
      }
    }).catch(err => console.warn("Expected API rejection caught:", err));
  }, [profile?.tenantId, appMode, user]);

  // Fetch data when active file changes or when entering reports mode
  useEffect(() => {
    if (appMode === 'reports') {
      const p = [];
      if (expensesData.records.length === 0 && activeFileId['expenses']) p.push(fetchDataForMode('expenses'));
      if (revenuesData.records.length === 0 && activeFileId['revenues']) p.push(fetchDataForMode('revenues'));
      if (payrollData.records.length === 0 && activeFileId['payroll']) p.push(fetchDataForMode('payroll'));
      if (banksData.records.length === 0 && activeFileId['banks']) p.push(fetchDataForMode('banks'));
      if (p.length > 0) {
        Promise.all(p).catch(err => console.warn("Expected API rejection caught:", err));
      }
    } else if (appMode !== 'users' && activeFileId[appMode]) {
       const cd = appMode === 'expenses' ? expensesData : (appMode === 'revenues' ? revenuesData : (appMode === 'payroll' ? payrollData : banksData));
       if (cd.fileId === activeFileId[appMode] && cd.records.length > 0) return;
      fetchDataForMode(appMode as 'expenses' | 'revenues' | 'payroll' | 'banks').catch(err => console.warn("Expected API rejection caught:", err));
    }
  }, [appMode, activeFileId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fileId = e.target.value;
    if (!fileId) return;
    
    setActiveFileId(prev => ({ ...prev, [appMode]: fileId }));
  };

  const handleNavClick = (mode: any, tab: string) => {
    if(status === 'processing') return;
    if(appMode !== mode) {
      setAppMode(mode);
      resetFilter();
    }
    setActiveTab(tab);
  };

  const fetchDataForMode = async (mode: 'expenses' | 'revenues' | 'payroll' | 'banks', fileIdToLoad?: string) => {
    if (!user || !profile?.tenantId) return;
    const targetFileId = fileIdToLoad || activeFileId[mode];
    if (!targetFileId) return;

    setStatus('processing');
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/erp/files/${targetFileId}/data?moduleType=${mode}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        if (res.status === 404 || res.status === 401 || res.status === 500) {
           setActiveFileId(prev => ({...prev, [mode]: ''}));
           const emptyData = { records: [], entities: [], schema: null, skippedRows: [] };
           if (mode === 'expenses') setExpensesData(emptyData);
           else if (mode === 'revenues') setRevenuesData(emptyData);
           else if (mode === 'payroll') setPayrollData(emptyData);
           else if (mode === 'banks') setBanksData(emptyData);
        }
        throw new Error("Failed to fetch file data");
      }
      const json = await res.json();
      
      let allRecords: FinancialRecord[] = (json.data?.records || []).filter((r: any) => r.moduleType === mode);
      let allSkippedRows: any[] = (json.data?.skippedRows || []).filter((r: any) => r.moduleType === mode);

      console.log("ACTIVE MODULE:", mode)
      console.log("VISIBLE RECORDS:", allRecords.length)
      console.log("SAMPLE:", allRecords.slice(0,3).map(r => r.moduleType))
      
      // Normalize Entity_ID across multiple files
      const entityIdMap = new Map<string, string>(); // CanonicalName -> ID
      const taxIdToEntityId = new Map<string, string>(); // TaxID -> ID
      const taxIdToCanonicalName = new Map<string, string>(); // TaxID -> CanonicalName
      let entityCounter = 1;
      const prefix = mode === 'expenses' ? 'SUP' : (mode === 'revenues' ? 'CUS' : (mode === 'payroll' ? 'EMP' : 'BNK'));
      const isVendor = mode === 'expenses' || mode === 'revenues';

      const normalizeTaxId = (val: any): string => {
        if (!val || val === 'غير محدد') return '';
        let str = String(val).trim();
        str = str.replace(/\.0+$/, '');
        str = str.replace(/[-\s.]/g, '');
        if (/^\d+$/.test(str)) str = str.replace(/^0+/, '');
        return str;
      };

      const isArabic = (text: string) => /[\u0600-\u06FF]/.test(text);
      const getBestName = (names: Set<string>) => {
          let best = '';
          for (const name of names) {
              if (!best) { best = name; continue; }
              const currentIsArabic = isArabic(name);
              const bestIsArabic = isArabic(best);
              // Prioritize Arabic names, then longer names
              if ((currentIsArabic && !bestIsArabic) || 
                  (currentIsArabic === bestIsArabic && name.length > best.length)) {
                  best = name;
              }
          }
          return best;
      };

      // Normalize Entity_ID across multiple files
      const taxIdToRecords = new Map<string, FinancialRecord[]>();
      const noTaxIdRecords: FinancialRecord[] = [];

      allRecords.forEach(row => {
          const taxId = normalizeTaxId(row.Entity_TaxID);
          if (taxId) {
              if (!taxIdToRecords.has(taxId)) taxIdToRecords.set(taxId, []);
              taxIdToRecords.get(taxId)!.push(row);
          } else {
              noTaxIdRecords.push(row);
          }
      });

      const entityGroups: { taxId: string, names: Set<string>, records: FinancialRecord[] }[] = [];
      
      // 1. Create groups from Tax IDs
      taxIdToRecords.forEach((records, taxId) => {
          const names = new Set(records.map(r => r.Entity_Normalized_Name || r.Raw_Entity));
          entityGroups.push({ taxId, names, records });
      });

      // 2. Merge groups with similar names (even if they have different Tax IDs)
      // This handles cases where the same entity has multiple Tax IDs or one is missing
      let merged = true;
      while (merged) {
          merged = false;
          for (let i = 0; i < entityGroups.length; i++) {
              for (let j = i + 1; j < entityGroups.length; j++) {
                  let shouldMerge = false;
                  
                  // Check if any name in group i is similar to any name in group j
                  for (const nameI of entityGroups[i].names) {
                      for (const nameJ of entityGroups[j].names) {
                          if (isSimilarName(nameI, nameJ, isVendor)) {
                              shouldMerge = true;
                              break;
                          }
                      }
                      if (shouldMerge) break;
                  }

                  if (shouldMerge) {
                      // Merge group j into group i
                      entityGroups[i].records = [...entityGroups[i].records, ...entityGroups[j].records];
                      entityGroups[j].names.forEach(n => entityGroups[i].names.add(n));
                      // If group i has no taxId but group j does, take it
                      if (!entityGroups[i].taxId && entityGroups[j].taxId) {
                          entityGroups[i].taxId = entityGroups[j].taxId;
                      }
                      // Remove group j
                      entityGroups.splice(j, 1);
                      merged = true;
                      j--; // Adjust index after splice
                  }
              }
          }
      }

      // 3. Process records without Tax IDs
      noTaxIdRecords.forEach(row => {
          const name = row.Entity_Normalized_Name || row.Raw_Entity;
          let foundGroup = false;

          // Try to find a group with a similar name
          for (const group of entityGroups) {
              for (const existingName of group.names) {
                  if (isSimilarName(name, existingName, isVendor)) {
                      group.records.push(row);
                      group.names.add(name);
                      foundGroup = true;
                      break;
                  }
              }
              if (foundGroup) break;
          }

          if (!foundGroup) {
              entityGroups.push({ taxId: '', names: new Set([name]), records: [row] });
          }
      });

      // 3. Final Pass: Assign IDs and Canonical Names
      entityGroups.forEach((group, index) => {
          const bestName = getBestName(group.names);
          const entityId = `${prefix}-${String(index + 1).padStart(4, '0')}`;
          
          group.records.forEach(row => {
              row.Entity_ID = entityId;
              row.Entity_Normalized_Name = bestName;
              if (group.taxId) row.Entity_TaxID = group.taxId;
          });
      });

      const profiles: Record<string, any> = {};
      allRecords.forEach(row => {
          if (!profiles[row.Entity_ID]) {
              profiles[row.Entity_ID] = { id: row.Entity_ID, name: row.Entity_Normalized_Name, taxId: row.Entity_TaxID, categoriesSet: new Set(), invoiceCount: 0, totalNet: 0, totalTaxableNet: 0, totalNonTaxableNet: 0, totalVAT: 0, totalSpend: 0, anomalies: 0 };
          }
          if (!profiles[row.Entity_ID].taxId && row.Entity_TaxID) profiles[row.Entity_ID].taxId = row.Entity_TaxID;
          profiles[row.Entity_ID].categoriesSet.add(row.Category);
          profiles[row.Entity_ID].invoiceCount += 1;
          profiles[row.Entity_ID].totalNet += (row.Net_Amount || 0);
          profiles[row.Entity_ID].totalTaxableNet += (row.Taxable_Amount || 0);
          profiles[row.Entity_ID].totalNonTaxableNet += (row.NonTaxable_Amount || 0);
          profiles[row.Entity_ID].totalVAT += (row.VAT_Amount || 0);
          profiles[row.Entity_ID].totalSpend += (row.Total_Amount || 0);
          if (row.Anomalies && row.Anomalies.length > 0) profiles[row.Entity_ID].anomalies += 1;
      });
      const finalEntities = Object.values(profiles).map(profile => {
          profile.categoryString = Array.from(profile.categoriesSet).join(" ، ");
          profile.categoriesArray = Array.from(profile.categoriesSet);
          delete profile.categoriesSet; 
          return profile;
      }).sort((a, b) => b.totalSpend - a.totalSpend);

      const newData = { fileId: targetFileId, records: allRecords, entities: finalEntities, schema: null, skippedRows: allSkippedRows };
      if (mode === 'expenses') setExpensesData(newData);
      else if (mode === 'revenues') setRevenuesData(newData);
      else if (mode === 'payroll') setPayrollData(newData);
      else if (mode === 'banks') setBanksData(newData);
      
    } catch (err) {
      console.warn("Expected error fetching data:", err);
      try { handleFirestoreError(err, OperationType.GET, 'uploadedFiles'); } catch (e) {}
    } finally {
      setStatus('ready');
    }
  };

  const fetchAllData = async () => {
    // Left purposefully empty or unused, do not auto-fetch all data on launch
  };

  useEffect(() => {
    // Removed auto-fetching all data so it doesn't trigger 4 endpoints simultaneously on start
  }, [user]);

  const entLabel = appMode === 'expenses' ? 'المورد' : (appMode === 'revenues' ? 'العميل' : (appMode === 'banks' ? 'الحساب' : 'الموظف'));
  const entsLabel = appMode === 'expenses' ? 'الموردين' : (appMode === 'revenues' ? 'العملاء' : (appMode === 'banks' ? 'الحسابات' : 'الموظفين'));
  const actLabel = appMode === 'expenses' ? 'المصروفات' : (appMode === 'revenues' ? 'الإيرادات' : (appMode === 'banks' ? 'الحركات البنكية' : 'الرواتب'));

  const toggleEntity = (entId: string) => setExpandedEntities(p => ({ ...p, [entId]: !p[entId] }));
  const toggleSubCat = (key: string) => setExpandedSubCats(p => ({ ...p, [key]: !p[key] }));
  const toggleCategoryView = (catName: string) => setExpandedCategories(p => ({ ...p, [catName]: !p[catName] }));

  const updateCurrentDataState = (updatedRecords: FinancialRecord[]) => {
    const profiles: Record<string, any> = {};
    updatedRecords.forEach(row => {
        if (!profiles[row.Entity_ID]) {
            profiles[row.Entity_ID] = { id: row.Entity_ID, name: row.Entity_Normalized_Name, taxId: row.Entity_TaxID, categoriesSet: new Set(), invoiceCount: 0, totalNet: 0, totalTaxableNet: 0, totalNonTaxableNet: 0, totalVAT: 0, totalSpend: 0, anomalies: 0 };
        }
        if (!profiles[row.Entity_ID].taxId && row.Entity_TaxID) profiles[row.Entity_ID].taxId = row.Entity_TaxID;
        profiles[row.Entity_ID].categoriesSet.add(row.Category);
        profiles[row.Entity_ID].invoiceCount += 1;
        profiles[row.Entity_ID].totalNet += (row.Net_Amount || 0);
        profiles[row.Entity_ID].totalTaxableNet += (row.Taxable_Amount || 0);
        profiles[row.Entity_ID].totalNonTaxableNet += (row.NonTaxable_Amount || 0);
        profiles[row.Entity_ID].totalVAT += (row.VAT_Amount || 0);
        profiles[row.Entity_ID].totalSpend += (row.Total_Amount || 0);
        if (row.Anomalies && row.Anomalies.length > 0) profiles[row.Entity_ID].anomalies += 1;
    });

    const finalEntities = Object.values(profiles).map(profile => {
        profile.categoryString = Array.from(profile.categoriesSet).join(" ، ");
        profile.categoriesArray = Array.from(profile.categoriesSet);
        delete profile.categoriesSet; 
        return profile;
    }).sort((a, b) => b.totalSpend - a.totalSpend);

    setCurrentData({ ...currentData, records: updatedRecords, entities: finalEntities, schema: currentData.schema });
  }

  const handleSaveSubCategory = async (e: React.MouseEvent, entId: string, oldCat: string) => {
    e.stopPropagation();
    if (!editSubCat.value.trim() || editSubCat.value === oldCat) {
        setEditSubCat({ entId: null, oldCat: '', value: '' });
        return;
    }
    const newCat = editSubCat.value;
    const updatedRecords = (Array.isArray(currentData?.records) ? currentData.records : []).map((r: any) => {
        if (r.Entity_ID === entId && r.Category === oldCat) return { ...r, Category: newCat };
        return r;
    });
    updateCurrentDataState(updatedRecords);
    setEditSubCat({ entId: null, oldCat: '', value: '' });
  };

  const handleSaveGlobalCategory = async (oldCatName: string, newCatName: string) => {
     if (!newCatName.trim() || newCatName === oldCatName) return;
     const updatedRecords = (Array.isArray(currentData?.records) ? currentData.records : []).map((r: any) => {
         if (r.Category === oldCatName) return { ...r, Category: newCatName };
         return r;
     });
     updateCurrentDataState(updatedRecords);
  }

  const handleDeleteRecord = async (record: FinancialRecord) => {
    if (!record.id || !record.fileId) return;
    
    showConfirm('تأكيد الحذف', 'هل أنت متأكد من حذف هذه الفاتورة؟ لن تتمكن من التراجع عن هذه العملية.', async () => {
      try {
        const docRef = doc(db, 'uploadedFiles', record.fileId, 'records', record.id);
        
        // Check if it's a chunk
        if (record.id.startsWith('chunk_')) {
          const chunkDoc = await getDoc(doc(db, 'uploadedFiles', record.fileId, 'records', record.id));
          if (chunkDoc.exists()) {
            const data = chunkDoc.data();
            if (data.isChunk && Array.isArray(data.chunk)) {
              const newChunk = data.chunk.filter((r: any) => r._originalIndex !== (record as any)._originalIndex);
              if (newChunk.length === 0) {
                await deleteDoc(docRef);
              } else {
                await setDoc(docRef, { ...data, chunk: newChunk });
              }
            }
          }
        } else {
          await deleteDoc(docRef);
        }

        // If it's a smart invoice, also delete the saved invoice
        if (record.fileId.startsWith('smart_invoice_')) {
          const savedInvoiceId = record.fileId.replace('smart_invoice_', '');
          try {
            await deleteDoc(doc(db, 'savedInvoices', savedInvoiceId));
          } catch (e) {
            console.error("Error deleting saved invoice:", e);
          }
        }

        // Update local state
        const updatedRecords = (Array.isArray(currentData?.records) ? currentData.records : []).filter((r: any) => !(r.id === record.id && r._originalIndex === (record as any)._originalIndex));
        updateCurrentDataState(updatedRecords);
        notify('تم حذف الفاتورة بنجاح');
      } catch (error) {
        console.error('Error deleting record:', error);
        showAlert('خطأ في العملية', 'حدث خطأ أثناء حذف الفاتورة. يرجى المحاولة مرة أخرى.', 'error');
      }
    });
  };

  const applySearchFilter = (records: FinancialRecord[]) => {
    if (!searchQuery) return records;
    const lowerQuery = searchQuery.toLowerCase();
    return records.filter((r: any) => 
      (r.Entity_Normalized_Name && r.Entity_Normalized_Name.toLowerCase().includes(lowerQuery)) || 
      (r.Invoice_Number && String(r.Invoice_Number).toLowerCase().includes(lowerQuery)) ||
      (r.Entity_TaxID && r.Entity_TaxID.toLowerCase().includes(lowerQuery)) ||
      (r.Item_Description && r.Item_Description.toLowerCase().includes(lowerQuery)) ||
      (r.Category && r.Category.toLowerCase().includes(lowerQuery))
    );
  };

  const plFilteredRevenues = useMemo(() => {
      const shouldApply = !dateFilter.sourceMode || dateFilter.sourceMode === 'reports' || dateFilter.sourceMode === 'revenues';
      let records = revenuesData.records;
      if (shouldApply) {
        records = Array.isArray(records) ? records.filter((r: any) => isDateInRange(r.Invoice_Date, dateFilter.start, dateFilter.end, dateFilter.month, dateFilter.year, r.Period_Year)) : [];
      }
      return applySearchFilter(Array.isArray(records) ? records : []);
  }, [revenuesData, dateFilter, searchQuery]);

  const plFilteredExpenses = useMemo(() => {
      const shouldApply = !dateFilter.sourceMode || dateFilter.sourceMode === 'reports' || dateFilter.sourceMode === 'expenses';
      let records = expensesData.records;
      if (shouldApply) {
        records = Array.isArray(records) ? records.filter((r: any) => isDateInRange(r.Invoice_Date, dateFilter.start, dateFilter.end, dateFilter.month, dateFilter.year, r.Period_Year)) : [];
      }
      return applySearchFilter(Array.isArray(records) ? records : []);
  }, [expensesData, dateFilter, searchQuery]);

  const plFilteredPayroll = useMemo(() => {
      const shouldApply = !dateFilter.sourceMode || dateFilter.sourceMode === 'reports' || dateFilter.sourceMode === 'payroll';
      let records = payrollData.records;
      if (shouldApply) {
        records = Array.isArray(records) ? records.filter((r: any) => isDateInRange(r.Invoice_Date, dateFilter.start, dateFilter.end, dateFilter.month, dateFilter.year, r.Period_Year)) : [];
      }
      return applySearchFilter(Array.isArray(records) ? records : []);
  }, [payrollData, dateFilter, searchQuery]);

  const plFilteredBanks = useMemo(() => {
      const shouldApply = !dateFilter.sourceMode || dateFilter.sourceMode === 'reports' || dateFilter.sourceMode === 'banks';
      let records = banksData.records;
      if (shouldApply) {
        records = Array.isArray(records) ? records.filter((r: any) => isDateInRange(r.Invoice_Date, dateFilter.start, dateFilter.end, dateFilter.month, dateFilter.year, r.Period_Year)) : [];
      }
      return applySearchFilter(Array.isArray(records) ? records : []);
  }, [banksData, dateFilter, searchQuery]);

  const handleMonthClick = (month: string) => {
    setDateFilter({ month, year: '', start: '', end: '', sourceMode: appMode });
  };

  const totalAnomaliesCount = useMemo(() => {
    const expAnomalies = plFilteredExpenses.filter(r => r.Anomalies && r.Anomalies.length > 0).length;
    const revAnomalies = plFilteredRevenues.filter(r => r.Anomalies && r.Anomalies.length > 0).length;
    const payAnomalies = plFilteredPayroll.filter(r => r.Anomalies && r.Anomalies.length > 0).length;
    const bankAnomalies = plFilteredBanks.filter(r => r.Anomalies && r.Anomalies.length > 0).length;
    return expAnomalies + revAnomalies + payAnomalies + bankAnomalies;
  }, [plFilteredExpenses, plFilteredRevenues, plFilteredPayroll, plFilteredBanks]);

  const expensesAnomalies = useMemo(() => plFilteredExpenses.filter(r => r.Anomalies && r.Anomalies.length > 0), [plFilteredExpenses]);
  const revenuesAnomalies = useMemo(() => plFilteredRevenues.filter(r => r.Anomalies && r.Anomalies.length > 0), [plFilteredRevenues]);
  const payrollAnomalies = useMemo(() => plFilteredPayroll.filter(r => r.Anomalies && r.Anomalies.length > 0), [plFilteredPayroll]);
  const banksAnomalies = useMemo(() => plFilteredBanks.filter(r => r.Anomalies && r.Anomalies.length > 0), [plFilteredBanks]);

  const incomeStatement = useMemo(() => {
      const cogsCategories = [
          'تكلفة المبيعات - مواد خام ومكونات', 
          'تكلفة المبيعات - مواد تعبئة وتغليف',
          'تكلفة المبيعات - مستهلكات تشغيلية',
          'تكلفة المبيعات - شحن ونقل للداخل'
      ];
      const capexCategories = [
          'أصول ثابتة - أجهزة ومعدات',
          'أصول ثابتة - أثاث وتركيبات',
          'أصول ثابتة - أجهزة حاسب آلي',
          'أصول ثابتة - سيارات ووسائل نقل',
          'أصول غير ملموسة - برمجيات وتطبيقات'
      ];
      
      let totalRevenue = 0;
      let revBreakdown: Record<string, number> = {};
      let totalRevenuesVAT = 0;
      let totalRevenuesGross = 0;

      plFilteredRevenues.forEach((r: any) => {
          totalRevenue += (r.Net_Amount || 0);
          totalRevenuesVAT += (r.VAT_Amount || 0);
          totalRevenuesGross += (r.Total_Amount || 0);
          revBreakdown[r.Category] = (revBreakdown[r.Category] || 0) + (r.Net_Amount || 0);
      });

      let totalCOGS = 0;
      let totalOPEX = 0;
      let totalCAPEX = 0;
      let totalExpensesVAT = 0;
      let totalExpensesGross = 0;
      let cogsBreakdown: Record<string, number> = {};
      let opexBreakdown: Record<string, number> = {};
      
      let totalPayroll = 0;
      
      plFilteredExpenses.forEach((r: any) => {
          const cat = r.Category || 'غير مصنف';
          const isPayrollCategory = cat.includes('رواتب') || cat.includes('أجور') || cat.includes('بدلات');
          const amt = isPayrollCategory ? (r.Total_Amount || 0) : (r.Net_Amount || 0);
          
          if (isPayrollCategory) totalPayroll += amt;
          
          totalExpensesVAT += (r.VAT_Amount || 0);
          totalExpensesGross += (r.Total_Amount || 0);

          if (cogsCategories.includes(cat)) {
              totalCOGS += amt;
              cogsBreakdown[cat] = (cogsBreakdown[cat] || 0) + amt;
          } else if (capexCategories.includes(cat)) {
              totalCAPEX += amt;
          } else {
              totalOPEX += amt;
              const displayCat = isPayrollCategory && !cat.includes('(صافي)') ? `${cat} (صافي)` : cat;
              opexBreakdown[displayCat] = (opexBreakdown[displayCat] || 0) + amt;
          }
      });

      plFilteredPayroll.forEach((r: any) => {
          const netExpense = (r.Total_Amount || 0);
          if (netExpense > 0) {
              totalOPEX += netExpense;
              totalPayroll += netExpense;
              opexBreakdown['رواتب وأجور وبدلات (صافي)'] = (opexBreakdown['رواتب وأجور وبدلات (صافي)'] || 0) + netExpense;
          }
      });

      const grossProfit = totalRevenue - totalCOGS;
      const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      const netOperatingIncome = grossProfit - totalOPEX;
      const netMargin = totalRevenue > 0 ? (netOperatingIncome / totalRevenue) * 100 : 0;

      // Filter breakdowns based on appMode for the dashboard (if not in reports mode)
      let dashboardRevBreakdown = Object.entries(revBreakdown);
      let dashboardCogsBreakdown = Object.entries(cogsBreakdown);
      let dashboardOpexBreakdown = Object.entries(opexBreakdown);

      if (activeTab === 'dashboard') {
          if (appMode === 'revenues') {
              dashboardCogsBreakdown = [];
              dashboardOpexBreakdown = [];
          } else if (appMode === 'expenses') {
              dashboardRevBreakdown = [];
              // Keep ALL OPEX including payroll if they uploaded payroll in the expenses module
          } else if (appMode === 'payroll') {
              dashboardRevBreakdown = [];
              dashboardCogsBreakdown = [];
              // Only keep payroll related items in OPEX
              dashboardOpexBreakdown = dashboardOpexBreakdown.filter(([name]) => name.includes('رواتب') || name.includes('أجور') || name.includes('بدلات'));
          } else if (appMode === 'banks') {
              dashboardRevBreakdown = [];
              dashboardCogsBreakdown = [];
              dashboardOpexBreakdown = [];
          }
      }

      let totalTaxable = 0;
      let totalNonTaxable = 0;
      let totalNet = 0;
      let totalVAT = 0;
      let totalGross = 0;
      let entityCount = 0;
      let largestValue = 0;

      if (appMode === 'revenues') {
          plFilteredRevenues.forEach(r => {
              totalTaxable += (r.Taxable_Amount || 0);
              totalNonTaxable += (r.NonTaxable_Amount || 0);
              totalNet += (r.Net_Amount || 0);
              totalVAT += (r.VAT_Amount || 0);
              totalGross += (r.Total_Amount || 0);
              if ((r.Total_Amount || 0) > largestValue) largestValue = (r.Total_Amount || 0);
          });
          entityCount = new Set((Array.isArray(plFilteredRevenues) ? plFilteredRevenues : []).map(r => r.Entity_ID)).size;
      } else if (appMode === 'expenses') {
          plFilteredExpenses.forEach(r => {
              totalTaxable += (r.Taxable_Amount || 0);
              totalNonTaxable += (r.NonTaxable_Amount || 0);
              totalNet += (r.Net_Amount || 0);
              totalVAT += (r.VAT_Amount || 0);
              totalGross += (r.Total_Amount || 0);
              if ((r.Total_Amount || 0) > largestValue) largestValue = (r.Total_Amount || 0);
          });
          entityCount = new Set((Array.isArray(plFilteredExpenses) ? plFilteredExpenses : []).map(r => r.Entity_ID)).size;
      } else if (appMode === 'payroll') {
          plFilteredPayroll.forEach(r => {
              totalTaxable += (r.Taxable_Amount || 0);
              totalNonTaxable += (r.NonTaxable_Amount || 0);
              totalNet += (r.Net_Amount || 0);
              totalVAT += (r.VAT_Amount || 0);
              totalGross += (r.Total_Amount || 0);
              if ((r.Total_Amount || 0) > largestValue) largestValue = (r.Total_Amount || 0);
          });
          entityCount = new Set((Array.isArray(plFilteredPayroll) ? plFilteredPayroll : []).map(r => r.Entity_ID)).size;
      }

      return {
          totalRevenue, revBreakdown: dashboardRevBreakdown.sort((a,b)=>b[1]-a[1]),
          totalCOGS, cogsBreakdown: dashboardCogsBreakdown.sort((a,b)=>b[1]-a[1]),
          totalOPEX, opexBreakdown: dashboardOpexBreakdown.sort((a,b)=>a[1]-b[1]).reverse(),
          grossProfit, grossMargin,
          netOperatingIncome, netMargin,
          totalCAPEX,
          totalPayroll,
          totalExpensesVAT, totalExpensesGross,
          totalRevenuesVAT, totalRevenuesGross,
          // Detailed stats for current mode
          totalTaxable, totalNonTaxable, totalNet, totalVAT, totalGross,
          entityCount, largestValue,
          // Full versions for reports
          fullRevBreakdown: Object.entries(revBreakdown).sort((a,b)=>b[1]-a[1]),
          fullCogsBreakdown: Object.entries(cogsBreakdown).sort((a,b)=>b[1]-a[1]),
          fullOpexBreakdown: Object.entries(opexBreakdown).sort((a,b)=>a[1]-b[1]).reverse()
      };
  }, [plFilteredRevenues, plFilteredExpenses, plFilteredPayroll, appMode, activeTab]);

  const chartDataRaw = useMemo(() => {
      const map: Record<string, any> = {};
      
      // Find most common month across all records to use as fallback
      const allRecords = [...plFilteredRevenues, ...plFilteredExpenses, ...plFilteredPayroll];
      const mCounts: Record<string, number> = {};
      let mCommon = '';
      let mMax = 0;
      allRecords.forEach(r => {
          if (r.Invoice_Date && r.Invoice_Date !== 'غير محدد') {
              const m = r.Invoice_Date.substring(0, 7);
              mCounts[m] = (mCounts[m] || 0) + 1;
              if (mCounts[m] > mMax) { mMax = mCounts[m]; mCommon = m; }
          }
      });
      if (!mCommon) {
          const today = new Date();
          mCommon = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      }

      const filteredRevenues = (activeTab === 'dashboard' && appMode !== 'revenues' && appMode !== 'reports') ? [] : plFilteredRevenues;
      const filteredExpenses = (activeTab === 'dashboard' && appMode !== 'expenses' && appMode !== 'reports') ? [] : plFilteredExpenses;
      const filteredPayroll = (activeTab === 'dashboard' && appMode !== 'payroll' && appMode !== 'reports') ? [] : plFilteredPayroll;

      filteredRevenues.forEach(r => {
          if (!r.Invoice_Date || r.Invoice_Date === 'غير محدد' || r.Invoice_Date === '-' || r.Invoice_Date === 'بدون تاريخ') return;
          const m = r.Invoice_Date.substring(0, 7);
          if (!map[m]) map[m] = { name: formatMonthName(m), rawMonth: m, الإيرادات: 0, المصروفات: 0, الرواتب: 0, الربح: 0, هامش_الربح: 0 };
          map[m].الإيرادات += r.Total_Amount || 0;
          map[m].الربح += r.Total_Amount || 0;
      });
      filteredExpenses.forEach(r => {
          if (!r.Invoice_Date || r.Invoice_Date === 'غير محدد' || r.Invoice_Date === '-' || r.Invoice_Date === 'بدون تاريخ') return;
          const m = r.Invoice_Date.substring(0, 7);
          if (!map[m]) map[m] = { name: formatMonthName(m), rawMonth: m, الإيرادات: 0, المصروفات: 0, الرواتب: 0, الربح: 0, هامش_الربح: 0 };
          map[m].المصروفات += r.Total_Amount || 0;
          map[m].الربح -= r.Total_Amount || 0;
      });
      filteredPayroll.forEach(r => {
          if (!r.Invoice_Date || r.Invoice_Date === 'غير محدد' || r.Invoice_Date === '-' || r.Invoice_Date === 'بدون تاريخ') return;
          const m = r.Invoice_Date.substring(0, 7);
          if (!map[m]) map[m] = { name: formatMonthName(m), rawMonth: m, الإيرادات: 0, المصروفات: 0, الرواتب: 0, الربح: 0, هامش_الربح: 0 };
          
          const netPayroll = (r.Total_Amount || 0);
          
          map[m].الرواتب += netPayroll;
          map[m].الربح -= netPayroll;
      });
      return (Array.isArray(Object.values(map)) ? Object.values(map) : []).map(d => ({
          ...d,
          هامش_الربح: d.الإيرادات > 0 ? parseFloat(((d.الربح / d.الإيرادات) * 100).toFixed(1)) : 0
      })).sort((a: any, b: any) => a.rawMonth.localeCompare(b.rawMonth));
  }, [plFilteredRevenues, plFilteredExpenses, plFilteredPayroll, appMode, activeTab]);

  const categoriesArray = useMemo(() => {
      const map: Record<string, any> = {};
      const targetRecords = 
        appMode === 'expenses' ? plFilteredExpenses :
        appMode === 'revenues' ? plFilteredRevenues :
        appMode === 'payroll' ? plFilteredPayroll :
        appMode === 'banks' ? plFilteredBanks : [];
        
      targetRecords.forEach(r => {
          let cat = r.Category || 'غير مصنف';
          
          if (appMode === 'payroll') {
             let monthKey = 'غير محدد';
             if (r.Invoice_Date && r.Invoice_Date !== 'غير محدد') {
                 monthKey = r.Invoice_Date.substring(0, 7);
             }
             if ((r as any)._finalMonth) {
                 monthKey = (r as any)._finalMonth;
             }
             cat = monthKey;
          }
          
          if(!map[cat]) map[cat] = { name: cat, invoiceCount: 0, totalNet: 0, totalTaxable: 0, totalNonTaxable: 0, totalVAT: 0, totalSpend: 0, invoices: [] };
          const c = map[cat];
          c.invoiceCount++; 
          c.totalNet += (r.Net_Amount || 0); 
          c.totalTaxable += (r.Taxable_Amount || 0); 
          c.totalNonTaxable += (r.NonTaxable_Amount || 0); 
          c.totalVAT += (r.VAT_Amount || 0); 
          c.totalSpend += (r.Total_Amount || 0);
          c.invoices.push(r);
      });
      
      const result = Object.values(map);
      if (appMode === 'payroll') {
          return result.sort((a, b) => a.name.localeCompare(b.name));
      } else {
          return result.sort((a, b) => {
              const orderA = CATEGORY_ORDER.indexOf(a.name);
              const orderB = CATEGORY_ORDER.indexOf(b.name);
              if (orderA !== -1 && orderB !== -1) return orderA - orderB;
              if (orderA !== -1) return -1;
              if (orderB !== -1) return 1;
              return b.totalSpend - a.totalSpend;
          });
      }
  }, [plFilteredRevenues, plFilteredExpenses, plFilteredPayroll, plFilteredBanks, appMode]);

  const revPieData = useMemo(() => {
    let data: any[] = [];
    if (appMode === 'revenues') data = (Array.isArray(categoriesArray) ? categoriesArray : []).map(c => ({ name: c.name, value: c.totalSpend })).sort((a,b) => b.value - a.value);
    else data = (Array.isArray(incomeStatement?.revBreakdown) ? incomeStatement.revBreakdown : []).map(([name, value]: any) => ({ name, value })).sort((a,b) => b.value - a.value);
    return data;
  }, [incomeStatement?.revBreakdown, appMode, categoriesArray]);

  const expPieData = useMemo(() => {
    let data: any[] = [];
    if (appMode === 'payroll') {
      data = [
        { name: 'الرواتب الأساسية', value: incomeStatement?.totalTaxable || 0 },
        { name: 'البدلات', value: incomeStatement?.totalNonTaxable || 0 },
        { name: 'الاستقطاعات', value: incomeStatement?.totalVAT || 0 }
      ].filter(item => item.value > 0).sort((a,b) => b.value - a.value);
    } else {
      data = (Array.isArray(categoriesArray) ? categoriesArray : []).map(c => ({ name: c.name, value: c.totalSpend })).sort((a,b) => b.value - a.value).slice(0, 5);
    }
    return data;
  }, [incomeStatement?.totalTaxable, incomeStatement?.totalNonTaxable, incomeStatement?.totalVAT, appMode, categoriesArray]);

  const expBarData = useMemo(() => {
    let data: any[] = [];
    if (appMode === 'payroll') {
      data = [
        { name: 'الرواتب الأساسية', value: incomeStatement?.totalTaxable || 0 },
        { name: 'البدلات', value: incomeStatement?.totalNonTaxable || 0 },
        { name: 'الاستقطاعات', value: incomeStatement?.totalVAT || 0 }
      ].filter(item => item.value > 0).sort((a: any, b: any) => b.value - a.value);
    } else {
      data = (Array.isArray(categoriesArray) ? categoriesArray : []).map(c => ({ name: c.name, value: c.totalSpend })).sort((a,b) => b.value - a.value).slice(0, 5);
    }
    return data;
  }, [incomeStatement?.totalTaxable, incomeStatement?.totalNonTaxable, incomeStatement?.totalVAT, appMode, categoriesArray]);

  const topSuppliers = useMemo(() => {
    const map: Record<string, { value: number, id: string }> = {};
    plFilteredExpenses.forEach(r => {
      const name = r.Entity_Normalized_Name || r.Raw_Entity || 'مورد غير محدد';
      if (!map[name]) map[name] = { value: 0, id: r.Entity_ID || '' };
      map[name].value += (r.Total_Amount || 0);
    });
    return Object.entries(map).map(([name, data]) => ({ name, value: data.value, entityId: data.id })).sort((a,b) => b.value - a.value).slice(0, 5);
  }, [plFilteredExpenses]);

  const topCustomers = useMemo(() => {
    const map: Record<string, { value: number, id: string }> = {};
    plFilteredRevenues.forEach(r => {
      const name = r.Entity_Normalized_Name || r.Raw_Entity || 'عميل غير محدد';
      if (!map[name]) map[name] = { value: 0, id: r.Entity_ID || '' };
      map[name].value += (r.Total_Amount || 0);
    });
    return Object.entries(map).map(([name, data]) => ({ name, value: data.value, entityId: data.id })).sort((a,b) => b.value - a.value).slice(0, 5);
  }, [plFilteredRevenues]);

  const topEmployees = useMemo(() => {
    const map: Record<string, { value: number, id: string }> = {};
    plFilteredPayroll.forEach(r => {
      const name = r.Entity_Normalized_Name || r.Raw_Entity || 'موظف غير محدد';
      if (!map[name]) map[name] = { value: 0, id: r.Entity_ID || '' };
      map[name].value += (r.Total_Amount || 0);
    });
    return Object.entries(map).map(([name, data]) => ({ name, value: data.value, entityId: data.id })).sort((a,b) => b.value - a.value).slice(0, 5);
  }, [plFilteredPayroll]);

  const topBanks = useMemo(() => {
    const map: Record<string, number> = {};
    plFilteredBanks.forEach(r => {
      const name = r.Entity_Normalized_Name || r.Raw_Entity || 'غير معروف';
      map[name] = (map[name] || 0) + (r.Total_Amount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [plFilteredBanks]);

  const baseFilteredRecords = useMemo(() => {
      if (!currentData || !currentData.records) return [];
      
      const strictlyFiltered = currentData.records.filter((r: any) => {
          // ENSURE STRICT SEPARATION EVEN IF STATES ARE SOMEHOW MIXED
          if (appMode === 'expenses' && r.moduleType !== 'expenses') return false;
          if (appMode === 'revenues' && r.moduleType !== 'revenues') return false;
          if (appMode === 'payroll' && r.moduleType !== 'payroll') return false;
          if (appMode === 'banks' && r.moduleType !== 'banks') return false;
          
          const passAudit = auditMode ? (r.Anomalies && r.Anomalies.length > 0) : true;
          const passSearch = searchQuery === '' || 
              (r.Entity_Normalized_Name && r.Entity_Normalized_Name.toLowerCase().includes(searchQuery.toLowerCase())) || 
              (r.Invoice_Number && String(r.Invoice_Number).toLowerCase().includes(searchQuery.toLowerCase())) ||
              (r.Entity_TaxID && r.Entity_TaxID.toLowerCase().includes(searchQuery.toLowerCase())) ||
              (r.Item_Description && r.Item_Description.toLowerCase().includes(searchQuery.toLowerCase())) ||
              (r.Category && r.Category.toLowerCase().includes(searchQuery.toLowerCase()));
          return passAudit && passSearch;
      });
      
      console.log("=== FRONTEND STRICT FILTER PROOF ===");
      console.log("ACTIVE MODULE:", appMode);
      console.log("VISIBLE RECORDS:", strictlyFiltered.length);
      console.log("SAMPLE:", strictlyFiltered.slice(0,3).map((r: any) => r.moduleType));
      
      return strictlyFiltered;
  }, [currentData, auditMode, searchQuery, appMode]);

  const filteredRecords = useMemo(() => {
      return baseFilteredRecords.filter((r: any) => {
          return isDateInRange(r.Invoice_Date, dateFilter.start, dateFilter.end, dateFilter.month, dateFilter.year, r.Period_Year);
      }).sort((a: any, b: any) => {
          const dateA = a.Invoice_Date || '';
          const dateB = b.Invoice_Date || '';
          if (!dateA || dateA === 'غير محدد' || dateA === '-' || dateA === 'بدون تاريخ') return 1;
          if (!dateB || dateB === 'غير محدد' || dateB === '-' || dateB === 'بدون تاريخ') return -1;
          return dateA.localeCompare(dateB);
      });
  }, [baseFilteredRecords, dateFilter]);

  const totalSpend = filteredRecords.reduce((sum: number, r: any) => sum + (r.Total_Amount || 0), 0);
  const totalNet = filteredRecords.reduce((sum: number, r: any) => sum + (r.Net_Amount || 0), 0);
  const totalVAT = filteredRecords.reduce((sum: number, r: any) => sum + (r.VAT_Amount || 0), 0);
  const totalTaxable = filteredRecords.reduce((sum: number, r: any) => sum + (r.Taxable_Amount || 0), 0);
  const totalNonTaxable = filteredRecords.reduce((sum: number, r: any) => sum + (r.NonTaxable_Amount || 0), 0);
  const anomaliesCount = filteredRecords.filter((r: any) => r.Anomalies && r.Anomalies.length > 0).length;

  const filteredEntities = useMemo(() => {
      if (!currentData || !currentData.entities) return [];
      const dynamicMap: Record<string, any> = {};
      filteredRecords.forEach((r: any) => {
          if (!dynamicMap[r.Entity_ID]) {
              const orig = currentData.entities.find((s: any) => s.id === r.Entity_ID) || {};
              dynamicMap[r.Entity_ID] = { ...orig, invoiceCount: 0, totalNet: 0, totalTaxableNet: 0, totalNonTaxableNet: 0, totalVAT: 0, totalSpend: 0, anomalies: 0, categoriesSet: new Set() };
          }
          const s = dynamicMap[r.Entity_ID];
          s.invoiceCount++; 
          s.totalNet += (r.Net_Amount || 0); 
          s.totalTaxableNet += (r.Taxable_Amount || 0); 
          s.totalNonTaxableNet += (r.NonTaxable_Amount || 0); 
          s.totalVAT += (r.VAT_Amount || 0); 
          s.totalSpend += (r.Total_Amount || 0);
          if (r.Anomalies && r.Anomalies.length > 0) s.anomalies++;
          s.categoriesSet.add(r.Category);
      });
      return Object.values(dynamicMap).map(s => {
          s.categoriesArray = Array.from(s.categoriesSet);
          s.categoryString = s.categoriesArray.join(" ، ");
          return s;
      }).sort((a,b) => b.totalSpend - a.totalSpend);
  }, [filteredRecords, currentData]);

  const topEntitiesData = useMemo(() => {
    let rawList: any[] = [];
    if (appMode === 'expenses') rawList = topSuppliers;
    else if (appMode === 'revenues') rawList = topCustomers;
    else if (appMode === 'payroll') rawList = topEmployees;
    else if (appMode === 'banks') rawList = topBanks;
    return rawList.slice(0, 5);
  }, [appMode, topSuppliers, topCustomers, topEmployees, topBanks]);

  const anomaliesSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    [...plFilteredExpenses, ...plFilteredRevenues, ...plFilteredPayroll, ...plFilteredBanks].forEach(r => {
      if (r.Anomalies) {
        r.Anomalies.forEach(a => {
          summary[a] = (summary[a] || 0) + 1;
        });
      }
    });
    return (Array.isArray(Object.entries(summary)) ? Object.entries(summary) : []).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);
  }, [plFilteredExpenses, plFilteredRevenues, plFilteredPayroll, plFilteredBanks]);

  const exportToExcel = async (exportAll: boolean = false) => {
    setExportMenuOpen(false);
    setStatus('exporting');
    
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = settings?.companyName || 'نظام الفوترة الرقمي';
      workbook.lastModifiedBy = settings?.companyName || 'نظام الفوترة الرقمي';
      workbook.created = new Date();
      workbook.modified = new Date();

      const headerStyle = {
        font: { name: 'Tajawal', bold: true, color: { argb: 'FF1E293B' }, size: 12 },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF1F5F9' } },
        alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
        border: {
          top: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } }
        }
      };

      const rowStyle = {
        font: { name: 'Tajawal', size: 11 },
        alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
        border: {
          top: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } }
        }
      };

      const numberFormat = '#,##0.00';

      const addSheet = (name: string, columns: any[], data: any[], customAppMode?: string) => {
        const sheet = workbook.addWorksheet(name, { views: [{ rightToLeft: true }] });
        
        // Define columns first (this helps with keys and widths)
        sheet.columns = columns.map(c => ({ header: '', key: c.key, width: c.width }));

        // Add Title Row at Row 1
        const titleRow = sheet.getRow(1);
        titleRow.values = [name];
        titleRow.height = 40;
        sheet.mergeCells(1, 1, 1, columns.length);
        titleRow.getCell(1).style = {
          font: { name: 'Tajawal', size: 18, bold: true, color: { argb: 'FFFFFFFF' } },
          alignment: { horizontal: 'center', vertical: 'middle' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
        };

        // Add Header Row at Row 2
        const headerRow = sheet.getRow(2);
        headerRow.values = columns.map(c => c.header);
        headerRow.height = 30;
        headerRow.eachCell((cell) => {
          cell.style = headerStyle;
        });

        // Add Data Rows starting from Row 3
        data.forEach((rowData) => {
          const isTotalRow = rowData.name === 'الإجمالي الكلي' || rowData.invoiceNum === 'الإجمالي الكلي' || rowData.month === 'الإجمالي العام';
          const row = sheet.addRow(rowData);
          row.height = 25;
          row.eachCell((cell) => {
            cell.style = rowStyle;
            if (typeof cell.value === 'number') {
              cell.numFmt = numberFormat;
            }
            if (isTotalRow) {
              cell.font = { ...rowStyle.font, bold: true, color: { argb: 'FF1E293B' } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
            }
          });
        });

        return sheet;
      };

      if (appMode === 'reports') {
        // Export Comprehensive Report for Reports Mode
        const sheet = workbook.addWorksheet('ملخص الأداء المالي', { views: [{ rightToLeft: true }] });
        sheet.columns = [
          { header: 'البند', key: 'item', width: 40 },
          { header: 'المبلغ', key: 'amount', width: 20 }
        ];

        sheet.getRow(1).height = 30;
        sheet.getRow(1).eachCell(cell => cell.style = headerStyle);

        const addIncomeRow = (item: string, amount: string | number, isHeader = false, isTotal = false) => {
          const row = sheet.addRow({ item, amount });
          row.height = 25;
          row.eachCell((cell, colNumber) => {
            cell.style = rowStyle;
            if (colNumber === 2 && typeof cell.value === 'number') cell.numFmt = numberFormat;
            if (isHeader) {
              cell.font = { ...rowStyle.font, bold: true, color: { argb: 'FF1E293B' } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
            } else if (isTotal) {
              cell.font = { ...rowStyle.font, bold: true, color: { argb: 'FFFFFFFF' } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
            }
          });
        };

        addIncomeRow('إجمالي المبيعات', incomeStatement.totalRevenue, true);
        addIncomeRow('تكلفة المبيعات (الطعام والتغليف)', incomeStatement.totalCOGS);
        addIncomeRow('مجمل الربح', incomeStatement.grossProfit, false, true);
        addIncomeRow('نسبة مجمل الربح', `${incomeStatement.grossMargin.toFixed(1)}%`);
        addIncomeRow('إجمالي المصاريف التشغيلية', incomeStatement.totalOPEX, true);
        addIncomeRow('صافي الأرباح', incomeStatement.netOperatingIncome, false, true);
        addIncomeRow('نسبة صافي الربح', `${incomeStatement.netMargin.toFixed(1)}%`);

        // Add Detailed Sheets for each section
        const sections = [
          { label: 'المصروفات', records: plFilteredExpenses, mode: 'expenses' },
          { label: 'الإيرادات', records: plFilteredRevenues, mode: 'revenues' },
          { label: 'الرواتب', records: plFilteredPayroll, mode: 'payroll' }
        ];

        sections.forEach(section => {
          if (section.records.length > 0) {
            const cols = [
              { header: 'رقم المستند', key: 'invoiceNum', width: 20 },
              { header: 'التاريخ', key: 'date', width: 15 },
              { header: 'الجهة', key: 'name', width: 30 },
              { header: 'البيان', key: 'desc', width: 40 },
              { header: 'التوجيه', key: 'category', width: 25 },
              { header: 'الإجمالي', key: 'total', width: 20 }
            ];
            const data = section.records.map(r => ({
              invoiceNum: r.Invoice_Number,
              date: r.Invoice_Date,
              name: r.Entity_Normalized_Name,
              desc: r.Item_Description || "-",
              category: r.Category,
              total: (r.Total_Amount || 0)
            }));
            addSheet(section.label, cols, data, section.mode);
          }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `التقرير_المالي_الشامل_Sweet_Atelier_${new Date().toISOString().split('T')[0]}.xlsx`);
        setStatus('ready');
        return;
      }

      const currentFilteredRecords = filteredRecords;
      if (!currentFilteredRecords.length) {
        setStatus('ready');
        return;
      }

      // No Cover Page requested

      const entsColumns = [
        { header: `اسم ${entLabel}`, key: 'name', width: 30 },
        ...(appMode !== 'payroll' ? [{ header: 'الرقم الضريبي', key: 'taxId', width: 20 }] : []),
        { header: 'التوجيهات المحاسبية', key: 'categories', width: 30 },
        { header: 'العمليات', key: 'count', width: 15 },
        { header: appMode === 'payroll' ? 'الأساسي' : 'الخاضع', key: 'taxable', width: 20 },
        { header: appMode === 'payroll' ? 'البدلات' : 'غير الخاضع', key: 'nonTaxable', width: 20 },
        { header: appMode === 'payroll' ? 'إجمالي الاستحقاق' : 'قبل الضريبة', key: 'net', width: 20 },
        { header: appMode === 'payroll' ? 'الاستقطاعات' : 'الضريبة', key: 'vat', width: 20 },
        { header: appMode === 'payroll' ? 'الصافي' : 'الإجمالي', key: 'total', width: 20 }
      ];

      const entsData = filteredEntities.map(s => ({
        name: s.name,
        ...(appMode !== 'payroll' ? { taxId: (s as any).taxId || "غير متوفر" } : {}),
        categories: (s as any).categoryString,
        count: s.invoiceCount,
        taxable: s.totalTaxableNet,
        nonTaxable: s.totalNonTaxableNet,
        net: s.totalNet,
        vat: s.totalVAT,
        total: s.totalSpend
      }));

      // Add Totals row
      entsData.push({
        name: 'الإجمالي الكلي',
        ...(appMode !== 'payroll' ? { taxId: '-' } : {}),
        categories: '-',
        count: entsData.reduce((sum, r) => sum + (r.count || 0), 0),
        taxable: entsData.reduce((sum, r) => sum + (r.taxable || 0), 0),
        nonTaxable: entsData.reduce((sum, r) => sum + (r.nonTaxable || 0), 0),
        net: entsData.reduce((sum, r) => sum + (r.net || 0), 0),
        vat: entsData.reduce((sum, r) => sum + (r.vat || 0), 0),
        total: entsData.reduce((sum, r) => sum + (r.total || 0), 0)
      } as any);

      const recordsColumns = [
        { header: 'رقم المستند', key: 'invoiceNum', width: 20 },
        { header: 'التاريخ', key: 'date', width: 15 },
        { header: `اسم ${entLabel}`, key: 'name', width: 30 },
        { header: 'البيان / الوصف', key: 'desc', width: 40 },
        { header: appMode === 'payroll' ? 'الشهر' : 'التوجيه المحاسبي', key: 'category', width: 25 },
        { header: 'ثقة الذكاء الاصطناعي', key: 'aiConf', width: 15 },
        { header: 'تفسير النظام', key: 'aiExp', width: 40 },
        { header: appMode === 'payroll' ? 'الأساسي' : 'الخاضع', key: 'taxable', width: 20 },
        { header: appMode === 'payroll' ? 'البدلات' : 'غير خاضع', key: 'nonTaxable', width: 20 },
        { header: appMode === 'payroll' ? 'إجمالي الاستحقاق' : 'قبل الضريبة', key: 'net', width: 20 },
        { header: appMode === 'payroll' ? 'الاستقطاعات' : 'الضريبة', key: 'vat', width: 20 },
        { header: appMode === 'payroll' ? 'الصافي' : 'الإجمالي', key: 'total', width: 20 }
      ];

      let sortedRecords = [...currentFilteredRecords];
      if (appMode === 'payroll') {
        sortedRecords.sort((a, b) => {
          const catA = a.Category || '';
          const catB = b.Category || '';
          return catA.localeCompare(catB);
        });
      }

      const recordsData = sortedRecords.map(r => ({
        invoiceNum: r.Invoice_Number,
        date: r.Invoice_Date,
        name: r.Entity_Normalized_Name,
        desc: r.Item_Description || "-",
        category: r.Category,
        aiConf: r.Category_Confidence ? `${r.Category_Confidence}%` : '-',
        aiExp: r.AI_Explanation || '-',
        taxable: (r.Taxable_Amount || 0),
        nonTaxable: (r.NonTaxable_Amount || 0),
        net: (r.Net_Amount || 0),
        vat: (r.VAT_Amount || 0),
        total: (r.Total_Amount || 0)
      }));

      // Add Totals row
      recordsData.push({
        invoiceNum: 'الإجمالي الكلي',
        date: '-',
        name: '-',
        desc: '-',
        category: '-',
        aiConf: '-',
        aiExp: '-',
        taxable: recordsData.reduce((sum, r) => sum + (r.taxable || 0), 0),
        nonTaxable: recordsData.reduce((sum, r) => sum + (r.nonTaxable || 0), 0),
        net: recordsData.reduce((sum, r) => sum + (r.net || 0), 0),
        vat: recordsData.reduce((sum, r) => sum + (r.vat || 0), 0),
        total: recordsData.reduce((sum, r) => sum + (r.total || 0), 0)
      } as any);

      const catColumns = [
        { header: appMode === 'payroll' ? 'الشهر' : 'التصنيف المحاسبي', key: 'name', width: 40 },
        { header: 'العمليات', key: 'count', width: 15 },
        { header: appMode === 'payroll' ? 'الأساسي' : 'الخاضع', key: 'taxable', width: 20 },
        { header: appMode === 'payroll' ? 'البدلات' : 'غير خاضع', key: 'nonTaxable', width: 20 },
        { header: appMode === 'payroll' ? 'إجمالي الاستحقاق' : 'قبل الضريبة', key: 'net', width: 20 },
        { header: appMode === 'payroll' ? 'الاستقطاعات' : 'الضريبة', key: 'vat', width: 20 },
        { header: appMode === 'payroll' ? 'الصافي' : 'الإجمالي', key: 'total', width: 20 }
      ];

      let catData: any[] = [];
      if (appMode === 'payroll') {
        catData = categoriesArray.map(c => ({
          name: c.name,
          count: c.invoiceCount,
          taxable: c.totalTaxable,
          nonTaxable: c.totalNonTaxable,
          net: c.totalNet,
          vat: c.totalVAT,
          total: c.totalSpend
        }));
      } else {
        const hierarchy = buildHierarchy(categoriesArray);
        catData = flattenHierarchyForExcel(hierarchy);
      }

      // Add Totals row
      const totalRow = {
        name: 'الإجمالي الكلي',
        count: categoriesArray.reduce((sum, r) => sum + (r.invoiceCount || 0), 0),
        taxable: categoriesArray.reduce((sum, r) => sum + (r.totalTaxable || 0), 0),
        nonTaxable: categoriesArray.reduce((sum, r) => sum + (r.totalNonTaxable || 0), 0),
        net: categoriesArray.reduce((sum, r) => sum + (r.totalNet || 0), 0),
        vat: categoriesArray.reduce((sum, r) => sum + (r.totalVAT || 0), 0),
        total: categoriesArray.reduce((sum, r) => sum + (r.totalSpend || 0), 0)
      };
      catData.push(totalRow as any);

      // --- ACTIVE TAB LOGIC FOR EXCEL ---
      let catSheet: any;

      if (exportAll) {
        addSheet("السجل التفصيلي", recordsColumns, recordsData);
        addSheet(`ملخص ${appMode === 'expenses' ? 'الموردين' : (appMode === 'revenues' ? 'العملاء' : (appMode === 'banks' ? 'الحسابات' : 'الموظفين'))}`, entsColumns, entsData);
        catSheet = addSheet(appMode === 'payroll' ? "الملخص الشهري" : "ملخص التصنيفات", catColumns, catData);
      } else if (activeTab === 'categories_summary') {
        catSheet = addSheet("ملخص التصنيفات", catColumns, catData);
      } else if (activeTab === 'monthly_summary') {
        const map: Record<string, { month: string, count: number, totalTaxable: number, totalNonTaxable: number, totalVAT: number, totalSpend: number }> = {};
        filteredRecords.forEach(r => {
          const m = (r.Invoice_Date && r.Invoice_Date !== 'غير محدد') ? r.Invoice_Date.substring(0, 7) : 'غير محدد';
          if (!map[m]) map[m] = { month: m, count: 0, totalTaxable: 0, totalNonTaxable: 0, totalVAT: 0, totalSpend: 0 };
          map[m].count++;
          map[m].totalTaxable += r.Taxable_Amount || 0;
          map[m].totalNonTaxable += r.NonTaxable_Amount || 0;
          map[m].totalVAT += r.VAT_Amount || 0;
          map[m].totalSpend += r.Total_Amount || 0;
        });
        const monthlyData = Object.values(map).sort((a,b) => a.month.localeCompare(b.month));
        const monthColumns = [
          { header: 'الشهر', key: 'month', width: 20 },
          { header: 'العمليات', key: 'count', width: 15 },
          { header: appMode === 'payroll' ? 'الأساسي' : 'الخاضع', key: 'taxable', width: 20 },
          { header: appMode === 'payroll' ? 'البدلات' : 'غير الخاضع', key: 'nonTaxable', width: 20 },
          { header: appMode === 'payroll' ? 'إجمالي الاستحقاق' : 'الاستقطاعات', key: 'net', width: 20 },
          { header: appMode === 'payroll' ? 'الاستقطاعات' : 'الضريبة', key: 'vat', width: 20 },
          { header: appMode === 'payroll' ? 'الصافي' : 'الإجمالي الكلي', key: 'total', width: 20 }
        ];
        const monthRows = monthlyData.map(m => ({
          month: m.month,
          count: m.count,
          taxable: m.totalTaxable,
          nonTaxable: m.totalNonTaxable,
          net: m.totalTaxable + m.totalNonTaxable,
          vat: m.totalVAT,
          total: m.totalSpend
        }));
        monthRows.push({
          month: 'الإجمالي الكلي', count: monthlyData.reduce((s,x)=>s+x.count,0), taxable: monthlyData.reduce((s,x)=>s+x.totalTaxable,0), nonTaxable: monthlyData.reduce((s,x)=>s+x.totalNonTaxable,0), net: monthlyData.reduce((s,x)=>s+(x.totalTaxable+x.totalNonTaxable),0), vat: monthlyData.reduce((s,x)=>s+x.totalVAT,0), total: monthlyData.reduce((s,x)=>s+x.totalSpend,0)
        });
        addSheet("الملخص الشهري", monthColumns, monthRows);
      } else if (activeTab === 'monthly_payroll') {
        const empMap: Record<string, {name:string, totals:Record<string,number>}> = {};
        const monthsSet = new Set<string>();
        filteredRecords.forEach(r => {
          const m = (r.Invoice_Date && r.Invoice_Date !== 'غير محدد') ? r.Invoice_Date.substring(0, 7) : 'غير محدد';
          monthsSet.add(m);
          if (!empMap[r.Entity_Normalized_Name]) empMap[r.Entity_Normalized_Name] = { name: r.Entity_Normalized_Name, totals: {} };
          empMap[r.Entity_Normalized_Name].totals[m] = (empMap[r.Entity_Normalized_Name].totals[m] || 0) + (r.Total_Amount || 0);
        });
        const monthsArr = Array.from(monthsSet).sort();
        const payCols = [{ header: 'اسم الموظف', key: 'name', width: 30 }, ...monthsArr.map(m => ({ header: m, key: m, width: 15 })), { header: 'الإجمالي', key: 'total', width: 20 }];
        const payRows = Object.values(empMap).map(emp => {
          const row: any = { name: emp.name };
          let empTotal = 0;
          monthsArr.forEach(m => {
            row[m] = emp.totals[m] || 0;
            empTotal += (emp.totals[m] || 0);
          });
          row.total = empTotal;
          return row;
        });
        addSheet("سجل الرواتب الشهري", payCols, payRows);
      } else if (activeTab === 'grouped_purchases') {
        addSheet(`ملخص ${appMode === 'expenses' ? 'الموردين' : (appMode === 'revenues' ? 'العملاء' : (appMode === 'banks' ? 'الحسابات' : 'الموظفين'))}`, entsColumns, entsData);
      } else if (activeTab === 'items_directory') {
        // Build items data for items_directory
        const itemsMap = new Map<string, any>();
        filteredRecords.forEach(r => {
          const name = r.Item_Description?.trim() || 'بدون وصف';
          if (!itemsMap.has(name)) {
            itemsMap.set(name, { name, count: 0, totalSpend: 0, totalTaxable: 0 });
          }
          const item = itemsMap.get(name)!;
          item.count++;
          item.totalSpend += (r.Total_Amount || 0);
          item.totalTaxable += (r.Taxable_Amount || 0);
        });
        const itemsArray = Array.from(itemsMap.values()).sort((a,b) => b.totalSpend - a.totalSpend);
        
        const itemColumns = [
          { header: 'اسم الصنف / الخدمة', key: 'name', width: 40 },
          { header: 'عدد العمليات', key: 'count', width: 15 },
          { header: 'الإجمالي الخاضع', key: 'totalTaxable', width: 20 },
          { header: 'الإجمالي الكلي', key: 'totalSpend', width: 20 },
        ];
        itemsArray.push({
          name: 'الإجمالي الكلي',
          count: itemsArray.reduce((s, r) => s + r.count, 0),
          totalTaxable: itemsArray.reduce((s, r) => s + r.totalTaxable, 0),
          totalSpend: itemsArray.reduce((s, r) => s + r.totalSpend, 0)
        } as any);
        
        addSheet("سجل الأصناف", itemColumns, itemsArray);
      } else {
        addSheet("السجل التفصيلي", recordsColumns, recordsData);
      }
      
      // Apply styling to header rows in the hierarchy
      if (appMode !== 'payroll' && catSheet) {
        catData.forEach((row, idx) => {
          if (row.isHeader) {
            const excelRow = catSheet.getRow(idx + 3); // +3 because Excel is 1-indexed, we have a title row and a header row
            excelRow.font = { bold: true };
            excelRow.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF5F5F5' }
            };
          }
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `تقرير_${actLabel}_Sweet_Atelier_${new Date().toISOString().split('T')[0]}.xlsx`);
      setStatus('ready');
    } catch (err) {
      console.error("Excel Export Error:", err);
      setStatus('ready');
    }
  };

  const handleExportPDF = async (exportAll: boolean = false) => {
    setExportMenuOpen(false);
    setStatus('exporting');
    
    try {
      const title = `تقرير ${actLabel} - ${settings?.companyName || 'نظام الفوترة الرقمي'}`;
      
      let headers: string[] = [];
      let contentData: any[][] = [];

      if (!exportAll && ['categories_summary', 'monthly_payroll'].includes(activeTab)) {
        headers = [
           appMode === 'payroll' ? 'الشهر' : 'التصنيف المحاسبي',
          'العمليات',
          appMode === 'payroll' ? 'الأساسي' : 'الخاضع',
          appMode === 'payroll' ? 'البدلات' : 'غير خاضع',
          appMode === 'payroll' ? 'إجمالي الاستحقاق' : 'قبل الضريبة',
          appMode === 'payroll' ? 'الاستقطاعات' : 'الضريبة',
          appMode === 'payroll' ? 'الصافي' : 'الإجمالي'
        ];

        let catData: any[] = [];
        if (appMode === 'payroll') {
          catData = categoriesArray.map(c => [
            c.name, c.invoiceCount, c.totalTaxable, c.totalNonTaxable, c.totalNet, c.totalVAT, c.totalSpend
          ]);
        } else {
          catData = flattenHierarchyForExcel(buildHierarchy(categoriesArray)).map(c => [
            c.name, c.count || 0, c.taxable || 0, c.nonTaxable || 0, c.net || 0, c.vat || 0, c.total || 0
          ]);
        }

        contentData = catData.map(r => [
          r[0], r[1],
          (Number(r[2]) || 0).toFixed(2),
          (Number(r[3]) || 0).toFixed(2),
          (Number(r[4]) || 0).toFixed(2),
          (Number(r[5]) || 0).toFixed(2),
          (Number(r[6]) || 0).toFixed(2)
        ]);

        contentData.push([
          'الإجمالي الكلي',
          categoriesArray.reduce((sum, r) => sum + (r.invoiceCount || 0), 0),
          categoriesArray.reduce((sum, r) => sum + (r.totalTaxable || 0), 0).toFixed(2),
          categoriesArray.reduce((sum, r) => sum + (r.totalNonTaxable || 0), 0).toFixed(2),
          categoriesArray.reduce((sum, r) => sum + (r.totalNet || 0), 0).toFixed(2),
          categoriesArray.reduce((sum, r) => sum + (r.totalVAT || 0), 0).toFixed(2),
          categoriesArray.reduce((sum, r) => sum + (r.totalSpend || 0), 0).toFixed(2)
        ]);

      } else if (!exportAll && activeTab === 'monthly_summary') {
        // Group by month
        const map: Record<string, { month: string, count: number, totalTaxable: number, totalNonTaxable: number, totalVAT: number, totalSpend: number }> = {};
        filteredRecords.forEach(r => {
          const m = (r.Invoice_Date && r.Invoice_Date !== 'غير محدد') ? r.Invoice_Date.substring(0, 7) : 'غير محدد';
          if (!map[m]) map[m] = { month: m, count: 0, totalTaxable: 0, totalNonTaxable: 0, totalVAT: 0, totalSpend: 0 };
          map[m].count++;
          map[m].totalTaxable += r.Taxable_Amount || 0;
          map[m].totalNonTaxable += r.NonTaxable_Amount || 0;
          map[m].totalVAT += r.VAT_Amount || 0;
          map[m].totalSpend += r.Total_Amount || 0;
        });
        const monthlyData = Object.values(map).sort((a,b) => a.month.localeCompare(b.month));
        
        headers = [
          'الشهر', 'عدد العمليات', appMode === 'payroll' ? 'الأساسي' : 'الخاضع', appMode === 'payroll' ? 'البدلات' : 'غير خاضع', appMode === 'payroll' ? 'إجمالي الاستحقاق' : 'الإجمالي قبل الضريبة', appMode === 'payroll' ? 'الاستقطاعات' : 'الضريبة', appMode === 'payroll' ? 'صافي الرواتب' : 'الإجمالي الكلي'
        ];
        contentData = monthlyData.map(m => [
          m.month, m.count, m.totalTaxable.toFixed(2), m.totalNonTaxable.toFixed(2), (m.totalTaxable + m.totalNonTaxable).toFixed(2), m.totalVAT.toFixed(2), m.totalSpend.toFixed(2)
        ]);
        contentData.push(['الإجمالي الكلي', monthlyData.reduce((s,x)=>s+x.count,0), monthlyData.reduce((s,x)=>s+x.totalTaxable,0).toFixed(2), monthlyData.reduce((s,x)=>s+x.totalNonTaxable,0).toFixed(2), monthlyData.reduce((s,x)=>s+(x.totalTaxable+x.totalNonTaxable),0).toFixed(2), monthlyData.reduce((s,x)=>s+x.totalVAT,0).toFixed(2), monthlyData.reduce((s,x)=>s+x.totalSpend,0).toFixed(2)]);
      } else if (!exportAll && activeTab === 'monthly_payroll') {
        const empMap: Record<string, {name:string, totals:Record<string,number>}> = {};
        const monthsSet = new Set<string>();
        filteredRecords.forEach(r => {
          const m = (r.Invoice_Date && r.Invoice_Date !== 'غير محدد') ? r.Invoice_Date.substring(0, 7) : 'غير محدد';
          monthsSet.add(m);
          if (!empMap[r.Entity_Normalized_Name]) empMap[r.Entity_Normalized_Name] = { name: r.Entity_Normalized_Name, totals: {} };
          empMap[r.Entity_Normalized_Name].totals[m] = (empMap[r.Entity_Normalized_Name].totals[m] || 0) + (r.Total_Amount || 0);
        });
        const monthsArr = Array.from(monthsSet).sort();
        headers = ['اسم الموظف', ...monthsArr, 'الإجمالي العام'];
        contentData = Object.values(empMap).map(emp => {
          const row = [emp.name];
          let empTotal = 0;
          monthsArr.forEach(m => {
            const val = emp.totals[m] || 0;
            empTotal += val;
            row.push(val > 0 ? val.toFixed(2) : '-');
          });
          row.push(empTotal.toFixed(2));
          return row;
        });
      } else if (!exportAll && activeTab === 'grouped_purchases') {
        headers = [
           `اسم ${entLabel}`,
           ...(appMode !== 'payroll' ? ['الرقم الضريبي'] : []),
          'العمليات',
          appMode === 'payroll' ? 'الأساسي' : 'الخاضع',
          appMode === 'payroll' ? 'البدلات' : 'غير خاضع',
          appMode === 'payroll' ? 'إجمالي الاستحقاق' : 'قبل الضريبة',
          appMode === 'payroll' ? 'الاستقطاعات' : 'الضريبة',
          appMode === 'payroll' ? 'الصافي' : 'الإجمالي'
        ];

        contentData = filteredEntities.map(s => {
          const row = [
            s.name,
            ...(appMode !== 'payroll' ? [(s as any).taxId || "غير متوفر"] : []),
            s.invoiceCount,
            (s.totalTaxableNet || 0).toFixed(2),
            (s.totalNonTaxableNet || 0).toFixed(2),
            (s.totalNet || 0).toFixed(2),
            (s.totalVAT || 0).toFixed(2),
            (s.totalSpend || 0).toFixed(2)
          ];
          return row;
        });

        contentData.push([
          'الإجمالي الكلي',
          ...(appMode !== 'payroll' ? ['-'] : []),
          filteredEntities.reduce((sum, r) => sum + (r.invoiceCount || 0), 0),
          filteredEntities.reduce((sum, r) => sum + (r.totalTaxableNet || 0), 0).toFixed(2),
          filteredEntities.reduce((sum, r) => sum + (r.totalNonTaxableNet || 0), 0).toFixed(2),
          filteredEntities.reduce((sum, r) => sum + (r.totalNet || 0), 0).toFixed(2),
          filteredEntities.reduce((sum, r) => sum + (r.totalVAT || 0), 0).toFixed(2),
          filteredEntities.reduce((sum, r) => sum + (r.totalSpend || 0), 0).toFixed(2)
        ]);

      } else if (!exportAll && activeTab === 'items_directory') {
        const itemsMap = new Map<string, any>();
        filteredRecords.forEach(r => {
          const name = r.Item_Description?.trim() || 'بدون وصف';
          if (!itemsMap.has(name)) {
            itemsMap.set(name, { name, count: 0, totalSpend: 0, totalTaxable: 0 });
          }
          const item = itemsMap.get(name)!;
          item.count++;
          item.totalSpend += (r.Total_Amount || 0);
          item.totalTaxable += (r.Taxable_Amount || 0);
        });
        const itemsArray = Array.from(itemsMap.values()).sort((a,b) => b.totalSpend - a.totalSpend);

        headers = [
          'اسم الصنف / الخدمة',
          'عدد العمليات',
          'الإجمالي الخاضع',
          'الإجمالي الكلي'
        ];

        contentData = itemsArray.map(item => [
          item.name,
          item.count,
          item.totalTaxable.toFixed(2),
          item.totalSpend.toFixed(2)
        ]);

        contentData.push([
          'الإجمالي الكلي',
          itemsArray.reduce((s, r) => s + r.count, 0),
          itemsArray.reduce((s, r) => s + r.totalTaxable, 0).toFixed(2),
          itemsArray.reduce((s, r) => s + r.totalSpend, 0).toFixed(2)
        ]);

      } else {
        headers = [
          'رقم المستند',
          'التاريخ',
          `اسم ${entLabel}`,
          'البيان',
          appMode === 'payroll' ? 'الشهر' : 'التوجيه',
          appMode === 'payroll' ? 'الأساسي' : 'الخاضع',
          appMode === 'payroll' ? 'البدلات' : 'غير الخاضع',
          appMode === 'payroll' ? 'الصافي' : 'الإجمالي'
        ];

        let sortedRecords = [...filteredRecords];
        if (appMode === 'payroll') sortedRecords.sort((a,b) => (a.Category || '').localeCompare(b.Category || ''));

        contentData = sortedRecords.map(r => [
          r.Invoice_Number || '-',
          r.Invoice_Date || '-',
          r.Entity_Normalized_Name || '-',
          r.Item_Description || '-',
          r.Category || '-',
          (r.Taxable_Amount || 0).toFixed(2),
          (r.NonTaxable_Amount || 0).toFixed(2),
          (r.Total_Amount || 0).toFixed(2)
        ]);

        contentData.push([
          'الإجمالي الكلي',
          '-',
          '-',
          '-',
          '-',
          sortedRecords.reduce((s, r) => s + (r.Taxable_Amount || 0), 0).toFixed(2),
          sortedRecords.reduce((s, r) => s + (r.NonTaxable_Amount || 0), 0).toFixed(2),
          sortedRecords.reduce((s, r) => s + (r.Total_Amount || 0), 0).toFixed(2)
        ]);
      }

      await exportReportPDF(
        title,
        contentData,
        headers,
        `تقرير_${actLabel}_Sweet_Atelier_${new Date().toISOString().split('T')[0]}.pdf`
      );
    } catch (err) {
      console.error("PDF Export Error:", err);
    } finally {
      setStatus('ready');
    }
  };

  const handleNavigateToTabWithAnchor = (tab: string, anchor?: string, search?: string, targetMode?: string) => {
    if (targetMode) {
      setAppMode(targetMode as any);
    }
    setActiveTab(tab);
    if (search) {
      setSearchQuery(search);
    }
    if (anchor) {
      setTimeout(() => {
        const element = document.getElementById(`category-${anchor.replace(/\s+/g, '-')}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          element.classList.add('ring-4', 'ring-indigo-500', 'ring-opacity-50');
          setTimeout(() => element.classList.remove('ring-4', 'ring-indigo-500', 'ring-opacity-50'), 2000);
        }
      }, 500);
    }
  };

  if (loading || isBootstrapping) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        {isBootstrapping && <p className="text-slate-500 font-medium animate-pulse">جاري تهيئة الصلاحيات...</p>}
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (user && !profile) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">مشكلة في الصلاحيات</h2>
          <p className="text-slate-600 mb-3">
            تعذر جلب الصلاحيات الخاصة بك أو أن حسابك غير مصرح له بالدخول. إذا كنت مدير الحساب، يمكنك محاولة إصلاح الصلاحيات.
          </p>
          {authError && (
             <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200 mb-6 font-mono text-left" dir="ltr">
               {authError}
             </div>
          )}
          <button 
            onClick={async () => {
              try {
                const token = await user.getIdToken();
                const res = await fetch('/api/erp/admin/fix-role', {
                   method: 'POST',
                   headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                   // Force a hard reload so AuthProvider re-syncs
                   window.location.reload();
                } else {
                   const err = await res.json();
                   alert("Failed to fix role: " + err.error);
                }
              } catch (e) {
                alert("Error fixing role.");
              }
            }}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md"
          >
            إعداد / إصلاح صلاحيات المدير المفقودة
          </button>
          <button
            onClick={() => logout()}
            className="w-full mt-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 px-4 rounded-xl transition-all"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  // --- PROOF FOR FRONTEND FILTERING ---
  console.log(`[PROOF] ACTIVE MODULE: ${appMode}`);
  console.log(`[PROOF] BASE FILTERED DATA LENGTH: ${baseFilteredRecords.length}`);
  console.log(`[PROOF] RAW CHART DATA LENGTH: ${chartDataRaw.length}`);
  if (baseFilteredRecords.length > 0) {
    console.log(`[PROOF] SAMPLE ROW (fileId: ${baseFilteredRecords[0].fileId}):`, baseFilteredRecords[0]);
  }
  // ------------------------------------

  return (
    <div dir="rtl" className="h-screen bg-slate-50 font-sans text-slate-800 flex flex-col md:flex-row overflow-hidden">
      {/* SIDEBAR */}
      <aside className="md:w-64 w-full bg-slate-900 text-slate-300 flex flex-col shrink-0 overflow-y-auto border-l border-slate-800 print-hidden">
        <div className="p-6 flex items-center space-x-3 space-x-reverse border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-2 rounded-xl shadow-lg shadow-amber-500/20 flex-shrink-0">
            {settings?.logo || AppConfig.logo ? (
              <img src={settings?.logo || AppConfig.logo} alt="Logo" className="w-6 h-6 object-contain" />
            ) : (
              <Sparkles className="w-6 h-6 text-slate-900" strokeWidth={2} />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-serif text-white tracking-tight font-bold">{AppConfig.appName}</span>
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">{AppConfig.appSubtitle}</span>
            {settings?.companyName && (
              <span className="text-[10px] text-amber-200/80 font-medium tracking-widest uppercase mt-0.5">{settings.companyName}</span>
            )}
          </div>
        </div>
        
        <div className="flex-1 pb-6">
            {(profile?.role === 'admin' || profile?.permissions?.includes('expenses')) && (
              <>
                <div className="px-5 py-4 text-base font-black text-indigo-300 mt-2 flex items-center bg-slate-800/50 border-y border-slate-700/60 shadow-inner">
                    <ShoppingCart className="w-6 h-6 ml-3 text-indigo-400" /> المصروفات والموردين
                </div>
                <div className="px-3 mt-2">
                    {profile?.role === 'admin' && (
                      <>
                        <NavItem mode="expenses" tab="upload" icon={UploadIcon} label="رفع ملف المشتريات" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                        <NavItem mode="expenses" tab="raw_data" icon={Database} label="مستكشف البيانات الخام" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                      </>
                    )}
                    <NavItem mode="expenses" tab="dashboard" icon={BarChart3} label="الاحصائيات والتحليل المالي" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="expenses" tab="categories_summary" icon={PieChartIcon} label="ملخص المصروفات" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="expenses" tab="monthly_summary" icon={CalendarIcon} label="الملخص الشهري" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="expenses" tab="yearly_comparison" icon={CalendarIcon} label="مقارنة السنوات" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="expenses" tab="grouped_purchases" icon={Layers} label="سجل الموردين" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="expenses" tab="items_directory" icon={Box} label="سجل المشتريات (الأصناف)" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="expenses" tab="statement_of_account" icon={FileText} label="كشف حساب الموردين" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="expenses" tab="audit" icon={ShieldAlert} label="التناقضات والأخطاء" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} badge={appMode==='expenses' ? totalAnomaliesCount : 0} />
                </div>
              </>
            )}

            {(profile?.role === 'admin' || profile?.permissions?.includes('revenues')) && (
              <>
                <div className="px-5 py-4 text-base font-black text-emerald-300 mt-4 flex items-center bg-slate-800/50 border-y border-slate-700/60 shadow-inner">
                    <Wallet className="w-6 h-6 ml-3 text-emerald-400" /> الإيرادات والعملاء
                </div>
                <div className="px-3 mt-2">
                    {profile?.role === 'admin' && (
                      <>
                        <NavItem mode="revenues" tab="upload" icon={UploadIcon} label="رفع ملف المبيعات" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                        <NavItem mode="revenues" tab="raw_data" icon={Database} label="مستكشف البيانات الخام" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                      </>
                    )}
                    <NavItem mode="revenues" tab="dashboard" icon={BarChart3} label="الاحصائيات والتحليل المالي" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    {(profile?.role === 'admin' || profile?.permissions?.includes('smart_invoice')) && (
                      <>
                        <NavItem mode="revenues" tab="smart_invoice" icon={FileText} label="مولد الفاتورة الذكي" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                        <NavItem mode="revenues" tab="quotations" icon={FileText} label="عروض الأسعار" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                      </>
                    )}
                    <NavItem mode="revenues" tab="categories_summary" icon={PieChartIcon} label="ملخص الإيرادات" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="revenues" tab="monthly_summary" icon={CalendarIcon} label="الملخص الشهري" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="revenues" tab="yearly_comparison" icon={CalendarIcon} label="مقارنة السنوات" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="revenues" tab="grouped_purchases" icon={Layers} label="سجل العملاء" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="revenues" tab="items_directory" icon={Box} label="سجل الخدمات / الأصناف" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="revenues" tab="statement_of_account" icon={FileText} label="كشف حساب العملاء" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="revenues" tab="audit" icon={ShieldAlert} label="التناقضات والأخطاء" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} badge={appMode==='revenues' ? totalAnomaliesCount : 0} />
                </div>
              </>
            )}

            {(profile?.role === 'admin' || profile?.permissions?.includes('payroll')) && (
              <>
                <div className="px-5 py-4 text-base font-black text-amber-300 mt-4 flex items-center bg-slate-800/50 border-y border-slate-700/60 shadow-inner">
                    <Briefcase className="w-6 h-6 ml-3 text-amber-400" /> الرواتب والأجور
                </div>
                <div className="px-3 mt-2">
                    {profile?.role === 'admin' && (
                      <>
                        <NavItem mode="payroll" tab="upload" icon={UploadIcon} label="رفع مسير الرواتب" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                        <NavItem mode="payroll" tab="raw_data" icon={Database} label="مستكشف البيانات الخام" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                      </>
                    )}
                    <NavItem mode="payroll" tab="dashboard" icon={BarChart3} label="الاحصائيات والتحليل المالي" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="payroll" tab="categories_summary" icon={PieChartIcon} label="ملخص الرواتب" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="payroll" tab="monthly_summary" icon={CalendarIcon} label="الملخص الشهري" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="payroll" tab="yearly_comparison" icon={CalendarIcon} label="مقارنة السنوات" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="payroll" tab="grouped_purchases" icon={Layers} label="سجل الموظفين" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="payroll" tab="monthly_payroll" icon={FileText} label="سجل الرواتب الشهري" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="payroll" tab="payroll_allocations" icon={Calculator} label="مخصصات ومصاريف الرواتب" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="payroll" tab="audit" icon={ShieldAlert} label="التناقضات والأخطاء" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} badge={appMode==='payroll' ? totalAnomaliesCount : 0} />
                </div>
              </>
            )}

            {(profile?.role === 'admin' || profile?.permissions?.includes('banks')) && (
              <>
                <div className="px-5 py-4 text-base font-black text-blue-300 mt-4 flex items-center bg-slate-800/50 border-y border-slate-700/60 shadow-inner">
                    <Activity className="w-6 h-6 ml-3 text-blue-400" /> البنوك وحركة الأموال
                </div>
                <div className="px-3 mt-2">
                    {profile?.role === 'admin' && (
                      <>
                        <NavItem mode="banks" tab="upload" icon={UploadIcon} label="رفع كشوف الحسابات" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                        <NavItem mode="banks" tab="raw_data" icon={Database} label="مستكشف البيانات الخام" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                      </>
                    )}
                    <NavItem mode="banks" tab="dashboard" icon={BarChart3} label="تحليل التدفقات النقدية" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="banks" tab="categories_summary" icon={PieChartIcon} label="ملخص البنوك" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="banks" tab="monthly_summary" icon={CalendarIcon} label="الملخص الشهري" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="banks" tab="yearly_comparison" icon={CalendarIcon} label="مقارنة السنوات" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="banks" tab="grouped_purchases" icon={Layers} label="سجل الحسابات" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="banks" tab="audit" icon={ShieldAlert} label="التناقضات والأخطاء" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} badge={appMode==='banks' ? totalAnomaliesCount : 0} />
                </div>
              </>
            )}

            {(profile?.role === 'admin' || profile?.permissions?.includes('reports')) && (
              <>
                <div className="px-5 py-4 text-base font-black text-rose-300 mt-4 flex items-center bg-slate-800/50 border-y border-slate-700/60 shadow-inner">
                    <BookOpen className="w-6 h-6 ml-3 text-rose-400" /> التقارير الختامية
                </div>
                <div className="px-3 mt-2">
                    <NavItem mode="reports" tab="owners_summary" icon={Users} label="لوحة الأداء المالي" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="reports" tab="visual_dashboard" icon={PieChartIcon} label="التحليل الرسومي التفاعلي" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="reports" tab="general_ledger" icon={FileText} label="دفتر الأستاذ العام" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="reports" tab="trial_balance" icon={Scale} label="ميزان المراجعة" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="reports" tab="income_statement" icon={FileText} label="قائمة الدخل (P&L)" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="reports" tab="balance_sheet" icon={Scale} label="قائمة المركز المالي" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="reports" tab="cash_flow" icon={Coins} label="قائمة التدفقات النقدية" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="reports" tab="tax_declaration" icon={FileText} label="الإقرار الضريبي" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                </div>
              </>
            )}
            
            {profile?.role === 'admin' && (
              <>
                <div className="px-5 py-4 text-base font-black text-slate-300 mt-4 flex items-center bg-slate-800/50 border-y border-slate-700/60 shadow-inner">
                    <SettingsIcon className="w-6 h-6 ml-3 text-slate-400" /> إدارة النظام
                </div>
                <div className="px-3 mt-2">
                    <NavItem mode="reports" tab="alerts" icon={AlertTriangle} label="مركز التنبيهات والرقابة" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} badge={totalAnomaliesCount} />
                    <NavItem mode="reports" tab="audit_log" icon={Search} label="سجل التتبع والتدقيق" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="users" tab="user_management" icon={Users} label="إدارة المستخدمين" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                    <NavItem mode="reports" tab="settings" icon={SettingsIcon} label="إعدادات النظام" currentMode={appMode} currentTab={activeTab} onClick={handleNavClick} />
                </div>
              </>
            )}
        </div>

        <div className="p-4 border-t border-slate-800 mt-auto">
          <div className="flex items-center justify-between bg-slate-800/50 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold shrink-0">
                {user?.email?.[0]?.toUpperCase()}
              </div>
              <div className="overflow-hidden text-right">
                <p className="text-sm font-bold text-white truncate" dir="ltr">{user?.email}</p>
                <p className="text-[10px] text-slate-400">{profile?.role === 'admin' ? 'مدير النظام' : 'مشاهد'}</p>
              </div>
            </div>
            <button onClick={() => logout()} className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors" title="تسجيل الخروج">
              <LogOut className="w-5 h-5"/>
            </button>
          </div>
          <div className="flex flex-col items-center justify-center group cursor-default mt-4 mb-2 text-center" dir="ltr">
            <p className="text-[9px] text-slate-400 mb-3 max-w-[190px] leading-relaxed italic font-medium">
              "Engineered by a financial expert to solve real-world money management challenges."
            </p>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-[1px] w-6 bg-gradient-to-r from-transparent to-indigo-400/60"></div>
              <span className="text-[9px] uppercase tracking-[0.25em] text-indigo-200/90 font-bold">DEVELOPED & CREATED BY</span>
              <div className="h-[1px] w-6 bg-gradient-to-l from-transparent to-indigo-400/60"></div>
            </div>
            <span className="text-[15px] font-serif font-black tracking-widest text-white drop-shadow-md group-hover:text-amber-400 transition-colors duration-300">
               Hany Mohamed
            </span>
          </div>
        </div>
      </aside>
      
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex flex-col xl:flex-row items-center justify-between shadow-sm gap-4 shrink-0 z-10 print:hidden">
            <div className="w-full xl:w-auto">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-extrabold text-slate-800 flex items-center">
                  {activeTab === 'dashboard' && 'الاحصائيات والتحليل المالي'}
                  {activeTab === 'upload' && `إدارة ملفات ${actLabel}`}
                  {activeTab === 'raw_data' && 'مستكشف البيانات الخام'}
                  {activeTab === 'audit_log' && 'سجل الإجراءات (النشاط)'}
                  {activeTab === 'categories_summary' && `ملخص تصنيفات ${actLabel}`}
                  {activeTab === 'grouped_purchases' && `سجل ${actLabel} المجمع`}
                  {activeTab === 'statement_of_account' && `كشف حساب ${entLabel}`}
                  {activeTab === 'monthly_payroll' && 'سجل رواتب الموظفين الشهري'}
                  {activeTab === 'audit' && 'التدقيق واكتشاف التناقضات'}
                  {activeTab === 'alerts' && 'سجل التنبيهات والملاحظات التفصيلي'}
                  {activeTab === 'income_statement' && 'قائمة الدخل الاحترافية (P&L)'}
                  {activeTab === 'balance_sheet' && 'قائمة المركز المالي التقديرية'}
                  {activeTab === 'cash_flow' && 'قائمة التدفقات النقدية التقديرية'}
                  {activeTab === 'owners_summary' && 'لوحة الأداء المالي'}
                  {activeTab === 'visual_dashboard' && 'التحليل الرسومي التفاعلي'}
                  {activeTab === 'settings' && 'إعدادات النظام'}
                  {activeTab === 'user_management' && 'إدارة المستخدمين'}
                  {activeTab === 'smart_invoice' && 'إصدار فاتورة ذكية'}
                  {activeTab === 'quotations' && 'إدارة عروض الأسعار'}
                  {activeTab === 'welcome' && 'الرئيسية'}
                </h2>
                {(dateFilter.month || dateFilter.year || dateFilter.start || searchQuery) && (
                  <button 
                    onClick={resetFilter}
                    className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-100 hover:bg-rose-100 transition-all text-xs font-black shadow-sm"
                  >
                    <X className="w-3.5 h-3.5" /> إلغاء الفلترة
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-500 font-medium mt-1.5">
                {(!['income_statement', 'owners_summary', 'visual_dashboard', 'yearly_comparison', 'balance_sheet', 'cash_flow', 'alerts', 'settings', 'user_management', 'smart_invoice', 'quotations', 'welcome'].includes(activeTab)) ? (
                  <>تم معالجة <strong className="text-slate-700">{filteredRecords.length.toLocaleString()}</strong> عملية لـ <strong className="text-slate-700">{filteredEntities.length}</strong> {entLabel} في هذه الفترة.</>
                ) : activeTab === 'income_statement' ? (
                  <>تدمج هذه القائمة بين <strong className="text-emerald-600">المبيعات</strong> و <strong className="text-indigo-600">المشتريات</strong> لاستخراج صافي الربح التشغيلي وفقاً للمعايير المحاسبية.</>
                ) : activeTab === 'balance_sheet' ? (
                  <>عرض تقديري للأصول والالتزامات وحقوق الملكية بناءً على البيانات المتوفرة في النظام.</>
                ) : activeTab === 'cash_flow' ? (
                  <>تحليل حركة السيولة النقدية الداخلة والخارجة من النشاط خلال الفترة المحددة.</>
                ) : activeTab === 'alerts' ? (
                  <>عرض كافة التنبيهات والملاحظات المكتشفة في البيانات المالية بشكل مستقل للمسؤولين.</>
                ) : activeTab === 'owners_summary' ? (
                  <>ملخص مالي مباشر ومصمم خصيصاً للملاك ومتخذي القرار لعرض مؤشرات الأداء الحيوية للشركة.</>
                ) : activeTab === 'yearly_comparison' ? (
                  <>مقارنة الأداء المالي بين السنوات المختلفة لتحديد معدلات النمو والانحدار.</>
                ) : activeTab === 'settings' ? (
                  <>إعدادات النظام والاشتراكات والمستخدمين.</>
                ) : activeTab === 'user_management' ? (
                  <>إدارة صلاحيات المستخدمين والوصول إلى النظام.</>
                ) : activeTab === 'smart_invoice' ? (
                  <>إصدار فواتير ذكية متوافقة مع متطلبات هيئة الزكاة والضريبة والجمارك.</>
                ) : activeTab === 'quotations' ? (
                  <>إدارة وتصدير عروض الأسعار للعملاء بطريقة احترافية.</>
                ) : activeTab === 'welcome' ? (
                  <>نظام محاسبي متكامل لتحليل وتوجيه بياناتك المالية بسهولة.</>
                ) : (
                  <>مؤشرات ورسوم بيانية تفاعلية متقدمة لتحليل مسار الإيرادات والتكاليف وتحديد مصادر الربح بدقة.</>
                )}
              </p>
            </div>
            
              <div className="flex items-center flex-wrap justify-start xl:justify-end gap-3 w-full xl:w-auto">
                {appMode !== 'reports' && availableFiles[appMode]?.length > 0 && (
                  <div className="flex items-center bg-blue-50 rounded-lg px-3 py-2 border border-blue-200 shadow-sm min-w-[200px]">
                     <FileSpreadsheet className={`w-4 h-4 ml-2 ${appMode === 'expenses' ? 'text-indigo-600' : (appMode === 'revenues' ? 'text-emerald-600' : 'text-blue-600')}`} />
                     <select 
                       value={activeFileId[appMode] || ''} 
                       onChange={e => setActiveFileId(prev => ({ ...prev, [appMode]: e.target.value }))} 
                       className="bg-transparent outline-none cursor-pointer text-sm text-blue-900 font-bold w-full truncate"
                       title="اختر الملف"
                     >
                       <option value="" disabled>اختر الملف للتحليل...</option>
                       <option value="ALL" className="font-bold text-indigo-700 bg-indigo-50">✦ جميع الملفات (مجمعة)</option>
                       {availableFiles[appMode].map((f, idx) => (
                         <option key={`${f.id}-${idx}`} value={f.id}>{f.name}</option>
                       ))}
                     </select>
                  </div>
                )}

                <div className={`flex items-center bg-white rounded-lg px-3 py-2 border shadow-sm transition-colors ${dateFilter.year ? 'border-amber-400' : 'border-slate-300'} ${activeTab === 'yearly_comparison' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                   <CalendarIcon className="w-4 h-4 ml-2 text-slate-500" />
                   <select 
                     value={dateFilter.year || ''} 
                     onChange={e => setDateFilter({ year: e.target.value, month: '', start: '', end: '' })} 
                     className="bg-transparent outline-none cursor-pointer text-sm text-slate-700 font-bold disabled:cursor-not-allowed"
                     disabled={activeTab === 'yearly_comparison'}
                   >
                     <option value="">كل السنوات</option>
                     {Array.from({length: 10}, (_, i) => new Date().getFullYear() - i).map(year => (
                       <option key={year} value={year}>{year}</option>
                     ))}
                   </select>
                </div>

                <div className={`flex items-center bg-white rounded-lg px-3 py-2 border shadow-sm transition-colors ${dateFilter.month ? 'border-amber-400' : 'border-slate-300'}`}>
                   <CalendarIcon className="w-4 h-4 ml-2 text-slate-500" />
                   <input 
                     type="month" 
                     value={dateFilter.month} 
                     onChange={e => setDateFilter({ month: e.target.value, year: '', start: '', end: '', sourceMode: 'reports' })} 
                     className="bg-transparent outline-none cursor-pointer text-sm text-slate-700 font-bold" 
                   />
                </div>

                <div className={`flex items-center bg-white rounded-lg px-3 py-2 border shadow-sm transition-colors ${(dateFilter.start || dateFilter.end) ? 'border-amber-400' : 'border-slate-300'}`} title="تصفية بفترة مخصصة">
                   <div className="flex items-center space-x-1 space-x-reverse text-sm text-slate-700 font-medium">
                       <input type="date" value={dateFilter.start || ''} onChange={e=>setDateFilter(p => ({ ...p, start: e.target.value, month: '', year: '', sourceMode: 'reports' }))} className="bg-transparent outline-none cursor-pointer" />
                       <span className="text-slate-300 mx-1">|</span>
                       <input type="date" value={dateFilter.end || ''} onChange={e=>setDateFilter(p => ({ ...p, end: e.target.value, month: '', year: '', sourceMode: 'reports' }))} className="bg-transparent outline-none cursor-pointer" />
                   </div>
                </div>

                <div className="relative">
                  <Search className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 transform -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="بحث شامل..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10 pl-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 xl:w-56 bg-white shadow-sm"
                  />
                </div>

                <div className="relative">
                  <button 
                    onClick={() => setExportMenuOpen(!exportMenuOpen)}
                    className="flex items-center px-4 py-2 text-white rounded-lg font-bold shadow-md transition-colors text-sm bg-slate-800 hover:bg-slate-700"
                  >
                    <Download className="w-4 h-4 ml-2" /> تصدير
                  </button>
                  
                  {exportMenuOpen && (
                    <div className="absolute left-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
                      <div className="bg-slate-50 px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right border-b border-slate-100">
                        لبيانات الصفحة الحالية
                      </div>
                      <button onClick={() => exportToExcel(false)} className="w-full text-right px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 border-b border-slate-100 flex items-center transition-colors">
                         <FileSpreadsheet className="w-4 h-4 ml-2 text-emerald-600" /> Excel (للصفحة الحالية)
                      </button>
                      <button onClick={() => handleExportPDF(false)} className="w-full text-right px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center transition-colors border-b border-slate-100">
                         <FileText className="w-4 h-4 ml-2 text-rose-600" /> PDF (للصفحة الحالية)
                      </button>
                      
                      <div className="bg-slate-50 px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right border-b border-slate-100">
                        لكامل القسم (شامل)
                      </div>
                      <button onClick={() => exportToExcel(true)} className="w-full text-right px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 border-b border-slate-100 flex items-center transition-colors">
                         <FileSpreadsheet className="w-4 h-4 ml-2 text-emerald-600" /> Excel لكامل السجلات
                      </button>
                      <button onClick={() => handleExportPDF(true)} className="w-full text-right px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center transition-colors">
                         <FileText className="w-4 h-4 ml-2 text-rose-600" /> PDF لكامل السجلات
                      </button>
                    </div>
                  )}
                </div>
              </div>
        </header>

        <div className="flex-1 overflow-auto bg-slate-50/50 p-4" ref={scrollContainerRef}>
          {activeTab === 'upload' && appMode !== 'users' && profile?.role === 'admin' && (
            <div className="flex-1 overflow-y-auto w-full">
              <FileManagement 
                appMode={appMode as 'expenses' | 'revenues' | 'payroll' | 'banks'} 
                onUploadSuccess={async () => {
                  const files = await fetchFileList();
                  if (files && files.length > 0) {
                    if (!activeFileId[appMode] || (activeFileId[appMode] !== 'ALL' && !files.find((f: any) => f.id === activeFileId[appMode]))) {
                        setActiveFileId(prev => ({ ...prev, [appMode]: files[0].id }));
                    } else if (activeFileId[appMode] === 'ALL' || activeFileId[appMode]) {
                        // Keep current if ALL or if exists
                        await fetchDataForMode(appMode as any, activeFileId[appMode]);
                    }
                  }
                  await fetchAllData();
                  setActiveTab('dashboard');
                }} 
                onDeleteSuccess={async (deletedIds) => {
                  const files = await fetchFileList();
                  if (files && files.length > 0) {
                    const deletedArray = Array.isArray(deletedIds) ? deletedIds : [deletedIds];
                    if (deletedArray.includes(activeFileId[appMode]) || (!files.find((f: any) => f.id === activeFileId[appMode]) && activeFileId[appMode] !== 'ALL')) {
                      setActiveFileId(prev => ({ ...prev, [appMode]: files[0].id }));
                    } else {
                      await fetchDataForMode(appMode as any, activeFileId[appMode]);
                    }
                  } else {
                    setActiveFileId(prev => ({ ...prev, [appMode]: '' }));
                    const emptyData = { records: [], entities: [], schema: null };
                    if (appMode === 'expenses') setExpensesData(emptyData);
                    else if (appMode === 'revenues') setRevenuesData(emptyData);
                    else if (appMode === 'payroll') setPayrollData(emptyData);
                    else setBanksData(emptyData);
                  }
                  await fetchAllData();
                }}
              />
            </div>
          )}

          {appMode === 'users' && activeTab === 'user_management' && (
            <div className="flex-1 overflow-y-auto w-full">
              <UserManagement />
            </div>
          )}

          {activeTab === 'statement_of_account' && (
            <div className="overflow-x-auto">
              <StatementOfAccount 
                appMode={appMode as 'expenses' | 'revenues'} 
                records={appMode === 'expenses' ? plFilteredExpenses : plFilteredRevenues} 
                bankRecords={banksData.records}
                entLabel={entLabel} 
                onDeleteRecord={handleDeleteRecord}
                onInvoiceClick={setSelectedJournalRecord}
              />
            </div>
          )}

          {activeTab === 'yearly_comparison' && (
            <div className="overflow-x-auto">
              <YearlyComparison records={baseFilteredRecords} appMode={appMode as 'expenses' | 'revenues' | 'payroll' | 'banks'} dateFilter={dateFilter} />
            </div>
          )}

          {activeTab === 'dashboard' && (
             <VisualDashboard 
                tenantId={profile?.tenantId}
                appMode={appMode} 
                chartDataRaw={chartDataRaw}
                revPieData={revPieData}
                expPieData={expPieData}
                expBarData={expBarData}
                topEntitiesData={topEntitiesData}
                topSuppliers={topSuppliers}
                topCustomers={topCustomers}
                topEmployees={topEmployees}
                incomeStatement={incomeStatement}
                anomaliesCount={totalAnomaliesCount}
                anomaliesSummary={anomaliesSummary}
                onMonthClick={handleMonthClick}
                onResetFilter={resetFilter}
                dateFilter={{...dateFilter, searchQuery}}
                onNavigateToTab={handleNavigateToTabWithAnchor}
             />
          )}

          {activeTab === 'smart_invoice' && (appMode === 'expenses' || appMode === 'revenues') && (
            <div className="h-[calc(100vh-12rem)]">
              <SmartInvoice 
                suppliers={expensesData.entities} 
                customers={revenuesData.entities}
                initialMode={appMode === 'revenues' ? 'sales' : 'purchases'}
                settings={settings}
              />
            </div>
          )}

          {activeTab === 'quotations' && (
            <div className="h-[calc(100vh-12rem)]">
              <QuotationManager customers={revenuesData.entities} settings={settings} />
            </div>
          )}

          {activeTab === 'categories_summary' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <CategoriesSummary 
                  appMode={appMode as 'expenses' | 'revenues' | 'payroll' | 'banks' | 'reports'}
                  actLabel={actLabel}
                  entLabel={entLabel}
                  categoriesArray={categoriesArray}
                  expandedCategories={expandedCategories}
                  toggleCategoryView={toggleCategoryView}
                  editSubCat={editSubCat}
                  setEditSubCat={setEditSubCat}
                  handleSaveGlobalCategory={handleSaveGlobalCategory}
                  expandedSubCats={expandedSubCats}
                  toggleSubCat={toggleSubCat}
                  onDeleteRecord={handleDeleteRecord}
                  onInvoiceClick={setSelectedJournalRecord}
                />
              </div>
            </div>
          )}

          {activeTab === 'grouped_purchases' && (
            <div className="overflow-x-auto">
              <GroupedPurchases 
                appMode={appMode as 'expenses' | 'revenues' | 'payroll' | 'banks' | 'reports'}
                actLabel={actLabel}
                entLabel={entLabel}
                filteredEntities={filteredEntities}
                filteredRecords={filteredRecords}
                expandedEntities={expandedEntities}
                toggleEntity={toggleEntity}
                expandedSubCats={expandedSubCats}
                toggleSubCat={toggleSubCat}
                editSubCat={editSubCat}
                setEditSubCat={setEditSubCat}
                handleSaveSubCategory={handleSaveSubCategory}
                onNavigateToTab={handleNavigateToTabWithAnchor}
                onDeleteRecord={handleDeleteRecord}
                onInvoiceClick={setSelectedJournalRecord}
              />
            </div>
          )}

          {activeTab === 'items_directory' && (
            <div className="overflow-x-auto p-4">
              <ItemsDirectory
                records={filteredRecords}
                appMode={appMode as 'expenses' | 'revenues' | 'payroll' | 'banks' | 'reports'}
                onInvoiceClick={setSelectedJournalRecord}
              />
            </div>
          )}

          {activeTab === 'monthly_summary' && (
            <MonthlySummary records={filteredRecords} appMode={appMode as 'expenses' | 'revenues' | 'payroll' | 'banks'} />
          )}

          {activeTab === 'monthly_payroll' && (
            <MonthlyPayroll filteredRecords={filteredRecords} />
          )}

          {activeTab === 'payroll_allocations' && (
            <PayrollExpenseAllocation filteredRecords={filteredRecords} />
          )}

          {activeTab === 'audit' && (
            <Audit 
              entLabel={entLabel} 
              filteredRecords={filteredRecords} 
              appMode={appMode as 'expenses' | 'revenues' | 'payroll' | 'banks'} 
              skippedRows={currentData.skippedRows}
              onDeleteRecord={handleDeleteRecord}
            />
          )}

          {activeTab === 'income_statement' && (
            <IncomeStatement 
              incomeStatement={incomeStatement} 
              onNavigateToTab={handleNavigateToTabWithAnchor}
              tenantId={profile?.tenantId}
              allRecords={[...plFilteredRevenues, ...plFilteredExpenses, ...plFilteredPayroll]}
            />
          )}

          {activeTab === 'balance_sheet' && (
            <BalanceSheet 
              data={{
                revenues: incomeStatement.totalRevenue,
                expenses: incomeStatement.totalOPEX + incomeStatement.totalCOGS,
                payroll: incomeStatement.totalPayroll
              }} 
              onNavigateToTab={handleNavigateToTabWithAnchor}
            />
          )}

          {activeTab === 'cash_flow' && (
            <CashFlow 
              data={{
                revenues: incomeStatement.totalRevenue,
                expenses: (incomeStatement.totalOPEX || 0) + (incomeStatement.totalCOGS || 0),
                payroll: incomeStatement.totalPayroll || 0
              }} 
              tenantId={profile?.tenantId}
              allRecords={[
                ...plFilteredRevenues.map(r => ({ ...r, __Type: 'Revenue' })),
                ...plFilteredExpenses.map(r => ({ ...r, __Type: 'Expense' })),
                ...plFilteredPayroll.map(r => ({ ...r, __Type: 'Payroll' }))
              ]}
              onNavigateToTab={handleNavigateToTabWithAnchor}
            />
          )}

          {activeTab === 'tax_declaration' && (
            <TaxDeclaration 
              revenuesRecords={plFilteredRevenues}
              expensesRecords={plFilteredExpenses}
              onNavigateToTab={handleNavigateToTabWithAnchor}
            />
          )}

          {activeTab === 'alerts' && profile?.role === 'admin' && (
            <AlertsReport 
              anomaliesSummary={anomaliesSummary}
              appMode={appMode}
            />
          )}

          {activeTab === 'audit_log' && profile?.role === 'admin' && (
            <GlobalAuditLog appMode={appMode as any} />
          )}

          {activeTab === 'raw_data' && profile?.role === 'admin' && (
            <RawDataInspector appMode={appMode as any} />
          )}

          {activeTab === 'owners_summary' && (
            <OwnersSummary incomeStatement={incomeStatement} />
          )}

          {activeTab === 'trial_balance' && (
            <TrialBalance onNavigateToTab={handleNavigateToTabWithAnchor} />
          )}

          {activeTab === 'general_ledger' && (
            <GeneralLedger />
          )}

          {activeTab === 'visual_dashboard' && (
             <VisualDashboard 
                tenantId={profile?.tenantId}
                appMode={appMode} 
                chartDataRaw={chartDataRaw}
                revPieData={revPieData}
                expPieData={expPieData}
                expBarData={expBarData}
                topEntitiesData={topEntitiesData}
                topSuppliers={topSuppliers}
                topCustomers={topCustomers}
                topEmployees={topEmployees}
                incomeStatement={incomeStatement}
                anomaliesCount={totalAnomaliesCount}
                anomaliesSummary={anomaliesSummary}
                onMonthClick={handleMonthClick}
                onResetFilter={resetFilter}
                dateFilter={{...dateFilter, searchQuery}}
                onNavigateToTab={handleNavigateToTabWithAnchor}
             />
          )}
          
          {activeTab === 'anomalies_report' && profile?.role === 'admin' && (
            <AnomaliesReport 
              expensesAnomalies={expensesAnomalies}
              revenuesAnomalies={revenuesAnomalies}
              payrollAnomalies={payrollAnomalies}
              banksAnomalies={banksAnomalies}
              onNavigateToTab={handleNavigateToTabWithAnchor}
            />
          )}

          {activeTab === 'settings' && profile?.role === 'admin' && (
            <Settings profile={profile} />
          )}

          {activeTab === 'welcome' && <WelcomePage companyName={settings?.companyName} logo={settings?.logo} />}

          {/* Print Only Footer */}
          <div className="hidden print:block mt-12 pt-8 border-t border-slate-200" dir="rtl">
            <div className="flex justify-between text-center">
              <div className="w-1/3">
                <p className="font-bold text-slate-900 mb-8 text-sm">إعداد / المحاسب</p>
                <div className="border-b border-dashed border-slate-400 w-4/5 mx-auto"></div>
              </div>
              <div className="w-1/3">
                <p className="font-bold text-slate-900 mb-8 text-sm">اعتماد / المدير المالي</p>
                <div className="border-b border-dashed border-slate-400 w-4/5 mx-auto"></div>
              </div>
              <div className="w-1/3">
                <p className="font-bold text-slate-900 mb-8 text-sm">المدير العام</p>
                <div className="border-b border-dashed border-slate-400 w-4/5 mx-auto"></div>
              </div>
            </div>
            <p className="text-center text-[10px] text-slate-400 mt-8">تم استخراج هذا التقرير آلياً بواسطة نظام لمحاسبك الذكي</p>
          </div>
        </div>

        {/* Print Only Signature */}
        <div className="hidden print:block mt-12 pt-8 border-t border-slate-200 text-center" dir="ltr">
          <div className="inline-flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-[1px] w-8 bg-slate-300"></div>
              <span className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-semibold">DEVELOPED & CREATED BY</span>
              <div className="h-[1px] w-8 bg-slate-300"></div>
            </div>
            <span className="text-base font-serif font-black text-slate-800 tracking-widest text-[#0000FF]">Hany Mohamed</span>
          </div>
        </div>
      </div>

      {/* OVERLAYS */}
      {(status === 'processing' || status === 'exporting') && (
        <div className="absolute z-50 inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm text-white">
          <div className="w-16 h-16 border-4 border-indigo-400 border-t-white rounded-full animate-spin mb-4"></div>
          <h2 className="text-xl font-bold">{status === 'exporting' ? 'جاري تصدير التقرير...' : 'جاري التدقيق والتوجيه المحاسبي (ERP)...'}</h2>
        </div>
      )}

      <JournalEntryModal 
        isOpen={!!selectedJournalRecord} 
        onClose={() => setSelectedJournalRecord(null)} 
        record={selectedJournalRecord} 
        appMode={appMode as any}
      />
    </div>
  );
}
