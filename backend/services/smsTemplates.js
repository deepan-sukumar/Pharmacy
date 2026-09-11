/**
 * Multilingual Approved SMS Templates for PharmaFlow
 * 
 * Languages supported:
 * 1. English ('en' / 'English')
 * 2. Tamil ('ta' / 'Tamil' / 'தமிழ்')
 * 3. Telugu ('te' / 'Telugu' / 'తెలుగు')
 * 4. Kannada ('kn' / 'Kannada' / 'ಕನ್ನಡ')
 * 5. Hindi ('hi' / 'Hindi' / 'हिन्दी')
 * 
 * SAFETY RULE: Fixed pharmacist-approved templates ONLY.
 * Never allow arbitrary dynamic unverified clinical dosage or diagnostic generation.
 */

const SMS_TEMPLATES = {
  // 1. NEAR EXPIRY
  NEAR_EXPIRY: {
    English: "PharmaFlow: Your medicine {medicine} (Batch {batch}) is approaching its expiry date ({expiry}). Please check the expiry date before use and contact your pharmacist at {pharmacy} if you have any questions.",
    Tamil: "PharmaFlow: உங்கள் மருந்து {medicine} (பேட்ச் {batch}) காலாவதி தேதியை ({expiry}) நெருங்குகிறது. பயன்படுத்துவதற்கு முன் காலாவதி தேதியை சரிபார்க்கவும், மேலும் சந்தேகங்களுக்கு {pharmacy} மருந்தாளுநரைத் தொடர்பு கொள்ளவும்.",
    Telugu: "PharmaFlow: మీ మందు {medicine} (బ్యాచ్ {batch}) గడువు ముగింపు తేదీని ({expiry}) చేరుకుంటోంది. ఉపయోగించే ముందు తేదీని తనిఖీ చేయండి, సందేహాల కోసం {pharmacy} ఫార్మసిస్ట్‌ను సంప్రదించండి.",
    Kannada: "PharmaFlow: ನಿಮ್ಮ ಔಷಧಿ {medicine} (ಬ್ಯಾಚ್ {batch}) ಮುಕ್ತಾಯ ದಿನಾಂಕವನ್ನು ({expiry}) ಸಮೀಪಿಸುತ್ತಿದೆ. ಬಳಸುವ ಮೊದಲು ದಿನಾಂಕ ಪರಿಶೀಲಿಸಿ, ಹೆಚ್ಚಿನ ಮಾಹಿತಿಗೆ {pharmacy} ಫಾರ್ಮಾಸಿಸ್ಟ್ ಸಂಪರ್ಕಿಸಿ.",
    Hindi: "PharmaFlow: आपकी दवा {medicine} (बैच {batch}) अपनी समाप्ति तिथि ({expiry}) के करीब पहुंच रही है। उपयोग से पहले समाप्ति तिथि जांचें और किसी भी प्रश्न के लिए {pharmacy} फार्मासिस्ट से संपर्क करें।"
  },

  // 2. EXPIRED
  EXPIRED: {
    English: "PharmaFlow: This medicine {medicine} (Batch {batch}) has reached its expiry date. Please do not use it and contact your pharmacist at {pharmacy} for safe disposal guidance.",
    Tamil: "PharmaFlow: இந்த மருந்து {medicine} (பேட்ச் {batch}) காலாவதி தேதியை எட்டியுள்ளது. தயவுசெய்து இதை பயன்படுத்த வேண்டாம், பாதுகாப்பான அகற்றலுக்கு {pharmacy} மருந்தாளுநரைத் தொடர்பு கொள்ளவும்.",
    Telugu: "PharmaFlow: ఈ మందు {medicine} (బ్యాచ్ {batch}) గడువు ముగిసింది. దయచేసి దీన్ని ఉపయోగించవద్దు, సురక్షిత తొలగింపు కోసం {pharmacy} ఫార్మసిస్ట్‌ను సంప్రదించండి.",
    Kannada: "PharmaFlow: ಈ ಔಷಧಿ {medicine} (ಬ್ಯಾಚ್ {batch}) ಮುಕ್ತಾಯ ದಿನಾಂಕ ತಲುಪಿದೆ. ದಯವಿಟ್ಟು ಇದನ್ನು ಬಳಸಬೇಡಿ, ಸುರಕ್ಷಿತ ವಿಲೇವಾರಿಗೆ {pharmacy} ಫಾರ್ಮಾಸಿಸ್ಟ್ ಸಂಪರ್ಕಿಸಿ.",
    Hindi: "PharmaFlow: यह दवा {medicine} (बैच {batch}) अपनी समाप्ति तिथि पर पहुंच चुकी है। कृपया इसका उपयोग न करें और सुरक्षित निपटान मार्गदर्शन के लिए {pharmacy} से संपर्क करें।"
  },

  // 3. RECALL & QUARANTINE
  RECALL: {
    English: "PharmaFlow URGENT SAFETY ADVISORY: Batch {batch} of {medicine} has been recalled by manufacturer bulletin. Please stop using this batch immediately and visit {pharmacy} for a safe replacement.",
    Tamil: "PharmaFlow அவசர பாதுகாப்பு அறிவிப்பு: {medicine} மருந்தின் பேட்ச் {batch} உற்பத்தியாளரால் திரும்பப் பெறப்பட்டுள்ளது. தயவுசெய்து உடனடியாக பயன்படுத்துவதை நிறுத்தி {pharmacy} மருந்தகத்தை அணுகவும்.",
    Telugu: "PharmaFlow అత్యవసర భద్రతా ప్రకటన: {medicine} యొక్క బ్యాచ్ {batch} తయారీదారుచే రీకాల్ చేయబడింది. దయచేసి వాడకాన్ని వెంటనే ఆపివేసి {pharmacy}ను సంప్రదించండి.",
    Kannada: "PharmaFlow ತುರ್ತು ಸುರಕ್ಷತಾ ಪ್ರಕಟಣೆ: {medicine} ಔಷಧಿಯ ಬ್ಯಾಚ್ {batch} ಮರುಪಡೆಯಲಾಗಿದೆ. ದಯವಿಟ್ಟು ತಕ್ಷಣ ಬಳಕೆಯನ್ನು ನಿಲ್ಲಿಸಿ ಮತ್ತು {pharmacy} ಸಂಪರ್ಕಿಸಿ.",
    Hindi: "PharmaFlow आवश्यक सुरक्षा सूचना: {medicine} का बैच {batch} निर्माता द्वारा वापस मंगा लिया गया है। कृपया इस बैच का उपयोग तुरंत बंद करें और {pharmacy} से संपर्क करें।"
  },

  // 4. SUPPLIER RETURN
  SUPPLIER_RETURN: {
    English: "PharmaFlow Supplier Alert: Batch {batch} of {medicine} ({quantity} units) is scheduled for return to {supplier}. Return window: {returnWindow}.",
    Tamil: "PharmaFlow சப்ளையர் எச்சரிக்கை: {medicine} பேட்ச் {batch} ({quantity} அலகுகள்) {supplier} க்கு திரும்ப ஒப்படைக்க திட்டமிடப்பட்டுள்ளது. கால அவகாசம்: {returnWindow}.",
    Telugu: "PharmaFlow సరఫరాదారు హెచ్చరిక: {medicine} బ్యాచ్ {batch} ({quantity} యూనిట్లు) {supplier} కు తిరిగి పంపడానికి షెడ్యూల్ చేయబడింది.",
    Kannada: "PharmaFlow ಸರಬರಾಜುದಾರರ ಎಚ್ಚರಿಕೆ: {medicine} ಬ್ಯಾಚ್ {batch} ({quantity} ಯುನಿಟ್‌ಗಳು) {supplier} ಗೆ ಹಿಂತಿರುಗಿಸಲು ನಿಗದಿಯಾಗಿದೆ.",
    Hindi: "PharmaFlow आपूर्तिकर्ता अलर्ट: {medicine} का बैच {batch} ({quantity} इकाइयाँ) {supplier} को वापसी के लिए निर्धारित है।"
  },

  // 5. LOW STOCK REORDER
  LOW_STOCK: {
    English: "PharmaFlow Inventory Notice: Stock for {medicine} is below safety threshold ({quantity} units remaining). Reorder recommended.",
    Tamil: "PharmaFlow இருப்பு அறிவிப்பு: {medicine} இருப்பு குறைந்த அளவிற்கு ({quantity} அலகுகள்) வந்துள்ளது. மறு ஆர்டர் பரிந்துரைக்கப்படுகிறது.",
    Telugu: "PharmaFlow ఇన్వెంటరీ నోటీసు: {medicine} స్టాక్ తక్కువగా ఉంది ({quantity} యూనిట్లు మిగిలి ఉన్నాయి).",
    Kannada: "PharmaFlow ದಾಸ್ತಾನು ಸೂಚನೆ: {medicine} ದಾಸ್ತಾನು ಕಡಿಮೆಯಾಗಿದೆ ({quantity} ಯುನಿಟ್‌ಗಳು ಬಾಕಿ ಇವೆ).",
    Hindi: "PharmaFlow इन्वेंटरी सूचना: {medicine} का स्टॉक न्यूनतम सीमा से नीचे है (केवल {quantity} इकाइयाँ शेष)।"
  }
};

