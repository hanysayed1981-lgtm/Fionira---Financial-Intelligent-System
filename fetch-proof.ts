import * as fs from 'fs';

const API_URL = 'http://localhost:3000';

async function run() {
  // Push directly to dev/sync
  console.log("Resetting DB...");
  await fetch(`${API_URL}/api/erp/dev/reset`, { method: 'POST' });

  const payload = {
    records: [
      { id: "r1", fileId: "file_exp", moduleType: "expenses", Total_Amount: 1000, tenantId: "test-user" },
      { id: "r2", fileId: "file_rev", moduleType: "revenues", Total_Amount: 2000, tenantId: "test-user" }
    ],
    skippedRows: [],
    uploadedFiles: [
      { id: "file_exp", fileName: "expenses.xlsx", moduleType: "expenses", tenantId: "test-user" },
      { id: "file_rev", fileName: "revenues.xlsx", moduleType: "revenues", tenantId: "test-user" }
    ]
  };

  console.log("Syncing mock data...");
  const syncRes = await fetch(`${API_URL}/api/erp/dev/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.log("Sync Response:", await syncRes.text());

  // Fetch from the endpoint
  console.log("\nFetching expenses...");
  const expRes = await fetch(`${API_URL}/api/erp/files/ALL/data?moduleType=expenses`, {
    headers: { 'Authorization': 'Bearer fake.token.for-dev-mode' }
  });
  console.log("Expenses Response:", await expRes.text());
}

run().catch(console.error);
