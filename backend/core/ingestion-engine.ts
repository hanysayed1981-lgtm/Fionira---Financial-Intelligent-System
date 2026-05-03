import { processExpenses } from './processors/expenses-processor';
import { processRevenues } from './processors/revenues-processor';
import { processPayroll } from './processors/payroll-processor';
import { processBanks } from './processors/bank-processor';
import { processInventory } from './processors/inventory-processor';

export interface MasterData {
  customers: { id: string; name: string; type: 'customer'; balance: number }[];
  vendors: { id: string; name: string; type: 'vendor'; balance: number }[];
  items: { id: string; name: string; type: 'item' }[];
}

export interface IngestionSession {
  sessionId: string;
  files: string[];
  records: any[];
  skippedRows: any[];
  masterData: MasterData;
  debugTraces: any[];
}

export const processUploadBatch = async (
  files: { buffer: ArrayBuffer; name: string; fileHash?: string }[], 
  moduleType: 'expenses' | 'revenues' | 'payroll' | 'banks' | 'inventory',
  onProgress?: (msg: string) => void
): Promise<IngestionSession> => {
  const sessionId = crypto.randomUUID();
  let allRecords: any[] = [];
  let allSkipped: any[] = [];
  let allDebugTraces: any[] = [];
  
  const customers = new Map();
  const vendors = new Map();
  const items = new Map();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (onProgress) onProgress(`جاري معالجة ${file.name}...`);
    
    let result = { records: [], skipped: [], debugTrace: {}, columnMap: {} };
    try {
       if (moduleType === 'expenses') result = processExpenses(file.buffer, file.name) as any;
       else if (moduleType === 'revenues') result = processRevenues(file.buffer, file.name) as any;
       else if (moduleType === 'payroll') result = processPayroll(file.buffer, file.name) as any;
       else if (moduleType === 'banks') result = processBanks(file.buffer, file.name) as any;
       else if (moduleType === 'inventory') result = processInventory(file.buffer, file.name) as any;
    } catch (e: any) {
       console.error(`Error processing file ${file.name}:`, e);
       continue;
    }

    // fallback when processor doesn't return 'records'
    if (!result || !result.records) {
       continue;
    }

    const currentFileId = file.fileHash || file.name;
    allRecords = [...allRecords, ...result.records.map((r: any) => ({ ...r, sessionId, fileId: currentFileId }))];
    const skippedArr = result.skipped || [];
    allSkipped = [...allSkipped, ...skippedArr.map((s: any) => ({ ...s, sessionId, fileId: currentFileId, _sourceFile: file.name }))];
    
    if (result.debugTrace) {
        allDebugTraces.push(result.debugTrace);
    }

    // Build Master Data
    result.records.forEach((rec: any) => {
       const entityName = rec.Entity_Name || rec.Raw_Entity;
       if (entityName && entityName !== 'غير محدد') {
          if (moduleType === 'revenues') {
             if (!customers.has(entityName)) customers.set(entityName, { id: crypto.randomUUID(), name: entityName, type: 'customer', balance: 0 });
             rec.Entity_ID = customers.get(entityName).id;
             rec.Entity_Normalized_Name = entityName;
          } else if (moduleType === 'expenses') {
             if (!vendors.has(entityName)) vendors.set(entityName, { id: crypto.randomUUID(), name: entityName, type: 'vendor', balance: 0 });
             rec.Entity_ID = vendors.get(entityName).id;
             rec.Entity_Normalized_Name = entityName;
          } else if (moduleType === 'inventory') {
             if (!items.has(entityName)) items.set(entityName, { id: crypto.randomUUID(), name: entityName, type: 'item' });
             rec.Entity_ID = items.get(entityName).id;
             rec.Entity_Normalized_Name = entityName;
          } else {
             if (!vendors.has(entityName)) vendors.set(entityName, { id: crypto.randomUUID(), name: entityName, type: 'vendor', balance: 0 });
             rec.Entity_ID = vendors.get(entityName).id;
             rec.Entity_Normalized_Name = entityName;
          }
       } else {
          // If entity is completely unknown
          rec.Entity_ID = 'UNKNOWN_ENTITY';
          rec.Entity_Normalized_Name = 'UNKNOWN_ENTITY';
       }
    });
  }

  return {
    sessionId,
    files: files.map(f => f.name),
    records: allRecords,
    skippedRows: allSkipped,
    masterData: {
      customers: Array.from(customers.values()),
      vendors: Array.from(vendors.values()),
      items: Array.from(items.values())
    },
    debugTraces: allDebugTraces
  };
};
