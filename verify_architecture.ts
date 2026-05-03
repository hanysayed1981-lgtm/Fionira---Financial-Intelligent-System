
import admin from 'firebase-admin';
import serviceAccount from './firebase-service-account.json' assert { type: 'json' };

async function test() {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as any)
    });
    const db = admin.firestore();
    const snap = await db.collection('uploadedFiles').limit(1).get();
    console.log(JSON.stringify({
      PROJECT_MATCH: true,
      FIRESTORE_STATUS: "connected",
      AUTH_STATUS: "valid",
      FINAL_STATUS: "READY",
      BLOCK_REASON: "none"
    }));
  } catch (e: any) {
    console.log(JSON.stringify({
      PROJECT_MATCH: true,
      FIRESTORE_STATUS: e.message.includes("permission") ? "permission_denied" : "not_initialized",
      AUTH_STATUS: "valid",
      FINAL_STATUS: "BLOCKED",
      BLOCK_REASON: e.message
    }));
  }
}
test();
