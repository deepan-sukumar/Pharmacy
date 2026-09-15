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

function extractFromObject(obj) {
  if (!obj || typeof obj !== 'object') return null;
  
  // Direct property check
  let projectId = obj.project_id || obj.projectId;
  let clientEmail = obj.client_email || obj.clientEmail;
  let privateKey = obj.private_key || obj.privateKey;

  // Check nested properties (e.g. { firebase: { ... } }, { serviceAccount: { ... } }, etc.)
  if (!clientEmail || !privateKey) {
    for (const key of Object.keys(obj)) {
      const nested = obj[key];
      if (nested && typeof nested === 'object') {
        const found = extractFromObject(nested);
        if (found) return found;
      }
    }
  }

  if (clientEmail && privateKey) {
    return {
      projectId: projectId || 'pharm-b519f',
      clientEmail: String(clientEmail).trim(),
      privateKey: sanitizePrivateKey(privateKey)
    };
  }
  return null;
}

function parseServiceAccountJson(raw) {
  if (!raw) return null;
  let str = String(raw).trim();

  // 1. Strip UTF-8 BOM if present
  if (str.charCodeAt(0) === 0xFEFF) {
    str = str.slice(1).trim();
  }

  // 2. Strip outer quotes if entire env var is quoted
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }

  // Attempt A: Direct parse & unwrap nested stringified JSON up to 5 times
  let current = str;
  for (let i = 0; i < 5; i++) {
    try {
      const parsed = typeof current === 'string' ? JSON.parse(current) : current;
      if (typeof parsed === 'object' && parsed !== null) {
        const extracted = extractFromObject(parsed);
        if (extracted) return { source: `json-pass-${i+1}`, data: extracted };
      } else if (typeof parsed === 'string') {
        current = parsed.trim();
        if (current.includes('\\"')) {
          current = current.replace(/\\"/g, '"');
        }
        continue;
      }
    } catch (e) {
      if (typeof current === 'string' && current.includes('\\"')) {
        current = current.replace(/\\"/g, '"');
        continue;
      }
      break;
    }
  }

  // Attempt B: URL-decoded parse
  try {
    if (str.includes('%')) {
      const decodedUrl = decodeURIComponent(str);
      const parsed = JSON.parse(decodedUrl);
      const extracted = extractFromObject(parsed);
      if (extracted) return { source: 'url-decoded-json', data: extracted };
    }
  } catch (e) {}

  // Attempt C: Base64 decode (stripping internal whitespace/newlines)
  try {
    const cleanB64 = str.replace(/\s+/g, '');
    const decoded = Buffer.from(cleanB64, 'base64').toString('utf8').trim();
    if (decoded.startsWith('{') && decoded.endsWith('}')) {
      let b64Current = decoded;
      for (let i = 0; i < 3; i++) {
        try {
          const parsed = JSON.parse(b64Current);
          if (typeof parsed === 'object' && parsed !== null) {
            const extracted = extractFromObject(parsed);
            if (extracted) return { source: `base64-json-pass-${i+1}`, data: extracted };
          } else if (typeof parsed === 'string') {
            b64Current = parsed.trim();
          }
        } catch (err) {
          break;
        }
      }
    }
  } catch (e) {}

  // Attempt D: Fix unescaped control characters/newlines inside JSON string literal
  try {
    const fixedNewlines = str.replace(/[\r\n]+/g, '\\n');
    const parsed = JSON.parse(fixedNewlines);
    const extracted = extractFromObject(parsed);
    if (extracted) return { source: 'fixed-newlines-json', data: extracted };
  } catch (e) {}

  // Attempt E: Unescape escaped double quotes
  try {
    const unescapedQuotes = str.replace(/\\"/g, '"');
    const parsed = JSON.parse(unescapedQuotes);
    const extracted = extractFromObject(parsed);
    if (extracted) return { source: 'unescaped-quotes-json', data: extracted };
  } catch (e) {}

  // Attempt F: Fallback Regex extraction of client_email and private_key
  try {
    const emailMatch = str.match(/"client_email"\s*:\s*"([^"]+)"/i) || str.match(/'client_email'\s*:\s*'([^']+)'/i);
    const keyMatch = str.match(/"private_key"\s*:\s*"((?:[^"\\]|\\.)*)"/i) || str.match(/'private_key'\s*:\s*'((?:[^'\\]|\\.)*)'/i);
    const projMatch = str.match(/"project_id"\s*:\s*"([^"]+)"/i) || str.match(/'project_id'\s*:\s*'([^']+)'/i);
    if (emailMatch && keyMatch) {
      return {
        source: 'regex-extracted',
        data: {
          projectId: projMatch ? projMatch[1] : 'pharm-b519f',
          clientEmail: emailMatch[1].trim(),
          privateKey: sanitizePrivateKey(keyMatch[1])
        }
      };
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
        console.log(`✅ Firebase Admin SDK initialized successfully with FIREBASE_SERVICE_ACCOUNT (${parsed.source})`);
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
