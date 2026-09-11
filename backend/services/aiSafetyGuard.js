/**
 * AI Safety Guard for PharmaFlow
 * 
 * PharmaFlow AI MUST NOT provide medical diagnosis or treatment advice.
 * Blocks:
 * - diagnosis
 * - medical diagnosis
 * - medication recommendation for a disease
 * - prescription
 * - patient-specific treatment
 * - patient-specific dosage
 * - antibiotic selection
 * - drug substitution
 * - treatment plan
 * - symptom interpretation for diagnosis
 * - instructions to start/stop/change medication dosage
 */

const CLINICAL_REFUSAL_MESSAGE = 
  "I can help with pharmacy inventory, dispensing records, batch tracking, expiry, recalls, supplier returns and operational analysis. I can't diagnose conditions, recommend medicines, prescribe treatments or provide patient-specific dosage instructions. Please consult a qualified healthcare professional for clinical decisions.";

const EMERGENCY_ADVICE_MESSAGE = 
  "If you or a patient is experiencing a medical emergency, please call emergency medical services immediately (e.g. 108 / 112 in India) or go to the nearest emergency department. PharmaFlow AI is strictly an operational inventory and dispensing management portal and cannot provide clinical emergency guidance.";

// Patterns that indicate clinical/diagnostic/prescriptive intent
const CLINICAL_PATTERNS = [
  /\b(what|which)\s+(medicine|tablet|drug|antibiotic|pill|syrup|dose|dosage)\s+(should|can|to)\s+(i|we|one|(?:the\s+)?patient|he|she|they)\s+(take|give|prescribe|use|have|consume)\b/i,
  /\b(what|which)\s+(is|are)\s+the\s+best\s+(medicine|treatment|cure|remedy|drug|antibiotic)\s+for\b/i,
  /\bhow\s+(much|many)\b.*\b(should|can)\s+(i|we|one|(?:the\s+)?patient|he|she|they)\s+(take|give|consume|prescribe)\b/i,
  /\b(diagnose|diagnosis|symptom\s+check|cure\s+for|treat\s+my|treat\s+the\s+patient)\b/i,
  /\b(fever|headache|cough|cold|infection|diabetes|hypertension|covid|malaria|dengue|pain|cancer|chest\s+pain|asthma|vomiting|diarrhea)\s+(treatment|cure|prescription|medication|tablet)\b/i,
  /\b(can\s+i|should\s+i)\s+(replace|substitute|switch)\s+.*\s+with\s+/i,
  /\b(start|stop|increase|decrease)\s+(taking|my|the)\s+(dosage|medication|medicine|tablets|pill)\b/i,
  /\b(prescribe|write\s+prescription|suggest\s+prescription|recommend\s+medicine\s+for)\b/i,
  /\b(is\s+it\s+safe\s+to\s+take|interaction\s+between\s+.*and.*for\s+patient)\b/i,
  /\b(dosage|dose)\s+(modification|instructions?|guidance|recommendation)\b/i,
  /\b(patient-specific\s+dosage|treatment\s+advice|medical\s+advice|dosage\s+instruction)\b/i
];

// Patterns indicating emergency medical situations
const EMERGENCY_PATTERNS = [
  /\b(unconscious|not\s+breathing|heart\s+attack|stroke|severe\s+bleeding|anaphylaxis|choking|overdose|poisoning|suicide)\b/i,
  /\b(chest\s+pain\s+radiating|difficulty\s+breathing|sudden\s+numbness|seizure)\b/i,
];

/**
 * Validates a user query against clinical safety rules.
 * @param {string} query - The prompt text from the pharmacist/user.
 * @returns {{ isSafe: boolean, refusalText?: string, isEmergency?: boolean, reason?: string }}
 */
function evaluateSafety(query) {
  if (!query || typeof query !== 'string') {
    return { isSafe: true };
  }

  const cleanQuery = query.trim();

  // 1. Check for emergency patterns first
  for (const pattern of EMERGENCY_PATTERNS) {
    if (pattern.test(cleanQuery)) {
      return {
        isSafe: false,
        isEmergency: true,
        refusalText: EMERGENCY_ADVICE_MESSAGE,
        reason: 'Emergency medical scenario detected.'
      };
    }
  }

  // 2. Check for clinical advice / diagnosis / prescription patterns
  for (const pattern of CLINICAL_PATTERNS) {
    if (pattern.test(cleanQuery)) {
      return {
        isSafe: false,
        isEmergency: false,
        refusalText: CLINICAL_REFUSAL_MESSAGE,
        reason: 'Clinical advice / medical prescription request blocked by safety guard.'
      };
    }
  }

  return { isSafe: true };
}

module.exports = {
  evaluateSafety,
  CLINICAL_REFUSAL_MESSAGE,
  EMERGENCY_ADVICE_MESSAGE
};
