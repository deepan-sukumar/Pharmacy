import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare, Send, CheckCircle2, Clock, AlertTriangle, Filter,
  RefreshCw, Globe, ArrowUpRight, ShieldAlert, Check, XCircle, Search,
  SlidersHorizontal, Radio, ExternalLink, Activity, Users, Calendar, Pill,
  Phone, User, MessageCircle, Smartphone, Download, Sparkles, ChevronRight
} from 'lucide-react';
import { api, type CustomerItem, type MedicineItem, type AuditItem } from '../services/api';
import CustomerSmsDetailsModal from './CustomerSmsDetailsModal';
import { formatReadableDate } from './SafetyCommunicationModal';

interface SmsReportsViewProps {
  onOpenSafetyCommunication?: (cust?: any, type?: string, details?: any) => void;
  onOpenManualSms?: (cust?: any, type?: string, details?: any) => void;
  onRefresh?: () => Promise<void> | void;
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

// Authoritative calculation of days remaining until batch expiry
export function parseDaysRemaining(expiryStr?: string | null): number {
  if (!expiryStr) return 999;
  const str = String(expiryStr).trim();
  if (!str) return 999;

  let expiryDate = new Date(str);
  if (isNaN(expiryDate.getTime())) {
    // Handle format "Sep 2026" or "Oct 2026"
    const parts = str.split(/\s+/);
    if (parts.length === 2) {
      const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const mIdx = monthNames.indexOf(parts[0].toLowerCase().slice(0, 3));
      const year = parseInt(parts[1], 10);
      if (mIdx >= 0 && !isNaN(year)) {
        // End of that month
        expiryDate = new Date(year, mIdx + 1, 0);
      }
    }
  }

  if (isNaN(expiryDate.getTime())) return 999;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);

