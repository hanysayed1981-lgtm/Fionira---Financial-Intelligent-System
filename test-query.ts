const API_URL = 'http://localhost:3000';

async function runTest() {
  console.log("Fetching expenses data with ALL filter...");
  const res = await fetch(`${API_URL}/api/erp/files/ALL/data?moduleType=expenses`, { 
    headers: { 'Authorization': 'Bearer fake.token.for-dev-mode' } 
  });
  
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response Body:", text);
}

runTest().catch(console.error);
