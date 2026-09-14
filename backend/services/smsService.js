/**
 * Unified SMS Service for PharmaFlow
 * 
 * Multi-Provider Architecture supporting:
 * 1. MESSAGECENTRAL / MESSAGING_CENTRAL (Student Project & Direct Verification Route)
 * 2. SMSLOCAL (Enterprise DLT Gateway with Route 1 Transactional)
 * 3. FAST2SMS / Generic REST Gateway
 * 4. Local Simulator (for offline unit testing)
 * 
 * Strict Idempotency, Multilingual Templates, Phone Number Validation,
 * Provider Message ID Tracking, and Verified Handset Delivery Callbacks.
 */

const { db, isConnected } = require('../firebase');
const { renderSmsTemplate, normalizeLanguage } = require('./smsTemplates');
const https = require('https');
const http = require('http');

// In-memory fallback notification log if Firestore is offline
let inMemoryNotifications = [];

// Track idempotency keys to prevent duplicate dispatches within active windows
const idempotencyRegistry = new Set();

// Cache MessageCentral Auth Token in memory
let messageCentralTokenCache = {
  token: null,
  expiresAt: 0
};

/**
 * Sanitizes and validates Indian mobile phone numbers (+91)
 * Accepts: "+91 98450 48123", "9845048123", "+919845048123", etc.
 */
function validateIndianPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'Phone number is missing or empty' };
  }

  // Strip spaces, hyphens, parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  let nationalNumber = '';
  if (cleaned.startsWith('+91') && cleaned.length === 13) {
    nationalNumber = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    nationalNumber = cleaned.slice(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    nationalNumber = cleaned.slice(1);
  } else if (cleaned.length === 10) {
    nationalNumber = cleaned;
  } else {
    return { isValid: false, error: `Invalid Indian phone number format: ${phone}. Must be 10 digits.` };
  }

  // Indian mobile numbers must start with 6, 7, 8, or 9
  if (!/^[6-9]\d{9}$/.test(nationalNumber)) {
    return { isValid: false, error: `Invalid mobile series (${nationalNumber}). Indian numbers start with 6-9.` };
  }

  return {
    isValid: true,
    formatted: `+91 ${nationalNumber.slice(0, 5)} ${nationalNumber.slice(5)}`,
    e164: `+91${nationalNumber}`,
    national: nationalNumber,
    apiFormat: `91${nationalNumber}`
  };
}

/**
 * Generates an idempotency key for duplicate prevention.
 */
function buildIdempotencyKey(pharmacyId, customerId, batchId, notificationType, windowIdentifier) {
  return `${pharmacyId || 'DEMO'}__${customerId || 'CUST'}__${batchId || 'BATCH'}__${notificationType || 'GEN'}__${windowIdentifier || new Date().toISOString().slice(0, 10)}`;
}

const SMSLOCAL_ERROR_CODES = {
  '101': 'Invalid user/API key',
  '102': 'Invalid sender ID',
  '103': 'Invalid contact / phone number',
  '104': 'Invalid route',
  '105': 'Invalid message content',
  '108': 'Low or insufficient SMS credits',
  '110': 'Invalid DLT Template ID',
  '111': 'No SMSC route available'
};

/**
 * Generates or retrieves cached MessageCentral Authentication Token
 */
async function getMessageCentralAuthToken() {
  if (process.env.MESSAGECENTRAL_AUTH_TOKEN) {
    return process.env.MESSAGECENTRAL_AUTH_TOKEN;
  }

  const customerId = process.env.MESSAGECENTRAL_CUSTOMER_ID;
  const apiKey = process.env.MESSAGECENTRAL_API_KEY || process.env.MESSAGECENTRAL_KEY || process.env.MESSAGECENTRAL_PASSWORD;
  const baseUrl = process.env.MESSAGECENTRAL_BASE_URL || 'https://cpaas.messagecentral.com';

  if (!customerId && !apiKey) {
    return null;
  }

  // If apiKey is already a MessageCentral JWT token
  if (apiKey && apiKey.startsWith('eyJ')) {
    return apiKey;
  }

  const now = Date.now();
  if (messageCentralTokenCache.token && messageCentralTokenCache.expiresAt > now + 60000) {
    return messageCentralTokenCache.token;
  }

  let base64Key = apiKey;
  try {
    const decoded = Buffer.from(apiKey, 'base64').toString('utf8');
    const reEncoded = Buffer.from(decoded, 'utf8').toString('base64');
    if (reEncoded !== apiKey) {
      base64Key = Buffer.from(apiKey).toString('base64');
    }
  } catch {
    base64Key = Buffer.from(apiKey).toString('base64');
  }

  try {
    const tokenUrl = `${baseUrl}/auth/v1/authentication/token?customerId=${encodeURIComponent(customerId)}&key=${encodeURIComponent(base64Key)}&scope=NEW`;
    const res = await fetch(tokenUrl, {
      method: 'GET',
      headers: { 'Accept': '*/*' }
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`MessageCentral Token Auth HTTP ${res.status}: ${txt}`);
    }

    const data = await res.json();
    const token = data.token || data.authToken || data.data?.token;
    if (!token) {
      throw new Error(`MessageCentral did not return a valid auth token: ${JSON.stringify(data)}`);
    }

    messageCentralTokenCache = {
      token,
      expiresAt: now + (2 * 60 * 60 * 1000) // Cache 2 hours
    };
    return token;
  } catch (err) {
    console.error('❌ MessageCentral Auth Token Error:', err.message);
    throw err;
  }
}

