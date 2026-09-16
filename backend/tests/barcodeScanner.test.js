/**
 * PharmaFlow Live Barcode / QR Camera Scanner & Lookup Automated Test Suite
 * Tests barcode format parsing, GS1 parsing, backend lookup, GTIN normalization,
 * and pharmacist verification workflow.
 */

const http = require('http');
const app = require('../index');

let server;
let BASE_URL = '';

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-pharmacy-id': 'DEMO_PHARMACY',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function parseBarcodeTextHelper(rawText, format = 'BARCODE') {
  const trimmed = rawText.trim();

  // 1. JSON QR
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        rawText: trimmed,
        format: format || 'QR_CODE',
        medicine: parsed.medicine || parsed.name,
        batch: parsed.batch || parsed.lot,
        expiry: parsed.expiry || parsed.expDate,
        quantity: Number(parsed.quantity || parsed.qty) || undefined,
        supplier: parsed.supplier,
        unitPrice: Number(parsed.unitPrice || parsed.price) || undefined,
        barcode: parsed.barcode || parsed.gtin || trimmed,
      };
    } catch {}
  }

  // 2. GS1-128
  const hasGs1Parentheses = /\((01|10|17|21)\)/.test(trimmed);
  const startsWithGs1Gtin = /^01\d{14}/.test(trimmed);

  if (hasGs1Parentheses || startsWithGs1Gtin) {
    const gs1Gtin = trimmed.match(/\(01\)(\d{14}|\d{13}|\d{12})/i) || trimmed.match(/^01(\d{14})/);
    const gs1Expiry = trimmed.match(/\(17\)(\d{6})/i) || (startsWithGs1Gtin ? trimmed.match(/(?:^01\d{14})17(\d{6})/) : null);
    const gs1Batch = trimmed.match(/\(10\)([A-Z0-9_-]+)/i) || (startsWithGs1Gtin ? trimmed.match(/(?:^01\d{14}(?:17\d{6})?)10([A-Z0-9_-]+)/) : null);

    if (gs1Gtin || gs1Batch || gs1Expiry) {
      let expFormatted;
      if (gs1Expiry && gs1Expiry[1]) {
        const expRaw = gs1Expiry[1];
        const yy = expRaw.slice(0, 2);
        const mm = expRaw.slice(2, 4);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = months[parseInt(mm, 10) - 1] || 'Dec';
        expFormatted = `${monthName} 20${yy}`;
      }

      return {
        rawText: trimmed,
        format: 'GS1_128',
        barcode: gs1Gtin ? gs1Gtin[1] : trimmed,
        batch: gs1Batch ? gs1Batch[1].toUpperCase() : undefined,
        expiry: expFormatted,
      };
    }
  }

  return {
    rawText: trimmed,
    format,
    barcode: trimmed,
    batch: trimmed.length <= 10 && /^[A-Z0-9-]+$/i.test(trimmed) ? trimmed.toUpperCase() : undefined,
  };
}

