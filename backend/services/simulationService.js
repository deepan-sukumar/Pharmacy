/**
 * What-If Expiry & Inventory Risk Simulation Engine for PharmaFlow
 * 
 * CORE PURPOSE:
 * "Based on the pharmacy's actual stock, expiry date and dispensing history,
 * will this medicine/batch be consumed before it expires, and what happens if future demand changes?"
 * 
 * CRITICAL ARCHITECTURAL RULES:
 * 1. PROJECTION SANDBOX: Calculations are deterministic numerical models executed server-side.
 * 2. READ-ONLY GUARANTEE: Simulations MUST NEVER modify actual inventory or audit logs in Firestore.
 * 3. EXPLICIT SEPARATION: Distinguishes ACTUAL CURRENT DATA vs SIMULATED PROJECTIONS.
 * 4. DYNAMIC DATES: Uses real current date dynamically (never hardcoded dates or fixed day counts).
 * 5. DATA-DRIVEN VELOCITY: Derives daily demand from real historical dispensing records per pharmacyId.
 * 6. TENANT ISOLATION: Strict isolation by pharmacyId.
 */

const { parseExpiryToDays } = require('./pharmacyTools');
const { db, isConnected } = require('../firebase');

// In-memory fallback reference when Firestore credentials are not available
let memoryStoreRef = null;
function setMemoryStore(store) {
  memoryStoreRef = store;
}

/**
 * Parses and formats an expiry string into a clean date and days-remaining count from the REAL current date.
 */
function resolveDynamicExpiry(expiryStr) {
  const daysToExpiry = parseExpiryToDays(expiryStr);
  
  let label = 'Adequate';
  if (daysToExpiry <= 0) {
    label = 'Expired';
  } else if (daysToExpiry === 0) {
    label = 'Expires Today';
  } else if (daysToExpiry === 1) {
    label = '1 Day Remaining';
  } else if (daysToExpiry <= 10) {
    label = `${daysToExpiry} Days Remaining (Critical)`;
  } else if (daysToExpiry <= 30) {
    label = `${daysToExpiry} Days Remaining (Near Expiry)`;
  } else {
    label = `${daysToExpiry} Days Remaining`;
  }

  return {
    daysToExpiry,
    expiryStatusLabel: label,
    isExpired: daysToExpiry <= 0,
    isNearExpiry: daysToExpiry > 0 && daysToExpiry <= 30,
    isCritical: daysToExpiry > 0 && daysToExpiry <= 10
  };
}

/**
 * Formats an integer day offset from today into an Indian standard calendar date string.
 */
