/**
 * Test Suite: Vercel Serverless Function & Production Compatibility Simulation
 */
const assert = require('assert');
const http = require('http');
const serverlessApp = require('../../api/index.js');

let server;
const PORT = 5066;
const BASE_URL = `http://localhost:${PORT}`;

async function runServerlessTests() {
  console.log('\n🧪 Running Vercel Serverless Function & Production API Simulation Tests...\n');
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

  // Start local server wrapping the exact api/index.js export
  await new Promise((resolve) => {
    server = serverlessApp.listen(PORT, resolve);
  });

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
    return { status: res.status, ok: res.ok, headers: res.headers, data };
  }

  try {
    // TEST 1: Health endpoint via /api/health
    await test('Vercel API: GET /api/health returns ok: true and service name', async () => {
      const res = await api('/api/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.ok, true);
      assert.strictEqual(res.data.service, 'pharmaflow-api');
      assert.strictEqual(res.data.status, 'ok');
      assert.ok(res.data.timestamp);
    });

    // TEST 2: Health endpoint via /health (URL normalization)
    await test('Vercel API: GET /health (stripped prefix) normalizes and returns 200', async () => {
      const res = await api('/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.ok, true);
      assert.strictEqual(res.data.service, 'pharmaflow-api');
    });

    // TEST 3: CORS Headers
    await test('Vercel API: CORS headers allow cross-origin requests from Vercel domains', async () => {
      const res = await fetch(`${BASE_URL}/api/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://pharmaflow-demo.vercel.app',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, x-pharmacy-id, Authorization'
        }
      });
      assert.strictEqual(res.status, 204);
      assert.ok(res.headers.get('access-control-allow-methods').includes('POST'));
      assert.ok(res.headers.get('access-control-allow-headers').includes('x-pharmacy-id'));
    });

    // TEST 4: Demo Login via Serverless API
    await test('Vercel API: POST /api/auth/login authenticates Demo Pharmacist', async () => {
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'pharmacist@demo.com', password: 'demo123' })
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.isDemo, true);
      assert.strictEqual(res.data.user.pharmacyId, 'DEMO_PHARMACY');
      assert.strictEqual(res.data.user.email, 'pharmacist@demo.com');
    });

    // TEST 5: Invalid credentials returns 401 without demo leakage
    await test('Vercel API: POST /api/auth/login rejects unknown user with 401 (No demo fallback)', async () => {
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'unknown@example.com', password: 'wrong' })
      });
      assert.strictEqual(res.status, 401);
      assert.ok(res.data.error.includes('Account not found') || res.data.error.includes('credentials'));
    });

    // TEST 6: User registration and isolated workspace
    await test('Vercel API: POST /api/auth/register generates isolated pharmacyId', async () => {
      const uniqueEmail = `dr.smith.${Date.now()}@clinic.com`;
      const res = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Dr. John Smith',
          email: uniqueEmail,
          mobile: '9845099999',
          password: 'Password123!',
          pharmacyName: 'Smith Health Care',
          city: 'Mumbai',
          stateName: 'Maharashtra'
        })
      });
      assert.strictEqual(res.status, 201);
      assert.ok(res.data.user.pharmacyId.startsWith('pharm_'));
      assert.notStrictEqual(res.data.user.pharmacyId, 'DEMO_PHARMACY');
    });

  } finally {
    if (server) {
      server.close();
    }
  }

  console.log(`\n🎉 Serverless Simulation Completed: ${passed}/${total} tests passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runServerlessTests();
