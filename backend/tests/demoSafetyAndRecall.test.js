/**
 * Integration Test Suite: Demo Customers, Expiry SMS, and Batch Recall Safety
 * 
 * Verifies:
 * 1. Demo Login & Demo Pharmacy Workspace
 * 2. Presence of Deepak (9384599028), Manish (9080204902), Deeps (8098851999)
 * 3. Batch DEMO-EXP-001 with dynamic 30-day expiry
 * 4. Traceable Dispensing Audit Trail connecting DEMO-EXP-001 to Deepak (10), Manish (5), Deeps (8)
 * 5. Automatic & Manual Expiry SMS Workflows
 * 6. Batch Recall Containment & POS Dispensing Hard-Lock
 * 7. Affected Customer Identification from Dispensing History
 * 8. Recall SMS Broadcast with Individual Delivery
 * 9. Idempotent Database Seeding (Zero Duplicates)
 * 10. Multi-Tenant Isolation (No Leakage to Other Pharmacies)
 */

const assert = require('assert');
const http = require('http');
const app = require('../index');

let server;
const PORT = 5055;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
  console.log('\n🧪 Running Demo Customers, Expiry SMS & Batch Recall Test Suite...\n');
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(`     Error: ${err.message}`);
      if (err.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    }
  }

  // Helper fetcher
  async function api(path, options = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, ok: res.ok, data };
  }

  // Start temporary server
  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });

  // Ensure initial seed is loaded
  await api('/api/seed', { method: 'POST' });

  try {
    // TEST 1: Login as demo account
    await test('TEST 1: Login as pharmacist@demo.com returns DEMO_PHARMACY', async () => {
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'pharmacist@demo.com', password: 'demo123' })
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.isDemo, true);
      assert.strictEqual(res.data.user.pharmacyId, 'DEMO_PHARMACY');
    });

    // TEST 2 & 3: Deepak, Manish, Deeps customer records and phone numbers
    await test('TEST 2 & 3: Demo customers Deepak, Manish, and Deeps exist with exact mobile numbers', async () => {
      const res = await api('/api/customers', {
        headers: { 'x-pharmacy-id': 'DEMO_PHARMACY' }
      });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data));

      const deepak = res.data.find(c => c.name === 'Deepak');
      const manish = res.data.find(c => c.name === 'Manish');
      const deeps = res.data.find(c => c.name === 'Deeps');

      assert.ok(deepak, 'Customer Deepak not found in DEMO_PHARMACY');
      assert.ok(deepak.phone.includes('9384599028') || deepak.phone.includes('93845 99028'), `Deepak phone incorrect: ${deepak.phone}`);

      assert.ok(manish, 'Customer Manish not found in DEMO_PHARMACY');
      assert.ok(manish.phone.includes('9080204902') || manish.phone.includes('90802 04902'), `Manish phone incorrect: ${manish.phone}`);

      assert.ok(deeps, 'Customer Deeps not found in DEMO_PHARMACY');
      assert.ok(deeps.phone.includes('8098851999') || deeps.phone.includes('80988 51999'), `Deeps phone incorrect: ${deeps.phone}`);
    });

    // TEST 4 & 5: Batch DEMO-EXP-001 exists with dynamic 30-day expiry
    await test('TEST 4 & 5: Batch DEMO-EXP-001 exists and has dynamic near-expiry date', async () => {
      const res = await api('/api/inventory', {
        headers: { 'x-pharmacy-id': 'DEMO_PHARMACY' }
      });
      assert.strictEqual(res.status, 200);
      const batchExp = res.data.find(m => m.batch === 'DEMO-EXP-001');
      assert.ok(batchExp, 'Batch DEMO-EXP-001 not found in inventory');
      assert.ok(batchExp.quantity > 0, 'DEMO-EXP-001 has no stock');
      assert.strictEqual(batchExp.status, 'Near Expiry');
    });

    // TEST 6: Dispensing history connects DEMO-EXP-001 to Deepak (10), Manish (5), Deeps (8)
    await test('TEST 6: Dispensing audits link DEMO-EXP-001 to Deepak (10), Manish (5), Deeps (8)', async () => {
      const res = await api('/api/audits', {
        headers: { 'x-pharmacy-id': 'DEMO_PHARMACY' }
      });
      assert.strictEqual(res.status, 200);
      const batchAudits = res.data.filter(a => a.batch === 'DEMO-EXP-001');
      assert.strictEqual(batchAudits.length, 3, `Expected 3 dispensing records for DEMO-EXP-001, got ${batchAudits.length}`);

      const deepakAudit = batchAudits.find(a => a.customer === 'Deepak');
      const manishAudit = batchAudits.find(a => a.customer === 'Manish');
      const deepsAudit = batchAudits.find(a => a.customer === 'Deeps');

      assert.ok(deepakAudit, 'Deepak dispensing audit not found');
      assert.strictEqual(deepakAudit.quantity, 10);

      assert.ok(manishAudit, 'Manish dispensing audit not found');
      assert.strictEqual(manishAudit.quantity, 5);

      assert.ok(deepsAudit, 'Deeps dispensing audit not found');
      assert.strictEqual(deepsAudit.quantity, 8);
    });

    // TEST 7 & 8: Expiry Notification traces affected customers from audit history
    await test('TEST 7 & 8: Expiry checking traces Deepak, Manish, and Deeps from dispensing audit trail', async () => {
      const res = await api('/api/recalls/DEMO-EXP-001/affected-customers', {
        headers: { 'x-pharmacy-id': 'DEMO_PHARMACY' }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.batch, 'DEMO-EXP-001');
      assert.ok(Array.isArray(res.data.affectedPatients));
      assert.strictEqual(res.data.affectedPatients.length, 3);

      const names = res.data.affectedPatients.map(p => p.customerName);
      assert.ok(names.includes('Deepak'));
      assert.ok(names.includes('Manish'));
      assert.ok(names.includes('Deeps'));
    });

    // TEST 9, 10, 11: Manual SMS dispatch and status logging
    await test('TEST 9, 10, 11: Manual SMS dispatch records provider response and logs notification', async () => {
      const res = await api('/api/sms/send-manual', {
        method: 'POST',
        headers: { 'x-pharmacy-id': 'DEMO_PHARMACY' },
        body: JSON.stringify({
          customer: 'Deepak',
          phone: '9384599028',
          notificationType: 'NEAR_EXPIRY',
          medicine: 'Amoxicillin 500mg',
          batch: 'DEMO-EXP-001',
          language: 'English'
        })
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(res.data.providerMessageId, 'Provider message ID missing');

      // Verify appearance in SMS reports
      const reportsRes = await api('/api/sms/reports', {
        headers: { 'x-pharmacy-id': 'DEMO_PHARMACY' }
      });
      assert.strictEqual(reportsRes.status, 200);
      const deepakSms = reportsRes.data.logs.find(l => l.recipientName === 'Deepak');
      assert.ok(deepakSms, 'Deepak SMS log not found in reports');
    });

    // TEST 12 & 13: Batch Recall on DEMO-EXP-001 updates status to Recalled
    await test('TEST 12 & 13: Issuing Batch Recall marks DEMO-EXP-001 as Recalled & Quarantined', async () => {
      const res = await api('/api/recalls', {
        method: 'POST',
        headers: { 'x-pharmacy-id': 'DEMO_PHARMACY' },
        body: JSON.stringify({
          batch: 'DEMO-EXP-001',
          reason: 'Packaging seal defect reported by manufacturer bulletin'
        })
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.batch, 'DEMO-EXP-001');
      assert.strictEqual(res.data.status, 'Quarantined');

      // Verify inventory updated to Recalled
      const invRes = await api('/api/inventory', {
        headers: { 'x-pharmacy-id': 'DEMO_PHARMACY' }
      });
      const med = invRes.data.find(m => m.batch === 'DEMO-EXP-001');
      assert.ok(med);
      assert.strictEqual(med.status, 'Recalled');
    });

    // TEST 14: POS Dispensing is hard-blocked for recalled batch
    await test('TEST 14: Hard block prevents POS dispensing of recalled batch DEMO-EXP-001', async () => {
      const res = await api('/api/dispensing', {
        method: 'POST',
        headers: { 'x-pharmacy-id': 'DEMO_PHARMACY' },
        body: JSON.stringify({
          medicine: 'Amoxicillin 500mg',
          batch: 'DEMO-EXP-001',
          quantity: 2,
          customer: 'Walk-in Patient',
          pharmacist: 'Demo Pharmacist'
        })
      });
      assert.strictEqual(res.status, 400);
      assert.ok(
        res.data.error.includes('RECALLED') || res.data.error.includes('blocked') || res.data.error.includes('quarantined'),
        `Expected recall block error, got: ${res.data.error}`
      );
    });

    // TEST 15 & 16: Recall SMS Broadcast sends individual messages to Deepak, Manish, Deeps
    await test('TEST 15 & 16: Recall SMS broadcast notifies only customers who received the batch', async () => {
      const res = await api('/api/sms/recall-broadcast', {
        method: 'POST',
        headers: { 'x-pharmacy-id': 'DEMO_PHARMACY' },
        body: JSON.stringify({
          batch: 'DEMO-EXP-001',
          reason: 'Urgent manufacturer recall notice'
        })
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.dispatchedCount, 3);
      assert.ok(Array.isArray(res.data.results));
      assert.strictEqual(res.data.results.length, 3);

      const recipientNames = res.data.results.map(r => r.customer);
      assert.ok(recipientNames.includes('Deepak'));
      assert.ok(recipientNames.includes('Manish'));
      assert.ok(recipientNames.includes('Deeps'));
    });

    // TEST 17: SMS Reports show activity
    await test('TEST 17: SMS Reports record all manual, automatic, and recall notifications', async () => {
      const res = await api('/api/sms/reports', {
        headers: { 'x-pharmacy-id': 'DEMO_PHARMACY' }
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.summary.totalSms >= 4);
      assert.ok(res.data.summary.sent >= 4);
    });

    // TEST 18: Idempotent Seed function does not create duplicate records
    await test('TEST 18: Running seed function again produces NO duplicate customers, batches, or audits', async () => {
      const seedRes = await api('/api/seed', { method: 'POST' });
      assert.strictEqual(seedRes.status, 200);

      // Verify customers count
      const custRes = await api('/api/customers', {
        headers: { 'x-pharmacy-id': 'DEMO_PHARMACY' }
      });
      const deepakMatches = custRes.data.filter(c => c.name === 'Deepak');
      assert.strictEqual(deepakMatches.length, 1, 'Duplicate Deepak customer records found!');

      // Verify batch count
      const invRes = await api('/api/inventory', {
        headers: { 'x-pharmacy-id': 'DEMO_PHARMACY' }
      });
      const batchMatches = invRes.data.filter(m => m.batch === 'DEMO-EXP-001');
      assert.strictEqual(batchMatches.length, 1, 'Duplicate DEMO-EXP-001 batch records found!');

      // Verify audit count
      const auditRes = await api('/api/audits', {
        headers: { 'x-pharmacy-id': 'DEMO_PHARMACY' }
      });
      const auditMatches = auditRes.data.filter(a => a.batch === 'DEMO-EXP-001' && a.customer === 'Deepak');
      assert.strictEqual(auditMatches.length, 1, 'Duplicate Deepak dispensing audit records found!');
    });

    // TEST 19: Multi-tenant isolation is preserved
    await test('TEST 19: New tenant workspace is isolated and does not see demo test customers or batch', async () => {
      const newPharmacyId = `tenant_${Date.now()}`;
      const invRes = await api('/api/inventory', {
        headers: { 'x-pharmacy-id': newPharmacyId }
      });
      assert.strictEqual(invRes.status, 200);
      assert.strictEqual(invRes.data.length, 0, 'New tenant should see 0 medicines');

      const custRes = await api('/api/customers', {
        headers: { 'x-pharmacy-id': newPharmacyId }
      });
      assert.strictEqual(custRes.status, 200);
      assert.strictEqual(custRes.data.length, 0, 'New tenant should see 0 customers');
    });

  } finally {
    if (server) {
      await new Promise(r => server.close(r));
    }
  }

  console.log(`\n🎉 Safety & Recall Test Suite Completed: ${passed}/${total} tests passed.\n`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