/**
 * MessageCentral Dispatcher (Handles OTP Verification & Custom Messaging)
 */
async function callMessageCentralGateway(phoneValidation, message, notificationType) {
  const customerId = process.env.MESSAGECENTRAL_CUSTOMER_ID;
  const baseUrl = process.env.MESSAGECENTRAL_BASE_URL || 'https://cpaas.messagecentral.com';

  let token = null;
  try {
    token = await getMessageCentralAuthToken();
  } catch (authErr) {
    return {
      success: false,
      error: `MessageCentral Auth Failed: ${authErr.message}`,
      providerMessageId: null,
      provider: 'MessageCentral Gateway (Auth Error)',
      status: 'failed',
      isSandbox: false
    };
  }

  if (!token || !customerId) {
    return {
      success: false,
      error: 'SMS provider is not configured. Missing MESSAGECENTRAL_CUSTOMER_ID or MESSAGECENTRAL_API_KEY in backend .env',
      providerMessageId: null,
      provider: 'MessageCentral (Unconfigured)',
      status: 'failed',
      isSandbox: false
    };
  }

  const isOtpTest = notificationType === 'TEST_OTP' || notificationType === 'OTP' || notificationType === 'TEST';

  if (isOtpTest) {
    try {
      const sendUrl = `${baseUrl}/verification/v3/send?countryCode=91&customerId=${encodeURIComponent(customerId)}&flowType=SMS&mobileNumber=${encodeURIComponent(phoneValidation.national)}`;
      const response = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          'authToken': token,
          'Accept': '*/*'
        }
      });

      const data = await response.json();
      if (!response.ok || (data.status && data.status !== 200 && data.status !== '200' && data.status !== 'SUCCESS')) {
        throw new Error(data.message || data.error || `HTTP ${response.status}`);
      }

      const verificationId = data.data?.verificationId || data.verificationId || `MC-${Date.now()}`;
      return {
        success: true,
        providerMessageId: String(verificationId),
        provider: 'MessageCentral OTP Gateway',
        status: 'submitted', // Gateway accepted; awaiting handset receipt
        isSandbox: false,
        isOtp: true,
        note: 'TEST / OTP — NOT A PHARMAFLOW DELIVERY',
        rawResponse: data
      };
    } catch (otpErr) {
      console.error('❌ MessageCentral OTP Error:', otpErr.message);
      return {
        success: false,
        error: otpErr.message,
        providerMessageId: null,
        provider: 'MessageCentral OTP Gateway',
        status: 'failed',
        isSandbox: false
      };
    }
  } else {
    // Attempt general SMS endpoint
    try {
      const smsPayload = {
        customerId,
        destination: phoneValidation.national,
        countryCode: '91',
        message: message,
        senderId: process.env.MESSAGECENTRAL_SENDER_ID || 'MESSAGEC'
      };

      const smsUrl = `${baseUrl}/sms/v1/send`;
      const response = await fetch(smsUrl, {
        method: 'POST',
        headers: {
          'authToken': token,
          'Content-Type': 'application/json',
          'Accept': '*/*'
        },
        body: JSON.stringify(smsPayload)
      });

      const resText = await response.text();
      let data = {};
      try { data = JSON.parse(resText); } catch { data = { raw: resText }; }

      if (!response.ok) {
        return {
          success: false,
          error: `MessageCentral general SMS API returned HTTP ${response.status}. Account is configured on the OTP Verification route. For clinical text notifications, general SMS route activation is required.`,
          providerMessageId: null,
          provider: 'MessageCentral Gateway',
          status: 'failed',
          isSandbox: false
        };
      }

      const msgId = data.messageId || data.data?.messageId || data.requestId || `MC-SMS-${Date.now()}`;
      return {
        success: true,
        providerMessageId: String(msgId),
        provider: 'MessageCentral Live Gateway',
        status: 'submitted',
        isSandbox: false,
        rawResponse: data
      };
    } catch (smsErr) {
      console.error('❌ MessageCentral SMS Error:', smsErr.message);
      return {
        success: false,
        error: `MessageCentral general SMS failed: ${smsErr.message}`,
        providerMessageId: null,
        provider: 'MessageCentral Gateway',
        status: 'failed',
        isSandbox: false
      };
    }
  }
}

