import admin from 'firebase-admin';
import serviceAccount from './firebase-service-account.json' assert { type: 'json' };
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

console.log("FRONT PROJECT ID:", firebaseConfig.projectId);
console.log("ADMIN PROJECT ID:", serviceAccount.project_id);
console.log("PROJECT MATCH:", firebaseConfig.projectId === serviceAccount.project_id ? "YES" : "NO");
