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

function normalizeServiceAccount(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const projectId = obj.project_id || obj.projectId || 'pharm-b519f';
  const clientEmail = obj.client_email || obj.clientEmail;
  let privateKey = obj.private_key || obj.privateKey;
  if (clientEmail && privateKey) {
    return {
      projectId,
      clientEmail: String(clientEmail).trim(),
      privateKey: sanitizePrivateKey(privateKey)
    };
  }
  return null;
}

function parseServiceAccountJson(raw) {
  if (!raw) return null;
  let str = String(raw).trim();
  
  // Remove wrapping quotes if the whole value was quoted in env var
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }

  // 1. Direct JSON parse
  try {
    const res = normalizeServiceAccount(JSON.parse(str));
    if (res) return { source: 'direct-json', data: res };
  } catch (e) {}

  // 2. Base64 decode then JSON parse
  try {
    const decoded = Buffer.from(str, 'base64').toString('utf8').trim();
    const res = normalizeServiceAccount(JSON.parse(decoded));
    if (res) return { source: 'base64-json', data: res };
  } catch (e) {}

  // 3. Unescape escaped double quotes (e.g. \"{\\\"type\\\":...}\")
  try {
    const unescaped = str.replace(/\\"/g, '"');
    const res = normalizeServiceAccount(JSON.parse(unescaped));
    if (res) return { source: 'unescaped-quotes-json', data: res };
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

    // 1. Check local serviceAccountKey.json file (for local development only)
    const keyFile = findServiceAccountKeyFile();
    if (keyFile) {
      try {
        const fileContent = fs.readFileSync(keyFile, 'utf8');
        const parsed = parseServiceAccountJson(fileContent);
        if (parsed && parsed.data) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: parsed.data.projectId,
              clientEmail: parsed.data.clientEmail,
              privateKey: parsed.data.privateKey,
            }),
          });
          db = admin.firestore();
          isConnected = true;
          activeCredentialSource = `file:${path.basename(keyFile)}`;
          initErrorMessage = null;
          console.log(`✅ Firebase Admin SDK initialized with file: ${keyFile}`);
          return true;
        }
      } catch (fileErr) {
        console.error(`⚠️ Failed to parse service account key file ${keyFile}:`, fileErr.message);
      }
    }

    // 2. Check JSON / Base64 environment variables (Vercel production)
    const envJsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT || 
                       process.env.FIREBASE_SERVICE_ACCOUNT_KEY || 
                       process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
                       process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ||
                       process.env.FIREBASE_CONFIG ||
                       process.env.FIREBASE_ADMIN_CREDENTIALS ||
                       (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_APPLICATION_CREDENTIALS.startsWith('{') ? process.env.GOOGLE_APPLICATION_CREDENTIALS : null);

    if (envJsonRaw) {
      const parsed = parseServiceAccountJson(envJsonRaw);
      if (parsed && parsed.data) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: parsed.data.projectId,
            clientEmail: parsed.data.clientEmail,
            privateKey: parsed.data.privateKey,
          }),
        });
        db = admin.firestore();
        isConnected = true;
        activeCredentialSource = 'FIREBASE_SERVICE_ACCOUNT';
        initErrorMessage = null;
        console.log('✅ Firebase Admin SDK initialized successfully with FIREBASE_SERVICE_ACCOUNT environment variable');
        return true;
      } else {
        initErrorMessage = `FIREBASE_SERVICE_ACCOUNT environment variable is present (length: ${envJsonRaw.length}) but could not be parsed as valid Service Account JSON.`;
        console.error('❌ ' + initErrorMessage);
        return false;
      }
    }

    // 3. Check individual environment variables
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
      activeCredentialSource = 'INDIVIDUAL_VARIABLES';
      initErrorMessage = null;
      console.log('✅ Firebase Admin SDK initialized with individual environment variables');
      return true;
    }

    initErrorMessage = 'No Firebase Admin credentials found in FIREBASE_SERVICE_ACCOUNT or serviceAccountKey.json. Please configure FIREBASE_SERVICE_ACCOUNT in Vercel environment variables.';
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

async function testFirestoreConnectivity() {
  if (!ensureConnected() || !db) {
    return {
      connected: false,
      readSuccess: false,
      errorReason: initErrorMessage || 'Cloud Firestore is not initialized.',
      credentialSource: activeCredentialSource
    };
  }
  try {
    const snapshot = await db.collection('settings').limit(1).get();
    return {
      connected: true,
      readSuccess: true,
      docsFound: snapshot.size,
      credentialSource: activeCredentialSource,
      errorReason: null
    };
  } catch (err) {
    return {
      connected: false,
      readSuccess: false,
      errorReason: err.message,
      credentialSource: activeCredentialSource
    };
  }
}

function getFirebaseStatus() {
  return {
    connected: isConnected && db !== null,
    projectId: 'pharm-b519f',
    credentialSource: activeCredentialSource,
    errorReason: isConnected ? null : (initErrorMessage || 'Cloud Firestore is not connected.'),
    envCheck: {
      hasServiceAccountEnv: Boolean(
        process.env.FIREBASE_SERVICE_ACCOUNT || 
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY || 
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON || 
        process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
      ),
      hasClientEmail: Boolean(process.env.FIREBASE_CLIENT_EMAIL || process.env.CLIENT_EMAIL),
      hasPrivateKey: Boolean(process.env.FIREBASE_PRIVATE_KEY || process.env.PRIVATE_KEY),
      hasProjectId: Boolean(process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT)
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
  getFirebaseStatus,
  testFirestoreConnectivity
};
