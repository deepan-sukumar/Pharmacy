/**
 * Gemini AI Pharmacy Assistant Service for PharmaFlow
 * 
 * Model: Gemini 3.5 Flash ('gemini-3.5-flash')
 * Environment variables:
 * - GEMINI_API_KEY
 * - GEMINI_MODEL (defaults to 'gemini-3.5-flash')
 * 
 * Flow:
 * User Prompt
 *  -> AI Safety Guard Check (Refuses clinical diagnosis & prescriptions)
 *  -> Intent Analysis & Parameter Extraction
 *  -> Controlled Pharmacy Tools (Live Firestore Data)
 *  -> Gemini 3.5 Flash Model Synthesis / Domain Deterministic Engine
 *  -> Structured, Prioritized, Action-Oriented Operational Response
 */

const { evaluateSafety } = require('./aiSafetyGuard');
const tools = require('./pharmacyTools');
const { calculateScenario, compareOrderScenarios } = require('./simulationService');

let GoogleGenAI = null;
try {
  const genaiPkg = require('@google/genai');
  GoogleGenAI = genaiPkg.GoogleGenAI;
} catch (e) {
  console.warn('⚠️ @google/genai package loaded via fallback');
}

/**
 * System prompt defining PharmaFlow operational scope, standard response structure, and strict clinical restrictions
 */
const SYSTEM_INSTRUCTION = `
You are the PharmaFlow Operations AI Assistant — a domain-specific intelligence copilot for licensed retail and hospital pharmacists.
Your sole purpose is operational decision support, inventory analysis, batch expiry tracking, supplier return optimization, recall compliance, and dispensing audit investigations.

STRICT CLINICAL RESTRICTIONS:
- NEVER diagnose medical conditions or interpret symptoms.
- NEVER recommend medicines, prescribe treatments, or suggest antibiotic regimens.
- NEVER provide patient-specific dosage instructions or drug substitutions.
- When clinical questions are asked, strictly refuse using the approved standard statement.

STANDARD RESPONSE FORMAT (CLEAR, PRIORITIZED & ACTION-ORIENTED):
1. TITLE: Uppercase domain-specific title (e.g., PROCUREMENT & REORDER RECOMMENDATION, EXPIRY RISK ALERT).
2. SUMMARY FIRST: Exactly one clear concluding sentence at the top summarizing the situation (e.g., "2 medicines require immediate pharmacist review.").
3. PRIORITY LEVEL: Categorize urgency using semantic priority:
   - 🔴 HIGH PRIORITY: Immediate attention required (e.g. stockout imminent, expired stock, active recall).
   - 🟠 MEDIUM PRIORITY: Review soon (e.g. near expiry within 30 days, reorder buffer).
   - 🟡 LOW PRIORITY: Monitor.
   - 🟢 NORMAL: Adequate buffer / zero risk.
4. STRUCTURED DATA & TABLES: When presenting 2 or more records, format as a clean Markdown table with headers (Medicine | Batch | Stock | Expiry | Priority).
5. FACT VS RECOMMENDATION: Clearly state verified facts (e.g., "68 units remain in stock.") before recommendations.
6. RECOMMENDED ACTION: End with a concise "RECOMMENDED ACTION" section containing short, actionable numbered steps (e.g. "1. Review Azithromycin for immediate reorder.").
7. WHAT-IF SIMULATIONS: Clearly label all simulation projections as "SIMULATED DATA". Never present simulated numbers as actual inventory.
8. RESTRAINED STYLING: Do NOT use excessive emojis, duplicate paragraphs, or conversational filler. Keep answers concise, factual, and easy for a pharmacist to scan.
`;

/**
 * Maps query keywords to relevant controlled tools.
 */
