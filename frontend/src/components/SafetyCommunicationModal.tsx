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
    dispensedDate?: string;
  } | null;
  notificationType?: 'NEAR_EXPIRY' | 'RECALL' | 'MANUAL' | string;
  medicineName?: string;
  batchNumber?: string;
  expiryDate?: string;
  dispensedDate?: string;
  recallReason?: string;
  pharmacyName?: string;
  onSuccess?: (result: any) => void;
  showToast?: (msg: string) => void;
}

export function formatReadableDate(rawDate?: string | null): string {
  if (!rawDate) return 'Not available';
  const str = String(rawDate).trim();
  if (!str) return 'Not available';

  // If already in '15 Sep 2026' or '15-Sep-2026' format
  if (/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/.test(str)) {
    return str;
  }
  if (/^[A-Za-z]{3}\s+\d{4}$/.test(str)) {
    return `30 ${str}`;
  }

  // Parse ISO or YYYY-MM-DD
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const day = parsed.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[parsed.getMonth()];
    const year = parsed.getFullYear();
    return `${day} ${month} ${year}`;
  }

  return str;
}

interface TemplateParams {
  patient: string;
  medicine: string;
  batch: string;
  dispensedDate: string;
  expiryDate: string;
  pharmacy: string;
  reason?: string;
}

