const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let db = null;
let isConnected = false;

function parseServiceAccount(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  try {
    // Try raw JSON parse
    return JSON.parse(trimmed);
  } catch (e1) {
    try {
      // Try base64 decoding
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (e2) {
      console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT as JSON or base64 JSON');
      return null;
    }
  }
}

function sanitizePrivateKey(key) {
  if (!key) return '';
  let cleaned = key.trim();
  // Remove wrapping quotes if present
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  // Replace literal '\n' or '\\n' with actual newlines
  return cleaned.replace(/\\n/g, '\n');
}

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
      const serviceAccount = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
      if (serviceAccount) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        db = admin.firestore();
        isConnected = true;
        console.log('✅ Firebase Admin SDK initialized successfully with FIREBASE_SERVICE_ACCOUNT env');
      }
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: sanitizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
        }),
      });
      db = admin.firestore();
      isConnected = true;
      console.log('✅ Firebase Admin SDK initialized successfully with individual environment variables');
    } else {
      console.warn('⚠️ No serviceAccountKey.json found and no Firebase credentials in environment.');
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
