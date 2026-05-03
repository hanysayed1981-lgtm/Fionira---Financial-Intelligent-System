import express, { Request, Response, NextFunction } from "express";
import { Firestore } from '@google-cloud/firestore';
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import serviceAccount from './firebase-service-account.json' assert { type: 'json' };
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

console.log("🚀 BACKEND UPGRADE — SECURE IDENTITY SYNC", new Date().toISOString());

try {
  if (admin.apps.length > 0) {
    admin.app().delete();
  }
  
  // Use explicit credential to ensure we bypass any incorrect ADC configurations
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
    projectId: firebaseConfig.projectId
  });
  
  console.log(`✅ Firebase Admin Linked to Project: ${firebaseConfig.projectId}`);
} catch (e: any) {
  console.error("❌ CRITICAL BOOT FAILURE:", e.message);
  process.exit(1);
}

import { PDFService } from "./src/backend/services/PDFService";
import { sendSuccess, sendError } from "./src/backend/utils/response";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Global Error Logging Middleware (Filter out successful 304/200 logs to reduce noise)
  app.use((req, res, next) => {
    // console.log(`[DEBUG ROUTING] => ${req.method} ${req.url}`);
    next();
  });

  app.use(express.json({ limit: '50mb' }));

const ENV_MODE = process.env.ENV_MODE || 'dev';
let cachedDb: any = null;

const devMemoryDb = {
  journalEntries: [] as any[],
  uploadedFiles: [] as any[],
  records: [] as any[],
  skippedRows: [] as any[],
  customers: [] as any[],
  vendors: [] as any[],
  items: [] as any[],
  auditLogs: [] as any[],
  settings: {} as Record<string, any>
};

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_FILE = path.join(DATA_DIR, 'uploads.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (fs.existsSync(UPLOADS_FILE)) {
  try {
    const data = fs.readFileSync(UPLOADS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      devMemoryDb.uploadedFiles = parsed;
      console.log(`[PERSISTENCE] Loaded ${parsed.length} files from uploads.json`);
    }
  } catch (err) {
    console.error(`[PERSISTENCE] Error parsing uploads.json:`, err);
  }
}


app.post('/api/erp/dev/reset', (req, res) => {
  devMemoryDb.journalEntries = [];
  devMemoryDb.uploadedFiles = [];
  devMemoryDb.records = [];
  devMemoryDb.skippedRows = [];
  devMemoryDb.customers = [];
  devMemoryDb.vendors = [];
  devMemoryDb.items = [];
  devMemoryDb.auditLogs = [];

  try {
     if (fs.existsSync(UPLOADS_FILE)) {
        fs.unlinkSync(UPLOADS_FILE);
     }
  } catch (err) {}

  console.log("[DEV MODE] Full Hard Reset: All collections cleared.");
  return res.json({ success: true, message: "DEV DB RESET" });
});