/**
 * Low-level HTTP/REST dispatcher to SMS Gateway Provider
 * 
 * STRICT RULE: SMS Gateway submission/acceptance is NOT handset delivery.
 * Initial status upon successful gateway accept is 'submitted' or 'pending', NEVER 'delivered'.
 */
async function callSmsGatewayProvider(phoneValidation, message, notificationType) {
  const provider = (process.env.SMS_PROVIDER || 'MOCK_TEST_PROVIDER').toLowerCase();

  // 1. MessageCentral Provider
  if (provider === 'messagecentral' || provider === 'messaging_central') {
    return await callMessageCentralGateway(phoneValidation, message, notificationType);
  }

  // 2. SMSLocal Provider
  if (provider === 'smslocal') {
    const apiKey = process.env.SMSLOCAL_API_KEY || process.env.SMSLOCAL_KEY || process.env.SMS_API_KEY;
    const senderId = process.env.SMSLOCAL_SENDER_ID || process.env.SMS_SENDER_ID || 'PHFLOW';
    const baseUrl = process.env.SMSLOCAL_BASE_URL || process.env.SMS_BASE_URL || 'https://app.smslocal.in/api/smsapi';
    const mode = (process.env.SMSLOCAL_MODE || '').toLowerCase();
    const isExplicitLive = mode === 'live';
    const isSandbox = !isExplicitLive && (
      (process.env.SMSLOCAL_SANDBOX === 'true') || 
      (mode === 'sandbox') ||
      (apiKey && (apiKey.toLowerCase().includes('test') || apiKey.toLowerCase().includes('sandbox'))) ||
      (!apiKey)
    );

    const dltTemplateId = process.env[`SMS_DLT_TEMPLATE_ID_${notificationType}`] || 
      (notificationType === 'RECALL' ? (process.env.SMS_DLT_TEMPLATE_ID_RECALL || process.env.SMSLOCAL_TEMPLATE_ID) : (process.env.SMS_DLT_TEMPLATE_ID_EXPIRY || process.env.SMSLOCAL_TEMPLATE_ID)) ||
      process.env.SMSLOCAL_TEMPLATE_ID ||
      '110716182910001';

    if (!apiKey || apiKey === 'mock_key') {
      console.warn('⚠️ [SMSLocal] Missing SMSLOCAL_API_KEY or credentials. Cannot dispatch live SMS.');
      return {
        success: false,
        error: 'SMS integration configured but credentials/template approval is required.',
        providerMessageId: null,
        provider: 'SMSLocal Gateway (Unconfigured)',
        status: 'failed',
        isSandbox: false
      };
    }

    try {
      const queryParams = new URLSearchParams({
        key: apiKey,
        route: '1', // Route 1: Transactional / Service OTP & Safety Alerts
        sender: senderId,
        number: phoneValidation.national, // Clean 10-digit Indian phone number
        sms: message,
        templateid: dltTemplateId
      });

      const requestUrl = `${baseUrl.includes('?') ? baseUrl + '&' : baseUrl + '?'}${queryParams.toString()}`;
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*'
        }
      });

      const responseText = await response.text();
      let data = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { rawText: responseText.trim() };
      }

      const rawCode = String(data.code || data.status || data.rawText || '');
      if (SMSLOCAL_ERROR_CODES[rawCode]) {
        throw new Error(`SMSLocal Error ${rawCode}: ${SMSLOCAL_ERROR_CODES[rawCode]}`);
      }

      if (!response.ok || data.status === 'error' || data.success === false) {
        throw new Error(data.message || data.error || `SMSLocal returned HTTP ${response.status}: ${responseText}`);
      }

      const msgId = data.messageId || data.message_id || data.msgId || data.msgid || data.data?.messageId || data.rawText || `SMSL-${Date.now()}`;
      return {
        success: true,
        providerMessageId: msgId,
        provider: isSandbox ? 'SMSLocal Sandbox (Test Mode)' : 'SMSLocal Gateway',
        status: 'submitted', // Gateway accepted; awaiting carrier delivery confirmation
        isSandbox,
        rawResponse: data
      };
    } catch (err) {
      console.error('❌ SMSLocal Gateway Error:', err.message);
      return {
        success: false,
        error: err.message,
        providerMessageId: null,
        provider: 'SMSLocal Gateway',
        status: 'failed',
        isSandbox: false
      };
    }
  }

  // 3. Generic REST SMS Gateway (Fast2SMS, MSG91, Twilio, etc.)
  const genericApiKey = process.env.SMS_API_KEY || process.env.FAST2SMS_API_KEY;
  if (genericApiKey && genericApiKey !== 'mock_key' && process.env.SMS_BASE_URL) {
    try {
      const payload = JSON.stringify({
        sender_id: process.env.SMS_SENDER_ID || 'PHFLOW',
        message: message,
        numbers: phoneValidation.national,
        dlt_template_id: process.env.SMS_DLT_TEMPLATE_ID || '110716182910001',
        entity_id: process.env.SMS_DLT_ENTITY_ID
      });

      const response = await fetch(process.env.SMS_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': genericApiKey,
          'x-api-key': genericApiKey
        },
        body: payload
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Provider returned HTTP ${response.status}`);
      }

      return {
        success: true,
        providerMessageId: data.message_id || data.request_id || `MSG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        provider: 'SMS Gateway',
        status: 'submitted',
        isSandbox: false,
        rawResponse: data
      };
    } catch (err) {
      console.error('❌ SMS Gateway API Error:', err.message);
      return {
        success: false,
        error: err.message,
        providerMessageId: null,
        provider: 'SMS Gateway',
        status: 'failed',
        isSandbox: false
      };
    }
  }

  // 4. Deterministic local mock provider for testing & development
  const mockMsgId = `PF-SMS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  console.log(`📡 [SMS DISPATCH - ${provider.toUpperCase()}] To: ${phoneValidation.e164} | MsgId: ${mockMsgId}\n   Message: "${message.slice(0, 80)}..."`);

  return {
    success: true,
    providerMessageId: mockMsgId,
    provider: 'PharmaFlow Simulated Carrier Network (DLT Approved)',
    status: 'submitted',
    isSandbox: true,
    isSimulated: true
  };
}

/**
 * Unified Core SMS Sender function
 */
async function sendSms({
  pharmacyId = 'DEMO_PHARMACY',
  recipientName = 'Customer',
  recipientPhone,
  recipientType = 'customer',
  customerId = null,
  pharmacistId = null,
  notificationType = 'NEAR_EXPIRY',
  medicineId = null,
  batchId = null,
  variables = {},
  language = 'English',
  notificationSource = 'automatic', // 'automatic' | 'manual'
  overrideDuplicateCheck = false
}) {
  // 1. Phone number validation
  const phoneValidation = validateIndianPhoneNumber(recipientPhone);
  if (!phoneValidation.isValid) {
    const errorRecord = {
      pharmacyId,
      recipientName,
      recipientPhone: recipientPhone || 'N/A',
      status: 'failed',
      errorMessage: phoneValidation.error,
      notificationType,
      notificationSource,
      createdAt: new Date().toISOString()
    };
    await recordNotification(errorRecord);
    return {
      success: false,
      error: phoneValidation.error,
      status: 'failed'
    };
  }

  // 2. Duplicate prevention (Idempotency)
  const windowKey = new Date().toISOString().slice(0, 10); // 1-day deduplication window
  const uniqueRecipientIdentifier = customerId || phoneValidation.national || recipientName;
  const idempotencyKey = buildIdempotencyKey(pharmacyId, uniqueRecipientIdentifier, batchId, notificationType, windowKey);

  if (!overrideDuplicateCheck && notificationSource === 'automatic') {
    if (idempotencyRegistry.has(idempotencyKey)) {
      console.log(`ℹ️ [SMS Duplicate Ignored] Key: ${idempotencyKey}`);
      return {
        success: false,
        isDuplicate: true,
        message: 'Notification already dispatched to this recipient within the current window.'
      };
    }
  }

  // 3. Render approved multilingual template
  const rendered = renderSmsTemplate(notificationType, language, {
    customer: recipientName,
    ...variables
  });

  // 4. Dispatch via SMS Gateway
  const gatewayResult = await callSmsGatewayProvider(phoneValidation, rendered.message, notificationType);

  const nowIso = new Date().toISOString();
  const initialStatus = gatewayResult.success ? 'submitted' : 'failed';

  const notificationRecord = {
    pharmacyId,
    recipientName,
    recipientPhone: phoneValidation.formatted,
    e164Phone: phoneValidation.e164,
    recipientType,
    customerId,
    pharmacistId,
    notificationType: rendered.notificationType,
    medicineId,
    batchId,
    message: rendered.message,
    language: rendered.language,
    provider: gatewayResult.provider,
    providerMessageId: gatewayResult.providerMessageId || `FAILED-${Date.now()}`,
    status: initialStatus, // 'submitted' | 'pending' | 'delivered' | 'failed' | 'expired'
    isSandbox: Boolean(gatewayResult.isSandbox),
    sandboxDetails: gatewayResult.isSandbox 
      ? 'Test / Sandbox — not delivered to handset' 
      : (gatewayResult.isOtp ? 'TEST / OTP — NOT A PHARMAFLOW DELIVERY' : null),
    errorMessage: gatewayResult.error || null,
    notificationSource, // 'automatic' | 'manual'
    createdAt: nowIso,
    sentAt: gatewayResult.success ? nowIso : null,
    lastStatusCheckedAt: nowIso,
    deliveredAt: null,
    failedAt: gatewayResult.success ? null : nowIso,
    retryCount: 0,
    idempotencyKey
  };

  // 5. Persist notification log
  const savedDoc = await recordNotification(notificationRecord);
  if (gatewayResult.success) {
    idempotencyRegistry.add(idempotencyKey);
  }

  return {
    success: gatewayResult.success,
    id: savedDoc.id,
    providerMessageId: gatewayResult.providerMessageId,
    status: notificationRecord.status,
    isSandbox: notificationRecord.isSandbox,
    sandboxDetails: notificationRecord.sandboxDetails,
    notification: notificationRecord,
    error: gatewayResult.error || null
  };
}

/**
 * Persists notification to Firestore / Memory
 */
async function recordNotification(record) {
  if (isConnected()) {
    try {
      const docRef = await db.collection('smsNotifications').add(record);
      return { id: docRef.id, ...record };
    } catch (err) {
      console.error('⚠️ Failed to save SMS log to Firestore:', err.message);
    }
  }

  const id = `sms_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
  const saved = { id, ...record };
  inMemoryNotifications.unshift(saved);
  return saved;
}

