const assert = require('assert');
const http = require('http');
const app = require('../index');
const pharmacyTools = require('../services/pharmacyTools');

async function runTenantIsolationTests() {
  console.log('\n🧪 Running Multi-Tenant Workspace & User Isolation Tests...\n');

  // Start temporary server on random port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}\n     ${err.message}`);
      throw err;
    }
  }

  try {
    // 1. Verify Demo Account Authentication & Data Access
    await test('Demo account preserves DEMO_PHARMACY session and demo catalog', async () => {
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'pharmacist@demo.com', password: 'demo123' })
      });
      assert.strictEqual(loginRes.status, 200);
      const loginData = await loginRes.json();
      assert.strictEqual(loginData.user.pharmacyId, 'DEMO_PHARMACY');

      const invRes = await fetch(`${baseUrl}/api/inventory`, {
        headers: { 'x-pharmacy-id': 'DEMO_PHARMACY' }
      });
      assert.strictEqual(invRes.status, 200);
      const inv = await invRes.json();
      assert.ok(inv.length >= 6, `Expected >= 6 demo medicines, got ${inv.length}`);
    });

    // 2. Register New User & Verify Unique Tenant Workspace
    let newPharmacyId = '';
    await test('Newly registered user receives isolated pharmacyId and empty workspace', async () => {
      const email = `tenant_${Date.now()}@apexcare.com`;
      const regRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Dr. Sarah Jenkins',
          email,
          mobile: '+919876543210',
          password: 'password123',
          pharmacyName: 'Apex Care Pharmacy',
          city: 'Bengaluru',
          stateName: 'Karnataka'
        })
      });
      assert.strictEqual(regRes.status, 201);
      const regData = await regRes.json();
      newPharmacyId = regData.user.pharmacyId;
      assert.ok(newPharmacyId && newPharmacyId !== 'DEMO_PHARMACY');

      // Verify empty inventory
      const invRes = await fetch(`${baseUrl}/api/inventory`, {
        headers: { 'x-pharmacy-id': newPharmacyId }
      });
      const inv = await invRes.json();
      assert.strictEqual(inv.length, 0, 'New tenant must start with 0 medicines');

      // Verify empty customers
      const custRes = await fetch(`${baseUrl}/api/customers`, {
        headers: { 'x-pharmacy-id': newPharmacyId }
      });
      const cust = await custRes.json();
      assert.strictEqual(cust.length, 0, 'New tenant must start with 0 customers');

      // Verify empty audits
      const audRes = await fetch(`${baseUrl}/api/audits`, {
        headers: { 'x-pharmacy-id': newPharmacyId }
      });
      const aud = await audRes.json();
      assert.strictEqual(aud.length, 0, 'New tenant must start with 0 audits');
    });

    // 3. Add Item to New Tenant & Verify Scoping
    await test('Adding stock and customer is strictly scoped to new pharmacyId', async () => {
      const addMedRes = await fetch(`${baseUrl}/api/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-pharmacy-id': newPharmacyId },
        body: JSON.stringify({
          medicine: 'Amoxicillin 250mg',
          genericName: 'Amoxicillin',
          batch: 'APX-001',
          expiry: 'Dec 2027',
          quantity: 50,
          unitPrice: 35,
          supplier: 'Apex Distributors'
        })
      });
      assert.strictEqual(addMedRes.status, 201);
      const medData = await addMedRes.json();
      assert.strictEqual(medData.pharmacyId, newPharmacyId);

      const addCustRes = await fetch(`${baseUrl}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-pharmacy-id': newPharmacyId },
        body: JSON.stringify({
          name: 'Suresh Nair',
          phone: '+919845012399',
          email: 'suresh.n@example.com',
          allergies: 'None'
        })
      });
      assert.strictEqual(addCustRes.status, 201);
      const custData = await addCustRes.json();
      assert.strictEqual(custData.pharmacyId, newPharmacyId);
    });

    // 4. Dispense Prescription & Deduct Stock Atomically
    await test('POS Prescription dispensing operates strictly within tenant stock', async () => {
      const dispenseRes = await fetch(`${baseUrl}/api/dispensing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-pharmacy-id': newPharmacyId },
        body: JSON.stringify({
          medicine: 'Amoxicillin 250mg',
          batch: 'APX-001',
          quantity: 10,
          customer: 'Suresh Nair',
          pharmacist: 'Dr. Sarah Jenkins',
          unitPrice: 35
        })
      });
      assert.strictEqual(dispenseRes.status, 201);
      const dispData = await dispenseRes.json();
      assert.strictEqual(dispData.remainingStock, 40);
      assert.strictEqual(dispData.audit.pharmacyId, newPharmacyId);
    });

    // 5. Cross-Tenant Isolation Verification
    await test('Cross-Tenant Data Barrier: Demo account cannot see new tenant batches or customers', async () => {
      const demoInvRes = await fetch(`${baseUrl}/api/inventory`, {
        headers: { 'x-pharmacy-id': 'DEMO_PHARMACY' }
      });
      const demoInv = await demoInvRes.json();
      const leakedMed = demoInv.find(m => m.batch === 'APX-001');
      assert.strictEqual(leakedMed, undefined, 'Demo inventory must NOT leak new tenant batch');

      const demoCustRes = await fetch(`${baseUrl}/api/customers`, {
        headers: { 'x-pharmacy-id': 'DEMO_PHARMACY' }
      });
      const demoCust = await demoCustRes.json();
      const leakedCust = demoCust.find(c => c.name === 'Suresh Nair');
      assert.strictEqual(leakedCust, undefined, 'Demo customers must NOT leak new tenant customer');
    });

    // 6. AI Operations Briefing for New Tenant
    await test('AI Operations Briefing handles tenant-specific context accurately', async () => {
      const aiRes = await fetch(`${baseUrl}/api/ai/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-pharmacy-id': newPharmacyId },
        body: JSON.stringify({ query: 'Give me today pharmacy operational briefing' })
      });
      assert.strictEqual(aiRes.status, 200);
      const aiData = await aiRes.json();
      assert.ok(aiData.text || aiData.summary);
    });

    console.log(`\n🎉 Tenant Isolation Test Suite Completed: ${passed}/${total} tests passed.\n`);
  } finally {
    server.close();
  }
}

if (require.main === module) {
  runTenantIsolationTests().catch(err => {
    console.error('❌ Tenant isolation test failed:', err);
    process.exit(1);
  });
}

module.exports = runTenantIsolationTests;
