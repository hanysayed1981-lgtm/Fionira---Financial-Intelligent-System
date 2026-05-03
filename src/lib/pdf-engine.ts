import { TDocumentDefinitions, Alignment } from 'pdfmake/interfaces';

const formatText = (text: string | null | undefined): string => {
  if (!text) return '';
  return String(text);
};


export interface InvoiceData {
  documentTitle?: string;
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  customerName: string;
  customerAddress?: string;
  customerTaxId?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    taxRate?: number;
    total: number;
  }>;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  notes?: string;
  companyName: string;
  companyDetails?: string;
}

const downloadPDF = async (docDefinition: TDocumentDefinitions, filename: string) => {
  try {
    const response = await fetch('/api/pdf/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ docDefinition, filename }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate PDF');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
};

export const generateInvoicePDFBackend = async (data: InvoiceData, filename: string) => {
  // Let the backend handle the details
  // Note: we might want to ensure the backend uses textDirection: 'rtl' if appropriate
  // but for now let's focus on the frontend triggered ones.
  try {
    const response = await fetch('/api/pdf/invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data, filename }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate PDF from backend');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading PDF from backend:', error);
    throw error;
  }
};

// ... exportReportPDF will be modified below, preserving Invoice generation locally if unused ...

export const generateInvoicePDF = async (data: InvoiceData, filename: string) => {
  const docDefinition: TDocumentDefinitions = {
    content: [
      {
        columns: [
          {
            text: data.companyName,
            style: 'header',
            alignment: 'right' as Alignment
          },
          {
            text: data.documentTitle || 'فاتورة ضريبية\nTAX INVOICE',
            style: 'header',
            alignment: 'left' as Alignment
          }
        ]
      },
      {
        text: data.companyDetails || '',
        style: 'subheader',
        alignment: 'right' as Alignment,
        margin: [0, 0, 0, 20]
      },
      {
        columns: [
          {
            text: [
              { text: 'معلومات العميل:\n', bold: true },
              `الاسم: ${data.customerName}\n`,
              data.customerAddress ? `العنوان: ${data.customerAddress}\n` : '',
              data.customerTaxId ? `الرقم الضريبي: ${data.customerTaxId}` : ''
            ],
            alignment: 'right' as Alignment
          },
          {
            text: [
              { text: 'تفاصيل الفاتورة:\n', bold: true },
              `رقم الفاتورة: ${data.invoiceNumber}\n`,
              `التاريخ: ${data.date}\n`,
              data.dueDate ? `تاريخ الاستحقاق: ${data.dueDate}` : ''
            ],
            alignment: 'left' as Alignment
          }
        ],
        margin: [0, 0, 0, 20]
      },
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto', 'auto', 'auto', '*'],
          body: [
            // Header
            [
              { text: 'الإجمالي', style: 'tableHeader', alignment: 'center' as Alignment },
              { text: 'الضريبة', style: 'tableHeader', alignment: 'center' as Alignment },
              { text: 'الخصم', style: 'tableHeader', alignment: 'center' as Alignment },
              { text: 'السعر', style: 'tableHeader', alignment: 'center' as Alignment },
              { text: 'الكمية', style: 'tableHeader', alignment: 'center' as Alignment },
              { text: 'الوصف', style: 'tableHeader', alignment: 'right' as Alignment }
            ],
            // Items
            ...data.items.map(item => [
              { text: item.total.toFixed(2), alignment: 'center' as Alignment },
              { text: `${item.taxRate || 0}%`, alignment: 'center' as Alignment },
              { text: item.discount ? item.discount.toFixed(2) : '0.00', alignment: 'center' as Alignment },
              { text: item.unitPrice.toFixed(2), alignment: 'center' as Alignment },
              { text: item.quantity.toString(), alignment: 'center' as Alignment },
              { text: item.description, alignment: 'right' as Alignment }
            ])
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 20]
      },
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 'auto',
            table: {
              widths: [100, 100],
              body: [
                [{ text: data.subtotal.toFixed(2), alignment: 'left' as Alignment }, { text: 'المجموع الفرعي:', alignment: 'right' as Alignment, bold: true }],
                [{ text: data.totalDiscount.toFixed(2), alignment: 'left' as Alignment }, { text: 'إجمالي الخصم:', alignment: 'right' as Alignment, bold: true }],
                [{ text: data.totalTax.toFixed(2), alignment: 'left' as Alignment }, { text: 'إجمالي الضريبة:', alignment: 'right' as Alignment, bold: true }],
                [{ text: data.grandTotal.toFixed(2), alignment: 'left' as Alignment, bold: true }, { text: 'الإجمالي المستحق:', alignment: 'right' as Alignment, bold: true }]
              ]
            },
            layout: 'noBorders'
          }
        ]
      },
      data.notes ? {
        text: [
          { text: '\nملاحظات:\n', bold: true },
          data.notes
        ],
        alignment: 'right' as Alignment,
        margin: [0, 20, 0, 0]
      } : ''
    ],
    defaultStyle: {
      font: 'Cairo',
      alignment: 'right' as Alignment
    },
    // @ts-ignore
    defaultTextDirection: 'rtl' as any,
    styles: {
      header: {
        fontSize: 22,
        bold: true,
        margin: [0, 0, 0, 10]
      },
      subheader: {
        fontSize: 14,
        color: '#666666'
      },
      tableHeader: {
        bold: true,
        fontSize: 12,
        color: 'black',
        fillColor: '#f3f4f6'
      }
    }
  };

  await downloadPDF(docDefinition, filename);
};

