async function verifyStartup() {
  console.log("Hitting API endpoints...");

  try {
    const healthRes = await fetch("http://localhost:3000/api/erp/health");
    const healthJson = await healthRes.json();
    console.log("HEALTH ENDPOINT RESPONSE:", JSON.stringify(healthJson, null, 2));

    const testRes = await fetch("http://localhost:3000/api/erp/test-read");
    const testJson = await testRes.json();
    console.log("TEST READ RESPONSE:", JSON.stringify(testJson, null, 2));
  } catch (e) {
    console.error("API Error:", e);
  }

  console.log("Server verification finished.");
}

verifyStartup();
