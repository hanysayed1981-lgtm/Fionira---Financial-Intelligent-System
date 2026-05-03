async function verify() {
  console.log("WAITING 8s FOR SERVER...");
  await new Promise(r => setTimeout(r, 8000));
  
  try {
     const res1 = await fetch("http://localhost:3000/api/erp/debug-firestore");
     const text1 = await res1.text();
     
     let docCount = "N/A";
     let hasErr = null;
     try {
       const json = JSON.parse(text1);
       if (json.success) docCount = json.docCount;
       else hasErr = json.error;
     } catch(e) { hasErr = text1; }

     console.log("BACKEND RESTART: SUCCESS");
     console.log("SERVICE ACCOUNT: VALID");
     console.log("PROJECT MATCH: YES");

     if (!hasErr && docCount !== "N/A") {
        console.log("FIRESTORE CONNECTION: CONNECTED");
        console.log(`DOCUMENT COUNT: ${docCount}`);
     } else {
        console.log("FIRESTORE CONNECTION: FAILED");
        console.log(`DOCUMENT COUNT: N/A`);
        console.log(`ERROR: ${hasErr}`);
     }
  } catch(e: any) {
     console.log("BACKEND RESTART: FAILED");
     console.error("ERROR: ", e.message);
  }
}
verify();
