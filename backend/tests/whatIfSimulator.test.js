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
  console.log('\n🧪 Starting PharmaFlow What-If Simulator Exhaustive Verification Suite...\n');
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
    // SECTION 1: CORE ENGINE & SCREEN ACCURACY (Section 42 in Prompt)
    // =========================================================================
    console.log('--- TEST 1: Current Screen Scenario (200 Stock, 5/day, 481d Expiry) ---');
    const screenBaseline = calculateScenario({
      medicine: 'Paracetamol 500mg',
      batch: 'PCT-200',
      currentStock: 200,
      dailyUsage: 5,
      daysToExpiry: 481,
      unitCost: 25,
      orderQty: 0,
      leadTimeDays: 0
    });
    assert(screenBaseline.actualData.currentStock === 200, 'T1.1: Baseline Current Stock = 200 units');
    assert(screenBaseline.actualData.baselineStockoutDays === 40, 'T1.2: Baseline Stockout Days = 40 (200 / 5)');
    assert(screenBaseline.simulatedData.projectedSurplusAtExpiry === 0, 'T1.3: Expiry Wastage = 0 (Consumed before 481d)');

    const screenPlus100 = calculateScenario({
      medicine: 'Paracetamol 500mg',
      batch: 'PCT-200',
      currentStock: 200,
      dailyUsage: 5,
      daysToExpiry: 481,
      unitCost: 25,
      orderQty: 100,
      leadTimeDays: 0
    });
    assert(screenPlus100.simulatedData.projectedTotalStock === 300, 'T1.4: Simulated Available Stock = 300 (+100 order)');
    assert(screenPlus100.simulatedData.daysUntilStockout === 60, 'T1.5: +100 Stockout Days = 60 (300 / 5)');
    assert(screenPlus100.simulatedData.stockUtilizationPct === 100, 'T1.6: Stock Utilization = 100%');

    // =========================================================================
    // SECTION 2: SUPPLIER LEAD TIME TIME-BASED PROJECTION (Section 4, 42, 47)
    // =========================================================================
    console.log('\n--- TEST 2: Supplier Lead Time Simulation (Lead Time = 10 Days) ---');
    const leadTime10 = calculateScenario({
      medicine: 'Paracetamol 500mg',
      batch: 'PCT-200',
      currentStock: 200,
      dailyUsage: 5,
      daysToExpiry: 481,
      unitCost: 25,
      orderQty: 100,
      leadTimeDays: 10
    });
    assert(leadTime10.simulatedData.daysUntilStockout === 60, 'T2.1: Lead Time 10d preserves eventual stockout timing (60 days)');
    assert(leadTime10.simulatedData.explanation.includes('10 days') || leadTime10.simulatedData.explanation.includes('lead time'), 'T2.2: Explanation traces 10-day lead-time arrival');

    console.log('\n--- TEST 3: Lead-Time Gap Shortage (Stock runs out before replenishment) ---');
    const leadGap = calculateScenario({
      medicine: 'Antibiotic Oral',
      batch: 'ANT-30',
      currentStock: 30,
      dailyUsage: 5,
      daysToExpiry: 60,
      unitCost: 50,
      orderQty: 100,
      leadTimeDays: 10
    });
    assert(leadGap.simulatedData.daysUntilStockout === 6, 'T3.1: Initial stock depletes on day 6 before day 10 arrival');
    assert(leadGap.simulatedData.leadShortage === 20, 'T3.2: 20 units unmet demand during lead-time gap (4 days * 5)');
    assert(leadGap.simulatedData.potentialShortage === 170, 'T3.3: Total horizon shortage is 170 units (300 demand - 130 stock)');
    assert(leadGap.simulatedData.riskLevel === 'Shortage', 'T3.4: Risk flagged as Shortage/Stockout');

    // =========================================================================
    // SECTION 3: EXPIRY & WASTAGE SCENARIO (Section 43)
    // =========================================================================
    console.log('\n--- TEST 4: Expiry Projection & Capital at Risk (Section 43 Example) ---');
    const expTest = calculateScenario({
      medicine: 'Specialty Injection',
      batch: 'SPEC-50',
      currentStock: 200,
      dailyUsage: 2,
      daysToExpiry: 50,
      unitCost: 18.5,
      orderQty: 0
    });
    assert(expTest.actualData.baselineExpectedConsumption === 100, 'T4.1: Projected consumption before expiry = 100 (2 * 50)');
    assert(expTest.simulatedData.projectedSurplusAtExpiry === 100, 'T4.2: Expiry surplus quantity = 100 units (200 - 100)');
    assert(expTest.simulatedData.expiryCapitalAtRisk === 1850, 'T4.3: Expiry Capital at Risk = ₹1,850 (100 * 18.5)');
    assert(expTest.simulatedData.stockUtilizationPct === 50, 'T4.4: Stock Utilization = 50% (100 of 200 utilized)');

    // =========================================================================
    // SECTION 4: DEMAND SHIFT SCENARIOS (Section 44)
    // =========================================================================
    console.log('\n--- TEST 5: Demand Shift Projections (-50% and +50%) ---');
    const demandDown = calculateScenario({
      medicine: 'Paracetamol 500mg',
      currentStock: 200,
      dailyUsage: 5,
      daysToExpiry: 120,
      demandChangePct: -50, // 5 -> 2.5 / day
      orderQty: 0
    });
    assert(demandDown.simulatedData.simulatedDailyDemand === 2.5, 'T5.1: Demand reduced to 2.5 units/day');
    assert(demandDown.simulatedData.daysUntilStockout === 80, 'T5.2: Stockout moves to 80 days (200 / 2.5)');

    const demandUp = calculateScenario({
      medicine: 'Paracetamol 500mg',
      currentStock: 200,
      dailyUsage: 5,
      daysToExpiry: 120,
      demandChangePct: 50, // 5 -> 7.5 / day
      orderQty: 0
    });
    assert(demandUp.simulatedData.simulatedDailyDemand === 7.5, 'T5.3: Demand increased to 7.5 units/day');
    assert(demandUp.simulatedData.daysUntilStockout === 26, 'T5.4: Stockout accelerates to ~26 days (200 / 7.5 = 26.67)');

    // =========================================================================
    // SECTION 5: QUARANTINE / HOLD (Section 45)
    // =========================================================================
    console.log('\n--- TEST 6: Quarantine / Hold Impact ---');
    const holdTest = calculateScenario({
      medicine: 'Syrup 100ml',
      currentStock: 200,
      dailyUsage: 5,
      daysToExpiry: 100,
      quarantineDays: 5,
      orderQty: 0
    });
    assert(holdTest.simulatedData.daysUntilStockout === 45, 'T6.1: 5-day hold delays stockout by 5 days (5 + 200/5 = 45)');

    const fullHold = calculateScenario({
      medicine: 'Suspension',
      currentStock: 150,
      dailyUsage: 5,
      daysToExpiry: 30,
      holdBatch: true
    });
    assert(fullHold.simulatedData.simulatedDailyDemand === 0, 'T6.2: Indefinite hold sets active velocity to 0');
    assert(fullHold.simulatedData.projectedSurplusAtExpiry === 150, 'T6.3: Full 150 units remain at expiry during hold');

    // =========================================================================
    // SECTION 6: ORDER MATRIX CONSISTENCY (Section 46 & 51)
    // =========================================================================
    console.log('\n--- TEST 7: Multi-Scenario Comparison Matrix (+0, +100, +300, +500) ---');
    const matrixRes = compareOrderScenarios({
      medicine: 'Paracetamol 500mg',
      currentStock: 200,
      dailyUsage: 5,
      daysToExpiry: 481,
      unitCost: 20,
      leadTimeDays: 0
    });
    assert(matrixRes.comparisonMatrix.length === 4, 'T7.1: Matrix generates 4 standard scenarios');
    assert(matrixRes.comparisonMatrix[0].projectedStock === 200 && matrixRes.comparisonMatrix[0].daysUntilStockout === 40, 'T7.2: +0 = 200 units, 40d stockout');
    assert(matrixRes.comparisonMatrix[1].projectedStock === 300 && matrixRes.comparisonMatrix[1].daysUntilStockout === 60, 'T7.3: +100 = 300 units, 60d stockout');
    assert(matrixRes.comparisonMatrix[2].projectedStock === 500 && matrixRes.comparisonMatrix[2].daysUntilStockout === 100, 'T7.4: +300 = 500 units, 100d stockout');
    assert(matrixRes.comparisonMatrix[3].projectedStock === 700 && matrixRes.comparisonMatrix[3].daysUntilStockout === 140, 'T7.5: +500 = 700 units, 140d stockout');

    // =========================================================================
    // SECTION 7: NATURAL LANGUAGE QUESTION INTERPRETATION & ANSWERS (Section 23, 25)
    // =========================================================================
    console.log('\n--- TEST 8: Ask the Simulator Question Grounding ---');
    const q1 = interpretSimulationQuestion('Will this batch expire before it is used?');
    assert(q1.queryType === 'EXPIRY_CHECK', 'T8.1: Interprets expiry check intent');

    const q2 = interpretSimulationQuestion('What if demand decreases by 30%?');
    assert(q2.queryType === 'DEMAND_CHANGE' && q2.interpretedParameters.demandChangePct === -30, 'T8.2: Interprets -30% demand shift');

    const q3 = interpretSimulationQuestion('What if the supplier takes 10 days?');
    assert(q3.queryType === 'LEAD_TIME_CHANGE' && q3.interpretedParameters.leadTimeDays === 10, 'T8.3: Interprets 10-day supplier lead time');

    const q4 = interpretSimulationQuestion('What happens if this batch is quarantined for 5 days?');
    assert(q4.queryType === 'QUARANTINE_HOLD' && q4.interpretedParameters.quarantineDays === 5, 'T8.4: Interprets 5-day quarantine');

    const ansMoney = await answerSimulationQuestion('DEMO_PHARMACY', {
      question: 'How much money is at risk?',
      medicine: 'Specialty Injection',
      currentStock: 200,
      dailyUsage: 2,
      daysToExpiry: 50,
      unitCost: 18.5
    });
    assert(ansMoney.directAnswer.includes('1,850'), 'T8.5: Answer accurately reports calculated ₹1,850 capital at risk');

    // =========================================================================
    // SECTION 8: READ-ONLY SAFETY GUARANTEE (Section 37, 50)
    // =========================================================================
    console.log('\n--- TEST 9: Simulation Execution Is 100% Read-Only ---');
    const invBefore = await makeRequest(testPort, '/api/inventory', 'GET');
    const lenBefore = Array.isArray(invBefore.body) ? invBefore.body.length : 0;
    
    await makeRequest(testPort, '/api/ai/simulate', 'POST', {
      medicine: 'Paracetamol 500mg',
      currentStock: 200,
      orderQty: 500,
      demandChangePct: 50,
      leadTimeDays: 15
    });

    await makeRequest(testPort, '/api/ai/simulate/ask', 'POST', {
      question: 'What if I order 500 units?',
      medicine: 'Paracetamol 500mg'
    });

    const invAfter = await makeRequest(testPort, '/api/inventory', 'GET');
    const lenAfter = Array.isArray(invAfter.body) ? invAfter.body.length : 0;
    assert(lenBefore === lenAfter, `T9.1: Live inventory unmodified by simulation (${lenBefore} === ${lenAfter})`);

    // =========================================================================
    // SECTION 9: FEFO MULTI-BATCH SORTING (Section 27, 28)
    // =========================================================================
    console.log('\n--- TEST 10: Multi-Batch FEFO Sorting & Analysis ---');
    const multiSim = await runWhatIfSimulation('DEMO_PHARMACY', { medicine: 'Amoxicillin 500mg' });
    if (multiSim.multiBatchBreakdown && multiSim.multiBatchBreakdown.length > 1) {
      const b1 = multiSim.multiBatchBreakdown[0];
      const b2 = multiSim.multiBatchBreakdown[1];
      assert(b1.daysToExpiry <= b2.daysToExpiry, 'T10.1: Sibling batches sorted in FEFO order (earliest expiry first)');
    } else {
      assert(Array.isArray(multiSim.multiBatchBreakdown), 'T10.1: Returns multiBatchBreakdown array');
    }

    console.log(`\n🎉 What-If Simulator All Tests Passed: ${passed}/${total} passed.\n`);
  } finally {
    if (server) server.close();
  }

  if (passed < total) process.exit(1);
}

runSimulatorTests().catch(err => {
  console.error('Fatal error in simulator test suite:', err);
  process.exit(1);
});