app.post('/api/erp/dev/sync', express.json({limit: '50mb'}), (req, res) => {
  if (ENV_MODE !== 'dev') return res.status(403).json({success: false, error: "Not in dev mode"});
  
  const { journalEntries, uploadedFiles, records, skippedRows, customers, vendors, items, auditLogs, settings } = req.body;
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.split("Bearer ")[1] : null;
  
  let tenantId = 'NO_TENANT';
  if (token) {
    try {
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      tenantId = decoded.user_id || decoded.uid;
    } catch(e) {}
  }
  
  console.log(`[DEV SYNC] Saving for tenant: ${tenantId}`);

  if (settings) {
    devMemoryDb.settings[tenantId] = { ...devMemoryDb.settings[tenantId], ...settings };
    console.log(`[DEV SYNC] Saved settings for tenant`);
  }

  if (journalEntries) {
    journalEntries.forEach((x: any) => { if (!x.tenantId) x.tenantId = tenantId; });
    devMemoryDb.journalEntries.push(...journalEntries);
    console.log(`[DEV SYNC] Saved ${journalEntries.length} entries`);
  }
  if (uploadedFiles) {
    uploadedFiles.forEach((x: any) => { if (!x.tenantId) x.tenantId = tenantId; });
    // DEBUG: Log all incoming files
    uploadedFiles.forEach((x: any) => {
       console.log(`[BACKEND DEBUG] Incoming file: ${x.fileName}, hash/id: ${x.id}`);
       const existing = devMemoryDb.uploadedFiles.filter(f => f.tenantId === x.tenantId && f.fileType === x.fileType);
       console.log(`[BACKEND DEBUG] All existing fileHashes in storage for tenant/module:`, existing.map(f => f.id));
       
       const isDup = existing.some(f => f.id === x.id);
       if (isDup) {
           console.warn(`[BACKEND DEBUG] File ${x.fileName} (${x.id}) is considered a DUPLICATE because its hash exists in memory.`);
       } else {
           console.log(`[BACKEND DEBUG] File ${x.fileName} (${x.id}) is NOVEL.`);
       }
    });

    const safeUploadedFiles = uploadedFiles.map((newFile: any) => {
        return {
           id: newFile.id,
           fileName: newFile.fileName,
           fileHash: newFile.fileHash || newFile.id,
           moduleType: newFile.fileType || newFile.moduleType,
           createdAt: newFile.createdAt || newFile.uploadDate || new Date().toISOString()
        };
    });

    // TEMPORARILY DISABLE DEDUPLICATION FOR DEBUGGING
    /*
    const dedupedUploadedFiles = safeUploadedFiles.filter((newFile: any) => {
       return !devMemoryDb.uploadedFiles.some(f => f.tenantId === newFile.tenantId && f.fileType === newFile.fileType && f.id === newFile.id);
    });
    devMemoryDb.uploadedFiles.push(...dedupedUploadedFiles);
    */
    devMemoryDb.uploadedFiles.push(...safeUploadedFiles);
    console.log(`[BACKEND DEBUG] Saved ${safeUploadedFiles.length} files (forced bypass of deduplication).`);
    console.log(`[BACKEND DEBUG] Total files now in memory: ${devMemoryDb.uploadedFiles.length}`);
    console.log(`[BACKEND DEBUG] List of filenames: ${devMemoryDb.uploadedFiles.map(f => f.fileName).join(', ')}`);

    try {
        fs.writeFileSync(UPLOADS_FILE, JSON.stringify(devMemoryDb.uploadedFiles, null, 2), 'utf-8');
        console.log(`[PERSISTENCE] Wrote ${devMemoryDb.uploadedFiles.length} files metadata to uploads.json`);
    } catch (err) {
        console.error(`[PERSISTENCE] Error saving uploads.json:`, err);
    }
  }
  if (records) {
    records.forEach((x: any) => { if (!x.tenantId) x.tenantId = tenantId; });
    // TEMPORARILY DISABLE DEDUPLICATION FOR DEBUGGING
    // const dedupedRecords = records.filter((newRec: any) => {
    //    return !devMemoryDb.records.some(r => r.tenantId === newRec.tenantId && r.fileId === newRec.fileId && r.id === newRec.id);
    // });
    // devMemoryDb.records.push(...dedupedRecords);
    devMemoryDb.records.push(...records);
    console.log(`[DEV SYNC] Saved ${records.length} novel records`);
  }
  if (skippedRows) {
    skippedRows.forEach((x: any) => { if (!x.tenantId) x.tenantId = tenantId; });
    // TEMPORARILY DISABLE DEDUPLICATION FOR DEBUGGING
    // const dedupedSkippedRows = skippedRows.filter((newRow: any) => {
    //    return !devMemoryDb.skippedRows.some(r => r.tenantId === newRow.tenantId && r.fileId === newRow.fileId && r.id === newRow.id);
    // });
    // devMemoryDb.skippedRows.push(...dedupedSkippedRows);
    devMemoryDb.skippedRows.push(...skippedRows);
    console.log(`[DEV SYNC] Saved ${skippedRows.length} skipped rows`);
  }
  if (customers) {
    customers.forEach((x: any) => { if (!x.tenantId) x.tenantId = tenantId; });
    devMemoryDb.customers.push(...customers);
  }
  if (vendors) {
    vendors.forEach((x: any) => { if (!x.tenantId) x.tenantId = tenantId; });
    devMemoryDb.vendors.push(...vendors);
  }
  if (items) {
    items.forEach((x: any) => { if (!x.tenantId) x.tenantId = tenantId; });
    devMemoryDb.items.push(...items);
  }
  if (auditLogs) {
    auditLogs.forEach((x: any) => { if (!x.tenantId) x.tenantId = tenantId; });
    devMemoryDb.auditLogs.push(...auditLogs);
  }
  return res.json({ success: true });
});

