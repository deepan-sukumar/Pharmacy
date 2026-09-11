import React, { useState, useEffect } from 'react';
import {
  MessageSquare, Send, X, AlertTriangle, CheckCircle2, ShieldCheck,
  Globe, User, Phone, Check, RefreshCw, Eye
} from 'lucide-react';
import { api, type CustomerItem } from '../services/api';

interface ManualSmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customersList?: CustomerItem[];
  preselectedCustomer?: CustomerItem | null;
  initialCustomer?: { id?: string | number; name?: string; phone?: string } | null;
  initialType?: string;
  initialPayload?: any;
  preselectedNotificationType?: string;
  preselectedBatch?: string;
  preselectedMedicine?: string;
  onSuccess?: (result: any) => void;
  onSmsSent?: (result: any) => void;
  showToast?: (msg: string) => void;
}

const NOTIFICATION_TYPES = [
  { id: 'NEAR_EXPIRY', label: 'Near Expiry Alert', description: 'Notifies patient that medicine batch is nearing expiration' },
  { id: 'EXPIRED', label: 'Expired Safe Disposal', description: 'Advises patient not to use expired medicine and seek safe disposal' },
  { id: 'RECALL', label: 'Batch Recall Advisory', description: 'Urgent manufacturer safety bulletin recall notification' },
  { id: 'SUPPLIER_RETURN', label: 'Supplier Return Notice', description: 'Internal / supplier logistics notification' },
  { id: 'LOW_STOCK', label: 'Low Stock Reorder Alert', description: 'Inventory buffer threshold notice' },
  { id: 'GENERAL_ANNOUNCEMENT', label: 'General Patient Notice', description: 'Direct operational announcement or reminder' },
];

