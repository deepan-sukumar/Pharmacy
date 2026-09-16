/**
 * What-If Expiry / Inventory Simulation Engine for PharmaFlow
 * 
 * CORE PURPOSE:
 * "Use live pharmacy inventory and dispensing data to simulate hypothetical stock decisions
 * BEFORE making any real change, and predict expiry/wastage and financial impact."
 * 
 * CRITICAL RULES:
 * 1. PROJECTION SANDBOX: Calculations are deterministic numerical models executed server-side.
 * 2. MUST NEVER modify actual inventory during simulations.
 * 3. Distinguishes ACTUAL CURRENT DATA vs SIMULATED PROJECTIONS.
 * 4. Uses real current date dynamically (never hardcoded).
 * 5. Uses real historical dispensing records to derive daily demand.
 */

const { getBatchDetails, getMedicineDetails, getInventorySummary, getDispensingHistory, parseExpiryToDays } = require('./pharmacyTools');
const { db, isConnected } = require('../firebase');

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
  const dispensingIncreasePct = Number(params.dispensingIncreasePct) || 0;

  // 1. Calculate effective simulated daily demand
  // If batch is held, simulated dispensing rate for this batch is 0
  const demandMultiplier = 1 + (dispensingIncreasePct / 100);
  const simulatedDailyDemand = holdBatch ? 0 : Math.max(0, baseDailyUsage * demandMultiplier);

  // 2. Baseline Consumption & Expiry Risk (Current Stock Only, without proposed order)
  const baselineUsableDays = Math.max(0, daysToExpiry);
  const baselineExpectedConsumption = Math.round(simulatedDailyDemand * baselineUsableDays);
  const baselineProjectedUsableConsumption = Math.min(currentStock, baselineExpectedConsumption);
  const baselineProjectedSurplus = Math.max(0, currentStock - baselineExpectedConsumption);
  const baselineCapitalAtRisk = baselineProjectedSurplus * unitCost;
  const baselineShortage = Math.max(0, baselineExpectedConsumption - currentStock);

  // 3. What-If Scenario Projection (Current Stock + Proposed Order Quantity)
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

  // Stockout estimate in days
  const daysUntilStockout = simulatedDailyDemand > 0
    ? Math.floor(projectedTotalStock / simulatedDailyDemand)
    : 999;

  // 4. Expiry & Wastage Risk Categorization
  let riskLevel = 'Safe';
  let riskLabel = 'Optimal / Low Risk';
  let recommendation = '';

  if (daysToExpiry <= 0) {
    riskLevel = 'Expired';
    riskLabel = 'Expired Batch';
    recommendation = `⚠️ Batch has already expired. Quarantine remaining ${currentStock} units immediately and process supplier return.`;
  } else if (holdBatch) {
    riskLevel = 'High';
    riskLabel = 'High Expiry Risk (Batch Held)';
    recommendation = `⚠️ Holding this batch stops dispensing velocity. All ${projectedTotalStock} units (₹ ${capitalAtRisk.toLocaleString('en-IN')}) are projected to expire unsold.`;
  } else if (projectedSurplusAtExpiry > projectedTotalStock * 0.25 || projectedSurplusAtExpiry > 50) {
    riskLevel = 'High';
    riskLabel = 'High Projected Expiry Risk';
    const optimalOrder = Math.max(0, projectedDemandInWindow - currentStock);
    recommendation = `⚠️ High Expiry Risk: Ordering +${orderQty} units creates a projected surplus of ${projectedSurplusAtExpiry} units (₹ ${capitalAtRisk.toLocaleString('en-IN')}) expiring unsold. Reduce proposed reorder to ~${optimalOrder} units.`;
  } else if (projectedSurplusAtExpiry > 0) {
    riskLevel = 'Medium';
    riskLabel = 'Moderate Projected Surplus';
    recommendation = `⚠️ Moderate Surplus: Projected surplus of ${projectedSurplusAtExpiry} units at expiry (₹ ${capitalAtRisk.toLocaleString('en-IN')}). Maintain strict FEFO dispensing priority.`;
  } else if (potentialShortage > 0) {
    riskLevel = 'Shortage';
    riskLabel = 'Potential Shortage';
    recommendation = `📦 Shortage Warning: Projected demand (${projectedDemandInWindow} units) exceeds stock (${projectedTotalStock} units). Projected shortage of ${potentialShortage} units before batch expiry.`;
  } else {
    riskLevel = 'Safe';
    riskLabel = 'Optimal Balance';
    recommendation = `✅ Optimal Scenario: ${projectedTotalStock} units are projected to be fully consumed within ~${Math.min(daysToExpiry, daysUntilStockout)} days prior to expiry date.`;
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
    },
    simulatedData: {
      orderQty,
      leadTimeDays,
      holdBatch,
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
      stockUtilizationPct,
      riskLevel,
      riskLabel,
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
  let multiBatchBreakdown = [];

  // If a specific medicine or batch is specified, pull from live Firestore / memory
  let inventoryItems = [];
  if (isConnected()) {
    const snap = await db.collection('inventory').where('pharmacyId', '==', pharmacyId).get();
    inventoryItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
        return {
          id: b.id,
          batch: b.batch,
          expiry: b.expiry,
          daysToExpiry: bDays,
          quantity: Number(b.quantity) || 0,
          unitPrice: Number(b.unitPrice) || cost,
          status: b.status || 'Available',
          isCurrentSelected: b.batch === matchedItem.batch
        };
      }).sort((a, b) => a.daysToExpiry - b.daysToExpiry); // Sort by FEFO (earliest expiry first)
    }
  }

  // Calculate historical dispensing demand from audits if not explicitly specified
  if (isNaN(dailyUsage) || parameters.dailyUsage === undefined) {
    let audits = [];
    if (isConnected()) {
      const snap = await db.collection('audits').where('pharmacyId', '==', pharmacyId).get();
      audits = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // Filter audits for this medicine / batch
    const matchingAudits = audits.filter(a => {
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
      demandProvenance = `Calculated from ${totalDispensed} units dispensed across ${matchingAudits.length} prescriptions over ${daySpan} days (~${dailyUsage} units/day)`;
    } else {
      dailyUsage = 5; // Standard fallback
      demandProvenance = 'Insufficient historical dispensing records for this batch — using default estimated baseline (5 units/day)';
    }
  } else {
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
    dispensingIncreasePct: Number(parameters.dispensingIncreasePct) || 0,
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
    suggestedAiOrder,
    multiBatchBreakdown,
    ...singleResult,
    multiScenarioComparison: comparison
  };
}

module.exports = {
  calculateScenario,
  compareOrderScenarios,
  runWhatIfSimulation
};
