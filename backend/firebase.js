const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let db = null;
let isConnected = false;
let initErrorMessage = null;
let activeCredentialSource = null;

function sanitizePrivateKey(key) {
  if (!key) return '';
  let cleaned = String(key).trim();
  // Remove wrapping single or double quotes
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  // Replace literal '\n' and '\\n' with real newline characters
  return cleaned
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

function parseServiceAccountJson(raw) {
  if (!raw) return null;
  let str = String(raw).trim();
  // Remove wrapping quotes if present
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }
  // Attempt 1: Direct JSON parse
  try {
    const obj = JSON.parse(str);
    if (obj && (obj.project_id || obj.projectId) && (obj.private_key || obj.privateKey)) {
      return obj;
    }
  } catch (e) {}

  // Attempt 2: Base64 decode then JSON parse
  try {
    const decoded = Buffer.from(str, 'base64').toString('utf8').trim();
    const obj = JSON.parse(decoded);
    if (obj && (obj.project_id || obj.projectId) && (obj.private_key || obj.privateKey)) {
      return obj;
    }
  } catch (e) {}

  // Attempt 3: Fix escaped newlines inside JSON string
  try {
    const unescaped = str.replace(/\\n/g, '\n');
    const obj = JSON.parse(unescaped);
    if (obj && (obj.project_id || obj.projectId)) {
      return obj;
    }
  } catch (e) {}

  return null;
}

function findServiceAccountKeyFile() {
  const candidates = [
    path.join(__dirname, 'serviceAccountKey.json'),
    path.join(__dirname, '..', 'serviceAccountKey.json'),
    path.join(process.cwd(), 'serviceAccountKey.json'),
    path.join(process.cwd(), 'backend', 'serviceAccountKey.json'),
  ];
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_APPLICATION_CREDENTIALS.startsWith('{')) {
    candidates.unshift(path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS));
  }
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return p;
      }
    } catch (e) {}
  }
  return null;
}

function initFirebase() {
  if (isConnected && db !== null) {
    return true;
  }

  try {
    if (admin.apps.length > 0) {
      db = admin.firestore();
      isConnected = true;
      initErrorMessage = null;
      return true;
    }

    // 1. Try local serviceAccountKey.json file
    const keyFile = findServiceAccountKeyFile();
    if (keyFile) {
      try {
        const fileContent = fs.readFileSync(keyFile, 'utf8');
        const serviceAccount = JSON.parse(fileContent);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        db = admin.firestore();
        isConnected = true;
        activeCredentialSource = `file:${path.basename(keyFile)}`;
        initErrorMessage = null;
        console.log(`✅ Firebase Admin SDK initialized with file: ${keyFile}`);
        return true;
      } catch (fileErr) {
        console.error(`⚠️ Failed to parse service account key file ${keyFile}:`, fileErr.message);
      }
    }

    // 2. Try JSON / Base64 environment variables (FIREBASE_SERVICE_ACCOUNT, FIREBASE_SERVICE_ACCOUNT_KEY, FIREBASE_SERVICE_ACCOUNT_BASE64)
    const envJsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT || 
                       process.env.FIREBASE_SERVICE_ACCOUNT_KEY || 
                       process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ||
                       (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_APPLICATION_CREDENTIALS.startsWith('{') ? process.env.GOOGLE_APPLICATION_CREDENTIALS : null);

    if (envJsonRaw) {
      const serviceAccount = parseServiceAccountJson(envJsonRaw);
      if (serviceAccount) {
        if (serviceAccount.private_key) {
          serviceAccount.private_key = sanitizePrivateKey(serviceAccount.private_key);
        }
        if (serviceAccount.privateKey) {
          serviceAccount.privateKey = sanitizePrivateKey(serviceAccount.privateKey);
        }
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        db = admin.firestore();
        isConnected = true;
        activeCredentialSource = 'env:FIREBASE_SERVICE_ACCOUNT';
        initErrorMessage = null;
        console.log('✅ Firebase Admin SDK initialized successfully with FIREBASE_SERVICE_ACCOUNT environment variable');
        return true;
      } else {
        initErrorMessage = 'FIREBASE_SERVICE_ACCOUNT environment variable is present but could not be parsed as valid JSON/Base64';
        console.error('❌ ' + initErrorMessage);
      }
    }

    // 3. Try individual environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT || 'pharm-b519f';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY || process.env.PRIVATE_KEY;

    if (clientEmail && privateKeyRaw) {
      const privateKey = sanitizePrivateKey(privateKeyRaw);
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      db = admin.firestore();
      isConnected = true;
      activeCredentialSource = 'env:INDIVIDUAL_VARIABLES';
      initErrorMessage = null;
      console.log('✅ Firebase Admin SDK initialized with individual environment variables');
      return true;
    }

    // 4. Try Google Application Default Credentials
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: projectId
      });
      db = admin.firestore();
      isConnected = true;
      activeCredentialSource = 'gcp:applicationDefault';
      initErrorMessage = null;
      console.log('✅ Firebase Admin SDK initialized with Google Application Default Credentials');
      return true;
    } catch (adcErr) {
      // ADC not available outside GCP
    }

    initErrorMessage = initErrorMessage || 'No Firebase Admin credentials found in serviceAccountKey.json or environment variables (FIREBASE_SERVICE_ACCOUNT / FIREBASE_PRIVATE_KEY).';
    console.warn(`⚠️ ${initErrorMessage}`);
    return false;
  } catch (err) {
    initErrorMessage = err.message;
    console.error('❌ Error initializing Firebase Admin SDK:', err.message);
    return false;
  }
}

// Run initial attempt on module load
initFirebase();

function ensureConnected() {
  if (isConnected && db !== null) return true;
  return initFirebase();
}

function getFirebaseStatus() {
  return {
    connected: isConnected && db !== null,
    projectId: 'pharm-b519f',
    credentialSource: activeCredentialSource,
    errorReason: isConnected ? null : (initErrorMessage || 'Cloud Firestore is not connected.'),
    envCheck: {
      hasServiceAccountEnv: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT_BASE64),
      hasClientEmail: Boolean(process.env.FIREBASE_CLIENT_EMAIL || process.env.CLIENT_EMAIL),
      hasPrivateKey: Boolean(process.env.FIREBASE_PRIVATE_KEY || process.env.PRIVATE_KEY),
      hasProjectId: Boolean(process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT),
      hasGoogleAppCreds: Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    }
  };
}

module.exports = {
  admin,
  get db() {
    ensureConnected();
    return db;
  },
  isConnected: () => ensureConnected(),
  ensureConnected,
  getFirebaseStatus
};
