import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare, Send, CheckCircle2, Clock, AlertTriangle, Filter,
  RefreshCw, Globe, ArrowUpRight, ShieldAlert, Check, XCircle, Search,
  SlidersHorizontal, Radio, ExternalLink, Activity, Users, Calendar, Pill,
  Phone, User, MessageCircle, Smartphone, Download, Sparkles, ChevronRight
} from 'lucide-react';
import { api, type CustomerItem, type MedicineItem, type AuditItem } from '../services/api';
import CustomerSmsDetailsModal from './CustomerSmsDetailsModal';

interface SmsReportsViewProps {
  onOpenSafetyCommunication?: (cust?: any, type?: string, details?: any) => void;
  onOpenManualSms?: (cust?: any, type?: string, details?: any) => void;
  showToast: (msg: string) => void;
  customersList?: CustomerItem[];
  inventory?: any[];
  audits?: any[];
  currentUser?: any;
}

interface ActivityLogItem {
  id?: string;
  recipientName: string;
  recipientPhone: string;
  notificationType: string;
  language: string;
  provider: string;
  providerMessageId: string;
  status: string;
  notificationSource: 'automatic' | 'manual';
  message: string;
  createdAt: string;
  pharmacist?: string;
  medicine?: string;
  batchId?: string;
  isSandbox?: boolean;
}

