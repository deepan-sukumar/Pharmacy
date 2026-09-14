const assert = require('assert');
const {
  validateIndianPhoneNumber,
  buildIdempotencyKey,
  sendSms,
  sendManualSms,
  sendRecallNotificationToAffectedCustomers,
  checkSmsDeliveryStatus,
  syncAllPendingSmsStatuses,
  processDeliveryStatusCallback,
  getSmsReports,
  checkSmsLocalCredits
} = require('../services/smsService');
const { runNotificationCycle } = require('../services/schedulerService');

let passedTests = 0;
let totalTests = 0;

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

async function runAllTests() {
  console.log('🧪 Starting SMS Automation & Real Delivery Lifecycle Tests...\n');

  // Test 1: Indian Phone Number Normalization & Validation
  await test('Phone Normalization: correctly formats 10-digit number for SMSLocal REST endpoint', async () => {
    const rawNumbers = [
      { input: '9384599028', expectedNational: '9384599028', expectedE164: '+919384599028' },
      { input: '+91 90802 04902', expectedNational: '9080204902', expectedE164: '+919080204902' },
      { input: '+918098851999', expectedNational: '8098851999', expectedE164: '+918098851999' },
      { input: '09384599028', expectedNational: '9384599028', expectedE164: '+919384599028' }
    ];

    for (const item of rawNumbers) {
      const res = validateIndianPhoneNumber(item.input);
      assert.strictEqual(res.isValid, true, `Expected ${item.input} to be valid`);
      assert.strictEqual(res.national, item.expectedNational, `Expected national format ${item.expectedNational}`);
      assert.strictEqual(res.e164, item.expectedE164, `Expected E164 format ${item.expectedE164}`);
    }

    const invalid = validateIndianPhoneNumber('12345');
    assert.strictEqual(invalid.isValid, false, 'Expected 12345 to be invalid');
  });

  // Test 2: Initial Dispatch Status is submitted / pending (NEVER fake delivered)
  await test('Dispatch Status Integrity: Gateway accept returns "submitted", NEVER "delivered"', async () => {
    const res = await sendSms({
      pharmacyId: 'DEMO_PHARMACY',
      recipientName: 'Deepak',
      recipientPhone: '9384599028',
      notificationType: 'NEAR_EXPIRY',
      batchId: 'DEMO-EXP-001',
      variables: { medicine: 'Amoxicillin 500mg', batch: 'DEMO-EXP-001', expiry: '2026-04-14' },
      notificationSource: 'automatic',
      overrideDuplicateCheck: true
    });

    assert.strictEqual(res.success, true, 'SMS should be accepted by gateway');
    assert.ok(res.providerMessageId, 'Provider message ID must be present');
    assert.strictEqual(res.status, 'submitted', 'Status must be "submitted", NOT "delivered"');
    assert.strictEqual(res.isSandbox, true, 'Sandbox gateway should be flagged');
  });

  // Test 3: Real Delivery Webhook Lifecycle Updates Status to "delivered"
  await test('Delivery Report Webhook: updates status to "delivered" only on carrier confirmation', async () => {
    const sendRes = await sendSms({
      pharmacyId: 'DEMO_PHARMACY',
      recipientName: 'Manish',
      recipientPhone: '9080204902',
      notificationType: 'NEAR_EXPIRY',
      batchId: 'DEMO-EXP-001',
      variables: { medicine: 'Amoxicillin 500mg', batch: 'DEMO-EXP-001', expiry: '2026-04-14' },
      notificationSource: 'automatic',
      overrideDuplicateCheck: true
    });

    const msgId = sendRes.providerMessageId;
    assert.ok(msgId, 'Message ID must exist');

    // Simulate SMSLocal carrier webhook callback
    const webhookRes = await processDeliveryStatusCallback({
      messageId: msgId,
      status: 'DELIVRD',
      deliveredAt: new Date().toISOString()
    });

    assert.strictEqual(webhookRes.success, true, 'Webhook processing should succeed');
    assert.strictEqual(webhookRes.status, 'delivered', 'Status must transition to "delivered"');

    // Check delivery status query
    const statusQuery = await checkSmsDeliveryStatus(msgId);
    assert.strictEqual(statusQuery.status, 'delivered', 'DLR query must reflect delivered status');
  });

  // Test 4: Provider Failure Handling Maps to "failed" (Never Delivered)
  await test('Failure Handling: Carrier rejection maps to "failed" with error reason', async () => {
    const sendRes = await sendSms({
      pharmacyId: 'DEMO_PHARMACY',
      recipientName: 'Deeps',
      recipientPhone: '8098851999',
      notificationType: 'NEAR_EXPIRY',
      batchId: 'DEMO-EXP-001',
      variables: { medicine: 'Amoxicillin 500mg', batch: 'DEMO-EXP-001', expiry: '2026-04-14' },
      notificationSource: 'automatic',
      overrideDuplicateCheck: true
    });

    const msgId = sendRes.providerMessageId;

    // Simulate SMSLocal failed callback (e.g. absent subscriber / network timeout)
    const webhookRes = await processDeliveryStatusCallback({
      messageId: msgId,
      status: 'UNDELIV',
      errorMessage: 'Absent subscriber / handset unreachable'
    });

    assert.strictEqual(webhookRes.success, true, 'Webhook processing should succeed');
    assert.strictEqual(webhookRes.status, 'failed', 'Status must transition to "failed"');
  });

  // Test 5: Automatic Batch Recall Notification Traces & Sends SMS with Zero Extra Confirmation
  await test('Automatic Batch Recall: traces dispensed patients and automatically dispatches recall SMS', async () => {
    const recallResult = await sendRecallNotificationToAffectedCustomers('DEMO_PHARMACY', 'DEMO-EXP-001', 'Critical safety bulletin');
    assert.strictEqual(recallResult.batch, 'DEMO-EXP-001');
    assert.ok(recallResult.dispatchedCount >= 3, `Expected at least 3 affected patients notified, got ${recallResult.dispatchedCount}`);
    
    for (const r of recallResult.results) {
      assert.ok(['Deepak', 'Manish', 'Deeps'].includes(r.customer), `Customer ${r.customer} should be in affected list`);
      assert.strictEqual(r.status, 'submitted', 'Initial recall SMS status must be submitted');
      assert.ok(r.providerMessageId, 'Provider message ID must be recorded');
    }
  });

  // Test 6: Idempotent Duplicate Prevention
  await test('Idempotency: Prevents duplicate automatic SMS within active deduplication window', async () => {
    const run1 = await sendSms({
      pharmacyId: 'DEMO_PHARMACY',
      recipientName: 'IdempotencyTestPatient',
      recipientPhone: '9384599028',
      notificationType: 'NEAR_EXPIRY',
      batchId: 'BATCH-TEST-IDEMPOTENT-01',
      variables: { medicine: 'Amoxicillin 500mg', batch: 'BATCH-TEST-IDEMPOTENT-01', expiry: '2026-04-14' },
      notificationSource: 'automatic',
      overrideDuplicateCheck: false
    });
    assert.strictEqual(run1.success, true, 'First send should succeed');

    const run2 = await sendSms({
      pharmacyId: 'DEMO_PHARMACY',
      recipientName: 'IdempotencyTestPatient',
      recipientPhone: '9384599028',
      notificationType: 'NEAR_EXPIRY',
      batchId: 'BATCH-TEST-IDEMPOTENT-01',
      variables: { medicine: 'Amoxicillin 500mg', batch: 'BATCH-TEST-IDEMPOTENT-01', expiry: '2026-04-14' },
      notificationSource: 'automatic',
      overrideDuplicateCheck: false
    });
    assert.strictEqual(run2.success, false, 'Second automatic send should be blocked by idempotency');
    assert.strictEqual(run2.isDuplicate, true, 'isDuplicate must be true');
  });

  // Test 7: Manual Resend Dispatches New Attempt Record
  await test('Manual SMS Resend: allows pharmacist to re-trigger SMS with override', async () => {
    const manualRes = await sendManualSms({
      pharmacyId: 'DEMO_PHARMACY',
      recipientName: 'Deepak',
      recipientPhone: '9384599028',
      notificationType: 'NEAR_EXPIRY',
      batchId: 'DEMO-EXP-001',
      variables: { medicine: 'Amoxicillin 500mg', batch: 'DEMO-EXP-001', expiry: '2026-04-14' }
    });

    assert.strictEqual(manualRes.success, true, 'Manual send must succeed even if duplicate');
    assert.strictEqual(manualRes.notification.notificationSource, 'manual', 'Must be flagged as manual');
  });

  // Test 8: SMS Reports Metrics Separation & Accurate Delivery Rate
  await test('SMS Reports Metrics: correctly separates Submitted vs Carrier Delivered', async () => {
    const reports = await getSmsReports('DEMO_PHARMACY');
    assert.ok(reports.summary.totalSms >= 5, 'Total SMS count should be recorded');
    assert.ok(reports.summary.submitted >= 0, 'Submitted count exists');
    assert.ok(reports.summary.delivered >= 1, 'At least 1 verified delivered SMS exists');
    assert.ok(reports.summary.automaticCount >= 1, 'Automatic SMS count exists');
    assert.ok(reports.summary.manualCount >= 1, 'Manual SMS count exists');
  });

  // Test 9: SMSLocal Credits Helper
  await test('SMSLocal Credits: checks credit balance safely', async () => {
    const credits = await checkSmsLocalCredits();
    assert.ok(credits.provider, 'Provider must be named');
    assert.ok(credits.credits >= 0, 'Credits must be non-negative');
    assert.strictEqual(credits.isSufficient, true, 'Credits should be sufficient in sandbox/test');
  });

  // Test 10: Automatic Notification Cycle Integration
  await test('Scheduler: runNotificationCycle executes near-expiry and recall checks automatically', async () => {
    const cycleRes = await runNotificationCycle('DEMO_PHARMACY');
    assert.strictEqual(cycleRes.success, true, 'Scheduler cycle must execute successfully');
    assert.ok(cycleRes.summary.nearExpiryProcessed >= 1, 'Near-expiry batches should be processed');
  });

  console.log(`\n🎉 All ${passedTests}/${totalTests} SMS Automation & Real Delivery tests passed successfully!\n`);
}

runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
