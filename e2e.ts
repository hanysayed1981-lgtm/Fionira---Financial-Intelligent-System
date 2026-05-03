import * as XLSX from 'xlsx';
import { processUploadBatch } from './src/backend/core/ingestion-engine';
import { generateJournalEntries } from './src/backend/core/erp-engine';

async function uploadFile(fileName, data, moduleType) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const session = await processUploadBatch([{ buffer, name: fileName }], moduleType);
  const journalEntries = generateJournalEntries(session.records, moduleType).map(je => ({
      ...je, tenantId: 'dev_tenant_uuid', version: 1, isActive: true, sessionId: session.sessionId, fileId: fileName
  }));
  const recordsBatch = session.records.map(r => ({
      ...r, tenantId: 'dev_tenant_uuid', moduleType, sessionId: session.sessionId, fileId: fileName
  }));
  const filesUpload = [{
      id: fileName, fileName, uploadDate: new Date().toISOString(), recordCount: recordsBatch.length,
      moduleType, tenantId: 'dev_tenant_uuid', status: 'completed', size: buffer.byteLength
  }];

  const res = await fetch('http://localhost:3000/api/erp/dev/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer DEV_TOKEN' },
      body: JSON.stringify({
          records: recordsBatch, journalEntries, files: filesUpload,
          session: { ...session, tenantId: 'dev_tenant_uuid', moduleType, timestamp: new Date().toISOString() }
      })
  });
  if (!res.ok) { console.error('Failed sync', fileName, await res.text()); }
}

async function validate() {
  console.log('--- UPLOADING EXCEL SOURCES ---');
  await uploadFile('expenses.xlsx', [['Date', 'Invoice', 'Entity_Name', 'Total', 'VAT', 'Desc'], ['2023-01-01', 'E01', 'جرير', 150, 22.5, 'أدوات']], 'expenses');
  await uploadFile('revenues.xlsx', [['Date', 'Invoice', 'Entity_Name', 'Total', 'VAT', 'Desc'], ['2023-01-02', 'R01', 'المراعي', 5000, 750, 'توريد']], 'revenues');
  await uploadFile('payroll.xlsx', [['Employee', 'Job', 'Basic', 'Housing', 'GOSI', 'Net'], ['سالم', 'مدير', 10000, 2500, 1000, 11500]], 'payroll');

  await new Promise(r => setTimeout(r, 1000));

  console.log('--- DASHBOARD DATA ---');
  const dRes = await fetch('http://localhost:3000/api/erp/dashboard', { headers: { 'Authorization': 'Bearer DEV_TOKEN' }});
  const dJson = await dRes.json();
  console.log(JSON.stringify(dJson.data || dJson || 'FAIL').substring(0, 300));

  console.log('--- RAW JEs ---');
  const tRes = await fetch('http://localhost:3000/api/debug/journalEntries/raw', { headers: { 'Authorization': 'Bearer DEV_TOKEN' }});
  const tData = (await tRes.json()).data || [];
  console.log('JEs found:', tData.length, 'Modules:', [...new Set(tData.map(e=>e.moduleType))]);

  console.log('--- FILES ---');
  const fRes = await fetch('http://localhost:3000/api/erp/files', { headers: { 'Authorization': 'Bearer DEV_TOKEN' }});
  const fData = (await fRes.json()).data || [];
  console.log(fData.map(f => f.fileName + ' -> ' + f.moduleType));
  
  console.log('--- AUDIT RECORDS ---');
  const aRes = await fetch('http://localhost:3000/api/erp/records?moduleType=expenses', { headers: { 'Authorization': 'Bearer DEV_TOKEN' }});
  const aData = (await aRes.json()).data || [];
  console.log('Expenses Audit Records length:', aData.length);
}
validate().catch(console.error);
