import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfmake = require('pdfmake');
import { TDocumentDefinitions, Alignment } from 'pdfmake/interfaces';
import path from 'path';

// We configure fonts here in the backend service
const fonts = {
  Roboto: {
    normal: path.join(process.cwd(), 'node_modules/@expo-google-fonts/cairo/400Regular/Cairo_400Regular.ttf'),
    bold: path.join(process.cwd(), 'node_modules/@expo-google-fonts/cairo/700Bold/Cairo_700Bold.ttf'),
    italics: path.join(process.cwd(), 'node_modules/@expo-google-fonts/cairo/400Regular/Cairo_400Regular.ttf'),
    bolditalics: path.join(process.cwd(), 'node_modules/@expo-google-fonts/cairo/700Bold/Cairo_700Bold.ttf')
  },
  Cairo: {
    normal: path.join(process.cwd(), 'node_modules/@expo-google-fonts/cairo/400Regular/Cairo_400Regular.ttf'),
    bold: path.join(process.cwd(), 'node_modules/@expo-google-fonts/cairo/700Bold/Cairo_700Bold.ttf'),
    italics: path.join(process.cwd(), 'node_modules/@expo-google-fonts/cairo/400Regular/Cairo_400Regular.ttf'),
    bolditalics: path.join(process.cwd(), 'node_modules/@expo-google-fonts/cairo/700Bold/Cairo_700Bold.ttf')
  }
};

pdfmake.fonts = fonts;

export class PDFService {
  /**
   * Generates a PDF buffer from a document definition
   */
  static async generatePDFBuffer(docDefinition: TDocumentDefinitions): Promise<Buffer> {
    try {
      const pdf = pdfmake.createPdf(docDefinition);
      const buffer = await pdf.getBuffer();
      return buffer;
    } catch (error) {
      console.error("PDF generation error:", error);
      throw error;
    }
  }

  /**
   * Standardized Invoice Template
   */
  static buildInvoiceTemplate(data: any): TDocumentDefinitions {
    return {
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
              ...data.items.map((item: any) => [
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
      // @ts-ignore - Supported by pdfmake internally
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
  }
}
