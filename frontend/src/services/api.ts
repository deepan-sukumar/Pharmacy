// API Client for interacting with the Node.js / Express Backend & Firebase Firestore
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port !== '5000' ? 'http://localhost:5000/api' : '/api');


let activePharmacyId = '';

export function setApiPharmacyId(id: string) {
  activePharmacyId = (id || '').trim();
}

export function getApiPharmacyId(): string {
  return activePharmacyId;
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-pharmacy-id': activePharmacyId,
  };
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
    return await res.json();
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
    return await res.json();
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
    return await res.json();
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
    return await res.json();
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
    return await res.json();
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
    return await res.json();
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
  async importInvoice(invoiceText?: string, fileName?: string) {
    const res = await fetch(`${API_BASE_URL}/import/invoice`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ invoiceText, fileName }),
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
    batchId?: string;
    currentStock: number;
    orderQty: number;
    dailyUsage: number;
    daysToExpiry: number;
    unitCost: number;
    leadTimeDays?: number;
  }) {
    const res = await fetch(`${API_BASE_URL}/ai/simulate`, {
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
    return data;
  },

  async loginUser(credentials: { email: string; password?: string }) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(credentials),
    });
    return await res.json();
  },

  async getUsers() {
    const res = await fetch(`${API_BASE_URL}/users`, { headers: getHeaders() });
    return await res.json();
  },
};

