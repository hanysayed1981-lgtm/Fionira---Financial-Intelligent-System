import * as XLSX from 'xlsx';
import { processUploadBatch } from './src/backend/core/ingestion-engine';
import { generateJournalEntries } from './src/backend/core/erp-engine';
import http from 'http';

async function run() {
  console.log("=== STARTING FULL INGESTION VALIDATION ===");
  // Reset DEV DB for clean output
  await fetch("http://localhost:3000/api/erp/dev/reset", { method: "POST" });

  // 1. Create a sample buffer
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Date", "Invoice", "Supplier", "Total", "VAT"],
    ["2023-01-01", "INV001", "شركة الاتصالات السعودية", 100, 15],
    ["2023-01-02", "INV002", "مكتبة جرير", 150, 22.5],
    ["2023-01-03", "INV003", "سوق جملة المواد الغذائية", 400, 60],
    ["2023-01-04", "INV004", "شركة المراعي", 500, 75],
    ["2023-01-05", "INV005", "مورد التغليف", 300, 45]
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  console.log("-> Processing uploaded file...");
  // 2. Run ingestion
  const batchResult = await processUploadBatch([{ buffer, name: 'sample_vendors.xlsx' }], 'expenses');
  const records = batchResult.records;

  console.log("-> Generating journal entries...");
  // 3. Generate JEs
  const journalEntries = generateJournalEntries(records, 'expenses');

  console.log("-> Sending data to database (/api/erp/dev/sync)...");
  // 4. Send to dev sync
  const postRes = await fetch("http://localhost:3000/api/erp/dev/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      records,
      journalEntries
    })
  });
  const postJson = await postRes.json();
  if(!postJson.success) {
      console.log("Failed to sync:", postJson);
  }

  // 5. Query Storage
  const debugRes = await fetch("http://localhost:3000/api/debug/journalEntries");
  const debugJson = await debugRes.json();

  console.log("\n---");
  console.log("YOU MUST EXECUTE AND SHOW REAL OUTPUT:");
  console.log("\n2. Return EXACT numbers:");
  console.log(`* recordsParsed: ${records.length}`);
  // classified means it has a category
  console.log(`* transactionsClassified: ${records.filter((r:any) => r.Category && r.Category !== 'غير محدد').length}`);
  console.log(`* journalEntriesCreated: ${journalEntries.length}`);
  console.log(`* journalEntriesStored: ${debugJson.count}`);
  
  if (journalEntries.length === 0) {
      console.log("\nCRITICAL ERROR: journalEntriesCreated = 0. Root cause likely in erp-engine moduleType mapping or missing required columns.");
      return;
  }

  console.log("\n3. Show RAW SAMPLE DATA:");
  console.log("A) Show 3 classified transactions:");
  records.slice(0, 3).forEach((r:any) => {
    console.log(`* description: ${r.Entity_Name}`);
    console.log(`  detected category: ${r.Category}`);
    console.log(`  amount: ${r.Taxable_Amount + (r.NonTaxable_Amount || 0)}`);
  });
  
  console.log("\nB) Show 5 journal entries:");
  journalEntries.slice(0, 5).forEach((je:any) => {
    console.log(`* debitAccount: ${je.debitAccount}`);
    console.log(`  creditAccount: ${je.creditAccount}`);
    console.log(`  amount: ${je.amount}`);
    console.log(`  source description: ${je.description}`);
  });

  console.log("\n4. VERIFY STORAGE:");
  console.log(`* Query devMemoryDb.journalEntries count: ${debugJson.count}`);
}

run().catch(console.error);