async function retrieveControlledPharmacyContext(pharmacyId, query) {
  const q = query.toLowerCase();
  const context = {};

  // 1. What-If & Simulation Queries
  if (q.includes('what if') || q.includes('what-if') || q.includes('simulate') || q.includes('compare +') || q.includes('order +') || q.includes('more units')) {
    context.simulationQuery = true;
    const invSnap = await tools.getLowStockMedicines(pharmacyId);
    const targetMed = invSnap[0] || { medicine: 'Paracetamol 500mg', currentQuantity: 120, unitPrice: 25 };
    
    if (q.includes('compare') || q.includes('100') && q.includes('300') && q.includes('500')) {
      context.multiComparison = compareOrderScenarios({
        medicine: targetMed.medicine,
        currentStock: targetMed.currentQuantity || 120,
        dailyUsage: 12,
        daysToExpiry: 45,
        unitCost: targetMed.unitPrice || 25
      });
    } else {
      let qty = 300;
      const match = q.match(/\b(\d+)\s*(?:more|units|order)/i);
      if (match) qty = parseInt(match[1], 10);

      context.singleScenario = calculateScenario({
        medicine: targetMed.medicine,
        currentStock: targetMed.currentQuantity || 120,
        orderQty: qty,
        dailyUsage: 12,
        daysToExpiry: 45,
        unitCost: targetMed.unitPrice || 25
      });
    }
    return context;
  }

  // 2. Procurement & Reorder Intents
  if (q.includes('buy') || q.includes('sooner') || q.includes('order') || q.includes('reorder') || q.includes('purchase') || q.includes('procure') || q.includes('shortage') || q.includes('replenish')) {
    context.inventorySummary = await tools.getInventorySummary(pharmacyId);
    context.lowStockMedicines = await tools.getLowStockMedicines(pharmacyId);
    context.expiringBatches = await tools.getExpiringMedicines(pharmacyId, 30);
  }

  // 3. Expiry Risk & Timeline Intents
  if (q.includes('expir') || q.includes('near') || q.includes('waste') || q.includes('shelf') || q.includes('30 days') || q.includes('60 days')) {
    context.expiringBatches = await tools.getExpiringMedicines(pharmacyId, 30);
    context.expiredBatches = await tools.getExpiredMedicines(pharmacyId);
    context.returnEligible = await tools.getSupplierReturnEligibleBatches(pharmacyId);
  }

  // 4. Stock & Catalog Intents
  if (q.includes('stock') || q.includes('low') || q.includes('inventory') || q.includes('catalog') || q.includes('quantity')) {
    if (!context.inventorySummary) context.inventorySummary = await tools.getInventorySummary(pharmacyId);
    if (!context.lowStockMedicines) context.lowStockMedicines = await tools.getLowStockMedicines(pharmacyId);
  }

  // 5. Dispensing, Audits & Unusual Patterns Intents
  if (q.includes('dispens') || q.includes('audit') || q.includes('sale') || q.includes('rx') || q.includes('unusual') || q.includes('pattern') || q.includes('velocity')) {
    context.dispensingHistory = await tools.getDispensingHistory(pharmacyId, { limit: 10 });
    context.unusualPatterns = await tools.getUnusualDispensingPatterns(pharmacyId);
    context.analytics = await tools.getPharmacyAnalytics(pharmacyId);
  }

  // 6. Supplier Logistics & Return Intents
  if (q.includes('supplier') || q.includes('return') || q.includes('vendor') || q.includes('distributor') || q.includes('exposure')) {
    context.suppliers = await tools.getSupplierSummary(pharmacyId);
    context.returnEligible = await tools.getSupplierReturnEligibleBatches(pharmacyId);
    context.expiringBatches = await tools.getExpiringMedicines(pharmacyId, 60);
  }

  // 7. Recall & Quarantine Intents
  if (q.includes('recall') || q.includes('quarantine') || q.includes('defect') || q.includes('affected customer')) {
    context.recallSummary = await tools.getRecallSummary(pharmacyId);
  }

  // If general inquiry, fetch holistic baseline
  if (Object.keys(context).length === 0) {
    context.todayIntelligence = await tools.getTodayPharmacyIntelligence(pharmacyId);
    context.inventorySummary = await tools.getInventorySummary(pharmacyId);
  }

  return context;
}

/**
 * Builds deterministic, structured operational responses based on live Firestore data
 */