async function runBarcodeTests() {
  console.log('\n🧪 Starting PharmaFlow Live Barcode & QR Scanner Automated Tests...\n');

  // Start temporary test server with dynamic port
  await new Promise((resolve) => {
    server = http.createServer(app).listen(0, () => {
      const port = server.address().port;
      BASE_URL = `http://localhost:${port}`;
      resolve();
    });
  });

  let passed = 0;
  let total = 0;

  function test(desc, fn) {
    total++;
    try {
      fn();
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${desc}`);
      console.error(`     Error: ${err.message}`);
    }
  }

  async function asyncTest(desc, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${desc}`);
      console.error(`     Error: ${err.message}`);
    }
  }

  try {
    // --- Suite 1: Barcode / QR Payload Parsing ---
    console.log('--- Test 1: QR & GS1 Barcode Payload Parsing ---');

    test('Parses JSON QR payload with medicine, batch, and expiry', () => {
      const jsonStr = JSON.stringify({
        medicine: 'Paracetamol 500mg',
        batch: 'PCT101',
        expiry: 'Sep 2026',
        quantity: 150,
        supplier: 'ABC Pharma',
        unitPrice: 25,
        barcode: '890103400101',
      });
      const parsed = parseBarcodeTextHelper(jsonStr, 'QR_CODE');
      if (parsed.medicine !== 'Paracetamol 500mg') throw new Error('Medicine mismatch');
      if (parsed.batch !== 'PCT101') throw new Error('Batch mismatch');
      if (parsed.expiry !== 'Sep 2026') throw new Error('Expiry mismatch');
      if (parsed.quantity !== 150) throw new Error('Quantity mismatch');
      if (parsed.barcode !== '890103400101') throw new Error('Barcode mismatch');
    });

    test('Parses GS1-128 barcode string: (01)GTIN(17)YYMMDD(10)BATCH', () => {
      const gs1 = '(01)08901034001014(17)260930(10)PCT101';
      const parsed = parseBarcodeTextHelper(gs1, 'CODE_128');
      if (parsed.format !== 'GS1_128') throw new Error(`Format mismatch: ${parsed.format}`);
      if (parsed.batch !== 'PCT101') throw new Error('Batch mismatch');
      if (parsed.expiry !== 'Sep 2026') throw new Error('Expiry mismatch');
      if (parsed.barcode !== '08901034001014') throw new Error('Barcode mismatch');
    });

    test('Parses plain 1D EAN-13 barcode without assuming batch or expiry', () => {
      const raw = '890103400101';
      const parsed = parseBarcodeTextHelper(raw, 'EAN_13');
      if (parsed.format !== 'EAN_13') throw new Error(`Expected EAN_13, got ${parsed.format}`);
      if (parsed.barcode !== '890103400101') throw new Error('Barcode mismatch');
      if (parsed.expiry !== undefined) throw new Error('Plain barcode should not assume expiry');
    });

    // --- Suite 2: Backend API Lookup by Barcode ---
    console.log('\n--- Test 2: Backend Barcode Lookup (/api/barcode/lookup/:code) ---');

    await asyncTest('Exact barcode lookup finds Paracetamol 500mg (890103400101)', async () => {
      const res = await makeRequest('/api/barcode/lookup/890103400101');
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      if (!res.body.found) throw new Error('Product should be found');
      if (!res.body.medicine || !res.body.medicine.medicine.includes('Paracetamol')) {
        throw new Error('Medicine should be Paracetamol');
      }
      if (res.body.medicine.batch !== 'PCT101') throw new Error('Batch should be PCT101');
    });

    await asyncTest('Normalized GTIN lookup with leading zero finds product (0890103400101)', async () => {
      const res = await makeRequest('/api/barcode/lookup/0890103400101');
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      if (!res.body.found) throw new Error('Product should be found with leading 0');
      if (res.body.medicine.batch !== 'PCT101') throw new Error('Batch should be PCT101');
    });

    await asyncTest('Batch number lookup finds Vitamin D3 (VD102)', async () => {
      const res = await makeRequest('/api/barcode/lookup/VD102');
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      if (!res.body.found) throw new Error('Product should be found by batch');
      if (!res.body.medicine.medicine.includes('Vitamin D3')) {
        throw new Error('Medicine should be Vitamin D3');
      }
    });

    await asyncTest('Case-insensitive batch lookup finds Cetirizine (ctz302)', async () => {
      const res = await makeRequest('/api/barcode/lookup/ctz302');
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      if (!res.body.found) throw new Error('Product should be found with lowercase batch');
      if (res.body.medicine.batch !== 'CTZ302') throw new Error('Batch should be CTZ302');
    });

    await asyncTest('Unmatched barcode returns friendly not found message without error', async () => {
      const res = await makeRequest('/api/barcode/lookup/999888777666');
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      if (res.body.found !== false) throw new Error('Found should be false');
      if (res.body.code !== '999888777666') throw new Error('Code should be reflected');
      if (!res.body.message.includes('Barcode detected, but no matching medicine was found')) {
        throw new Error(`Unexpected message: ${res.body.message}`);
      }
    });

    // --- Suite 3: Preserving Existing Inventory & Non-destructive Operations ---
    console.log('\n--- Test 3: Inventory Integrity & Presets ---');

    await asyncTest('Preserves existing DEMO_PHARMACY inventory records intact', async () => {
      const res = await makeRequest('/api/inventory');
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      if (!Array.isArray(res.body)) throw new Error('Inventory should be array');
      if (res.body.length < 6) throw new Error(`Inventory too small: ${res.body.length}`);
    });

    console.log(`\n🎉 Barcode & QR Scanner Test Suite Completed: ${passed}/${total} passed.\n`);
  } finally {
    if (server) {
      server.close();
    }
  }

  if (passed < total) {
    process.exit(1);
  }
}

runBarcodeTests().catch((err) => {
  console.error('Fatal test error:', err);
  if (server) server.close();
  process.exit(1);
});
