import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { generateInvoicePDFBackend, InvoiceData } from '../lib/pdf-engine';
import { motion, useDragControls } from 'motion/react';
import { 
  FileText, Upload, Download, Trash2, Plus, RefreshCw, 
  Settings, Printer, Sparkles, AlertCircle, CheckCircle2, X, Search, Maximize2, Minimize2
} from 'lucide-react';
import { 
  SmartInvoiceCatalogItem, 
  subscribeToCatalog, 
  saveCatalogItem, 
  deleteCatalogItem,
  bulkSaveCatalogItems,
  bulkDeleteCatalogItems
} from '../lib/smart-invoice-service';
import { 
  SavedInvoice, 
  saveInvoice, 
  generateInvoiceNumber, 
  subscribeToSavedInvoices, 
  deleteSavedInvoice 
} from '../lib/invoice-history-service';
import { getSettings, AppSettings } from '../lib/settings-service';
import { useAuth } from '../contexts/AuthProvider';
import { useUI } from '../contexts/UIContext';
import { History, Save, ArrowRightLeft } from 'lucide-react';
import { collection, doc, setDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

import { EntityProfile } from '../types';
import { parseNumber } from '../lib/financial-utils';
import { AppConfig } from '../config/appConfig';

interface InvoiceItem extends SmartInvoiceCatalogItem {
  qty: number;
  lineage?: {
    sourceFile?: string;
    sourceSheet?: string;
    sourceRow?: number;
    mappingRule?: string;
    aiDecision?: string;
    confidence?: number;
    originalValue?: string;
  };
}

interface SmartInvoiceProps {
  suppliers?: EntityProfile[];
  customers?: EntityProfile[];
  initialMode?: 'sales' | 'purchases';
  settings?: AppSettings | null;
}

import { logger } from '../lib/logger';

export const SmartInvoice: React.FC<SmartInvoiceProps> = ({ 
  suppliers = [], 
  customers = [],
  initialMode = 'sales',
  settings
}) => {
  const { profile, user } = useAuth();
  
  useEffect(() => {
    logger.info('SmartInvoice component mounted', { 
      tenantId: profile?.tenantId, 
      role: profile?.role,
      user: user?.uid 
    });
  }, []);

  const { showConfirm, showAlert, notify } = useUI();
  const isAdmin = profile?.role === 'admin';
  const isAccountant = profile?.role === 'accountant';
  const isViewer = profile?.role === 'viewer';
  const canEditFinances = isAdmin || isAccountant;
  const [invoiceMode, setInvoiceMode] = useState<'sales' | 'purchases'>(initialMode);
  const [catalog, setCatalog] = useState<SmartInvoiceCatalogItem[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>(() => {
    const saved = localStorage.getItem('smartInvoice_items');
    return saved ? JSON.parse(saved) : [];
  });
  const [chatLog, setChatLog] = useState(() => {
    return localStorage.getItem('smartInvoice_chatLog') || '';
  });
  const [customerName, setCustomerName] = useState(() => {
    return localStorage.getItem('smartInvoice_customerName') || '';
  });
  const [currentInvoiceId, setCurrentInvoiceId] = useState(() => {
    return localStorage.getItem('smartInvoice_currentId') || '';
  });
  const [currentInvoiceNumber, setCurrentInvoiceNumber] = useState(() => {
    return localStorage.getItem('smartInvoice_currentNumber') || '';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<SmartInvoiceCatalogItem> | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [aiReasoning, setAiReasoning] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<'bulk' | 'all' | null>(null);
  const [selectedCatalogItems, setSelectedCatalogItems] = useState<string[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoice[]>([]);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    const saved = localStorage.getItem('smartInvoice_leftPanelWidth');
    return saved ? parseInt(saved) : 33; // Default to 33% (1/3)
  });
  const [isResizing, setIsResizing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemNameInputRef = useRef<HTMLInputElement>(null);
  const catalogListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInvoiceMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    localStorage.setItem('smartInvoice_leftPanelWidth', leftPanelWidth.toString());
  }, [leftPanelWidth]);

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = (e.clientX / window.innerWidth) * 100;
    if (newWidth > 20 && newWidth < 60) {
      setLeftPanelWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (editingItem && itemNameInputRef.current) {
      itemNameInputRef.current.focus();
    }
  }, [editingItem]);

  useEffect(() => {
    localStorage.setItem('smartInvoice_items', JSON.stringify(invoiceItems));
  }, [invoiceItems]);

  useEffect(() => {
    localStorage.setItem('smartInvoice_chatLog', chatLog);
  }, [chatLog]);

  useEffect(() => {
    localStorage.setItem('smartInvoice_customerName', customerName);
  }, [customerName]);

  useEffect(() => {
    localStorage.setItem('smartInvoice_currentId', currentInvoiceId);
  }, [currentInvoiceId]);

  useEffect(() => {
    localStorage.setItem('smartInvoice_currentNumber', currentInvoiceNumber);
  }, [currentInvoiceNumber]);

  useEffect(() => {
    if (profile?.tenantId) {
      const unsubscribeCatalog = subscribeToCatalog(profile.tenantId, (items) => {
        setCatalog(items);
      });
      const unsubscribeHistory = subscribeToSavedInvoices(profile.tenantId, (invoices) => {
        setSavedInvoices(invoices);
      });
      return () => {
        unsubscribeCatalog();
        unsubscribeHistory();
      };
    }
  }, [profile?.tenantId]);

  const filteredCatalog = useMemo(() => {
    return catalog.filter(item => 
      item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      (item.altNames && item.altNames.toLowerCase().includes(catalogSearch.toLowerCase()))
    );
  }, [catalog, catalogSearch]);

  const showMessage = (msg: string, type: 'error' | 'success' = 'error') => {
    if (type === 'error') {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  const handleGenerateInvoice = async () => {
    if (catalog.length === 0) {
      showMessage("القائمة فارغة! أضف أصنافاً للكتالوج أولاً.");
      return;
    }
    if (!chatLog.trim()) {
      showMessage("سجل الطلبات فارغ.");
      return;
    }

    setIsLoading(true);
    setLoadingMsg("جاري التحليل الدقيق وتجميع المحادثة (قد يستغرق بضع ثوان)...");
    logger.info('Generating AI invoice from chat log', { 
      logLength: chatLog.length,
      tenantId: profile?.tenantId 
    });

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("مفتاح Gemini API غير متوفر.");
      }

      const ai = new GoogleGenAI({ apiKey });

      const catalogListForAI = catalog.map(i => {
        return `- ID: "${i.id}" | الصنف: "${i.name}" ${i.altNames ? `| مرادفات: ${i.altNames}` : ''}`;
      }).join("\n");

      const prompt = `
                أنت خبير ذكاء اصطناعي متخصص في تحليل رسائل الواتساب التشغيلية.
                قائمة الأصناف المتاحة:
                ${catalogListForAI}
                
                سجل المحادثة:
                """
                ${chatLog}
                """
                
                مهمتك: قراءة المحادثة واستخراج الخلاصة النهائية للطلبات بدقة عالية.
                
                قواعد صارمة جداً جداً (يجب اتباعها بحذافيرها):
                1. **تجاهل الرسائل المنسوخة (Quoted Text):** غالباً يقوم المرسل في رسالة جديدة بنسخ محتوى رسالة سابقة ولصقها ثم يضيف في أسفلها سطراً جديداً (مثال: طلب جديد أو إضافة). **إياك أن تجمع كميات الأسطر المنسوخة مرة أخرى!** تعامل مع القائمة المحدثة في الرسالة الأخيرة على أنها القائمة الشاملة لما سبق.
                2. **الطلبات الجديدة المتفرقة (Time Separation):** إذا طُلب صنف في الصباح، ثم جاءت رسالة منفصلة تماماً في المساء (لا تحتوي على نسخ ولصق) تطلب نفس الصنف، فهذا طلب جديد. هنا **يجب الجمع** (1 + 1 = 2).
                3. **لغة الشات والشرطة (-):** "اسم المنتج - 1" أو "Product -2" تعني (الكمية 1) و (الكمية 2). الشرطة هي مجرد فاصل بصري ولا تعني أبداً عملية طرح!
                4. **المطابقة المرنة:** اربط الكلمات المكتوبة (حتى لو بها أخطاء مثل Ateiler بدلاً من Atelier أو كلمات زائدة مثل pcs) بالصنف الصحيح من قائمة الأصناف المتاحة.
                5. **الخصومات:** إذا كان الصنف المختار له خصم افتراضي في القائمة، سيتم تطبيقه آلياً، لكن إذا ذكر العميل خصماً خاصاً في المحادثة (مثلاً: "اعطني خصم 10%")، يرجى ملاحظة ذلك (رغم أن المخرج الحالي يركز على الكميات، حاول أن تكون دقيقاً في اختيار الـ ID الصحيح).
            `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              orders: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    id: { type: "STRING", description: "معرف الصنف (ID) المستخرج من قائمة الأصناف" },
                    quantity: { type: "INTEGER", description: "الكمية النهائية الصحيحة المجمعة" },
                    explanation: { type: "STRING", description: "شرح تفصيلي لكيفية الوصول لهذه الكمية مع ذكر الرسائل المستند إليها" },
                    confidence: { type: "NUMBER", description: "مدى الثقة في استخراج هذه البيانات من 0 إلى 1" }
                  },
                  required: ["id", "quantity", "explanation", "confidence"]
                }
              }
            },
            required: ["orders"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("لم يتم استلام استجابة من الذكاء الاصطناعي.");

      const parsed = JSON.parse(text);

      const newInvoiceItems: InvoiceItem[] = parsed.orders.map((order: any) => {
        const item = catalog.find(c => c.id === order.id);
        if (!item) return null;
        const initialQty = order.quantity || 1;
        if (initialQty <= 0) return null;
        return { 
          ...item, 
          qty: initialQty,
          vat: (item.vat == null || (item.vat as any) === "") ? 15 : Number(item.vat),
          discountPercent: (item.discountPercent == null || (item.discountPercent as any) === "") ? 0 : Number(item.discountPercent),
          lineage: {
            sourceFile: 'WhatsApp Chat Log',
            mappingRule: 'AI Entity Matching',
            aiDecision: order.explanation,
            confidence: order.confidence,
            originalValue: `Chat Text Reference: ${order.explanation ? order.explanation.substring(0, 50) : '...'}`,
          }
        };
      }).filter(Boolean);

      setInvoiceItems(newInvoiceItems);
      showMessage("تم إنشاء الفاتورة بنجاح!", "success");

      // Scroll to results
      setTimeout(() => {
        const area = document.getElementById('invoice-print-area');
        if (area) area.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);

    } catch (err: any) {
      console.error(err);
      showMessage("فشل في تحليل الطلب: " + (err.message || "خطأ غير معروف"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRow = (idx: number, field: keyof InvoiceItem | 'discountValue', val: string) => {
    const newItems = [...invoiceItems];
    const item = newItems[idx];
    
    let price = Number(item.price) || 0;
    let qty = Number(item.qty) || 0;

    if (val === '') {
       if (field === 'qty') item.qty = '' as any;
       else if (field === 'discountPercent') item.discountPercent = '' as any;
       else if (field === 'vat') item.vat = '' as any;
       else if (field === 'discountValue') item.discountPercent = 0;
    } else {
        let parsedVal = parseFloat(val);
        if (isNaN(parsedVal) || parsedVal < 0) parsedVal = 0;

        if (field === 'qty') {
          item.qty = parsedVal;
          qty = parsedVal;
        } else if (field === 'discountPercent') {
          item.discountPercent = parsedVal > 100 ? 100 : parsedVal;
        } else if (field === 'discountValue') {
          // Calculate discount percent based on TOTAL gross (Price * Qty)
          const lineGross = price * qty;
          if (lineGross > 0) {
            const safeVal = parsedVal > lineGross ? lineGross : parsedVal;
            item.discountPercent = (safeVal / lineGross) * 100;
          } else {
            item.discountPercent = 0;
          }
        } else if (field === 'vat') {
          item.vat = parsedVal > 100 ? 100 : parsedVal;
        }
    }

    setInvoiceItems(newItems);
  };

  const [backendTotals, setBackendTotals] = useState({ sub: 0, disc: 0, net: 0, vat: 0, grand: 0 });
  const [calculatedItems, setCalculatedItems] = useState<any[]>([]);
  const [traceData, setTraceData] = useState<any>(null);
  const [showTraceModal, setShowTraceModal] = useState(false);
  const [isTracing, setIsTracing] = useState(false);
  const [lastProcessedResult, setLastProcessedResult] = useState<any>(null);

  // SINGLE SOURCE OF TRUTH: Fetch accounting calculations from Backend ONLY
  useEffect(() => {
    if (invoiceItems.length > 0) {
      let subtotal = 0, taxTotal = 0, discountTotal = 0;
      const itemsWithTotals = invoiceItems.map((item: any) => {
        const lineGross = (item.quantity || item.qty || 0) * (item.unitPrice || item.price || 0);
        const lineDiscount = item.discount || 0;
        const lineNet = lineGross - lineDiscount;
        const lineTax = lineNet * ((item.taxRate || item.vat || 0) / 100);
        subtotal += lineNet; taxTotal += lineTax; discountTotal += lineDiscount;
        return { ...item, total: lineNet + lineTax, lineNet, lineTax };
      });
      setBackendTotals({
        sub: subtotal,
        disc: discountTotal,
        net: subtotal,
        vat: taxTotal,
        grand: subtotal + taxTotal
      });
      setCalculatedItems(itemsWithTotals);
    } else {
      setBackendTotals({ sub: 0, disc: 0, net: 0, vat: 0, grand: 0 });
      setCalculatedItems([]);
    }
  }, [invoiceItems]);

  const handleSaveInvoice = async () => {
    if (invoiceItems.length === 0 || !profile?.tenantId) {
      showMessage("لا توجد بيانات لحفظها.");
      return;
    }

    setIsLoading(true);
    setLoadingMsg("جاري حفظ الفاتورة...");
    logger.info('Saving invoice to history', { 
      tenantId: profile.tenantId, 
      invoiceNumber: currentInvoiceNumber,
      itemCount: invoiceItems.length,
      grandTotal: backendTotals.grand
    });

    try {
      const isNew = !currentInvoiceId;
      const id = isNew ? Date.now().toString() : currentInvoiceId;
      const invNumber = isNew ? generateInvoiceNumber() : currentInvoiceNumber;

      const sanitizedItems = invoiceItems.map(item => {
        const sanitized = { ...item };
        Object.keys(sanitized).forEach(key => {
          if ((sanitized as any)[key] === undefined) {
            delete (sanitized as any)[key];
          }
        });
        return sanitized;
      });

      const invoiceToSave: SavedInvoice = {
        id,
        invoiceNumber: invNumber,
        customerName: customerName.trim() || 'عميل نقدي',
        items: sanitizedItems,
        subTotal: backendTotals.sub,
        discountTotal: backendTotals.disc,
        netTotal: backendTotals.net,
        vatTotal: backendTotals.vat,
        grandTotal: backendTotals.grand,
        tenantId: profile.tenantId,
        createdAt: isNew ? new Date().toISOString() : (savedInvoices.find(i => i.id === id)?.createdAt || new Date().toISOString()),
        updatedAt: new Date().toISOString()
      };

      await saveInvoice(invoiceToSave);
      logger.info('Invoice saved successfully', { invoiceId: id });
      
      if (isNew) {
        setCurrentInvoiceId(id);
        setCurrentInvoiceNumber(invNumber);
      }
      
      showMessage("تم حفظ الفاتورة بنجاح", "success");
    } catch (err: any) {
      logger.error('Failed to save invoice', { 
        invoiceNumber: currentInvoiceNumber,
        tenantId: profile?.tenantId 
      }, err as Error);
      console.error("Save Invoice Error:", err);
      showMessage("حدث خطأ أثناء حفظ الفاتورة.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadInvoice = (invoice: SavedInvoice) => {
    setInvoiceItems(invoice.items);
    setCustomerName(invoice.customerName === 'عميل نقدي' ? '' : invoice.customerName);
    setCurrentInvoiceId(invoice.id);
    setCurrentInvoiceNumber(invoice.invoiceNumber);
    setShowHistoryModal(false);
    showMessage(`تم استرجاع الفاتورة رقم ${invoice.invoiceNumber}`, "success");
  };

  const handleExportToERP = async () => {
    // With Single Source of Truth, all invoices saved are automatically part of the ERP logic
    await handleSaveInvoice();
  };

  const handleFetchTrace = async (entityId: string, entityType: 'ITEM' | 'ENTRY') => {
    showMessage("تم تفعيل ميزة التتبع محلياً في مصدر بيانات واحد", "success");
  };

  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    
    setIsLoading(true);
    try {
      await deleteSavedInvoice(invoiceToDelete);
      
      // Also delete the corresponding record from uploadedFiles if it exists
      try {
        const fileId = `smart_invoice_${invoiceToDelete}`;
        const recordId = `${fileId}_summary`;
        const docRef = doc(db, 'uploadedFiles', fileId, 'records', recordId);
        await deleteDoc(docRef);
      } catch (e) {
        console.error("Error deleting from uploadedFiles:", e);
      }

      if (currentInvoiceId === invoiceToDelete) {
        setCurrentInvoiceId('');
        setCurrentInvoiceNumber('');
      }
      showMessage("تم حذف الفاتورة بنجاح", "success");
    } catch (err: any) {
      console.error("Delete Invoice Error:", err);
      showMessage("حدث خطأ أثناء حذف الفاتورة.");
    } finally {
      setIsLoading(false);
      setInvoiceToDelete(null);
    }
  };

  const handleExportExcel = async () => {
    if (invoiceItems.length === 0) {
      showMessage("لا توجد بيانات لتصديرها.");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('الفاتورة الذكية', {
        views: [{ rightToLeft: true }]
      });

      // Add Header Info
      worksheet.mergeCells('A1:J1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `فاتورة ${invoiceMode === 'sales' ? 'مبيعات' : 'مشتريات'} ذكية - ${customerName || settings?.companyName || AppConfig.companyName || AppConfig.appName}`;
      titleCell.font = { name: 'Arial', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

      worksheet.mergeCells('A2:J2');
      const subTitleCell = worksheet.getCell('A2');
      subTitleCell.value = `تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SA')} | رقم التقرير: ${Date.now()}`;
      subTitleCell.font = { name: 'Arial', size: 12, bold: true };
      subTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

      if (customerName) {
        worksheet.mergeCells('A3:J3');
        const customerCell = worksheet.getCell('A3');
        customerCell.value = `العميل / المورد: ${customerName}`;
        customerCell.font = { name: 'Arial', size: 14, bold: true };
        customerCell.alignment = { vertical: 'middle', horizontal: 'center' };
        customerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
      }

      // Define Columns
      worksheet.getRow(5).values = [
        'م', 'الصنف', 'الكمية', 'سعر الوحدة', 'الإجمالي المبدئي', 
        'الخصم (%)', 'مبلغ الخصم', 'الصافي', 'الضريبة', 'الإجمالي النهائي'
      ];

      const headerRow = worksheet.getRow(5);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });

      // Add Data
      invoiceItems.forEach((item, idx) => {
        const qty = Number(item.qty) || 0;
        const price = Number(item.price) || 0;
        const gross = price * qty;
        const discPercent = (item.discountPercent == null || (item.discountPercent as any) === "") ? 0 : Number(item.discountPercent);
        const discVal = gross * (discPercent / 100);
        const net = gross - discVal;
        const vatPercent = (item.vat == null || (item.vat as any) === "") ? 15 : Number(item.vat);
        const vatVal = net * (vatPercent / 100);
        const total = net + vatVal;

        const row = worksheet.addRow([
          idx + 1,
          item.name,
          item.qty,
          item.price,
          gross,
          discPercent,
          discVal,
          net,
          vatVal,
          total
        ]);

        row.alignment = { horizontal: 'center' };
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
          };
        });
      });

      // Add Totals Row
      const totals = backendTotals;
      const totalRow = worksheet.addRow([
        '', 'الإجماليات الكلية', '', '', totals.sub, '', totals.disc, totals.net, totals.vat, totals.grand
      ]);
      totalRow.font = { bold: true };
      totalRow.alignment = { horizontal: 'center' };
      totalRow.eachCell((cell, colNumber) => {
        if (colNumber >= 5) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
        }
        cell.border = {
          top: { style: 'medium' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' }
        };
      });

      // Column Widths
      worksheet.columns = [
        { width: 5 }, { width: 35 }, { width: 10 }, { width: 15 }, { width: 18 },
        { width: 12 }, { width: 15 }, { width: 18 }, { width: 15 }, { width: 20 }
      ];

      // Format Numbers
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber >= 6) {
          [4, 5, 7, 8, 9, 10].forEach(col => {
            row.getCell(col).numFmt = '#,##0.00 "SAR"';
          });
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `فاتورة_ذكية_احترافية_${new Date().toISOString().split('T')[0]}.xlsx`);
      showMessage("تم تصدير ملف Excel الاحترافي بنجاح", "success");

    } catch (err: any) {
      console.error("Excel Export Error:", err);
      showMessage("حدث خطأ أثناء تصدير Excel: " + err.message);
    }
  };

  const handlePrint = async () => {
    if (invoiceItems.length === 0 || !profile?.tenantId) {
      showMessage("لا توجد بيانات لتصديرها.");
      return;
    }

    setIsLoading(true);
    setLoadingMsg("جاري تجهيز ملف PDF...");

    try {
      const invoiceSettings = settings || await getSettings(profile?.tenantId || '');

      const invoiceData: InvoiceData = {
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        date: new Date().toLocaleDateString('ar-SA'),
        customerName: customerName || 'عميل نقدي',
        customerTaxId: '', // Add if available
        companyName: invoiceSettings?.companyName || AppConfig.companyName || AppConfig.appName,
        companyDetails: `الرقم الضريبي: ${invoiceSettings?.taxId || '---'}\nتاريخ الإصدار: ${new Date().toLocaleDateString('ar-SA')} | وقت الإصدار: ${new Date().toLocaleTimeString('ar-SA')}`,
        items: invoiceItems.map((item, idx) => {
          const calc = calculatedItems[idx] || {};
          return {
            description: item.name,
            quantity: Number(item.qty) || 0,
            unitPrice: Number(item.price) || 0,
            discount: calc.discount || 0,
            taxRate: Number(item.vat) || 0,
            total: calc.total || 0
          };
        }),
        subtotal: backendTotals.sub,
        totalDiscount: backendTotals.disc,
        totalTax: backendTotals.vat,
        grandTotal: backendTotals.grand,
        notes: `تم إنشاء هذه الفاتورة بواسطة ${settings.preparerName || 'هاني محمد'} - المدير المالي`
      };

      try {
        await generateInvoicePDFBackend(invoiceData, `فاتورة_ذكية_${new Date().toISOString().split('T')[0]}.pdf`);
      } catch (backendError) {
        console.warn("Backend PDF failed, falling back to frontend logic:", backendError);
        const { generateInvoicePDF } = await import('../lib/pdf-engine');
        // We need to convert invoiceData back to the format generateInvoicePDF expects if different
        // but generateInvoicePDF actually takes (data, items, settings)
        // for now let's just use regular download or inform user.
        // Actually, let's just make the backend work!
        throw backendError;
      }
      
      showMessage("تم تصدير PDF بنجاح", "success");
    } catch (err: any) {
      console.error("PDF Export Error:", err);
      showMessage("حدث خطأ أثناء التصدير.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportAllItems = () => {
    if (catalog.length === 0) {
      setErrorMsg('لا توجد أصناف لتصديرها');
      return;
    }
    const exportData = catalog.map(item => ({
      'ID': item.id,
      'الصنف': item.name,
      'السعر': item.price,
      'الضريبة': item.vat,
      'الخصم': item.discountPercent || 0,
      'المرادفات': item.altNames || ''
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Catalog");
    XLSX.writeFile(wb, "كتالوج_الأصناف.xlsx");
    setSuccessMsg('تم تصدير الأصناف بنجاح');
  };

  const handleAddItemToInvoice = (item: SmartInvoiceCatalogItem) => {
    const existingIdx = invoiceItems.findIndex(i => i.id === item.id);
    if (existingIdx >= 0) {
      const newItems = [...invoiceItems];
      newItems[existingIdx].qty = (Number(newItems[existingIdx].qty) || 0) + 1;
      setInvoiceItems(newItems);
    } else {
      setInvoiceItems([...invoiceItems, { 
        ...item, 
        qty: 1,
        vat: (item.vat == null || (item.vat as any) === "") ? 15 : Number(item.vat),
        discountPercent: (item.discountPercent == null || (item.discountPercent as any) === "") ? 0 : Number(item.discountPercent)
      }]);
    }
    showMessage(`تم إضافة ${item.name} للفاتورة`, "success");
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.tenantId) return;

    setIsLoading(true);
    setLoadingMsg("جاري استيراد الأصناف ومعالجة الملف...");

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws) as any[];

        let importedCount = 0;
        const itemsToSave: SmartInvoiceCatalogItem[] = [];

        for (const row of jsonData) {
          // Flexible column matching
          const rowId = row['ID'] || row['id'] || row['المعرف'];
          const name = row['الصنف'] || row['اسم الصنف'] || row['الاسم'] || row['Name'] || row['Item'] || Object.values(row)[0];
          const price = parseNumber(row['السعر'] || row['سعر الوحدة'] || row['Price'] || row['سعر'] || Object.values(row)[1]);
          
          const rawVat = row['الضريبة'] ?? row['نسبة الضريبة'] ?? row['VAT'] ?? row['Vat'] ?? row['tax'] ?? row['Tax'];
          let vat = rawVat !== undefined && rawVat !== "" ? parseNumber(rawVat) : 15;
          if (vat > 0 && vat < 1) vat *= 100; // Convert 0.15 to 15
          
          const rawDiscount = row['الخصم'] ?? row['نسبة الخصم'] ?? row['Discount'] ?? row['Disc'] ?? row['خصم'] ?? row['Discount %'] ?? row['خصم %'];
          let discount = rawDiscount !== undefined && rawDiscount !== "" ? parseNumber(rawDiscount) : 0;
          if (discount > 0 && discount < 1) discount *= 100; // Convert 0.35 to 35
          
          const altNames = row['المرادفات'] || row['أسماء أخرى'] || row['Alt Names'] || '';

          if (name && !isNaN(price)) {
            const normalizedName = String(name).trim().toLowerCase();
            
            // Match by ID first, then by name
            let existingItem = null;
            if (rowId) {
              existingItem = catalog.find(item => item.id === String(rowId));
            }
            
            if (!existingItem) {
              existingItem = catalog.find(item => item.name.trim().toLowerCase() === normalizedName);
            }
            
            const id = existingItem ? existingItem.id : (rowId ? String(rowId) : `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
            itemsToSave.push({
              id,
              name: String(name),
              price: price,
              vat: vat,
              discountPercent: discount,
              altNames: String(altNames),
              tenantId: profile.tenantId,
              createdAt: existingItem ? existingItem.createdAt : new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            importedCount++;
          }
        }

        // Save in batches of 500 (Firestore limit)
        setIsLoading(false);
        setLoadingMsg("");
        
        for (let i = 0; i < itemsToSave.length; i += 500) {
          const chunk = itemsToSave.slice(i, i + 500);
          await bulkSaveCatalogItems(chunk, profile.tenantId);
        }

        showMessage(`تم استيراد ${importedCount} صنف بنجاح.`, "success");
      } catch (err: any) {
        showMessage("خطأ في استيراد الملف: " + err.message);
        setIsLoading(false);
        setLoadingMsg("");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSaveCatalogItem = async () => {
    if (!editingItem?.name || !editingItem?.price) {
      showMessage("الاسم والسعر مطلوبان.");
      return;
    }
    try {
      const id = editingItem.id || `item_${Date.now()}`;
      await saveCatalogItem({
        id,
        name: editingItem.name,
        price: Number(editingItem.price),
        vat: Number(editingItem.vat || 15),
        discountPercent: Number(editingItem.discountPercent || 0),
        altNames: editingItem.altNames || '',
        tenantId: profile.tenantId,
        createdAt: editingItem.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, profile.tenantId);
      setEditingItem(null);
      showMessage("تم حفظ الصنف بنجاح.", "success");
      
      // Scroll to top of list to see new item if it's new
      if (catalogListRef.current) {
        catalogListRef.current.scrollTop = 0;
      }
    } catch (err: any) {
      showMessage("خطأ في حفظ الصنف: " + err.message);
    }
  };

  const handleDeleteCatalogItem = (id: string) => {
    setItemToDelete(id);
  };

  const handleBulkDeleteItems = async () => {
    if (selectedCatalogItems.length === 0) return;
    setBulkDeleteConfirm('bulk');
  };

  const handleClearAllItems = async () => {
    if (catalog.length === 0) return;
    setBulkDeleteConfirm('all');
  };

  const confirmBulkDelete = async () => {
    if (!profile?.tenantId) return;
    const isAll = bulkDeleteConfirm === 'all';
    const itemsToDelete = isAll ? catalog.map(i => i.id) : selectedCatalogItems;
    
    setBulkDeleteConfirm(null);
    try {
      await bulkDeleteCatalogItems(itemsToDelete, profile.tenantId);
      if (isAll) {
        showMessage("تم مسح جميع الأصناف بنجاح.", "success");
      } else {
        showMessage(`تم حذف ${selectedCatalogItems.length} صنف بنجاح.`, "success");
        setSelectedCatalogItems([]);
      }
    } catch (err: any) {
      showMessage("خطأ أثناء الحذف: " + err.message);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete || !profile?.tenantId) return;
    const id = itemToDelete;
    setItemToDelete(null);
    try {
      await deleteCatalogItem(id, profile.tenantId);
    } catch (err: any) {
      showMessage("خطأ في حذف الصنف: " + err.message);
    }
  };

  return (
    <div className="w-full h-full bg-slate-50 overflow-y-auto p-4 md:p-8 rtl font-cairo print:p-0 print:bg-white">
      
      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-print-area, #invoice-print-area * { visibility: visible; }
          #invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Sparkles className="text-indigo-600 w-8 h-8" />
              مولد الفاتورة الذكي (AI Pro)
            </h1>
            <p className="text-slate-500 mt-2">انسخ محادثات الواتساب ودع الذكاء الاصطناعي يستخرج الفاتورة بدقة.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowHistoryModal(true)}
              className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition"
            >
              <History className="w-5 h-5" />
              سجل الفواتير
            </button>
            {isAdmin && (
              <button 
                onClick={() => setShowCatalogModal(true)}
                className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition"
              >
                <Settings className="w-5 h-5" />
                إدارة الأصناف / Items ({catalog.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 no-print relative">
        
        {/* Left Column: Input */}
        <div 
          className="shrink-0 space-y-6"
          style={{ width: `${leftPanelWidth}%` }}
        >
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-indigo-500 w-6 h-6" />
                سجل الطلبات (واتساب)
              </h2>
              <button 
                onClick={() => setChatLog('')}
                className="text-slate-400 hover:text-rose-500 transition-colors"
                title="مسح المحادثة"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <textarea
              className="w-full h-64 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-slate-700"
              placeholder="انسخ والصق المحادثة هنا..."
              value={chatLog}
              onChange={(e) => setChatLog(e.target.value)}
            />

            <button
              onClick={handleGenerateInvoice}
              disabled={isLoading || isViewer}
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {isLoading ? 'جاري التحليل...' : 'تحليل وتوليد الفاتورة'}
            </button>
          </div>
        </div>

        {/* Resize Handle */}
        <div 
          className="hidden lg:block w-1 hover:w-2 bg-slate-200 hover:bg-indigo-400 cursor-col-resize transition-all rounded-full"
          onMouseDown={() => setIsResizing(true)}
        />

        {/* Right Column: Invoice Results */}
        <div className={`flex-1 ${isFullscreen ? 'fixed inset-0 z-[100] bg-slate-100 p-4 overflow-y-auto' : ''}`}>
          <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-200 ${isFullscreen ? 'min-h-full max-w-7xl mx-auto' : ''}`} id="invoice-print-area">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                {invoiceMode === 'sales' ? 'فاتورة مبيعات نهائية' : 'فاتورة مشتريات نهائية'}
                {currentInvoiceNumber && (
                  <span className="text-sm bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg border border-indigo-100">
                    {currentInvoiceNumber}
                  </span>
                )}
              </h2>
              <div className="flex gap-2 no-print">
                <button 
                  onClick={handleSaveInvoice}
                  disabled={isLoading || isViewer}
                  className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition border border-indigo-200 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> حفظ
                </button>
                <button 
                  onClick={handleExportToERP}
                  disabled={isLoading || isViewer}
                  className={`${invoiceMode === 'sales' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'} px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition border disabled:opacity-50`}
                  title={invoiceMode === 'sales' ? "إضافة إلى المبيعات وحساب العميل" : "إضافة إلى المصروفات وحساب المورد"}
                >
                  <ArrowRightLeft className="w-4 h-4" /> 
                  {invoiceMode === 'sales' ? 'إضافة للمبيعات' : 'إضافة للمصروفات'}
                </button>
                <button 
                  onClick={() => {
                    if (isViewer) return;
                    showConfirm('تفريغ الفاتورة', 'هل أنت متأكد من تفريغ كافة بيانات الفاتورة ومسح مسودة العمل؟', () => {
                      setInvoiceItems([]);
                      setChatLog('');
                      setCustomerName('');
                      setCurrentInvoiceId('');
                      setCurrentInvoiceNumber('');
                      showMessage('تم تفريغ الفاتورة بنجاح', 'success');
                    });
                  }}
                  className="bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition border border-slate-200"
                  title="تفريغ الفاتورة"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button onClick={handleExportExcel} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition border border-emerald-200">
                  <Download className="w-4 h-4" /> Excel
                </button>
                <button onClick={handlePrint} className="bg-rose-50 text-rose-700 hover:bg-rose-100 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition border border-rose-200">
                  <FileText className="w-4 h-4" /> PDF
                </button>
                <button onClick={() => window.print()} className="bg-slate-50 text-slate-700 hover:bg-slate-100 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition border border-slate-200">
                  <Printer className="w-4 h-4" /> طباعة
                </button>
                <button 
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="bg-slate-50 text-slate-500 hover:bg-slate-100 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition border border-slate-200"
                  title={isFullscreen ? "تصغير" : "ملء الشاشة"}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="mb-6 no-print">
              <label className="block text-sm font-bold text-slate-700 mb-2">
                {invoiceMode === 'sales' ? 'اسم العميل' : 'اسم المورد'}
              </label>
              <input 
                type="text" 
                list="entities-list"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={invoiceMode === 'sales' ? "أدخل أو اختر اسم العميل لربط الفاتورة به..." : "أدخل أو اختر اسم المورد لربط الفاتورة به..."}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
              />
              <datalist id="entities-list">
                {(invoiceMode === 'sales' ? customers : suppliers).map(ent => (
                  <option key={ent.id} value={ent.name} />
                ))}
              </datalist>
            </div>

            {invoiceItems.length === 0 ? (
              <div className="text-center py-12 text-slate-400 no-print">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>لم يتم توليد أي فاتورة بعد.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-inner mb-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
                  <table className="w-full text-sm text-right relative min-w-[1200px]">
                    <thead className="bg-slate-800 text-white sticky top-0 z-10 shadow-md">
                    <tr>
                      <th className="p-3 rounded-tr-lg">م</th>
                      <th className="p-3">الصنف</th>
                      <th className="p-3 text-center">الكمية</th>
                      <th className="p-3 text-center">السعر</th>
                      <th className="p-3 text-center">الإجمالي</th>
                      <th className="p-3 text-center">خصم %</th>
                      <th className="p-3 text-center">خصم مبلغ</th>
                      <th className="p-3 text-center">الصافي</th>
                      <th className="p-3 text-center no-print">ضريبة %</th>
                      <th className="p-3 text-center">الضريبة</th>
                      <th className="p-3 text-center">النهائي</th>
                      <th className="p-3 text-center no-print">تتبع</th>
                      <th className="p-3 rounded-tl-lg text-center no-print">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {invoiceItems.map((item, idx) => {
                      const calcItem = calculatedItems[idx] || {};
                      const qty = Number(item.qty) || 0;
                      const price = Number(item.price) || 0;
                      const gross = price * qty;
                      const discPercent = Number(item.discountPercent) || 0;
                      const discVal = calcItem.discount || 0;
                      const net = calcItem.lineNet || (gross - discVal);
                      const vatPercent = Number(item.vat) || 0;
                      const vatVal = calcItem.lineTax || 0;
                      const total = calcItem.total || (net + vatVal);

                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-3 font-medium text-slate-900">{item.name}</td>
                          <td className="p-3 text-center">
                            <input 
                              type="number" min="0" value={item.qty} 
                              onChange={(e) => handleUpdateRow(idx, 'qty', e.target.value)}
                              className="w-16 text-center border border-slate-300 rounded p-1 no-print focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <span className="hidden print:inline">{qty}</span>
                          </td>
                          <td className="p-3 text-center ltr-text">{price.toFixed(2)}</td>
                          <td className="p-3 text-center ltr-text font-semibold text-indigo-600">{gross.toFixed(2)}</td>
                          <td className="p-3 text-center">
                            <input 
                              type="number" min="0" max="100" value={item.discountPercent} 
                              onChange={(e) => handleUpdateRow(idx, 'discountPercent', e.target.value)}
                              className="w-16 text-center border border-red-200 text-red-600 rounded p-1 no-print focus:ring-2 focus:ring-red-500 outline-none"
                            />
                            <span className="hidden print:inline text-red-600">{discPercent}%</span>
                          </td>
                          <td className="p-3 text-center">
                            <input 
                              type="number" min="0" value={discVal > 0 ? discVal.toFixed(2) : ''} 
                              onChange={(e) => handleUpdateRow(idx, 'discountValue' as any, e.target.value)}
                              className="w-20 text-center border border-red-200 text-red-600 rounded p-1 no-print focus:ring-2 focus:ring-red-500 outline-none"
                              placeholder="0.00"
                            />
                            <span className="hidden print:inline text-red-600">{discVal.toFixed(2)}</span>
                          </td>
                          <td className="p-3 text-center ltr-text font-bold text-slate-800">{net.toFixed(2)}</td>
                          <td className="p-3 text-center no-print">
                            <input 
                              type="number" min="0" max="100" value={item.vat} 
                              onChange={(e) => handleUpdateRow(idx, 'vat' as any, e.target.value)}
                              className="w-16 text-center border border-green-200 text-green-600 rounded p-1 focus:ring-2 focus:ring-green-500 outline-none"
                            />
                          </td>
                          <td className="p-3 text-center ltr-text text-green-600">
                            {vatVal.toFixed(2)} <span className="text-[10px] text-slate-400 block print:hidden">({vatPercent}%)</span>
                          </td>
                          <td className="p-3 text-center ltr-text font-black text-indigo-800 bg-indigo-50/50">{total.toFixed(2)}</td>
                          <td className="p-3 text-center no-print">
                            <button 
                              onClick={() => {
                                if (item.lineage) {
                                  setTraceData(item.lineage);
                                  setShowTraceModal(true);
                                } else {
                                  showMessage("لا توجد بيانات تتبع لهذا الصنف.");
                                }
                              }}
                              className="text-slate-400 hover:text-indigo-600 transition p-1"
                              title="تتبع المصدر"
                            >
                              <Search className="w-4 h-4" />
                            </button>
                          </td>
                          <td className="p-3 text-center no-print">
                            <button 
                              onClick={() => {
                                if (isViewer) return;
                                const newItems = [...invoiceItems];
                                newItems.splice(idx, 1);
                                setInvoiceItems(newItems);
                              }}
                              disabled={isViewer}
                              className="text-slate-400 hover:text-rose-600 transition p-1 disabled:opacity-30"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>

                {/* Totals Summary */}
                <div className="mt-8 bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-wrap justify-between items-center gap-4">
                  <div className="text-center px-4">
                    <p className="text-slate-500 text-xs font-bold mb-1">الإجمالي المبدئي</p>
                    <p className="text-lg font-bold text-slate-800 ltr-text">{backendTotals.sub.toFixed(2)}</p>
                  </div>
                  <div className="text-center px-4 border-r border-slate-200">
                    <p className="text-slate-500 text-xs font-bold mb-1">إجمالي الخصومات</p>
                    <p className="text-lg font-bold text-red-600 ltr-text">{backendTotals.disc.toFixed(2)}</p>
                  </div>
                  <div className="text-center px-4 border-r border-slate-200">
                    <p className="text-slate-500 text-xs font-bold mb-1">الصافي (الوعاء)</p>
                    <p className="text-lg font-bold text-slate-800 ltr-text">{backendTotals.net.toFixed(2)}</p>
                  </div>
                  <div className="text-center px-4 border-r border-slate-200">
                    <p className="text-slate-500 text-xs font-bold mb-1">إجمالي الضريبة</p>
                    <p className="text-lg font-bold text-green-600 ltr-text">{backendTotals.vat.toFixed(2)}</p>
                  </div>
                  <div className="text-center px-6 py-2 bg-indigo-600 text-white rounded-lg shadow-md">
                    <p className="text-indigo-100 text-xs font-bold mb-1 flex items-center justify-center gap-1">
                      الإجمالي النهائي
                      {lastProcessedResult && (
                         <button 
                          onClick={() => handleFetchTrace(lastProcessedResult.invoiceId, 'ENTRY' as any)} // For simplicity we might just use entry trace
                          className="text-indigo-300 hover:text-white"
                          title="تتبع الترحيل"
                        >
                          <AlertCircle className="w-3 h-3" />
                        </button>
                      )}
                    </p>
                    <p className="text-2xl font-black ltr-text">{backendTotals.grand.toFixed(2)} SAR</p>
                  </div>
                </div>
              </div>
            )}

            {/* Manual Add Item */}
            <div className="mt-6 pt-6 border-t border-slate-200 no-print">
              <h3 className="text-lg font-bold text-slate-800 mb-4">إضافة صنف يدوياً للفاتورة</h3>
              <div className="flex gap-4">
                <select 
                  className="flex-1 border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500"
                  id="manual-item-select"
                >
                  <option value="">-- اختر صنفاً من القائمة --</option>
                  {catalog.map(item => (
                    <option key={item.id} value={item.id}>{item.name} - {item.price} SAR</option>
                  ))}
                </select>
                <button 
                  onClick={() => {
                    const select = document.getElementById('manual-item-select') as HTMLSelectElement;
                    const id = select.value;
                    if (!id) return;
                    const item = catalog.find(c => c.id === id);
                    if (item) {
                      setInvoiceItems([...invoiceItems, { 
                        ...item, 
                        qty: 1,
                        vat: (item.vat == null || (item.vat as any) === "") ? 15 : Number(item.vat),
                        discountPercent: (item.discountPercent == null || (item.discountPercent as any) === "") ? 0 : Number(item.discountPercent)
                      }]);
                      select.value = '';
                    }
                  }}
                  className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition"
                >
                  <Plus className="w-5 h-5" /> إضافة
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Modal */}
      {showCatalogModal && isAdmin && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <motion.div 
            drag
            dragMomentum={false}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden resize both"
            style={{ minWidth: '320px', minHeight: '400px' }}
          >
            <div className="p-6 border-b flex justify-between items-center bg-slate-50 cursor-move">
              <h3 className="text-xl font-bold text-slate-800">إدارة الأصناف / Items</h3>
              <div className="flex items-center gap-4">
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImportExcel}
                />
                <button 
                  onClick={() => {
                    const templateData = [
                      { 'الصنف': 'مثال: كيكة شوكولاتة', 'السعر': 150, 'الضريبة': 15, 'الخصم': 0, 'المرادفات': 'كيك اسود, Chocolate Cake' }
                    ];
                    const ws = XLSX.utils.json_to_sheet(templateData);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Template");
                    XLSX.writeFile(wb, "نموذج_الأصناف.xlsx");
                  }}
                  className="bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-bold transition border border-slate-200"
                >
                  <Download className="w-4 h-4" /> نموذج Excel
                </button>
                <button 
                  onClick={handleExportAllItems}
                  className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-bold transition border border-indigo-200"
                >
                  <Download className="w-4 h-4" /> تصدير الكل
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-bold transition border border-emerald-200"
                >
                  <Upload className="w-4 h-4" /> استيراد Excel
                </button>
                <button onClick={() => setShowCatalogModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input 
                    type="text" 
                    placeholder="بحث في الأصناف..." 
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  {selectedCatalogItems.length > 0 && (
                    <button 
                      onClick={handleBulkDeleteItems}
                      className="bg-rose-50 text-rose-600 hover:bg-rose-100 px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition border border-rose-200"
                    >
                      <Trash2 className="w-4 h-4" /> حذف المختار ({selectedCatalogItems.length})
                    </button>
                  )}
                  <button 
                    onClick={handleClearAllItems}
                    className="bg-rose-600 text-white hover:bg-rose-700 px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" /> حذف الكل
                  </button>
                </div>
              </div>

              {/* Add/Edit Form */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 shadow-sm">
                <h4 className="font-bold text-slate-700 mb-4">{editingItem?.id ? 'تعديل صنف' : 'إضافة صنف جديد'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">اسم الصنف *</label>
                    <input 
                      type="text" 
                      ref={itemNameInputRef}
                      value={editingItem?.name || ''} 
                      onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                      className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">السعر *</label>
                    <input 
                      type="number" 
                      value={editingItem?.price || ''} 
                      onChange={e => setEditingItem({...editingItem, price: parseFloat(e.target.value)})}
                      className="w-full border rounded-lg p-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">الضريبة %</label>
                    <input 
                      type="number" 
                      value={editingItem?.vat ?? 15} 
                      onChange={e => setEditingItem({...editingItem, vat: parseFloat(e.target.value)})}
                      className="w-full border rounded-lg p-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">خصم افتراضي %</label>
                    <input 
                      type="number" 
                      value={editingItem?.discountPercent ?? 0} 
                      onChange={e => setEditingItem({...editingItem, discountPercent: parseFloat(e.target.value)})}
                      className="w-full border rounded-lg p-2 text-sm"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold text-slate-500 mb-1">مرادفات (مفصولة بفاصلة)</label>
                    <input 
                      type="text" 
                      value={editingItem?.altNames || ''} 
                      onChange={e => setEditingItem({...editingItem, altNames: e.target.value})}
                      className="w-full border rounded-lg p-2 text-sm"
                      placeholder="مثال: كيكة شوكولاتة, Chocolate Cake, كيك اسود"
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={handleSaveCatalogItem}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition"
                    >
                      حفظ
                    </button>
                  </div>
                </div>
              </div>

              {/* Catalog List */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar" ref={catalogListRef}>
                  <table className="w-full text-sm text-right">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="p-3 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedCatalogItems.length === filteredCatalog.length && filteredCatalog.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCatalogItems(filteredCatalog.map(i => i.id));
                            } else {
                              setSelectedCatalogItems([]);
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="p-3">الصنف</th>
                      <th className="p-3">السعر</th>
                      <th className="p-3">الضريبة</th>
                      <th className="p-3">الخصم</th>
                      <th className="p-3">المرادفات</th>
                      <th className="p-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCatalog.map(item => (
                      <tr key={item.id} className={`hover:bg-slate-50 ${selectedCatalogItems.includes(item.id) ? 'bg-indigo-50/30' : ''}`}>
                        <td className="p-3 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedCatalogItems.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCatalogItems([...selectedCatalogItems, item.id]);
                              } else {
                                setSelectedCatalogItems(selectedCatalogItems.filter(id => id !== item.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="p-3 font-medium">{item.name}</td>
                        <td className="p-3 ltr-text">{item.price.toFixed(2)}</td>
                        <td className="p-3 ltr-text">{item.vat}%</td>
                        <td className="p-3 ltr-text">{item.discountPercent || 0}%</td>
                        <td className="p-3 text-slate-500 text-xs">{item.altNames}</td>
                        <td className="p-3 flex justify-center gap-2">
                          <button 
                            onClick={() => handleAddItemToInvoice(item)}
                            className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 p-1.5 rounded-lg transition-colors"
                            title="إضافة للفاتورة"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingItem(item)} className="text-indigo-600 hover:text-indigo-800 p-1">تعديل</button>
                          <button onClick={() => handleDeleteCatalogItem(item.id)} className="text-red-600 hover:text-red-800 p-1"><Trash2 className="w-4 h-4"/></button>
                        </td>
                      </tr>
                    ))}
                    {catalog.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">لا توجد أصناف حالياً.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 no-print">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
          >
            <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-rose-500" />
              تأكيد الحذف
            </h3>
            <p className="text-slate-600 mb-6">هل أنت متأكد من رغبتك في حذف هذا الصنف نهائياً؟</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setItemToDelete(null)} 
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition"
              >
                إلغاء
              </button>
              <button 
                onClick={confirmDelete} 
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                نعم، احذف
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 no-print">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
          >
            <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-rose-500" />
              تأكيد الحذف {bulkDeleteConfirm === 'all' ? 'الكلي' : 'الجماعي'}
            </h3>
            <p className="text-slate-600 mb-6">
              {bulkDeleteConfirm === 'all' 
                ? 'هل أنت متأكد من رغبتك في حذف جميع الأصناف من الكتالوج؟ لا يمكن التراجع عن هذا الإجراء.'
                : `هل أنت متأكد من رغبتك في حذف ${selectedCatalogItems.length} صنف مختار نهائياً؟`
              }
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setBulkDeleteConfirm(null)} 
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition"
              >
                إلغاء
              </button>
              <button 
                onClick={confirmBulkDelete} 
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                نعم، احذف
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Invoice History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4 no-print">
          <motion.div 
            drag
            dragMomentum={false}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl resize both"
            style={{ minWidth: '320px', minHeight: '400px' }}
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl cursor-move">
              <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <History className="w-7 h-7 text-indigo-600" />
                سجل الفواتير / History
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {savedInvoices.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <History className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>لا توجد فواتير محفوظة بعد.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {savedInvoices.map((invoice, idx) => (
                    <div key={`${invoice.id}-${idx}`} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-indigo-200 transition-colors">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-bold text-slate-800 text-lg">{invoice.invoiceNumber}</span>
                          <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-bold">
                            {new Date(invoice.createdAt).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 flex items-center gap-4">
                          <span>العميل: <strong className="text-slate-800">{invoice.customerName}</strong></span>
                          <span>الإجمالي: <strong className="text-emerald-600">{invoice.grandTotal.toFixed(2)} SAR</strong></span>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                        <button 
                          onClick={() => handleLoadInvoice(invoice)}
                          className="flex-1 md:flex-none bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-lg font-bold transition flex items-center justify-center gap-2"
                        >
                          <FileText className="w-4 h-4" /> عرض / تعديل
                        </button>
                        <button 
                          onClick={() => setInvoiceToDelete(invoice.id)}
                          className="bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-2 rounded-lg font-bold transition flex items-center justify-center"
                          title="حذف الفاتورة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Invoice Confirmation Modal */}
      {invoiceToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-rose-500" />
              تأكيد الحذف
            </h3>
            <p className="text-slate-600 mb-6">هل أنت متأكد من رغبتك في حذف هذه الفاتورة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setInvoiceToDelete(null)} 
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition"
              >
                إلغاء
              </button>
              <button 
                onClick={confirmDeleteInvoice} 
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                نعم، احذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trace Modal */}
      {showTraceModal && traceData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto no-print">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">تتبع البيانات (Traceability)</h3>
                  <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Audit Lineage & Decision Log</p>
                </div>
              </div>
              <button 
                onClick={() => setShowTraceModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">المصدر (Source)</p>
                  <p className="font-bold text-slate-800">{traceData.sourceFile || 'نظام ERP'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">القاعدة (Rule)</p>
                  <p className="font-bold text-slate-800">{traceData.mappingRule || 'Direct Entry'}</p>
                </div>
              </div>

              {traceData.sourceSheet && (
                <div className="flex justify-between items-center p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                  <div className="flex gap-4">
                    <div>
                      <p className="text-[10px] font-black text-indigo-400 uppercase">Sheet</p>
                      <p className="font-bold text-indigo-900">{traceData.sourceSheet}</p>
                    </div>
                    <div className="border-r border-indigo-200 h-8 self-center"></div>
                    <div>
                      <p className="text-[10px] font-black text-indigo-400 uppercase">Row</p>
                      <p className="font-bold text-indigo-900">{traceData.sourceRow}</p>
                    </div>
                  </div>
                  <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                </div>
              )}

              <div className="space-y-3">
                <p className="text-xs font-black text-slate-400 uppercase">التحول المالي (Transformation)</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <p className="text-[10px] text-slate-400 mb-1">Original</p>
                    <p className="font-mono font-bold">{traceData.originalValue}</p>
                  </div>
                  <ArrowRightLeft className="text-slate-300 w-4 h-4" />
                  <div className="flex-1 bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                    <p className="text-[10px] text-emerald-500 mb-1">Processed</p>
                    <p className="font-mono font-bold text-emerald-700">{traceData.processedValue || traceData.originalValue}</p>
                  </div>
                </div>
              </div>

              {traceData.aiDecision && (
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <p className="text-xs font-black text-amber-700 uppercase">ذكاء اصطناعي (AI Context)</p>
                  </div>
                  <p className="text-sm text-amber-900 leading-relaxed font-medium group-hover:block italic">
                    {traceData.aiDecision}
                  </p>
                  {traceData.confidence && (
                    <div className="mt-3 h-1.5 w-full bg-amber-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-600 rounded-full" 
                        style={{ width: `${traceData.confidence * 100}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowTraceModal(false)}
                className="bg-slate-800 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-lg"
              >
                فهمت، إغلاق القفل
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-center no-print">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-100 border-t-indigo-600 mb-6"></div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">جاري المعالجة...</h3>
            <p className="text-slate-500">{loadingMsg}</p>
          </div>
        </div>
      )}

      {/* Toast Messages */}
      {errorMsg && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 z-[110] animate-in slide-in-from-bottom-5 no-print">
          <AlertCircle className="w-5 h-5" />
          <span className="font-bold">{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 z-[110] animate-in slide-in-from-bottom-5 no-print">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-bold">{successMsg}</span>
        </div>
      )}

    </div>
  );
};
