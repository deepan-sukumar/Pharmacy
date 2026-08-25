export type Role = 'Pharmacist' | 'Administrator';
export type Page = 'dashboard'|'inventory'|'add-stock'|'expiry'|'dispensing'|'audit'|'customers'|'alerts'|'suppliers'|'recall'|'ai'|'reports'|'settings';
export type AdminPage = 'admin-dashboard'|'user-management'|'roles'|'pharmacy-management'|'system-audit'|'data-management'|'backup'|'security'|'notifications'|'ai-config'|'system-settings'|'admin-reports'|'activity';
export type Status = 'Available'|'Near Expiry'|'Recalled'|'Low Stock'|'Expired';
export type Medicine = { id:number; medicine:string; batch:string; expiry:string; quantity:number; supplier:string; status:Status };
export type Audit = { id:number; date:string; medicine:string; batch:string; quantity:number; customer:string; pharmacist:string; status:string };

export const initialInventory: Medicine[] = [
  { id:1, medicine:'Paracetamol 500mg', batch:'PCT101', expiry:'Sep 2026', quantity:120, supplier:'ABC Pharma', status:'Available' },
  { id:2, medicine:'Vitamin D3 60K', batch:'VD102', expiry:'Sep 2026', quantity:180, supplier:'HealthCare Labs', status:'Near Expiry' },
  { id:3, medicine:'Amoxicillin 500mg', batch:'AMX204', expiry:'Oct 2026', quantity:45, supplier:'MediSource', status:'Recalled' },
  { id:4, medicine:'Cetirizine 10mg', batch:'CTZ302', expiry:'Jan 2027', quantity:320, supplier:'Nova Pharma', status:'Available' },
  { id:5, medicine:'Azithromycin 250mg', batch:'AZI109', expiry:'Nov 2026', quantity:68, supplier:'MediSource', status:'Low Stock' },
  { id:6, medicine:'Metformin 500mg', batch:'MET501', expiry:'Mar 2027', quantity:410, supplier:'ABC Pharma', status:'Available' },
];

export const customers = ['Rahul Kumar','Priya Sharma','Arun Kumar','Kavya S','Meena Devi'];
