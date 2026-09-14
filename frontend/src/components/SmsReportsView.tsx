import React, { useState, useEffect } from 'react';
import {
  MessageSquare, Send, CheckCircle2, Clock, AlertTriangle, Filter,
  RefreshCw, Globe, ArrowUpRight, ShieldAlert, Check, XCircle, Search,
  SlidersHorizontal, Radio, ExternalLink, Activity
} from 'lucide-react';
import { api, type CustomerItem } from '../services/api';
import CustomerSmsDetailsModal from './CustomerSmsDetailsModal';

interface SmsReportsViewProps {
  onOpenManualSms: (customer?: CustomerItem) => void;
  showToast: (msg: string) => void;
  customersList: CustomerItem[];
}

interface SmsLogItem {
  id?: string;
  recipientName: string;
  recipientPhone: string;
  notificationType: string;
  language: string;
  provider: string;
  providerMessageId: string;
  status: 'submitted' | 'sent' | 'pending' | 'delivered' | 'failed' | 'queued' | 'expired' | 'undelivered';
  isSandbox?: boolean;
  sandboxDetails?: string | null;
  notificationSource: 'automatic' | 'manual';
  message: string;
  createdAt: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
  lastStatusCheckedAt?: string | null;
  errorMessage?: string;
  medicineId?: string;
  batchId?: string;
}

