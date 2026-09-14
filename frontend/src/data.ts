export type Role = 'Pharmacist';
export type Page = 'dashboard'|'inventory'|'add-stock'|'expiry'|'dispensing'|'audit'|'customers'|'alerts'|'suppliers'|'recall'|'ai'|'simulator'|'reports'|'settings'|'sms-reports';
export type Status = 'Available'|'Near Expiry'|'Recalled'|'Low Stock'|'Expired';
export type Medicine = { id: number | string; medicine: string; batch: string; expiry: string; quantity: number; supplier: string; status: Status; unitPrice?: number };
export type Audit = { id: number | string; date: string; medicine: string; batch: string; quantity: number; customer: string; pharmacist: string; status: string; rxId?: string; totalAmount?: number };

export type CommunicationPreference = 'WHATSAPP' | 'SMS';

export type CustomerItem = {
  id: number | string;
  name: string;
  phone: string;
  email: string;
  visits: number;
  lastVisit: string;
  allergies?: string;
  alerts: boolean;
  preferredLang?: string;
  communicationPreference?: CommunicationPreference;
};

export type SupplierItem = {
  id: number | string;
  name: string;
  email: string;
  batches: number;
  purchases: string;
  rating: string;
  phone: string;
};

export const initialInventory: Medicine[] = [
  { id:1, medicine:'Paracetamol 500mg', batch:'PCT101', expiry:'Sep 2026', quantity:120, supplier:'ABC Pharma', status:'Available', unitPrice: 25 },
  { id:2, medicine:'Vitamin D3 60K', batch:'VD102', expiry:'Sep 2026', quantity:180, supplier:'HealthCare Labs', status:'Near Expiry', unitPrice: 65 },
  { id:3, medicine:'Amoxicillin 500mg', batch:'AMX204', expiry:'Oct 2026', quantity:45, supplier:'MediSource', status:'Recalled', unitPrice: 95 },
  { id:4, medicine:'Cetirizine 10mg', batch:'CTZ302', expiry:'Jan 2027', quantity:320, supplier:'Nova Pharma', status:'Available', unitPrice: 35 },
  { id:5, medicine:'Azithromycin 250mg', batch:'AZI109', expiry:'Nov 2026', quantity:68, supplier:'MediSource', status:'Low Stock', unitPrice: 120 },
  { id:6, medicine:'Metformin 500mg', batch:'MET501', expiry:'Mar 2027', quantity:410, supplier:'ABC Pharma', status:'Available', unitPrice: 45 },
];

export const initialCustomers: CustomerItem[] = [
  { id: 1, name: 'Rahul Kumar', phone: '+91 98450 48123', email: 'rahul.k@example.com', visits: 12, lastVisit: 'Today', allergies: 'Penicillin', alerts: true, preferredLang: 'English', communicationPreference: 'SMS' },
  { id: 2, name: 'Priya Sharma', phone: '+91 97312 90342', email: 'priya.s@example.com', visits: 8, lastVisit: 'Yesterday', allergies: 'None', alerts: true, preferredLang: 'Hindi', communicationPreference: 'SMS' },
  { id: 3, name: 'Arun Kumar', phone: '+91 94480 77109', email: 'arun.k@example.com', visits: 6, lastVisit: 'Aug 18', allergies: 'Sulfa drugs', alerts: true, preferredLang: 'Kannada', communicationPreference: 'SMS' },
  { id: 4, name: 'Kavya S', phone: '+91 99001 22584', email: 'kavya.s@example.com', visits: 4, lastVisit: 'Aug 12', allergies: 'None', alerts: false, preferredLang: 'Tamil', communicationPreference: 'SMS' },
  { id: 5, name: 'Meena Devi', phone: '+91 96114 64190', email: 'meena.d@example.com', visits: 3, lastVisit: 'Aug 04', allergies: 'Aspirin', alerts: true, preferredLang: 'Telugu', communicationPreference: 'SMS' },
  { id: 'demo-cust-deepak', name: 'Deepak', phone: '+91 93845 99028', email: 'deepak.demo@pharmaflow.internal', visits: 3, lastVisit: 'Today', allergies: 'None', alerts: true, preferredLang: 'English', communicationPreference: 'WHATSAPP' },
  { id: 'demo-cust-manish', name: 'Manish', phone: '+91 90802 04902', email: 'manish.demo@pharmaflow.internal', visits: 2, lastVisit: 'Yesterday', allergies: 'None', alerts: true, preferredLang: 'English', communicationPreference: 'WHATSAPP' },
  { id: 'demo-cust-deeps', name: 'Deeps', phone: '+91 80988 51999', email: 'deeps.demo@pharmaflow.internal', visits: 4, lastVisit: 'Today', allergies: 'None', alerts: true, preferredLang: 'English', communicationPreference: 'WHATSAPP' },
];

export const initialSuppliers: SupplierItem[] = [
  { id: 1, name: 'ABC Pharma', email: 'supp@abcpharma.com', batches: 24, purchases: '₹ 2,48,600', rating: 'Excellent', phone: '+91 80 4122 8890' },
  { id: 2, name: 'MediSource Distributors', email: 'orders@medisource.in', batches: 18, purchases: '₹ 1,82,400', rating: 'Good', phone: '+91 80 2671 4452' },
  { id: 3, name: 'HealthCare Labs', email: 'care@healthcarelabs.com', batches: 12, purchases: '₹ 98,200', rating: 'Good', phone: '+91 80 3344 1120' },
  { id: 4, name: 'Nova Pharma Ltd', email: 'dispatch@novapharma.com', batches: 9, purchases: '₹ 74,800', rating: 'Excellent', phone: '+91 80 5566 7788' },
];

export const customers = initialCustomers.map(c => c.name);