function getFutureCalendarDate(daysFromNow) {
  if (daysFromNow === null || daysFromNow === undefined || isNaN(daysFromNow)) return null;
  const d = new Date();
  d.setDate(d.getDate() + Math.round(daysFromNow));
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Calculates a single What-If scenario projection deterministically.
 */
function calculateScenario(params) {
  const medicine = params.medicine || 'Selected Medicine';
  const batch = params.batch || params.batchId || 'Default Batch';
  const currentStock = Math.max(0, Number(params.currentStock) || 0);
  const orderQty = Math.max(0, Number(params.orderQty) || 0);
  const baseDailyUsage = Math.max(0, Number(params.dailyUsage) || 0);
  const daysToExpiry = Number(params.daysToExpiry) !== undefined ? Number(params.daysToExpiry) : 45;
  const leadTimeDays = Math.max(0, Number(params.leadTimeDays) || 0);
  const unitCost = Math.max(0, Number(params.unitCost) || 50);
  const holdBatch = Boolean(params.holdBatch);
  
  // Support both demandChangePct and dispensingIncreasePct for backwards-compatibility
  const demandChangePct = params.demandChangePct !== undefined
    ? Number(params.demandChangePct)
    : (Number(params.dispensingIncreasePct) || 0);
  const dispensingIncreasePct = demandChangePct;

  // 1. Calculate effective simulated daily demand
  // If batch is held/quarantined, simulated dispensing rate for this batch is 0
  const demandMultiplier = 1 + (demandChangePct / 100);
  const simulatedDailyDemand = holdBatch ? 0 : Math.max(0, baseDailyUsage * demandMultiplier);

  // 2. BASELINE CONSUMPTION & EXPIRY PROJECTION (Actual Current Stock without proposed order or scenario changes)
  const baselineUsableDays = Math.max(0, daysToExpiry);
  const baselineExpectedConsumption = Math.round(baseDailyUsage * baselineUsableDays);
  const baselineProjectedUsableConsumption = Math.min(currentStock, baselineExpectedConsumption);
  const baselineProjectedSurplus = Math.max(0, currentStock - baselineExpectedConsumption);
  const baselineCapitalAtRisk = baselineProjectedSurplus * unitCost;
  const baselineShortage = Math.max(0, baselineExpectedConsumption - currentStock);
  const baselineStockoutDays = (baseDailyUsage > 0 && currentStock < baselineExpectedConsumption)
    ? Math.floor(currentStock / baseDailyUsage)
    : null;
  const baselineStockoutDate = baselineStockoutDays !== null ? getFutureCalendarDate(baselineStockoutDays) : null;

  // Baseline Risk Classification
  let baselineRiskLevel = 'Low Risk';
  let baselineRiskLabel = 'Low Risk';
  let baselineExplanation = '';

  if (daysToExpiry <= 0) {
    baselineRiskLevel = 'Expired';
    baselineRiskLabel = 'Batch Expired';
    baselineExplanation = `Batch has passed its expiration date with ${currentStock} units remaining unsold. Immediate quarantine required.`;
  } else if (baselineProjectedSurplus > currentStock * 0.5 && baselineProjectedSurplus >= 30) {
    baselineRiskLevel = 'Likely Expiry';
    baselineRiskLabel = 'Likely Expiry (Substantial Wastage)';
    baselineExplanation = `At current dispensing velocity (${baseDailyUsage.toFixed(1)}/day), ${baselineExpectedConsumption} of ${currentStock} units will be consumed over ${daysToExpiry} days, leaving ${baselineProjectedSurplus} units (₹ ${baselineCapitalAtRisk.toLocaleString('en-IN')}) to expire unused.`;
  } else if (baselineProjectedSurplus > currentStock * 0.2 || baselineProjectedSurplus >= 15) {
    baselineRiskLevel = 'High';
    baselineRiskLabel = 'High Expiry Risk';
    baselineExplanation = `Dispensing velocity of ${baseDailyUsage.toFixed(1)} units/day is insufficient to consume all ${currentStock} units within ${daysToExpiry} days. ${baselineProjectedSurplus} units (₹ ${baselineCapitalAtRisk.toLocaleString('en-IN')}) projected to expire unused.`;
  } else if (baselineProjectedSurplus > 0 || (daysToExpiry <= 15 && currentStock > baselineExpectedConsumption * 0.8)) {
    baselineRiskLevel = 'Medium';
    baselineRiskLabel = 'Moderate Risk';
    baselineExplanation = `Moderate surplus of ${baselineProjectedSurplus} units (₹ ${baselineCapitalAtRisk.toLocaleString('en-IN')}) projected at expiry date under current velocity.`;
  } else if (baselineShortage > 0) {
    baselineRiskLevel = 'Shortage';
    baselineRiskLabel = 'Stockout Risk';
    baselineExplanation = `Projected demand (${baselineExpectedConsumption} units) will deplete current stock (${currentStock} units) in ~${baselineStockoutDays} days (est. ${baselineStockoutDate}), prior to batch expiry.`;
  } else {
    baselineRiskLevel = 'Safe';
    baselineRiskLabel = 'Low Risk';
    baselineExplanation = `Current stock (${currentStock} units) is projected to be fully consumed within ~${Math.min(daysToExpiry, baseDailyUsage > 0 ? Math.floor(currentStock / baseDailyUsage) : daysToExpiry)} days, well before the batch expiry date.`;
  }

  // 3. WHAT-IF SCENARIO PROJECTION (Current Stock + Proposed Order Quantity under modified parameters)
  const projectedTotalStock = currentStock + orderQty;
  // Lead time delay reduces the usable consumption window for incoming orders
  const effectiveWindowDays = Math.max(0, daysToExpiry - leadTimeDays);
  const projectedDemandInWindow = Math.round(simulatedDailyDemand * effectiveWindowDays);
  
  // Projected surplus unsold at batch expiration date
  const projectedSurplusAtExpiry = Math.max(0, projectedTotalStock - projectedDemandInWindow);
  // Potential stockout shortage if demand exceeds available stock
  const potentialShortage = Math.max(0, projectedDemandInWindow - projectedTotalStock);

  // Financial calculations based on actual Unit Purchase Cost
  const capitalAtRisk = projectedSurplusAtExpiry * unitCost;
  const stockoutExposure = potentialShortage * unitCost;
  
  // Stock utilization percentage
  const projectedConsumptionActual = Math.min(projectedTotalStock, projectedDemandInWindow);
  const stockUtilizationPct = projectedTotalStock > 0
    ? Math.min(100, Math.round((projectedConsumptionActual / projectedTotalStock) * 100))
    : 100;

  // Stockout estimate in days & exact date
  const daysUntilStockout = simulatedDailyDemand > 0
    ? Math.floor(projectedTotalStock / simulatedDailyDemand)
    : 999;
  const estimatedStockoutDate = (simulatedDailyDemand > 0 && projectedTotalStock < projectedDemandInWindow)
    ? getFutureCalendarDate(daysUntilStockout)
    : null;

  // 4. SCENARIO RISK CATEGORIZATION & OPERATIONAL DECISION SUPPORT
  let riskLevel = 'Safe';
  let riskLabel = 'Low Risk';
  let explanation = '';
  let recommendation = '';

  if (daysToExpiry <= 0) {
    riskLevel = 'Expired';
    riskLabel = 'Batch Expired';
    explanation = `Batch has expired with ${currentStock} units remaining unsold in inventory.`;
    recommendation = `⚠️ Quarantine remaining ${currentStock} units immediately and process supplier return. Do not dispense.`;
  } else if (holdBatch) {
    riskLevel = 'High';
    riskLabel = 'High Expiry Risk (Batch Held)';
    explanation = `Batch is placed under quarantine hold, reducing dispensing velocity to 0 units/day. All ${projectedTotalStock} units will remain in storage until expiry.`;
    recommendation = `⚠️ Holding this batch stops dispensing velocity. All ${projectedTotalStock} units (₹ ${capitalAtRisk.toLocaleString('en-IN')}) are projected to expire unused unless cleared for dispensing or returned.`;
  } else if (projectedSurplusAtExpiry > projectedTotalStock * 0.5 && projectedSurplusAtExpiry >= 30) {
    riskLevel = 'High';
    riskLabel = 'Likely Expiry (Substantial Wastage)';
    const optimalOrder = Math.max(0, projectedDemandInWindow - currentStock);
    explanation = `At simulated demand of ${simulatedDailyDemand.toFixed(1)} units/day, expected consumption across the remaining ${effectiveWindowDays} days is ${projectedDemandInWindow} units. With total available stock of ${projectedTotalStock} units, ${projectedSurplusAtExpiry} units (₹ ${capitalAtRisk.toLocaleString('en-IN')}) will remain unsold at expiry.`;
    recommendation = `🔴 Substantial Expiry Risk: Projected surplus of ${projectedSurplusAtExpiry} units (₹ ${capitalAtRisk.toLocaleString('en-IN')}). ${orderQty > 0 ? `Cancel/reduce proposed reorder to ~${optimalOrder} units.` : 'Prioritize front-of-shelf FEFO dispensing immediately.'}`;
  } else if (projectedSurplusAtExpiry > projectedTotalStock * 0.25 || projectedSurplusAtExpiry > 50) {
    riskLevel = 'High';
    riskLabel = 'High Projected Expiry Risk';
    const optimalOrder = Math.max(0, projectedDemandInWindow - currentStock);
    explanation = `At simulated demand of ${simulatedDailyDemand.toFixed(1)} units/day, expected consumption across ${effectiveWindowDays} usable days is ${projectedDemandInWindow} units. Total stock of ${projectedTotalStock} units creates a surplus of ${projectedSurplusAtExpiry} units.`;
    recommendation = `⚠️ High Expiry Risk: Projected surplus of ${projectedSurplusAtExpiry} units (₹ ${capitalAtRisk.toLocaleString('en-IN')}) expiring unsold. ${orderQty > 0 ? `Reduce proposed reorder to ~${optimalOrder} units.` : 'Maintain strict FEFO dispensing priority.'}`;
  } else if (projectedSurplusAtExpiry > 0) {
    riskLevel = 'Medium';
    riskLabel = 'Moderate Projected Surplus';
    explanation = `Minor surplus of ${projectedSurplusAtExpiry} units (₹ ${capitalAtRisk.toLocaleString('en-IN')}) projected at expiry date under simulated velocity (${simulatedDailyDemand.toFixed(1)}/day).`;
    recommendation = `⚠️ Moderate Surplus: Projected surplus of ${projectedSurplusAtExpiry} units at expiry (₹ ${capitalAtRisk.toLocaleString('en-IN')}). Maintain strict FEFO dispensing priority.`;
  } else if (potentialShortage > 0) {
    riskLevel = 'Shortage';
    riskLabel = 'Potential Shortage';
    explanation = `Projected demand (${projectedDemandInWindow} units) exceeds stock (${projectedTotalStock} units). Stockout expected in ~${daysUntilStockout} days (est. ${estimatedStockoutDate}), prior to batch expiry.`;
    recommendation = `📦 Shortage Warning: Projected demand (${projectedDemandInWindow} units) exceeds stock (${projectedTotalStock} units). Projected shortage of ${potentialShortage} units before batch expiry. Consider reordering +${potentialShortage} units.`;
  } else {
    riskLevel = 'Safe';
    riskLabel = 'Optimal Balance';
    explanation = `Simulated demand of ${simulatedDailyDemand.toFixed(1)} units/day will fully consume available stock (${projectedTotalStock} units) in ~${Math.min(daysToExpiry, daysUntilStockout)} days, prior to the batch expiry date.`;
    recommendation = `✅ Optimal Scenario: ${projectedTotalStock} units are projected to be fully consumed within ~${Math.min(daysToExpiry, daysUntilStockout)} days prior to expiry date. Zero capital at risk.`;
  }

  return {
    medicine,
    batch,
    actualData: {
      currentStock,
      unitCost,
      dailyUsage: baseDailyUsage,
      daysToExpiry,
      baselineExpectedConsumption,
      baselineProjectedUsableConsumption,
      baselineProjectedSurplus,
      baselineCapitalAtRisk,
      baselineShortage,
      baselineStockoutDays,
      baselineStockoutDate,
      baselineRiskLevel,
      baselineRiskLabel,
      baselineExplanation,
    },
    simulatedData: {
      orderQty,
      leadTimeDays,
      holdBatch,
      demandChangePct,
      dispensingIncreasePct,
      simulatedDailyDemand,
      projectedTotalStock,
      effectiveWindowDays,
      projectedDemandInWindow,
      projectedConsumptionActual,
      projectedSurplusAtExpiry,
      potentialShortage,
      capitalAtRisk,
      potentialWasteCost: capitalAtRisk,
      stockoutExposure,
      daysUntilStockout,
      estimatedStockoutDate,
      stockUtilizationPct,
      riskLevel,
      riskLabel,
      explanation,
      recommendation,
    }
  };
}

/**
 * Runs a multi-scenario comparison matrix: Baseline (+0) vs +100 vs +300 vs +500
 */
function compareOrderScenarios(baseParams) {
  const increments = [0, 100, 300, 500];
  const scenarios = increments.map(qty => {
    const res = calculateScenario({
      ...baseParams,
      orderQty: qty
    });
    return {
      orderIncrement: qty,
      projectedStock: res.simulatedData.projectedTotalStock,
      expectedConsumption: res.simulatedData.projectedDemandInWindow,
      projectedSurplus: res.simulatedData.projectedSurplusAtExpiry,
      surplusAtExpiry: res.simulatedData.projectedSurplusAtExpiry,
      potentialShortage: res.simulatedData.potentialShortage,
      capitalAtRisk: res.simulatedData.capitalAtRisk,
      wasteCost: res.simulatedData.capitalAtRisk,
      utilizationPct: res.simulatedData.stockUtilizationPct,
      riskLevel: res.simulatedData.riskLevel,
      riskLabel: res.simulatedData.riskLabel,
      recommendation: res.simulatedData.recommendation
    };
  });

  return {
    medicine: baseParams.medicine || 'Selected Medicine',
    batch: baseParams.batch || 'Default Batch',
    currentStock: baseParams.currentStock,
    dailyUsage: baseParams.dailyUsage,
    daysToExpiry: baseParams.daysToExpiry,
    unitCost: baseParams.unitCost,
    comparisonMatrix: scenarios
  };
}

/**
 * Resolves live pharmacy inventory & dispensing audit data from Firestore
 * to calculate factual baselines and run the What-If simulation.
 */
async function runWhatIfSimulation(pharmacyId = 'DEMO_PHARMACY', parameters = {}) {
  let stock = Number(parameters.currentStock);
  let cost = Number(parameters.unitCost);
  let days = Number(parameters.daysToExpiry);
  let medicineName = parameters.medicine ? String(parameters.medicine).trim() : '';
  let batchCode = parameters.batch ? String(parameters.batch).trim() : (parameters.batchId ? String(parameters.batchId).trim() : '');
  let dailyUsage = Number(parameters.dailyUsage);
  let demandProvenance = '';
  let hasSufficientData = false;
  let confidence = 'Moderate';
  let multiBatchBreakdown = [];

  // 1. Retrieve inventory items for this specific pharmacy tenant
  let inventoryItems = [];
  if (isConnected()) {
    const snap = await db.collection('inventory').where('pharmacyId', '==', pharmacyId).get();
    inventoryItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } else if (memoryStoreRef && Array.isArray(memoryStoreRef.inventory)) {
    inventoryItems = memoryStoreRef.inventory.filter(i => i.pharmacyId === pharmacyId);
  }

  // Find matching inventory record(s)
  if (inventoryItems.length > 0) {
    let matchedItem = null;
    if (batchCode) {
      matchedItem = inventoryItems.find(i => i.batch && i.batch.toUpperCase() === batchCode.toUpperCase());
    }
    if (!matchedItem && medicineName) {
      matchedItem = inventoryItems.find(i => i.medicine && i.medicine.toLowerCase().includes(medicineName.toLowerCase()));
    }

    if (matchedItem) {
      medicineName = matchedItem.medicine || medicineName;
      batchCode = matchedItem.batch || batchCode;
      if (isNaN(stock) || parameters.currentStock === undefined) stock = Number(matchedItem.quantity) || 0;
      if (isNaN(cost) || parameters.unitCost === undefined) cost = Number(matchedItem.unitPrice) || 45;
      if (isNaN(days) || parameters.daysToExpiry === undefined) days = parseExpiryToDays(matchedItem.expiry);

      // Find all sibling batches for FEFO analysis
      const siblingBatches = inventoryItems.filter(i => 
        i.medicine && i.medicine.toLowerCase() === matchedItem.medicine.toLowerCase()
      );

      multiBatchBreakdown = siblingBatches.map(b => {
        const bDays = parseExpiryToDays(b.expiry);
        const bStock = Number(b.quantity) || 0;
        const bCost = Number(b.unitPrice) || cost;
        const bRate = !isNaN(dailyUsage) && dailyUsage > 0 ? dailyUsage : 5;
        const bExpectedDemand = Math.round(bRate * Math.max(0, bDays));
        const bSurplus = Math.max(0, bStock - bExpectedDemand);
        const bCapitalAtRisk = bSurplus * bCost;
        
        let bRisk = 'Safe';
        if (bDays <= 0) bRisk = 'Expired';
        else if (bSurplus > bStock * 0.5 && bSurplus >= 30) bRisk = 'Likely Expiry';
        else if (bSurplus > bStock * 0.25 || bSurplus >= 15) bRisk = 'High';
        else if (bSurplus > 0) bRisk = 'Medium';
        else if (bStock < bExpectedDemand) bRisk = 'Shortage';

        return {
          id: b.id,
          batch: b.batch,
          expiry: b.expiry,
          daysToExpiry: bDays,
          quantity: bStock,
          unitPrice: bCost,
          status: b.status || 'Available',
          projectedConsumption: Math.min(bStock, bExpectedDemand),
          projectedSurplus: bSurplus,
          capitalAtRisk: bCapitalAtRisk,
          riskLevel: bRisk,
          isCurrentSelected: b.batch === matchedItem.batch
        };
      }).sort((a, b) => a.daysToExpiry - b.daysToExpiry); // Sort by FEFO (earliest expiry first)
    }
  }

  // 2. Calculate historical dispensing demand from audits for this tenant
  if (isNaN(dailyUsage) || parameters.dailyUsage === undefined) {
    let audits = [];
    if (isConnected()) {
      const snap = await db.collection('audits').where('pharmacyId', '==', pharmacyId).get();
      audits = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else if (memoryStoreRef && Array.isArray(memoryStoreRef.audits)) {
      audits = memoryStoreRef.audits.filter(a => a.pharmacyId === pharmacyId);
    }

    // Filter audits for this specific medicine / batch, ignoring voided/invalid records
    const matchingAudits = audits.filter(a => {
      if (a.status === 'Cancelled' || a.status === 'Voided') return false;
      if (batchCode && a.batch && a.batch.toUpperCase() === batchCode.toUpperCase()) return true;
      if (medicineName && a.medicine && a.medicine.toLowerCase().includes(medicineName.toLowerCase())) return true;
      return false;
    });

    if (matchingAudits.length > 0) {
      const totalDispensed = matchingAudits.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0);
      
      // Calculate active days span
      const timestamps = matchingAudits
        .map(a => new Date(a.timestamp || a.date).getTime())
        .filter(t => !isNaN(t));
      
      let daySpan = 14; // Default baseline window
      if (timestamps.length >= 2) {
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps, Date.now());
        daySpan = Math.max(1, Math.ceil((maxTime - minTime) / (1000 * 60 * 60 * 24)));
      }
      
      const calculatedRate = Math.max(1, Math.round(totalDispensed / daySpan));
      dailyUsage = calculatedRate;
      hasSufficientData = true;
      confidence = matchingAudits.length >= 5 ? 'High' : 'Moderate';
      demandProvenance = `Calculated from ${totalDispensed} units dispensed across ${matchingAudits.length} prescriptions over ${daySpan} days (~${dailyUsage} units/day)`;
    } else {
      dailyUsage = 5; // Standard fallback
      hasSufficientData = false;
      confidence = 'Low';
      demandProvenance = 'Limited historical dispensing records for this batch in this pharmacy. Using baseline estimate (~5 units/day) with low confidence — adjust demand parameter manually for scenario testing.';
    }
  } else {
    hasSufficientData = true;
    confidence = 'User-Specified';
    demandProvenance = `Pharmacist-specified demand parameter: ${dailyUsage} units/day`;
  }

  const baseParams = {
    medicine: medicineName || 'Selected Medicine',
    batch: batchCode || 'Default Batch',
    currentStock: !isNaN(stock) ? stock : 45,
    orderQty: Number(parameters.orderQty) || 0,
    dailyUsage: dailyUsage,
    leadTimeDays: Number(parameters.leadTimeDays) || 0,
    daysToExpiry: !isNaN(days) ? days : 25,
    unitCost: !isNaN(cost) ? cost : 50,
    holdBatch: Boolean(parameters.holdBatch),
    demandChangePct: parameters.demandChangePct !== undefined
      ? Number(parameters.demandChangePct)
      : (Number(parameters.dispensingIncreasePct) || 0),
    dispensingIncreasePct: parameters.demandChangePct !== undefined
      ? Number(parameters.demandChangePct)
      : (Number(parameters.dispensingIncreasePct) || 0),
  };

  const singleResult = calculateScenario(baseParams);
  const comparison = compareOrderScenarios(baseParams);

  // Suggested optimal AI target order size
  const effectiveWindow = Math.max(0, baseParams.daysToExpiry - baseParams.leadTimeDays);
  const expectedDemandInWindow = Math.round(singleResult.simulatedData.simulatedDailyDemand * effectiveWindow);
  const suggestedAiOrder = Math.max(0, expectedDemandInWindow - baseParams.currentStock);

  return {
    isSimulation: true,
    disclaimer: 'SIMULATION BASED ON LIVE PHARMACY INVENTORY AND HISTORICAL DISPENSING DATA. ACTUAL FIRESTORE INVENTORY REMAINS UNMODIFIED.',
    demandProvenance,
    hasSufficientData,
    confidence,
    suggestedAiOrder,
    multiBatchBreakdown,
    ...singleResult,
    multiScenarioComparison: comparison
  };
}