const APPROVED_TEMPLATES: Record<string, {
  expiry: (p: TemplateParams) => string;
  recall: (p: TemplateParams) => string;
}> = {
  English: {
    expiry: (p) =>
      `PharmaFlow Safety Advisory: Dear ${p.patient}, your ${p.medicine} is nearing expiry. Dispensed: ${p.dispensedDate}. Expiry: ${p.expiryDate}. Please check before use and contact your pharmacist if needed. Thank you for reading. Take care! – ${p.pharmacy}`,
    recall: (p) =>
      `PharmaFlow Safety Advisory: Dear ${p.patient}, this is an urgent pharmacy safety notification regarding ${p.medicine} (Batch: ${p.batch}). Dispensed: ${p.dispensedDate}. Please contact your pharmacist immediately and do not use this medicine until guided. Take care! – ${p.pharmacy}`
  },
  Tamil: {
    expiry: (p) =>
      `PharmaFlow பாதுகாப்பு அறிவிப்பு: அன்புள்ள ${p.patient}, உங்கள் ${p.medicine} மருந்து காலாவதியை நெருங்குகிறது. வழங்கிய தேதி: ${p.dispensedDate}. காலாவதி தேதி: ${p.expiryDate}. பயன்படுத்தும் முன் சரிபார்த்து, தேவையெனில் உங்கள் மருந்தாளரை தொடர்பு கொள்ளவும். வாசித்ததற்கு நன்றி. உங்கள் உடல்நலத்தை கவனித்துக் கொள்ளுங்கள்! – ${p.pharmacy}`,
    recall: (p) =>
      `PharmaFlow பாதுகாப்பு அறிவிப்பு: அன்புள்ள ${p.patient}, நீங்கள் முன்பு பெற்ற ${p.medicine} (தொகுதி: ${p.batch}) மருந்து குறித்த அவசர பாதுகாப்பு அறிவிப்பு இது. வழங்கிய தேதி: ${p.dispensedDate}. இந்த தொகுதி குறித்து உடனடியாக உங்கள் மருந்தாளரை தொடர்பு கொள்ளவும், வழிகாட்டுதல் பெறும் வரை மருந்தை உட்கொள்ள வேண்டாம். உங்கள் உடல்நலத்தை கவனித்துக் கொள்ளுங்கள்! – ${p.pharmacy}`
  },
  Telugu: {
    expiry: (p) =>
      `PharmaFlow భద్రతా సలహా: ప్రియమైన ${p.patient}, మీ ${p.medicine} గడువు ముగింపుకు చేరువలో ఉంది. అందించిన తేదీ: ${p.dispensedDate}. గడువు తేదీ: ${p.expiryDate}. ఉపయోగించే ముందు తనిఖీ చేయండి, అవసరమైతే మీ ఫార్మసిస్ట్‌ను సంప్రదించండి. చదివినందుకు ధన్యవాదాలు. జాగ్రత్తగా ఉండండి! – ${p.pharmacy}`,
    recall: (p) =>
      `PharmaFlow భద్రతా సలహా: ప్రియమైన ${p.patient}, మీరు పొందిన ${p.medicine} (బ్యాచ్: ${p.batch}) ఔషధానికి సంబంధించిన అత్యవసర భద్రతా నోటీసు ఇది. అందించిన తేదీ: ${p.dispensedDate}. దయచేసి వెంటనే మీ ఫార్మసిస్ట్‌ను సంప్రదించండి మరియు మార్గదర్శకత్వం వచ్చేవరకు ఉపయోగించవద్దు. జాగ్రత్తగా ఉండండి! – ${p.pharmacy}`
  },
  Kannada: {
    expiry: (p) =>
      `PharmaFlow ಸುರಕ್ಷತಾ ಸಲಹೆ: ಪ್ರಿಯ ${p.patient}, ನಿಮ್ಮ ${p.medicine} ಔಷಧಿಯ ಅವಧಿ ಮುಕ್ತಾಯ ಸಮೀಪಿಸುತ್ತಿದೆ. ನೀಡಿದ ದಿನಾಂಕ: ${p.dispensedDate}. ಮುಕ್ತಾಯ ದಿನಾಂಕ: ${p.expiryDate}. ಬಳಸುವ ಮೊದಲು ಪರಿಶೀಲಿಸಿ, ಅಗತ್ಯವಿದ್ದರೆ ನಿಮ್ಮ ಔಷಧಿಕಾರರನ್ನು ಸಂಪರ್ಕಿಸಿ. ಓದಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು. ಜಾಗರೂಕರಾಗಿರಿ! – ${p.pharmacy}`,
    recall: (p) =>
      `PharmaFlow ಸುರಕ್ಷತಾ ಸಲಹೆ: ಪ್ರಿಯ ${p.patient}, ನೀವು ಪಡೆದ ${p.medicine} (ಬ್ಯಾಚ್: ${p.batch}) ಔಷಧಿಯ ಕುರಿತು ಇದು ತುರ್ತು ಸುರಕ್ಷತಾ ಸೂಚನೆಯಾಗಿದೆ. ನೀಡಿದ ದಿನಾಂಕ: ${p.dispensedDate}. ದಯವಿಟ್ಟು ತಕ್ಷಣ ನಿಮ್ಮ ಔಷಧಿಕಾರರನ್ನು ಸಂಪರ್ಕಿಸಿ ಮತ್ತು ಮಾರ್ಗದರ್ಶನ ಸಿಗುವವರೆಗೆ ಔಷಧಿಯನ್ನು ಬಳಸಬೇಡಿ. ಜಾಗರೂಕರಾಗಿರಿ! – ${p.pharmacy}`
  },
  Hindi: {
    expiry: (p) =>
      `PharmaFlow सुरक्षा सलाह: प्रिय ${p.patient}, आपकी ${p.medicine} दवा समाप्ति तिथि के निकट आ रही है। वितरण तिथि: ${p.dispensedDate}। समाप्ति तिथि: ${p.expiryDate}। कृपया उपयोग करने से पहले जांच लें और आवश्यकता पड़ने पर अपने फार्मासिस्ट से संपर्क करें। पढ़ने के लिए धन्यवाद। अपना ख्याल रखें! – ${p.pharmacy}`,
    recall: (p) =>
      `PharmaFlow सुरक्षा सलाह: प्रिय ${p.patient}, यह आपके द्वारा प्राप्त ${p.medicine} (बैच: ${p.batch}) दवा के संबंध में एक आवश्यक सुरक्षा सूचना है। वितरण तिथि: ${p.dispensedDate}। कृपया तुरंत अपने फार्मासिस्ट से संपर्क करें और मार्गदर्शन मिलने तक दवा का उपयोग न करें। अपना ख्याल रखें! – ${p.pharmacy}`
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
  expiryDate = '30 Oct 2026',
  dispensedDate,
  recallReason = 'Manufacturer safety bulletin recall',
  pharmacyName = 'Apollo MedPlus Pharmacy',
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

  // Resolve dates cleanly
  const resolvedDispensedDate = formatReadableDate(dispensedDate || targetCustomer?.date || targetCustomer?.dispensedDate);
  const resolvedExpiryDate = formatReadableDate(expiryDate);
  const resolvedPharmacyName = pharmacyName || 'Apollo MedPlus Pharmacy';

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
  const templateObj = APPROVED_TEMPLATES[language] || APPROVED_TEMPLATES.English;
  const templateFn = isRecall ? templateObj.recall : templateObj.expiry;

  const formattedMessage = templateFn({
    patient: customerName,
    medicine: medicineName,
    batch: batchNumber,
    dispensedDate: resolvedDispensedDate,
    expiryDate: resolvedExpiryDate,
    pharmacy: resolvedPharmacyName,
    reason: recallReason
  });

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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 110px), 1fr))', gap: 10, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <div>
                <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 600 }}>Medicine</span>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{medicineName}</p>
              </div>
              <div>
                <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 600 }}>Batch</span>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>{batchNumber}</p>
              </div>
              <div>
                <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 600 }}>Dispensed Date</span>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, fontWeight: 700, color: 'var(--text-2)' }}>{resolvedDispensedDate}</p>
              </div>
              <div>
                <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 600 }}>{isRecall ? 'Batch Status' : 'Exact Expiry'}</span>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, fontWeight: 700, color: isRecall ? 'var(--danger)' : 'var(--warning)' }}>
                  {isRecall ? 'QUARANTINED / RECALLED' : resolvedExpiryDate}
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
                  Open WhatsApp chat with pre-filled approved safety advisory.
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
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-3)' }}>Standard / Button Phone</p>
                    </div>
                  </div>
                  {customerPreference === 'SMS' && (
                    <span style={{ background: 'var(--primary)', color: '#FFF', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase' }}>
                      Recommended
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 8, lineHeight: 1.35 }}>
                  Open native SMS composer on phone with pre-filled safety advisory.
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
