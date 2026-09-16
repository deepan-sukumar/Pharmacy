const http = require('http');
const app = require('../index');
const { calculateScenario, compareOrderScenarios, runWhatIfSimulation } = require('../services/simulationService');

function makeRequest(serverPort, path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: serverPort,
      path,
      method,
      headers: {
        'Accept': 'application/json',
        ...(postData ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runSimulatorTests() {
  console.log('\n🧪 Starting PharmaFlow What-If Simulator Automated Verification Tests...\n');
  let passed = 0;
  let total = 0;
  let server;
  const testPort = 5577;

  function assert(condition, desc) {
    total++;
    if (!condition) {
      console.error(`  ❌ [FAIL] ${desc}`);
      throw new Error(`Assertion Failed: ${desc}`);
    } else {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    }
  }

  try {
    server = app.listen(testPort);
    await new Promise(r => setTimeout(r, 600));

    // --- Suite 1: Standard Requirement 24 Baseline & Reorder Calculation ---
    console.log('--- Test Suite 1: Exact Requirement 24 Calculations ---');

    const req24Base = calculateScenario({
      medicine: 'Amoxicillin 500mg',
      batch: 'AMX-TEST',
      currentStock: 45,
      orderQty: 0,
      dailyUsage: 5,
      daysToExpiry: 25,
      unitCost: 95,
      leadTimeDays: 0,
      holdBatch: false,
      dispensingIncreasePct: 0,
    });

    assert(req24Base.actualData.currentStock === 45, 'Baseline Current Stock = 45');
    assert(req24Base.actualData.baselineExpectedConsumption === 125, 'Baseline Expected Consumption = 125 (5 * 25)');
    assert(req24Base.actualData.baselineProjectedUsableConsumption === 45, 'Baseline Projected Usable Consumption = 45 (min of stock and demand)');
    assert(req24Base.actualData.baselineProjectedSurplus === 0, 'Baseline Projected Surplus = 0');
    assert(req24Base.actualData.baselineCapitalAtRisk === 0, 'Baseline Capital at Risk = ₹0');

    // Requirement 24: +300 order
    const req24Order300 = calculateScenario({
      medicine: 'Amoxicillin 500mg',
      batch: 'AMX-TEST',
      currentStock: 45,
      orderQty: 300,
      dailyUsage: 5,
      daysToExpiry: 25,
      unitCost: 95,
      leadTimeDays: 0,
      holdBatch: false,
      dispensingIncreasePct: 0,
    });

    assert(req24Order300.simulatedData.projectedTotalStock === 345, '+300 Order: Projected Stock = 345 (45 + 300)');
    assert(req24Order300.simulatedData.projectedDemandInWindow === 125, '+300 Order: Expected Consumption = 125');
    assert(req24Order300.simulatedData.projectedSurplusAtExpiry === 220, '+300 Order: Projected Surplus = 220 (345 - 125)');
    assert(req24Order300.simulatedData.capitalAtRisk === 20900, '+300 Order: Capital at Risk = ₹20,900 (220 * 95)');
    assert(req24Order300.simulatedData.stockUtilizationPct === 36, '+300 Order: Utilization = 36% (125 / 345 * 100)');
    assert(req24Order300.simulatedData.riskLevel === 'High', '+300 Order: High Expiry Risk flagged');

    // --- Suite 2: Multi-Scenario Comparison Matrix ---
    console.log('\n--- Test Suite 2: Scenario Comparison Matrix (+0, +100, +300, +500) ---');

    const comparison = compareOrderScenarios({
      medicine: 'Amoxicillin 500mg',
      batch: 'AMX-TEST',
      currentStock: 45,
      dailyUsage: 5,
      daysToExpiry: 25,
      unitCost: 95,
    });

    assert(comparison.comparisonMatrix.length === 4, 'Comparison matrix contains 4 scenarios');
    
    // +0 Scenario
    const s0 = comparison.comparisonMatrix.find(s => s.orderIncrement === 0);
    assert(s0.projectedStock === 45 && s0.projectedSurplus === 0 && s0.capitalAtRisk === 0, 'Scenario +0: Stock=45, Surplus=0, Risk=₹0');

    // +100 Scenario
    const s100 = comparison.comparisonMatrix.find(s => s.orderIncrement === 100);
    assert(s100.projectedStock === 145 && s100.projectedSurplus === 20 && s100.capitalAtRisk === 1900, 'Scenario +100: Stock=145, Surplus=20, Risk=₹1,900');
    assert(s100.utilizationPct === 86, 'Scenario +100: Utilization = 86% (125/145)');

    // +300 Scenario
    const s300 = comparison.comparisonMatrix.find(s => s.orderIncrement === 300);
    assert(s300.projectedStock === 345 && s300.projectedSurplus === 220 && s300.capitalAtRisk === 20900, 'Scenario +300: Stock=345, Surplus=220, Risk=₹20,900');

    // +500 Scenario
    const s500 = comparison.comparisonMatrix.find(s => s.orderIncrement === 500);
    assert(s500.projectedStock === 545 && s500.projectedSurplus === 420 && s500.capitalAtRisk === 39900, 'Scenario +500: Stock=545, Surplus=420, Risk=₹39,900');

    // --- Suite 3: Dispensing Demand Surge (+20% Dispensing) ---
    console.log('\n--- Test Suite 3: Dispensing Rate Changes (+20%) ---');

    const surge20 = calculateScenario({
      medicine: 'Amoxicillin 500mg',
      batch: 'AMX-TEST',
      currentStock: 45,
      orderQty: 300,
      dailyUsage: 5,
      daysToExpiry: 25,
      unitCost: 95,
      dispensingIncreasePct: 20, // +20% -> 6/day
    });

    assert(surge20.simulatedData.simulatedDailyDemand === 6, '+20% surge: Simulated Daily Demand = 6/day');
    assert(surge20.simulatedData.projectedDemandInWindow === 150, '+20% surge: Expected Consumption = 150 (6 * 25)');
    assert(surge20.simulatedData.projectedSurplusAtExpiry === 195, '+20% surge: Projected Surplus = 195 (345 - 150)');
    assert(surge20.simulatedData.capitalAtRisk === 18525, '+20% surge: Capital at Risk = ₹18,525 (195 * 95)');

    // --- Suite 4: Supplier Delivery Delay (15 Days Delay) ---
    console.log('\n--- Test Suite 4: Supplier Lead Time Delay (15 Days) ---');

    const delay15 = calculateScenario({
      medicine: 'Amoxicillin 500mg',
      batch: 'AMX-TEST',
      currentStock: 45,
      orderQty: 300,
      dailyUsage: 5,
      daysToExpiry: 25,
      unitCost: 95,
      leadTimeDays: 15, // 25 - 15 = 10 effective days
    });

    assert(delay15.simulatedData.effectiveWindowDays === 10, '15d delay on 25d expiry: Effective Usable Window = 10 days');
    assert(delay15.simulatedData.projectedDemandInWindow === 50, '15d delay: Expected Consumption = 50 (5 * 10)');
    assert(delay15.simulatedData.projectedSurplusAtExpiry === 295, '15d delay: Projected Surplus = 295 (345 - 50)');
    assert(delay15.simulatedData.capitalAtRisk === 28025, '15d delay: Capital at Risk = ₹28,025 (295 * 95)');

    // --- Suite 5: Hold Expiry Batch (Divert Dispensing) ---
    console.log('\n--- Test Suite 5: Hold Expiry Batch Scenario ---');

    const holdTest = calculateScenario({
      medicine: 'Amoxicillin 500mg',
      batch: 'AMX-TEST',
      currentStock: 45,
      orderQty: 0,
      dailyUsage: 5,
      daysToExpiry: 25,
      unitCost: 95,
      holdBatch: true, // Batch is held
    });

    assert(holdTest.simulatedData.simulatedDailyDemand === 0, 'Held batch: Simulated Daily Demand = 0');
    assert(holdTest.simulatedData.projectedDemandInWindow === 0, 'Held batch: Expected Consumption = 0');
    assert(holdTest.simulatedData.projectedSurplusAtExpiry === 45, 'Held batch: All 45 units remain as surplus at expiry');
    assert(holdTest.simulatedData.capitalAtRisk === 4275, 'Held batch: Full stock capital at risk = ₹4,275 (45 * 95)');
    assert(holdTest.simulatedData.riskLevel === 'High', 'Held batch flagged as High Expiry Risk');

    // --- Suite 6: Express Backend Endpoint /api/ai/simulate ---
    console.log('\n--- Test Suite 6: API Endpoint /api/ai/simulate ---');

    const apiRes = await makeRequest(testPort, '/api/ai/simulate', 'POST', {
      medicine: 'Vitamin D3 60K',
      batch: 'VD102',
      currentStock: 180,
      orderQty: 300,
      dailyUsage: 5,
      daysToExpiry: 20,
      unitCost: 65,
      leadTimeDays: 2,
    });

    assert(apiRes.status === 200, 'API /api/ai/simulate returned HTTP 200 OK');
    assert(apiRes.body.isSimulation === true, 'API response confirms isSimulation: true');
    assert(apiRes.body.disclaimer.includes('SIMULATION BASED ON LIVE PHARMACY INVENTORY'), 'API includes sandbox non-destructive disclaimer');
    assert(apiRes.body.multiScenarioComparison?.comparisonMatrix?.length === 4, 'API returns 4-scenario comparison matrix');
    assert(typeof apiRes.body.suggestedAiOrder === 'number', 'API returns suggested AI target order quantity');

    // --- Suite 7: Non-Destructive Integrity ---
    console.log('\n--- Test Suite 7: Non-Destructive Simulation Integrity ---');

    const initialInventoryRes = await makeRequest(testPort, '/api/inventory', 'GET');
    const initialCount = Array.isArray(initialInventoryRes.body) ? initialInventoryRes.body.length : 0;
    
    // Run multiple simulations
    await makeRequest(testPort, '/api/ai/simulate', 'POST', { medicine: 'Paracetamol 500mg', orderQty: 500, currentStock: 120, dailyUsage: 15, daysToExpiry: 60, unitCost: 25 });
    await makeRequest(testPort, '/api/ai/simulate', 'POST', { medicine: 'Cetirizine 10mg', orderQty: 1000, currentStock: 40, dailyUsage: 8, daysToExpiry: 90, unitCost: 35 });

    const postInventoryRes = await makeRequest(testPort, '/api/inventory', 'GET');
    const postCount = Array.isArray(postInventoryRes.body) ? postInventoryRes.body.length : 0;

    assert(initialCount === postCount, `Simulation calls never mutate live inventory count (remains ${postCount})`);

    console.log(`\n🎉 What-If Simulator Test Suite Completed: ${passed}/${total} passed.\n`);
  } finally {
    if (server) server.close();
  }

  if (passed < total) process.exit(1);
}

runSimulatorTests().catch(err => {
  console.error('Fatal error in simulator test suite:', err);
  process.exit(1);
});
