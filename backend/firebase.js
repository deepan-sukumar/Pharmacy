const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let db = null;
let isConnected = false;

const keyPath = path.join(__dirname, 'serviceAccountKey.json');

try {
  if (!admin.apps.length) {
    if (fs.existsSync(keyPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      db = admin.firestore();
      isConnected = true;
      console.log('✅ Firebase Admin SDK initialized successfully with serviceAccountKey.json');
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      db = admin.firestore();
      isConnected = true;
      console.log('✅ Firebase Admin SDK initialized successfully with FIREBASE_SERVICE_ACCOUNT env');
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
      db = admin.firestore();
      isConnected = true;
      console.log('✅ Firebase Admin SDK initialized successfully with individual environment variables');
    } else {
      console.warn('⚠️ No serviceAccountKey.json found and no Firebase credentials in .env.');
    }
  } else {
    db = admin.firestore();
    isConnected = true;
  }
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error.message);
}

module.exports = {
  admin,
  db,
  isConnected: () => isConnected && db !== null,
};
