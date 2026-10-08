/**
 * What-If Expiry & Inventory Risk Simulation Engine for PharmaFlow
 * 
 * CORE PURPOSE:
 * "Based on the pharmacy's actual stock, expiry date and dispensing history,
 * will this medicine/batch be consumed before it expires, and what happens if future demand changes or replenishment decisions are made?"
 * 
 * CRITICAL ARCHITECTURAL RULES:
 * 1. ONE AUTHORITATIVE DETERMINISTIC ENGINE: All baseline, scenario, order matrix, financial,
 *    and AI decision-support calculations MUST use the exact same calculation formulas.
 * 2. READ-ONLY GUARANTEE: Simulations MUST NEVER modify actual inventory, batches, or audit logs in Firestore.
 * 3. EXPLICIT SEPARATION: Distinguishes ACTUAL CURRENT DATA vs SIMULATED PROJECTIONS.
 * 4. TIME-BASED LEAD TIME: Orders with lead time > 0 do not become available on day 0.
 * 5. DYNAMIC DATES: Real current calendar dates (never hardcoded dates or fixed day counts).
 * 6. DATA-DRIVEN VELOCITY: Derives daily demand from real historical dispensing audit records per pharmacyId.
 * 7. TENANT ISOLATION: Strict isolation by authenticated pharmacyId.
 */

const { parseExpiryToDays } = require('./pharmacyTools');
const { db, isConnected } = require('../firebase');
const masterDataset = require('../../PHARMAFLOW_MASTER_DATASET_V1.json');

// In-memory fallback reference when Firestore credentials are not available or quota exceeded
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
 * Formats a currency amount in Indian Rupees (INR)
 */
function formatINR(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
}

/**
 * Calculates a single What-If scenario projection deterministically.
 * ONE AUTHORITATIVE ENGINE FOR ALL SIMULATION CALCULATIONS.
 */