/**
 * Resolves standard language name from input code or string.
 */
function normalizeLanguage(lang) {
  if (!lang) return 'English';
  const lower = String(lang).toLowerCase().trim();
  if (lower.startsWith('ta') || lower.includes('tamil') || lower.includes('தமிழ்')) return 'Tamil';
  if (lower.startsWith('te') || lower.includes('telugu') || lower.includes('తెలుగు')) return 'Telugu';
  if (lower.startsWith('kn') || lower.includes('kannada') || lower.includes('ಕನ್ನಡ')) return 'Kannada';
  if (lower.startsWith('hi') || lower.includes('hindi') || lower.includes('हिन्दी')) return 'Hindi';
  return 'English';
}

/**
 * Formats an approved template with sanitized dynamic variables.
 */
function renderSmsTemplate(type, language, variables = {}) {
  const normType = String(type).toUpperCase().replace(/[\s-]/g, '_');
  const templateGroup = SMS_TEMPLATES[normType] || SMS_TEMPLATES.NEAR_EXPIRY;
  const langKey = normalizeLanguage(language);
  
  let rawText = templateGroup[langKey] || templateGroup.English;

  // Replacements
  const replacements = {
    '{medicine}': variables.medicine || variables.medicineName || 'Medication',
    '{batch}': variables.batch || variables.batchNumber || 'Batch-NA',
    '{expiry}': variables.expiry || variables.expiryDate || 'Soon',
    '{pharmacy}': variables.pharmacy || variables.pharmacyName || 'Apollo MedPlus Express',
    '{customer}': variables.customer || variables.customerName || 'Valued Customer',
    '{supplier}': variables.supplier || variables.supplierName || 'Distributor',
    '{quantity}': variables.quantity !== undefined ? String(variables.quantity) : '0',
    '{returnWindow}': variables.returnWindow || '14 days'
  };

  for (const [placeholder, val] of Object.entries(replacements)) {
    rawText = rawText.replaceAll(placeholder, val);
  }

  return {
    notificationType: normType,
    language: langKey,
    message: rawText,
    isApprovedTemplate: true
  };
}

module.exports = {
  SMS_TEMPLATES,
  normalizeLanguage,
  renderSmsTemplate
};