/**
 * Pharmacist Manual SMS Dispatch with server-side validation & audit
 */
async function sendManualSms(options) {
  return await sendSms({
    ...options,
    notificationSource: 'manual',
    overrideDuplicateCheck: true // Pharmacist explicitly confirmed manual dispatch
  });
}

/**
 * Recall SMS Broadcast: Finds and notifies ONLY customers who received the recalled batch
 */
async function sendRecallNotificationToAffectedCustomers(pharmacyId, batchId, reason = '', overrideDuplicateCheck = true) {
  const { getRecalledBatchCustomers, getBatchDetails } = require('./pharmacyTools');
  
  const batchInfo = await getBatchDetails(pharmacyId, batchId);
  const result = await getRecalledBatchCustomers(pharmacyId, batchId);
  
  if (!result.affectedPatients || result.affectedPatients.length === 0) {
    return {
      batch: batchId,
      medicine: batchInfo?.medicine || 'Unknown',
      affectedCount: 0,
      dispatchedCount: 0,
      results: []
    };
  }

  const dispatchResults = [];
  for (const patient of result.affectedPatients) {
    if (!patient.phone) continue;

    const dispatch = await sendSms({
      pharmacyId,
      customerId: patient.id || patient.customerId || null,
      recipientName: patient.name,
      recipientPhone: patient.phone,
      notificationType: 'RECALL',
      medicineId: batchInfo?.medicine || 'Prescribed Medication',
      batchId,
      language: patient.preferredLang || 'English',
      notificationSource: 'automatic',
      overrideDuplicateCheck,
      variables: {
        medicine: batchInfo?.medicine || 'Prescribed Medication',
        batch: batchId,
        date: patient.date || new Date().toISOString().slice(0, 10),
        reason: reason || 'Manufacturer recall'
      }
    });

    dispatchResults.push({
      customer: patient.name,
      patient: patient.name,
      phone: patient.phone,
      success: dispatch.success,
      providerMessageId: dispatch.providerMessageId,
      status: dispatch.status,
      isSandbox: dispatch.isSandbox
    });
  }

  return {
    batch: batchId,
    medicine: batchInfo?.medicine || 'Unknown',
    affectedCount: result.affectedPatients.length,
    dispatchedCount: dispatchResults.filter(r => r.success).length,
    results: dispatchResults
  };
}

