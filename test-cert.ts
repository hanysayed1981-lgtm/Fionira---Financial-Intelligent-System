import admin from 'firebase-admin';
import serviceAccount from './firebase-service-account.json' assert { type: 'json' };
try {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount as admin.ServiceAccount) });
  console.log("Success");
} catch(e) {
  console.log("Failed:", e.message);
}