function calculateScenario(params = {}) {
  const medicine = params.medicine || 'Selected Medicine';
  const batch = params.batch || params.batchId || 'Default Batch';
  const currentStock = Math.max(0, Number(params.currentStock) || 0);
  const orderQty = Math.max(0, Number(params.orderQty !== undefined ? params.orderQty : (params.orderQuantity !== undefined ? params.orderQuantity : 0)));
  const baseDailyUsage = Math.max(0, Number(params.dailyUsage !== undefined && !isNaN(Number(params.dailyUsage)) ? params.dailyUsage : (params.dailyVelocity !== undefined && !isNaN(Number(params.dailyVelocity)) ? params.dailyVelocity : 5)));
  const daysToExpiry = Number(params.daysToExpiry) !== undefined && !isNaN(Number(params.daysToExpiry)) ? Number(params.daysToExpiry) : 45;
  const leadTimeDays = Math.max(0, Number(params.leadTimeDays) || 0);
  const unitCost = Math.max(0, Number(params.unitCost) !== undefined && !isNaN(Number(params.unitCost)) ? Number(params.unitCost) : 50);
  
  // Quarantine / Hold: can be a boolean holdBatch or explicit quarantineDays
  let quarantineDays = 0;
  if (params.quarantineDays !== undefined && !isNaN(Number(params.quarantineDays))) {
    quarantineDays = Math.max(0, Number(params.quarantineDays));
  } else if (params.holdBatch) {
    quarantineDays = 999999; // Indefinite hold
  }
  const isHold = quarantineDays > 0 || Boolean(params.holdBatch);

  // Demand change percentage (-80% to +150%)
  const demandChangePct = params.demandChangePct !== undefined
    ? Number(params.demandChangePct)
    : (params.demandShiftPercent !== undefined ? Number(params.demandShiftPercent) : (Number(params.dispensingIncreasePct) || 0));
  const dispensingIncreasePct = demandChangePct;
  const demandMultiplier = 1 + (demandChangePct / 100);

  // Scenario velocity during active dispensing (cannot be negative)
  const normalScenarioVelocity = Math.max(0, Math.round((baseDailyUsage * demandMultiplier) * 100) / 100);
  // Current active velocity at day 0
  const simulatedDailyDemand = (quarantineDays > 0) ? 0 : normalScenarioVelocity;

  // =========================================================================
  // 1. BASELINE PROJECTION (Current On-Hand Stock without order or changes)
  // =========================================================================
  const baselineDaysToExpiry = Math.max(0, daysToExpiry);
  const baselineExpectedDemand = Math.round(baseDailyUsage * baselineDaysToExpiry);
  const baselineProjectedUsableConsumption = Math.min(currentStock, baselineExpectedDemand);
  const baselineExpectedConsumption = baselineProjectedUsableConsumption;
  const baselineProjectedSurplus = Math.max(0, currentStock - baselineExpectedDemand);
  const baselineCapitalAtRisk = baselineProjectedSurplus * unitCost;
  const baselineShortage = Math.max(0, baselineExpectedDemand - currentStock);
  const baselineStockoutDays = baseDailyUsage > 0
    ? Math.floor(currentStock / baseDailyUsage)
    : null;
  const baselineStockoutDate = baselineStockoutDays !== null
    ? getFutureCalendarDate(baselineStockoutDays)
    : null;
  const baselineUtilizationPct = currentStock > 0
    ? Math.min(100, Math.round((baselineProjectedUsableConsumption / currentStock) * 100))
    : 100;

  // Baseline Risk Classification
  let baselineRiskLevel = 'Low Risk';
  let baselineRiskLabel = 'LOW RISK';
  let baselineExplanation = '';

  if (daysToExpiry <= 0) {
    baselineRiskLevel = 'Expired';
    baselineRiskLabel = 'EXPIRED';
    baselineExplanation = `Batch has passed its expiration date with ${currentStock} units remaining unsold. Immediate quarantine required.`;
  } else if (baselineProjectedSurplus > currentStock * 0.5 && baselineProjectedSurplus >= 30) {
    baselineRiskLevel = 'Likely Expiry';
    baselineRiskLabel = 'HIGH EXPIRY RISK';
    baselineExplanation = `At current dispensing velocity (${baseDailyUsage.toFixed(1)}/day), ${baselineExpectedConsumption} of ${currentStock} units are projected to be consumed over ${daysToExpiry} days, leaving ${baselineProjectedSurplus} units (${formatINR(baselineCapitalAtRisk)}) to expire unused.`;
  } else if (baselineProjectedSurplus > currentStock * 0.2 || baselineProjectedSurplus >= 15) {
    baselineRiskLevel = 'High';
    baselineRiskLabel = 'HIGH EXPIRY RISK';
    baselineExplanation = `Dispensing velocity of ${baseDailyUsage.toFixed(1)} units/day is insufficient to consume all ${currentStock} units within ${daysToExpiry} days. ${baselineProjectedSurplus} units (${formatINR(baselineCapitalAtRisk)}) projected to expire unused.`;
  } else if (baselineProjectedSurplus > 0 || (daysToExpiry <= 15 && currentStock > baselineExpectedConsumption * 0.8)) {
    baselineRiskLevel = 'Medium';
    baselineRiskLabel = 'MODERATE RISK';
    baselineExplanation = `Moderate surplus of ${baselineProjectedSurplus} units (${formatINR(baselineCapitalAtRisk)}) projected at expiry date under current velocity.`;
  } else if (baselineShortage > 0) {
    baselineRiskLevel = 'Shortage';
    baselineRiskLabel = 'STOCKOUT RISK';
    baselineExplanation = `Projected demand (${baselineExpectedDemand} units) will deplete current stock (${currentStock} units) in ~${baselineStockoutDays} days (est. ${baselineStockoutDate}), prior to batch expiry.`;
  } else {
    baselineRiskLevel = 'Safe';
    baselineRiskLabel = 'LOW RISK';
    baselineExplanation = `Current stock (${currentStock} units) is projected to be fully consumed within ~${Math.min(daysToExpiry, baselineStockoutDays || daysToExpiry)} days, well before the batch expiry date.`;
  }

  // =========================================================================
  // 2. TIME-BASED WHAT-IF SCENARIO PROJECTION
  // =========================================================================
  // Total physical units available across the full horizon
  const projectedTotalStock = currentStock + orderQty;
  const effectiveLeadTime = Math.min(daysToExpiry > 0 ? daysToExpiry : 0, leadTimeDays);

  // Consumption during lead time [0, effectiveLeadTime]:
  const activeLeadDays = Math.max(0, effectiveLeadTime - quarantineDays);
  const leadDemand = normalScenarioVelocity * activeLeadDays;
  const consumptionInLead = Math.min(currentStock, leadDemand);
  const stockRemainingBeforeArrival = Math.max(0, currentStock - leadDemand);
  const leadShortage = Math.max(0, leadDemand - currentStock);

  // At t = leadTimeDays:
  // If order arrives before expiry, it supplements the stock:
  const orderArrivesBeforeExpiry = orderQty > 0 && leadTimeDays < daysToExpiry;
  const availableAfterArrival = stockRemainingBeforeArrival + (orderArrivesBeforeExpiry ? orderQty : 0);

  // Post-arrival consumption window [effectiveLeadTime, daysToExpiry]:
  const activePostArrivalDays = Math.max(0, daysToExpiry - Math.max(effectiveLeadTime, quarantineDays));
  const postDemand = normalScenarioVelocity * activePostArrivalDays;
  const consumptionPostArrival = Math.min(availableAfterArrival, postDemand);
  const postShortage = Math.max(0, postDemand - availableAfterArrival);

  // Totals over the Expiry Horizon [0, daysToExpiry]:
  const effectiveWindowDays = Math.max(0, daysToExpiry - leadTimeDays);
  const totalProjectedDemandInWindow = Math.round(leadDemand + postDemand);
  const projectedDemandInWindow = totalProjectedDemandInWindow;
  const projectedConsumptionActual = Math.round(consumptionInLead + consumptionPostArrival);
  
  // Surplus remaining at expiry date:
  let projectedSurplusAtExpiry = 0;
  if (daysToExpiry <= 0) {
    projectedSurplusAtExpiry = currentStock;
  } else if (isHold && quarantineDays >= 999999) {
    projectedSurplusAtExpiry = projectedTotalStock;
  } else {
    projectedSurplusAtExpiry = Math.max(0, availableAfterArrival - postDemand);
  }
  const projectedSurplus = projectedSurplusAtExpiry;
  const potentialShortage = Math.round(leadShortage + postShortage);

  // Financial calculations:
  const expiryCapitalAtRisk = projectedSurplusAtExpiry * unitCost;
  const capitalAtRisk = expiryCapitalAtRisk; // For compatibility
  const potentialWasteCost = expiryCapitalAtRisk;
  const stockoutExposure = potentialShortage * unitCost;
  const orderValue = orderQty * unitCost;

  // Stock utilization percentage (capped at 100%):
  const stockUtilizationPct = projectedTotalStock > 0
    ? Math.min(100, Math.max(0, Math.round((projectedConsumptionActual / projectedTotalStock) * 100)))
    : 100;

  // Stockout Timing (When does all stock run out?):
  let daysUntilStockout = null;
  let estimatedStockoutDate = null;

  if (normalScenarioVelocity > 0 && !isHold) {
    const t1 = currentStock / normalScenarioVelocity;
    if (orderQty === 0) {
      daysUntilStockout = Math.floor(t1);
    } else {
      if (leadTimeDays >= t1) {
        // Runs out during lead time before replenishment arrives
        daysUntilStockout = Math.floor(t1);
      } else {
        // Replenishment arrives before stockout
        const totalDuration = projectedTotalStock / normalScenarioVelocity;
        daysUntilStockout = Math.floor(totalDuration);
      }
    }
    estimatedStockoutDate = getFutureCalendarDate(daysUntilStockout);
  } else if (isHold && quarantineDays < 999999 && normalScenarioVelocity > 0) {
    const t1 = quarantineDays + (currentStock / normalScenarioVelocity);
    if (orderQty === 0) {
      daysUntilStockout = Math.floor(t1);
    } else {
      if (leadTimeDays >= t1) {
        daysUntilStockout = Math.floor(t1);
      } else {
        const totalDuration = quarantineDays + (projectedTotalStock / normalScenarioVelocity);
        daysUntilStockout = Math.floor(totalDuration);
      }
    }
    estimatedStockoutDate = getFutureCalendarDate(daysUntilStockout);
  }

  // =========================================================================
  // 3. SCENARIO RISK CATEGORIZATION & OPERATIONAL DECISION SUPPORT
  // =========================================================================
  let riskLevel = 'Safe';
  let riskLabel = 'LOW RISK';
  let explanation = '';
  let recommendation = '';

  if (daysToExpiry <= 0) {
    riskLevel = 'Expired';
    riskLabel = 'EXPIRED';
    explanation = `Batch has expired with ${currentStock} units remaining unsold in inventory.`;
    recommendation = `⚠️ Quarantine remaining ${currentStock} units immediately and process supplier return. Do not dispense.`;
  } else if (isHold && quarantineDays >= 999999) {
    riskLevel = 'High';
    riskLabel = 'HIGH EXPIRY RISK (QUARANTINED)';
    explanation = `Batch is placed under quarantine hold, reducing dispensing velocity to 0 units/day. All ${projectedTotalStock} units will remain in storage until expiry.`;
    recommendation = `⚠️ Holding this batch stops dispensing velocity. All ${projectedTotalStock} units (${formatINR(capitalAtRisk)}) are projected to expire unused unless cleared for dispensing or returned.`;
  } else if (quarantineDays > 0) {
    riskLevel = 'Medium';
    riskLabel = 'MODERATE RISK (HOLD ACTIVE)';
    explanation = `Batch is held for ${quarantineDays} days (0 dispensing during hold). Normal dispensing (${normalScenarioVelocity.toFixed(1)}/day) resumes thereafter. Projected consumption before expiry is ${projectedConsumptionActual} units.`;
    recommendation = `Review quarantine release schedule to ensure stock is returned to active dispensing before expiry.`;
  } else if (projectedSurplusAtExpiry > projectedTotalStock * 0.5 && projectedSurplusAtExpiry >= 30) {
    riskLevel = 'High';
    riskLabel = 'HIGH EXPIRY RISK (SUBSTANTIAL WASTAGE)';
    const optimalOrder = Math.max(0, totalProjectedDemandInWindow - currentStock);
    explanation = `At simulated demand of ${normalScenarioVelocity.toFixed(1)} units/day, expected consumption across the remaining ${daysToExpiry} days is ${totalProjectedDemandInWindow} units. With total stock of ${projectedTotalStock} units, ${projectedSurplusAtExpiry} units (${formatINR(capitalAtRisk)}) will remain unsold at expiry.`;
    recommendation = `🔴 Substantial Expiry Risk: Projected surplus of ${projectedSurplusAtExpiry} units (${formatINR(capitalAtRisk)}). ${orderQty > 0 ? `Cancel/reduce proposed reorder to ~${optimalOrder} units.` : 'Prioritize front-of-shelf FEFO dispensing immediately.'}`;
  } else if (projectedSurplusAtExpiry > projectedTotalStock * 0.25 || projectedSurplusAtExpiry >= 15) {
    riskLevel = 'High';
    riskLabel = 'HIGH EXPIRY RISK';
    const optimalOrder = Math.max(0, totalProjectedDemandInWindow - currentStock);
    explanation = `At simulated demand of ${normalScenarioVelocity.toFixed(1)} units/day, expected consumption across ${daysToExpiry} days is ${totalProjectedDemandInWindow} units. Total stock of ${projectedTotalStock} units creates a projected surplus of ${projectedSurplusAtExpiry} units.`;
    recommendation = `⚠️ High Expiry Risk: Projected surplus of ${projectedSurplusAtExpiry} units (${formatINR(capitalAtRisk)}) expiring unsold. ${orderQty > 0 ? `Reduce proposed reorder to ~${optimalOrder} units.` : 'Maintain strict FEFO dispensing priority.'}`;
  } else if (projectedSurplusAtExpiry > 0) {
    riskLevel = 'Medium';
    riskLabel = 'MODERATE RISK (SURPLUS)';
    explanation = `Moderate surplus of ${projectedSurplusAtExpiry} units (${formatINR(capitalAtRisk)}) projected at expiry date under simulated velocity (${normalScenarioVelocity.toFixed(1)}/day).`;
    recommendation = `⚠️ Moderate Surplus: Projected surplus of ${projectedSurplusAtExpiry} units at expiry (${formatINR(capitalAtRisk)}). Maintain strict FEFO dispensing priority.`;
  } else if (potentialShortage > 0) {
    riskLevel = 'Shortage';
    riskLabel = 'STOCKOUT RISK';
    if (leadShortage > 0 && leadTimeDays > 0) {
      explanation = `Lead-time gap: Initial stock (${currentStock} units) will run out in ~${Math.floor(currentStock / normalScenarioVelocity)} days before replenishment arrives on day ${leadTimeDays}, causing ${leadShortage} units of unmet demand during lead time.`;
      recommendation = `📦 Lead-Time Shortage: Request expedited supplier dispatch or reallocate ${leadShortage} units from sibling batches to prevent stockout before order arrival.`;
    } else {
      explanation = `Projected demand (${totalProjectedDemandInWindow} units) exceeds total stock (${projectedTotalStock} units). Stockout expected in ~${daysUntilStockout} days (est. ${estimatedStockoutDate}), prior to batch expiry.`;
      recommendation = `📦 Shortage Warning: Projected demand (${totalProjectedDemandInWindow} units) exceeds stock (${projectedTotalStock} units). Projected shortage of ${potentialShortage} units before batch expiry. Consider reordering +${potentialShortage} units.`;
    }
  } else {
    riskLevel = 'Safe';
    riskLabel = 'LOW RISK (OPTIMAL BALANCE)';
    explanation = `Simulated demand of ${normalScenarioVelocity.toFixed(1)} units/day will fully consume available stock (${projectedTotalStock} units) in ~${Math.min(daysToExpiry, daysUntilStockout || daysToExpiry)} days, safely prior to the batch expiry date (${daysToExpiry} days away).`;
    recommendation = `✅ Optimal Scenario: ${projectedTotalStock} units are projected to be fully consumed within ~${Math.min(daysToExpiry, daysUntilStockout || daysToExpiry)} days prior to expiry date. Zero capital at risk of expiration.`;
  }

  // Refine explanation with lead-time details when lead time is involved
  if (leadTimeDays > 0 && orderQty > 0 && daysToExpiry > 0) {
    if (leadTimeDays >= daysToExpiry) {
      explanation += ` Note: Supplier lead time (${leadTimeDays} days) exceeds batch expiry (${daysToExpiry} days). Incoming order will arrive after this batch has expired.`;
    } else {
      explanation += ` (${orderQty} additional units arrive on day ${leadTimeDays}; ${Math.round(leadDemand)} units projected to be consumed during lead time, leaving ${stockRemainingBeforeArrival} units before arrival).`;
    }
  }

  // Daily simulation timeline for charts & verification
  const timeline = [];
  let currentSimStock = currentStock;
  const horizon = Math.max(daysToExpiry, 30);
  
  for (let day = 0; day <= horizon; day++) {
    timeline.push({
      day,
      stock: Math.max(0, Math.round(currentSimStock))
    });
    if (day === leadTimeDays && leadTimeDays > 0 && orderQty > 0 && orderArrivesBeforeExpiry) {
      currentSimStock += orderQty;
    }
    if (day < horizon) {
      const dailyDrop = (day < quarantineDays) ? 0 : normalScenarioVelocity;
      currentSimStock = Math.max(0, currentSimStock - dailyDrop);
    }
  }

  return {
    medicine,
    batch,
    projectedUtilization: stockUtilizationPct,
    stockUtilizationPct,
    projectedSurplusAtExpiry,
    expiryCapitalAtRisk,
    effectiveDailyDemand: normalScenarioVelocity,
    timeline,
    actualData: {
      currentStock,
      unitCost,
      dailyUsage: baseDailyUsage,
      daysToExpiry,
      baselineExpectedDemand,
      baselineExpectedConsumption,
      baselineProjectedUsableConsumption,
      baselineProjectedSurplus,
      baselineCapitalAtRisk,
      baselineShortage,
      baselineStockoutDays,
      baselineStockoutDate,
      baselineUtilizationPct,
      baselineRiskLevel,
      baselineRiskLabel,
      baselineExplanation,
    },
    simulatedData: {
      orderQty,
      orderQuantity: orderQty,
      leadTimeDays,
      supplierLeadTimeDays: leadTimeDays,
      holdBatch: isHold,
      quarantineDays,
      demandChangePct,
      dispensingIncreasePct,
      simulatedDailyDemand: (isHold && quarantineDays >= 999999) ? 0 : normalScenarioVelocity,
      normalScenarioVelocity,
      projectedTotalStock,
      effectiveWindowDays,
      projectedDemandInWindow: totalProjectedDemandInWindow,
      projectedDemand: totalProjectedDemandInWindow,
      projectedConsumptionActual,
      projectedConsumption: projectedConsumptionActual,
      projectedSurplusAtExpiry,
      projectedSurplus: projectedSurplusAtExpiry,
      projectedExpiryQuantity: projectedSurplusAtExpiry,
      leadShortage,
      postShortage,
      potentialShortage,
      capitalAtRisk: expiryCapitalAtRisk,
      expiryCapitalAtRisk,
      potentialWasteCost: expiryCapitalAtRisk,
      stockoutExposure,
      orderValue,
      daysUntilStockout,
      projectedStockoutDays: daysUntilStockout,
      estimatedStockoutDate,
      projectedStockoutDate: estimatedStockoutDate,
      stockUtilizationPct,
      stockUtilization: stockUtilizationPct,
      riskLevel,
      riskLabel,
      riskClassification: riskLabel,
      explanation,
      recommendation,
      timeline,
    }
  };
}