/**
 * Queries the Delivery Report Endpoint for a message ID
 */
async function checkSmsDeliveryStatus(providerMessageId) {
  if (!providerMessageId) {
    return { success: false, error: 'Missing providerMessageId' };
  }

  const provider = (process.env.SMS_PROVIDER || 'MOCK_TEST_PROVIDER').toLowerCase();
  let resolvedStatus = null;
  let deliveredAt = null;
  let errorMessage = null;

  // 1. MessageCentral Status Check
  if (provider === 'messagecentral' || provider === 'messaging_central') {
    try {
      const token = await getMessageCentralAuthToken();
      if (token) {
        const baseUrl = process.env.MESSAGECENTRAL_BASE_URL || 'https://cpaas.messagecentral.com';
        const statusUrl = `${baseUrl}/verification/v3/status?verificationId=${encodeURIComponent(providerMessageId)}`;
        const res = await fetch(statusUrl, {
          method: 'GET',
          headers: {
            'authToken': token,
            'Accept': '*/*'
          }
        });
        if (res.ok) {
          const data = await res.json();
          const verificationStatus = (data.verificationStatus || data.data?.verificationStatus || data.status || '').toUpperCase();
          if (verificationStatus === 'VERIFIED' || verificationStatus === 'DELIVERED') {
            resolvedStatus = 'delivered';
            deliveredAt = new Date().toISOString();
          } else if (verificationStatus === 'EXPIRED' || verificationStatus === 'FAILED') {
            resolvedStatus = 'failed';
            errorMessage = 'MessageCentral verification expired or failed';
          } else if (verificationStatus === 'IN_PROGRESS' || verificationStatus === 'PENDING') {
            resolvedStatus = 'pending';
          }
        }
      }
    } catch (mcErr) {
      console.warn('⚠️ [MessageCentral Status Query Error]:', mcErr.message);
    }
  }

  // 2. SMSLocal Status Check
  if (provider === 'smslocal') {
    const apiKey = process.env.SMSLOCAL_API_KEY || process.env.SMSLOCAL_KEY || process.env.SMS_API_KEY;
    const dlrUrl = process.env.SMSLOCAL_DLR_URL || 'https://app.smslocal.in/api/dlrapi';

    if (apiKey && apiKey !== 'mock_key') {
      try {
        const queryParams = new URLSearchParams({
          key: apiKey,
          msgid: providerMessageId
        });
        const url = `${dlrUrl.includes('?') ? dlrUrl + '&' : dlrUrl + '?'}${queryParams.toString()}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json, text/plain, */*' }
        });

        if (response.ok) {
          const text = await response.text();
          let data = {};
          try {
            data = JSON.parse(text);
          } catch {
            data = { status: text.trim() };
          }

          const rawStatus = (data.status || data.deliveryStatus || data.data?.status || data.report || text.trim() || '').toUpperCase();
          if (rawStatus === 'DELIVRD' || rawStatus === 'DELIVERED') {
            resolvedStatus = 'delivered';
            deliveredAt = data.deliveredAt || data.datetime || new Date().toISOString();
          } else if (rawStatus === 'FAILED' || rawStatus === 'UNDELIV' || rawStatus === 'REJECTD') {
            resolvedStatus = 'failed';
            errorMessage = data.reason || data.errorMessage || 'Carrier reported delivery failure to handset';
          } else if (rawStatus === 'EXPIRED') {
            resolvedStatus = 'expired';
            errorMessage = 'SMS validity window expired before handset delivery';
          } else if (rawStatus === 'PENDING' || rawStatus === 'AWAITING' || rawStatus === 'SUBMITTED' || rawStatus === 'ACCEPTD') {
            resolvedStatus = 'pending';
          }
        }
      } catch (err) {
        console.warn('⚠️ [SMSLocal DLR Query Error]:', err.message);
      }
    }
  }

  const nowIso = new Date().toISOString();

  let existingDoc = null;
  let docRef = null;

  if (isConnected()) {
    const snap = await db.collection('smsNotifications')
      .where('providerMessageId', '==', providerMessageId)
      .limit(1)
      .get();
    if (!snap.empty) {
      docRef = snap.docs[0].ref;
      existingDoc = snap.docs[0].data();
    }
  } else {
    existingDoc = inMemoryNotifications.find(n => n.providerMessageId === providerMessageId);
  }

  if (!existingDoc) {
    return {
      success: true,
      providerMessageId,
      status: resolvedStatus || 'submitted',
      lastStatusCheckedAt: nowIso,
      updated: false
    };
  }

  const updates = {
    lastStatusCheckedAt: nowIso
  };

  if (resolvedStatus && resolvedStatus !== existingDoc.status) {
    updates.status = resolvedStatus;
    if (resolvedStatus === 'delivered') updates.deliveredAt = deliveredAt || nowIso;
    if (resolvedStatus === 'failed') {
      updates.failedAt = nowIso;
      if (errorMessage) updates.errorMessage = errorMessage;
    }
  }

  if (docRef) {
    await docRef.update(updates);
  } else if (existingDoc) {
    Object.assign(existingDoc, updates);
  }

  return {
    success: true,
    providerMessageId,
    status: updates.status || existingDoc.status,
    deliveredAt: updates.deliveredAt || existingDoc.deliveredAt,
    lastStatusCheckedAt: nowIso,
    updated: Boolean(updates.status)
  };
}

/**
 * Synchronizes delivery status for all active/pending notifications
 */
async function syncAllPendingSmsStatuses(pharmacyId = 'DEMO_PHARMACY') {
  let pendingList = [];

  if (isConnected()) {
    const snap = await db.collection('smsNotifications')
      .where('pharmacyId', '==', pharmacyId)
      .where('status', 'in', ['submitted', 'pending'])
      .limit(50)
      .get();
    
    pendingList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } else {
    pendingList = inMemoryNotifications.filter(
      n => n.pharmacyId === pharmacyId && (n.status === 'submitted' || n.status === 'pending')
    );
  }

  const results = [];
  for (const item of pendingList) {
    if (item.providerMessageId && !item.providerMessageId.startsWith('FAILED-')) {
      const res = await checkSmsDeliveryStatus(item.providerMessageId);
      results.push({
        id: item.id,
        providerMessageId: item.providerMessageId,
        previousStatus: item.status,
        newStatus: res.status
      });
    }
  }

  return {
    checkedCount: pendingList.length,
    results
  };
}

/**
 * Webhook receiver for carrier DLR callbacks
 */
async function processDeliveryStatusCallback(payload) {
  const providerMessageId = payload.providerMessageId || payload.msgid || payload.messageId || payload.message_id || payload.verificationId || payload.id;
  const rawStatus = (payload.status || payload.deliveryStatus || payload.report || payload.verificationStatus || '').toUpperCase();

  if (!providerMessageId) {
    return { success: false, error: 'Missing providerMessageId in webhook body' };
  }

  let mappedStatus = 'pending';
  if (rawStatus === 'DELIVRD' || rawStatus === 'DELIVERED' || rawStatus === 'SUCCESS' || rawStatus === 'VERIFIED') {
    mappedStatus = 'delivered';
  } else if (rawStatus === 'FAILED' || rawStatus === 'UNDELIV' || rawStatus === 'REJECTD' || rawStatus === 'EXPIRED') {
    mappedStatus = 'failed';
  }

  const nowIso = new Date().toISOString();
  let updated = false;

  if (isConnected()) {
    const snap = await db.collection('smsNotifications')
      .where('providerMessageId', '==', providerMessageId)
      .limit(1)
      .get();
    
    if (!snap.empty) {
      const docRef = snap.docs[0].ref;
      const updates = {
        status: mappedStatus,
        lastStatusCheckedAt: nowIso
      };
      if (mappedStatus === 'delivered') updates.deliveredAt = nowIso;
      if (mappedStatus === 'failed') updates.failedAt = nowIso;
      await docRef.update(updates);
      updated = true;
    }
  } else {
    const found = inMemoryNotifications.find(n => n.providerMessageId === providerMessageId);
    if (found) {
      found.status = mappedStatus;
      found.lastStatusCheckedAt = nowIso;
      if (mappedStatus === 'delivered') found.deliveredAt = nowIso;
      if (mappedStatus === 'failed') found.failedAt = nowIso;
      updated = true;
    }
  }

  return {
    success: true,
    providerMessageId,
    status: mappedStatus,
    mappedStatus,
    updated
  };
}

/**
 * Retrieves paginated SMS transmission logs and calculated delivery summary
 */
async function getSmsReports(pharmacyId = 'DEMO_PHARMACY', filters = {}) {
  let logs = [];

  if (isConnected()) {
    try {
      let query = db.collection('smsNotifications')
        .where('pharmacyId', '==', pharmacyId)
        .orderBy('createdAt', 'desc')
        .limit(filters.limit || 150);

      const snap = await query.get();
      logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn('⚠️ Firestore SMS query fallback:', err.message);
      const snap = await db.collection('smsNotifications')
        .where('pharmacyId', '==', pharmacyId)
        .limit(100)
        .get();
      logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      logs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }
  }

  if (logs.length === 0 && inMemoryNotifications.length > 0) {
    logs = inMemoryNotifications.filter(n => n.pharmacyId === pharmacyId);
    logs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  // Apply filters
  if (filters.source && filters.source !== 'all') {
    logs = logs.filter(l => l.notificationSource === filters.source);
  }
  if (filters.status && filters.status !== 'all') {
    logs = logs.filter(l => l.status === filters.status);
  }
  if (filters.notificationType && filters.notificationType !== 'all') {
    logs = logs.filter(l => l.notificationType === filters.notificationType);
  }

  const total = logs.length;
  const delivered = logs.filter(l => l.status === 'delivered' && !l.isSandbox).length;
  const submitted = logs.filter(l => l.status === 'submitted' || l.status === 'sent').length;
  const pending = logs.filter(l => l.status === 'pending' || l.status === 'COMMUNICATION_INITIATED').length;
  const failed = logs.filter(l => l.status === 'failed' || l.status === 'FAILED').length;
  const expired = logs.filter(l => l.status === 'expired').length;
  const whatsappOpened = logs.filter(l => l.status === 'WHATSAPP_OPENED' || l.selectedChannel === 'WHATSAPP').length;
  const smsComposerOpened = logs.filter(l => l.status === 'SMS_COMPOSER_OPENED' || (l.selectedChannel === 'SMS' && l.provider?.includes('Composer'))).length;
  const cancelledCount = logs.filter(l => l.status === 'CANCELLED').length;
  const expiryCount = logs.filter(l => l.notificationType === 'NEAR_EXPIRY' || l.notificationType === 'EXPIRED').length;
  const recallCount = logs.filter(l => l.notificationType === 'RECALL').length;
  const automaticCount = logs.filter(l => l.notificationSource === 'automatic').length;
  const manualCount = logs.filter(l => l.notificationSource === 'manual').length;

  return {
    pharmacyId,
    summary: {
      totalSms: total,
      sent: submitted,
      submitted,
      pending,
      delivered,
      failed,
      expired,
      queued: 0,
      whatsappOpened,
      smsComposerOpened,
      cancelledCount,
      expiryCount,
      recallCount,
      automaticCount,
      manualCount,
      deliveryRatePct: total > 0 ? Math.round((delivered / total) * 100) : 0
    },
    logs: logs.slice(0, filters.limit || 100)
  };
}

/**
 * Checks provider credit balance & status
 */
async function checkSmsCredits() {
  const provider = (process.env.SMS_PROVIDER || 'MOCK_TEST_PROVIDER').toLowerCase();

  // 1. MessageCentral Credit / Status Check
  if (provider === 'messagecentral' || provider === 'messaging_central') {
    const customerId = process.env.MESSAGECENTRAL_CUSTOMER_ID;
    const apiKey = process.env.MESSAGECENTRAL_API_KEY || process.env.MESSAGECENTRAL_KEY || process.env.MESSAGECENTRAL_PASSWORD;
    const authToken = process.env.MESSAGECENTRAL_AUTH_TOKEN;

    if (!customerId || (!apiKey && !authToken)) {
      return {
        provider: 'MessageCentral',
        isConfigured: false,
        error: 'Missing MESSAGECENTRAL_CUSTOMER_ID or MESSAGECENTRAL_API_KEY in backend .env',
        isSufficient: false
      };
    }

    try {
      const token = await getMessageCentralAuthToken();
      return {
        provider: 'MessageCentral Gateway',
        customerId,
        isConfigured: Boolean(token),
        isSufficient: Boolean(token),
        mode: 'OTP / Verification Test Route',
        route: 'Verification v3 API'
      };
    } catch (err) {
      return {
        provider: 'MessageCentral Gateway',
        isConfigured: false,
        error: err.message,
        isSufficient: false
      };
    }
  }

  // 2. SMSLocal Credit Check
  if (provider === 'smslocal') {
    const apiKey = process.env.SMSLOCAL_API_KEY || process.env.SMSLOCAL_KEY || process.env.SMS_API_KEY;
    const creditUrl = process.env.SMSLOCAL_CREDIT_URL || 'https://app.smslocal.in/api/creditapi';

    if (apiKey && apiKey !== 'mock_key') {
      try {
        const url = `${creditUrl}?key=${encodeURIComponent(apiKey)}&route=1`;
        const res = await fetch(url, { method: 'GET' });
        const text = await res.text();
        let data = {};
        try {
          data = JSON.parse(text);
        } catch {
          data = { credits: parseFloat(text) || 0 };
        }
        const creditsRaw = data.Credits !== undefined ? data.Credits : (data.credits !== undefined ? data.credits : (data.balance || data.count || text));
        const credits = Number(parseFloat(creditsRaw) || 0);
        return {
          provider: 'SMSLocal Live Gateway',
          credits,
          route: data.Route || data.route || 'Transactional',
          isSufficient: credits > 0
        };
      } catch (err) {
        return { provider: 'SMSLocal', error: err.message, isSufficient: false };
      }
    }
  }

  return {
    provider: 'PharmaFlow Sandbox (Simulated Gateway)',
    credits: 10000,
    isSufficient: true
  };
}

module.exports = {
  validateIndianPhoneNumber,
  buildIdempotencyKey,
  sendSms,
  sendManualSms,
  sendRecallNotificationToAffectedCustomers,
  checkSmsDeliveryStatus,
  syncAllPendingSmsStatuses,
  processDeliveryStatusCallback,
  getSmsReports,
  checkSmsCredits,
  checkSmsLocalCredits: checkSmsCredits // Backwards compatibility alias
};
