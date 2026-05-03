import * as fs from 'fs';

const API_URL = 'http://localhost:3000';
const fakeToken = 'fake.token.for-dev-mode';

async function run() {
  console.log("==========================================");
  console.log("🔴 BACKEND DATA PROOF & ISOLATION PROOF 🔴");
  console.log("==========================================");
  
  await fetch(`${API_URL}/api/erp/dev/reset`, { method: 'POST' });

  const expFileId = "file-exp-A";
  await fetch(`${API_URL}/api/erp/dev/sync`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${fakeToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uploadedFiles: [ { id: expFileId, name: 'File A.xlsx', fileType: 'expenses', tenantId: 'test-user' } ],
      records: [ { id: 'rec-exp', fileId: expFileId, tenantId: 'test-user', Invoice_Number: 'INV-A1', Total_Amount: 1150 } ],
      skippedRows: [ { id: 'err-exp', fileId: expFileId, tenantId: 'test-user', index: 3, reason: 'Test Error in Expenses', rawData: { col1: 'A', col2: 0 } } ]
    })
  });
  
  const revFileId = "file-rev-B";
  await fetch(`${API_URL}/api/erp/dev/sync`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${fakeToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
       uploadedFiles: [ { id: revFileId, name: 'File B.xlsx', fileType: 'revenues', tenantId: 'test-user' } ],
       records: [ { id: 'rec-rev', fileId: revFileId, tenantId: 'test-user', Invoice_Number: 'REV-B1', Total_Amount: 5750 } ]
    })
  });

  const expDataRes = await fetch(`${API_URL}/api/erp/files/ALL/data?moduleType=expenses`, { headers: { 'Authorization': `Bearer ${fakeToken}` } });
  const expDataRaw = await expDataRes.json();
  const expData = expDataRaw.data?.data || expDataRaw.data || expDataRaw || [];
  
  console.log("\n[API RESPONSE: /api/erp/files/ALL/data?moduleType=expenses]");
  console.log(JSON.stringify(expData, null, 2));
  
  const revDataRes = await fetch(`${API_URL}/api/erp/files/ALL/data?moduleType=revenues`, { headers: { 'Authorization': `Bearer ${fakeToken}` } });
  const revDataRaw = await revDataRes.json();
  const revData = revDataRaw.data?.data || revDataRaw.data || revDataRaw || [];
  
  console.log("\n[API RESPONSE: /api/erp/files/ALL/data?moduleType=revenues]");
  console.log(JSON.stringify(revData, null, 2));

  console.log("\n--- VERIFICATION ---");
  console.log("❌ Does File B (Revenues) leak into Expenses API? ->", expData.records?.some((r: any) => r.fileId === revFileId));
  console.log("❌ Does File A (Expenses) leak into Revenues API? ->", revData.records?.some((r: any) => r.fileId === expFileId));

  console.log("\n==========================================");
  console.log("🔴 ERROR INSPECTOR PROOF 🔴");
  console.log("==========================================");
  console.log(JSON.stringify(expData.skippedRows, null, 2));

}

run().catch(console.error);
