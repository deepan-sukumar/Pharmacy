import React, { useEffect, useState } from 'react';
import {
  X, User, Phone, ShieldAlert, AlertTriangle, CheckCircle2, Clock,
  XCircle, Pill, Calendar, PackageCheck, Send, RefreshCw, FileText,
  Radio, Sparkles
} from 'lucide-react';
import { api, type CustomerItem } from '../services/api';

interface CustomerSmsDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  smsLog?: {
    id?: string;
    recipientName: string;
    recipientPhone: string;
    notificationType: string;
    language: string;
    provider: string;
    providerMessageId: string;
    status: string;
    isSandbox?: boolean;
    sandboxDetails?: string | null;
    notificationSource: 'automatic' | 'manual';
    message: string;
    createdAt: string;
    sentAt?: string | null;
    deliveredAt?: string | null;
    lastStatusCheckedAt?: string | null;
    errorMessage?: string | null;
    medicineId?: string;
    batchId?: string;
  } | null;
  customer?: any;
  onRefreshSms?: () => void;
  showToast?: (msg: string) => void;
}

export default function CustomerSmsDetailsModal({
  isOpen,
  onClose,
  smsLog,
  customer,
  onRefreshSms,
  showToast,
}: CustomerSmsDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [traceabilityData, setTraceabilityData] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch dynamic linked medicines & dispensing history whenever modal opens
  useEffect(() => {
    if (!isOpen) return;

    const identifier = smsLog?.recipientName || customer?.name || smsLog?.recipientPhone || customer?.phone;
    if (!identifier) return;

    let isMounted = true;
    setLoading(true);

    api.getCustomerDetailsTraceability(identifier)
      .then((data) => {
        if (isMounted && data.success) {
          setTraceabilityData(data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load customer traceability:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, smsLog, customer]);

  if (!isOpen) return null;

  const customerName = smsLog?.recipientName || customer?.name || 'Customer';
  const customerPhone = smsLog?.recipientPhone || customer?.phone || 'N/A';
  const isRecall = smsLog?.notificationType === 'RECALL';

  const linkedMedicines = traceabilityData?.linkedMedicines || [];

  // Manual status check query
  const handleCheckStatus = async () => {
    if (!smsLog?.providerMessageId) return;
    setCheckingStatus(true);
    try {
      const res = await api.getSmsDeliveryStatus(smsLog.providerMessageId);
      if (res.success) {
        if (showToast) showToast(`Delivery status updated: ${res.status.toUpperCase()}`);
        if (onRefreshSms) onRefreshSms();
      } else {
        if (showToast) showToast(res.error || 'Failed to check status');
      }
    } catch (err: any) {
      if (showToast) showToast(`Status check error: ${err.message}`);
    } finally {
      setCheckingStatus(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 620,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-alt)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                backgroundColor: isRecall ? 'rgba(239, 68, 68, 0.15)' : 'rgba(14, 165, 233, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isRecall ? 'var(--danger)' : 'var(--primary)',
              }}
            >
              {isRecall ? <ShieldAlert size={18} /> : <FileText size={18} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                Patient Safety Communication & Traceability Audit
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--text-3)' }}>
                Patient safety advisory and pharmacist outreach log
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: 6, borderRadius: '50%', color: 'var(--text-3)' }}
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Customer Profile Banner */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              backgroundColor: 'var(--bg-card)',
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
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 15,
                  color: '#FFFFFF',
                }}
              >
                {customerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{customerName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={12} /> {customerPhone}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="chip badge-blue" style={{ fontSize: 10 }}>
                Lang: {smsLog?.language || customer?.preferredLang || 'English'}
              </span>
              <span className="chip badge-teal" style={{ fontSize: 10 }}>
                Verified Patient
              </span>
            </div>
          </div>

          {/* Traceable Medicine & Batch Details */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h4 style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {isRecall ? '⚠️ Recalled Medicine & Dispensing Link' : '💊 Linked Medication & Batch Expiry'}
              </h4>
              {loading && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Loading traceability...</span>}
            </div>

            {linkedMedicines.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {linkedMedicines.map((med: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      backgroundColor: med.isRecalled ? 'rgba(239, 68, 68, 0.06)' : 'var(--bg-card)',
                      border: `1px solid ${med.isRecalled ? 'rgba(239, 68, 68, 0.3)' : 'var(--border)'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Pill size={16} color={med.isRecalled ? 'var(--danger)' : 'var(--primary)'} />
                        <b style={{ fontSize: 13.5, color: 'var(--text)' }}>{med.medicine}</b>
                        <span className="chip" style={{ fontSize: 10 }}>{med.strength || '500mg'} • {med.dosageForm || 'Tablet'}</span>
                      </div>
                      <span
                        className={`chip ${
                          med.isRecalled
                            ? 'badge-red'
                            : med.daysRemaining !== null && med.daysRemaining <= 30
                            ? 'badge-amber'
                            : 'badge-teal'
                        }`}
                        style={{ fontSize: 10 }}
                      >
                        {med.isRecalled
                          ? 'RECALLED BATCH'
                          : med.daysRemaining !== null && med.daysRemaining <= 30
                          ? `Near Expiry (${med.daysRemaining} days)`
                          : 'Safe'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 11.5 }}>
                      <div>
                        <span style={{ color: 'var(--text-3)', display: 'block' }}>Batch Number</span>
                        <code style={{ fontWeight: 600, color: 'var(--text)' }}>{med.batch || 'N/A'}</code>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-3)', display: 'block' }}>Supplier</span>
                        <b style={{ color: 'var(--text)' }}>{med.supplier || 'Hetero Labs Ltd'}</b>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-3)', display: 'block' }}>Expiry Date</span>
                        <b style={{ color: med.daysRemaining !== null && med.daysRemaining <= 30 ? 'var(--warning)' : 'var(--text)' }}>
                          {med.expiry || 'N/A'}
                        </b>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-3)', display: 'block' }}>Dispensed Qty</span>
                        <b style={{ color: 'var(--text)' }}>{med.quantityDispensed} units</b>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 11.5, borderTop: '1px dashed var(--border)', paddingTop: 6 }}>
                      <div>
                        <span style={{ color: 'var(--text-3)', display: 'inline', marginRight: 4 }}>Days Remaining:</span>
                        <b style={{ color: med.daysRemaining !== null && med.daysRemaining <= 30 ? 'var(--warning)' : 'var(--text)' }}>
                          {med.daysRemaining !== null ? `${med.daysRemaining} days` : 'N/A'}
                        </b>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-3)', display: 'inline', marginRight: 4 }}>Expiry Risk:</span>
                        <b style={{ color: med.daysRemaining !== null && med.daysRemaining <= 30 ? 'var(--danger)' : 'var(--success)' }}>
                          {med.expiryRisk || (med.daysRemaining !== null && med.daysRemaining <= 30 ? 'High' : 'Safe')}
                        </b>
                      </div>
                    </div>

                    {med.isRecalled && (
                      <div
                        style={{
                          marginTop: 4,
                          padding: '8px 10px',
                          borderRadius: 6,
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          fontSize: 11,
                          color: 'var(--danger)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                          <ShieldAlert size={14} />
                          <span>Recall Notice — {med.recallStatus || 'Quarantined & Dispensing Locked'}</span>
                        </div>
                        <div><b>Recall Reason:</b> {med.recallReason || 'Packaging seal defect reported by manufacturer bulletin'}</div>
                        <div><b>Recall Date:</b> {med.recallDate || 'Recent'} • <b>Affected Batch:</b> <code>{med.batch}</code></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  fontSize: 12,
                  color: 'var(--text-2)',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <span style={{ color: 'var(--text-3)', display: 'block' }}>Medicine</span>
                    <b>{smsLog?.medicineId || 'Amoxicillin 500mg'} (Oral Tablet)</b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-3)', display: 'block' }}>Batch Number</span>
                    <code>{smsLog?.batchId || 'DEMO-EXP-001'}</code>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notification Details & Reason */}
          <div>
            <h4 style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              🔔 Notification Details
            </h4>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
                fontSize: 12,
              }}
            >
              <div>
                <span style={{ color: 'var(--text-3)', display: 'block', fontSize: 11 }}>Notification Type</span>
                <b style={{ color: 'var(--text)' }}>{smsLog?.notificationType || (isRecall ? 'RECALL' : 'NEAR_EXPIRY')}</b>
              </div>
              <div>
                <span style={{ color: 'var(--text-3)', display: 'block', fontSize: 11 }}>Trigger Mode</span>
                <span style={{ fontWeight: 600, color: smsLog?.notificationSource === 'manual' ? 'var(--primary)' : 'var(--teal)' }}>
                  {smsLog?.notificationSource === 'manual' ? '👨‍⚕️ Manual Pharmacist Send' : '🤖 Automatic Safety System'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-3)', display: 'block', fontSize: 11 }}>Notification Reason</span>
                <span style={{ color: 'var(--text-2)' }}>
                  {isRecall ? 'Critical manufacturer batch recall bulletin' : 'Medicine batch enters near-expiry window (<= 30 days)'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-3)', display: 'block', fontSize: 11 }}>Created Time</span>
                <span style={{ color: 'var(--text-2)' }}>
                  {smsLog?.createdAt ? new Date(smsLog.createdAt).toLocaleString() : 'Recent'}
                </span>
              </div>
            </div>
          </div>

          {/* Full SMS Message Preview */}
          <div>
            <h4 style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              💬 Dispatched SMS Message
            </h4>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                backgroundColor: 'var(--bg-alt)',
                border: '1px solid var(--border)',
                fontSize: 12.5,
                lineHeight: 1.5,
                color: 'var(--text)',
                fontStyle: 'italic',
              }}
            >
              "{smsLog?.message || 'PharmaFlow patient notification message.'}"
            </div>
          </div>

          {/* SMS Provider & Carrier Delivery Details */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h4 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                📡 Carrier Transmission & Audit Trail
              </h4>
              {smsLog?.providerMessageId && (
                <button
                  onClick={handleCheckStatus}
                  className="btn btn-ghost"
                  disabled={checkingStatus}
                  style={{ fontSize: 11, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <RefreshCw size={12} className={checkingStatus ? 'animate-spin' : ''} />
                  {checkingStatus ? 'Checking...' : 'Check Live Status'}
                </button>
              )}
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: 10,
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
                fontSize: 12,
              }}
            >
              <div>
                <span style={{ color: 'var(--text-3)', display: 'block', fontSize: 11 }}>Delivery Status</span>
                <div style={{ marginTop: 3 }}>
                  <span
                    className={`chip ${
                      smsLog?.status?.toLowerCase() === 'delivered' || smsLog?.status === 'WHATSAPP_OPENED'
                        ? 'badge-green'
                        : smsLog?.status === 'SMS_COMPOSER_OPENED' || smsLog?.status === 'submitted' || smsLog?.status === 'sent'
                        ? 'badge-blue'
                        : smsLog?.status === 'pending' || smsLog?.status === 'COMMUNICATION_INITIATED'
                        ? 'badge-amber'
                        : smsLog?.status === 'expired' || smsLog?.status === 'CANCELLED'
                        ? 'badge-slate'
                        : 'badge-red'
                    }`}
                    style={{ fontSize: 11 }}
                  >
                    {smsLog?.status === 'WHATSAPP_OPENED' ? (
                      <>
                        <CheckCircle2 size={12} /> WhatsApp Web/App Opened
                      </>
                    ) : smsLog?.status === 'SMS_COMPOSER_OPENED' ? (
                      <>
                        <CheckCircle2 size={12} /> SMS Composer Launched
                      </>
                    ) : smsLog?.status === 'COMMUNICATION_INITIATED' ? (
                      <>
                        <Clock size={12} /> Communication Initiated
                      </>
                    ) : smsLog?.status === 'CANCELLED' ? (
                      <>
                        <XCircle size={12} /> Cancelled by Pharmacist
                      </>
                    ) : smsLog?.status === 'delivered' ? (
                      <>
                        <CheckCircle2 size={12} /> Delivered
                      </>
                    ) : smsLog?.status === 'submitted' || smsLog?.status === 'sent' ? (
                      <>
                        <Clock size={12} /> Submitted (In Transit)
                      </>
                    ) : smsLog?.status === 'pending' ? (
                      <>
                        <Clock size={12} /> Pending Carrier DLR
                      </>
                    ) : smsLog?.status === 'expired' ? (
                      <>
                        <XCircle size={12} /> Expired
                      </>
                    ) : (
                      <>
                        <XCircle size={12} /> Failed
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-3)', display: 'block', fontSize: 11 }}>Gateway / Network</span>
                <b style={{ color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Radio size={12} /> {smsLog?.provider || 'SMSLocal Gateway'}
                </b>
              </div>

              <div>
                <span style={{ color: 'var(--text-3)', display: 'block', fontSize: 11 }}>Provider Message Ref</span>
                <code style={{ fontSize: 11, color: 'var(--primary)', marginTop: 2, display: 'inline-block' }}>
                  {smsLog?.providerMessageId || 'N/A'}
                </code>
              </div>

              <div>
                <span style={{ color: 'var(--text-3)', display: 'block', fontSize: 11 }}>Trigger Type</span>
                <span style={{ marginTop: 2, display: 'inline-block', fontWeight: 600 }}>
                  {smsLog?.notificationSource === 'manual' ? '👨‍⚕️ Manual Pharmacist Alert' : '🤖 Automatic Scheduled Trigger'}
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--text-3)', display: 'block', fontSize: 11 }}>Sent Timestamp</span>
                <span style={{ color: 'var(--text-2)', display: 'inline-block', marginTop: 2 }}>
                  {smsLog?.sentAt ? new Date(smsLog.sentAt).toLocaleString() : smsLog?.createdAt ? new Date(smsLog.createdAt).toLocaleString() : 'Recent'}
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--text-3)', display: 'block', fontSize: 11 }}>Delivery Confirmed Time</span>
                <span style={{ color: smsLog?.deliveredAt ? 'var(--success)' : 'var(--text-3)', display: 'inline-block', marginTop: 2 }}>
                  {smsLog?.deliveredAt ? new Date(smsLog.deliveredAt).toLocaleString() : 'Awaiting carrier delivery report'}
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--text-3)', display: 'block', fontSize: 11 }}>Last Status Check</span>
                <span style={{ color: 'var(--text-2)', display: 'inline-block', marginTop: 2 }}>
                  {smsLog?.lastStatusCheckedAt ? new Date(smsLog.lastStatusCheckedAt).toLocaleString() : 'Recent'}
                </span>
              </div>
            </div>

            {/* Sandbox Notice if applicable */}
            {smsLog?.isSandbox && (
              <div
                style={{
                  marginTop: 10,
                  padding: '8px 12px',
                  borderRadius: 8,
                  backgroundColor: 'rgba(234, 179, 8, 0.1)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  fontSize: 11.5,
                  color: 'var(--warning)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertTriangle size={14} />
                <span>
                  <b>Test / Sandbox Mode:</b> Provider simulated carrier transmission. Not delivered to physical handset.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: 'var(--bg-alt)',
          }}
        >
          <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: 12.5, minWidth: 90 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
