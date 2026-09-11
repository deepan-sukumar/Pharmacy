/**
 * What-If Expiry / Inventory Simulation Engine for PharmaFlow
 * 
 * CRITICAL RULE:
 * Numerical calculations MUST be executed by backend logic, NOT Gemini.
 * MUST NEVER modify actual inventory records.
 * Distinguishes ACTUAL DATA vs SIMULATED DATA.
 */

const { getBatchDetails, getMedicineDetails, getInventorySummary } = require('./pharmacyTools');

/**
 * Executes a single scenario calculation based on given or resolved parameters.
 */
function calculateScenario(params) {
  const medicine = params.medicine || 'Selected Medicine';
  const currentStock = Math.max(0, Number(params.currentStock) || 0);
  const orderQty = Math.max(0, Number(params.orderQty) || 0);
  const dailyUsage = Math.max(0.1, Number(params.dailyUsage) || 5);
  const daysToExpiry = Math.max(1, Number(params.daysToExpiry) || 45);
  const leadTimeDays = Math.max(0, Number(params.leadTimeDays) || 0);
  const unitCost = Math.max(1, Number(params.unitCost) || 50);

  // Core business computations
  const projectedTotalStock = currentStock + orderQty;
  const effectiveWindowDays = Math.max(0, daysToExpiry - leadTimeDays);
  const projectedDemandInWindow = Math.round(dailyUsage * effectiveWindowDays);
  const projectedSurplusAtExpiry = Math.max(0, projectedTotalStock - projectedDemandInWindow);
  const potentialWasteCost = projectedSurplusAtExpiry * unitCost;
  const daysUntilStockout = dailyUsage > 0 ? Math.floor(projectedTotalStock / dailyUsage) : 999;
  const stockUtilizationPct = Math.min(100, Math.round((projectedDemandInWindow / (projectedTotalStock || 1)) * 100));

  // Risk categorization
  let riskLevel = 'Safe';
  let recommendation = '';

  if (projectedSurplusAtExpiry > projectedTotalStock * 0.25) {
    riskLevel = 'High';
    const optimalOrder = Math.max(0, projectedDemandInWindow - currentStock);
    recommendation = `⚠️ High Expiry Risk: Ordering +${orderQty} units causes a projected surplus of ${projectedSurplusAtExpiry} units (₹ ${potentialWasteCost.toLocaleString('en-IN')}) expiring unsold. Reduce reorder to ~${optimalOrder} units.`;
  } else if (projectedSurplusAtExpiry > 0) {
    riskLevel = 'Medium';
    recommendation = `⚠️ Moderate Surplus: ${projectedSurplusAtExpiry} units may remain at expiry. Maintain close FEFO monitoring.`;
  } else {
    riskLevel = 'Safe';
    recommendation = `✅ Optimal Scenario: ${projectedTotalStock} units will be fully depleted in ~${Math.min(daysToExpiry, daysUntilStockout)} days prior to expiry date.`;
  }

  return {
    medicine,
    actualData: {
      currentStock,
      unitCost,
      dailyUsage,
      daysToExpiry
    },
    simulatedData: {
      orderQty,
      leadTimeDays,
      projectedTotalStock,
      effectiveWindowDays,
      projectedDemandInWindow,
      projectedSurplusAtExpiry,
      potentialWasteCost,
      daysUntilStockout,
      stockUtilizationPct,
      riskLevel,
      recommendation
    }
  };
}

/**
 * Runs a multi-scenario comparison matrix: Current (0) vs +100 vs +300 vs +500
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
      surplusAtExpiry: res.simulatedData.projectedSurplusAtExpiry,
      wasteCost: res.simulatedData.potentialWasteCost,
      utilizationPct: res.simulatedData.stockUtilizationPct,
      riskLevel: res.simulatedData.riskLevel,
      recommendation: res.simulatedData.recommendation
    };
  });

  return {
    medicine: baseParams.medicine || 'Selected Medicine',
    currentStock: baseParams.currentStock,
    dailyUsage: baseParams.dailyUsage,
    daysToExpiry: baseParams.daysToExpiry,
    unitCost: baseParams.unitCost,
    comparisonMatrix: scenarios
  };
}

/**
 * Resolves pharmacy inventory data to run a What-If simulation on actual store state.
 */
async function runWhatIfSimulation(pharmacyId, parameters) {
  let stock = Number(parameters.currentStock);
  let cost = Number(parameters.unitCost);
  let days = Number(parameters.daysToExpiry);
  let medicineName = parameters.medicine || '';

  // If a batch was specified, pull factual numbers from actual inventory
  if (parameters.batchId) {
    const batchData = await getBatchDetails(pharmacyId, parameters.batchId);
    if (batchData) {
      stock = batchData.quantity;
      cost = batchData.unitPrice || 45;
      days = batchData.daysToExpiry;
      medicineName = batchData.medicine;
    }
  }

  const baseParams = {
    medicine: medicineName || 'Prescription Inventory Item',
    currentStock: !isNaN(stock) ? stock : 120,
    orderQty: Number(parameters.orderQty) || 0,
    dailyUsage: Number(parameters.dailyUsage) || 5,
    leadTimeDays: Number(parameters.leadTimeDays) || 0,
    daysToExpiry: !isNaN(days) ? days : 45,
    unitCost: !isNaN(cost) ? cost : 50
  };

  const singleResult = calculateScenario(baseParams);
  const comparison = compareOrderScenarios(baseParams);

  return {
    isSimulation: true,
    disclaimer: 'SIMULATION BASED ON CURRENT INVENTORY AND HISTORICAL DISPENSING DATA. ACTUAL INVENTORY REMAINS UNMODIFIED.',
    ...singleResult,
    multiScenarioComparison: comparison
  };
}

module.exports = {
  calculateScenario,
  compareOrderScenarios,
  runWhatIfSimulation
};
