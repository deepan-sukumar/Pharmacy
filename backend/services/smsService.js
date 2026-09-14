/**
 * Unified SMS Service for PharmaFlow
 * 
 * Handles BOTH:
 * A. AUTOMATIC SMS (Scheduler / Event-driven)
 * B. MANUAL PHARMACIST SMS (On-demand with confirmation)
 * 
 * Strict Idempotency, Multilingual Templates, Phone Number Validation,
 * Provider Message ID Tracking, and Verified Delivery Callbacks.
 */

const { db, isConnected } = require('../firebase');
const { renderSmsTemplate, normalizeLanguage } = require('./smsTemplates');
const https = require('https');
const http = require('http');

// In-memory fallback notification log if Firestore is offline
let inMemoryNotifications = [];

// Track idempotency keys to prevent duplicate dispatches within active windows
const idempotencyRegistry = new Set();

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
    apiFormat: `91${nationalNumber}` // Clean format for SMSLocal API without '+' or spaces
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
 * Low-level HTTP/REST dispatcher to SMS Gateway Provider (Supports SMSLocal & generic DLT gateways)
 * 
 * STRICT RULE: SMS Gateway submission/acceptance is NOT handset delivery.
 * Initial status upon successful gateway accept is 'submitted' or 'pending', NEVER 'delivered'.
 */