/**
 * Natural Language Question Interpreter for What-If Simulation
 * Converts free-form pharmacist questions into structured simulation parameters.
 */
function interpretSimulationQuestion(question = '', currentContext = {}) {
  const q = String(question).toLowerCase().trim();
  const params = { ...currentContext };
  let queryType = 'GENERAL_SIMULATION';

  // 1. Detect Demand Shift (e.g. "what if demand drops 30%", "demand increases 20%", "demand down 40%")
  const demandDropMatch = q.match(/(?:demand|dispensing|sales|usage)\s*(?:drops?|decreases?|falls?|down|reduced?|slows?)\s*(?:by)?\s*(\d+)%?/i)
    || q.match(/-\s*(\d+)%?\s*(?:demand|dispensing|sales)/i)
    || q.match(/(?:drop|decrease|reduce)\s*(?:by)?\s*(\d+)%/i);

  const demandSurgeMatch = q.match(/(?:demand|dispensing|sales|usage)\s*(?:increases?|surges?|rises?|up|grows?)\s*(?:by)?\s*(\d+)%?/i)
    || q.match(/\+\s*(\d+)%?\s*(?:demand|dispensing|sales)/i)
    || q.match(/(?:increase|surge|rise)\s*(?:by)?\s*(\d+)%/i);

  if (demandDropMatch) {
    queryType = 'DEMAND_CHANGE';
    params.demandChangePct = -Math.abs(Number(demandDropMatch[1]));
    params.dispensingIncreasePct = params.demandChangePct;
  } else if (demandSurgeMatch) {
    queryType = 'DEMAND_CHANGE';
    params.demandChangePct = Math.abs(Number(demandSurgeMatch[1]));
    params.dispensingIncreasePct = params.demandChangePct;
  }

  // 2. Detect Reorder Quantity (e.g. "what if I reorder 50 units", "reorder 100", "order +50")
  const reorderMatch = q.match(/(?:reorder|order|buy|procure|purchase|add)\s*(?:\+)?\s*(\d+)\s*(?:units?|boxes?|packs?|more)?/i);
  if (reorderMatch) {
    queryType = 'REORDER_CHANGE';
    params.orderQty = Number(reorderMatch[1]);
  }

  // 3. Detect Quarantine / Hold (e.g. "quarantine for 5 days", "what if batch is held", "hold for 3 days")
  if (q.includes('quarantine') || q.includes('hold') || q.includes('block')) {
    queryType = 'QUARANTINE_HOLD';
    params.holdBatch = true;
    const holdDaysMatch = q.match(/(?:quarantine|hold|held|delay)\s*(?:for)?\s*(\d+)\s*days?/i);
    if (holdDaysMatch) {
      params.leadTimeDays = Number(holdDaysMatch[1]);
    }
  }

  // 4. Detect Supplier Lead Time (e.g. "supplier delayed by 5 days", "lead time 4 days")
  const leadTimeMatch = q.match(/(?:lead\s*time|supplier\s*delay|delayed\s*by)\s*(\d+)\s*days?/i);
  if (leadTimeMatch) {
    queryType = 'LEAD_TIME_CHANGE';
    params.leadTimeDays = Number(leadTimeMatch[1]);
  }

  // 5. Expiry Risk / Consumption Queries
  if (q.includes('will this batch expire') || q.includes('will this medicine be fully consumed') || q.includes('will it expire') || q.includes('consumed before expiry') || q.includes('expire before it is used') || q.includes('expire before use')) {
    queryType = 'EXPIRY_CHECK';
  } else if (q.includes('how much') && (q.includes('expire') || q.includes('wastage') || q.includes('units') || q.includes('surplus') || q.includes('could expire'))) {
    queryType = 'EXPIRED_QTY_QUERY';
  } else if (q.includes('how much money') || q.includes('money is at risk') || q.includes('financial impact') || q.includes('capital at risk') || q.includes('cost of expiry') || q.includes('wastage value')) {
    queryType = 'FINANCIAL_RISK_QUERY';
  } else if (q.includes('when will') && (q.includes('run out') || q.includes('stockout') || q.includes('deplete') || q.includes('exhaust'))) {
    queryType = 'STOCKOUT_QUERY';
  } else if (q.includes('which batch') && (q.includes('prioritize') || q.includes('safer') || q.includes('fefo') || q.includes('first') || q.includes('dispense first'))) {
    queryType = 'FEFO_PRIORITY';
  } else if (q.includes('highest') && (q.includes('expiry risk') || q.includes('risk') || q.includes('danger'))) {
    queryType = 'HIGHEST_RISK_BATCH';
  }

  return {
    originalQuestion: question,
    queryType,
    interpretedParameters: params
  };
}

