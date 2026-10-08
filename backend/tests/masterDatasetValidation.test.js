/**
 * PharmaFlow Master Dataset V1 Validation Test Suite
 * Comprehensive structural, relational, and integrity verification.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const DATASET_PATH = path.join(__dirname, '..', '..', 'PHARMAFLOW_MASTER_DATASET_V1.json');
const MANIFEST_PATH = path.join(__dirname, '..', '..', 'PHARMAFLOW_MASTER_DATASET_MANIFEST.json');

console.log('🧪 Starting PharmaFlow Master Dataset Validation Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function it(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    process.exitCode = 1;
  }
}

const data = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf-8'));
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));

// 1. Manifest & Metadata Check
it('T1.1: Dataset metadata contains correct datasetId and version', () => {
  assert.strictEqual(data.metadata.datasetId, 'PHARMAFLOW-MASTER-DATASET-V1');
  assert.strictEqual(data.metadata.version, '1.0.0');
  assert.strictEqual(data.metadata.workspaceId, 'pharmaflow-main');
  assert.strictEqual(data.metadata.systemOwner.name, 'Deepak R');
  assert.strictEqual(data.metadata.systemOwner.email, 'deepak.it23@bitsathy.ac.in');
  assert.strictEqual(data.metadata.systemOwner.pharmacistId, 'PHARM-KA-2022-7212');
});

// 2. All 17 Collections Count Verification
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

for (const [col, count] of Object.entries(expectedCounts)) {
  it(`T2: Collection '${col}' count matches target (${count})`, () => {
    assert.strictEqual(data[col]?.length, count, `Count mismatch for ${col}: got ${data[col]?.length}, expected ${count}`);
  });
}

it('T3: Total records equals 9,469', () => {
  assert.strictEqual(data.metadata.totalRecords, 9469);
  assert.strictEqual(manifest.totalRecords, 9469);
});

// 3. Foreign Key & Relational Consistency Checks
it('T4: Medicines -> Manufacturers foreign key integrity', () => {
  const mfgIds = new Set(data.manufacturers.map(m => m.manufacturerId));
  for (const med of data.medicines) {
    assert.ok(mfgIds.has(med.manufacturerId), `Medicine ${med.medicineId} references non-existent manufacturer ${med.manufacturerId}`);
  }
});

it('T5: Batches -> Medicines foreign key integrity', () => {
  const medIds = new Set(data.medicines.map(m => m.medicineId));
  for (const b of data.batches) {
    assert.ok(medIds.has(b.medicineId), `Batch ${b.batchId} references non-existent medicine ${b.medicineId}`);
  }
});

it('T6: Batches date validity (mfgDate < expiryDate)', () => {
  for (const b of data.batches) {
    const mfg = new Date(b.manufacturingDate).getTime();
    const exp = new Date(b.expiryDate).getTime();
    assert.ok(mfg < exp, `Batch ${b.batchId} has mfgDate (${b.manufacturingDate}) >= expiryDate (${b.expiryDate})`);
  }
});

it('T7: Dispensing <-> DispensingAudit 1-to-1 matching', () => {
  const dispIds = new Set(data.dispensing.map(d => d.dispensingId));
  const auditDispIds = new Set(data.dispensingAudit.map(a => a.dispensingId));
  assert.strictEqual(dispIds.size, 2048);
  assert.strictEqual(auditDispIds.size, 2048);
  for (const id of dispIds) {
    assert.ok(auditDispIds.has(id), `Dispensing ${id} missing corresponding audit trail`);
  }
});

it('T8: Invoices -> InvoiceItems relationship integrity', () => {
  const invIds = new Set(data.invoices.map(i => i.invoiceId));
  for (const item of data.invoiceItems) {
    assert.ok(invIds.has(item.invoiceId), `InvoiceItem ${item.invoiceItemId} references non-existent invoice ${item.invoiceId}`);
  }
});

it('T9: Workspace Isolation Tagging on all records', () => {
  for (const [col, items] of Object.entries(data)) {
    if (col === 'metadata') continue;
    for (const item of items) {
      assert.strictEqual(item.workspaceId, 'pharmaflow-main', `Record in ${col} has invalid workspaceId: ${item.workspaceId}`);
    }
  }
});

it('T10: Primary Pharmacist ID is PHARM-KA-2022-7212', () => {
  const primary = data.pharmacists.find(p => p.pharmacistId === 'PHARM-KA-2022-7212');
  assert.ok(primary, 'Primary pharmacist PHARM-KA-2022-7212 not found');
  assert.strictEqual(primary.name, 'Deepak R');
  assert.strictEqual(primary.email, 'deepak.it23@bitsathy.ac.in');
});

console.log(`\n🎉 Test Suite Completed: ${passedTests}/${totalTests} tests passed.\n`);
