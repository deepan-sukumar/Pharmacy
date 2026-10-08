/**
 * Firestore Live Collection & Workspace Isolation Verification Test Suite
 */
const { db } = require('../firebase');
const assert = require('assert');

const WORKSPACE_ID = 'pharmaflow-main';

const EXPECTED_COUNTS = {
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

async function verifyFirestoreLive() {
  console.log('🧪 Starting Firestore Live Collection & Workspace Isolation Verification...\n');

  let passed = 0;
  let total = 0;

  for (const [colName, expected] of Object.entries(EXPECTED_COUNTS)) {
    total++;
    try {
      const snap = await db.collection(colName).where('workspaceId', '==', WORKSPACE_ID).get();
      assert.strictEqual(snap.size, expected, `Count mismatch for ${colName}: got ${snap.size}, expected ${expected}`);
      console.log(`  ✅ [PASS] Live Firestore Collection '${colName}': ${snap.size} records in '${WORKSPACE_ID}'`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] Live Firestore Collection '${colName}': ${err.message}`);
      process.exitCode = 1;
    }
  }

  // Cross-tenant test: query for other workspace
  total++;
  try {
    const crossSnap = await db.collection('inventory').where('workspaceId', '==', 'other-workspace-xyz').get();
    assert.strictEqual(crossSnap.size, 0, 'Cross-tenant isolation check: unexpected records found');
    console.log(`  ✅ [PASS] Cross-tenant Isolation: 0 records accessible for foreign workspace`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] Cross-tenant isolation check: ${err.message}`);
    process.exitCode = 1;
  }

  console.log(`\n🎉 Live Firestore Verification Completed: ${passed}/${total} checks passed.\n`);
  process.exit(process.exitCode ? 1 : 0);
}

verifyFirestoreLive().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