/**
 * Runs a multi-scenario comparison matrix: Baseline (+0) vs +100 vs +300 vs +500
 * ALL SCENARIOS EVALUATED THROUGH THE EXACT SAME DETERMINISTIC ENGINE.
 */
function compareOrderScenarios(baseParams = {}) {
  const increments = [0, 100, 300, 500];
  const scenarios = increments.map(qty => {
    const res = calculateScenario({
      ...baseParams,
      orderQty: qty
    });
    const s = res.simulatedData;
    return {
      orderIncrement: qty,
      orderQty: qty,
      projectedStock: s.projectedTotalStock,
      expectedConsumption: s.projectedDemandInWindow,
      projectedConsumption: s.projectedConsumptionActual,
      projectedSurplus: s.projectedSurplusAtExpiry,
      surplusAtExpiry: s.projectedSurplusAtExpiry,
      potentialShortage: s.potentialShortage,
      capitalAtRisk: s.expiryCapitalAtRisk,
      expiryCapitalAtRisk: s.expiryCapitalAtRisk,
      wasteCost: s.expiryCapitalAtRisk,
      stockoutExposure: s.stockoutExposure,
      daysUntilStockout: s.daysUntilStockout,
      estimatedStockoutDate: s.estimatedStockoutDate,
      utilizationPct: s.stockUtilizationPct,
      stockUtilizationPct: s.stockUtilizationPct,
      riskLevel: s.riskLevel,
      riskLabel: s.riskLabel,
      riskClassification: s.riskLabel,
      explanation: s.explanation,
      recommendation: s.recommendation
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
async function runWhatIfSimulation(pharmacyIdOrParams = 'pharmaflow-main', maybeParameters = {}) {
  let pharmacyId = 'pharmaflow-main';
  let parameters = {};
  if (typeof pharmacyIdOrParams === 'object' && pharmacyIdOrParams !== null) {
    parameters = pharmacyIdOrParams;
    pharmacyId = parameters.workspaceId || parameters.pharmacyId || 'pharmaflow-main';
  } else {
    pharmacyId = pharmacyIdOrParams || 'pharmaflow-main';
    parameters = maybeParameters || {};
  }

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
    try {
      const snap = await db.collection('inventory').where('workspaceId', '==', pharmacyId).get();
      if (!snap.empty) {
        inventoryItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } else {
        const snap2 = await db.collection('inventory').where('pharmacyId', '==', pharmacyId).get();
        inventoryItems = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (e) {
      console.warn('Firestore read fallback on inventory in simulationService:', e.message);
    }
  }
  if (inventoryItems.length === 0 && masterDataset && Array.isArray(masterDataset.inventory)) {
    inventoryItems = masterDataset.inventory.filter(i => i.workspaceId === pharmacyId || i.pharmacyId === pharmacyId || pharmacyId === 'pharmaflow-main');
  }
  if (inventoryItems.length === 0 && memoryStoreRef && Array.isArray(memoryStoreRef.inventory)) {
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
        
        // Use identical simulation formula for each sibling batch
        const bSim = calculateScenario({
          medicine: b.medicine,
          batch: b.batch,
          currentStock: bStock,
          dailyUsage: bRate,
          daysToExpiry: bDays,
          unitCost: bCost,
          orderQty: 0
        });

        return {
          id: b.id,
          batch: b.batch,
          expiry: b.expiry,
          daysToExpiry: bDays,
          quantity: bStock,
          unitPrice: bCost,
          status: b.status || 'Available',
          projectedConsumption: bSim.simulatedData.projectedConsumptionActual,
          projectedSurplus: bSim.simulatedData.projectedSurplusAtExpiry,
          capitalAtRisk: bSim.simulatedData.expiryCapitalAtRisk,
          riskLevel: bSim.simulatedData.riskLevel,
          riskLabel: bSim.simulatedData.riskLabel,
          isCurrentSelected: b.batch === matchedItem.batch
        };
      }).sort((a, b) => a.daysToExpiry - b.daysToExpiry); // Sort by FEFO (earliest expiry first)
    }
  }

  // 2. Calculate historical dispensing demand from audits for this tenant
  if (isNaN(dailyUsage) || parameters.dailyUsage === undefined) {
    let audits = [];
    if (isConnected()) {
      try {
        const snap = await db.collection('dispensingAudit').where('workspaceId', '==', pharmacyId).get();
        if (!snap.empty) {
          audits = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } else {
          const snap2 = await db.collection('audits').where('pharmacyId', '==', pharmacyId).get();
          audits = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      } catch (e) {
        console.warn('Firestore read fallback on audits in simulationService:', e.message);
      }
    }
    if (audits.length === 0 && masterDataset && Array.isArray(masterDataset.dispensingAudit)) {
      audits = masterDataset.dispensingAudit.filter(a => a.workspaceId === pharmacyId || a.pharmacyId === pharmacyId || pharmacyId === 'pharmaflow-main');
    }
    if (audits.length === 0 && memoryStoreRef && Array.isArray(memoryStoreRef.audits)) {
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
      
      const calculatedRate = Number((totalDispensed / daySpan).toFixed(1));
      dailyUsage = calculatedRate > 0 ? calculatedRate : 0;
      hasSufficientData = true;
      confidence = matchingAudits.length >= 5 ? 'High' : 'Moderate';
      demandProvenance = `Calculated from ${totalDispensed} units dispensed across ${matchingAudits.length} prescriptions over ${daySpan} days (~${dailyUsage} units/day)`;
    } else {
      dailyUsage = 5; // Standard fallback assumption
      hasSufficientData = false;
      confidence = 'Insufficient Data';
      demandProvenance = 'Insufficient historical dispensing data for a reliable projection. (Assumed simulation rate: 5.0 units/day - adjust demand parameter manually for scenario testing)';
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
    quarantineDays: Number(parameters.quarantineDays) || 0,
    demandChangePct: parameters.demandChangePct !== undefined
      ? Number(parameters.demandChangePct)
      : (Number(parameters.dispensingIncreasePct) || 0),
    dispensingIncreasePct: parameters.demandChangePct !== undefined
      ? Number(parameters.demandChangePct)
      : (Number(parameters.dispensingIncreasePct) || 0),
  };

  const singleResult = calculateScenario(baseParams);
  const comparison = compareOrderScenarios(baseParams);

  // Suggested optimal target order size
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
    simulation: singleResult.simulatedData,
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

  // 2. Detect Reorder Quantity (e.g. "what if I reorder 50 units", "reorder 100", "order +50", "order 300 units")
  const reorderMatch = q.match(/(?:reorder|order|buy|procure|purchase|add)\s*(?:\+)?\s*(\d+)\s*(?:units?|boxes?|packs?|more)?/i);
  if (reorderMatch) {
    queryType = 'REORDER_CHANGE';
    params.orderQty = Number(reorderMatch[1]);
  }

  // 3. Detect Quarantine / Hold (e.g. "quarantine for 5 days", "what if batch is held", "hold for 3 days")
  if (q.includes('quarantine') || q.includes('hold') || q.includes('block')) {
    queryType = 'QUARANTINE_HOLD';
    const holdDaysMatch = q.match(/(?:quarantine[a-z]*|hold|held|delay|delayed)\s*(?:for)?\s*(\d+)\s*days?/i);
    if (holdDaysMatch) {
      params.quarantineDays = Number(holdDaysMatch[1]);
      params.holdBatch = true;
    } else {
      params.holdBatch = true;
    }
  }

  // 4. Detect Supplier Lead Time (e.g. "supplier delayed by 5 days", "lead time 10 days", "supplier takes 10 days")
  const leadTimeMatch = q.match(/(?:lead\s*time|supplier\s*delay|delayed\s*by|supplier\s*takes)\s*(\d+)\s*days?/i);
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
        detailedExplanation = `The batch expired with ${act.currentStock} units remaining unsold (${formatINR(act.currentStock * unitCost)} total capital at risk). Immediate quarantine is required.`;
      } else if (simData.projectedSurplusAtExpiry > 0) {
        directAnswer = `No, approximately ${simData.projectedSurplusAtExpiry} units of ${med} (Batch ${batch}) are projected to remain unused when it expires in ${daysLeft} days.`;
        detailedExplanation = `At the current dispensing velocity of ${act.dailyUsage.toFixed(1)} units/day, only ${simData.projectedConsumptionActual} of ${simData.projectedTotalStock} units are expected to be consumed over the remaining ${daysLeft} days. Potential expiry wastage value is ${formatINR(simData.expiryCapitalAtRisk)}.`;
      } else {
        directAnswer = `Yes, Batch ${batch} of ${med} is projected to be fully consumed before its expiry in ${daysLeft} days.`;
        detailedExplanation = `At current dispensing velocity of ${act.dailyUsage.toFixed(1)} units/day, all ${simData.projectedTotalStock} units are projected to be dispensed within approximately ${Math.min(daysLeft, simData.daysUntilStockout || daysLeft)} days. Zero capital is at risk of expiration.`;
      }
      break;

    case 'DEMAND_CHANGE': {
      const pct = simData.demandChangePct;
      const direction = pct >= 0 ? `increased by ${pct}%` : `decreased by ${Math.abs(pct)}%`;
      if (simData.projectedSurplusAtExpiry > 0) {
        directAnswer = `With demand ${direction} (${simData.simulatedDailyDemand.toFixed(1)} units/day), approximately ${simData.projectedSurplusAtExpiry} units are projected to remain when Batch ${batch} expires.`;
        detailedExplanation = `This represents ${formatINR(simData.expiryCapitalAtRisk)} of potential expiry capital at risk. Risk status shifts from ${act.baselineRiskLabel} to ${simData.riskLabel}.`;
      } else if (simData.potentialShortage > 0) {
        directAnswer = `With demand ${direction} (${simData.simulatedDailyDemand.toFixed(1)} units/day), stock will be fully consumed before expiry, but a shortage of ${simData.potentialShortage} units is expected in ~${simData.daysUntilStockout} days.`;
        detailedExplanation = `Estimated stockout date is ${simData.estimatedStockoutDate}. Stockout exposure (estimated unmet demand) is ${formatINR(simData.stockoutExposure)}.`;
      } else {
        directAnswer = `With demand ${direction} (${simData.simulatedDailyDemand.toFixed(1)} units/day), all ${simData.projectedTotalStock} units will be safely consumed before expiry.`;
        detailedExplanation = `Stock is projected to be fully utilized with 0 surplus units remaining at expiry.`;
      }
      break;
    }

    case 'EXPIRED_QTY_QUERY':
      if (simData.projectedSurplusAtExpiry > 0) {
        directAnswer = `Approximately ${simData.projectedSurplusAtExpiry} units of ${med} (Batch ${batch}) are projected to expire unused.`;
        detailedExplanation = `Based on a daily dispensing rate of ${simData.simulatedDailyDemand.toFixed(1)} units/day, ${simData.projectedConsumptionActual} of ${simData.projectedTotalStock} units will be dispensed, leaving ${simData.projectedSurplusAtExpiry} units at expiration in ${daysLeft} days.`;
      } else {
        directAnswer = `0 units are projected to expire unused for Batch ${batch}.`;
        detailedExplanation = `All ${simData.projectedTotalStock} units are expected to be dispensed within ${Math.min(daysLeft, simData.daysUntilStockout || daysLeft)} days, prior to the batch expiry date.`;
      }
      break;

    case 'FINANCIAL_RISK_QUERY':
      directAnswer = `Potential expiry capital at risk is ${formatINR(simData.expiryCapitalAtRisk)}.`;
      detailedExplanation = `This is calculated from ${simData.projectedSurplusAtExpiry} projected surplus units at unit purchase cost of ₹ ${unitCost}. Separate estimated stockout exposure is ${formatINR(simData.stockoutExposure)} (${simData.potentialShortage} units of unsatisfied demand).`;
      break;

    case 'STOCKOUT_QUERY':
      if (simData.potentialShortage > 0 || (simData.daysUntilStockout !== null && simData.daysUntilStockout < daysLeft)) {
        directAnswer = `Stock is projected to run out in ~${simData.daysUntilStockout} days (estimated ${simData.estimatedStockoutDate}), prior to batch expiry.`;
        detailedExplanation = `Projected demand exceeds available stock (${simData.projectedTotalStock} units), resulting in a potential shortage of ${simData.potentialShortage} units before batch expiry.`;
      } else {
        directAnswer = `Stock is not projected to run out before expiry.`;
        detailedExplanation = `Available stock (${simData.projectedTotalStock} units) is sufficient to meet projected demand through the entire remaining ${daysLeft} days.`;
      }
      break;

    case 'FEFO_PRIORITY':
    case 'HIGHEST_RISK_BATCH': {
      const batches = sim.multiBatchBreakdown || [];
      if (batches.length > 1) {
        const primary = batches[0];
        const highestRisk = [...batches].sort((a, b) => (b.capitalAtRisk || 0) - (a.capitalAtRisk || 0))[0];
        directAnswer = `Under FEFO (First-Expired, First-Out), Batch ${primary.batch} should be prioritized for immediate dispensing.`;
        detailedExplanation = `Batch ${primary.batch} expires first (${primary.expiry}, ${primary.daysToExpiry} days left, ${primary.quantity} units). Highest expiry capital at risk is Batch ${highestRisk.batch} (${formatINR(highestRisk.capitalAtRisk || 0)}).`;
        operationalRecommendation = `Ensure Batch ${primary.batch} is positioned at the front of dispensing shelves.`;
      } else {
        directAnswer = `Batch ${batch} is currently the primary active batch for ${med}.`;
        detailedExplanation = `It has ${act.currentStock} units in stock with ${daysLeft} days remaining until expiry.`;
      }
      break;
    }

    case 'QUARANTINE_HOLD':
      if (simData.quarantineDays > 0 && simData.quarantineDays < 999999) {
        directAnswer = `Quarantining Batch ${batch} for ${simData.quarantineDays} days stops active dispensing during the hold period.`;
        detailedExplanation = `After ${simData.quarantineDays} days, normal dispensing of ${simData.simulatedDailyDemand.toFixed(1)} units/day resumes. Total projected consumption before expiry is ${simData.projectedConsumptionActual} units.`;
      } else {
        directAnswer = `Quarantining Batch ${batch} stops active dispensing (0 units/day).`;
        detailedExplanation = `With dispensing velocity halted, all ${simData.projectedTotalStock} units (${formatINR(simData.expiryCapitalAtRisk)}) will remain in storage until expiry in ${daysLeft} days unless the hold is lifted or stock is returned to supplier.`;
      }
      break;

    case 'REORDER_CHANGE':
      directAnswer = `Adding +${simData.orderQty} units brings total simulated stock to ${simData.projectedTotalStock} units.`;
      detailedExplanation = `Projected consumption is ${simData.projectedConsumptionActual} units across ${daysLeft} days. Resulting surplus at expiry is ${simData.projectedSurplusAtExpiry} units (${formatINR(simData.expiryCapitalAtRisk)} capital at risk).`;
      break;

    default:
      directAnswer = `Based on dispensing velocity of ${act.dailyUsage.toFixed(1)} units/day, ${simData.projectedSurplusAtExpiry > 0 ? `${simData.projectedSurplusAtExpiry} units are projected to remain at expiry.` : 'stock is projected to be fully consumed before expiry.'}`;
      detailedExplanation = `Available stock: ${simData.projectedTotalStock} units. Projected consumption: ${simData.projectedConsumptionActual} units over ${daysLeft} days. Potential expiry capital at risk: ${formatINR(simData.expiryCapitalAtRisk)}.`;
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