  const diffTime = expiryDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
  onRefresh,
  showToast,
  customersList = [],
  inventory = [],
  audits = [],
  currentUser,
}: SmsReportsViewProps) {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      await fetchActivityLogs();
      showToast('Refreshed patient safety and near-expiry records from Firestore');
    } catch (err: any) {
      console.warn('Error refreshing safety data:', err);
      showToast('Failed to refresh data: ' + (err?.message || 'Network error'));
    } finally {
      setRefreshing(false);
    }
  };

  const safeCustomers = Array.isArray(customersList) ? customersList : [];
  const safeInventory = Array.isArray(inventory) ? inventory : [];
  const safeAudits = Array.isArray(audits) ? audits : [];

  // Derive Affected Patients dynamically based purely on BATCH EXPIRY DATE and RECALL STATUS
  const affectedPatients: AffectedPatientRecord[] = useMemo(() => {
    const list: AffectedPatientRecord[] = [];
    const seenKeys = new Set<string>();

    // 1. Map inventory batches by batch code with authoritative expiry calculation
    const batchMap = new Map<string, {
      medicine: string;
      batch: string;
      expiry: string;
      formattedExpiry: string;
      daysRemaining: number | null;
      isRecalled: boolean;
      isNearExpiry: boolean;
      isExpired: boolean;
      status: string;
    }>();

    safeInventory.forEach(med => {
      if (!med || !med.batch) return;
      const isRecalled = med.status === 'Recalled';
      const days = parseDaysRemaining(med.expiry);
      const isExpired = !isRecalled && (days <= 0 || med.status === 'Expired');
      // Near Expiry rule: Expiry is in the future AND <= 30 days remaining
      const isNearExpiry = !isRecalled && !isExpired && ((days > 0 && days <= 30) || med.status === 'Near Expiry');

      batchMap.set(med.batch, {
        medicine: med.medicine,
        batch: med.batch,
        expiry: med.expiry,
        formattedExpiry: formatReadableDate(med.expiry),
        daysRemaining: isRecalled ? null : days,
        isRecalled,
        isNearExpiry,
        isExpired,
        status: med.status
      });
    });

    // 2. Scan historical dispensing records and match exposed customers
    safeAudits.forEach(a => {
      if (!a || !a.customer || a.customer === 'Walk-in Patient' || !a.batch) return;

      const bInfo = batchMap.get(a.batch);
      if (!bInfo) return;

      // EXCLUSION: If the batch is normal (not recalled and not near-expiry, e.g. expires 2027), DO NOT INCLUDE!
      if (!bInfo.isRecalled && !bInfo.isNearExpiry) return;

      const key = `${a.customer}-${a.batch}-${a.rxId || a.id}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);

      const custObj = safeCustomers.find(c => c.name.toLowerCase() === a.customer.toLowerCase());

      // Check if action was already logged for this customer & batch
      const recentLog = logs.find(l =>
        l.recipientName?.toLowerCase() === a.customer.toLowerCase() &&
        (l.batchId === a.batch || (l.message && l.message.includes(a.batch)))
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
        phone: custObj ? custObj.phone : (a.phone || '+91 93845 99028'),
        email: custObj?.email,
        preferredLang: (custObj as any)?.preferredLang || 'English',
        communicationPreference: (((custObj as any)?.communicationPreference || 'SMS').toUpperCase()) as 'WHATSAPP' | 'SMS',
        medicine: a.medicine || bInfo.medicine,
        strength: '500mg',
        dosageForm: 'Oral Tablet',
        batch: a.batch,
        expiry: bInfo.formattedExpiry,
        daysRemaining: bInfo.daysRemaining,
        qtyDispensed: Number(a.quantity) || 10,
        rxId: a.rxId || `RX-2026-${String(a.id || 100).padStart(5, '0')}`,
        dispenseDate: formatReadableDate(a.date || a.timestamp),
        reason: bInfo.isRecalled ? 'RECALL' : 'NEAR_EXPIRY',
        recallReason: bInfo.isRecalled ? 'Packaging seal defect reported by manufacturer CDSCO bulletin' : undefined,
        status,
        customerObj: custObj || { name: a.customer, phone: a.phone || '+91 93845 99028', communicationPreference: 'SMS' }
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
      dispensedDate: p.dispenseDate,
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
      dispensedDate: p.dispenseDate,
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

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={handleRefreshAll}
            className="btn btn-secondary"
            style={{ fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            title="Refresh expiry and customer safety data"
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
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
            <Download size={14} /> Export Log
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
            Batches &le; 30 Days Remaining
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
            Pharmacist Outreach Logs
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
          <Activity size={15} /> Communication Activity & History ({logs.length})
        </button>
      </div>

      {/* TAB 1: AFFECTED PATIENTS TABLE */}
      {activeTab === 'affected' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Controls & Filter Toolbar */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={() => setReasonFilter('all')}
                className="btn btn-secondary"
                style={{
                  fontSize: 12,
                  padding: '5px 12px',
                  backgroundColor: reasonFilter === 'all' ? 'var(--primary)' : 'transparent',
                  color: reasonFilter === 'all' ? '#FFFFFF' : 'var(--text-2)',
                  borderColor: reasonFilter === 'all' ? 'var(--primary)' : 'var(--border)',
                  fontWeight: reasonFilter === 'all' ? 700 : 500,
                }}
              >
                All ({affectedPatients.length})
              </button>
              <button
                onClick={() => setReasonFilter('NEAR_EXPIRY')}
                className="btn btn-secondary"
                style={{
                  fontSize: 12,
                  padding: '5px 12px',
                  backgroundColor: reasonFilter === 'NEAR_EXPIRY' ? 'var(--warning)' : 'transparent',
                  color: reasonFilter === 'NEAR_EXPIRY' ? '#FFFFFF' : 'var(--text-2)',
                  borderColor: reasonFilter === 'NEAR_EXPIRY' ? 'var(--warning)' : 'var(--border)',
                  fontWeight: reasonFilter === 'NEAR_EXPIRY' ? 700 : 500,
                }}
              >
                ⚠️ Near Expiry ({nearExpiryPatients.length})
              </button>
              <button
                onClick={() => setReasonFilter('RECALL')}
                className="btn btn-secondary"
                style={{
                  fontSize: 12,
                  padding: '5px 12px',
                  backgroundColor: reasonFilter === 'RECALL' ? 'var(--danger)' : 'transparent',
                  color: reasonFilter === 'RECALL' ? '#FFFFFF' : 'var(--text-2)',
                  borderColor: reasonFilter === 'RECALL' ? 'var(--danger)' : 'var(--border)',
                  fontWeight: reasonFilter === 'RECALL' ? 700 : 500,
                }}
              >
                🚨 Recalls ({recallPatients.length})
              </button>
            </div>

            {/* Channel Filters & Search */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => setChannelFilter('all')}
                  className={`chip ${channelFilter === 'all' ? 'badge-blue' : ''}`}
                  style={{ fontSize: 11, cursor: 'pointer', border: '1px solid var(--border)' }}
                >
                  All Channels
                </button>
                <button
                  onClick={() => setChannelFilter('WHATSAPP')}
                  className={`chip ${channelFilter === 'WHATSAPP' ? 'badge-green' : ''}`}
                  style={{ fontSize: 11, cursor: 'pointer', border: '1px solid var(--border)' }}
                >
                  🟢 WhatsApp
                </button>
                <button
                  onClick={() => setChannelFilter('SMS')}
                  className={`chip ${channelFilter === 'SMS' ? 'badge-blue' : ''}`}
                  style={{ fontSize: 11, cursor: 'pointer', border: '1px solid var(--border)' }}
                >
                  📱 SMS
                </button>
              </div>

              <div style={{ position: 'relative', width: 220 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                <input
                  type="text"
                  placeholder="Search patients, batches, Rx..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="input"
                  style={{ fontSize: 12, paddingLeft: 30, height: 32 }}
                />
              </div>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr className="table-header">
                  {['Customer', 'Preferred Channel', 'Medicine & Batch', 'Dispensed Date', 'Exact Expiry', 'Days Remaining', 'Safety Reason', 'Status', 'Actions'].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: '11px 16px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--text-3)',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        textAlign: h === 'Actions' ? 'right' : 'left'
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedPatients.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-3)' }}>
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
                          Batch: <code style={{ color: 'var(--primary)', fontWeight: 600 }}>{p.batch}</code>
                        </div>
                      </td>

                      {/* Dispensed Date */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>
                          {p.dispenseDate}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                          {p.qtyDispensed} units · <span style={{ fontFamily: 'monospace' }}>{p.rxId}</span>
                        </div>
                      </td>

                      {/* Exact Expiry */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: p.reason === 'RECALL' ? 'var(--danger)' : 'var(--warning)' }}>
                          {p.reason === 'RECALL' ? 'RECALLED' : p.expiry}
                        </div>
                      </td>

                      {/* Days Remaining */}
                      <td style={{ padding: '12px 16px' }}>
                        {p.reason === 'RECALL' ? (
                          <span className="chip badge-red" style={{ fontSize: 10.5 }}>Immediate Recall</span>
                        ) : p.daysRemaining !== null && p.daysRemaining <= 0 ? (
                          <span className="chip badge-red" style={{ fontSize: 10.5 }}>Expired</span>
                        ) : (
                          <span className="chip badge-amber" style={{ fontSize: 10.5, fontWeight: 700 }}>
                            {p.daysRemaining} days remaining
                          </span>
                        )}
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

          {/* Table Footer Summary */}
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border)',
              backgroundColor: 'var(--bg-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 12,
              color: 'var(--text-3)',
            }}
          >
            <span>
              Showing {displayedPatients.length} of {affectedPatients.length} records requiring communication
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              Source: Live Firestore Prescription Dispensing Logs
            </span>
          </div>
        </div>
      )}

      {/* TAB 2: COMMUNICATION HISTORY & LOGS */}
      {activeTab === 'activity' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              Pharmacist Safety Outreach Activity Log ({logs.length})
            </h3>
            <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
              Truthful action logs recorded per dispatch
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr className="table-header">
                  {['Timestamp', 'Patient', 'Channel', 'Reason', 'Medicine / Batch', 'Action Status', 'Pharmacist'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedActivityLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-3)', fontSize: 12.5 }}>
                      No safety communication activity recorded yet.
                    </td>
                  </tr>
                ) : (
                  displayedActivityLogs.map((log, idx) => (
                    <tr key={log.id || idx} style={{ borderBottom: '1px solid var(--border)' }} className="table-row">
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-3)' }}>
                        {new Date(log.createdAt || Date.now()).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>
                        {log.recipientName}
                        <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>{log.recipientPhone}</div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className={`chip ${log.provider?.toLowerCase().includes('whatsapp') ? 'badge-green' : 'badge-blue'}`} style={{ fontSize: 10.5 }}>
                          {log.provider?.toLowerCase().includes('whatsapp') ? '🟢 WhatsApp' : '📱 SMS'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12 }}>
                        <span className={`chip ${log.notificationType === 'RECALL' ? 'badge-red' : 'badge-amber'}`} style={{ fontSize: 10.5 }}>
                          {log.notificationType === 'RECALL' ? 'Recall' : 'Near Expiry'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12 }}>
                        <div>{log.medicine || 'Prescribed Med'}</div>
                        {log.batchId && <div style={{ fontSize: 10.5, fontFamily: 'monospace', color: 'var(--primary)' }}>{log.batchId}</div>}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className={`chip ${log.status === 'WHATSAPP_OPENED' ? 'badge-green' : log.status === 'SMS_COMPOSER_OPENED' ? 'badge-blue' : 'badge-teal'}`} style={{ fontSize: 10.5 }}>
                          <CheckCircle2 size={11} /> {log.status?.replace(/_/g, ' ') || 'Initiated'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-3)' }}>
                        {log.pharmacist || currentUser?.name || 'Pharmacist'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Traceability Details Modal */}
      <CustomerSmsDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        smsLog={selectedCustomerForModal}
        customer={selectedCustomerForModal}
        showToast={showToast}
        onRefreshSms={fetchActivityLogs}
      />
    </div>
  );
}