/**
 * Answers a natural-language What-If question by driving the deterministic simulation engine.
 * The AI / pattern interpreter NEVER invents numerical results; it grounds every sentence in the computed simulation.
 */
async function answerSimulationQuestion(pharmacyId = 'DEMO_PHARMACY', payload = {}) {
  const question = payload.question || 'Will this batch expire before it is used?';
  const interpretation = interpretSimulationQuestion(question, payload);

  const simulationParams = {
    ...payload,
    ...interpretation.interpretedParameters,
  };

  // Run authoritative deterministic simulation using real Firestore pharmacy inventory
  const sim = await runWhatIfSimulation(pharmacyId, simulationParams);

  const act = sim.actualData;
  const simData = sim.simulatedData;
  const med = sim.medicine;
  const batch = sim.batch;
  const unitCost = act.unitCost;
  const daysLeft = act.daysToExpiry;

  let directAnswer = '';
  let detailedExplanation = '';
  let operationalRecommendation = simData.recommendation;

  switch (interpretation.queryType) {
    case 'EXPIRY_CHECK':
      if (daysLeft <= 0) {
        directAnswer = `Batch ${batch} of ${med} has already passed its expiration date with ${act.currentStock} units in inventory.`;
        detailedExplanation = `The batch expired with ${act.currentStock} units remaining unsold (₹ ${(act.currentStock * unitCost).toLocaleString('en-IN')} total capital at risk). Immediate quarantine is required.`;
      } else if (simData.projectedSurplusAtExpiry > 0) {
        directAnswer = `No, approximately ${simData.projectedSurplusAtExpiry} units of ${med} (Batch ${batch}) are projected to remain unused when it expires in ${daysLeft} days.`;
        detailedExplanation = `At the current dispensing velocity of ${act.dailyUsage.toFixed(1)} units/day, only ${simData.projectedDemandInWindow} of ${simData.projectedTotalStock} units are expected to be consumed over the remaining ${simData.effectiveWindowDays} days. Potential expiry wastage value is ₹ ${simData.capitalAtRisk.toLocaleString('en-IN')}.`;
      } else {
        directAnswer = `Yes, Batch ${batch} of ${med} is projected to be fully consumed before its expiry in ${daysLeft} days.`;
        detailedExplanation = `At current dispensing velocity of ${act.dailyUsage.toFixed(1)} units/day, all ${simData.projectedTotalStock} units will be dispensed within approximately ${Math.min(daysLeft, simData.daysUntilStockout)} days. Zero capital is at risk of expiration.`;
      }
      break;

    case 'DEMAND_CHANGE': {
      const pct = simData.demandChangePct;
      const direction = pct >= 0 ? `increased by ${pct}%` : `decreased by ${Math.abs(pct)}%`;
      if (simData.projectedSurplusAtExpiry > 0) {
        directAnswer = `With demand ${direction} (${simData.simulatedDailyDemand.toFixed(1)} units/day), approximately ${simData.projectedSurplusAtExpiry} units are projected to remain when Batch ${batch} expires.`;
        detailedExplanation = `This represents ₹ ${simData.capitalAtRisk.toLocaleString('en-IN')} of potential expiry capital at risk. Risk status shifts from ${act.baselineRiskLabel} to ${simData.riskLabel}.`;
      } else if (simData.potentialShortage > 0) {
        directAnswer = `With demand ${direction} (${simData.simulatedDailyDemand.toFixed(1)} units/day), stock will be fully consumed before expiry, but a shortage of ${simData.potentialShortage} units is expected in ~${simData.daysUntilStockout} days.`;
        detailedExplanation = `Estimated stockout date is ${simData.estimatedStockoutDate}. Stockout revenue exposure is ₹ ${simData.stockoutExposure.toLocaleString('en-IN')}.`;
      } else {
        directAnswer = `With demand ${direction} (${simData.simulatedDailyDemand.toFixed(1)} units/day), all ${simData.projectedTotalStock} units will be safely consumed before expiry.`;
        detailedExplanation = `Stock is projected to be fully utilized with 0 surplus units remaining at expiry.`;
      }
      break;
    }

    case 'EXPIRED_QTY_QUERY':
      if (simData.projectedSurplusAtExpiry > 0) {
        directAnswer = `Approximately ${simData.projectedSurplusAtExpiry} units of ${med} (Batch ${batch}) are projected to expire unused.`;
        detailedExplanation = `Based on a daily dispensing rate of ${simData.simulatedDailyDemand.toFixed(1)} units/day over ${simData.effectiveWindowDays} days, ${simData.projectedDemandInWindow} of ${simData.projectedTotalStock} units will be dispensed, leaving ${simData.projectedSurplusAtExpiry} units at expiration.`;
      } else {
        directAnswer = `0 units are projected to expire unused for Batch ${batch}.`;
        detailedExplanation = `All ${simData.projectedTotalStock} units are expected to be dispensed within ${Math.min(daysLeft, simData.daysUntilStockout)} days, prior to the batch expiry date.`;
      }
      break;

    case 'FINANCIAL_RISK_QUERY':
      directAnswer = `Potential expiry capital at risk is ₹ ${simData.capitalAtRisk.toLocaleString('en-IN')}.`;
      detailedExplanation = `This is calculated from ${simData.projectedSurplusAtExpiry} projected surplus units at unit purchase cost of ₹ ${unitCost}. Separate stockout exposure is ₹ ${simData.stockoutExposure.toLocaleString('en-IN')} (${simData.potentialShortage} units of unsatisfied demand).`;
      break;

    case 'STOCKOUT_QUERY':
      if (simData.potentialShortage > 0) {
        directAnswer = `Stock is projected to run out in ~${simData.daysUntilStockout} days (estimated ${simData.estimatedStockoutDate}), prior to batch expiry.`;
        detailedExplanation = `Projected demand (${simData.projectedDemandInWindow} units) exceeds available stock (${simData.projectedTotalStock} units), resulting in a potential shortage of ${simData.potentialShortage} units.`;
      } else {
        directAnswer = `Stock is not projected to run out before expiry.`;
        detailedExplanation = `Available stock (${simData.projectedTotalStock} units) is sufficient to meet projected demand (${simData.projectedDemandInWindow} units) through the entire remaining ${simData.effectiveWindowDays} days.`;
      }
      break;

    case 'FEFO_PRIORITY':
    case 'HIGHEST_RISK_BATCH': {
      const batches = sim.multiBatchBreakdown || [];
      if (batches.length > 1) {
        const primary = batches[0];
        const highestRisk = [...batches].sort((a, b) => (b.capitalAtRisk || 0) - (a.capitalAtRisk || 0))[0];
        directAnswer = `Under FEFO (First-Expired, First-Out), Batch ${primary.batch} should be prioritized for immediate dispensing.`;
        detailedExplanation = `Batch ${primary.batch} expires first (${primary.expiry}, ${primary.daysToExpiry} days left, ${primary.quantity} units). Highest expiry capital at risk is Batch ${highestRisk.batch} (₹ ${(highestRisk.capitalAtRisk || 0).toLocaleString('en-IN')}).`;
        operationalRecommendation = `Ensure Batch ${primary.batch} is positioned at the front of dispensing shelves.`;
      } else {
        directAnswer = `Batch ${batch} is currently the primary active batch for ${med}.`;
        detailedExplanation = `It has ${act.currentStock} units in stock with ${daysLeft} days remaining until expiry.`;
      }
      break;
    }

    case 'QUARANTINE_HOLD':
      directAnswer = `Quarantining Batch ${batch} stops active dispensing (0 units/day).`;
      detailedExplanation = `With dispensing velocity halted, all ${simData.projectedTotalStock} units (₹ ${simData.capitalAtRisk.toLocaleString('en-IN')}) will remain in storage until expiry in ${daysLeft} days unless the hold is lifted or stock is returned to supplier.`;
      break;

    case 'REORDER_CHANGE':
      directAnswer = `Adding +${simData.orderQty} units brings total stock to ${simData.projectedTotalStock} units.`;
      detailedExplanation = `Projected consumption is ${simData.projectedDemandInWindow} units across ${simData.effectiveWindowDays} days. Resulting surplus at expiry is ${simData.projectedSurplusAtExpiry} units (₹ ${simData.capitalAtRisk.toLocaleString('en-IN')} capital at risk).`;
      break;

    default:
      directAnswer = `Based on current dispensing velocity of ${act.dailyUsage.toFixed(1)} units/day, ${simData.projectedSurplusAtExpiry > 0 ? `${simData.projectedSurplusAtExpiry} units are projected to remain at expiry.` : 'stock is projected to be fully consumed before expiry.'}`;
      detailedExplanation = `Available stock: ${simData.projectedTotalStock} units. Projected consumption: ${simData.projectedDemandInWindow} units over ${simData.effectiveWindowDays} days. Potential expiry capital at risk: ₹ ${simData.capitalAtRisk.toLocaleString('en-IN')}.`;
      break;
  }

  return {
    question,
    queryType: interpretation.queryType,
    interpretedParameters: interpretation.interpretedParameters,
    directAnswer,
    detailedExplanation,
    recommendation: operationalRecommendation,
    answer: `${directAnswer} ${detailedExplanation}`,
    text: `${directAnswer}\n\n${detailedExplanation}\n\n**RECOMMENDATION**: ${operationalRecommendation}`,
    simulation: sim
  };
}

module.exports = {
  calculateScenario,
  compareOrderScenarios,
  runWhatIfSimulation,
  setMemoryStore,
  resolveDynamicExpiry,
  interpretSimulationQuestion,
  answerSimulationQuestion
};


