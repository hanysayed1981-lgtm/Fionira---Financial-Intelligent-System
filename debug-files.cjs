const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  try {
    const snap = await db.collection('uploadedFiles').get();
    console.log(`FOUND ${snap.size} FILES`);
    snap.forEach(doc => {
      console.log(`ID: ${doc.id}`);
      console.log(`TENANT_ID: ${doc.data().tenantId}`);
      console.log(`FILE_TYPE: ${doc.data().fileType}`);
      console.log(`FILE_NAME: ${doc.data().fileName}`);
      console.log("-------------------");
    });
  } catch (e) {
    console.error(e);
  }
}
run();
