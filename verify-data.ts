import admin from 'firebase-admin';

async function verifyData() {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
    
    const db = admin.firestore();
    
    console.log("--- RAW DATABASE CHECK ---");
    const snapshot = await db.collection('uploadedFiles').limit(5).get();
    
    console.log("RAW DOC COUNT:", snapshot.size);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log("DOC ID:", doc.id);
      console.log("DOC DATA:", data);
      console.log("DOC TENANT:", data.tenantId);
    });
    
  } catch (error) {
    console.error("Error connecting to Firestore:", error);
  }
}

verifyData();