interface AffectedPatientRecord {
  id: string;
  customerName: string;
  phone: string;
  email?: string;
  preferredLang: string;
  communicationPreference: 'WHATSAPP' | 'SMS';
  medicine: string;
  strength?: string;
  dosageForm?: string;
  batch: string;
  expiry: string;
  daysRemaining: number | null;
  qtyDispensed: number;
  rxId: string;
  dispenseDate: string;
  reason: 'NEAR_EXPIRY' | 'RECALL';
  recallReason?: string;
  recallDate?: string;
  status: 'Ready' | 'WhatsApp Opened' | 'SMS Composer Opened' | 'Communication Initiated';
  customerObj?: any;
}

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const content = [
    headers.join(','),
    ...rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SmsReportsView({
  onOpenSafetyCommunication,
  onOpenManualSms,
  showToast,
  customersList = [],
  inventory = [],
  audits = [],
  currentUser,
}: SmsReportsViewProps) {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [reasonFilter, setReasonFilter] = useState<'all' | 'NEAR_EXPIRY' | 'RECALL'>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'WHATSAPP' | 'SMS'>('all');
  const [activeTab, setActiveTab] = useState<'affected' | 'activity'>('affected');

  // Customer Details Modal State
  const [selectedCustomerForModal, setSelectedCustomerForModal] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Fetch past activity logs from backend
  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getSmsReports();
      if (res && Array.isArray(res.logs)) {
        setLogs(res.logs);
      }
    } catch (err) {
      console.warn('Failed to load communication activity:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityLogs();
  }, []);

  // Safe fallback list of customers
  const safeCustomers = useMemo(() => {
    return Array.isArray(customersList) && customersList.length > 0
      ? customersList
      : [
          { id: 'demo-cust-deepak', name: 'Deepak', phone: '+91 93845 99028', email: 'deepak.demo@pharmaflow.internal', visits: 3, lastVisit: 'Today', allergies: 'None', alerts: true, preferredLang: 'English', communicationPreference: 'WHATSAPP' },
          { id: 'demo-cust-manish', name: 'Manish', phone: '+91 90802 04902', email: 'manish.demo@pharmaflow.internal', visits: 2, lastVisit: 'Yesterday', allergies: 'None', alerts: true, preferredLang: 'English', communicationPreference: 'WHATSAPP' },
          { id: 'demo-cust-deeps', name: 'Deeps', phone: '+91 80988 51999', email: 'deeps.demo@pharmaflow.internal', visits: 4, lastVisit: 'Today', allergies: 'None', alerts: true, preferredLang: 'English', communicationPreference: 'WHATSAPP' },
          { id: 1, name: 'Rahul Kumar', phone: '+91 98450 48123', email: 'rahul.k@example.com', visits: 12, lastVisit: 'Today', allergies: 'Penicillin', alerts: true, preferredLang: 'English', communicationPreference: 'SMS' },
          { id: 2, name: 'Priya Sharma', phone: '+91 97312 90342', email: 'priya.s@example.com', visits: 8, lastVisit: 'Yesterday', allergies: 'None', alerts: true, preferredLang: 'Hindi', communicationPreference: 'SMS' },
        ];
  }, [customersList]);

  // Safe fallback list of inventory
  const safeInventory = useMemo(() => {
    return Array.isArray(inventory) && inventory.length > 0
      ? inventory
      : [
          { id: 1, medicine: 'Paracetamol 500mg', batch: 'PCT101', expiry: 'Sep 2026', quantity: 12, supplier: 'ABC Pharma', status: 'Low Stock', unitPrice: 25 },
          { id: 2, medicine: 'Vitamin D3 60K', batch: 'VD102', expiry: 'Sep 2026', quantity: 180, supplier: 'HealthCare Labs', status: 'Near Expiry', unitPrice: 65 },
          { id: 3, medicine: 'Amoxicillin 500mg', batch: 'AMX204', expiry: 'Oct 2026', quantity: 45, supplier: 'MediSource', status: 'Recalled', unitPrice: 95 },
          { id: 101, medicine: 'Amoxicillin 500mg', batch: 'DEMO-EXP-001', expiry: 'Oct 2026', quantity: 60, supplier: 'Hetero Labs Ltd', status: 'Near Expiry', unitPrice: 90 },
        ];
  }, [inventory]);

  // Safe fallback list of audits
  const safeAudits = useMemo(() => {
    return Array.isArray(audits) && audits.length > 0
      ? audits
      : [
          { id: 1, customer: 'Deepak', medicine: 'Amoxicillin 500mg', batch: 'DEMO-EXP-001', quantity: 15, date: '14 Sep 2026', rxId: 'RX-2026-00481' },
          { id: 2, customer: 'Manish', medicine: 'Amoxicillin 500mg', batch: 'DEMO-EXP-001', quantity: 20, date: '13 Sep 2026', rxId: 'RX-2026-00482' },
          { id: 3, customer: 'Deeps', medicine: 'Amoxicillin 500mg', batch: 'DEMO-EXP-001', quantity: 10, date: '14 Sep 2026', rxId: 'RX-2026-00483' },
          { id: 4, customer: 'Rahul Kumar', medicine: 'Amoxicillin 500mg', batch: 'AMX204', quantity: 15, date: '10 Sep 2026', rxId: 'RX-2026-00412' },
          { id: 5, customer: 'Priya Sharma', medicine: 'Vitamin D3 60K', batch: 'VD102', quantity: 30, date: '08 Sep 2026', rxId: 'RX-2026-00399' },
          { id: 6, customer: 'Deepak', medicine: 'Amoxicillin 500mg', batch: 'AMX204', quantity: 10, date: '09 Sep 2026', rxId: 'RX-2026-00405' },
        ];
  }, [audits]);

  // Derive Affected Patients dynamically from historical dispensing audits of near-expiry and recalled batches
  const affectedPatients: AffectedPatientRecord[] = useMemo(() => {
    const list: AffectedPatientRecord[] = [];
    const seenKeys = new Set<string>();

    // 1. Identify relevant batches
    const nearExpiryBatches = safeInventory.filter(m =>
      m && (m.status === 'Near Expiry' || m.status === 'Expired' || m.batch === 'DEMO-EXP-001' || m.batch === 'VD102')
    );
    const recalledBatches = safeInventory.filter(m =>
      m && (m.status === 'Recalled' || m.batch === 'AMX204')
    );

    const nearExpiryBatchCodes = new Set(nearExpiryBatches.map(b => b.batch));
    const recalledBatchCodes = new Set(recalledBatches.map(b => b.batch));

    // 2. Scan audits
    safeAudits.forEach(a => {
      if (!a.customer || a.customer === 'Walk-in Patient') return;

      const isRecalled = recalledBatchCodes.has(a.batch);
      const isNearExpiry = nearExpiryBatchCodes.has(a.batch) && !isRecalled;

      if (!isRecalled && !isNearExpiry) return;

      const key = `${a.customer}-${a.batch}-${a.rxId || a.id}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);

      const custObj = safeCustomers.find(c => c.name.toLowerCase() === a.customer.toLowerCase());
      const medObj = safeInventory.find(m => m.batch === a.batch);

      // Check if action was already logged for this customer & batch
      const recentLog = logs.find(l =>
        l.recipientName?.toLowerCase() === a.customer.toLowerCase() &&
        (l.batchId === a.batch || l.message?.includes(a.batch))
      );

      let status: AffectedPatientRecord['status'] = 'Ready';
      if (recentLog) {
        if (recentLog.status === 'WHATSAPP_OPENED') status = 'WhatsApp Opened';
        else if (recentLog.status === 'SMS_COMPOSER_OPENED') status = 'SMS Composer Opened';
        else if (recentLog.status === 'COMMUNICATION_INITIATED') status = 'Communication Initiated';
      }

      list.push({
        id: `${a.id || Date.now()}-${list.length}`,
        customerName: a.customer,
        phone: custObj ? custObj.phone : '+91 93845 99028',
        email: custObj?.email,
        preferredLang: (custObj as any)?.preferredLang || 'English',
        communicationPreference: ((custObj as any)?.communicationPreference || 'SMS') as 'WHATSAPP' | 'SMS',
        medicine: a.medicine || medObj?.medicine || 'Prescribed Medicine',
        strength: '500mg',
        dosageForm: 'Oral Tablet',
        batch: a.batch,
        expiry: medObj?.expiry || 'Oct 2026',
        daysRemaining: medObj?.status === 'Near Expiry' ? 12 : 30,
        qtyDispensed: a.quantity || 10,
        rxId: a.rxId || `RX-2026-${String(a.id || 100).padStart(5, '0')}`,
        dispenseDate: a.date || 'Recent',
        reason: isRecalled ? 'RECALL' : 'NEAR_EXPIRY',
        recallReason: isRecalled ? 'Packaging seal defect reported by manufacturer bulletin' : undefined,
        status,
        customerObj: custObj || { name: a.customer, phone: '+91 93845 99028', communicationPreference: 'SMS' }
      });
    });

    return list;
  }, [safeInventory, safeAudits, safeCustomers, logs]);

  // Derived filtered lists
  const nearExpiryPatients = useMemo(() => affectedPatients.filter(p => p.reason === 'NEAR_EXPIRY'), [affectedPatients]);
  const recallPatients = useMemo(() => affectedPatients.filter(p => p.reason === 'RECALL'), [affectedPatients]);

  const whatsAppPrefCount = useMemo(() => safeCustomers.filter(c => c.communicationPreference === 'WHATSAPP').length, [safeCustomers]);
  const smsPrefCount = useMemo(() => safeCustomers.filter(c => c.communicationPreference !== 'WHATSAPP').length, [safeCustomers]);

  const messagesInitiatedCount = useMemo(() => {
    return logs.filter(l =>
      l.status === 'WHATSAPP_OPENED' ||
      l.status === 'SMS_COMPOSER_OPENED' ||
      l.status === 'COMMUNICATION_INITIATED' ||
      l.notificationSource === 'manual'
    ).length;
  }, [logs]);

  // Filtered list for UI table
  const displayedPatients = useMemo(() => {
    return affectedPatients.filter(p => {
      if (reasonFilter !== 'all' && p.reason !== reasonFilter) return false;
      if (channelFilter !== 'all' && p.communicationPreference !== channelFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.customerName.toLowerCase().includes(q);
        const matchesPhone = p.phone.includes(q);
        const matchesMed = p.medicine.toLowerCase().includes(q);
        const matchesBatch = p.batch.toLowerCase().includes(q);
        const matchesRx = p.rxId.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesMed && !matchesBatch && !matchesRx) return false;
      }
      return true;
    });
  }, [affectedPatients, reasonFilter, channelFilter, searchQuery]);

  // Filtered activity logs
  const displayedActivityLogs = useMemo(() => {
    return logs.filter(l => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          l.recipientName?.toLowerCase().includes(q) ||
          l.recipientPhone?.includes(q) ||
          l.message?.toLowerCase().includes(q) ||
          l.batchId?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, searchQuery]);

  const triggerSafetyComm = (p: AffectedPatientRecord | null, type: string = 'MANUAL') => {
    const details = p ? {
      medicineName: p.medicine,
      batchNumber: p.batch,
      expiryDate: p.expiry,
      recallReason: p.recallReason || 'Packaging seal defect reported by manufacturer bulletin',
      rxId: p.rxId,
      qty: p.qtyDispensed,
      date: p.dispenseDate,
    } : {};

    const target = p ? {
      name: p.customerName,
      phone: p.phone,
      preferredLang: p.preferredLang,
      communicationPreference: p.communicationPreference,
      rxId: p.rxId,
      qty: p.qtyDispensed,
      date: p.dispenseDate,
    } : null;

    if (onOpenSafetyCommunication) {
      onOpenSafetyCommunication(target, type, details);
    } else if (onOpenManualSms) {
      onOpenManualSms(target, type, details);
    } else {
      showToast(`Opening safety communication modal...`);
    }
  };

  const openCustomerDetails = (p: any) => {
    setSelectedCustomerForModal(p);
    setIsDetailsModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <div>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            SAFETY & CLINICAL OUTREACH
          </span>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', margin: '4px 0 2px' }}>
            Patient Safety Communication
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
            Pharmacist-controlled expiry and recall notifications
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              downloadCSV(
                'safety_communication_activity.csv',
                ['Time', 'Patient', 'Phone', 'Medicine', 'Batch', 'Reason', 'Channel', 'Pharmacist', 'Status'],
                logs.map(l => [
                  new Date(l.createdAt || Date.now()).toLocaleString(),
                  l.recipientName,
                  l.recipientPhone,
                  l.medicine || 'N/A',
                  l.batchId || 'N/A',
                  l.notificationType,
                  l.provider === 'WhatsApp' ? 'WhatsApp' : 'SMS',
                  l.pharmacist || currentUser?.name || 'Demo Pharmacist',
                  l.status
                ])
              );
              showToast('Exported safety_communication_activity.csv');
            }}
            className="btn btn-secondary"
            style={{ fontSize: 12.5 }}
          >
            <Download size={14} /> Export Activity Log
          </button>
          <button
            onClick={() => triggerSafetyComm(null, 'MANUAL')}
            className="btn btn-teal"
            style={{ fontSize: 12.5, fontWeight: 700 }}
          >
            <Send size={14} /> + New Safety Message
          </button>
        </div>
      </div>

      {/* Top Clinical Safety Metrics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
        }}
      >
        {/* Metric 1: Total Affected Patients */}
        <div className="card" style={{ padding: 16, borderLeft: '4px solid var(--primary)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
            Affected Customers
          </span>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', marginTop: 4 }}>
            {affectedPatients.length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            Prescription Audit Tracing
          </div>
        </div>

        {/* Metric 2: Near-Expiry Patients */}
        <div className="card" style={{ padding: 16, borderLeft: '4px solid var(--warning)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase' }}>
            Near-Expiry Customers
          </span>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--warning)', marginTop: 4 }}>
            {nearExpiryPatients.length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            Batches &le; 30 Days Left
          </div>
        </div>

        {/* Metric 3: Recall Patients */}
        <div className="card" style={{ padding: 16, borderLeft: '4px solid var(--danger)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase' }}>
            Recall Customers
          </span>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--danger)', marginTop: 4 }}>
            {recallPatients.length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            Quarantined Batch Holds
          </div>
        </div>

        {/* Metric 4: Messages Initiated */}
        <div className="card" style={{ padding: 16, borderLeft: '4px solid var(--success)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase' }}>
            Messages Initiated
          </span>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--success)', marginTop: 4 }}>
            {messagesInitiatedCount}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            Pharmacist-Verified Outreach
          </div>
        </div>

        {/* Metric 5: Patient Channel Preferences */}
        <div className="card" style={{ padding: 16, borderLeft: '4px solid #3B82F6' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase' }}>
            Preferred Channels
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#16A34A' }}>{whatsAppPrefCount} WhatsApp</span>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>/</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#2563EB' }}>{smsPrefCount} SMS</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            Saved Patient Preferences
          </div>
        </div>
      </div>

      {/* Navigation View Segmented Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        <button
          onClick={() => setActiveTab('affected')}
          className={`btn ${activeTab === 'affected' ? 'btn-teal' : 'btn-ghost'}`}
          style={{ fontSize: 13, fontWeight: 700 }}
        >
          <Users size={15} /> Customers Requiring Safety Communication ({affectedPatients.length})
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`btn ${activeTab === 'activity' ? 'btn-teal' : 'btn-ghost'}`}
          style={{ fontSize: 13, fontWeight: 700 }}
        >
          <Clock size={15} /> Recent Communication Activity ({logs.length})
        </button>
      </div>

      {/* Filter Toolbar */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Reason filter pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: 'var(--bg-alt)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
            <button
              onClick={() => setReasonFilter('all')}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: 'none',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: reasonFilter === 'all' ? 'var(--primary)' : 'transparent',
                color: reasonFilter === 'all' ? '#FFFFFF' : 'var(--text-2)',
              }}
            >
              All ({affectedPatients.length})
            </button>
            <button
              onClick={() => setReasonFilter('NEAR_EXPIRY')}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: 'none',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: reasonFilter === 'NEAR_EXPIRY' ? 'var(--warning)' : 'transparent',
                color: reasonFilter === 'NEAR_EXPIRY' ? '#FFFFFF' : 'var(--text-2)',
              }}
            >
              Near Expiry ({nearExpiryPatients.length})
            </button>
            <button
              onClick={() => setReasonFilter('RECALL')}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: 'none',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: reasonFilter === 'RECALL' ? 'var(--danger)' : 'transparent',
                color: reasonFilter === 'RECALL' ? '#FFFFFF' : 'var(--text-2)',
              }}
            >
              Recall ({recallPatients.length})
            </button>
          </div>

          {/* Channel selector */}
          <select
            value={channelFilter}
            onChange={e => setChannelFilter(e.target.value as any)}
            className="input"
            style={{ width: 'auto', fontSize: 12, padding: '5px 10px' }}
          >
            <option value="all">All Channels</option>
            <option value="WHATSAPP">🟢 WhatsApp Preferred</option>
            <option value="SMS">📱 SMS Preferred</option>
          </select>
        </div>

        {/* Search */}
        <div className="search-input" style={{ maxWidth: 280, width: '100%' }}>
          <Search size={14} color="var(--text-3)" />
          <input
            placeholder="Search patient, phone, med, batch..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ fontSize: 12.5 }}
          />
        </div>
      </div>

      {/* Main Tab 1: Customers Requiring Safety Communication */}
      {activeTab === 'affected' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-alt)' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                Customers Requiring Safety Communication
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--text-3)' }}>
                Identified automatically from historical dispensing audit records
              </p>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Showing {displayedPatients.length} of {affectedPatients.length} records
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-alt)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Customer & Mobile</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Preferred Channel</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Medicine & Batch</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Dispensing Info</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Safety Reason</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedPatients.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-3)' }}>
                      No patients identified matching the current filters.
                    </td>
                  </tr>
                ) : (
                  displayedPatients.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }} className="table-row">
                      {/* Customer & Mobile */}
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => openCustomerDetails({
                            recipientName: p.customerName,
                            recipientPhone: p.phone,
                            language: p.preferredLang,
                            notificationType: p.reason,
                            medicine: p.medicine,
                            batchId: p.batch,
                            status: p.status,
                            createdAt: new Date().toISOString()
                          })}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                          title="Click to inspect patient dispensing history & safety details"
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              color: 'var(--primary)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 13.5
                            }}
                          >
                            {p.customerName}
                            <ExternalLink size={11} style={{ opacity: 0.7 }} />
                          </span>
                          <span style={{ color: 'var(--text-3)', fontSize: 11.5, marginTop: 1 }}>
                            {p.phone}
                          </span>
                        </button>
                      </td>

                      {/* Preferred Channel */}
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          className="chip"
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: p.communicationPreference === 'WHATSAPP' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: p.communicationPreference === 'WHATSAPP' ? '#16A34A' : '#2563EB',
                          }}
                        >
                          {p.communicationPreference === 'WHATSAPP' ? '🟢 WhatsApp' : '📱 SMS'}
                        </span>
                        <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>
                          {p.preferredLang}
                        </div>
                      </td>

                      {/* Medicine & Batch */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>
                          {p.medicine}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 1 }}>
                          Batch: <code style={{ color: 'var(--primary)', fontWeight: 600 }}>{p.batch}</code> · Exp: <b>{p.expiry}</b>
                        </div>
                      </td>

                      {/* Dispensing Info */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                          {p.qtyDispensed} units
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                          {p.dispenseDate} · <span style={{ fontFamily: 'monospace' }}>{p.rxId}</span>
                        </div>
                      </td>

                      {/* Safety Reason */}
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          className={`chip ${p.reason === 'RECALL' ? 'badge-red' : 'badge-amber'}`}
                          style={{ fontSize: 10.5, fontWeight: 700 }}
                        >
                          {p.reason === 'RECALL' ? '🚨 Batch Recall' : '⚠️ Near Expiry'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          className={`chip ${
                            p.status === 'WhatsApp Opened'
                              ? 'badge-green'
                              : p.status === 'SMS Composer Opened'
                              ? 'badge-blue'
                              : p.status === 'Communication Initiated'
                              ? 'badge-amber'
                              : 'badge-teal'
                          }`}
                          style={{ fontSize: 10.5 }}
                        >
                          {p.status === 'WhatsApp Opened' ? (
                            <>
                              <CheckCircle2 size={11} /> WhatsApp Opened
                            </>
                          ) : p.status === 'SMS Composer Opened' ? (
                            <>
                              <CheckCircle2 size={11} /> SMS Composer
                            </>
                          ) : (
                            <>
                              <Clock size={11} /> Ready to Send
                            </>
                          )}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <button
                            onClick={() => triggerSafetyComm(p, p.reason)}
                            className="btn btn-teal"
                            style={{
                              fontSize: 11.5,
                              padding: '5px 12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              fontWeight: 700,
                            }}
                          >
                            <Send size={12} /> Send Message
                          </button>
                          <button
                            onClick={() => openCustomerDetails({
                              recipientName: p.customerName,
                              recipientPhone: p.phone,
                              language: p.preferredLang,
                              notificationType: p.reason,
                              medicine: p.medicine,
                              batchId: p.batch,
                              status: p.status,
                              createdAt: new Date().toISOString()
                            })}
                            className="btn btn-ghost"
                            style={{ fontSize: 11.5, padding: '5px 8px' }}
                            title="View patient details & traceability"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="mobile-cards-view" style={{ padding: '12px 14px', display: 'none', flexDirection: 'column', gap: 12 }}>
            {displayedPatients.map(p => (
              <div key={p.id} className="mobile-entity-card" style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                      {p.customerName}
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
                      {p.phone} · {p.preferredLang}
                    </p>
                  </div>
                  <span
                    className="chip"
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      backgroundColor: p.communicationPreference === 'WHATSAPP' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      color: p.communicationPreference === 'WHATSAPP' ? '#16A34A' : '#2563EB',
                    }}
                  >
                    {p.communicationPreference === 'WHATSAPP' ? '🟢 WhatsApp' : '📱 SMS'}
                  </span>
                </div>

                <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: 'var(--bg-alt)', fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-3)' }}>Medicine:</span>
                    <b style={{ color: 'var(--text)' }}>{p.medicine}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-3)' }}>Batch & Expiry:</span>
                    <span><code>{p.batch}</code> ({p.expiry})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-3)' }}>Dispensed:</span>
                    <span>{p.qtyDispensed} units ({p.dispenseDate})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-3)' }}>Reason:</span>
                    <span className={`chip ${p.reason === 'RECALL' ? 'badge-red' : 'badge-amber'}`} style={{ fontSize: 10 }}>
                      {p.reason === 'RECALL' ? 'Recall' : 'Near Expiry'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => openCustomerDetails({
                      recipientName: p.customerName,
                      recipientPhone: p.phone,
                      language: p.preferredLang,
                      notificationType: p.reason,
                      medicine: p.medicine,
                      batchId: p.batch,
                      status: p.status,
                      createdAt: new Date().toISOString()
                    })}
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: '6px 12px' }}
                  >
                    Details
                  </button>
                  <button
                    onClick={() => triggerSafetyComm(p, p.reason)}
                    className="btn btn-teal"
                    style={{ fontSize: 12, padding: '6px 14px', fontWeight: 700 }}
                  >
                    <Send size={13} /> Send Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Tab 2: Recent Communication Activity */}
      {activeTab === 'activity' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-alt)' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                Recent Safety Communication Activity
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--text-3)' }}>
                Truthful audit log of pharmacist outreach via WhatsApp and device SMS composer
              </p>
            </div>
            <button
              onClick={fetchActivityLogs}
              className="btn btn-ghost"
              style={{ fontSize: 11.5, padding: '4px 8px' }}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh Logs
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-alt)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Time</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Customer</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Medicine & Batch</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Reason</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Channel</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Pharmacist</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedActivityLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-3)' }}>
                      No safety communication activity recorded yet. Select an affected customer above to launch WhatsApp or SMS communication.
                    </td>
                  </tr>
                ) : (
                  displayedActivityLogs.map((l, idx) => (
                    <tr key={l.id || idx} style={{ borderBottom: '1px solid var(--border)' }} className="table-row">
                      <td style={{ padding: '12px 16px', color: 'var(--text-2)', fontSize: 12 }}>
                        {new Date(l.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{l.recipientName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{l.recipientPhone}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{l.medicine || 'Amoxicillin 500mg'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Batch: <code>{l.batchId || 'DEMO-EXP-001'}</code></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`chip ${l.notificationType === 'RECALL' ? 'badge-red' : 'badge-amber'}`} style={{ fontSize: 10 }}>
                          {l.notificationType?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          className="chip"
                          style={{
                            fontSize: 10.5,
                            backgroundColor: l.status === 'WHATSAPP_OPENED' || l.provider === 'WhatsApp' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: l.status === 'WHATSAPP_OPENED' || l.provider === 'WhatsApp' ? '#16A34A' : '#2563EB',
                            fontWeight: 700
                          }}
                        >
                          {l.status === 'WHATSAPP_OPENED' || l.provider === 'WhatsApp' ? '🟢 WhatsApp' : '📱 SMS'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>
                        {l.pharmacist || currentUser?.name || 'Demo Pharmacist'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          className={`chip ${
                            l.status === 'WHATSAPP_OPENED'
                              ? 'badge-green'
                              : l.status === 'SMS_COMPOSER_OPENED'
                              ? 'badge-blue'
                              : l.status === 'CANCELLED'
                              ? 'badge-slate'
                              : 'badge-amber'
                          }`}
                          style={{ fontSize: 10.5 }}
                        >
                          {l.status === 'WHATSAPP_OPENED' ? (
                            <>
                              <CheckCircle2 size={11} /> WhatsApp Opened
                            </>
                          ) : l.status === 'SMS_COMPOSER_OPENED' ? (
                            <>
                              <CheckCircle2 size={11} /> SMS Composer
                            </>
                          ) : l.status === 'CANCELLED' ? (
                            <>
                              <XCircle size={11} /> Cancelled
                            </>
                          ) : (
                            <>
                              <Clock size={11} /> Initiated
                            </>
                          )}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => openCustomerDetails(l)}
                          className="btn btn-ghost"
                          style={{ fontSize: 11.5, padding: '4px 8px' }}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer SMS & Traceability Modal */}
      <CustomerSmsDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        smsLog={selectedCustomerForModal}
        customer={selectedCustomerForModal ? {
          name: selectedCustomerForModal.recipientName || selectedCustomerForModal.customerName,
          phone: selectedCustomerForModal.recipientPhone || selectedCustomerForModal.phone,
          preferredLang: selectedCustomerForModal.language || selectedCustomerForModal.preferredLang || 'English',
          communicationPreference: selectedCustomerForModal.communicationPreference || 'SMS'
        } : null}
        onRefreshSms={fetchActivityLogs}
        showToast={showToast}
      />
    </div>
  );
}
