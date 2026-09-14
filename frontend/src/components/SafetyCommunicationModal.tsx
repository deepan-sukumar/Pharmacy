import React, { useState, useEffect } from 'react';
import {
  MessageSquare, Send, X, AlertTriangle, CheckCircle2, ShieldAlert,
  Globe, User, Phone, Check, Copy, ExternalLink, Smartphone, MessageCircle, AlertCircle
} from 'lucide-react';
import { api, type CustomerItem } from '../services/api';

interface SafetyCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCustomer?: {
    id?: string | number;
    name?: string;
    phone?: string;
    preferredLang?: string;
    communicationPreference?: 'WHATSAPP' | 'SMS';
    qty?: number;
    rxId?: string;
    date?: string;
  } | null;
  notificationType?: 'NEAR_EXPIRY' | 'RECALL' | 'MANUAL' | string;
  medicineName?: string;
  batchNumber?: string;
  expiryDate?: string;
  recallReason?: string;
  onSuccess?: (result: any) => void;
  showToast?: (msg: string) => void;
}

const APPROVED_TEMPLATES: Record<string, { expiry: string; recall: string }> = {
  English: {
    expiry: 'Your medicine is approaching its expiry date. Please check the expiry date before use and contact your pharmacist if you have any questions.',
    recall: 'This is a pharmacy safety notification regarding a medicine you previously received. Please contact your pharmacist regarding this batch. Do not use the medicine until you receive appropriate guidance.'
  },
  Tamil: {
    expiry: 'உங்கள் மருந்து காலாவதி தேதியை நெருங்குகிறது. தயவுசெய்து பயன்படுத்துவதற்கு முன் காலாவதி தேதியை சரிபார்த்து, ஏதேனும் சந்தேகங்கள் இருந்தால் உங்கள் மருந்தாளரை தொடர்பு கொள்ளவும்.',
    recall: 'நீங்கள் முன்பு பெற்ற மருந்து குறித்த அவசர மருந்தக பாதுகாப்பு அறிவிப்பு இது. இந்த தொகுதி குறித்து உங்கள் மருந்தாளரை உடனடியாக தொடர்பு கொள்ளவும். வழிகாட்டுதல் பெறும் வரை மருந்தை உட்கொள்ள வேண்டாம்.'
  },
  Telugu: {
    expiry: 'మీ ఔషధం గడువు తేదీకి చేరువలో ఉంది. దయచేసి ఉపయోగించే ముందు గడువు తేదీని తనిఖీ చేయండి మరియు ఏవైనా సందేహాలు ఉంటే మీ ఫార్మసిస్ట్‌ను సంప్రదించండి.',
    recall: 'మీరు గతంలో పొందిన ఔషధానికి సంబంధించిన అత్యవసర ఫార్మసీ భద్రతా నోటీసు ఇది. ఈ బ్యాచ్ గురించి దయచేసి వెంటనే మీ ఫార్మసిస్ట్‌ను సంప్రదించండి.'
  },
  Kannada: {
    expiry: 'ನಿಮ್ಮ ಔಷಧಿಯ ಅವಧಿ ಮುಗಿಯುವ ದಿನಾಂಕ ಸಮೀಪಿಸುತ್ತಿದೆ. ದಯವಿಟ್ಟು ಬಳಸುವ ಮೊದಲು ಮುಕ್ತಾಯ ದಿನಾಂಕವನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಯಾವುದೇ ಪ್ರಶ್ನೆಗಳಿದ್ದರೆ ನಿಮ್ಮ ಔಷಧಿಕಾರರನ್ನು ಸಂಪರ್ಕಿಸಿ.',
    recall: 'ನೀವು ಈ ಹಿಂದೆ ಪಡೆದ ಔಷಧಿಯ ಕುರಿತು ಇದು ತುರ್ತು ಔಷಧಾಲಯ ಸುರಕ್ಷತಾ ಸೂಚನೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ಈ ಬ್ಯಾಚ್ ಕುರಿತು ನಿಮ್ಮ ಔಷಧಿಕಾರರನ್ನು ಸಂಪರ್ಕಿಸಿ.'
  },
  Hindi: {
    expiry: 'आपकी दवा की समाप्ति तिथि निकट आ रही है। कृपया उपयोग करने से पहले समाप्ति तिथि की जांच करें और यदि आपका कोई प्रश्न है तो अपने फार्मासिस्ट से संपर्क करें।',
    recall: 'यह आपके द्वारा पहले प्राप्त की गई दवा के संबंध में एक फार्मेसी सुरक्षा सलाह है। कृपया इस बैच के संबंध में अपने फार्मासिस्ट से तुरंत संपर्क करें।'
  }
};