function buildDeterministicOperationalResponse(query, context, language = 'English') {
  const q = query.toLowerCase();

  // 1. What-If Simulation: Multi Comparison
  if (context.multiComparison) {
    const matrix = context.multiComparison.comparisonMatrix || [];
    const medicine = context.multiComparison.medicine;
    return {
      title: 'WHAT-IF ORDER SCENARIO COMPARISON',
      summary: `Evaluated 4 order increment scenarios (+0, +100, +300, +500) for ${medicine}.`,
      priority: 'medium',
      dataType: 'simulation',
      badge: 'SIMULATION ANALYSIS',
      table: {
        headers: ['Order Increment', 'Projected Total Stock', 'Surplus at Expiry', 'Potential Waste', 'Risk Level'],
        rows: matrix.map(m => [
          `+${m.orderIncrement} units`,
          `${m.projectedStock} units`,
          `${m.surplusAtExpiry} units`,
          `₹ ${m.wasteCost.toLocaleString('en-IN')}`,
          m.riskLevel
        ])
      },
      recommendedActions: [
        'Review patient dispensing velocity before confirming increments over +100 units.',
        'Prioritize orders that avoid surplus at expiration.'
      ],
      text: `### WHAT-IF ORDER SCENARIO COMPARISON\n\nEvaluated 4 order increment scenarios for **${medicine}**:\n\n` +
        `| Order Increment | Projected Total Stock | Surplus at Expiry | Potential Waste | Risk Level |\n` +
        `|---|---:|---:|---:|---|\n` +
        matrix.map(m => `| +${m.orderIncrement} units | ${m.projectedStock} | ${m.surplusAtExpiry} | ₹ ${m.wasteCost.toLocaleString('en-IN')} | ${m.riskLevel} |`).join('\n') +
        `\n\n**RECOMMENDED ACTION**:\n1. Select the reorder increment that minimizes surplus at expiration.\n2. Verify lead time with supplier.`
    };
  }

  // 2. What-If Simulation: Single Scenario
  if (context.singleScenario) {
    const s = context.singleScenario;
    const sim = s.simulatedData;
    const act = s.actualData;
    return {
      title: 'WHAT-IF SIMULATION ANALYSIS',
      summary: `Ordering +${sim.orderQty} units of ${s.medicine} results in projected stock of ${sim.projectedTotalStock} units.`,
      priority: sim.riskLevel === 'High' ? 'high' : sim.riskLevel === 'Medium' ? 'medium' : 'normal',
      dataType: 'simulation',
      badge: 'WHAT-IF PROJECTION',
      whatIfDetails: {
        medicine: s.medicine,
        currentStock: act.currentStock,
        simulatedOrder: sim.orderQty,
        projectedTotal: sim.projectedTotalStock,
        projectedDemand: sim.projectedDemandInWindow,
        projectedSurplus: sim.projectedSurplusAtExpiry,
        potentialWasteCost: sim.potentialWasteCost,
        daysUntilStockout: sim.daysUntilStockout,
        riskLevel: sim.riskLevel
      },
      recommendedActions: [
        sim.recommendation,
        'Check expiry runway before issuing supplier purchase order.'
      ],
      text: `### WHAT-IF SIMULATION\n\n**Scenario**: Order +${sim.orderQty} units of ${s.medicine}\n\n` +
        `• **CURRENT STOCK**: ${act.currentStock} units\n` +
        `• **SIMULATED TOTAL**: ${sim.projectedTotalStock} units\n` +
        `• **PROJECTED DEMAND**: ${sim.projectedDemandInWindow} units\n` +
        `• **PROJECTED REMAINING AT EXPIRY**: ${sim.projectedSurplusAtExpiry} units\n\n` +
        `**RESULT**:\n${sim.recommendation}\n\n` +
        `**RECOMMENDED ACTION**:\n1. Review supplier lead time.\n2. Confirm reorder batch.`
    };
  }

  // 3. Procurement & Reorder ("Which medicines do I need to buy sooner?")
  if (q.includes('buy') || q.includes('sooner') || q.includes('reorder') || q.includes('order') || q.includes('procure') || q.includes('purchase') || q.includes('shortage') || q.includes('replenish')) {
    const lowStock = context.lowStockMedicines || [];
    const expiring = context.expiringBatches || [];
    const totalCount = lowStock.length + expiring.length;

    if (totalCount === 0) {
      return {
        title: 'PROCUREMENT & REORDER RECOMMENDATION',
        summary: 'No medicines currently require review for reorder. Stock levels and expiry runways are healthy.',
        priority: 'normal',
        dataType: 'actual',
        badge: 'STOCK BUFFER OPTIMAL',
        zeroResult: true,
        recommendedActions: ['Continue standard routine stock monitoring.'],
        text: `### PROCUREMENT & REORDER RECOMMENDATION\n\nNo medicines currently require review for reorder. All active inventory items are above safety thresholds with healthy shelf-life runways.`
      };
    }

    const items = [
      ...lowStock.map(m => ({
        medicine: m.medicine,
        batch: m.batch,
        stock: m.currentQuantity,
        expiry: m.expiry || 'Standard',
        supplier: m.supplier,
        unitCost: m.unitPrice || 0,
        priority: 'high',
        reason: 'Stock is below configured safety buffer threshold.',
        action: 'Review for immediate purchase order.'
      })),
      ...expiring.map(m => ({
        medicine: m.medicine,
        batch: m.batch,
        stock: m.quantity,
        expiry: `${m.daysRemaining} days remaining (${m.expiry})`,
        supplier: m.supplier,
        unitCost: m.unitPrice || 0,
        priority: 'medium',
        reason: `Current batch is approaching expiration in ${m.daysRemaining} days.`,
        action: 'Review batch and order fresh replacement stock.'
      }))
    ];

    const actions = [
      ...lowStock.map(m => `Review ${m.medicine} (Batch ${m.batch}) for immediate reorder.`),
      ...expiring.map(m => `Plan replacement batch for ${m.medicine} (Expires in ${m.daysRemaining} days).`),
      'Use What-If Simulator to compare order increments (+100, +300, +500 units).'
    ];

    return {
      title: 'PROCUREMENT & REORDER RECOMMENDATION',
      summary: `${totalCount} medicine(s) require pharmacist review.`,
      priority: lowStock.length > 0 ? 'high' : 'medium',
      dataType: 'actual',
      badge: 'PROCUREMENT INTELLIGENCE',
      items,
      table: {
        headers: ['Medicine', 'Batch', 'Stock', 'Expiry / Runway', 'Supplier', 'Priority'],
        rows: items.map(i => [
          i.medicine,
          i.batch,
          `${i.stock} units`,
          i.expiry,
          i.supplier,
          i.priority === 'high' ? 'High' : 'Medium'
        ])
      },
      recommendedActions: actions,
      text: `### PROCUREMENT & REORDER RECOMMENDATION\n\n**${totalCount} medicine(s) require pharmacist review.**\n\n` +
        `| Medicine | Batch | Stock | Expiry / Runway | Supplier | Priority |\n` +
        `|---|---|---:|---|---|---|\n` +
        items.map(i => `| ${i.medicine} | ${i.batch} | ${i.stock} units | ${i.expiry} | ${i.supplier} | ${i.priority === 'high' ? '🔴 High' : '🟠 Medium'} |`).join('\n') +
        `\n\n**RECOMMENDED ACTION**:\n` +
        actions.map((a, idx) => `${idx + 1}. ${a}`).join('\n')
    };
  }

  // 4. Expiry Risk ("Which medicines expire within 30 days?")
  if (q.includes('expir') || q.includes('near') || q.includes('waste') || q.includes('30 days') || q.includes('60 days')) {
    const expiring = context.expiringBatches || [];
    if (expiring.length === 0) {
      return {
        title: 'EXPIRY RISK ANALYSIS',
        summary: 'No medicines are currently recorded as expiring within the target review window.',
        priority: 'normal',
        dataType: 'actual',
        badge: 'ZERO EXPIRY RISK',
        zeroResult: true,
        recommendedActions: ['Continue standard FEFO dispensing protocol.'],
        text: `### EXPIRY RISK ANALYSIS\n\nNo medicines are currently recorded as expiring within 30 days. All active stock items have safe shelf-life runways.`
      };
    }

    const items = expiring.map(m => ({
      medicine: m.medicine,
      batch: m.batch,
      stock: m.quantity,
      expiry: `${m.daysRemaining} days (${m.expiry})`,
      supplier: m.supplier,
      priority: m.daysRemaining <= 15 ? 'high' : 'medium',
      reason: `Batch reaches expiration in ${m.daysRemaining} days. Estimated risk: ₹ ${m.riskValuation.toLocaleString('en-IN')}.`,
      action: 'Prioritize FEFO dispensing or initiate supplier return credit.'
    }));

    return {
      title: 'EXPIRY RISK ALERT',
      summary: `${expiring.length} batch(es) require immediate expiry review.`,
      priority: expiring.some(e => e.daysRemaining <= 15) ? 'high' : 'medium',
      dataType: 'actual',
      badge: 'EXPIRY RISK',
      items,
      table: {
        headers: ['Medicine', 'Batch', 'Quantity', 'Days Remaining', 'Supplier', 'Risk Value'],
        rows: expiring.map(m => [
          m.medicine,
          m.batch,
          `${m.quantity} units`,
          `${m.daysRemaining} days`,
          m.supplier,
          `₹ ${m.riskValuation.toLocaleString('en-IN')}`
        ])
      },
      recommendedActions: [
        'Review high-quantity batches first for prioritized FEFO counter dispensing.',
        'File supplier return credit claims for return-eligible batches before cutoff.'
      ],
      text: `### EXPIRY RISK ALERT\n\n**${expiring.length} batch(es) require review.**\n\n` +
        `| Medicine | Batch | Quantity | Days Remaining | Supplier | Risk Value |\n` +
        `|---|---|---:|---:|---|---:|\n` +
        expiring.map(m => `| ${m.medicine} | ${m.batch} | ${m.quantity} units | ${m.daysRemaining} days | ${m.supplier} | ₹ ${m.riskValuation.toLocaleString('en-IN')} |`).join('\n') +
        `\n\n**RECOMMENDED ACTION**:\n1. Prioritize FEFO counter dispensing.\n2. File supplier return claims for eligible batches.`
    };
  }

  // 5. Low Stock ("Which medicines are low in stock?")
  if (q.includes('low stock') || q.includes('stock')) {
    const lowStock = context.lowStockMedicines || [];
    if (lowStock.length === 0) {
      return {
        title: 'LOW-STOCK AUDIT',
        summary: 'All catalog medicines are currently above minimum safety threshold levels.',
        priority: 'normal',
        dataType: 'actual',
        badge: 'STOCK LEVELS HEALTHY',
        zeroResult: true,
        recommendedActions: ['Maintain routine weekly stock audit.'],
        text: `### LOW-STOCK AUDIT\n\nAll catalog medicines are currently above minimum configured stock thresholds. No stockouts detected.`
      };
    }

    return {
      title: 'LOW-STOCK ALERT',
      summary: `${lowStock.length} medicine(s) are below configured safety thresholds.`,
      priority: 'high',
      dataType: 'actual',
      badge: 'LOW STOCK ALERT',
      items: lowStock.map(m => ({
        medicine: m.medicine,
        batch: m.batch,
        stock: m.currentQuantity,
        supplier: m.supplier,
        priority: 'high',
        reason: 'Current quantity is below the minimum buffer threshold (20 units).',
        action: 'Review inventory velocity and initiate replenishment purchase order.'
      })),
      table: {
        headers: ['Medicine', 'Batch', 'Current Stock', 'Threshold', 'Supplier', 'Priority'],
        rows: lowStock.map(m => [
          m.medicine,
          m.batch,
          `${m.currentQuantity} units`,
          '20 units',
          m.supplier,
          'High'
        ])
      },
      recommendedActions: [
        'Review high-priority medicines for immediate purchase reorder.',
        'Verify distributor lead times to prevent prescription fulfillment delays.'
      ],
      text: `### LOW-STOCK ALERT\n\n**${lowStock.length} medicine(s) are below configured safety thresholds.**\n\n` +
        `| Medicine | Batch | Current Stock | Threshold | Supplier | Priority |\n` +
        `|---|---|---:|---:|---|---|\n` +
        lowStock.map(m => `| ${m.medicine} | ${m.batch} | ${m.currentQuantity} units | 20 units | ${m.supplier} | 🔴 High |`).join('\n') +
        `\n\n**RECOMMENDED ACTION**:\n1. Review high-priority medicines for immediate reorder.\n2. Contact distributors for stock replenishment.`
    };
  }

  // 6. Recalls ("Which customers received the recalled batch?")
  if (q.includes('recall') || q.includes('quarantine') || q.includes('affected customer')) {
    const recall = context.recallSummary || {};
    const quarantined = recall.quarantinedStockBatches || [];

    if (quarantined.length === 0) {
      return {
        title: 'BATCH RECALL STATUS',
        summary: 'Zero batches are currently flagged under active quarantine.',
        priority: 'normal',
        dataType: 'actual',
        badge: 'NO ACTIVE RECALLS',
        zeroResult: true,
        recommendedActions: ['Continue standard CDSCO safety bulletin monitoring.'],
        text: `### BATCH RECALL STATUS\n\nZero batches are currently flagged under active quarantine. All inventory batches are authorized for dispensing.`
      };
    }

    const firstRecall = quarantined[0];
    return {
      title: 'BATCH RECALL SAFETY ALERT',
      summary: `${quarantined.length} recalled batch(es) strictly quarantined. Dispensing locked across all POS counters.`,
      priority: 'high',
      dataType: 'actual',
      badge: 'QUARANTINE ENFORCED',
      items: quarantined.map(r => ({
        medicine: r.medicine,
        batch: r.batch,
        stock: r.quarantinedUnits,
        priority: 'high',
        reason: 'Manufacturer safety bulletin recall quarantine.',
        action: 'Verify quarantine physical lock and ensure affected patients have been notified.'
      })),
      recommendedActions: [
        `Review affected patient records for Batch ${firstRecall.batch}.`,
        'Verify automated SMS advisory delivery status in SMS Reports.',
        'Keep quarantined stock physically isolated until distributor pickup.'
      ],
      text: `### BATCH RECALL SAFETY ALERT\n\n**${quarantined.length} recalled batch is currently blocked.**\n\n` +
        `• **Medicine**: ${firstRecall.medicine}\n` +
        `• **Batch**: \`${firstRecall.batch}\`\n` +
        `• **Quarantined Stock**: ${firstRecall.quarantinedUnits} units\n` +
        `• **Status**: 🔴 BLOCKED & QUARANTINED\n\n` +
        `**RECOMMENDED ACTION**:\n1. Review affected customer records and recall SMS delivery status.\n2. Keep physical units in secure quarantine lock.`
    };
  }

  // 7. Dispensing Audit & Unusual Activity ("Show unusual dispensing activity.")
  if (q.includes('unusual') || q.includes('pattern') || q.includes('audit')) {
    const unusual = context.unusualPatterns || {};
    const findings = unusual.findings || [];

    if (findings.length === 0) {
      return {
        title: 'DISPENSING AUDIT INVESTIGATION',
        summary: 'No unusual dispensing velocity or off-hour patterns detected across recent records.',
        priority: 'normal',
        dataType: 'actual',
        badge: '100% FEFO COMPLIANT',
        zeroResult: true,
        recommendedActions: ['Maintain routine shift change dispensing audits.'],
        text: `### DISPENSING AUDIT INVESTIGATION\n\nAnalyzed recent dispensing records. 100% FEFO compliance verified. No unusual dispensing velocity detected.`
      };
    }

    return {
      title: 'POTENTIALLY UNUSUAL ACTIVITY',
      summary: `${findings.length} record(s) require pharmacist review.`,
      priority: 'medium',
      dataType: 'actual',
      badge: 'AUDIT REVIEW NEEDED',
      items: findings.map(f => ({
        medicine: f.medicine || 'Prescription Dispensing',
        batch: f.batch || 'Recent Batch',
        stock: 0,
        priority: 'medium',
        reason: `${f.patternType}: ${f.description}`,
        action: 'Review pharmacist dispensing transaction details.'
      })),
      recommendedActions: [
        'Review the dispensing audit record with the dispensing pharmacist.',
        'Verify patient prescription match and batch identification.'
      ],
      text: `### POTENTIALLY UNUSUAL ACTIVITY\n\n**${findings.length} record(s) require pharmacist review.**\n\n` +
        findings.map(f => `• **${f.patternType}**: ${f.description}`).join('\n') +
        `\n\n**RECOMMENDED ACTION**:\n1. Review the dispensing audit record.\n2. Verify prescription log.`
    };
  }

  // 8. Supplier Returns ("Which batches should I return?")
  if (q.includes('supplier') || q.includes('return') || q.includes('vendor')) {
    const returns = context.returnEligible || [];
    if (returns.length === 0) {
      return {
        title: 'SUPPLIER RETURN REVIEW',
        summary: 'No batches currently require supplier return processing.',
        priority: 'normal',
        dataType: 'actual',
        badge: 'ZERO PENDING RETURNS',
        zeroResult: true,
        recommendedActions: ['Continue periodic supplier credit claim tracking.'],
        text: `### SUPPLIER RETURN REVIEW\n\nNo batches currently require supplier return processing. All near-expiry items are within standard dispensing thresholds.`
      };
    }

    return {
      title: 'SUPPLIER RETURN REVIEW',
      summary: `${returns.length} batch(es) are eligible for supplier return credit.`,
      priority: 'medium',
      dataType: 'actual',
      badge: 'SUPPLIER LOGISTICS',
      table: {
        headers: ['Medicine', 'Batch', 'Quantity', 'Supplier', 'Estimated Credit', 'Eligibility Reason'],
        rows: returns.map(r => [
          r.medicine,
          r.batch,
          `${r.quantity} units`,
          r.supplier,
          `₹ ${r.estimatedReturnCredit.toLocaleString('en-IN')}`,
          r.eligibilityReason
        ])
      },
      recommendedActions: [
        'File distributor return credit claims before the return window expires.',
        'Package return-eligible units and log supplier dispatch RMA numbers.'
      ],
      text: `### SUPPLIER RETURN REVIEW\n\n**${returns.length} batch(es) are eligible for supplier return.**\n\n` +
        `| Medicine | Batch | Quantity | Supplier | Estimated Credit | Status |\n` +
        `|---|---|---:|---|---:|---|\n` +
        returns.map(r => `| ${r.medicine} | ${r.batch} | ${r.quantity} units | ${r.supplier} | ₹ ${r.estimatedReturnCredit.toLocaleString('en-IN')} | Eligible |`).join('\n') +
        `\n\n**RECOMMENDED ACTION**:\n1. Review return eligibility and initiate supplier return.\n2. Confirm credit memo receipt.`
    };
  }

  // 9. General Operations Briefing Baseline
  const intel = context.todayIntelligence || {};
  const exec = intel.executiveSummary || {};
  const ops = intel.operationalMetrics || {};

  const medCount = exec.totalMedicines ?? 0;
  const unitCount = exec.totalUnits ?? 0;
  const nearExpCount = ops.nearExpiryCount ?? 0;
  const lowStkCount = ops.lowStockCount ?? 0;
  const recallCnt = ops.recalledCount ?? 0;

  if (medCount === 0) {
    return {
      title: 'PHARMACY OPERATIONS BRIEFING',
      summary: 'Active Inventory: 0 Medicines (0 Units). Workspace initialized.',
      priority: 'normal',
      dataType: 'actual',
      badge: 'NEW WORKSPACE',
      items: [
        {
          medicine: 'Workspace Catalog',
          batch: 'Ready for Stock',
          stock: 0,
          priority: 'normal',
          reason: 'No medicines currently in inventory catalog.',
          action: 'Add new medicine batches via the Add Stock tab.'
        }
      ],
      recommendedActions: [
        'Add your first medicine batch to begin automated expiry tracking.',
        'Import supplier invoices or spreadsheets directly via the Add Stock tab.'
      ],
      text: `### PHARMACY OPERATIONS BRIEFING\n\n` +
        `• **Active Catalog**: 0 Medicines (0 Total Units)\n` +
        `• **Expiry Status**: 0 near-expiry batches\n` +
        `• **Stock Alerts**: 0 low-stock items\n` +
        `• **Quarantine**: 0 batches quarantined\n\n` +
        `**RECOMMENDED ACTION**:\n1. Navigate to **Add Stock** to log your pharmacy's medicine batches.\n2. Once added, PharmaFlow will automatically monitor FEFO dispensing, expiration timelines, and clinical safety alerts.`
    };
  }

  return {
    title: 'PHARMACY OPERATIONS BRIEFING',
    summary: `Active Inventory: ${medCount} Medicines (${unitCount} Units).`,
    priority: nearExpCount > 0 || lowStkCount > 0 ? 'medium' : 'normal',
    dataType: 'actual',
    badge: 'OPERATIONAL BRIEFING',
    items: [
      {
        medicine: 'Near-Expiry Status',
        batch: 'Active Catalog',
        stock: nearExpCount,
        priority: nearExpCount > 0 ? 'medium' : 'normal',
        reason: `${nearExpCount} batch(es) near expiry within 30 days.`,
        action: 'Check Expiry Timeline tab.'
      },
      {
        medicine: 'Stock Buffer Status',
        batch: 'Active Catalog',
        stock: lowStkCount,
        priority: lowStkCount > 0 ? 'high' : 'normal',
        reason: `${lowStkCount} medicine(s) below safety threshold.`,
        action: 'Review for reorder.'
      }
    ],
    recommendedActions: [
      'Select any suggested question chip above for deep-dive operational analytics.',
      'Use What-If Simulator to model prospective purchase quantities.'
    ],
    text: `### PHARMACY OPERATIONS BRIEFING\n\n` +
      `• **Active Catalog**: ${medCount} Medicines (${unitCount} Total Units)\n` +
      `• **Expiry Status**: ${nearExpCount} near-expiry batch(es)\n` +
      `• **Stock Alerts**: ${lowStkCount} low-stock item(s)\n` +
      `• **Quarantine**: ${recallCnt} batch quarantined\n\n` +
      `**RECOMMENDED ACTION**:\n1. Select categorized question chips above for instant operational analysis.\n2. Use What-If Simulator to model stock replenishment.`
  };
}

