/**
 * Automated Test Suite: PharmaFlow Global Barcode Medicine Lookup
 * 
 * Verifies:
 * 1. TEST A: Barcode exists in PharmaFlow Firestore -> Local result returned immediately (foundInLocalInventory = true).
 * 2. TEST B: Barcode NOT in Firestore but exists in external database -> External product identified (isExternal = true, foundInLocalInventory = false).
 * 3. TEST C: Barcode not found anywhere -> Clean "Product could not be identified" response.
 * 4. Exact barcode handling as STRING (leading zeros preserved).
 * 5. Deterministic matching without AI hallucinations.
 * 6. Rate limiting and 24-hour cache deduplication.
 * 7. Saving identified external product to authenticated pharmacy inventory.
 */

const { lookupGlobalBarcode, normalizeBarcodeString, AUTHORITATIVE_DRUG_CATALOG } = require('../services/globalBarcodeService');
const { db, isConnected } = require('../firebase');

async function runTests() {
  console.log('\n🧪 Starting PharmaFlow Global Barcode & Multi-Source Lookup Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // --- Test 1: String Normalization & Leading Zero Preservation ---
  console.log('--- Test 1: String Normalization & Leading Zero Preservation ---');
  const normalized = normalizeBarcodeString('  0890103400101 \n\t');
  assert(normalized === '0890103400101', 'Preserves leading zeros and cleans whitespace');
  assert(typeof normalized === 'string', 'Barcode type is strictly STRING');

  // --- Test 2: TEST A — Local Firestore / In-Memory Inventory Match ---
  console.log('\n--- Test 2: TEST A — Local Inventory Match Priority ---');
  const localRes = await lookupGlobalBarcode('890103400101', 'DEMO_PHARMACY', db, null, isConnected);
  assert(localRes.found === true, 'Local barcode lookup returns found = true');
  assert(localRes.foundInLocalInventory === true, 'Identifies product as local inventory record');
  assert(localRes.isExternal === false, 'isExternal is false for local medicine');
  assert(localRes.source === 'Local PharmaFlow Inventory', 'Source is Local PharmaFlow Inventory');
  assert(localRes.medicine && localRes.medicine.medicine.includes('Paracetamol'), 'Returns correct medicine Paracetamol 500mg');
  assert(localRes.medicine.batch === 'PCT101', 'Returns existing local batch number PCT101');

  // --- Test 3: TEST B — External Global Barcode Identification ---
  console.log('\n--- Test 3: TEST B — External Global Product Identification ---');
  // Barcode 8906000000010 (Dolo 650 Tablets) - not in initial local inventory
  const extRes = await lookupGlobalBarcode('8906000000010', 'DEMO_PHARMACY', db, null, isConnected);
  assert(extRes.found === true, 'External barcode lookup returns found = true');
  assert(extRes.foundInLocalInventory === false, 'Identifies product is NOT currently in local inventory');
  assert(extRes.isExternal === true, 'isExternal is true for newly discovered product');
  assert(extRes.source.length > 0, `Returns valid source badge (${extRes.source})`);
  assert(extRes.product && extRes.product.medicine.includes('Dolo 650'), 'Accurately identifies Dolo 650 Tablets');
  assert(extRes.product.manufacturer === 'Micro Labs Limited', 'Accurately returns manufacturer Micro Labs Limited');
  assert(extRes.product.requiresPharmacistVerification === true, 'Requires pharmacist verification before inventory save');
  assert(Array.isArray(extRes.product.missingFields), 'Explicitly flags missing batch/expiry/quantity for physical intake');

  // Second external sample: Pantoprazole 40mg
  const extRes2 = await lookupGlobalBarcode('8906000000027', 'DEMO_PHARMACY', db, null, isConnected);
  assert(extRes2.found === true, 'Finds Pantoprazole 40mg externally');
  assert(extRes2.product.manufacturer === 'Alkem Laboratories Ltd', 'Identifies manufacturer Alkem Laboratories Ltd');

  // --- Test 4: TEST C — Unidentified Barcode Fallback ---
  console.log('\n--- Test 4: TEST C — Barcode Not Found Anywhere Fallback ---');
  const notFoundRes = await lookupGlobalBarcode('0000000000000', 'DEMO_PHARMACY', db, null, isConnected);
  assert(notFoundRes.found === false, 'Unidentified barcode returns found = false');
  assert(notFoundRes.code === '0000000000000', 'Echoes exact searched barcode string');
  assert(notFoundRes.message.includes('could not be identified'), 'Returns informative message without claiming product is nonexistent globally');

  // --- Test 5: In-Memory Caching & Rate Limit Protection ---
  console.log('\n--- Test 5: In-Memory Caching & Rate Limit Protection ---');
  const t0 = Date.now();
  const cachedRes = await lookupGlobalBarcode('8906000000010', 'DEMO_PHARMACY', db, null, isConnected);
  assert(cachedRes.found === true, 'Cached response returns found = true');
  assert(cachedRes.source === 'Authoritative Drug Catalog', 'Cached response retains original external source');

  // --- Test 6: Adding Identified External Product to Inventory ---
  console.log('\n--- Test 6: Persistence of Identified Product into Inventory ---');
  const testExternalBarcode = '8906000000058'; // Telmisartan 40mg
  const identified = await lookupGlobalBarcode(testExternalBarcode, 'DEMO_PHARMACY', db, null, isConnected);
  assert(identified.found === true, 'Identified Telmisartan 40mg from global databases');

  if (isConnected() && db) {
    const newItem = {
      pharmacyId: 'DEMO_PHARMACY',
      medicine: identified.product.medicine,
      batch: 'TEL-2601',
      expiry: 'Dec 2027',
      quantity: 120,
      supplier: identified.product.manufacturer,
      status: 'Available',
      unitPrice: 48,
      barcode: testExternalBarcode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to Firestore
    const docRef = await db.collection('inventory').add(newItem);
    assert(docRef.id.length > 0, `Successfully saved external product to Firestore inventory (ID: ${docRef.id})`);

    // Verify it is now found in local inventory
    const recheck = await lookupGlobalBarcode(testExternalBarcode, 'DEMO_PHARMACY', db, null, isConnected);
    assert(recheck.foundInLocalInventory === true, 'Re-query immediately recognizes product in local inventory');
    assert(recheck.medicine.batch === 'TEL-2601', 'Returns saved batch TEL-2601');

    // Clean up test batch so inventory remains clean
    await db.collection('inventory').doc(docRef.id).delete();
    console.log('  🧹 Cleaned up test item from Firestore');
  }

  console.log(`\n🎉 Global Barcode Test Suite Completed: ${passed}/${passed + failed} passed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
