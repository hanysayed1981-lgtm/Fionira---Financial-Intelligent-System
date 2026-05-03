import * as fs from 'fs';
import * as XLSX from 'xlsx';

const API_URL = 'http://localhost:3000';

async function uploadFile(fileName: string, data: any[][], moduleType: string) {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  const blob = new Blob([buffer]);
  const formData = new FormData();
  formData.append('files', blob, fileName);
  formData.append('type', moduleType);
  
  const res = await fetch(`${API_URL}/api/erp/files/upload`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer fake.token.for-dev-mode' },
    body: formData as any
  });
  
  const text = await res.text();
  console.log("Upload HTTP status:", res.status);
  console.log("Upload Response:", text);
  return JSON.parse(text);
}

async function run() {
  console.log("--- TASK 1 & 4: MULTI-FILE SUPPORT AND DATA ISOLATION PROOF ---");
  
  // Clean db
  await fetch(`${API_URL}/api/erp/dev/reset`, { method: 'POST' });

  // Upload expenses
  console.log("Uploading File A to Expenses...");
  const expRes = await uploadFile('expenses.xlsx', [
    ['Date', 'Invoice', 'Supplier', 'Taxable', 'VAT', 'Total'],
    ['2023-01-01', 'INV-100', 'Supplier A', 1000, 150, 1150],
    ['2023-01-02', 'INV-101', 'Supplier B', 2000, 300, 2300],
    // Force an invalid row (Taxable 0, VAT 150) -> TASK 5 PRoof
    ['2023-01-03', 'INV-ERR', 'Supplier C', 0, 150, 150] 
  ], 'expenses');
  
  console.log("Expenses Upload Result:", expRes.success);
  
  // Upload revenues
  console.log("Uploading File B to Revenues...");
  const revRes = await uploadFile('revenues.xlsx', [
    ['Date', 'Invoice', 'Customer', 'Taxable', 'VAT', 'Total'],
    ['2023-02-01', 'REV-100', 'Customer X', 5000, 750, 5750],
    ['2023-02-02', 'REV-101', 'Customer Y', 6000, 900, 6900]
  ], 'revenues');
  
  console.log("Revenues Upload Result:", revRes.success);

  console.log("\n--- TASK 2: API RESPONSE PROOF ---");
  
  const allFilesRes = await fetch(`${API_URL}/api/erp/files`, { headers: { 'Authorization': 'Bearer fake.token.for-dev-mode' } });
  const allFiles = (await allFilesRes.json()).data;
  console.log("Total files in system:", allFiles.map((f:any) => ({ id: f.id, name: f.name, _type: f.fileType })));
  
  const expFile = allFiles.find((f:any) => f.fileType === 'expenses');
  const revFile = allFiles.find((f:any) => f.fileType === 'revenues');

  const expDataRes = await fetch(`${API_URL}/api/erp/files/${expFile?.id || 'ALL'}/data?moduleType=expenses`, { headers: { 'Authorization': 'Bearer fake.token.for-dev-mode' } });
  const expData = await expDataRes.json();
  
  console.log("\n[EXPENSES API RESPONSE]");
  console.log("Records Count:", expData.records?.length || 0);
  console.log("First Record:", JSON.stringify(expData.records?.[0] || {}));
  console.log("All record fileIds:", expData.records?.map((r:any) => r.fileId));
  
  const revDataRes = await fetch(`${API_URL}/api/erp/files/${revFile?.id || 'ALL'}/data?moduleType=revenues`, { headers: { 'Authorization': 'Bearer fake.token.for-dev-mode' } });
  const revData = await revDataRes.json();
  
  console.log("\n[REVENUES API RESPONSE]");
  console.log("Records Count:", revData.records?.length || 0);
  console.log("First Record:", JSON.stringify(revData.records?.[0] || {}));
  console.log("All record fileIds:", revData.records?.map((r:any) => r.fileId));

  console.log("\n[VERIFICATION]");
  console.log("Do expenses appear in revenues?", revData.records && expFile ? revData.records.some((r: any) => r.fileId === expFile.id) : false);
  console.log("Do revenues appear in expenses?", expData.records && revFile ? expData.records.some((r: any) => r.fileId === revFile.id) : false);

  console.log("\n--- TASK 5: ERROR INSPECTOR PROOF ---");
  console.log("Skipped Rows in Expenses (should have 1):", JSON.stringify(expData.skippedRows, null, 2));
  
}

run().catch(console.error);
