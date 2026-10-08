// API Client for interacting with the Node.js / Express Backend & Firebase Firestore
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port !== '5000' ? 'http://localhost:5000/api' : '/api');

let activePharmacyId = '';
let activeAuthToken = '';

export function setApiPharmacyId(id: string) {
  activePharmacyId = (id || '').trim();
}

export function getApiPharmacyId(): string {
  return activePharmacyId;
}

export function setApiAuthToken(token: string) {
  activeAuthToken = (token || '').trim();
}

export function getApiAuthToken(): string {
  return activeAuthToken;
}

function getHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (activePharmacyId) {
    headers['x-pharmacy-id'] = activePharmacyId;
  }
  if (activeAuthToken) {
    headers['Authorization'] = `Bearer ${activeAuthToken}`;
  }
  return headers;
}

export interface MedicineItem {
  id: string | number;
  pharmacyId?: string;
  medicine: string;
  genericName?: string;
  batch: string;
  expiry: string;
  quantity: number;
  supplier: string;
  status: 'Available' | 'Near Expiry' | 'Recalled' | 'Low Stock' | 'Expired';
  unitPrice?: number;
  barcode?: string;
}

export interface CustomerItem {
  id: string | number;
  pharmacyId?: string;
  name: string;
  phone: string;
  email: string;
  visits: number;
  lastVisit: string;
  allergies?: string;
  alerts: boolean;
  preferredLang?: string;
  communicationPreference?: 'WHATSAPP' | 'SMS';
}

export interface SupplierItem {
  id: string | number;
  pharmacyId?: string;
  name: string;
  email: string;
  batches: number;
  purchases: string;
  rating: string;
  phone: string;
}

export interface AuditItem {
  id: string | number;
  pharmacyId?: string;
  date: string;
  medicine: string;
  batch: string;
  quantity: number;
  customer: string;
  pharmacist: string;
  status: string;
  rxId?: string;
  totalAmount?: number;
  timestamp?: string;
}

export interface RecallItem {
  id: string | number;
  pharmacyId?: string;
  batch: string;
  medicine: string;
  reason: string;
  status: string;
  date: string;
  quarantineQty: number;
  affectedCustomers?: string[];
  actionTaken?: string;
}

export interface ReturnItem {
  id: string | number;
  pharmacyId?: string;
  supplier: string;
  medicine: string;
  batch: string;
  expiry?: string;
  returnEligibility?: string;
  returnWindow?: string;
  quantity: number;
  requestDate?: string;
  status?: string;
  reason?: string;
  notes?: string;
}

export interface AlertItem {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'danger' | 'warning' | 'orange' | 'info';
  time: string;
  badge: string;
}