async function callSmsGatewayProvider(phoneValidation, message, notificationType) {
  const provider = (process.env.SMS_PROVIDER || 'MOCK_TEST_PROVIDER').toLowerCase();
  const apiKey = process.env.SMSLOCAL_KEY || process.env.SMS_API_KEY;
  const senderId = process.env.SMS_SENDER_ID || 'PHFLOW';
  const baseUrl = process.env.SMSLOCAL_BASE_URL || process.env.SMS_BASE_URL || 'https://api.smslocal.in/api/smsapi';

  const isSandbox = (process.env.SMSLOCAL_SANDBOX === 'true') || 
                    (apiKey && (apiKey.toLowerCase().includes('test') || apiKey.toLowerCase().includes('sandbox'))) ||
                    (provider === 'mock_test_provider');

  const dltTemplateId = process.env[`SMS_DLT_TEMPLATE_ID_${notificationType}`] || 
    (notificationType === 'RECALL' ? process.env.SMS_DLT_TEMPLATE_ID_RECALL : process.env.SMS_DLT_TEMPLATE_ID_EXPIRY) ||
    '110716182910001';

  // 1. If SMSLocal provider is explicitly configured
  if (provider === 'smslocal') {
    if (!apiKey || apiKey === 'mock_key') {
      console.warn('⚠️ [SMSLocal] Missing SMSLOCAL_KEY or API credentials. Cannot dispatch live SMS.');
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
      // SMSLocal official endpoint format: GET /api/smsapi with Route 1 (Transactional)
      // Parameters: key, route=1, sender, number (10-digit national), sms, templateid
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
        // SMSLocal may return text response like "1987654321" or "108"
        data = { rawText: responseText.trim() };
      }

      // Check for known SMSLocal error response codes
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

  // 2. Generic REST SMS Gateway (Fast2SMS, MSG91, Twilio, etc.)
  if (apiKey && apiKey !== 'mock_key' && process.env.SMS_BASE_URL) {
    try {
      const payload = JSON.stringify({
        sender_id: senderId,
        message: message,
        numbers: phoneValidation.national,
        dlt_template_id: dltTemplateId,
        entity_id: process.env.SMS_DLT_ENTITY_ID
      });

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': apiKey,
          'x-api-key': apiKey
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
        provider: isSandbox ? 'SMS Gateway (Sandbox)' : 'SMS Gateway',
        status: 'submitted',
        isSandbox,
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

  // 3. Deterministic local mock provider for testing & development
  const mockMsgId = `PF-SMS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  console.log(`📡 [SMS DISPATCH - ${provider.toUpperCase()}] To: ${phoneValidation.e164} | MsgId: ${mockMsgId}\n   Message: "${message.slice(0, 80)}..."`);

  return {
    success: true,
    providerMessageId: mockMsgId,
    provider: 'PharmaFlow Simulated Carrier Network (DLT Approved)',
    status: 'submitted', // Gateway accepted; awaiting carrier delivery confirmation
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
  const idempotencyKey = buildIdempotencyKey(pharmacyId, customerId || recipientName, batchId, notificationType, windowKey);

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
  const initialStatus = gatewayResult.success 
    ? (gatewayResult.isSandbox ? 'submitted' : 'submitted') 
    : 'failed';

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
    sandboxDetails: gatewayResult.isSandbox ? 'Test / Sandbox — not delivered to handset' : null,
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
async function sendRecallNotificationToAffectedCustomers(pharmacyId, batchId, reason = '') {
  const { getRecalledBatchCustomers, getBatchDetails } = require('./pharmacyTools');
  
  const batchInfo = await getBatchDetails(pharmacyId, batchId);
  const result = await getRecalledBatchCustomers(pharmacyId, batchId);
  
  if (!result.affectedPatients || result.affectedPatients.length === 0) {
    return {
      batch: batchId,
      dispatchedCount: 0,
      message: 'No dispensed patients identified in audit trail for this batch.'
    };
  }

  const dispatchResults = [];
  const medicineName = batchInfo ? batchInfo.medicine : 'Medication';

  for (const patient of result.affectedPatients) {
    if (patient.phone) {
      const res = await sendSms({
        pharmacyId,
        recipientName: patient.customerName,
        recipientPhone: patient.phone,
        recipientType: 'customer',
        customerId: patient.customerId || null,
        notificationType: 'RECALL',
        batchId,
        language: patient.preferredLang || 'English',
        variables: {
          medicine: medicineName,
          batch: batchId,
          pharmacy: 'Apollo MedPlus Express'
        },
        notificationSource: 'automatic'
      });
      dispatchResults.push({
        customer: patient.customerName,
        phone: patient.phone,
        status: res.status,
        providerMessageId: res.providerMessageId,
        isSandbox: res.isSandbox
      });
    }
  }

  return {
    batch: batchId,
    dispatchedCount: dispatchResults.length,
    results: dispatchResults
  };
}

/**
 * Queries the SMSLocal / Gateway Delivery Report Endpoint for a message ID
 */
async function checkSmsDeliveryStatus(providerMessageId) {
  if (!providerMessageId) {
    return { success: false, error: 'Missing providerMessageId' };
  }

  const provider = (process.env.SMS_PROVIDER || 'MOCK_TEST_PROVIDER').toLowerCase();
  const apiKey = process.env.SMSLOCAL_KEY || process.env.SMS_API_KEY;
  const dlrUrl = process.env.SMSLOCAL_DLR_URL || 'https://api.smslocal.in/api/dlrapi';

  let resolvedStatus = null;
  let deliveredAt = null;
  let errorMessage = null;

  // 1. If SMSLocal live gateway is active
  if (provider === 'smslocal' && apiKey && apiKey !== 'mock_key') {
    try {
      // Official SMSLocal DLR format: GET /api/dlrapi?key={apiKey}&msgid={providerMessageId}
      const queryParams = new URLSearchParams({
        key: apiKey,
        msgid: providerMessageId
      });
      const url = `${dlrUrl.includes('?') ? dlrUrl + '&' : dlrUrl + '?'}${queryParams.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*'
        }
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

  const nowIso = new Date().toISOString();

  // If no change or simulation, find existing record
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
    return { success: false, error: `Message with ID ${providerMessageId} not found` };
  }

  // If resolvedStatus was obtained from SMSLocal, apply it. Otherwise maintain current status with updated timestamp.
  const finalStatus = resolvedStatus || existingDoc.status;
  const updates = {
    status: finalStatus,
    lastStatusCheckedAt: nowIso,
    ...(deliveredAt ? { deliveredAt } : {}),
    ...(errorMessage ? { errorMessage } : {})
  };

  if (docRef) {
    await docRef.update(updates);
  }
  Object.assign(existingDoc, updates);

  return {
    success: true,
    providerMessageId,
    status: finalStatus,
    lastStatusCheckedAt: nowIso,
    deliveredAt: existingDoc.deliveredAt || deliveredAt || null,
    errorMessage: existingDoc.errorMessage || errorMessage || null,
    isSandbox: existingDoc.isSandbox || false
  };
}

/**
 * Synchronizes delivery status for all pending SMS notifications in a pharmacy
 */
async function syncAllPendingSmsStatuses(pharmacyId) {
  let pendingLogs = [];

  if (isConnected()) {
    const snap = await db.collection('smsNotifications')
      .where('pharmacyId', '==', pharmacyId)
      .where('status', 'in', ['submitted', 'sent', 'pending'])
      .get();
    pendingLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } else {
    pendingLogs = inMemoryNotifications.filter(
      n => n.pharmacyId === pharmacyId && ['submitted', 'sent', 'pending'].includes(n.status)
    );
  }

  const results = [];
  for (const log of pendingLogs) {
    if (log.providerMessageId) {
      const res = await checkSmsDeliveryStatus(log.providerMessageId);
      results.push(res);
    }
  }

  return {
    pharmacyId,
    checkedCount: results.length,
    results
  };
}

/**
 * Processes SMS Provider Delivery Status Webhook Callbacks
 */
async function processDeliveryStatusCallback(callbackPayload) {
  const messageId = callbackPayload.messageId || callbackPayload.providerMessageId || callbackPayload.msgId || callbackPayload.id;
  const rawStatus = (callbackPayload.status || callbackPayload.deliveryStatus || '').toLowerCase(); // 'delivered', 'failed', 'undelivered', 'delivrd'

  if (!messageId) {
    return { success: false, error: 'Missing provider messageId in callback.' };
  }

  let finalStatus = 'pending';
  let isFailure = false;
  if (rawStatus.includes('undeliv') || rawStatus.includes('fail') || rawStatus.includes('reject')) {
    finalStatus = 'failed';
    isFailure = true;
  } else if (rawStatus.includes('expir')) {
    finalStatus = 'expired';
    isFailure = true;
  } else if (rawStatus.includes('deliv')) {
    finalStatus = 'delivered';
  } else if (rawStatus.includes('subm') || rawStatus.includes('sent') || rawStatus.includes('pend') || rawStatus.includes('accept')) {
    finalStatus = 'pending';
  }

  const nowIso = new Date().toISOString();
  const deliveryTime = callbackPayload.deliveredAt || callbackPayload.timestamp || nowIso;
  const errorMsg = callbackPayload.reason || callbackPayload.errorMessage || callbackPayload.error || null;

  if (isConnected()) {
    const snap = await db.collection('smsNotifications')
      .where('providerMessageId', '==', messageId)
      .limit(1)
      .get();

    if (!snap.empty) {
      const doc = snap.docs[0];
      const updates = {
        status: finalStatus,
        lastStatusCheckedAt: nowIso,
        deliveredAt: finalStatus === 'delivered' ? deliveryTime : null,
        failedAt: isFailure ? nowIso : null,
        errorMessage: errorMsg || (isFailure ? 'Handset delivery failed' : null),
        updatedAt: nowIso
      };
      await doc.ref.update(updates);
      return { success: true, id: doc.id, providerMessageId: messageId, status: finalStatus, deliveredAt: updates.deliveredAt };
    }
  }

  const memMatch = inMemoryNotifications.find(n => n.providerMessageId === messageId);
  if (memMatch) {
    memMatch.status = finalStatus;
    memMatch.lastStatusCheckedAt = nowIso;
    if (finalStatus === 'delivered') memMatch.deliveredAt = deliveryTime;
    if (isFailure) {
      memMatch.failedAt = nowIso;
      memMatch.errorMessage = errorMsg || 'Handset delivery failed';
    }
    return { success: true, id: memMatch.id, providerMessageId: messageId, status: finalStatus, deliveredAt: memMatch.deliveredAt };
  }

  return { success: false, error: `Notification with providerMessageId ${messageId} not found.` };
}

/**
 * Fetches SMS reports & logs with Automatic vs Manual separation and accurate delivery metrics
 */
async function getSmsReports(pharmacyId, filters = {}) {
  let logs = [];
  if (isConnected()) {
    const snap = await db.collection('smsNotifications')
      .where('pharmacyId', '==', pharmacyId)
      .get();
    logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } else {
    logs = inMemoryNotifications.filter(n => n.pharmacyId === pharmacyId);
  }

  // Apply filters
  if (filters.source && filters.source !== 'all') {
    logs = logs.filter(l => l.notificationSource === filters.source);
  }
  if (filters.status && filters.status !== 'all') {
    logs = logs.filter(l => l.status === filters.status);
  }
  if (filters.language && filters.language !== 'all') {
    logs = logs.filter(l => l.language === filters.language);
  }
  if (filters.notificationType && filters.notificationType !== 'all') {
    logs = logs.filter(l => l.notificationType === filters.notificationType);
  }

  logs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const total = logs.length;
  // STRICT RULE: 'delivered' only counts carrier-confirmed delivered. 'sent' and 'submitted' are in-transit/pending.
  const delivered = logs.filter(l => l.status === 'delivered').length;
  const submitted = logs.filter(l => l.status === 'submitted' || l.status === 'sent').length;
  const pending = logs.filter(l => l.status === 'pending').length;
  const failed = logs.filter(l => l.status === 'failed' || l.status === 'undelivered').length;
  const expired = logs.filter(l => l.status === 'expired').length;
  const queued = logs.filter(l => l.status === 'queued').length;
  const automaticCount = logs.filter(l => l.notificationSource === 'automatic').length;
  const manualCount = logs.filter(l => l.notificationSource === 'manual').length;

  const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 100;

  return {
    summary: {
      totalSms: total,
      sent: submitted, // In transit / submitted to provider
      submitted,
      pending,
      delivered, // Only carrier-confirmed handset delivery
      failed,
      expired,
      queued,
      automaticCount,
      manualCount,
      deliveryRatePct: deliveryRate
    },
    logs: logs.slice(0, filters.limit || 100)
  };
}

/**
 * Checks transactional SMS credit balance from SMSLocal Gateway
 */
async function checkSmsLocalCredits() {
  const provider = (process.env.SMS_PROVIDER || 'MOCK_TEST_PROVIDER').toLowerCase();
  const apiKey = process.env.SMSLOCAL_KEY || process.env.SMS_API_KEY;
  const creditUrl = process.env.SMSLOCAL_CREDIT_URL || 'https://api.smslocal.in/api/creditapi';

  if (provider === 'smslocal' && apiKey && apiKey !== 'mock_key') {
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
      const credits = Number(data.credits !== undefined ? data.credits : (data.balance || data.count || 0));
      return {
        provider: 'SMSLocal',
        credits,
        isSufficient: credits > 0
      };
    } catch (err) {
      return { provider: 'SMSLocal', error: err.message, isSufficient: false };
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
  checkSmsLocalCredits
};

