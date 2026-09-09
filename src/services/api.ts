// API Client for interacting with the Node.js / Express Backend & Firebase Firestore
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

let activePharmacyId = 'DEMO_PHARMACY';

export function setApiPharmacyId(id: string) {
  activePharmacyId = id || 'DEMO_PHARMACY';
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
      pharmacist: data.pharmacist || data.pharmacistName || 'Dr. Anita Rao',
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
  async askAI(query: string) {
    const res = await fetch(`${API_BASE_URL}/ai/query`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ query }),
    });
    return await res.json();
  },

  async simulateScenario(params: {
    medicine?: string;
    currentStock: number;
    orderQty: number;
    dailyUsage: number;
    daysToExpiry: number;
    unitCost: number;
  }) {
    const res = await fetch(`${API_BASE_URL}/ai/simulate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    return await res.json();
  },

  async getAnalytics() {
    const res = await fetch(`${API_BASE_URL}/reports/analytics`, { headers: getHeaders() });
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