const LANGUAGES = [
  { id: 'English', label: 'English', native: 'English' },
  { id: 'Tamil', label: 'Tamil', native: 'தமிழ்' },
  { id: 'Telugu', label: 'Telugu', native: 'తెలుగు' },
  { id: 'Kannada', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { id: 'Hindi', label: 'Hindi', native: 'हिन्दी' },
];

export default function SafetyCommunicationModal({
  isOpen,
  onClose,
  targetCustomer,
  notificationType = 'NEAR_EXPIRY',
  medicineName = 'Amoxicillin 500mg',
  batchNumber = 'DEMO-EXP-001',
  expiryDate = 'Oct 2026',
  recallReason = 'Manufacturer safety bulletin recall',
  onSuccess,
  showToast = () => {},
}: SafetyCommunicationModalProps) {
  const [selectedChannel, setSelectedChannel] = useState<'WHATSAPP' | 'SMS'>('SMS');
  const [language, setLanguage] = useState('English');
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [actionDone, setActionDone] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const customerName = targetCustomer?.name || 'Customer';
  const customerPhone = targetCustomer?.phone || '';
  const customerPreference: 'WHATSAPP' | 'SMS' = (targetCustomer?.communicationPreference || 'SMS').toUpperCase() as any;

  // Initialize recommendation based on customer preference
  useEffect(() => {
    if (targetCustomer?.communicationPreference) {
      setSelectedChannel(targetCustomer.communicationPreference.toUpperCase() === 'WHATSAPP' ? 'WHATSAPP' : 'SMS');
    } else {
      setSelectedChannel('SMS');
    }
    if (targetCustomer?.preferredLang && APPROVED_TEMPLATES[targetCustomer.preferredLang]) {
      setLanguage(targetCustomer.preferredLang);
    } else {
      setLanguage('English');
    }
    setActionDone(false);
    setActionMessage('');
    setCopiedNumber(false);
    setCopiedMessage(false);
  }, [targetCustomer, isOpen]);

  if (!isOpen) return null;

  const isRecall = notificationType === 'RECALL';
  const rawTemplate = isRecall
    ? (APPROVED_TEMPLATES[language]?.recall || APPROVED_TEMPLATES.English.recall)
    : (APPROVED_TEMPLATES[language]?.expiry || APPROVED_TEMPLATES.English.expiry);

  const formattedMessage = `PharmaFlow Safety Advisory: Dear ${customerName}, ${rawTemplate} [Medicine: ${medicineName}, Batch: ${batchNumber}] - Apollo MedPlus Pharmacy`;

  const cleanDigits = customerPhone.replace(/\D/g, '');
  const nationalDigits = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;
  const internationalDigits = `91${nationalDigits}`;

  const handleCopyNumber = () => {
    if (customerPhone) {
      navigator.clipboard.writeText(customerPhone);
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
      showToast('Copied customer phone number');
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(formattedMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
    showToast('Copied approved safety message');
  };

  const handleExecuteCommunication = async () => {
    if (!customerPhone) {
      showToast('Error: Customer mobile number is missing');
      return;
    }

    const channel = selectedChannel;
    const status = channel === 'WHATSAPP' ? 'WHATSAPP_OPENED' : 'SMS_COMPOSER_OPENED';

    try {
      // 1. Log communication action to backend Firestore
      await api.logSafetyCommunication({
        customerId: targetCustomer?.id,
        recipientName: customerName,
        recipientPhone: customerPhone,
        notificationType: isRecall ? 'RECALL' : 'NEAR_EXPIRY',
        medicineId: medicineName,
        batchId: batchNumber,
        reason: isRecall ? recallReason : 'Near Expiry Alert',
        communicationPreference: customerPreference,
        selectedChannel: channel,
        message: formattedMessage,
        language,
        status,
      });
    } catch (err: any) {
      console.warn('⚠️ Non-fatal communication audit log warning:', err.message);
    }

    // 2. Open corresponding channel on pharmacist device
    if (channel === 'WHATSAPP') {
      const waUrl = `https://wa.me/${internationalDigits}?text=${encodeURIComponent(formattedMessage)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      setActionDone(true);
      setActionMessage(`WhatsApp conversation opened for ${customerName} (+91 ${nationalDigits.slice(0, 5)} ${nationalDigits.slice(5)}). Please review and send the message on WhatsApp.`);
      showToast(`Opened WhatsApp for ${customerName}`);
    } else {
      // SMS Composer protocol
      const smsUri = `sms:+91${nationalDigits}?body=${encodeURIComponent(formattedMessage)}`;
      try {
        window.location.href = smsUri;
      } catch (e) {
        console.warn('SMS URI launch failed on desktop:', e);
      }
      setActionDone(true);
      setActionMessage(`SMS composer opened. Please press Send on your phone or use the copy buttons below.`);
      showToast(`Opened SMS Composer for ${customerName}`);
    }

    if (onSuccess) {
      onSuccess({ customer: customerName, channel, status });
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      
      <div
        className="card animate-scale-in"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 540,
          padding: 0,
          zIndex: 121,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: isRecall ? 'var(--danger-light)' : 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isRecall ? 'var(--danger)' : 'var(--primary)' }}>
              {isRecall ? <ShieldAlert size={20} /> : <MessageSquare size={20} />}
            </div>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', margin: 0 }}>
                {isRecall ? 'Send Safety Notification — Recall' : 'Send Safety Notification — Near Expiry'}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>
                Pharmacist-Controlled Patient Communication Workflow
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ padding: 22, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Patient & Batch Info Summary */}
          <div style={{ background: 'var(--bg-alt)', borderRadius: 12, padding: 14, border: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 12 }}>
              <div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Customer</span>
                <p style={{ margin: '2px 0 0', fontWeight: 800, fontSize: 14.5, color: 'var(--text)' }}>{customerName}</p>
              </div>

              <div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Mobile</span>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-2)', fontFamily: 'monospace', fontWeight: 600 }}>{customerPhone || 'No phone recorded'}</p>
              </div>

              <div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Preferred</span>
                <div style={{ marginTop: 2 }}>
                  <span className={`chip ${customerPreference === 'WHATSAPP' ? 'badge-green' : 'badge-teal'}`} style={{ fontSize: 11, fontWeight: 700 }}>
                    {customerPreference === 'WHATSAPP' ? '🟢 WhatsApp' : '📱 SMS'}
                  </span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Reason</span>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, fontWeight: 700, color: isRecall ? 'var(--danger)' : 'var(--warning)' }}>
                  {isRecall ? (recallReason || 'Batch Recall') : 'Near Expiry'}
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 10, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <div>
                <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 600 }}>Medicine</span>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{medicineName}</p>
              </div>
              <div>
                <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 600 }}>Batch</span>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>{batchNumber}</p>
              </div>
              <div>
                <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 600 }}>{isRecall ? 'Batch Status' : 'Expiry Date'}</span>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, fontWeight: 700, color: isRecall ? 'var(--danger)' : 'var(--warning)' }}>
                  {isRecall ? 'QUARANTINED / RECALLED' : expiryDate}
                </p>
              </div>
            </div>
          </div>

          {/* Channel Choice Cards */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                Choose Communication:
              </label>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Pharmacist can override recommendation</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12 }}>
              {/* WhatsApp Card */}
              <div
                onClick={() => setSelectedChannel('WHATSAPP')}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  border: selectedChannel === 'WHATSAPP' ? '2px solid #10B981' : '1px solid var(--border)',
                  background: selectedChannel === 'WHATSAPP' ? 'rgba(16, 185, 129, 0.08)' : 'var(--surface-raised)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                      <MessageCircle size={18} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>
                        🟢 WhatsApp
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-3)' }}>Smartphone App</p>
                    </div>
                  </div>
                  {customerPreference === 'WHATSAPP' && (
                    <span style={{ background: '#10B981', color: '#FFF', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase' }}>
                      Recommended
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 8, lineHeight: 1.35 }}>
                  Receive safety notifications through WhatsApp on customer's number.
                </p>
              </div>

              {/* SMS Card */}
              <div
                onClick={() => setSelectedChannel('SMS')}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  border: selectedChannel === 'SMS' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: selectedChannel === 'SMS' ? 'var(--primary-light)' : 'var(--surface-raised)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                      <Smartphone size={18} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>
                        📱 SMS
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-3)' }}>Button / Standard Phone</p>
                    </div>
                  </div>
                  {customerPreference === 'SMS' && (
                    <span style={{ background: 'var(--primary)', color: '#FFF', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase' }}>
                      Recommended
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 8, lineHeight: 1.35 }}>
                  Receive safety notifications through SMS composer on pharmacist's phone.
                </p>
              </div>
            </div>
          </div>

          {/* Multilingual Template Selector */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>
                Approved Template Language
              </label>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{language}</span>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {LANGUAGES.map(l => (
                <button
                  key={l.id}
                  onClick={() => setLanguage(l.id)}
                  className={`btn ${language === l.id ? 'btn-teal' : 'btn-secondary'}`}
                  style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6 }}
                >
                  {l.label} ({l.native})
                </button>
              ))}
            </div>
          </div>

          {/* Message Preview Box */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>
                Pharmacist-Approved Message Preview
              </label>
              <button
                onClick={handleCopyMessage}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                {copiedMessage ? <Check size={12} /> : <Copy size={12} />}
                {copiedMessage ? 'Copied' : 'Copy Text'}
              </button>
            </div>

            <div style={{ background: 'var(--surface-raised)', borderRadius: 10, padding: 12, border: '1px solid var(--border)', fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5 }}>
              "{formattedMessage}"
            </div>
          </div>

          {/* Status / Feedback Banner when action executed */}
          {actionDone && (
            <div style={{ background: 'var(--success-light)', border: '1px solid var(--success-border)', borderRadius: 10, padding: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <CheckCircle2 size={18} color="var(--success)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--success-text)' }}>
                  Communication Action Logged: {selectedChannel === 'WHATSAPP' ? 'WhatsApp Opened' : 'SMS Composer Opened'}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-2)' }}>
                  {actionMessage}
                </p>
              </div>
            </div>
          )}

          {/* Button-Phone Helper fallback tools */}
          {selectedChannel === 'SMS' && (
            <div style={{ background: 'var(--bg-subtle)', borderRadius: 10, padding: 12, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Manual dispatch helper:</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleCopyNumber}
                  className="btn btn-secondary"
                  style={{ fontSize: 11, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <Copy size={12} /> {copiedNumber ? 'Copied Number' : 'Copy Number'}
                </button>
                <button
                  onClick={handleCopyMessage}
                  className="btn btn-secondary"
                  style={{ fontSize: 11, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <Copy size={12} /> {copiedMessage ? 'Copied Message' : 'Copy Message'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            {actionDone ? 'Done' : 'Cancel'}
          </button>

          <button
            className="btn btn-teal"
            onClick={handleExecuteCommunication}
            disabled={!customerPhone}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 18px', opacity: !customerPhone ? 0.6 : 1 }}
          >
            {selectedChannel === 'WHATSAPP' ? <MessageCircle size={15} /> : <Smartphone size={15} />}
            {selectedChannel === 'WHATSAPP' ? 'Open WhatsApp Chat' : 'Open SMS Composer'}
          </button>
        </div>
      </div>
    </div>
  );
}