// Generic export for reports (fallback if needed, but structured is better)
export const exportReportPDF = async (title: string, contentData: any[][], headers: string[], filename: string) => {
  const docDefinition: TDocumentDefinitions = {
    pageOrientation: 'landscape',
    content: [
      { 
        text: formatText(title), 
        style: 'header', 
        alignment: 'center' as Alignment, 
        margin: [0, 0, 0, 10] 
      },
      {
        text: formatText(`تاريخ التصدير: ${new Date().toLocaleString('ar-SA')}`),
        style: 'subheader',
        alignment: 'center' as Alignment,
        margin: [0, 0, 0, 20]
      },
      {
        table: {
          headerRows: 1,
          widths: headers.map(() => 'auto'),
          body: [
            headers.map(h => ({ text: formatText(h), style: 'tableHeader', alignment: 'center' as Alignment })),
            ...contentData.map((row, index) => {
              const isLastRow = index === contentData.length - 1;
              return row.map((cell, cellIdx) => {
                const isLabel = isLastRow && cell?.toString() === 'الإجمالي الكلي';
                return { 
                  text: formatText(cell?.toString() || '-'), 
                  alignment: 'center' as Alignment,
                  style: isLabel ? 'totalRowLabel' : isLastRow ? 'totalRowValue' : ''
                };
              })
            })
          ]
        },
        layout: {
          hLineWidth: (i, node) => (i === 0 || i === node.table.body.length || i === 1) ? 2 : (i === node.table.body.length - 1) ? 2 : 1,
          vLineWidth: (i, node) => 0,
          hLineColor: (i, node) => (i === 0 || i === node.table.body.length || i === 1 || i === node.table.body.length - 1) ? '#1e293b' : '#e2e8f0',
          paddingLeft: (i) => 8,
          paddingRight: (i) => 8,
          paddingTop: (i) => 6,
          paddingBottom: (i) => 6,
          fillColor: (i, node) => {
            if (i === 0) return '#f8fafc';
            if (i === node.table.body.length - 1) return '#f1f5f9';
            return (i % 2 === 0) ? '#ffffff' : '#fafafa';
          }
        }
      }
    ],
    defaultStyle: {
      font: 'Cairo',
      alignment: 'center' as Alignment,
      fontSize: 10
    },
    // @ts-ignore
    defaultTextDirection: 'rtl' as any,
    styles: {
      header: { fontSize: 24, bold: true, color: '#0f172a' },
      subheader: { fontSize: 12, color: '#64748b' },
      tableHeader: { bold: true, fontSize: 11, color: '#334155' },
      totalRowLabel: { bold: true, fontSize: 13, color: '#0f172a' },
      totalRowValue: { bold: true, fontSize: 12, color: '#0ea5e9' }
    }
  };

  await downloadPDF(docDefinition, filename);
};

