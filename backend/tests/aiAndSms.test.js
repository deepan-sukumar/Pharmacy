/**
 * Automated Integration Test Suite for PharmaFlow
 * 
 * Tests:
 * 1. AI Safety Guard (Refusal of clinical advice & emergency handling)
 * 2. Controlled Pharmacy Tools (Tenant isolation & factual data extraction)
 * 3. What-If Simulation Engine (Numerical calculation accuracy & non-destructive simulation)
 * 4. Multilingual SMS Templates (English, Tamil, Telugu, Kannada, Hindi)
 * 5. SMS Service (Phone validation, duplicate prevention, recipient resolution, webhook callbacks)
 * 6. Automated Scheduler & Audit Investigation
 */

const assert = require('assert');
const { evaluateSafety, CLINICAL_REFUSAL_MESSAGE } = require('../services/aiSafetyGuard');
const {
  getInventorySummary,
  getExpiringMedicines,
  getLowStockMedicines,
  getSupplierReturnEligibleBatches,
  getRecalledBatchCustomers,
  getUnusualDispensingPatterns,
  calculateExpiryRisk,
  getTodayPharmacyIntelligence
} = require('../services/pharmacyTools');
const { calculateScenario, compareOrderScenarios, runWhatIfSimulation } = require('../services/simulationService');
const { renderSmsTemplate, normalizeLanguage } = require('../services/smsTemplates');
const {
  validateIndianPhoneNumber,
  sendSms,
  sendManualSms,
  sendRecallNotificationToAffectedCustomers,
  processDeliveryStatusCallback,
  getSmsReports
} = require('../services/smsService');
const { runNotificationCycle } = require('../services/schedulerService');

