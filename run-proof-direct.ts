import * as fs from 'fs';

const API_URL = 'http://localhost:3000';
const fakeToken = 'fake.token.for-dev-mode';

async function run() {
  console.log("--- TASKS: DATA ISOLATION PROOF ---");
  
  // Clean db
  await fetch(`${API_URL}/api/erp/dev/reset`, { method: 'POST' });

  // Upload expenses
  console.log("Simulating File A to Expenses...");
  const expFileId = "file-exp-123";
  const expSyncRes = await fetch(`${API_URL}/api/erp/dev/sync`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${fakeToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uploadedFiles: [
        { id: expFileId, name: 'expenses.xlsx', fileType: 'expenses', tenantId: 'test-user' }
      ],
      records: [
        { id: 'rec-1', fileId: expFileId, tenantId: 'test-user', Invoice_Number: 'INV-100', Total_Amount: 1150 }
      ],
      skippedRows: [
        { id: 'err-1', fileId: expFileId, tenantId: 'test-user', index: 3, reason: 'Test Error', rawData: ['A', 'B'] }
      ]
    })
  });
  console.log("Expenses sync res:", await expSyncRes.json());
  
  // Upload revenues
  console.log("Simulating File B to Revenues...");
  const revFileId = "file-rev-456";
  const revSyncRes = await fetch(`${API_URL}/api/erp/dev/sync`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${fakeToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
       uploadedFiles: [
           { id: revFileId, name: 'revenues.xlsx', fileType: 'revenues', tenantId: 'test-user' }
       ],
       records: [
           { id: 'rec-2', fileId: revFileId, tenantId: 'test-user', Invoice_Number: 'REV-100', Total_Amount: 5750 }
       ]
    })
  });
  console.log("Revenues sync res:", await revSyncRes.json());
  
  const allFilesRes = await fetch(`${API_URL}/api/erp/files`, { headers: { 'Authorization': `Bearer ${fakeToken}` } });
  const allFilesJson = await allFilesRes.json();
  const allFiles = (allFilesJson.data?.data ? allFilesJson.data.data : allFilesJson.data) || []; 
  console.log("\nTotal files in system:", allFiles.map((f:any) => ({ id: f.id, name: f.name, _type: f.fileType })));

  const expDataRes = await fetch(`${API_URL}/api/erp/files/ALL/data?moduleType=expenses`, { headers: { 'Authorization': `Bearer ${fakeToken}` } });
  const expDataJson = await expDataRes.json();
  const expData = expDataJson.data?.data || expDataJson.data || expDataJson; 
  
  console.log("\n[EXPENSES API RESPONSE]");
  console.log(JSON.stringify(expData, null, 2));
  
  const revDataRes = await fetch(`${API_URL}/api/erp/files/ALL/data?moduleType=revenues`, { headers: { 'Authorization': `Bearer ${fakeToken}` } });
  const revDataJson = await revDataRes.json();
  const revData = revDataJson.data?.data || revDataJson.data || revDataJson; 
  
  console.log("\n[REVENUES API RESPONSE]");
  console.log(JSON.stringify(revData, null, 2));

  console.log("\n[VERIFICATION]");
  console.log("Do expenses appear in revenues?", revData.records.some((r: any) => r.fileId === expFileId));
  console.log("Do revenues appear in expenses?", expData.records.some((r: any) => r.fileId === revFileId));

  console.log("\n--- TASK 5: ERROR INSPECTOR PROOF ---");
  console.log("Skipped Rows in Expenses (should have 1):", JSON.stringify(expData.skippedRows, null, 2));
  
}

run().catch(console.error);