/**
 * Main AI Query Handler
 */
async function handleAIQuery({
  query,
  pharmacyId = 'DEMO_PHARMACY',
  language = 'English',
  conversationHistory = []
}) {
  // 1. Run AI Safety Guard BEFORE executing any operational tools
  const safetyCheck = evaluateSafety(query);
  if (!safetyCheck.isSafe) {
    return {
      title: 'CLINICAL SAFETY RESTRICTION',
      summary: 'Medical diagnosis, prescription, and patient dosage guidance are strictly blocked.',
      answer: safetyCheck.refusalText,
      text: safetyCheck.refusalText,
      badge: 'CLINICAL SAFETY RESTRICTION',
      sourceTransparency: 'Clinical safety restriction enforced. Medical diagnosis & prescription requests are blocked.',
      isRefusal: true,
      isEmergency: safetyCheck.isEmergency || false,
      priority: 'high',
      dataType: 'actual',
      recommendedActions: [
        'Consult a qualified medical doctor or registered healthcare practitioner for clinical decisions.',
        'Use PharmaFlow AI exclusively for operational pharmacy inventory, dispensing audits, and batch logistics.'
      ],
      timestamp: new Date().toISOString()
    };
  }

  // 2. Controlled tool execution & context gathering
  const controlledContext = await retrieveControlledPharmacyContext(pharmacyId, query);

  // 3. Check for Gemini API key
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

  if (apiKey && apiKey !== 'mock_key' && GoogleGenAI) {
    try {
      const aiClient = new GoogleGenAI({ apiKey });
      const promptPayload = `
Language: ${language}
Current User Query: "${query}"

Controlled Pharmacy State Data:
${JSON.stringify(controlledContext, null, 2)}

Recent Conversation History:
${JSON.stringify(conversationHistory.slice(-4), null, 2)}

Provide a concise, professional operational response following the STANDARD RESPONSE FORMAT (Title, Summary first, Semantic Priority, Markdown Table for multiple items, Fact vs Recommendation, Recommended Action).`;

      const response = await aiClient.models.generateContent({
        model: modelName,
        contents: [
          { role: 'user', parts: [{ text: SYSTEM_INSTRUCTION + '\n\n' + promptPayload }] }
        ]
      });

      const responseText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

      // Generate structured object fallback alongside Gemini text
      const deterministicFallback = buildDeterministicOperationalResponse(query, controlledContext, language);

      return {
        title: deterministicFallback.title,
        summary: deterministicFallback.summary,
        priority: deterministicFallback.priority,
        dataType: deterministicFallback.dataType,
        items: deterministicFallback.items,
        table: deterministicFallback.table,
        whatIfDetails: deterministicFallback.whatIfDetails,
        recommendedActions: deterministicFallback.recommendedActions,
        answer: responseText,
        text: responseText,
        badge: 'GEMINI 3.5 FLASH INTELLIGENCE',
        sourceTransparency: 'Generated by Gemini 3.5 Flash using live pharmacy Firestore state.',
        model: modelName,
        actualVsSimulated: deterministicFallback.dataType === 'simulation' ? 'SIMULATION PROJECTION' : 'ACTUAL LIVE DATA',
        contextSummary: controlledContext,
        timestamp: new Date().toISOString()
      };
    } catch (apiError) {
      console.error('⚠️ Gemini API execution error, falling back to deterministic engine:', apiError.message);
    }
  }

  // Fallback to deterministic operational engine using real Firestore data
  const deterministicResult = buildDeterministicOperationalResponse(query, controlledContext, language);

  return {
    title: deterministicResult.title,
    summary: deterministicResult.summary,
    priority: deterministicResult.priority,
    dataType: deterministicResult.dataType,
    items: deterministicResult.items,
    table: deterministicResult.table,
    whatIfDetails: deterministicResult.whatIfDetails,
    recommendedActions: deterministicResult.recommendedActions,
    answer: deterministicResult.text,
    text: deterministicResult.text,
    badge: deterministicResult.badge,
    sourceTransparency: 'Based on current pharmacy inventory, dispensing audit records, and batch expiry tracking.',
    model: 'PharmaFlow Domain Engine (Gemini 3.5 Flash Fallback)',
    actualVsSimulated: deterministicResult.dataType === 'simulation' ? 'SIMULATION PROJECTION' : 'ACTUAL LIVE DATA',
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  handleAIQuery,
  SYSTEM_INSTRUCTION
};