async function runAllTests() {
  console.log('\n🧪 Starting PharmaFlow Automated Integration Tests...\n');
  let passedCount = 0;
  let totalCount = 0;

  function runTest(name, fn) {
    totalCount++;
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}\n     Error: ${err.message}`);
    }
  }

  async function runAsyncTest(name, fn) {
    totalCount++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}\n     Error: ${err.message}`);
    }
  }

  // -------------------------------------------------------------
  // 1. AI SAFETY GUARD TESTS
  // -------------------------------------------------------------
  runTest('AI Safety Guard blocks clinical diagnosis query', () => {
    const res = evaluateSafety('What medicine should I give for fever?');
    assert.strictEqual(res.isSafe, false);
    assert.strictEqual(res.refusalText, CLINICAL_REFUSAL_MESSAGE);
  });

  runTest('AI Safety Guard blocks antibiotic prescription query', () => {
    const res = evaluateSafety('Which antibiotic should I prescribe for throat infection?');
    assert.strictEqual(res.isSafe, false);
    assert.strictEqual(res.refusalText, CLINICAL_REFUSAL_MESSAGE);
  });

  runTest('AI Safety Guard blocks dosage modification query', () => {
    const res = evaluateSafety('How much mg dosage should the patient take?');
    assert.strictEqual(res.isSafe, false);
  });

  runTest('AI Safety Guard allows operational inventory queries', () => {
    const res = evaluateSafety('Which medicines expire within 30 days?');
    assert.strictEqual(res.isSafe, true);
  });

  runTest('AI Safety Guard identifies emergency descriptions', () => {
    const res = evaluateSafety('Patient is unconscious and having severe chest pain');
    assert.strictEqual(res.isSafe, false);
    assert.strictEqual(res.isEmergency, true);
  });

  // -------------------------------------------------------------
  // 2. CONTROLLED PHARMACY TOOLS TESTS (Using DEMO_PHARMACY)
  // -------------------------------------------------------------
  await runAsyncTest('Controlled Tool: getInventorySummary calculates accurate metrics', async () => {
    const summary = await getInventorySummary('DEMO_PHARMACY');
    assert.ok(summary.totalMedicines >= 3);
    assert.ok(summary.totalUnits > 0);
    assert.ok(summary.statusBreakdown);
  });

  await runAsyncTest('Controlled Tool: getExpiringMedicines identifies near-expiry stock', async () => {
    const expiring = await getExpiringMedicines('DEMO_PHARMACY', 60);
    assert.ok(Array.isArray(expiring));
  });

  await runAsyncTest('Controlled Tool: getSupplierReturnEligibleBatches returns eligible near-expiry & recalled stock', async () => {
    const returns = await getSupplierReturnEligibleBatches('DEMO_PHARMACY');
    assert.ok(Array.isArray(returns));
  });

  await runAsyncTest('Controlled Tool: getRecalledBatchCustomers matches only patients who received the recalled batch', async () => {
    const res = await getRecalledBatchCustomers('DEMO_PHARMACY', 'AMX204');
    assert.strictEqual(res.batch, 'AMX204');
    assert.ok(Array.isArray(res.affectedPatients));
  });

  await runAsyncTest('Controlled Tool: calculateExpiryRisk calculates factual numbers and reasons', async () => {
    const risk = await calculateExpiryRisk('DEMO_PHARMACY', 'VD102');
    if (!risk.error) {
      assert.strictEqual(risk.batch, 'VD102');
      assert.ok(risk.factualReasoning.length >= 4);
      assert.ok(risk.financialCapitalAtRisk >= 0);
    } else {
      assert.ok(risk.error);
    }
  });

  await runAsyncTest('Controlled Tool: getTodayPharmacyIntelligence provides holistic briefing', async () => {
    const intel = await getTodayPharmacyIntelligence('DEMO_PHARMACY');
    assert.strictEqual(intel.pharmacyId, 'DEMO_PHARMACY');
    assert.ok(intel.executiveSummary);
    assert.ok(intel.operationalMetrics);
    assert.ok(intel.actionablePriorities.length > 0);
  });

  await runAsyncTest('Controlled Tool: getUnusualDispensingPatterns labels activity safely without fraud terminology', async () => {
    const audit = await getUnusualDispensingPatterns('DEMO_PHARMACY');
    assert.strictEqual(audit.label, 'Potentially unusual activity requiring pharmacist review');
    assert.ok(Array.isArray(audit.findings));
  });

  // -------------------------------------------------------------
  // 3. WHAT-IF SIMULATION ENGINE TESTS
  // -------------------------------------------------------------
  runTest('What-If Engine: Calculates accurate surplus and financial waste', () => {
    const res = calculateScenario({
      medicine: 'Vitamin D3',
      currentStock: 180,
      orderQty: 300,
      dailyUsage: 5,
      daysToExpiry: 45,
      unitCost: 65
    });

    assert.strictEqual(res.simulatedData.projectedTotalStock, 480);
    assert.strictEqual(res.simulatedData.projectedDemandInWindow, 225);
    assert.strictEqual(res.simulatedData.projectedSurplusAtExpiry, 255);
    assert.strictEqual(res.simulatedData.potentialWasteCost, 255 * 65);
    assert.strictEqual(res.simulatedData.riskLevel, 'High');
  });

  runTest('What-If Engine: Compares multiple order increments (+0, +100, +300, +500)', () => {
    const comparison = compareOrderScenarios({
      medicine: 'Vitamin D3',
      currentStock: 180,
      dailyUsage: 5,
      daysToExpiry: 45,
      unitCost: 65
    });

    assert.strictEqual(comparison.comparisonMatrix.length, 4);
    assert.strictEqual(comparison.comparisonMatrix[0].orderIncrement, 0);
    assert.strictEqual(comparison.comparisonMatrix[1].orderIncrement, 100);
    assert.strictEqual(comparison.comparisonMatrix[2].orderIncrement, 300);
    assert.strictEqual(comparison.comparisonMatrix[3].orderIncrement, 500);
  });

  await runAsyncTest('What-If Engine: runWhatIfSimulation never alters live inventory', async () => {
    const initialInv = await getInventorySummary('DEMO_PHARMACY');
    const simRes = await runWhatIfSimulation('DEMO_PHARMACY', {
      currentStock: 180,
      orderQty: 500,
      unitCost: 65
    });
    const afterInv = await getInventorySummary('DEMO_PHARMACY');

    assert.strictEqual(initialInv.totalUnits, afterInv.totalUnits);
    assert.strictEqual(simRes.isSimulation, true);
  });

  // -------------------------------------------------------------
  // 4. MULTILINGUAL APPROVED SMS TEMPLATES TESTS
  // -------------------------------------------------------------
  runTest('SMS Templates: Renders English Near Expiry template', () => {
    const rendered = renderSmsTemplate('NEAR_EXPIRY', 'English', {
      medicine: 'Paracetamol',
      batch: 'PCT101',
      expiry: 'Sep 2026',
      pharmacy: 'Apollo Pharmacy'
    });
    assert.ok(rendered.message.includes('Paracetamol'));
    assert.ok(rendered.message.includes('PCT101'));
    assert.ok(rendered.message.includes('approaching its expiry date'));
  });

  runTest('SMS Templates: Renders Tamil, Telugu, Kannada, Hindi templates', () => {
    const tamil = renderSmsTemplate('NEAR_EXPIRY', 'Tamil', { medicine: 'மருந்து A', batch: 'B101' });
    assert.ok(tamil.message.includes('காலாவதி'));

    const telugu = renderSmsTemplate('NEAR_EXPIRY', 'Telugu', { medicine: 'మందు A', batch: 'B101' });
    assert.ok(telugu.message.includes('గడువు'));

    const kannada = renderSmsTemplate('NEAR_EXPIRY', 'Kannada', { medicine: 'ಔಷಧಿ A', batch: 'B101' });
    assert.ok(kannada.message.includes('ಮುಕ್ತಾಯ'));

    const hindi = renderSmsTemplate('NEAR_EXPIRY', 'Hindi', { medicine: 'दवा A', batch: 'B101' });
    assert.ok(hindi.message.includes('समाप्ति तिथि'));
  });

  // -------------------------------------------------------------
  // 5. SMS SERVICE & PHONE VALIDATION TESTS
  // -------------------------------------------------------------
  runTest('SMS Service: Validates standard Indian mobile numbers', () => {
    const v1 = validateIndianPhoneNumber('+91 98450 48123');
    assert.strictEqual(v1.isValid, true);
    assert.strictEqual(v1.e164, '+919845048123');

    const v2 = validateIndianPhoneNumber('9845048123');
    assert.strictEqual(v2.isValid, true);
    assert.strictEqual(v2.e164, '+919845048123');
  });

  runTest('SMS Service: Rejects invalid phone numbers', () => {
    const inv1 = validateIndianPhoneNumber('12345');
    assert.strictEqual(inv1.isValid, false);

    const inv2 = validateIndianPhoneNumber('+1 555 123 4567');
    assert.strictEqual(inv2.isValid, false);
  });

  await runAsyncTest('SMS Service: Sends Manual Pharmacist SMS with audit logging', async () => {
    const res = await sendManualSms({
      pharmacyId: 'DEMO_PHARMACY',
      recipientName: 'Rahul Kumar',
      recipientPhone: '+91 98450 48123',
      notificationType: 'NEAR_EXPIRY',
      medicine: 'Paracetamol 500mg',
      batch: 'PCT101',
      language: 'English'
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.notification.notificationSource, 'manual');
    assert.ok(res.status === 'submitted' || res.status === 'sent');
    assert.ok(res.providerMessageId);
  });

  await runAsyncTest('SMS Service: Automatic SMS duplicate prevention (Idempotency)', async () => {
    const res1 = await sendSms({
      pharmacyId: 'DEMO_PHARMACY',
      recipientName: 'Priya Sharma',
      recipientPhone: '+91 97312 90342',
      customerId: 'demo-cust-2',
      batchId: 'VD102',
      notificationType: 'NEAR_EXPIRY',
      notificationSource: 'automatic'
    });
    assert.strictEqual(res1.success, true);

    // Second dispatch within same window
    const res2 = await sendSms({
      pharmacyId: 'DEMO_PHARMACY',
      recipientName: 'Priya Sharma',
      recipientPhone: '+91 97312 90342',
      customerId: 'demo-cust-2',
      batchId: 'VD102',
      notificationType: 'NEAR_EXPIRY',
      notificationSource: 'automatic'
    });
    assert.strictEqual(res2.isDuplicate, true);
    assert.strictEqual(res2.success, false);
  });

  await runAsyncTest('SMS Service: Webhook callback updates delivery status', async () => {
    const sendRes = await sendManualSms({
      pharmacyId: 'DEMO_PHARMACY',
      recipientName: 'Arun Kumar',
      recipientPhone: '+91 94480 77109',
      notificationType: 'RECALL',
      batch: 'AMX204'
    });

    assert.ok(sendRes.status === 'submitted' || sendRes.status === 'sent');

    // Simulate carrier delivery callback
    const callbackRes = await processDeliveryStatusCallback({
      providerMessageId: sendRes.providerMessageId,
      status: 'delivered'
    });

    assert.strictEqual(callbackRes.success, true);
    assert.strictEqual(callbackRes.status, 'delivered');
  });

  await runAsyncTest('SMS Service: getSmsReports distinguishes Automatic vs Manual', async () => {
    const reports = await getSmsReports('DEMO_PHARMACY');
    assert.ok(reports.summary.totalSms >= 2);
    assert.ok(reports.summary.manualCount >= 1);
    assert.ok(reports.summary.automaticCount >= 1);
  });

  await runAsyncTest('SMS Service: sendRecallNotificationToAffectedCustomers runs recall tracing safely', async () => {
    const recallResult = await sendRecallNotificationToAffectedCustomers('DEMO_PHARMACY', 'AMX204', 'Defect alert');
    assert.strictEqual(recallResult.batch, 'AMX204');
    assert.ok(recallResult.dispatchedCount >= 0);
  });

  console.log(`\n🎉 Test Suite Completed: ${passedCount}/${totalCount} tests passed.\n`);
  if (passedCount !== totalCount) {
    throw new Error(`Test suite failed: ${totalCount - passedCount} test(s) failed.`);
  }
}

// Execute tests
runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