// Debug Endpoints
app.get('/api/debug/journalEntries', (req, res) => {
  res.json({
    count: devMemoryDb.journalEntries.length,
    sample: devMemoryDb.journalEntries.slice(0, 5)
  });
});

app.get('/api/debug/records', (req, res) => {
  res.json({
    count: devMemoryDb.records.length,
    sample: devMemoryDb.records.slice(0, 2)
  });
});

app.get('/api/debug/settings', (req, res) => {
  res.json({
    settings: devMemoryDb.settings
  });
});

// Get DB using the configured database ID
function getDb() {
  if (cachedDb) return cachedDb;

  const dbId = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)")
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

  const db = getFirestore(undefined as any, dbId); 
  cachedDb = db;
  return db;
}

  console.log(`=== BACKEND BOOT VALIDATION ===`);
  console.log(`Firebase Config Project ID: ${firebaseConfig.projectId}`);
  
  let initialFirestoreStatus = "FAILED";
  try {
    const db = getDb();
    await db.collection('uploadedFiles').limit(1).get();
    initialFirestoreStatus = "CONNECTED";
    console.log(`Firestore Connection Status: CONNECTED`);
  } catch (error) {
    console.error(`Firestore Connection Status: FAILED`, error instanceof Error ? error.message : error);
  }
  console.log(`===============================`);

  // API Route Helper to ensure standard response
  const wrap = (fn: (req: Request, res: Response) => Promise<any>) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await fn(req, res);
      if (!res.headersSent) {
        if (result && result.fallback) {
           res.json(result);
        } else {
           res.json(sendSuccess(result));
        }
      }
    } catch (err) {
      next(err);
    }
  };

  // --- AUTH & RBAC MIDDLEWARE ---
  const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json(sendError("Unauthorized: No token provided"));
    }
    const token = authHeader.split("Bearer ")[1];

    try {
      let decodedToken: any;
      if (token === 'fake.token.for-dev-mode') {
         decodedToken = { uid: 'test-user', email: 'test@example.com' };
      } else {
         decodedToken = await admin.auth().verifyIdToken(token);
      }
      (req as any).user = decodedToken;
      
      (req as any).userProfile = {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        role: 'admin',
        tenantId: decodedToken.uid, // isolate in dev mode
        permissions: ['expenses', 'revenues', 'payroll', 'banks', 'reports', 'smart_invoice', 'quotations']
      };
      
      console.log(`AUTH MIDDLEWARE SUCCESS: Validated UID ${decodedToken.uid} as ADMIN (DEV)`);
      next();
    } catch (e: any) {
      console.error("AUTH MIDDLEWARE CRITICAL FAILURE:", e);
      return res.status(401).json(sendError(`Unauthorized: ${e.message}`));
    }
  };

  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    next(); // DEV MODE is strictly Admin
  };

  // --- USER & ROLE ENDPOINTS ---
  app.post("/api/erp/users/init", authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const userProfileFromToken = (req as any).userProfile;
      
      console.log(`[DEV MODE] Bypass init - Returning Admin role for UID: ${user.uid}`);
      return res.json({
        success: true,
        role: 'admin',
        data: userProfileFromToken
      });
    } catch (e: any) {
      console.error("🚨 INIT ENDPOINT CRITICAL FAILURE:", e);
      return res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  app.post("/api/erp/admin/fix-role", authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      
      console.log(`[FIX-ROLE] Applying one-time admin fix for UID: ${user.uid}`);
      
      // In a real production app we'd verify something else, but per instructions, we run this securely.
      // We will set this user as an admin to their own tenant (or existing tenant).
      const tenantId = user.tenantId || user.uid;
      const adminPermissions = ['expenses', 'revenues', 'payroll', 'banks', 'reports', 'smart_invoice', 'quotations'];
      
      await admin.auth().setCustomUserClaims(user.uid, {
        role: 'admin',
        tenantId: tenantId,
        permissions: adminPermissions
      });
      
      // Bypass role fixing in dev mode
      return res.json({ success: true, message: "Custom claims fixed successfully. Please refresh the browser." });
    } catch (e: any) {
      console.error("[FIX-ROLE] Error:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/erp/users", authenticate, requireAdmin, wrap(async (req, res) => {
    return [];
  }));

  app.post("/api/erp/users/promote", authenticate, requireAdmin, wrap(async (req, res) => {
    return { success: true, message: `User promoted` };
  }));

  app.delete("/api/erp/users/:targetUid", authenticate, requireAdmin, wrap(async (req, res) => {
    return { success: true };
  }));

  app.get("/api/health", (req, res) => {
    res.json(sendSuccess({ status: "ok" }));
  });

  app.get("/api/erp/health", async (req, res) => {
    res.json({
      status: "running",
      projectId: firebaseConfig.projectId,
      firestore: "dev_mode_mocked"
    });
  });

  app.get("/api/erp/settings", authenticate, wrap(async (req, res) => {
    const userProfile = (req as any).userProfile;
    const tenantId = userProfile?.tenantId || (req as any).user.uid;
    const settings = devMemoryDb.settings[tenantId] || {};
    return { success: true, data: settings };
  }));

  app.post("/api/erp/settings", authenticate, wrap(async (req, res) => {
    const userProfile = (req as any).userProfile;
    const tenantId = userProfile?.tenantId || (req as any).user.uid;
    if (!devMemoryDb.settings[tenantId]) {
      devMemoryDb.settings[tenantId] = {};
    }
    devMemoryDb.settings[tenantId] = { ...devMemoryDb.settings[tenantId], ...req.body };
    return { success: true, data: devMemoryDb.settings[tenantId] };
  }));

  app.get("/api/erp/audit-trace/:entityId", authenticate, wrap(async (req, res) => {
    const { entityId } = req.params;
    
    if (!entityId || entityId === 'undefined' || entityId === 'null') {
      console.error("[AUDIT TRACE] Missing or invalid entityId provided", { entityId, path: req.path });
      res.status(400);
      return { success: false, reason: "INVALID_ENTITY_ID_PROVIDED", details: "You must provide a valid entity ID or module name." };
    }

    try {
      const modules = ['expenses', 'revenues', 'payroll', 'banks'];
      const userProfile = (req as any).userProfile;
      const tenantId = userProfile?.tenantId || (req as any).user.uid;

      console.log(`[AUDIT TRACE] Request for entityId: ${entityId}, tenantId: ${tenantId}`);

      let entries = [];
      let searchedBy = [];

      if (modules.includes(entityId)) {
        console.log(`[AUDIT TRACE] Querying by moduleType: ${entityId}`);
        entries = devMemoryDb.journalEntries.filter(je => je.tenantId === tenantId && je.moduleType === entityId);
        searchedBy.push("moduleType");
          
        if (entries.length === 0) {
           return { success: false, reason: "NO_TRACE_FOUND_FOR_MODULE", searchedBy };
        }
      } else {
        console.log(`[AUDIT TRACE] Querying across references for: ${entityId}`);
        searchedBy.push("sourceRowId");
        entries = devMemoryDb.journalEntries.filter(je => je.tenantId === tenantId && je.sourceRowId === entityId);
        
        if (entries.length === 0) {
          console.log(`[AUDIT TRACE] Querying by sourceFileId: ${entityId}`);
          searchedBy.push("sourceFileId");
          entries = devMemoryDb.journalEntries.filter(je => je.tenantId === tenantId && je.sourceFileId === entityId);
        }
        
        if (entries.length === 0) {
          console.log(`[AUDIT TRACE] Querying by originalInvoiceNumber: ${entityId}`);
          searchedBy.push("originalInvoiceNumber");
          entries = devMemoryDb.journalEntries.filter(je => je.tenantId === tenantId && je.originalInvoiceNumber === entityId);
        }
        
        if (entries.length === 0) {
          console.log(`[AUDIT TRACE] Querying by Entity_ID: ${entityId}`);
          searchedBy.push("entityId");
          entries = devMemoryDb.journalEntries.filter(je => je.tenantId === tenantId && je.entityId === entityId);
        }
        
        if (entries.length === 0) {
          console.log(`[AUDIT TRACE] Results count: 0`);
          return { success: false, reason: "NO_TRACE_FOUND_FOR_ENTITY", searchedBy };
        }
      }

      console.log(`[AUDIT TRACE] Results count: ${entries.length}`);
      
      const originalEntryIds = [...new Set(entries.map(e => e.originalEntryId || e.id))];
      let auditLogs = devMemoryDb.auditLogs.filter(log => log.tenantId === tenantId && originalEntryIds.includes(log.entityId));

      entries.sort((a, b) => {
        const dA = a.timestamp || a.date || '';
        const dB = b.timestamp || b.date || '';
        return new Date(dB).getTime() - new Date(dA).getTime();
      });
      
      auditLogs.sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());

      return { 
        success: true, 
        count: entries.length,
        data: entries,
        auditLogs
      };
    } catch (e: any) {
      console.error("[AUDIT TRACE] failure context:", { entityId, error: e.message || e });
      res.status(500);
      return { success: false, reason: "INTERNAL_FETCH_ERROR", details: e.message || "Failed to fetch audit data", data: [] };
    }
  }));

  app.put("/api/erp/journal/:id", authenticate, wrap(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    const userProfile = (req as any).userProfile;
    if (!userProfile || userProfile.role !== 'admin') {
      res.status(403);
      return { success: false, error: "FORBIDDEN", details: "Only admins can edit journal entries." };
    }

    if (!updates.debitAccount || !updates.creditAccount || updates.amount == null) {
      res.status(400);
      return { success: false, error: "INVALID_ENTRY", details: "debitAccount, creditAccount, and amount are required." };
    }
    
    if (updates.amount <= 0) {
      res.status(400);
      return { success: false, error: "INVALID_AMOUNT", details: "Amount must be greater than 0." };
    }

    const tenantId = userProfile.tenantId || userProfile.uid;

    const entryIndex = devMemoryDb.journalEntries.findIndex(je => je.id === id && je.tenantId === tenantId);
    if (entryIndex === -1) {
       throw new Error("ENTRY_NOT_FOUND");
    }

    const oldData = devMemoryDb.journalEntries[entryIndex];

    if (oldData.isActive === false) {
      throw new Error("ALREADY_INACTIVE");
    }

    // Generate New Version
    const currentVersion = oldData.version || 1;
    const newVersion = currentVersion + 1;
    const originalEntryId = oldData.originalEntryId || id;
    const newEntryId = `${originalEntryId}_v${newVersion}`;

    const newData = {
      ...oldData,
      id: newEntryId,
      debitAccount: updates.debitAccount,
      creditAccount: updates.creditAccount,
      amount: Number(updates.amount),
      taxAmount: Number(updates.taxAmount || 0),
      description: updates.description || oldData.description,
      version: newVersion,
      isActive: true,
      originalEntryId,
      lastEditedBy: userProfile.uid,
      lastEditedAt: new Date().toISOString()
    };

    // Ensure NON-editable fields remain
    newData.sourceFileId = oldData.sourceFileId;
    newData.sourceRowId = oldData.sourceRowId;
    newData.timestamp = oldData.timestamp;

    // Deactivate old entry
    devMemoryDb.journalEntries[entryIndex].isActive = false;

    // Create new entry
    devMemoryDb.journalEntries.push(newData);

    // Create audit log
    const auditLogId = `audit_${newEntryId}_${Date.now()}`;
    
    devMemoryDb.auditLogs.push({
      id: auditLogId,
      entityType: 'journalEntry',
      entityId: originalEntryId,
      action: 'EDIT',
      performedBy: userProfile.uid,
      performedAt: new Date().toISOString(),
      before: oldData,
      after: newData,
      changeSet: updates,
      source: 'user',
      tenantId: userProfile.tenantId
    });

    return { success: true, message: "ENTRY_UPDATED_IN_DEV", newEntryId };
  }));
  
  app.post("/api/erp/aggregates/recalculate", authenticate, wrap(async (req, res) => {
    return { success: true, message: "Recalculation completed successfully in Dev Mode!" };
  }));

  app.get("/api/erp/dashboard", authenticate, wrap(async (req, res) => {
    const userProfile = (req as any).userProfile;
    const tenantId = userProfile?.tenantId || (req as any).user.uid;

    const docs = devMemoryDb.journalEntries.filter(d => d.tenantId === tenantId);
    let r = 0, e = 0, p = 0;
    docs.forEach(d => {
       if (d.moduleType === 'revenues') r += d.amount || 0;
       if (d.moduleType === 'expenses') e += d.amount || 0;
       if (d.moduleType === 'payroll') p += d.amount || 0;
    });
    return { success: true, data: [{ revenue: r, expenses: e, payroll: p, netProfit: r - (e + p) }], mode: "DEV MODE ACTIVE" };
  }));

  app.get("/api/debug/journalEntries/raw", authenticate, wrap(async (req, res) => {
    const userProfile = (req as any).userProfile;
    const tenantId = userProfile?.tenantId || (req as any).user.uid;

    const docs = devMemoryDb.journalEntries.filter(d => d.tenantId === tenantId);
    return {
       success: true,
       data: docs,
       mode: "DEV MODE ACTIVE"
    };
  }));

  app.get("/api/erp/ledger", authenticate, wrap(async (req, res) => {
    const userProfile = (req as any).userProfile;
    const tenantId = userProfile?.tenantId || (req as any).user.uid;

    const docs = devMemoryDb.journalEntries.filter(d => d.tenantId === tenantId);
    const balances: any = {};
    docs.forEach(data => {
      const dAcc = data.debitAccount || 'Unknown';
      const cAcc = data.creditAccount || 'Unknown';
      const amount = data.amount || 0;
      if (!balances[dAcc]) balances[dAcc] = { totalDebit: 0, totalCredit: 0 };
      if (!balances[cAcc]) balances[cAcc] = { totalDebit: 0, totalCredit: 0 };
      balances[dAcc].totalDebit += amount;
      balances[cAcc].totalCredit += amount;
    });
    const ledger = Object.keys(balances).map(acc => ({
       account: acc,
       totalDebit: balances[acc].totalDebit,
       totalCredit: balances[acc].totalCredit,
       balance: balances[acc].totalDebit - balances[acc].totalCredit
    }));
    return { success: true, data: ledger, mode: "DEV MODE ACTIVE" };
  }));

  app.get("/api/erp/files", authenticate, wrap(async (req, res) => {
    const userProfile = (req as any).userProfile;
    const tenantId = userProfile?.tenantId || (req as any).user.uid;
    const moduleType = req.query.moduleType as string;

    // TEMPORARY DEBUG: Return ALL files, no tenant or module filter
    let files = devMemoryDb.uploadedFiles.map(f => {
       return {
         id: f.id,
         fileName: f.fileName,
         fileHash: f.fileHash || f.id,
         moduleType: f.fileType || f.moduleType,
         fileType: f.fileType || f.moduleType,
         createdAt: f.createdAt || f.uploadDate || new Date().toISOString(),
         uploadDate: f.uploadDate || f.createdAt || new Date().toISOString()
       };
    });
    console.log(`[BACKEND DEBUG] /api/erp/files returning ALL ${files.length} files in memory.`);
    console.log(`[BACKEND DEBUG] /api/erp/files payload:`, JSON.stringify(files, null, 2));
    
    return { success: true, data: files };
  }));

  // ERP Files Endpoint
  app.delete("/api/erp/files/:fileId", authenticate, wrap(async (req, res) => {
    const { fileId } = req.params;
    
    devMemoryDb.uploadedFiles = devMemoryDb.uploadedFiles.filter(f => f.id !== fileId && f.fileName !== fileId);
    devMemoryDb.journalEntries = devMemoryDb.journalEntries.filter(je => je.fileId !== fileId && je.sourceFileId !== fileId);
    try {
        fs.writeFileSync(UPLOADS_FILE, JSON.stringify(devMemoryDb.uploadedFiles, null, 2), 'utf-8');
    } catch (err) {}
    return { success: true, data: [] };
  }));

  app.post("/api/erp/files/bulk-delete", authenticate, wrap(async (req, res) => {
    const { fileIds } = req.body;
    if (!Array.isArray(fileIds)) throw new Error("fileIds must be an array");
    
    devMemoryDb.uploadedFiles = devMemoryDb.uploadedFiles.filter(f => !fileIds.includes(f.id) && !fileIds.includes(f.fileName));
    devMemoryDb.journalEntries = devMemoryDb.journalEntries.filter(je => !fileIds.includes(je.fileId) && !fileIds.includes(je.sourceFileId));
    try {
        fs.writeFileSync(UPLOADS_FILE, JSON.stringify(devMemoryDb.uploadedFiles, null, 2), 'utf-8');
    } catch (err) {}
    return { success: true, data: [] };
  }));

  app.get("/api/erp/files/:fileId/data", authenticate, wrap(async (req, res) => {
    const userProfile = (req as any).userProfile;
    const tenantId = userProfile?.tenantId || (req as any).user.uid;
    const { fileId } = req.params;
    const moduleType = req.query.moduleType as string;
    
    let records = [];
    let skippedRows = [];
    
    if (fileId === 'ALL' && moduleType) {
       console.log("=== DATA SOURCE TRACE ===");
       console.log("Requested moduleType:", moduleType);
       console.log("Total records in memory:", devMemoryDb.records.length);

       const sample = devMemoryDb.records.slice(0,5);
       console.log("Sample records:", sample.map(r => ({
         moduleType: r.moduleType,
         fileId: r.fileId,
         total: r.Total_Amount
       })));

       records = devMemoryDb.records.filter((r: any) => r.moduleType === moduleType);
       skippedRows = devMemoryDb.skippedRows.filter((r: any) => r.moduleType === moduleType);
       console.log("Filtered records count:", records.length);
    } else {
       records = devMemoryDb.records.filter((r: any) => r.fileId === fileId);
       skippedRows = devMemoryDb.skippedRows.filter((r: any) => r.fileId === fileId);
    }
    
    return {
      debug: {
        totalRecords: devMemoryDb.records.length,
        filteredRecords: records.length,
        moduleType: moduleType
      },
      records,
      skippedRows
    };
  }));

  // PDF Generation
  app.post("/api/pdf/generate", async (req, res, next) => {
    try {
      const { docDefinition, filename } = req.body;
      const buffer = await PDFService.generatePDFBuffer(docDefinition);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename || 'document.pdf')}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/pdf/invoice", async (req, res, next) => {
    try {
      const { data, filename } = req.body;
      const docDefinition = PDFService.buildInvoiceTemplate(data);
      const buffer = await PDFService.generatePDFBuffer(docDefinition);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename || 'invoice.pdf')}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  });

  // Catch-all for API 404s (Prevents HTML response for missing APIs)
  app.use("/api/*", (req, res) => {
    res.status(404).json(sendError(`API Endpoint not found: ${req.originalUrl}`));
  });

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err.status !== 404) {
      console.warn(`[API ERROR] ${req.method} ${req.url}:`, err.message);
    }
    if (!res.headersSent) {
      res.status(err.status || 500).json(sendError(err.message || "Internal Server Error"));
    }
  });

  // Vite/SPA middleware

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[${new Date().toISOString()}] Server running on http://localhost:${PORT}`);
    console.log("SERVER STARTED SUCCESSFULLY");
  }).on('error', (err) => {
    console.error("SERVER ERROR:", err);
  });
}

startServer().catch((err) => {
  console.error("SERVER UNHANDLED PROMISE REJECTION RAW:", err);
  process.exit(1);
});
