/**
 * PharmaFlow Invoice Extraction & Multi-Item OCR Test Suite
 * 
 * Tests:
 * 1. Complete 10-Item Medicine Invoice Extraction
 * 2. Multi-Count Scaling (1, 5, 10, 25 items) — Zero 3-item limit
 * 3. Multi-Page Invoice Processing & Aggregation
 * 4. Incomplete/Uncertain Fields Review Flagging (No silent dropping)
 * 5. Demo Invoice Standard Payload
 * 6. Express API /api/import/invoice End-to-End Extraction
 * 7. Express API /api/import/invoice/confirm Persistence (10 Extracted -> 10 Saved)
 * 8. Duplicate Batch Protection & Stock Merging
 * 9. Existing Inventory & Demo Data Preservation
 */

const http = require('http');
const app = require('../index');
const { extractInvoiceItems, extractInvoiceMetadata, splitIntoPages, DEMO_10_ITEM_INVOICE } = require('../services/invoiceParserService');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

let server;
let BASE_URL = '';

async function runTests() {
  console.log('\n🧪 Starting PharmaFlow Invoice OCR & Multi-Item Extraction Tests...\n');

  // Start temporary test server with dynamic port
  await new Promise((resolve) => {
    server = http.createServer(app).listen(0, () => {
      const port = server.address().port;
      BASE_URL = `http://localhost:${port}`;
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------
    // TEST 1: Standard 10-Item Test Invoice Extraction
    // -------------------------------------------------------------
    console.log('--- Test 1: Extract All 10 Medicine Rows from Test Invoice ---');
    const sample10Text = `
TAX INVOICE / PURCHASE BILL
Supplier: MediSource Distributors Pvt Ltd
Invoice No: INV-2026-9842
Invoice Date: 12 Sep 2026

Sl | Medicine Name | Batch | Expiry | Qty | Rate | Amount
1. Paracetamol 500 mg Tablets | PAR-26041 | Nov 2027 | 100 | 25.50 | 2550.00
2. Amoxicillin 500 mg Capsules | AMX-26017 | Jan 2028 | 150 | 92.00 | 13800.00
3. Azithromycin 500 mg Tablets | AZI-26012 | Dec 2027 | 80 | 118.00 | 9440.00
4. Cetirizine 10 mg Tablets | CET-26035 | Feb 2028 | 200 | 18.50 | 3700.00
5. Pantoprazole 40 mg Tablets | PAN-26029 | Oct 2027 | 250 | 55.00 | 13750.00
6. Metformin 500 mg Tablets | MET-26021 | Mar 2028 | 300 | 32.00 | 9600.00
7. Amlodipine 5 mg Tablets | AML-26018 | Nov 2027 | 180 | 28.00 | 5040.00
8. Vitamin D3 60K Capsules | VD-26009 | Aug 2027 | 120 | 145.00 | 17400.00
9. ORS Sachets | ORS-26044 | Jun 2028 | 400 | 19.50 | 7800.00
10. Ondansetron 4 mg Tablets | OND-26015 | Apr 2028 | 90 | 42.00 | 3780.00

Grand Total: ₹ 83,060.00
    `;

    const result10 = await extractInvoiceItems({ invoiceText: sample10Text, fileName: 'test_invoice_10.pdf' });
    
    assert(result10.success === true, 'Extraction response status is success');
    assert(result10.items.length === 10, `Extracted exact count of 10 items (got ${result10.items.length})`);
    assert(result10.supplier.includes('MediSource'), `Extracted supplier: ${result10.supplier}`);
    assert(result10.invoiceNumber === 'INV-2026-9842', `Extracted invoice number: ${result10.invoiceNumber}`);
    
    const expectedBatches = [
      { name: 'Paracetamol', batch: 'PAR-26041', qty: 100 },
      { name: 'Amoxicillin', batch: 'AMX-26017', qty: 150 },
      { name: 'Azithromycin', batch: 'AZI-26012', qty: 80 },
      { name: 'Cetirizine', batch: 'CET-26035', qty: 200 },
      { name: 'Pantoprazole', batch: 'PAN-26029', qty: 250 },
      { name: 'Metformin', batch: 'MET-26021', qty: 300 },
      { name: 'Amlodipine', batch: 'AML-26018', qty: 180 },
      { name: 'Vitamin D3', batch: 'VD-26009', qty: 120 },
      { name: 'ORS Sachets', batch: 'ORS-26044', qty: 400 },
      { name: 'Ondansetron', batch: 'OND-26015', qty: 90 },
    ];

    expectedBatches.forEach(exp => {
      const found = result10.items.find(it => it.batch === exp.batch);
      assert(Boolean(found), `Identified medicine ${exp.name} with batch ${exp.batch}`);
      if (found) {
        assert(found.quantity === exp.qty, `Correct quantity ${found.quantity} for ${exp.name}`);
        assert(Boolean(found.expiry), `Preserved expiry ${found.expiry} for ${exp.name}`);
        assert(found.unitPrice > 0, `Preserved rate ${found.unitPrice} for ${exp.name}`);
      }
    });

    // -------------------------------------------------------------
    // TEST 2: Scaling Invoices (1, 5, 25 Line Items) - NO 3-Item Limit
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Invoices with 1, 5, 25 Line Items (NO 3-Item Limit) ---');
    
    // 1-Item Invoice
    const sample1Text = `
Supplier: ABC Pharma
Invoice No: INV-001
Date: 15 Sep 2026
1. Dolo 650 mg Tablets | DOL-991 | Dec 2027 | 50 | 32.00 | 1600.00
    `;
    const result1 = await extractInvoiceItems({ invoiceText: sample1Text, fileName: 'single_item.csv' });
    assert(result1.items.length === 1, `1-item invoice returns exactly 1 item (got ${result1.items.length})`);

    // 5-Item Invoice
    const sample5Text = `
Supplier: HealthCare Labs
Invoice No: INV-005
Date: 15 Sep 2026
1. Montelukast 10 mg Tablets | MON-101 | Jan 2028 | 120 | 75.00
2. Telmisartan 40 mg Tablets | TEL-202 | Dec 2027 | 80 | 54.00
3. Atorvastatin 20 mg Tablets | ATO-303 | Nov 2027 | 150 | 85.00
4. Ciprofloxacin 500 mg Tablets | CIP-404 | Feb 2028 | 90 | 45.00
5. Ibuprofen 400 mg Tablets | IBU-505 | Oct 2027 | 200 | 22.00
    `;
    const result5 = await extractInvoiceItems({ invoiceText: sample5Text, fileName: 'five_items.txt' });
    assert(result5.items.length === 5, `5-item invoice returns exactly 5 items (got ${result5.items.length})`);

    // 25-Item Invoice
    const items25 = [];
    for (let i = 1; i <= 25; i++) {
      items25.push(`${i}. Generic Drug #${i} 500 mg Tablets,BAT-${1000 + i},Nov 2028,${100 + i * 10},${25.0 + i},${(100 + i * 10) * (25.0 + i)}`);
    }
    const sample25Text = `Supplier: Global Generics\nInvoice No: INV-BIG-25\n` + items25.join('\n');
    const result25 = await extractInvoiceItems({ invoiceText: sample25Text, fileName: 'bulk_invoice_25.csv' });
    assert(result25.items.length === 25, `25-item invoice returns all 25 items without truncation (got ${result25.items.length})`);

    // -------------------------------------------------------------
    // TEST 3: Multi-Page Invoice Processing
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Multi-Page Invoice Processing ---');
    const multiPageText = `
--- PAGE 1 ---
Supplier: MultiPage Pharma Ltd
Invoice No: MP-9001
Date: 10 Sep 2026
1. Paracetamol 500 mg Tablets | PAR-01 | Nov 2027 | 100 | 25.00
2. Amoxicillin 500 mg Capsules | AMX-02 | Jan 2028 | 150 | 90.00
3. Azithromycin 500 mg Tablets | AZI-03 | Dec 2027 | 80 | 110.00

--- PAGE 2 ---
4. Cetirizine 10 mg Tablets | CET-04 | Feb 2028 | 200 | 18.00
5. Pantoprazole 40 mg Tablets | PAN-05 | Oct 2027 | 250 | 55.00
6. Metformin 500 mg Tablets | MET-06 | Mar 2028 | 300 | 32.00
7. Amlodipine 5 mg Tablets | AML-07 | Nov 2027 | 180 | 28.00
    `;
    const pages = splitIntoPages(multiPageText);
    assert(pages.length === 2, `Split multi-page invoice into ${pages.length} pages`);

    const multiResult = await extractInvoiceItems({ invoiceText: multiPageText, fileName: 'multipage.pdf' });
    assert(multiResult.items.length === 7, `Extracted all 7 items across both page 1 and page 2 (got ${multiResult.items.length})`);

    // -------------------------------------------------------------
    // TEST 4: Incomplete / Uncertain Fields Flagging (No Silent Dropping)
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Uncertain Field Review Flagging ---');
    const uncertainText = `
Supplier: Quick Meds
Invoice No: INV-UNCERTAIN
1. Diclofenac 50 mg Tablets
2. Rabeprazole 20 mg Tablets | RAB-881
    `;
    const uncertainResult = await extractInvoiceItems({ invoiceText: uncertainText, fileName: 'uncertain.txt' });
    assert(uncertainResult.items.length === 2, `Did not silently drop uncertain rows (extracted ${uncertainResult.items.length} items)`);
    assert(uncertainResult.items[0].needsReview === true, 'Flagged missing batch/expiry row with needsReview = true');

    // -------------------------------------------------------------
    // TEST 5: Demo Invoice Standard Payload
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Demo Invoice Standard Payload ---');
    const demoResult = await extractInvoiceItems({ fileName: 'MediSource_TaxInvoice_9842.pdf' });
    assert(demoResult.items.length === 10, `Demo invoice returns complete 10 items (got ${demoResult.items.length})`);

    // -------------------------------------------------------------
    // TEST 6: Express API /api/import/invoice Endpoint
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Express API Endpoint /api/import/invoice ---');
    const apiRes = await fetch(`${BASE_URL}/api/import/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-pharmacy-id': 'TEST_PHARMACY' },
      body: JSON.stringify({
        invoiceText: sample10Text,
        fileName: 'test_invoice_10.pdf'
      })
    });
    const apiData = await apiRes.json();
    assert(apiRes.status === 200, 'API /api/import/invoice returned HTTP 200');
    assert(apiData.items.length === 10, `API extracted all 10 items (got ${apiData.items.length})`);
    assert(apiData.extractedCount === 10, `API reported extractedCount = 10`);

    // -------------------------------------------------------------
    // TEST 7: Express API /api/import/invoice/confirm Persistence
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Confirm & Save to Inventory (/api/import/invoice/confirm) ---');
    const confirmRes = await fetch(`${BASE_URL}/api/import/invoice/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-pharmacy-id': 'TEST_PHARMACY' },
      body: JSON.stringify({
        items: apiData.items,
        invoiceMeta: {
          supplier: apiData.supplier,
          invoiceNumber: apiData.invoiceNumber,
          invoiceDate: apiData.invoiceDate
        }
      })
    });
    const confirmData = await confirmRes.json();
    assert(confirmRes.status === 200, 'API /api/import/invoice/confirm returned HTTP 200');
    assert(confirmData.totalSaved === 10, `Saved exactly 10 items to inventory (got ${confirmData.totalSaved})`);

    // -------------------------------------------------------------
    // TEST 8: Duplicate Batch Identification & Stock Update
    // -------------------------------------------------------------
    console.log('\n--- Test 8: Duplicate Batch Protection & Stock Merging ---');
    const uniqueBatch = `MERGE-${Date.now()}`;
    
    // Initial insert
    await fetch(`${BASE_URL}/api/import/invoice/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-pharmacy-id': 'TEST_PHARMACY' },
      body: JSON.stringify({
        items: [
          { medicine: 'Test Medicine A', batch: uniqueBatch, expiry: 'Nov 2027', quantity: 100, unitPrice: 20 }
        ]
      })
    });

    // Re-importing same batch with +50 units
    const duplicateImportRes = await fetch(`${BASE_URL}/api/import/invoice/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-pharmacy-id': 'TEST_PHARMACY' },
      body: JSON.stringify({
        items: [
          { medicine: 'Test Medicine A', batch: uniqueBatch, expiry: 'Nov 2027', quantity: 50, unitPrice: 20 }
        ]
      })
    });
    const duplicateData = await duplicateImportRes.json();
    assert(duplicateData.updatedBatches === 1, 'Identified existing batch and incremented stock instead of corrupt duplicate');
    assert(duplicateData.items[0].quantity === 150, `Merged quantity from 100 + 50 = 150 (got ${duplicateData.items[0].quantity})`);

    // -------------------------------------------------------------
    // TEST 9: Existing Inventory & Demo Data Preservation
    // -------------------------------------------------------------
    console.log('\n--- Test 9: Existing Inventory Preservation ---');
    const invRes = await fetch(`${BASE_URL}/api/inventory`, {
      headers: { 'x-pharmacy-id': 'DEMO_PHARMACY' }
    });
    const invData = await invRes.json();
    assert(Array.isArray(invData) && invData.length > 0, `DEMO_PHARMACY inventory preserved intact (${invData.length} records)`);

    console.log(`\n🎉 All 9 Invoice Extraction & Persistence Test Suites Completed: ${passedTests}/${totalTests} passed.\n`);
  } finally {
    if (server) server.close();
  }
}

runTests().catch(err => {
  console.error('Fatal Test Error:', err);
  if (server) server.close();
  process.exit(1);
});
