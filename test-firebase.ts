import admin from 'firebase-admin';

try {
  if (!admin.apps.length) {
    admin.initializeApp();
    console.log('Firebase initialized successfully.');
  }
} catch (e) {
  console.error('Firebase initialization failed:', e);
}
