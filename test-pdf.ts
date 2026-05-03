import { PDFService } from "./src/backend/services/PDFService";
import fs from "fs";

async function test() {
  try {
    console.log("Creating doc...");
    const data = {
      companyName: 'Test Company',
      invoiceNumber: 'INV-123',
      date: '2023-01-01',
      customerName: 'Test Customer',
      items: [
        { description: 'Item 1', quantity: 1, unitPrice: 100, total: 100 }
      ],
      subtotal: 100,
      totalDiscount: 0,
      totalTax: 15,
      grandTotal: 115
    };
    const docDef = PDFService.buildInvoiceTemplate(data);
    console.log("Generating buffer...");
    const buffer = await PDFService.generatePDFBuffer(docDef);
    console.log("Buffer created:", buffer.length, "bytes");
  } catch (e) {
    console.error("PDF ERROR:", e);
  }
}
test();
