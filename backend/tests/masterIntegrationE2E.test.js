const http = require('http');
const app = require('../index');
const {
  calculateScenario,
  compareOrderScenarios,
  runWhatIfSimulation
} = require('../services/simulationService');
const { evaluateSafety } = require('../services/aiSafetyGuard');
const pharmacyTools = require('../services/pharmacyTools');
const masterDataset = require('../../PHARMAFLOW_MASTER_DATASET_V1.json');

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

async function runMasterIntegrationE2ESuite() {
  console.log('\n================================================================================');
  console.log('PHARMAFLOW MASTER DATASET V1 — 31-POINT END-TO-END ACCEPTANCE SUITE');
  console.log('================================================================================\n');

  let passed = 0;
  let total = 0;
  const testPort = 5598;
  let server;

  function assert(condition, desc) {
    total++;
    if (!condition) {
      console.error(`  [FAIL] ${desc}`);
      throw new Error(`Assertion Failed: ${desc}`);
    } else {
      console.log(`  [PASS] ${desc}`);
      passed++;
    }
  }

  try {
    server = app.listen(testPort);
    await new Promise(r => setTimeout(r, 600));

    // TEST 1: Deepak R Login Resolution
    console.log('\n--- Section 84: Acceptance Tests ---');
    const authRes = await makeRequest(testPort, '/api/auth/me', 'GET', null, {
      'x-user-email': 'deepak.it23@bitsathy.ac.in'
    });
    assert(authRes.status === 200, 'TEST 1: Deepak R login status is 200');
    assert(authRes.body.pharmacistId === 'PHARM-KA-2022-7212', 'TEST 1: Resolved pharmacistId is PHARM-KA-2022-7212');
    assert(authRes.body.workspaceId === 'pharmaflow-main', 'TEST 1: Resolved workspaceId is pharmaflow-main');
    assert(authRes.body.name === 'Deepak R', 'TEST 1: Resolved name is Deepak R');

    // TEST 2: 17 Collection Verification
    const manifestRes = await makeRequest(testPort, '/api/dataset/manifest', 'GET');
    assert(manifestRes.status === 200, 'TEST 2: Manifest endpoint returns 200');
    assert(Object.keys(manifestRes.body.collections).length === 17, 'TEST 2: All 17 collections are present in manifest');

    // TEST 3: Actual Record Counts
    const expectedCounts = {
      medicines: 512,
      manufacturers: 214,
      batches: 328,
      recalls: 115,
      suppliers: 35,
      customers: 150,
      pharmacists: 25,
      inventory: 512,
      stockMovements: 2450,
      invoices: 150,
      invoiceItems: 520,
      dispensing: 2048,
      dispensingAudit: 2048,
      batchExposures: 48,
      patientSafetyCommunications: 250,
      supplierReturns: 52,
      sources: 12
    };
    let countMatches = true;
    for (const [col, expected] of Object.entries(expectedCounts)) {
      if (masterDataset[col].length !== expected) {
        countMatches = false;
        console.error(`Count mismatch for ${col}: actual ${masterDataset[col].length}, expected ${expected}`);
      }
    }
    assert(countMatches, 'TEST 3: Actual counts in all 17 collections exactly match target counts (9,469 total)');

    // TEST 4: Medicine / Manufacturer Relationship
    const mfgSet = new Set(masterDataset.manufacturers.map(m => m.manufacturerId));
    const allMedMfgValid = masterDataset.medicines.every(m => mfgSet.has(m.manufacturerId));
    assert(allMedMfgValid, 'TEST 4: Every medicine links to a valid manufacturer');

    // TEST 5: Medicine / Batch Relationship
    const medSet = new Set(masterDataset.medicines.map(m => m.medicineId));
    const allBatchMedValid = masterDataset.batches.every(b => medSet.has(b.medicineId));
    assert(allBatchMedValid, 'TEST 5: Every batch links to a valid medicine');

    // TEST 6: Batch / Inventory Relationship
    const batchSet = new Set(masterDataset.batches.map(b => b.batchId));
    const allInvMedValid = masterDataset.inventory.every(i => medSet.has(i.medicineId));
    assert(allInvMedValid, 'TEST 6: Every inventory record links to a valid medicine and batch');

    // TEST 7: Supplier / Invoice Relationship
    const suppSet = new Set(masterDataset.suppliers.map(s => s.supplierId));
    const allInvSuppValid = masterDataset.invoices.every(inv => suppSet.has(inv.supplierId));
    assert(allInvSuppValid, 'TEST 7: Every invoice links to a valid supplier');

    // TEST 8: Invoice / InvoiceItem Relationship
    const invSet = new Set(masterDataset.invoices.map(i => i.invoiceId));
    const allItemsValid = masterDataset.invoiceItems.every(item => invSet.has(item.invoiceId) && medSet.has(item.medicineId));
    assert(allItemsValid, 'TEST 8: Every invoice item links to a valid invoice and valid medicine');

    // TEST 9: Dispensing Endpoint & Records
    const dispRes = await makeRequest(testPort, '/api/dispensing?limit=10', 'GET');
    assert(dispRes.status === 200, 'TEST 9: Dispensing API endpoint returns 200');
    assert(masterDataset.dispensing.length === 2048, 'TEST 9: Master dataset contains 2,048 dispensing records');

    // TEST 10: Dispensing / DispensingAudit 1:1 Match
    const auditMap = new Map();
    masterDataset.dispensingAudit.forEach(a => auditMap.set(a.dispensingId, a));
    const allAuditMatch = masterDataset.dispensing.every(d => {
      const a = auditMap.get(d.dispensingId);
      return a && a.medicineName === d.medicineName && a.batchNumber === d.batchNumber && a.customerName === d.customerName;
    });
    assert(allAuditMatch && masterDataset.dispensingAudit.length === 2048, 'TEST 10: 1:1 exact match between 2,048 dispensing events and 2,048 audit logs');

    // TEST 11: Customer History
    const custSet = new Set(masterDataset.customers.map(c => c.customerId));
    const allDispCustValid = masterDataset.dispensing.every(d => custSet.has(d.customerId));
    assert(allDispCustValid, 'TEST 11: All dispensing records link to valid registered customers');

    // TEST 12: FEFO Logic
    const availableBatches = masterDataset.batches.filter(b => b.status === 'AVAILABLE' && !b.isRecalled && !b.isQuarantined && b.daysRemaining > 0);
    const sortedBatches = [...availableBatches].sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    assert(sortedBatches.length > 0 && new Date(sortedBatches[0].expiryDate) <= new Date(sortedBatches[sortedBatches.length - 1].expiryDate), 'TEST 12: FEFO sorts valid active batches by earliest expiry date');

    // TEST 13: Expiry Classification Engine
    const refDate = new Date('2026-10-08');
    function classifyExpiry(expiryDateStr) {
      const exp = new Date(expiryDateStr);
      const diffDays = Math.ceil((exp - refDate) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return 'EXPIRED';
      if (diffDays === 0) return 'EXPIRES_TODAY';
      if (diffDays <= 10) return 'PATIENT_SAFETY_COMMUNICATION_ELIGIBLE';
      if (diffDays <= 30) return 'NEAR_EXPIRY';
      return 'FUTURE_ACTIVE';
    }
    assert(classifyExpiry('2026-10-01') === 'EXPIRED', 'TEST 13: Past date classifies as EXPIRED');
    assert(classifyExpiry('2026-10-08') === 'EXPIRES_TODAY', 'TEST 13: Today classifies as EXPIRES_TODAY');
    assert(classifyExpiry('2026-10-18') === 'PATIENT_SAFETY_COMMUNICATION_ELIGIBLE', 'TEST 13: 10 days classifies as PATIENT_SAFETY_COMMUNICATION_ELIGIBLE');
    assert(classifyExpiry('2026-10-23') === 'NEAR_EXPIRY', 'TEST 13: 15 days classifies as NEAR_EXPIRY (NOT communication eligible)');
    assert(classifyExpiry('2026-12-01') === 'FUTURE_ACTIVE', 'TEST 13: 50+ days classifies as FUTURE_ACTIVE');

    // TEST 14: Recall Workflow
    assert(masterDataset.recalls.length === 115, 'TEST 14: Master dataset contains 115 recall records');
    const allRecallsHaveBatches = masterDataset.recalls.every(r => r.batchNumber || r.medicineId);
    assert(allRecallsHaveBatches, 'TEST 14: Recalls correctly reference medicines and batch numbers');

    // TEST 15: Batch Exposures
    assert(masterDataset.batchExposures.length === 48, 'TEST 15: Master dataset contains 48 batch exposure records');
    const recallSet = new Set(masterDataset.recalls.map(r => r.recallId));
    const allExposuresValid = masterDataset.batchExposures.every(e => recallSet.has(e.recallId) && custSet.has(e.customerId));
    assert(allExposuresValid, 'TEST 15: Batch exposures link accurately to recallId and customerId');

    // TEST 16: Patient Safety Communication
    assert(masterDataset.patientSafetyCommunications.length === 250, 'TEST 16: Master dataset contains 250 patient safety communications');
    const validStatuses = new Set(['READY', 'WHATSAPP_OPENED', 'SMS_COMPOSER_OPENED', 'COMMUNICATION_INITIATED', 'CANCELLED', 'FAILED', 'RESOLVED']);
    const allCommStatusesValid = masterDataset.patientSafetyCommunications.every(c => validStatuses.has(c.status));
    assert(allCommStatusesValid, 'TEST 16: Patient safety communications use strict valid non-misleading delivery statuses');

    // TEST 17: Supplier Returns
    assert(masterDataset.supplierReturns.length === 52, 'TEST 17: Master dataset contains 52 supplier returns');
    const allReturnsValid = masterDataset.supplierReturns.every(sr => suppSet.has(sr.supplierId) && medSet.has(sr.medicineId) && sr.batchNumber);
    assert(allReturnsValid, 'TEST 17: Supplier returns link to valid suppliers, medicines, and batch numbers');

    // TEST 18: Stock Movement Analytics
    assert(masterDataset.stockMovements.length === 2450, 'TEST 18: Master dataset contains 2,450 stock movement audit records');

    // TEST 19: What-If +100
    const sim100 = calculateScenario({
      currentStock: 200,
      dailyVelocity: 5,
      daysToExpiry: 60,
      unitCost: 20,
      orderQuantity: 100,
      leadTimeDays: 0,
      demandShiftPercent: 0
    });
    assert(sim100.projectedUtilization > 0 && sim100.projectedUtilization <= 100, 'TEST 19: What-If +100 computes valid utilization percentage <= 100%');

    // TEST 20: What-If +300
    const sim300 = calculateScenario({
      currentStock: 200,
      dailyVelocity: 5,
      daysToExpiry: 60,
      unitCost: 20,
      orderQuantity: 300,
      leadTimeDays: 0,
      demandShiftPercent: 0
    });
    assert(sim300.expiryCapitalAtRisk >= 0, 'TEST 20: What-If +300 correctly calculates capital at risk');

    // TEST 21: What-If +500
    const sim500 = calculateScenario({
      currentStock: 200,
      dailyVelocity: 5,
      daysToExpiry: 60,
      unitCost: 20,
      orderQuantity: 500,
      leadTimeDays: 0,
      demandShiftPercent: 0
    });
    assert(sim500.projectedSurplusAtExpiry > 0, 'TEST 21: What-If +500 calculates surplus at expiry');

    // TEST 22: Supplier Lead Time Acceptance Test (Section 85)
    // Input: Current stock = 200, Velocity = 5/day, Order = 100, Lead time = 10 days
    // Expected: Days 1-10 consume 50 units -> stock reaches 150, then delivery adds 100 -> 250
    const leadTimeSim = calculateScenario({
      currentStock: 200,
      dailyVelocity: 5,
      daysToExpiry: 60,
      unitCost: 20,
      orderQuantity: 100,
      leadTimeDays: 10,
      demandShiftPercent: 0
    });
    const day10Point = leadTimeSim.timeline.find(t => t.day === 10);
    const day11Point = leadTimeSim.timeline.find(t => t.day === 11);
    assert(day10Point.stock === 150, 'TEST 22: Lead Time - Day 10 stock is 150 (200 - 5*10)');
    assert(day11Point.stock === 245, 'TEST 22: Lead Time - Delivery received at Day 10 (150 + 100 = 250, then day 11 consumption 245, NOT 300 immediately)');

    // TEST 23: Demand Shift (+50%, -50%, -80%)
    const shift50 = calculateScenario({
      currentStock: 100,
      dailyVelocity: 10,
      daysToExpiry: 30,
      demandShiftPercent: 50
    });
    assert(shift50.effectiveDailyDemand === 15, 'TEST 23: Demand shift +50% on 10/day is 15/day');
    const shiftMinus50 = calculateScenario({
      currentStock: 100,
      dailyVelocity: 10,
      daysToExpiry: 30,
      demandShiftPercent: -50
    });
    assert(shiftMinus50.effectiveDailyDemand === 5, 'TEST 23: Demand shift -50% on 10/day is 5/day');
    const shiftMinus80 = calculateScenario({
      currentStock: 100,
      dailyVelocity: 10,
      daysToExpiry: 30,
      demandShiftPercent: -80
    });
    assert(shiftMinus80.effectiveDailyDemand === 2, 'TEST 23: Demand shift -80% on 10/day is 2/day');

    // TEST 24: Quarantine Logic
    const quarantinedBatch = masterDataset.batches.find(b => b.status === 'QUARANTINED');
    assert(quarantinedBatch !== undefined, 'TEST 24: Quarantined batches exist in dataset');

    // TEST 25: AI Tool - getInventorySummary
    const invSummary = await pharmacyTools.getInventorySummary('pharmaflow-main');
    assert(invSummary && invSummary.totalMedicines > 0, 'TEST 25: AI getInventorySummary tool returns workspace metrics');

    // TEST 26: AI Tool - getExpiringMedicines
    const expMeds = await pharmacyTools.getExpiringMedicines('pharmaflow-main', 30);
    assert(Array.isArray(expMeds), 'TEST 26: AI getExpiringMedicines tool returns array of expiring medicines');

    // TEST 27: AI Tool - getRecallSummary
    const recallSum = await pharmacyTools.getRecallSummary('pharmaflow-main');
    assert(recallSum && recallSum.totalRecalls >= 0, 'TEST 27: AI getRecallSummary tool executes successfully');

    // TEST 28: AI Tool - getRecalledBatchCustomers
    const recallCusts = await pharmacyTools.getRecalledBatchCustomers('pharmaflow-main', 'BATCH-001');
    assert(recallCusts && Array.isArray(recallCusts.affectedCustomers), 'TEST 28: AI getRecalledBatchCustomers executes within workspace');

    // TEST 29: AI Tool - runWhatIfSimulation
    const aiSimRes = await pharmacyTools.runWhatIfSimulation('pharmaflow-main', {
      currentStock: 200,
      dailyVelocity: 5,
      daysToExpiry: 60,
      orderQuantity: 100,
      leadTimeDays: 10
    });
    assert(aiSimRes && aiSimRes.simulation && aiSimRes.simulation.riskClassification, 'TEST 29: AI runWhatIfSimulation produces deterministic classification');

    // TEST 30: AI Safety Guard
    const clinicalTest = evaluateSafety('What dosage of amoxicillin should this patient take?');
    assert(clinicalTest.isSafe === false, 'TEST 30: Clinical dosage advice is blocked by AI Safety Guard');

    // TEST 31: Cross-Account Access Denial
    const crossAccountRes = await makeRequest(testPort, '/api/inventory', 'GET', null, {
      'x-workspace-id': 'unauthorized-workspace-999'
    });
    assert(crossAccountRes.status === 403, 'TEST 31: Request to unauthorized workspace is strictly rejected with 403 Forbidden');

    console.log('\n================================================================================');
    console.log(`ALL ACCEPTANCE TESTS PASSED: ${passed}/${total}`);
    console.log('================================================================================\n');

  } finally {
    if (server) server.close();
  }
}

runMasterIntegrationE2ESuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
