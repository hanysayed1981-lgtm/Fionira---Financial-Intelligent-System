import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, FileText, Save, Send, CheckCircle, XCircle, Download, ArrowRightLeft, FileCheck, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../lib/financial-utils';
import { generateInvoicePDF, InvoiceData } from '../lib/pdf-engine';
import { useUI } from '../contexts/UIContext';
import { EntityProfile } from '../types';
import { db, auth } from '../firebase';
import { collection, addDoc, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import { useAuth } from '../contexts/AuthProvider';
import { AppConfig } from '../config/appConfig';
import { AppSettings } from '../lib/settings-service';

interface QuoteItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  discountPercent: number;
  vatRate: number;
}

interface QuotationManagerProps {
  customers?: EntityProfile[];
  settings?: AppSettings | null;
}

export const QuotationManager: React.FC<QuotationManagerProps> = ({ customers = [], settings }) => {
  const { showConfirm, showAlert, notify } = useUI();
  const { user, profile } = useAuth();
  const [quoteNumber, setQuoteNumber] = useState(`QT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`);
  const [customerName, setCustomerName] = useState('');
  const [customerTaxId, setCustomerTaxId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Default valid until is 30 days from now
  const defaultValidUntil = new Date();
  defaultValidUntil.setDate(defaultValidUntil.getDate() + 30);
  const [validUntil, setValidUntil] = useState(defaultValidUntil.toISOString().split('T')[0]);
  
  const [status, setStatus] = useState<'draft' | 'sent' | 'accepted' | 'rejected' | 'invoiced'>('draft');
  const [notes, setNotes] = useState('نشكر لكم ثقتكم بنا. هذا العرض صالح لمدة 30 يوماً من تاريخ إصداره.');
  
  const [items, setItems] = useState<QuoteItem[]>([
    { id: '1', description: '', qty: 1, unitPrice: 0, discountPercent: 0, vatRate: 15 }
  ]);

  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  // Auto-fill tax ID when customer is selected
  useEffect(() => {
    const customer = customers.find(c => c.name === customerName);
    if (customer && customer.taxId) {
      setCustomerTaxId(customer.taxId);
    }
  }, [customerName, customers]);

  const handleExportPDF = async () => {
    setIsExporting(true);
    
    try {
      const quoteData: InvoiceData = {
        documentTitle: 'عرض سعر\nQUOTATION',
        invoiceNumber: quoteNumber,
        date: date,
        dueDate: validUntil,
        customerName: customerName || 'عميل محتمل',
        customerTaxId: customerTaxId,
        companyName: settings?.companyName || AppConfig.companyName || AppConfig.appName,
        companyDetails: `الرقم الضريبي: ${settings?.taxId || '---'}\nتاريخ الإصدار: ${date}\nصالح حتى: ${validUntil}`,
        items: items.map(item => {
          const qty = Number(item.qty) || 0;
          const price = Number(item.unitPrice) || 0;
          const gross = price * qty;
          const discPercent = Number(item.discountPercent) || 0;
          const discVal = gross * (discPercent / 100);
          const net = gross - discVal;
          const vatPercent = Number(item.vatRate) || 0;
          const vatVal = net * (vatPercent / 100);
          const total = net + vatVal;

          return {
            description: item.description || '---',
            quantity: qty,
            unitPrice: price,
            discount: discVal,
            taxRate: vatPercent,
            total: total
          };
        }),
        subtotal: totals.subTotal,
        totalDiscount: totals.totalDiscount,
        totalTax: totals.totalVat,
        grandTotal: totals.grandTotal,
        notes: notes
      };

      await generateInvoicePDF(quoteData, `عرض_سعر_${quoteNumber}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);
      showAlert("خطأ في التصدير", "حدث خطأ أثناء تصدير ملف PDF.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSave = async () => {
    if (!customerName) {
      showAlert("بيانات مفقودة", "الرجاء إدخال اسم العميل", "warning");
      return;
    }
    
    setIsSaving(true);
    try {
      const quoteData = {
        quoteNumber,
        customerName,
        customerTaxId,
        date,
        validUntil,
        status,
        notes,
        items,
        totals,
        createdAt: serverTimestamp(),
        tenantId: profile?.tenantId || user?.uid || 'system',
      };
      
      // Save to Firestore
      await setDoc(doc(db, 'quotations', quoteNumber), quoteData);
      notify("تم حفظ عرض السعر بنجاح!");
    } catch (error) {
      console.error("Error saving quotation:", error);
      showAlert("خطأ في الحفظ", "حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!customerName) {
      showAlert("بيانات مفقودة", "الرجاء إدخال اسم العميل", "warning");
      return;
    }

    showConfirm("تأكيد التحويل", "هل أنت متأكد من تحويل عرض السعر إلى فاتورة مبيعات؟ سيتم تسجيل الأثر المالي فوراً.", async () => {
      setIsSaving(true);
      try {
        // Create a summary record for the invoice
        const invoiceRecord = {
          _originalIndex: Date.now(),
          tenantId: profile?.tenantId || user?.uid || 'system',
          Raw_Entity: customerName,
          Entity_ID: `CUST-${customerName.replace(/\s+/g, '-').substring(0, 10)}`,
          Entity_Normalized_Name: customerName,
          Entity_TaxID: customerTaxId || 'غير متوفر',
          Invoice_Number: `INV-${quoteNumber}`,
          Invoice_Date: new Date().toISOString().split('T')[0],
          Item_Description: `فاتورة مبيعات محولة من عرض سعر ${quoteNumber}`,
          Category: 'إيرادات مبيعات',
          Net_Amount: totals.netTotal,
          Taxable_Amount: totals.netTotal,
          NonTaxable_Amount: 0,
          VAT_Amount: totals.totalVat,
          Total_Amount: totals.grandTotal,
          Anomalies: [],
          Confidence_Score: 100,
          Source: 'Quotation',
          SmartInvoice_Items: items.map(i => `${i.qty}x ${i.description}`).join(' | ')
        };

        // Save to uploadedFiles to trigger ledger update
        const fileId = `quotation_conversion_${Date.now()}`;
        const fileDocRef = doc(db, 'uploadedFiles', fileId);
        
        const fileMetadata = {
          fileName: `تحويل عرض سعر - ${quoteNumber}`,
          uploadDate: new Date().toISOString(),
          uploadedBy: auth.currentUser?.uid || 'system',
          fileType: 'revenues',
          recordCount: 1,
          skippedRowCount: 0,
          status: 'processed',
          periodYear: new Date().getFullYear().toString(),
          tenantId: profile?.tenantId || user?.uid || 'system'
        };

        await setDoc(fileDocRef, { id: fileId, ...fileMetadata });
        
        // Add record to subcollection
        const recordRef = doc(collection(db, 'uploadedFiles', fileId, 'records'), `${fileId}_record`);
        await setDoc(recordRef, { ...invoiceRecord, id: `${fileId}_record`, fileId: fileId });
        
        // Update quotation status
        setStatus('invoiced');
        await setDoc(doc(db, 'quotations', quoteNumber), { status: 'invoiced' }, { merge: true });
        
        notify("تم تحويل عرض السعر إلى فاتورة بنجاح وإدراجها في سجل المبيعات.");
      } catch (error) {
        console.error("Error converting to invoice:", error);
        showAlert("خطأ في التحويل", "حدث خطأ أثناء التحويل. يرجى المحاولة مرة أخرى.", "error");
      } finally {
        setIsSaving(false);
      }
    });
  };

  const runAIAudit = async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setAuditResult("مفتاح API الخاص بـ Gemini غير متوفر.");
      return;
    }

    setIsAuditing(true);
    setAuditResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        أنت مدقق مالي خبير. قم بمراجعة عرض السعر التالي واكتشف أي أخطاء أو شذوذ في التسعير أو الضرائب.
        العميل: ${customerName}
        الإجمالي: ${totals.grandTotal}
        الضريبة: ${totals.totalVat}
        
        البنود:
        ${items.map(i => `- ${i.description}: الكمية ${i.qty}، السعر ${i.unitPrice}، الخصم ${i.discountPercent}%، الضريبة ${i.vatRate}%`).join('\n')}
        
        هل هناك أي أخطاء واضحة؟ (مثل ضريبة 0% على منتج خاضع، أو خصم مبالغ فيه). أجب باختصار باللغة العربية.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      setAuditResult(response.text);
    } catch (error) {
      console.error("AI Audit Error:", error);
      setAuditResult("حدث خطأ أثناء الاتصال بالمدقق الذكي.");
    } finally {
      setIsAuditing(false);
    }
  };

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', qty: 1, unitPrice: 0, discountPercent: 0, vatRate: 15 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Calculations
  const totals = useMemo(() => {
    let subTotal = 0;
    let totalDiscount = 0;
    let totalVat = 0;

    items.forEach(item => {
      const gross = item.qty * item.unitPrice;
      const discount = gross * (item.discountPercent / 100);
      const net = gross - discount;
      const vat = net * (item.vatRate / 100);

      subTotal += gross;
      totalDiscount += discount;
      totalVat += vat;
    });

    return {
      subTotal: Number(subTotal.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      netTotal: Number((subTotal - totalDiscount).toFixed(2)),
      totalVat: Number(totalVat.toFixed(2)),
      grandTotal: Number((subTotal - totalDiscount + totalVat).toFixed(2))
    };
  }, [items]);

  const getStatusBadge = () => {
    switch (status) {
      case 'draft': return <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><FileText className="w-3 h-3"/> مسودة</span>;
      case 'sent': return <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Send className="w-3 h-3"/> مُرسل</span>;
      case 'accepted': return <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> مقبول</span>;
      case 'rejected': return <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><XCircle className="w-3 h-3"/> مرفوض</span>;
      case 'invoiced': return <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><FileCheck className="w-3 h-3"/> مفوتر</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header & Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <FileText className="w-7 h-7 text-indigo-600" />
            إدارة عروض الأسعار
          </h2>
          <p className="text-slate-500 text-sm mt-1">إنشاء وتتبع عروض الأسعار الاحترافية وتحويلها لفواتير</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-bold text-sm shadow-sm disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            تصدير PDF
          </button>
          
          {status === 'draft' && (
            <button onClick={() => setStatus('sent')} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors font-bold text-sm shadow-sm">
              <Send className="w-4 h-4" />
              تحديد كمُرسل
            </button>
          )}

          {status === 'sent' && (
            <>
              <button onClick={() => setStatus('accepted')} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors font-bold text-sm shadow-sm">
                <CheckCircle className="w-4 h-4" />
                قبول العرض
              </button>
              <button onClick={() => setStatus('rejected')} className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors font-bold text-sm shadow-sm">
                <XCircle className="w-4 h-4" />
                رفض
              </button>
            </>
          )}

          {status === 'accepted' && (
            <button 
              onClick={handleConvertToInvoice}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold text-sm shadow-sm disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
              تحويل إلى فاتورة
            </button>
          )}

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-bold text-sm shadow-sm disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ العرض
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" ref={printRef}>
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Document Info */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">بيانات العرض</h3>
              {getStatusBadge()}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">رقم العرض</label>
                <input 
                  type="text" 
                  value={quoteNumber}
                  onChange={(e) => setQuoteNumber(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono text-left"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">اسم العميل</label>
                <input 
                  type="text" 
                  list="customers-list"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="اختر أو اكتب اسم العميل..."
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
                <datalist id="customers-list">
                  {customers.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">تاريخ الإصدار</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">صالح حتى</label>
                <input 
                  type="date" 
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <h3 className="text-lg font-bold text-slate-800 mb-6">البنود والخدمات</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 text-slate-600 font-bold">
                  <tr>
                    <th className="px-4 py-3 rounded-r-xl w-2/5">الوصف</th>
                    <th className="px-4 py-3 w-24">الكمية</th>
                    <th className="px-4 py-3 w-32">سعر الوحدة</th>
                    <th className="px-4 py-3 w-24">خصم %</th>
                    <th className="px-4 py-3 w-24">ضريبة %</th>
                    <th className="px-4 py-3 w-32">الإجمالي</th>
                    <th className="px-4 py-3 rounded-l-xl w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence>
                    {items.map((item) => {
                      const gross = item.qty * item.unitPrice;
                      const net = gross - (gross * (item.discountPercent / 100));
                      const total = net + (net * (item.vatRate / 100));

                      return (
                        <motion.tr 
                          key={item.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          className="group"
                        >
                          <td className="py-3 pr-2">
                            <input 
                              type="text" 
                              value={item.description}
                              onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                              placeholder="وصف المنتج أو الخدمة..."
                              className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg outline-none transition-all"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <input 
                              type="number" 
                              min="1"
                              value={item.qty || ''}
                              onChange={(e) => updateItem(item.id, 'qty', Number(e.target.value))}
                              className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg outline-none transition-all text-center"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <input 
                              type="number" 
                              min="0"
                              value={item.unitPrice || ''}
                              onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                              className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg outline-none transition-all text-center"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <input 
                              type="number" 
                              min="0" max="100"
                              value={item.discountPercent || ''}
                              onChange={(e) => updateItem(item.id, 'discountPercent', Number(e.target.value))}
                              className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg outline-none transition-all text-center text-rose-600"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <select
                              value={item.vatRate}
                              onChange={(e) => updateItem(item.id, 'vatRate', Number(e.target.value))}
                              className="w-full px-2 py-2 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg outline-none transition-all text-center"
                            >
                              <option value={15}>15%</option>
                              <option value={0}>0%</option>
                            </select>
                          </td>
                          <td className="py-3 px-2 text-left font-bold text-slate-800" dir="ltr">
                            {formatCurrency(total)}
                          </td>
                          <td className="py-3 pl-2 text-left">
                            <button 
                              onClick={() => removeItem(item.id)}
                              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100">
              <button 
                onClick={addItem}
                className="flex items-center gap-2 text-indigo-600 font-bold text-sm hover:text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                إضافة بند جديد
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">الشروط والأحكام / ملاحظات</h3>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
              placeholder="أضف أي شروط خاصة بالدفع أو التسليم هنا..."
            />
          </div>
        </div>

        {/* Sidebar (Summary) */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg sticky top-6">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              ملخص العرض
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-slate-300">
                <span>الإجمالي الفرعي</span>
                <span className="font-mono" dir="ltr">{formatCurrency(totals.subTotal)}</span>
              </div>
              
              {totals.totalDiscount > 0 && (
                <div className="flex justify-between items-center text-rose-400">
                  <span>إجمالي الخصومات</span>
                  <span className="font-mono" dir="ltr">- {formatCurrency(totals.totalDiscount)}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center text-slate-300">
                <span>الإجمالي الخاضع للضريبة</span>
                <span className="font-mono" dir="ltr">{formatCurrency(totals.netTotal)}</span>
              </div>
              
              <div className="flex justify-between items-center text-slate-300 pb-4 border-b border-slate-700">
                <span>ضريبة القيمة المضافة (15%)</span>
                <span className="font-mono" dir="ltr">{formatCurrency(totals.totalVat)}</span>
              </div>
              
              <div className="flex justify-between items-center text-xl font-black text-white pt-2">
                <span>الإجمالي النهائي</span>
                <span className="font-mono text-emerald-400" dir="ltr">{formatCurrency(totals.grandTotal)}</span>
              </div>
            </div>

            {/* AI Insights */}
            <div className="mt-8 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl print-hidden">
              <div className="flex items-center justify-between gap-2 text-indigo-300 font-bold text-sm mb-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  المدقق الذكي (AI)
                </div>
                <button 
                  onClick={runAIAudit}
                  disabled={isAuditing}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  {isAuditing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'تدقيق العرض'}
                </button>
              </div>
              
              {auditResult ? (
                <div className="mt-3 text-sm text-indigo-100 bg-indigo-900/50 p-3 rounded-lg border border-indigo-500/30 leading-relaxed whitespace-pre-wrap">
                  {auditResult}
                </div>
              ) : (
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  انقر على "تدقيق العرض" ليقوم الذكاء الاصطناعي بمراجعة العرض والتأكد من صحة الضرائب وتناسق الأسعار.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
