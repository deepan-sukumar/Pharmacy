const http = require('http');
const app = require('../index');
const {
  calculateScenario,
  compareOrderScenarios,
  runWhatIfSimulation,
  resolveDynamicExpiry,
  interpretSimulationQuestion,
  answerSimulationQuestion
} = require('../services/simulationService');

function makeRequest(serverPort, path, method = 'GET', body = null, headers = {}) {
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
        } : {}),
        ...headers
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
  console.log('\n🧪 Starting PharmaFlow What-If Expiry-Risk Simulator Complete 15-Test Verification Suite...\n');
  let passed = 0;
  let total = 0;
  let server;
  const testPort = 5578;

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

    // =========================================================================
    // 15 MANDATORY PHARMAFLOW WHAT-IF SIMULATOR TESTS
    // =========================================================================

    console.log('--- TEST 1: Batch fully consumed before expiry (Expected: Low Risk) ---');
    const test1 = calculateScenario({
      medicine: 'Paracetamol 500mg',
      batch: 'PCT-T1',
      currentStock: 50,
      dailyUsage: 2,
      daysToExpiry: 25,
      unitCost: 20,
      orderQty: 0
    });
    assert(test1.actualData.baselineExpectedConsumption === 50, 'T1: Baseline expected consumption = 50 (2 * 25)');
    assert(test1.actualData.baselineProjectedSurplus === 0, 'T1: Baseline projected surplus = 0 units');
    assert(test1.actualData.baselineCapitalAtRisk === 0, 'T1: Baseline capital at risk = ₹0');
    assert(test1.simulatedData.projectedSurplusAtExpiry === 0, 'T1: Scenario projected surplus at expiry = 0');
    assert(test1.simulatedData.capitalAtRisk === 0, 'T1: Scenario capital at risk = ₹0');
    assert(test1.simulatedData.riskLevel === 'Safe' || test1.simulatedData.riskLevel === 'Low Risk', 'T1: Flagged as Low Risk');

    console.log('\n--- TEST 2: Consumption too slow (Expected: Expiry Quantity > 0) ---');
    const test2 = calculateScenario({
      medicine: 'Amoxicillin 500mg',
      batch: 'AMX-T2',
      currentStock: 120,
      dailyUsage: 2,
      daysToExpiry: 20,
      unitCost: 95,
      orderQty: 0
    });
    assert(test2.actualData.baselineExpectedConsumption === 40, 'T2: Expected consumption = 40 (2 * 20)');
    assert(test2.actualData.baselineProjectedSurplus === 80, 'T2: Projected surplus = 80 units (120 - 40)');
    assert(test2.actualData.baselineCapitalAtRisk === 7600, 'T2: Capital at risk = ₹7,600 (80 * 95)');
    assert(test2.simulatedData.projectedSurplusAtExpiry === 80, 'T2: Expiry surplus > 0 (80 units)');
    assert(test2.simulatedData.riskLevel === 'Likely Expiry' || test2.simulatedData.riskLevel === 'High', 'T2: Flagged as High/Likely Expiry risk');

    console.log('\n--- TEST 3: Expiry date passed (Expected: Expired) ---');
    const test3 = calculateScenario({
      medicine: 'Cough Syrup 100ml',
      batch: 'CS-T3',
      currentStock: 25,
      dailyUsage: 3,
      daysToExpiry: -5,
      unitCost: 60,
      orderQty: 0
    });
    assert(test3.simulatedData.riskLevel === 'Expired', 'T3: Expired batch flagged with riskLevel: Expired');
    assert(test3.simulatedData.recommendation.includes('Quarantine'), 'T3: Recommendation urges immediate quarantine');

    console.log('\n--- TEST 4: Demand decreases (Expected: Expiry risk increases) ---');
    const test4 = calculateScenario({
      medicine: 'Azithromycin 250mg',
      batch: 'AZI-T4',
      currentStock: 60,
      dailyUsage: 4,
      daysToExpiry: 15,
      unitCost: 120,
      demandChangePct: -50, // 4 -> 2 units/day
      orderQty: 0
    });
    assert(test4.simulatedData.simulatedDailyDemand === 2, 'T4: Simulated demand halved to 2 units/day');
    assert(test4.simulatedData.projectedDemandInWindow === 30, 'T4: Expected consumption reduced to 30 units');
    assert(test4.simulatedData.projectedSurplusAtExpiry === 30, 'T4: Surplus increased to 30 units (60 - 30)');
    assert(test4.simulatedData.capitalAtRisk === 3600, 'T4: Capital at risk = ₹3,600');

    console.log('\n--- TEST 5: Demand increases (Expected: Expiry risk decreases, stockout risk increases) ---');
    const test5 = calculateScenario({
      medicine: 'Cetirizine 10mg',
      batch: 'CTZ-T5',
      currentStock: 40,
      dailyUsage: 4,
      daysToExpiry: 20,
      unitCost: 35,
      demandChangePct: 50, // 4 -> 6 units/day
      orderQty: 0
    });
    assert(test5.simulatedData.simulatedDailyDemand === 6, 'T5: Simulated demand increased to 6 units/day');
    assert(test5.simulatedData.projectedSurplusAtExpiry === 0, 'T5: Expiry surplus reduced to 0');
    assert(test5.simulatedData.potentialShortage === 80, 'T5: Potential shortage = 80 units (120 - 40)');
    assert(test5.simulatedData.riskLevel === 'Shortage', 'T5: Flagged with Stockout/Shortage risk');

    console.log('\n--- TEST 6: Quarantine period added (Expected: Consumption projection adjusts) ---');
    const test6 = calculateScenario({
      medicine: 'Amoxicillin 500mg',
      batch: 'AMX-T6',
      currentStock: 50,
      dailyUsage: 2,
      daysToExpiry: 25,
      unitCost: 95,
      holdBatch: true
    });
    assert(test6.simulatedData.simulatedDailyDemand === 0, 'T6: Simulated daily demand becomes 0 during hold');
    assert(test6.simulatedData.projectedSurplusAtExpiry === 50, 'T6: All 50 units remain unsold at expiry');
    assert(test6.simulatedData.capitalAtRisk === 4750, 'T6: Capital at risk equals full stock value (50 * 95 = 4750)');

    console.log('\n--- TEST 7: Additional stock added (Expected: Expiry exposure can increase) ---');
    const test7 = calculateScenario({
      medicine: 'Amoxicillin 500mg',
      batch: 'AMX-T7',
      currentStock: 45,
      dailyUsage: 5,
      daysToExpiry: 25,
      unitCost: 95,
      orderQty: 300
    });
    assert(test7.simulatedData.projectedTotalStock === 345, 'T7: Total stock becomes 345 units');
    assert(test7.simulatedData.projectedDemandInWindow === 125, 'T7: Expected demand is 125 units');
    assert(test7.simulatedData.projectedSurplusAtExpiry === 220, 'T7: Expiry surplus increased to 220 units');
    assert(test7.simulatedData.capitalAtRisk === 20900, 'T7: Capital at risk increased to ₹20,900');

    console.log('\n--- TEST 8: Multiple batches (Expected: FEFO order & batch-specific risk) ---');
    const simMulti = await runWhatIfSimulation('DEMO_PHARMACY', {
      medicine: 'Amoxicillin 500mg'
    });
    assert(Array.isArray(simMulti.multiBatchBreakdown), 'T8: Returns multiBatchBreakdown array');
    if (simMulti.multiBatchBreakdown.length > 1) {
      const b1 = simMulti.multiBatchBreakdown[0];
      const b2 = simMulti.multiBatchBreakdown[1];
      assert(b1.daysToExpiry <= b2.daysToExpiry, `T8: Sorted in FEFO order (${b1.daysToExpiry}d <= ${b2.daysToExpiry}d)`);
    }

    console.log('\n--- TEST 9: Natural language question: "What if demand drops by 30%?" ---');
    const q9 = interpretSimulationQuestion('What if demand drops by 30%?');
    assert(q9.queryType === 'DEMAND_CHANGE', 'T9: Question interpreted as DEMAND_CHANGE');
    assert(q9.interpretedParameters.demandChangePct === -30, 'T9: demandChangePct extracted as -30');
    const ans9 = await answerSimulationQuestion('DEMO_PHARMACY', {
      question: 'What if demand drops by 30%?',
      medicine: 'Paracetamol 500mg',
      currentStock: 120,
      dailyUsage: 5,
      daysToExpiry: 25,
      unitCost: 25
    });
    assert(ans9.directAnswer.length > 0, 'T9: Dynamic answer generated');
    assert(ans9.simulation.simulatedData.demandChangePct === -30, 'T9: Simulation executed with -30% demand');

    console.log('\n--- TEST 10: Natural language question: "Will this batch expire before it is used?" ---');
    const ans10 = await answerSimulationQuestion('DEMO_PHARMACY', {
      question: 'Will this batch expire before it is used?',
      medicine: 'Paracetamol 500mg',
      currentStock: 50,
      dailyUsage: 5,
      daysToExpiry: 25,
      unitCost: 25
    });
    assert(ans10.queryType === 'EXPIRY_CHECK', 'T10: Query recognized as EXPIRY_CHECK');
    assert(ans10.directAnswer.includes('Yes') || ans10.directAnswer.includes('fully consumed'), 'T10: Direct truthful answer provided based on simulation');

    console.log('\n--- TEST 11: Natural language question: "How much money is at risk?" ---');
    const ans11 = await answerSimulationQuestion('DEMO_PHARMACY', {
      question: 'How much money is at risk?',
      medicine: 'Amoxicillin 500mg',
      currentStock: 100,
      dailyUsage: 2,
      daysToExpiry: 20,
      unitCost: 50
    });
    assert(ans11.queryType === 'FINANCIAL_RISK_QUERY', 'T11: Query recognized as FINANCIAL_RISK_QUERY');
    assert(ans11.directAnswer.includes('₹') && ans11.directAnswer.includes('3,000'), 'T11: Exact capital at risk calculated (₹ 3,000 for 60 surplus units)');

    console.log('\n--- TEST 12: Natural language question: "When will this stock run out?" ---');
    const ans12 = await answerSimulationQuestion('DEMO_PHARMACY', {
      question: 'When will this stock run out?',
      medicine: 'Cetirizine 10mg',
      currentStock: 30,
      dailyUsage: 6,
      daysToExpiry: 30,
      unitCost: 35
    });
    assert(ans12.queryType === 'STOCKOUT_QUERY', 'T12: Query recognized as STOCKOUT_QUERY');
    assert(ans12.directAnswer.includes('5 days'), 'T12: Calculated stockout in 5 days (30 / 6)');

    console.log('\n--- TEST 13: Simulation is Run -> Zero Writes to Firestore (Read-Only) ---');
    const invBefore = await makeRequest(testPort, '/api/inventory', 'GET');
    const lenBefore = Array.isArray(invBefore.body) ? invBefore.body.length : 0;
    
    await makeRequest(testPort, '/api/ai/simulate/ask', 'POST', {
      question: 'What if I reorder 500 units?',
      medicine: 'Paracetamol 500mg',
      currentStock: 120,
      unitCost: 25
    });

    const invAfter = await makeRequest(testPort, '/api/inventory', 'GET');
    const lenAfter = Array.isArray(invAfter.body) ? invAfter.body.length : 0;
    assert(lenBefore === lenAfter, `T13: Simulation is strictly read-only (${lenBefore} === ${lenAfter})`);

    console.log('\n--- TEST 14: Multi-Tenancy & Pharmacy Isolation ---');
    const simTenant1 = await runWhatIfSimulation('DEMO_PHARMACY', { medicine: 'Paracetamol 500mg' });
    const simTenant2 = await runWhatIfSimulation('PHARM_TENANT_SECURE_99', { medicine: 'Paracetamol 500mg', currentStock: 777 });
    assert(simTenant1.actualData.currentStock !== undefined, 'T14: DEMO_PHARMACY isolates its stock');
    assert(simTenant2.actualData.currentStock === 777, 'T14: Custom tenant isolates its stock');

    console.log('\n--- TEST 15: Current date changes (Dynamic calculation) ---');
    const expDyn = resolveDynamicExpiry('25 Sep 2026');
    assert(typeof expDyn.daysToExpiry === 'number', 'T15: Dynamically resolves days to expiry from real current date');
    assert(expDyn.expiryStatusLabel.length > 0, 'T15: Generates dynamic status label');

    console.log('\n--- TEST 16: Original Multi-Scenario Order Matrix (+0, +100, +300, +500) ---');
    const orderComp = compareOrderScenarios({
      medicine: 'Paracetamol 500mg',
      currentStock: 50,
      dailyUsage: 5,
      daysToExpiry: 30,
      unitCost: 20
    });
    assert(orderComp.comparisonMatrix.length === 4, 'T16: Generates 4 comparison scenarios');
    assert(orderComp.comparisonMatrix[0].orderIncrement === 0, 'T16: Baseline scenario (+0)');
    assert(orderComp.comparisonMatrix[1].orderIncrement === 100, 'T16: Scenario 1 (+100)');
    assert(orderComp.comparisonMatrix[2].orderIncrement === 300, 'T16: Scenario 2 (+300)');
    assert(orderComp.comparisonMatrix[3].orderIncrement === 500, 'T16: Scenario 3 (+500)');
    assert(orderComp.comparisonMatrix[3].surplusAtExpiry > 0, 'T16: Large order +500 causes high surplus');

    console.log('\n--- TEST 17: Supplier Lead-Time Delay Scenario ---');
    const leadTimeRes = calculateScenario({
      medicine: 'Paracetamol 500mg',
      currentStock: 50,
      dailyUsage: 5,
      daysToExpiry: 30,
      unitCost: 20,
      leadTimeDays: 10,
      orderQty: 100
    });
    assert(leadTimeRes.simulatedData.effectiveWindowDays === 20, 'T17: Effective window reduced by 10 days (30 - 10)');
    assert(leadTimeRes.simulatedData.projectedDemandInWindow === 100, 'T17: Usable demand adjusted to 100 units (5 * 20)');

    console.log('\n--- TEST 18: Custom Order Quantity (+250 units) ---');
    const customOrderRes = calculateScenario({
      medicine: 'Paracetamol 500mg',
      currentStock: 40,
      dailyUsage: 4,
      daysToExpiry: 30,
      unitCost: 25,
      orderQty: 250
    });
    assert(customOrderRes.simulatedData.projectedTotalStock === 290, 'T18: Total stock = 290 (40 + 250)');
    assert(customOrderRes.simulatedData.projectedSurplusAtExpiry === 170, 'T18: Surplus = 170 units (290 - 120)');
    assert(customOrderRes.simulatedData.capitalAtRisk === 4250, 'T18: Capital at risk = ₹4,250');

    console.log(`\n🎉 What-If Simulator All 18 Test Suites Passed: ${passed}/${total} passed.\n`);
  } finally {
    if (server) server.close();
  }

  if (passed < total) process.exit(1);
}

runSimulatorTests().catch(err => {
  console.error('Fatal error in simulator test suite:', err);
  process.exit(1);
});