const LANGUAGES = [
  { id: 'English', label: 'English', native: 'English' },
  { id: 'Tamil', label: 'Tamil', native: 'தமிழ்' },
  { id: 'Telugu', label: 'Telugu', native: 'తెలుగు' },
  { id: 'Kannada', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { id: 'Hindi', label: 'Hindi', native: 'हिन्दी' },
];

export default function ManualSmsModal({
  isOpen,
  onClose,
  customersList = [],
  preselectedCustomer,
  initialCustomer,
  initialType,
  initialPayload,
  preselectedNotificationType = 'NEAR_EXPIRY',
  preselectedBatch = '',
  preselectedMedicine = '',
  onSuccess,
  onSmsSent,
  showToast = () => {},
}: ManualSmsModalProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | number>('');
  const [phone, setPhone] = useState('');
  const [notificationType, setNotificationType] = useState(initialType || preselectedNotificationType);
  const [language, setLanguage] = useState('English');
  const [medicine, setMedicine] = useState(preselectedMedicine || 'Paracetamol 500mg');
  const [batch, setBatch] = useState(preselectedBatch || 'PCT101');
  const [expiry, setExpiry] = useState('Sep 2026');
  const [previewMessage, setPreviewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [providerMessageId, setProviderMessageId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Sync initial props
  useEffect(() => {
    const cust = initialCustomer || preselectedCustomer;
    if (cust) {
      if (cust.id) setSelectedCustomerId(cust.id);
      if (cust.phone) setPhone(cust.phone);
      if ((cust as any).preferredLang) {
        setLanguage((cust as any).preferredLang);
      }
    } else if (customersList && customersList.length > 0 && !selectedCustomerId) {
      const first = customersList[0];
      setSelectedCustomerId(first.id);
      setPhone(first.phone);
      if (first.preferredLang) setLanguage(first.preferredLang);
    }
  }, [initialCustomer, preselectedCustomer, customersList, isOpen]);

  useEffect(() => {
    const effectiveType = initialType || preselectedNotificationType;
    if (effectiveType) setNotificationType(effectiveType);
    if (initialPayload?.medicineName || preselectedMedicine) {
      setMedicine(initialPayload?.medicineName || preselectedMedicine);
    }
    if (initialPayload?.batchNumber || preselectedBatch) {
      setBatch(initialPayload?.batchNumber || preselectedBatch);
    }
  }, [initialType, initialPayload, preselectedMedicine, preselectedBatch, preselectedNotificationType, isOpen]);

  // Update preview when variables change
  useEffect(() => {
    async function updatePreview() {
      try {
        const cust = customersList.find(c => String(c.id) === String(selectedCustomerId));
        const res = await api.getSmsTemplate(notificationType, language, {
          medicine,
          batch,
          expiry,
          pharmacy: 'Apollo MedPlus Express',
          customer: cust?.name || 'Customer'
        });
        if (res && res.message) {
          setPreviewMessage(res.message);
        }
      } catch (err) {
        console.error('Failed to load template preview:', err);
      }
    }
    updatePreview();
  }, [notificationType, language, medicine, batch, expiry, selectedCustomerId, customersList]);

  if (!isOpen) return null;

  const handleCustomerChange = (id: string) => {
    setSelectedCustomerId(id);
    const matched = customersList.find(c => String(c.id) === id);
    if (matched) {
      setPhone(matched.phone);
      if (matched.preferredLang) setLanguage(matched.preferredLang);
    }
  };

  const handleSendClick = () => {
    if (!phone) {
      showToast('Please specify a valid customer phone number');
      return;
    }
    setConfirmStep(true);
  };

  const handleConfirmedDispatch = async () => {
    setLoading(true);
    setSendStatus('sending');
    setErrorMessage('');

    try {
      const cust = customersList.find(c => String(c.id) === String(selectedCustomerId));
      const payload = {
        customer: cust?.name || 'Customer',
        recipientName: cust?.name || 'Customer',
        phone,
        recipientPhone: phone,
        notificationType,
        medicine,
        batch,
        language,
        customVariables: {
          expiry,
          pharmacy: 'Apollo MedPlus Express'
        }
      };

      const result = await api.sendManualSms(payload);
      setSendStatus('sent');
      setProviderMessageId(result.providerMessageId || 'PF-SMS-DISPATCHED');
      showToast(`SMS dispatched successfully to ${phone}!`);
      if (onSmsSent) onSmsSent(result);
      if (onSuccess) onSuccess(result);
    } catch (err: any) {
      setSendStatus('failed');
      setErrorMessage(err.message || 'SMS Gateway dispatch failed');
      showToast(`Failed to send SMS: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setConfirmStep(false);
    setSendStatus('idle');
    setProviderMessageId('');
    setErrorMessage('');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        className="card animate-scale-up"
        style={{
          width: '100%',
          maxWidth: 620,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--surface)',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
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
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MessageSquare size={19} color="#FFFFFF" />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                Pharmacist Manual SMS Dispatch
              </h2>
              <p style={{ fontSize: 11.5, color: 'var(--text-3)', margin: 0 }}>
                Send verified, pharmacist-approved operational notifications to registered patients
              </p>
            </div>
          </div>
          <button onClick={resetModal} className="btn btn-ghost" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sendStatus === 'sent' ? (
            <div
              style={{
                padding: 24,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  backgroundColor: 'var(--success-light)',
                  border: '2px solid var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={32} color="var(--success)" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                SMS Sent to Carrier Gateway!
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-2)', maxWidth: 420 }}>
                Dispatched to verified number <b>{phone}</b> using approved template.
              </p>
              <div
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  backgroundColor: 'var(--bg-alt)',
                  border: '1px solid var(--border)',
                  fontSize: 12,
                  color: 'var(--text-3)',
                }}
              >
                Provider Reference: <code style={{ color: 'var(--primary)', fontWeight: 700 }}>{providerMessageId}</code>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Status is currently <b>Sent</b>. Live delivery callbacks will update status to <b>Delivered</b> once confirmed by recipient telecom network.
              </p>
              <button onClick={resetModal} className="btn btn-teal" style={{ marginTop: 8 }}>
                Close
              </button>
            </div>
          ) : confirmStep ? (
            /* Confirmation Step */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: 'var(--warning-light)',
                  border: '1.5px solid var(--warning-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <AlertTriangle size={18} color="var(--warning)" />
                  <b style={{ color: 'var(--warning-dark)', fontSize: 14 }}>
                    Confirm Pharmacist Dispatch Authorization
                  </b>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.45 }}>
                  Are you sure you want to send this official operational SMS to <b>{phone}</b>?
                </p>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  backgroundColor: 'var(--surface-raised)',
                  border: '1px solid var(--border)',
                  fontSize: 13,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Approved Message Preview ({language})
                </div>
                <p style={{ color: 'var(--text)', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
                  "{previewMessage}"
                </p>
              </div>

              {errorMessage && (
                <div style={{ padding: 12, borderRadius: 8, backgroundColor: 'var(--danger-light)', color: 'var(--danger)', fontSize: 12.5 }}>
                  ⚠️ {errorMessage}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  onClick={() => setConfirmStep(false)}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Back to Edit
                </button>
                <button
                  onClick={handleConfirmedDispatch}
                  className="btn btn-teal"
                  disabled={loading}
                  style={{ minWidth: 140, justifyContent: 'center' }}
                >
                  {loading ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                  {loading ? 'Dispatching...' : 'Authorize & Send SMS'}
                </button>
              </div>
            </div>
          ) : (
            /* Standard Edit Form */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Recipient Selection */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Select Registered Customer</label>
                  <select
                    className="input"
                    value={selectedCustomerId}
                    onChange={e => handleCustomerChange(e.target.value)}
                  >
                    {customersList.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Verified Mobile (+91)</label>
                  <input
                    className="input"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91 98450 48123"
                  />
                </div>
              </div>

              {/* Notification Type & Language Selection */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Approved Notification Type</label>
                  <select
                    className="input"
                    value={notificationType}
                    onChange={e => setNotificationType(e.target.value)}
                  >
                    {NOTIFICATION_TYPES.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Template Language</label>
                  <select
                    className="input"
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                  >
                    {LANGUAGES.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.label} ({l.native})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Batch Variables */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label className="label">Medicine Name</label>
                  <input
                    className="input"
                    value={medicine}
                    onChange={e => setMedicine(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Batch Number</label>
                  <input
                    className="input"
                    value={batch}
                    onChange={e => setBatch(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Expiry Date</label>
                  <input
                    className="input"
                    value={expiry}
                    onChange={e => setExpiry(e.target.value)}
                  />
                </div>
              </div>

              {/* Live Preview of Fixed Approved Template */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="label" style={{ marginBottom: 0 }}>
                    Fixed Approved SMS Body Preview
                  </label>
                  <span className="chip badge-teal" style={{ fontSize: 10 }}>
                    <ShieldCheck size={12} /> Pharmacist Approved
                  </span>
                </div>
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    backgroundColor: 'var(--bg-alt)',
                    border: '1.5px dashed var(--primary-border)',
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    color: 'var(--text)',
                  }}
                >
                  {previewMessage || 'Loading approved template...'}
                </div>
              </div>

              {/* Safety & DLT Notice */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)' }}>
                <ShieldCheck size={14} color="var(--primary)" />
                <span>
                  All templates adhere to Indian DLT standards. Arbitrary clinical dosage instructions cannot be generated.
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button onClick={resetModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button onClick={handleSendClick} className="btn btn-teal">
                  <Eye size={15} /> Review & Confirm Dispatch
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