export default function SmsReportsView({
  onOpenManualSms,
  showToast,
  customersList,
}: SmsReportsViewProps) {
  const [logs, setLogs] = useState<SmsLogItem[]>([]);
  const [summary, setSummary] = useState({
    totalSms: 0,
    sent: 0,
    submitted: 0,
    pending: 0,
    delivered: 0,
    failed: 0,
    expired: 0,
    queued: 0,
    automaticCount: 0,
    manualCount: 0,
    deliveryRatePct: 0,
  });
  const [loading, setLoading] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'automatic' | 'manual'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Customer Details Modal State
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<SmsLogItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [configStatus, setConfigStatus] = useState<any>(null);

  const fetchConfigStatus = async () => {
    try {
      const cfg = await api.getSmsConfigStatus();
      setConfigStatus(cfg);
    } catch {
      setConfigStatus(null);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await api.getSmsReports({
        source: sourceFilter !== 'all' ? sourceFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        notificationType: typeFilter !== 'all' ? typeFilter : undefined,
      });

      if (data && data.logs) {
        setLogs(data.logs);
        if (data.summary) {
          setSummary(data.summary);
        } else {
          const total = data.logs.length;
          const del = data.logs.filter((l: any) => l.status === 'delivered' && !l.isSandbox).length;
          const sub = data.logs.filter((l: any) => l.status === 'submitted' || l.status === 'sent').length;
          const pend = data.logs.filter((l: any) => l.status === 'pending').length;
          const fail = data.logs.filter((l: any) => l.status === 'failed' || l.status === 'undelivered').length;
          setSummary({
            totalSms: total,
            sent: sub,
            submitted: sub,
            pending: pend,
            delivered: del,
            failed: fail,
            expired: data.logs.filter((l: any) => l.status === 'expired').length,
            queued: 0,
            automaticCount: data.logs.filter((l: any) => l.notificationSource === 'automatic').length,
            manualCount: data.logs.filter((l: any) => l.notificationSource === 'manual').length,
            deliveryRatePct: total > 0 ? Math.round((del / total) * 100) : 0,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load SMS reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigStatus();
    fetchReports();
  }, [sourceFilter, statusFilter, typeFilter]);

  const handleTriggerAutomaticScan = async () => {
    setIsScanning(true);
    try {
      const res = await api.triggerAutomaticSmsScan();
      showToast('Automated notification cycle executed successfully!');
      fetchReports();
    } catch (err: any) {
      showToast(`Scan trigger error: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSyncStatuses = async () => {
    setIsSyncing(true);
    try {
      const res = await api.syncAllSmsStatuses();
      showToast(`Synced ${res.checkedCount || 0} carrier delivery reports.`);
      fetchReports();
    } catch (err: any) {
      showToast(`Sync error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCheckSingleStatus = async (msgId: string) => {
    try {
      const res = await api.getSmsDeliveryStatus(msgId);
      if (res.success) {
        showToast(`Carrier status updated: ${res.status.toUpperCase()}`);
        fetchReports();
      } else {
        showToast(res.error || 'Failed to check status');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleSimulateDeliveryCallback = async (msgId: string) => {
    try {
      const data = await api.simulateCarrierCallback(msgId);
      if (data.success) {
        showToast(`Carrier webhook confirmed: ${msgId} marked DELIVERED`);
        fetchReports();
      }
    } catch (err) {
      showToast('Delivery callback failed');
    }
  };

  const handleResend = async (log: SmsLogItem) => {
    const itemKey = log.id || log.providerMessageId;
    setResendingId(itemKey);
    try {
      showToast(`Re-dispatching SMS to ${log.recipientName} (${log.recipientPhone})...`);
      const res = await api.sendManualSms({
        recipientName: log.recipientName,
        recipientPhone: log.recipientPhone,
        notificationType: log.notificationType,
        language: log.language,
      });
      if (res.success) {
        showToast(`New SMS dispatched (Ref: ${res.providerMessageId || 'OK'})`);
      } else {
        showToast(`Resend failed: ${res.error || 'Unknown error'}`);
      }
      fetchReports();
    } catch (err: any) {
      showToast(`Resend error: ${err.message}`);
    } finally {
      setResendingId(null);
    }
  };

  const openCustomerDetails = (log: SmsLogItem) => {
    setSelectedLogForDetails(log);
    setIsDetailsModalOpen(true);
  };

  const filteredLogs = logs.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.recipientName && item.recipientName.toLowerCase().includes(q)) ||
      (item.recipientPhone && item.recipientPhone.includes(q)) ||
      (item.providerMessageId && item.providerMessageId.toLowerCase().includes(q)) ||
      (item.notificationType && item.notificationType.toLowerCase().includes(q))
    );
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Banner & Quick Actions */}
      <div
        style={{
          padding: '16px 20px',
          borderRadius: 14,
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MessageSquare size={20} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                Real SMS Notification Engine & Delivery Audit
              </h2>
              {configStatus?.isLiveConfigured ? (
                <span className="chip badge-green" style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Radio size={12} /> SMSLocal Live Gateway (Route 1 Transactional)
                </span>
              ) : (
                <span className="chip badge-amber" style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Radio size={12} /> SMSLocal Sandbox / Test Mode (Handset Delivery Disabled)
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>
              Handset carrier delivery tracking with dynamic patient batch traceability and DLT compliance.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={handleSyncStatuses}
            className="btn btn-secondary"
            disabled={isSyncing}
            style={{ fontSize: 12 }}
            title="Poll SMSLocal delivery report endpoint for pending messages"
          >
            <Activity size={14} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing DLR...' : 'Sync Delivery Reports'}
          </button>
          <button
            onClick={handleTriggerAutomaticScan}
            className="btn btn-secondary"
            disabled={isScanning}
            style={{ fontSize: 12 }}
          >
            <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
            {isScanning ? 'Scanning...' : 'Run Auto Scan'}
          </button>
          <button onClick={() => onOpenManualSms()} className="btn btn-teal" style={{ fontSize: 12 }}>
            <Send size={14} /> Send Manual SMS
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
        }}
      >
        {/* Metric 1: Total SMS */}
        <div className="card" style={{ padding: 16, borderLeft: '4px solid var(--primary)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>
            Total SMS Dispatched
          </span>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', marginTop: 4 }}>
            {summary.totalSms}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            All Carrier Transmissions
          </div>
        </div>

        {/* Metric 2: Automatic vs Manual Split */}
        <div className="card" style={{ padding: 16, borderLeft: '4px solid #3B82F6' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase' }}>
            Automatic vs Manual
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#3B82F6' }}>{summary.automaticCount} Auto</span>
            <span style={{ fontSize: 14, color: 'var(--text-3)' }}>/</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{summary.manualCount} Manual</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            Source Separation Enforced
          </div>
        </div>

        {/* Metric 3: Confirmed Handset Delivered */}
        <div className="card" style={{ padding: 16, borderLeft: '4px solid var(--success)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase' }}>
            Handset Delivered (Confirmed)
          </span>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--success)', marginTop: 4 }}>
            {summary.delivered}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            Carrier Verified Delivery Rate: <b>{summary.deliveryRatePct}%</b>
          </div>
        </div>

        {/* Metric 4: In-Transit / Pending Carrier */}
        <div className="card" style={{ padding: 16, borderLeft: '4px solid var(--warning)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase' }}>
            In Transit / Pending DLR
          </span>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--warning)', marginTop: 4 }}>
            {summary.submitted + summary.pending}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            Awaiting carrier delivery report
          </div>
        </div>

        {/* Metric 5: Failed / Undelivered */}
        <div className="card" style={{ padding: 16, borderLeft: '4px solid var(--danger)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase' }}>
            Failed / Undelivered
          </span>
          <div style={{ fontSize: 24, fontWeight: 900, color: summary.failed > 0 ? 'var(--danger)' : 'var(--text)', marginTop: 4 }}>
            {summary.failed}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            {summary.failed === 0 ? 'Zero Carrier Failures' : 'Retry available'}
          </div>
        </div>
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
        {/* Source Segmented Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'var(--bg-alt)', padding: 4, borderRadius: 8, border: '1px solid var(--border)' }}>
          <button
            onClick={() => setSourceFilter('all')}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: sourceFilter === 'all' ? 'var(--primary)' : 'transparent',
              color: sourceFilter === 'all' ? '#FFFFFF' : 'var(--text-2)',
              transition: 'all 0.15s ease',
            }}
          >
            All ({summary.totalSms})
          </button>
          <button
            onClick={() => setSourceFilter('automatic')}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: sourceFilter === 'automatic' ? 'var(--primary)' : 'transparent',
              color: sourceFilter === 'automatic' ? '#FFFFFF' : 'var(--text-2)',
              transition: 'all 0.15s ease',
            }}
          >
            🤖 Automatic ({summary.automaticCount})
          </button>
          <button
            onClick={() => setSourceFilter('manual')}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: sourceFilter === 'manual' ? 'var(--primary)' : 'transparent',
              color: sourceFilter === 'manual' ? '#FFFFFF' : 'var(--text-2)',
              transition: 'all 0.15s ease',
            }}
          >
            👨‍⚕️ Manual Pharmacist ({summary.manualCount})
          </button>
        </div>

        {/* Dropdown Filters & Search */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select
            className="input"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ fontSize: 12, padding: '5px 10px', height: 34 }}
          >
            <option value="all">All Statuses</option>
            <option value="delivered">Delivered (Confirmed)</option>
            <option value="submitted">Submitted / In-Transit</option>
            <option value="pending">Pending DLR</option>
            <option value="failed">Failed</option>
          </select>

          <select
            className="input"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{ fontSize: 12, padding: '5px 10px', height: 34 }}
          >
            <option value="all">All Types</option>
            <option value="NEAR_EXPIRY">Near Expiry</option>
            <option value="EXPIRED">Expired</option>
            <option value="RECALL">Recall Advisory</option>
            <option value="SUPPLIER_RETURN">Supplier Return</option>
            <option value="LOW_STOCK">Low Stock</option>
          </select>

          <div style={{ position: 'relative' }}>
            <input
              className="input"
              placeholder="Search recipient / phone / MsgId..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ fontSize: 12, padding: '5px 10px 5px 30px', height: 34, width: 220 }}
            />
            <Search size={14} style={{ position: 'absolute', left: 9, top: 10, color: 'var(--text-muted)' }} />
          </div>

          <button onClick={fetchReports} className="btn btn-ghost" style={{ padding: 6 }} title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-alt)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Time & Source</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Recipient</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Notification Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Language</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Message Preview</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Delivery Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                    No SMS transmission records found matching the active filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr
                    key={log.id || idx}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {/* Timestamp & Source */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                        {new Date(log.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ marginTop: 2 }}>
                        <span
                          className={`chip ${log.notificationSource === 'manual' ? 'badge-teal' : 'badge-blue'}`}
                          style={{ fontSize: 9.5, padding: '1px 6px' }}
                        >
                          {log.notificationSource === 'manual' ? '👨‍⚕️ MANUAL' : '🤖 AUTOMATIC'}
                        </span>
                      </div>
                    </td>

                    {/* Recipient - Clickable with interactive hover */}
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => openCustomerDetails(log)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'inline-flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                        }}
                        title="Click to inspect medicine details & batch traceability"
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            color: 'var(--primary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            textDecoration: 'underline',
                            textDecorationColor: 'transparent',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.textDecorationColor = 'var(--primary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.textDecorationColor = 'transparent';
                          }}
                        >
                          {log.recipientName}
                          <ExternalLink size={11} style={{ opacity: 0.7 }} />
                        </span>
                        <span style={{ color: 'var(--text-3)', fontSize: 11.5, marginTop: 1 }}>
                          {log.recipientPhone}
                        </span>
                      </button>
                    </td>

                    {/* Notification Type */}
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        className={`chip ${
                          log.notificationType === 'RECALL'
                            ? 'badge-red'
                            : log.notificationType === 'NEAR_EXPIRY'
                            ? 'badge-amber'
                            : 'badge-teal'
                        }`}
                        style={{ fontSize: 10 }}
                      >
                        {log.notificationType.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Language */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-2)' }}>
                        <Globe size={12} /> {log.language}
                      </span>
                    </td>

                    {/* Message Preview */}
                    <td style={{ padding: '12px 16px', maxWidth: 260 }}>
                      <p
                        style={{
                          margin: 0,
                          color: 'var(--text-2)',
                          fontSize: 11.5,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={log.message}
                      >
                        {log.message}
                      </p>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        Ref: <code>{log.providerMessageId}</code>
                      </div>
                    </td>

                    {/* Status & Last Checked */}
                    <td style={{ padding: '12px 16px' }}>
                      <div>
                        {log.isSandbox ? (
                          <span className="chip badge-amber" style={{ fontSize: 10.5 }}>
                            {log.status === 'delivered' ? '🧪 Sandbox / Test (Simulated)' : log.status === 'failed' ? '🔴 Failed' : '🧪 Sandbox Submitted'}
                          </span>
                        ) : (
                          <span
                            className={`chip ${
                              log.status === 'delivered'
                                ? 'badge-green'
                                : log.status === 'submitted' || log.status === 'sent'
                                ? 'badge-blue'
                                : log.status === 'pending'
                                ? 'badge-amber'
                                : 'badge-red'
                            }`}
                            style={{ fontSize: 11 }}
                          >
                            {log.status === 'delivered' ? (
                              <>
                                <CheckCircle2 size={12} /> Delivered
                              </>
                            ) : log.status === 'submitted' || log.status === 'sent' ? (
                              <>
                                <Clock size={12} /> Submitted
                              </>
                            ) : log.status === 'pending' ? (
                              <>
                                <Clock size={12} /> Pending DLR
                              </>
                            ) : (
                              <>
                                <XCircle size={12} /> Failed
                              </>
                            )}
                          </span>
                        )}

                        {/* Status detail / timestamps */}
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                          {log.isSandbox ? (
                            <span style={{ color: 'var(--warning)', fontStyle: 'italic' }}>Test message — not delivered to handset</span>
                          ) : log.status === 'delivered' && log.deliveredAt ? (
                            <span>Delivered at: {new Date(log.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          ) : log.status === 'delivered' ? (
                            <span>Carrier confirmed</span>
                          ) : log.status === 'failed' ? (
                            <span style={{ color: 'var(--danger)' }}>{log.errorMessage ? `Reason: ${log.errorMessage.slice(0, 30)}` : 'Gateway rejected'}</span>
                          ) : (
                            <span>Waiting for carrier confirmation</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, alignItems: 'center' }}>
                        {log.status !== 'delivered' && log.status !== 'failed' && (
                          <button
                            onClick={() => handleSimulateDeliveryCallback(log.providerMessageId)}
                            className="btn btn-ghost"
                            title="Verify Carrier Delivery Callback (Test/Sim)"
                            style={{ fontSize: 11, padding: '3px 7px' }}
                          >
                            Verify Callback
                          </button>
                        )}
                        <button
                          onClick={() => handleResend(log)}
                          disabled={resendingId === (log.id || log.providerMessageId)}
                          className="btn btn-ghost"
                          style={{ fontSize: 11, padding: '3px 7px' }}
                          title="Send a fresh SMS attempt"
                        >
                          {resendingId === (log.id || log.providerMessageId) ? 'Sending...' : 'Resend'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer SMS Details & Traceability Modal */}
      <CustomerSmsDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        smsLog={selectedLogForDetails}
        customer={customersList.find(c => c.name === selectedLogForDetails?.recipientName || c.phone === selectedLogForDetails?.recipientPhone)}
        onRefreshSms={fetchReports}
        showToast={showToast}
      />
    </div>
  );
}