export const api = {
  // Check backend & firestore health
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { headers: getHeaders() });
      return await res.json();
    } catch (error) {
      console.error('Backend health check failed:', error);
      return { status: 'offline', firebaseConnected: false };
    }
  },

  // Seed Firestore with initial sample data
  async seedData() {
    const res = await fetch(`${API_BASE_URL}/seed`, { method: 'POST', headers: getHeaders() });
    return await res.json();
  },

  // -------------------------------------------------------------
  // INVENTORY
  // -------------------------------------------------------------
  async getInventory(): Promise<MedicineItem[]> {
    const res = await fetch(`${API_BASE_URL}/inventory`, { headers: getHeaders() });
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => ({
      ...item,
      id: item.id || item.inventoryId || item.medicineId || item.batchId || String(Math.random()),
      medicine: item.medicine || item.medicineName || 'Unknown Medicine',
      genericName: item.genericName || item.generic || '',
      batch: item.batch || item.batchNumber || 'N/A',
      expiry: item.expiry || item.expiryDisplay || item.expiryDate || 'N/A',
      quantity: Number(item.quantity ?? item.availableQuantity ?? item.stockOnHand ?? 0),
      supplier: item.supplier || item.supplierName || item.manufacturerName || 'Direct Supplier',
      status: (item.status === 'RECALLED' || item.status === 'QUARANTINED' || item.isRecalled) ? 'Recalled' :
              (item.status === 'EXPIRED' || item.daysRemaining < 0) ? 'Expired' :
              (item.status === 'NEAR_EXPIRY' || item.status === 'CRITICAL_NEAR_EXPIRY' || (item.daysRemaining !== undefined && item.daysRemaining >= 0 && item.daysRemaining <= 30)) ? 'Near Expiry' :
              (Number(item.quantity ?? item.availableQuantity ?? 0) <= 20) ? 'Low Stock' :
              (item.status || 'Available'),
      unitPrice: Number(item.unitPrice ?? item.sellingPrice ?? item.unitCost ?? 45),
      barcode: item.barcode || item.qrCode || '',
    }));
  },

  async addMedicine(medicine: Partial<MedicineItem> & { medicine: string; quantity: number }): Promise<MedicineItem> {
    const res = await fetch(`${API_BASE_URL}/inventory`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(medicine),
    });
    return await res.json();
  },

  async updateMedicine(id: string | number, updates: Partial<MedicineItem>): Promise<MedicineItem> {
    const res = await fetch(`${API_BASE_URL}/inventory/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    return await res.json();
  },

  async deleteMedicine(id: string | number) {
    const res = await fetch(`${API_BASE_URL}/inventory/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return await res.json();
  },

  async lookupBarcode(code: string) {
    const res = await fetch(`${API_BASE_URL}/barcode/lookup/${encodeURIComponent(code)}`, { headers: getHeaders() });
    return await res.json();
  },

  // -------------------------------------------------------------
  // ATOMIC DISPENSING
  // -------------------------------------------------------------
  async dispensePrescription(data: {
    medicineId?: string | number;
    medicine?: string;
    medicineName?: string;
    batch?: string;
    batchNumber?: string;
    quantity: number;
    customer?: string;
    customerName?: string;
    pharmacist?: string;
    pharmacistName?: string;
    unitPrice?: number;
    totalAmount?: number;
    rxId?: string;
    language?: string;
    allergiesNoted?: string;
  }) {
    const payload = {
      medicineId: data.medicineId,
      medicine: data.medicine || data.medicineName || '',
      batch: data.batch || data.batchNumber || '',
      quantity: data.quantity,
      customer: data.customer || data.customerName || '',
      pharmacist: data.pharmacist || data.pharmacistName || 'Pharmacist',
      unitPrice: data.unitPrice,
      totalAmount: data.totalAmount,
      rxId: data.rxId,
      language: data.language || 'English',
      allergiesNoted: data.allergiesNoted,
    };
    const res = await fetch(`${API_BASE_URL}/dispensing`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to dispense prescription');
    }
    return result;
  },

  // -------------------------------------------------------------
  // AUDITS
  // -------------------------------------------------------------
  async getAudits(): Promise<AuditItem[]> {
    const res = await fetch(`${API_BASE_URL}/audits`, { headers: getHeaders() });
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((a: any) => ({
      ...a,
      id: a.id || a.auditId || a.dispensingId || String(Math.random()),
      rxId: a.rxId || a.dispensingId || `RX-2026-${String(a.id || a.auditId || '001').slice(-5)}`,
      medicine: a.medicine || a.medicineName || 'Medication',
      batch: a.batch || a.batchNumber || 'N/A',
      quantity: Number(a.quantity ?? a.dispensedQuantity ?? 1),
      customer: a.customer || a.customerName || 'Patient',
      pharmacist: a.pharmacist || a.performedByPharmacistName || 'Deepak R',
      date: a.date || (a.auditTimestamp ? new Date(a.auditTimestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today'),
      status: a.status || (a.action === 'DISPENSE_MEDICATION' ? 'Completed' : 'Completed'),
      totalAmount: Number(a.totalAmount ?? a.totalPrice ?? (Number(a.quantity || 1) * 30)),
      timestamp: a.timestamp || a.auditTimestamp || a.date || new Date().toISOString()
    }));
  },

  async logAudit(audit: Partial<AuditItem> & { medicine: string; batch: string; quantity: number; customer: string }): Promise<AuditItem> {
    const res = await fetch(`${API_BASE_URL}/audits`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(audit),
    });
    return await res.json();
  },

  // -------------------------------------------------------------
  // CUSTOMERS
  // -------------------------------------------------------------
  async getCustomers(): Promise<CustomerItem[]> {
    const res = await fetch(`${API_BASE_URL}/customers`, { headers: getHeaders() });
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((c: any) => ({
      ...c,
      id: c.id || c.customerId || String(Math.random()),
      name: c.name || c.customerName || c.fullName || 'Patient',
      phone: c.phone || c.customerPhone || c.mobile || '+91 98450 48123',
      email: c.email || '',
      visits: Number(c.visits ?? c.totalVisits ?? c.visitCount ?? 1),
      lastVisit: c.lastVisit || c.lastDispensedDate || '08 Oct 2026',
      allergies: c.allergies || c.knownAllergies || 'None',
      alerts: Boolean(c.alerts ?? c.safetyAlertConsent ?? c.smsConsent ?? true),
      preferredLang: c.preferredLang || c.preferredLanguage || 'English',
      communicationPreference: ((c.communicationPreference || c.preferredChannel || 'WHATSAPP').toUpperCase()) as 'WHATSAPP' | 'SMS'
    }));
  },

  async addCustomer(customer: Partial<CustomerItem> & { name: string }): Promise<CustomerItem> {
    const res = await fetch(`${API_BASE_URL}/customers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(customer),
    });
    return await res.json();
  },

  async updateCustomer(id: string | number, updates: Partial<CustomerItem>): Promise<CustomerItem> {
    const res = await fetch(`${API_BASE_URL}/customers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    return await res.json();
  },

  // -------------------------------------------------------------
  // SUPPLIERS & RETURNS
  // -------------------------------------------------------------
  async getSuppliers(): Promise<SupplierItem[]> {
    const res = await fetch(`${API_BASE_URL}/suppliers`, { headers: getHeaders() });
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((s: any) => ({
      ...s,
      id: s.id || s.supplierId || String(Math.random()),
      name: s.name || s.supplierName || 'Supplier',
      email: s.email || 'orders@supplier.in',
      phone: s.phone || '+91 80 4122 8890',
      batches: Number(s.batches ?? s.activeBatchesCount ?? 12),
      purchases: s.purchases || s.totalPurchaseValueDisplay || '₹ 1,50,000',
      rating: s.rating || (s.ratingScore !== undefined && s.ratingScore >= 4.5 ? 'Excellent' : 'Good')
    }));
  },

  async addSupplier(supplier: Partial<SupplierItem> & { name: string }): Promise<SupplierItem> {
    const res = await fetch(`${API_BASE_URL}/suppliers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(supplier),
    });
    return await res.json();
  },

  async getReturns(): Promise<ReturnItem[]> {
    const res = await fetch(`${API_BASE_URL}/returns`, { headers: getHeaders() });
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((r: any) => ({
      ...r,
      id: r.id || r.returnId || String(Math.random()),
      supplier: r.supplier || r.supplierName || 'Distributor',
      medicine: r.medicine || r.medicineName || 'Medication',
      batch: r.batch || r.batchNumber || 'N/A',
      expiry: r.expiry || r.expiryDisplay || r.expiryDate || 'N/A',
      quantity: Number(r.quantity ?? r.returnedQuantity ?? 10),
      requestDate: r.requestDate || r.initiatedDate || 'Today',
      status: r.status || 'Pending Approval'
    }));
  },

  async addReturn(returnData: Partial<ReturnItem> & { batch: string; quantity: number; supplierName?: string }): Promise<ReturnItem> {
    const payload = {
      ...returnData,
      supplier: returnData.supplier || returnData.supplierName || 'Distributor',
    };
    const res = await fetch(`${API_BASE_URL}/returns`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  // -------------------------------------------------------------
  // BATCH RECALLS & ALERTS
  // -------------------------------------------------------------
  async getRecalls(): Promise<RecallItem[]> {
    const res = await fetch(`${API_BASE_URL}/recalls`, { headers: getHeaders() });
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((r: any) => ({
      ...r,
      id: r.id || r.recallId || String(Math.random()),
      batch: r.batch || r.batchNumber || 'N/A',
      medicine: r.medicine || r.medicineName || 'Medication',
      reason: r.reason || r.reasonForRecall || 'Packaging seal defect reported by manufacturer CDSCO bulletin',
      status: r.status || 'Active',
      date: r.date || r.recallDate || '08 Oct 2026',
      quarantineQty: Number(r.quarantineQty ?? r.quarantinedQuantity ?? 45),
      affectedCustomers: r.affectedCustomers || [],
      actionTaken: r.actionTaken || 'Quarantined and safety communication initiated'
    }));
  },

  async addRecall(recallData: { batch: string; medicine?: string; reason?: string; actionTaken?: string }): Promise<RecallItem> {
    const res = await fetch(`${API_BASE_URL}/recalls`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(recallData),
    });
    return await res.json();
  },

  async getAlerts(): Promise<AlertItem[]> {
    const res = await fetch(`${API_BASE_URL}/alerts`, { headers: getHeaders() });
    return await res.json();
  },

  // -------------------------------------------------------------
  // INVOICE OCR & EXCEL IMPORT
  // -------------------------------------------------------------
  async importInvoice(params: { invoiceText?: string; fileName?: string; fileBase64?: string; mimeType?: string } | string, fileNameLegacy?: string) {
    const payload = typeof params === 'string'
      ? { invoiceText: params, fileName: fileNameLegacy }
      : params;

    const res = await fetch(`${API_BASE_URL}/import/invoice`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async confirmInvoiceImport(items: any[], invoiceMeta?: any) {
    const res = await fetch(`${API_BASE_URL}/import/invoice/confirm`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ items, invoiceMeta }),
    });
    return await res.json();
  },

  async importExcel(rows: any[]) {
    const res = await fetch(`${API_BASE_URL}/import/excel`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ rows }),
    });
    return await res.json();
  },

  // -------------------------------------------------------------
  // AI ASSISTANT & WHAT-IF SIMULATOR
  // -------------------------------------------------------------
  async askAI(query: string, language: string = 'English', conversationHistory: any[] = []) {
    const res = await fetch(`${API_BASE_URL}/ai/query`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ query, language, conversationHistory }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Server responded with error (${res.status})`);
    }
    return data;
  },


  async simulateScenario(params: {
    medicine?: string;
    batch?: string;
    batchId?: string;
    currentStock: number;
    orderQty: number;
    dailyUsage: number;
    daysToExpiry: number;
    unitCost: number;
    leadTimeDays?: number;
    holdBatch?: boolean;
    demandChangePct?: number;
    dispensingIncreasePct?: number;
  }) {
    const res = await fetch(`${API_BASE_URL}/ai/simulate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    return await res.json();
  },

  async askSimulatorQuestion(params: {
    question: string;
    medicine?: string;
    batch?: string;
    batchId?: string;
    currentStock?: number;
    orderQty?: number;
    dailyUsage?: number;
    daysToExpiry?: number;
    unitCost?: number;
    leadTimeDays?: number;
    holdBatch?: boolean;
    demandChangePct?: number;
  }) {
    const res = await fetch(`${API_BASE_URL}/ai/simulate/ask`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    return await res.json();
  },

  async getTodayIntelligence() {
    const res = await fetch(`${API_BASE_URL}/ai/intelligence`, { headers: getHeaders() });
    return await res.json();
  },

  async getAuditInvestigation() {
    const res = await fetch(`${API_BASE_URL}/ai/audit-investigation`, { headers: getHeaders() });
    return await res.json();
  },

  async getExpiryRisk(batchId: string) {
    const res = await fetch(`${API_BASE_URL}/ai/expiry-risk/${encodeURIComponent(batchId)}`, { headers: getHeaders() });
    return await res.json();
  },

  async getAnalytics() {
    const res = await fetch(`${API_BASE_URL}/reports/analytics`, { headers: getHeaders() });
    return await res.json();
  },

  // -------------------------------------------------------------
  // REAL SMS NOTIFICATION SYSTEM (AUTOMATIC + MANUAL)
  // -------------------------------------------------------------
  async sendManualSms(payload: {
    customer?: string;
    recipientName?: string;
    phone?: string;
    recipientPhone?: string;
    notificationType: string;
    medicine?: string;
    batch?: string;
    language?: string;
    customVariables?: Record<string, any>;
  }) {
    const res = await fetch(`${API_BASE_URL}/sms/send-manual`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || data.success === false) {
      throw new Error(data.error || 'Failed to dispatch SMS');
    }
    return data;
  },

  async triggerAutomaticSmsScan() {
    const res = await fetch(`${API_BASE_URL}/sms/send-automatic-trigger`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return await res.json();
  },

  async getSmsReports(filters: {
    source?: string;
    status?: string;
    language?: string;
    notificationType?: string;
    limit?: number;
  } = {}) {
    const params = new URLSearchParams();
    if (filters.source) params.append('source', filters.source);
    if (filters.status) params.append('status', filters.status);
    if (filters.language) params.append('language', filters.language);
    if (filters.notificationType) params.append('notificationType', filters.notificationType);
    if (filters.limit) params.append('limit', String(filters.limit));

    const res = await fetch(`${API_BASE_URL}/sms/reports?${params.toString()}`, { headers: getHeaders() });
    return await res.json();
  },

  async broadcastRecallSms(batch: string, reason?: string) {
    const res = await fetch(`${API_BASE_URL}/sms/recall-broadcast`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ batch, reason }),
    });
    return await res.json();
  },

  async sendBatchRecallSms(params: { batchNumber: string; medicineName?: string; recallReason?: string }) {
    return this.broadcastRecallSms(params.batchNumber, params.recallReason);
  },

  async sendDispenseSms(data: {
    customerPhone?: string;
    customerName?: string;
    medicineName?: string;
    quantity?: number;
    rxId?: string;
    totalAmount?: number;
    language?: string;
  }) {
    if (!data.customerPhone) return null;
    return this.sendManualSms({
      recipientName: data.customerName || 'Valued Patient',
      recipientPhone: data.customerPhone,
      notificationType: 'DISPENSE_CONFIRMATION',
      medicine: data.medicineName,
      language: data.language || 'English',
      customVariables: {
        medicineName: data.medicineName,
        quantity: data.quantity,
        rxId: data.rxId,
        totalAmount: data.totalAmount,
      },
    });
  },

  async getSmsTemplate(type: string, language: string = 'English', variables: any = {}) {
    const params = new URLSearchParams({
      type,
      language,
      variables: JSON.stringify(variables),
    });
    const res = await fetch(`${API_BASE_URL}/sms/templates?${params.toString()}`, { headers: getHeaders() });
    return await res.json();
  },

  async simulateCarrierCallback(msgId: string) {
    const res = await fetch(`${API_BASE_URL}/sms/callback`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ providerMessageId: msgId, status: 'delivered' }),
    });
    return await res.json();
  },

  async getSmsDeliveryStatus(msgId: string) {
    const res = await fetch(`${API_BASE_URL}/sms/status/${encodeURIComponent(msgId)}`, {
      headers: getHeaders(),
    });
    return await res.json();
  },

  async syncAllSmsStatuses() {
    const res = await fetch(`${API_BASE_URL}/sms/sync-delivery-status`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return await res.json();
  },

  async getSmsConfigStatus() {
    const res = await fetch(`${API_BASE_URL}/sms/config-status`, {
      headers: getHeaders(),
    });
    return await res.json();
  },

  async sendControlledTestSms(data: { phone: string; testType?: string; customMessage?: string }) {
    const res = await fetch(`${API_BASE_URL}/sms/controlled-test`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return await res.json();
  },

  async logSafetyCommunication(data: {
    pharmacyId?: string;
    customerId?: string | number;
    recipientName: string;
    recipientPhone: string;
    notificationType: string;
    medicineId?: string;
    batchId?: string;
    reason?: string;
    communicationPreference?: 'WHATSAPP' | 'SMS';
    selectedChannel: 'WHATSAPP' | 'SMS';
    message: string;
    language?: string;
    pharmacistId?: string;
    status: 'WHATSAPP_OPENED' | 'SMS_COMPOSER_OPENED' | 'COMMUNICATION_INITIATED' | 'CANCELLED' | 'FAILED';
  }) {
    const res = await fetch(`${API_BASE_URL}/communications/log`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return await res.json();
  },

  async getCustomerDetailsTraceability(identifier: string) {
    const res = await fetch(`${API_BASE_URL}/customers/${encodeURIComponent(identifier)}/details-traceability`, {
      headers: getHeaders(),
    });
    return await res.json();
  },

  async getAffectedPatients() {
    const res = await fetch(`${API_BASE_URL}/communications/affected-patients`, {
      headers: getHeaders(),
    });
    return await res.json();
  },

  // -------------------------------------------------------------
  // SETTINGS
  // -------------------------------------------------------------
  async getSettings() {
    const res = await fetch(`${API_BASE_URL}/settings`, { headers: getHeaders() });
    return await res.json();
  },

  async saveSettings(settings: any) {
    const res = await fetch(`${API_BASE_URL}/settings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(settings),
    });
    return await res.json();
  },

  // -------------------------------------------------------------
  // AUTHENTICATION & USERS
  // -------------------------------------------------------------
  async registerUser(userData: {
    fullName: string;
    email: string;
    mobile?: string;
    password?: string;
    regNumber?: string;
    pharmacyName?: string;
    pharmacyType?: string;
    city?: string;
    stateName?: string;
    country?: string;
    preferredLang?: string;
    enableAlerts?: boolean;
  }) {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to register account');
    }
    if (data.token) {
      setApiAuthToken(data.token);
    }
    if (data.user?.pharmacyId) {
      setApiPharmacyId(data.user.pharmacyId);
    }
    return data;
  },

  async loginUser(credentials: { email: string; password?: string }) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(credentials),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid login credentials.');
    }
    if (data.token) {
      setApiAuthToken(data.token);
    }
    if (data.user?.pharmacyId) {
      setApiPharmacyId(data.user.pharmacyId);
    }
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_BASE_URL}/auth/me`, { headers: getHeaders() });
    return await res.json();
  },

  async getUsers() {
    const res = await fetch(`${API_BASE_URL}/users`, { headers: getHeaders() });
    return await res.json();
  },
};


