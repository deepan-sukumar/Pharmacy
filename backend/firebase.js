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
  return cleaned.replace(/\\n/g, '\n').replace(/\\r/g, '');
}

// Find possible locations of serviceAccountKey.json
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
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

// Built-in credentials for project pharm-b519f ensuring 24/7 standalone production operation
const DEFAULT_SERVICE_ACCOUNT = {
  projectId: 'pharm-b519f',
  clientEmail: 'firebase-adminsdk-fbsvc@pharm-b519f.iam.gserviceaccount.com',
  privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQCyRtN6sndvXLWP\nV6Ag7M86oWn7bf0+kGS1GpBsxS3ZoKM0uBVt734uT/PDKBfvmYFEJCWlqtsEk1FD\nJmg7jE64MVn8/s10vvVlzj0ihyTc/iELrZpCvhnIC5WEAukyCUDG1lj4xVP6uU99\nEqDW4sqeHQuAFt6YGljHWt3BoXYxNCEcjV2BMt+2jUfnWEvCv3nU0ihK+nEmzgXu\n1MJ0URhys1Q1UAPgBnYb/fmH9/vHAFjuUELB0SqzNnAzjzzKeUf/JMQwiAAtV+hi\nE0z/rdFA4WZxPEaNMXUTE32lxzWtmkEHVpxFrZrfWc09qfryDahIBCmtlF8f7woS\nUMGPE9LLAgMBAAECggEAF6qHUHZ4nHP2Nj0vqK9HI0ViSFplj/SjKdeI7KeQWp+U\nit8VGS791TAP8AxWgRwjqOQTi1aPFKBp3TwwAheyK4mBpLA+ngzrjsQ+IWNHZX7m\n7CHzpICP85p2ErxAMMBBtSOnU/7+Ev6eqr/aUixxMWQxrqNakV6OAojxf07r3cQQ\nzm8bD+dme4esMV0oUd/BfNdIEfDWM0grUIcTURojA6pSrIzcsOZiM5RE5B+bOhXl\nXZLcFphGN0U52f0wW0p6sG6o4Umuq/jf0yKViGxwMnHk5+TlXknVaZ46Vq58VDCi\nRU99CnfzzOy6Vp22nUdr9voNVYyRfjNuCZv6GKGDAQKBgQDsY1d+ItWjf/LH/D2d\n8qly6Y78pPaoFlM/89wV6SLWhgHuIzlP3LmTBfs+F5QolZbDne9sqShilCZoi1lH\ndnViVJTDzTaMcWG2Hip6geKqxJfR7egIB0nOgOBX0InQwCqTnOz5y8+uI8QrRlL6\nEwnGJ7VAq4qF8D7Sltg3Eq5+awKBgQDBEUDkdXqXHCzPdC+yqsXGDFBTg2JLl2m/\nfH1yCn2VrL3shL5F6RSI3oAwEb5bNKzOiEeZb/uelhMswYt1QVXCRS6fwcG9e/IV\nMVwIMTrUmS4sxAL+SEDCXVzQtVGM3f0zESS11tJSwPuzhd/ah70buqw88MxRoXpr\nl+UwEtRVIQKBgQDH7dmBCGtShpPLSu6+WQ+x7hIOYmNvlLpCe7joGy9o6xxU0hvW\nDOQzkjqFsKGRlbtWpYxrhcJvZcf6YelXxLvRN6I+3KDHNdojku3wgUw5jF6vohy+\nNZPaASw9eVYmZXFdObtAJn33Va7Dvw3NDi8VFl55XNyjHae0qvoh0j4dEwKBgQCN\nbBwCvWNNKWBRniQKVjmE9yQn6IeqI4FcuM4TKUgQyXZduGbAQxm9oG55x6WOnakv\nqHf6FyNTaU8ma6fB/lfZdF/Qulc2e4I6r+tgPN+BN6uxMuuWZEq7lTQV1Zuk+j8s\nlxQy9ucdoys8t4XgR6nok/bytNiVuxk3kw5ZBpHuwQKBgQDhxQ7O+oh6xYJQwHRn\n4Swazvh7vEf1JcrCztwB4MPkerEG/Q6sQZ9WA/2SaT42bb530hICSDAbq4RGZiS0\nDDk++Hoqwfg3XK6Jd1maQB+93M/jrKQfYzmqG0doo4QxWyh0aDPdyDt6G6OWnea0\nQu+XbH4I64II3DbsrtpbH2JDng==\n-----END PRIVATE KEY-----\n"
};

try {
  if (!admin.apps.length) {
    const keyFile = findServiceAccountKeyFile();
    const envAccount = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY || (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_APPLICATION_CREDENTIALS.startsWith('{') ? process.env.GOOGLE_APPLICATION_CREDENTIALS : null);

    if (keyFile) {
      const serviceAccount = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      db = admin.firestore();
      isConnected = true;
      console.log(`✅ Firebase Admin SDK initialized successfully with file: ${keyFile}`);
    } else if (envAccount) {
      const serviceAccount = parseServiceAccount(envAccount);
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
    } else if (DEFAULT_SERVICE_ACCOUNT.projectId && DEFAULT_SERVICE_ACCOUNT.privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: DEFAULT_SERVICE_ACCOUNT.projectId,
          clientEmail: DEFAULT_SERVICE_ACCOUNT.clientEmail,
          privateKey: sanitizePrivateKey(DEFAULT_SERVICE_ACCOUNT.privateKey),
        }),
      });
      db = admin.firestore();
      isConnected = true;
      console.log('✅ Firebase Admin SDK initialized successfully with production credentials for pharm-b519f');
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


